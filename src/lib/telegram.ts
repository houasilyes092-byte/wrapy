// Server-only Telegram order notifications.
// Never import this file from a client component: it reads the bot token.

import { formatPrice } from "@/lib/utils";

const TELEGRAM_TIMEOUT_MS = 3000;

// Guards against a second send for the same order within one server instance.
// The primary guarantee is structural: the order route only calls this on the
// code path that actually inserted the order (idempotent retries return early).
const notified = new Set<string>();

export interface OrderNotification {
  orderId: string;
  customerName: string;
  phone: string;
  subtotal: number; // millimes
  total: number; // millimes
  // Taken from the stored order + the coupon row; null when no promo was used.
  promo: { code: string; type: string; value: number; discount: number } | null;
  items: { productName: string; phoneModel: string | null; quantity: number }[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function promoLines(promo: OrderNotification["promo"], subtotal: number): string[] {
  if (!promo) return ["<b>Promo Code:</b> None"];
  const isPercent = promo.type === "percentage";
  return [
    `<b>Promo Code:</b> ${escapeHtml(promo.code)}`,
    // The coupons table has no name/description column.
    `<b>Promo Name:</b> N/A`,
    `<b>Discount Type:</b> ${isPercent ? "Percentage" : "Fixed amount"}`,
    `<b>Discount Value:</b> ${isPercent ? `${promo.value}%` : formatPrice(promo.value)}`,
    `<b>Subtotal before discount:</b> ${formatPrice(subtotal)}`,
    `<b>Discount amount:</b> ${formatPrice(promo.discount)}`,
  ];
}

export function buildOrderMessage(order: OrderNotification): string {
  const lines = order.items.map((item) => {
    const model = item.phoneModel ? ` (${escapeHtml(item.phoneModel)})` : "";
    return `• ${escapeHtml(item.productName)}${model} ×${item.quantity}`;
  });
  return [
    "🛒 <b>New Wrapy order</b>",
    "",
    `<b>Order:</b> #${escapeHtml(order.orderId.slice(0, 8).toUpperCase())}`,
    `<b>Customer:</b> ${escapeHtml(order.customerName)}`,
    `<b>Phone:</b> ${escapeHtml(order.phone)}`,
    "",
    ...lines,
    "",
    ...promoLines(order.promo, order.subtotal),
    "",
    `<b>Total${order.promo ? " after discount" : ""}:</b> ${formatPrice(order.total)}`,
  ].join("\n");
}

/**
 * Sends the notification. Never throws and never rejects: any failure
 * (missing config, network, timeout, Telegram error) is logged without secrets
 * and swallowed so checkout is unaffected.
 */
export async function notifyNewOrder(order: OrderNotification): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.warn("[TELEGRAM_SKIPPED] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
      return false;
    }
    if (notified.has(order.orderId)) return false;
    notified.add(order.orderId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildOrderMessage(order),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[TELEGRAM_FAILED]", { status: res.status, orderId: order.orderId });
        return false;
      }
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Deliberately logs only the error name: fetch errors can embed the URL (and token).
    console.error("[TELEGRAM_FAILED]", {
      name: err instanceof Error ? err.name : "UnknownError",
      orderId: order.orderId,
    });
    return false;
  }
}

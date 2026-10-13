export function formatPrice(priceInMillimes: number): string {
  return `${(priceInMillimes / 1000).toFixed(1)} DT`;
}

export const FREE_SHIPPING_THRESHOLD = 100000; // 100 DT in millimes
export const DEFAULT_SHIPPING_PRICE = 8000; // 8 DT in millimes

export function calculateShipping(subtotal: number, shippingPrice: number = DEFAULT_SHIPPING_PRICE): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shippingPrice;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

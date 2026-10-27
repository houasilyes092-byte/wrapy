// Phone models live in the phone_models table (see src/lib/phone-models.ts).

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const DEFAULT_SHIPPING_PRICE = 8000; // 8 DT in millimes

export const POINTS_PER_DINAR = 1; // loyalty points per dinar spent
export const REWARD_POINTS_COST = 300; // points for one free skin

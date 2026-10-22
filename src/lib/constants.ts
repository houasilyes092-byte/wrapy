export const PHONE_MODELS = {
  iPhone: [
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 16",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 13 Mini",
  ],
  Samsung: [
    "Galaxy S25 Ultra",
    "Galaxy S25+",
    "Galaxy S25",
    "Galaxy S24 Ultra",
    "Galaxy S24+",
    "Galaxy S24",
  ],
} as const;

export const ALL_PHONE_MODELS = [
  ...PHONE_MODELS.iPhone,
  ...PHONE_MODELS.Samsung,
];

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

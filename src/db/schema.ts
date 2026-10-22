import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  json,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash_on_delivery",
]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed"]);
export const heroMediaTypeEnum = pgEnum("hero_media_type", ["image", "video"]);
export const loyaltyTransactionTypeEnum = pgEnum("loyalty_transaction_type", [
  "earned",
  "redeemed",
  "reward_redeemed",
  "reversed",
  "refunded",
]);
export const rewardStatusEnum = pgEnum("reward_status", ["available", "redeemed", "expired", "cancelled"]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("customer").notNull(),
  loyaltyPoints: integer("loyalty_points").default(0).notNull(),
  loyaltyPointsEarned: integer("loyalty_points_earned").default(0).notNull(),
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Collections
export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  images: json("images").$type<string[]>().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // stored in millimes (cents)
  comparePrice: integer("compare_price"),
  images: json("images").$type<string[]>().default([]).notNull(),
  compatibleModels: json("compatible_models").$type<string[]>().default([]).notNull(),
  stock: integer("stock").default(0).notNull(),
  madeToOrder: boolean("made_to_order").default(false).notNull(),
  collectionId: uuid("collection_id").references(() => collections.id),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  isBestSeller: boolean("is_best_seller").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address").notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }),
  notes: text("notes"),
  subtotal: integer("subtotal").notNull(),
  shippingPrice: integer("shipping_price").notNull(),
  discount: integer("discount").default(0).notNull(),
  loyaltyDiscount: integer("loyalty_discount").default(0).notNull(),
  total: integer("total").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("cash_on_delivery").notNull(),
  couponCode: varchar("coupon_code", { length: 100 }),
  loyaltyPointsUsed: integer("loyalty_points_used").default(0).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 100 }).unique(),
  // Points currently credited for this order. NULL = legacy order created
  // before lifecycle-based loyalty; such orders are never adjusted.
  loyaltyPointsAwarded: integer("loyalty_points_awarded").default(0),
  // SHA-256 of the guest confirmation token (the raw token is never stored).
  accessTokenHash: varchar("access_token_hash", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  productId: uuid("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productImage: varchar("product_image", { length: 500 }),
  phoneModel: varchar("phone_model", { length: 255 }),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  total: integer("total").notNull(),
});

// Coupons
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  type: couponTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }),
  title: varchar("title", { length: 255 }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  isHomepage: boolean("is_homepage").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ userProductUnique: uniqueIndex("reviews_user_product_unique").on(table.userId, table.productId) }));

// Wishlist
export const wishlist = pgTable("wishlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Settings
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Phone Models
export const phoneModels = pgTable("phone_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  brand: varchar("brand", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Loyalty Transactions
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: loyaltyTransactionTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reward Redemptions (for 300-point free skin)
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  productId: uuid("product_id").references(() => products.id),
  phoneModel: varchar("phone_model", { length: 255 }).notNull(),
  pointsUsed: integer("points_used").default(300).notNull(),
  status: rewardStatusEnum("status").default("redeemed").notNull(),
  orderId: uuid("order_id").references(() => orders.id).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { pgTable, unique, uuid, varchar, integer, timestamp, boolean, text, jsonb, foreignKey, json, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const couponType = pgEnum("coupon_type", ['percentage', 'fixed'])
export const heroMediaType = pgEnum("hero_media_type", ['image', 'video'])
export const loyaltyTransactionType = pgEnum("loyalty_transaction_type", ['earned', 'redeemed', 'reward_redeemed'])
export const orderStatus = pgEnum("order_status", ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
export const paymentMethod = pgEnum("payment_method", ['cash_on_delivery'])
export const rewardStatus = pgEnum("reward_status", ['available', 'redeemed', 'expired'])
export const userRole = pgEnum("user_role", ['customer', 'admin'])


export const coupons = pgTable("coupons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 100 }).notNull(),
	type: couponType().notNull(),
	value: integer().notNull(),
	maxUses: integer("max_uses"),
	usedCount: integer("used_count").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("coupons_code_unique").on(table.code),
]);

export const collections = pgTable("collections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	images: json().$type<string[]>().default([]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("collections_slug_unique").on(table.slug),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id"),
	productName: varchar("product_name", { length: 255 }).notNull(),
	productImage: varchar("product_image", { length: 500 }),
	phoneModel: varchar("phone_model", { length: 255 }),
	quantity: integer().notNull(),
	price: integer().notNull(),
	total: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	price: integer().notNull(),
	comparePrice: integer("compare_price"),
	images: json().default([]).notNull(),
	compatibleModels: json("compatible_models").default([]).notNull(),
	stock: integer().default(0).notNull(),
	collectionId: uuid("collection_id"),
	tags: json().default([]).notNull(),
	isBestSeller: boolean("is_best_seller").default(false).notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	madeToOrder: boolean("made_to_order").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.collectionId],
			foreignColumns: [collections.id],
			name: "products_collection_id_collections_id_fk"
		}),
	unique("products_slug_unique").on(table.slug),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	phone: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 255 }),
	address: text().notNull(),
	city: varchar({ length: 255 }).notNull(),
	postalCode: varchar("postal_code", { length: 20 }),
	notes: text(),
	subtotal: integer().notNull(),
	shippingPrice: integer("shipping_price").notNull(),
	discount: integer().default(0).notNull(),
	total: integer().notNull(),
	status: orderStatus().default('pending').notNull(),
	paymentMethod: paymentMethod("payment_method").default('cash_on_delivery').notNull(),
	couponCode: varchar("coupon_code", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	loyaltyDiscount: integer("loyalty_discount").default(0).notNull(),
	loyaltyPointsUsed: integer("loyalty_points_used").default(0).notNull(),
	idempotencyKey: varchar("idempotency_key", { length: 100 }),
}, (table) => [
	uniqueIndex("orders_idempotency_key_unique").using("btree", table.idempotencyKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}),
]);

export const settings = pgTable("settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: varchar({ length: 255 }).notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("settings_key_unique").on(table.key),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	userId: uuid("user_id"),
	customerName: varchar("customer_name", { length: 255 }),
	rating: integer().notNull(),
	comment: text(),
	isApproved: boolean("is_approved").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	title: varchar({ length: 255 }),
	isHomepage: boolean("is_homepage").default(false).notNull(),
}, (table) => [
	uniqueIndex("reviews_user_product_unique").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reviews_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reviews_user_id_users_id_fk"
		}),
]);

export const wishlist = pgTable("wishlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	productId: uuid("product_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlist_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wishlist_user_id_users_id_fk"
		}),
]);

export const phoneModels = pgTable("phone_models", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	brand: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("phone_models_name_unique").on(table.name),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	passwordHash: text("password_hash").notNull(),
	role: userRole().default('customer').notNull(),
	loyaltyPoints: integer("loyalty_points").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	loyaltyPointsEarned: integer("loyalty_points_earned").default(0).notNull(),
	loyaltyPointsRedeemed: integer("loyalty_points_redeemed").default(0).notNull(),
	avatarUrl: varchar("avatar_url", { length: 500 }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const rewardRedemptions = pgTable("reward_redemptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	productId: uuid("product_id"),
	phoneModel: varchar("phone_model", { length: 255 }).notNull(),
	pointsUsed: integer("points_used").default(300).notNull(),
	status: rewardStatus().default('redeemed').notNull(),
	orderId: uuid("order_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "reward_redemptions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reward_redemptions_product_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reward_redemptions_user_id_fkey"
		}),
]);

export const loyaltyTransactions = pgTable("loyalty_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: loyaltyTransactionType().notNull(),
	points: integer().notNull(),
	orderId: uuid("order_id"),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "loyalty_transactions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "loyalty_transactions_user_id_fkey"
		}),
]);

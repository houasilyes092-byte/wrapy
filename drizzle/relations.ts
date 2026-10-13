import { relations } from "drizzle-orm/relations";
import { orders, orderItems, products, collections, users, reviews, wishlist, rewardRedemptions, loyaltyTransactions } from "./schema";

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	rewardRedemptions: many(rewardRedemptions),
	loyaltyTransactions: many(loyaltyTransactions),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	collection: one(collections, {
		fields: [products.collectionId],
		references: [collections.id]
	}),
	reviews: many(reviews),
	wishlists: many(wishlist),
	rewardRedemptions: many(rewardRedemptions),
}));

export const collectionsRelations = relations(collections, ({many}) => ({
	products: many(products),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
	reviews: many(reviews),
	wishlists: many(wishlist),
	rewardRedemptions: many(rewardRedemptions),
	loyaltyTransactions: many(loyaltyTransactions),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	product: one(products, {
		fields: [reviews.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [reviews.userId],
		references: [users.id]
	}),
}));

export const wishlistRelations = relations(wishlist, ({one}) => ({
	product: one(products, {
		fields: [wishlist.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [wishlist.userId],
		references: [users.id]
	}),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({one}) => ({
	order: one(orders, {
		fields: [rewardRedemptions.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [rewardRedemptions.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [rewardRedemptions.userId],
		references: [users.id]
	}),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({one}) => ({
	order: one(orders, {
		fields: [loyaltyTransactions.orderId],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [loyaltyTransactions.userId],
		references: [users.id]
	}),
}));
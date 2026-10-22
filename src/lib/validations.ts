import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  comparePrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).default([]),
  compatibleModels: z.array(z.string()).default([]),
  stock: z.number().int().min(0).default(0),
  madeToOrder: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isBestSeller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  phone: z.string().min(4, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  couponCode: z.string().optional().or(z.literal("")),
  idempotencyKey: z.string().uuid().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      phoneModel: z.string().optional(),
      quantity: z.number().int().min(1).max(99),
    })
  ).min(1, "Cart cannot be empty").max(50),
  // Spend 300 loyalty points to make one unit of this cart line free.
  reward: z.object({
    productId: z.string().uuid(),
    phoneModel: z.string().optional(),
  }).optional().nullable(),
});

export const couponSchema = z.object({
  code: z.string().min(1, "Code is required").toUpperCase(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(0, "Value must be positive"),
  maxUses: z.number().int().min(0).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  customerName: z.string().optional(),
});

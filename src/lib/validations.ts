import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, "Adresse e-mail trop longue")
  .email("Adresse e-mail invalide");

// Sign-in only checks that a password was typed: rules for new passwords must
// never lock out accounts created under older rules.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Saisissez votre mot de passe").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
  email: emailField,
  phone: z
    .string()
    .trim()
    .max(30, "Numéro de téléphone trop long")
    .regex(/^[\d\s+\-().]*$/, "Numéro de téléphone invalide")
    .optional(),
  // bcrypt only reads the first 72 bytes of a password.
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  comparePrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).default([]),
  compatibleModels: z.array(z.string().trim().min(1).max(255)).max(500).default([]),
  stock: z.number().int().min(0).default(0),
  madeToOrder: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isBestSeller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and hyphens only"),
  description: z.string().max(2000).optional().nullable(),
  images: z.array(z.string().max(500)).max(20).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
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
      phoneModel: z.string().trim().max(100).optional(),
      quantity: z.number().int().min(1).max(99),
    })
  ).min(1, "Cart cannot be empty").max(50),
  // Spend 300 loyalty points to make one unit of this cart line free.
  reward: z.object({
    productId: z.string().uuid(),
    phoneModel: z.string().trim().max(100).optional(),
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

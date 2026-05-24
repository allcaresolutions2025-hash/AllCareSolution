import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/\d/, "Must include a number"),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{8}$/, "Invalid referral code")
    .optional()
    .or(z.literal("")),
  agreeToTerms: z.boolean().refine((v) => v === true, "You must accept the terms"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const addressSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid mobile number"),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  isDefault: z.boolean().optional(),
});

export const kycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN format"),
  panName: z.string().min(2).max(80),
  bankAccount: z.string().regex(/^\d{9,18}$/, "Invalid account number"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  bankHolderName: z.string().min(2).max(80),
});

export const productSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(2).max(120),
  shortDesc: z.string().min(2).max(200),
  description: z.string().min(2).max(5000),
  ingredients: z.string().max(2000).optional().or(z.literal("")),
  mrp: z.number().int().positive(),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  sku: z.string().min(2).max(40),
  imageUrl: z.string().url(),
  gstRate: z.number().int().min(0).max(28),
  isActive: z.boolean(),
});

export const payoutRequestSchema = z.object({
  amount: z.number().positive(),
});

export const settingsSchema = z.object({
  COMMISSION_L1_PERCENT: z.number().min(0).max(50),
  COMMISSION_L2_PERCENT: z.number().min(0).max(50),
  BUYBACK_DAYS: z.number().int().min(15).max(90),
  TDS_PERCENT: z.number().min(0).max(30),
  TDS_THRESHOLD_INR: z.number().min(0),
  GST_DEFAULT_PERCENT: z.number().min(0).max(28),
  SHIPPING_COST_INR: z.number().min(0),
});

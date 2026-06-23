import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  imei: z.string().optional(),
  brandId: z.string().min(1, 'Brand is required'),
  categoryId: z.string().min(1, 'Category is required'),
  color: z.string().optional(),
  storage: z.string().optional(),
  ram: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative'),
  salePrice: z.coerce.number().min(0, 'Sale price cannot be negative'),
  wholesalePrice: z.coerce.number().min(0).optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  minStockLevel: z.coerce.number().int().min(0).default(5),
  status: z.enum(['active', 'inactive']).default('active'),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  showInPos: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type BrandFormData = z.infer<typeof brandSchema>;

export const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  code: z.string().min(1, 'Short code is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type UnitFormData = z.infer<typeof unitSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  businessType: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer']),
  notes: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const checkoutSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().default('Walk-in Customer'),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'jazzcash', 'easypaisa', 'credit']),
  paidAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const settingsSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  currency: z.string().default('PKR'),
  dateFormat: z.string().default('dd/MM/yyyy'),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

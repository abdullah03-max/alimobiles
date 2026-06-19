// Product
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  imei?: string;
  brandId: string;
  categoryId: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  minStockLevel: number;
  unitId: string;
  image?: string;
  status: 'active' | 'inactive';
  condition: 'new' | 'used' | 'refurbished';
  showInPos: boolean;
  createdAt: string;
  updatedAt: string;
};

// Category
type Category = {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  image?: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  showInPos: boolean;
  createdAt: string;
};

// Brand
type Brand = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

// Unit
type Unit = {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
};

// Supplier
type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  businessType?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

// Customer
type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

// Sale Item
type SaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imei?: string;
};

// Sale
type Sale = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  changeDue: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'credit';
  status: 'paid' | 'pending' | 'partial' | 'cancelled';
  notes?: string;
  createdAt: string;
  createdBy: string;
};

// Purchase Item
type PurchaseItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

// Purchase
type Purchase = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  paidAmount: number;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
  notes?: string;
  reference?: string;
  createdAt: string;
};

// Return
type ReturnRecord = {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: ReturnItem[];
  refundAmount: number;
  restockingFee: number;
  finalRefund: number;
  refundMethod: 'cash' | 'card' | 'store_credit';
  status: 'pending' | 'completed' | 'refunded';
  notes?: string;
  createdAt: string;
};

// Return Item
type ReturnItem = {
  productId: string;
  productName: string;
  originalQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  total: number;
  reason: string;
};

// Inventory Adjustment
type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  type: 'add' | 'remove' | 'set';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
};

// Expense
type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  receipt?: string;
  notes?: string;
  createdAt: string;
};

// Payment
type Payment = {
  id: string;
  invoiceId: string;
  customerId?: string;
  supplierId?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  reference?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
};

// User
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier';
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
};

// Shop Settings
type ShopSettings = {
  shopName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  businessRegNumber?: string;
  taxNumber?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
};

// Receipt Settings
type ReceiptSettings = {
  header?: string;
  footer?: string;
  showLogo: boolean;
  receiptWidth: '58mm' | '80mm';
  invoicePrefix: string;
  startingNumber: number;
  showTaxBreakdown: boolean;
  termsAndConditions?: string;
};

// Tax Settings
type TaxSettings = {
  enabled: boolean;
  name: string;
  rate: number;
  registrationNumber?: string;
  includedInPrice: boolean;
};

// Cart Item (POS)
type CartItem = {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imei?: string;
  maxStock: number;
};

// Toast
type Toast = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
};

// Navigation Item
type NavItem = {
  label: string;
  path: string;
  icon: string;
  submenu?: { label: string; path: string }[];
};

export type {
  Product,
  Category,
  Brand,
  Unit,
  Supplier,
  Customer,
  SaleItem,
  Sale,
  PurchaseItem,
  Purchase,
  ReturnRecord,
  ReturnItem,
  StockAdjustment,
  Expense,
  Payment,
  User,
  ShopSettings,
  ReceiptSettings,
  TaxSettings,
  CartItem,
  Toast,
  NavItem,
};

export const APP_NAME = 'Ali Mobiles POS';
export const CURRENCY = 'PKR';
export const DATE_FORMAT = 'dd/MM/yyyy';

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Utilities',
  'Maintenance',
  'Marketing',
  'Transportation',
  'Miscellaneous',
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
  { value: 'card', label: 'Credit/Debit Card', icon: 'CreditCard' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'Landmark' },
  { value: 'credit', label: 'Customer Credit', icon: 'Wallet' },
] as const;

export const RETURN_REASONS = [
  'Defective',
  'Damaged',
  'Wrong Item',
  'Customer Changed Mind',
  'Other',
] as const;

export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export const SALE_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const;

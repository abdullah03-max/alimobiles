import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-PK').format(num);
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '-';
  try {
    return format(new Date(date), pattern);
  } catch {
    return String(date);
  }
}

export function formatHeaderDate(pattern = 'dd/MM/yyyy'): string {
  const now = new Date();
  try {
    return `${format(now, 'EEEE')}, ${format(now, pattern)}`;
  } catch {
    return now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

export function formatHeaderDateTime(pattern = 'dd/MM/yyyy'): string {
  const now = new Date();
  try {
    return `${format(now, 'EEEE')}, ${format(now, pattern)} ${format(now, 'HH:mm:ss')}`;
  } catch {
    return `${now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-PK')}`;
  }
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  } catch {
    return String(date);
  }
}

export function generateInvoiceNumber(prefix = 'INV', nextNumber?: number): string {
  if (typeof nextNumber === 'number') {
    const hasPrefix = Boolean(prefix && prefix.trim());
    const numberText = hasPrefix ? String(nextNumber).padStart(6, '0') : String(nextNumber);
    return hasPrefix ? `${prefix}-${numberText}` : numberText;
  }

  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${timestamp}-${random}`;
}

export function generatePONumber(): string {
  const prefix = 'PO';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${timestamp}-${random}`;
}

export function generateReturnNumber(): string {
  const prefix = 'RET';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${timestamp}-${random}`;
}

export function generateBarcode(): string {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getStockStatus(stock: number, minLevel: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= minLevel) return 'low_stock';
  return 'in_stock';
}

export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':
    case 'active':
    case 'completed':
    case 'received':
    case 'in_stock':
      return { bg: 'bg-green-50', text: 'text-green-600' };
    case 'pending':
    case 'partial':
    case 'low_stock':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600' };
    case 'cancelled':
    case 'inactive':
    case 'out_of_stock':
    case 'returned':
      return { bg: 'bg-red-50', text: 'text-red-600' };
    case 'refunded':
      return { bg: 'bg-blue-50', text: 'text-blue-600' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-600' };
  }
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Rent': 'bg-blue-50 text-blue-600',
    'Salary': 'bg-green-50 text-green-600',
    'Utilities': 'bg-yellow-50 text-yellow-600',
    'Maintenance': 'bg-orange-50 text-orange-600',
    'Marketing': 'bg-purple-50 text-purple-600',
    'Transportation': 'bg-gray-50 text-gray-600',
    'Miscellaneous': 'bg-gray-100 text-gray-700',
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
}

export function calculateProfit(cost: number, sale: number): { amount: number; margin: number } {
  const amount = sale - cost;
  const margin = cost > 0 ? (amount / sale) * 100 : 0;
  return { amount, margin: Math.round(margin * 100) / 100 };
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

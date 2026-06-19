import { create } from 'zustand';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  customerId?: string;
  customerName: string;
  notes: string;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (value: number, type: 'percent' | 'amount') => void;
  setCustomer: (id: string | undefined, name: string) => void;
  setNotes: (notes: string) => void;

  subtotal: () => number;
  discountAmount: () => number;
  taxAmount: () => number;
  grandTotal: () => number;
  itemCount: () => number;
}

type StoredTaxSettings = {
  enabled: boolean;
  rate: number;
  includedInPrice: boolean;
};

const getTaxSettings = (): StoredTaxSettings => {
  const tax = JSON.parse(localStorage.getItem('pos_tax_settings') || '{"enabled":false,"rate":0,"includedInPrice":false}');
  return {
    enabled: Boolean(tax.enabled),
    rate: Number(tax.rate) || 0,
    includedInPrice: Boolean(tax.includedInPrice),
  };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  discountType: 'percent',
  customerId: undefined,
  customerName: 'Walk-in Customer',
  notes: '',

  addItem: (product: Product) => {
    const { items } = get();
    const existing = items.find(i => i.productId === product.id);
    
    if (existing) {
      const newQty = Math.min(existing.quantity + 1, product.stockQuantity);
      set({
        items: items.map(i =>
          i.productId === product.id
            ? { ...i, quantity: newQty, total: newQty * i.unitPrice }
            : i
        ),
      });
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.salePrice,
        total: product.salePrice,
        maxStock: product.stockQuantity,
        imei: product.imei,
      };
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter(i => i.productId !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map(i =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.maxStock), total: Math.min(quantity, i.maxStock) * i.unitPrice }
          : i
      ),
    });
  },

  clearCart: () => {
    set({ items: [], discount: 0, customerId: undefined, customerName: 'Walk-in Customer', notes: '' });
  },

  setDiscount: (value: number, type: 'percent' | 'amount') => {
    set({ discount: value, discountType: type });
  },

  setCustomer: (id: string | undefined, name: string) => {
    set({ customerId: id, customerName: name });
  },

  setNotes: (notes: string) => {
    set({ notes });
  },

  subtotal: () => get().items.reduce((sum, i) => sum + i.total, 0),

  discountAmount: () => {
    const { discount, discountType } = get();
    const sub = get().subtotal();
    if (discountType === 'percent') return Math.round(sub * (discount / 100));
    return discount;
  },

  taxAmount: () => {
    const taxSettings = getTaxSettings();
    if (!taxSettings.enabled) return 0;

    const taxable = get().subtotal() - get().discountAmount();
    const rate = taxSettings.rate / 100;

    if (taxSettings.includedInPrice) {
      return Math.round(taxable - taxable / (1 + rate));
    }

    return Math.round(taxable * rate);
  },

  grandTotal: () => {
    const taxSettings = getTaxSettings();
    const taxable = get().subtotal() - get().discountAmount();
    return taxSettings.enabled && taxSettings.includedInPrice ? taxable : taxable + get().taxAmount();
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

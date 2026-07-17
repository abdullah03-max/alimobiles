import { create } from 'zustand';
import type { CartItem, Product } from '@/types';
import { useImeiStore } from '@/stores/imeiStore';
import { useProductStore } from '@/stores/productStore';

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  customerId?: string;
  customerName: string;
  notes: string;

  addItem: (product: Product, imei?: string) => boolean;
  removeItem: (productId: string, imei?: string) => void;
  updateQuantity: (productId: string, quantity: number, imei?: string) => void;
  clearCart: () => void;
  setDiscount: (value: number, type: 'percent' | 'amount') => void;
  setProductDiscount: (productId: string, value: number, type: 'percent' | 'amount', imei?: string) => void;
  setCustomer: (id: string | undefined, name: string) => void;
  setNotes: (notes: string) => void;

  subtotal: () => number;
  discountPercent: () => number;
  discountAmount: () => number;
  taxAmount: () => number;
  grandTotal: () => number;
  itemCount: () => number;
}



export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  discountType: 'percent',
  customerId: undefined,
  customerName: 'Walk-in Customer',
  notes: '',

  addItem: (product: Product, imei?: string) => {
    const { items } = get();
    const itemImei = imei ?? product.imei;
    const normalize = (value?: string) => value?.trim().toLowerCase() || '';
    const itemImeiNormalized = normalize(itemImei);
    const existing = itemImei
      ? items.find(i => i.productId === product.id && normalize(i.imei) === itemImeiNormalized)
      : items.find(i => i.productId === product.id && !i.imei);

    let productColors: string[] = [];
    let productStorages: string[] = [];
    let productRams: string[] = [];
    let ptaStatus = '';
    const hasImei = Boolean(itemImei || product.imei);

    if (product?.description?.startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        productColors = parsed.colors || [];
        productStorages = (parsed.variants || []).map((v: any) => v.storage).filter(Boolean);
        productRams = (parsed.variants || []).map((v: any) => v.ram).filter(Boolean);
        ptaStatus = parsed.ptaStatus || '';
      } catch (e) {}
    }
    if (!ptaStatus && hasImei) {
      ptaStatus = 'non-approved';
    }

    if (itemImei) {
      const imeiRecord = useImeiStore.getState().findByImei(itemImei);
      const imei1 = imeiRecord?.imei1 || itemImei;
      const imei2 = imeiRecord?.imei2 || '';
      const normalizedTargets = [normalize(imei1), normalize(imei2)].filter(Boolean);

      const duplicateDevice = items.some(i => {
        if (i.productId !== product.id) return false;
        const existingImeis = [normalize(i.imei), normalize(i.imei1), normalize(i.imei2)].filter(Boolean);
        return normalizedTargets.some(target => existingImeis.includes(target));
      });
      if (duplicateDevice) return false;
      if (existing) return false;

      const color = imeiRecord?.color || productColors[0] || product?.color || '';
      const ram = imeiRecord?.ram || productRams[0] || product?.ram || '';
      const storage = imeiRecord?.storage || productStorages[0] || product?.storage || '';

      // derive brand name and model when possible
      const brand = useProductStore.getState().getBrandById(product.brandId);
      const category = useProductStore.getState().getCategoryById(product.categoryId);
      let model = product.name;
      if ((category?.name === 'Mobiles' || category?.name === 'Tablets') && brand?.name) {
        const brandPrefix = brand.name.toLowerCase();
        if (product.name.toLowerCase().startsWith(brandPrefix)) {
          model = product.name.substring(brand.name.length).trim();
        }
      }

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        brandName: brand?.name,
        model,
        storage,
        quantity: 1,
        unitPrice: product.salePrice,
        total: product.salePrice,
        maxStock: 1,
        imei: itemImei,
        imei1,
        imei2,
        color,
        ram,
        ptaStatus,
        discount: 0,
        discountType: 'amount',
      };
      set({ items: [...items, newItem] });
      return true;
    }

    if (existing) {
      const newQty = Math.min(existing.quantity + 1, product.stockQuantity);
      set({
        items: items.map(i =>
          i.productId === product.id && !i.imei
            ? { ...i, quantity: newQty, total: newQty * i.unitPrice }
            : i
        ),
      });
      return true;
    } else {
      const brand = useProductStore.getState().getBrandById(product.brandId);
      const category = useProductStore.getState().getCategoryById(product.categoryId);
      let model = product.name;
      if ((category?.name === 'Mobiles' || category?.name === 'Tablets') && brand?.name) {
        const brandPrefix = brand.name.toLowerCase();
        if (product.name.toLowerCase().startsWith(brandPrefix)) {
          model = product.name.substring(brand.name.length).trim();
        }
      }

      const color = productColors[0] || product?.color || '';
      const ram = productRams[0] || product?.ram || '';
      const storage = productStorages[0] || product?.storage || '';

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        brandName: brand?.name,
        model,
        storage,
        quantity: 1,
        unitPrice: product.salePrice,
        total: product.salePrice,
        maxStock: product.stockQuantity,
        color,
        ram,
        ptaStatus,
        discount: 0,
        discountType: 'amount',
      };
      set({ items: [...items, newItem] });
      return true;
    }
  },

  removeItem: (productId: string, imei?: string) => {
    set({ items: get().items.filter(i => i.productId !== productId || (imei ? i.imei !== imei : !!i.imei)) });
  },

  updateQuantity: (productId: string, quantity: number, imei?: string) => {
    if (quantity <= 0) {
      get().removeItem(productId, imei);
      return;
    }
    set({
      items: get().items.map(i =>
        i.productId === productId && i.imei === imei
          ? { ...i, quantity: Math.min(quantity, i.maxStock), total: Math.min(quantity, i.maxStock) * i.unitPrice }
          : i
      ),
    });
  },

  clearCart: () => {
    set({ items: [], discount: 0, customerId: undefined, customerName: 'Walk-in Customer', notes: '' });
  },

  setDiscount: (value: number, type: 'percent' | 'amount') => {
    const sub = get().subtotal();
    if (type === 'percent') {
      const percent = Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0;
      set({ discount: percent, discountType: 'percent' });
    } else {
      const amount = Number.isFinite(value) ? Math.max(0, Math.min(value, sub)) : 0;
      set({ discount: amount, discountType: 'amount' });
    }
  },

  setProductDiscount: (productId: string, value: number, type: 'percent' | 'amount', imei?: string) => {
    set({
      items: get().items.map(i =>
        i.productId === productId && i.imei === imei
          ? { ...i, discount: Math.max(0, value), discountType: type }
          : i
      ),
    });
  },

  setCustomer: (id: string | undefined, name: string) => {
    set({ customerId: id, customerName: name });
  },

  setNotes: (notes: string) => {
    set({ notes });
  },

  subtotal: () => get().items.reduce((sum, i) => sum + i.total, 0),

  discountPercent: () => {
    const sub = get().subtotal();
    if (sub <= 0) return 0;
    return Number(((get().discountAmount() / sub) * 100).toFixed(2));
  },

  discountAmount: () => {
    return get().items.reduce((sum, item) => {
      const base = item.quantity * item.unitPrice;
      const val = item.discount || 0;
      if (item.discountType === 'percent') {
        return sum + Math.round(base * (val / 100));
      }
      return sum + Math.min(val, base);
    }, 0);
  },

  taxAmount: () => 0,

  grandTotal: () => get().subtotal() - get().discountAmount(),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

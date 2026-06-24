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

  addItem: (product: Product, imei?: string) => void;
  removeItem: (productId: string, imei?: string) => void;
  updateQuantity: (productId: string, quantity: number, imei?: string) => void;
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
    const existing = itemImei
      ? items.find(i => i.productId === product.id && i.imei === itemImei)
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
      
      if (existing) return;
      
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
      };
      set({ items: [...items, newItem] });
      return;
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
      };
      set({ items: [...items, newItem] });
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

  taxAmount: () => 0,

  grandTotal: () => get().subtotal() - get().discountAmount(),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

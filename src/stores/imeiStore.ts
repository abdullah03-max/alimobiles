import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import { useProductStore } from '@/stores/productStore';
import type { ProductIMEI } from '@/types';

const STORAGE_KEY = 'pos_product_imeis';

interface ImeiState {
  imeis: ProductIMEI[];
  loadData: () => void;
  addImei: (productId: string, imei: string, color?: string, ram?: string, storage?: string) => Promise<ProductIMEI | null>;
  removeImei: (id: string) => Promise<void>;
  findByImei: (imei: string) => ProductIMEI | undefined;
  isImeiUnique: (imei: string) => boolean;
  getImeisByProduct: (productId: string) => ProductIMEI[];
  getAvailableByProduct: (productId: string) => ProductIMEI[];
  countAvailable: (productId: string) => number;
  markImeiSold: (imei: string) => Promise<boolean>;
  markImeiAvailable: (imei: string) => Promise<boolean>;
}

function readLocalStorage(): ProductIMEI[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductIMEI[]) : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(imeis: ProductIMEI[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imeis));
  } catch {
    // ignore write failures
  }
}

export const useImeiStore = create<ImeiState>((set, get) => ({
  imeis: [],

  loadData: () => {
    const imeis = readLocalStorage();
    set({ imeis });
  },

  addImei: async (productId, imei, color, ram, storage) => {
    const normalized = imei.trim();
    if (!normalized) return null;
    if (!get().isImeiUnique(normalized)) return null;

    const newImei: ProductIMEI = {
      id: generateId(),
      productId,
      imei: normalized,
      status: 'available',
      color,
      ram,
      storage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextImeis = [newImei, ...get().imeis];
    set({ imeis: nextImeis });
    writeLocalStorage(nextImeis);

    const available = get().countAvailable(productId);
    await useProductStore.getState().updateProduct(productId, { stockQuantity: available });
    return newImei;
  },

  removeImei: async (id) => {
    const existing = get().imeis.find(i => i.id === id);
    if (!existing) return;

    const nextImeis = get().imeis.filter(i => i.id !== id);
    set({ imeis: nextImeis });
    writeLocalStorage(nextImeis);

    if (existing.status === 'available') {
      const available = get().countAvailable(existing.productId);
      await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    }
  },

  findByImei: (imei) => {
    const normalized = imei.trim();
    return get().imeis.find(i => i.imei === normalized);
  },

  isImeiUnique: (imei) => {
    const normalized = imei.trim();
    return !get().imeis.some(i => i.imei === normalized);
  },

  getImeisByProduct: (productId) => get().imeis.filter(i => i.productId === productId),

  getAvailableByProduct: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available'),

  countAvailable: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available').length,

  markImeiSold: async (imei) => {
    const normalized = imei.trim();
    const imeis = get().imeis;
    const index = imeis.findIndex(i => i.imei === normalized);
    if (index === -1) return false;
    const existing = imeis[index];
    if (existing.status !== 'available') return false;

    const updated: ProductIMEI = {
      ...existing,
      status: 'sold',
      updatedAt: new Date().toISOString(),
      soldAt: new Date().toISOString(),
    };
    const nextImeis = [...imeis.slice(0, index), updated, ...imeis.slice(index + 1)];
    set({ imeis: nextImeis });
    writeLocalStorage(nextImeis);

    const available = get().countAvailable(existing.productId);
    await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    return true;
  },

  markImeiAvailable: async (imei) => {
    const normalized = imei.trim();
    const imeis = get().imeis;
    const index = imeis.findIndex(i => i.imei === normalized);
    if (index === -1) return false;
    const existing = imeis[index];
    if (existing.status !== 'sold') return false;

    const updated: ProductIMEI = {
      ...existing,
      status: 'available',
      updatedAt: new Date().toISOString(),
      soldAt: undefined,
    };
    const nextImeis = [...imeis.slice(0, index), updated, ...imeis.slice(index + 1)];
    set({ imeis: nextImeis });
    writeLocalStorage(nextImeis);

    const available = get().countAvailable(existing.productId);
    await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    return true;
  },
}));

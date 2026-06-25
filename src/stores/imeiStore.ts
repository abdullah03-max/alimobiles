import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import { useProductStore } from '@/stores/productStore';
import type { ProductIMEI } from '@/types';

const STORAGE_KEY = 'pos_product_imeis';

interface ImeiState {
  imeis: ProductIMEI[];
  loadData: () => void;
  addImei: (productId: string, imei1: string, imei2: string, color?: string, ram?: string, storage?: string) => Promise<ProductIMEI | null>;
  removeImei: (id: string) => Promise<void>;
  findByImei: (imei: string) => ProductIMEI | undefined;
  isImeiUnique: (imei: string) => boolean;
  getImeisByProduct: (productId: string) => ProductIMEI[];
  getAvailableByProduct: (productId: string) => ProductIMEI[];
  countAvailable: (productId: string) => number;
  markImeiSold: (imei: string) => Promise<boolean>;
  markImeiAvailable: (imei: string) => Promise<boolean>;
  deleteImeisByProduct: (productId: string) => ProductIMEI[];
  clearAllImeis: () => void;
  restoreImeis: (imeis: ProductIMEI[]) => void;
}

function readLocalStorage(): ProductIMEI[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as any[]) : [];
    // Migrate old single imei records to have imei1 and imei2
    return parsed.map(item => ({
      ...item,
      imei1: item.imei1 || item.imei || '',
      imei2: item.imei2 || '',
      imei: item.imei || item.imei1 || '',
    }));
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

  addImei: async (productId, imei1, imei2, color, ram, storage) => {
    const normalized1 = imei1.trim();
    const normalized2 = imei2.trim();
    if (!normalized1 || !normalized2) return null;
    if (!get().isImeiUnique(normalized1) || !get().isImeiUnique(normalized2)) return null;

    const newImei: ProductIMEI = {
      id: generateId(),
      productId,
      imei: normalized1,
      imei1: normalized1,
      imei2: normalized2,
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
    const normalized = imei.trim().toLowerCase();
    const rec = get().imeis.find(i =>
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
    if (!rec) return undefined;
    // Return a shallow copy where `imei` contains the actual matched IMEI
    const matched = (rec.imei1 && rec.imei1.toLowerCase() === normalized)
      ? rec.imei1
      : (rec.imei2 && rec.imei2.toLowerCase() === normalized)
      ? rec.imei2
      : (rec.imei || rec.imei1 || rec.imei2 || '');
    return { ...rec, imei: matched } as ProductIMEI;
  },

  isImeiUnique: (imei) => {
    const normalized = imei.trim().toLowerCase();
    if (!normalized) return true;
    return !get().imeis.some(i => 
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
  },

  getImeisByProduct: (productId) => get().imeis.filter(i => i.productId === productId),

  getAvailableByProduct: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available'),

  countAvailable: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available').length,

  markImeiSold: async (imei) => {
    const normalized = imei.trim().toLowerCase();
    const imeis = get().imeis;
    const index = imeis.findIndex(i => 
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
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
    const normalized = imei.trim().toLowerCase();
    const imeis = get().imeis;
    const index = imeis.findIndex(i => 
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
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

  deleteImeisByProduct: (productId) => {
    const allImeis = get().imeis;
    const related = allImeis.filter(i => i.productId === productId);
    const remaining = allImeis.filter(i => i.productId !== productId);
    set({ imeis: remaining });
    writeLocalStorage(remaining);
    return related;
  },

  clearAllImeis: () => {
    set({ imeis: [] });
    writeLocalStorage([]);
  },

  restoreImeis: (restored) => {
    const nextImeis = [...restored, ...get().imeis];
    set({ imeis: nextImeis });
    writeLocalStorage(nextImeis);
  },
}));

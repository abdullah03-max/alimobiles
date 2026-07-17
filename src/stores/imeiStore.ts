import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { useProductStore } from '@/stores/productStore';
import type { ProductIMEI } from '@/types';

const TABLE = 'product_imeis';

// Convert snake_case DB row to camelCase ProductIMEI
function toCamelCase(row: any): ProductIMEI {
  return {
    id: row.id,
    productId: row.product_id,
    imei: row.imei || row.imei1 || '',
    imei1: row.imei1 || '',
    imei2: row.imei2 || '',
    status: row.status || 'available',
    color: row.color || undefined,
    ram: row.ram || undefined,
    storage: row.storage || undefined,
    soldAt: row.sold_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

interface ImeiState {
  imeis: ProductIMEI[];
  loading: boolean;
  loadData: () => Promise<void>;
  addImei: (productId: string, imei1: string, imei2: string, color?: string, ram?: string, storage?: string) => Promise<ProductIMEI | null>;
  removeImei: (id: string) => Promise<void>;
  findByImei: (imei: string) => ProductIMEI | undefined;
  isImeiUnique: (imei: string) => boolean;
  getImeisByProduct: (productId: string) => ProductIMEI[];
  getAvailableByProduct: (productId: string) => ProductIMEI[];
  countAvailable: (productId: string) => number;
  markImeiSold: (imei: string) => Promise<boolean>;
  markImeiAvailable: (imei: string) => Promise<boolean>;
  deleteImeisByProduct: (productId: string) => Promise<ProductIMEI[]>;
  clearAllImeis: () => Promise<void>;
  restoreImeis: (imeis: ProductIMEI[]) => Promise<void>;
}

export const useImeiStore = create<ImeiState>((set, get) => ({
  imeis: [],
  loading: false,

  // ──────────────────────── Load all IMEIs from Supabase ────────────────────────
  loadData: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load IMEIs from Supabase:', error);
        // Fallback: try reading from localStorage if Supabase fails (table might not exist yet)
        try {
          const raw = window.localStorage.getItem('pos_product_imeis');
          if (raw) {
            const parsed = JSON.parse(raw) as any[];
            const migrated = parsed.map(item => ({
              ...item,
              imei1: item.imei1 || item.imei || '',
              imei2: item.imei2 || '',
              imei: item.imei || item.imei1 || '',
            }));
            set({ imeis: migrated });
          }
        } catch {
          // ignore localStorage failures
        }
        return;
      }

      const imeis = (data || []).map(toCamelCase);
      set({ imeis });
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ──────────────────────── Add IMEI to Supabase ────────────────────────
  addImei: async (productId, imei1, imei2, color, ram, storage) => {
    const normalized1 = imei1.trim();
    const normalized2 = imei2.trim();
    if (!normalized1 || !normalized2) return null;
    if (!get().isImeiUnique(normalized1) || !get().isImeiUnique(normalized2)) return null;

    const row = {
      product_id: productId,
      imei: normalized1,
      imei1: normalized1,
      imei2: normalized2,
      status: 'available',
      color: color || null,
      ram: ram || null,
      storage: storage || null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to add IMEI to Supabase:', error);
      return null;
    }

    const newImei = toCamelCase(data);
    const nextImeis = [newImei, ...get().imeis];
    set({ imeis: nextImeis });

    // Update product stock count
    const available = nextImeis.filter(i => i.productId === productId && i.status === 'available').length;
    await useProductStore.getState().updateProduct(productId, { stockQuantity: available });
    return newImei;
  },

  // ──────────────────────── Remove IMEI from Supabase ────────────────────────
  removeImei: async (id) => {
    const existing = get().imeis.find(i => i.id === id);
    if (!existing) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to remove IMEI from Supabase:', error);
      return;
    }

    const nextImeis = get().imeis.filter(i => i.id !== id);
    set({ imeis: nextImeis });

    if (existing.status === 'available') {
      const available = nextImeis.filter(i => i.productId === existing.productId && i.status === 'available').length;
      await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    }
  },

  // ──────────────────────── Find by IMEI (in-memory) ────────────────────────
  findByImei: (imei) => {
    const normalized = imei.trim().toLowerCase();
    const rec = get().imeis.find(i =>
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
    if (!rec) return undefined;
    const matched = (rec.imei1 && rec.imei1.toLowerCase() === normalized)
      ? rec.imei1
      : (rec.imei2 && rec.imei2.toLowerCase() === normalized)
      ? rec.imei2
      : (rec.imei || rec.imei1 || rec.imei2 || '');
    return { ...rec, imei: matched } as ProductIMEI;
  },

  // ──────────────────────── Check uniqueness (in-memory) ────────────────────────
  isImeiUnique: (imei) => {
    const normalized = imei.trim().toLowerCase();
    if (!normalized) return true;
    return !get().imeis.some(i =>
      (i.imei1 && i.imei1.toLowerCase() === normalized) ||
      (i.imei2 && i.imei2.toLowerCase() === normalized) ||
      (i.imei && i.imei.toLowerCase() === normalized)
    );
  },

  // ──────────────────────── Getters (in-memory) ────────────────────────
  getImeisByProduct: (productId) => get().imeis.filter(i => i.productId === productId),
  getAvailableByProduct: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available'),
  countAvailable: (productId) => get().imeis.filter(i => i.productId === productId && i.status === 'available').length,

  // ──────────────────────── Mark IMEI sold in Supabase ────────────────────────
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

    const now = new Date().toISOString();
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'sold', sold_at: now, updated_at: now })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to mark IMEI sold in Supabase:', error);
      return false;
    }

    const updated: ProductIMEI = {
      ...existing,
      status: 'sold',
      updatedAt: now,
      soldAt: now,
    };
    const nextImeis = [...imeis.slice(0, index), updated, ...imeis.slice(index + 1)];
    set({ imeis: nextImeis });

    const available = nextImeis.filter(i => i.productId === existing.productId && i.status === 'available').length;
    await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    return true;
  },

  // ──────────────────────── Mark IMEI available in Supabase ────────────────────────
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

    const now = new Date().toISOString();
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'available', sold_at: null, updated_at: now })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to mark IMEI available in Supabase:', error);
      return false;
    }

    const updated: ProductIMEI = {
      ...existing,
      status: 'available',
      updatedAt: now,
      soldAt: undefined,
    };
    const nextImeis = [...imeis.slice(0, index), updated, ...imeis.slice(index + 1)];
    set({ imeis: nextImeis });

    const available = nextImeis.filter(i => i.productId === existing.productId && i.status === 'available').length;
    await useProductStore.getState().updateProduct(existing.productId, { stockQuantity: available });
    return true;
  },

  // ──────────────────────── Delete all IMEIs for a product ────────────────────────
  deleteImeisByProduct: async (productId) => {
    const allImeis = get().imeis;
    const related = allImeis.filter(i => i.productId === productId);
    const remaining = allImeis.filter(i => i.productId !== productId);

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('product_id', productId);

    if (error) {
      console.error('Failed to delete product IMEIs from Supabase:', error);
      // Still update local state since the product itself might be getting deleted
    }

    set({ imeis: remaining });
    return related;
  },

  // ──────────────────────── Clear all IMEIs ────────────────────────
  clearAllImeis: async () => {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .not('id', 'is', null);

    if (error) {
      console.error('Failed to clear all IMEIs from Supabase:', error);
    }

    set({ imeis: [] });
  },

  // ──────────────────────── Restore IMEIs (bulk insert) ────────────────────────
  restoreImeis: async (restored) => {
    if (!restored.length) return;

    const rows = restored.map(item => ({
      product_id: item.productId,
      imei: item.imei || item.imei1 || '',
      imei1: item.imei1 || item.imei || '',
      imei2: item.imei2 || '',
      status: item.status || 'available',
      color: item.color || null,
      ram: item.ram || null,
      storage: item.storage || null,
      sold_at: item.soldAt || null,
    }));

    const { error } = await supabase
      .from(TABLE)
      .insert(rows);

    if (error) {
      console.error('Failed to restore IMEIs to Supabase:', error);
      return;
    }

    // Re-fetch from Supabase to get generated IDs
    await get().loadData();
  },
}));

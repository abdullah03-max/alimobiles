import { create } from 'zustand';
import type { Supplier, Purchase } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { generatePONumber } from '@/lib/utils';

interface SupplierState {
  suppliers: Supplier[];
  purchases: Purchase[];
  
  loadData: () => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier | null>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'poNumber' | 'createdAt'>) => Promise<Purchase | null>;
  updatePurchase: (id: string, data: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  getSupplierById: (id: string) => Supplier | undefined;
  getPurchasesBySupplier: (supplierId: string) => Purchase[];
}

// Convert camelCase keys to snake_case for DB
function toSnakeCase(obj: any) {
  const result: any = {};
  for (const key in obj) {
    if (key === 'items') continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// Convert snake_case keys to camelCase for store state
function toCamelCase(obj: any) {
  if (!obj) return obj;
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
    result[camelKey] = obj[key];
  }
  return result;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  purchases: [],

  loadData: async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('purchases').select('*, purchase_items(*)')
      ]);

      const suppliers = (sRes.data || []).map(toCamelCase) as Supplier[];
      const purchases = (pRes.data || []).map(p => {
        const camelP = toCamelCase(p);
        camelP.items = (p.purchase_items || []).map(toCamelCase);
        return camelP;
      }) as Purchase[];

      set({ suppliers, purchases });
    } catch (err) {
      console.error('Error loading supplier data:', err);
    }
  },

  addSupplier: async (supplier) => {
    try {
      const snakeData = toSnakeCase(supplier);
      const { data, error } = await supabase
        .from('suppliers')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newSupplier = toCamelCase(data) as Supplier;
      set({ suppliers: [...get().suppliers, newSupplier] });
      return newSupplier;
    } catch (err) {
      console.error('Error adding supplier:', err);
      return null;
    }
  },

  updateSupplier: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('suppliers')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const suppliers = get().suppliers.map(s => s.id === id ? { ...s, ...data } : s);
      set({ suppliers });
    } catch (err) {
      console.error('Error updating supplier:', err);
    }
  },

  deleteSupplier: async (id) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      set({ suppliers: get().suppliers.filter(s => s.id !== id) });
    } catch (err) {
      console.error('Error deleting supplier:', err);
    }
  },

  addPurchase: async (purchase) => {
    try {
      const poNumber = generatePONumber();
      const purchaseData = {
        ...purchase,
        poNumber,
      };
      const snakePurchase = toSnakeCase(purchaseData);

      const { data: insertedPurchase, error: pErr } = await supabase
        .from('purchases')
        .insert(snakePurchase)
        .select()
        .single();

      if (pErr) throw pErr;

      const purchaseId = insertedPurchase.id;

      // Insert purchase items
      const itemsToInsert = purchase.items.map(item => ({
        purchase_id: purchaseId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total: item.total,
      }));

      const { data: insertedItems, error: iErr } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert)
        .select();

      if (iErr) throw iErr;

      const finalPurchase = toCamelCase(insertedPurchase) as Purchase;
      finalPurchase.items = (insertedItems || []).map(toCamelCase);

      const purchases = [finalPurchase, ...get().purchases];
      set({ purchases });
      return finalPurchase;
    } catch (err) {
      console.error('Error adding purchase:', err);
      return null;
    }
  },

  updatePurchase: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('purchases')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const purchases = get().purchases.map(p => p.id === id ? { ...p, ...data } : p);
      set({ purchases });
    } catch (err) {
      console.error('Error updating purchase:', err);
    }
  },

  deletePurchase: async (id) => {
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      set({ purchases: get().purchases.filter(p => p.id !== id) });
    } catch (err) {
      console.error('Error deleting purchase:', err);
    }
  },

  getSupplierById: (id) => get().suppliers.find(s => s.id === id),
  getPurchasesBySupplier: (supplierId) => get().purchases.filter(p => p.supplierId === supplierId),
}));

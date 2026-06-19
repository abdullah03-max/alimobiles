import { create } from 'zustand';
import type { Customer } from '@/types';
import { supabase } from '@/lib/supabaseClient';

interface CustomerState {
  customers: Customer[];
  
  loadData: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
}

// Convert camelCase keys to snake_case for DB
function toSnakeCase(obj: any) {
  const result: any = {};
  for (const key in obj) {
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

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],

  loadData: async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        set({ customers: (data || []).map(toCamelCase) as Customer[] });
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  },

  addCustomer: async (customer) => {
    try {
      const snakeData = toSnakeCase(customer);
      const { data, error } = await supabase
        .from('customers')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newCustomer = toCamelCase(data) as Customer;
      set({ customers: [newCustomer, ...get().customers] });
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err);
      return null;
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('customers')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const customers = get().customers.map(c => c.id === id ? { ...c, ...data } : c);
      set({ customers });
    } catch (err) {
      console.error('Error updating customer:', err);
    }
  },

  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      set({ customers: get().customers.filter(c => c.id !== id) });
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  },

  getCustomerById: (id) => get().customers.find(c => c.id === id),
}));

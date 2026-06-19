import { create } from 'zustand';
import type { Expense } from '@/types';
import { supabase } from '@/lib/supabaseClient';

interface ExpenseState {
  expenses: Expense[];
  
  loadData: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense | null>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpensesByDate: (start: string, end: string) => Expense[];
  getExpenseSummary: () => { total: number; byCategory: Record<string, number> };
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

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],

  loadData: async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (!error) {
        set({ expenses: (data || []).map(toCamelCase) as Expense[] });
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  },

  addExpense: async (expense) => {
    try {
      const snakeData = toSnakeCase(expense);
      const { data, error } = await supabase
        .from('expenses')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newExpense = toCamelCase(data) as Expense;
      set({ expenses: [newExpense, ...get().expenses] });
      return newExpense;
    } catch (err) {
      console.error('Error adding expense:', err);
      return null;
    }
  },

  updateExpense: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('expenses')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const expenses = get().expenses.map(e => e.id === id ? { ...e, ...data } : e);
      set({ expenses });
    } catch (err) {
      console.error('Error updating expense:', err);
    }
  },

  deleteExpense: async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      set({ expenses: get().expenses.filter(e => e.id !== id) });
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  },

  getExpensesByDate: (start, end) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return get().expenses.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= startTime && t <= endTime;
    });
  },

  getExpenseSummary: () => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    get().expenses.forEach(e => {
      total += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return { total, byCategory };
  },
}));

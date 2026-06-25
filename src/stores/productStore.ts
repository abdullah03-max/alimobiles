import { create } from 'zustand';
import type { Product, Category, Brand, Unit } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { useImeiStore } from './imeiStore';

interface ProductState {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  
  loadData: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category | null>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addBrand: (brand: Omit<Brand, 'id' | 'createdAt'>) => Promise<Brand | null>;
  updateBrand: (id: string, data: Partial<Brand>) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
  addUnit: (unit: Omit<Unit, 'id'>) => Promise<Unit | null>;
  updateUnit: (id: string, data: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getBrandById: (id: string) => Brand | undefined;
  getUnitById: (id: string) => Unit | undefined;
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

// Cache for table columns to avoid repeated schema calls
const tableColumnsCache: Map<string, string[]> = new Map();

async function getTableColumns(table: string) {
  if (tableColumnsCache.has(table)) return tableColumnsCache.get(table)!;
  try {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      // If table doesn't exist or other error, cache empty array to avoid repeated failing requests
      console.warn(`Unable to read columns for table ${table}:`, error);
      tableColumnsCache.set(table, []);
      return [];
    }
    if (!data || data.length === 0) {
      // No rows to infer columns from; cache empty to be safe
      tableColumnsCache.set(table, []);
      return [];
    }
    const cols = Object.keys(data[0]);
    tableColumnsCache.set(table, cols);
    return cols;
  } catch (err) {
    console.warn(`Error fetching table columns for ${table}:`, err);
    tableColumnsCache.set(table, []);
    return [];
  }
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  units: [],

  loadData: async () => {
    try {
      const [pRes, cRes, bRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
      ]);

      // Only attempt to fetch units if the table exists (cache checked)
      const unitCols = await getTableColumns('units');
      let uRes: any = { data: null, error: null };
      if (unitCols.length > 0) {
        uRes = await supabase.from('units').select('*').order('name');
      } else {
        uRes = { data: null, error: { message: `units table unavailable` } };
      }

      const defaultMockUnit: Unit = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Piece',
        code: 'pcs',
        status: 'active'
      };

      const unitsData = uRes.data && Array.isArray(uRes.data) && uRes.data.length > 0
        ? (uRes.data.map(toCamelCase) as Unit[])
        : [defaultMockUnit];

      if (uRes.error) {
        // Log once; getTableColumns has already cached missing state so subsequent loads won't spam
        console.warn('Units table missing or unavailable, defaulting to Piece unit.', uRes.error);
      }

      set({
        products: (pRes.data || []).map(toCamelCase) as Product[],
        categories: (cRes.data || []).map(toCamelCase) as Category[],
        brands: (bRes.data || []).map(toCamelCase) as Brand[],
        units: unitsData,
      });
    } catch (err) {
      console.error('Error loading product data:', err);
    }
  },

  addProduct: async (product) => {
    try {
      const snakeData = toSnakeCase(product);
      if (snakeData.unit_id === '' || snakeData.unit_id === '00000000-0000-0000-0000-000000000000') {
        delete snakeData.unit_id;
      }
      
      // Strip fields that do not exist as columns in the Supabase database table
      delete snakeData.color;
      delete snakeData.storage;
      delete snakeData.ram;

      // Only keep keys that exist in the products table to avoid 400 errors when schema differs
      const prodCols = await getTableColumns('products');
      if (prodCols.length > 0) {
        Object.keys(snakeData).forEach(k => {
          if (!prodCols.includes(k)) delete snakeData[k];
        });
      }

      const { data, error } = await supabase
        .from('products')
        .insert(snakeData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert product failed:', error, { snakeData });
        throw error;
      }

      const newProduct = toCamelCase(data) as Product;
      set({ products: [newProduct, ...get().products] });
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      return null;
    }
  },

  updateProduct: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      if (snakeData.unit_id === '' || snakeData.unit_id === '00000000-0000-0000-0000-000000000000') {
        delete snakeData.unit_id;
      }
      
      // Strip fields that do not exist as columns in the Supabase database table
      delete snakeData.color;
      delete snakeData.storage;
      delete snakeData.ram;

      // Filter update payload to existing product columns
      const prodCols = await getTableColumns('products');
      if (prodCols.length > 0) {
        Object.keys(snakeData).forEach(k => {
          if (!prodCols.includes(k)) delete snakeData[k];
        });
      }

      const { error } = await supabase
        .from('products')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const products = get().products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      set({ products });
    } catch (err) {
      console.error('Error updating product:', err);
    }
  },

  deleteProduct: async (id) => {
    const imeiStore = useImeiStore.getState();
    const deletedImeis = imeiStore.deleteImeisByProduct(id);

    const deleteRelatedDbImeis = async () => {
      const tableNames = ['product_imeis', 'product_imei'];
      for (const table of tableNames) {
        try {
          const { error } = await supabase.from(table).delete().eq('product_id', id);
          if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
            console.warn(`Unable to delete related IMEIs from ${table}:`, error);
          }
        } catch (err) {
          console.warn(`Safe delete failed for ${table}:`, err);
        }
      }
    };

    try {
      await deleteRelatedDbImeis();
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        imeiStore.restoreImeis(deletedImeis);
        throw error;
      }
      set({ products: get().products.filter(p => p.id !== id) });
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      return false;
    }
  },

  addCategory: async (category) => {
    try {
      const snakeData = toSnakeCase(category);
      const { data, error } = await supabase
        .from('categories')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newCategory = toCamelCase(data) as Category;
      set({ categories: [...get().categories, newCategory] });
      return newCategory;
    } catch (err) {
      console.error('Error adding category:', err);
      return null;
    }
  },

  updateCategory: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('categories')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const categories = get().categories.map(c => c.id === id ? { ...c, ...data } : c);
      set({ categories });
    } catch (err) {
      console.error('Error updating category:', err);
    }
  },

  deleteCategory: async (id) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      set({ categories: get().categories.filter(c => c.id !== id) });
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  },

  addBrand: async (brand) => {
    try {
      const snakeData = toSnakeCase(brand);
      const { data, error } = await supabase
        .from('brands')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newBrand = toCamelCase(data) as Brand;
      set({ brands: [...get().brands, newBrand] });
      return newBrand;
    } catch (err) {
      console.error('Error adding brand:', err);
      return null;
    }
  },

  updateBrand: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('brands')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const brands = get().brands.map(b => b.id === id ? { ...b, ...data } : b);
      set({ brands });
    } catch (err) {
      console.error('Error updating brand:', err);
    }
  },

  deleteBrand: async (id) => {
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      set({ brands: get().brands.filter(b => b.id !== id) });
    } catch (err) {
      console.error('Error deleting brand:', err);
    }
  },

  addUnit: async (unit) => {
    try {
      const snakeData = toSnakeCase(unit);
      const { data, error } = await supabase
        .from('units')
        .insert(snakeData)
        .select()
        .single();

      if (error) throw error;

      const newUnit = toCamelCase(data) as Unit;
      set({ units: [...get().units, newUnit] });
      return newUnit;
    } catch (err) {
      console.error('Error adding unit:', err);
      const mockUnit: Unit = {
        id: '00000000-0000-0000-0000-000000000000',
        name: unit.name,
        code: unit.code || 'pcs',
        status: unit.status || 'active'
      };
      return mockUnit;
    }
  },

  updateUnit: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('units')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const units = get().units.map(u => u.id === id ? { ...u, ...data } : u);
      set({ units });
    } catch (err) {
      console.error('Error updating unit:', err);
    }
  },

  deleteUnit: async (id) => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      set({ units: get().units.filter(u => u.id !== id) });
    } catch (err) {
      console.error('Error deleting unit:', err);
    }
  },

  getProductById: (id) => get().products.find(p => p.id === id),
  getCategoryById: (id) => get().categories.find(c => c.id === id),
  getBrandById: (id) => get().brands.find(b => b.id === id),
  getUnitById: (id) => get().units.find(u => u.id === id),
}));

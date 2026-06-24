import { create } from 'zustand';
import type { Sale, ReturnRecord } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { generateInvoiceNumber } from '@/lib/utils';
import { useImeiStore } from '@/stores/imeiStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface SaleState {
  sales: Sale[];
  returns: ReturnRecord[];
  
  loadData: () => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>) => Promise<{ sale: Sale | null; errorMessage?: string }>;
  updateSale: (id: string, data: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<boolean>;
  getSaleById: (id: string) => Sale | undefined;
  getSalesByDate: (start: string, end: string) => Sale[];
  getTodaySales: () => Sale[];
  processReturn: (returnData: Omit<ReturnRecord, 'id' | 'returnNumber' | 'createdAt'>) => Promise<ReturnRecord | null>;
  getReturnsBySale: (saleId: string) => ReturnRecord[];
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

function formatSupabaseError(err: any) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return [err.message, err.details, err.hint, err.code].filter(Boolean).join(' | ') || JSON.stringify(err);
}

export const useSaleStore = create<SaleState>((set, get) => ({
  sales: [],
  returns: [],

  loadData: async () => {
    try {
      const [salesRes, saleItemsRes, returnsRes, returnItemsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*').order('id', { ascending: true }),
        supabase.from('returns').select('*').order('created_at', { ascending: false }),
        supabase.from('return_items').select('*').order('id', { ascending: true })
      ]);

      const saleItemsBySaleId = (saleItemsRes.data || []).reduce((acc: Record<string, any[]>, item) => {
        const saleId = item.sale_id;
        if (!acc[saleId]) acc[saleId] = [];
        const camelItem = toCamelCase(item);
        if (camelItem.productName && camelItem.productName.startsWith('{')) {
          try {
            const parsed = JSON.parse(camelItem.productName);
            camelItem.productName = parsed.name || camelItem.productName;
            camelItem.imei = parsed.imei || camelItem.imei || null;
            camelItem.imei1 = parsed.imei1 || camelItem.imei1 || null;
            camelItem.imei2 = parsed.imei2 || camelItem.imei2 || null;
            camelItem.color = parsed.color || null;
            camelItem.storage = parsed.storage || null;
            camelItem.ram = parsed.ram || null;
            camelItem.ptaStatus = parsed.ptaStatus || null;
          } catch (e) {
            // ignore
          }
        }
        acc[saleId].push(camelItem);
        return acc;
      }, {});

      const returnItemsByReturnId = (returnItemsRes.data || []).reduce((acc: Record<string, any[]>, item) => {
        const returnId = item.return_id;
        if (!acc[returnId]) acc[returnId] = [];
        acc[returnId].push(toCamelCase(item));
        return acc;
      }, {});

      const sales = (salesRes.data || []).map(sale => {
        const camelSale = toCamelCase(sale);
        camelSale.items = saleItemsBySaleId[sale.id] || [];
        return camelSale;
      }) as Sale[];

      const returns = (returnsRes.data || []).map(ret => {
        const camelRet = toCamelCase(ret);
        camelRet.items = returnItemsByReturnId[ret.id] || [];
        return camelRet;
      }) as ReturnRecord[];

      set({ sales, returns });
    } catch (err) {
      console.error('Error loading sales/returns:', err);
    }
  },

  addSale: async (sale) => {
    try {
      let insertedSale: any = null;
      let sErr: any = null;

      const { invoicePrefix, startingNumber } = useSettingsStore.getState().receiptSettings;
      const cleanPrefix = invoicePrefix ? invoicePrefix.replace(/-+$/, '') : '';
      let maxSuffix = startingNumber - 1;
      const prefixWithDash = cleanPrefix ? `${cleanPrefix}-` : '';

      const extractInvoiceSuffix = (invoiceNumber: string) => {
        const trimmed = invoiceNumber?.trim();
        if (!trimmed) return undefined;

        if (prefixWithDash) {
          const escapedPrefix = prefixWithDash.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
          const regex = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');
          const match = trimmed.match(regex);
          return match ? parseInt(match[1], 10) : undefined;
        }

        const match = trimmed.match(/^(\\d+)$/);
        return match ? parseInt(match[1], 10) : undefined;
      };

      const updateMaxSuffixFromInvoice = (invoiceNumber: string) => {
        const suffix = extractInvoiceSuffix(invoiceNumber);
        if (typeof suffix === 'number' && suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      };

      get().sales.forEach(s => {
        if (!s.invoiceNumber) return;
        if (prefixWithDash && !s.invoiceNumber.startsWith(prefixWithDash)) return;
        updateMaxSuffixFromInvoice(s.invoiceNumber);
      });

      const query = supabase
        .from('sales')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1000);

      const finalQuery = prefixWithDash
        ? query.ilike('invoice_number', `${prefixWithDash}%`)
        : query;

      const { data: latestSales, error: latestError } = await finalQuery;
      if (!latestError && latestSales?.length) {
        latestSales.forEach(row => {
          if (row?.invoice_number) updateMaxSuffixFromInvoice(row.invoice_number);
        });
      }

      const nextNumber = maxSuffix + 1;
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const invoiceNumber = generateInvoiceNumber(cleanPrefix, nextNumber + attempt);
        const saleData = {
          ...sale,
          invoiceNumber,
        };
        const snakeSale = toSnakeCase(saleData);

        const response = await supabase
          .from('sales')
          .insert(snakeSale)
          .select()
          .single();

        insertedSale = response.data;
        sErr = response.error;

        if (!sErr) break;

        const errorText = formatSupabaseError(sErr).toLowerCase();
        const isDuplicateInvoice = errorText.includes('duplicate') && errorText.includes('invoice');
        if (!isDuplicateInvoice) break;
      }

      if (sErr) throw sErr;

      const saleId = insertedSale.id;

      // Insert sale items, preserving both IMEI values when available
      const normalizeProductName = (rawName: string | undefined) => {
        if (!rawName || typeof rawName !== 'string') return '';
        const trimmed = rawName.trim();
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            return parsed.name || rawName;
          } catch {
            return rawName;
          }
        }
        return rawName;
      };

      const itemsToInsert = sale.items.map(item => {
        const actualProductName = normalizeProductName(item.productName);
        const hasSecondImei = Boolean(item.imei2?.trim());
        const imeiValue = hasSecondImei ? (item.imei1 || item.imei || null) : (item.imei || item.imei1 || null);
        const shouldSerialize = Boolean(item.imei || item.imei1 || item.imei2 || item.color || item.ram || item.storage || item.ptaStatus);

        const payload: any = {
          sale_id: saleId,
          product_id: item.productId,
          product_name: shouldSerialize
            ? JSON.stringify({
                name: actualProductName,
                imei: item.imei || null,
                imei1: item.imei1 || null,
                imei2: item.imei2 || null,
                color: item.color || null,
                ram: item.ram || null,
                storage: item.storage || null,
                ptaStatus: item.ptaStatus || null,
              })
            : actualProductName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          imei: imeiValue,
        };

        if (item.imei1) payload.imei1 = item.imei1;
        if (item.imei2) payload.imei2 = item.imei2;
        return payload;
      });

      let iErr: any = null;
      try {
        const response = await supabase
          .from('sale_items')
          .insert(itemsToInsert);
        iErr = response.error;
      } catch (error) {
        iErr = error;
      }

      if (iErr) {
        const errorText = formatSupabaseError(iErr).toLowerCase();
        const missingImeiColumn = errorText.includes('imei1') || errorText.includes('imei2');
        if (missingImeiColumn) {
          // Fallback: store both IMEIs in the imei field, separated by || if both exist
          const fallbackItems = sale.items.map(item => {
            let imeiValue = null;
            if (item.imei1 && item.imei2) {
              // Both IMEIs exist - store them separated by ||
              imeiValue = `${item.imei1}||${item.imei2}`;
            } else if (item.imei1) {
              imeiValue = item.imei1;
            } else if (item.imei2) {
              imeiValue = item.imei2;
            } else if (item.imei) {
              imeiValue = item.imei;
            }
            return {
              sale_id: saleId,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total: item.total,
              imei: imeiValue,
            };
          });
          const fallbackResponse = await supabase
            .from('sale_items')
            .insert(fallbackItems);
          if (fallbackResponse.error) throw fallbackResponse.error;
        } else {
          throw iErr;
        }
      }

      // Update available IMEI and product stock values.
      for (const item of sale.items) {
        const soldImei = item.imei || item.imei1;
        if (soldImei) {
          await useImeiStore.getState().markImeiSold(soldImei);
        } else {
          const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.productId).single();
          if (prod) {
            const newQty = Math.max(0, prod.stock_quantity - item.quantity);
            await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);
          }
        }
      }

      const finalSale = toCamelCase(insertedSale) as Sale;
      finalSale.items = sale.items.map(item => ({
        ...item,
        productName: normalizeProductName(item.productName),
      }));

      const sales = [finalSale, ...get().sales];
      set({ sales });
      return { sale: finalSale };
    } catch (err) {
      const message = formatSupabaseError(err);
      console.error('Error adding sale:', message, err);
      if (message.includes('sales_payment_method_check')) {
        return {
          sale: null,
          errorMessage: 'This payment method is not enabled in the database yet. Run the sales payment-method migration in Supabase SQL Editor.',
        };
      }
      return { sale: null, errorMessage: 'Unable to save the sale. Please try again.' };
    }
  },

  getSaleById: (id) => get().sales.find(s => s.id === id),

  updateSale: async (id, data) => {
    try {
      const snakeData = toSnakeCase(data);
      const { error } = await supabase
        .from('sales')
        .update(snakeData)
        .eq('id', id);

      if (error) throw error;

      const sales = get().sales.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
      set({ sales });
    } catch (err) {
      console.error('Error updating sale:', err);
    }
  },

  deleteSale: async (id) => {
    try {
      const sale = get().sales.find(s => s.id === id);
      if (!sale) return false;

      console.log(`[Sale Delete] Starting deletion of sale ${id} with ${sale.items.length} items`);

      // STEP 1: Process each sale item - mark IMEIs as available and restore product stock
      for (const item of sale.items) {
        try {
          if (item.imei) {
            // If item has IMEI, mark it as available
            const marked = await useImeiStore.getState().markImeiAvailable(item.imei);
            if (marked) {
              console.log(`[Sale Delete] Marked IMEI ${item.imei} as available`);
            }
            continue;
          }

          // Otherwise, restore product stock quantity
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single();

          if (prodError) throw prodError;
          if (product) {
            const newQty = Math.max(0, (product.stock_quantity || 0) + item.quantity);
            await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);
            console.log(`[Sale Delete] Restored ${item.quantity} units to product ${item.productId} (new qty: ${newQty})`);
          }
        } catch (itemErr) {
          console.warn(`[Sale Delete] Warning processing item for product ${item.productId}:`, itemErr);
          // Continue processing other items even if one fails
        }
      }

      // STEP 2: Delete all sale_items from Supabase
      console.log(`[Sale Delete] Deleting ${sale.items.length} sale items from database`);
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);

      if (deleteItemsError) {
        console.error('[Sale Delete] Error deleting sale_items:', deleteItemsError);
        throw deleteItemsError;
      }

      // STEP 3: Delete the sale itself from Supabase
      console.log(`[Sale Delete] Deleting sale record ${id}`);
      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (deleteSaleError) {
        console.error('[Sale Delete] Error deleting sale:', deleteSaleError);
        throw deleteSaleError;
      }

      // STEP 4: Update local state
      const updatedSales = get().sales.filter(s => s.id !== id);
      set({ sales: updatedSales });
      console.log(`[Sale Delete] Successfully deleted sale ${id} and all related records`);
      
      return true;
    } catch (err) {
      console.error('[Sale Delete] Error deleting sale:', err);
      return false;
    }
  },

  getSalesByDate: (start, end) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return get().sales.filter(s => {
      const t = new Date(s.createdAt).getTime();
      return t >= startTime && t <= endTime;
    });
  },

  getTodaySales: () => {
    const today = new Date().toDateString();
    return get().sales.filter(s => new Date(s.createdAt).toDateString() === today);
  },

  processReturn: async (returnData) => {
    try {
      const returnNumber = `RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const returnRecord = {
        ...returnData,
        returnNumber,
      };
      const snakeReturn = toSnakeCase(returnRecord);

      const { data: insertedReturn, error: rErr } = await supabase
        .from('returns')
        .insert(snakeReturn)
        .select()
        .single();

      if (rErr) throw rErr;

      const returnId = insertedReturn.id;

      // Insert return items
      const itemsToInsert = returnData.items.map(item => ({
        return_id: returnId,
        product_id: item.productId,
        product_name: item.productName,
        original_quantity: item.originalQuantity,
        return_quantity: item.returnQuantity,
        unit_price: item.unitPrice,
        total: item.total,
        reason: item.reason,
      }));

      const { error: iErr } = await supabase
        .from('return_items')
        .insert(itemsToInsert);

      if (iErr) throw iErr;

      // Update product stocks (add back returned items)
      for (const item of returnData.items) {
        if (item.imei) {
          await useImeiStore.getState().markImeiAvailable(item.imei);
        } else {
          const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.productId).single();
          if (prod) {
            const newQty = prod.stock_quantity + item.returnQuantity;
            await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);
          }
        }
      }

      const finalReturn = toCamelCase(insertedReturn) as ReturnRecord;
      finalReturn.items = returnData.items;

      const returns = [finalReturn, ...get().returns];
      set({ returns });
      return finalReturn;
    } catch (err) {
      console.error('Error processing return:', err);
      return null;
    }
  },

  getReturnsBySale: (saleId) => get().returns.filter(r => r.saleId === saleId),
}));

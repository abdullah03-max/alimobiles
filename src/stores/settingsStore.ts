import { create } from 'zustand';
import type { ShopSettings, ReceiptSettings, TaxSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';

interface SettingsState {
  shopSettings: ShopSettings;
  receiptSettings: ReceiptSettings;
  taxSettings: TaxSettings;
  paymentMethods: PaymentMethods;
  
  loadSettings: () => Promise<void>;
  updateShopSettings: (settings: Partial<ShopSettings>) => void;
  saveShopSettings: () => Promise<{ success: boolean; error?: string; warning?: string }>;
  updateReceiptSettings: (settings: Partial<ReceiptSettings>) => void;
  saveReceiptSettings: () => Promise<{ success: boolean; error?: string }>;
  updateTaxSettings: (settings: Partial<TaxSettings>) => void;
  saveTaxSettings: () => Promise<{ success: boolean; error?: string }>;
  updatePaymentMethods: (methods: Partial<PaymentMethods>) => void;
  savePaymentMethods: () => Promise<{ success: boolean; error?: string }>;
}

const defaultShopSettings: ShopSettings = {
  shopName: 'Ali Mobiles',
  address: '',
  phone: '',
  email: '',
  currency: 'PKR',
  dateFormat: 'dd/MM/yyyy',
  timezone: 'Asia/Karachi',
};

const defaultReceiptSettings: ReceiptSettings = {
  header: '',
  footer: 'Thank you for shopping with us!',
  showLogo: true,
  receiptWidth: '80mm',
  invoicePrefix: 'INV',
  startingNumber: 1,
  showTaxBreakdown: true,
};

const defaultTaxSettings: TaxSettings = {
  enabled: true,
  name: 'GST',
  rate: 18,
  includedInPrice: false,
};

const defaultPaymentMethods: PaymentMethods = {
  cash: true,
  card: true,
  bank_transfer: true,
  jazzcash: false,
  easypaisa: false,
  credit: false,
};

const storageKeys = {
  shop: 'pos_settings',
  receipt: 'pos_receipt_settings',
  tax: 'pos_tax_settings',
  paymentMethods: 'pos_payment_methods',
} as const;

type PaymentMethodKey = 'cash' | 'card' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'credit';
export type PaymentMethods = Record<PaymentMethodKey, boolean>;

type SettingsRow = {
  id: number;
  shop_name?: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  business_reg_number?: string | null;
  tax_number?: string | null;
  currency?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  receipt_show_logo?: boolean | null;
  receipt_width?: '58mm' | '80mm' | null;
  receipt_invoice_prefix?: string | null;
  receipt_starting_number?: number | null;
  receipt_show_tax_breakdown?: boolean | null;
  receipt_terms_and_conditions?: string | null;
  payment_methods?: string | Partial<Record<PaymentMethodKey, boolean>> | null;
  tax_enabled?: boolean | null;
  tax_name?: string | null;
  tax_rate?: number | null;
  tax_registration_number?: string | null;
  tax_included_in_price?: boolean | null;
};

function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage write failures
  }
}

function mapRowToShopSettings(data: SettingsRow | null | undefined): ShopSettings {
  return {
    shopName: data?.shop_name || defaultShopSettings.shopName,
    logo: data?.logo || undefined,
    address: data?.address || '',
    phone: data?.phone || '',
    email: data?.email || '',
    website: data?.website || undefined,
    businessRegNumber: data?.business_reg_number || undefined,
    taxNumber: data?.tax_number || undefined,
    currency: data?.currency || defaultShopSettings.currency,
    timezone: data?.timezone || defaultShopSettings.timezone,
    dateFormat: data?.date_format || defaultShopSettings.dateFormat,
  };
}

function mapRowToReceiptSettings(data: SettingsRow | null | undefined): ReceiptSettings {
  return {
    header: data?.receipt_header || defaultReceiptSettings.header,
    footer: data?.receipt_footer || defaultReceiptSettings.footer,
    showLogo: data?.receipt_show_logo ?? defaultReceiptSettings.showLogo,
    receiptWidth: data?.receipt_width || defaultReceiptSettings.receiptWidth,
    invoicePrefix: data?.receipt_invoice_prefix || defaultReceiptSettings.invoicePrefix,
    startingNumber: data?.receipt_starting_number ?? defaultReceiptSettings.startingNumber,
    showTaxBreakdown: data?.receipt_show_tax_breakdown ?? defaultReceiptSettings.showTaxBreakdown,
    termsAndConditions: data?.receipt_terms_and_conditions || undefined,
  };
}

function mapRowToTaxSettings(data: SettingsRow | null | undefined): TaxSettings {
  return {
    enabled: data?.tax_enabled ?? defaultTaxSettings.enabled,
    name: data?.tax_name || defaultTaxSettings.name,
    rate: data?.tax_rate ?? defaultTaxSettings.rate,
    registrationNumber: data?.tax_registration_number || undefined,
    includedInPrice: data?.tax_included_in_price ?? defaultTaxSettings.includedInPrice,
  };
}

function mapRowToPaymentMethods(data: SettingsRow | null | undefined): PaymentMethods {
  const raw = data?.payment_methods;
  let parsed: Partial<Record<PaymentMethodKey, boolean>> = {};

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as Partial<Record<PaymentMethodKey, boolean>>;
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === 'object') {
    parsed = raw as Partial<Record<PaymentMethodKey, boolean>>;
  }

  return {
    ...defaultPaymentMethods,
    ...parsed,
  };
}

function formatSettingsError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Unknown error';
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ') || 'Unknown error';
}

async function persistSettingsPatch(
  patch: Partial<SettingsRow>,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('settings')
    .update(patch)
    .eq('id', 1)
    .select('id');

  if (error) {
    return { success: false, error: formatSettingsError(error) };
  }

  if (!data?.length) {
    return {
      success: false,
      error: 'Settings row was not updated. Check Supabase RLS UPDATE policy on the settings table.',
    };
  }

  return { success: true };
}

function mapShopSettingsToRow(settings: ShopSettings): Partial<SettingsRow> {
  return {
    shop_name: settings.shopName?.trim() || defaultShopSettings.shopName,
    logo: settings.logo ?? null,
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email || null,
    website: settings.website ?? null,
    business_reg_number: settings.businessRegNumber ?? null,
    tax_number: settings.taxNumber ?? null,
    currency: settings.currency || defaultShopSettings.currency,
    timezone: settings.timezone || defaultShopSettings.timezone,
    date_format: settings.dateFormat || defaultShopSettings.dateFormat,
  };
}

function mapReceiptSettingsToRow(settings: ReceiptSettings): Partial<SettingsRow> {
  return {
    receipt_header: settings.header,
    receipt_footer: settings.footer,
    receipt_show_logo: settings.showLogo,
    receipt_width: settings.receiptWidth,
    receipt_invoice_prefix: settings.invoicePrefix,
    receipt_starting_number: settings.startingNumber,
    receipt_show_tax_breakdown: settings.showTaxBreakdown,
    receipt_terms_and_conditions: settings.termsAndConditions,
  };
}

function mapTaxSettingsToRow(settings: TaxSettings): Partial<SettingsRow> {
  return {
    tax_enabled: settings.enabled,
    tax_name: settings.name,
    tax_rate: settings.rate,
    tax_registration_number: settings.registrationNumber,
    tax_included_in_price: settings.includedInPrice,
  };
}

function mapPaymentMethodsToRow(settings: PaymentMethods): Partial<SettingsRow> {
  return {
    payment_methods: settings,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shopSettings: defaultShopSettings,
  receiptSettings: defaultReceiptSettings,
  taxSettings: defaultTaxSettings,
  paymentMethods: defaultPaymentMethods,

  loadSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data && !error) {
        const row = data as SettingsRow;
        const localShop = readLocalStorage<ShopSettings>(storageKeys.shop);
        const localReceipt = readLocalStorage<ReceiptSettings>(storageKeys.receipt);
        const localTax = readLocalStorage<TaxSettings>(storageKeys.tax);
        const shopSettings = localShop
          ? { ...mapRowToShopSettings(row), ...localShop }
          : mapRowToShopSettings(row);
        const receiptSettings = localReceipt
          ? { ...mapRowToReceiptSettings(row), ...localReceipt }
          : mapRowToReceiptSettings(row);
        const taxSettings = localTax
          ? { ...mapRowToTaxSettings(row), ...localTax }
          : mapRowToTaxSettings(row);
        const paymentMethodsFromDb = mapRowToPaymentMethods(row);
        const localPaymentMethods = readLocalStorage<PaymentMethods>(storageKeys.paymentMethods);
        const paymentMethods = row.payment_methods == null && localPaymentMethods
          ? { ...defaultPaymentMethods, ...localPaymentMethods }
          : paymentMethodsFromDb;

        set({ shopSettings, receiptSettings, taxSettings, paymentMethods });
        writeLocalStorage(storageKeys.shop, shopSettings);
        writeLocalStorage(storageKeys.receipt, receiptSettings);
        writeLocalStorage(storageKeys.tax, taxSettings);
        writeLocalStorage(storageKeys.paymentMethods, paymentMethods);
        return;
      }

      const localShop = readLocalStorage<ShopSettings>(storageKeys.shop);
      const localReceipt = readLocalStorage<ReceiptSettings>(storageKeys.receipt);
      const localTax = readLocalStorage<TaxSettings>(storageKeys.tax);
      const localPaymentMethods = readLocalStorage<PaymentMethods>(storageKeys.paymentMethods);

      set({
        shopSettings: localShop || defaultShopSettings,
        receiptSettings: localReceipt || defaultReceiptSettings,
        taxSettings: localTax || defaultTaxSettings,
        paymentMethods: localPaymentMethods || defaultPaymentMethods,
      });
    } catch (err) {
      console.error('Error loading settings:', err);
      const localShop = readLocalStorage<ShopSettings>(storageKeys.shop);
      const localReceipt = readLocalStorage<ReceiptSettings>(storageKeys.receipt);
      const localTax = readLocalStorage<TaxSettings>(storageKeys.tax);
      const localPaymentMethods = readLocalStorage<PaymentMethods>(storageKeys.paymentMethods);
      set({
        shopSettings: localShop || defaultShopSettings,
        receiptSettings: localReceipt || defaultReceiptSettings,
        taxSettings: localTax || defaultTaxSettings,
        paymentMethods: localPaymentMethods || defaultPaymentMethods,
      });
    }
  },

  updateShopSettings: (settings) => {
    const updated = { ...get().shopSettings, ...settings };
    set({ shopSettings: updated });
    writeLocalStorage(storageKeys.shop, updated);
  },

  saveShopSettings: async () => {
    const updated = get().shopSettings;
    writeLocalStorage(storageKeys.shop, updated);
    const patch = mapShopSettingsToRow(updated);

    try {
      const result = await persistSettingsPatch(patch);
      if (result.success) return { success: true };

      const errorText = result.error?.toLowerCase() || '';
      if (errorText.includes('date_format')) {
        const { date_format: _dateFormat, ...patchWithoutDateFormat } = patch;
        const retry = await persistSettingsPatch(patchWithoutDateFormat);
        if (retry.success) {
          return {
            success: true,
            warning: 'Shop details saved. Date format is stored locally until the database migration is applied.',
          };
        }
        return retry;
      }

      return result;
    } catch (err) {
      console.error('Error saving shop settings:', err);
      return { success: false, error: formatSettingsError(err) };
    }
  },

  updateReceiptSettings: (settings) => {
    const updated = { ...get().receiptSettings, ...settings };
    set({ receiptSettings: updated });
    writeLocalStorage(storageKeys.receipt, updated);
  },

  saveReceiptSettings: async () => {
    const updated = get().receiptSettings;
    writeLocalStorage(storageKeys.receipt, updated);
    try {
      return await persistSettingsPatch(mapReceiptSettingsToRow(updated));
    } catch (err) {
      console.error('Error saving receipt settings:', err);
      return { success: false, error: formatSettingsError(err) };
    }
  },

  updateTaxSettings: (settings) => {
    const updated = { ...get().taxSettings, ...settings };
    set({ taxSettings: updated });
    writeLocalStorage(storageKeys.tax, updated);
  },

  saveTaxSettings: async () => {
    const updated = get().taxSettings;
    writeLocalStorage(storageKeys.tax, updated);
    try {
      return await persistSettingsPatch(mapTaxSettingsToRow(updated));
    } catch (err) {
      console.error('Error saving tax settings:', err);
      return { success: false, error: formatSettingsError(err) };
    }
  },

  updatePaymentMethods: (methods) => {
    const updated = { ...get().paymentMethods, ...methods };
    set({ paymentMethods: updated });
  },

  savePaymentMethods: async () => {
    const updated = get().paymentMethods;
    writeLocalStorage(storageKeys.paymentMethods, updated);
    try {
      return await persistSettingsPatch(mapPaymentMethodsToRow(updated));
    } catch (err) {
      console.error('Error saving payment methods:', err);
      return { success: false, error: formatSettingsError(err) };
    }
  },
}));

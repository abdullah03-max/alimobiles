import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useSaleStore } from '@/stores/saleStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/shared/PageHeader';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn, downloadCSV } from '@/lib/utils';
import {
  Store, Receipt, Users, Database, Info,
  ShoppingBag, Printer, Landmark, CreditCard, Wallet, Smartphone, AlertTriangle, Banknote,
} from 'lucide-react';

const settingMenus = [
  { id: 'shop', label: 'Shop Settings', icon: Store },
  { id: 'receipt', label: 'Receipt / Invoice', icon: Receipt },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'backup', label: 'Backup & Export', icon: Database },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  { id: 'about', label: 'About', icon: Info },
];

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { key: 'jazzcash', label: 'JazzCash', icon: Smartphone },
  { key: 'easypaisa', label: 'EasyPaisa', icon: Wallet },
  { key: 'credit', label: 'Customer Credit', icon: ShoppingBag },
];

const PAYMENT_METHOD_STORAGE_KEY = 'pos_payment_methods';

const defaultPaymentMethods = {
  cash: true,
  card: true,
  bank_transfer: true,
  jazzcash: false,
  easypaisa: false,
  credit: false,
};

function loadPaymentMethods() {
  try {
    const raw = localStorage.getItem(PAYMENT_METHOD_STORAGE_KEY);
    return raw ? { ...defaultPaymentMethods, ...JSON.parse(raw) } : defaultPaymentMethods;
  } catch {
    return defaultPaymentMethods;
  }
}

export default function Settings() {
  const { shopSettings, receiptSettings, paymentMethods, loadSettings, updateShopSettings, saveShopSettings, updateReceiptSettings, saveReceiptSettings, updatePaymentMethods, savePaymentMethods } = useSettingsStore();
  const { user } = useAuthStore();
  const { products, categories, brands, loadData: loadProducts } = useProductStore();
  const { sales, loadData: loadSales } = useSaleStore();
  const { customers, loadData: loadCustomers } = useCustomerStore();
  const { suppliers, loadData: loadSuppliers } = useSupplierStore();
  const { expenses, loadData: loadExpenses } = useExpenseStore();
  const toast = useToast();
  const [activeMenu, setActiveMenu] = useState('shop');
  const [isLoading, setIsLoading] = useState(true);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    loadSettings().finally(() => setIsLoading(false));
  }, [loadSettings]);

  const handleSavePaymentMethods = async () => {
    const result = await savePaymentMethods();
    if (result.success) toast.success('Payment methods saved');
    else toast.error('Payment methods not saved', result.error || 'Unable to save payment method settings');
  };

  const handleSaveShop = async () => {
    const result = await saveShopSettings();
    if (result.success) {
      if (result.warning) toast.success('Shop settings saved', result.warning);
      else toast.success('Shop settings saved');
    } else {
      toast.error('Shop settings not saved', result.error || 'Unable to save shop settings');
    }
  };
  const handleSaveReceipt = async () => {
    const result = await saveReceiptSettings();
    if (result.success) toast.success('Receipt settings saved');
    else toast.error('Receipt settings not saved', result.error || 'Unable to save receipt settings');
  };


  const exportCsvData = (data: Record<string, unknown>[], filename: string, label: string) => {
    if (data.length === 0) {
      toast.error(`No ${label.toLowerCase()} found to export`);
      return;
    }
    downloadCSV(data, filename);
    toast.success(`${label} exported`);
  };

  const handleExportProducts = async () => {
    if (!products.length) await loadProducts();
    exportCsvData(products.map((p, index) => ({
      No: index + 1,
      Name: p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      Category: categories.find(c => c.id === p.categoryId)?.name || '',
      Brand: brands.find(b => b.id === p.brandId)?.name || '',
      'Cost Price': p.costPrice,
      'Sale Price': p.salePrice,
      Stock: p.stockQuantity,
      Status: p.status,
      CreatedAt: p.createdAt,
    })), 'products.csv', 'Products');
  };

  const handleExportSales = async () => {
    if (!sales.length) await loadSales();
    exportCsvData(sales.map((s, index) => ({
      No: index + 1,
      Invoice: s.invoiceNumber,
      Customer: s.customerName,
      Date: s.createdAt,
      Total: s.grandTotal,
      Paid: s.paidAmount,
      Status: s.status,
      'Payment Method': s.paymentMethod || '',
      Items: s.items.length,
    })), 'sales.csv', 'Sales');
  };

  const handleExportCustomers = async () => {
    if (!customers.length) await loadCustomers();
    exportCsvData(customers.map((c, index) => ({
      No: index + 1,
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Address: c.address || '',
      CreatedAt: c.createdAt,
    })), 'customers.csv', 'Customers');
  };

  const handleExportSuppliers = async () => {
    if (!suppliers.length) await loadSuppliers();
    exportCsvData(suppliers.map((s, index) => ({
      No: index + 1,
      Name: s.name,
      Email: s.email,
      Phone: s.phone,
      Address: s.address || '',
      CreatedAt: s.createdAt,
    })), 'suppliers.csv', 'Suppliers');
  };

  const handleExportExpenses = async () => {
    if (!expenses.length) await loadExpenses();
    exportCsvData(expenses.map((e, index) => ({
      No: index + 1,
      Category: e.category,
      Amount: e.amount,
      Date: e.date,
      Description: e.description,
      Notes: e.notes || '',
      CreatedAt: e.createdAt,
    })), 'expenses.csv', 'Expenses');
  };

  const resetLocalSettings = () => {
    try {
      localStorage.removeItem('pos_settings');
      localStorage.removeItem('pos_receipt_settings');
      localStorage.removeItem('pos_tax_settings');
      localStorage.removeItem('pos_payment_methods');
    } catch {
      // ignore
    }
  };

  const handleResetDatabase = async () => {
    setResetLoading(true);

    try {
      const tables = [
        'sale_items',
        'return_items',
        'purchase_items',
        'sales',
        'returns',
        'purchases',
        'expenses',
        'customers',
        'suppliers',
        'products',
        'categories',
        'brands',
        'units',
        'settings',
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().not('id', 'is', null);
        if (error) {
          throw new Error(`Failed to clear ${table}: ${error.message}`);
        }
      }

      resetLocalSettings();
      await loadSettings();
      await Promise.all([loadProducts(), loadSales(), loadCustomers(), loadSuppliers(), loadExpenses()]);

      toast.success('Database reset completed');
    } catch (err) {
      console.error('Reset failed:', err);
      toast.error('Reset failed', err instanceof Error ? err.message : 'Unable to reset database');
    } finally {
      setResetLoading(false);
      setResetConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-sm text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {settingMenus.map(menu => {
            const Icon = menu.icon;
            return (
              <button
                key={menu.id}
                onClick={() => setActiveMenu(menu.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                  activeMenu === menu.id
                    ? 'text-orange-500 bg-orange-50 border-l-[3px] border-orange-500'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{menu.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeMenu === 'shop' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">Shop Information</h2></div>
            <div className="p-4 space-y-4 max-w-lg">
              <div><Label>Shop Name</Label><Input value={shopSettings.shopName} onChange={e => updateShopSettings({ shopName: e.target.value })} /></div>
              <div><Label>Address</Label><Textarea value={shopSettings.address || ''} onChange={e => updateShopSettings({ address: e.target.value })} rows={3} /></div>
              <div><Label>Phone</Label><Input value={shopSettings.phone || ''} onChange={e => updateShopSettings({ phone: e.target.value })} /></div>
              <div><Label>Date Format</Label><select value={shopSettings.dateFormat} onChange={e => updateShopSettings({ dateFormat: e.target.value })} className="w-full h-9 px-3 border rounded-md text-sm"><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="MM/dd/yyyy">MM/DD/YYYY</option></select></div>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveShop}>Save Settings</Button>
            </div>
          </div>
        )}

        {activeMenu === 'receipt' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">Receipt Settings</h2></div>
            <div className="p-4 space-y-4 max-w-lg">
              <div><Label>Receipt Header</Label><Textarea value={receiptSettings.header || ''} onChange={e => updateReceiptSettings({ header: e.target.value })} rows={3} placeholder="Address and extra shop details (shop name is added automatically)" /></div>
              <div><Label>Receipt Footer</Label><Textarea value={receiptSettings.footer || ''} onChange={e => updateReceiptSettings({ footer: e.target.value })} rows={2} placeholder="Thank you message..." /></div>
              <div><Label>Invoice Prefix</Label><Input value={receiptSettings.invoicePrefix} onChange={e => updateReceiptSettings({ invoicePrefix: e.target.value })} /></div>
              <div><Label>Starting Invoice Number</Label><Input type="number" min={0} value={receiptSettings.startingNumber} onChange={e => updateReceiptSettings({ startingNumber: Number(e.target.value) || 0 })} /></div>
              <div className="flex items-center justify-between"><Label>Show Logo on Receipt</Label><Switch checked={receiptSettings.showLogo} onCheckedChange={v => updateReceiptSettings({ showLogo: v })} /></div>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveReceipt}>Save Receipt Settings</Button>
            </div>
          </div>
        )}



        {activeMenu === 'payment' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">Payment Methods</h2></div>
            <div className="p-4 space-y-3 max-w-lg">
              <p className="text-sm text-gray-600">Choose which payment methods are available at checkout.</p>
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                return (
                  <div key={pm.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-gray-500" /><span className="font-medium text-sm">{pm.label}</span></div>
                    <Switch
                      checked={paymentMethods[pm.key as keyof typeof paymentMethods]}
                      onCheckedChange={value => updatePaymentMethods({ [pm.key]: value } as Partial<typeof paymentMethods>)}
                    />
                  </div>
                );
              })}
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSavePaymentMethods}>Save Payment Methods</Button>
            </div>
          </div>
        )}

        {activeMenu === 'users' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">Current User</h2></div>
            <div className="p-4 max-w-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">{user?.name?.charAt(0)}</div>
                <div><p className="font-semibold text-gray-800">{user?.name}</p><p className="text-sm text-gray-500">{user?.email}</p><p className="text-xs text-orange-500 capitalize">{user?.role}</p></div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'backup' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">Backup & Export</h2></div>
            <div className="p-4 max-w-lg space-y-3">
              <p className="text-sm text-gray-600">Export your data as CSV files for backup.</p>
              <div className="space-y-2">
                {[
                  { label: 'Products', action: handleExportProducts },
                  { label: 'Sales', action: handleExportSales },
                  { label: 'Customers', action: handleExportCustomers },
                  { label: 'Suppliers', action: handleExportSuppliers },
                  { label: 'Expenses', action: handleExportExpenses },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Button size="sm" variant="outline" onClick={item.action}>Export CSV</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'danger' && (
          <div className="bg-white rounded-lg border border-red-200">
            <div className="p-4 border-b border-red-100 flex items-center gap-2"><div className="w-1 h-4 bg-red-500 rounded-full" /><h2 className="font-semibold text-red-600">Danger Zone</h2></div>
            <div className="p-4 max-w-lg space-y-4">
              <p className="text-sm text-red-600">Resetting the database will delete all sales, customers, products, suppliers, expenses, and settings. This action cannot be undone.</p>
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">Reset all database</p>
                <p className="text-xs text-red-600 mt-1">Use only when you want to clear all application data.</p>
              </div>
              <Button className="bg-red-500 hover:bg-red-600" onClick={() => setResetConfirmOpen(true)} disabled={resetLoading}>Reset All Database</Button>
            </div>
          </div>
        )}

        {activeMenu === 'about' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /><h2 className="font-semibold">About</h2></div>
            <div className="p-4 max-w-lg text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3"><span className="text-white font-bold text-xl">POS</span></div>
              <h3 className="text-lg font-bold">{shopSettings.shopName} POS</h3>
              <p className="text-sm text-gray-500">Version 1.0.0</p>
              <p className="text-sm text-gray-600 mt-4">A complete point-of-sale management system designed for mobile phone shops and electronics stores.</p>
              <div className="mt-4 text-xs text-gray-400 space-y-1"><p>Built with React + TypeScript + Tailwind CSS</p><p>All data is stored locally in your browser</p></div>
            </div>
          </div>
        )}
      </div>
      <DeleteConfirmModal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        itemName="Full database reset"
        message="Are you sure you want to reset the entire database? This will remove all records and reset settings."
      />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useSaleStore } from '@/stores/saleStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import InvoiceReceipt from '@/components/shared/InvoiceReceipt';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { useToast } from '@/hooks/useToast';
import { usePrint } from '@/hooks/usePrint';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingCart, Plus, Printer, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Sale } from '@/types';

export default function Sales() {
  const navigate = useNavigate();
  const toast = useToast();
  const { sales, loadData, updateSale, deleteSale } = useSaleStore();
  const { shopSettings, receiptSettings, loadSettings } = useSettingsStore();
  const { printReceipt } = usePrint();
  const [search, setSearch] = useState('');
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);

  useEffect(() => { 
    loadData(); 
    loadSettings();
  }, []);

  // If user scans an IMEI in the search box, open its sale invoice immediately
  useEffect(() => {
    const q = search.trim();
    if (!q) return;

    // look for a sale that contains this IMEI in its items (check imei, imei1, and imei2)
    const found = sales.find(s => s.items && s.items.some(it => 
      (it.imei && it.imei === q) || 
      (it.imei1 && it.imei1 === q) || 
      (it.imei2 && it.imei2 === q)
    ));
    if (found) {
      setViewSale(found);
      setSearch('');
      toast.success('Invoice opened', found.invoiceNumber);
    }
  }, [search, sales, toast]);

  const filtered = useMemo(() => {
    let result = [...sales];
    if (search) result = result.filter(s => s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [sales, search]);

  const stats = useMemo(() => ({
    today: sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString() && s.status !== 'cancelled').reduce((s, sa) => s + sa.grandTotal, 0),
    total: sales.filter(s => s.status !== 'cancelled').length,
    revenue: sales.filter(s => s.status !== 'cancelled').reduce((s, sa) => s + sa.grandTotal, 0),
    avg: sales.filter(s => s.status !== 'cancelled').length > 0 ? sales.filter(s => s.status !== 'cancelled').reduce((s, sa) => s + sa.grandTotal, 0) / sales.filter(s => s.status !== 'cancelled').length : 0,
  }), [sales]);

  return (
    <div>
      <PageHeader title="Sales" actions={<><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Export</Button><Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate('/pos')}><ShoppingCart className="w-4 h-4 mr-1" />New Sale</Button></>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.today)}</p><p className="text-xs text-gray-500">Today's Sales</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total Orders</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.revenue)}</p><p className="text-xs text-gray-500">Total Revenue</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.avg)}</p><p className="text-xs text-gray-500">Average Order</p></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice or customer..." className="pl-9" /><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(s => (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-blue-600 cursor-pointer" onClick={() => setViewSale(s)}>{s.invoiceNumber}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(s.createdAt, shopSettings.dateFormat)}</td>
              <td className="px-4 py-3 text-gray-800">{s.customerName}</td>
              <td className="px-4 py-3 text-center">{s.items.length}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.grandTotal)}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={s.paymentMethod} /></td>
              <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center gap-1">
                  <button onClick={() => setViewSale(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View invoice"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteSaleId(s.id)} className="p-1.5 rounded hover:bg-gray-100 text-red-500" title="Delete sale"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice {viewSale?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <InvoiceReceipt
                id="invoice-receipt"
                sale={viewSale}
                shopSettings={shopSettings}
                receiptSettings={receiptSettings}
                screen
                layout="a4"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printReceipt('invoice-receipt', receiptSettings.receiptWidth)}
                >
                  <Printer className="w-4 h-4 mr-1" />Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <DeleteConfirmModal
        open={!!deleteSaleId}
        onClose={() => setDeleteSaleId(null)}
        onConfirm={async () => {
          if (!deleteSaleId) return;
          const success = await deleteSale(deleteSaleId);
          if (success) {
            toast.success('Sale deleted');
          } else {
            toast.error('Unable to delete sale');
          }
          setDeleteSaleId(null);
          if (viewSale?.id === deleteSaleId) {
            setViewSale(null);
          }
        }}
        itemName="Sale"
        message="Deleting a sale will remove it permanently and restore stock quantities."
      />
    </div>
  );
}

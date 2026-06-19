import { useState, useEffect, useMemo } from 'react';
import { useSaleStore } from '@/stores/saleStore';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Returns() {
  const { sales, returns, loadData, processReturn } = useSaleStore();
  const { products, loadData: loadProducts } = useProductStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [processModal, setProcessModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedSale, setSelectedSale] = useState<typeof sales[0] | null>(null);
  const [returnItems, setReturnItems] = useState<{ productId: string; productName: string; qty: number; maxQty: number; unitPrice: number; reason: string }[]>([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'store_credit'>('cash');

  useEffect(() => { loadData(); loadProducts(); }, []);

  const filtered = useMemo(() => {
    let result = [...returns];
    if (search) result = result.filter(r => r.returnNumber.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [returns, search]);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (saleSearch) result = result.filter(s => s.invoiceNumber.toLowerCase().includes(saleSearch.toLowerCase()) || s.customerName.toLowerCase().includes(saleSearch.toLowerCase()));
    return result;
  }, [sales, saleSearch]);

  const stats = useMemo(() => ({
    total: returns.length,
    totalAmount: returns.reduce((s, r) => s + r.refundAmount, 0),
    thisMonth: returns.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length,
  }), [returns]);

  const startReturn = () => { setProcessModal(true); setStep(1); setSelectedSale(null); setReturnItems([]); setSaleSearch(''); };

  const selectSale = (sale: typeof sales[0]) => {
    setSelectedSale(sale);
    setReturnItems(sale.items.map(i => ({ productId: i.productId, productName: i.productName, qty: 0, maxQty: i.quantity, unitPrice: i.unitPrice, reason: '' })));
    setStep(2);
  };

  const updateReturnQty = (productId: string, qty: number) => {
    setReturnItems(items => items.map(i => i.productId === productId ? { ...i, qty: Math.min(Math.max(0, qty), i.maxQty) } : i));
  };

  const updateReason = (productId: string, reason: string) => {
    setReturnItems(items => items.map(i => i.productId === productId ? { ...i, reason } : i));
  };

  const refundTotal = returnItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const selectedItems = returnItems.filter(i => i.qty > 0);

  const handleProcessReturn = () => {
    if (!selectedSale || selectedItems.length === 0) return;
    processReturn({
      saleId: selectedSale.id,
      invoiceNumber: selectedSale.invoiceNumber,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName,
      items: selectedItems.map(i => ({ productId: i.productId, productName: i.productName, originalQuantity: i.maxQty, returnQuantity: i.qty, unitPrice: i.unitPrice, total: i.qty * i.unitPrice, reason: i.reason || 'Other' })),
      refundAmount: refundTotal,
      restockingFee: 0,
      finalRefund: refundTotal,
      refundMethod,
      status: 'completed',
    });

    // Restore stock
    selectedItems.forEach(i => {
      const product = products.find(p => p.id === i.productId);
      if (product) {
        useProductStore.getState().updateProduct(product.id, { stockQuantity: product.stockQuantity + i.qty });
      }
    });

    toast.success('Return processed');
    setProcessModal(false);
  };

  return (
    <div>
      <PageHeader title="Returns" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={startReturn}><Plus className="w-4 h-4 mr-1" />Process Return</Button>} />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total Returns</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p><p className="text-xs text-gray-500">Total Amount</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{stats.thisMonth}</p><p className="text-xs text-gray-500">This Month</p></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className="pl-9" /><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
      </div>

      {filtered.length === 0 ? <EmptyState icon={<RotateCcw className="w-12 h-12" />} title="No returns" description="Process your first return" action={<Button className="bg-orange-500" onClick={startReturn}><Plus className="w-4 h-4 mr-1" />Process Return</Button>} /> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Return #</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Refund</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody>{filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-800">{r.returnNumber}</td>
                <td className="px-4 py-3 text-blue-600">{r.invoiceNumber}</td>
                <td className="px-4 py-3 text-gray-800">{r.customerName}</td>
                <td className="px-4 py-3 text-center">{r.items.length}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.finalRefund)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Dialog open={processModal} onOpenChange={setProcessModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Process Sales Return</DialogTitle></DialogHeader>
          {/* Steps */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
                <span className={`text-xs ${step >= s ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>{s === 1 ? 'Find Sale' : s === 2 ? 'Select Items' : 'Refund'}</span>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <Input value={saleSearch} placeholder="Search invoice..." onChange={e => setSaleSearch(e.target.value)} />
              {filteredSales.slice(0, 20).map(s => (
                <button key={s.id} onClick={() => selectSale(s)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                  <div className="flex justify-between"><span className="font-medium text-sm">{s.invoiceNumber}</span><span className="text-sm text-gray-500">{formatDate(s.createdAt)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-xs text-gray-600">{s.customerName}</span><span className="text-xs font-medium">{formatCurrency(s.grandTotal)}</span></div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && selectedSale && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select items to return from invoice <span className="font-medium">{selectedSale.invoiceNumber}</span></p>
              {returnItems.map(item => (
                <div key={item.productId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1"><p className="text-sm font-medium">{item.productName}</p><p className="text-xs text-gray-500">Original qty: {item.maxQty} | {formatCurrency(item.unitPrice)} each</p></div>
                  <Input type="number" min={0} max={item.maxQty} value={item.qty} onChange={e => updateReturnQty(item.productId, parseInt(e.target.value) || 0)} className="w-16 h-8 text-center" />
                  <select value={item.reason} onChange={e => updateReason(item.productId, e.target.value)} className="h-8 px-2 border rounded text-xs">
                    <option value="">Reason</option><option>Defective</option><option>Damaged</option><option>Wrong Item</option><option>Changed Mind</option><option>Other</option>
                  </select>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2"><span>Refund Amount</span><span className="text-orange-500">{formatCurrency(refundTotal)}</span></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setStep(1)}>Back</Button><Button className="bg-orange-500" onClick={() => setStep(3)} disabled={selectedItems.length === 0}>Next</Button></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Refund Method</Label>
                <div className="flex gap-2 mt-2">
                  {(['cash', 'card', 'store_credit'] as const).map(m => (
                    <button key={m} onClick={() => setRefundMethod(m)} className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize ${refundMethod === m ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600'}`}>{m.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 space-y-2">
                {selectedItems.map(i => (<div key={i.productId} className="flex justify-between text-sm"><span>{i.productName} x{i.qty}</span><span>{formatCurrency(i.qty * i.unitPrice)}</span></div>))}
                <div className="flex justify-between font-semibold text-base border-t pt-2"><span>Total Refund</span><span className="text-orange-500">{formatCurrency(refundTotal)}</span></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setStep(2)}>Back</Button><Button className="bg-orange-500" onClick={handleProcessReturn}><CheckCircle2 className="w-4 h-4 mr-1" />Process Return</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

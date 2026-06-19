import { useState, useEffect, useMemo, useRef } from 'react';
import { useSupplierStore } from '@/stores/supplierStore';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, generatePONumber } from '@/lib/utils';
import { Plus, Search, Eye, Trash2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Purchases() {
  const { purchases, suppliers, loadData: loadSuppliers, addPurchase, updatePurchase, deletePurchase } = useSupplierStore();
  const { products, loadData: loadProducts } = useProductStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<typeof purchases[0] | null>(null);

  // New purchase form state
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number; total: number }[]>([{ productId: '', quantity: 1, unitCost: 0, total: 0 }]);
  const [scanQuery, setScanQuery] = useState('');
  const scanRef = useRef<HTMLInputElement | null>(null);
  const [taxRate, setTaxRate] = useState(18);

  useEffect(() => { loadSuppliers(); loadProducts(); }, []);

  const filtered = useMemo(() => {
    let result = [...purchases];
    if (search) result = result.filter(p => p.poNumber.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [purchases, search]);

  const stats = useMemo(() => ({
    total: purchases.length,
    totalAmount: purchases.reduce((s, p) => s + p.grandTotal, 0),
    pending: purchases.filter(p => p.status === 'pending').length,
    paid: purchases.filter(p => p.status === 'received').length,
  }), [purchases]);

  const addItemRow = () => setItems([...items, { productId: '', quantity: 1, unitCost: 0, total: 0 }]);
  const removeItemRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: unknown) => {
    const newItems = [...items];
    (newItems[idx] as Record<string, unknown>)[field] = value;
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) newItems[idx].unitCost = prod.costPrice;
    }
    setItems(newItems);
  };

  const findProductByCode = (code: string) => {
    const normalized = code.trim();
    if (!normalized) return undefined;
    return products.find(p => p.barcode === normalized || p.imei === normalized || p.sku.toLowerCase() === normalized.toLowerCase());
  };

  const addScannedProduct = (code: string) => {
    const prod = findProductByCode(code);
    if (!prod) return false;
    // add as a new row or increase qty if same product exists
    const existingIdx = items.findIndex(i => i.productId === prod.id);
    if (existingIdx >= 0) {
      const newItems = [...items];
      newItems[existingIdx].quantity += 1;
      newItems[existingIdx].total = newItems[existingIdx].quantity * newItems[existingIdx].unitCost;
      setItems(newItems);
    } else {
      setItems([...items, { productId: prod.id, quantity: 1, unitCost: prod.costPrice, total: prod.costPrice }]);
    }
    return true;
  };

  useEffect(() => {
    // auto-add when scanQuery matches a product exactly
    if (!scanQuery) return;
    const prod = findProductByCode(scanQuery);
    if (prod) {
      addScannedProduct(scanQuery);
      setScanQuery('');
      setTimeout(() => scanRef.current?.focus(), 0);
    }
  }, [scanQuery]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const grandTotal = subtotal + tax;

  const handleCreatePurchase = () => {
    if (!supplierId || items.some(i => !i.productId)) { toast.error('Please fill all fields'); return; }
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const purchaseItems = items.map(i => {
      const prod = products.find(p => p.id === i.productId);
      return { productId: i.productId, productName: prod?.name || '', quantity: i.quantity, unitCost: i.unitCost, total: i.total };
    });

    addPurchase({ supplierId, supplierName: supplier.name, items: purchaseItems, subtotal, tax, discount: 0, shipping: 0, grandTotal, paidAmount: 0, status: 'pending' });
    toast.success('Purchase order created');
    setModalOpen(false);
    setSupplierId('');
    setItems([{ productId: '', quantity: 1, unitCost: 0, total: 0 }]);
    setTaxRate(18);
  };

  return (
    <div>
      <PageHeader title="Purchases" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-1" />Add Purchase</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total Orders</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p><p className="text-xs text-gray-500">Total Amount</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold text-green-600">{stats.paid}</p><p className="text-xs text-gray-500">Received</p></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by PO or supplier..." className="pl-9" /><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO #</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(p => (
            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-blue-600">{p.poNumber}</td>
              <td className="px-4 py-3 text-gray-800">{p.supplierName}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-center">{p.items.length} items</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.grandTotal)}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => setViewPurchase(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Eye className="w-4 h-4" /></button>
                  {p.status === 'pending' && (
                    <button
                      onClick={async () => {
                        try {
                          await updatePurchase(p.id, { status: 'received' });
                          toast.success('Marked as received');
                        } catch (err) {
                          console.error('Failed to mark received', err);
                          toast.error('Update failed', 'Unable to update purchase status');
                        }
                      }}
                      className="p-1.5 rounded hover:bg-green-50 text-green-600"
                      title="Mark as received"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { deletePurchase(p.id); toast.success('Deleted'); }} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Create Purchase Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Supplier *</Label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full h-9 px-3 border rounded-md text-sm">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Scan Barcode / IMEI</Label>
              <Input
                ref={scanRef}
                placeholder="Scan barcode or enter code and press Enter"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); /* handled by effect */ } }}
                className="w-full h-9 mb-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items</Label><Button size="sm" variant="outline" onClick={addItemRow}><Plus className="w-3 h-3 mr-1" />Add Item</Button></div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1"><select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full h-9 px-3 border rounded-md text-sm"><option value="">Select Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-20 h-9" />
                    <Input type="number" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="w-28 h-9" placeholder="Cost" />
                    <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.quantity * item.unitCost)}</span>
                    {items.length > 1 && <button onClick={() => removeItemRow(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-9"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="text-sm text-gray-500">Tax is calculated from the subtotal.</div>
              </div>
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax ({taxRate}%)</span><span className="font-medium">{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-base font-semibold border-t pt-2"><span>Grand Total</span><span className="text-orange-500">{formatCurrency(grandTotal)}</span></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreatePurchase}>Create Purchase</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Purchase */}
      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Purchase Order {viewPurchase?.poNumber}</DialogTitle></DialogHeader>
          {viewPurchase && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm"><span className="text-gray-500">Supplier:</span><span className="font-medium">{viewPurchase.supplierName}</span><span className="text-gray-500">Date:</span><span>{formatDate(viewPurchase.createdAt)}</span><span className="text-gray-500">Status:</span><span><StatusBadge status={viewPurchase.status} /></span></div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-xs">Product</th><th className="text-center px-3 py-2 text-xs">Qty</th><th className="text-right px-3 py-2 text-xs">Cost</th><th className="text-right px-3 py-2 text-xs">Total</th></tr></thead>
                  <tbody>{viewPurchase.items.map((it, i) => (<tr key={i} className="border-t"><td className="px-3 py-2">{it.productName}</td><td className="px-3 py-2 text-center">{it.quantity}</td><td className="px-3 py-2 text-right">{formatCurrency(it.unitCost)}</td><td className="px-3 py-2 text-right font-medium">{formatCurrency(it.total)}</td></tr>))}</tbody>
                </table>
              </div>
              <div className="space-y-1 text-sm border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(viewPurchase.subtotal)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(viewPurchase.tax)}</span></div>
                <div className="flex justify-between font-semibold text-base"><span>Grand Total</span><span className="text-orange-500">{formatCurrency(viewPurchase.grandTotal)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

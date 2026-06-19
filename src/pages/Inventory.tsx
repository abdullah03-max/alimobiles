import { useState, useEffect, useMemo } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, getStockStatus, cn } from '@/lib/utils';
import { Search, Package, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Inventory() {
  const { products, categories, loadData, updateProduct } = useProductStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<typeof products[0] | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
    if (stockFilter) result = result.filter(p => getStockStatus(p.stockQuantity, p.minStockLevel) === stockFilter);
    return result;
  }, [products, search, stockFilter]);

  const stats = useMemo(() => ({
    totalItems: products.reduce((s, p) => s + p.stockQuantity, 0),
    totalValue: products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0),
    lowStock: products.filter(p => getStockStatus(p.stockQuantity, p.minStockLevel) === 'low_stock').length,
  }), [products]);

  const handleAdjust = () => {
    if (!adjustProduct || !adjustQty) return;
    const qty = parseInt(adjustQty);
    let newStock = adjustProduct.stockQuantity;
    if (adjustType === 'add') newStock += qty;
    else if (adjustType === 'remove') newStock = Math.max(0, newStock - qty);
    else if (adjustType === 'set') newStock = qty;

    updateProduct(adjustProduct.id, { stockQuantity: newStock });
    toast.success('Stock adjusted', `${adjustProduct.name}: ${adjustProduct.stockQuantity} → ${newStock}`);
    setAdjustModal(false);
    setAdjustQty('');
  };

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage stock levels" actions={<Button size="sm" variant="outline" onClick={() => {}}><Plus className="w-4 h-4 mr-1" />Stock Adjustment</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
          <div><p className="text-lg font-bold">{stats.totalItems}</p><p className="text-xs text-gray-500">Total Items</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-green-500" /></div>
          <div><p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-gray-500">Inventory Value</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-yellow-500" /></div>
          <div><p className="text-lg font-bold">{stats.lowStock}</p><p className="text-xs text-gray-500">Low Stock Items</p></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 h-9 text-sm" />
        </div>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white">
          <option value="">All Stock</option><option value="in_stock">Normal</option><option value="low_stock">Low</option><option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Level</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>{filteredProducts.map(p => {
            const status = getStockStatus(p.stockQuantity, p.minStockLevel);
            return (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.sku}</td>
                <td className="px-4 py-3 text-gray-600">{categories.find(c => c.id === p.categoryId)?.name}</td>
                <td className="px-4 py-3 text-center font-medium"><span className={cn(status === 'in_stock' ? 'text-green-600' : status === 'low_stock' ? 'text-yellow-600' : 'text-red-600')}>{p.stockQuantity}</span></td>
                <td className="px-4 py-3 text-center text-gray-500">{p.minStockLevel}</td>
                <td className="px-4 py-3 text-center"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', status === 'in_stock' ? 'bg-green-50 text-green-600' : status === 'low_stock' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600')}>{status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-center"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAdjustProduct(p); setAdjustModal(true); }}>Adjust</Button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
          {adjustProduct && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Product: <span className="font-medium text-gray-800">{adjustProduct.name}</span></p>
              <p className="text-sm text-gray-600">Current Stock: <span className="font-medium">{adjustProduct.stockQuantity}</span></p>
              <div className="flex gap-2">
                {(['add', 'remove', 'set'] as const).map(t => (
                  <button key={t} onClick={() => setAdjustType(t)} className={cn('flex-1 py-2 rounded-md text-sm font-medium border-2 capitalize', adjustType === t ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>{t}</button>
                ))}
              </div>
              <div><Label>Quantity</Label><Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Enter quantity" /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAdjustModal(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleAdjust}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

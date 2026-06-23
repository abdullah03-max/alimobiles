import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '@/stores/productStore';
import { useImeiStore } from '@/stores/imeiStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, getStockStatus, downloadCSV, calculateProfit } from '@/lib/utils';
import {
  Plus, Search, Pencil, Trash2, Download, Package, CheckCircle2, AlertTriangle, XCircle, Smartphone, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Products() {
  const navigate = useNavigate();
  const { products, categories, brands, loadData, deleteProduct } = useProductStore();
  const { loadData: loadImeis, getImeisByProduct } = useImeiStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);

  useEffect(() => {
    loadData();
    loadImeis();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter(p => p.categoryId === categoryFilter);
    }
    if (stockFilter) {
      result = result.filter(p => getStockStatus(p.stockQuantity, p.minStockLevel) === stockFilter);
    }
    if (conditionFilter) {
      result = result.filter(p => p.condition === conditionFilter);
    }
    return result;
  }, [products, search, categoryFilter, stockFilter, conditionFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    lowStock: products.filter(p => getStockStatus(p.stockQuantity, p.minStockLevel) === 'low_stock').length,
    outOfStock: products.filter(p => getStockStatus(p.stockQuantity, p.minStockLevel) === 'out_of_stock').length,
  }), [products]);

  const handleDelete = async () => {
    if (deleteId) {
      const success = await deleteProduct(deleteId);
      if (success) {
        toast.success('Product deleted');
      } else {
        toast.error('Delete failed', 'Could not delete product. It may be referenced in other transactions.');
      }
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    const data = filteredProducts.map((p, index) => ({
      No: index + 1,
      Name: p.name,
      Category: categories.find(c => c.id === p.categoryId)?.name || '',
      Brand: brands.find(b => b.id === p.brandId)?.name || '',
      'Cost Price': p.costPrice,
      'Sale Price': p.salePrice,
      Stock: p.stockQuantity,
      Status: p.status,
    }));
    downloadCSV(data, 'products.csv');
    toast.success('Products exported');
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate('/products/add')}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
          <div><p className="text-lg font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total Products</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
          <div><p className="text-lg font-bold">{stats.active}</p><p className="text-xs text-gray-500">Active</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-500" /></div>
          <div><p className="text-lg font-bold">{stats.lowStock}</p><p className="text-xs text-gray-500">Low Stock</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>
          <div><p className="text-lg font-bold">{stats.outOfStock}</p><p className="text-xs text-gray-500">Out of Stock</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 h-9 text-sm" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white">
          <option value="">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white">
          <option value="">All Conditions</option>
          <option value="new">New</option>
          <option value="refurbished">Refurbished</option>
          <option value="used">Used</option>
        </select>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <EmptyState title="No products found" description="Add your first product to get started" action={<Button className="bg-orange-500" onClick={() => navigate('/products/add')}><Plus className="w-4 h-4 mr-1" />Add Product</Button>} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Condition</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const category = categories.find(c => c.id === product.categoryId);
                const brand = brands.find(b => b.id === product.brandId);
                const stockStatus = getStockStatus(product.stockQuantity, product.minStockLevel);
                
                // Extract model from product name for Mobiles category
                let model = product.name;
                if ((category?.name === 'Mobiles' || category?.name === 'Tablets') && brand?.name) {
                  const brandPrefix = brand.name.toLowerCase();
                  if (product.name.toLowerCase().startsWith(brandPrefix)) {
                    model = product.name.substring(brand.name.length).trim();
                  }
                }
                
                return (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
                        <div><p className="font-medium text-gray-800">{product.name}</p>{product.imei && <p className="text-[11px] text-gray-500">{product.imei}</p>}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{category?.name}</span></td>
                    <td className="px-4 py-3 text-gray-600">{model}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-block px-2 py-1 rounded text-xs font-medium',
                        product.condition === 'new' ? 'bg-green-100 text-green-700' :
                        product.condition === 'refurbished' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      )}>
                        {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium">{formatCurrency(product.salePrice)}</p>
                      <p className="text-[11px] text-gray-500">Cost: {formatCurrency(product.costPrice)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        stockStatus === 'in_stock' ? 'text-green-600' : stockStatus === 'low_stock' ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', stockStatus === 'in_stock' ? 'bg-green-500' : stockStatus === 'low_stock' ? 'bg-yellow-500' : 'bg-red-500')} />
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={product.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetailProduct(product)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/products/edit/${product.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/products/${product.id}/imeis`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Manage IMEIs">
                          <Smartphone className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(product.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} itemName="Product" />

      {/* Product Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => { if (!open) setDetailProduct(null); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {detailProduct && (() => {
            const category = categories.find(c => c.id === detailProduct.categoryId);
            const brand = brands.find(b => b.id === detailProduct.brandId);
            
            // Parse predefined colors
            let descriptionText = detailProduct.description || '';
            let parsedColors: string[] = [];
            if (descriptionText.startsWith('{')) {
              try {
                const parsed = JSON.parse(descriptionText);
                parsedColors = parsed.colors || [];
                descriptionText = parsed.text || '';
              } catch (e) {
                // fallback
              }
            }
            
            const productImeis = getImeisByProduct(detailProduct.id);
            const availableImeis = productImeis.filter(i => i.status === 'available');
            const soldImeis = productImeis.filter(i => i.status === 'sold');
            const colorStockCounts = parsedColors.reduce<Record<string, number>>((acc, color) => {
              const normalized = color.toLowerCase().trim();
              acc[color] = availableImeis.filter(imei => imei.color?.trim().toLowerCase() === normalized).length;
              return acc;
            }, {});
            const profit = calculateProfit(detailProduct.costPrice, detailProduct.salePrice);
            
            return (
              <div className="space-y-4">
                {/* General Info */}
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{detailProduct.name}</h3>
                    <p className="text-xs text-gray-500">
                      Category: <span className="font-semibold">{category?.name || '—'}</span> | Brand: <span className="font-semibold">{brand?.name || '—'}</span>
                    </p>
                  </div>
                </div>

                {/* Specs (only predefined colors) */}
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <span className="text-gray-400 block text-xs">Predefined Colors</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parsedColors.length > 0 ? parsedColors.map(c => (
                        <div key={c} className="flex min-w-[140px] flex-col gap-1 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2">
                          <span className="text-orange-700 text-xs font-semibold uppercase tracking-wide">{c}</span>
                          <span className="text-xs text-gray-600">{colorStockCounts[c] ?? 0} remaining</span>
                        </div>
                      )) : (
                        <span className="text-xs text-gray-400 italic">No colors defined</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing & Profit */}
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-semibold text-gray-850 text-xs uppercase tracking-wider">Pricing details</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Cost Price</span>
                      <p className="font-semibold text-gray-700">{formatCurrency(detailProduct.costPrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Sale Price</span>
                      <p className="font-semibold text-gray-700">{formatCurrency(detailProduct.salePrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Wholesale Price</span>
                      <p className="font-semibold text-gray-700">{detailProduct.wholesalePrice ? formatCurrency(detailProduct.wholesalePrice) : '—'}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-md p-2 text-xs text-green-700 flex justify-between">
                    <span>Estimated Profit Per Unit</span>
                    <span className="font-bold">{formatCurrency(profit.amount)} ({profit.margin}% margin)</span>
                  </div>
                </div>

                {/* Stock & Serial Numbers */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-850 text-xs uppercase tracking-wider">Stock & IMEIs</h4>
                    <span className="text-xs bg-gray-150 text-gray-700 px-2 py-0.5 rounded-full font-semibold">Total Stock: {detailProduct.stockQuantity}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-green-50/50 border border-green-100 rounded p-2 text-green-700">
                      <span className="font-bold text-base block">{availableImeis.length}</span>
                      Available
                    </div>
                    <div className="bg-red-50/50 border border-red-100 rounded p-2 text-red-700">
                      <span className="font-bold text-base block">{soldImeis.length}</span>
                      Sold
                    </div>
                  </div>

                  {productImeis.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-400 block mb-1">IMEI Serial Registry</span>
                      <div className="border rounded-md divide-y max-h-[140px] overflow-y-auto font-mono text-[11px]">
                        {productImeis.map(record => (
                          <div key={record.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
                            <span>{record.imei} {record.color ? `(${record.color})` : ''}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                              record.status === 'available' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                            )}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 pt-2 border-t">
                  <div>Condition: <span className="font-medium text-gray-600 capitalize">{detailProduct.condition}</span></div>
                  <div className="text-right">Status: <span className="font-medium text-gray-600 capitalize">{detailProduct.status}</span></div>
                  {descriptionText && (
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <span className="font-semibold text-gray-500 block text-xs">Description</span>
                      <p className="mt-0.5 text-gray-600 normal-case leading-relaxed">{descriptionText}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

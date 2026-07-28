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
  const [ptaFilter, setPtaFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);

  // Dialog (modal) level filters for individual units
  const [modalConditionFilter, setModalConditionFilter] = useState('');
  const [modalPtaFilter, setModalPtaFilter] = useState('');

  // Reset modal filters on change of active product
  useEffect(() => {
    setModalConditionFilter('');
    setModalPtaFilter('');
  }, [detailProduct]);

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
      result = result.filter(p => {
        const pImeis = getImeisByProduct(p.id);
        const available = pImeis.filter(i => i.status === 'available');
        if (available.length > 0) {
          return available.some(i => i.condition === conditionFilter);
        }
        return p.condition === conditionFilter;
      });
    }
    if (ptaFilter) {
      result = result.filter(p => {
        const pImeis = getImeisByProduct(p.id);
        const available = pImeis.filter(i => i.status === 'available');
        if (available.length > 0) {
          return available.some(i => i.ptaStatus === ptaFilter);
        }
        let productPta = '';
        if (p.description && p.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(p.description);
            productPta = parsed.ptaStatus || '';
          } catch {}
        }
        return productPta === ptaFilter;
      });
    }
    return result;
  }, [products, search, categoryFilter, stockFilter, conditionFilter, ptaFilter, getImeisByProduct]);

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
          <option value="used">Used</option>
          <option value="open_box">Open Box</option>
          <option value="refurbished">Refurbished</option>
        </select>
        <select value={ptaFilter} onChange={(e) => setPtaFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white">
          <option value="">All PTA Statuses</option>
          <option value="approved">PTA Approved</option>
          <option value="non-approved">Non PTA</option>
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

                // Extract PTA status from available IMEIs
                const productImeisList = useImeiStore.getState().getAvailableByProduct(product.id);
                let ptaStatus = '';
                if (productImeisList.length > 0) {
                  const approvedCount = productImeisList.filter(i => i.ptaStatus === 'approved').length;
                  if (approvedCount === productImeisList.length) ptaStatus = 'approved';
                  else if (approvedCount === 0) ptaStatus = 'non-approved';
                  else ptaStatus = 'mixed';
                }
                
                return (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
                        <div>
                          <p className="font-medium text-gray-800 flex items-center gap-1.5">
                            {product.name}
                            {ptaStatus && (
                              <span className={cn(
                                'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap',
                                ptaStatus === 'approved' 
                                  ? 'bg-green-50 text-green-700 border-green-200' :
                                ptaStatus === 'mixed'
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              )}>
                                {ptaStatus === 'approved' ? 'PTA Approved' : ptaStatus === 'mixed' ? 'Mixed PTA' : 'Non PTA'}
                              </span>
                            )}
                          </p>
                          {product.imei && <p className="text-[11px] text-gray-500">{product.imei}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{category?.name}</span></td>
                    <td className="px-4 py-3 text-gray-600">{model}</td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        let salePriceDisplay = formatCurrency(product.salePrice);
                        let costPriceDisplay = `Cost: ${formatCurrency(product.costPrice)}`;
                        
                        if (product.description && product.description.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(product.description);
                            const pVariants = parsed.variants || [];
                            if (pVariants.length > 0) {
                              const salePrices = pVariants.map((v: any) => v.salePrice ?? product.salePrice ?? 0);
                              const costPrices = pVariants.map((v: any) => v.costPrice ?? product.costPrice ?? 0);
                              const minSale = Math.min(...salePrices);
                              const maxSale = Math.max(...salePrices);
                              const minCost = Math.min(...costPrices);
                              const maxCost = Math.max(...costPrices);
                              
                              salePriceDisplay = minSale === maxSale ? formatCurrency(minSale) : `${formatCurrency(minSale)} - ${formatCurrency(maxSale)}`;
                              costPriceDisplay = minCost === maxCost ? `Cost: ${formatCurrency(minCost)}` : `Cost: ${formatCurrency(minCost)} - ${formatCurrency(maxCost)}`;
                            }
                          } catch (e) {}
                        }
                        
                        return (
                          <>
                            <p className="font-medium">{salePriceDisplay}</p>
                            <p className="text-[11px] text-gray-500">{costPriceDisplay}</p>
                          </>
                        );
                      })()}
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
        <DialogContent className="sm:max-w-[95vw] w-[95vw] md:max-w-[1300px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {detailProduct && (() => {
            const category = categories.find(c => c.id === detailProduct.categoryId);
            const brand = brands.find(b => b.id === detailProduct.brandId);
            
            // Parse predefined colors, variants and PTA status
            let descriptionText = detailProduct.description || '';
            let parsedColors: string[] = [];
            let parsedVariants: any[] = [];
            if (descriptionText.startsWith('{')) {
              try {
                const parsed = JSON.parse(descriptionText);
                parsedColors = parsed.colors || [];
                parsedVariants = parsed.variants || [];
                descriptionText = parsed.text || '';
              } catch (e) {
                // fallback
              }
            }
            
            const productImeis = getImeisByProduct(detailProduct.id);
            const availableImeis = productImeis.filter(i => i.status === 'available');
            const soldImeis = productImeis.filter(i => i.status === 'sold');

            const availablePtaApproved = availableImeis.filter(i => i.ptaStatus === 'approved').length;
            const availableNonPta = availableImeis.filter(i => i.ptaStatus === 'non-approved').length;
            
            const availableNew = availableImeis.filter(i => i.condition === 'new').length;
            const availableUsed = availableImeis.filter(i => i.condition === 'used').length;
            const availableOpenBox = availableImeis.filter(i => i.condition === 'open_box').length;
            const availableRefurbished = availableImeis.filter(i => i.condition === 'refurbished').length;

            let ptaStatus: string = '';
            if (availableImeis.length > 0) {
              const approvedCount = availableImeis.filter(i => i.ptaStatus === 'approved').length;
              if (approvedCount === availableImeis.length) ptaStatus = 'approved';
              else if (approvedCount === 0) ptaStatus = 'non-approved';
              else ptaStatus = 'mixed';
            }

            const colorStockCounts = parsedColors.reduce<Record<string, number>>((acc, color) => {
              const normalized = color.toLowerCase().trim();
              acc[color] = availableImeis.filter(imei => imei.color?.trim().toLowerCase() === normalized).length;
              return acc;
            }, {});
            const profit = calculateProfit(detailProduct.costPrice, detailProduct.salePrice);
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: General Info, Specs, Pricing */}
                <div className="space-y-4">
                  {/* General Info */}
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {detailProduct.name}
                        {ptaStatus && (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap',
                            ptaStatus === 'approved' 
                              ? 'bg-green-50 text-green-700 border-green-200' :
                            ptaStatus === 'mixed'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          )}>
                            {ptaStatus === 'approved' ? 'PTA Approved' : ptaStatus === 'mixed' ? 'Mixed PTA' : 'Non PTA'}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
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
                    {parsedVariants.length === 0 ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-3 pt-1">
                        {parsedVariants.map((v, vIdx) => {
                          const vCost = v.costPrice ?? detailProduct.costPrice ?? 0;
                          const vSale = v.salePrice ?? detailProduct.salePrice ?? 0;
                          const vWholesale = v.wholesalePrice ?? detailProduct.wholesalePrice ?? 0;
                          const vProfit = calculateProfit(vCost, vSale);
                          return (
                            <div key={vIdx} className="border-t first:border-t-0 pt-2 first:pt-0 space-y-1">
                              <span className="font-semibold text-gray-855 text-xs">Variant: {v.ram} / {v.storage}</span>
                              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                                <div>
                                  <span className="text-gray-400">Cost Price</span>
                                  <p className="font-semibold text-gray-750">{formatCurrency(vCost)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Sale Price</span>
                                  <p className="font-semibold text-gray-755">{formatCurrency(vSale)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Wholesale Price</span>
                                  <p className="font-semibold text-gray-755">{vWholesale ? formatCurrency(vWholesale) : '—'}</p>
                                </div>
                              </div>
                              <div className="bg-green-50 border border-green-100 rounded p-1.5 text-xs text-green-700 flex justify-between">
                                <span>Estimated Profit</span>
                                <span className="font-bold">{formatCurrency(vProfit.amount)} ({vProfit.margin}% margin)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t">
                    <span>Product Status: <span className="font-medium text-gray-600 capitalize">{detailProduct.status}</span></span>
                  </div>
                  {descriptionText && (
                    <div className="pt-2 border-t text-xs">
                      <span className="font-semibold text-gray-500 block text-xs">Description</span>
                      <p className="mt-0.5 text-gray-600 normal-case leading-relaxed">{descriptionText}</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Stock Stats & IMEI registry */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
                  <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-850 text-xs uppercase tracking-wider">Stock Stats</h4>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">Total: {detailProduct.stockQuantity}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-white border border-green-100 rounded p-2 text-green-700 shadow-sm">
                        <span className="font-bold text-base block">{availableImeis.length}</span>
                        Available
                      </div>
                      <div className="bg-white border border-red-100 rounded p-2 text-red-700 shadow-sm">
                        <span className="font-bold text-base block">{soldImeis.length}</span>
                        Sold
                      </div>
                    </div>

                    {/* PTA status summary */}
                    {availableImeis.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">PTA Breakdown (Available)</span>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="bg-white border border-green-50 rounded p-1.5 text-green-800 shadow-xs flex items-center justify-between px-2.5">
                            <span className="text-[11px] font-semibold">Approved</span>
                            <span className="font-bold text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{availablePtaApproved}</span>
                          </div>
                          <div className="bg-white border border-red-50 rounded p-1.5 text-red-800 shadow-xs flex items-center justify-between px-2.5">
                            <span className="text-[11px] font-semibold">Non PTA</span>
                            <span className="font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{availableNonPta}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conditions summary */}
                    {availableImeis.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Condition Breakdown (Available)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px]">
                          <div className="bg-white border border-green-50 rounded p-1.5 shadow-xs flex flex-col justify-center items-center">
                            <span className="font-bold text-xs text-green-700">{availableNew}</span>
                            <span className="text-gray-500 font-semibold mt-0.5">New</span>
                          </div>
                          <div className="bg-white border border-orange-50 rounded p-1.5 shadow-xs flex flex-col justify-center items-center">
                            <span className="font-bold text-xs text-orange-700">{availableUsed}</span>
                            <span className="text-gray-500 font-semibold mt-0.5">Used</span>
                          </div>
                          <div className="bg-white border border-amber-50 rounded p-1.5 shadow-xs flex flex-col justify-center items-center">
                            <span className="font-bold text-xs text-amber-700">{availableOpenBox}</span>
                            <span className="text-gray-500 font-semibold mt-0.5">Open Box</span>
                          </div>
                          <div className="bg-white border border-blue-50 rounded p-1.5 shadow-xs flex flex-col justify-center items-center">
                            <span className="font-bold text-xs text-blue-700">{availableRefurbished}</span>
                            <span className="text-gray-500 font-semibold mt-0.5">Refurbished</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {productImeis.length > 0 && (() => {
                    const filteredImeis = productImeis.filter(record => {
                      if (modalConditionFilter && record.condition !== modalConditionFilter) return false;
                      if (modalPtaFilter && record.ptaStatus !== modalPtaFilter) return false;
                      return true;
                    });

                    return (
                      <div className="border rounded-lg p-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-gray-850 text-xs uppercase tracking-wider">IMEI Serial Registry</h4>
                          <span className="text-[10px] text-gray-400">showing {filteredImeis.length} of {productImeis.length}</span>
                        </div>

                        {/* Modal Filter Dropdowns */}
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-md border">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500 block mb-1">Filter Condition</label>
                            <select
                              value={modalConditionFilter}
                              onChange={(e) => setModalConditionFilter(e.target.value)}
                              className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">All Conditions</option>
                              <option value="new">New</option>
                              <option value="used">Used</option>
                              <option value="open_box">Open Box</option>
                              <option value="refurbished">Refurbished</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500 block mb-1">Filter PTA Status</label>
                            <select
                              value={modalPtaFilter}
                              onChange={(e) => setModalPtaFilter(e.target.value)}
                              className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">All PTA Statuses</option>
                              <option value="approved">PTA Approved</option>
                              <option value="non-approved">Non PTA</option>
                            </select>
                          </div>
                        </div>

                        <div className="border rounded-md divide-y max-h-[220px] overflow-y-auto font-mono text-[11px] bg-white">
                          {filteredImeis.length > 0 ? filteredImeis.map(record => (
                            <div key={record.id} className="flex justify-between items-start p-2 hover:bg-gray-50">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-gray-900">{record.imei} {record.color ? `(${record.color})` : ''}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5 font-sans">
                                  {record.ram || record.storage ? (
                                    <span className="text-[10px] text-gray-500 font-semibold bg-gray-150 px-1 rounded-sm">
                                      {record.ram || ''}/{record.storage || ''}
                                    </span>
                                  ) : null}
                                  {record.condition && (
                                    <span className={cn(
                                      "text-[10px] font-semibold px-1 rounded-sm border capitalize",
                                      record.condition === 'new' ? "bg-green-50 text-green-700 border-green-100" :
                                      record.condition === 'used' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                      record.condition === 'open_box' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                      "bg-blue-50 text-blue-700 border-blue-100"
                                    )}>
                                      {record.condition === 'open_box' ? 'Open Box' : record.condition}
                                    </span>
                                  )}
                                  {record.ptaStatus && (
                                    <span className={cn(
                                      "text-[10px] font-semibold px-1 rounded-sm border",
                                      record.ptaStatus === 'approved' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                    )}>
                                      {record.ptaStatus === 'approved' ? 'PTA Approved' : 'Non PTA'}
                                    </span>
                                  )}
                                </div>
                                {record.condition !== 'new' && (record.costPrice || record.salePrice || record.wholesalePrice) ? (
                                  <div className="text-[10px] text-gray-500 font-semibold mt-1 font-sans flex flex-wrap gap-x-2 gap-y-0.5">
                                    {record.costPrice ? <span>Cost: <span className="font-bold text-gray-800">{formatCurrency(record.costPrice)}</span></span> : null}
                                    {record.salePrice ? <span>Sale: <span className="font-bold text-blue-700">{formatCurrency(record.salePrice)}</span></span> : null}
                                    {record.wholesalePrice ? <span>Whole: <span className="font-bold text-purple-700">{formatCurrency(record.wholesalePrice)}</span></span> : null}
                                  </div>
                                ) : null}
                              </div>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                                record.status === 'available' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {record.status}
                              </span>
                            </div>
                          )) : (
                            <div className="p-4 text-center text-gray-500 font-sans text-xs italic">
                              No matching IMEIs found
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

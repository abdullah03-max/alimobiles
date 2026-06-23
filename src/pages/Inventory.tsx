import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '@/stores/productStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { useImeiStore } from '@/stores/imeiStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, getStockStatus, cn, formatDate } from '@/lib/utils';
import {
  Search,
  Package,
  Plus,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Palette,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Check,
  Building2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Inventory() {
  const navigate = useNavigate();
  const { products, categories, brands, loadData: loadProductData } = useProductStore();
  const { loadData: loadSupplierData, purchases } = useSupplierStore();
  const { loadData: loadImeiData, imeis } = useImeiStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProductData();
    loadSupplierData();
    loadImeiData();
  }, []);

  // Helpers to resolve model/variant names & purchase details
  const getBrandName = (brandId: string) => {
    return brands.find(b => b.id === brandId)?.name || '—';
  };

  const getModelName = (productName: string, brandName: string) => {
    if (!brandName || brandName === '—') return productName;
    const prefix = brandName.toLowerCase();
    if (productName.toLowerCase().startsWith(prefix)) {
      return productName.substring(brandName.length).trim();
    }
    return productName;
  };

  const getImeiPurchaseInfo = (imeiNum: string) => {
    if (!purchases) return null;
    // Find the purchase order that contains this IMEI in its items
    const purchase = purchases.find(p =>
      p.items?.some(item => item.imei?.trim() === imeiNum.trim())
    );
    if (purchase) {
      return {
        date: purchase.createdAt,
        supplierName: purchase.supplierName
      };
    }
    return null;
  };

  // Compile detailed inventory information for each product
  const detailedProducts = useMemo(() => {
    return products.map(p => {
      const productImeis = imeis.filter(i => i.productId === p.id);
      const availableImeis = productImeis.filter(i => i.status === 'available');
      const soldImeis = productImeis.filter(i => i.status === 'sold');
      const brandName = getBrandName(p.brandId);
      const modelName = getModelName(p.name, brandName);

      // Predefined colors and PTA Status
      let parsedColors: string[] = [];
      let ptaStatus = '';
      if (p.color) parsedColors.push(p.color);
      if (p.description && p.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(p.description);
          if (parsed.colors) parsedColors.push(...parsed.colors);
          ptaStatus = parsed.ptaStatus || '';
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Add colors from actual IMEIs
      const actualColors = productImeis.map(i => i.color).filter(Boolean) as string[];
      const allColors = Array.from(new Set([...parsedColors, ...actualColors]));

      return {
        ...p,
        brandName,
        modelName,
        allColors,
        ptaStatus,
        imeis: productImeis,
        availableImeis,
        soldImeis,
        totalQuantity: productImeis.length,
        availableStock: availableImeis.length,
        soldStock: soldImeis.length
      };
    });
  }, [products, brands, imeis]);

  // Filter products based on search query and stock status
  const filteredProducts = useMemo(() => {
    let result = [...detailedProducts];

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.brandName.toLowerCase().includes(query) ||
          p.modelName.toLowerCase().includes(query) ||
          p.allColors.some(c => c.toLowerCase().includes(query)) ||
          p.imeis.some(i => i.imei.toLowerCase().includes(query))
      );
    }

    if (stockFilter) {
      result = result.filter(p => {
        const status = getStockStatus(p.availableStock, p.minStockLevel);
        return status === stockFilter;
      });
    }

    return result;
  }, [detailedProducts, search, stockFilter]);

  // Global inventory statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let availableItems = 0;
    let soldItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    detailedProducts.forEach(p => {
      totalItems += p.totalQuantity;
      availableItems += p.availableStock;
      soldItems += p.soldStock;
      totalValue += p.availableStock * p.costPrice;

      const status = getStockStatus(p.availableStock, p.minStockLevel);
      if (status === 'low_stock') {
        lowStockCount++;
      }
    });

    return {
      totalItems,
      availableItems,
      soldItems,
      totalValue,
      lowStockCount
    };
  }, [detailedProducts]);

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const expandAll = () => {
    const nextState: Record<string, boolean> = {};
    filteredProducts.forEach(p => {
      nextState[p.id] = true;
    });
    setExpandedProducts(nextState);
  };

  const collapseAll = () => {
    setExpandedProducts({});
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Detailed inventory tracking with IMEI-level details"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={expandAll}>
              Expand All
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        }
      />

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm transition-all hover:shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.availableItems}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm transition-all hover:shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.soldItems}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm transition-all hover:shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
              <Smartphone className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Quantity</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm transition-all hover:shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-100">
              <SlidersHorizontal className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock Items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brand, model, color, storage, or IMEI..."
            className="pl-10 h-10 text-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</Label>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium text-gray-700"
          >
            <option value="">All Stocks</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Detailed Inventory List */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">No inventory matches</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const isExpanded = !!expandedProducts[p.id];
            const status = getStockStatus(p.availableStock, p.minStockLevel);

            // Group product IMEIs by color
            const imeisByColor: Record<string, typeof p.imeis> = {};
            p.imeis.forEach(imei => {
              const c = imei.color || 'Unspecified';
              if (!imeisByColor[c]) imeisByColor[c] = [];
              imeisByColor[c].push(imei);
            });

            return (
              <div
                key={p.id}
                className={cn(
                  'bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200 hover:border-gray-300',
                  isExpanded && 'ring-1 ring-orange-500/10 border-orange-500/20'
                )}
              >
                {/* Product Card Header */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100 flex-shrink-0 text-orange-600 mt-0.5">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {p.brandName}
                        </span>
                        {p.storage && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {p.storage}
                          </span>
                        )}
                        {p.ram && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            {p.ram} RAM
                          </span>
                        )}
                        {p.ptaStatus && (
                          <span className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                            p.ptaStatus === 'approved' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          )}>
                            {p.ptaStatus === 'approved' ? 'PTA Approved' : 'Non PTA'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {p.modelName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <Palette className="w-3.5 h-3.5 text-gray-400" />
                        <span>Colors:</span>
                        {p.allColors.length > 0 ? (
                          p.allColors.map(c => (
                            <span key={c} className="font-semibold text-gray-700 bg-gray-50 border px-1.5 py-0.5 rounded text-[10px]">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="italic">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Qty</p>
                        <p className="text-base font-bold text-gray-800">{p.totalQuantity}</p>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Available</p>
                        <p className="text-base font-bold text-green-700">{p.availableStock}</p>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Sold</p>
                        <p className="text-base font-bold text-red-700">{p.soldStock}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold border',
                          status === 'in_stock'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : status === 'low_stock'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        {status === 'in_stock' ? 'In Stock' : status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </span>
                      <div className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible IMEI details list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">IMEI Breakdown</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs font-semibold text-orange-600 hover:text-orange-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/products/${p.id}/imeis`);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Adjust IMEIs
                      </Button>
                    </div>

                    {p.imeis.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-2 text-center">No IMEIs registered for this product.</p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(imeisByColor).map(([colorName, imeiList]) => (
                          <div key={colorName} className="space-y-2">
                            <h5 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                              <Palette className="w-4 h-4 text-gray-400" />
                              {colorName} <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 border px-1.5 py-0.5 rounded-full">{imeiList.length}</span>
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                              {imeiList.map(imei => {
                                const purchaseInfo = getImeiPurchaseInfo(imei.imei);
                                return (
                                  <div
                                    key={imei.id}
                                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-xs flex flex-col justify-between gap-2 hover:border-gray-300 transition"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-sm font-bold text-gray-900 select-all">
                                        {imei.imei}
                                      </span>
                                      <span
                                        className={cn(
                                          'px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1',
                                          imei.status === 'available'
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                        )}
                                      >
                                        {imei.status === 'available' ? (
                                          <>
                                            <Check className="w-3 h-3 text-green-600" /> Available
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-3 h-3 text-red-600" /> Sold
                                          </>
                                        )}
                                      </span>
                                    </div>

                                    {/* Purchase info if matching order found */}
                                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t pt-2 border-gray-50 mt-1">
                                      <div className="flex items-center gap-1 text-gray-500">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span className="font-medium">
                                          {purchaseInfo?.date ? formatDate(purchaseInfo.date) : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-gray-500 truncate" title={purchaseInfo?.supplierName}>
                                        <Building2 className="w-3 h-3 text-gray-400" />
                                        <span className="font-medium truncate">
                                          {purchaseInfo?.supplierName || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

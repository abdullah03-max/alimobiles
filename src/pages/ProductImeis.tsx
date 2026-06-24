import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '@/stores/productStore';
import { useImeiStore } from '@/stores/imeiStore';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, AlertTriangle, Trash2, Smartphone, ChevronDown, Package, Palette, Archive } from 'lucide-react';

export default function ProductImeis() {
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = id || '';
  const { products, categories, brands, loadData: loadProducts } = useProductStore();
  const { imeis, loadData: loadImeis, addImei, removeImei, getImeisByProduct, getAvailableByProduct } = useImeiStore();
  const toast = useToast();

  const [imei1Input, setImei1Input] = useState('');
  const [imei2Input, setImei2Input] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedColors, setExpandedColors] = useState<Record<string, boolean>>({});
  
  const imei1Ref = useRef<HTMLInputElement>(null);
  const imei2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadImeis();
  }, [loadProducts, loadImeis]);

  // Focus the first IMEI field on mount
  useEffect(() => {
    imei1Ref.current?.focus();
  }, []);

  const product = products.find((p) => p.id === productId);
  const category = categories.find((c) => c.id === product?.categoryId);
  const brand = product ? brands.find(b => b.id === product.brandId) : undefined;
  const productImeis = getImeisByProduct(productId);
  const availableImeis = getAvailableByProduct(productId);
  const soldImeis = productImeis.filter((item) => item.status === 'sold');

  // Parse predefined colors list from description field
  const availableColors = useMemo(() => {
    if (!product || !product.description) return [];
    if (product.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        return (parsed.colors || []) as string[];
      } catch (e) {
        // fallback
      }
    }
    return [];
  }, [product]);

  // Group IMEIs by color
  const groupedByColor = useMemo(() => {
    const grouped: Record<string, typeof productImeis> = {};
    productImeis.forEach(imei => {
      const color = imei.color || 'Unspecified';
      if (!grouped[color]) {
        grouped[color] = [];
      }
      grouped[color].push(imei);
    });
    return grouped;
  }, [productImeis]);

  // Sort colors: available first (with counts), then unspecified
  const sortedColors = useMemo(() => {
    return Object.keys(groupedByColor).sort((a, b) => {
      if (a === 'Unspecified') return 1;
      if (b === 'Unspecified') return -1;
      return a.localeCompare(b);
    });
  }, [groupedByColor]);

  // Default to the first color option once colors are loaded
  useEffect(() => {
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

  const handleAddImei = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productId) return;

    const trimmed1 = imei1Input.trim();
    const trimmed2 = imei2Input.trim();

    // Keep the inputs while validating; only clear after success
    setError('');

    if (!trimmed1 && !trimmed2) {
      setError('Enter at least one IMEI number');
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      setError('Select a device color');
      toast.error('Color required', 'Please select a color for the device');
      return;
    }

    setLoading(true);
    const added = await addImei(productId, trimmed1, trimmed2, selectedColor || undefined);
    setLoading(false);

    if (!added) {
      const duplicateImei = !useImeiStore.getState().isImeiUnique(trimmed1)
        ? trimmed1
        : !useImeiStore.getState().isImeiUnique(trimmed2)
        ? trimmed2
        : '';
      const message = duplicateImei
        ? `IMEI "${duplicateImei}" already exists in the system`
        : 'IMEI could not be added';
      setError(message);
      toast.error('Duplicate IMEI', message);
      return;
    }

    toast.success('IMEI added', trimmed1 || trimmed2);
    setExpandedColors(prev => ({ ...prev, [selectedColor]: true }));
    setImei1Input('');
    setImei2Input('');
    imei1Ref.current?.focus();
  };

  const handleRemove = async (imeiId: string) => {
    if (!imeiId) return;
    await removeImei(imeiId);
    toast.success('IMEI removed');
    imei1Ref.current?.focus();
  };

  const toggleColorExpand = (color: string) => {
    setExpandedColors(prev => ({
      ...prev,
      [color]: !prev[color]
    }));
  };

  if (!product) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-800">Product not found</h2>
          <p className="mt-2 text-sm text-gray-500">Please return to the products list and select a valid item.</p>
          <Button className="mt-5 bg-orange-500 hover:bg-orange-600" onClick={() => navigate('/products')}>Back to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">IMEI Inventory</h1>
          <p className="text-sm text-gray-500">Detailed inventory view with color grouping and IMEI tracking</p>
        </div>
        <div>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate(`/products/edit/${productId}`)}>
            Edit Product
          </Button>
        </div>
      </div>

      {/* Product Summary Card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Product Info */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{category?.name || '—'}</p>
              </div>
            </div>

            {/* Product Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {brand && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Brand</p>
                  <p className="font-semibold text-gray-900">{brand.name}</p>
                </div>
              )}
              {product.model && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Model</p>
                  <p className="font-semibold text-gray-900">{product.model}</p>
                </div>
              )}
              {product.storage && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Storage</p>
                  <p className="font-semibold text-gray-900">{product.storage}</p>
                </div>
              )}
              {product.ram && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">RAM</p>
                  <p className="font-semibold text-gray-900">{product.ram}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Statistics */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                <p className="text-xs text-gray-600 font-medium">Total Quantity</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{productImeis.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-green-200 bg-green-50">
                <p className="text-xs text-gray-600 font-medium">Available Stock</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{availableImeis.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <p className="text-xs text-gray-600 font-medium">Sold Stock</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{soldImeis.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50">
                <p className="text-xs text-gray-600 font-medium">Stock Value</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{formatCurrency(availableImeis.length * product.salePrice)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scanner Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Add IMEI</p>
            <form onSubmit={handleAddImei} className="space-y-3">
              {availableColors.length > 0 && (
                <div>
                  <Label htmlFor="color-select" className="text-xs font-semibold">Device Color *</Label>
                  <select
                    id="color-select"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full mt-2 h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {availableColors.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="imei1-input" className="text-xs font-semibold">IMEI 1</Label>
                  <Input
                    id="imei1-input"
                    ref={imei1Ref}
                    value={imei1Input}
                    onChange={(e) => setImei1Input(e.target.value)}
                    placeholder="Scan or type IMEI 1"
                    className="mt-2 font-mono text-xs"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        imei2Ref.current?.focus();
                      }
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="imei2-input" className="text-xs font-semibold">IMEI 2</Label>
                  <Input
                    id="imei2-input"
                    ref={imei2Ref}
                    value={imei2Input}
                    onChange={(e) => setImei2Input(e.target.value)}
                    placeholder="Scan or type IMEI 2"
                    className="mt-2 font-mono text-xs"
                    autoComplete="off"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        await handleAddImei();
                      }
                    }}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Add IMEI
              </Button>
            </form>
            {error && <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>}
          </div>

          {/* Color Breakdown */}
          {sortedColors.length > 0 && (
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Colors</p>
              <div className="space-y-2">
                {sortedColors.map(color => {
                  const colorImeis = groupedByColor[color] || [];
                  const colorAvailable = colorImeis.filter(i => i.status === 'available').length;
                  const colorSold = colorImeis.filter(i => i.status === 'sold').length;
                  
                  return (
                    <div key={color} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">{color}</p>
                        <p className="text-xs text-gray-500">{colorAvailable} available, {colorSold} sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{colorImeis.length}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Inventory View by Color */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Detailed IMEI Inventory</p>
        
        {sortedColors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No IMEIs added yet</p>
            <p className="text-sm text-gray-500">Add IMEIs using the scanner above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedColors.map((color) => {
              const colorImeis = groupedByColor[color] || [];
              const colorAvailable = colorImeis.filter(i => i.status === 'available');
              const colorSold = colorImeis.filter(i => i.status === 'sold');
              const isExpanded = expandedColors[color] ?? true;

              return (
                <Collapsible key={color} open={isExpanded} onOpenChange={() => toggleColorExpand(color)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', isExpanded && 'transform rotate-180')} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Palette className="w-4 h-4 text-gray-400" />
                              <h3 className="text-lg font-semibold text-gray-900">{color}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {colorAvailable.length} available • {colorSold.length} sold • {colorImeis.length} total
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 ml-4">
                          <div className="text-right px-3 py-1 rounded-full bg-green-50 border border-green-200">
                            <p className="text-xs font-semibold text-green-700">{colorAvailable.length}</p>
                          </div>
                          <div className="text-right px-3 py-1 rounded-full bg-red-50 border border-red-200">
                            <p className="text-xs font-semibold text-red-700">{colorSold.length}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent asChild>
                    <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl overflow-hidden">
                      {/* Available IMEIs */}
                      {colorAvailable.length > 0 && (
                        <div className="p-4 space-y-3 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-semibold text-gray-900">Available ({colorAvailable.length})</p>
                          </div>
                          <div className="grid gap-2">
                            {colorAvailable.map((imei) => (
                              <div key={imei.id} className="bg-white rounded-lg p-3 border border-green-100 flex items-center justify-between hover:shadow-sm transition-shadow">
                                <div className="flex-1">
                                  <p className="font-mono font-semibold text-gray-900 text-sm">{imei.imei}</p>
                                  <p className="text-xs text-gray-500 mt-1">Added: {formatDate(imei.createdAt, 'MMM DD, YYYY hh:mm a')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Available</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemove(imei.id)}
                                    className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sold IMEIs */}
                      {colorSold.length > 0 && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-semibold text-gray-900">Sold ({colorSold.length})</p>
                          </div>
                          <div className="grid gap-2">
                            {colorSold.map((imei) => (
                              <div key={imei.id} className="bg-white rounded-lg p-3 border border-red-100 flex items-center justify-between opacity-75">
                                <div className="flex-1">
                                  <p className="font-mono font-semibold text-gray-600 text-sm line-through">{imei.imei}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Sold: {imei.soldAt ? formatDate(imei.soldAt, 'MMM DD, YYYY hh:mm a') : 'N/A'}
                                  </p>
                                </div>
                                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Sold</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

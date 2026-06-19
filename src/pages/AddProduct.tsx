import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { productSchema, type ProductFormData } from '@/lib/validators';
import { formatCurrency, calculateProfit } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRAND_MODELS: Record<string, string[]> = {
  'Apple': [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max',
    'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13',
    'iPad Pro', 'iPad Air'
  ],
  'Samsung': [
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra',
    'Galaxy S23', 'Galaxy A54', 'Galaxy A34', 'Galaxy Z Fold 5', 'Galaxy Z Flip 5'
  ],
  'Xiaomi': [
    'Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 13T Pro', 'Redmi Note 13 Pro',
    'Redmi Note 13', 'Poco F6', 'Poco X6 Pro'
  ],
  'Huawei': [
    'P60 Pro', 'Mate 60 Pro', 'Nova 11'
  ],
  'OPPO': [
    'Find X7 Ultra', 'Reno 11 Pro', 'Reno 11', 'OPPO A78'
  ],
  'Vivo': [
    'X100 Pro', 'V30 Pro', 'V30', 'Vivo Y200'
  ],
  'Realme': [
    'GT 5', '12 Pro+', 'Realme 12', 'Realme C67'
  ],
  'Infinix': [
    'Zero 30', 'Note 30 Pro', 'Hot 40 Pro'
  ]
};

const CUSTOM_BRAND_MODEL_CATEGORIES = ['Mobiles', 'Tablets'];

function usesCustomBrandModel(categoryName?: string) {
  return CUSTOM_BRAND_MODEL_CATEGORIES.includes(categoryName ?? '');
}

export default function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, categories, brands, units, loadData, addProduct, updateProduct, addBrand, addUnit } = useProductStore();
  const toast = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    imei: '',
    brandId: '',
    categoryId: '',
    description: '',
    costPrice: 0,
    salePrice: 0,
    wholesalePrice: 0,
    stockQuantity: 0,
    minStockLevel: 5,
    status: 'active',
    condition: 'new',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom brand and model states for Mobiles and Tablets categories
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const initializedProductId = useRef<string | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!id) {
      initializedProductId.current = null;
      return;
    }
    if (initializedProductId.current === id) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      imei: product.imei || '',
      brandId: product.brandId,
      categoryId: product.categoryId,
      description: product.description || '',
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      wholesalePrice: product.wholesalePrice || 0,
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      status: product.status,
      condition: product.condition,
    });

    const categoryName = categories.find(c => c.id === product.categoryId)?.name;
    if (usesCustomBrandModel(categoryName)) {
      const brandName = brands.find(b => b.id === product.brandId)?.name || '';
      setCustomBrand(brandName);
      let modelPart = '';
      if (brandName && product.name.toLowerCase().startsWith(brandName.toLowerCase())) {
        modelPart = product.name.substring(brandName.length).trim();
      }
      setCustomModel(modelPart || product.name);
    } else {
      setCustomBrand('');
      setCustomModel('');
    }

    initializedProductId.current = id;
  }, [id, products, brands, categories]);

  // Autofill product name when brand or model changes for Mobiles/Tablets
  useEffect(() => {
    const categoryName = categories.find(c => c.id === form.categoryId)?.name;
    if (usesCustomBrandModel(categoryName)) {
      setForm(f => ({ ...f, name: `${customBrand} ${customModel}`.trim() }));
    }
  }, [customBrand, customModel, form.categoryId, categories]);

  const handleChange = (key: keyof ProductFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let brandIdToUse = form.brandId;
    const categoryName = categories.find(c => c.id === form.categoryId)?.name;

    if (usesCustomBrandModel(categoryName)) {
      if (!customBrand.trim()) {
        setErrors(errs => ({ ...errs, brandId: 'Brand name is required' }));
        return;
      }
      
      const existing = brands.find(b => b.name.toLowerCase() === customBrand.trim().toLowerCase());
      if (existing) {
        brandIdToUse = existing.id;
      } else {
        const newB = await addBrand({ name: customBrand.trim(), status: 'active' });
        if (newB) {
          brandIdToUse = newB.id;
        } else {
          setErrors(errs => ({ ...errs, brandId: 'Failed to create brand' }));
          return;
        }
      }
    }

    const submissionForm = {
      ...form,
      brandId: brandIdToUse,
    };

    const result = productSchema.safeParse(submissionForm);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[issue.path[0] as string] = issue.message;
      });
      setErrors(errs);
      return;
    }

    const data = result.data;
    if (isEdit && id) {
      updateProduct(id, {
        ...data,
        sku: data.sku || `SKU-${Date.now()}`,
        barcode: data.barcode || `BC-${Date.now()}`,
      });
      toast.success('Product updated');
    } else {
      let unitIdToUse = units[0]?.id;
      if (!unitIdToUse) {
        const defaultUnit = await addUnit({ name: 'Piece', code: 'pcs', status: 'active' });
        if (!defaultUnit) {
          toast.error('Product creation failed: no available unit');
          return;
        }
        unitIdToUse = defaultUnit.id;
      }

      const newProduct = await addProduct({
        ...data,
        sku: data.sku || `SKU-${Date.now()}`,
        barcode: data.barcode || `BC-${Date.now()}`,
        unitId: unitIdToUse,
        showInPos: true
      });
      if (!newProduct) {
        toast.error('Product creation failed');
        return;
      }
      toast.success('Product created');
    }
    navigate('/products');
  };

  const profit = calculateProfit(form.costPrice, form.salePrice);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="p-2 rounded-md hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/products')}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>
            {isEdit ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            <h2 className="font-semibold">Basic Information</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g., iPhone 14 Pro Max" className={cn(errors.name && 'border-red-500')} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="hidden"><Label>SKU</Label><Input value={form.sku} onChange={e => handleChange('sku', e.target.value)} placeholder="Auto-generated" /></div>
              <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => handleChange('barcode', e.target.value)} placeholder="Barcode" /></div>
            </div>
            <div>
              <Label>IMEI (for mobiles)</Label>
              <Input value={form.imei} onChange={e => handleChange('imei', e.target.value)} placeholder="Enter IMEI number" />
            </div>
            {usesCustomBrandModel(categories.find(c => c.id === form.categoryId)?.name) ? (
              <div className="space-y-4">
                <div>
                  <Label>Category *</Label>
                  <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className={cn('w-full h-9 px-3 border rounded-md text-sm', errors.categoryId && 'border-red-500')}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand *</Label>
                    <Input
                      value={customBrand}
                      onChange={e => {
                        setCustomBrand(e.target.value);
                        if (errors.brandId) setErrors(errs => ({ ...errs, brandId: '' }));
                      }}
                      placeholder="e.g., Apple, Samsung, Vivo"
                      className={cn('h-9 bg-white', errors.brandId && 'border-red-500')}
                    />
                    {errors.brandId && <p className="text-xs text-red-500 mt-1">{errors.brandId}</p>}
                  </div>
                  <div>
                    <Label>Model *</Label>
                    <Input
                      value={customModel}
                      onChange={e => setCustomModel(e.target.value)}
                      placeholder="e.g., iPhone 15 Pro, V30"
                      className="h-9 bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className={cn('w-full h-9 px-3 border rounded-md text-sm', errors.categoryId && 'border-red-500')}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
                </div>
                <div>
                  <Label>Brand *</Label>
                  <select value={form.brandId} onChange={e => handleChange('brandId', e.target.value)} className={cn('w-full h-9 px-3 border rounded-md text-sm', errors.brandId && 'border-red-500')}>
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.brandId && <p className="text-xs text-red-500 mt-1">{errors.brandId}</p>}
                </div>
              </div>
            )}
            <div>
              <Label>Condition</Label>
              <div className="flex gap-3 mt-1">
                {(['new', 'used', 'refurbished'] as const).map(c => (
                  <label key={c} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="condition" checked={form.condition === c} onChange={() => handleChange('condition', c)} className="accent-orange-500" />
                    <span className="capitalize">{c}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Product description..." rows={4} />
            </div>
          </div>
        </div>

        {/* Pricing + Inventory */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h2 className="font-semibold">Pricing</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cost Price (PKR)</Label>
                  <Input type="number" value={form.costPrice || ''} onChange={e => handleChange('costPrice', parseFloat(e.target.value) || 0)} className={errors.costPrice ? 'border-red-500' : ''} />
                </div>
                <div>
                  <Label>Sale Price (PKR) *</Label>
                  <Input type="number" value={form.salePrice || ''} onChange={e => handleChange('salePrice', parseFloat(e.target.value) || 0)} className={errors.salePrice ? 'border-red-500' : ''} />
                  {errors.salePrice && <p className="text-xs text-red-500 mt-1">{errors.salePrice}</p>}
                </div>
              </div>
              <div>
                <Label>Wholesale Price (PKR)</Label>
                <Input type="number" value={form.wholesalePrice || ''} onChange={e => handleChange('wholesalePrice', parseFloat(e.target.value) || 0)} />
              </div>
              {form.salePrice > 0 && form.costPrice > 0 && (
                <div className="bg-green-50 rounded-md p-3">
                  <p className="text-sm text-green-700">
                    Profit: <span className="font-semibold">{formatCurrency(profit.amount)}</span>
                    <span className="ml-2">({profit.margin}% margin)</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h2 className="font-semibold">Inventory</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stock Quantity *</Label>
                  <Input type="number" value={form.stockQuantity || ''} onChange={e => handleChange('stockQuantity', parseInt(e.target.value) || 0)} className={errors.stockQuantity ? 'border-red-500' : ''} />
                  {errors.stockQuantity && <p className="text-xs text-red-500 mt-1">{errors.stockQuantity}</p>}
                </div>
                <div>
                  <Label>Min Stock Level</Label>
                  <Input type="number" value={form.minStockLevel || ''} onChange={e => handleChange('minStockLevel', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.status === 'active'} onCheckedChange={v => handleChange('status', v ? 'active' : 'inactive')} />
                  <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

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
import { ChevronLeft, Smartphone, Plus, X, Layers, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    brandId: '',
    categoryId: '',
    color: '',
    storage: '',
    ram: '',
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

  // Mobile specifications states
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  
  // Predefined variants state
  const [variantsList, setVariantsList] = useState<{ ram: string; storage: string }[]>([]);
  const [selectedRam, setSelectedRam] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');

  // Colors multi-select states
  const [colorsList, setColorsList] = useState<string[]>([]);
  const [newColorInput, setNewColorInput] = useState('');

  // PTA status state
  const [ptaStatus, setPtaStatus] = useState<'approved' | 'non-approved'>('approved');

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

    // Parse description for colors, variants and PTA status
    let descriptionText = product.description || '';
    let parsedColors: string[] = [];
    let parsedVariants: { ram: string; storage: string }[] = [];
    let parsedPtaStatus: 'approved' | 'non-approved' = 'approved';
    if (descriptionText.startsWith('{')) {
      try {
        const parsed = JSON.parse(descriptionText);
        parsedColors = parsed.colors || [];
        parsedVariants = parsed.variants || [];
        parsedPtaStatus = parsed.ptaStatus || 'approved';
        descriptionText = parsed.text || '';
      } catch (e) {
        // fallback
      }
    }

    setPtaStatus(parsedPtaStatus);

    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      brandId: product.brandId,
      categoryId: product.categoryId,
      color: '', 
      storage: product.storage || '',
      ram: product.ram || '',
      description: descriptionText,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      wholesalePrice: product.wholesalePrice || 0,
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      status: product.status,
      condition: product.condition,
    });

    const brandName = brands.find(b => b.id === product.brandId)?.name || '';
    setCustomBrand(brandName);
    
    let modelPart = product.name;
    if (brandName && product.name.startsWith(brandName)) {
      modelPart = product.name.substring(brandName.length).trim();
    }
    
    // Remove old suffix specs if they exist in name
    if (modelPart.includes('–')) {
      const parts = modelPart.split('–').map(p => p.trim());
      modelPart = parts[0] || '';
    }
    
    setCustomModel(modelPart);
    setColorsList(parsedColors);
    setVariantsList(parsedVariants);

    initializedProductId.current = id;
  }, [id, products, brands, categories]);

  // Autofill base product name dynamically when brand or model changes
  useEffect(() => {
    const brand = customBrand.trim();
    const model = customModel.trim();

    if (!brand && !model) {
      return;
    }

    const generatedName = `${brand} ${model}`.trim();

    setForm(f => ({
      ...f,
      name: generatedName,
    }));
  }, [customBrand, customModel]);

  const handleChange = (key: keyof ProductFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const handleAddColor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const color = newColorInput.trim();
    if (color && !colorsList.some(c => c.toLowerCase() === color.toLowerCase())) {
      setColorsList([...colorsList, color]);
      setNewColorInput('');
    }
  };

  const handleRemoveColor = (color: string) => {
    setColorsList(colorsList.filter(c => c !== color));
  };

  const handleAddVariant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ram = selectedRam.trim();
    const storage = selectedStorage.trim();
    if (ram && storage) {
      const exists = variantsList.some(v => v.ram.toLowerCase() === ram.toLowerCase() && v.storage.toLowerCase() === storage.toLowerCase());
      if (!exists) {
        setVariantsList([...variantsList, { ram, storage }]);
      } else {
        toast.warning('Duplicate variant', 'This RAM / Storage combination already exists.');
      }
    }
  };

  const handleRemoveVariant = (index: number) => {
    setVariantsList(variantsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let brandIdToUse = form.brandId;

    if (!customBrand.trim()) {
      setErrors(errs => ({ ...errs, brandId: 'Brand name is required' }));
      return;
    }

    if (colorsList.length === 0) {
      toast.error('Colors Required', 'Please define at least one available color for this product.');
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

    // Serialize colors, variants, and PTA status inside the description field
    const descriptionPayload = JSON.stringify({
      colors: colorsList,
      variants: variantsList,
      ptaStatus,
      text: form.description
    });

    const submissionForm = {
      ...form,
      brandId: brandIdToUse,
      description: descriptionPayload,
      storage: variantsList.length > 0 ? variantsList.map(v => v.storage).join(', ') : form.storage,
      ram: variantsList.length > 0 ? variantsList.map(v => v.ram).join(', ') : form.ram,
      stockQuantity: isEdit ? form.stockQuantity : 0, 
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
      await updateProduct(id, {
        ...data,
        sku: data.sku || `SKU-${Date.now()}`,
        barcode: data.barcode || `BC-${Date.now()}`,
      });
      toast.success('Product updated');
      navigate('/products');
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
      
      toast.success('Product created successfully');
      navigate(`/products/${newProduct.id}/imeis`);
    }
  };

  const profit = calculateProfit(form.costPrice, form.salePrice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="p-2 rounded-md hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Edit Mobile Product' : 'Add New Mobile Product'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/products')}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>
            {isEdit ? 'Update Product' : 'Save & Add IMEIs'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Specifications */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            <h2 className="font-semibold">Device Specifications</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category *</Label>
                <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className={cn('w-full h-9 px-3 border rounded-md text-sm bg-white', errors.categoryId && 'border-red-500')}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
              </div>
              <div>
                <Label>Brand *</Label>
                <Input
                  value={customBrand}
                  onChange={e => {
                    setCustomBrand(e.target.value);
                    if (errors.brandId) setErrors(errs => ({ ...errs, brandId: '' }));
                  }}
                  list="brand-options"
                  placeholder="e.g., Apple, Samsung"
                  className={cn('h-9 bg-white', errors.brandId && 'border-red-500')}
                />
                <datalist id="brand-options">
                  {brands.map(b => <option key={b.id} value={b.name} />)}
                </datalist>
                {errors.brandId && <p className="text-xs text-red-500 mt-1">{errors.brandId}</p>}
              </div>
            </div>

            <div>
              <Label>Model Name *</Label>
              <Input
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="e.g., iPhone 15 Pro, Note 13"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-gray-750">PTA Status *</Label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                  <input
                    type="radio"
                    name="ptaStatus"
                    value="approved"
                    checked={ptaStatus === 'approved'}
                    onChange={() => setPtaStatus('approved')}
                    className="w-4 h-4 text-orange-500 border-gray-350 focus:ring-orange-500 accent-orange-500"
                  />
                  PTA Approved
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                  <input
                    type="radio"
                    name="ptaStatus"
                    value="non-approved"
                    checked={ptaStatus === 'non-approved'}
                    onChange={() => setPtaStatus('non-approved')}
                    className="w-4 h-4 text-orange-500 border-gray-350 focus:ring-orange-500 accent-orange-500"
                  />
                  Non PTA
                </label>
              </div>
            </div>

            {/* Predefined Color Options */}
            <div className="space-y-2 border-t pt-4">
              <div>
                <Label>Predefined Colors *</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    value={newColorInput}
                    onChange={e => setNewColorInput(e.target.value)}
                    placeholder="e.g., Black, Blue, White"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddColor();
                      }
                    }}
                    className="h-9 bg-white flex-1"
                  />
                  <Button type="button" size="sm" onClick={() => handleAddColor()} className="h-9 bg-orange-500 hover:bg-orange-600">
                    Add
                  </Button>
                </div>
              </div>
              <div className="rounded-md border border-gray-150 p-2.5 bg-gray-50/50">
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Defined Colors</Label>
                <div className="flex flex-wrap gap-1.5">
                  {colorsList.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {c}
                      <button type="button" onClick={() => handleRemoveColor(c)} className="hover:text-red-500 ml-0.5 focus:outline-none">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {colorsList.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No color options defined yet. Add at least one color above.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Predefined RAM & Storage Variants */}
            <div className="space-y-2 border-t pt-4">
              <Label className="font-semibold text-sm">Predefined Variants (RAM & Storage Combinations)</Label>
              <p className="text-xs text-gray-500">Optional. Leave blank for a non-variant product.</p>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <Label className="text-[10px] text-gray-500 uppercase">RAM</Label>
                  <select value={selectedRam} onChange={e => setSelectedRam(e.target.value)} className="w-full h-9 px-3 border rounded-md text-sm bg-white mt-1">
                    <option value="">— None (Button Mobile) —</option>
                    {['2GB', '4GB', '6GB', '8GB', '12GB', '16GB', '24GB'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-gray-500 uppercase">Storage</Label>
                  <select value={selectedStorage} onChange={e => setSelectedStorage(e.target.value)} className="w-full h-9 px-3 border rounded-md text-sm bg-white mt-1">
                    <option value="">— None (Button Mobile) —</option>
                    {['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" onClick={() => handleAddVariant()} className="h-9 bg-orange-500 hover:bg-orange-600">
                    Add Variant
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-gray-150 p-2.5 bg-gray-50/50">
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Defined Variants</Label>
                <div className="flex flex-wrap gap-1.5">
                  {variantsList.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {v.ram} / {v.storage}
                      <button type="button" onClick={() => handleRemoveVariant(i)} className="hover:text-red-500 ml-0.5 focus:outline-none">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {variantsList.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No variants defined yet. Leave this blank for a non-variant product.</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Generated Product Name Preview</Label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 font-medium text-gray-800 min-h-[38px] flex items-center">
                {form.name || <span className="text-gray-400 text-sm">Enter brand and model to preview...</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condition</Label>
                <div className="flex gap-3 mt-2">
                  {(['new', 'used', 'refurbished'] as const).map(c => (
                    <label key={c} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <input type="radio" name="condition" checked={form.condition === c} onChange={() => handleChange('condition', c)} className="accent-orange-500" />
                      <span className="capitalize text-gray-700">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h2 className="font-semibold">Pricing & Inventory</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Cost Price *</Label>
                  <Input type="number" value={form.costPrice || ''} onChange={e => handleChange('costPrice', parseFloat(e.target.value) || 0)} className={cn('h-9 bg-white', errors.costPrice && 'border-red-500')} />
                  {errors.costPrice && <p className="text-xs text-red-500 mt-1">{errors.costPrice}</p>}
                </div>
                <div>
                  <Label>Sale Price *</Label>
                  <Input type="number" value={form.salePrice || ''} onChange={e => handleChange('salePrice', parseFloat(e.target.value) || 0)} className={cn('h-9 bg-white', errors.salePrice && 'border-red-500')} />
                  {errors.salePrice && <p className="text-xs text-red-500 mt-1">{errors.salePrice}</p>}
                </div>
                <div>
                  <Label>Wholesale Price</Label>
                  <Input type="number" value={form.wholesalePrice || ''} onChange={e => handleChange('wholesalePrice', parseFloat(e.target.value) || 0)} className="h-9 bg-white" />
                </div>
              </div>

              {/* Profit margin indicators */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Profit Margin</p>
                  <p className={cn('text-lg font-bold mt-0.5', profit.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(profit.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Margin Percentage</p>
                  <p className={cn('text-lg font-bold mt-0.5', profit.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {profit.margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div>
                <Label>Min Stock Level</Label>
                <Input type="number" value={form.minStockLevel || ''} onChange={e => handleChange('minStockLevel', parseInt(e.target.value) || 0)} className="h-9 bg-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h2 className="font-semibold">Additional Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label>Product Description</Label>
                <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Enter details..." rows={4} className="bg-white" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useImeiStore } from '@/stores/imeiStore';
import { useProductStore } from '@/stores/productStore';
import { useSaleStore } from '@/stores/saleStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import PurchaseInvoiceReceipt from '@/components/shared/PurchaseInvoiceReceipt';
import { usePrint } from '@/hooks/usePrint';
import { useSettingsStore } from '@/stores/settingsStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, Smartphone, History, Calendar, DollarSign, 
  ClipboardList, RotateCw, AlertTriangle, ArrowRight, CheckCircle2,
  Tag, Package, FileText, ChevronRight, User, Eye, Edit2, Trash2, Printer
} from 'lucide-react';

export default function BuyBack() {
  const toast = useToast();
  const navigate = useNavigate();
  const { findByImei, markImeiAvailable, loadData: loadImeiData } = useImeiStore();
  const { products, updateProduct, loadData: loadProductData } = useProductStore();
  const { sales, loadData: loadSaleData } = useSaleStore();
  const { purchases, suppliers, addSupplier, addPurchase, updatePurchase, deletePurchase, loadData: loadSupplierData } = useSupplierStore();
  const { shopSettings, receiptSettings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [matchedImei, setMatchedImei] = useState<any>(null);
  
  // Buy back form state
  const [buyBackPrice, setBuyBackPrice] = useState<number>(0);
  const [newSalePrice, setNewSalePrice] = useState<number>(0);
  const [newWholesalePrice, setNewWholesalePrice] = useState<number>(0);
  const [condition, setCondition] = useState<'used' | 'refurbished' | 'open_box'>('used');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Print receipt state
  const { printReceipt } = usePrint();
  const [printPurchase, setPrintPurchase] = useState<any>(null);

  // View/Edit dialog states
  const [viewingPurchase, setViewingPurchase] = useState<any>(null);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [editingBuyBackPrice, setEditingBuyBackPrice] = useState<number>(0);
  const [editingNewSalePrice, setEditingNewSalePrice] = useState<number>(0);
  const [editingNewWholesalePrice, setEditingNewWholesalePrice] = useState<number>(0);
  const [editingCondition, setEditingCondition] = useState<'used' | 'refurbished' | 'open_box'>('used');
  const [editingNotes, setEditingNotes] = useState('');

  // Past Buy Back transactions filter
  const buyBackPurchases = useMemo(() => {
    return purchases.filter(p => p.supplierName === 'Walk-in Buy Back' || p.reference === 'Buy Back');
  }, [purchases]);

  const handlePrint = (purchase: any) => {
    setPrintPurchase(purchase);
    setTimeout(() => {
      printReceipt('buyback-receipt-print');
    }, 100);
  };

  const startEditing = (purchase: any) => {
    setEditingPurchase(purchase);
    const item = purchase.items?.[0];
    setEditingBuyBackPrice(purchase.grandTotal);
    setEditingNotes(purchase.notes?.replace('Repurchased device from customer. Details: ', '').replace(/Repurchased device from customer\. Previous invoice: .*\. Details: /, '') || '');

    if (item) {
      const productObj = products.find(p => p.id === item.productId);
      if (productObj) {
        let sale = productObj.salePrice;
        let wholesale = productObj.wholesalePrice || 0;
        if (productObj.description && productObj.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(productObj.description);
            const matchedVariant = (parsed.variants || []).find((v: any) => 
              v.ram?.trim().toLowerCase() === (item.ram || '').trim().toLowerCase() && 
              v.storage?.trim().toLowerCase() === (item.storage || '').trim().toLowerCase()
            );
            if (matchedVariant) {
              sale = matchedVariant.salePrice ?? sale;
              wholesale = matchedVariant.wholesalePrice ?? wholesale;
            }
          } catch (e) {}
        }
        setEditingNewSalePrice(sale);
        setEditingNewWholesalePrice(wholesale);
        setEditingCondition(productObj.condition === 'refurbished' ? 'refurbished' : productObj.condition === 'open_box' ? 'open_box' : 'used');
      }
    }
  };

  const handleUpdateBuyBack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const item = editingPurchase.items?.[0];
    if (!item) return;

    const productObj = products.find(p => p.id === item.productId);
    if (!productObj) return;

    try {
      // 1. Update purchase in store
      const noteDetails = `Repurchased device from customer. Details: ${editingNotes}`;
      await updatePurchase(editingPurchase.id, {
        subtotal: editingBuyBackPrice,
        grandTotal: editingBuyBackPrice,
        paidAmount: editingBuyBackPrice,
        notes: noteDetails,
        items: [
          {
            ...item,
            unitCost: editingBuyBackPrice,
            total: editingBuyBackPrice
          }
        ]
      });

      // 2. Update variant specs in product description JSON if variants exist
      let updatedDescription = productObj.description;
      let firstCost = editingBuyBackPrice;
      let firstSale = editingNewSalePrice;
      let firstWholesale = editingNewWholesalePrice;

      if (productObj.description && productObj.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(productObj.description);
          const variants = parsed.variants || [];
          // Match variant by item's ram/storage
          const matchedIdx = variants.findIndex((v: any) => 
            v.ram?.trim().toLowerCase() === (item.ram || '').trim().toLowerCase() && 
            v.storage?.trim().toLowerCase() === (item.storage || '').trim().toLowerCase()
          );
          if (matchedIdx !== -1) {
            variants[matchedIdx] = {
              ...variants[matchedIdx],
              costPrice: editingBuyBackPrice,
              salePrice: editingNewSalePrice,
              wholesalePrice: editingNewWholesalePrice
            };
            parsed.variants = variants;
            updatedDescription = JSON.stringify(parsed);
          }
          if (variants.length > 0) {
            firstCost = variants[0].costPrice ?? firstCost;
            firstSale = variants[0].salePrice ?? firstSale;
            firstWholesale = variants[0].wholesalePrice ?? firstWholesale;
          }
        } catch (err) {}
      }

      // 3. Save updated prices on Product
      await updateProduct(productObj.id, {
        costPrice: firstCost,
        salePrice: firstSale,
        wholesalePrice: firstWholesale,
        condition: editingCondition,
        description: updatedDescription
      });

      toast.success('Buy Back Updated', 'Transaction details and product pricing updated.');
      setEditingPurchase(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Update failed', err?.message || 'Could not update buyback details.');
    }
  };

  const handleDeleteBuyBack = async (purchase: any) => {
    if (!window.confirm("Are you sure you want to delete this buyback record? This will remove the transaction and set the device status back to 'sold' (removing it from available inventory).")) {
      return;
    }

    try {
      const item = purchase.items?.[0];
      if (item && item.imei) {
        // 1. Delete purchase record using useSupplierStore
        await deletePurchase(purchase.id);

        // 2. Set IMEI status back to 'sold' in Supabase
        const { error: imeiErr } = await supabase
          .from('product_imeis')
          .update({ 
            status: 'sold',
            sold_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('imei', item.imei);

        if (imeiErr) throw imeiErr;

        // 3. Update useImeiStore local state
        useImeiStore.setState(state => ({
          imeis: state.imeis.map(i => i.imei === item.imei ? {
            ...i,
            status: 'sold',
            soldAt: new Date().toISOString()
          } : i)
        }));

        // 4. Update the product stock quantity
        const productObj = products.find(p => p.id === item.productId);
        if (productObj) {
          const nextImeis = useImeiStore.getState().imeis;
          const available = nextImeis.filter(i => i.productId === productObj.id && i.status === 'available').length;
          await updateProduct(productObj.id, { stockQuantity: available });
        }

        toast.success('Buy Back Deleted', 'Buy back transaction removed, device marked as sold.');
      } else {
        toast.error('Item not found', 'Cannot identify IMEI for this transaction.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Deletion failed', err?.message || 'Could not delete buyback.');
    }
  };

  // Find product linked to IMEI
  const product = useMemo(() => {
    if (!matchedImei) return null;
    return products.find(p => p.id === matchedImei.productId) || null;
  }, [matchedImei, products]);

  // Parse predefined variants list from description field
  const availableVariants = useMemo(() => {
    if (!product || !product.description) return [];
    if (product.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        return (parsed.variants || []) as { ram: string; storage: string }[];
      } catch (e) {
        // fallback
      }
    }
    return [];
  }, [product]);

  const handleVariantChange = (idxStr: string) => {
    setSelectedVariantIdx(idxStr);
    if (!product) return;
    
    if (idxStr === '') {
      setBuyBackPrice(product.costPrice);
      setNewSalePrice(product.salePrice);
      setNewWholesalePrice(product.wholesalePrice || 0);
      return;
    }

    const idx = parseInt(idxStr);
    if (product.description && product.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        const variants = parsed.variants || [];
        const variantObj = variants[idx];
        if (variantObj) {
          setBuyBackPrice(variantObj.costPrice ?? product.costPrice);
          setNewSalePrice(variantObj.salePrice ?? product.salePrice);
          setNewWholesalePrice(variantObj.wholesalePrice ?? (product.wholesalePrice || 0));
        }
      } catch (e) {}
    }
  };

  // Load all required store data on mount
  useEffect(() => {
    loadProductData();
    loadSaleData();
    loadSupplierData();
    loadImeiData();
  }, []);

  // Search IMEI handler
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      toast.error('Search query required', 'Please enter an IMEI number');
      return;
    }

    const imeiRecord = findByImei(query);
    if (!imeiRecord) {
      setMatchedImei(null);
      setSearched(true);
      return;
    }

    setMatchedImei(imeiRecord);
    setSearched(true);

    // Auto-fill prices based on product/variant
    const prod = products.find(p => p.id === imeiRecord.productId);
    if (prod) {
      // Check if variant price exists
      let cost = prod.costPrice;
      let sale = prod.salePrice;
      let wholesale = prod.wholesalePrice || 0;
      let variantIndex = '';

      if (prod.description && prod.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(prod.description);
          const variants = parsed.variants || [];
          const matchedIdx = variants.findIndex((v: any) => 
            v.ram?.trim().toLowerCase() === (imeiRecord.ram || '').trim().toLowerCase() && 
            v.storage?.trim().toLowerCase() === (imeiRecord.storage || '').trim().toLowerCase()
          );
          if (matchedIdx !== -1) {
            variantIndex = matchedIdx.toString();
            const matchedVariant = variants[matchedIdx];
            cost = matchedVariant.costPrice ?? cost;
            sale = matchedVariant.salePrice ?? sale;
            wholesale = matchedVariant.wholesalePrice ?? wholesale;
          }
        } catch (err) {}
      }

      setBuyBackPrice(cost);
      setNewSalePrice(sale);
      setNewWholesalePrice(wholesale);
      setCondition(prod.condition === 'refurbished' ? 'refurbished' : prod.condition === 'open_box' ? 'open_box' : 'used');
      setSelectedVariantIdx(variantIndex);
    }
  };

  // Auto-trigger search if query matches any registered IMEI (length >= 14)
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 14) return;

    const record = findByImei(query);
    if (record) {
      handleSearch();
    }
  }, [searchQuery]);



  // Find previous sale transaction
  const previousSale = useMemo(() => {
    if (!matchedImei) return null;
    const normalized = matchedImei.imei.trim().toLowerCase();
    for (const sale of sales) {
      const item = sale.items?.find(i => 
        (i.imei && i.imei.toLowerCase() === normalized) ||
        (i.imei1 && i.imei1.toLowerCase() === normalized) ||
        (i.imei2 && i.imei2.toLowerCase() === normalized)
      );
      if (item) {
        return { sale, item };
      }
    }
    return null;
  }, [matchedImei, sales]);

  // Generate sales matching this IMEI for timeline
  const salesMatchingImei = useMemo(() => {
    if (!matchedImei) return [];
    const normalized = matchedImei.imei.trim().toLowerCase();
    return sales.filter(s => 
      s.items?.some(i => 
        (i.imei && i.imei.toLowerCase() === normalized) ||
        (i.imei1 && i.imei1.toLowerCase() === normalized) ||
        (i.imei2 && i.imei2.toLowerCase() === normalized)
      )
    ).map(s => {
      const item = s.items.find(i => 
        (i.imei && i.imei.toLowerCase() === normalized) ||
        (i.imei1 && i.imei1.toLowerCase() === normalized) ||
        (i.imei2 && i.imei2.toLowerCase() === normalized)
      )!;
      return {
        type: 'sale',
        date: s.createdAt,
        title: 'Sold Device',
        description: `Sold to ${s.customerName || 'Walk-in Customer'} (Invoice #${s.invoiceNumber})`,
        price: item.unitPrice,
        badge: 'Sale',
        badgeColor: 'bg-red-50 text-red-700 border-red-100'
      };
    });
  }, [matchedImei, sales]);

  // Generate purchases matching this IMEI for timeline
  const purchasesMatchingImei = useMemo(() => {
    if (!matchedImei) return [];
    const normalized = matchedImei.imei.trim().toLowerCase();
    return purchases.filter(p => 
      p.items?.some(i => 
        (i.imei && i.imei.toLowerCase() === normalized) ||
        (i.imei1 && i.imei1.toLowerCase() === normalized) ||
        (i.imei2 && i.imei2.toLowerCase() === normalized)
      )
    ).map(p => {
      const item = p.items.find(i => 
        (i.imei && i.imei.toLowerCase() === normalized) ||
        (i.imei1 && i.imei1.toLowerCase() === normalized) ||
        (i.imei2 && i.imei2.toLowerCase() === normalized)
      )!;
      const isBuyBack = p.supplierName === 'Walk-in Buy Back' || p.reference === 'Buy Back';
      return {
        type: 'purchase',
        date: p.createdAt,
        title: isBuyBack ? 'Buy Back' : 'Device Purchased',
        description: isBuyBack ? `Bought back from customer (PO #${p.poNumber})` : `Purchased from supplier ${p.supplierName} (PO #${p.poNumber})`,
        price: item.unitCost,
        badge: isBuyBack ? 'Buy Back' : 'Supplier Purchase',
        badgeColor: isBuyBack ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-green-50 text-green-700 border-green-100'
      };
    });
  }, [matchedImei, purchases]);

  // Combined sorted lifecycle timeline
  const timeline = useMemo(() => {
    return [...salesMatchingImei, ...purchasesMatchingImei].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [salesMatchingImei, purchasesMatchingImei]);

  // Profit Margin calculation for the buy back form
  const estimatedProfit = useMemo(() => {
    const amount = newSalePrice - buyBackPrice;
    const margin = newSalePrice > 0 ? (amount / newSalePrice) * 100 : 0;
    return { amount, margin };
  }, [buyBackPrice, newSalePrice]);

  // Submit buy back transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedImei || !product) return;

    if (buyBackPrice < 0 || newSalePrice < 0 || newWholesalePrice < 0) {
      toast.error('Invalid price parameters', 'Prices must be non-negative.');
      return;
    }

    let ramToUse = matchedImei.ram;
    let storageToUse = matchedImei.storage;

    if (availableVariants.length > 0) {
      if (!selectedVariantIdx) {
        toast.error('Variant required', 'Please select a RAM / Storage variant for this device');
        return;
      }
      const variantObj = availableVariants[parseInt(selectedVariantIdx)];
      ramToUse = variantObj.ram;
      storageToUse = variantObj.storage;
    }

    setSubmitting(true);
    try {
      // 1. Find or create default supplier
      let buyBackSupplier: any = suppliers.find(s => s.name === 'Walk-in Buy Back');
      if (!buyBackSupplier) {
        buyBackSupplier = await addSupplier({
          name: 'Walk-in Buy Back',
          phone: '0000000000',
          status: 'active'
        });
      }

      if (!buyBackSupplier) {
        throw new Error('Could not initialize Buy Back Supplier');
      }

      // 2. Mark IMEI as available
      const imeiRestored = await markImeiAvailable(matchedImei.imei);
      if (!imeiRestored) {
        throw new Error('Failed to restore IMEI status to available');
      }

      // Update IMEI's ram/storage/condition in database if selected/changed
      const { error: imeiUpdateErr } = await supabase
        .from('product_imeis')
        .update({ 
          ram: ramToUse || null, 
          storage: storageToUse || null,
          condition: condition || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedImei.id);
        
      if (imeiUpdateErr) {
        console.error('Failed to update IMEI RAM/Storage/Condition:', imeiUpdateErr);
      } else {
        // Update in-memory state of imeiStore
        useImeiStore.setState(state => ({
          imeis: state.imeis.map(i => i.id === matchedImei.id ? { 
            ...i, 
            ram: ramToUse, 
            storage: storageToUse,
            condition: condition
          } : i)
        }));
      }

      // 3. Update variant specs prices in description JSON
      let updatedDescription = product.description;
      if (product.description && product.description.startsWith('{') && selectedVariantIdx !== '') {
        try {
          const parsed = JSON.parse(product.description);
          const variants = parsed.variants || [];
          const idx = parseInt(selectedVariantIdx);
          if (variants[idx]) {
            variants[idx] = {
              ...variants[idx],
              costPrice: buyBackPrice,
              salePrice: newSalePrice,
              wholesalePrice: newWholesalePrice
            };
            parsed.variants = variants;
            updatedDescription = JSON.stringify(parsed);
          }
        } catch (err) {}
      }

      // Calculate first variant fallback prices
      let firstCost = buyBackPrice;
      let firstSale = newSalePrice;
      let firstWholesale = newWholesalePrice;

      if (updatedDescription && updatedDescription.startsWith('{')) {
        try {
          const parsed = JSON.parse(updatedDescription);
          const variants = parsed.variants || [];
          if (variants.length > 0) {
            firstCost = variants[0].costPrice ?? firstCost;
            firstSale = variants[0].salePrice ?? firstSale;
            firstWholesale = variants[0].wholesalePrice ?? firstWholesale;
          }
        } catch (err) {}
      }

      // 4. Save updated prices on the Product
      await updateProduct(product.id, {
        costPrice: firstCost,
        salePrice: firstSale,
        wholesalePrice: firstWholesale,
        description: updatedDescription
      });

      // 5. Create new Purchase record
      const noteDetails = `Repurchased device from customer. Previous invoice: ${previousSale ? previousSale.sale.invoiceNumber : 'N/A'}. Details: ${notes}`;
      await addPurchase({
        supplierId: buyBackSupplier.id,
        supplierName: buyBackSupplier.name,
        subtotal: buyBackPrice,
        tax: 0,
        discount: 0,
        shipping: 0,
        grandTotal: buyBackPrice,
        paidAmount: buyBackPrice,
        status: 'received',
        notes: noteDetails,
        reference: 'Buy Back',
        items: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitCost: buyBackPrice,
            total: buyBackPrice,
            imei: matchedImei.imei,
            color: matchedImei.color,
            storage: storageToUse,
            ram: ramToUse,
            brandName: product.brandId, // store brand id/name
            model: product.model
          }
        ]
      });

      toast.success('Buy back completed successfully!', 'Device is now available in inventory.');
      
      // Reset page state
      setSearchQuery('');
      setSearched(false);
      setMatchedImei(null);
      setNotes('');
    } catch (err: any) {
      console.error(err);
      toast.error('Buy Back Transaction Failed', err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Buy Back Module" 
        subtitle="Repurchase previously sold devices back into inventory and track their full lifecycles"
      />

      {/* Search Container */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="max-w-xl flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search or scan device IMEI number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white"
              autoFocus
            />
          </div>
          <Button type="submit" className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium px-5 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search IMEI
          </Button>
        </form>
      </div>

      {searched && !matchedImei && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-800 text-sm">IMEI Record Not Found</h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">
            This IMEI is not registered in the system. If this is a new phone not previously sold by the shop, please record it through the standard Purchases module.
          </p>
        </div>
      )}

      {matchedImei && (
        <>
          {matchedImei.status === 'available' && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Device Already In Stock</p>
                <p className="text-xs text-yellow-700">This device (IMEI: {matchedImei.imei}) is already marked available in inventory.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Product Info & Sale History */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Product Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3 text-sm uppercase tracking-wider">
                  <Smartphone className="h-4 w-4 text-orange-600" /> Product details
                </h3>
                {product ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Product Name</span>
                      <p className="font-semibold text-gray-800">{product.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Variant (RAM / Storage)</span>
                      <p className="font-semibold text-gray-800">
                        {matchedImei.ram || '—'} / {matchedImei.storage || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Color</span>
                      <p className="font-semibold text-gray-800 capitalize">{matchedImei.color || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Current Condition</span>
                      <p className="font-semibold text-gray-800 capitalize">{product.condition}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">IMEI 1</span>
                      <p className="font-mono text-gray-800 font-semibold">{matchedImei.imei1 || matchedImei.imei}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">IMEI 2</span>
                      <p className="font-mono text-gray-800 font-semibold">{matchedImei.imei2 || '—'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load product info.</p>
                )}
              </div>

              {/* Previous Sale Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3 text-sm uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-orange-600" /> Previous Sale Record
                </h3>
                {previousSale ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Invoice Number</span>
                      <p className="font-semibold text-orange-600 font-mono">#{previousSale.sale.invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Sale Date</span>
                      <p className="font-semibold text-gray-800">
                        {formatDate(previousSale.sale.createdAt, 'MMM dd, yyyy hh:mm a')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Sale Price</span>
                      <p className="font-semibold text-gray-800">
                        {formatCurrency(previousSale.item.unitPrice)}
                      </p>
                    </div>
                    <div className="sm:col-span-3 bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-[10px] text-gray-400 block leading-none">Customer Info</span>
                        <span className="text-xs font-semibold text-gray-700">
                          {previousSale.sale.customerName || 'Walk-in Customer'}
                          {previousSale.sale.customerPhone ? ` (${previousSale.sale.customerPhone})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center border border-dashed text-xs text-gray-500">
                    No matching sales history found for this IMEI.
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Buy Back Input Form */}
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 sticky top-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3 text-sm uppercase tracking-wider">
                  <RotateCw className="h-4 w-4 text-orange-600 animate-spin-slow" /> Repurchase Details
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {availableVariants.length > 0 && (
                    <div>
                      <Label htmlFor="variant-select" className="text-xs font-semibold text-gray-700">Select RAM / Storage Variant *</Label>
                      <select
                        id="variant-select"
                        value={selectedVariantIdx}
                        onChange={(e) => handleVariantChange(e.target.value)}
                        className="w-full mt-1 h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        required
                        disabled={matchedImei?.status === 'available'}
                      >
                        <option value="">Select Variant</option>
                        {availableVariants.map((v, idx) => (
                          <option key={idx} value={idx}>{v.ram} / {v.storage}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="buyback-price" className="text-xs font-semibold">Buy Back Price (Purchase Cost) *</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="buyback-price"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={buyBackPrice || ''}
                        onChange={(e) => setBuyBackPrice(parseFloat(e.target.value) || 0)}
                        className="pl-8 h-9"
                        required
                        disabled={matchedImei?.status === 'available'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-sale" className="text-xs font-semibold">New Sale Price *</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="new-sale"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newSalePrice || ''}
                        onChange={(e) => setNewSalePrice(parseFloat(e.target.value) || 0)}
                        className="pl-8 h-9"
                        required
                        disabled={matchedImei?.status === 'available'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-wholesale" className="text-xs font-semibold">New Wholesale Price</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="new-wholesale"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newWholesalePrice || ''}
                        onChange={(e) => setNewWholesalePrice(parseFloat(e.target.value) || 0)}
                        className="pl-8 h-9"
                        disabled={matchedImei?.status === 'available'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="condition-select" className="text-xs font-semibold">Updated Condition *</Label>
                    <select
                      id="condition-select"
                      value={condition}
                      onChange={(e: any) => setCondition(e.target.value)}
                      className="w-full mt-1 h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      required
                      disabled={matchedImei?.status === 'available'}
                    >
                      <option value="used">Used</option>
                      <option value="open_box">Open Box</option>
                      <option value="refurbished">Refurbished</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="buyback-notes" className="text-xs font-semibold">Notes</Label>
                    <textarea 
                      id="buyback-notes"
                      rows={3}
                      placeholder="Add any hardware remarks or customer notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      disabled={matchedImei?.status === 'available'}
                    />
                  </div>

                  {/* Margins display */}
                  {newSalePrice > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border text-xs">
                      <div>
                        <span className="text-gray-500 font-medium">Profit Margin</span>
                        <p className={cn('text-sm font-bold mt-0.5', estimatedProfit.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(estimatedProfit.amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Margin Pct.</span>
                        <p className={cn('text-sm font-bold mt-0.5', estimatedProfit.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {estimatedProfit.margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                    disabled={submitting || matchedImei?.status === 'available'}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? 'Processing...' : 'Complete Buy Back'}
                  </Button>
                </form>

              </div>
            </div>

          </div>

          {/* Bottom Timeline: IMEI History Lifecycle */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3 text-sm uppercase tracking-wider">
              <History className="h-4 w-4 text-orange-600" /> Device Lifecycle Timeline
            </h3>

            <div className="relative pl-6 border-l-2 border-orange-100 space-y-6 max-w-2xl ml-4 pt-2">
              {timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-orange-500 shadow-sm flex items-center justify-center" />
                  
                  <div className="bg-gray-50 rounded-lg p-3 border hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(event.date, 'MMM dd, yyyy hh:mm a')}
                      </span>
                      <span className={cn('px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border tracking-wider', event.badgeColor)}>
                        {event.badge}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-gray-800 mt-2 text-sm">{event.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-2">
                      Transaction Price: {formatCurrency(event.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Past Buy Back Transactions List */}
      {!matchedImei && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Buy Back History</h3>
              <p className="text-xs text-gray-500 mt-0.5">List of all previously repurchased devices</p>
            </div>
            <div className="text-xs text-gray-500 font-semibold bg-white px-2.5 py-1 rounded-md border shadow-sm">
              Total Transactions: {buyBackPurchases.length}
            </div>
          </div>

          {buyBackPurchases.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ClipboardList className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-sm font-medium">No Buy Back transactions recorded yet.</p>
              <p className="text-xs text-gray-450">Use the search box above to lookup a sold device and purchase it back.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">PO Number</th>
                    <th className="px-5 py-3">Product Description</th>
                    <th className="px-5 py-3">IMEI</th>
                    <th className="px-5 py-3 text-right">Repurchase Price</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyBackPurchases.map((purchase) => {
                    const item = purchase.items?.[0];
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-gray-600 font-medium">
                          {formatDate(purchase.createdAt, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-gray-700 uppercase">
                          {purchase.poNumber}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-800">{item?.productName || 'Unknown Product'}</div>
                          {item && (item.ram || item.storage) && (
                            <div className="text-gray-500 text-[11px] mt-0.5 font-medium">
                              Variant: {item.ram || '—'} / {item.storage || '—'}
                              {item.color && ` • Color: ${item.color}`}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-600 font-medium">
                          {item?.imei || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-orange-600">
                          {formatCurrency(purchase.grandTotal)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-gray-500 hover:text-blue-600"
                              onClick={() => setViewingPurchase(purchase)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-gray-500 hover:text-yellow-600"
                              onClick={() => startEditing(purchase)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-gray-500 hover:text-red-600"
                              onClick={() => handleDeleteBuyBack(purchase)}
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-gray-500 hover:text-green-600"
                              onClick={() => handlePrint(purchase)}
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Dialog Modal */}
      <Dialog open={!!viewingPurchase} onOpenChange={(open) => !open && setViewingPurchase(null)}>
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" /> Buy Back Transaction Details
            </DialogTitle>
          </DialogHeader>
          {viewingPurchase && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
                <div>
                  <span className="text-gray-400 block font-medium">Date</span>
                  <span className="font-semibold text-gray-700">
                    {formatDate(viewingPurchase.createdAt, 'MMM dd, yyyy hh:mm a')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">PO Number</span>
                  <span className="font-bold text-gray-700 uppercase">{viewingPurchase.poNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Supplier</span>
                  <span className="font-semibold text-gray-700">{viewingPurchase.supplierName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Reference Code</span>
                  <span className="font-semibold text-gray-700">{viewingPurchase.reference || '—'}</span>
                </div>
              </div>

              <div className="space-y-2 border-b pb-3">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Repurchased Device</h4>
                <div className="bg-gray-50 rounded-lg p-3 border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Product:</span>
                    <span className="font-bold text-gray-800">{viewingPurchase.items?.[0]?.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">IMEI:</span>
                    <span className="font-mono text-gray-700 font-semibold">{viewingPurchase.items?.[0]?.imei}</span>
                  </div>
                  {(viewingPurchase.items?.[0]?.ram || viewingPurchase.items?.[0]?.storage) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Variant:</span>
                      <span className="font-semibold text-gray-700">
                        {viewingPurchase.items?.[0]?.ram || '—'} / {viewingPurchase.items?.[0]?.storage || '—'}
                      </span>
                    </div>
                  )}
                  {viewingPurchase.items?.[0]?.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Color:</span>
                      <span className="font-semibold text-gray-700">{viewingPurchase.items?.[0]?.color}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold bg-purple-50 text-purple-800 rounded-lg p-3 border border-purple-100">
                <span>Repurchase Amount:</span>
                <span>{formatCurrency(viewingPurchase.grandTotal)}</span>
              </div>

              {viewingPurchase.notes && (
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-medium">Transaction Notes</span>
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-gray-700 font-medium italic">
                    {(() => {
                      const noteText = viewingPurchase.notes;
                      const match = noteText.match(/(Previous invoice:\s*)(INV-\d+)/i);
                      if (match) {
                        const invoiceNum = match[2];
                        const parts = noteText.split(match[0]);
                        return (
                          <>
                            {parts[0]}
                            {match[1]}
                            <span 
                              className="text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer transition-colors"
                              onClick={() => {
                                setViewingPurchase(null);
                                navigate(`/sales?invoice=${invoiceNum}`);
                              }}
                            >
                              {invoiceNum}
                            </span>
                            {parts[1]}
                          </>
                        );
                      }
                      return noteText;
                    })()}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setViewingPurchase(null)}
                  className="h-9 text-xs"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => handlePrint(viewingPurchase)}
                  className="h-9 bg-green-600 hover:bg-green-700 text-white text-xs flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog Modal */}
      <Dialog open={!!editingPurchase} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-yellow-600" /> Edit Buy Back Details
            </DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <form onSubmit={handleUpdateBuyBack} className="space-y-4 pt-2">
              <div className="bg-gray-50 rounded-lg p-3 border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Product:</span>
                  <span className="font-bold text-gray-800">{editingPurchase.items?.[0]?.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">IMEI:</span>
                  <span className="font-mono text-gray-700 font-semibold">{editingPurchase.items?.[0]?.imei}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-buyback-price" className="text-xs font-semibold">Buy Back Price *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    id="edit-buyback-price"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editingBuyBackPrice || ''}
                    onChange={(e) => setEditingBuyBackPrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-new-sale" className="text-xs font-semibold">New Sale Price *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    id="edit-new-sale"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editingNewSalePrice || ''}
                    onChange={(e) => setEditingNewSalePrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-new-wholesale" className="text-xs font-semibold">New Wholesale Price</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    id="edit-new-wholesale"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editingNewWholesalePrice || ''}
                    onChange={(e) => setEditingNewWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-condition-select" className="text-xs font-semibold">Condition *</Label>
                <select
                  id="edit-condition-select"
                  value={editingCondition}
                  onChange={(e: any) => setEditingCondition(e.target.value)}
                  className="w-full mt-1 h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-orange-500"
                  required
                >
                  <option value="used">Used</option>
                  <option value="open_box">Open Box</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-buyback-notes" className="text-xs font-semibold">Notes</Label>
                <textarea 
                  id="edit-buyback-notes"
                  rows={3}
                  placeholder="Notes..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2 bg-white focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setEditingPurchase(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="h-9 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden printable receipt */}
      <div className="hidden">
        {printPurchase && (
          <PurchaseInvoiceReceipt 
            id="buyback-receipt-print" 
            purchase={printPurchase} 
            shopSettings={shopSettings}
            receiptSettings={receiptSettings}
          />
        )}
      </div>
    </div>
  );
}

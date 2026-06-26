import { useState, useEffect, useRef, useMemo } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useCartStore } from '@/stores/cartStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useSaleStore } from '@/stores/saleStore';
import { useSettingsStore, type PaymentMethods } from '@/stores/settingsStore';
import { useImeiStore } from '@/stores/imeiStore';
type PaymentMethodKey = keyof PaymentMethods;
import InvoiceReceipt from '@/components/shared/InvoiceReceipt';
import { useToast } from '@/hooks/useToast';
import { usePrint } from '@/hooks/usePrint';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Search, Barcode, Minus, Plus, Trash2, X, ShoppingCart,
  Banknote, CreditCard, Landmark, Wallet, User, Printer, CheckCircle2, Package, Smartphone, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, CartItem, Sale } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import InvoiceEditorModal from '@/components/shared/InvoiceEditorModal';

export default function Pos() {
  const { products, categories, loadData: loadProducts } = useProductStore();
  const { customers, loadData: loadCustomers } = useCustomerStore();
  const { loadData: loadImeis, findByImei, getAvailableByProduct } = useImeiStore();
  const currentUserId = useAuthStore(s => s.user?.id);
  const addSale = useSaleStore(s => s.addSale);
  const { paymentMethods, loadSettings, shopSettings, receiptSettings, taxSettings } = useSettingsStore();
  const toast = useToast();
  const { printReceipt } = usePrint();

  const cartItems = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const clearCart = useCartStore(s => s.clearCart);
  const setDiscount = useCartStore(s => s.setDiscount);
  const setCustomer = useCartStore(s => s.setCustomer);
  const subtotal = useCartStore(s => s.subtotal);
  const discountPercentValue = useCartStore(s => s.discountPercent());
  const discountAmountValue = useCartStore(s => s.discountAmount());
  const discountType = useCartStore(s => s.discountType);
  const grandTotal = useCartStore(s => s.grandTotal);
  const itemCount = useCartStore(s => s.itemCount);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [saleComplete, setSaleComplete] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('Walk-in Customer');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('');
  const [selectedCustomerAddress, setSelectedCustomerAddress] = useState('');
  const [discountPercentInput, setDiscountPercentInput] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('');
  const [imeiSelectProduct, setImeiSelectProduct] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadSettings();
    loadImeis();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'F4' && cartItems.length > 0) {
        e.preventDefault();
        setCheckoutOpen(true);
      }
      if (e.key === 'Escape' && cartItems.length > 0) {
        if (confirm('Clear the cart?')) clearCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems.length, clearCart]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.status === 'active' && p.showInPos);
    if (activeCategory !== 'all') {
      result = result.filter(p => p.categoryId === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchingImeis = useImeiStore.getState().imeis.filter(i => 
        (i.imei1 && i.imei1.toLowerCase().includes(q)) || 
        (i.imei2 && i.imei2.toLowerCase().includes(q)) || 
        (i.imei && i.imei.toLowerCase().includes(q))
      );
      const matchingProductIds = new Set(matchingImeis.map(i => i.productId));

      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.imei && p.imei.includes(q)) ||
        matchingProductIds.has(p.id)
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  const handleAddToCart = (product: Product, imei?: string) => {
    if (imei) {
      const added = addItem(product, imei);
      if (added) {
        toast.success('Added to cart', `${product.name} (IMEI: ${imei})`);
      } else {
        toast.error('This device is already in the cart.');
      }
      return;
    }

    const available = getAvailableByProduct(product.id);
    if (available.length === 0) {
      toast.error('Out of stock', `${product.name} has no available IMEIs`);
      return;
    }
    setImeiSelectProduct(product);
  };

  const findProductByCode = (code: string): { product: Product; imei?: string; error?: string } | undefined => {
    const normalized = code.trim();
    if (!normalized) return undefined;

    const imeiRecord = findByImei(normalized);
    if (imeiRecord) {
      if (imeiRecord.status === 'available') {
        const product = products.find(p => p.id === imeiRecord.productId);
        if (product) return { product, imei: imeiRecord.imei };
      } else {
        return {
          product: products.find(p => p.id === imeiRecord.productId)!,
          imei: imeiRecord.imei,
          error: `IMEI ${normalized} is marked as sold`
        };
      }
    }

    const product = products.find(p =>
      p.barcode === normalized ||
      p.sku.toLowerCase() === normalized.toLowerCase()
    );
    if (product) return { product };
    return undefined;
  };

  const handleScanInput = () => {
    if (!searchQuery.trim()) return;
    const result = findProductByCode(searchQuery);
    if (result) {
      if (result.error) {
        toast.error('IMEI Unavailable', result.error);
      } else {
        handleAddToCart(result.product, result.imei);
      }
    }
    setSearchQuery('');
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const result = findProductByCode(searchQuery);
    if (result && (result.imei || result.error)) {
      if (result.error) {
        toast.error('IMEI Unavailable', result.error);
      } else {
        handleAddToCart(result.product, result.imei);
      }
      setSearchQuery('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (checkoutOpen) loadSettings();
  }, [checkoutOpen, loadSettings]);

  const enabledPaymentMethods = useMemo(() => {
    const methods: Array<{ value: PaymentMethodKey; label: string; icon: typeof Banknote }> = [
      { value: 'cash', label: 'Cash', icon: Banknote },
      { value: 'card', label: 'Card', icon: CreditCard },
      { value: 'bank_transfer', label: 'Bank', icon: Landmark },
      { value: 'jazzcash', label: 'JazzCash', icon: Smartphone },
      { value: 'easypaisa', label: 'EasyPaisa', icon: Wallet },
      { value: 'credit', label: 'Credit', icon: ShoppingBag },
    ];

    return methods.filter(pm => paymentMethods[pm.value]);
  }, [paymentMethods]);

  useEffect(() => {
    if (!enabledPaymentMethods.some(pm => pm.value === paymentMethod)) {
      setPaymentMethod((enabledPaymentMethods[0]?.value ?? 'cash') as PaymentMethodKey);
    }
  }, [enabledPaymentMethods, paymentMethod]);

  const handleCheckout = async () => {
    if (checkoutLoading) return;

    if (!currentUserId) {
      toast.error('Sale not completed', 'User session is not ready. Please wait a moment and try again.');
      return;
    }
    const uid = currentUserId as string;

    const total = grandTotal();
    const paid = parseFloat(paidAmount) || total;
    const change = paid > total ? paid - total : 0;
      const saleStatus = paid >= total ? 'paid' : paid === 0 ? 'pending' : 'partial';

      try {
        setCheckoutLoading(true);

        const { sale, errorMessage } = await addSale({
          customerId: selectedCustomerId,
          customerName: selectedCustomerName,
          createdBy: uid,
          items: cartItems.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
            imei: i.imei,
            imei1: i.imei1,
            imei2: i.imei2,
            color: i.color,
            ram: i.ram,
            storage: i.storage,
            ptaStatus: i.ptaStatus,
          })),
          subtotal: subtotal(),
          discount: discountAmountValue,
          tax: 0,
          grandTotal: total,
          paidAmount: paid,
          changeDue: change,
          paymentMethod,
          status: saleStatus,
        });

      if (!sale) {
        toast.error('Sale not completed', errorMessage || 'Unable to save the sale. Please try again.');
        return;
      }

      setCompletedSale(sale);
      setSaleComplete(true);
      toast.success('Sale completed', sale.invoiceNumber);
    } catch (err) {
      console.error('Checkout failed:', err);
      toast.error('Sale not completed', 'An unexpected error occurred while completing the sale.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleNewSale = () => {
    clearCart();
    setCheckoutOpen(false);
    setSaleComplete(false);
    setCompletedSale(null);
    setPaidAmount('');
    setCheckoutNotes('');
    setDiscountPercentInput('');
    setDiscountAmountInput('');
    setEditorOpen(false);
  };

  const changeDue = (parseFloat(paidAmount) || 0) - grandTotal();

  useEffect(() => {
    setDiscountPercentInput(discountPercentValue > 0 ? String(discountPercentValue) : '');
    setDiscountAmountInput(discountAmountValue > 0 ? String(discountAmountValue) : '');
  }, [discountType, discountPercentValue, discountAmountValue]);

  const activeCategories = categories.filter(c => c.status === 'active' && c.showInPos);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      (c.address || '').toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 5);
  }, [customers, customerSearch]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category Tabs + Search */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              All
            </button>
            {activeCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-full sm:max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Barcode className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, barcode, IMEI..."
                className="pl-9 pr-9 h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-gray-400 text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stockQuantity <= 0}
                  className={cn(
                    'bg-white rounded-lg border border-gray-200 p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200',
                    product.stockQuantity <= 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="w-full h-20 bg-gray-100 rounded-md flex items-center justify-center mb-2">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-sm font-semibold text-orange-500 mt-0.5">{formatCurrency(product.salePrice)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      product.stockQuantity > product.minStockLevel ? 'bg-green-500' :
                      product.stockQuantity > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                    <span className="text-[10px] text-gray-500">{product.stockQuantity} left</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white border-t border-gray-200 lg:border-t-0 lg:border-l">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800">Current Order</h3>
            <p className="text-xs text-gray-500">{itemCount()} items</p>
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={customerSearch}
              onChange={(e) => {
                const value = e.target.value;
                setCustomerSearch(value);
                setSelectedCustomerName(value || 'Walk-in Customer');
                if (!value) {
                  setSelectedCustomerId(undefined);
                  setSelectedCustomerPhone('');
                  setSelectedCustomerAddress('');
                }
              }}
              onFocus={() => { if (!selectedCustomerId) setCustomerSearch(''); }}
              placeholder={selectedCustomerName}
              className="pl-9 h-8 text-sm"
            />
            {filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setSelectedCustomerName(c.name);
                      setSelectedCustomerPhone(c.phone || '');
                      setSelectedCustomerAddress(c.address || '');
                      setCustomerSearch('');
                      setCustomer(c.id, c.name);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-500 ml-2">{c.phone}</span>
                    {c.address && <span className="text-gray-400 ml-2">{c.address}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-800 text-right">{selectedCustomerName}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-800 text-right">{selectedCustomerPhone || '—'}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-gray-800 text-right">{selectedCustomerAddress || '—'}</span>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingCart className="w-16 h-16 text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm">Scan a barcode or select a product</p>
              <p className="text-orange-500 text-xs mt-2">Press F2 to scan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map(item => (
                <div key={item.productId + '-' + item.imei} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.brandName && <span className="font-medium text-gray-700">{item.brandName}</span>}
                        {item.model && <span className="ml-1">{item.model}</span>}
                        {item.storage && <span className="ml-2">· {item.storage}</span>}
                      </div>
                      {item.imei && (
                        <div className="text-[10px] text-orange-600 font-mono mt-0.5 space-y-0.5">
                          <p>IMEI 1: {item.imei1 || item.imei} {item.color ? `(${item.color})` : ''}</p>
                          {item.imei2 && <p>IMEI 2: {item.imei2}</p>}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.unitPrice)} each</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.imei)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {item.imei ? (
                      <span className="text-[11px] text-gray-500 bg-gray-50 border px-2 py-0.5 rounded-full font-medium">Single Device (Qty: 1)</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.imei)}
                          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.imei)}
                          className="w-7 h-7 flex items-center justify-center rounded border border-orange-200 text-orange-500 hover:bg-orange-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* Discount */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Discount %</span>
              <Input
                value={discountPercentInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setDiscountPercentInput(value);

                  const amount = parseFloat(value);
                  if (!isNaN(amount)) {
                    setDiscount(amount, 'percent');
                  } else {
                    setDiscount(0, 'percent');
                  }
                }}
                placeholder="%"
                className="w-full h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Discount ₹</span>
              <Input
                value={discountAmountInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setDiscountAmountInput(value);

                  const amount = parseFloat(value);
                  if (!isNaN(amount)) {
                    setDiscount(amount, 'amount');
                  } else {
                    setDiscount(0, 'amount');
                  }
                }}
                placeholder="0"
                className="w-full h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal())}</span>
            </div>
            {discountAmountValue > 0 && (
              <div className="flex justify-between text-orange-500">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmountValue)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-800">Grand Total</span>
              <span className="text-lg font-bold text-orange-500">{formatCurrency(grandTotal())}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              setCheckoutOpen(true);
              setPaidAmount(String(grandTotal()));
            }}
            disabled={cartItems.length === 0}
            className="w-full mt-3 h-12 bg-orange-500 hover:bg-orange-600 text-base font-semibold"
          >
            Checkout — {formatCurrency(grandTotal())}
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        if (!open && !editorOpen) {
          setCheckoutOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          {!saleComplete ? (
            <>
              <DialogHeader>
                <DialogTitle>Checkout</DialogTitle>
              </DialogHeader>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {enabledPaymentMethods.length > 0 && enabledPaymentMethods.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors',
                        paymentMethod === value
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Amount Tendered</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="text-lg h-12"
                />
                <div className="flex gap-2 mt-2">
                  {['Exact', '+50', '+100', '+500', '+1000'].map(quick => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => {
                        if (quick === 'Exact') setPaidAmount(String(grandTotal()));
                        else setPaidAmount(String((parseFloat(paidAmount) || 0) + parseInt(quick.replace('+', ''))));
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change */}
              {changeDue >= 0 && (
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-green-700">Change Due</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(changeDue)}</p>
                </div>
              )}
              {changeDue < 0 && (
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-yellow-700">Amount Due</p>
                  <p className="text-xl font-bold text-yellow-600">{formatCurrency(Math.abs(changeDue))}</p>
                </div>
              )}

              {/* Notes */}
              <Input
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Order notes (optional)"
              />

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-base font-semibold"
              >
                {checkoutLoading ? 'Processing...' : 'Complete Sale'}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Sale Completed!</h3>
              <p className="text-sm text-gray-500 mt-1">Invoice: {completedSale?.invoiceNumber}</p>
              {completedSale && (
                <div className="hidden">
                  <InvoiceReceipt
                    id="receipt"
                    sale={completedSale}
                    shopSettings={shopSettings}
                    receiptSettings={receiptSettings}
                  />
                </div>
              )}
              <div className="flex gap-2 justify-center mt-6 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => printReceipt('receipt', receiptSettings.receiptWidth)}
                  disabled={!completedSale}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Close checkout dialog first
                    setCheckoutOpen(false);
                    // Small delay to allow dialog to close
                    setTimeout(() => {
                      setEditorOpen(true);
                    }, 150);
                  }}
                  disabled={!completedSale}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Edit & Print
                </Button>
                <Button 
                  type="button" 
                  onClick={handleNewSale} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Editor Modal - Rendered outside Dialog */}
      {completedSale && (
        <InvoiceEditorModal
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            // Reopen checkout dialog after editor closes
            setTimeout(() => {
              setCheckoutOpen(true);
            }, 100);
          }}
          sale={completedSale}
          shopSettings={shopSettings}
          receiptSettings={receiptSettings}
        />
      )}

      {/* IMEI Selection Dialog */}
      <Dialog open={!!imeiSelectProduct} onOpenChange={(open) => { if (!open) setImeiSelectProduct(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Select IMEI for {imeiSelectProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label htmlFor="dialog-imei-scan">Scan IMEI</Label>
              <Input
                id="dialog-imei-scan"
                placeholder="Scan device IMEI..."
                className="mt-1 font-mono text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val && imeiSelectProduct) {
                      const imeiRecord = findByImei(val);
                      if (imeiRecord && imeiRecord.productId === imeiSelectProduct.id && imeiRecord.status === 'available') {
                        handleAddToCart(imeiSelectProduct, imeiRecord.imei);
                        setImeiSelectProduct(null);
                      } else if (imeiRecord && imeiRecord.status === 'sold') {
                        toast.error('IMEI Sold', `IMEI ${val} is already sold.`);
                      } else {
                        toast.error('Invalid IMEI', `IMEI ${val} does not match this product or is not available.`);
                      }
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
            
            <div>
              <Label>Available IMEIs ({imeiSelectProduct ? getAvailableByProduct(imeiSelectProduct.id).length : 0})</Label>
              <div className="mt-2 border rounded-md max-h-[220px] overflow-y-auto divide-y">
                {imeiSelectProduct && getAvailableByProduct(imeiSelectProduct.id).map(record => (
                  <button
                    key={record.id}
                    onClick={() => {
                      handleAddToCart(imeiSelectProduct, record.imei);
                      setImeiSelectProduct(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 transition-colors font-mono flex items-center justify-between"
                  >
                    <span>{record.imei}</span>
                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-sans font-medium">Available</span>
                  </button>
                ))}
                {imeiSelectProduct && getAvailableByProduct(imeiSelectProduct.id).length === 0 && (
                  <p className="p-3 text-sm text-gray-500 text-center">No available IMEIs for this device</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
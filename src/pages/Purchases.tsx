import { useState, useEffect, useMemo, useRef } from 'react';
import { useSupplierStore } from '@/stores/supplierStore';
import { useProductStore } from '@/stores/productStore';
import { useImeiStore } from '@/stores/imeiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import PurchaseInvoiceReceipt from '@/components/shared/PurchaseInvoiceReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Eye, Trash2, Smartphone, CheckCircle2, Printer, Palette, Calendar, Hash, FileText, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrint } from '@/hooks/usePrint';
import BarcodeComponent from '@/components/shared/Barcode';

// Define the PurchaseItem structure inside the page
interface ScannedPurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  imei: string;
  imei1?: string;
  imei2?: string;
  color?: string;
  storage?: string;
  ram?: string;
  brandName?: string;
  model?: string;
}

export default function Purchases() {
  const { purchases, suppliers, loadData: loadSuppliers, addPurchase, updatePurchase, deletePurchase } = useSupplierStore();
  const { products, brands, loadData: loadProducts } = useProductStore();
  const { loadData: loadImeis, imeis } = useImeiStore();
  const { shopSettings } = useSettingsStore();
  const toast = useToast();
  const { printReceipt } = usePrint();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<typeof purchases[0] | null>(null);
  const [viewImeisPurchase, setViewImeisPurchase] = useState<typeof purchases[0] | null>(null);
  const [imeiSearchQuery, setImeiSearchQuery] = useState('');
  const [includeBarcodesInThermal, setIncludeBarcodesInThermal] = useState(true);

  // New purchase form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scannedItems, setScannedItems] = useState<ScannedPurchaseItem[]>([]);
  const [scanQuery, setScanQuery] = useState('');
  const [scanError, setScanError] = useState('');
  const scanRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    loadImeis();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => scanRef.current?.focus(), 0);
    }
  }, [modalOpen]);

  const filteredPurchases = useMemo(() => {
    let result = [...purchases];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.poNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q))
      );
    }
    return result;
  }, [purchases, search]);

  const stats = useMemo(() => ({
    total: purchases.length,
    totalAmount: purchases.reduce((s, p) => s + p.grandTotal, 0),
    pending: purchases.filter(p => p.status === 'pending').length,
    paid: purchases.filter(p => p.status === 'received').length,
  }), [purchases]);

  const groupedScannedItems = useMemo(() => {
    const groups: Record<string, {
      productId: string;
      productName: string;
      brandName?: string;
      model?: string;
      storage?: string;
      unitCost: number;
      colors: Record<string, { imei: string; ram?: string; storage?: string }[]>; // color -> list of IMEIs
      totalUnits: number;
    }> = {};

    scannedItems.forEach(item => {
      const key = item.productId;
      if (!groups[key]) {
        groups[key] = {
          productId: item.productId,
          productName: item.productName,
          brandName: item.brandName,
          model: item.model,
          storage: item.storage,
          unitCost: item.unitCost,
          colors: {},
          totalUnits: 0
        };
      }
      const c = item.color || 'Unspecified';
      if (!groups[key].colors[c]) {
        groups[key].colors[c] = [];
      }
      groups[key].colors[c].push({ imei: item.imei, ram: item.ram, storage: item.storage });
      groups[key].totalUnits += 1;
    });

    return Object.values(groups);
  }, [scannedItems]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanQuery.trim();
    setScanQuery('');
    setScanError('');

    if (!query) return;

    // Maintain input focus
    scanRef.current?.focus();

    // 1. Check if IMEI is already scanned in this invoice
    if (scannedItems.some(item => item.imei === query || item.imei1 === query || item.imei2 === query)) {
      setScanError(`IMEI "${query}" has already been scanned in this invoice.`);
      toast.error('Duplicate scan', `IMEI "${query}" is already added.`);
      return;
    }

    // 2. Search for the IMEI in the existing inventory
    const inventoryImei = imeis.find(i => i.imei === query || i.imei1 === query || i.imei2 === query);
    if (!inventoryImei) {
      setScanError('IMEI not found. Please add this product in the Add Product module first.');
      toast.error('IMEI not found', 'This IMEI does not exist in the inventory.');
      return;
    }

    // 3. Find the product linked to this IMEI
    const product = products.find(p => p.id === inventoryImei.productId);
    if (!product) {
      setScanError('Product linked to this IMEI was not found.');
      return;
    }

    // Get brand name & clean model details
    const brand = brands.find(b => b.id === product.brandId);
    let modelName = product.name;
    if (brand?.name && product.name.toLowerCase().startsWith(brand.name.toLowerCase())) {
      modelName = product.name.substring(brand.name.length).trim();
    }

    // Resolve variant cost price if available
    let unitCost = product.costPrice;
    if (product.description && product.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        const matchedVariant = (parsed.variants || []).find((v: any) => 
          v.ram?.trim().toLowerCase() === (inventoryImei.ram || '').trim().toLowerCase() && 
          v.storage?.trim().toLowerCase() === (inventoryImei.storage || '').trim().toLowerCase()
        );
        if (matchedVariant && typeof matchedVariant.costPrice === 'number') {
          unitCost = matchedVariant.costPrice;
        }
      } catch (e) {}
    }

    // Add product to the invoice list
    const finalImei1 = inventoryImei.imei1 || inventoryImei.imei || query;
    const finalImei2 = inventoryImei.imei2 || '';
    const newItem: ScannedPurchaseItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitCost: unitCost,
      total: unitCost,
      imei: finalImei1,
      imei1: finalImei1,
      imei2: finalImei2,
      color: inventoryImei.color || product.color,
      storage: inventoryImei.storage || product.storage,
      ram: inventoryImei.ram || product.ram,
      brandName: brand?.name || '—',
      model: modelName
    };

    setScannedItems(prev => [newItem, ...prev]);
    toast.success('IMEI added', query);
  };

  const removeImei = (imeiToRemove: string) => {
    setScannedItems(prev => prev.filter(item => item.imei !== imeiToRemove));
    toast.success('IMEI removed');
  };

  const updateProductGroupCost = (productId: string, newCost: number) => {
    setScannedItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, unitCost: newCost, total: newCost }
          : item
      )
    );
  };

  const subtotal = scannedItems.reduce((sum, item) => sum + item.unitCost, 0);
  const grandTotal = subtotal;

  const handleCreatePurchase = () => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }
    if (scannedItems.length === 0) {
      toast.error('Please scan at least one IMEI');
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Send items to store (each scanned IMEI is a single unit purchase_item)
    const purchaseItems = scannedItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: 1,
      unitCost: item.unitCost,
      total: item.unitCost,
      imei: item.imei,
      imei1: item.imei1 || item.imei,
      imei2: item.imei2 || '',
      color: item.color,
      storage: item.storage,
      brandName: item.brandName,
      model: item.model
    }));

    addPurchase({
      supplierId,
      supplierName: supplier.name,
      items: purchaseItems,
      subtotal,
      tax: 0,
      discount: 0,
      shipping: 0,
      grandTotal,
      paidAmount: 0,
      status: 'received', // Purchase is direct reception
      reference: invoiceNumber,
      notes: `Invoice Date: ${invoiceDate}`
    });

    toast.success('Purchase invoice recorded successfully');
    setModalOpen(false);
    setSupplierId('');
    setInvoiceNumber('');
    setScannedItems([]);
  };

  const [copiedImei, setCopiedImei] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const purchaseMobileItems = useMemo(() => {
    if (!viewImeisPurchase?.items) return [];

    return viewImeisPurchase.items.map((item, index) => {
      let imei1 = (item as any).imei1 || item.imei || '';
      let imei2 = (item as any).imei2 || '';

      // Fallback: if imei2 is empty, lookup from imeiStore by imei or imei1
      if (!imei2 && (item.imei || (item as any).imei1)) {
        const searchKey = item.imei || (item as any).imei1;
        const matched = imeis.find(
          im => im.imei === searchKey || im.imei1 === searchKey || im.imei2 === searchKey
        );
        if (matched) {
          imei1 = matched.imei1 || matched.imei;
          imei2 = matched.imei2 || '';
        }
      }

      const product = products.find(p => p.id === item.productId);
      const brand = brands.find(b => b.id === product?.brandId);

      const modelName = (item as any).model || product?.model || item.productName;
      const brandName = (item as any).brandName || brand?.name || '';
      const color = (item as any).color || '';
      const storage = (item as any).storage || product?.storage || '';
      const ram = (item as any).ram || product?.ram || '';

      return {
        id: `${item.productId}-${index}-${imei1}`,
        index: index + 1,
        modelName,
        brandName,
        fullName: [brandName, modelName].filter(Boolean).join(' '),
        color,
        storage,
        ram,
        imei1,
        imei2,
        unitCost: item.unitCost,
      };
    });
  }, [viewImeisPurchase, imeis, products, brands]);

  const filteredMobileItems = useMemo(() => {
    if (!imeiSearchQuery.trim()) return purchaseMobileItems;
    const q = imeiSearchQuery.toLowerCase();
    return purchaseMobileItems.filter(item =>
      item.fullName.toLowerCase().includes(q) ||
      item.imei1.toLowerCase().includes(q) ||
      item.imei2.toLowerCase().includes(q) ||
      (item.color && item.color.toLowerCase().includes(q))
    );
  }, [purchaseMobileItems, imeiSearchQuery]);

  const handlePrintThermal = () => {
    printReceipt('thermal-purchase-imeis-print', '80mm');
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedImei(text);
    setTimeout(() => setCopiedImei(null), 2000);
  };

  const handleCopyAllImeis = () => {
    if (!purchaseMobileItems.length) return;
    const text = purchaseMobileItems
      .map(item => {
        const specs = [item.storage, item.ram, item.color].filter(Boolean).join(', ');
        return `${item.fullName}${specs ? ` (${specs})` : ''}\nIMEI 1: ${item.imei1 || 'N/A'}\nIMEI 2: ${item.imei2 || 'N/A'}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success('All IMEIs copied to clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Invoices"
        subtitle="Record purchases and print professional bills using existing inventory IMEIs"
        actions={
          <Button className="bg-orange-500 hover:bg-orange-600 shadow-sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Purchase Invoice
          </Button>
        }
      />

      {/* KPI Stats Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchase Value</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Orders</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Received Orders</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by PO #, Invoice #, or supplier..."
            className="pl-10 h-10 border-gray-200 focus:ring-orange-500 rounded-lg"
          />
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 uppercase text-xs font-bold">
                <th className="text-left px-6 py-4">PO # / Ref</th>
                <th className="text-left px-6 py-4">Supplier</th>
                <th className="text-left px-6 py-4">Date</th>
                <th className="text-center px-6 py-4">Items Count</th>
                <th className="text-right px-6 py-4">Grand Total</th>
                <th className="text-center px-6 py-4">Status</th>
                <th className="text-center px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-blue-600">
                    <div>{p.poNumber}</div>
                    {p.reference && <div className="text-xs text-gray-400 font-normal mt-0.5">Inv: {p.reference}</div>}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{p.supplierName}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-6 py-4 text-center text-gray-600 font-medium">{p.items?.length || 0} units</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(p.grandTotal)}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setViewImeisPurchase(p);
                          setImeiSearchQuery('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600 hover:text-orange-700 transition"
                        title="View Both IMEIs & Print Thermal"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewPurchase(p)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          deletePurchase(p.id);
                          toast.success('Deleted purchase record');
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Invoice Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Create Purchase Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Purchase Details Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Supplier *</Label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Invoice / Bill Number *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="Enter supplier bill number"
                    className="pl-10 h-10 border-gray-200 focus:ring-orange-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Invoice Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="pl-10 h-10 border-gray-200 focus:ring-orange-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Continuous IMEI Scanner */}
            <div className="bg-orange-50/50 border border-orange-200/60 rounded-xl p-4 space-y-2">
              <Label className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-orange-600" /> Continuous IMEI Scanning
              </Label>
              <form onSubmit={handleScanSubmit}>
                <Input
                  ref={scanRef}
                  value={scanQuery}
                  onChange={e => setScanQuery(e.target.value)}
                  placeholder="Scan or type IMEI and press Enter..."
                  autoComplete="off"
                  className="h-10 bg-white border-orange-200 focus:ring-orange-500 focus:border-orange-500 rounded-lg text-base"
                />
              </form>
              {scanError ? (
                <p className="text-xs font-bold text-red-500 mt-1.5 bg-red-50 border border-red-200/50 p-2 rounded-lg">
                  {scanError}
                </p>
              ) : (
                <p className="text-xs text-orange-600">The input field automatically clears and remains focused for fast scanning.</p>
              )}
            </div>

            {/* Grouped Scanned Items List */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Grouped Invoice Items</Label>

              {scannedItems.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/20">
                  <Smartphone className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No IMEIs scanned yet. Scan an IMEI above to build the invoice.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedScannedItems.map(group => (
                    <div key={group.productId} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 shadow-xs">
                      {/* Product Group Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border">
                              {group.brandName}
                            </span>
                            {group.storage && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {group.storage}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mt-1">{group.model}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Total Units: <span className="font-bold text-gray-800">{group.totalUnits}</span></p>
                        </div>

                        {/* Edit Group Purchase Price */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold text-gray-500 uppercase">Unit Cost</Label>
                          <Input
                            type="number"
                            value={group.unitCost}
                            onChange={e => updateProductGroupCost(group.productId, parseFloat(e.target.value) || 0)}
                            className="w-28 h-9 text-sm font-semibold text-right"
                          />
                        </div>
                      </div>

                      {/* Color Grouping */}
                      <div className="space-y-3 pl-2">
                        {Object.entries(group.colors).map(([colorName, imeiList]) => (
                          <div key={colorName} className="space-y-1.5">
                            <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-gray-400" />
                              {colorName} <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 rounded-full">{imeiList.length}</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-4">
                              {imeiList.map(itemObj => (
                                <div key={itemObj.imei} className="flex items-center justify-between bg-gray-50 border rounded-lg px-2.5 py-1.5 gap-2">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-mono text-xs text-gray-800 select-all font-semibold truncate">{itemObj.imei}</span>
                                    {itemObj.ram && itemObj.storage && (
                                      <span className="text-[10px] text-blue-600 font-semibold">{itemObj.ram} / {itemObj.storage}</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeImei(itemObj.imei)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold flex-shrink-0"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Group Calculation Footer */}
                      <div className="flex justify-end text-xs font-bold text-gray-500 pt-1">
                        <span>Group Total: {formatCurrency(group.totalUnits * group.unitCost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations and Action buttons */}
            <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <span className="text-sm font-medium text-gray-500">Invoice Grand Total</span>
                <p className="text-3xl font-extrabold text-orange-600">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 shadow-md font-semibold" onClick={handleCreatePurchase}>
                  Record Purchase Bill
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Receipt Viewer */}
      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-lg font-bold">Purchase Bill Detail</DialogTitle>
              {/* Print button removed as per request */}
            </div>
          </DialogHeader>
          {viewPurchase && (
            <div className="mt-4">
              <div id="purchase-invoice-print">
                <PurchaseInvoiceReceipt
                  purchase={viewPurchase}
                  shopSettings={useSettingsStore.getState().shopSettings}
                  receiptSettings={useSettingsStore.getState().receiptSettings}
                  layout="a4"
                  screen={true}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Both IMEIs & Thermal Print Dialog */}
      <Dialog open={!!viewImeisPurchase} onOpenChange={() => setViewImeisPurchase(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          {/* Dialog Header */}
          <div className="p-5 border-b bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-gray-900">
                    Purchase Mobile IMEIs
                  </DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    PO #{viewImeisPurchase?.poNumber} &bull; {viewImeisPurchase?.supplierName} &bull; {purchaseMobileItems.length} {purchaseMobileItems.length === 1 ? 'Mobile' : 'Mobiles'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyAllImeis}
                className="text-xs font-semibold h-9"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-gray-600" />}
                {copiedAll ? 'Copied All' : 'Copy All'}
              </Button>

              <Button
                size="sm"
                onClick={handlePrintThermal}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Thermal Slip
              </Button>
            </div>
          </div>

          {/* Search & Options Filter Toolbar */}
          <div className="px-5 py-3 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={imeiSearchQuery}
                onChange={e => setImeiSearchQuery(e.target.value)}
                placeholder="Filter by model, IMEI 1 or IMEI 2..."
                className="pl-9 h-9 text-xs border-gray-200 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 select-none">
              <input
                type="checkbox"
                checked={includeBarcodesInThermal}
                onChange={e => setIncludeBarcodesInThermal(e.target.checked)}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4"
              />
              <span>Include Barcodes in Thermal Print</span>
            </label>
          </div>

          {/* Scrollable IMEIs List */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-gray-50/30">
            {filteredMobileItems.length === 0 ? (
              <div className="text-center py-10">
                <Smartphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No matching mobile IMEIs found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try searching for a different IMEI or model name.</p>
              </div>
            ) : (
              filteredMobileItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs hover:border-orange-200 transition"
                >
                  {/* Top row: Model and Specs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {item.index}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {item.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.color && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {item.color}
                        </span>
                      )}
                      {(item.ram || item.storage) && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {[item.ram && `${item.ram}`, item.storage].filter(Boolean).join(' / ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: IMEI 1 & IMEI 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5">
                    {/* IMEI 1 */}
                    <div className="flex items-center justify-between bg-gray-50/80 rounded-lg p-2 border border-gray-100">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">IMEI 1</div>
                        <div className="font-mono text-xs font-bold text-gray-900 select-all truncate">
                          {item.imei1 || <span className="text-gray-400 font-normal italic">Not recorded</span>}
                        </div>
                      </div>
                      {item.imei1 && (
                        <button
                          onClick={() => handleCopy(item.imei1)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition shrink-0"
                          title="Copy IMEI 1"
                        >
                          {copiedImei === item.imei1 ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* IMEI 2 */}
                    <div className="flex items-center justify-between bg-gray-50/80 rounded-lg p-2 border border-gray-100">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">IMEI 2</div>
                        <div className="font-mono text-xs font-bold text-gray-900 select-all truncate">
                          {item.imei2 || <span className="text-gray-400 font-normal italic">Single IMEI / None</span>}
                        </div>
                      </div>
                      {item.imei2 && (
                        <button
                          onClick={() => handleCopy(item.imei2)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition shrink-0"
                          title="Copy IMEI 2"
                        >
                          {copiedImei === item.imei2 ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Printable Thermal Slip for ESC/POS Thermal Printers (80mm) */}
      <div className="hidden">
        {viewImeisPurchase && (
          <div
            id="thermal-purchase-imeis-print"
            className="wide-invoice text-black font-bold text-xs p-1"
            style={{ width: '72mm', maxWidth: '72mm', margin: '0 auto', fontFamily: 'monospace' }}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-black">
              <h2 className="text-base font-black uppercase tracking-wide leading-tight">{shopSettings.shopName || 'ALI MOBILES'}</h2>
              {shopSettings.address && <p className="text-[10px] leading-tight mt-0.5">{shopSettings.address}</p>}
              {shopSettings.phone && <p className="text-[10px] leading-tight font-bold">Tel: {shopSettings.phone}</p>}
              <div className="mt-1.5 inline-block border border-black px-2 py-0.5 text-[11px] font-black uppercase">
                PURCHASE MOBILE IMEIs
              </div>
            </div>

            {/* Invoice Details */}
            <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>PO #:</span>
                <span className="font-bold">{viewImeisPurchase.poNumber}</span>
              </div>
              {viewImeisPurchase.reference && (
                <div className="flex justify-between">
                  <span>Bill Ref:</span>
                  <span className="font-bold">{viewImeisPurchase.reference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-bold truncate max-w-[140px]">{viewImeisPurchase.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(viewImeisPurchase.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Mobiles:</span>
                <span className="font-bold">{purchaseMobileItems.length} Units</span>
              </div>
            </div>

            {/* Mobiles List with IMEI 1 & IMEI 2 */}
            <div className="py-2 space-y-2 border-b-2 border-dashed border-black">
              {purchaseMobileItems.map((item, idx) => (
                <div key={item.id || idx} className="text-[10px] pb-1.5 border-b border-dotted border-gray-400 last:border-b-0 last:pb-0">
                  {/* Model Name & Specs */}
                  <div className="font-black text-[11px] leading-snug">
                    {idx + 1}. {item.fullName}
                  </div>
                  {(item.storage || item.ram || item.color) && (
                    <div className="text-[9px] text-gray-800">
                      {[item.ram && `${item.ram} RAM`, item.storage, item.color].filter(Boolean).join(' | ')}
                    </div>
                  )}

                  {/* IMEI 1 */}
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold">IMEI 1:</span>
                      <span className="font-mono font-bold tracking-wider">{item.imei1 || 'N/A'}</span>
                    </div>
                    {includeBarcodesInThermal && item.imei1 && (
                      <div className="my-0.5 flex justify-center barcode-container">
                        <BarcodeComponent value={item.imei1} height={26} widthScale={0.75} />
                      </div>
                    )}
                  </div>

                  {/* IMEI 2 */}
                  {item.imei2 ? (
                    <div className="mt-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold">IMEI 2:</span>
                        <span className="font-mono font-bold tracking-wider">{item.imei2}</span>
                      </div>
                      {includeBarcodesInThermal && item.imei2 && (
                        <div className="my-0.5 flex justify-center barcode-container">
                          <BarcodeComponent value={item.imei2} height={26} widthScale={0.75} />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] space-y-0.5">
              <p className="font-bold">*** END OF PURCHASE LIST ***</p>
              <p className="text-[8px] text-gray-600">Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

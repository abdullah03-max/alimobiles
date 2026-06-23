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
import { Plus, Search, Eye, Trash2, Smartphone, CheckCircle2, Printer, Palette, Calendar, Hash, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrint } from '@/hooks/usePrint';

// Define the PurchaseItem structure inside the page
interface ScannedPurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  imei: string;
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
  const toast = useToast();
  const { printReceipt } = usePrint();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<typeof purchases[0] | null>(null);

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
    if (scannedItems.some(item => item.imei === query)) {
      setScanError(`IMEI "${query}" has already been scanned in this invoice.`);
      toast.error('Duplicate scan', `IMEI "${query}" is already added.`);
      return;
    }

    // 2. Search for the IMEI in the existing inventory
    const inventoryImei = imeis.find(i => i.imei === query);
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

    // Add product to the invoice list
    const newItem: ScannedPurchaseItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitCost: product.costPrice,
      total: product.costPrice,
      imei: query,
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
              <button
                onClick={() => printReceipt('purchase-invoice-print', useSettingsStore.getState().receiptSettings.receiptWidth)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900"
                title="Print Invoice"
              >
                <Printer className="w-5 h-5" />
              </button>
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
    </div>
  );
}

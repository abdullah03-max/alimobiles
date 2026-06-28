import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import InvoiceReceipt from './InvoiceReceipt';
import type { Sale, ShopSettings, ReceiptSettings, SaleItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePrint } from '@/hooks/usePrint';
import { Printer, Smartphone, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabaseClient';
import { useSaleStore } from '@/stores/saleStore';
import { useImeiStore } from '@/stores/imeiStore';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  sale: Sale;
  shopSettings: ShopSettings;
  receiptSettings: ReceiptSettings;
}

function cloneSale(s: Sale): Sale {
  return JSON.parse(JSON.stringify(s));
}

export default function InvoiceEditorModal({ open, onClose, sale, shopSettings, receiptSettings }: Props) {
  const { printReceipt } = usePrint();
  const [editedSale, setEditedSale] = useState<Sale>(() => cloneSale(sale));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setEditedSale(cloneSale(sale));
    }
  }, [open, sale]);

  const updateItem = (index: number, patch: Partial<SaleItem>) => {
    setEditedSale(prev => {
      const copy = cloneSale(prev);
      copy.items[index] = { ...copy.items[index], ...patch } as SaleItem;
      // Recalculate line total
      copy.items[index].total = copy.items[index].quantity * copy.items[index].unitPrice;
      // Recompute totals
      copy.subtotal = copy.items.reduce((s, it) => s + it.total, 0);
      const disc = copy.discount || 0;
      const tax = copy.tax || 0;
      copy.grandTotal = Math.max(0, copy.subtotal - disc + tax);
      return copy;
    });
  };

  const handlePrint = () => {
    printReceipt('receipt-edited', receiptSettings.receiptWidth);
  };

  const handleSave = async () => {
    if (!window.confirm('Save changes to this invoice? This will overwrite existing invoice data.')) return;
    setSaving(true);
    try {
      // Update sales row
      await useSaleStore.getState().updateSale(editedSale.id, {
        customerName: editedSale.customerName,
        ...((editedSale as any).customerPhone ? { customerPhone: (editedSale as any).customerPhone } : {}),
        ...((editedSale as any).customerAddress ? { customerAddress: (editedSale as any).customerAddress } : {}),
        notes: editedSale.notes,
        discount: editedSale.discount,
        tax: editedSale.tax,
        subtotal: editedSale.subtotal,
        grandTotal: editedSale.grandTotal,
      });

      // Replace sale_items for this sale
      const { error: delErr } = await supabase.from('sale_items').delete().eq('sale_id', editedSale.id);
      if (delErr) throw delErr;

      const itemsToInsert = editedSale.items.map(item => {
        const payload: any = {
          sale_id: editedSale.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          color: item.color || null,
          storage: item.storage || null,
          ram: item.ram || null,
          pta_status: item.ptaStatus || null,
        };
        if (item.imei1) payload.imei1 = item.imei1;
        if (item.imei2) payload.imei2 = item.imei2;
        if (!item.imei1 && !item.imei2 && item.imei) payload.imei = item.imei;
        return payload;
      });

      let insertRes = await supabase.from('sale_items').insert(itemsToInsert);
      if (insertRes.error) {
        const msg = String(insertRes.error.message || JSON.stringify(insertRes.error)).toLowerCase();
        const missingImeiCol = msg.includes('imei1') || msg.includes('imei2');
        if (missingImeiCol) {
          const fallback = editedSale.items.map(item => {
            let imeiValue = null;
            if (item.imei1 && item.imei2) imeiValue = `${item.imei1}||${item.imei2}`;
            else if (item.imei1) imeiValue = item.imei1;
            else if (item.imei2) imeiValue = item.imei2;
            else if (item.imei) imeiValue = item.imei;
            return {
              sale_id: editedSale.id,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total: item.total,
              imei: imeiValue,
              color: item.color || null,
              storage: item.storage || null,
              ram: item.ram || null,
              pta_status: item.ptaStatus || null,
            };
          });
          const fallbackRes = await supabase.from('sale_items').insert(fallback);
          if (fallbackRes.error) throw fallbackRes.error;
        } else {
          throw insertRes.error;
        }
      }

      // Sync IMEI availability
      const origImeis = new Set<string>();
      sale.items.forEach(it => {
        if (it.imei1) origImeis.add(it.imei1);
        if (it.imei2) origImeis.add(it.imei2);
        if (it.imei) origImeis.add(it.imei);
      });
      const newImeis = new Set<string>();
      editedSale.items.forEach(it => {
        if (it.imei1) newImeis.add(it.imei1);
        if (it.imei2) newImeis.add(it.imei2);
        if (it.imei) newImeis.add(it.imei);
      });

      for (const imei of Array.from(origImeis)) {
        if (!newImeis.has(imei)) {
          await useImeiStore.getState().markImeiAvailable(imei);
        }
      }
      for (const imei of Array.from(newImeis)) {
        if (!origImeis.has(imei)) {
          await useImeiStore.getState().markImeiSold(imei);
        }
      }

      await useSaleStore.getState().loadData();
      toast.success('Invoice updated', editedSale.invoiceNumber || '');
      // Copy updated invoice to clipboard automatically for convenience
      try {
        await copyEditedReceipt();
      } catch (err) {
        // ignore
      }
      onClose();
    } catch (err) {
      console.error('Error saving edited invoice', err);
      toast.error('Failed to save edits', String((err as any)?.message || 'See console for details'));
    } finally {
      setSaving(false);
    }
  };

  // print handler removed — printing is disabled from the editor UI

  const handleClose = () => {
    if (window.confirm('Are you sure you want to close? Unsaved changes will be lost.')) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+P printing disabled in editor
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const captureEditedReceiptToBlob = async (): Promise<Blob | null> => {
    try {
      const receiptEl = document.getElementById('receipt-edited');
      if (!receiptEl) {
        toast.error('Receipt not available', 'Cannot find receipt element');
        return null;
      }
      const prevDisplay = (receiptEl as HTMLElement).style.display;
      (receiptEl as HTMLElement).style.display = 'block';

      const canvas = await html2canvas(receiptEl as HTMLElement, { scale: 2 });
      (receiptEl as HTMLElement).style.display = prevDisplay;

      // Convert into A4 canvas
      const srcCanvas = canvas;
      const srcWidth = srcCanvas.width;
      const srcHeight = srcCanvas.height;
      const dpi = 150;
      const mmToInch = (mm: number) => mm / 25.4;
      const a4Width = Math.round(mmToInch(210) * dpi);
      const a4Height = Math.round(mmToInch(297) * dpi);
      const a4Canvas = document.createElement('canvas');
      a4Canvas.width = a4Width;
      a4Canvas.height = a4Height;
      const a4Ctx = a4Canvas.getContext('2d');
      if (!a4Ctx) throw new Error('Unable to get 2D context');
      a4Ctx.fillStyle = '#ffffff';
      a4Ctx.fillRect(0, 0, a4Width, a4Height);
      const scale = Math.min(a4Width / srcWidth, a4Height / srcHeight);
      const drawWidth = Math.round(srcWidth * scale);
      const drawHeight = Math.round(srcHeight * scale);
      const dx = Math.round((a4Width - drawWidth) / 2);
      const dy = Math.round((a4Height - drawHeight) / 2);
      a4Ctx.drawImage(srcCanvas, 0, 0, srcWidth, srcHeight, dx, dy, drawWidth, drawHeight);

      const blob: Blob | null = await new Promise(resolve => a4Canvas.toBlob(resolve, 'image/png'));
      return blob;
    } catch (err) {
      console.error('captureEditedReceiptToBlob error', err);
      toast.error('Capture failed', 'See console for details');
      return null;
    }
  };

  const copyEditedReceipt = async () => {
    const blob = await captureEditedReceiptToBlob();
    if (!blob) return;
    const nav: any = navigator;
    if (nav.clipboard && typeof (window as any).ClipboardItem === 'function') {
      try {
        const item = new (window as any).ClipboardItem({ 'image/png': blob });
        await nav.clipboard.write([item]);
        toast.success('Copied to clipboard', 'Open WhatsApp and paste (Ctrl+V)');
        return;
      } catch (copyErr) {
        console.warn('Clipboard write failed', copyErr);
      }
    }
    // fallback download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedSale.invoiceNumber || 'receipt'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Receipt saved', 'Downloaded receipt image');
  };

  const shareEditedReceiptViaWhatsApp = async () => {
    // Try to upload image to Supabase storage and include public URL in message
    const blob = await captureEditedReceiptToBlob();
    const digits = (editedSale as any).customerPhone ? String((editedSale as any).customerPhone).replace(/\D/g, '') : '';
    let message = `Invoice: ${editedSale.invoiceNumber}%0ATotal: ${editedSale.grandTotal}`;
    if (!blob) {
      // Open wa.me with text only
      const url = `https://wa.me/${digits || ''}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      return;
    }

    try {
      const fileName = `receipts/edited-${editedSale.invoiceNumber || Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload(fileName, blob, { contentType: 'image/png', upsert: true });
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        const publicUrl = publicData?.publicUrl;
        if (publicUrl) {
          message += `%0A%0AReceipt: ${publicUrl}`;
        }
      }
    } catch (err) {
      console.warn('Upload failed', err);
    }

    const url = `https://wa.me/${digits || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-full max-h-full bg-white flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Edit Invoice</p>
              <h1 className="text-2xl font-semibold text-slate-900">{editedSale.invoiceNumber}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyEditedReceipt}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Camera className="mr-2 h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={shareEditedReceiptViaWhatsApp}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  activeTab === 'editor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white'
                )}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white'
                )}
              >
                Preview
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="hidden sm:inline">Ctrl+S Save</span>
              <span className="hidden sm:inline">Esc Close</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full w-full overflow-hidden">
            <div className="flex h-full w-full flex-col lg:flex-row">
              {/* Editor Panel */}
              <div className={cn(
                'h-full min-h-0 overflow-y-auto bg-white p-4 sm:p-6 flex-1',
                activeTab === 'preview' && 'hidden lg:block'
              )}>
                <div className="space-y-6 max-w-4xl mx-auto">
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Customer Name</Label>
                        <Input
                          value={editedSale.customerName}
                          onChange={e => setEditedSale(prev => ({ ...prev, customerName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={(editedSale as any).customerPhone || ''}
                          onChange={e => setEditedSale(prev => ({ ...prev, customerPhone: e.target.value }))}
                          placeholder="(optional)"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Address</Label>
                        <Input
                          value={(editedSale as any).customerAddress || ''}
                          onChange={e => setEditedSale(prev => ({ ...prev, customerAddress: e.target.value }))}
                          placeholder="(optional)"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Date</Label>
                        <Input
                          type="datetime-local"
                          value={new Date(editedSale.createdAt).toISOString().slice(0, 16)}
                          onChange={e => setEditedSale(prev => ({ ...prev, createdAt: new Date(e.target.value).toISOString() }))}
                        />
                      </div>
                    </div>
                  </section>


                  <section>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
                      <p className="text-sm text-gray-500">Edit quantity, price, and IMEI</p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {editedSale.items.map((it, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label>Product Name</Label>
                              <Input 
                                value={it.productName} 
                                onChange={e => updateItem(idx, { productName: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label>Color</Label>
                              <Input 
                                value={it.color || ''} 
                                onChange={e => updateItem(idx, { color: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label>IMEI 1</Label>
                              <Input 
                                value={it.imei1 || it.imei || ''} 
                                onChange={e => updateItem(idx, { imei1: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label>IMEI 2</Label>
                              <Input 
                                value={it.imei2 || ''} 
                                onChange={e => updateItem(idx, { imei2: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label>Qty</Label>
                              <Input 
                                type="number" 
                                value={String(it.quantity)} 
                                onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 0 })} 
                              />
                            </div>
                            <div>
                              <Label>Price</Label>
                              <Input 
                                type="number" 
                                value={String(it.unitPrice)} 
                                onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })} 
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Line Total</Label>
                              <Input value={String(it.total)} readOnly className="bg-gray-100" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Discount</Label>
                        <Input 
                          type="number" 
                          value={String(editedSale.discount)} 
                          onChange={e => {
                            const disc = Number(e.target.value) || 0;
                            setEditedSale(prev => ({
                              ...prev,
                              discount: disc,
                              grandTotal: Math.max(0, prev.subtotal - disc + prev.tax)
                            }));
                          }} 
                        />
                      </div>
                      <div>
                        <Label>Tax</Label>
                        <Input 
                          type="number" 
                          value={String(editedSale.tax)} 
                          onChange={e => {
                            const tax = Number(e.target.value) || 0;
                            setEditedSale(prev => ({
                              ...prev,
                              tax: tax,
                              grandTotal: Math.max(0, prev.subtotal - prev.discount + tax)
                            }));
                          }} 
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <Label className="text-blue-900 font-semibold">Grand Total</Label>
                        <Input 
                          type="number" 
                          value={String(editedSale.grandTotal)} 
                          onChange={e => setEditedSale(prev => ({
                            ...prev,
                            grandTotal: Number(e.target.value) || 0
                          }))}
                          className="mt-1 font-semibold text-base"
                        />
                      </div>
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <Label className="text-green-900 font-semibold">Received / Paid</Label>
                        <Input 
                          type="number" 
                          value={String(editedSale.paidAmount)} 
                          onChange={e => setEditedSale(prev => ({
                            ...prev,
                            paidAmount: Number(e.target.value) || 0,
                            changeDue: Math.max(0, (Number(e.target.value) || 0) - prev.grandTotal)
                          }))}
                          className="mt-1 font-semibold text-base"
                        />
                      </div>
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                        <Label className="text-orange-900 font-semibold">Pending / Due</Label>
                        <Input 
                          type="number" 
                          value={String(Math.max(0, editedSale.grandTotal - editedSale.paidAmount))} 
                          readOnly
                          className="mt-1 font-semibold text-base bg-gray-100"
                        />
                      </div>
                      <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                        <Label className="text-purple-900 font-semibold">Change Due</Label>
                        <Input 
                          type="number" 
                          value={String(editedSale.changeDue)} 
                          onChange={e => setEditedSale(prev => ({
                            ...prev,
                            changeDue: Number(e.target.value) || 0
                          }))}
                          className="mt-1 font-semibold text-base"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Payment Status</Label>
                        <select 
                          value={editedSale.status} 
                          onChange={e => setEditedSale(prev => ({
                            ...prev,
                            status: e.target.value as any
                          }))}
                          className="w-full h-9 px-3 border rounded-md text-sm bg-white mt-1"
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <Label>Notes</Label>
                    <Textarea 
                      value={editedSale.notes || ''} 
                      onChange={e => setEditedSale(prev => ({ ...prev, notes: e.target.value }))} 
                    />
                  </section>
                </div>
              </div>

              {/* Preview Panel */}
              <div className={cn(
                'h-full min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 flex-1',
                activeTab === 'editor' && 'hidden lg:block'
              )}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Live Preview</p>
                    <p className="text-xs text-gray-500">Updates instantly as you edit</p>
                  </div>
                </div>
                <div className="overflow-auto rounded-lg border border-gray-200 border-t-0 border-r-0 bg-white p-4 shadow-sm">
                  <InvoiceReceipt 
                    sale={editedSale} 
                    shopSettings={shopSettings} 
                    receiptSettings={receiptSettings} 
                    layout={receiptSettings.receiptWidth === '58mm' ? 'thermal' : 'a4'} 
                    id="receipt-edited"
                    hideBarcodes={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
import { useEffect } from 'react';
import type { Purchase, ShopSettings, ReceiptSettings } from '@/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';
import { useSupplierStore } from '@/stores/supplierStore';
import { useProductStore } from '@/stores/productStore';
import { useImeiStore } from '@/stores/imeiStore';
import Barcode from './Barcode';

interface PurchaseInvoiceReceiptProps {
  purchase: Purchase;
  shopSettings: ShopSettings;
  receiptSettings: ReceiptSettings;
  className?: string;
  id?: string;
  screen?: boolean;
  layout?: 'thermal' | 'a4';
}

function MultilineText({ text, className }: { text?: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={className}>
      {text.split('\n').map((line, index) => (
        <p key={index} className={index > 0 ? 'mt-0.5' : undefined}>{line}</p>
      ))}
    </div>
  );
}

function padText(value: string, width: number, align: 'left' | 'right' | 'center' = 'left') {
  const trimmed = value ?? '';
  if (trimmed.length >= width) {
    return align === 'center'
      ? trimmed.slice(0, width)
      : align === 'right'
      ? trimmed.slice(trimmed.length - width)
      : trimmed.slice(0, width);
  }

  const padding = width - trimmed.length;
  if (align === 'right') return ' '.repeat(padding) + trimmed;
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + trimmed + ' '.repeat(right);
  }
  return trimmed + ' '.repeat(padding);
}

function centerText(value: string, width: number) {
  return padText(value, width, 'center');
}

function wrapText(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + (current ? ' ' : '') + w).length <= width) {
      current = current ? `${current} ${w}` : w;
    } else {
      if (current) lines.push(current);
      if (w.length > width) {
        for (let i = 0; i < w.length; i += width) {
          lines.push(w.slice(i, i + width));
        }
        current = '';
      } else {
        current = w;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatAmount(amount: number) {
  return formatNumber(amount);
}

function groupPurchaseItems(items: any[]) {
  const groupedMap: Record<string, any> = {};
  items.forEach((item: any) => {
    const pid = item.productId || 'unknown';
    if (!groupedMap[pid]) groupedMap[pid] = { productId: pid, productName: item.productName, unitCost: item.unitCost, brandName: item.brandName, model: item.model, storage: item.storage, imeis: [] as any[] };
    groupedMap[pid].imeis.push({ imei: item.imei, color: item.color, ram: item.ram, storage: item.storage });
  });
  return Object.values(groupedMap) as any[];
}

function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  const a = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + a[n % 10] : '');
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  };

  let word = '';
  let remaining = Math.floor(num);
  
  const million = Math.floor(remaining / 1000000);
  remaining %= 1000000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  
  if (million > 0) {
    word += convertLessThanThousand(million) + ' MILLION ';
  }
  if (thousand > 0) {
    word += convertLessThanThousand(thousand) + ' THOUSAND ';
  }
  if (remaining > 0) {
    word += convertLessThanThousand(remaining);
  }
  
  return (word.trim() + ' ONLY').toUpperCase();
}

export default function PurchaseInvoiceReceipt({
  purchase,
  shopSettings,
  receiptSettings,
  className,
  id,
  screen = false,
  layout = 'a4',
}: PurchaseInvoiceReceiptProps) {
  const { getSupplierById } = useSupplierStore();
  const { getProductById } = useProductStore();
  const { findByImei } = useImeiStore();
  const supplier = getSupplierById(purchase.supplierId);
  const supplierAddress = supplier?.address || '';
  const supplierPhone = supplier?.phone || '';
  const supplierEmail = supplier?.email || '';

  const printWidth = receiptSettings.receiptWidth === '58mm' ? 32 : 46;
  const headerLines = receiptSettings.header?.split('\n').filter(Boolean) ?? [];
  const companyAddress = shopSettings.address ? shopSettings.address.split('\n') : [];
  const shopNameText = shopSettings.shopName?.trim()?.toUpperCase() || 'ALI MOBILES';
  const shopPhoneText = shopSettings.phone ? `Phone: ${shopSettings.phone}` : '';
  const shopEmailText = shopSettings.email ? `Email: ${shopSettings.email}` : '';
  const screenWidth = receiptSettings.receiptWidth === '58mm' ? 220 : 320;

  const buildReceiptLines = () => {
    const lines: string[] = [];
    const footerLinesRaw = receiptSettings.footer?.split('\n') ?? [];
    const addressRaw = (headerLines && headerLines.length > 0) ? headerLines : (shopSettings.address ? shopSettings.address.split('\n') : []);

    const addressLines = addressRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));
    const footerLines = footerLinesRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));

    // Header Shop Name & Address
    if (shopNameText) {
      const dividerLength = printWidth - shopNameText.length - 1;
      if (dividerLength > 0) {
        lines.push(`${shopNameText} ${'='.repeat(dividerLength)}`);
      } else {
        lines.push(centerText(shopNameText, printWidth));
      }
    }
    addressLines.forEach(line => {
      if (line.trim() !== '') {
        lines.push(centerText(line, printWidth));
      }
    });
    if (shopSettings.phone) {
      lines.push(centerText(`Phone: ${shopSettings.phone}`, printWidth));
    }
    lines.push('-'.repeat(printWidth));

    // Invoice Meta Information
    lines.push(padText('PO #:', 12) + padText(purchase.poNumber, printWidth - 12, 'right'));
    lines.push(padText('Date:', 12) + padText(formatDate(purchase.createdAt, shopSettings.dateFormat), printWidth - 12, 'right'));
    lines.push(padText('Supplier:', 12) + padText(purchase.supplierName, printWidth - 12, 'right'));
    if (supplierPhone) {
      lines.push(padText('Phone:', 12) + padText(supplierPhone, printWidth - 12, 'right'));
    }
    lines.push(padText('Status:', 12) + padText(purchase.status.toUpperCase(), printWidth - 12, 'right'));
    lines.push('-'.repeat(printWidth));

    // Items Column Widths
    const snoWidth = printWidth === 32 ? 3 : 4;
    const qtyWidth = printWidth === 32 ? 3 : 4;
    const totalWidth = printWidth === 32 ? 8 : 10;
    const separator = ' ';
    const productWidth = printWidth - snoWidth - qtyWidth - totalWidth - 3;

    // Items Table Header
    const snoHeader = padText('SNo', snoWidth, 'left');
    const productHeader = padText('Product', productWidth, 'left');
    const qtyHeader = padText('Qty', qtyWidth, 'right');
    const totalHeader = padText('Total', totalWidth, 'right');
    lines.push(snoHeader + separator + productHeader + separator + qtyHeader + separator + totalHeader);
    lines.push('-'.repeat(printWidth));

    // Group items by productId so multiple IMEIs of same product are grouped together
    const groupedMap: Record<string, any> = {};
    purchase.items.forEach(item => {
      const pid = item.productId || 'unknown';
      if (!groupedMap[pid]) {
        groupedMap[pid] = {
          productId: pid,
          productName: item.productName,
          unitCost: item.unitCost,
          brandName: item.brandName,
          model: item.model,
          storage: item.storage,
          imeis: [] as { imei?: string; color?: string }[],
        };
      }
      if (item.imei) groupedMap[pid].imeis.push({ imei: item.imei, color: item.color });
      else groupedMap[pid].imeis.push({ imei: undefined, color: item.color });
    });

    const grouped = Object.values(groupedMap) as any[];

    // Render grouped items; each IMEI becomes one line but products stay grouped consecutively
    let runningIndex = 0;
    grouped.forEach(group => {
      for (let i = 0; i < group.imeis.length; i++) {
        runningIndex += 1;
        const snoStr = padText(String(runningIndex), snoWidth, 'left');
        let productDesc = group.productName || '';
        if (group.brandName) {
          productDesc += ` (${group.brandName}`;
          if (group.model) productDesc += ` ${group.model}`;
          productDesc += ')';
        }
        if (group.storage) productDesc += ` ${group.storage}`;
        const colorValue = group.imeis[i].color || getProductById(group.productId)?.color;
        if (colorValue) productDesc += ` [${colorValue}]`;
        if (group.imeis[i].imei) productDesc += ` IMEI:${group.imeis[i].imei}`;

        const nameLines = wrapText(productDesc, productWidth);
        const qtyStr = padText('1', qtyWidth, 'right');
        const totalStr = padText(formatAmount(group.unitCost), totalWidth, 'right');

        lines.push(snoStr + separator + padText(nameLines[0] || '', productWidth, 'left') + separator + qtyStr + separator + totalStr);
        for (let j = 1; j < nameLines.length; j++) {
          lines.push(padText('', snoWidth) + separator + padText(nameLines[j], productWidth, 'left') + separator + padText('', qtyWidth) + separator + padText('', totalWidth));
        }
      }
    });
    lines.push('-'.repeat(printWidth));

    // Summary Calculations
    const totalQty = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
    lines.push(padText('Total Qty:', 15) + padText(String(totalQty), printWidth - 15, 'right'));
    lines.push(padText('Subtotal:', 15) + padText(formatAmount(purchase.subtotal), printWidth - 15, 'right'));
    if (purchase.discount > 0) {
      lines.push(padText('Discount:', 15) + padText(`-${formatAmount(purchase.discount)}`, printWidth - 15, 'right'));
    }
    if (purchase.shipping > 0) {
      lines.push(padText('Shipping:', 15) + padText(formatAmount(purchase.shipping), printWidth - 15, 'right'));
    }

    // Net Total (prominent in === borders)
    lines.push('='.repeat(printWidth));
    lines.push(padText('NET TOTAL:', 15) + padText(formatAmount(purchase.grandTotal), printWidth - 15, 'right'));
    lines.push('='.repeat(printWidth));

    // Paid & Due
    const dueAmount = Math.max(0, purchase.grandTotal - purchase.paidAmount);
    lines.push(padText('Received:', 15) + padText(formatAmount(purchase.paidAmount), printWidth - 15, 'right'));
    lines.push(padText('Due:', 15) + padText(formatAmount(dueAmount), printWidth - 15, 'right'));

    // Thank you Footer
    if (footerLines.length > 0) {
      footerLines.forEach(line => {
        if (line.trim() === '') {
          lines.push('');
        } else {
          lines.push(centerText(line, printWidth));
        }
      });
    } else {
      lines.push(centerText('Thank You For Your Business', printWidth));
    }

    return lines;
  };

  // Render A4 invoice layout
  if (layout === 'a4') {
    const formattedTime = formatDate(purchase.createdAt, 'hh:mm a');
    const groupedA4 = groupPurchaseItems(purchase.items || []);

    return (
      <div
        id={id}
        className={cn(
          'wide-invoice w-full max-w-[800px] bg-white text-black p-6 border border-gray-300 shadow-md font-sans text-xs space-y-4 mx-auto',
          className
        )}
      >
        {/* Header Logo */}
        {receiptSettings.showLogo && (
          <div className="mx-auto mb-2 flex items-center justify-center w-20 h-20"> 
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="font-extrabold text-[#1e3a8a] text-2xl uppercase tracking-wider">{shopNameText}</h2>
          <div className="text-xs font-semibold text-gray-700 leading-normal">
            {receiptSettings.header ? (
              receiptSettings.header.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))
            ) : (
              <>
                <p>{companyAddress.join(', ')}</p>
                {shopSettings.phone && <p>Phone: [ {shopSettings.phone} ]</p>}
              </>
            )}
          </div>
          <div className="pt-2">
            <span className="text-lg font-bold border-b-2 border-black inline-block px-4 pb-0.5 uppercase tracking-wide">
              Purchase Order
            </span>
          </div>
        </div>

        {/* Supplier & Invoice Meta Box */}
        <table className="w-full border-collapse border border-black text-xs font-semibold my-4">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black w-[60%] text-left">
                <span className="font-normal text-gray-500">Supplier : </span>
                <span className="font-bold text-gray-900">{purchase.supplierName}</span>
              </td>
              <td className="p-2 w-[40%] text-left">
                <span className="font-normal text-gray-500">PO # : </span>
                <span className="font-bold text-gray-900">{purchase.poNumber}</span>
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black text-left">
                <span className="font-normal text-gray-500">Address : </span>
                <span className="text-gray-900">{supplierAddress || '___________________________'}</span>
              </td>
              <td className="p-2 text-left">
                <span className="font-normal text-gray-500">Date : </span>
                <span className="text-gray-900">{formatDate(purchase.createdAt, 'dd/MM/yyyy')}</span>
              </td>
            </tr>
            <tr>
              <td className="p-2 border-r border-black text-left">
                <span className="font-normal text-gray-500">Phone : </span>
                <span className="text-gray-900">{supplierPhone || '____________'}</span>
              </td>
              <td className="p-2 text-left">
                <span className="font-normal text-gray-500">Status : </span>
                <span className={`font-bold ${purchase.status === 'received' ? 'text-green-600' : purchase.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {purchase.status.toUpperCase()}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Grid Table */}
        <table className="items-table w-full border-collapse border border-black text-[12px] my-4">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-xs">
              <th className="border border-black p-2 text-center w-10">Sr#</th>
              <th className="border border-black p-2 text-left">Item Description</th>
              <th className="border border-black p-2 text-center w-20">Color</th>
              <th className="border border-black p-2 text-center w-12">Qty</th>
              <th className="border border-black p-2 text-right w-20">Cost</th>
            </tr>
          </thead>
          <tbody>
            {groupedA4.flatMap((group, index) => group.imeis.map((im: any, i: number) => (
              <tr key={`${index}-${i}`} className="text-[12px] hover:bg-gray-50">
                <td className="border border-black p-2 text-center">{groupedA4.slice(0, index).reduce((sum: number, g: any) => sum + g.imeis.length, 0) + i + 1}</td>
                <td className="border border-black p-2 text-left">
                  <div className="font-bold uppercase">{group.productName}</div>
                  {group.brandName && <div className="text-[10px] text-gray-600 mt-0.5">Brand: {group.brandName}</div>}
                  {group.model && <div className="text-[10px] text-gray-600">Model: {group.model}</div>}
                  {(im.ram && im.storage) ? (
                    <div className="text-[10px] text-blue-700 font-bold">Variant: {im.ram} / {im.storage}</div>
                  ) : (
                    group.storage && <div className="text-[10px] text-gray-600">Storage: {group.storage}</div>
                  )}
                </td>
                <td className="border border-black p-2 text-left">{im.color || getProductById(group.productId)?.color || '-'}</td>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2 text-right font-bold">{formatCurrency(group.unitCost)}</td>
              </tr>
            )))}
            {/* Total summary row */}
            <tr className="bg-gray-100 font-bold border-t border-black text-xs">
              <td className="border border-black p-2 text-center font-bold" colSpan={3}>
                Total :
              </td>
              <td className="border border-black p-2 text-center">
                {purchase.items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
              <td className="border border-black p-2 text-right font-bold">
                {formatCurrency(purchase.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Two Boxes Compartments */}
        <div className="grid grid-cols-2 border border-black border-t-0 text-xs font-semibold">
          {/* Left Box: Amount in Words */}
          <div className="border-r border-black p-2 flex flex-col justify-between text-left">
            <div>
              <span className="text-gray-500 block mb-1">Amount in Words :</span>
              <span className="font-bold text-[11px] block leading-tight text-gray-850">
                {numberToWords(purchase.grandTotal)}
              </span>
            </div>
          </div>
          
          {/* Right Box: Invoice Totals */}
          <div className="p-2 space-y-1 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCurrency(purchase.subtotal)}</span>
            </div>
            {purchase.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(purchase.discount)}</span>
              </div>
            )}
            {purchase.shipping > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Shipping:</span>
                <span>+{formatCurrency(purchase.shipping)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-1 font-bold text-gray-900">
              <span>Net Total:</span>
              <span>{formatCurrency(purchase.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="font-normal text-gray-500">Received:</span>
              <span>{formatCurrency(purchase.paidAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {receiptSettings.footer && (
          <div className="text-center text-xs font-semibold text-gray-800 pt-2 border-t border-dashed border-gray-300">
            <MultilineText text={receiptSettings.footer} />
          </div>
        )}

        {/* Authorized Signature & Receiver Signature */}
        <div className="flex justify-between items-end pt-8 pb-4 text-xs font-semibold">
          <div>
            <span>Authorized Signature : ___________________________</span>
          </div>
          <div>
            <span>Receiver's Signature : ___________________________</span>
          </div>
        </div>

        {/* IMEI Barcode Section (Moved to the very end) */}
        {(() => {
          const imeiItems = purchase.items.filter(item => item.imei && item.imei.trim() !== '');
          if (imeiItems.length > 0) {
            return (
              <div className="border-t border-dashed border-gray-300 pt-4 flex flex-col items-center space-y-3 barcode-container">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">IMEI Barcodes</span>
                <div className="flex flex-col items-center gap-3 w-full">
                  {imeiItems.map((item, idx) => (
                    <Barcode key={idx} value={item.imei!} height={40} widthScale={1.2} className="p-2 bg-white border border-gray-200 rounded shadow-sm" />
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Bottom Metadata Line */}
        <div className="flex justify-end text-[10px] text-gray-400 border-t pt-2 mt-2">
          <div>Reference: <span className="font-medium text-gray-600">{purchase.reference || 'N/A'}</span></div>
        </div>
      </div>
    );
  }

  if (!screen) {
    const receiptText = buildReceiptLines().join('\n');
    return (
      <div
        id={id}
        className={cn('receipt-container text-left text-[11px] leading-tight', className)}
      >
        <pre className="receipt-pre">{receiptText}</pre>
      </div>
    );
  }

  // Screen layout (polished for on-screen receipt visual model dialog)
  return (
    <div
      id={id}
      style={{ width: screenWidth }}
      className={cn('space-y-4 text-sm text-gray-800 p-4 bg-white rounded-lg shadow-sm border border-gray-100 mx-auto', className)}
    >
      <div className="text-center">
        {receiptSettings.showLogo && (
          <div className="mx-auto mb-2 flex items-center justify-center w-16 h-16"> 
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className="font-bold text-gray-900 text-xl uppercase tracking-wide">{shopNameText}</h2>
        <div className="text-xs text-gray-500 mt-1">
          {companyAddress.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        {shopPhoneText && <p className="text-xs text-gray-500 mt-1">{shopPhoneText}</p>}
        {shopEmailText && <p className="text-xs text-gray-500">{shopEmailText}</p>}
      </div>

      <div className="text-center py-2 border-y border-gray-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Purchase Order</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Supplier</p>
            <p className="font-semibold text-gray-900">{purchase.supplierName}</p>
          </div>
          {supplierPhone && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-gray-900">{supplierPhone}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-right">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">PO #</p>
            <p className="font-semibold text-gray-900">{purchase.poNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-gray-900">{formatDate(purchase.createdAt, shopSettings.dateFormat)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Status</p>
            <p className={`text-gray-900 uppercase font-semibold ${purchase.status === 'received' ? 'text-green-600' : purchase.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
              {purchase.status}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 font-semibold border-b border-gray-100">
              <th className="text-left pb-1.5 w-8">Sr#</th>
              <th className="text-left pb-1.5">Item Description</th>
              <th className="text-left pb-1.5 w-20">Color</th>
              <th className="text-right pb-1.5 w-12">Qty</th>
              <th className="text-right pb-1.5 w-16">Cost</th>
              <th className="text-right pb-1.5 w-16">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {
              (() => {
                const groupedScreen = groupPurchaseItems(purchase.items || []);
                return groupedScreen.flatMap((group, index) => group.imeis.map((im: any, i: number) => (
                  <tr key={`${index}-${i}`} className="text-gray-700">
                    <td className="py-1.5 align-top">{groupedScreen.slice(0, index).reduce((sum: number, g: any) => sum + g.imeis.length, 0) + i + 1}</td>
                    <td className="py-1.5 align-top break-words">
                      <div className="font-semibold text-gray-900">{group.productName}</div>
                      {group.brandName && <div className="text-[10px] text-gray-600">Brand: {group.brandName}</div>}
                      {group.model && <div className="text-[10px] text-gray-600">Model: {group.model}</div>}
                      {group.storage && <div className="text-[10px] text-gray-600">Storage: {group.storage}</div>}
                      {im.imei && <div className="text-[10px] text-gray-800 font-mono font-bold mt-1 bg-gray-50 p-1 rounded">IMEI: {im.imei}</div>}
                    </td>
                    <td className="py-1.5 align-top text-left">{im.color || getProductById(group.productId)?.color || findByImei(im.imei || '')?.color || '-'}</td>
                    <td className="py-1.5 align-top text-right">1</td>
                    <td className="py-1.5 align-top text-right">{formatCurrency(group.unitCost)}</td>
                    <td className="py-1.5 align-top text-right font-medium">{formatCurrency(group.unitCost)}</td>
                  </tr>
                )));
              })()
            }
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="space-y-1 text-xs border-t pt-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal:</span>
          <span>{formatCurrency(purchase.subtotal)}</span>
        </div>
        {purchase.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-{formatCurrency(purchase.discount)}</span>
          </div>
        )}
        {purchase.shipping > 0 && (
          <div className="flex justify-between text-blue-600">
            <span>Shipping:</span>
            <span>+{formatCurrency(purchase.shipping)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base border-t pt-2">
          <span>Net Total:</span>
          <span className="text-orange-500">{formatCurrency(purchase.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Paid:</span>
          <span>{formatCurrency(purchase.paidAmount)}</span>
        </div>
        {purchase.grandTotal - purchase.paidAmount > 0 && (
          <div className="flex justify-between text-sm text-red-600 font-semibold">
            <span>Due:</span>
            <span>{formatCurrency(purchase.grandTotal - purchase.paidAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import type { Sale, ShopSettings, ReceiptSettings } from '@/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';
import { useCustomerStore } from '@/stores/customerStore';
import { useSaleStore } from '@/stores/saleStore';
import Barcode from './Barcode';

interface InvoiceReceiptProps {
  sale: Sale;
  shopSettings: ShopSettings;
  receiptSettings: ReceiptSettings;
  className?: string;
  id?: string;
  screen?: boolean;
  layout?: 'thermal' | 'a4';
  hideBarcodes?: boolean;
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

export default function InvoiceReceipt({
  sale,
  shopSettings,
  receiptSettings,
  className,
  id,
  screen = false,
  layout = 'a4',
  hideBarcodes = false,
}: InvoiceReceiptProps) {
  const paymentLabel = sale.paymentMethod.replace(/_/g, ' ');
  const printWidth = receiptSettings.receiptWidth === '58mm' ? 32 : 46;
  const headerLines = receiptSettings.header?.split('\n').filter(Boolean) ?? [];

  const parseProductName = (value: string) => {
    if (!value?.trim()) return '';
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return String((parsed as any).name || trimmed);
        }
        return String(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  };
  const customerName = sale.customerName?.trim() || 'OPENING CASH SALE';

  const { getCustomerById } = useCustomerStore();
  const customer = sale.customerId ? getCustomerById(sale.customerId) : undefined;
  const customerPhone = (sale as any).customerPhone || customer?.phone || '';
  const customerAddress = (sale as any).customerAddress || customer?.address || '';
  
  const companyAddress = shopSettings.address ? shopSettings.address.split('\n') : [];
  const shopNameText = shopSettings.shopName?.trim()?.toUpperCase() || 'ALI MOBILES';
  const shopPhoneText = shopSettings.phone ? `Phone: ${shopSettings.phone}` : '';
  const shopEmailText = shopSettings.email ? `Email: ${shopSettings.email}` : '';
  const screenWidth = receiptSettings.receiptWidth === '58mm' ? 220 : 320;

  const { sales } = useSaleStore();

  useEffect(() => {
    if (sales.length === 0) {
      useSaleStore.getState().loadData();
    }
  }, []);

  const buildReceiptLines = () => {
    const lines: string[] = [];
    const footerLinesRaw = receiptSettings.footer?.split('\n') ?? [];
    const termsLinesRaw = receiptSettings.termsAndConditions?.split('\n') ?? [];
    const addressRaw = (headerLines && headerLines.length > 0) ? headerLines : (shopSettings.address ? shopSettings.address.split('\n') : []);

    const addressLines = addressRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));
    const footerLines = footerLinesRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));
    const termsLines = termsLinesRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));

    if (!receiptSettings.showLogo) {
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
    }
    lines.push('-'.repeat(printWidth));

    lines.push(padText('Invoice #:', 12) + padText(sale.invoiceNumber, printWidth - 12, 'right'));
    lines.push(padText('Date:', 12) + padText(formatDate(sale.createdAt, shopSettings.dateFormat), printWidth - 12, 'right'));
    lines.push(padText('Customer:', 12) + padText(customerName, printWidth - 12, 'right'));
    if (customerPhone) {
      lines.push(padText('Phone:', 12) + padText(customerPhone, printWidth - 12, 'right'));
    }
    lines.push(padText('Payment:', 12) + padText(paymentLabel.toUpperCase(), printWidth - 12, 'right'));
    lines.push('-'.repeat(printWidth));

    const snoWidth = printWidth === 32 ? 3 : 4;
    const qtyWidth = printWidth === 32 ? 3 : 4;
    const totalWidth = printWidth === 32 ? 8 : 10;
    const separator = ' ';
    const productWidth = printWidth - snoWidth - qtyWidth - totalWidth - 3;

    const snoHeader = padText('SNo', snoWidth, 'left');
    const productHeader = padText('Product', productWidth, 'left');
    const qtyHeader = padText('Qty', qtyWidth, 'right');
    const totalHeader = padText('Total', totalWidth, 'right');
    lines.push(snoHeader + separator + productHeader + separator + qtyHeader + separator + totalHeader);
    lines.push('-'.repeat(printWidth));

    sale.items.forEach((item, index) => {
      const snoStr = padText(String(index + 1), snoWidth, 'left');
      const nameLines = wrapText(parseProductName(item.productName), productWidth);
      const qtyStr = padText(String(item.quantity), qtyWidth, 'right');
      const totalStr = padText(formatAmount(item.total), totalWidth, 'right');

      lines.push(snoStr + separator + padText(nameLines[0] || '', productWidth, 'left') + separator + qtyStr + separator + totalStr);
      for (let i = 1; i < nameLines.length; i++) {
        lines.push(padText('', snoWidth) + separator + padText(nameLines[i], productWidth, 'left') + separator + padText('', qtyWidth) + separator + padText('', totalWidth));
      }
    });
    lines.push('-'.repeat(printWidth));

    const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    lines.push(padText('Total Qty:', 15) + padText(String(totalQty), printWidth - 15, 'right'));
    lines.push(padText('Subtotal:', 15) + padText(formatAmount(sale.subtotal), printWidth - 15, 'right'));
    if (sale.discount > 0) {
      lines.push(padText('Discount:', 15) + padText(`-${formatAmount(sale.discount)}`, printWidth - 15, 'right'));
    }

    lines.push('='.repeat(printWidth));
    lines.push(padText('NET TOTAL:', 15) + padText(formatAmount(sale.grandTotal), printWidth - 15, 'right'));
    lines.push('='.repeat(printWidth));

    const dueAmount = Math.max(0, sale.grandTotal - sale.paidAmount);
    lines.push(padText('Received:', 15) + padText(formatAmount(sale.paidAmount), printWidth - 15, 'right'));
    lines.push(padText('Pending:', 15) + padText(formatAmount(dueAmount), printWidth - 15, 'right'));
    if (sale.changeDue > 0) {
      lines.push(padText('Change:', 15) + padText(formatAmount(sale.changeDue), printWidth - 15, 'right'));
    }

    if (termsLines.length > 0) {
      termsLines.forEach(line => {
        if (line.trim() === '') {
          lines.push('');
        } else {
          lines.push(centerText(line, printWidth));
        }
      });
    }

    if (footerLines.length > 0) {
      footerLines.forEach(line => {
        if (line.trim() === '') {
          lines.push('');
        } else {
          lines.push(centerText(line, printWidth));
        }
      });
    } else {
      lines.push(centerText('Thank You For Purchase', printWidth));
    }

    return lines;
  };

  // Calculate discount percentage (shared across layouts)
  const discountPercent = sale.subtotal > 0 ? (sale.discount / sale.subtotal) * 100 : 0;
  const discPercentStr = discountPercent > 0 ? `${discountPercent.toFixed(2).replace(/\.00$/, '')}%` : '0%';

  // Render A4 invoice layout
  if (layout === 'a4') {
    const invBalance = sale.grandTotal - sale.paidAmount;
    
    const customerSales = sale.customerId
      ? sales.filter(s => s.customerId === sale.customerId && s.id !== sale.id && new Date(s.createdAt).getTime() < new Date(sale.createdAt).getTime() && s.status !== 'cancelled')
      : [];
    const previousBalance = customerSales.reduce((sum, s) => sum + (s.grandTotal - s.paidAmount), 0);
    const currentBalance = previousBalance + invBalance;

    const formattedTime = formatDate(sale.createdAt, 'hh:mm a');

    return (
      <div
        id={id}
        className={cn(
          'wide-invoice w-full max-w-[800px] bg-white text-black p-6 border border-gray-300 shadow-md font-sans text-xs space-y-4 mx-auto',
          className
        )}
      >
        {/* Header: Logo OR Store Name */}
        {receiptSettings.showLogo ? (
          <div className="mx-auto mb-2 flex items-center justify-center w-20 h-20"> 
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="text-center space-y-1">
            <h2 className="font-extrabold text-[#1e3a8a] text-2xl uppercase tracking-wider" style={{ fontFamily: 'Arial Black, Arial, Helvetica, sans-serif' }}>
              {shopNameText}
            </h2>
            <div className="text-xs font-semibold text-gray-700 leading-normal" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
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
          </div>
        )}

        {/* Invoice Type Label */}
        <div className="pt-2 text-center">
          <span className="text-lg font-bold border-b-2 border-black inline-block px-4 pb-0.5 uppercase tracking-wide" style={{ fontFamily: 'Arial Black, Arial, Helvetica, sans-serif' }}>
            Sale Invoice
          </span>
        </div>

        {/* Customer & Invoice Meta Box */}
        <table className="w-full border-collapse border border-black text-[12px] font-bold">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 w-[60%] border-r border-black text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Customer : </span>
                <span className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{sale.customerName || 'Walk-in Customer'}</span>
              </td>
              <td className="p-2 w-[40%] text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Inv # : </span>
                <span className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{sale.invoiceNumber}</span>
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Address : </span>
                <span className="text-gray-900" style={{ fontFamily: 'Times New Roman, Times, serif' }}>{customerAddress || '___________________________'}</span>
              </td>
              <td className="p-2 text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Payment : </span>
                <span className="text-gray-900 uppercase" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{paymentLabel}</span>
              </td>
            </tr>
            <tr>
              <td className="p-2 border-r border-black text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Phone : </span>
                <span className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{customerPhone || '____________'}</span>
              </td>
              <td className="p-2 text-left" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Date : </span>
                <span className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatDate(sale.createdAt, 'dd/MM/yyyy')}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Grid Table */}
        <table className="items-table w-full border-collapse border border-black text-[10px] my-3">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black">
              <th className="border border-black p-1.5 text-center" style={{ width: '7%', fontFamily: 'Arial, Helvetica, sans-serif' }}>SR</th>
              <th className="border border-black p-1.5 text-left" style={{ width: '36%', fontFamily: 'Arial, Helvetica, sans-serif' }}>Item Description</th>
              <th className="border border-black p-1.5 text-center" style={{ width: '13%', fontFamily: 'Arial, Helvetica, sans-serif' }}>Color</th>
              <th className="border border-black p-1.5 text-center" style={{ width: '18%', fontFamily: 'Arial, Helvetica, sans-serif' }}>R/S</th>
              <th className="border border-black p-1.5 text-right" style={{ width: '26%', fontFamily: 'Arial, Helvetica, sans-serif' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => {
              const ramStorage = item.ram ? `${item.ram}/${item.storage || '-'}` : item.storage || '-';
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-black p-1.5 text-center" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{index + 1}</td>
                  <td className="border border-black p-1.5 text-left font-bold uppercase text-[9px]" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                    <div className="break-words">{parseProductName(item.productName)}</div>
                    {item.ptaStatus && (
                      <div className="text-[8px] text-gray-600 font-semibold mt-0.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>PTA: {item.ptaStatus}</div>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center uppercase text-[9px]" style={{ fontFamily: 'Times New Roman, Times, serif' }}>{item.color || '-'}</td>
                  <td className="border border-black p-1.5 text-center uppercase text-[8.5px]" style={{ fontFamily: 'Times New Roman, Times, serif', lineHeight: '1.2' }}>{ramStorage}</td>
                  <td className="border border-black p-1.5 text-right font-bold text-[10.5px] whitespace-nowrap" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(item.unitPrice)}</td>
                </tr>
              );
            })}
            {/* Total summary row */}
            <tr className="bg-gray-100 font-bold border-t border-black">
              <td className="border border-black p-1.5" colSpan={5}>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-bold uppercase" style={{ fontFamily: 'Times New Roman, Times, serif' }}>Total Qty : {sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  <span className="font-bold uppercase" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>Total Price : {formatCurrency(sale.subtotal)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Two Boxes Compartments */}
        <div className="grid grid-cols-2 border border-black border-t-0 text-[10px] font-semibold">
          {/* Left Box: Amount in Words */}
          <div className="border-r border-black p-2 flex flex-col justify-between text-left">
            <div>
              <span className="text-gray-500 block mb-1 text-[9px]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Amount in Words :</span>
              <span className="font-bold text-[9px] block leading-tight text-gray-850 break-words" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                {numberToWords(sale.grandTotal)}
              </span>
            </div>
          </div>
          
          {/* Right Box: Invoice Totals */}
          <div className="p-2 space-y-0.5 text-left text-[9px]">
            <div className="flex justify-between">
              <span className="text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Subtotal:</span>
              <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Discount:</span>
                <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>-{formatCurrency(sale.discount)} / {discPercentStr}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-0.5 font-bold text-gray-900">
              <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Net Total:</span>
              <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Received:</span>
              <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-semibold">
              <span className="font-normal text-gray-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Pending:</span>
              <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(Math.max(0, sale.grandTotal - sale.paidAmount))}</span>
            </div>
            {sale.changeDue > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Change:</span>
                <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.changeDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Urdu Disclaimer Warranty Statement - Jameel Noori Nastaleeq Kasheeda */}
        <div 
          className="text-center py-1.5 text-[11px] font-medium text-gray-800 leading-relaxed" 
          style={{ 
            direction: 'rtl',
            fontFamily: 'Jameel Noori Nastaleeq Kasheeda, Jameel Noori Nastaleeq, Alvi Nastaleeq, Urdu Typesetting, Noto Nastaliq Urdu, sans-serif',
            fontWeight: 700
          }}
        >
          موبائل فون جس کمپنی کی وارنٹی میں ہو گا وہی کمپنی ذمہ دار ہو گی ۔ دوکاندار وارنٹی کلیم دینے کا پابند نہیں ہوگا
        </div>

        {/* User Manual Receipt Footer */}
        {receiptSettings.footer && (
          <div className="text-center text-[9px] font-semibold text-gray-800 pt-1.5 border-t border-dashed border-gray-300">
            <MultilineText text={receiptSettings.footer} />
          </div>
        )}

        {/* Thank You Message - Arial */}
        <div className="text-center text-[10px] font-bold text-gray-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          Thank you for shopping with us!
        </div>

        {/* Urdu Footer - Jameel Noori Nastaleeq Kasheeda */}
        <div 
          className="text-center text-[10px] font-medium text-gray-600" 
          style={{ 
            direction: 'rtl',
            fontFamily: 'Jameel Noori Nastaleeq Kasheeda, Jameel Noori Nastaleeq, Alvi Nastaleeq, Urdu Typesetting, Noto Nastaliq Urdu, sans-serif',
            fontWeight: 700
          }}
        >
          پی ٹی اے پروف کی کوئی گارنٹی فراہم نہیں کی جائے گی
        </div>

        {/* IMEI Barcode Section */}
        {!receiptSettings.hideBarcodes && !hideBarcodes && (() => {
          const extractImeis = (item: any) => {
            let imei1 = null;
            let imei2 = null;

            if (item.imei1) {
              imei1 = item.imei1;
            }
            if (item.imei2) {
              imei2 = item.imei2;
            }

            if (!imei1 && item.imei && item.imei.includes('||')) {
              const parts = item.imei.split('||');
              imei1 = parts[0] || null;
              imei2 = parts[1] || null;
            } else if (!imei1 && item.imei) {
              imei1 = item.imei;
            }

            return { imei1, imei2 };
          };

          const imeiItems = sale.items.filter(item => {
            const { imei1 } = extractImeis(item);
            return imei1 && imei1.trim() !== '';
          });

          if (imeiItems.length > 0) {
            return (
              <div className="border-t border-dashed border-gray-300 pt-3 flex flex-col items-center space-y-3 barcode-container no-print">
                <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>IMEI Barcodes</span>
                <div className="flex flex-col items-center gap-4 w-full">
                  {imeiItems.map((item, idx) => {
                    const { imei1, imei2 } = extractImeis(item);
                    return (
                      <div key={idx} className="w-full space-y-3">
                        {imei1 && (
                          <div className="flex flex-col items-center gap-1.5 border border-black p-2 bg-white rounded">
                            <span className="text-[9px] font-bold text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>IMEI 1: {imei1}</span>
                            <Barcode value={imei1} height={35} widthScale={1.2} />
                          </div>
                        )}
                        {imei2 && (
                          <div className="flex flex-col items-center gap-1.5 border border-black p-2 bg-white rounded">
                            <span className="text-[9px] font-bold text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>IMEI 2: {imei2}</span>
                            <Barcode value={imei2} height={35} widthScale={1.2} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Bottom Metadata Line - Arial */}
        <div className="flex justify-end text-[8px] text-gray-400 border-t pt-1.5 mt-1.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div>Time: <span className="font-medium text-gray-600" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{formattedTime}</span></div>
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

  // Screen layout
  return (
    <div
      id={id}
      style={{ width: screenWidth }}
      className={cn('space-y-4 text-sm text-gray-800 p-4 bg-white rounded-lg shadow-sm border border-gray-100 mx-auto', className)}
    >
      <div className="text-center">
          {receiptSettings.showLogo ? (
            <div className="mx-auto mb-2 flex items-center justify-center w-16 h-16"> 
              <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <>
              <h2 className="font-bold text-gray-900 text-xl uppercase tracking-wide" style={{ fontFamily: 'Arial Black, Arial, Helvetica, sans-serif' }}>{shopNameText}</h2>
              <div className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                {companyAddress.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
              {shopPhoneText && <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Times New Roman, Times, serif' }}>{shopPhoneText}</p>}
              {shopEmailText && <p className="text-xs text-gray-500" style={{ fontFamily: 'Times New Roman, Times, serif' }}>{shopEmailText}</p>}
            </>
          )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Customer</p>
            <p className="font-semibold text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{customerName}</p>
          </div>
          {customerPhone && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Phone</p>
              <p className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{customerPhone}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-right">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Inv #</p>
            <p className="font-semibold text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{sale.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Date</p>
            <p className="text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatDate(sale.createdAt, shopSettings.dateFormat)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Payment</p>
            <p className="text-gray-900 uppercase" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{paymentLabel}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 font-semibold border-b border-gray-100">
              <th className="text-left pb-1.5 w-8" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>SR</th>
              <th className="text-left pb-1.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Item Description</th>
              <th className="text-left pb-1.5 w-16" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Rate</th>
              <th className="text-left pb-1.5 w-16" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item, index) => {
              let imei1 = null;
              let imei2 = null;

              if (item.imei1) {
                imei1 = item.imei1;
              }
              if (item.imei2) {
                imei2 = item.imei2;
              }

              if (!imei1 && item.imei && item.imei.includes('||')) {
                const parts = item.imei.split('||');
                imei1 = parts[0] || null;
                imei2 = parts[1] || null;
              } else if (!imei1 && item.imei) {
                imei1 = item.imei;
              }

              return (
                <tr key={index} className="text-gray-700">
                  <td className="py-1.5 align-top" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{index + 1}</td>
                  <td className="py-1.5 align-top break-words">
                    <div className="font-semibold text-gray-900" style={{ fontFamily: 'Times New Roman, Times, serif' }}>{parseProductName(item.productName)}</div>
                  </td>
                  <td className="py-1.5 align-top text-left whitespace-nowrap" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(item.unitPrice)}</td>
                  <td className="py-1.5 align-top text-left whitespace-nowrap font-medium" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span className="font-medium" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Total Qty:</span>
          <span className="font-medium text-right text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>

          <span className="font-medium" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Subtotal:</span>
          <span className="font-medium text-right text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.subtotal)}</span>

          {sale.discount > 0 && (
            <>
              <span className="font-medium text-red-600" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Discount:</span>
              <span className="text-right text-red-600" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>-{formatCurrency(sale.discount)} / {discPercentStr}</span>
            </>
          )}
        </div>

        <div className="border-t border-b border-gray-300 py-2 my-2 flex justify-between font-bold text-sm text-gray-900">
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Net Total:</span>
          <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.grandTotal)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="font-medium" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Received:</span>
          <span className="text-right font-medium text-gray-900" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.paidAmount)}</span>

          <span className="font-medium" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Pending:</span>
          <span className="text-right font-semibold text-amber-600" style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(Math.max(0, sale.grandTotal - sale.paidAmount))}</span>
        </div>

        {sale.changeDue > 0 && (
          <div className="flex justify-between text-green-600 font-medium text-xs">
            <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Change:</span>
            <span style={{ fontFamily: 'Tahoma, Arial, Helvetica, sans-serif' }}>{formatCurrency(sale.changeDue)}</span>
          </div>
        )}
      </div>

      <div className="h-4" />

      {/* Footer/Terms */}
      {(receiptSettings.footer || receiptSettings.termsAndConditions) && (
        <div className="text-center text-[11px] text-gray-500 border-t pt-3 space-y-2"> 
          {receiptSettings.termsAndConditions && (
            <MultilineText text={receiptSettings.termsAndConditions} className="leading-relaxed italic" />
          )}
          {receiptSettings.footer ? (
            <MultilineText text={receiptSettings.footer} className="font-semibold text-gray-800 text-xs mt-1" />
          ) : (
            <p className="font-semibold text-gray-800 text-xs mt-1" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Thank You For Purchase</p>
          )}
        </div>
      )}
    </div>
  );
}
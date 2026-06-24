import { useEffect } from 'react';
import type { Sale, ShopSettings, ReceiptSettings } from '@/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';
import { useCustomerStore } from '@/stores/customerStore';
import { useSaleStore } from '@/stores/saleStore';
import { useProductStore } from '@/stores/productStore';
import { useImeiStore } from '@/stores/imeiStore';
import Barcode from './Barcode';

interface InvoiceReceiptProps {
  sale: Sale;
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

// Helper to extract IMEIs
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

function wrapText(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + (current ? ' ' : '') + w).length <= width) {
      current = current ? `${current} ${w}` : w;
    } else {
      if (current) lines.push(current);
      // if single word longer than width, hard-slice it
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
}: InvoiceReceiptProps) {
  const paymentLabel = sale.paymentMethod.replace(/_/g, ' ');
  const printWidth = receiptSettings.receiptWidth === '58mm' ? 32 : 46;
  const headerLines = receiptSettings.header?.split('\n').filter(Boolean) ?? [];
  const customerName = sale.customerName?.trim() || 'OPENING CASH SALE';

  // Retrieve customer details from customer store
  const { getCustomerById } = useCustomerStore();
  const customer = sale.customerId ? getCustomerById(sale.customerId) : undefined;
  const customerPhone = customer?.phone || '';
  const customerAddress = customer?.address || '';
  
  const companyAddress = shopSettings.address ? shopSettings.address.split('\n') : [];
  const shopNameText = shopSettings.shopName?.trim()?.toUpperCase() || 'ALI MOBILES';
  const shopPhoneText = shopSettings.phone ? `Phone: ${shopSettings.phone}` : '';
  const shopEmailText = shopSettings.email ? `Email: ${shopSettings.email}` : '';
  const screenWidth = receiptSettings.receiptWidth === '58mm' ? 220 : 320;

  // Retrieve stores for product and IMEI details
  const { getProductById } = useProductStore();
  const { findByImei } = useImeiStore();

  // Retrieve all sales for previous balance calculation
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

    // Header: Show store name & address only if logo is NOT enabled
    // Logo display is handled separately and both are independent
    if (!receiptSettings.showLogo) {
      if (shopNameText) {
        const dividerLength = printWidth - shopNameText.length - 1;
        if (dividerLength > 0) {
          lines.push(`${shopNameText} ${'='.repeat(dividerLength)}`);
        } else {
          lines.push(centerText(shopNameText, printWidth));
        }
      }
    }
    // Address always shown
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
    lines.push(padText('Invoice #:', 12) + padText(sale.invoiceNumber, printWidth - 12, 'right'));
    lines.push(padText('Date:', 12) + padText(formatDate(sale.createdAt, shopSettings.dateFormat), printWidth - 12, 'right'));
    lines.push(padText('Customer:', 12) + padText(customerName, printWidth - 12, 'right'));
    if (customerPhone) {
      lines.push(padText('Phone:', 12) + padText(customerPhone, printWidth - 12, 'right'));
    }
    lines.push(padText('Payment:', 12) + padText(paymentLabel.toUpperCase(), printWidth - 12, 'right'));
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

    // Items List
    sale.items.forEach((item, index) => {
      const snoStr = padText(String(index + 1), snoWidth, 'left');
      const nameLines = wrapText(item.productName, productWidth);
      const qtyStr = padText(String(item.quantity), qtyWidth, 'right');
      const totalStr = padText(formatAmount(item.total), totalWidth, 'right');

      lines.push(snoStr + separator + padText(nameLines[0] || '', productWidth, 'left') + separator + qtyStr + separator + totalStr);
      for (let i = 1; i < nameLines.length; i++) {
        lines.push(padText('', snoWidth) + separator + padText(nameLines[i], productWidth, 'left') + separator + padText('', qtyWidth) + separator + padText('', totalWidth));
      }
    });
    lines.push('-'.repeat(printWidth));

    // Summary Calculations
    const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    lines.push(padText('Total Qty:', 15) + padText(String(totalQty), printWidth - 15, 'right'));
    lines.push(padText('Subtotal:', 15) + padText(formatAmount(sale.subtotal), printWidth - 15, 'right'));
    if (sale.discount > 0) {
      lines.push(padText('Discount:', 15) + padText(`-{formatAmount(sale.discount)}`, printWidth - 15, 'right'));
    }

    // Net Total (prominent in === borders)
    lines.push('='.repeat(printWidth));
    lines.push(padText('NET TOTAL:', 15) + padText(formatAmount(sale.grandTotal), printWidth - 15, 'right'));
    lines.push('='.repeat(printWidth));

    // Paid & Due
    const dueAmount = Math.max(0, sale.grandTotal - sale.paidAmount);
    lines.push(padText('Received:', 15) + padText(formatAmount(sale.paidAmount), printWidth - 15, 'right'));
    lines.push(padText('Due:', 15) + padText(formatAmount(dueAmount), printWidth - 15, 'right'));
    if (sale.changeDue > 0) {
      lines.push(padText('Change:', 15) + padText(formatAmount(sale.changeDue), printWidth - 15, 'right'));
    }

    // Terms (Printed first)
    if (termsLines.length > 0) {
      termsLines.forEach(line => {
        if (line.trim() === '') {
          lines.push('');
        } else {
          lines.push(centerText(line, printWidth));
        }
      });
    }

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
      lines.push(centerText('Thank You For Purchase', printWidth));
    }

    return lines;
  };

  // Render A4 invoice layout
  if (layout === 'a4') {
    const invBalance = sale.grandTotal - sale.paidAmount;
    
    // Previous balance calculation: all sales of this customer created strictly before this sale
    const customerSales = sale.customerId
      ? sales.filter(s => s.customerId === sale.customerId && s.id !== sale.id && new Date(s.createdAt).getTime() < new Date(sale.createdAt).getTime() && s.status !== 'cancelled')
      : [];
    const previousBalance = customerSales.reduce((sum, s) => sum + (s.grandTotal - s.paidAmount), 0);
    const currentBalance = previousBalance + invBalance;

    const formattedTime = formatDate(sale.createdAt, 'hh:mm a');

    // Calculate general discount percent of the sale
    const discountPercent = sale.subtotal > 0 ? (sale.discount / sale.subtotal) * 100 : 0;
    const discPercentStr = discountPercent > 0 ? `${discountPercent.toFixed(2).replace(/\.00$/, '')}%` : '0.00%';

    return (
      <div
        id={id}
        className={cn(
          'wide-invoice w-full max-w-[800px] bg-white text-black p-6 border border-gray-300 shadow-md font-sans text-xs space-y-4 mx-auto',
          className
        )}
      >
        {/* Header: Logo OR Store Name (mutually exclusive), but address/phone always shown */}
        {receiptSettings.showLogo && (
          <div className="mx-auto mb-2 flex items-center justify-center w-20 h-20"> 
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}

        {!receiptSettings.showLogo && (
          <h2 className="font-extrabold text-[#1e3a8a] text-2xl uppercase tracking-wider text-center">{shopNameText}</h2>
        )}

        {/* Address and Contact - Always shown */}
        <div className="text-center text-xs font-semibold text-gray-700 leading-normal">
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

        {/* Invoice Type Label */}
        <div className="pt-2 text-center">
          <span className="text-lg font-bold border-b-2 border-black inline-block px-4 pb-0.5 uppercase tracking-wide">
            Sale Invoice
          </span>
        </div>

        {/* Customer & Invoice Meta Box */}
        <table className="w-full border-collapse border border-black text-[12px] font-bold">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 w-[60%] border-r border-black text-left">
                <span className="font-normal text-gray-500">Customer : </span>
                <span className="text-gray-900">{sale.customerName || 'Walk-in Customer'}</span>
              </td>
              <td className="p-2 w-[40%] text-left">
                <span className="font-normal text-gray-500">Inv # : </span>
                <span className="text-gray-900">{sale.invoiceNumber}</span>
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black text-left">
                <span className="font-normal text-gray-500">Address : </span>
                <span className="text-gray-900">{customerAddress || '___________________________'}</span>
              </td>
              <td className="p-2 text-left">
                <span className="font-normal text-gray-500">Payment : </span>
                <span className="text-gray-900 uppercase">{paymentLabel}</span>
              </td>
            </tr>
            <tr>
              <td className="p-2 border-r border-black text-left">
                <span className="font-normal text-gray-500">Phone : </span>
                <span className="text-gray-900">{customerPhone || '____________'}</span>
              </td>
              <td className="p-2 text-left">
                <span className="font-normal text-gray-500">Date : </span>
                <span className="text-gray-900">{formatDate(sale.createdAt, 'dd/MM/yyyy')}</span>
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
              <th className="border border-black p-2 text-left w-20">Color</th>
              <th className="border border-black p-2 text-left w-20">Storage</th>
              <th className="border border-black p-2 text-center w-12">Qty</th>
              <th className="border border-black p-2 text-right w-24">Price</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => {
              const rate = item.unitPrice;
              const product = getProductById(item.productId);
              const imeiRecord = (item.imei1 || item.imei) ? findByImei(item.imei1 || item.imei || '') : undefined;
              const color = item.color || imeiRecord?.color || '';
              const ram = item.ram || imeiRecord?.ram || '';
              const storage = item.storage || imeiRecord?.storage || '';

              let ptaStatus = item.ptaStatus || '';
              if (!ptaStatus) {
                if (product?.description?.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(product.description);
                    ptaStatus = parsed.ptaStatus || '';
                  } catch (e) {}
                }
              }

              let displayPta = '';
              if (ptaStatus.toLowerCase() === 'approved') {
                displayPta = 'Approved';
              } else if (ptaStatus.toLowerCase() === 'non-approved' || ptaStatus.toLowerCase() === 'non-pta') {
                displayPta = 'Non-PTA';
              }

              let displayVariant = '';
              if (ram && storage) {
                displayVariant = `${ram}/${storage}`;
              } else if (storage) {
                displayVariant = storage;
              } else if (ram) {
                displayVariant = ram;
              }

              return (
                <tr key={index} className="text-[12px] hover:bg-gray-50">
                  <td className="border border-black p-2 text-center align-top">{index + 1}</td>
                  <td className="border border-black p-2 text-left align-top">
                    <div className="font-bold uppercase">{item.productName}</div>
                    {displayPta && <div className="text-[10px] text-gray-700 font-semibold mt-0.5 normal-case">PTA: {displayPta}</div>}
                  </td>
                  <td className="border border-black p-2 text-left align-top uppercase">{color || '-'}</td>
                  <td className="border border-black p-2 text-left align-top uppercase">{displayVariant || '-'}</td>
                  <td className="border border-black p-2 text-center align-top">{item.quantity}</td>
                  <td className="border border-black p-2 text-right align-top font-bold">{formatCurrency(rate)}</td>
                </tr>
              );
            })}
            {/* Total summary row */}
            <tr className="bg-gray-100 font-bold border-t border-black text-xs">
              <td className="border border-black p-2 text-center font-bold" colSpan={4}>
                Total :
              </td>
              <td className="border border-black p-2 text-center">
                {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
              <td className="border border-black p-2 text-right font-bold">
                {formatCurrency(sale.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
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
                {numberToWords(sale.grandTotal)}
              </span>
            </div>
          </div>
          
          {/* Right Box: Invoice Totals */}
          <div className="p-2 space-y-1 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)} / {discountPercent.toFixed(2).replace(/\.00$/, '')}%</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-1 font-bold text-gray-900">
              <span>Net Total:</span>
              <span>{formatCurrency(sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="font-normal text-gray-500">Received:</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-semibold">
              <span className="font-normal text-gray-500">Due:</span>
              <span>{formatCurrency(Math.max(0, sale.grandTotal - sale.paidAmount))}</span>
            </div>
            {sale.changeDue > 0 && (
              <div className="flex justify-between text-green-700 font-medium text-xs">
                <span>Change:</span>
                <span>{formatCurrency(sale.changeDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Urdu Disclaimer Warranty Statement */}
        <div className="text-center py-2 text-[13px] font-medium text-gray-800 leading-relaxed font-sans" style={{ direction: 'rtl' }}>
          موبائل فون جس کمپنی کی وارنٹی میں ہو گا وہی کمپنی ذمہ دار ہو گی ۔ دوکاندار وارنٹی کلیم دینے کا پابند نہیں ہوگا
        </div>

        {/* User Manual Receipt Footer */}
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
          const imeiItems = sale.items.filter(item => {
            const { imei1 } = extractImeis(item);
            return imei1 && imei1.trim() !== '';
          });

          if (imeiItems.length > 0) {
            return (
              <div className="border-t border-dashed border-gray-300 pt-4 flex flex-col items-center space-y-4 barcode-container">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">IMEI Barcodes</span>
                <div className="flex flex-col items-center gap-6 w-full">
                  {imeiItems.map((item, idx) => {
                    const { imei1, imei2 } = extractImeis(item);
                    return (
                      <div key={idx} className="w-full space-y-4">
                        {/* IMEI 1 Barcode */}
                        {imei1 && (
                          <div className="flex flex-col items-center gap-2 border border-black p-3 bg-white rounded">
                            <span className="text-[11px] font-bold text-black">IMEI 1: {imei1}</span>
                            <Barcode value={imei1} height={45} widthScale={1.3} />
                          </div>
                        )}

                        {/* IMEI 2 Barcode */}
                        {imei2 && (
                          <div className="flex flex-col items-center gap-2 border border-black p-3 bg-white rounded">
                            <span className="text-[11px] font-bold text-black">IMEI 2: {imei2}</span>
                            <Barcode value={imei2} height={45} widthScale={1.3} />
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

        {/* Bottom Metadata Line */}
        <div className="flex justify-end text-[10px] text-gray-400 border-t pt-2 mt-2">
          <div>Time: <span className="font-medium text-gray-600">{formattedTime}</span></div>
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

          {!receiptSettings.showLogo && (
            <h2 className="font-bold text-gray-900 text-xl uppercase tracking-wide">{shopNameText}</h2>
          )}

          <div className="text-xs text-gray-500 mt-1">
            {companyAddress.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          {shopPhoneText && <p className="text-xs text-gray-500 mt-1">{shopPhoneText}</p>}
          {shopEmailText && <p className="text-xs text-gray-500">{shopEmailText}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Customer</p>
            <p className="font-semibold text-gray-900">{customerName}</p>
          </div>
          {customerPhone && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-gray-900">{customerPhone}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-right">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Inv #</p>
            <p className="font-semibold text-gray-900">{sale.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-gray-900">{formatDate(sale.createdAt, shopSettings.dateFormat)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Payment</p>
            <p className="text-gray-900 uppercase">{paymentLabel}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-2">
        <table className="items-table w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-500 font-semibold border-b border-gray-150 text-[11px]">
              <th className="text-center pb-1.5 w-8">Sr#</th>
              <th className="text-left pb-1.5">Item Description</th>
              <th className="text-left pb-1.5 w-12">Color</th>
              <th className="text-left pb-1.5 w-16">Storage</th>
              <th className="text-center pb-1.5 w-8">Qty</th>
              <th className="text-right pb-1.5 w-24">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item, index) => {
              const rate = item.unitPrice;
              const product = getProductById(item.productId);
              const imeiRecord = (item.imei1 || item.imei) ? findByImei(item.imei1 || item.imei || '') : undefined;
              const color = item.color || imeiRecord?.color || '';
              const ram = item.ram || imeiRecord?.ram || '';
              const storage = item.storage || imeiRecord?.storage || '';

              let ptaStatus = item.ptaStatus || '';
              if (!ptaStatus) {
                if (product?.description?.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(product.description);
                    ptaStatus = parsed.ptaStatus || '';
                  } catch (e) {}
                }
              }

              let displayPta = '';
              if (ptaStatus.toLowerCase() === 'approved') {
                displayPta = 'Approved';
              } else if (ptaStatus.toLowerCase() === 'non-approved' || ptaStatus.toLowerCase() === 'non-pta') {
                displayPta = 'Non-PTA';
              }

              let displayVariant = '';
              if (ram && storage) {
                displayVariant = `${ram}/${storage}`;
              } else if (storage) {
                displayVariant = storage;
              } else if (ram) {
                displayVariant = ram;
              }

              return (
                <tr key={index} className="text-gray-700">
                  <td className="py-1.5 align-top text-center">{index + 1}</td>
                  <td className="py-1.5 align-top break-words">
                    <div className="font-semibold text-gray-900 uppercase">{item.productName}</div>
                    {displayPta && <div className="text-[10px] text-gray-650 font-medium mt-0.5">PTA: {displayPta}</div>}
                  </td>
                  <td className="py-1.5 align-top uppercase">{color || '-'}</td>
                  <td className="py-1.5 align-top uppercase">{displayVariant || '-'}</td>
                  <td className="py-1.5 align-top text-center">{item.quantity}</td>
                  <td className="py-1.5 align-top text-right font-medium">{formatCurrency(rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span className="font-medium">Total Qty:</span>
          <span className="font-medium text-right text-gray-900">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>

          <span className="font-medium">Subtotal:</span>
          <span className="font-medium text-right text-gray-900">{formatCurrency(sale.subtotal)}</span>

          {sale.discount > 0 && (
            <>
              <span className="font-medium text-red-600">Discount:</span>
              <span className="text-right text-red-600">-{formatCurrency(sale.discount)} / {((sale.discount / (sale.subtotal || 1)) * 100).toFixed(2).replace(/\.00$/, '')}%</span>
            </>
          )}
        </div>

        <div className="border-t border-b border-gray-300 py-2 my-2 flex justify-between font-bold text-sm text-gray-900">
          <span>Net Total:</span>
          <span>{formatCurrency(sale.grandTotal)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="font-medium">Received:</span>
          <span className="text-right font-medium text-gray-900">{formatCurrency(sale.paidAmount)}</span>

          <span className="font-medium">Due:</span>
          <span className="text-right font-semibold text-amber-600">{formatCurrency(Math.max(0, sale.grandTotal - sale.paidAmount))}</span>
        </div>

        {sale.changeDue > 0 && (
          <div className="flex justify-between text-green-600 font-medium text-xs">
            <span>Change:</span>
            <span>{formatCurrency(sale.changeDue)}</span>
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
            <p className="font-semibold text-gray-800 text-xs mt-1">Thank You For Purchase</p>
          )}
        </div>
      )}
    </div>
  );
}

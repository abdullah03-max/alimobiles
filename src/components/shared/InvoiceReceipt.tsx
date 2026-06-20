import type { Sale, ShopSettings, ReceiptSettings } from '@/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';
import { useCustomerStore } from '@/stores/customerStore';

interface InvoiceReceiptProps {
  sale: Sale;
  shopSettings: ShopSettings;
  receiptSettings: ReceiptSettings;
  taxName?: string;
  taxRate?: number;
  className?: string;
  id?: string;
  screen?: boolean;
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

export default function InvoiceReceipt({
  sale,
  shopSettings,
  receiptSettings,
  taxName,
  taxRate,
  className,
  id,
  screen = false,
}: InvoiceReceiptProps) {
  const paymentLabel = sale.paymentMethod.replace(/_/g, ' ');
  const printWidth = receiptSettings.receiptWidth === '58mm' ? 32 : 46;
  const headerLines = receiptSettings.header?.split('\n').filter(Boolean) ?? [];
  const customerName = sale.customerName?.trim() || 'OPENING CASH SALE';

  // Retrieve customer phone number from customer store
  const { getCustomerById } = useCustomerStore();
  const customer = sale.customerId ? getCustomerById(sale.customerId) : undefined;
  const customerPhone = customer?.phone || '';

  const buildReceiptLines = () => {
    const lines: string[] = [];
    const footerLinesRaw = receiptSettings.footer?.split('\n') ?? [];
    const termsLinesRaw = receiptSettings.termsAndConditions?.split('\n') ?? [];
    const addressRaw = (headerLines && headerLines.length > 0) ? headerLines : (shopSettings.address ? shopSettings.address.split('\n') : []);

    const addressLines = addressRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));
    const footerLines = footerLinesRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));
    const termsLines = termsLinesRaw.flatMap(l => l.trim() === '' ? [''] : wrapText(l, printWidth));

    // Header Shop Name & Address
    if (shopSettings.shopName) {
      lines.push(centerText(shopSettings.shopName.toUpperCase(), printWidth));
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
    lines.push(''); // spacing line before meta info

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
      lines.push(padText('Discount:', 15) + padText(`-${formatAmount(sale.discount)}`, printWidth - 15, 'right'));
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

    // Spacing blank space instead of signatures
    lines.push('');
    lines.push('');

    // Terms (Printed first)
    if (termsLines.length > 0) {
      termsLines.forEach(line => {
        if (line.trim() === '') {
          lines.push('');
        } else {
          lines.push(centerText(line, printWidth));
        }
      });
      lines.push('');
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

    // Add extra empty lines at the bottom to ensure the printer feeds the text completely past the cutter.
    // Use '\u00A0' (non-breaking space) to prevent the browser from collapsing/ignoring trailing empty lines in the <pre> tag.
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');
    lines.push('\u00A0');

    return lines;
  };

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
      className={cn('space-y-4 text-sm text-gray-800 p-4 bg-white rounded-lg shadow-sm border border-gray-100 max-w-[400px] mx-auto', className)}
    >
      {/* Header */}
      <div className="text-center pb-3 border-b border-gray-100">
        {receiptSettings.showLogo && (
          <div className="mx-auto mb-2 flex items-center justify-center w-12 h-12"> 
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className="font-bold text-gray-900 text-lg uppercase tracking-wide">{shopSettings.shopName}</h2>
        <MultilineText
          text={receiptSettings.header}
          className="text-xs mt-1 text-gray-500 whitespace-pre-wrap"
        />
        {shopSettings.phone && (
          <p className="text-xs mt-1 text-gray-400">
            Phone: {shopSettings.phone}
          </p>
        )}
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-600">
        <span className="font-medium">Invoice #:</span>
        <span className="font-semibold text-gray-900 text-right">{sale.invoiceNumber}</span>
        
        <span className="font-medium">Date:</span>
        <span className="text-right">{formatDate(sale.createdAt, shopSettings.dateFormat)}</span>
        
        <span className="font-medium">Customer:</span>
        <span className="font-semibold text-gray-900 text-right">{customerName}</span>
        
        {customerPhone && (
          <>
            <span className="font-medium">Phone:</span>
            <span className="text-right">{customerPhone}</span>
          </>
        )}
        
        <span className="font-medium">Payment:</span>
        <span className="font-semibold text-gray-900 uppercase text-right">{paymentLabel}</span>
      </div>

      {/* Items Table */}
      <div className="border-t border-b border-gray-200 py-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 font-semibold border-b border-gray-100">
              <th className="text-left pb-1.5 w-8">SNo</th>
              <th className="text-left pb-1.5">Product</th>
              <th className="text-right pb-1.5 w-10">Qty</th>
              <th className="text-right pb-1.5 w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item, index) => (
              <tr key={index} className="text-gray-700">
                <td className="py-1.5 align-top">{index + 1}</td>
                <td className="py-1.5 align-top break-words">{item.productName}</td>
                <td className="py-1.5 align-top text-right">{item.quantity}</td>
                <td className="py-1.5 align-top text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total Qty:</span>
          <span className="font-medium text-gray-900">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-medium text-gray-900">{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}
        
        {/* Net Total Block */}
        <div className="border-t border-b border-dashed border-gray-300 py-2 my-2 flex justify-between font-bold text-sm text-gray-900">
          <span>NET TOTAL:</span>
          <span>{formatCurrency(sale.grandTotal)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Received:</span>
          <span className="font-medium text-gray-900">{formatCurrency(sale.paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Due:</span>
          <span className="font-semibold text-amber-600">{formatCurrency(Math.max(0, sale.grandTotal - sale.paidAmount))}</span>
        </div>
        {sale.changeDue > 0 && (
          <div className="flex justify-between text-green-600 font-medium">
            <span>Change:</span>
            <span>{formatCurrency(sale.changeDue)}</span>
          </div>
        )}
      </div>

      {/* Spacing blank space instead of signatures */}
      <div className="h-6" />

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

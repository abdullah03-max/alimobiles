import type { Sale, ShopSettings, ReceiptSettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';

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
  const taxLabel = taxName
    ? typeof taxRate === 'number' && taxRate > 0
      ? `${taxName} Tax (${taxRate}%)`
      : `${taxName} Tax`
    : 'Tax';

  return (
    <div
      id={id}
      className={cn(
        screen ? 'space-y-3 text-sm text-gray-800' : 'text-center',
        className,
      )}
    >
      <div className={cn(screen ? 'text-center border-b border-gray-200 pb-3' : 'border-b my-1 py-1')}>
        {receiptSettings.showLogo && (
          <div className={cn('mx-auto mb-2 flex items-center justify-center', screen ? 'w-12 h-12' : 'h-8')}>
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className={cn('font-bold text-gray-900', screen ? 'text-xl' : 'text-base')}>
          {shopSettings.shopName}
        </h2>
        <MultilineText
          text={receiptSettings.header}
          className={cn('text-gray-600', screen ? 'text-sm mt-2' : 'text-xs mt-1')}
        />
        {shopSettings.phone && (
          <p className={cn('text-gray-500', screen ? 'text-sm mt-1' : 'text-xs mt-1')}>
            Phone: {shopSettings.phone}
          </p>
        )}
      </div>

      <div className={screen ? 'grid grid-cols-2 gap-2 text-sm' : 'text-left text-xs py-1 space-y-1'}>
        {screen ? (
          <>
            <span className="text-gray-500">Invoice:</span>
            <span className="font-medium">{sale.invoiceNumber}</span>
            <span className="text-gray-500">Date:</span>
            <span>{formatDate(sale.createdAt, shopSettings.dateFormat)}</span>
            <span className="text-gray-500">Customer:</span>
            <span className="font-medium">{sale.customerName}</span>
            <span className="text-gray-500">Payment:</span>
            <span><StatusBadge status={sale.paymentMethod} /></span>
            <span className="text-gray-500">Status:</span>
            <span><StatusBadge status={sale.status} /></span>
          </>
        ) : (
          <>
            <div className="flex justify-between"><span>Invoice:</span><span>{sale.invoiceNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{formatDate(sale.createdAt, shopSettings.dateFormat)}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{sale.customerName}</span></div>
            <div className="flex justify-between capitalize"><span>Payment:</span><span>{paymentLabel}</span></div>
            <div className="flex justify-between capitalize"><span>Status:</span><span>{sale.status}</span></div>
          </>
        )}
      </div>

      <div className={cn(screen ? 'border rounded-lg overflow-hidden' : 'border-t border-b my-1 py-1')}>
        <table className={cn('w-full', screen ? 'text-sm' : 'text-xs')}>
          <thead className={screen ? 'bg-gray-50' : undefined}>
            <tr className={screen ? undefined : 'border-b'}>
              <th className={cn('text-left px-3 py-2', screen ? 'text-xs text-gray-500' : 'font-bold')}>Product</th>
              <th className={cn('text-center px-3 py-2', screen ? 'text-xs text-gray-500' : 'font-bold')}>Qty</th>
              <th className={cn('text-right px-3 py-2', screen ? 'text-xs text-gray-500' : 'font-bold')}>Price</th>
              <th className={cn('text-right px-3 py-2', screen ? 'text-xs text-gray-500' : 'font-bold')}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={index} className={screen ? 'border-t border-gray-100' : undefined}>
                <td className="px-3 py-2 text-left">{item.productName}</td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn(screen ? 'space-y-1 text-sm border-t pt-2' : 'text-left text-xs py-1')}>{/* taxLabel is used below to keep label consistent with settings */}
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-orange-500"><span>Discount</span><span>-{formatCurrency(sale.discount)}</span></div>
        )}
        {receiptSettings.showTaxBreakdown && (
          <div className="flex justify-between">
            <span>{taxLabel}</span>
            <span>{formatCurrency(sale.tax)}</span>
          </div>
        )}
        <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(sale.paidAmount)}</span></div>
        {sale.changeDue > 0 && (
          <div className="flex justify-between text-green-600"><span>Change</span><span>{formatCurrency(sale.changeDue)}</span></div>
        )}
        <div className={cn('flex justify-between font-semibold', screen ? 'text-base' : 'font-bold border-t pt-1 mt-1')}>
          <span>Grand Total</span>
          <span className="text-orange-500">{formatCurrency(sale.grandTotal)}</span>
        </div>
      </div>

      {(receiptSettings.footer || receiptSettings.termsAndConditions) && (
        <div className={cn('text-center text-gray-600', screen ? 'border-t pt-3 text-sm' : 'border-t my-1 py-1 text-xs')}>
          <MultilineText text={receiptSettings.footer} />
          <MultilineText text={receiptSettings.termsAndConditions} className="mt-2" />
        </div>
      )}
    </div>
  );
}

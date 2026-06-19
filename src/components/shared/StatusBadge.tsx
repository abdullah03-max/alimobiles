import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-600' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600' },
  paid: { label: 'Paid', className: 'bg-green-50 text-green-600' },
  pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-600' },
  partial: { label: 'Partial', className: 'bg-blue-50 text-blue-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-600' },
  refunded: { label: 'Refunded', className: 'bg-blue-50 text-blue-600' },
  received: { label: 'Received', className: 'bg-green-50 text-green-600' },
  'in_stock': { label: 'In Stock', className: 'bg-green-50 text-green-600' },
  'low_stock': { label: 'Low Stock', className: 'bg-yellow-50 text-yellow-600' },
  'out_of_stock': { label: 'Out of Stock', className: 'bg-red-50 text-red-600' },
  cash: { label: 'Cash', className: 'bg-green-50 text-green-600' },
  card: { label: 'Card', className: 'bg-blue-50 text-blue-600' },
  bank_transfer: { label: 'Bank', className: 'bg-purple-50 text-purple-600' },
  jazzcash: { label: 'JazzCash', className: 'bg-red-50 text-red-600' },
  easypaisa: { label: 'EasyPaisa', className: 'bg-green-50 text-green-700' },
  credit: { label: 'Credit', className: 'bg-orange-50 text-orange-600' },
  new: { label: 'New', className: 'bg-green-50 text-green-600' },
  used: { label: 'Used', className: 'bg-yellow-50 text-yellow-600' },
  refurbished: { label: 'Refurbished', className: 'bg-blue-50 text-blue-600' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status.toLowerCase()] || { label: status, className: 'bg-gray-100 text-gray-600' };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string; isPositive?: boolean };
  className?: string;
}

export default function KpiCard({ title, value, isCurrency, icon: Icon, iconBg, iconColor, trend, className }: KpiCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium',
            trend.isPositive !== false ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive !== false ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">
          {isCurrency ? formatCurrency(animatedValue) : formatNumber(animatedValue)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      </div>
      {trend && (
        <p className="text-xs text-gray-400 mt-1">{trend.label}</p>
      )}
    </div>
  );
}

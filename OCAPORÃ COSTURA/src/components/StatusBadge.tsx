import type { StockStatus } from '@/types';
import { STOCK_STATUS_ICONS, STOCK_STATUS_LABELS } from '@/constants';

interface StatusBadgeProps {
  status: StockStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusColors: Record<StockStatus, string> = {
  ESTOQUE_OK: 'bg-success-100 text-success-700 border-success-200',
  ESTOQUE_BAIXO: 'bg-warning-100 text-warning-700 border-warning-200',
  SEM_ESTOQUE: 'bg-danger-100 text-danger-700 border-danger-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide',
        statusColors[status],
        sizeClasses[size],
      ].join(' ')}
    >
      {showIcon && <span aria-hidden="true">{STOCK_STATUS_ICONS[status]}</span>}
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  colorClass?: string;
  onClick?: () => void;
}

export function MetricCard({
  icon,
  label,
  value,
  colorClass = 'bg-white border-slate-200',
  onClick,
}: MetricCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'flex flex-col items-start gap-1 rounded-2xl border p-4 text-left shadow-sm',
        colorClass,
        onClick ? 'cursor-pointer transition-transform active:scale-[0.98] hover:shadow-md' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </Component>
  );
}

interface StockCardProps {
  title: string;
  subtitle?: string;
  department?: string;
  available: number;
  quantityLabel?: string;
  status: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

export function StockCard({
  title,
  subtitle,
  department,
  available,
  quantityLabel = 'disponíveis',
  status,
  footer,
  onClick,
}: StockCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm',
        onClick ? 'cursor-pointer transition-all hover:shadow-md active:scale-[0.99]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {department && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{department}</p>}
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="shrink-0">{status}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-brand-700">{available}</span>
        <span className="text-sm text-slate-500">{quantityLabel}</span>
      </div>
      {footer && <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div>}
    </Component>
  );
}

export function ProductCard({
  name,
  size,
  available,
  quantityLabel,
  status,
  inProduction,
  inRepair,
  onClick,
}: {
  name: string;
  size: string;
  available: number;
  quantityLabel?: string;
  status: ReactNode;
  inProduction?: number;
  inRepair?: number;
  onClick?: () => void;
}) {
  return (
    <StockCard
      title={name}
      subtitle={`Tamanho: ${size}`}
      available={available}
      quantityLabel={quantityLabel}
      status={status}
      onClick={onClick}
      footer={
        (inProduction ?? 0) > 0 || (inRepair ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-3 text-sm">
            {(inProduction ?? 0) > 0 && (
              <span className="text-production-600">
                ✂️ {inProduction} em produção
              </span>
            )}
            {(inRepair ?? 0) > 0 && (
              <span className="text-repair-600">
                🔧 {inRepair} em conserto
              </span>
            )}
          </div>
        ) : undefined
      }
    />
  );
}

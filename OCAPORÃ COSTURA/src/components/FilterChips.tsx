import type { StockFilter } from '@/constants';
import { STOCK_FILTER_OPTIONS } from '@/constants';

interface FilterChipsProps {
  value: StockFilter;
  onChange: (value: StockFilter) => void;
}

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {STOCK_FILTER_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Scissors, Wrench } from 'lucide-react';
import { NAV_ITEMS } from '@/constants';

const iconMap = {
  Home,
  Package,
  Scissors,
  Wrench,
};

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-5xl justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                'flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-brand-700 bg-brand-50'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

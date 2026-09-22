import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  History,
  Home,
  Package,
  Scissors,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { APP_NAME, APP_SUBTITLE, NAV_ITEMS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';

const iconMap = {
  Home,
  ClipboardList,
  Package,
  Scissors,
  Wrench,
  BarChart3,
};

const secondaryItems = [
  { path: '/historico', label: 'Histórico', icon: History },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
  { path: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
];

export function SideNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {APP_NAME}
        </p>
        <p className="text-sm text-slate-500">{APP_SUBTITLE}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">
          Principal
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase text-slate-400">
          Outros
        </p>
        <ul className="space-y-1">
          {secondaryItems
            .filter((item) => !item.adminOnly || user?.role === 'ADMIN')
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={[
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {user && (
        <div className="border-t border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{user.role}</p>
        </div>
      )}
    </aside>
  );
}

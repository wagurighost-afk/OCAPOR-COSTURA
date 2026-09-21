import { Link } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { APP_NAME } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
  showBack?: boolean;
  backTo?: string;
}

export function Header({
  title,
  showMenu = false,
  onMenuClick,
  showBack = false,
  backTo = '/',
}: HeaderProps) {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white safe-top">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              to={backTo}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Voltar"
            >
              ←
            </Link>
          )}
          {showMenu && onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div>
            {!title && (
              <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                {APP_NAME}
              </p>
            )}
            <h1 className="text-lg font-bold text-slate-900">
              {title ?? APP_NAME}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

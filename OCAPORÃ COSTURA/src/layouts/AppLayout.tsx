import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { SideNavigation } from '@/components/layout/SideNavigation';

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <SideNavigation />
      <div className="lg:pl-64">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 lg:pb-8">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}

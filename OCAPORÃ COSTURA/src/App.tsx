import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { SplashPage } from '@/pages/SplashPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="estoque" element={<InventoryPage />} />
              <Route path="estoque/nova" element={<AdminRoute />}>
                <Route index element={<ProductFormPage />} />
              </Route>
              <Route path="estoque/:id" element={<ProductDetailPage />} />
              <Route
                path="producao"
                element={
                  <PlaceholderPage
                    title="Produção"
                    icon="✂️"
                    description="Gerencie ordens de produção."
                    phase="Fase 3"
                  />
                }
              />
              <Route
                path="consertos"
                element={
                  <PlaceholderPage
                    title="Consertos"
                    icon="🔧"
                    description="Gerencie peças em conserto."
                    phase="Fase 4"
                  />
                }
              />
              <Route
                path="historico"
                element={
                  <PlaceholderPage
                    title="Histórico"
                    icon="📋"
                    description="Consulte movimentações de estoque."
                    phase="Fase 2"
                  />
                }
              />
              <Route
                path="relatorios"
                element={
                  <PlaceholderPage
                    title="Relatórios"
                    icon="📊"
                    description="Visualize relatórios do sistema."
                    phase="Fase 5"
                  />
                }
              />
              <Route
                path="configuracoes"
                element={
                  <PlaceholderPage
                    title="Configurações"
                    icon="⚙️"
                    description="Configure o sistema."
                    phase="Fase 5"
                  />
                }
              />
              <Route path="usuarios" element={<AdminRoute />}>
                <Route
                  index
                  element={
                    <PlaceholderPage
                      title="Usuários"
                      icon="👥"
                      description="Gerencie usuários do sistema."
                      phase="Fase 5"
                    />
                  }
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

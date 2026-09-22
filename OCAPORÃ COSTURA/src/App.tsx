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
import { RequestsPage } from '@/pages/RequestsPage';
import { StockCategoryPage } from '@/pages/StockCategoryPage';
import { ProductionPage } from '@/pages/ProductionPage';

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

              <Route
                path="solicitacoes"
                element={<RequestsPage />}
              />

              <Route path="estoque" element={<InventoryPage />} />
              <Route
                path="estoque/pecas"
                element={
                  <StockCategoryPage
                    type="PECA_PRONTA"
                    title="Peças prontas"
                    icon="✅"
                    description="Peças finalizadas e disponíveis para entrega."
                    quantityLabel="disponíveis para entrega"
                  />
                }
              />
              <Route
                path="estoque/cortes"
                element={
                  <StockCategoryPage
                    type="CORTE"
                    title="Cortes"
                    icon="✂️"
                    description="Peças cortadas aguardando produção."
                    quantityLabel="cortes disponíveis para produção"
                  />
                }
              />
              <Route
                path="estoque/tecidos"
                element={
                  <StockCategoryPage
                    type="TECIDO"
                    title="Tecidos"
                    icon="🧵"
                    description="Matéria-prima disponível para produção."
                    quantityLabel="disponíveis"
                  />
                }
              />
              <Route
                path="estoque/aviamentos"
                element={
                  <StockCategoryPage
                    type="AVIAMENTO"
                    title="Aviamentos"
                    icon="🧰"
                    description="Materiais auxiliares utilizados na produção."
                    quantityLabel="disponíveis"
                  />
                }
              />
              <Route path="estoque/nova" element={<AdminRoute />}>
                <Route index element={<ProductFormPage />} />
              </Route>
              <Route path="estoque/:id" element={<ProductDetailPage />} />

              <Route
                path="producao"
                element={
                  <ProductionPage />
                }
              />
              <Route
                path="consertos"
                element={
                  <PlaceholderPage
                    title="Consertos"
                    icon="🔧"
                    description="Acompanhe itens aguardando, em conserto e concluídos."
                    phase="Etapa 5"
                  />
                }
              />
              <Route
                path="historico"
                element={
                  <PlaceholderPage
                    title="Histórico"
                    icon="📋"
                    description="Consulte movimentações de estoque e registros operacionais."
                    phase="Etapa 5"
                  />
                }
              />
              <Route
                path="relatorios"
                element={
                  <PlaceholderPage
                    title="Relatórios"
                    icon="📊"
                    description="Visualize dados de solicitações, produção, consertos e estoque."
                    phase="Etapa 5"
                  />
                }
              />
              <Route
                path="configuracoes"
                element={
                  <PlaceholderPage
                    title="Configurações"
                    icon="⚙️"
                    description="Configure parâmetros e perfis do sistema."
                    phase="Etapa 5"
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
                      description="Gerencie usuários, permissões e acessos."
                      phase="Etapa 5"
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

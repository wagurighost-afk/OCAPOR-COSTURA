import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { MetricCard } from '@/components/StockCard';
import { ProductCard } from '@/components/StockCard';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/EmptyState';
import {
  getAvailableStock,
  getStockStatus,
  getGreeting,
  getFirstName,
} from '@/utils/stock';
import { APP_NAME } from '@/constants';
import type { CriticalItem } from '@/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading, error, refetch } = useProducts();

  const metrics = useMemo(() => {
    let available = 0;
    let needProduction = 0;
    let lowStock = 0;
    let inRepair = 0;
    let inProduction = 0;

    for (const product of products) {
      available += getAvailableStock(product);
      inRepair += product.inRepair;
      inProduction += product.inProduction;

      const status = getStockStatus(product);
      if (status === 'ESTOQUE_BAIXO') lowStock += 1;
      if (status === 'SEM_ESTOQUE') needProduction += 1;
    }

    return { available, needProduction, lowStock, inRepair, inProduction, pendingRequests: 0 };
  }, [products]);

  const criticalItems = useMemo((): CriticalItem[] => {
    return products
      .map((product) => ({
        product,
        status: getStockStatus(product),
      }))
      .filter(
        (item) =>
          item.status === 'SEM_ESTOQUE' || item.status === 'ESTOQUE_BAIXO',
      )
      .sort((a, b) => {
        if (a.status === b.status) return a.product.name.localeCompare(b.product.name);
        return a.status === 'SEM_ESTOQUE' ? -1 : 1;
      })
      .slice(0, 10);
  }, [products]);

  if (loading) return <LoadingState message="Carregando dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const userName = user ? getFirstName(user.name) : 'Usuária';

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-brand-600">{APP_NAME}</p>
        <h2 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {userName} 👋
        </h2>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          icon="🟢"
          label="Disponíveis"
          value={metrics.available}
          colorClass="bg-success-50 border-success-200"
          onClick={() => navigate('/estoque?filtro=available')}
        />
        <MetricCard
          icon="🔴"
          label="Produzir"
          value={metrics.needProduction}
          colorClass="bg-danger-50 border-danger-200"
          onClick={() => navigate('/estoque?filtro=empty')}
        />
        <MetricCard
          icon="🟡"
          label="Estoque baixo"
          value={metrics.lowStock}
          colorClass="bg-warning-50 border-warning-200"
          onClick={() => navigate('/estoque?filtro=low')}
        />
        <MetricCard
          icon="🔧"
          label="Em conserto"
          value={metrics.inRepair}
          colorClass="bg-repair-50 border-repair-200"
          onClick={() => navigate('/estoque?filtro=repair')}
        />
        <MetricCard
          icon="✂️"
          label="Em produção"
          value={metrics.inProduction}
          colorClass="bg-production-50 border-production-200"
          onClick={() => navigate('/estoque?filtro=production')}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">ATENÇÃO</h3>
          <span className="text-sm text-slate-500">
            {criticalItems.length} item(ns) crítico(s)
          </span>
        </div>

        {criticalItems.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Nenhum item crítico"
            description="Todos os itens estão com estoque adequado."
          />
        ) : (
          <div className="space-y-3">
            {criticalItems.map(({ product, status }) => (
              <ProductCard
                key={product.id}
                name={product.name}
                size={product.size}
                available={getAvailableStock(product)}
                status={<StatusBadge status={status} size="sm" />}
                inProduction={product.inProduction}
                inRepair={product.inRepair}
                onClick={() => navigate(`/estoque/${product.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {metrics.needProduction > 0 && (
        <section className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
          <p className="text-sm font-semibold text-danger-700">
            ✂️ {metrics.needProduction} peça(s) precisam ser produzidas
          </p>
          <p className="mt-1 text-xs text-danger-600">
            Verifique os itens sem estoque na seção acima.
          </p>
        </section>
      )}
    </div>
  );
}

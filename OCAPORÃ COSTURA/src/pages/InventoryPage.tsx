import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Package, Plus, Scissors, Shirt, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { EmptyState, ErrorState, LoadingState } from '@/components/EmptyState';
import { MetricCard } from '@/components/StockCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getStockSummary } from '@/services/stockService';
import { formatQuantity } from '@/utils/stock';
import { getStockItemType } from '@/utils/stock';

const departmentLabels: Record<string, string> = {
  COZINHA: 'Cozinha',
  SERVICO_GERAL: 'Serviços Gerais',
  RECREACAO: 'Recreação',
  MEDRI: 'Medri',
  RECEPCAO: 'Recepção',
  GARCOM: 'Garçom',
  GARCONETE: 'Garçonete',
  JARDIM: 'Jardim',
  SUPERVISORES: 'Supervisoras',
  LAVANDERIA: 'Lavanderia',
  OUTRO: 'Outro',
};

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading, error, refetch } = useProducts();
  const summary = useMemo(() => getStockSummary(products), [products]);

  if (loading) return <LoadingState message="Carregando estoque..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const categories = [
    {
      path: '/estoque/pecas',
      title: 'Peças prontas',
      description: 'Finalizadas e disponíveis para entrega.',
      icon: <Shirt className="h-6 w-6" />,
      items: summary.readyItems,
      color: 'bg-success-50 border-success-200',
      quantity: summary.readyItems.reduce((total, item) => total + item.currentStock, 0),
      quantityLabel: 'unidades',
    },
    {
      path: '/estoque/cortes',
      title: 'Cortes',
      description: 'Cortados e aguardando produção.',
      icon: <Scissors className="h-6 w-6" />,
      items: summary.cuts,
      color: 'bg-warning-50 border-warning-200',
      quantity: summary.cuts.reduce((total, item) => total + item.currentStock, 0),
      quantityLabel: 'cortes',
    },
    {
      path: '/estoque/tecidos',
      title: 'Tecidos',
      description: 'Matéria-prima para produção.',
      icon: <Package className="h-6 w-6" />,
      items: summary.fabrics,
      color: 'bg-sky-50 border-sky-200',
      quantity: summary.fabrics.reduce((total, item) => total + item.currentStock, 0),
      quantityLabel: 'unidades',
    },
    {
      path: '/estoque/aviamentos',
      title: 'Aviamentos',
      description: 'Materiais auxiliares de produção.',
      icon: <Wrench className="h-6 w-6" />,
      items: summary.supplies,
      color: 'bg-violet-50 border-violet-200',
      quantity: summary.supplies.reduce((total, item) => total + item.currentStock, 0),
      quantityLabel: 'unidades',
    },
  ];

  const alerts = [
    ...summary.lowStock.map((product) => ({ product, label: 'Estoque baixo', color: 'text-warning-700' })),
    ...summary.outOfStock.map((product) => ({ product, label: 'Sem estoque', color: 'text-danger-700' })),
  ];

  const operationalRows = useMemo(() => {
    const grouped = new Map<string, { department: string; name: string; size: string; cut?: typeof products[number]; ready?: typeof products[number] }>();
    products
      .filter((product) => ['CORTE', 'PECA_PRONTA'].includes(getStockItemType(product)))
      .forEach((product) => {
        const logical = product.baseProductId ?? product.name;
        const key = `${product.department ?? 'SEM_SETOR'}|${logical}|${product.size || 'SEM_VARIACAO'}`;
        const row = grouped.get(key) ?? {
          department: product.department ?? 'SEM_SETOR',
          name: product.name,
          size: product.size || 'Variação não informada',
        };
        if (getStockItemType(product) === 'CORTE') row.cut = product;
        if (getStockItemType(product) === 'PECA_PRONTA') row.ready = product;
        grouped.set(key, row);
      });
    return [...grouped.values()].sort((a, b) => `${a.department}${a.name}${a.size}`.localeCompare(`${b.department}${b.name}${b.size}`));
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Estoque</h2>
          <p className="text-sm text-slate-500">Controle de materiais e peças</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button size="sm" onClick={() => navigate('/estoque/nova')} className="shrink-0">
            <Plus className="h-4 w-4" />
            Novo item
          </Button>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <button
            key={category.path}
            type="button"
            onClick={() => navigate(category.path)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${category.color}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-xl bg-white/80 p-2 text-slate-700">{category.icon}</span>
              <span className="text-sm font-semibold text-slate-600">{category.items.length} item(ns)</span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">{category.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{category.description}</p>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              {formatQuantity(category.quantity)} {category.quantityLabel}
            </p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon="✅" label="Peças prontas" value={summary.readyItems.length} onClick={() => navigate('/estoque/pecas')} />
        <MetricCard icon="✂️" label="Cortes" value={summary.cuts.length} onClick={() => navigate('/estoque/cortes')} />
        <MetricCard icon="🟡" label="Estoque baixo" value={summary.lowStock.length} />
        <MetricCard icon="🔴" label="Sem estoque" value={summary.outOfStock.length} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Visão operacional por setor</h3>
            <p className="text-sm text-slate-500">CORTE e PEÇA PRONTA permanecem em documentos separados.</p>
          </div>
        </div>
        {operationalRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhum item com setor e estágio de produção informado.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {operationalRows.map((row) => (
              <div key={`${row.department}-${row.name}-${row.size}`} className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {departmentLabels[row.department] ?? (row.department === 'SEM_SETOR' ? 'Setor não informado' : row.department)}
                </p>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-sm text-slate-500">Variação: {row.size}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <button type="button" className="rounded-lg bg-warning-50 p-2" onClick={() => row.cut && navigate(`/estoque/${row.cut.id}`)}>
                    <span className="block text-xs text-warning-800">CORTE</span>
                    <span className="text-lg font-bold text-warning-900">{row.cut?.currentStock ?? 0}</span>
                  </button>
                  <button type="button" className="rounded-lg bg-success-50 p-2" onClick={() => row.ready && navigate(`/estoque/${row.ready.id}`)}>
                    <span className="block text-xs text-success-800">PEÇA PRONTA</span>
                    <span className="text-lg font-bold text-success-900">{row.ready?.currentStock ?? 0}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-600" />
          <div>
            <h3 className="font-bold text-slate-900">Atenção ao estoque</h3>
            <p className="text-sm text-slate-500">Itens abaixo do mínimo ou zerados.</p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm font-medium text-success-700">
            <CheckCircle2 className="h-5 w-5" />
            Nenhum alerta de estoque no momento.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {alerts.map(({ product, label, color }) => (
              <button
                key={`${label}-${product.id}`}
                type="button"
                onClick={() => navigate(`/estoque/${product.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
              >
                <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                  {product.name}{product.size ? ` · ${product.size}` : ''}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${color}`}>
                  {label} · {formatQuantity(product.currentStock)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-brand-900">Regra de disponibilidade</p>
        <p className="mt-1 text-sm text-brand-800">
          Peças prontas são as únicas disponíveis para entrega. Cortes aguardam produção e não devem ser liberados.
        </p>
      </section>

      {products.length === 0 && (
        <EmptyState
          icon="📦"
          title="Nenhum item de estoque cadastrado."
          description="Os dados de estoque aparecerão aqui quando forem cadastrados."
        />
      )}
    </div>
  );
}

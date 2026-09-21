import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { ProductCard } from '@/components/StockCard';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  getAvailableStock,
  getStockStatus,
  searchProducts,
  matchesStockFilter,
} from '@/utils/stock';
import type { StockFilter } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';

export function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { products, loading, error, refetch } = useProducts();
  const { categories } = useCategories();

  const initialFilter = (searchParams.get('filtro') as StockFilter) || 'all';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>(initialFilter);
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredProducts = useMemo(() => {
    let result = searchProducts(products, search);
    result = result.filter((p) => matchesStockFilter(p, filter));
    if (categoryFilter) {
      result = result.filter((p) => p.categoryId === categoryFilter);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, filter, categoryFilter]);

  if (loading) return <LoadingState message="Carregando estoque..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Estoque</h2>
          <p className="text-sm text-slate-500">
            {filteredProducts.length} peça(s) encontrada(s)
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button
            size="sm"
            onClick={() => navigate('/estoque/nova')}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova peça
          </Button>
        )}
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, código, tamanho..."
      />

      <FilterChips value={filter} onChange={setFilter} />

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={[
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium',
              !categoryFilter
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600',
            ].join(' ')}
          >
            Todas categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium',
                categoryFilter === cat.id
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600',
              ].join(' ')}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Nenhuma peça encontrada"
          description="Tente alterar os filtros ou cadastrar uma nova peça."
          action={
            user?.role === 'ADMIN'
              ? {
                  label: 'Cadastrar peça',
                  onClick: () => navigate('/estoque/nova'),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              size={product.size}
              available={getAvailableStock(product)}
              status={<StatusBadge status={getStockStatus(product)} size="sm" />}
              inProduction={product.inProduction}
              inRepair={product.inRepair}
              onClick={() => navigate(`/estoque/${product.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

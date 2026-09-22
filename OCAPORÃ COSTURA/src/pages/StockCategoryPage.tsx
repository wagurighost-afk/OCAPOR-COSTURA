import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/EmptyState';
import { StockCard } from '@/components/StockCard';
import { Button } from '@/components/ui/Button';
import { getStockItemType, getStockStatus, searchProducts } from '@/utils/stock';
import {
  getCuts,
  getFabrics,
  getFinishedPieces,
  getSupplies,
} from '@/services/stockService';
import type { InventoryItemType, Product } from '@/types';
import { formatQuantity } from '@/utils/stock';

interface StockCategoryPageProps {
  type: InventoryItemType;
  title: string;
  description: string;
  icon: string;
  quantityLabel: string;
}

const typeLabels: Record<InventoryItemType, string> = {
  PECA_PRONTA: 'Peça pronta',
  CORTE: 'Corte',
  TECIDO: 'Tecido',
  AVIAMENTO: 'Aviamento',
};

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

function getCategoryProducts(products: Product[], type: InventoryItemType): Product[] {
  switch (type) {
    case 'PECA_PRONTA':
      return getFinishedPieces(products);
    case 'CORTE':
      return getCuts(products);
    case 'TECIDO':
      return getFabrics(products);
    case 'AVIAMENTO':
      return getSupplies(products);
  }
}

function StockProductCard({
  product,
  type,
  quantityLabel,
  onClick,
}: {
  product: Product;
  type: InventoryItemType;
  quantityLabel: string;
  onClick: () => void;
}) {
  const status = getStockStatus(product);
  const subtitle = [
    typeLabels[type],
    product.size ? `Tamanho: ${product.size}` : undefined,
    product.code || undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <StockCard
      title={product.name}
      department={product.department ? departmentLabels[product.department] ?? product.department : 'Setor não informado'}
      subtitle={subtitle}
      available={product.currentStock}
      quantityLabel={quantityLabel}
      status={
        <span
          className={[
            'rounded-full border px-2.5 py-1 text-xs font-semibold',
            status === 'ESTOQUE_OK'
              ? 'border-success-200 bg-success-50 text-success-700'
              : status === 'ESTOQUE_BAIXO'
                ? 'border-warning-200 bg-warning-50 text-warning-700'
                : 'border-danger-200 bg-danger-50 text-danger-700',
          ].join(' ')}
        >
          {status === 'ESTOQUE_OK'
            ? 'Disponível'
            : status === 'ESTOQUE_BAIXO'
              ? 'Estoque baixo'
              : 'Sem estoque'}
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>Mínimo: {formatQuantity(product.minimumStock)}</span>
          <span>Máximo: {formatQuantity(product.maximumStock)}</span>
          {product.inProduction > 0 && <span>Em produção: {formatQuantity(product.inProduction)}</span>}
          {product.inRepair > 0 && <span>Em conserto: {formatQuantity(product.inRepair)}</span>}
        </div>
      }
      onClick={onClick}
    />
  );
}

export function StockCategoryPage({
  type,
  title,
  description,
  icon,
  quantityLabel,
}: StockCategoryPageProps) {
  const navigate = useNavigate();
  const { products, loading, error, refetch } = useProducts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ESTOQUE_OK' | 'ESTOQUE_BAIXO' | 'SEM_ESTOQUE'>('TODOS');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const categoryProducts = useMemo(() => getCategoryProducts(products, type), [products, type]);
  const filteredProducts = useMemo(() => {
    const searched = searchProducts(categoryProducts, search);
    return searched
      .filter((product) => !departmentFilter || product.department === departmentFilter)
      .filter((product) => !sizeFilter || product.size === sizeFilter)
      .filter((product) => !productFilter || product.name === productFilter)
      .filter((product) => statusFilter === 'TODOS' || getStockStatus(product) === statusFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryProducts, search, statusFilter, departmentFilter, sizeFilter, productFilter]);

  if (loading) return <LoadingState message={`Carregando ${title.toLowerCase()}...`} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/estoque')} className="mb-2 text-sm font-medium text-brand-700 hover:underline">
            ← Voltar ao estoque
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{icon} {title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {type === 'CORTE' && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
          <strong>CORTE NÃO É PEÇA PRONTA.</strong> Estes itens aguardam produção e não estão disponíveis para entrega.
        </div>
      )}

      <div className="space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome, código ou tamanho..." />
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="">Todos os setores</option>
            {[...new Set(categoryProducts.map((product) => product.department).filter(Boolean))].sort().map((value) => (
              <option key={value} value={value}>{departmentLabels[value as string] ?? value}</option>
            ))}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
            <option value="">Todos os produtos</option>
            {[...new Set(categoryProducts.map((product) => product.name))].sort().map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)}>
            <option value="">Todos os tamanhos</option>
            {[...new Set(categoryProducts.map((product) => product.size).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            ['TODOS', 'Todos'],
            ['ESTOQUE_OK', type === 'CORTE' ? 'Disponíveis para produção' : 'Disponíveis'],
            ['ESTOQUE_BAIXO', 'Estoque baixo'],
            ['SEM_ESTOQUE', 'Sem estoque'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value as typeof statusFilter)}
              className={[
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
                statusFilter === value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={icon}
          title={categoryProducts.length === 0 ? `Nenhum item em ${title.toLowerCase()}.` : 'Nenhum item encontrado.'}
          description={categoryProducts.length === 0 ? 'Não há dados cadastrados para esta categoria.' : 'Tente alterar a busca ou os filtros.'}
        />
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <StockProductCard
              key={product.id}
              product={product}
              type={type}
              quantityLabel={quantityLabel}
              onClick={() => navigate(`/estoque/${product.id}`)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        {filteredProducts.length} item(ns) exibido(s) · Tipo confirmado: {getStockItemType(filteredProducts[0] ?? { stockItemType: type })}
      </p>
      <Button variant="ghost" fullWidth onClick={() => navigate('/estoque')}>
        Ver resumo do estoque
      </Button>
    </div>
  );
}

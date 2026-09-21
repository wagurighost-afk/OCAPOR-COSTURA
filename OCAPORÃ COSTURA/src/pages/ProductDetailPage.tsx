import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProductById } from '@/services/productService';
import { useCategories } from '@/hooks/useProducts';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/EmptyState';
import {
  getAvailableStock,
  getStockStatus,
  getPhysicalStock,
  getQuantityToProduce,
  formatQuantity,
} from '@/utils/stock';
import type { Product } from '@/types';

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getProductById(id)
      .then((data) => {
        if (!data) {
          setError('Peça não encontrada');
        } else {
          setProduct(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message="Carregando peça..." />;
  if (error || !product) {
    return (
      <ErrorState
        message={error ?? 'Peça não encontrada'}
        onRetry={() => navigate('/estoque')}
      />
    );
  }

  const status = getStockStatus(product);
  const available = getAvailableStock(product);
  const toProduce = getQuantityToProduce(product);
  const category = categories.find((c) => c.id === product.categoryId);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/estoque')}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Voltar ao estoque
      </button>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
            <p className="mt-1 text-slate-500">Tamanho: {product.size}</p>
            {product.color && (
              <p className="text-sm text-slate-500">Cor: {product.color}</p>
            )}
            {category && (
              <p className="text-sm text-slate-500">Categoria: {category.name}</p>
            )}
          </div>
          <StatusBadge status={status} size="lg" />
        </div>

        <div className="mt-6 rounded-xl bg-brand-50 p-4 text-center">
          <p className="text-sm font-medium text-brand-600">
            DISPONÍVEL PARA LIBERAÇÃO
          </p>
          <p className="mt-1 text-5xl font-bold text-brand-700">
            {formatQuantity(available)}
          </p>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          <InfoRow label="Mínimo" value={formatQuantity(product.minimumStock)} />
          <InfoRow label="Ideal" value={formatQuantity(product.idealStock)} />
          <InfoRow label="Máximo" value={formatQuantity(product.maximumStock)} />
          <InfoRow label="Estoque físico" value={formatQuantity(getPhysicalStock(product))} />
          <InfoRow label="Em produção" value={formatQuantity(product.inProduction)} />
          <InfoRow label="Em conserto" value={formatQuantity(product.inRepair)} />
          {product.code && <InfoRow label="Código" value={product.code} />}
        </div>

        {toProduce > 0 && (
          <div className="mt-4 rounded-xl bg-danger-50 p-4">
            <p className="text-sm font-semibold text-danger-700">
              ✂️ Precisa produzir {formatQuantity(toProduce)} unidade(s)
            </p>
          </div>
        )}

        {product.notes && (
          <p className="mt-4 text-sm text-slate-500">{product.notes}</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="success"
          size="lg"
          fullWidth
          disabled={available === 0}
          onClick={() => navigate(`/estoque/${product.id}/liberar`)}
        >
          PODE LIBERAR
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => navigate('/producao')}
        >
          PRODUZIR
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/consertos')}
        >
          CONSERTO
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => navigate('/historico')}
        >
          HISTÓRICO
        </Button>
      </section>
    </div>
  );
}

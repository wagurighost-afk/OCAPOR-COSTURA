import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProductById } from '@/services/productService';
import { useCategories, useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { adjustStock } from '@/services/stockService';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState, ErrorState } from '@/components/EmptyState';
import {
  getAvailableStock,
  getStockStatus,
  getPhysicalStock,
  getQuantityToProduce,
  formatQuantity,
  getStockItemType,
  isReadyItem,
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
  const { products } = useProducts();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('Contagem física');
  const [notes, setNotes] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

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
  const stockItemType = getStockItemType(product);
  const isReady = isReadyItem(product);
  const relatedCut = (() => {
    if (stockItemType !== 'PECA_PRONTA' || !product.baseProductId) return undefined;
    const matches = products.filter((candidate) =>
      getStockItemType(candidate) === 'CORTE' &&
      candidate.baseProductId === product.baseProductId &&
      candidate.department === product.department &&
      candidate.size === product.size,
    );
    return matches.length === 1 ? matches[0] : undefined;
  })();
  const stockTypeLabels = {
    PECA_PRONTA: 'Peça pronta',
    CORTE: 'Corte',
    TECIDO: 'Tecido',
    AVIAMENTO: 'Aviamento',
  } as const;

  async function handleAdjustment(event: FormEvent) {
    event.preventDefault();
    setAdjustmentError(null);
    const value = Number(newStock);
    if (!Number.isInteger(value) || value < 0) {
      setAdjustmentError('Informe um estoque inteiro não negativo.');
      return;
    }
    if (!reason.trim()) {
      setAdjustmentError('O motivo é obrigatório.');
      return;
    }
    setSavingAdjustment(true);
    try {
      await adjustStock({
        product: product as Product,
        newStock: value,
        performedBy: user?.id ?? 'authenticated-user',
        reason,
        notes,
      });
      const updated = { ...product, currentStock: value };
      setProduct(updated as Product);
      setShowAdjust(false);
      setNewStock('');
      setNotes('');
    } catch (adjustmentException) {
      setAdjustmentError(adjustmentException instanceof Error ? adjustmentException.message : 'Não foi possível ajustar o estoque.');
    } finally {
      setSavingAdjustment(false);
    }
  }

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
            <p className="mt-1 text-sm font-semibold text-brand-700">
              Tipo de estoque: {stockTypeLabels[stockItemType]}
            </p>
            <p className="mt-1 text-slate-500">Tamanho: {product.size}</p>
            {product.color && (
              <p className="text-sm text-slate-500">Cor: {product.color}</p>
            )}
            {category && (
              <p className="text-sm text-slate-500">Categoria: {category.name}</p>
            )}
            <p className="text-sm text-slate-500">
              Setor: {product.department ? product.department : 'Setor não informado'}
            </p>
          </div>
          <StatusBadge status={status} size="lg" />
        </div>

        <div className={`mt-6 rounded-xl p-4 text-center ${isReady ? 'bg-brand-50' : 'bg-slate-100'}`}>
          <p className="text-sm font-medium text-slate-600">
            {isReady ? 'DISPONÍVEL PARA LIBERAÇÃO' : stockItemType === 'CORTE' ? 'CORTES DISPONÍVEIS PARA PRODUÇÃO' : 'QUANTIDADE EM ESTOQUE'}
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
          {relatedCut && <InfoRow label="CORTE relacionado" value={formatQuantity(relatedCut.currentStock)} />}
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
        <Button variant="outline" size="lg" fullWidth onClick={() => { setNewStock(String(product.currentStock)); setShowAdjust(true); }}>
          AJUSTAR ESTOQUE
        </Button>
        {isReady ? (
          <Button
            variant="success"
            size="lg"
            fullWidth
            disabled={available === 0}
            onClick={() => navigate(`/estoque/${product.id}/liberar`)}
          >
            PODE LIBERAR
          </Button>
        ) : (
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-center text-sm font-medium text-warning-800">
            Este item não pode ser liberado para entrega porque não é uma peça pronta.
          </div>
        )}
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
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
          <form onSubmit={handleAdjustment} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900">Ajustar estoque</h3>
            <p className="mt-1 text-sm text-slate-500">
              {product.name} · {product.size || 'Variação não informada'} · {stockTypeLabels[stockItemType]}
            </p>
            <div className="mt-4 space-y-3">
              <InfoRow label="Estoque atual" value={formatQuantity(product.currentStock)} />
              <Input label="Novo estoque" type="number" min="0" step="1" value={newStock} onChange={(event) => setNewStock(event.target.value)} />
              <Select label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} options={[
                { value: 'Contagem física', label: 'Contagem física' },
                { value: 'Correção de estoque', label: 'Correção de estoque' },
                { value: 'Entrada manual', label: 'Entrada manual' },
                { value: 'Saída manual', label: 'Saída manual' },
                { value: 'Outro', label: 'Outro' },
              ]} />
              <Textarea label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} />
              {adjustmentError && <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{adjustmentError}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAdjust(false)}>Cancelar</Button>
                <Button type="submit" fullWidth loading={savingAdjustment}>Salvar ajuste</Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

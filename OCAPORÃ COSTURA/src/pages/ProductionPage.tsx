import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useRequests } from '@/hooks/useRequests';
import { useCategories } from '@/hooks/useProducts';
import {
  cancelProduction,
  createProductionOrder,
  finishProduction,
  registerProductionCut,
  resolveProductionStockProducts,
  saveProductionOrder,
  startProduction,
  updateProductionOrderStore,
} from '@/services/productionService';
import { createProduct } from '@/services/productService';
import { getStockItemType } from '@/utils/stock';
import type {
  CosturaRequest,
  ProductionOrder,
  ProductionStatus,
  Product,
  ProductFormData,
  CosturaDepartment,
  RequestPriority,
  ProductionType,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const statusLabels: Record<ProductionStatus, string> = {
  PENDENTE: 'Aguardando',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_PRODUCAO: 'Aguardando produção',
  EM_PRODUCAO: 'Em produção',
  AGUARDANDO_CONSERTO: 'Aguardando conserto',
  EM_CONSERTO: 'Em conserto',
  PARCIAL: 'Produção parcial',
  FINALIZADA: 'Concluída',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const priorities: { value: RequestPriority; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

const statuses = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

function formatDate(date?: Date): string {
  return date ? date.toLocaleDateString('pt-BR') : 'Não informado';
}

function formatDateTime(date?: Date): string {
  return date ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não informado';
}

function getProductionProduct(order: ProductionOrder, products: Product[]): Product | undefined {
  return (
    products.find((product) => product.id === order.readyProductId) ??
    products.find((product) => product.baseProductId === order.productId && getStockItemType(product) === 'PECA_PRONTA') ??
    products.find((product) => product.id === order.productId)
  );
}

function StatusBadge({ status }: { status: ProductionStatus }) {
  const color =
    status === 'FINALIZADA' || status === 'CONCLUIDA'
      ? 'border-success-200 bg-success-50 text-success-700'
      : status === 'CANCELADA'
        ? 'border-danger-200 bg-danger-50 text-danger-700'
        : status === 'PARCIAL'
          ? 'border-warning-200 bg-warning-50 text-warning-700'
          : 'border-brand-200 bg-brand-50 text-brand-700';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>;
}

function QuantitySummary({ order }: { order: ProductionOrder }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        ['Solicitada', order.requestedQuantity],
        ['Cortada', order.cutQuantity],
        ['Produzida', order.producedQuantity],
        ['Restante', order.remainingQuantity],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg bg-slate-50 p-2 text-center">
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function ProductionForm({
  products,
  categories,
  requests,
  userName,
  onSaved,
  onProductCreated,
  onCancel,
}: {
  products: Product[];
  categories: { id: string; name: string }[];
  requests: CosturaRequest[];
  userName: string;
  onSaved: (order: ProductionOrder) => void;
  onProductCreated: () => void;
  onCancel: () => void;
}) {
  const [productionType, setProductionType] = useState<ProductionType>('NORMAL');
  const [department, setDepartment] = useState<CosturaDepartment>('LAVANDERIA');
  const [readyProductId, setReadyProductId] = useState('');
  const [cutProductId, setCutProductId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priority, setPriority] = useState<RequestPriority>('NORMAL');
  const [responsible, setResponsible] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    department: 'LAVANDERIA' as CosturaDepartment,
    size: 'Único',
    categoryId: categories[0]?.id ?? '',
    notes: '',
  });
  const readyProducts = products.filter(
    (product) =>
      product.active &&
      getStockItemType(product) === 'PECA_PRONTA' &&
      (productionType === 'ESPECIAL' || Boolean(product.baseProductId)),
  );
  const selectedReadyProduct = readyProducts.find((product) => product.id === readyProductId);
  const relatedCuts = selectedReadyProduct?.baseProductId
    ? products.filter(
        (product) =>
          product.active &&
          getStockItemType(product) === 'CORTE' &&
          product.baseProductId === selectedReadyProduct.baseProductId,
      )
    : [];
  const selectedCutProduct = relatedCuts.find((product) => product.id === cutProductId);
  const resolvedCutProduct = relatedCuts.length === 1 ? relatedCuts[0] : selectedCutProduct;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const requestedQuantity = Number(quantity);
    if (!selectedReadyProduct) {
      setError('Selecione o produto da produção.');
      return;
    }
    if (productionType === 'ESPECIAL' && !department) {
      setError('Selecione o setor da produção especial.');
      return;
    }
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      setError('A quantidade solicitada deve ser um número inteiro maior que zero.');
      return;
    }
    if (productionType === 'NORMAL' && relatedCuts.length === 0) {
      setError('Este produto ainda não possui um corte relacionado para produção.');
      return;
    }
    if (productionType === 'NORMAL' && relatedCuts.length > 1 && !resolvedCutProduct) {
      setError('Selecione qual corte relacionado será usado.');
      return;
    }

    setSaving(true);
    try {
      const request = requests.find((item) => item.id === requestId);
      const order = createProductionOrder({
        productId: selectedReadyProduct.baseProductId ?? selectedReadyProduct.id,
        productionType,
        cutProductId: resolvedCutProduct?.id,
        readyProductId: selectedReadyProduct.id,
        department: productionType === 'ESPECIAL' ? department : selectedReadyProduct.department,
        requestId: request?.id,
        requestedQuantity,
        priority,
        requestedBy: userName || 'Usuário autenticado',
        responsible: responsible.trim() || undefined,
        deadline: deadline ? new Date(`${deadline}T12:00:00`) : request?.deadline,
        notes: notes.trim() || request?.observations,
      });
      const saved = await saveProductionOrder(order);
      onSaved(saved);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'Não foi possível criar a produção.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Nova produção</h2>
        <button type="button" onClick={onCancel} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar formulário">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ['NORMAL', 'Produção normal'],
          ['ESPECIAL', 'Produção especial'],
        ].map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium">
            <input
              type="radio"
              name="productionType"
              value={value}
              checked={productionType === value}
              onChange={() => {
                setProductionType(value as ProductionType);
                setReadyProductId('');
                setCutProductId('');
                setError(null);
              }}
            />
            {label}
          </label>
        ))}
      </div>
      {productionType === 'ESPECIAL' && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          Esta produção não utiliza estoque de corte. A quantidade produzida será adicionada diretamente às peças prontas.
        </div>
      )}
      {productionType === 'ESPECIAL' && (
        <Select
          label="Setor"
          value={department}
          onChange={(event) => setDepartment(event.target.value as CosturaDepartment)}
          options={[
            { value: 'LAVANDERIA', label: 'Lavanderia' },
            { value: 'COZINHA', label: 'Cozinha' },
            { value: 'RECREACAO', label: 'Recreação' },
            { value: 'RECEPCAO', label: 'Recepção' },
            { value: 'OUTRO', label: 'Outro' },
          ]}
        />
      )}
      <Select
        label="Produto"
        value={readyProductId}
        onChange={(event) => {
          setReadyProductId(event.target.value);
          setCutProductId('');
          setError(null);
        }}
        options={readyProducts.map((product) => ({
          value: product.id,
          label: `${product.name}${product.size ? ` · ${product.size}` : ''}`,
        }))}
        placeholder="Selecione o produto a produzir"
      />
      {productionType === 'ESPECIAL' && (
        <Button type="button" variant="outline" onClick={() => setShowNewProduct(true)}>
          <Plus className="h-4 w-4" /> Criar produto especial
        </Button>
      )}
      {productionType === 'NORMAL' && selectedReadyProduct && relatedCuts.length === 0 && (
        <p className="rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
          Este produto ainda não possui um corte relacionado para produção.
        </p>
      )}
      {productionType === 'NORMAL' && relatedCuts.length > 1 && (
        <Select
          label="Corte disponível"
          value={cutProductId}
          onChange={(event) => setCutProductId(event.target.value)}
          options={relatedCuts.map((product) => ({
            value: product.id,
            label: `${product.name} — ${product.currentStock} disponível(is)`,
          }))}
          placeholder="Selecione o corte que será usado"
        />
      )}
      {selectedReadyProduct && (productionType === 'ESPECIAL' || resolvedCutProduct) && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
          <p className="font-semibold">Resumo da produção</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <span>Produto: {selectedReadyProduct.name}{selectedReadyProduct.size ? ` · ${selectedReadyProduct.size}` : ''}</span>
            <span>Quantidade: {quantity || '0'}</span>
            {productionType === 'NORMAL' && resolvedCutProduct && <><span>Corte utilizado: {resolvedCutProduct.name}</span><span>Cortes disponíveis: {resolvedCutProduct.currentStock}</span></>}
            <span>Peça pronta de destino: {selectedReadyProduct.name}</span>
          </div>
        </div>
      )}
      <Select
        label="Solicitação relacionada"
        value={requestId}
        onChange={(event) => setRequestId(event.target.value)}
        options={requests.map((request) => ({ value: request.id, label: `${request.itemName} · ${request.quantity} unidade(s)` }))}
        placeholder="Nenhuma solicitação"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Quantidade solicitada" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)} options={priorities} />
        <Input label="Responsável" value={responsible} onChange={(event) => setResponsible(event.target.value)} placeholder="Opcional" />
        <Input label="Prazo" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      </div>
      <Textarea label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Informações da produção" />
      {error && <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving}>Criar produção</Button>
      </div>
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Novo produto especial</h3>
              <button type="button" onClick={() => setShowNewProduct(false)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <Input label="Nome" value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} />
              <Select label="Setor" value={newProduct.department} onChange={(event) => setNewProduct({ ...newProduct, department: event.target.value as CosturaDepartment })} options={[
                { value: 'LAVANDERIA', label: 'Lavanderia' },
                { value: 'RECREACAO', label: 'Recreação' },
                { value: 'COZINHA', label: 'Cozinha' },
                { value: 'OUTRO', label: 'Outro' },
              ]} />
              <Select label="Categoria" value={newProduct.categoryId} onChange={(event) => setNewProduct({ ...newProduct, categoryId: event.target.value })} options={categories.map((category) => ({ value: category.id, label: category.name }))} />
              <Input label="Tamanho/variação" value={newProduct.size} onChange={(event) => setNewProduct({ ...newProduct, size: event.target.value })} />
              <Textarea label="Observações" value={newProduct.notes} onChange={(event) => setNewProduct({ ...newProduct, notes: event.target.value })} />
              <Button type="button" fullWidth loading={saving} onClick={async () => {
                if (!newProduct.name.trim() || !newProduct.categoryId) {
                  setError('Informe o nome e a categoria do produto.');
                  return;
                }
                setSaving(true);
                try {
                  const data: ProductFormData = {
                    name: newProduct.name.trim(),
                    code: `ESP-${Date.now()}`,
                    categoryId: newProduct.categoryId,
                    department: newProduct.department,
                    stockItemType: 'PECA_PRONTA',
                    stockType: 'PECA_PRONTA',
                    size: newProduct.size.trim() || 'Único',
                    currentStock: 0,
                    minimumStock: 0,
                    idealStock: 0,
                    maximumStock: 100000,
                    notes: newProduct.notes.trim() || undefined,
                  };
                  const created = await createProduct(data);
                  setProductionType('ESPECIAL');
                  setReadyProductId(created.id);
                  setShowNewProduct(false);
                  setError(null);
                  onProductCreated();
                } catch (creationError) {
                  setError(creationError instanceof Error ? creationError.message : 'Não foi possível criar o produto.');
                } finally {
                  setSaving(false);
                }
              }}>Salvar produto</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function ProductionDetails({
  order,
  product,
  request,
  products,
  userId,
  onUpdated,
  onClose,
}: {
  order: ProductionOrder;
  product?: Product;
  request?: CosturaRequest;
  products: Product[];
  userId: string;
  onUpdated: (order: ProductionOrder) => void;
  onClose: () => void;
}) {
  const [operation, setOperation] = useState<'CUT' | 'FINISH' | null>(null);
  const [quantity, setQuantity] = useState('');
  const [producedQuantity, setProducedQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  let resolvedProducts: { cutProduct?: Product; readyProduct: Product } | undefined;
  let resolutionError: string | undefined;
  if (order.productionType === 'ESPECIAL') {
    const readyProduct = products.find((item) => item.id === order.readyProductId);
    if (readyProduct) {
      resolvedProducts = { readyProduct };
    } else {
      resolutionError = 'A peça pronta desta produção especial não foi encontrada.';
    }
  } else {
    try {
      resolvedProducts = resolveProductionStockProducts(order, products);
    } catch (error) {
      resolutionError = error instanceof Error ? error.message : 'Referências de estoque não resolvidas.';
    }
  }
  const cutProduct = resolvedProducts?.cutProduct;
  const readyProduct = resolvedProducts?.readyProduct;
  const canFinish = Boolean(readyProduct && (order.productionType === 'ESPECIAL' || cutProduct));

  async function persist(nextOrder: ProductionOrder) {
    const saved = await updateProductionOrderStore(nextOrder);
    onUpdated(saved);
  }

  async function handleStart() {
    setSaving(true);
    setError(null);
    try {
      await persist(startProduction(order, order.responsible ?? undefined));
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Não foi possível iniciar a produção.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCut() {
    setSaving(true);
    setError(null);
    try {
      if (!cutProduct) throw new Error(resolutionError ?? 'O corte desta ordem não foi encontrado.');
      const result = registerProductionCut(order, cutProduct, Number(quantity), userId, 'Corte registrado na produção', order.id);
      await persist(result.order);
      setOperation(null);
      setQuantity('');
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Não foi possível registrar o corte.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      if (!readyProduct || (order.productionType !== 'ESPECIAL' && !cutProduct)) {
        throw new Error(resolutionError ?? 'A produção precisa de um corte e uma peça pronta vinculados.');
      }
      const produced = Number(producedQuantity);
      const usedCuts = Number(quantity);
      const result = await finishProduction(order, cutProduct, readyProduct, {
        usedCutQuantity: order.productionType === 'ESPECIAL' ? 0 : usedCuts,
        producedQuantity: produced,
        userId,
        referenceId: order.id,
      });
      await persist(result.order);
      setOperation(null);
      setQuantity('');
      setProducedQuantity('');
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Não foi possível finalizar a produção.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);
    try {
      await persist(cancelProduction(order, userId, 'Produção cancelada pelo usuário'));
      setConfirmCancel(false);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Não foi possível cancelar a produção.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
        <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Ordem de produção</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{product?.name ?? 'Produto não encontrado'}</h2>
              <p className="text-sm text-slate-500">{product?.code || 'Código não informado'}{product?.size ? ` · ${product.size}` : ''}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar detalhe"><X className="h-5 w-5" /></button>
          </div>

          <div className="mt-5">
            <QuantitySummary order={order} />
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <Detail label="Tipo de produção">{order.productionType === 'ESPECIAL' ? 'Produção especial' : 'Produção normal'}</Detail>
            <Detail label="Corte">{order.productionType === 'ESPECIAL' ? 'Não utilizado' : (cutProduct?.name ?? 'Não definido')}</Detail>
            <Detail label="Estoque de corte disponível">{order.productionType === 'ESPECIAL' ? 'Não utilizado' : (cutProduct?.currentStock ?? 'Não informado')}</Detail>
            <Detail label="Destino">{readyProduct?.name ?? 'Não definido'}</Detail>
            <Detail label="Referência de estoque">
              {readyProduct && (order.productionType === 'ESPECIAL' || cutProduct) ? 'Vinculada' : 'Não definida para esta ordem antiga.'}
            </Detail>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Detail label="Status"><StatusBadge status={order.status} /></Detail>
            <Detail label="Prioridade">{order.priority}</Detail>
            <Detail label="Responsável">{order.responsible ?? 'Não informado'}</Detail>
            <Detail label="Prazo">{formatDate(order.deadline)}</Detail>
            <Detail label="Solicitação relacionada">{request ? `${request.itemName} · ${request.id}` : order.requestId ?? 'Não informada'}</Detail>
            <Detail label="Criada em">{formatDateTime(order.createdAt)}</Detail>
          </div>
          {order.notes && <div className="mt-4"><Detail label="Observações">{order.notes}</Detail></div>}

          {error && <p className="mt-4 rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}

          {operation === 'CUT' && (
            <div className="mt-5 rounded-xl border border-warning-200 bg-warning-50 p-4">
              <p className="text-sm font-semibold text-warning-900">Registrar corte</p>
              <p className="mt-1 text-xs text-warning-800">Registrar corte não produz a peça pronta.</p>
              <Input label="Quantidade cortada" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              <div className="mt-3 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setOperation(null)}>Voltar</Button>
                <Button fullWidth loading={saving} onClick={handleCut}>Registrar</Button>
              </div>
            </div>
          )}

          {operation === 'FINISH' && (
            <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-900">Finalizar produção</p>
              <p className="mt-1 text-xs text-brand-800">{order.productionType === 'ESPECIAL' ? 'Não utiliza corte; a quantidade produzida entrará diretamente como PEÇA_PRONTA.' : 'Os cortes serão consumidos e a quantidade produzida entrará como PEÇA_PRONTA.'}</p>
              <div className="mt-3 space-y-3">
                {order.productionType !== 'ESPECIAL' && <Input label="Cortes utilizados" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />}
                <Input label="Quantidade produzida" type="number" min="1" step="1" value={producedQuantity} onChange={(event) => setProducedQuantity(event.target.value)} />
              </div>
              <div className="mt-3 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setOperation(null)}>Voltar</Button>
                <Button fullWidth loading={saving} onClick={handleFinish}>Finalizar</Button>
              </div>
            </div>
          )}

          {!operation && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {order.status !== 'CANCELADA' && order.status !== 'FINALIZADA' && order.status !== 'CONCLUIDA' && ['PENDENTE', 'AGUARDANDO_PRODUCAO'].includes(order.status) && (
                <Button fullWidth loading={saving} onClick={handleStart}>Iniciar produção</Button>
              )}
              {order.status !== 'CANCELADA' && order.status !== 'FINALIZADA' && order.status !== 'CONCLUIDA' && (
                <Button variant="outline" fullWidth onClick={() => setOperation('CUT')}>Registrar corte</Button>
              )}
              {order.status !== 'CANCELADA' && order.status !== 'FINALIZADA' && order.status !== 'CONCLUIDA' && (
                <Button variant="success" fullWidth disabled={!canFinish} onClick={() => setOperation('FINISH')}>Finalizar produção</Button>
              )}
              {order.status !== 'CANCELADA' && order.status !== 'FINALIZADA' && order.status !== 'CONCLUIDA' && (
                <Button variant="danger" fullWidth onClick={() => setConfirmCancel(true)}>Cancelar produção</Button>
              )}
            </div>
          )}
          {!canFinish && order.status !== 'FINALIZADA' && order.status !== 'CONCLUIDA' && (
            <p className="mt-3 text-xs text-slate-500">{order.productionType === 'ESPECIAL' ? 'Esta ordem precisa ter a peça pronta vinculada antes de continuar.' : 'Esta ordem precisa ter o corte e a peça pronta vinculados antes de continuar.'}</p>
          )}

          {order.startedAt && <p className="mt-5 text-xs text-slate-500">Iniciada em {formatDateTime(order.startedAt)}</p>}
          {order.finishedAt && <p className="mt-1 text-xs text-slate-500">Finalizada em {formatDateTime(order.finishedAt)}</p>}
        </section>
      </div>
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar esta produção?"
        message="A ordem será marcada como cancelada e o histórico atual será preservado."
        confirmLabel="Cancelar produção"
        variant="danger"
        loading={saving}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
      />
    </>
  );
}

export function ProductionPage() {
  const { user } = useAuth();
  const { products, refetch: refetchProducts } = useProducts();
  const { categories } = useCategories();
  const { requests } = useRequests();
  const { orders, loading, error, refetch } = useProductionOrders();
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'TODOS' | ProductionStatus>('TODOS');
  const [priority, setPriority] = useState<'TODAS' | RequestPriority>('TODAS');
  const [notice, setNotice] = useState<string | null>(null);

  const ordersWithProduct = useMemo(() => orders.map((order) => ({
    order,
    product: getProductionProduct(order, products),
    request: requests.find((item) => item.id === order.requestId),
  })), [orders, products, requests]);

  const filteredOrders = useMemo(() => {
    const text = search.trim().toLowerCase();
    return ordersWithProduct.filter(({ order, product, request }) => {
      if (status !== 'TODOS' && order.status !== status) return false;
      if (priority !== 'TODAS' && order.priority !== priority) return false;
      if (!text) return true;
      return [
        product?.name,
        product?.code,
        order.responsible,
        order.requestedBy,
        order.notes,
        request?.itemName,
        request?.department,
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(text));
    });
  }, [ordersWithProduct, search, status, priority]);

  const summary = {
    awaiting: orders.filter((order) => ['PENDENTE', 'AGUARDANDO_PRODUCAO'].includes(order.status)).length,
    inProduction: orders.filter((order) => order.status === 'EM_PRODUCAO').length,
    partial: orders.filter((order) => order.status === 'PARCIAL').length,
    finished: orders.filter((order) => ['FINALIZADA', 'CONCLUIDA'].includes(order.status)).length,
  };

  function handleSaved(order: ProductionOrder) {
    setShowForm(false);
    setSelectedOrder(order);
    setNotice('Produção criada sem movimentar o estoque.');
    window.setTimeout(() => setNotice(null), 4000);
    refetch();
  }

  function handleUpdated(order: ProductionOrder) {
    setSelectedOrder(order);
    setNotice('Produção atualizada com sucesso.');
    window.setTimeout(() => setNotice(null), 4000);
    refetch();
  }

  if (loading) return <LoadingState message="Carregando produções..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Produção</h2>
          <p className="text-sm text-slate-500">Acompanhamento e execução da produção</p>
        </div>
        <Button onClick={() => setShowForm((visible) => !visible)}><Plus className="h-5 w-5" /> Nova produção</Button>
      </header>

      {notice && <p className="rounded-xl border border-success-200 bg-success-50 p-3 text-sm font-medium text-success-700">{notice}</p>}
      {showForm && <ProductionForm products={products} categories={categories} requests={requests} userName={user?.name ?? ''} onSaved={handleSaved} onProductCreated={refetchProducts} onCancel={() => setShowForm(false)} />}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Aguardando" value={summary.awaiting} />
        <SummaryCard label="Em produção" value={summary.inProduction} />
        <SummaryCard label="Parciais" value={summary.partial} />
        <SummaryCard label="Concluídas" value={summary.finished} />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar peça, código ou responsável..." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} options={[{ value: 'TODOS', label: 'Todos os status' }, ...statuses]} />
          <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} options={[{ value: 'TODAS', label: 'Todas as prioridades' }, ...priorities]} />
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <EmptyState icon="✂️" title="Nenhuma produção encontrada." description={orders.length ? 'Tente ajustar a busca ou os filtros.' : 'Ainda não existem ordens de produção cadastradas.'} action={{ label: 'Criar produção', onClick: () => setShowForm(true) }} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredOrders.map(({ order, product, request }) => (
            <button key={order.id} type="button" onClick={() => setSelectedOrder(order)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Ordem de produção</p>
                  <h3 className="mt-1 truncate font-bold text-slate-900">{product?.name ?? 'Produto não encontrado'}</h3>
                  <p className="text-sm text-slate-500">{product?.size ? `Tamanho: ${product.size}` : 'Tamanho não informado'}{request ? ` · ${request.department ?? 'Departamento não informado'}` : ''}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-4"><QuantitySummary order={order} /></div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Prioridade: {order.priority}</span>
                <span>Prazo: {formatDate(order.deadline)}</span>
                <span>Responsável: {order.responsible ?? 'Não informado'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <ProductionDetails
          order={selectedOrder}
          product={getProductionProduct(selectedOrder, products)}
          request={requests.find((request) => request.id === selectedOrder.requestId)}
          products={products}
          userId={user?.id ?? 'authenticated-user'}
          onUpdated={handleUpdated}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

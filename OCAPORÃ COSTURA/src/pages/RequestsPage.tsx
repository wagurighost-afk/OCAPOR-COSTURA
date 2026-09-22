import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useRequests } from '@/hooks/useRequests';
import {
  createGenericRequest,
  createRepairRequest,
  createRequest,
  evaluateFardamentoRequest,
  saveRequest,
} from '@/services/requestService';
import type {
  CosturaDepartment,
  CosturaRequest,
  CosturaRequestStatus,
  CosturaRequestType,
  RequestPriority,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/EmptyState';

const typeLabels: Record<CosturaRequestType, string> = {
  FARDAMENTO: 'Fardamento',
  PRODUCAO: 'Produção',
  CONSERTO: 'Conserto',
  ESTOQUE: 'Estoque',
  OUTRO: 'Outro',
};

const statusLabels: Record<CosturaRequestStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_PRODUCAO: 'Aguardando produção',
  EM_PRODUCAO: 'Em produção',
  AGUARDANDO_CONSERTO: 'Aguardando conserto',
  EM_CONSERTO: 'Em conserto',
  PARCIAL: 'Parcial',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  ABERTA: 'Aberta',
  APROVADA: 'Aprovada',
  ENTREGUE: 'Entregue',
};

const departments: { value: CosturaDepartment; label: string }[] = [
  { value: 'COZINHA', label: 'Cozinha' },
  { value: 'SERVICO_GERAL', label: 'Serviço Geral' },
  { value: 'RECREACAO', label: 'Recreação' },
  { value: 'MEDRI', label: 'Medri' },
  { value: 'RECEPCAO', label: 'Recepção' },
  { value: 'GARCOM_GARCONETE', label: 'Garçom/Garçonete' },
  { value: 'JARDIM', label: 'Jardim' },
  { value: 'SUPERVISORES', label: 'Supervisoras' },
  { value: 'OUTRO', label: 'Outro' },
];

const priorities: { value: RequestPriority; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

const requestTypes = Object.entries(typeLabels).map(([value, label]) => ({
  value,
  label,
}));

function formatDate(date?: Date): string {
  return date ? date.toLocaleDateString('pt-BR') : 'Não informado';
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function RequestStatus({ status }: { status: CosturaRequestStatus }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {statusLabels[status]}
    </span>
  );
}

function RequestDetails({
  request,
  products,
  onClose,
}: {
  request: CosturaRequest;
  products: ReturnType<typeof useProducts>['products'];
  onClose: () => void;
}) {
  const evaluation =
    request.requestType === 'FARDAMENTO'
      ? evaluateFardamentoRequest(products, request)
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {typeLabels[request.requestType]}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{request.itemName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail label="Status"><RequestStatus status={request.status} /></Detail>
          <Detail label="Prioridade">{request.priority}</Detail>
          <Detail label="Solicitante">{request.requester ?? request.requestedBy ?? 'Não informado'}</Detail>
          <Detail label="Departamento">{request.department ?? 'Não informado'}</Detail>
          <Detail label="Localização">{request.location ?? 'Não informado'}</Detail>
          <Detail label="Quantidade">{request.quantity || 'Não informado'}</Detail>
          <Detail label="Tamanho">{request.size ?? 'Não informado'}</Detail>
          <Detail label="Prazo">{formatDate(request.deadline)}</Detail>
          <Detail label="Responsável">Não informado</Detail>
          <Detail label="Criada em">{formatDateTime(request.createdAt)}</Detail>
        </div>

        {request.problem && <Detail label="Problema" className="mt-4">{request.problem}</Detail>}
        {request.observations && <Detail label="Observações" className="mt-4">{request.observations}</Detail>}

        {evaluation && (
          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <h3 className="font-semibold text-brand-900">Avaliação de disponibilidade</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <Metric label="Solicitada" value={evaluation.requested} />
              <Metric label="Disponível" value={evaluation.available} />
              <Metric label="Faltante" value={evaluation.shortage} />
            </div>
            <p className="mt-3 text-sm font-medium text-brand-800">
              {evaluation.canFulfill
                ? 'Pode atender integralmente'
                : evaluation.isPartial
                  ? 'Pode atender parcialmente e necessita produção'
                  : 'Necessita produção'}
            </p>
          </div>
        )}

        {request.statusHistory && request.statusHistory.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold text-slate-900">Histórico de status</h3>
            <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
              {request.statusHistory.map((entry, index) => (
                <div key={`${entry.changedAt.toISOString()}-${index}`} className="text-sm">
                  <p className="font-medium text-slate-800">{statusLabels[entry.toStatus]}</p>
                  <p className="text-slate-500">{formatDateTime(entry.changedAt)}{entry.note ? ` · ${entry.note}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/80 p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function RequestForm({
  products,
  userName,
  onSaved,
  onCancel,
}: {
  products: ReturnType<typeof useProducts>['products'];
  userName: string;
  onSaved: (request: CosturaRequest) => void;
  onCancel: () => void;
}) {
  const [requestType, setRequestType] = useState<CosturaRequestType>('FARDAMENTO');
  const [department, setDepartment] = useState<CosturaDepartment | ''>('');
  const [productId, setProductId] = useState('');
  const [itemName, setItemName] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [requester, setRequester] = useState(userName);
  const [location, setLocation] = useState('');
  const [problem, setProblem] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('NORMAL');
  const [deadline, setDeadline] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((product) => product.id === productId);
  const relevantProducts = products.filter((product) => product.active && product.stockItemType === 'PECA_PRONTA');

  function resetType(nextType: CosturaRequestType) {
    setRequestType(nextType);
    setError(null);
    if (nextType !== 'FARDAMENTO' && nextType !== 'PRODUCAO') {
      setProductId('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedQuantity = Number(quantity);
    if (!itemName.trim() && !selectedProduct) {
      setError('Informe o item ou selecione uma peça cadastrada.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (requestType === 'FARDAMENTO' && !department) {
      setError('Informe o departamento.');
      return;
    }
    if (requestType === 'CONSERTO' && !problem.trim()) {
      setError('Informe o problema do item.');
      return;
    }

    setSaving(true);
    try {
      const common = {
        requestType,
        department: department || undefined,
        itemName: selectedProduct?.name ?? itemName.trim(),
        productId: selectedProduct?.id,
        size: size || selectedProduct?.size,
        quantity: parsedQuantity,
        requester: requester.trim() || undefined,
        requestedBy: requester.trim() || undefined,
        priority,
        deadline: deadline ? new Date(`${deadline}T12:00:00`) : undefined,
        observations: observations.trim() || undefined,
        location: location.trim() || undefined,
        problem: problem.trim() || undefined,
      };

      const request =
        requestType === 'CONSERTO'
          ? createRepairRequest({
              itemName: common.itemName,
              location: common.location,
              quantity: common.quantity,
              problem: common.problem ?? '',
              priority,
              requester: common.requester,
              requestedBy: common.requestedBy,
              department: department || undefined,
              observations: common.observations,
              deadline: common.deadline,
            })
          : requestType === 'ESTOQUE' || requestType === 'OUTRO'
            ? createGenericRequest({
                itemName: common.itemName,
                requestType,
                description: common.observations ?? common.problem,
                requester: common.requester,
                priority,
                department: department || undefined,
                deadline: common.deadline,
              })
            : createRequest(common);

      const saved = await saveRequest(request);
      onSaved(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível criar a solicitação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Nova solicitação</h2>
        <button type="button" onClick={onCancel} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar formulário">
          <X className="h-5 w-5" />
        </button>
      </div>
      <Select label="Tipo" value={requestType} onChange={(event) => resetType(event.target.value as CosturaRequestType)} options={requestTypes} />

      {(requestType === 'FARDAMENTO' || requestType === 'PRODUCAO') && (
        <Select
          label="Peça cadastrada"
          value={productId}
          onChange={(event) => {
            const product = products.find((item) => item.id === event.target.value);
            setProductId(event.target.value);
            if (product) setItemName(product.name);
          }}
          options={relevantProducts.map((product) => ({ value: product.id, label: `${product.name}${product.size ? ` · ${product.size}` : ''}` }))}
          placeholder="Selecione uma peça"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Item" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Nome do item" />
        {(requestType === 'FARDAMENTO' || requestType === 'PRODUCAO') && (
          <Input label="Tamanho" value={size} onChange={(event) => setSize(event.target.value)} placeholder="Ex.: M" />
        )}
        <Input label="Quantidade" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        <Input label="Solicitante" value={requester} onChange={(event) => setRequester(event.target.value)} />
        <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)} options={priorities} />
        <Input label="Prazo" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      </div>

      {(requestType === 'FARDAMENTO' || requestType === 'PRODUCAO' || requestType === 'CONSERTO') && (
        <Select label="Departamento" value={department} onChange={(event) => setDepartment(event.target.value as CosturaDepartment)} options={departments} placeholder="Selecione o departamento" />
      )}
      {requestType === 'CONSERTO' && (
        <>
          <Input label="Localização" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Onde está o item?" />
          <Textarea label="Problema" value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Descreva o problema" />
        </>
      )}
      <Textarea label="Observações" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Informações adicionais" />

      {error && <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving}>Criar solicitação</Button>
      </div>
    </form>
  );
}

export function RequestsPage() {
  const { user } = useAuth();
  const { products } = useProducts();
  const { requests, loading, error, refetch } = useRequests();
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CosturaRequest | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | CosturaRequestType>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | CosturaRequestStatus>('TODOS');
  const [notice, setNotice] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (typeFilter !== 'TODOS' && request.requestType !== typeFilter) return false;
      if (statusFilter !== 'TODOS' && request.status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      return [
        request.itemName,
        request.department,
        request.requester,
        request.requestedBy,
        request.location,
        request.problem,
        request.observations,
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [requests, search, typeFilter, statusFilter]);

  function handleSaved(request: CosturaRequest) {
    setShowForm(false);
    setSelectedRequest(request);
    setNotice('Solicitação criada com sucesso.');
    window.setTimeout(() => setNotice(null), 4000);
    refetch();
  }

  if (loading) return <LoadingState message="Carregando solicitações..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Solicitações</h2>
          <p className="text-sm text-slate-500">Demandas da costura</p>
        </div>
        <Button onClick={() => setShowForm((visible) => !visible)}><Plus className="h-5 w-5" /> Nova solicitação</Button>
      </header>

      {notice && <p className="rounded-xl border border-success-200 bg-success-50 p-3 text-sm font-medium text-success-700">{notice}</p>}
      {showForm && <RequestForm products={products} userName={user?.name ?? ''} onSaved={handleSaved} onCancel={() => setShowForm(false)} />}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar item, departamento ou solicitante..." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} options={[{ value: 'TODOS', label: 'Todos os tipos' }, ...requestTypes]} />
          <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} options={[{ value: 'TODOS', label: 'Todos os status' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState icon="📝" title="Não há solicitações para mostrar." description={requests.length ? 'Tente ajustar os filtros ou a busca.' : 'Registre uma demanda da costura para começar.'} action={{ label: 'Nova solicitação', onClick: () => setShowForm(true) }} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredRequests.map((request) => (
            <button key={request.id} type="button" onClick={() => setSelectedRequest(request)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{typeLabels[request.requestType]}</p>
                  <h3 className="mt-1 font-bold text-slate-900">{request.itemName}</h3>
                </div>
                <RequestStatus status={request.status} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{[request.department, request.location, request.size].filter(Boolean).join(' · ') || 'Detalhes não informados'}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{request.quantity ? `${request.quantity} unidade(s)` : 'Quantidade não informada'}</span>
                <span>Prioridade: {request.priority}</span>
                <span>Prazo: {formatDate(request.deadline)}</span>
                <span>Solicitante: {request.requester ?? request.requestedBy ?? 'Não informado'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedRequest && <RequestDetails request={selectedRequest} products={products} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}

import type {
  CosturaDepartment,
  CosturaRequest,
  CosturaRequestStatus,
  CosturaRequestType,
  ProductionOrder,
  Product,
  RequestPriority,
  RequestStatusHistoryEntry,
} from '@/types';
import { getStockItemType, isReadyItem } from '@/utils/stock';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase/config';
import { COLLECTIONS } from '@/constants';
import { mapRequestDoc, requestToFirestore } from '@/firebase/mappers';

let demoRequests: CosturaRequest[] = [];

export type RequestEvaluationResult = {
  requested: number;
  available: number;
  shortage: number;
  canFulfill: boolean;
  isPartial: boolean;
  stockTypeChecked: 'PECA_PRONTA';
};

export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `req-${crypto.randomUUID()}`;
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeRequestStatus(status?: CosturaRequestStatus): CosturaRequestStatus {
  const valid = new Set<CosturaRequestStatus>([
    'PENDENTE',
    'EM_ANALISE',
    'AGUARDANDO_PRODUCAO',
    'EM_PRODUCAO',
    'AGUARDANDO_CONSERTO',
    'EM_CONSERTO',
    'PARCIAL',
    'CONCLUIDA',
    'CANCELADA',
    'ABERTA',
    'APROVADA',
    'ENTREGUE',
  ]);

  if (status && valid.has(status)) return status;
  return 'PENDENTE';
}

export function evaluateFardamentoRequest(
  products: Product[],
  request: Pick<CosturaRequest, 'quantity' | 'productId' | 'itemName'>,
): RequestEvaluationResult {
  const requested = Math.max(0, request.quantity ?? 0);

  const readyProducts = products.filter((product) => {
    if (!isReadyItem(product)) return false;
    if (request.productId) return product.id === request.productId;
    return product.name.toLowerCase() === request.itemName.toLowerCase();
  });

  const available = readyProducts.reduce((total, product) => total + product.currentStock, 0);
  const shortage = Math.max(0, requested - available);

  return {
    requested,
    available,
    shortage,
    canFulfill: requested <= available,
    isPartial: requested > 0 && available > 0 && available < requested,
    stockTypeChecked: 'PECA_PRONTA',
  };
}

export function createRequest(
  input: Omit<CosturaRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'statusHistory'> & {
    status?: CosturaRequestStatus;
    requestedBy?: string;
    userId?: string;
  },
): CosturaRequest {
  const now = new Date();
  const initialStatus = normalizeRequestStatus(input.status ?? 'PENDENTE');

  const entry: RequestStatusHistoryEntry = {
    fromStatus: undefined,
    toStatus: initialStatus,
    changedBy: input.requestedBy ?? input.requester ?? input.userId,
    changedAt: now,
    note: 'Solicitação criada',
  };

  return {
    id: createRequestId(),
    requestType: input.requestType,
    department: input.department,
    itemName: input.itemName,
    productId: input.productId,
    location: input.location,
    problem: input.problem,
    photoUrl: input.photoUrl,
    size: input.size,
    quantity: Math.max(0, input.quantity ?? 0),
    requester: input.requester,
    requestedBy: input.requestedBy ?? input.requester,
    priority: input.priority,
    status: initialStatus,
    deadline: input.deadline,
    observations: input.observations,
    previousStatus: undefined,
    statusHistory: [entry],
    createdAt: now,
    updatedAt: now,
  } as CosturaRequest;
}

export function getRequestById(requests: CosturaRequest[], id: string): CosturaRequest | undefined {
  return requests.find((request) => request.id === id);
}

export function getRequests(requests: CosturaRequest[]): CosturaRequest[] {
  return [...requests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateRequest(
  requests: CosturaRequest[],
  id: string,
  patch: Partial<CosturaRequest>,
): CosturaRequest | undefined {
  const index = requests.findIndex((request) => request.id === id);
  if (index === -1) return undefined;

  const updated = {
    ...requests[index],
    ...patch,
    updatedAt: new Date(),
  };

  requests[index] = updated;
  return updated;
}

export function changeRequestStatus(
  request: CosturaRequest,
  nextStatus: CosturaRequestStatus,
  actorId?: string,
  note?: string,
): CosturaRequest {
  const normalized = normalizeRequestStatus(nextStatus);
  const now = new Date();

  const historyEntry: RequestStatusHistoryEntry = {
    fromStatus: request.status,
    toStatus: normalized,
    changedBy: actorId ?? request.requestedBy ?? request.requester,
    changedAt: now,
    note,
  };

  return {
    ...request,
    previousStatus: request.status,
    status: normalized,
    statusHistory: [...(request.statusHistory ?? []), historyEntry],
    updatedAt: now,
  };
}

export function cancelRequest(
  request: CosturaRequest,
  actorId?: string,
  note?: string,
): CosturaRequest {
  return changeRequestStatus(request, 'CANCELADA', actorId, note ?? 'Solicitação cancelada');
}

export function createProductionOrderForRequest(
  request: CosturaRequest,
  products: Product[],
  options?: {
    requestedBy?: string;
    responsible?: string;
    deadline?: Date;
    notes?: string;
  },
): ProductionOrder {
  if (!request.productId) {
    throw new Error('A solicitação não possui uma peça pronta selecionada.');
  }

  const readyProduct = products.find(
    (product) => product.id === request.productId && isReadyItem(product),
  );
  if (!readyProduct) {
    throw new Error('A peça pronta da solicitação não foi encontrada.');
  }

  if (!readyProduct.baseProductId) {
    throw new Error(
      'A peça pronta da solicitação ainda não possui uma identidade lógica relacionada.',
    );
  }

  const cutProducts = products.filter(
    (product) =>
      product.baseProductId === readyProduct.baseProductId &&
      getStockItemType(product) === 'CORTE',
  );
  if (cutProducts.length !== 1) {
    throw new Error(
      'Não foi encontrado exatamente um produto de CORTE relacionado à peça solicitada.',
    );
  }

  const now = new Date();
  const quantity = Math.max(0, request.quantity ?? 0);
  if (quantity <= 0) {
    throw new Error('A quantidade da solicitação deve ser maior que zero.');
  }

  return {
    id: `prod-${createRequestId()}`,
    requestId: request.id,
    productId: readyProduct.baseProductId,
    productionType: 'NORMAL',
    cutProductId: cutProducts[0].id,
    readyProductId: readyProduct.id,
    requestedQuantity: quantity,
    cutQuantity: 0,
    producedQuantity: 0,
    remainingQuantity: quantity,
    priority: request.priority ?? 'NORMAL',
    status: 'PENDENTE',
    requestedBy: options?.requestedBy ?? request.requestedBy ?? request.requester ?? 'demo-user',
    responsible: options?.responsible,
    requestedAt: now,
    deadline: options?.deadline ?? request.deadline,
    notes: options?.notes ?? request.observations,
    createdAt: now,
    updatedAt: now,
  };
}

export function canProcessFardamentoRequest(
  products: Product[],
  request: Pick<CosturaRequest, 'quantity' | 'productId' | 'itemName'>,
): boolean {
  return evaluateFardamentoRequest(products, request).canFulfill;
}

export function getFardamentoAvailability(
  products: Product[],
  request: Pick<CosturaRequest, 'quantity' | 'productId' | 'itemName'>,
): RequestEvaluationResult {
  return evaluateFardamentoRequest(products, request);
}

export function createRepairRequest(input: {
  itemName: string;
  location?: string;
  quantity?: number;
  problem: string;
  photoUrl?: string;
  priority?: RequestPriority;
  requester?: string;
  requestedBy?: string;
  department?: CosturaDepartment;
  responsible?: string;
  observations?: string;
  deadline?: Date;
}): CosturaRequest {
  return createRequest({
    requestType: 'CONSERTO',
    department: input.department,
    itemName: input.itemName,
    location: input.location,
    quantity: input.quantity ?? 1,
    problem: input.problem,
    photoUrl: input.photoUrl,
    priority: input.priority ?? 'NORMAL',
    requester: input.requester ?? input.requestedBy,
    requestedBy: input.requestedBy ?? input.requester,
    observations: input.observations,
    deadline: input.deadline,
    productId: undefined,
    size: undefined,
    status: 'PENDENTE',
  } as any);
}

export function createGenericRequest(input: {
  itemName: string;
  requestType?: CosturaRequestType;
  description?: string;
  requester?: string;
  priority?: RequestPriority;
  department?: CosturaDepartment;
  deadline?: Date;
}): CosturaRequest {
  return createRequest({
    requestType: input.requestType ?? 'OUTRO',
    itemName: input.itemName,
    department: input.department,
    quantity: 1,
    priority: input.priority ?? 'NORMAL',
    requester: input.requester,
    requestedBy: input.requester,
    observations: input.description,
    deadline: input.deadline,
    status: 'PENDENTE',
  } as any);
}

export async function getRequestsFromStore(): Promise<CosturaRequest[]> {
  if (!isFirebaseConfigured() || !db) {
    return getRequests(demoRequests);
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.REQUESTS), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map(mapRequestDoc);
}

export function subscribeRequests(
  onData: (requests: CosturaRequest[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    onData(getRequests(demoRequests));
    return () => undefined;
  }

  const requestsQuery = query(
    collection(db, COLLECTIONS.REQUESTS),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => onData(snapshot.docs.map(mapRequestDoc)),
    (error) => onError(error),
  );
}

export async function saveRequest(request: CosturaRequest): Promise<CosturaRequest> {
  if (!isFirebaseConfigured() || !db) {
    demoRequests = [request, ...demoRequests.filter((item) => item.id !== request.id)];
    return request;
  }

  const { id, createdAt, updatedAt, ...requestData } = request;
  const docRef = await addDoc(collection(db, COLLECTIONS.REQUESTS), {
    ...requestToFirestore(requestData),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { ...request, id: docRef.id };
}

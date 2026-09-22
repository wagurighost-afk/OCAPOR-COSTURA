import {
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  AppUser,
  Category,
  CosturaRequest,
  Product,
  ProductionOrder,
  Repair,
  Release,
  StockMovement,
} from '@/types';

export function timestampToDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

type FirestoreDoc = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

export function mapUserDoc(doc: FirestoreDoc): AppUser {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name ?? '',
    email: data.email ?? '',
    role: data.role ?? 'COSTURA_GESTAO',
    active: data.active ?? true,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

function resolveStockItemType(data: Record<string, unknown>): Product['stockItemType'] {
  const value = data.stockItemType ?? data.stockType ?? 'PECA_PRONTA';
  if (value === 'PECA_PRONTA' || value === 'CORTE' || value === 'TECIDO' || value === 'AVIAMENTO') {
    return value;
  }
  return 'PECA_PRONTA';
}

export function mapCategoryDoc(
  doc: FirestoreDoc,
): Category {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name ?? '',
    description: data.description,
    active: data.active ?? true,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapProductDoc(
  doc: FirestoreDoc,
): Product {
  const data = doc.data() ?? {};
  const stockItemType = resolveStockItemType(data);
  return {
    id: doc.id,
    baseProductId: typeof data.baseProductId === 'string' ? data.baseProductId : undefined,
    name: data.name ?? '',
    code: data.code ?? '',
    categoryId: data.categoryId ?? '',
    department: data.department,
    stockType: stockItemType,
    stockItemType,
    subcategory: data.subcategory,
    model: data.model,
    gender: data.gender,
    size: data.size ?? '',
    color: data.color,
    currentStock: data.currentStock ?? 0,
    minimumStock: data.minimumStock ?? 0,
    idealStock: data.idealStock ?? 0,
    maximumStock: data.maximumStock ?? 0,
    inProduction: data.inProduction ?? 0,
    inRepair: data.inRepair ?? 0,
    active: data.active ?? true,
    imageUrl: data.imageUrl,
    notes: data.notes,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapProductionOrderDoc(
  doc: FirestoreDoc,
): ProductionOrder {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    requestId: data.requestId,
    productId: data.productId ?? '',
    productionType: data.productionType === 'ESPECIAL' ? 'ESPECIAL' : 'NORMAL',
    department: data.department,
    cutProductId: typeof data.cutProductId === 'string' ? data.cutProductId : undefined,
    readyProductId: typeof data.readyProductId === 'string' ? data.readyProductId : undefined,
    requestedQuantity: data.requestedQuantity ?? 0,
    cutQuantity: data.cutQuantity ?? 0,
    producedQuantity: data.producedQuantity ?? 0,
    remainingQuantity: data.remainingQuantity ?? 0,
    priority: data.priority ?? 'NORMAL',
    status: data.status ?? 'PENDENTE',
    requestedBy: data.requestedBy ?? '',
    responsible: data.responsible,
    requestedAt: timestampToDate(data.requestedAt),
    startedAt: data.startedAt ? timestampToDate(data.startedAt) : undefined,
    finishedAt: data.finishedAt ? timestampToDate(data.finishedAt) : undefined,
    deadline: data.deadline ? timestampToDate(data.deadline) : undefined,
    notes: data.notes,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapRepairDoc(doc: FirestoreDoc): Repair {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    requestId: data.requestId,
    productId: data.productId ?? undefined,
    itemName: data.itemName ?? data.name ?? '',
    department: data.department,
    location: data.location,
    quantity: data.quantity ?? 0,
    problem: data.problem ?? '',
    photoUrl: data.photoUrl,
    priority: data.priority ?? 'NORMAL',
    requester: data.requester,
    responsible: data.responsible,
    status: data.status ?? 'AGUARDANDO',
    entryDate: timestampToDate(data.entryDate),
    startedDate: data.startedDate
      ? timestampToDate(data.startedDate)
      : undefined,
    completedDate: data.completedDate
      ? timestampToDate(data.completedDate)
      : undefined,
    notes: data.notes,
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((entry: any) => ({
          ...entry,
          changedAt: entry?.changedAt ? timestampToDate(entry.changedAt) : new Date(),
        }))
      : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapReleaseDoc(
  doc: FirestoreDoc,
): Release {
  const data = doc.data() ?? {};
  const stockItemType = resolveStockItemType(data);
  return {
    id: doc.id,
    productId: data.productId ?? '',
    stockItemType,
    quantity: data.quantity ?? 0,
    requester: data.requester ?? '',
    department: data.department ?? '',
    authorizedBy: data.authorizedBy ?? '',
    createdAt: timestampToDate(data.createdAt),
    notes: data.notes,
  };
}

export function mapStockMovementDoc(
  doc: FirestoreDoc,
): StockMovement {
  const data = doc.data() ?? {};
  const stockItemType = resolveStockItemType(data);
  return {
    id: doc.id,
    productId: data.productId ?? '',
    stockItemType,
    department: data.department,
    sizeOrVariation: data.sizeOrVariation,
    type: data.type,
    quantity: data.quantity ?? 0,
    delta: typeof data.delta === 'number' ? data.delta : undefined,
    previousStock: data.previousStock ?? 0,
    newStock: data.newStock ?? 0,
    userId: data.userId ?? '',
    reason: data.reason,
    referenceId: data.referenceId,
    createdAt: timestampToDate(data.createdAt),
  };
}

export function mapRequestDoc(doc: FirestoreDoc): CosturaRequest {
  const data = doc.data() ?? {};
  const statusHistory = Array.isArray(data.statusHistory)
    ? data.statusHistory.map((entry: any) => ({
        ...entry,
        changedAt: entry?.changedAt ? timestampToDate(entry.changedAt) : new Date(),
      }))
    : [];

  return {
    id: doc.id,
    requestType: data.requestType ?? 'OUTRO',
    department: data.department,
    itemName: data.itemName ?? '',
    productId: data.productId,
    location: data.location,
    problem: data.problem,
    photoUrl: data.photoUrl,
    size: data.size,
    quantity: data.quantity ?? 0,
    requester: data.requester,
    requestedBy: data.requestedBy ?? data.requester,
    deadline: data.deadline ? timestampToDate(data.deadline) : undefined,
    priority: data.priority ?? 'NORMAL',
    status: data.status ?? 'PENDENTE',
    previousStatus: data.previousStatus,
    observations: data.observations,
    statusHistory,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function requestToFirestore(request: Omit<CosturaRequest, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    requestType: request.requestType,
    department: request.department ?? null,
    itemName: request.itemName,
    productId: request.productId ?? null,
    location: request.location ?? null,
    problem: request.problem ?? null,
    photoUrl: request.photoUrl ?? null,
    size: request.size ?? null,
    quantity: request.quantity,
    requester: request.requester ?? null,
    requestedBy: request.requestedBy ?? request.requester ?? null,
    deadline: request.deadline ? dateToTimestamp(request.deadline) : null,
    priority: request.priority,
    status: request.status,
    previousStatus: request.previousStatus ?? null,
    observations: request.observations ?? null,
    statusHistory: (request.statusHistory ?? []).map((entry) => ({
      ...entry,
      changedAt: dateToTimestamp(entry.changedAt),
    })),
  };
}

export function productToFirestore(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const stockItemType = product.stockItemType ?? product.stockType ?? 'PECA_PRONTA';
  return {
    baseProductId: product.baseProductId ?? null,
    name: product.name,
    code: product.code,
    categoryId: product.categoryId,
    department: product.department ?? null,
    stockItemType,
    stockType: stockItemType,
    subcategory: product.subcategory ?? null,
    model: product.model ?? null,
    gender: product.gender ?? null,
    size: product.size,
    color: product.color ?? null,
    currentStock: product.currentStock,
    minimumStock: product.minimumStock,
    idealStock: product.idealStock,
    maximumStock: product.maximumStock,
    inProduction: product.inProduction,
    inRepair: product.inRepair,
    active: product.active,
    imageUrl: product.imageUrl ?? null,
    notes: product.notes ?? null,
  };
}

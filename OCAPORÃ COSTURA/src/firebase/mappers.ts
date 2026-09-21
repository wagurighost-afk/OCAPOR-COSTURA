import {
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  AppUser,
  Category,
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

export function mapUserDoc(doc: QueryDocumentSnapshot<DocumentData>): AppUser {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name ?? '',
    email: data.email ?? '',
    role: data.role ?? 'COSTURA',
    active: data.active ?? true,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapCategoryDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): Category {
  const data = doc.data();
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
  doc: QueryDocumentSnapshot<DocumentData>,
): Product {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name ?? '',
    code: data.code ?? '',
    categoryId: data.categoryId ?? '',
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
  doc: QueryDocumentSnapshot<DocumentData>,
): ProductionOrder {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId ?? '',
    requestedQuantity: data.requestedQuantity ?? 0,
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

export function mapRepairDoc(doc: QueryDocumentSnapshot<DocumentData>): Repair {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId ?? '',
    quantity: data.quantity ?? 0,
    problem: data.problem ?? '',
    status: data.status ?? 'AGUARDANDO',
    responsible: data.responsible,
    entryDate: timestampToDate(data.entryDate),
    startedDate: data.startedDate
      ? timestampToDate(data.startedDate)
      : undefined,
    completedDate: data.completedDate
      ? timestampToDate(data.completedDate)
      : undefined,
    notes: data.notes,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function mapReleaseDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): Release {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId ?? '',
    quantity: data.quantity ?? 0,
    requester: data.requester ?? '',
    department: data.department ?? '',
    authorizedBy: data.authorizedBy ?? '',
    createdAt: timestampToDate(data.createdAt),
    notes: data.notes,
  };
}

export function mapStockMovementDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): StockMovement {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId ?? '',
    type: data.type,
    quantity: data.quantity ?? 0,
    previousStock: data.previousStock ?? 0,
    newStock: data.newStock ?? 0,
    userId: data.userId ?? '',
    reason: data.reason,
    referenceId: data.referenceId,
    createdAt: timestampToDate(data.createdAt),
  };
}

export function productToFirestore(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: product.name,
    code: product.code,
    categoryId: product.categoryId,
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

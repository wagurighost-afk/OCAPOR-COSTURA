import type {
  ProductionOrder,
  Product,
  RequestPriority,
  StockMovement,
} from '@/types';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase/config';
import { COLLECTIONS } from '@/constants';
import { mapProductionOrderDoc } from '@/firebase/mappers';
import {
  finishProduction as finishStockProduction,
  registerSpecialProduction,
  registerCut as registerStockCut,
} from '@/services/stockService';

let demoProductionOrders: ProductionOrder[] = [];

export class ProductionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionValidationError';
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateQuantity(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ProductionValidationError(`${label} deve ser um número válido.`);
  }

  if (value <= 0) {
    throw new ProductionValidationError(`${label} deve ser maior que zero.`);
  }

  return value;
}

function ensureOrderCanChange(order: ProductionOrder): void {
  if (order.status === 'CANCELADA') {
    throw new ProductionValidationError('Não é possível alterar uma ordem cancelada.');
  }

  if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA') {
    throw new ProductionValidationError('Não é possível alterar uma ordem já finalizada.');
  }
}

export function createProductionOrder(input: {
  requestId?: string;
  productId: string;
  productionType?: 'NORMAL' | 'ESPECIAL';
  cutProductId?: string;
  readyProductId?: string;
  department?: import('@/types').CosturaDepartment;
  requestedQuantity: number;
  priority?: RequestPriority;
  requestedBy: string;
  responsible?: string;
  deadline?: Date;
  notes?: string;
}): ProductionOrder {
  const productionType = input.productionType ?? 'NORMAL';
  if (!input.readyProductId) {
    throw new ProductionValidationError(
      'A ordem de produção precisa informar a peça pronta de destino.',
    );
  }

  if (productionType === 'NORMAL' && !input.cutProductId) {
    throw new ProductionValidationError(
      'Novas ordens de produção precisam informar os produtos de CORTE e PEÇA_PRONTA relacionados.',
    );
  }

  if (input.cutProductId && input.cutProductId === input.readyProductId) {
    throw new ProductionValidationError(
      'O produto de CORTE e o produto de PEÇA_PRONTA devem ser documentos diferentes.',
    );
  }

  const quantity = validateQuantity(input.requestedQuantity, 'Quantidade solicitada');
  const now = new Date();

  return {
    id: createId('production'),
    requestId: input.requestId,
    productId: input.productId,
    productionType,
    department: input.department,
    cutProductId: input.cutProductId,
    readyProductId: input.readyProductId,
    requestedQuantity: quantity,
    cutQuantity: 0,
    producedQuantity: 0,
    remainingQuantity: quantity,
    priority: input.priority ?? 'NORMAL',
    status: 'PENDENTE',
    requestedBy: input.requestedBy,
    responsible: input.responsible,
    requestedAt: now,
    deadline: input.deadline,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveProductionStockProducts(
  order: ProductionOrder,
  products: Product[],
): { cutProduct: Product; readyProduct: Product } {
  if (order.cutProductId && order.readyProductId) {
    const cutProduct = products.find((product) => product.id === order.cutProductId);
    const readyProduct = products.find((product) => product.id === order.readyProductId);

    if (!cutProduct || !readyProduct) {
      throw new ProductionValidationError(
        'A ordem referencia produtos de corte ou peça pronta que não foram encontrados.',
      );
    }

    validateProductionStockProducts(order, cutProduct, readyProduct, true);
    return { cutProduct, readyProduct };
  }

  const relatedProducts = products.filter(
    (product) => product.baseProductId === order.productId,
  );
  const cutProducts = relatedProducts.filter((product) => product.stockItemType === 'CORTE');
  const readyProducts = relatedProducts.filter(
    (product) => product.stockItemType === 'PECA_PRONTA',
  );

  if (cutProducts.length !== 1 || readyProducts.length !== 1) {
    throw new ProductionValidationError(
      'Esta ordem antiga precisa ser vinculada a exatamente um produto de CORTE e um produto de PEÇA_PRONTA antes da produção.',
    );
  }

  validateProductionStockProducts(order, cutProducts[0], readyProducts[0], false);
  return { cutProduct: cutProducts[0], readyProduct: readyProducts[0] };
}

function validateProductionStockProducts(
  order: ProductionOrder,
  cutProduct: Product,
  readyProduct: Product,
  requireExplicitIds: boolean,
): void {
  if (cutProduct.stockItemType !== 'CORTE') {
    throw new ProductionValidationError('O produto de corte precisa ser do tipo CORTE.');
  }

  if (readyProduct.stockItemType !== 'PECA_PRONTA') {
    throw new ProductionValidationError(
      'O produto de saída precisa ser do tipo PECA_PRONTA.',
    );
  }

  if (cutProduct.id === readyProduct.id) {
    throw new ProductionValidationError(
      'CORTE e PECA_PRONTA devem ser documentos de estoque diferentes.',
    );
  }

  if (requireExplicitIds) {
    if (cutProduct.id !== order.cutProductId || readyProduct.id !== order.readyProductId) {
      throw new ProductionValidationError(
        'Os produtos de estoque não correspondem às referências da ordem.',
      );
    }
  }

  if (
    cutProduct.baseProductId !== order.productId ||
    readyProduct.baseProductId !== order.productId
  ) {
    throw new ProductionValidationError(
      'Os produtos de CORTE e PEÇA_PRONTA não pertencem ao produto lógico desta ordem.',
    );
  }
}

export function getProductionOrderById(
  orders: ProductionOrder[],
  id: string,
): ProductionOrder | undefined {
  return orders.find((order) => order.id === id);
}

export function getProductionOrders(orders: ProductionOrder[]): ProductionOrder[] {
  return [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateProductionOrder(
  orders: ProductionOrder[],
  id: string,
  patch: Partial<ProductionOrder>,
): ProductionOrder | undefined {
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  const updated = {
    ...orders[index],
    ...patch,
    updatedAt: new Date(),
  };

  orders[index] = updated;
  return updated;
}

export function startProduction(
  order: ProductionOrder,
  responsible?: string,
  startedAt = new Date(),
): ProductionOrder {
  ensureOrderCanChange(order);

  return {
    ...order,
    responsible: responsible ?? order.responsible,
    startedAt,
    status: 'EM_PRODUCAO',
    updatedAt: new Date(),
  };
}

export function registerProductionCut(
  order: ProductionOrder,
  product: Product,
  cutQuantity: number,
  userId: string,
  reason?: string,
  referenceId?: string,
): { order: ProductionOrder; movement: ReturnType<typeof registerStockCut> } {
  if (product.stockItemType !== 'CORTE') {
    throw new ProductionValidationError('O produto usado para registrar o corte deve ser CORTE.');
  }

  const cutMatchesOrder = order.cutProductId
    ? product.id === order.cutProductId
    : product.baseProductId === order.productId;
  if (!cutMatchesOrder) {
    throw new ProductionValidationError(
      'O produto de corte não corresponde à referência da ordem de produção.',
    );
  }

  if (order.cutProductId && product.baseProductId !== order.productId) {
    throw new ProductionValidationError(
      'O produto de corte não pertence ao produto lógico da ordem.',
    );
  }

  ensureOrderCanChange(order);
  const quantity = validateQuantity(cutQuantity, 'Quantidade cortada');

  if (order.cutQuantity + quantity > order.requestedQuantity) {
    throw new ProductionValidationError(
      `Quantidade cortada excede o solicitado. Solicitado: ${order.requestedQuantity}. Já cortado: ${order.cutQuantity}.`,
    );
  }

  const movement = registerStockCut(product, quantity, userId, reason, referenceId);

  const updatedOrder: ProductionOrder = {
    ...order,
    cutQuantity: order.cutQuantity + quantity,
    remainingQuantity: Math.max(0, order.requestedQuantity - order.producedQuantity),
    status: order.status === 'PENDENTE' ? 'AGUARDANDO_PRODUCAO' : order.status,
    updatedAt: new Date(),
  };

  return { order: updatedOrder, movement };
}

export async function finishProduction(
  order: ProductionOrder,
  cutProduct: Product | undefined,
  readyProduct: Product,
  params: {
    usedCutQuantity: number;
    producedQuantity: number;
    userId: string;
    reason?: string;
    referenceId?: string;
  },
): Promise<{ order: ProductionOrder; movements: ReturnType<typeof finishStockProduction> | StockMovement }> {
  if (order.status === 'CANCELADA') {
    throw new ProductionValidationError('Não é possível finalizar uma ordem cancelada.');
  }

  if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA') {
    throw new ProductionValidationError('A ordem de produção já foi finalizada.');
  }

  const usedCutQuantity =
    order.productionType === 'ESPECIAL'
      ? params.usedCutQuantity
      : validateQuantity(params.usedCutQuantity, 'Cortes utilizados');
  if (!Number.isInteger(usedCutQuantity) || usedCutQuantity < 0) {
    throw new ProductionValidationError('Cortes utilizados deve ser um número inteiro não negativo.');
  }
  const producedQuantity = validateQuantity(params.producedQuantity, 'Quantidade produzida');

  if (order.producedQuantity + producedQuantity > order.requestedQuantity) {
    throw new ProductionValidationError(
      `Quantidade produzida excede o solicitado. Solicitado: ${order.requestedQuantity}. Já produzido: ${order.producedQuantity}.`,
    );
  }

  if (order.productionType !== 'ESPECIAL' && usedCutQuantity > order.cutQuantity) {
    throw new ProductionValidationError(
      `Quantidade de cortes utilizada excede o total cortado da ordem. Cortado: ${order.cutQuantity}.`,
    );
  }

  let movements: ReturnType<typeof finishStockProduction> | StockMovement;
  if (order.productionType === 'ESPECIAL') {
    if (!readyProduct) {
      throw new ProductionValidationError('A produção especial precisa de uma peça pronta de destino.');
    }
    if (usedCutQuantity !== 0) {
      throw new ProductionValidationError('Produção especial não utiliza cortes.');
    }
    movements = await registerSpecialProduction(readyProduct, producedQuantity, params.userId, {
      department: order.department ?? readyProduct.department,
      reason: params.reason ?? 'Produção especial',
      referenceId: params.referenceId,
    });
  } else {
    if (!cutProduct) {
      throw new ProductionValidationError('A produção normal precisa de um produto de CORTE.');
    }
    validateProductionStockProducts(order, cutProduct, readyProduct, Boolean(order.cutProductId || order.readyProductId));
    movements = finishStockProduction(cutProduct, readyProduct, {
      usedCutQuantity,
      producedQuantity,
      userId: params.userId,
      reason: params.reason ?? 'Produção finalizada',
      referenceId: params.referenceId,
    });
  }

  const newProduced = order.producedQuantity + producedQuantity;
  const remaining = Math.max(0, order.requestedQuantity - newProduced);

  const updatedOrder: ProductionOrder = {
    ...order,
    cutQuantity: order.cutQuantity,
    producedQuantity: newProduced,
    remainingQuantity: remaining,
    status: remaining > 0 ? 'PARCIAL' : 'FINALIZADA',
    finishedAt: remaining === 0 ? new Date() : undefined,
    updatedAt: new Date(),
  };

  return { order: updatedOrder, movements };
}

export function cancelProduction(
  order: ProductionOrder,
  actorId?: string,
  note?: string,
): ProductionOrder {
  if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA') {
    throw new ProductionValidationError('Não é possível cancelar uma ordem já finalizada.');
  }

  return {
    ...order,
    status: 'CANCELADA',
    updatedAt: new Date(),
    notes: note ? `${order.notes ?? ''} ${note}`.trim() : order.notes,
    responsible: actorId ?? order.responsible,
  };
}

export async function getProductionOrdersFromStore(): Promise<ProductionOrder[]> {
  if (!isFirebaseConfigured() || !db) {
    return getProductionOrders(demoProductionOrders);
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PRODUCTION_ORDERS), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map(mapProductionOrderDoc);
}

export function subscribeProductionOrders(
  onData: (orders: ProductionOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    onData(getProductionOrders(demoProductionOrders));
    return () => undefined;
  }

  const ordersQuery = query(
    collection(db, COLLECTIONS.PRODUCTION_ORDERS),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => onData(snapshot.docs.map(mapProductionOrderDoc)),
    (error) => onError(error),
  );
}

function productionOrderToFirestore(order: ProductionOrder) {
  return {
    requestId: order.requestId ?? null,
    productId: order.productId,
    productionType: order.productionType,
    department: order.department ?? null,
    cutProductId: order.cutProductId ?? null,
    readyProductId: order.readyProductId ?? null,
    requestedQuantity: order.requestedQuantity,
    cutQuantity: order.cutQuantity,
    producedQuantity: order.producedQuantity,
    remainingQuantity: order.remainingQuantity,
    priority: order.priority,
    status: order.status,
    requestedBy: order.requestedBy,
    responsible: order.responsible ?? null,
    requestedAt: order.requestedAt,
    startedAt: order.startedAt ?? null,
    finishedAt: order.finishedAt ?? null,
    deadline: order.deadline ?? null,
    notes: order.notes ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function saveProductionOrder(
  order: ProductionOrder,
): Promise<ProductionOrder> {
  if (!isFirebaseConfigured() || !db) {
    demoProductionOrders = [
      order,
      ...demoProductionOrders.filter((item) => item.id !== order.id),
    ];
    return order;
  }

  const orderData = productionOrderToFirestore(order);
  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTION_ORDERS), {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...order, id: docRef.id };
}

export async function updateProductionOrderStore(
  order: ProductionOrder,
): Promise<ProductionOrder> {
  if (!isFirebaseConfigured() || !db) {
    demoProductionOrders = demoProductionOrders.map((item) =>
      item.id === order.id ? order : item,
    );
    return order;
  }

  await updateDoc(doc(db, COLLECTIONS.PRODUCTION_ORDERS, order.id), {
    ...productionOrderToFirestore(order),
    updatedAt: serverTimestamp(),
  });
  return order;
}

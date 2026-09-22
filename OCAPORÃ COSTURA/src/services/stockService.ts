import type {
  CosturaDepartment,
  InventoryItemType,
  Product,
  StockMovement,
  StockMovementType,
} from '@/types';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase/config';
import { COLLECTIONS } from '@/constants';
import { updateDemoProduct } from '@/services/demoData';
import {
  getStockItemType,
  isCutItem,
  isFabricItem,
  isReadyItem,
  isSupplyItem,
} from '@/utils/stock';

export class StockOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockOperationError';
  }

}

export interface StockIdentity {
  productId?: string;
  baseProductId?: string;
  department?: CosturaDepartment;
  sizeOrVariation?: string;
  stockItemType?: InventoryItemType;
}

export function resolveStockProduct(products: Product[], identity: StockIdentity): Product {
  const candidates = products.filter((product) => {
    if (identity.productId && product.id !== identity.productId) return false;
    if (identity.baseProductId && product.baseProductId !== identity.baseProductId) return false;
    if (identity.department && product.department !== identity.department) return false;
    if (identity.sizeOrVariation && product.size !== identity.sizeOrVariation) return false;
    if (identity.stockItemType && getStockItemType(product) !== identity.stockItemType) return false;
    return true;
  });
  if (candidates.length === 0) throw new StockOperationError('Nenhum estoque corresponde à identidade informada.');
  if (candidates.length > 1) throw new StockOperationError('Mais de um estoque corresponde à identidade informada. Selecione o registro correto.');
  return candidates[0];
}

function toSafeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validatePositiveQuantity(
  quantity: number,
  label = 'Quantidade',
  allowZero = false,
): number {
  if (!Number.isFinite(quantity)) {
    throw new StockOperationError(`${label} deve ser um número válido.`);
  }

  if (quantity < 0) {
    throw new StockOperationError(`${label} não pode ser negativa.`);
  }

  if (!allowZero && quantity === 0) {
    throw new StockOperationError(`${label} deve ser maior que zero.`);
  }

  return quantity;
}

export function assertStockAvailable(
  product: Product,
  quantity: number,
  label = 'Estoque',
): void {
  validatePositiveQuantity(quantity, label);

  if (product.currentStock < quantity) {
    throw new StockOperationError(
      `${label} insuficiente para ${product.name}. Disponível: ${product.currentStock}. Solicitado: ${quantity}.`,
    );
  }
}

export function applyStockDelta(
  product: Product,
  delta: number,
  movementType: StockMovementType,
  userId: string,
  reason?: string,
  referenceId?: string,
): StockMovement {
  const safeDelta = Number(delta);
  if (!Number.isFinite(safeDelta)) {
    throw new StockOperationError('Movimentação de estoque inválida.');
  }

  const previousStock = product.currentStock;
  const nextStock = previousStock + safeDelta;

  if (nextStock < 0) {
    throw new StockOperationError(
      `Operação de estoque inválida para ${product.name}. Resultado final ficaria negativo: ${nextStock}.`,
    );
  }

  product.currentStock = nextStock;

  return {
    id: toSafeId('movement'),
    productId: product.id,
    stockItemType: getStockItemType(product),
    department: product.department,
    sizeOrVariation: product.size,
    type: movementType,
    quantity: Math.abs(safeDelta),
    delta: safeDelta,
    previousStock,
    newStock: nextStock,
    userId,
    reason,
    referenceId,
    createdAt: new Date(),
  };
}

export function getStockByType(
  products: Product[],
  type: InventoryItemType,
): Product[] {
  return products.filter((product) => getStockItemType(product) === type);
}

export function getFinishedPieces(products: Product[]): Product[] {
  return getStockByType(products, 'PECA_PRONTA');
}

export function getCuts(products: Product[]): Product[] {
  return getStockByType(products, 'CORTE');
}

export function getFabrics(products: Product[]): Product[] {
  return getStockByType(products, 'TECIDO');
}

export function getSupplies(products: Product[]): Product[] {
  return getStockByType(products, 'AVIAMENTO');
}

export interface AdjustStockInput {
  product: Product;
  newStock: number;
  performedBy: string;
  reason: string;
  notes?: string;
}

export async function adjustStock(input: AdjustStockInput): Promise<StockMovement> {
  if (!input.reason.trim()) {
    throw new StockOperationError('O motivo do ajuste é obrigatório.');
  }
  if (!Number.isInteger(input.newStock) || input.newStock < 0) {
    throw new StockOperationError('O novo estoque deve ser um número inteiro não negativo.');
  }

  const movement = applyStockDelta(
    input.product,
    input.newStock - input.product.currentStock,
    'AJUSTE',
    input.performedBy,
    input.notes?.trim()
      ? `${input.reason.trim()} — ${input.notes.trim()}`
      : input.reason.trim(),
  );

  if (!isFirebaseConfigured() || !db) {
    updateDemoProduct(input.product.id, { currentStock: input.product.currentStock });
    return movement;
  }

  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, input.product.id), {
    currentStock: input.product.currentStock,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, COLLECTIONS.STOCK_MOVEMENTS), {
    ...movement,
    createdAt: serverTimestamp(),
  });
  return movement;
}

export function getLowStockItems(products: Product[]): Product[] {
  return products.filter(
    (product) => product.currentStock > 0 && product.currentStock <= product.minimumStock,
  );
}

export function getOutOfStockItems(products: Product[]): Product[] {
  return products.filter((product) => product.currentStock <= 0);
}

export function registerCut(
  product: Product,
  quantity: number,
  userId: string,
  reason?: string,
  referenceId?: string,
): StockMovement {
  if (!isCutItem(product)) {
    throw new StockOperationError(
      `Registro de corte só é permitido para itens do tipo CORTE. Item atual: ${getStockItemType(product)}.`,
    );
  }

  const safeQuantity = validatePositiveQuantity(quantity, 'Quantidade de corte');
  return applyStockDelta(
    product,
    safeQuantity,
    'REALIZACAO_CORTE',
    userId,
    reason ?? 'Registro de corte realizado',
    referenceId,
  );
}

export function useCut(
  product: Product,
  quantity: number,
  userId: string,
  reason?: string,
  referenceId?: string,
): StockMovement {
  if (!isCutItem(product)) {
    throw new StockOperationError(
      `Utilização de corte só é permitida para itens do tipo CORTE. Item atual: ${getStockItemType(product)}.`,
    );
  }

  const safeQuantity = validatePositiveQuantity(quantity, 'Quantidade utilizada');
  assertStockAvailable(product, safeQuantity, 'Cortes disponíveis');

  return applyStockDelta(
    product,
    -safeQuantity,
    'UTILIZACAO_CORTE',
    userId,
    reason ?? 'Utilização de corte',
    referenceId,
  );
}

export function registerReadyStockEntry(
  product: Product,
  quantity: number,
  userId: string,
  reason?: string,
  referenceId?: string,
): StockMovement {
  if (!isReadyItem(product)) {
    throw new StockOperationError(
      `Entrada de peça pronta só é permitida para itens do tipo PECA_PRONTA. Item atual: ${getStockItemType(product)}.`,
    );
  }

  const safeQuantity = validatePositiveQuantity(quantity, 'Quantidade de peças prontas');

  return applyStockDelta(
    product,
    safeQuantity,
    'ENTRADA',
    userId,
    reason ?? 'Entrada de peça pronta',
    referenceId,
  );
}

export function releaseReadyStock(
  product: Product,
  quantity: number,
  userId: string,
  reason?: string,
  referenceId?: string,
): StockMovement {
  if (!isReadyItem(product)) {
    throw new StockOperationError(
      `Liberação só pode ocorrer para PECA_PRONTA. Item atual: ${getStockItemType(product)}.`,
    );
  }

  const safeQuantity = validatePositiveQuantity(quantity, 'Quantidade liberada');
  assertStockAvailable(product, safeQuantity, 'Peças prontas disponíveis');

  return applyStockDelta(
    product,
    -safeQuantity,
    'LIBERACAO',
    userId,
    reason ?? 'Liberação de peça pronta',
    referenceId,
  );
}

export function finishProduction(
  cutProduct: Product,
  readyProduct: Product,
  params: {
    usedCutQuantity: number;
    producedQuantity: number;
    userId: string;
    reason?: string;
    referenceId?: string;
  },
): { cutMovement: StockMovement; readyMovement: StockMovement } {
  const { usedCutQuantity, producedQuantity, userId, reason, referenceId } = params;

  if (!isCutItem(cutProduct)) {
    throw new StockOperationError(
      `Produto de corte inválido para produção. Tipo atual: ${getStockItemType(cutProduct)}.`,
    );
  }

  if (!isReadyItem(readyProduct)) {
    throw new StockOperationError(
      `Produto final pronto inválido para produção. Tipo atual: ${getStockItemType(readyProduct)}.`,
    );
  }

  if (cutProduct.id === readyProduct.id) {
    throw new StockOperationError(
      'CORTE e PECA_PRONTA devem ser documentos de estoque diferentes.',
    );
  }

  const safeUsedCutQuantity = validatePositiveQuantity(
    usedCutQuantity,
    'Quantidade de cortes utilizados',
  );
  const safeProducedQuantity = validatePositiveQuantity(
    producedQuantity,
    'Quantidade produzida',
  );

  assertStockAvailable(cutProduct, safeUsedCutQuantity, 'Cortes disponíveis');

  const cutMovement = applyStockDelta(
    cutProduct,
    -safeUsedCutQuantity,
    'UTILIZACAO_CORTE',
    userId,
    reason ?? 'Produção a partir de corte',
    referenceId,
  );

  const readyMovement = applyStockDelta(
    readyProduct,
    safeProducedQuantity,
    'PRODUCAO',
    userId,
    reason ?? 'Produção finalizada',
    referenceId,
  );

  return { cutMovement, readyMovement };
}

export async function registerSpecialProduction(
  readyProduct: Product,
  quantity: number,
  userId: string,
  params: {
    department?: string;
    reason?: string;
    referenceId?: string;
  } = {},
): Promise<StockMovement> {
  if (!isReadyItem(readyProduct)) {
    throw new StockOperationError(
      `Produção especial só pode adicionar estoque a PECA_PRONTA. Tipo atual: ${getStockItemType(readyProduct)}.`,
    );
  }

  const safeQuantity = validatePositiveQuantity(quantity, 'Quantidade produzida');
  if (!params.department && !readyProduct.department) {
    throw new StockOperationError('O setor da produção especial é obrigatório.');
  }
  if (!readyProduct.size.trim()) {
    throw new StockOperationError('A variação ou tamanho da produção especial é obrigatório.');
  }

  const previousStock = readyProduct.currentStock;
  const movement: StockMovement = {
    id: toSafeId('movement'),
    productId: readyProduct.id,
    stockItemType: 'PECA_PRONTA',
    department: readyProduct.department,
    sizeOrVariation: readyProduct.size,
    type: 'PRODUCAO_ESPECIAL',
    quantity: safeQuantity,
    delta: safeQuantity,
    previousStock,
    newStock: previousStock + safeQuantity,
    userId,
    reason: params.reason ?? 'Produção especial',
    referenceId: params.referenceId,
    createdAt: new Date(),
  };

  readyProduct.currentStock = movement.newStock;

  if (!isFirebaseConfigured() || !db) {
    updateDemoProduct(readyProduct.id, { currentStock: movement.newStock });
    return movement;
  }

  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, readyProduct.id), {
    currentStock: movement.newStock,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, COLLECTIONS.STOCK_MOVEMENTS), {
    ...movement,
    createdAt: serverTimestamp(),
  });

  return movement;
}

export function getStockSummary(products: Product[]) {
  return {
    readyItems: getFinishedPieces(products),
    cuts: getCuts(products),
    fabrics: getFabrics(products),
    supplies: getSupplies(products),
    lowStock: getLowStockItems(products),
    outOfStock: getOutOfStockItems(products),
  };
}

export function canReleaseForFardamento(product: Product, quantity: number): boolean {
  return isReadyItem(product) && quantity > 0 && product.currentStock >= quantity;
}

export function isFabricReleaseBlocked(product: Product): boolean {
  return isFabricItem(product);
}

export function isSupplyReleaseBlocked(product: Product): boolean {
  return isSupplyItem(product);
}

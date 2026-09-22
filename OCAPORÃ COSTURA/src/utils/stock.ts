import type { InventoryItemType, Product, StockStatus } from '@/types';

export function getStockItemType(
  product?: Pick<Product, 'stockItemType' | 'stockType'> | null,
): InventoryItemType {
  const value = product?.stockItemType ?? product?.stockType ?? 'PECA_PRONTA';
  if (
    value === 'PECA_PRONTA' ||
    value === 'CORTE' ||
    value === 'TECIDO' ||
    value === 'AVIAMENTO'
  ) {
    return value;
  }

  return 'PECA_PRONTA';
}

export function isReadyItem(product: Product): boolean {
  return getStockItemType(product) === 'PECA_PRONTA';
}

export function isCutItem(product: Product): boolean {
  return getStockItemType(product) === 'CORTE';
}

export function isFabricItem(product: Product): boolean {
  return getStockItemType(product) === 'TECIDO';
}

export function isSupplyItem(product: Product): boolean {
  return getStockItemType(product) === 'AVIAMENTO';
}

/**
 * Estoque disponível para liberação.
 * currentStock já representa o disponível (produção e conserto são contadores separados).
 */
export function getAvailableStock(product: Product): number {
  return Math.max(0, product.currentStock);
}

/**
 * Estoque físico total (disponível + em conserto).
 */
export function getPhysicalStock(product: Product): number {
  return product.currentStock + product.inRepair;
}

/**
 * Quantidade que precisa ser produzida para atingir o mínimo.
 */
export function getQuantityToProduce(product: Product): number {
  const available = getAvailableStock(product);
  if (available >= product.minimumStock) return 0;
  return product.minimumStock - available;
}

/**
 * Determina o status automático da peça com base no estoque disponível.
 */
export function getStockStatus(product: Product): StockStatus {
  const available = getAvailableStock(product);

  if (available === 0) return 'SEM_ESTOQUE';
  if (available < product.minimumStock) return 'ESTOQUE_BAIXO';
  return 'ESTOQUE_OK';
}

export function canRelease(product: Product, quantity: number): boolean {
  return isReadyItem(product) && quantity > 0 && quantity <= getAvailableStock(product);
}

export function getReleaseShortage(product: Product, requested: number): number {
  if (!isReadyItem(product)) return requested;
  const available = getAvailableStock(product);
  return Math.max(0, requested - available);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

export function validateProductForm(data: {
  name: string;
  code: string;
  categoryId: string;
  size: string;
  currentStock: number;
  minimumStock: number;
  idealStock: number;
  maximumStock: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) errors.name = 'Nome é obrigatório';
  if (!data.code.trim()) errors.code = 'Código é obrigatório';
  if (!data.categoryId) errors.categoryId = 'Categoria é obrigatória';
  if (!data.size.trim()) errors.size = 'Tamanho é obrigatório';

  if (data.currentStock < 0) errors.currentStock = 'Estoque não pode ser negativo';
  if (data.minimumStock < 0) errors.minimumStock = 'Mínimo não pode ser negativo';
  if (data.idealStock < 0) errors.idealStock = 'Ideal não pode ser negativo';
  if (data.maximumStock < 0) errors.maximumStock = 'Máximo não pode ser negativo';

  if (data.idealStock < data.minimumStock) {
    errors.idealStock = 'Ideal deve ser maior ou igual ao mínimo';
  }
  if (data.maximumStock < data.idealStock) {
    errors.maximumStock = 'Máximo deve ser maior ou igual ao ideal';
  }

  return errors;
}

export function matchesStockFilter(
  product: Product,
  filter: string,
): boolean {
  const status = getStockStatus(product);

  switch (filter) {
    case 'available':
      return status === 'ESTOQUE_OK';
    case 'low':
      return status === 'ESTOQUE_BAIXO';
    case 'empty':
      return status === 'SEM_ESTOQUE';
    case 'production':
      return product.inProduction > 0;
    case 'repair':
      return product.inRepair > 0;
    default:
      return true;
  }
}

export function searchProducts(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;

  return products.filter((product) => {
    const searchText = [
      product.name,
      product.code,
      product.size,
      product.model,
      product.color,
      product.subcategory,
      product.gender,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchText.includes(normalized);
  });
}

import type { Product, StockStatus } from '@/types';

export const APP_NAME = 'OCAPORÃ COSTURA';
export const APP_SUBTITLE = 'Controle de Costura';

export const COLLECTIONS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCTION_ORDERS: 'productionOrders',
  REPAIRS: 'repairs',
  RELEASES: 'releases',
  STOCK_MOVEMENTS: 'stockMovements',
} as const;

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ESTOQUE_OK: 'Estoque disponível',
  ESTOQUE_BAIXO: 'Estoque baixo',
  SEM_ESTOQUE: 'Sem estoque',
};

export const STOCK_STATUS_ICONS: Record<StockStatus, string> = {
  ESTOQUE_OK: '🟢',
  ESTOQUE_BAIXO: '🟡',
  SEM_ESTOQUE: '🔴',
};

export const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'available', label: 'Disponíveis' },
  { value: 'low', label: 'Estoque baixo' },
  { value: 'empty', label: 'Sem estoque' },
  { value: 'production', label: 'Em produção' },
  { value: 'repair', label: 'Em conserto' },
] as const;

export type StockFilter = (typeof STOCK_FILTER_OPTIONS)[number]['value'];

export const GENDER_OPTIONS = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'unissex', label: 'Unissex' },
] as const;

export const NAV_ITEMS = [
  { path: '/', label: 'Início', icon: 'Home' },
  { path: '/estoque', label: 'Estoque', icon: 'Package' },
  { path: '/producao', label: 'Produção', icon: 'Scissors' },
  { path: '/consertos', label: 'Consertos', icon: 'Wrench' },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Uniformes', description: 'Uniformes do hotel' },
  { name: 'Rouparia', description: 'Rouparia de quartos e áreas comuns' },
  { name: 'Outros', description: 'Outros itens de costura' },
];

export function getProductDisplayName(product: Product): string {
  const parts = [product.name];
  if (product.size) parts.push(product.size);
  return parts.join(' ');
}

export function getProductSearchText(product: Product): string {
  return [
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
}

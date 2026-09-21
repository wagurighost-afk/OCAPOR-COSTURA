export type UserRole = 'ADMIN' | 'COSTURA';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  subcategory?: string;
  model?: string;
  gender?: string;
  size: string;
  color?: string;
  /** Quantidade disponível para liberação */
  currentStock: number;
  minimumStock: number;
  idealStock: number;
  maximumStock: number;
  /** Peças em produção (não disponíveis) */
  inProduction: number;
  /** Peças em conserto (não disponíveis) */
  inRepair: number;
  active: boolean;
  imageUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StockStatus =
  | 'ESTOQUE_OK'
  | 'ESTOQUE_BAIXO'
  | 'SEM_ESTOQUE';

export type ProductionStatus =
  | 'PENDENTE'
  | 'EM_PRODUCAO'
  | 'PARCIAL'
  | 'FINALIZADA'
  | 'CANCELADA';

export type RepairStatus =
  | 'AGUARDANDO'
  | 'EM_CONSERTO'
  | 'CONCLUIDO'
  | 'INUTILIZADO';

export type StockMovementType =
  | 'ENTRADA'
  | 'SAIDA'
  | 'LIBERACAO'
  | 'PRODUCAO'
  | 'RETORNO_PRODUCAO'
  | 'ENVIO_CONSERTO'
  | 'RETORNO_CONSERTO'
  | 'INUTILIZACAO'
  | 'AJUSTE';

export interface ProductionOrder {
  id: string;
  productId: string;
  requestedQuantity: number;
  producedQuantity: number;
  remainingQuantity: number;
  priority: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  status: ProductionStatus;
  requestedBy: string;
  responsible?: string;
  requestedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  deadline?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repair {
  id: string;
  productId: string;
  quantity: number;
  problem: string;
  status: RepairStatus;
  responsible?: string;
  entryDate: Date;
  startedDate?: Date;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Release {
  id: string;
  productId: string;
  quantity: number;
  requester: string;
  department: string;
  authorizedBy: string;
  createdAt: Date;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  userId: string;
  reason?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface ProductFormData {
  name: string;
  code: string;
  categoryId: string;
  subcategory?: string;
  model?: string;
  gender?: string;
  size: string;
  color?: string;
  currentStock: number;
  minimumStock: number;
  idealStock: number;
  maximumStock: number;
  notes?: string;
}

export interface DashboardMetrics {
  available: number;
  needProduction: number;
  lowStock: number;
  inRepair: number;
  inProduction: number;
  pendingRequests: number;
}

export interface CriticalItem {
  product: Product;
  status: StockStatus;
}

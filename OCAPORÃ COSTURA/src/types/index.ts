export type UserRole = 'ADMIN' | 'COSTURA_GESTAO' | 'COSTURA_OPERACIONAL';

export type InventoryItemType =
  | 'PECA_PRONTA'
  | 'CORTE'
  | 'TECIDO'
  | 'AVIAMENTO';

export type CosturaDepartment =
  | 'COZINHA'
  | 'SERVICO_GERAL'
  | 'RECREACAO'
  | 'MEDRI'
  | 'RECEPCAO'
  | 'GARCOM'
  | 'GARCONETE'
  | 'GARCOM_GARCONETE'
  | 'JARDIM'
  | 'SUPERVISORES'
  | 'LAVANDERIA'
  | 'OUTRO';

export type CosturaRequestType =
  | 'FARDAMENTO'
  | 'PRODUCAO'
  | 'CONSERTO'
  | 'ESTOQUE'
  | 'OUTRO';

export type CosturaRequestStatus =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'AGUARDANDO_PRODUCAO'
  | 'EM_PRODUCAO'
  | 'AGUARDANDO_CONSERTO'
  | 'EM_CONSERTO'
  | 'PARCIAL'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'ABERTA'
  | 'APROVADA'
  | 'ENTREGUE';

export type RequestPriority = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

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
  /** Identidade lógica compartilhada por registros de estoque relacionados. */
  baseProductId?: string;
  name: string;
  code: string;
  categoryId: string;
  department?: CosturaDepartment;
  stockType?: InventoryItemType;
  stockItemType?: InventoryItemType;
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
  | 'EM_ANALISE'
  | 'AGUARDANDO_PRODUCAO'
  | 'EM_PRODUCAO'
  | 'AGUARDANDO_CONSERTO'
  | 'EM_CONSERTO'
  | 'PARCIAL'
  | 'FINALIZADA'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type RepairStatus =
  | 'AGUARDANDO'
  | 'PENDENTE'
  | 'EM_CONSERTO'
  | 'CONCLUIDO'
  | 'INUTILIZADO'
  | 'CANCELADO';

export type StockMovementType =
  | 'ENTRADA'
  | 'SAIDA'
  | 'LIBERACAO'
  | 'PRODUCAO'
  | 'RETORNO_PRODUCAO'
  | 'ENVIO_CONSERTO'
  | 'RETORNO_CONSERTO'
  | 'INUTILIZACAO'
  | 'AJUSTE'
  | 'REALIZACAO_CORTE'
  | 'UTILIZACAO_CORTE'
  | 'PRODUCAO_ESPECIAL';

export type ProductionType = 'NORMAL' | 'ESPECIAL';

export interface ProductionOrder {
  id: string;
  requestId?: string;
  productId: string;
  productionType: ProductionType;
  department?: CosturaDepartment;
  cutProductId?: string;
  readyProductId?: string;
  requestedQuantity: number;
  cutQuantity: number;
  producedQuantity: number;
  remainingQuantity: number;
  priority: RequestPriority;
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

export interface CreateProductionOrderInput {
  productId: string;
  productionType?: ProductionType;
  cutProductId?: string;
  readyProductId: string;
  department?: CosturaDepartment;
  requestedQuantity: number;
  priority: RequestPriority;
  responsible?: string;
  deadline?: Date;
  requestId?: string;
  notes?: string;
  requestedBy: string;
}

export interface RepairHistoryEntry {
  fromStatus?: RepairStatus;
  toStatus: RepairStatus;
  changedBy?: string;
  changedAt: Date;
  note?: string;
}

export interface Repair {
  id: string;
  requestId?: string;
  productId?: string;
  itemName: string;
  department?: string;
  location?: string;
  quantity: number;
  problem: string;
  photoUrl?: string;
  priority: RequestPriority;
  requester?: string;
  responsible?: string;
  status: RepairStatus;
  entryDate: Date;
  startedDate?: Date;
  completedDate?: Date;
  notes?: string;
  statusHistory?: RepairHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestStatusHistoryEntry {
  fromStatus?: CosturaRequestStatus;
  toStatus: CosturaRequestStatus;
  changedBy?: string;
  changedAt: Date;
  note?: string;
}

export interface CosturaRequest {
  id: string;
  requestType: CosturaRequestType;
  department?: CosturaDepartment;
  itemName: string;
  productId?: string;
  location?: string;
  problem?: string;
  photoUrl?: string;
  size?: string;
  quantity: number;
  requester?: string;
  requestedBy?: string;
  deadline?: Date;
  priority: RequestPriority;
  status: CosturaRequestStatus;
  previousStatus?: CosturaRequestStatus;
  observations?: string;
  statusHistory?: RequestStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Release {
  id: string;
  productId: string;
  stockItemType?: InventoryItemType;
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
  stockItemType?: InventoryItemType;
  department?: CosturaDepartment;
  sizeOrVariation?: string;
  type: StockMovementType;
  quantity: number;
  delta?: number;
  previousStock: number;
  newStock: number;
  userId: string;
  reason?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface ProductFormData {
  baseProductId?: string;
  name: string;
  code: string;
  categoryId: string;
  department?: CosturaDepartment;
  stockType?: InventoryItemType;
  stockItemType?: InventoryItemType;
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
  readyItemsAvailable: number;
  cutsAvailable: number;
  needProduction: number;
  lowStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  inRepair: number;
  inProduction: number;
  pendingRequests: number;
}

export interface CriticalItem {
  product: Product;
  status: StockStatus;
}

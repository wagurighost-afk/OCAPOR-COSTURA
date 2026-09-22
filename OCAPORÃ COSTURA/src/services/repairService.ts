import type {
  Repair,
  RepairHistoryEntry,
  RepairStatus,
  RequestPriority,
} from '@/types';

export class RepairValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepairValidationError';
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRepairStatus(status?: RepairStatus): RepairStatus {
  const valid: RepairStatus[] = ['AGUARDANDO', 'PENDENTE', 'EM_CONSERTO', 'CONCLUIDO', 'INUTILIZADO', 'CANCELADO'];
  if (status && valid.includes(status)) return status;
  return 'AGUARDANDO';
}

function validateQuantity(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RepairValidationError(`${label} deve ser um número válido.`);
  }

  if (value <= 0) {
    throw new RepairValidationError(`${label} deve ser maior que zero.`);
  }

  return value;
}

function appendHistory(
  history: RepairHistoryEntry[] | undefined,
  next: RepairHistoryEntry,
): RepairHistoryEntry[] {
  return [...(history ?? []), next];
}

export function createRepair(input: {
  requestId?: string;
  productId?: string;
  itemName: string;
  department?: string;
  location?: string;
  quantity: number;
  problem: string;
  photoUrl?: string;
  priority?: RequestPriority;
  requester?: string;
  responsible?: string;
  notes?: string;
  status?: RepairStatus;
}): Repair {
  const quantity = validateQuantity(input.quantity, 'Quantidade do conserto');
  if (!input.itemName || !input.itemName.trim()) {
    throw new RepairValidationError('Nome do item é obrigatório para o conserto.');
  }

  if (!input.problem || !input.problem.trim()) {
    throw new RepairValidationError('Descrição do problema é obrigatória.');
  }

  const now = new Date();
  const status = normalizeRepairStatus(input.status ?? 'AGUARDANDO');

  return {
    id: createId('repair'),
    requestId: input.requestId,
    productId: input.productId,
    itemName: input.itemName.trim(),
    department: input.department,
    location: input.location,
    quantity,
    problem: input.problem.trim(),
    photoUrl: input.photoUrl,
    priority: input.priority ?? 'NORMAL',
    requester: input.requester,
    responsible: input.responsible,
    status,
    entryDate: now,
    notes: input.notes,
    statusHistory: [
      {
        fromStatus: undefined,
        toStatus: status,
        changedBy: input.responsible ?? input.requester,
        changedAt: now,
        note: 'Conserto registrado',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function getRepairById(repairs: Repair[], id: string): Repair | undefined {
  return repairs.find((repair) => repair.id === id);
}

export function getRepairs(repairs: Repair[]): Repair[] {
  return [...repairs].sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
}

export function updateRepair(
  repairs: Repair[],
  id: string,
  patch: Partial<Repair>,
): Repair | undefined {
  const index = repairs.findIndex((repair) => repair.id === id);
  if (index === -1) return undefined;

  const updated = {
    ...repairs[index],
    ...patch,
    updatedAt: new Date(),
  };

  repairs[index] = updated;
  return updated;
}

export function startRepair(
  repair: Repair,
  responsible: string,
  actorId?: string,
  note?: string,
): Repair {
  if (repair.status === 'CANCELADO') {
    throw new RepairValidationError('Não é possível iniciar um conserto cancelado.');
  }

  if (repair.status === 'CONCLUIDO' || repair.status === 'INUTILIZADO') {
    throw new RepairValidationError('Não é possível iniciar um conserto já concluído ou inutilizado.');
  }

  const now = new Date();
  const nextStatus: RepairStatus = 'EM_CONSERTO';

  return {
    ...repair,
    responsible: responsible ?? repair.responsible,
    startedDate: now,
    status: nextStatus,
    statusHistory: appendHistory(repair.statusHistory, {
      fromStatus: repair.status,
      toStatus: nextStatus,
      changedBy: actorId ?? responsible ?? repair.requester,
      changedAt: now,
      note: note ?? 'Conserto iniciado',
    }),
    updatedAt: now,
  };
}

export function completeRepair(
  repair: Repair,
  responsible?: string,
  actorId?: string,
  note?: string,
): Repair {
  if (repair.status === 'CANCELADO') {
    throw new RepairValidationError('Não é possível concluir um conserto cancelado.');
  }

  if (repair.status === 'CONCLUIDO') {
    throw new RepairValidationError('Este conserto já foi concluído.');
  }

  const now = new Date();
  const nextStatus: RepairStatus = 'CONCLUIDO';

  return {
    ...repair,
    responsible: responsible ?? repair.responsible,
    completedDate: now,
    status: nextStatus,
    statusHistory: appendHistory(repair.statusHistory, {
      fromStatus: repair.status,
      toStatus: nextStatus,
      changedBy: actorId ?? responsible ?? repair.requester,
      changedAt: now,
      note: note ?? 'Conserto concluído',
    }),
    updatedAt: now,
  };
}

export function cancelRepair(
  repair: Repair,
  actorId?: string,
  note?: string,
): Repair {
  if (repair.status === 'CONCLUIDO' || repair.status === 'INUTILIZADO') {
    throw new RepairValidationError('Não é possível cancelar um conserto já concluído ou inutilizado.');
  }

  const now = new Date();
  const nextStatus: RepairStatus = 'CANCELADO';

  return {
    ...repair,
    status: nextStatus,
    statusHistory: appendHistory(repair.statusHistory, {
      fromStatus: repair.status,
      toStatus: nextStatus,
      changedBy: actorId ?? repair.responsible ?? repair.requester,
      changedAt: now,
      note: note ?? 'Conserto cancelado',
    }),
    updatedAt: now,
  };
}

export function markRepairUnusable(
  repair: Repair,
  responsible: string,
  actorId?: string,
  note?: string,
): Repair {
  const now = new Date();
  const nextStatus: RepairStatus = 'INUTILIZADO';

  return {
    ...repair,
    responsible: responsible ?? repair.responsible,
    status: nextStatus,
    statusHistory: appendHistory(repair.statusHistory, {
      fromStatus: repair.status,
      toStatus: nextStatus,
      changedBy: actorId ?? responsible ?? repair.requester,
      changedAt: now,
      note: note ?? 'Item inutilizado após análise',
    }),
    updatedAt: now,
  };
}

export const BUDGET_STATUS = {
  DRAFT: 'draft',
  QUOTED: 'pending', // Corrected value for DB enum
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONVERTED: 'converted',
};

export const WORK_ORDER_STATUS = {
  OPEN: 'Aberta',
  COMPLETED: 'completed', // Database value is lowercase 'completed'
  CANCELED: 'Cancelada',
};

export const BUDGET_STATUS_MAP = {
  [BUDGET_STATUS.DRAFT]: { label: 'Rascunho', variant: 'default' },
  [BUDGET_STATUS.QUOTED]: { label: 'Orçamento', variant: 'warning' },
  [BUDGET_STATUS.APPROVED]: { label: 'Aprovado', variant: 'success' },
  [BUDGET_STATUS.REJECTED]: { label: 'Rejeitado', variant: 'destructive' },
  [BUDGET_STATUS.CONVERTED]: { label: 'Convertido em OS', variant: 'secondary' }, 
};

// Function to get the appropriate variant for budget status badges
export const getStatusVariant = (status) => {
  return BUDGET_STATUS_MAP[status]?.variant || 'secondary'; // Default to 'secondary' if status not found
};

// Define color classes for budget statuses
export const BUDGET_STATUS_COLORS = {
  [BUDGET_STATUS.DRAFT]: 'text-gray-600 border-gray-300 bg-gray-50',
  [BUDGET_STATUS.QUOTED]: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  [BUDGET_STATUS.APPROVED]: 'text-green-700 border-green-300 bg-green-50',
  [BUDGET_STATUS.REJECTED]: 'text-red-700 border-red-300 bg-red-50',
  [BUDGET_STATUS.CONVERTED]: 'text-blue-700 border-blue-300 bg-blue-50',
};

export const OS_STATUS_MAP = {
  'Aberta': { label: 'Aberta', variant: 'info' },
  'completed': { label: 'Concluído', variant: 'success' }, // Mapped 'completed' to 'Concluído'
  'Concluída': { label: 'Concluído', variant: 'success' }, // Fallback for legacy data
  'Cancelada': { label: 'Cancelada', variant: 'destructive' },
};

export const PRODUCT_TYPES = {
  MESTRE: 'mestre',
  SIMPLES: 'simples',
};

export const PRODUCT_TYPE_LABELS = {
  [PRODUCT_TYPES.MESTRE]: 'Produto Mestre',
  [PRODUCT_TYPES.SIMPLES]: 'Produto Simples',
};
export const inventoryStockStatuses = ["available", "reserved", "in_transit", "damaged"] as const;

export type InventoryStockStatus = (typeof inventoryStockStatuses)[number];

export const inventoryOperationTypes = [
  "inbound",
  "outbound",
  "transfer",
  "reservation",
  "release",
  "count_adjustment"
] as const;

export type InventoryOperationType = (typeof inventoryOperationTypes)[number];

export interface InventoryBalanceRecord {
  warehouseId: string;
  skuId: string;
  stockStatus: InventoryStockStatus;
  quantity: number;
}

export interface InventoryTransactionRecord {
  id: string;
  operationId: string;
  operationType: InventoryOperationType;
  warehouseId: string;
  skuId: string;
  stockStatus: InventoryStockStatus;
  quantityDelta: number;
  createdAt: string;
  referenceWarehouseId?: string | null;
}

export interface InventoryBalanceFilter {
  warehouseId?: string;
  skuId?: string;
  stockStatus?: InventoryStockStatus;
}

export interface InventoryTransactionFilter extends InventoryBalanceFilter {
  operationType?: InventoryOperationType;
}

export interface InventoryQuantityInput {
  warehouseId: string;
  skuId: string;
  quantity: number;
}

export interface InventoryTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  skuId: string;
  quantity: number;
}

export interface InventoryCountAdjustmentInput {
  warehouseId: string;
  skuId: string;
  countedQuantity: number;
}

export interface InventoryOperationResult {
  operationId: string;
  transactions: InventoryTransactionRecord[];
}

export function isInventoryStockStatus(value: string): value is InventoryStockStatus {
  return (inventoryStockStatuses as readonly string[]).includes(value);
}

export function isInventoryOperationType(value: string): value is InventoryOperationType {
  return (inventoryOperationTypes as readonly string[]).includes(value);
}

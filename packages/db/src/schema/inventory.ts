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

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

function requireInventoryStockStatus(value: InventoryStockStatus): InventoryStockStatus {
  if (!(inventoryStockStatuses as readonly string[]).includes(value)) {
    throw new Error("inventory_stock_status_invalid");
  }

  return value;
}

function requireInventoryOperationType(value: InventoryOperationType): InventoryOperationType {
  if (!(inventoryOperationTypes as readonly string[]).includes(value)) {
    throw new Error("inventory_operation_type_invalid");
  }

  return value;
}

function requireQuantity(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }

  return value;
}

function requireQuantityDelta(value: number): number {
  if (!Number.isFinite(value) || value === 0) {
    throw new Error("inventory_quantity_delta_invalid");
  }

  return value;
}

function normalizeTimestamp(value: string): string {
  const normalized = requireText(value, "inventory_created_at");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error("inventory_created_at_invalid");
  }

  return date.toISOString();
}

export function validateInventoryBalanceRecord(input: InventoryBalanceRecord): InventoryBalanceRecord {
  return {
    warehouseId: requireText(input.warehouseId, "inventory_warehouse_id"),
    skuId: requireText(input.skuId, "inventory_sku_id"),
    stockStatus: requireInventoryStockStatus(input.stockStatus),
    quantity: requireQuantity(input.quantity, "inventory_quantity")
  };
}

export function validateInventoryTransactionRecord(
  input: InventoryTransactionRecord
): InventoryTransactionRecord {
  return {
    id: requireText(input.id, "inventory_transaction_id"),
    operationId: requireText(input.operationId, "inventory_operation_id"),
    operationType: requireInventoryOperationType(input.operationType),
    warehouseId: requireText(input.warehouseId, "inventory_transaction_warehouse_id"),
    skuId: requireText(input.skuId, "inventory_transaction_sku_id"),
    stockStatus: requireInventoryStockStatus(input.stockStatus),
    quantityDelta: requireQuantityDelta(input.quantityDelta),
    createdAt: normalizeTimestamp(input.createdAt),
    referenceWarehouseId: input.referenceWarehouseId?.trim() || null
  };
}

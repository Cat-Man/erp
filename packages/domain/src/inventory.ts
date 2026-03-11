export const inventoryStockStatuses = ["available", "reserved", "in_transit", "damaged"] as const;

export type InventoryStockStatus = (typeof inventoryStockStatuses)[number];

export interface InventoryBalanceKeyInput {
  warehouseId: string;
  skuId: string;
  stockStatus: InventoryStockStatus;
}

export function buildInventoryBalanceKey(input: InventoryBalanceKeyInput): string {
  return `${input.warehouseId}::${input.skuId}::${input.stockStatus}`;
}

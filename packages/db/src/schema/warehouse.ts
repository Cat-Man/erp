export type WarehouseType = "central" | "store";
export type WarehouseStatus = "active" | "inactive";

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  storeId: string;
  status: WarehouseStatus;
}

export interface CreateWarehouseInput {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  storeId: string;
  status?: WarehouseStatus;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

export function validateCreateWarehouseInput(input: CreateWarehouseInput): WarehouseRecord {
  return {
    id: requireText(input.id, "warehouse_id"),
    code: requireText(input.code, "warehouse_code"),
    name: requireText(input.name, "warehouse_name"),
    type: input.type,
    storeId: requireText(input.storeId, "warehouse_store_id"),
    status: input.status ?? "active"
  };
}

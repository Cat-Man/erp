export type StoreStatus = "active" | "inactive";

export interface StoreRecord {
  id: string;
  code: string;
  name: string;
  regionId: string | null;
  status: StoreStatus;
}

export interface CreateStoreInput {
  id: string;
  code: string;
  name: string;
  regionId?: string | null;
  status?: StoreStatus;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

export function validateCreateStoreInput(input: CreateStoreInput): StoreRecord {
  return {
    id: requireText(input.id, "store_id"),
    code: requireText(input.code, "store_code"),
    name: requireText(input.name, "store_name"),
    regionId: input.regionId?.trim() || null,
    status: input.status ?? "active"
  };
}

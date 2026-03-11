export type SkuStatus = "active" | "inactive";

export interface SkuRecord {
  id: string;
  skuCode: string;
  barcode: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  status: SkuStatus;
}

export interface CreateSkuInput {
  id: string;
  skuCode: string;
  barcode: string;
  name: string;
  brandId?: string | null;
  categoryId?: string | null;
  status?: SkuStatus;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

export function validateCreateSkuInput(input: CreateSkuInput): SkuRecord {
  return {
    id: requireText(input.id, "sku_id"),
    skuCode: requireText(input.skuCode, "sku_code"),
    barcode: requireText(input.barcode, "sku_barcode"),
    name: requireText(input.name, "sku_name"),
    brandId: input.brandId?.trim() || null,
    categoryId: input.categoryId?.trim() || null,
    status: input.status ?? "active"
  };
}

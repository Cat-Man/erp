export type PriceType = "base" | "store_override";

export interface PriceRecord {
  id: string;
  skuId: string;
  storeId: string;
  priceType: PriceType;
  salePrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CreatePriceInput {
  id: string;
  skuId: string;
  storeId: string;
  priceType: PriceType;
  salePrice: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

function normalizeDate(value: string, field: string): string {
  const normalized = requireText(value, field);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field}_invalid`);
  }

  return date.toISOString();
}

export function validateCreatePriceInput(input: CreatePriceInput): PriceRecord {
  const effectiveFrom = normalizeDate(input.effectiveFrom, "price_effective_from");
  const effectiveTo = input.effectiveTo ? normalizeDate(input.effectiveTo, "price_effective_to") : null;

  if (!Number.isFinite(input.salePrice) || input.salePrice <= 0) {
    throw new Error("price_sale_price_invalid");
  }

  if (effectiveTo && new Date(effectiveTo).getTime() < new Date(effectiveFrom).getTime()) {
    throw new Error("price_effective_range_invalid");
  }

  return {
    id: requireText(input.id, "price_id"),
    skuId: requireText(input.skuId, "price_sku_id"),
    storeId: requireText(input.storeId, "price_store_id"),
    priceType: input.priceType,
    salePrice: input.salePrice,
    effectiveFrom,
    effectiveTo
  };
}

function toRangeEnd(value: string | null): number {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

export function hasPriceOverlap(existing: PriceRecord, candidate: PriceRecord): boolean {
  if (
    existing.skuId !== candidate.skuId ||
    existing.storeId !== candidate.storeId ||
    existing.priceType !== candidate.priceType
  ) {
    return false;
  }

  const existingStart = new Date(existing.effectiveFrom).getTime();
  const existingEnd = toRangeEnd(existing.effectiveTo);
  const candidateStart = new Date(candidate.effectiveFrom).getTime();
  const candidateEnd = toRangeEnd(candidate.effectiveTo);

  return existingStart <= candidateEnd && candidateStart <= existingEnd;
}

import { MasterDataError } from "./errors.js";
import type {
  CreatePriceInput,
  CreateSkuInput,
  CreateStoreInput,
  CreateWarehouseInput,
  PriceRecord,
  SkuRecord,
  StoreRecord,
  WarehouseRecord
} from "./types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MasterDataError(400, `${field}_required`);
  }

  return normalized;
}

function normalizeDate(value: string, field: string): string {
  const normalized = requireText(value, field);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new MasterDataError(400, `${field}_invalid`);
  }

  return date.toISOString();
}

function normalizeStore(input: CreateStoreInput): StoreRecord {
  return {
    id: requireText(input.id, "store_id"),
    code: requireText(input.code, "store_code"),
    name: requireText(input.name, "store_name"),
    regionId: input.regionId?.trim() || null,
    status: input.status ?? "active"
  };
}

function normalizeWarehouse(input: CreateWarehouseInput): WarehouseRecord {
  return {
    id: requireText(input.id, "warehouse_id"),
    code: requireText(input.code, "warehouse_code"),
    name: requireText(input.name, "warehouse_name"),
    type: input.type,
    storeId: requireText(input.storeId, "warehouse_store_id"),
    status: input.status ?? "active"
  };
}

function normalizeSku(input: CreateSkuInput): SkuRecord {
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

function normalizePrice(input: CreatePriceInput): PriceRecord {
  const effectiveFrom = normalizeDate(input.effectiveFrom, "price_effective_from");
  const effectiveTo = input.effectiveTo ? normalizeDate(input.effectiveTo, "price_effective_to") : null;

  if (!Number.isFinite(input.salePrice) || input.salePrice <= 0) {
    throw new MasterDataError(400, "price_sale_price_invalid");
  }

  if (effectiveTo && new Date(effectiveTo).getTime() < new Date(effectiveFrom).getTime()) {
    throw new MasterDataError(400, "price_effective_range_invalid");
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

function rangeEnd(value: string | null): number {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

function pricesOverlap(existing: PriceRecord, candidate: PriceRecord): boolean {
  if (
    existing.skuId !== candidate.skuId ||
    existing.storeId !== candidate.storeId ||
    existing.priceType !== candidate.priceType
  ) {
    return false;
  }

  const existingStart = new Date(existing.effectiveFrom).getTime();
  const existingEnd = rangeEnd(existing.effectiveTo);
  const candidateStart = new Date(candidate.effectiveFrom).getTime();
  const candidateEnd = rangeEnd(candidate.effectiveTo);

  return existingStart <= candidateEnd && candidateStart <= existingEnd;
}

export class MasterDataService {
  private readonly stores = new Map<string, StoreRecord>();
  private readonly warehouses = new Map<string, WarehouseRecord>();
  private readonly skus = new Map<string, SkuRecord>();
  private readonly prices: PriceRecord[] = [];

  createStore(input: CreateStoreInput): StoreRecord {
    const store = normalizeStore(input);

    if (this.stores.has(store.id)) {
      throw new MasterDataError(409, "store_id_conflict");
    }

    if ([...this.stores.values()].some((entry) => entry.code === store.code)) {
      throw new MasterDataError(409, "store_code_conflict");
    }

    this.stores.set(store.id, store);
    return store;
  }

  listStores(): StoreRecord[] {
    return [...this.stores.values()];
  }

  getStore(id: string): StoreRecord | null {
    return this.stores.get(id) ?? null;
  }

  createWarehouse(input: CreateWarehouseInput): WarehouseRecord {
    const warehouse = normalizeWarehouse(input);

    if (!this.stores.has(warehouse.storeId)) {
      throw new MasterDataError(400, "warehouse_store_not_found");
    }

    if (this.warehouses.has(warehouse.id)) {
      throw new MasterDataError(409, "warehouse_id_conflict");
    }

    if ([...this.warehouses.values()].some((entry) => entry.code === warehouse.code)) {
      throw new MasterDataError(409, "warehouse_code_conflict");
    }

    this.warehouses.set(warehouse.id, warehouse);
    return warehouse;
  }

  listWarehouses(): WarehouseRecord[] {
    return [...this.warehouses.values()];
  }

  getWarehouse(id: string): WarehouseRecord | null {
    return this.warehouses.get(id) ?? null;
  }

  createSku(input: CreateSkuInput): SkuRecord {
    const sku = normalizeSku(input);

    if (this.skus.has(sku.id)) {
      throw new MasterDataError(409, "sku_id_conflict");
    }

    if ([...this.skus.values()].some((entry) => entry.skuCode === sku.skuCode)) {
      throw new MasterDataError(409, "sku_code_conflict");
    }

    if ([...this.skus.values()].some((entry) => entry.barcode === sku.barcode)) {
      throw new MasterDataError(409, "duplicate_barcode");
    }

    this.skus.set(sku.id, sku);
    return sku;
  }

  listSkus(): SkuRecord[] {
    return [...this.skus.values()];
  }

  getSku(id: string): SkuRecord | null {
    return this.skus.get(id) ?? null;
  }

  createPrice(input: CreatePriceInput): PriceRecord {
    const price = normalizePrice(input);

    if (!this.skus.has(price.skuId)) {
      throw new MasterDataError(400, "price_sku_not_found");
    }

    if (!this.stores.has(price.storeId)) {
      throw new MasterDataError(400, "price_store_not_found");
    }

    if (this.prices.some((entry) => entry.id === price.id)) {
      throw new MasterDataError(409, "price_id_conflict");
    }

    if (this.prices.some((entry) => pricesOverlap(entry, price))) {
      throw new MasterDataError(409, "price_overlap");
    }

    this.prices.push(price);
    return price;
  }

  listPrices(): PriceRecord[] {
    return [...this.prices];
  }
}

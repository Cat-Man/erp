export type StoreStatus = "active" | "inactive";
export type WarehouseType = "central" | "store";
export type WarehouseStatus = "active" | "inactive";
export type SkuStatus = "active" | "inactive";
export type PriceType = "base" | "store_override";

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

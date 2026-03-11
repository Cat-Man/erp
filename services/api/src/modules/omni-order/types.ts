export type OmniOrderStatus = "reserved" | "reservation_failed";

export interface OmniOrderLineInput {
  skuId: string;
  quantity: number;
}

export interface OmniOrderSyncInput {
  externalOrderId: string;
  channel: "mock-marketplace";
  lines: OmniOrderLineInput[];
  candidateWarehouseIds?: string[];
  rawPayload: Record<string, unknown>;
}

export interface OmniOrderRecord {
  externalOrderId: string;
  channel: "mock-marketplace";
  status: OmniOrderStatus;
  fulfillmentWarehouseId: string | null;
  lines: OmniOrderLineInput[];
  rawPayload: Record<string, unknown>;
  failureReason: string | null;
  syncedAt: string;
}

export interface OmniOrderRetryInput {
  externalOrderId: string;
}

export interface OmniOrderSyncResult {
  created: boolean;
  order: OmniOrderRecord;
}

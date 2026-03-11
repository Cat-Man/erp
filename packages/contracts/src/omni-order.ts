export const mockMarketplaceChannel = "mock-marketplace" as const;

export const omniOrderStatuses = ["reserved", "reservation_failed"] as const;
export type OmniOrderStatus = (typeof omniOrderStatuses)[number];

export interface OmniOrderLine {
  skuId: string;
  quantity: number;
}

export interface MockMarketplaceSyncRequest {
  externalOrderId: string;
  channel: typeof mockMarketplaceChannel;
  lines: OmniOrderLine[];
  candidateWarehouseIds?: string[];
  rawPayload: Record<string, unknown>;
}

export interface OmniOrderRetryRequest {
  externalOrderId: string;
}

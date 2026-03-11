import { OmniOrderError } from "../../omni-order/errors.js";
import type { OmniOrderLineInput, OmniOrderSyncInput } from "../../omni-order/types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new OmniOrderError(400, `${field}_required`);
  }

  return normalized;
}

function normalizeLines(lines: Array<{ skuId: string; quantity: number }>): OmniOrderLineInput[] {
  if (!lines.length) {
    throw new OmniOrderError(400, "omni_order_lines_required");
  }

  return lines.map((line) => ({
    skuId: requireText(line.skuId, "omni_order_sku_id"),
    quantity: line.quantity
  }));
}

export interface MockMarketplacePayload {
  externalOrderId: string;
  channel: "mock-marketplace";
  lines: Array<{ skuId: string; quantity: number }>;
  candidateWarehouseIds?: string[];
  rawPayload: Record<string, unknown>;
}

export function normalizeMockMarketplacePayload(payload: MockMarketplacePayload): OmniOrderSyncInput {
  return {
    externalOrderId: requireText(payload.externalOrderId, "omni_order_external_order_id"),
    channel: payload.channel,
    lines: normalizeLines(payload.lines),
    candidateWarehouseIds: payload.candidateWarehouseIds?.map((value) =>
      requireText(value, "omni_order_candidate_warehouse_id")
    ),
    rawPayload: payload.rawPayload
  };
}

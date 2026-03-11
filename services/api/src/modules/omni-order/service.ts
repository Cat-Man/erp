import { InventoryService } from "../inventory/service.js";
import { MasterDataService } from "../master-data/service.js";
import { MetricsService } from "../metrics/service.js";
import { OmniOrderError } from "./errors.js";
import type {
  OmniOrderLineInput,
  OmniOrderRecord,
  OmniOrderRetryInput,
  OmniOrderSyncInput,
  OmniOrderSyncResult
} from "./types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new OmniOrderError(400, `${field}_required`);
  }

  return normalized;
}

function requirePositiveQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new OmniOrderError(400, "omni_order_quantity_invalid");
  }

  return value;
}

function normalizeLines(lines: OmniOrderLineInput[]): OmniOrderLineInput[] {
  if (!lines.length) {
    throw new OmniOrderError(400, "omni_order_lines_required");
  }

  return lines.map((line) => ({
    skuId: requireText(line.skuId, "omni_order_sku_id"),
    quantity: requirePositiveQuantity(line.quantity)
  }));
}

export class OmniOrderService {
  private readonly orders = new Map<string, OmniOrderRecord>();

  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
    private readonly metricsService?: MetricsService
  ) {}

  syncOrder(input: OmniOrderSyncInput): OmniOrderSyncResult {
    const externalOrderId = requireText(input.externalOrderId, "omni_order_external_order_id");
    const existingOrder = this.orders.get(externalOrderId);
    if (existingOrder) {
      return {
        created: false,
        order: existingOrder
      };
    }

    const order = this.buildOrder({
      externalOrderId,
      channel: input.channel,
      lines: normalizeLines(input.lines),
      candidateWarehouseIds: input.candidateWarehouseIds,
      rawPayload: input.rawPayload
    });

    this.orders.set(order.externalOrderId, order);
    this.recordOrderOutcome("sync", order);
    return {
      created: true,
      order
    };
  }

  retryReservation(input: OmniOrderRetryInput): OmniOrderRecord {
    const externalOrderId = requireText(input.externalOrderId, "omni_order_external_order_id");
    const existingOrder = this.orders.get(externalOrderId);
    if (!existingOrder) {
      throw new OmniOrderError(404, "omni_order_not_found");
    }

    if (existingOrder.status === "reserved") {
      return existingOrder;
    }

    const retriedOrder = this.buildOrder(existingOrder);
    this.orders.set(retriedOrder.externalOrderId, retriedOrder);
    this.recordOrderOutcome("retry", retriedOrder);
    return retriedOrder;
  }

  listOrders(): OmniOrderRecord[] {
    return [...this.orders.values()].sort((left, right) =>
      left.externalOrderId.localeCompare(right.externalOrderId)
    );
  }

  getOrder(externalOrderId: string): OmniOrderRecord | null {
    return this.orders.get(externalOrderId) ?? null;
  }

  private buildOrder(input: {
    externalOrderId: string;
    channel: "mock-marketplace";
    lines: OmniOrderLineInput[];
    candidateWarehouseIds?: string[];
    rawPayload: Record<string, unknown>;
  }): OmniOrderRecord {
    this.ensureSkuExists(input.lines);

    const candidateWarehouseIds = this.resolveCandidateWarehouseIds(input.candidateWarehouseIds);
    const fulfillmentWarehouseId = this.pickFulfillmentWarehouse(candidateWarehouseIds, input.lines);

    if (!fulfillmentWarehouseId) {
      return {
        externalOrderId: input.externalOrderId,
        channel: input.channel,
        status: "reservation_failed",
        fulfillmentWarehouseId: null,
        lines: input.lines,
        rawPayload: input.rawPayload,
        failureReason: "insufficient_inventory",
        syncedAt: new Date().toISOString()
      };
    }

    for (const line of input.lines) {
      this.inventoryService.createReservation({
        warehouseId: fulfillmentWarehouseId,
        skuId: line.skuId,
        quantity: line.quantity
      });
    }

    return {
      externalOrderId: input.externalOrderId,
      channel: input.channel,
      status: "reserved",
      fulfillmentWarehouseId,
      lines: input.lines,
      rawPayload: input.rawPayload,
      failureReason: null,
      syncedAt: new Date().toISOString()
    };
  }

  private ensureSkuExists(lines: OmniOrderLineInput[]): void {
    for (const line of lines) {
      if (!this.masterDataService.getSku(line.skuId)) {
        throw new OmniOrderError(400, "omni_order_sku_not_found");
      }
    }
  }

  private resolveCandidateWarehouseIds(candidateWarehouseIds?: string[]): string[] {
    if (candidateWarehouseIds?.length) {
      return candidateWarehouseIds.filter((warehouseId) => this.masterDataService.getWarehouse(warehouseId));
    }

    return this.masterDataService.listWarehouses().map((warehouse) => warehouse.id);
  }

  private pickFulfillmentWarehouse(
    candidateWarehouseIds: string[],
    lines: OmniOrderLineInput[]
  ): string | null {
    for (const warehouseId of candidateWarehouseIds) {
      const allSatisfied = lines.every(
        (line) =>
          this.inventoryService.getBalanceQuantity(warehouseId, line.skuId, "available") >= line.quantity
      );

      if (allSatisfied) {
        return warehouseId;
      }
    }

    return null;
  }

  private recordOrderOutcome(
    action: "sync" | "retry",
    order: Pick<OmniOrderRecord, "channel" | "status" | "failureReason">
  ): void {
    if (action === "sync") {
      this.metricsService?.recordOmniOrderSync(order.channel, order.status);
    } else {
      this.metricsService?.recordOmniOrderRetry(order.channel, order.status);
    }

    if (order.status === "reservation_failed" && order.failureReason) {
      this.metricsService?.recordIntegrationFailure(order.channel, order.failureReason);
    }
  }
}

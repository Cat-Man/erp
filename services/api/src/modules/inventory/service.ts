import { randomUUID } from "node:crypto";

import { MasterDataService } from "../master-data/service.js";
import { MetricsService } from "../metrics/service.js";
import { InventoryError } from "./errors.js";
import type {
  InventoryBalanceFilter,
  InventoryBalanceRecord,
  InventoryCountAdjustmentInput,
  InventoryOperationResult,
  InventoryQuantityInput,
  InventoryStockStatus,
  InventoryTransactionFilter,
  InventoryTransactionRecord,
  InventoryTransferInput
} from "./types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new InventoryError(400, `${field}_required`);
  }

  return normalized;
}

function requirePositiveQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InventoryError(400, "inventory_quantity_invalid");
  }

  return value;
}

function requireCountedQuantity(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new InventoryError(400, "inventory_counted_quantity_invalid");
  }

  return value;
}

function buildInventoryBalanceKey(
  warehouseId: string,
  skuId: string,
  stockStatus: InventoryStockStatus
): string {
  return `${warehouseId}::${skuId}::${stockStatus}`;
}

export class InventoryService {
  private readonly balances = new Map<string, InventoryBalanceRecord>();
  private readonly transactions: InventoryTransactionRecord[] = [];

  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly metricsService?: MetricsService
  ) {}

  listBalances(filter: InventoryBalanceFilter = {}): InventoryBalanceRecord[] {
    return [...this.balances.values()]
      .filter((entry) => !filter.warehouseId || entry.warehouseId === filter.warehouseId)
      .filter((entry) => !filter.skuId || entry.skuId === filter.skuId)
      .filter((entry) => !filter.stockStatus || entry.stockStatus === filter.stockStatus)
      .sort((left, right) =>
        `${left.warehouseId}-${left.skuId}-${left.stockStatus}`.localeCompare(
          `${right.warehouseId}-${right.skuId}-${right.stockStatus}`
        )
      );
  }

  listTransactions(filter: InventoryTransactionFilter = {}): InventoryTransactionRecord[] {
    return this.transactions
      .filter((entry) => !filter.warehouseId || entry.warehouseId === filter.warehouseId)
      .filter((entry) => !filter.skuId || entry.skuId === filter.skuId)
      .filter((entry) => !filter.stockStatus || entry.stockStatus === filter.stockStatus)
      .filter((entry) => !filter.operationType || entry.operationType === filter.operationType);
  }

  createInbound(input: InventoryQuantityInput): InventoryOperationResult {
    const normalized = this.normalizeQuantityInput(input);
    this.ensureWarehouseAndSku(normalized.warehouseId, normalized.skuId);

    const operationId = randomUUID();

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "inbound",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: normalized.quantity
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("inbound");
    return result;
  }

  createOutbound(input: InventoryQuantityInput): InventoryOperationResult {
    const normalized = this.normalizeQuantityInput(input);
    this.ensureWarehouseAndSku(normalized.warehouseId, normalized.skuId);

    const operationId = randomUUID();

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "outbound",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: -normalized.quantity
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("outbound");
    return result;
  }

  createTransfer(input: InventoryTransferInput): InventoryOperationResult {
    const normalized = this.normalizeTransferInput(input);
    this.ensureWarehouseAndSku(normalized.fromWarehouseId, normalized.skuId);
    this.ensureWarehouseAndSku(normalized.toWarehouseId, normalized.skuId);

    if (normalized.fromWarehouseId === normalized.toWarehouseId) {
      throw new InventoryError(400, "inventory_transfer_same_warehouse");
    }

    const operationId = randomUUID();

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "transfer",
          warehouseId: normalized.fromWarehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: -normalized.quantity,
          referenceWarehouseId: normalized.toWarehouseId
        }),
        this.applyDelta({
          operationId,
          operationType: "transfer",
          warehouseId: normalized.fromWarehouseId,
          skuId: normalized.skuId,
          stockStatus: "in_transit",
          quantityDelta: normalized.quantity,
          referenceWarehouseId: normalized.toWarehouseId
        }),
        this.applyDelta({
          operationId,
          operationType: "transfer",
          warehouseId: normalized.fromWarehouseId,
          skuId: normalized.skuId,
          stockStatus: "in_transit",
          quantityDelta: -normalized.quantity,
          referenceWarehouseId: normalized.toWarehouseId
        }),
        this.applyDelta({
          operationId,
          operationType: "transfer",
          warehouseId: normalized.toWarehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: normalized.quantity,
          referenceWarehouseId: normalized.fromWarehouseId
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("transfer");
    return result;
  }

  createReservation(input: InventoryQuantityInput): InventoryOperationResult {
    const normalized = this.normalizeQuantityInput(input);
    this.ensureWarehouseAndSku(normalized.warehouseId, normalized.skuId);

    const operationId = randomUUID();

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "reservation",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: -normalized.quantity
        }),
        this.applyDelta({
          operationId,
          operationType: "reservation",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "reserved",
          quantityDelta: normalized.quantity
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("reservation");
    return result;
  }

  releaseReservation(input: InventoryQuantityInput): InventoryOperationResult {
    const normalized = this.normalizeQuantityInput(input);
    this.ensureWarehouseAndSku(normalized.warehouseId, normalized.skuId);

    const operationId = randomUUID();

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "release",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "reserved",
          quantityDelta: -normalized.quantity
        }),
        this.applyDelta({
          operationId,
          operationType: "release",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta: normalized.quantity
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("release");
    return result;
  }

  createCountAdjustment(input: InventoryCountAdjustmentInput): InventoryOperationResult {
    const normalized = this.normalizeCountAdjustmentInput(input);
    this.ensureWarehouseAndSku(normalized.warehouseId, normalized.skuId);

    const currentQuantity = this.getBalanceQuantity(normalized.warehouseId, normalized.skuId, "available");
    const quantityDelta = normalized.countedQuantity - currentQuantity;
    const operationId = randomUUID();

    if (quantityDelta === 0) {
      return {
        operationId,
        transactions: []
      };
    }

    const result = {
      operationId,
      transactions: [
        this.applyDelta({
          operationId,
          operationType: "count_adjustment",
          warehouseId: normalized.warehouseId,
          skuId: normalized.skuId,
          stockStatus: "available",
          quantityDelta
        })
      ]
    };

    this.metricsService?.recordInventoryOperation("count_adjustment");
    return result;
  }

  private normalizeQuantityInput(input: InventoryQuantityInput): InventoryQuantityInput {
    return {
      warehouseId: requireText(input.warehouseId, "inventory_warehouse_id"),
      skuId: requireText(input.skuId, "inventory_sku_id"),
      quantity: requirePositiveQuantity(input.quantity)
    };
  }

  private normalizeTransferInput(input: InventoryTransferInput): InventoryTransferInput {
    return {
      fromWarehouseId: requireText(input.fromWarehouseId, "inventory_from_warehouse_id"),
      toWarehouseId: requireText(input.toWarehouseId, "inventory_to_warehouse_id"),
      skuId: requireText(input.skuId, "inventory_sku_id"),
      quantity: requirePositiveQuantity(input.quantity)
    };
  }

  private normalizeCountAdjustmentInput(
    input: InventoryCountAdjustmentInput
  ): InventoryCountAdjustmentInput {
    return {
      warehouseId: requireText(input.warehouseId, "inventory_warehouse_id"),
      skuId: requireText(input.skuId, "inventory_sku_id"),
      countedQuantity: requireCountedQuantity(input.countedQuantity)
    };
  }

  private ensureWarehouseAndSku(warehouseId: string, skuId: string): void {
    if (!this.masterDataService.getWarehouse(warehouseId)) {
      throw new InventoryError(400, "inventory_warehouse_not_found");
    }

    if (!this.masterDataService.getSku(skuId)) {
      throw new InventoryError(400, "inventory_sku_not_found");
    }
  }

  getBalanceQuantity(
    warehouseId: string,
    skuId: string,
    stockStatus: InventoryStockStatus
  ): number {
    const balance = this.balances.get(buildInventoryBalanceKey(warehouseId, skuId, stockStatus));
    return balance?.quantity ?? 0;
  }

  private applyDelta(input: {
    operationId: string;
    operationType: InventoryTransactionRecord["operationType"];
    warehouseId: string;
    skuId: string;
    stockStatus: InventoryStockStatus;
    quantityDelta: number;
    referenceWarehouseId?: string;
  }): InventoryTransactionRecord {
    const balanceKey = buildInventoryBalanceKey(input.warehouseId, input.skuId, input.stockStatus);
    const currentQuantity = this.getBalanceQuantity(input.warehouseId, input.skuId, input.stockStatus);
    const nextQuantity = currentQuantity + input.quantityDelta;

    if (nextQuantity < 0) {
      throw new InventoryError(409, `inventory_insufficient_${input.stockStatus}`);
    }

    if (nextQuantity === 0) {
      this.balances.delete(balanceKey);
    } else {
      this.balances.set(balanceKey, {
        warehouseId: input.warehouseId,
        skuId: input.skuId,
        stockStatus: input.stockStatus,
        quantity: nextQuantity
      });
    }

    const transaction: InventoryTransactionRecord = {
      id: randomUUID(),
      operationId: input.operationId,
      operationType: input.operationType,
      warehouseId: input.warehouseId,
      skuId: input.skuId,
      stockStatus: input.stockStatus,
      quantityDelta: input.quantityDelta,
      createdAt: new Date().toISOString(),
      referenceWarehouseId: input.referenceWarehouseId ?? null
    };

    this.transactions.push(transaction);
    return transaction;
  }
}

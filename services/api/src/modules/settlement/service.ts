import { randomUUID } from "node:crypto";

import { InventoryService } from "../inventory/service.js";
import { MetricsService } from "../metrics/service.js";
import { PosService } from "../pos/service.js";
import type { PosDayCloseRecord, PosOrderRecord, PosShiftRecord } from "../pos/types.js";
import { SettlementError } from "./errors.js";
import type {
  SettlementPaymentCallbackInput,
  SettlementPaymentCallbackRecord,
  SettlementReconciliationInput,
  SettlementReconciliationRecord,
  SettlementVoucherDraftRecord
} from "./types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new SettlementError(400, `${field}_required`);
  }

  return normalized;
}

function requireNonNegativeAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new SettlementError(400, `${field}_invalid`);
  }

  return value;
}

function orderAccountingSign(order: PosOrderRecord): number {
  if (order.orderType === "refund") {
    return -1;
  }

  if (order.orderType === "exchange") {
    return order.totalAmount >= 0 ? 1 : -1;
  }

  return 1;
}

function businessDateFromTimestamp(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export class SettlementService {
  private readonly callbacks: SettlementPaymentCallbackRecord[] = [];
  private readonly reconciliations = new Map<string, SettlementReconciliationRecord>();
  private readonly voucherDrafts: SettlementVoucherDraftRecord[] = [];

  constructor(
    private readonly posService: PosService,
    private readonly inventoryService: InventoryService,
    private readonly metricsService?: MetricsService
  ) {}

  recordPaymentCallback(input: SettlementPaymentCallbackInput): SettlementPaymentCallbackRecord {
    const callback: SettlementPaymentCallbackRecord = {
      id: randomUUID(),
      shiftId: requireText(input.shiftId, "settlement_shift_id"),
      method: input.method,
      amount: requireNonNegativeAmount(input.amount, "settlement_callback_amount"),
      referenceId: requireText(input.referenceId, "settlement_callback_reference_id"),
      createdAt: new Date().toISOString()
    };

    this.callbacks.push(callback);
    return callback;
  }

  reconcileShift(input: SettlementReconciliationInput): SettlementReconciliationRecord {
    const shift = this.requireShift(input.shiftId);
    const latestDayClose = this.posService.getLatestDayCloseForShift(shift.id);
    if (!latestDayClose) {
      throw new SettlementError(404, "settlement_day_close_not_found");
    }

    const businessDate = businessDateFromTimestamp(latestDayClose.createdAt);
    const callbackAdjustmentTotal = this.callbacks
      .filter((callback) => callback.shiftId === shift.id)
      .reduce((total, callback) => total + callback.amount, 0);

    const reconciliationId = randomUUID();
    const voucherDrafts = this.generateVoucherDrafts(
      reconciliationId,
      shift,
      businessDate,
      this.posService.listOrders().filter((order) => order.shiftId === shift.id && order.status === "paid")
    );

    this.replaceVoucherDraftsForShift(shift.id, voucherDrafts);

    const reconciliation: SettlementReconciliationRecord = {
      id: reconciliationId,
      shiftId: shift.id,
      storeId: shift.storeId,
      businessDate,
      status:
        latestDayClose.expectedCash === latestDayClose.countedCash &&
        latestDayClose.expectedThirdPartyTotal ===
          latestDayClose.countedThirdPartyTotal + callbackAdjustmentTotal
          ? "balanced"
          : "exception",
      expectedCash: latestDayClose.expectedCash,
      countedCash: latestDayClose.countedCash,
      expectedThirdPartyTotal: latestDayClose.expectedThirdPartyTotal,
      countedThirdPartyTotal: latestDayClose.countedThirdPartyTotal,
      callbackAdjustmentTotal,
      voucherDraftCount: voucherDrafts.length,
      createdAt: new Date().toISOString()
    };

    this.reconciliations.set(shift.id, reconciliation);
    this.metricsService?.recordSettlementReconciliation(reconciliation.status);
    return reconciliation;
  }

  listReconciliations(): SettlementReconciliationRecord[] {
    return [...this.reconciliations.values()].sort((left, right) => left.shiftId.localeCompare(right.shiftId));
  }

  listVoucherDrafts(): SettlementVoucherDraftRecord[] {
    return [...this.voucherDrafts];
  }

  getInventoryDailySnapshot() {
    return this.inventoryService.listBalances();
  }

  private requireShift(shiftId: string): PosShiftRecord {
    const normalizedShiftId = requireText(shiftId, "settlement_shift_id");
    const shift = this.posService.getShift(normalizedShiftId);
    if (!shift) {
      throw new SettlementError(404, "settlement_shift_not_found");
    }

    return shift;
  }

  private generateVoucherDrafts(
    reconciliationId: string,
    shift: PosShiftRecord,
    businessDate: string,
    orders: PosOrderRecord[]
  ): SettlementVoucherDraftRecord[] {
    const aggregates = new Map<string, SettlementVoucherDraftRecord>();

    for (const order of orders) {
      const sign = orderAccountingSign(order);
      for (const payment of order.payments) {
        const aggregateKey = `${payment.method}::${order.orderType}`;
        const current = aggregates.get(aggregateKey);
        const amount = sign * payment.amount;

        if (!current) {
          aggregates.set(aggregateKey, {
            id: randomUUID(),
            reconciliationId,
            shiftId: shift.id,
            storeId: shift.storeId,
            businessDate,
            paymentMethod: payment.method,
            businessType: order.orderType,
            amount,
            status: "draft",
            createdAt: new Date().toISOString()
          });
          continue;
        }

        current.amount += amount;
      }
    }

    return [...aggregates.values()];
  }

  private replaceVoucherDraftsForShift(
    shiftId: string,
    drafts: SettlementVoucherDraftRecord[]
  ): void {
    const retainedDrafts = this.voucherDrafts.filter((draft) => draft.shiftId !== shiftId);
    this.voucherDrafts.length = 0;
    this.voucherDrafts.push(...retainedDrafts, ...drafts);
  }
}

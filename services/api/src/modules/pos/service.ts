import { randomUUID } from "node:crypto";

import { InventoryService } from "../inventory/service.js";
import { MasterDataService } from "../master-data/service.js";
import { MetricsService } from "../metrics/service.js";
import { PosError } from "./errors.js";
import type {
  CloseShiftInput,
  CreatePosExchangeInput,
  CreatePosRefundInput,
  CreatePosSaleInput,
  DayCloseInput,
  OpenShiftInput,
  PosDayCloseRecord,
  PosOrderLineRecord,
  PosOrderRecord,
  PosPaymentInput,
  PosShiftRecord
} from "./types.js";

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new PosError(400, `${field}_required`);
  }

  return normalized;
}

function requireNonNegativeAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new PosError(400, `${field}_invalid`);
  }

  return value;
}

function requirePositiveAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PosError(400, `${field}_invalid`);
  }

  return value;
}

function normalizeLines(
  lines: Array<{ skuId: string; quantity: number; unitPrice: number }>,
  lineType: PosOrderLineRecord["lineType"],
  field: string
): PosOrderLineRecord[] {
  if (!lines.length) {
    throw new PosError(400, `${field}_required`);
  }

  return lines.map((line) => ({
    skuId: requireText(line.skuId, "pos_sku_id"),
    quantity: requirePositiveAmount(line.quantity, "pos_quantity"),
    unitPrice: requireNonNegativeAmount(line.unitPrice, "pos_unit_price"),
    lineType
  }));
}

function normalizePayments(payments: PosPaymentInput[]): PosPaymentInput[] {
  return payments.map((payment) => ({
    method: payment.method,
    amount: requireNonNegativeAmount(payment.amount, "pos_payment_amount")
  }));
}

function calculateLinesTotal(lines: Array<{ quantity: number; unitPrice: number }>): number {
  return lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
}

function orderSign(order: PosOrderRecord): number {
  if (order.orderType === "refund") {
    return -1;
  }

  if (order.orderType === "exchange") {
    return order.totalAmount >= 0 ? 1 : -1;
  }

  return 1;
}

export class PosService {
  private readonly orders = new Map<string, PosOrderRecord>();
  private readonly shifts = new Map<string, PosShiftRecord>();
  private readonly dayCloses = new Map<string, PosDayCloseRecord>();

  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
    private readonly metricsService?: MetricsService
  ) {}

  openShift(input: OpenShiftInput, cashierId: string): PosShiftRecord {
    const shiftId = requireText(input.shiftId, "pos_shift_id");
    const storeId = requireText(input.storeId, "pos_store_id");
    const openingCash = requireNonNegativeAmount(input.openingCash, "pos_opening_cash");

    if (!this.masterDataService.getStore(storeId)) {
      throw new PosError(400, "pos_store_not_found");
    }

    if (this.shifts.has(shiftId)) {
      throw new PosError(409, "pos_shift_id_conflict");
    }

    const activeShift = [...this.shifts.values()].find(
      (shift) => shift.storeId === storeId && shift.status === "open"
    );
    if (activeShift) {
      throw new PosError(409, "pos_store_shift_already_open");
    }

    const shift: PosShiftRecord = {
      id: shiftId,
      storeId,
      cashierId,
      openingCash,
      status: "open",
      openedAt: new Date().toISOString(),
      closedAt: null,
      closingCash: null
    };

    this.shifts.set(shift.id, shift);
    this.metricsService?.recordPosShiftEvent("open", "opened");
    return shift;
  }

  closeShift(input: CloseShiftInput): PosShiftRecord {
    const shift = this.requireShift(input.shiftId);
    if (shift.status !== "open") {
      throw new PosError(409, "pos_shift_not_open");
    }

    const closedShift: PosShiftRecord = {
      ...shift,
      status: "closed",
      closingCash: requireNonNegativeAmount(input.closingCash, "pos_closing_cash"),
      closedAt: new Date().toISOString()
    };

    this.shifts.set(closedShift.id, closedShift);
    this.metricsService?.recordPosShiftEvent("close", "closed");
    return closedShift;
  }

  createSale(input: CreatePosSaleInput): PosOrderRecord {
    const lines = normalizeLines(input.lines, "sale", "pos_sale_lines");
    const payments = normalizePayments(input.payments);
    const totalAmount = calculateLinesTotal(lines);

    const orderBase = this.normalizeOrderBase(input.orderId, input.shiftId, input.storeId, input.warehouseId);
    this.ensureInventoryTargets(orderBase.warehouseId, lines);

    if (input.paymentStatus === "success") {
      this.ensureAvailableInventory(orderBase.warehouseId, lines);
      for (const line of lines) {
        this.inventoryService.createOutbound({
          warehouseId: orderBase.warehouseId,
          skuId: line.skuId,
          quantity: line.quantity
        });
      }
    }

    const order: PosOrderRecord = {
      ...orderBase,
      orderType: "sale",
      status: input.paymentStatus === "success" ? "paid" : "payment_failed",
      originalOrderId: null,
      lines,
      payments,
      totalAmount,
      createdAt: new Date().toISOString(),
      memberId: input.memberId?.trim() || null
    };

    this.orders.set(order.id, order);
    this.metricsService?.recordPosOrder(order.orderType, order.status);
    return order;
  }

  createRefund(input: CreatePosRefundInput): PosOrderRecord {
    const lines = normalizeLines(input.lines, "return", "pos_refund_lines");
    const payments = normalizePayments(input.payments);
    const totalAmount = calculateLinesTotal(lines);

    const orderBase = this.normalizeOrderBase(input.orderId, input.shiftId, input.storeId, input.warehouseId);
    this.requireOrder(input.originalOrderId);
    this.ensureInventoryTargets(orderBase.warehouseId, lines);

    for (const line of lines) {
      this.inventoryService.createInbound({
        warehouseId: orderBase.warehouseId,
        skuId: line.skuId,
        quantity: line.quantity
      });
    }

    const order: PosOrderRecord = {
      ...orderBase,
      orderType: "refund",
      status: "paid",
      originalOrderId: input.originalOrderId,
      lines,
      payments,
      totalAmount,
      createdAt: new Date().toISOString(),
      memberId: null
    };

    this.orders.set(order.id, order);
    this.metricsService?.recordPosOrder(order.orderType, order.status);
    return order;
  }

  createExchange(input: CreatePosExchangeInput): PosOrderRecord {
    const returnLines = normalizeLines(input.returnLines, "return", "pos_exchange_return_lines");
    const saleLines = normalizeLines(input.saleLines, "sale", "pos_exchange_sale_lines");
    const payments = normalizePayments(input.payments);

    const orderBase = this.normalizeOrderBase(input.orderId, input.shiftId, input.storeId, input.warehouseId);
    this.requireOrder(input.originalOrderId);
    this.ensureInventoryTargets(orderBase.warehouseId, [...returnLines, ...saleLines]);
    this.ensureAvailableInventory(orderBase.warehouseId, saleLines);

    for (const line of returnLines) {
      this.inventoryService.createInbound({
        warehouseId: orderBase.warehouseId,
        skuId: line.skuId,
        quantity: line.quantity
      });
    }

    for (const line of saleLines) {
      this.inventoryService.createOutbound({
        warehouseId: orderBase.warehouseId,
        skuId: line.skuId,
        quantity: line.quantity
      });
    }

    const totalAmount = calculateLinesTotal(saleLines) - calculateLinesTotal(returnLines);

    const order: PosOrderRecord = {
      ...orderBase,
      orderType: "exchange",
      status: "paid",
      originalOrderId: input.originalOrderId,
      lines: [...returnLines, ...saleLines],
      payments,
      totalAmount,
      createdAt: new Date().toISOString(),
      memberId: null
    };

    this.orders.set(order.id, order);
    this.metricsService?.recordPosOrder(order.orderType, order.status);
    return order;
  }

  createDayClose(input: DayCloseInput): PosDayCloseRecord {
    const shift = this.requireShift(input.shiftId);
    if (shift.status !== "closed") {
      throw new PosError(409, "pos_shift_not_closed");
    }

    const countedCash = requireNonNegativeAmount(input.countedCash, "pos_counted_cash");
    const countedThirdPartyTotal = requireNonNegativeAmount(
      input.countedThirdPartyTotal,
      "pos_counted_third_party_total"
    );

    const paidOrders = [...this.orders.values()].filter(
      (order) => order.shiftId === shift.id && order.status === "paid"
    );

    const expectedCash =
      shift.openingCash +
      paidOrders.reduce((total, order) => {
        const sign = orderSign(order);
        const cashTotal = order.payments
          .filter((payment) => payment.method === "cash")
          .reduce((sum, payment) => sum + payment.amount, 0);
        return total + sign * cashTotal;
      }, 0);

    const expectedThirdPartyTotal = paidOrders.reduce((total, order) => {
      const sign = orderSign(order);
      const nonCashTotal = order.payments
        .filter((payment) => payment.method !== "cash")
        .reduce((sum, payment) => sum + payment.amount, 0);
      return total + sign * nonCashTotal;
    }, 0);

    const dayClose: PosDayCloseRecord = {
      id: randomUUID(),
      shiftId: shift.id,
      status:
        countedCash === expectedCash && countedThirdPartyTotal === expectedThirdPartyTotal
          ? "balanced"
          : "exception",
      expectedCash,
      countedCash,
      expectedThirdPartyTotal,
      countedThirdPartyTotal,
      createdAt: new Date().toISOString()
    };

    this.dayCloses.set(dayClose.id, dayClose);
    this.metricsService?.recordPosShiftEvent("day_close", dayClose.status);
    return dayClose;
  }

  listOrders(): PosOrderRecord[] {
    return [...this.orders.values()];
  }

  getShift(shiftId: string): PosShiftRecord | null {
    return this.shifts.get(shiftId) ?? null;
  }

  getLatestDayCloseForShift(shiftId: string): PosDayCloseRecord | null {
    return (
      [...this.dayCloses.values()]
        .filter((record) => record.shiftId === shiftId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    );
  }

  private normalizeOrderBase(orderId: string, shiftId: string, storeId: string, warehouseId: string) {
    const normalizedOrderId = requireText(orderId, "pos_order_id");
    const normalizedShiftId = requireText(shiftId, "pos_shift_id");
    const normalizedStoreId = requireText(storeId, "pos_store_id");
    const normalizedWarehouseId = requireText(warehouseId, "pos_warehouse_id");

    if (this.orders.has(normalizedOrderId)) {
      throw new PosError(409, "pos_order_id_conflict");
    }

    const shift = this.requireShift(normalizedShiftId);
    if (shift.status !== "open") {
      throw new PosError(409, "pos_shift_not_open");
    }

    if (!this.masterDataService.getStore(normalizedStoreId)) {
      throw new PosError(400, "pos_store_not_found");
    }

    if (!this.masterDataService.getWarehouse(normalizedWarehouseId)) {
      throw new PosError(400, "pos_warehouse_not_found");
    }

    return {
      id: normalizedOrderId,
      shiftId: normalizedShiftId,
      storeId: normalizedStoreId,
      warehouseId: normalizedWarehouseId
    };
  }

  private ensureInventoryTargets(warehouseId: string, lines: PosOrderLineRecord[]): void {
    for (const line of lines) {
      if (!this.masterDataService.getSku(line.skuId)) {
        throw new PosError(400, "pos_sku_not_found");
      }

      if (!this.masterDataService.getWarehouse(warehouseId)) {
        throw new PosError(400, "pos_warehouse_not_found");
      }
    }
  }

  private ensureAvailableInventory(warehouseId: string, lines: PosOrderLineRecord[]): void {
    const quantityBySku = new Map<string, number>();
    for (const line of lines) {
      quantityBySku.set(line.skuId, (quantityBySku.get(line.skuId) ?? 0) + line.quantity);
    }

    for (const [skuId, quantity] of quantityBySku.entries()) {
      if (this.inventoryService.getBalanceQuantity(warehouseId, skuId, "available") < quantity) {
        throw new PosError(409, "pos_inventory_insufficient");
      }
    }
  }

  private requireShift(shiftId: string): PosShiftRecord {
    const normalizedShiftId = requireText(shiftId, "pos_shift_id");
    const shift = this.shifts.get(normalizedShiftId);
    if (!shift) {
      throw new PosError(404, "pos_shift_not_found");
    }

    return shift;
  }

  private requireOrder(orderId: string): PosOrderRecord {
    const normalizedOrderId = requireText(orderId, "pos_original_order_id");
    const order = this.orders.get(normalizedOrderId);
    if (!order) {
      throw new PosError(404, "pos_original_order_not_found");
    }

    return order;
  }
}

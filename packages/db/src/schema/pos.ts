export type PosOrderType = "sale" | "refund" | "exchange";
export type PosOrderStatus = "paid" | "payment_failed";
export type PosLineType = "sale" | "return";
export type PosPaymentMethod = "cash" | "card" | "wallet";
export type PosShiftStatus = "open" | "closed";
export type PosDayCloseStatus = "balanced" | "exception";

export interface PosOrderLineRecord {
  skuId: string;
  quantity: number;
  unitPrice: number;
  lineType: PosLineType;
}

export interface PosPaymentRecord {
  method: PosPaymentMethod;
  amount: number;
}

export interface PosOrderRecord {
  id: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  orderType: PosOrderType;
  status: PosOrderStatus;
  originalOrderId: string | null;
  lines: PosOrderLineRecord[];
  payments: PosPaymentRecord[];
  totalAmount: number;
  createdAt: string;
  memberId?: string | null;
}

export interface PosShiftRecord {
  id: string;
  storeId: string;
  cashierId: string;
  openingCash: number;
  status: PosShiftStatus;
  openedAt: string;
  closedAt: string | null;
  closingCash: number | null;
}

export interface PosDayCloseRecord {
  id: string;
  shiftId: string;
  status: PosDayCloseStatus;
  expectedCash: number;
  countedCash: number;
  expectedThirdPartyTotal: number;
  countedThirdPartyTotal: number;
  createdAt: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

function requireNonNegativeMoney(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }

  return value;
}

function requirePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field}_invalid`);
  }

  return value;
}

function normalizeTimestamp(value: string, field: string): string {
  const normalized = requireText(value, field);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field}_invalid`);
  }

  return date.toISOString();
}

export function validatePosOrderLineRecord(input: PosOrderLineRecord): PosOrderLineRecord {
  return {
    skuId: requireText(input.skuId, "pos_line_sku_id"),
    quantity: requirePositiveNumber(input.quantity, "pos_line_quantity"),
    unitPrice: requireNonNegativeMoney(input.unitPrice, "pos_line_unit_price"),
    lineType: input.lineType
  };
}

export function validatePosOrderRecord(input: PosOrderRecord): PosOrderRecord {
  return {
    id: requireText(input.id, "pos_order_id"),
    shiftId: requireText(input.shiftId, "pos_shift_id"),
    storeId: requireText(input.storeId, "pos_store_id"),
    warehouseId: requireText(input.warehouseId, "pos_warehouse_id"),
    orderType: input.orderType,
    status: input.status,
    originalOrderId: input.originalOrderId?.trim() || null,
    lines: input.lines.map(validatePosOrderLineRecord),
    payments: input.payments.map((payment) => ({
      method: payment.method,
      amount: requireNonNegativeMoney(payment.amount, "pos_payment_amount")
    })),
    totalAmount: requireNonNegativeMoney(input.totalAmount, "pos_total_amount"),
    createdAt: normalizeTimestamp(input.createdAt, "pos_created_at"),
    memberId: input.memberId?.trim() || null
  };
}

export function validatePosShiftRecord(input: PosShiftRecord): PosShiftRecord {
  return {
    id: requireText(input.id, "pos_shift_id"),
    storeId: requireText(input.storeId, "pos_store_id"),
    cashierId: requireText(input.cashierId, "pos_cashier_id"),
    openingCash: requireNonNegativeMoney(input.openingCash, "pos_opening_cash"),
    status: input.status,
    openedAt: normalizeTimestamp(input.openedAt, "pos_opened_at"),
    closedAt: input.closedAt ? normalizeTimestamp(input.closedAt, "pos_closed_at") : null,
    closingCash:
      input.closingCash === null ? null : requireNonNegativeMoney(input.closingCash, "pos_closing_cash")
  };
}

export function validatePosDayCloseRecord(input: PosDayCloseRecord): PosDayCloseRecord {
  return {
    id: requireText(input.id, "pos_day_close_id"),
    shiftId: requireText(input.shiftId, "pos_shift_id"),
    status: input.status,
    expectedCash: requireNonNegativeMoney(input.expectedCash, "pos_expected_cash"),
    countedCash: requireNonNegativeMoney(input.countedCash, "pos_counted_cash"),
    expectedThirdPartyTotal: requireNonNegativeMoney(
      input.expectedThirdPartyTotal,
      "pos_expected_third_party_total"
    ),
    countedThirdPartyTotal: requireNonNegativeMoney(
      input.countedThirdPartyTotal,
      "pos_counted_third_party_total"
    ),
    createdAt: normalizeTimestamp(input.createdAt, "pos_day_close_created_at")
  };
}

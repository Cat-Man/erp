export type SettlementStatus = "balanced" | "exception";
export type VoucherDraftStatus = "draft";

export interface SettlementReconciliationRecord {
  id: string;
  shiftId: string;
  storeId: string;
  businessDate: string;
  status: SettlementStatus;
  expectedCash: number;
  countedCash: number;
  expectedThirdPartyTotal: number;
  countedThirdPartyTotal: number;
  callbackAdjustmentTotal: number;
  createdAt: string;
}

export interface SettlementVoucherDraftRecord {
  id: string;
  reconciliationId: string;
  shiftId: string;
  storeId: string;
  businessDate: string;
  paymentMethod: string;
  businessType: string;
  amount: number;
  status: VoucherDraftStatus;
  createdAt: string;
}

export interface SettlementPaymentCallbackRecord {
  id: string;
  shiftId: string;
  method: string;
  amount: number;
  referenceId: string;
  createdAt: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

function requireMoney(value: number, field: string): number {
  if (!Number.isFinite(value)) {
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

function normalizeBusinessDate(value: string): string {
  const normalized = requireText(value, "settlement_business_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("settlement_business_date_invalid");
  }

  return normalized;
}

export function validateSettlementReconciliationRecord(
  input: SettlementReconciliationRecord
): SettlementReconciliationRecord {
  return {
    id: requireText(input.id, "settlement_reconciliation_id"),
    shiftId: requireText(input.shiftId, "settlement_shift_id"),
    storeId: requireText(input.storeId, "settlement_store_id"),
    businessDate: normalizeBusinessDate(input.businessDate),
    status: input.status,
    expectedCash: requireMoney(input.expectedCash, "settlement_expected_cash"),
    countedCash: requireMoney(input.countedCash, "settlement_counted_cash"),
    expectedThirdPartyTotal: requireMoney(
      input.expectedThirdPartyTotal,
      "settlement_expected_third_party_total"
    ),
    countedThirdPartyTotal: requireMoney(
      input.countedThirdPartyTotal,
      "settlement_counted_third_party_total"
    ),
    callbackAdjustmentTotal: requireMoney(
      input.callbackAdjustmentTotal,
      "settlement_callback_adjustment_total"
    ),
    createdAt: normalizeTimestamp(input.createdAt, "settlement_created_at")
  };
}

export function validateSettlementVoucherDraftRecord(
  input: SettlementVoucherDraftRecord
): SettlementVoucherDraftRecord {
  return {
    id: requireText(input.id, "settlement_voucher_draft_id"),
    reconciliationId: requireText(input.reconciliationId, "settlement_reconciliation_id"),
    shiftId: requireText(input.shiftId, "settlement_shift_id"),
    storeId: requireText(input.storeId, "settlement_store_id"),
    businessDate: normalizeBusinessDate(input.businessDate),
    paymentMethod: requireText(input.paymentMethod, "settlement_payment_method"),
    businessType: requireText(input.businessType, "settlement_business_type"),
    amount: requireMoney(input.amount, "settlement_voucher_amount"),
    status: input.status,
    createdAt: normalizeTimestamp(input.createdAt, "settlement_voucher_created_at")
  };
}

export function validateSettlementPaymentCallbackRecord(
  input: SettlementPaymentCallbackRecord
): SettlementPaymentCallbackRecord {
  return {
    id: requireText(input.id, "settlement_callback_id"),
    shiftId: requireText(input.shiftId, "settlement_shift_id"),
    method: requireText(input.method, "settlement_callback_method"),
    amount: requireMoney(input.amount, "settlement_callback_amount"),
    referenceId: requireText(input.referenceId, "settlement_callback_reference_id"),
    createdAt: normalizeTimestamp(input.createdAt, "settlement_callback_created_at")
  };
}

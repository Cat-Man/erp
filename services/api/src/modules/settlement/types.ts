export type SettlementStatus = "balanced" | "exception";
export type VoucherDraftStatus = "draft";
export type SettlementPaymentMethod = "cash" | "card" | "wallet";

export interface SettlementPaymentCallbackInput {
  shiftId: string;
  method: SettlementPaymentMethod;
  amount: number;
  referenceId: string;
}

export interface SettlementPaymentCallbackRecord extends SettlementPaymentCallbackInput {
  id: string;
  createdAt: string;
}

export interface SettlementReconciliationInput {
  shiftId: string;
}

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
  voucherDraftCount: number;
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

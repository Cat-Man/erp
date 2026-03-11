export const posPaymentMethods = ["cash", "card", "wallet"] as const;
export type PosPaymentMethod = (typeof posPaymentMethods)[number];

export const posOrderTypes = ["sale", "refund", "exchange"] as const;
export type PosOrderType = (typeof posOrderTypes)[number];

export const posDayCloseStatuses = ["balanced", "exception"] as const;
export type PosDayCloseStatus = (typeof posDayCloseStatuses)[number];

export interface PosCheckoutLine {
  skuId: string;
  quantity: number;
  unitPrice: number;
}

export interface PosPaymentInput {
  method: PosPaymentMethod;
  amount: number;
}

export interface CreatePosSaleRequest {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  lines: PosCheckoutLine[];
  payments: PosPaymentInput[];
  paymentStatus: "success" | "failed";
  memberId?: string;
}

export interface CreatePosRefundRequest {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  originalOrderId: string;
  lines: PosCheckoutLine[];
  payments: PosPaymentInput[];
}

export interface CreatePosExchangeRequest {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  originalOrderId: string;
  returnLines: PosCheckoutLine[];
  saleLines: PosCheckoutLine[];
  payments: PosPaymentInput[];
}

export interface OpenPosShiftRequest {
  shiftId: string;
  storeId: string;
  openingCash: number;
}

export interface ClosePosShiftRequest {
  shiftId: string;
  closingCash: number;
}

export interface PosDayCloseRequest {
  shiftId: string;
  countedCash: number;
  countedThirdPartyTotal: number;
}

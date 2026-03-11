export type PosPaymentMethod = "cash" | "card" | "wallet";
export type PosOrderType = "sale" | "refund" | "exchange";
export type PosOrderStatus = "paid" | "payment_failed";
export type PosShiftStatus = "open" | "closed";
export type PosDayCloseStatus = "balanced" | "exception";

export interface PosLineInput {
  skuId: string;
  quantity: number;
  unitPrice: number;
}

export interface PosPaymentInput {
  method: PosPaymentMethod;
  amount: number;
}

export interface CreatePosSaleInput {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  lines: PosLineInput[];
  payments: PosPaymentInput[];
  paymentStatus: "success" | "failed";
  memberId?: string | null;
}

export interface CreatePosRefundInput {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  originalOrderId: string;
  lines: PosLineInput[];
  payments: PosPaymentInput[];
}

export interface CreatePosExchangeInput {
  orderId: string;
  shiftId: string;
  storeId: string;
  warehouseId: string;
  originalOrderId: string;
  returnLines: PosLineInput[];
  saleLines: PosLineInput[];
  payments: PosPaymentInput[];
}

export interface OpenShiftInput {
  shiftId: string;
  storeId: string;
  openingCash: number;
}

export interface CloseShiftInput {
  shiftId: string;
  closingCash: number;
}

export interface DayCloseInput {
  shiftId: string;
  countedCash: number;
  countedThirdPartyTotal: number;
}

export interface PosOrderLineRecord extends PosLineInput {
  lineType: "sale" | "return";
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
  payments: PosPaymentInput[];
  totalAmount: number;
  createdAt: string;
  memberId: string | null;
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

export type CheckoutLineType = "sale" | "return";
export type CheckoutStatus = "draft" | "paid";
export type CheckoutPaymentMethod = "cash" | "card" | "wallet";

export interface CheckoutLine {
  skuId: string;
  skuCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineType: CheckoutLineType;
}

export interface CheckoutMember {
  memberId: string;
  memberName: string;
}

export interface CheckoutPayment {
  method: CheckoutPaymentMethod;
  amount: number;
}

export interface CheckoutState {
  status: CheckoutStatus;
  lines: CheckoutLine[];
  member: CheckoutMember | null;
  payments: CheckoutPayment[];
}

export function createCheckoutState(): CheckoutState {
  return {
    status: "draft",
    lines: [],
    member: null,
    payments: []
  };
}

function upsertLine(
  lines: CheckoutLine[],
  nextLine: Omit<CheckoutLine, "quantity" | "lineType">,
  lineType: CheckoutLineType
): CheckoutLine[] {
  const existingLine = lines.find(
    (line) => line.skuId === nextLine.skuId && line.lineType === lineType && line.unitPrice === nextLine.unitPrice
  );

  if (!existingLine) {
    return [
      ...lines,
      {
        ...nextLine,
        quantity: 1,
        lineType
      }
    ];
  }

  return lines.map((line) =>
    line === existingLine
      ? {
          ...line,
          quantity: line.quantity + 1
        }
      : line
  );
}

export function scanSku(
  state: CheckoutState,
  sku: { skuId: string; skuCode: string; name: string; unitPrice: number }
): CheckoutState {
  return {
    ...state,
    lines: upsertLine(state.lines, sku, "sale")
  };
}

export function enterReturnItem(
  state: CheckoutState,
  sku: { skuId: string; skuCode: string; name: string; unitPrice: number }
): CheckoutState {
  return {
    ...state,
    lines: upsertLine(state.lines, sku, "return")
  };
}

export function attachMember(state: CheckoutState, member: CheckoutMember): CheckoutState {
  return {
    ...state,
    member
  };
}

export function getCheckoutSummary(state: CheckoutState): {
  lines: CheckoutLine[];
  totalItems: number;
  totalAmount: number;
  returnAmount: number;
} {
  const totalItems = state.lines.reduce((total, line) => total + line.quantity, 0);
  const totalAmount = state.lines.reduce((total, line) => {
    if (line.lineType === "return") {
      return total;
    }

    return total + line.quantity * line.unitPrice;
  }, 0);
  const returnAmount = state.lines.reduce((total, line) => {
    if (line.lineType === "sale") {
      return total;
    }

    return total + line.quantity * line.unitPrice;
  }, 0);

  return {
    lines: state.lines,
    totalItems,
    totalAmount,
    returnAmount
  };
}

export function completePayment(
  state: CheckoutState,
  payment: CheckoutPayment
): CheckoutState {
  return {
    ...state,
    status: "paid",
    payments: [...state.payments, payment]
  };
}

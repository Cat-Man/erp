import assert from "node:assert/strict";
import test from "node:test";

import {
  attachMember,
  completePayment,
  createCheckoutState,
  enterReturnItem,
  getCheckoutSummary,
  scanSku
} from "../pages/checkout/state.js";

test("cashier can scan sku and render updated total", () => {
  let state = createCheckoutState();
  state = scanSku(state, {
    skuId: "sku-001",
    skuCode: "SKU-APPLE-001",
    name: "Apple Juice 1L",
    unitPrice: 12
  });

  const summary = getCheckoutSummary(state);
  assert.equal(summary.totalItems, 1);
  assert.equal(summary.totalAmount, 12);
  assert.equal(summary.lines[0]?.skuCode, "SKU-APPLE-001");
});

test("cashier can attach member to current cart", () => {
  let state = createCheckoutState();
  state = attachMember(state, {
    memberId: "mem-001",
    memberName: "Alice"
  });

  assert.equal(state.member?.memberId, "mem-001");
  assert.equal(state.member?.memberName, "Alice");
});

test("payment completion marks checkout as paid", () => {
  let state = createCheckoutState();
  state = scanSku(state, {
    skuId: "sku-001",
    skuCode: "SKU-APPLE-001",
    name: "Apple Juice 1L",
    unitPrice: 12
  });
  state = completePayment(state, {
    method: "cash",
    amount: 12
  });

  assert.equal(state.status, "paid");
  assert.equal(state.payments.length, 1);
});

test("cashier can enter return item", () => {
  let state = createCheckoutState();
  state = enterReturnItem(state, {
    skuId: "sku-001",
    skuCode: "SKU-APPLE-001",
    name: "Apple Juice 1L",
    unitPrice: 12
  });

  const summary = getCheckoutSummary(state);
  assert.equal(summary.returnAmount, 12);
  assert.equal(summary.lines[0]?.lineType, "return");
});

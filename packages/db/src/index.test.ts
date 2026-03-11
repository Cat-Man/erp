import assert from "node:assert/strict";
import test from "node:test";

test("db package exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/db");
  assert.equal(mod.workspaceInfo.kind, "package");
});

test("db package exports inventory schema validators", async () => {
  const mod = await import("./index.js");

  const balance = mod.validateInventoryBalanceRecord({
    warehouseId: "wh-001",
    skuId: "sku-001",
    stockStatus: "available",
    quantity: 6
  });

  assert.deepEqual(balance, {
    warehouseId: "wh-001",
    skuId: "sku-001",
    stockStatus: "available",
    quantity: 6
  });
});

test("db package exports pos schema validators", async () => {
  const mod = await import("./index.js");

  const order = mod.validatePosOrderRecord({
    id: "pos-order-001",
    shiftId: "shift-001",
    storeId: "store-001",
    warehouseId: "wh-001",
    orderType: "sale",
    status: "paid",
    originalOrderId: null,
    lines: [
      {
        skuId: "sku-001",
        quantity: 1,
        unitPrice: 12,
        lineType: "sale"
      }
    ],
    payments: [
      {
        method: "cash",
        amount: 12
      }
    ],
    totalAmount: 12,
    createdAt: "2026-03-10T10:00:00.000Z"
  });

  assert.equal(order.orderType, "sale");
  assert.equal(order.lines[0]?.lineType, "sale");
  assert.equal(order.payments[0]?.amount, 12);
});

test("db package exports settlement schema validators", async () => {
  const mod = await import("./index.js");

  const record = mod.validateSettlementReconciliationRecord({
    id: "rec-001",
    shiftId: "shift-001",
    storeId: "store-001",
    businessDate: "2026-03-11",
    status: "balanced",
    expectedCash: 112,
    countedCash: 112,
    expectedThirdPartyTotal: 10,
    countedThirdPartyTotal: 10,
    callbackAdjustmentTotal: 0,
    createdAt: "2026-03-11T10:00:00.000Z"
  });

  assert.equal(record.status, "balanced");
  assert.equal(record.businessDate, "2026-03-11");
});

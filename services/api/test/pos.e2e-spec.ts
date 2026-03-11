import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

type ApiApp = ReturnType<typeof createApp>;

async function loginAsAdmin(app: ApiApp): Promise<string> {
  const loginResponse = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "admin",
        password: "admin-pass"
      })
    })
  );

  const loginBody = (await loginResponse.json()) as { token: string };
  return loginBody.token;
}

async function seedPosMasterData(app: ApiApp, token: string): Promise<void> {
  await app.handle(
    new Request("http://localhost/master-data/stores", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: "store-001",
        code: "SH001",
        name: "Shanghai Flagship Store"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/warehouses", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: "wh-001",
        code: "WH-SH-01",
        name: "POS Warehouse",
        type: "store",
        storeId: "store-001"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/skus", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: "sku-001",
        skuCode: "SKU-APPLE-001",
        barcode: "6901234567890",
        name: "Apple Juice 1L"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/skus", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: "sku-002",
        skuCode: "SKU-TEA-001",
        barcode: "6901234567891",
        name: "Green Tea 500ml"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 20
      })
    })
  );

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-002",
        quantity: 10
      })
    })
  );
}

async function openShift(app: ApiApp, token: string): Promise<void> {
  const response = await app.handle(
    new Request("http://localhost/pos/shifts/open", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        storeId: "store-001",
        openingCash: 100
      })
    })
  );

  assert.equal(response.status, 201);
}

async function listAvailableInventory(app: ApiApp, token: string, skuId: string): Promise<number> {
  const response = await app.handle(
    new Request(`http://localhost/inventory/balances?warehouseId=wh-001&skuId=${skuId}`, {
      headers: { authorization: `Bearer ${token}` }
    })
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    items: Array<{ quantity: number; stockStatus: string }>;
  };

  return body.items.find((item) => item.stockStatus === "available")?.quantity ?? 0;
}

test("sale with successful payment creates paid order and deducts inventory", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  const response = await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-001",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 2, unitPrice: 12 }],
        payments: [{ method: "cash", amount: 24 }],
        paymentStatus: "success"
      })
    })
  );

  assert.equal(response.status, 201);
  const body = (await response.json()) as { status: string; totalAmount: number };
  assert.equal(body.status, "paid");
  assert.equal(body.totalAmount, 24);
  assert.equal(await listAvailableInventory(app, token, "sku-001"), 18);
});

test("sale with failed payment does not deduct inventory", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  const response = await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-002",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        payments: [{ method: "wallet", amount: 12 }],
        paymentStatus: "failed"
      })
    })
  );

  assert.equal(response.status, 201);
  const body = (await response.json()) as { status: string };
  assert.equal(body.status, "payment_failed");
  assert.equal(await listAvailableInventory(app, token, "sku-001"), 20);
});

test("refund restores inventory for the returned sku", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-003",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 2, unitPrice: 12 }],
        payments: [{ method: "card", amount: 24 }],
        paymentStatus: "success"
      })
    })
  );

  const refundResponse = await app.handle(
    new Request("http://localhost/pos/orders/refunds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "refund-001",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        originalOrderId: "sale-003",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        payments: [{ method: "card", amount: 12 }]
      })
    })
  );

  assert.equal(refundResponse.status, 201);
  assert.equal(await listAvailableInventory(app, token, "sku-001"), 19);
});

test("exchange returns old sku and deducts new sku after successful payment", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-004",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        payments: [{ method: "cash", amount: 12 }],
        paymentStatus: "success"
      })
    })
  );

  const exchangeResponse = await app.handle(
    new Request("http://localhost/pos/orders/exchanges", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "exchange-001",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        originalOrderId: "sale-004",
        returnLines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        saleLines: [{ skuId: "sku-002", quantity: 1, unitPrice: 15 }],
        payments: [{ method: "cash", amount: 3 }]
      })
    })
  );

  assert.equal(exchangeResponse.status, 201);
  const body = (await exchangeResponse.json()) as { totalAmount: number };
  assert.equal(body.totalAmount, 3);
  assert.equal(await listAvailableInventory(app, token, "sku-001"), 20);
  assert.equal(await listAvailableInventory(app, token, "sku-002"), 9);
});

test("day close returns balanced status when submitted totals match", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-005",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        payments: [{ method: "cash", amount: 12 }],
        paymentStatus: "success"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-006",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-002", quantity: 1, unitPrice: 15 }],
        payments: [{ method: "card", amount: 15 }],
        paymentStatus: "success"
      })
    })
  );

  const closeShiftResponse = await app.handle(
    new Request("http://localhost/pos/shifts/close", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        closingCash: 112
      })
    })
  );
  assert.equal(closeShiftResponse.status, 201);

  const dayCloseResponse = await app.handle(
    new Request("http://localhost/pos/day-close", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        countedCash: 112,
        countedThirdPartyTotal: 15
      })
    })
  );

  assert.equal(dayCloseResponse.status, 201);
  const body = (await dayCloseResponse.json()) as { status: string };
  assert.equal(body.status, "balanced");
});

test("day close returns exception status when submitted totals do not match", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedPosMasterData(app, token);
  await openShift(app, token);

  await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: "sale-007",
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: 12 }],
        payments: [{ method: "wallet", amount: 12 }],
        paymentStatus: "success"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/pos/shifts/close", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        closingCash: 100
      })
    })
  );

  const dayCloseResponse = await app.handle(
    new Request("http://localhost/pos/day-close", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        countedCash: 100,
        countedThirdPartyTotal: 10
      })
    })
  );

  assert.equal(dayCloseResponse.status, 201);
  const body = (await dayCloseResponse.json()) as { status: string };
  assert.equal(body.status, "exception");
});

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

async function seedSettlementMasterData(app: ApiApp, token: string): Promise<void> {
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

async function createSale(
  app: ApiApp,
  token: string,
  orderId: string,
  payment: { method: "cash" | "card" | "wallet"; amount: number }
): Promise<void> {
  const response = await app.handle(
    new Request("http://localhost/pos/orders/sales", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId,
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: payment.amount }],
        payments: [payment],
        paymentStatus: "success"
      })
    })
  );

  assert.equal(response.status, 201);
}

async function createRefund(
  app: ApiApp,
  token: string,
  orderId: string,
  originalOrderId: string,
  payment: { method: "cash" | "card" | "wallet"; amount: number }
): Promise<void> {
  const response = await app.handle(
    new Request("http://localhost/pos/orders/refunds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId,
        shiftId: "shift-001",
        storeId: "store-001",
        warehouseId: "wh-001",
        originalOrderId,
        lines: [{ skuId: "sku-001", quantity: 1, unitPrice: payment.amount }],
        payments: [payment]
      })
    })
  );

  assert.equal(response.status, 201);
}

async function closeShift(
  app: ApiApp,
  token: string,
  closingCash: number,
  countedThirdPartyTotal: number
): Promise<void> {
  const closeShiftResponse = await app.handle(
    new Request("http://localhost/pos/shifts/close", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        closingCash
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
        countedCash: closingCash,
        countedThirdPartyTotal
      })
    })
  );

  assert.equal(dayCloseResponse.status, 201);
}

test("successful reconciliation creates balanced record and voucher drafts", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedSettlementMasterData(app, token);
  await openShift(app, token);
  await createSale(app, token, "sale-001", { method: "cash", amount: 12 });
  await createSale(app, token, "sale-002", { method: "card", amount: 15 });
  await createRefund(app, token, "refund-001", "sale-002", { method: "card", amount: 5 });
  await closeShift(app, token, 112, 10);

  const reconcileResponse = await app.handle(
    new Request("http://localhost/settlement/reconciliations", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001"
      })
    })
  );

  assert.equal(reconcileResponse.status, 201);
  const reconcileBody = (await reconcileResponse.json()) as { status: string; voucherDraftCount: number };
  assert.equal(reconcileBody.status, "balanced");
  assert.equal(reconcileBody.voucherDraftCount, 3);

  const vouchersResponse = await app.handle(
    new Request("http://localhost/settlement/vouchers", {
      headers: { authorization: `Bearer ${token}` }
    })
  );
  assert.equal(vouchersResponse.status, 200);
});

test("payment mismatch creates exception reconciliation", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedSettlementMasterData(app, token);
  await openShift(app, token);
  await createSale(app, token, "sale-003", { method: "card", amount: 18 });
  await closeShift(app, token, 100, 10);

  const reconcileResponse = await app.handle(
    new Request("http://localhost/settlement/reconciliations", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001"
      })
    })
  );

  assert.equal(reconcileResponse.status, 201);
  const reconcileBody = (await reconcileResponse.json()) as { status: string };
  assert.equal(reconcileBody.status, "exception");
});

test("delayed callback handling can turn exception into balanced", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedSettlementMasterData(app, token);
  await openShift(app, token);
  await createSale(app, token, "sale-004", { method: "wallet", amount: 20 });
  await closeShift(app, token, 100, 0);

  const firstReconcileResponse = await app.handle(
    new Request("http://localhost/settlement/reconciliations", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001"
      })
    })
  );
  assert.equal(firstReconcileResponse.status, 201);

  const callbackResponse = await app.handle(
    new Request("http://localhost/settlement/payment-callbacks", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001",
        method: "wallet",
        amount: 20,
        referenceId: "cb-001"
      })
    })
  );
  assert.equal(callbackResponse.status, 201);

  const secondReconcileResponse = await app.handle(
    new Request("http://localhost/settlement/reconciliations", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001"
      })
    })
  );

  assert.equal(secondReconcileResponse.status, 201);
  const secondReconcileBody = (await secondReconcileResponse.json()) as { status: string };
  assert.equal(secondReconcileBody.status, "balanced");
});

test("daily reports expose store sales inventory and exception views", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedSettlementMasterData(app, token);
  await openShift(app, token);
  await createSale(app, token, "sale-005", { method: "cash", amount: 12 });
  await closeShift(app, token, 100, 0);

  await app.handle(
    new Request("http://localhost/settlement/reconciliations", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shiftId: "shift-001"
      })
    })
  );

  const salesReportResponse = await app.handle(
    new Request("http://localhost/reports/store-sales-daily", {
      headers: { authorization: `Bearer ${token}` }
    })
  );
  assert.equal(salesReportResponse.status, 200);

  const inventoryReportResponse = await app.handle(
    new Request("http://localhost/reports/inventory-daily", {
      headers: { authorization: `Bearer ${token}` }
    })
  );
  assert.equal(inventoryReportResponse.status, 200);

  const exceptionReportResponse = await app.handle(
    new Request("http://localhost/reports/day-close-exceptions", {
      headers: { authorization: `Bearer ${token}` }
    })
  );
  assert.equal(exceptionReportResponse.status, 200);
});

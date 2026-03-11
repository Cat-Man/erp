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

async function seedOmniOrderMasterData(app: ApiApp, token: string): Promise<void> {
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
        name: "Shanghai Warehouse A",
        type: "store",
        storeId: "store-001"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/warehouses", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: "wh-002",
        code: "WH-SH-02",
        name: "Shanghai Warehouse B",
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
}

async function inboundInventory(
  app: ApiApp,
  token: string,
  warehouseId: string,
  skuId: string,
  quantity: number
): Promise<void> {
  const response = await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        warehouseId,
        skuId,
        quantity
      })
    })
  );

  assert.equal(response.status, 201);
}

async function getBalances(app: ApiApp, token: string, warehouseId: string, skuId: string) {
  const response = await app.handle(
    new Request(`http://localhost/inventory/balances?warehouseId=${warehouseId}&skuId=${skuId}`, {
      headers: { authorization: `Bearer ${token}` }
    })
  );

  assert.equal(response.status, 200);
  return (await response.json()) as {
    items: Array<{ stockStatus: string; quantity: number }>;
  };
}

test("order sync reserves stock and assigns fulfillment warehouse", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedOmniOrderMasterData(app, token);
  await inboundInventory(app, token, "wh-002", "sku-001", 5);

  const syncResponse = await app.handle(
    new Request("http://localhost/omni-orders/sync/mock-marketplace", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-001",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 2 }],
        candidateWarehouseIds: ["wh-001", "wh-002"],
        rawPayload: {
          orderNo: "ext-001"
        }
      })
    })
  );

  assert.equal(syncResponse.status, 201);
  const syncBody = (await syncResponse.json()) as {
    status: string;
    fulfillmentWarehouseId: string | null;
  };
  assert.equal(syncBody.status, "reserved");
  assert.equal(syncBody.fulfillmentWarehouseId, "wh-002");

  const balances = await getBalances(app, token, "wh-002", "sku-001");
  assert.deepEqual(
    balances.items.sort((left, right) => left.stockStatus.localeCompare(right.stockStatus)),
    [
      { warehouseId: "wh-002", skuId: "sku-001", stockStatus: "available", quantity: 3 },
      { warehouseId: "wh-002", skuId: "sku-001", stockStatus: "reserved", quantity: 2 }
    ]
  );
});

test("idempotent re-sync does not reserve inventory twice", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedOmniOrderMasterData(app, token);
  await inboundInventory(app, token, "wh-001", "sku-001", 5);

  const firstResponse = await app.handle(
    new Request("http://localhost/omni-orders/sync/mock-marketplace", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-002",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 2 }],
        candidateWarehouseIds: ["wh-001"],
        rawPayload: {
          orderNo: "ext-002"
        }
      })
    })
  );
  assert.equal(firstResponse.status, 201);

  const secondResponse = await app.handle(
    new Request("http://localhost/omni-orders/sync/mock-marketplace", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-002",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 2 }],
        candidateWarehouseIds: ["wh-001"],
        rawPayload: {
          orderNo: "ext-002"
        }
      })
    })
  );

  assert.equal(secondResponse.status, 200);

  const balances = await getBalances(app, token, "wh-001", "sku-001");
  assert.deepEqual(
    balances.items.sort((left, right) => left.stockStatus.localeCompare(right.stockStatus)),
    [
      { warehouseId: "wh-001", skuId: "sku-001", stockStatus: "available", quantity: 3 },
      { warehouseId: "wh-001", skuId: "sku-001", stockStatus: "reserved", quantity: 2 }
    ]
  );
});

test("reserve failure keeps order for retry and retry succeeds after replenishment", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedOmniOrderMasterData(app, token);

  const syncResponse = await app.handle(
    new Request("http://localhost/omni-orders/sync/mock-marketplace", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-003",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 4 }],
        candidateWarehouseIds: ["wh-001"],
        rawPayload: {
          orderNo: "ext-003"
        }
      })
    })
  );

  assert.equal(syncResponse.status, 201);
  const syncBody = (await syncResponse.json()) as { status: string };
  assert.equal(syncBody.status, "reservation_failed");

  await inboundInventory(app, token, "wh-001", "sku-001", 10);

  const retryResponse = await app.handle(
    new Request("http://localhost/omni-orders/retry", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-003"
      })
    })
  );

  assert.equal(retryResponse.status, 201);
  const retryBody = (await retryResponse.json()) as {
    status: string;
    fulfillmentWarehouseId: string | null;
  };
  assert.equal(retryBody.status, "reserved");
  assert.equal(retryBody.fulfillmentWarehouseId, "wh-001");
});

test("operations list can query synced orders", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  await seedOmniOrderMasterData(app, token);
  await inboundInventory(app, token, "wh-001", "sku-001", 5);

  await app.handle(
    new Request("http://localhost/omni-orders/sync/mock-marketplace", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        externalOrderId: "ext-004",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 1 }],
        candidateWarehouseIds: ["wh-001"],
        rawPayload: {
          orderNo: "ext-004"
        }
      })
    })
  );

  const listResponse = await app.handle(
    new Request("http://localhost/omni-orders", {
      headers: { authorization: `Bearer ${token}` }
    })
  );

  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as {
    items: Array<{ externalOrderId: string; status: string }>;
  };
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0]?.externalOrderId, "ext-004");
  assert.equal(listBody.items[0]?.status, "reserved");
});

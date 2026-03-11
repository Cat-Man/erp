import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

type ApiApp = ReturnType<typeof createApp>;

interface InventoryBalanceDto {
  warehouseId: string;
  skuId: string;
  stockStatus: string;
  quantity: number;
}

interface InventoryTransactionDto {
  id: string;
  operationType: string;
  warehouseId: string;
  skuId: string;
  stockStatus: string;
  quantityDelta: number;
  operationId: string;
}

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

async function seedInventoryMasterData(app: ApiApp, token: string): Promise<void> {
  await app.handle(
    new Request("http://localhost/master-data/stores", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
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
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "wh-001",
        code: "WH-SH-01",
        name: "Shanghai Available Warehouse",
        type: "central",
        storeId: "store-001"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/warehouses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "wh-002",
        code: "WH-SH-02",
        name: "Shanghai Transfer Warehouse",
        type: "store",
        storeId: "store-001"
      })
    })
  );

  await app.handle(
    new Request("http://localhost/master-data/skus", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "sku-001",
        skuCode: "SKU-APPLE-001",
        barcode: "6901234567890",
        name: "Apple Juice 1L"
      })
    })
  );
}

async function listBalances(app: ApiApp, token: string, query = ""): Promise<InventoryBalanceDto[]> {
  const response = await app.handle(
    new Request(`http://localhost/inventory/balances${query}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    })
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { items: InventoryBalanceDto[] };
  return body.items;
}

async function listTransactions(app: ApiApp, token: string, query = ""): Promise<InventoryTransactionDto[]> {
  const response = await app.handle(
    new Request(`http://localhost/inventory/transactions${query}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    })
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { items: InventoryTransactionDto[] };
  return body.items;
}

test("inbound creates available balance and ledger transaction", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedInventoryMasterData(app, token);

  const inboundResponse = await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 12
      })
    })
  );

  assert.equal(inboundResponse.status, 201);

  const balances = await listBalances(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.deepEqual(balances, [
    {
      warehouseId: "wh-001",
      skuId: "sku-001",
      stockStatus: "available",
      quantity: 12
    }
  ]);

  const transactions = await listTransactions(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.operationType, "inbound");
  assert.equal(transactions[0]?.quantityDelta, 12);
});

test("outbound deducts available stock and rejects negative inventory", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedInventoryMasterData(app, token);

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 10
      })
    })
  );

  const outboundResponse = await app.handle(
    new Request("http://localhost/inventory/outbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 4
      })
    })
  );

  assert.equal(outboundResponse.status, 201);

  const balances = await listBalances(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.deepEqual(balances, [
    {
      warehouseId: "wh-001",
      skuId: "sku-001",
      stockStatus: "available",
      quantity: 6
    }
  ]);

  const rejectedOutbound = await app.handle(
    new Request("http://localhost/inventory/outbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 7
      })
    })
  );

  assert.equal(rejectedOutbound.status, 409);
  assert.deepEqual(await rejectedOutbound.json(), {
    error: "inventory_insufficient_available"
  });
});

test("transfer writes in-transit ledger and lands stock in destination warehouse", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedInventoryMasterData(app, token);

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 9
      })
    })
  );

  const transferResponse = await app.handle(
    new Request("http://localhost/inventory/transfers", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fromWarehouseId: "wh-001",
        toWarehouseId: "wh-002",
        skuId: "sku-001",
        quantity: 5
      })
    })
  );

  assert.equal(transferResponse.status, 201);

  const sourceBalances = await listBalances(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.deepEqual(sourceBalances, [
    {
      warehouseId: "wh-001",
      skuId: "sku-001",
      stockStatus: "available",
      quantity: 4
    }
  ]);

  const destinationBalances = await listBalances(app, token, "?warehouseId=wh-002&skuId=sku-001");
  assert.deepEqual(destinationBalances, [
    {
      warehouseId: "wh-002",
      skuId: "sku-001",
      stockStatus: "available",
      quantity: 5
    }
  ]);

  const transferTransactions = await listTransactions(app, token, "?operationType=transfer");
  assert.equal(transferTransactions.length, 4);
  assert.equal(
    transferTransactions.filter((entry) => entry.stockStatus === "in_transit").length,
    2
  );
});

test("reservation and release move stock between available and reserved", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedInventoryMasterData(app, token);

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 10
      })
    })
  );

  const reserveResponse = await app.handle(
    new Request("http://localhost/inventory/reservations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 4
      })
    })
  );

  assert.equal(reserveResponse.status, 201);

  const releaseResponse = await app.handle(
    new Request("http://localhost/inventory/reservations/release", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 2
      })
    })
  );

  assert.equal(releaseResponse.status, 201);

  const balances = await listBalances(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.deepEqual(
    balances.sort((left, right) => left.stockStatus.localeCompare(right.stockStatus)),
    [
      {
        warehouseId: "wh-001",
        skuId: "sku-001",
        stockStatus: "available",
        quantity: 8
      },
      {
        warehouseId: "wh-001",
        skuId: "sku-001",
        stockStatus: "reserved",
        quantity: 2
      }
    ]
  );

  const rejectedRelease = await app.handle(
    new Request("http://localhost/inventory/reservations/release", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 3
      })
    })
  );

  assert.equal(rejectedRelease.status, 409);
  assert.deepEqual(await rejectedRelease.json(), {
    error: "inventory_insufficient_reserved"
  });
});

test("count adjustment reconciles available stock to counted quantity", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);
  await seedInventoryMasterData(app, token);

  await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        quantity: 5
      })
    })
  );

  const countAdjustmentResponse = await app.handle(
    new Request("http://localhost/inventory/count-adjustments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-001",
        skuId: "sku-001",
        countedQuantity: 8
      })
    })
  );

  assert.equal(countAdjustmentResponse.status, 201);

  const balances = await listBalances(app, token, "?warehouseId=wh-001&skuId=sku-001");
  assert.deepEqual(balances, [
    {
      warehouseId: "wh-001",
      skuId: "sku-001",
      stockStatus: "available",
      quantity: 8
    }
  ]);

  const transactions = await listTransactions(app, token, "?operationType=count_adjustment");
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.quantityDelta, 3);
});

test("inventory write validates master data existence", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  const inboundResponse = await app.handle(
    new Request("http://localhost/inventory/inbounds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        warehouseId: "wh-404",
        skuId: "sku-404",
        quantity: 1
      })
    })
  );

  assert.equal(inboundResponse.status, 400);
  assert.deepEqual(await inboundResponse.json(), {
    error: "inventory_warehouse_not_found"
  });
});

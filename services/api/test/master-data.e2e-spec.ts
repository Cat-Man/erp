import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

async function loginAsAdmin(app: ReturnType<typeof createApp>): Promise<string> {
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

test("store create succeeds and can be listed", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  const createResponse = await app.handle(
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

  assert.equal(createResponse.status, 201);

  const listResponse = await app.handle(
    new Request("http://localhost/master-data/stores", {
      headers: {
        authorization: `Bearer ${token}`
      }
    })
  );

  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as { items: Array<{ id: string; code: string }> };
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0]?.id, "store-001");
  assert.equal(listBody.items[0]?.code, "SH001");
});

test("warehouse create requires an existing store", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

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

  const createResponse = await app.handle(
    new Request("http://localhost/master-data/warehouses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "wh-001",
        code: "WH-SH-01",
        name: "Shanghai Central Warehouse",
        type: "central",
        storeId: "store-001"
      })
    })
  );

  assert.equal(createResponse.status, 201);

  const listResponse = await app.handle(
    new Request("http://localhost/master-data/warehouses", {
      headers: {
        authorization: `Bearer ${token}`
      }
    })
  );

  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as { items: Array<{ id: string; storeId: string }> };
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0]?.id, "wh-001");
  assert.equal(listBody.items[0]?.storeId, "store-001");
});

test("sku create succeeds and can be listed", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  const createResponse = await app.handle(
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

  assert.equal(createResponse.status, 201);

  const listResponse = await app.handle(
    new Request("http://localhost/master-data/skus", {
      headers: {
        authorization: `Bearer ${token}`
      }
    })
  );

  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as { items: Array<{ id: string; barcode: string }> };
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0]?.id, "sku-001");
  assert.equal(listBody.items[0]?.barcode, "6901234567890");
});

test("duplicate barcode is rejected", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

  const firstCreate = await app.handle(
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
  assert.equal(firstCreate.status, 201);

  const secondCreate = await app.handle(
    new Request("http://localhost/master-data/skus", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "sku-002",
        skuCode: "SKU-APPLE-002",
        barcode: "6901234567890",
        name: "Apple Juice 500ml"
      })
    })
  );

  assert.equal(secondCreate.status, 409);
  assert.deepEqual(await secondCreate.json(), {
    error: "duplicate_barcode"
  });
});

test("price overlap is rejected for same sku store and price type", async () => {
  const app = createApp();
  const token = await loginAsAdmin(app);

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

  const firstCreate = await app.handle(
    new Request("http://localhost/master-data/prices", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "price-001",
        skuId: "sku-001",
        storeId: "store-001",
        priceType: "base",
        salePrice: 19.9,
        effectiveFrom: "2026-03-01T00:00:00.000Z",
        effectiveTo: "2026-03-31T23:59:59.000Z"
      })
    })
  );
  assert.equal(firstCreate.status, 201);

  const secondCreate = await app.handle(
    new Request("http://localhost/master-data/prices", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: "price-002",
        skuId: "sku-001",
        storeId: "store-001",
        priceType: "base",
        salePrice: 18.9,
        effectiveFrom: "2026-03-15T00:00:00.000Z",
        effectiveTo: "2026-04-15T23:59:59.000Z"
      })
    })
  );

  assert.equal(secondCreate.status, 409);
  assert.deepEqual(await secondCreate.json(), {
    error: "price_overlap"
  });
});

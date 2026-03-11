import assert from "node:assert/strict";
import test from "node:test";

test("admin web exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/admin-web");
  assert.equal(mod.workspaceInfo.kind, "app");
});

test("admin web exports master data page definitions", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.masterDataPages.stores.resource, "stores");
  assert.equal(mod.masterDataPages.stores.listPath, "/master-data/stores");
  assert.equal(mod.masterDataPages.warehouses.createEndpoint, "/master-data/warehouses");
  assert.equal(mod.masterDataPages.skus.detailFields[0]?.key, "skuCode");
  assert.equal(mod.masterDataPages.prices.detailFields[2]?.key, "priceType");

  assert.deepEqual(
    mod.masterDataNavigation.map((item: { key: string }) => item.key),
    ["stores", "warehouses", "skus", "prices"]
  );
});

test("admin web exports inventory page definitions", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.inventoryPages.balances.listEndpoint, "/inventory/balances");
  assert.equal(mod.inventoryPages.transactions.listEndpoint, "/inventory/transactions");
  assert.equal(mod.inventoryPages.transfers.submitEndpoint, "/inventory/transfers");
  assert.equal(mod.inventoryPages.countAdjustments.fields[2]?.key, "countedQuantity");

  assert.deepEqual(
    mod.inventoryNavigation.map((item: { key: string }) => item.key),
    [
      "inventory-balances",
      "inventory-transactions",
      "inventory-transfers",
      "inventory-count-adjustments"
    ]
  );
});

test("admin web exports omni-order page definitions", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.orderPages.list.listEndpoint, "/omni-orders");
  assert.equal(mod.orderPages.detail.detailPath, "/omni-orders/:externalOrderId");
  assert.equal(mod.orderPages.retry.submitEndpoint, "/omni-orders/retry");

  assert.deepEqual(
    mod.orderNavigation.map((item: { key: string }) => item.key),
    [
      "omni-orders",
      "omni-order-detail",
      "omni-order-retry"
    ]
  );
});

test("admin web exports settlement and reports page definitions", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.settlementPages.reconciliations.submitEndpoint, "/settlement/reconciliations");
  assert.equal(mod.settlementPages.vouchers.listEndpoint, "/settlement/vouchers");
  assert.equal(mod.reportPages.storeSalesDaily.listEndpoint, "/reports/store-sales-daily");
  assert.equal(mod.reportPages.inventoryDaily.listEndpoint, "/reports/inventory-daily");
  assert.equal(mod.reportPages.dayCloseExceptions.listEndpoint, "/reports/day-close-exceptions");

  assert.deepEqual(
    mod.adminNavigation.map((item: { key: string }) => item.key),
    [
      "stores",
      "warehouses",
      "skus",
      "prices",
      "inventory-balances",
      "inventory-transactions",
      "inventory-transfers",
      "inventory-count-adjustments",
      "omni-orders",
      "omni-order-detail",
      "omni-order-retry",
      "settlement-reconciliations",
      "settlement-vouchers",
      "report-store-sales-daily",
      "report-inventory-daily",
      "report-day-close-exceptions"
    ]
  );
});

import assert from "node:assert/strict";
import test from "node:test";

test("domain package exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/domain");
  assert.equal(mod.workspaceInfo.kind, "package");
});

test("domain package exports inventory helpers", async () => {
  const mod = await import("./index.js");

  assert.deepEqual(mod.inventoryStockStatuses, ["available", "reserved", "in_transit", "damaged"]);
  assert.equal(
    mod.buildInventoryBalanceKey({
      warehouseId: "wh-001",
      skuId: "sku-001",
      stockStatus: "available"
    }),
    "wh-001::sku-001::available"
  );
});

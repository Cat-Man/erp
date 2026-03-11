import assert from "node:assert/strict";
import test from "node:test";

test("contracts package exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/contracts");
  assert.equal(mod.workspaceInfo.kind, "package");
});

test("contracts package exports pos contracts", async () => {
  const mod = await import("./index.js");

  assert.deepEqual(mod.posPaymentMethods, ["cash", "card", "wallet"]);
  assert.deepEqual(mod.posOrderTypes, ["sale", "refund", "exchange"]);
  assert.deepEqual(mod.posDayCloseStatuses, ["balanced", "exception"]);
});

test("contracts package exports omni-order contracts", async () => {
  const mod = await import("./index.js");

  assert.deepEqual(mod.omniOrderStatuses, ["reserved", "reservation_failed"]);
  assert.equal(mod.mockMarketplaceChannel, "mock-marketplace");
});

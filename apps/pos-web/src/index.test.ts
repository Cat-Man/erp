import assert from "node:assert/strict";
import test from "node:test";

test("pos web exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/pos-web");
  assert.equal(mod.workspaceInfo.kind, "app");
});

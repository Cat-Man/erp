import assert from "node:assert/strict";
import test from "node:test";

test("api service exports workspace metadata", async () => {
  const mod = await import("./index.js");

  assert.equal(mod.workspaceInfo.name, "@retail-erp/api");
  assert.equal(mod.workspaceInfo.kind, "service");
});

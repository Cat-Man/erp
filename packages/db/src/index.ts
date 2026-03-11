export const workspaceInfo = {
  name: "@retail-erp/db",
  kind: "package",
  entry: "db"
} as const;

export * from "./schema/org.js";
export * from "./schema/store.js";
export * from "./schema/warehouse.js";
export * from "./schema/sku.js";
export * from "./schema/price.js";
export * from "./schema/inventory.js";
export * from "./schema/pos.js";
export * from "./schema/settlement.js";

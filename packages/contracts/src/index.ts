export const workspaceInfo = {
  name: "@retail-erp/contracts",
  kind: "package",
  entry: "contracts"
} as const;

export * from "./auth.js";
export * from "./rbac.js";
export * from "./audit.js";
export * from "./pos.js";
export * from "./omni-order.js";

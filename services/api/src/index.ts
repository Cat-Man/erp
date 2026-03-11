export const workspaceInfo = {
  name: "@retail-erp/api",
  kind: "service",
  entry: "api"
} as const;

export * from "./app.js";
export * from "./modules/auth/service.js";
export * from "./modules/auth/types.js";
export * from "./modules/rbac/service.js";
export * from "./modules/audit/service.js";
export * from "./modules/master-data/service.js";
export * from "./modules/master-data/types.js";
export * from "./modules/health/service.js";
export * from "./modules/health/types.js";
export * from "./modules/metrics/service.js";

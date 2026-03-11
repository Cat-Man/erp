import { inventoryNavigation } from "./pages/inventory/index.js";
import { masterDataNavigation } from "./pages/master-data/index.js";
import { orderNavigation } from "./pages/orders/index.js";
import { reportNavigation } from "./pages/reports/index.js";
import { settlementNavigation } from "./pages/settlement/index.js";

export const workspaceInfo = {
  name: "@retail-erp/admin-web",
  kind: "app",
  entry: "admin-web"
} as const;

export const adminNavigation = [
  ...masterDataNavigation,
  ...inventoryNavigation,
  ...orderNavigation,
  ...settlementNavigation,
  ...reportNavigation
];

export * from "./pages/master-data/index.js";
export * from "./pages/inventory/index.js";
export * from "./pages/orders/index.js";
export * from "./pages/settlement/index.js";
export * from "./pages/reports/index.js";

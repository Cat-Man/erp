import type { AdminNavigationItem } from "../master-data/types.js";
import { inventoryBalancesPage } from "./balances.js";
import { inventoryCountAdjustmentsPage } from "./count-adjustments.js";
import { inventoryTransactionsPage } from "./transactions.js";
import { inventoryTransfersPage } from "./transfers.js";
import type { InventoryPageRegistry } from "./types.js";

export const inventoryPages: InventoryPageRegistry = {
  balances: inventoryBalancesPage,
  transactions: inventoryTransactionsPage,
  transfers: inventoryTransfersPage,
  countAdjustments: inventoryCountAdjustmentsPage
};

export const inventoryNavigation: AdminNavigationItem[] = [
  {
    key: inventoryBalancesPage.key,
    title: inventoryBalancesPage.title,
    path: inventoryBalancesPage.path
  },
  {
    key: inventoryTransactionsPage.key,
    title: inventoryTransactionsPage.title,
    path: inventoryTransactionsPage.path
  },
  {
    key: inventoryTransfersPage.key,
    title: inventoryTransfersPage.title,
    path: inventoryTransfersPage.path
  },
  {
    key: inventoryCountAdjustmentsPage.key,
    title: inventoryCountAdjustmentsPage.title,
    path: inventoryCountAdjustmentsPage.path
  }
];

export * from "./types.js";
export * from "./balances.js";
export * from "./transactions.js";
export * from "./transfers.js";
export * from "./count-adjustments.js";

import type { AdminNavigationItem } from "../master-data/types.js";
import { settlementReconciliationsPage } from "./reconciliations.js";
import type { SettlementPageRegistry } from "./types.js";
import { settlementVouchersPage } from "./vouchers.js";

export const settlementPages: SettlementPageRegistry = {
  reconciliations: settlementReconciliationsPage,
  vouchers: settlementVouchersPage
};

export const settlementNavigation: AdminNavigationItem[] = [
  {
    key: settlementReconciliationsPage.key,
    title: settlementReconciliationsPage.title,
    path: settlementReconciliationsPage.path
  },
  {
    key: settlementVouchersPage.key,
    title: settlementVouchersPage.title,
    path: settlementVouchersPage.path
  }
];

export * from "./types.js";
export * from "./reconciliations.js";
export * from "./vouchers.js";

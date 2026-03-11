import type { AdminNavigationItem } from "../master-data/types.js";
import { dayCloseExceptionsReportPage } from "./day-close-exceptions.js";
import { inventoryDailyReportPage } from "./inventory-daily.js";
import { storeSalesDailyReportPage } from "./store-sales-daily.js";
import type { ReportPageRegistry } from "./types.js";

export const reportPages: ReportPageRegistry = {
  storeSalesDaily: storeSalesDailyReportPage,
  inventoryDaily: inventoryDailyReportPage,
  dayCloseExceptions: dayCloseExceptionsReportPage
};

export const reportNavigation: AdminNavigationItem[] = [
  {
    key: storeSalesDailyReportPage.key,
    title: storeSalesDailyReportPage.title,
    path: storeSalesDailyReportPage.path
  },
  {
    key: inventoryDailyReportPage.key,
    title: inventoryDailyReportPage.title,
    path: inventoryDailyReportPage.path
  },
  {
    key: dayCloseExceptionsReportPage.key,
    title: dayCloseExceptionsReportPage.title,
    path: dayCloseExceptionsReportPage.path
  }
];

export * from "./types.js";
export * from "./store-sales-daily.js";
export * from "./inventory-daily.js";
export * from "./day-close-exceptions.js";

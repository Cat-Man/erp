import type { AdminNavigationItem } from "../master-data/types.js";

export interface ReportColumnDefinition {
  key: string;
  label: string;
}

export interface ReportPageDefinition {
  key: string;
  title: string;
  path: string;
  listEndpoint: string;
  columns: readonly ReportColumnDefinition[];
}

export interface ReportPageRegistry {
  storeSalesDaily: ReportPageDefinition;
  inventoryDaily: ReportPageDefinition;
  dayCloseExceptions: ReportPageDefinition;
}

export type ReportNavigationItem = AdminNavigationItem;

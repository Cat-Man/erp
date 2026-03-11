import { pricesPage } from "./prices.js";
import { skusPage } from "./skus.js";
import { storesPage } from "./stores.js";
import type { AdminNavigationItem, MasterDataPageDefinition } from "./types.js";
import { warehousesPage } from "./warehouses.js";

export const masterDataPages: Record<string, MasterDataPageDefinition> = {
  stores: storesPage,
  warehouses: warehousesPage,
  skus: skusPage,
  prices: pricesPage
};

export const masterDataNavigation: AdminNavigationItem[] = [
  {
    key: storesPage.key,
    title: storesPage.title,
    path: storesPage.listPath
  },
  {
    key: warehousesPage.key,
    title: warehousesPage.title,
    path: warehousesPage.listPath
  },
  {
    key: skusPage.key,
    title: skusPage.title,
    path: skusPage.listPath
  },
  {
    key: pricesPage.key,
    title: pricesPage.title,
    path: pricesPage.listPath
  }
];

export * from "./types.js";
export * from "./stores.js";
export * from "./warehouses.js";
export * from "./skus.js";
export * from "./prices.js";

import type { AdminNavigationItem } from "../master-data/types.js";
import { orderDetailPage } from "./detail.js";
import { orderListPage } from "./list.js";
import { orderRetryPage } from "./retry.js";
import type { OrderPageRegistry } from "./types.js";

export const orderPages: OrderPageRegistry = {
  list: orderListPage,
  detail: orderDetailPage,
  retry: orderRetryPage
};

export const orderNavigation: AdminNavigationItem[] = [
  {
    key: orderListPage.key,
    title: orderListPage.title,
    path: orderListPage.path ?? "/omni-orders"
  },
  {
    key: orderDetailPage.key,
    title: orderDetailPage.title,
    path: orderDetailPage.detailPath ?? "/omni-orders/:externalOrderId"
  },
  {
    key: orderRetryPage.key,
    title: orderRetryPage.title,
    path: orderRetryPage.path ?? "/omni-orders/retry"
  }
];

export * from "./types.js";
export * from "./list.js";
export * from "./detail.js";
export * from "./retry.js";

import type { OrderPageDefinition } from "./types.js";

export const orderListPage: OrderPageDefinition = {
  key: "omni-orders",
  title: "渠道订单列表",
  path: "/omni-orders",
  listEndpoint: "/omni-orders",
  columns: [
    {
      key: "externalOrderId",
      label: "外部订单号"
    },
    {
      key: "channel",
      label: "渠道"
    },
    {
      key: "status",
      label: "预留状态"
    },
    {
      key: "fulfillmentWarehouseId",
      label: "履约仓"
    }
  ]
};

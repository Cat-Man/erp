import type { OrderPageDefinition } from "./types.js";

export const orderDetailPage: OrderPageDefinition = {
  key: "omni-order-detail",
  title: "渠道订单详情",
  detailPath: "/omni-orders/:externalOrderId",
  listEndpoint: "/omni-orders",
  fields: [
    {
      key: "externalOrderId",
      label: "外部订单号",
      input: "text",
      required: true
    },
    {
      key: "status",
      label: "预留状态",
      input: "text"
    },
    {
      key: "fulfillmentWarehouseId",
      label: "履约仓",
      input: "text"
    }
  ]
};

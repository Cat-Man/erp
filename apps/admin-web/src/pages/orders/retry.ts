import type { OrderPageDefinition } from "./types.js";

export const orderRetryPage: OrderPageDefinition = {
  key: "omni-order-retry",
  title: "渠道订单重试",
  path: "/omni-orders/retry",
  submitEndpoint: "/omni-orders/retry",
  fields: [
    {
      key: "externalOrderId",
      label: "外部订单号",
      input: "text",
      required: true
    }
  ]
};

import type { SettlementPageDefinition } from "./types.js";

export const settlementVouchersPage: SettlementPageDefinition = {
  key: "settlement-vouchers",
  title: "凭证草稿",
  path: "/settlement/vouchers",
  listEndpoint: "/settlement/vouchers",
  columns: [
    {
      key: "businessDate",
      label: "营业日"
    },
    {
      key: "paymentMethod",
      label: "支付方式"
    },
    {
      key: "businessType",
      label: "业务类型"
    },
    {
      key: "amount",
      label: "金额"
    }
  ]
};

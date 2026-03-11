import type { SettlementPageDefinition } from "./types.js";

export const settlementReconciliationsPage: SettlementPageDefinition = {
  key: "settlement-reconciliations",
  title: "日结对账",
  path: "/settlement/reconciliations",
  submitEndpoint: "/settlement/reconciliations",
  fields: [
    {
      key: "shiftId",
      label: "班次号",
      input: "text",
      required: true
    }
  ],
  columns: [
    {
      key: "shiftId",
      label: "班次号"
    },
    {
      key: "status",
      label: "对账状态"
    },
    {
      key: "voucherDraftCount",
      label: "凭证草稿数"
    }
  ]
};

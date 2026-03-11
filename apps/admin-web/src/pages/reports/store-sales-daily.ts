import type { ReportPageDefinition } from "./types.js";

export const storeSalesDailyReportPage: ReportPageDefinition = {
  key: "report-store-sales-daily",
  title: "门店销售日报",
  path: "/reports/store-sales-daily",
  listEndpoint: "/reports/store-sales-daily",
  columns: [
    {
      key: "storeId",
      label: "门店"
    },
    {
      key: "businessDate",
      label: "营业日"
    },
    {
      key: "netSales",
      label: "净销售额"
    }
  ]
};

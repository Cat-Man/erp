import type { ReportPageDefinition } from "./types.js";

export const inventoryDailyReportPage: ReportPageDefinition = {
  key: "report-inventory-daily",
  title: "库存日报",
  path: "/reports/inventory-daily",
  listEndpoint: "/reports/inventory-daily",
  columns: [
    {
      key: "warehouseId",
      label: "仓库"
    },
    {
      key: "skuId",
      label: "SKU"
    },
    {
      key: "quantity",
      label: "数量"
    }
  ]
};

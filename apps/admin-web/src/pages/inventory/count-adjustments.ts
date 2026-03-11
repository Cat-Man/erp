import type { InventoryPageDefinition } from "./types.js";

export const inventoryCountAdjustmentsPage: InventoryPageDefinition = {
  key: "inventory-count-adjustments",
  title: "盘点差异调整",
  path: "/inventory/count-adjustments",
  submitEndpoint: "/inventory/count-adjustments",
  fields: [
    {
      key: "warehouseId",
      label: "仓库",
      input: "text",
      required: true
    },
    {
      key: "skuId",
      label: "SKU",
      input: "text",
      required: true
    },
    {
      key: "countedQuantity",
      label: "盘点数量",
      input: "number",
      required: true
    }
  ]
};

import type { InventoryPageDefinition } from "./types.js";

export const inventoryTransfersPage: InventoryPageDefinition = {
  key: "inventory-transfers",
  title: "库存调拨",
  path: "/inventory/transfers",
  submitEndpoint: "/inventory/transfers",
  fields: [
    {
      key: "fromWarehouseId",
      label: "调出仓",
      input: "text",
      required: true
    },
    {
      key: "toWarehouseId",
      label: "调入仓",
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
      key: "quantity",
      label: "调拨数量",
      input: "number",
      required: true
    }
  ]
};

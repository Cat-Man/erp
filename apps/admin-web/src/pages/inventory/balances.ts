import type { InventoryPageDefinition } from "./types.js";

export const inventoryBalancesPage: InventoryPageDefinition = {
  key: "inventory-balances",
  title: "库存余额查询",
  path: "/inventory/balances",
  listEndpoint: "/inventory/balances",
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
      key: "stockStatus",
      label: "库存状态"
    },
    {
      key: "quantity",
      label: "数量"
    }
  ],
  fields: [
    {
      key: "warehouseId",
      label: "仓库",
      input: "text"
    },
    {
      key: "skuId",
      label: "SKU",
      input: "text"
    },
    {
      key: "stockStatus",
      label: "库存状态",
      input: "select"
    }
  ]
};

import type { InventoryPageDefinition } from "./types.js";

export const inventoryTransactionsPage: InventoryPageDefinition = {
  key: "inventory-transactions",
  title: "库存流水查询",
  path: "/inventory/transactions",
  listEndpoint: "/inventory/transactions",
  columns: [
    {
      key: "operationType",
      label: "业务类型"
    },
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
      key: "quantityDelta",
      label: "变动量"
    }
  ],
  fields: [
    {
      key: "operationType",
      label: "业务类型",
      input: "text"
    },
    {
      key: "warehouseId",
      label: "仓库",
      input: "text"
    },
    {
      key: "skuId",
      label: "SKU",
      input: "text"
    }
  ]
};

import type { MasterDataPageDefinition } from "./types.js";

export const warehousesPage: MasterDataPageDefinition = {
  key: "warehouses",
  resource: "warehouses",
  title: "仓库主数据",
  listPath: "/master-data/warehouses",
  detailPath: "/master-data/warehouses/:id",
  listEndpoint: "/master-data/warehouses",
  createEndpoint: "/master-data/warehouses",
  listColumns: [
    {
      key: "code",
      label: "仓库编码"
    },
    {
      key: "name",
      label: "仓库名称"
    },
    {
      key: "storeId",
      label: "所属门店"
    },
    {
      key: "type",
      label: "仓库类型"
    }
  ],
  detailFields: [
    {
      key: "code",
      label: "仓库编码",
      input: "text",
      required: true
    },
    {
      key: "name",
      label: "仓库名称",
      input: "text",
      required: true
    },
    {
      key: "storeId",
      label: "所属门店",
      input: "text",
      required: true
    },
    {
      key: "type",
      label: "仓库类型",
      input: "select",
      required: true,
      options: [
        {
          label: "中央仓",
          value: "central"
        },
        {
          label: "门店仓",
          value: "store"
        }
      ]
    },
    {
      key: "status",
      label: "状态",
      input: "select",
      options: [
        {
          label: "启用",
          value: "active"
        },
        {
          label: "停用",
          value: "inactive"
        }
      ]
    }
  ]
};

import type { MasterDataPageDefinition } from "./types.js";

export const storesPage: MasterDataPageDefinition = {
  key: "stores",
  resource: "stores",
  title: "门店主数据",
  listPath: "/master-data/stores",
  detailPath: "/master-data/stores/:id",
  listEndpoint: "/master-data/stores",
  createEndpoint: "/master-data/stores",
  listColumns: [
    {
      key: "code",
      label: "门店编码"
    },
    {
      key: "name",
      label: "门店名称"
    },
    {
      key: "status",
      label: "状态"
    }
  ],
  detailFields: [
    {
      key: "code",
      label: "门店编码",
      input: "text",
      required: true
    },
    {
      key: "name",
      label: "门店名称",
      input: "text",
      required: true
    },
    {
      key: "regionId",
      label: "区域组织",
      input: "text"
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

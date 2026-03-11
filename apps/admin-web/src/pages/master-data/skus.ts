import type { MasterDataPageDefinition } from "./types.js";

export const skusPage: MasterDataPageDefinition = {
  key: "skus",
  resource: "skus",
  title: "商品主数据",
  listPath: "/master-data/skus",
  detailPath: "/master-data/skus/:id",
  listEndpoint: "/master-data/skus",
  createEndpoint: "/master-data/skus",
  listColumns: [
    {
      key: "skuCode",
      label: "SKU 编码"
    },
    {
      key: "barcode",
      label: "条码"
    },
    {
      key: "name",
      label: "商品名称"
    },
    {
      key: "status",
      label: "状态"
    }
  ],
  detailFields: [
    {
      key: "skuCode",
      label: "SKU 编码",
      input: "text",
      required: true
    },
    {
      key: "barcode",
      label: "条码",
      input: "text",
      required: true
    },
    {
      key: "name",
      label: "商品名称",
      input: "text",
      required: true
    },
    {
      key: "brandId",
      label: "品牌",
      input: "text"
    },
    {
      key: "categoryId",
      label: "品类",
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

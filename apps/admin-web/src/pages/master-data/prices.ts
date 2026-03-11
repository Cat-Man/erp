import type { MasterDataPageDefinition } from "./types.js";

export const pricesPage: MasterDataPageDefinition = {
  key: "prices",
  resource: "prices",
  title: "售价主数据",
  listPath: "/master-data/prices",
  detailPath: "/master-data/prices/:id",
  listEndpoint: "/master-data/prices",
  createEndpoint: "/master-data/prices",
  listColumns: [
    {
      key: "skuId",
      label: "SKU"
    },
    {
      key: "storeId",
      label: "门店"
    },
    {
      key: "priceType",
      label: "价格类型"
    },
    {
      key: "salePrice",
      label: "售价"
    }
  ],
  detailFields: [
    {
      key: "skuId",
      label: "SKU",
      input: "text",
      required: true
    },
    {
      key: "storeId",
      label: "门店",
      input: "text",
      required: true
    },
    {
      key: "priceType",
      label: "价格类型",
      input: "select",
      required: true,
      options: [
        {
          label: "基础价",
          value: "base"
        },
        {
          label: "门店价",
          value: "store_override"
        }
      ]
    },
    {
      key: "salePrice",
      label: "售价",
      input: "number",
      required: true
    },
    {
      key: "effectiveFrom",
      label: "生效开始时间",
      input: "datetime",
      required: true
    },
    {
      key: "effectiveTo",
      label: "生效结束时间",
      input: "datetime"
    }
  ]
};

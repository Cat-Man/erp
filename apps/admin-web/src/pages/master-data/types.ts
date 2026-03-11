export type MasterDataResource = "stores" | "warehouses" | "skus" | "prices";

export type FieldInputKind = "text" | "select" | "number" | "datetime";

export interface MasterDataFieldOption {
  label: string;
  value: string;
}

export interface MasterDataFieldDefinition {
  key: string;
  label: string;
  input: FieldInputKind;
  required?: boolean;
  options?: readonly MasterDataFieldOption[];
}

export interface MasterDataColumnDefinition {
  key: string;
  label: string;
}

export interface MasterDataPageDefinition {
  key: MasterDataResource;
  resource: MasterDataResource;
  title: string;
  listPath: string;
  detailPath: string;
  listEndpoint: string;
  createEndpoint: string;
  listColumns: readonly MasterDataColumnDefinition[];
  detailFields: readonly MasterDataFieldDefinition[];
}

export interface AdminNavigationItem {
  key: string;
  title: string;
  path: string;
}

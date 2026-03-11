import type { AdminNavigationItem, FieldInputKind } from "../master-data/types.js";

export interface OrderFieldDefinition {
  key: string;
  label: string;
  input: FieldInputKind;
  required?: boolean;
}

export interface OrderColumnDefinition {
  key: string;
  label: string;
}

export interface OrderPageDefinition {
  key: string;
  title: string;
  path?: string;
  detailPath?: string;
  listEndpoint?: string;
  submitEndpoint?: string;
  columns?: readonly OrderColumnDefinition[];
  fields?: readonly OrderFieldDefinition[];
}

export interface OrderPageRegistry {
  list: OrderPageDefinition;
  detail: OrderPageDefinition;
  retry: OrderPageDefinition;
}

export type OrderNavigationItem = AdminNavigationItem;

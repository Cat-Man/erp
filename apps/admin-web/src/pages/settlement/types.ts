import type { AdminNavigationItem, FieldInputKind } from "../master-data/types.js";

export interface SettlementFieldDefinition {
  key: string;
  label: string;
  input: FieldInputKind;
  required?: boolean;
}

export interface SettlementColumnDefinition {
  key: string;
  label: string;
}

export interface SettlementPageDefinition {
  key: string;
  title: string;
  path: string;
  listEndpoint?: string;
  submitEndpoint?: string;
  columns?: readonly SettlementColumnDefinition[];
  fields?: readonly SettlementFieldDefinition[];
}

export interface SettlementPageRegistry {
  reconciliations: SettlementPageDefinition;
  vouchers: SettlementPageDefinition;
}

export type SettlementNavigationItem = AdminNavigationItem;

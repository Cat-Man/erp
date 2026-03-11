import type { AdminNavigationItem, FieldInputKind } from "../master-data/types.js";

export interface InventoryFieldDefinition {
  key: string;
  label: string;
  input: FieldInputKind;
  required?: boolean;
}

export interface InventoryColumnDefinition {
  key: string;
  label: string;
}

export interface InventoryPageDefinition {
  key: string;
  title: string;
  path: string;
  listEndpoint?: string;
  submitEndpoint?: string;
  columns?: readonly InventoryColumnDefinition[];
  fields: readonly InventoryFieldDefinition[];
}

export interface InventoryPageRegistry {
  balances: InventoryPageDefinition;
  transactions: InventoryPageDefinition;
  transfers: InventoryPageDefinition;
  countAdjustments: InventoryPageDefinition;
}

export type InventoryNavigationItem = AdminNavigationItem;

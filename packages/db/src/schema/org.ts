export type OrgUnitType = "headquarters" | "region" | "store";

export interface OrgUnitRecord {
  id: string;
  code: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  status: "active" | "inactive";
}

export interface CreateOrgUnitInput {
  id: string;
  code: string;
  name: string;
  type: OrgUnitType;
  parentId?: string | null;
  status?: "active" | "inactive";
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field}_required`);
  }

  return normalized;
}

export function validateCreateOrgUnitInput(input: CreateOrgUnitInput): OrgUnitRecord {
  return {
    id: requireText(input.id, "org_unit_id"),
    code: requireText(input.code, "org_unit_code"),
    name: requireText(input.name, "org_unit_name"),
    type: input.type,
    parentId: input.parentId?.trim() || null,
    status: input.status ?? "active"
  };
}

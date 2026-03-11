import type { UserRole } from "./auth.js";

export interface AuditActor {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  actor: AuditActor;
  createdAt: string;
  before?: unknown;
  after?: unknown;
}

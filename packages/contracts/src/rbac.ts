import type { UserRole } from "./auth.js";

export interface AccessPolicy {
  resource: string;
  allowedRoles: UserRole[];
}

export interface AccessDecision {
  allowed: boolean;
  reason?: "missing_token" | "invalid_token" | "insufficient_role";
}

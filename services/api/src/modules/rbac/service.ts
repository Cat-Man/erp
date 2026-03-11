import type { AuthResolutionResult, UserRole } from "../auth/types.js";

export interface AccessDecision {
  allowed: boolean;
  reason?: "missing_token" | "invalid_token" | "insufficient_role";
}

export class RbacService {
  requireRole(authResult: AuthResolutionResult, allowedRoles: UserRole[]): AccessDecision {
    if (authResult.status === "missing") {
      return {
        allowed: false,
        reason: "missing_token"
      };
    }

    if (authResult.status === "invalid") {
      return {
        allowed: false,
        reason: "invalid_token"
      };
    }

    if (!allowedRoles.includes(authResult.session.role)) {
      return {
        allowed: false,
        reason: "insufficient_role"
      };
    }

    return {
      allowed: true
    };
  }
}

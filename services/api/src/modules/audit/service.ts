import { randomUUID } from "node:crypto";

import type { AuthSession } from "../auth/types.js";

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  actor: {
    id: string;
    username: string;
    role: AuthSession["role"];
  };
  createdAt: string;
  before?: unknown;
  after?: unknown;
}

export class AuditService {
  private readonly entries: AuditEntry[] = [];

  record(input: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
    const entry: AuditEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };

    this.entries.push(entry);
    return entry;
  }

  list(): AuditEntry[] {
    return [...this.entries];
  }
}

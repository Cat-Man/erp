import { randomUUID } from "node:crypto";

import { demoUsers } from "./store.js";
import type { AuthResolutionResult, AuthSession, UserAccount } from "./types.js";

export class AuthService {
  private readonly sessions = new Map<string, AuthSession>();

  constructor(private readonly users: UserAccount[] = demoUsers) {}

  login(username: string, password: string): { token: string; user: AuthSession } | null {
    const user = this.users.find((entry) => entry.username === username && entry.password === password);
    if (!user) {
      return null;
    }

    const session: AuthSession = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    const token = randomUUID();
    this.sessions.set(token, session);

    return {
      token,
      user: session
    };
  }

  resolveSession(token: string | null): AuthResolutionResult {
    if (!token) {
      return {
        status: "missing"
      };
    }

    const session = this.sessions.get(token);
    if (!session) {
      return {
        status: "invalid"
      };
    }

    return {
      status: "valid",
      session
    };
  }
}

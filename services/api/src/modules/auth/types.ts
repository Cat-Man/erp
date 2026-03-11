export type UserRole = "admin" | "cashier";

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export type AuthResolutionResult =
  | {
      status: "missing";
    }
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      session: AuthSession;
    };

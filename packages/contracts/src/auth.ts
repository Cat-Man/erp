export type UserRole = "admin" | "cashier";

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthUserProfile {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUserProfile;
}

export type AuthTokenStatus = "missing" | "invalid" | "valid";

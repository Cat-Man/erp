import type { UserAccount } from "./types.js";

export const demoUsers: UserAccount[] = [
  {
    id: "u-admin",
    username: "admin",
    password: "admin-pass",
    displayName: "Retail Admin",
    role: "admin"
  },
  {
    id: "u-cashier",
    username: "cashier",
    password: "cashier-pass",
    displayName: "Store Cashier",
    role: "cashier"
  }
];

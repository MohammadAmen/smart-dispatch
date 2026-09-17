export const SESSION_COOKIE = "sd-session";

export const DEMO_PASSWORD = "Dispatch!23";

export const DEMO_ACCOUNTS = [
  { email: "dana@fleet.smart-dispatch.local", role: "DISPATCHER" },
  { email: "admin@fleet.smart-dispatch.local", role: "SUPER_ADMIN" },
  { email: "owner@fleet.smart-dispatch.local", role: "STORE_OWNER" },
] as const;

export const DEMO_EMAILS = new Set<string>(DEMO_ACCOUNTS.map((account) => account.email));

export type SessionRole =
  | "SUPER_ADMIN"
  | "STORE_OWNER"
  | "DRIVER"
  | "CUSTOMER"
  | "ADMIN"
  | "DISPATCHER";

export const SUPER_ADMIN_ROLES: SessionRole[] = ["SUPER_ADMIN", "ADMIN"];

export const DISPATCH_ROLES: SessionRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "DISPATCHER",
];

export const STAFF_ROLES: SessionRole[] = DISPATCH_ROLES;

export const VENDOR_ROLES: SessionRole[] = ["STORE_OWNER"];

export interface SessionPayload {
  sub: string;
  role: SessionRole;
  name: string;
  exp: number;
}

const SESSION_ROLES: readonly SessionRole[] = [
  "SUPER_ADMIN",
  "STORE_OWNER",
  "DRIVER",
  "CUSTOMER",
  "ADMIN",
  "DISPATCHER",
];

export function isSessionRole(value: string): value is SessionRole {
  return (SESSION_ROLES as readonly string[]).includes(value);
}

export function isSuperAdminRole(role: SessionRole): boolean {
  return SUPER_ADMIN_ROLES.includes(role);
}

export function isDispatchRole(role: SessionRole): boolean {
  return DISPATCH_ROLES.includes(role);
}

export function authSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    "smart-dispatch-dev-secret-change-me"
  );
}

export function homePathForRole(role: SessionRole, localePrefix = ""): string {
  const prefix = localePrefix ? `/${localePrefix}` : "";
  if (role === "DRIVER") {
    return `${prefix}/driver`;
  }

  if (role === "STORE_OWNER") {
    return `${prefix}/vendor/dashboard`;
  }

  if (role === "CUSTOMER") {
    return `${prefix}/menu`;
  }

  if (isSuperAdminRole(role)) {
    return `${prefix}/admin/stores`;
  }

  return `${prefix}/dashboard`;
}

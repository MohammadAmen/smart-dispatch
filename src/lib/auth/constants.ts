export const SESSION_COOKIE = "sd-session";

export const DEMO_PASSWORD = "Dispatch!23";

export type SessionRole = "ADMIN" | "DISPATCHER" | "DRIVER";

export const STAFF_ROLES: SessionRole[] = ["ADMIN", "DISPATCHER"];

export interface SessionPayload {
  sub: string;
  role: SessionRole;
  name: string;
  exp: number;
}

export function isSessionRole(value: string): value is SessionRole {
  return value === "ADMIN" || value === "DISPATCHER" || value === "DRIVER";
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

  return `${prefix}/dashboard`;
}

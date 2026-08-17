export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  return stripped.length === 0 ? "/" : stripped;
}

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false;
  }

  return !value.startsWith("/login");
}

export function isDispatchPath(pathname: string): boolean {
  return stripLocalePrefix(pathname) === "/dashboard";
}

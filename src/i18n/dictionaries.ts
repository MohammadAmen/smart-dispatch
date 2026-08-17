import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";
import type { Locale } from "@/lib/localized";

export type Messages = typeof ar;

export const dictionaries: Record<Locale, Messages> = {
  ar,
  en,
};

export function translate(
  messages: Messages,
  path: string,
  vars?: Record<string, string | number>,
): string {
  const raw = path.split(".").reduce<unknown>((current, key) => {
    if (typeof current === "object" && current !== null && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, messages);

  if (typeof raw !== "string") {
    return path;
  }

  if (!vars) {
    return raw;
  }

  return raw.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}

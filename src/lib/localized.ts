export type Locale = "ar" | "en";

export interface LocalizedText {
  ar: string;
  en: string;
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.ar === "string" && typeof record.en === "string";
}

export function pickLocalized(
  value: LocalizedText | string | null | undefined,
  locale: Locale,
): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value[locale] || value.ar;
}

export function localized(ar: string, en: string): LocalizedText {
  return { ar, en };
}

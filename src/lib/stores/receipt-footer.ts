export const DEFAULT_RECEIPT_FOOTER_NOTE = "شكراً لزيارتكم – بالهناء والشفاء";

export function resolveReceiptFooterNote(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || DEFAULT_RECEIPT_FOOTER_NOTE;
}

export function dineInReceiptTableLabel(tableLabel: string | null, fallback: string): string {
  const raw = (tableLabel || fallback || "").trim();
  if (!raw) {
    return "";
  }
  if (/طاولة|table/i.test(raw)) {
    return raw;
  }
  return `طاولة ${raw}`;
}

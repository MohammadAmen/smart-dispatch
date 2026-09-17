export const CUSTOM_ORDER_MIN_LEAD_MS = 2 * 60 * 60 * 1000;
export const CUSTOM_ORDER_VENDOR_ALERT_MS = 3 * 60 * 60 * 1000;
export const CUSTOM_ORDER_DISPATCH_LEAD_MS = 45 * 60 * 1000;

const CUSTOM_ICONS = new Set(["utensils", "cake", "flower"]);
const CUSTOM_NAME = /مطعم|كيك|حلويات|ورد|زهور|florist|restaurant|cake|flower|sweet|dessert|bakery/i;

export function storeAllowsCustomOrders(storeType: { icon: string; name: string }): boolean {
  return CUSTOM_ICONS.has(storeType.icon) || CUSTOM_NAME.test(storeType.name);
}

export function parseScheduledDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCountdown(ms: number, locale: string): string {
  const safe = Math.max(0, ms);
  const totalMinutes = Math.floor(safe / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (locale === "ar") {
    if (days > 0) {
      return `${days}ي ${hours}س`;
    }
    return `${hours}س ${minutes}د`;
  }
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function isVendorPrepAlert(scheduledDate: string | Date | null, now = Date.now()): boolean {
  if (!scheduledDate) {
    return false;
  }
  const at = scheduledDate instanceof Date ? scheduledDate.getTime() : new Date(scheduledDate).getTime();
  if (!Number.isFinite(at)) {
    return false;
  }
  const remaining = at - now;
  return remaining > 0 && remaining <= CUSTOM_ORDER_VENDOR_ALERT_MS;
}

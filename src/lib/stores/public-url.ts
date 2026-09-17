export function publicAppUrl(): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function publicMenuUrl(): string {
  return `${publicAppUrl()}/menu`;
}

export function storeMenuUrl(storeId: string): string {
  return `${publicAppUrl()}/menu/stores/${encodeURIComponent(storeId)}`;
}

export function customerMenuUrl(phone: string): string {
  const params = new URLSearchParams({ phone });
  return `${publicAppUrl()}/menu?${params.toString()}`;
}

export function dineInMenuUrl(storeId: string, token: string): string {
  const params = new URLSearchParams({ dineIn: "1", table: token });
  return `${publicAppUrl()}/menu/stores/${encodeURIComponent(storeId)}?${params.toString()}`;
}

export function customerOrderTrackingPath(token: string): string {
  return `/menu/orders?token=${encodeURIComponent(token)}`;
}

export function customerOrderTrackingUrl(token: string): string {
  return `${publicAppUrl()}${customerOrderTrackingPath(token)}`;
}

export function reportMenuSearch(input: {
  query: string;
  storeId?: string | null;
  city?: string | null;
  results: number;
}): void {
  if (typeof window === "undefined" || input.query.trim().length < 2) {
    return;
  }
  void fetch("/api/menu/search-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => undefined);
}

export function reportCartIntent(storeId: string, productId: string): void {
  if (typeof window === "undefined" || !storeId || !productId) {
    return;
  }
  void fetch("/api/menu/cart-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId, productId }),
    keepalive: true,
  }).catch(() => undefined);
}

export const MAX_PRODUCT_IMAGES = 4;

export function parseProductImages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      try {
        return parseProductImages(JSON.parse(value) as unknown);
      } catch {
        return [];
      }
    }
    return [];
  }

  return value.flatMap((entry) => (typeof entry === "string" && entry.trim() ? [entry.trim()] : []));
}

export function normalizeProductImages(
  imageUrl: string | null | undefined,
  images?: unknown,
): string[] {
  const primary = imageUrl?.trim() ?? "";
  const extras = parseProductImages(images);
  const unique = new Set<string>();
  if (primary) {
    unique.add(primary);
  }
  for (const url of extras) {
    unique.add(url);
    if (unique.size >= MAX_PRODUCT_IMAGES) {
      break;
    }
  }
  return [...unique].slice(0, MAX_PRODUCT_IMAGES);
}

export function productImages(product: {
  imageUrl?: string | null;
  images?: string[] | null;
}): string[] {
  return normalizeProductImages(product.imageUrl, product.images);
}

export function primaryProductImage(product: {
  imageUrl?: string | null;
  images?: string[] | null;
}): string | null {
  return productImages(product)[0] ?? null;
}

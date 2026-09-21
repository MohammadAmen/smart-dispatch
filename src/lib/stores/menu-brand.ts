const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OKLCH = /^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.%]+)?\s*\)$/i;

export function sanitizeCssColor(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  if (HEX.test(trimmed) || OKLCH.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function hexLuminance(hex: string): number | null {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : raw.slice(0, 6);
  if (full.length !== 6) {
    return null;
  }
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if (![r, g, b].every((channel) => Number.isFinite(channel))) {
    return null;
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function foregroundFor(color: string): string {
  const lum = hexLuminance(color);
  if (lum == null) {
    return "#1a1610";
  }
  return lum > 0.62 ? "#1a1610" : "#faf6ea";
}

export function menuBrandStyle(
  primaryColor: string | null | undefined,
  secondaryColor: string | null | undefined,
): string | null {
  const primary = sanitizeCssColor(primaryColor);
  const secondary = sanitizeCssColor(secondaryColor);
  if (!primary && !secondary) {
    return null;
  }

  const rules: string[] = [];
  if (primary) {
    const foreground = foregroundFor(primary);
    rules.push(
      `--brand:${primary}`,
      `--primary:${primary}`,
      `--ring:${primary}`,
      `--glow:${primary}`,
      `--chart-1:${primary}`,
      `--sidebar-primary:${primary}`,
      `--sidebar-ring:${primary}`,
      `--primary-foreground:${foreground}`,
    );
  }
  if (secondary) {
    rules.push(`--secondary:${secondary}`, `--accent:${secondary}`, `--info:${secondary}`);
  }

  return `.menu-brand-scope{${rules.join(";")}}`;
}

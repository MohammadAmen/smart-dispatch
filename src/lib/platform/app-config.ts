import "server-only";

import { prisma } from "@/lib/db";
import { ensureAppConfigSchema } from "@/lib/platform/app-config-schema";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
import type { AppConfigRecord } from "@/lib/platform/app-config-types";
import {
  DEFAULT_DELIVERY_TIERS,
  normalizeDeliveryTiers,
  type DeliveryTier,
} from "@/lib/platform/delivery-tiers";

export { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
export type { AppConfigRecord } from "@/lib/platform/app-config-types";

export const APP_CONFIG_ID = "default";

type AppConfigRow = {
  id: string;
  menuHeaderBackgroundUrl: string | null;
  deliveryTiersJson: string | null;
  updatedAt: Date;
};

let tiersCache: { at: number; tiers: DeliveryTier[] } | null = null;
const TIERS_CACHE_MS = 30_000;

function serialize(row: AppConfigRow): AppConfigRecord {
  return {
    id: row.id,
    menuHeaderBackgroundUrl: row.menuHeaderBackgroundUrl?.trim() || null,
    deliveryTiersJson: row.deliveryTiersJson,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseTiersJson(raw: string | null | undefined): DeliveryTier[] {
  if (!raw?.trim()) {
    return DEFAULT_DELIVERY_TIERS.map((tier) => ({ ...tier }));
  }
  try {
    return normalizeDeliveryTiers(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_DELIVERY_TIERS.map((tier) => ({ ...tier }));
  }
}

async function readRow(): Promise<AppConfigRow> {
  await ensureAppConfigSchema();
  const rows = await prisma.$queryRaw<AppConfigRow[]>`
    SELECT id, "menuHeaderBackgroundUrl", "deliveryTiersJson", "updatedAt"
    FROM app_config
    WHERE id = ${APP_CONFIG_ID}
    LIMIT 1
  `;
  if (rows[0]) {
    return rows[0];
  }
  await prisma.$executeRawUnsafe(`
    INSERT INTO app_config (id, "menuHeaderBackgroundUrl", "deliveryTiersJson", "updatedAt")
    VALUES ('default', NULL, NULL, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `);
  const created = await prisma.$queryRaw<AppConfigRow[]>`
    SELECT id, "menuHeaderBackgroundUrl", "deliveryTiersJson", "updatedAt"
    FROM app_config
    WHERE id = ${APP_CONFIG_ID}
    LIMIT 1
  `;
  return (
    created[0] ?? {
      id: APP_CONFIG_ID,
      menuHeaderBackgroundUrl: null,
      deliveryTiersJson: null,
      updatedAt: new Date(),
    }
  );
}

export async function getAppConfig(): Promise<AppConfigRecord> {
  return serialize(await readRow());
}

export async function getMenuHeaderBackgroundUrl(): Promise<string> {
  const config = await getAppConfig();
  return config.menuHeaderBackgroundUrl?.trim() || DEFAULT_MENU_HEADER_BACKGROUND;
}

export async function getDeliveryTiers(): Promise<DeliveryTier[]> {
  if (tiersCache && Date.now() - tiersCache.at < TIERS_CACHE_MS) {
    return tiersCache.tiers;
  }
  const config = await getAppConfig();
  const tiers = parseTiersJson(config.deliveryTiersJson);
  tiersCache = { at: Date.now(), tiers };
  return tiers;
}

export function clearDeliveryTiersCache(): void {
  tiersCache = null;
}

export async function updateAppConfig(input: {
  menuHeaderBackgroundUrl?: string | null;
  deliveryTiers?: DeliveryTier[] | null;
}): Promise<AppConfigRecord> {
  await ensureAppConfigSchema();
  const current = await readRow();

  const url =
    input.menuHeaderBackgroundUrl !== undefined
      ? typeof input.menuHeaderBackgroundUrl === "string"
        ? input.menuHeaderBackgroundUrl.trim() || null
        : null
      : current.menuHeaderBackgroundUrl;

  const tiersJson =
    input.deliveryTiers !== undefined
      ? input.deliveryTiers == null
        ? null
        : JSON.stringify(normalizeDeliveryTiers(input.deliveryTiers))
      : current.deliveryTiersJson;

  await prisma.$executeRaw`
    INSERT INTO app_config (id, "menuHeaderBackgroundUrl", "deliveryTiersJson", "updatedAt")
    VALUES (${APP_CONFIG_ID}, ${url}, ${tiersJson}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      "menuHeaderBackgroundUrl" = EXCLUDED."menuHeaderBackgroundUrl",
      "deliveryTiersJson" = EXCLUDED."deliveryTiersJson",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  clearDeliveryTiersCache();
  return getAppConfig();
}

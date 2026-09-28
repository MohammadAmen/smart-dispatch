import "server-only";

import { prisma } from "@/lib/db";
import { ensureAppConfigSchema } from "@/lib/platform/app-config-schema";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
import type { AppConfigRecord } from "@/lib/platform/app-config-types";

export { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
export type { AppConfigRecord } from "@/lib/platform/app-config-types";

export const APP_CONFIG_ID = "default";

type AppConfigRow = {
  id: string;
  menuHeaderBackgroundUrl: string | null;
  updatedAt: Date;
};

function serialize(row: AppConfigRow): AppConfigRecord {
  return {
    id: row.id,
    menuHeaderBackgroundUrl: row.menuHeaderBackgroundUrl?.trim() || null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readRow(): Promise<AppConfigRow> {
  await ensureAppConfigSchema();
  const rows = await prisma.$queryRaw<AppConfigRow[]>`
    SELECT id, "menuHeaderBackgroundUrl", "updatedAt"
    FROM app_config
    WHERE id = ${APP_CONFIG_ID}
    LIMIT 1
  `;
  if (rows[0]) {
    return rows[0];
  }
  await prisma.$executeRawUnsafe(`
    INSERT INTO app_config (id, "menuHeaderBackgroundUrl", "updatedAt")
    VALUES ('default', NULL, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `);
  const created = await prisma.$queryRaw<AppConfigRow[]>`
    SELECT id, "menuHeaderBackgroundUrl", "updatedAt"
    FROM app_config
    WHERE id = ${APP_CONFIG_ID}
    LIMIT 1
  `;
  return (
    created[0] ?? {
      id: APP_CONFIG_ID,
      menuHeaderBackgroundUrl: null,
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

export async function updateAppConfig(input: {
  menuHeaderBackgroundUrl?: string | null;
}): Promise<AppConfigRecord> {
  await ensureAppConfigSchema();
  const url =
    typeof input.menuHeaderBackgroundUrl === "string"
      ? input.menuHeaderBackgroundUrl.trim() || null
      : null;

  await prisma.$executeRaw`
    INSERT INTO app_config (id, "menuHeaderBackgroundUrl", "updatedAt")
    VALUES (${APP_CONFIG_ID}, ${url}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      "menuHeaderBackgroundUrl" = EXCLUDED."menuHeaderBackgroundUrl",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  return getAppConfig();
}

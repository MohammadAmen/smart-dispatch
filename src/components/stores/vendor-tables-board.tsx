"use client";

import { Download, Pencil, Plus, Printer, QrCode, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { storeUsesDineInTables } from "@/lib/stores/indoor-service";
import { deleteTableAction, saveTableAction } from "@/lib/stores/table-actions";
import type { StoreTableRecord } from "@/lib/stores/store-table-types";
import type { StoreRecord } from "@/lib/stores/types";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function tableMenuUrl(storeId: string, token: string): string {
  const origin = window.location.origin.replace(/\/$/, "");
  const params = new URLSearchParams({ dineIn: "1", table: token });
  return `${origin}/menu/stores/${encodeURIComponent(storeId)}?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function VendorTablesBoard({
  store,
  tables,
}: {
  store: StoreRecord | null;
  tables: StoreTableRecord[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StoreTableRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrById, setQrById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.tables")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const usesTables = storeUsesDineInTables(store.storeType);
  const title = t(usesTables ? "vendor.tables" : "vendor.storeQr");
  const description = t(usesTables ? "vendor.tablesDesc" : "vendor.storeQrDesc");
  const kind = usesTables ? "TABLE" : "STAND";

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, close = false): void => {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      if (close) {
        setEditing(null);
        setCreating(false);
      }
      router.refresh();
    });
  };

  const generateQr = async (table: StoreTableRecord): Promise<void> => {
    setBusyId(table.id);
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(tableMenuUrl(store.id, table.token), {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrById((current) => ({ ...current, [table.id]: dataUrl }));
    } finally {
      setBusyId(null);
    }
  };

  const downloadQr = (table: StoreTableRecord): void => {
    const href = qrById[table.id];
    if (!href) {
      return;
    }
    const link = document.createElement("a");
    link.href = href;
    link.download = `${store.slug}-${table.name}.png`;
    link.click();
  };

  const printQr = (table: StoreTableRecord): void => {
    const href = qrById[table.id];
    if (!href) {
      return;
    }
    const win = window.open("", "_blank", "width=480,height=720");
    if (!win) {
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(table.name)}</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;text-align:center;padding:36px;color:#0f172a}
        img{width:280px;height:280px}
        h1{font-size:24px;margin:12px 0 6px}
        p{color:#475569;font-size:13px;margin:4px 0}
      </style></head><body>
      <p>${escapeHtml(store.name)}</p>
      <h1>${escapeHtml(table.name)}</h1>
      <img src="${href}" alt="QR" />
      <p>${escapeHtml(t("vendor.scanHint"))}</p>
      </body></html>`);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);
  };

  const formTable = creating ? null : editing;

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button
            onPress={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <Plus className="size-4" />
            {t(usesTables ? "vendor.addTable" : "vendor.addStand")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {creating || editing ? (
        <GlassCard hover={false}>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              run(() => saveTableAction(formData), true);
            }}
          >
            <input type="hidden" name="storeId" value={store.id} />
            <input type="hidden" name="id" value={formTable?.id ?? ""} />
            <input type="hidden" name="kind" value={kind} />
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("vendor.tableName")}
              <input
                name="name"
                required
                defaultValue={formTable?.name ?? ""}
                className={fieldClass}
                placeholder={usesTables ? t("vendor.tableDefault") : t("vendor.standDefault")}
              />
            </label>
            {usesTables ? (
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("vendor.tableCapacity")}
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={formTable?.capacity ?? 4}
                  className={fieldClass}
                />
              </label>
            ) : (
              <input type="hidden" name="capacity" value="1" />
            )}
            <div className="flex items-end gap-2">
              <Button type="submit" isDisabled={pending}>
                {t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onPress={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </GlassCard>
      ) : null}

      {tables.length === 0 && !creating ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyTables")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tables.map((table) => {
            const qr = qrById[table.id];
            return (
              <GlassCard key={table.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold">{table.name}</p>
                    {usesTables ? (
                      <p className="text-xs text-muted-foreground">
                        {t("vendor.tableSeats", { count: table.capacity })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("vendor.storeQr")}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onPress={() => {
                        setEditing(table);
                        setCreating(false);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <form action={(formData) => run(() => deleteTableAction(formData))}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="id" value={table.id} />
                      <Button variant="destructive" size="icon-sm" type="submit" isDisabled={pending}>
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                </div>

                {qr ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="" className="size-28 rounded-xl border border-border/70 bg-white p-2" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("vendor.qrReady")}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onPress={() => downloadQr(table)}>
                          <Download className="size-3.5" />
                          {t("vendor.downloadQr")}
                        </Button>
                        <Button variant="outline" size="sm" onPress={() => printQr(table)}>
                          <Printer className="size-3.5" />
                          {t("vendor.printQr")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    isDisabled={busyId === table.id}
                    onPress={() => {
                      void generateQr(table);
                    }}
                  >
                    <QrCode className="size-4" />
                    {t("vendor.generateQr")}
                  </Button>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </FadeIn>
  );
}

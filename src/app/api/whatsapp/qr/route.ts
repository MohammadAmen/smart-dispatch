import { timingSafeEqual } from "node:crypto";

import QRCode from "qrcode";

import { STAFF_ROLES } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import {
  getWhatsAppRuntimeSnapshot,
  startWhatsAppBaileys,
  type WhatsAppLinkStatus,
  type WhatsAppRuntimeSnapshot,
} from "@/lib/whatsapp/baileys-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QR_IMAGE_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 2,
  width: 420,
  color: {
    dark: "#0f172a",
    light: "#ffffff",
  },
};

function noStoreHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
  };
}

function tokenAuthorized(request: Request): boolean {
  const expected = process.env.WHATSAPP_QR_TOKEN;
  if (!expected) {
    return false;
  }

  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token") ?? request.headers.get("x-whatsapp-qr-token");
  if (!provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function authorizeQrRequest(request: Request): Promise<boolean> {
  if (tokenAuthorized(request)) {
    return true;
  }

  const session = await readSession();
  return Boolean(session && STAFF_ROLES.includes(session.role));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusCopy(status: WhatsAppLinkStatus): { ar: string; en: string } {
  switch (status) {
    case "connected":
      return { ar: "متصل — لا حاجة لمسح رمز جديد", en: "Connected — no new QR scan needed" };
    case "waiting_qr":
      return {
        ar: "امسح الرمز من واتساب بزنس → الأجهزة المرتبطة",
        en: "Scan with WhatsApp Business → Linked devices",
      };
    case "reconnecting":
      return {
        ar: "جارٍ استعادة الجلسة المحفوظة…",
        en: "Restoring the saved session…",
      };
    case "disabled":
      return { ar: "خدمة واتساب معطّلة", en: "WhatsApp service is disabled" };
    default:
      return { ar: "جارٍ تجهيز الاتصال…", en: "Preparing the WhatsApp connection…" };
  }
}

async function qrPng(qr: string | null): Promise<Buffer | null> {
  if (!qr) {
    return null;
  }

  return QRCode.toBuffer(qr, { type: "png", ...QR_IMAGE_OPTIONS });
}

async function qrDataUrl(qr: string | null): Promise<string | null> {
  if (!qr) {
    return null;
  }

  return QRCode.toDataURL(qr, QR_IMAGE_OPTIONS);
}

function renderQrHtml(snapshot: WhatsAppRuntimeSnapshot, imageDataUrl: string | null): string {
  const copy = statusCopy(snapshot.status);
  const me = snapshot.me ? escapeHtml(snapshot.me) : "";
  const showQr = snapshot.status === "waiting_qr" && Boolean(imageDataUrl);
  const connected = snapshot.status === "connected";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="5" />
    <title>WhatsApp QR · Smart Dispatch</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111f;
        --card: rgba(15, 23, 42, 0.72);
        --line: rgba(148, 163, 184, 0.22);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #38bdf8;
        --ok: #34d399;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Tahoma, sans-serif;
        background:
          radial-gradient(1200px 500px at 10% -10%, rgba(56, 189, 248, 0.18), transparent 55%),
          radial-gradient(900px 400px at 100% 0%, rgba(52, 211, 153, 0.12), transparent 50%),
          var(--bg);
        color: var(--text);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(440px, 100%);
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 28px 24px 24px;
        backdrop-filter: blur(18px);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        text-align: center;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 0 0 8px;
      }
      h1 { margin: 0 0 8px; font-size: 1.45rem; }
      p { margin: 0; color: var(--muted); line-height: 1.6; }
      .qr {
        margin: 22px auto 8px;
        width: min(280px, 100%);
        aspect-ratio: 1;
        background: #fff;
        border-radius: 18px;
        padding: 12px;
        display: grid;
        place-items: center;
      }
      .qr img { width: 100%; height: auto; display: block; }
      .ok {
        margin: 22px auto 8px;
        width: 92px;
        height: 92px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: rgba(52, 211, 153, 0.12);
        color: var(--ok);
        font-size: 2.4rem;
      }
      .meta { margin-top: 18px; font-size: 0.85rem; word-break: break-all; }
      .pill {
        display: inline-block;
        margin-top: 16px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.75rem;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Smart Dispatch</p>
      <h1>ربط واتساب بزنس</h1>
      <p>${escapeHtml(copy.ar)}</p>
      <p>${escapeHtml(copy.en)}</p>
      ${
        showQr
          ? `<div class="qr"><img alt="WhatsApp QR" src="${imageDataUrl ?? ""}" /></div>`
          : connected
            ? `<div class="ok" aria-hidden="true">✓</div>`
            : `<div class="pill">${escapeHtml(snapshot.status)}</div>`
      }
      ${me ? `<p class="meta">${me}</p>` : ""}
      ${
        snapshot.hasSavedSession && snapshot.status !== "waiting_qr"
          ? `<p class="meta">الجلسة محفوظة في قاعدة البيانات — لن يُطلب QR بعد إعادة التشغيل.</p>`
          : ""
      }
    </main>
  </body>
</html>`;
}

function unauthorizedHtml(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Unauthorized · WhatsApp QR</title>
    <style>
      body { font-family: "Segoe UI", Tahoma, sans-serif; background: #07111f; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      a { color: #38bdf8; }
      .card { max-width: 420px; padding: 28px; border: 1px solid rgba(148,163,184,.25); border-radius: 20px; text-align: center; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>غير مصرح</h1>
      <p>سجّل الدخول كمشرف أو موزّع، أو أضف رمز WHATSAPP_QR_TOKEN.</p>
      <p><a href="/login">تسجيل الدخول</a></p>
    </main>
  </body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  if (!(await authorizeQrRequest(request))) {
    const format = new URL(request.url).searchParams.get("format");
    if (format === "json" || format === "png") {
      return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    return new Response(unauthorizedHtml(), {
      status: 401,
      headers: noStoreHeaders("text/html; charset=utf-8"),
    });
  }

  void startWhatsAppBaileys();
  const snapshot = getWhatsAppRuntimeSnapshot();
  const format = new URL(request.url).searchParams.get("format") ?? "html";

  if (format === "json") {
    return Response.json(
      {
        ok: true,
        ...snapshot,
        qr: Boolean(snapshot.qr),
      },
      { headers: noStoreHeaders("application/json; charset=utf-8") },
    );
  }

  if (format === "png") {
    const png = await qrPng(snapshot.qr);
    if (!png) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    return new Response(Uint8Array.from(png), { headers: noStoreHeaders("image/png") });
  }

  const imageDataUrl = await qrDataUrl(snapshot.qr);
  return new Response(renderQrHtml(snapshot, imageDataUrl), {
    headers: noStoreHeaders("text/html; charset=utf-8"),
  });
}

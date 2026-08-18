import "server-only";

import makeWASocket, {
  Browsers,
  DisconnectReason,
  extractMessageContent,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isJidStatusBroadcast,
  jidDecode,
  makeCacheableSignalKeyStore,
  type AuthenticationCreds,
  type WAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";

import { ingestWhatsAppMessage } from "@/lib/dispatch/ingest-whatsapp";
import {
  readWhatsAppPersistedIdentity,
  usePrismaAuthState,
  wipeWhatsAppAuthState,
} from "@/lib/whatsapp/prisma-auth-state";

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

const logger = pino({
  level: process.env.WHATSAPP_LOG_LEVEL ?? "warn",
  base: { service: "baileys" },
});

export type WhatsAppLinkStatus =
  | "disabled"
  | "starting"
  | "waiting_qr"
  | "connected"
  | "reconnecting";

export interface WhatsAppRuntimeSnapshot {
  status: WhatsAppLinkStatus;
  qr: string | null;
  qrIssuedAt: number | null;
  me: string | null;
  hasSavedSession: boolean;
  lastDisconnectAt: number | null;
}

type GlobalBaileys = typeof globalThis & {
  __smartDispatchBaileys?: Promise<void>;
  __smartDispatchBaileysRuntime?: WhatsAppRuntimeSnapshot;
};

function emptyRuntime(): WhatsAppRuntimeSnapshot {
  return {
    status: "starting",
    qr: null,
    qrIssuedAt: null,
    me: null,
    hasSavedSession: false,
    lastDisconnectAt: null,
  };
}

function runtime(): WhatsAppRuntimeSnapshot {
  const globalForBaileys = globalThis as GlobalBaileys;
  if (!globalForBaileys.__smartDispatchBaileysRuntime) {
    globalForBaileys.__smartDispatchBaileysRuntime = emptyRuntime();
  }

  return globalForBaileys.__smartDispatchBaileysRuntime;
}

function patchRuntime(update: Partial<WhatsAppRuntimeSnapshot>): void {
  Object.assign(runtime(), update);
}

export function getWhatsAppRuntimeSnapshot(): WhatsAppRuntimeSnapshot {
  if (isBaileysDisabled()) {
    return { ...emptyRuntime(), status: "disabled" };
  }

  return { ...runtime() };
}

function isBaileysDisabled(): boolean {
  return process.env.WHATSAPP_BAILEYS === "0" || process.env.WHATSAPP_BAILEYS === "false";
}

function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function identityFromCreds(creds: AuthenticationCreds): string | null {
  return creds.me?.id ?? creds.me?.lid ?? null;
}

async function persistCredentials(
  saveCreds: () => Promise<void>,
  creds: AuthenticationCreds,
): Promise<void> {
  await saveCreds();
  const me = identityFromCreds(creds);
  patchRuntime({
    hasSavedSession: Boolean(creds.registered || creds.me),
    me: me ?? runtime().me,
  });
}

function statusCodeFromError(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("output" in error)) {
    return undefined;
  }

  const output = (error as { output?: { statusCode?: number } }).output;
  return output?.statusCode;
}

function shouldIgnoreChat(jid: string | undefined): boolean {
  if (!jid) {
    return true;
  }

  return Boolean(
    isJidGroup(jid) ||
      isJidBroadcast(jid) ||
      isJidStatusBroadcast(jid) ||
      isJidNewsletter(jid),
  );
}

function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid || shouldIgnoreChat(jid)) {
    return null;
  }

  const decoded = jidDecode(jid);
  if (!decoded?.user) {
    return null;
  }

  if (decoded.server === "lid" || decoded.server === "hosted.lid") {
    return null;
  }

  return /^\d{8,15}$/.test(decoded.user) ? decoded.user : null;
}

function customerPhone(message: WAMessage): string | null {
  const candidates = [
    message.key.remoteJidAlt,
    message.key.participantAlt,
    message.key.remoteJid,
    message.key.participant,
  ];

  for (const jid of candidates) {
    const phone = phoneFromJid(jid);
    if (phone) {
      return phone;
    }
  }

  return null;
}

function extractInboundText(message: WAMessage): string | null {
  const content = extractMessageContent(message.message);
  if (!content) {
    return null;
  }

  const candidates = [
    content.conversation,
    content.extendedTextMessage?.text,
    content.imageMessage?.caption,
    content.videoMessage?.caption,
    content.documentMessage?.caption,
    content.buttonsResponseMessage?.selectedDisplayText,
    content.listResponseMessage?.title,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function printQr(qr: string): void {
  patchRuntime({
    status: "waiting_qr",
    qr,
    qrIssuedAt: Date.now(),
  });
  console.log("\nWhatsApp Business: scan this QR from Linked devices / الأجهزة المرتبطة");
  console.log("Browser: /api/whatsapp/qr\n");
  qrcodeTerminal.generate(qr, { small: true });
}

async function handleInboundMessage(message: WAMessage): Promise<void> {
  if (message.key.fromMe) {
    return;
  }

  if (shouldIgnoreChat(message.key.remoteJid ?? undefined)) {
    return;
  }

  const text = extractInboundText(message);
  if (!text) {
    return;
  }

  const from = customerPhone(message);
  if (!from) {
    logger.warn({ remoteJid: message.key.remoteJid }, "Inbound WhatsApp text without a phone JID");
    return;
  }

  const messageId = message.key.id;
  if (!messageId) {
    return;
  }

  try {
    const order = await ingestWhatsAppMessage({ messageId, from, text });
    if (order) {
      logger.warn({ messageId, orderNumber: order.id }, "Ingested WhatsApp order");
    }
  } catch (error) {
    logger.error({ err: error, messageId, from }, "Failed to ingest WhatsApp message");
  }
}

async function runSocketSession(): Promise<{
  reconnect: boolean;
  delayMs: number;
  wipeAuth: boolean;
}> {
  const persisted = await readWhatsAppPersistedIdentity();
  patchRuntime({
    status: persisted.hasSavedSession ? "reconnecting" : "starting",
    qr: null,
    me: persisted.me ?? runtime().me,
    hasSavedSession: persisted.hasSavedSession,
  });

  const { state, saveCreds } = await usePrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: { reconnect: boolean; delayMs: number; wipeAuth: boolean }): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const persist = (): void => {
      void persistCredentials(saveCreds, state.creds).catch((error: unknown) => {
        logger.error({ err: error }, "Failed to persist WhatsApp credentials");
      });
    };

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      emitOwnEvents: false,
      shouldIgnoreJid: shouldIgnoreChat,
    });

    sock.ev.on("creds.update", persist);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        printQr(qr);
      }

      if (connection === "open") {
        const me = sock.user?.id ?? sock.user?.lid ?? identityFromCreds(state.creds) ?? "unknown";
        persist();
        patchRuntime({
          status: "connected",
          qr: null,
          qrIssuedAt: null,
          me,
          hasSavedSession: true,
        });
        logger.warn({ me }, "WhatsApp Baileys connected");
        console.log(`WhatsApp Baileys connected as ${me}`);
      }

      if (connection === "close") {
        const statusCode = statusCodeFromError(lastDisconnect?.error);
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const badSession = statusCode === DisconnectReason.badSession;
        const restartRequired = statusCode === DisconnectReason.restartRequired;
        const replaced = statusCode === DisconnectReason.connectionReplaced;

        logger.warn(
          { statusCode, loggedOut, badSession, restartRequired, replaced },
          "WhatsApp connection closed",
        );

        patchRuntime({
          status: "reconnecting",
          qr: loggedOut || badSession ? null : runtime().qr,
          lastDisconnectAt: Date.now(),
        });

        if (loggedOut || badSession) {
          finish({ reconnect: true, delayMs: 1_000, wipeAuth: true });
          return;
        }

        if (replaced) {
          finish({ reconnect: true, delayMs: 15_000, wipeAuth: false });
          return;
        }

        finish({
          reconnect: true,
          delayMs: restartRequired ? 500 : RECONNECT_BASE_MS,
          wipeAuth: false,
        });
      }
    });

    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify") {
        return;
      }

      for (const message of messages) {
        void handleInboundMessage(message);
      }
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function connectLoop(): Promise<void> {
  let backoffMs = RECONNECT_BASE_MS;

  for (;;) {
    try {
      const result = await runSocketSession();
      if (!result.reconnect) {
        return;
      }

      if (result.wipeAuth) {
        logger.warn("Clearing WhatsApp auth state in the database; a new QR will be printed");
        await wipeWhatsAppAuthState();
        patchRuntime({
          status: "starting",
          qr: null,
          qrIssuedAt: null,
          me: null,
          hasSavedSession: false,
        });
        backoffMs = RECONNECT_BASE_MS;
        await sleep(1_000);
        continue;
      }

      const delayMs =
        result.delayMs <= RECONNECT_BASE_MS ? result.delayMs : Math.max(result.delayMs, backoffMs);
      logger.warn({ delayMs }, "Reconnecting WhatsApp Baileys");
      await sleep(delayMs);
      backoffMs =
        result.delayMs <= 500 ? RECONNECT_BASE_MS : Math.min(backoffMs * 2, RECONNECT_MAX_MS);
    } catch (error) {
      logger.error({ err: error }, "WhatsApp Baileys session crashed");
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, RECONNECT_MAX_MS);
    }
  }
}

export function startWhatsAppBaileys(): Promise<void> {
  if (isProductionBuild() || isBaileysDisabled()) {
    if (isBaileysDisabled()) {
      patchRuntime({ status: "disabled", qr: null });
    }
    return Promise.resolve();
  }

  const globalForBaileys = globalThis as GlobalBaileys;
  if (!globalForBaileys.__smartDispatchBaileys) {
    patchRuntime({ status: "starting" });
    globalForBaileys.__smartDispatchBaileys = connectLoop().catch((error: unknown) => {
      globalForBaileys.__smartDispatchBaileys = undefined;
      logger.error({ err: error }, "WhatsApp Baileys loop stopped");
    });
  }

  return globalForBaileys.__smartDispatchBaileys;
}

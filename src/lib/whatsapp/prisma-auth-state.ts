import "server-only";

import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_SESSION_KEY = "default";

type KeyMap = Record<string, unknown>;

class WriteMutex {
  private tail: Promise<void> = Promise.resolve();

  runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

function sessionKey(): string {
  const configured = process.env.WHATSAPP_SESSION_ID?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_SESSION_KEY;
}

function keySlot(type: string, id: string): string {
  return `${type}::${id}`;
}

function toJsonValue(data: unknown): Prisma.InputJsonValue {
  const serialized: unknown = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
  if (serialized === null || typeof serialized !== "object") {
    throw new Error("WhatsApp session payload must be a JSON object.");
  }

  return serialized as Prisma.InputJsonValue;
}

function fromJsonValue(data: Prisma.JsonValue | null): unknown {
  if (data == null) {
    return null;
  }

  return JSON.parse(JSON.stringify(data), BufferJSON.reviver);
}

function asKeyMap(value: Prisma.JsonValue | null | undefined): KeyMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const revived = fromJsonValue(value);
  if (!revived || typeof revived !== "object" || Array.isArray(revived)) {
    return {};
  }

  return revived as KeyMap;
}

function reviveCreds(value: Prisma.JsonValue | null): AuthenticationCreds | null {
  const revived = fromJsonValue(value);
  if (!revived || typeof revived !== "object" || Array.isArray(revived)) {
    return null;
  }

  return revived as AuthenticationCreds;
}

function sessionLoadError(error: unknown): Error {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
  if (code === "P2021") {
    return new Error(
      "WhatsappSession table is missing. Run `npx prisma db push` then restart the server.",
    );
  }

  return error instanceof Error
    ? error
    : new Error("Failed to load WhatsApp session from the database.");
}

function identityFromCreds(creds: AuthenticationCreds): string | null {
  return creds.me?.id ?? creds.me?.lid ?? null;
}

function reviveAppStateSyncKey(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  return proto.Message.AppStateSyncKeyData.fromObject(value);
}

export interface WhatsAppPersistedIdentity {
  me: string | null;
  hasSavedSession: boolean;
}

export async function readWhatsAppPersistedIdentity(): Promise<WhatsAppPersistedIdentity> {
  try {
    const row = await prisma.whatsappSession.findUnique({
      where: { sessionKey: sessionKey() },
      select: { me: true, registered: true, creds: true },
    });

    if (!row) {
      return { me: null, hasSavedSession: false };
    }

    const creds = reviveCreds(row.creds);
    const me = row.me ?? creds?.me?.id ?? creds?.me?.lid ?? null;
    const hasSavedSession = Boolean(row.registered || me || creds?.registered || creds?.me);

    return { me, hasSavedSession };
  } catch (error) {
    throw sessionLoadError(error);
  }
}

export async function wipeWhatsAppAuthState(): Promise<void> {
  await prisma.whatsappSession.deleteMany({
    where: { sessionKey: sessionKey() },
  });
}

export async function usePrismaAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const key = sessionKey();
  const mutex = new WriteMutex();

  let existing: {
    creds: Prisma.JsonValue;
    keys: Prisma.JsonValue;
  } | null;

  try {
    existing = await prisma.whatsappSession.findUnique({
      where: { sessionKey: key },
    });
  } catch (error) {
    throw sessionLoadError(error);
  }

  const creds = reviveCreds(existing?.creds ?? null) ?? initAuthCreds();
  const keys: KeyMap = asKeyMap(existing?.keys ?? null);

  async function persist(): Promise<void> {
    const me = identityFromCreds(creds);
    const registered = Boolean(creds.registered || creds.me);

    await prisma.whatsappSession.upsert({
      where: { sessionKey: key },
      create: {
        sessionKey: key,
        creds: toJsonValue(creds),
        keys: toJsonValue(keys),
        me,
        registered,
      },
      update: {
        creds: toJsonValue(creds),
        keys: toJsonValue(keys),
        me,
        registered,
      },
    });
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};

          for (const id of ids) {
            const value = keys[keySlot(type, id)];
            if (typeof value === "undefined") {
              continue;
            }

            data[id] = (
              type === "app-state-sync-key" ? reviveAppStateSyncKey(value) : value
            ) as SignalDataTypeMap[typeof type];
          }

          return data;
        },
        set: async (data: SignalDataSet) => {
          await mutex.runExclusive(async () => {
            for (const type in data) {
              const entries = data[type as keyof SignalDataSet];
              if (!entries) {
                continue;
              }

              for (const id of Object.keys(entries)) {
                const value = entries[id];
                const slot = keySlot(type, id);
                if (value) {
                  keys[slot] = value;
                } else {
                  delete keys[slot];
                }
              }
            }

            await persist();
          });
        },
        clear: async () => {
          await mutex.runExclusive(async () => {
            for (const slot of Object.keys(keys)) {
              delete keys[slot];
            }
            await persist();
          });
        },
      },
    },
    saveCreds: async () => {
      await mutex.runExclusive(persist);
    },
  };
}

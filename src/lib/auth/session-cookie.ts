import type { SessionPayload } from "@/lib/auth/constants";
import { authSecret, isSessionRole } from "@/lib/auth/constants";

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(`${padded}${pad}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function encodeSession(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(body)));
  const key = await hmacKey(authSecret());
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));
  return `${encoded}.${bytesToBase64Url(signature)}`;
}

export async function decodeSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const key = await hmacKey(authSecret());
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature) as BufferSource,
    encoder.encode(encoded),
  );

  if (!valid) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed = JSON.parse(json) as Partial<SessionPayload>;
    if (
      typeof parsed.sub !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.role !== "string" ||
      !isSessionRole(parsed.role)
    ) {
      return null;
    }

    if (parsed.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      sub: parsed.sub,
      name: parsed.name,
      role: parsed.role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

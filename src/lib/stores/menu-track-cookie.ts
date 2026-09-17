import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { authSecret } from "@/lib/auth/constants";
import { uniqueTrackingTokens } from "@/lib/stores/tracking-token";

export const MENU_TRACK_COOKIE = "sd-menu-track";
const MAX_TOKENS = 40;
const TTL_SECONDS = 60 * 60 * 24 * 90;

interface TrackCookiePayload {
  tokens: string[];
  exp: number;
}

function sign(encoded: string): string {
  return createHmac("sha256", authSecret()).update(encoded).digest("base64url");
}

function encodeTrackCookie(tokens: string[]): string {
  const payload: TrackCookiePayload = {
    tokens: uniqueTrackingTokens(tokens).slice(0, MAX_TOKENS),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeTrackCookie(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return [];
  }

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return [];
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<TrackCookiePayload>;
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 < Date.now() || !Array.isArray(parsed.tokens)) {
      return [];
    }
    return uniqueTrackingTokens(parsed.tokens).slice(0, MAX_TOKENS);
  } catch {
    return [];
  }
}

function cookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  };
}

export async function readMenuTrackTokens(): Promise<string[]> {
  const store = await cookies();
  return decodeTrackCookie(store.get(MENU_TRACK_COOKIE)?.value);
}

export async function persistMenuTrackTokens(tokens: string[]): Promise<string[]> {
  const next = uniqueTrackingTokens(tokens).slice(0, MAX_TOKENS);
  const store = await cookies();
  store.set(MENU_TRACK_COOKIE, encodeTrackCookie(next), cookieOptions());
  return next;
}

export async function appendMenuTrackToken(token: string): Promise<string[]> {
  const current = await readMenuTrackTokens();
  return persistMenuTrackTokens([token, ...current]);
}

export async function mergeMenuTrackTokens(tokens: string[]): Promise<string[]> {
  const current = await readMenuTrackTokens();
  return persistMenuTrackTokens([...tokens, ...current]);
}

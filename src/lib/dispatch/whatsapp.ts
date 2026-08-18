import {
  isValidLatitude,
  isValidLongitude,
} from "@/lib/geo";

export type WhatsAppInboundType = "text" | "location" | "voice" | "unknown";

export interface ParsedWhatsAppMessage {
  messageId: string;
  from: string;
  type: WhatsAppInboundType;
  text: string | null;
  transcript: string | null;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
}

const COORD_PATTERN =
  /(-?\d{1,2}\.\d{2,})\s*[,;\s]\s*(-?\d{1,3}\.\d{2,})/;
const NAMED_COORD_PATTERN =
  /lat(?:itude)?\s*[:=]\s*(-?\d+\.?\d*)[^\d-]+lon(?:g(?:itude)?)?\s*[:=]\s*(-?\d+\.?\d*)/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizePhone(from: string): string {
  const compact = from.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    return compact;
  }

  return `+${compact}`;
}

function parseCoordinatesFromText(
  text: string,
): { latitude: number; longitude: number } | null {
  const named = text.match(NAMED_COORD_PATTERN);
  const pair = named ?? text.match(COORD_PATTERN);
  if (!pair) {
    return null;
  }

  const latitude = Number.parseFloat(pair[1]);
  const longitude = Number.parseFloat(pair[2]);
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function readTranscript(message: Record<string, unknown>): string | null {
  const direct = asString(message.transcription) ?? asString(message.transcript);
  if (direct) {
    return direct;
  }

  for (const key of ["audio", "voice"]) {
    const nested = asRecord(message[key]);
    if (!nested) {
      continue;
    }

    const transcript =
      asString(nested.transcript) ??
      asString(nested.transcription) ??
      asString(nested.caption);
    if (transcript) {
      return transcript;
    }
  }

  return null;
}

function readLocation(
  message: Record<string, unknown>,
): { latitude: number; longitude: number; address: string | null } | null {
  const location = asRecord(message.location);
  if (!location) {
    return null;
  }

  const latitude = asNumber(location.latitude);
  const longitude = asNumber(location.longitude);
  if (latitude == null || longitude == null) {
    return null;
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  const address =
    asString(location.address) ??
    asString(location.name) ??
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return { latitude, longitude, address };
}

export function parseWhatsAppMessages(payload: unknown): ParsedWhatsAppMessage[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const entries = Array.isArray(root.entry) ? root.entry : [];
  const parsed: ParsedWhatsAppMessage[] = [];

  for (const entry of entries) {
    const entryRecord = asRecord(entry);
    const changes = Array.isArray(entryRecord?.changes) ? entryRecord.changes : [];

    for (const change of changes) {
      const changeRecord = asRecord(change);
      const value = asRecord(changeRecord?.value);
      const messages = Array.isArray(value?.messages) ? value.messages : [];

      for (const rawMessage of messages) {
        const message = asRecord(rawMessage);
        if (!message) {
          continue;
        }

        const messageId = asString(message.id);
        const from = asString(message.from);
        if (!messageId || !from) {
          continue;
        }

        const typeRaw = asString(message.type) ?? "unknown";
        const text = asString(asRecord(message.text)?.body);
        const transcript = readTranscript(message);
        const location = readLocation(message);
        const coordsFromText = text ? parseCoordinatesFromText(text) : null;
        const coordsFromTranscript = transcript
          ? parseCoordinatesFromText(transcript)
          : null;

        const latitude =
          location?.latitude ??
          coordsFromText?.latitude ??
          coordsFromTranscript?.latitude ??
          null;
        const longitude =
          location?.longitude ??
          coordsFromText?.longitude ??
          coordsFromTranscript?.longitude ??
          null;

        const type: WhatsAppInboundType =
          location || typeRaw === "location"
            ? "location"
            : typeRaw === "audio" || typeRaw === "voice" || transcript
              ? "voice"
              : text
                ? "text"
                : "unknown";

        const addressText =
          location?.address ??
          text ??
          transcript ??
          (type === "voice" ? "Voice message / رسالة صوتية" : "");

        if (!addressText && latitude == null) {
          continue;
        }

        parsed.push({
          messageId,
          from: normalizePhone(from),
          type,
          text,
          transcript,
          addressText: addressText || `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`,
          latitude,
          longitude,
        });
      }
    }
  }

  return parsed;
}

export function parseInboundTextMessage(input: {
  messageId: string;
  from: string;
  text: string;
  latitude?: number | null;
  longitude?: number | null;
}): ParsedWhatsAppMessage {
  const coordsFromText = parseCoordinatesFromText(input.text);
  const latitude = input.latitude ?? coordsFromText?.latitude ?? null;
  const longitude = input.longitude ?? coordsFromText?.longitude ?? null;

  return {
    messageId: input.messageId,
    from: normalizePhone(input.from),
    type: latitude != null && longitude != null ? "location" : "text",
    text: input.text,
    transcript: null,
    addressText: input.text,
    latitude,
    longitude,
  };
}

export function verifyWhatsAppToken(token: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  return Boolean(expected && token && token === expected);
}

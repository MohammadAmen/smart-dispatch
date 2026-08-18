import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { getDepotPoint } from "@/lib/dispatch/depot";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { orderWithDriver, toLiveOrder } from "@/lib/dispatch/order-mapper";
import {
  parseInboundTextMessage,
  type ParsedWhatsAppMessage,
} from "@/lib/dispatch/whatsapp";
import type { LiveOrder } from "@/lib/live-map";

const globalForWhatsApp = globalThis as typeof globalThis & {
  __processedWhatsAppIds?: Set<string>;
};

function processedIds(): Set<string> {
  if (!globalForWhatsApp.__processedWhatsAppIds) {
    globalForWhatsApp.__processedWhatsAppIds = new Set<string>();
  }

  return globalForWhatsApp.__processedWhatsAppIds;
}

function nextOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const salt = Math.floor(Math.random() * 36 ** 3)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `SD-${stamp}-${salt}`;
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = signatureHeader.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

async function alreadyIngested(messageId: string): Promise<boolean> {
  if (processedIds().has(messageId)) {
    return true;
  }

  try {
    const existing = await prisma.auditLog.findFirst({
      where: {
        action: "ORDER_CREATED",
        details: {
          path: ["whatsappMessageId"],
          equals: messageId,
        },
      },
      select: { id: true },
    });

    return Boolean(existing);
  } catch {
    return false;
  }
}

export async function createOrderFromWhatsApp(
  message: ParsedWhatsAppMessage,
): Promise<LiveOrder | null> {
  if (await alreadyIngested(message.messageId)) {
    return null;
  }

  const depot = getDepotPoint();
  const deliveryLat = message.latitude ?? depot[0];
  const deliveryLng = message.longitude ?? depot[1];

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber(),
        status: "PENDING",
        customerPhone: message.from,
        addressText: message.addressText,
        pickupLat: depot[0],
        pickupLng: depot[1],
        deliveryLat,
        deliveryLng,
        auditLogs: {
          create: {
            action: "ORDER_CREATED",
            details: {
              source: "whatsapp",
              whatsappMessageId: message.messageId,
              messageType: message.type,
              transcript: message.transcript,
              text: message.text,
            },
          },
        },
      },
      include: orderWithDriver,
    });

    processedIds().add(message.messageId);
    publishDispatchEvent({
      type: "order.created",
      orderId: order.id,
      orderNumber: order.orderNumber,
      source: "whatsapp",
    });

    return toLiveOrder(order);
  } catch {
    return null;
  }
}

export async function ingestWhatsAppMessage(input: {
  messageId: string;
  from: string;
  text: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<LiveOrder | null> {
  return createOrderFromWhatsApp(parseInboundTextMessage(input));
}

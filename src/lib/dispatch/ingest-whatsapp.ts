import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { getDepotPoint } from "@/lib/dispatch/depot";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { queueAutoAssign } from "@/lib/dispatch/queue-auto-assign";
import { nextOrderNumber } from "@/lib/dispatch/order-number";
import { orderWithDriver, toLiveOrder } from "@/lib/dispatch/order-mapper";
import {
  parseInboundTextMessage,
  type ParsedWhatsAppMessage,
} from "@/lib/dispatch/whatsapp";
import { persistOrderTrackingToken, createTrackingToken } from "@/lib/stores/order-token";
import type { LiveOrder } from "@/lib/live-map";

export interface WhatsAppIngestResult {
  live: LiveOrder;
  trackingToken: string;
}

const globalForWhatsApp = globalThis as typeof globalThis & {
  __processedWhatsAppIds?: Set<string>;
};

function processedIds(): Set<string> {
  if (!globalForWhatsApp.__processedWhatsAppIds) {
    globalForWhatsApp.__processedWhatsAppIds = new Set<string>();
  }

  return globalForWhatsApp.__processedWhatsAppIds;
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
): Promise<WhatsAppIngestResult | null> {
  if (await alreadyIngested(message.messageId)) {
    return null;
  }

  const depot = getDepotPoint();
  const deliveryLat = message.latitude ?? depot[0];
  const deliveryLng = message.longitude ?? depot[1];
  const trackingToken = createTrackingToken();

  try {
    const baseData = {
      orderNumber: nextOrderNumber(),
      status: "PENDING" as const,
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
    };

    let order;
    try {
      order = await prisma.order.create({
        data: { ...baseData, trackingToken },
        include: orderWithDriver,
      });
    } catch {
      order = await prisma.order.create({
        data: baseData,
        include: orderWithDriver,
      });
    }

    await persistOrderTrackingToken(order.id, trackingToken);

    processedIds().add(message.messageId);
    publishDispatchEvent({
      type: "order.created",
      orderId: order.id,
      orderNumber: order.orderNumber,
      source: "whatsapp",
    });
    queueAutoAssign(order.id);

    return { live: toLiveOrder(order), trackingToken };
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
}): Promise<WhatsAppIngestResult | null> {
  return createOrderFromWhatsApp(parseInboundTextMessage(input));
}

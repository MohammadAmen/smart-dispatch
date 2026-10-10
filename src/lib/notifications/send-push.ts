import "server-only";

import { prisma } from "@/lib/db";
import {
  channelIdForAudience,
  DRIVER_SOUND,
  type PushAudience,
} from "@/lib/notifications/channels";

export interface PushMessage {
  title: string;
  body: string;
  audience: PushAudience;
  data?: Record<string, string>;
  /** Driver offers are data-only so the app can raise a call-style alert while backgrounded. */
  dataOnly?: boolean;
}

export interface PushSendResult {
  sent: boolean;
  reason?: "no-token" | "not-configured" | "send-failed";
}

function firebaseConfig(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  return { projectId, clientEmail, privateKey };
}

export async function sendPushToUser(userId: string, message: PushMessage): Promise<PushSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });
  const token = user?.fcmToken?.trim();
  if (!token) {
    return { sent: false, reason: "no-token" };
  }

  const config = firebaseConfig();
  if (!config) {
    return { sent: false, reason: "not-configured" };
  }

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(config),
    });
  }

  const channelId = channelIdForAudience(message.audience);
  const data: Record<string, string> = {
    ...(message.data ?? {}),
    title: message.title,
    body: message.body,
    channelId,
  };
  const driverOffer = message.audience === "driver" && message.dataOnly === true;
  try {
    await getMessaging().send({
      token,
      ...(driverOffer
        ? {}
        : {
            notification: {
              title: message.title,
              body: message.body,
            },
          }),
      data,
      android: {
        priority: message.audience === "driver" ? "high" : "normal",
        ...(driverOffer
          ? { ttl: 90_000, collapseKey: "beev-driver-offer" }
          : {
              notification: {
                channelId,
                sound: message.audience === "driver" ? DRIVER_SOUND : "default",
                priority: message.audience === "driver" ? ("max" as const) : ("default" as const),
                visibility: "public" as const,
              },
            }),
      },
    });
    return { sent: true };
  } catch (error) {
    console.error("push send failed", error);
    return { sent: false, reason: "send-failed" };
  }
}

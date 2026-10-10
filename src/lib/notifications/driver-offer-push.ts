import "server-only";

import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/notifications/send-push";
import { publicAppUrl } from "@/lib/stores/public-url";

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function pushDriverOffer(driverId: string): Promise<void> {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        userId: true,
        user: { select: { language: true } },
      },
    });
    if (!driver) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        driverId,
        status: "ASSIGNED",
        driverAcceptedAt: null,
        offeredAt: { not: null },
        bundleRole: { not: "CHILD" },
      },
      orderBy: { offeredAt: "desc" },
      select: { id: true, orderNumber: true, addressText: true },
    });
    if (!order) {
      return;
    }

    const english = driver.user.language === "en";
    const path = english ? "/en/driver" : "/ar/driver";
    const title = english
      ? `New delivery ${order.orderNumber}`
      : `طلب جديد ${order.orderNumber}`;
    const body = clip(order.addressText, 140) || (english ? "New delivery job" : "طلب توصيل جديد");

    await sendPushToUser(driver.userId, {
      title,
      body,
      audience: "driver",
      dataOnly: true,
      data: {
        kind: "driver-offer",
        orderId: order.id,
        orderNumber: order.orderNumber,
        path,
        origin: publicAppUrl(),
      },
    });
  } catch (error) {
    console.error("driver offer push failed", error);
  }
}

import "server-only";

import { prisma } from "@/lib/db";
import { getDepotPoint } from "@/lib/dispatch/depot";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { nextOrderNumber } from "@/lib/dispatch/order-number";
import { normalizePhone } from "@/lib/dispatch/whatsapp";
import { planPickupRoute } from "@/lib/stores/delivery-fee";
import { CUSTOM_ORDER_MIN_LEAD_MS, parseScheduledDate, storeAllowsCustomOrders } from "@/lib/stores/custom-order";
import { ensureCustomOrderSchema } from "@/lib/stores/custom-order-schema";
import { findOrCreateCustomer } from "@/lib/stores/menu";
import { notifyCustomerOrderUpdate } from "@/lib/stores/order-notify";
import { persistOrderTrackingToken, createTrackingToken } from "@/lib/stores/order-token";

export async function placeSpecialCustomOrder(input: {
  storeId: string;
  phone: string;
  addressText: string;
  customNotes: string;
  scheduledDate: string;
  customImage?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<{ orderNumber: string; trackingToken: string }> {
  await ensureCustomOrderSchema();
  const phone = normalizePhone(input.phone);
  const addressText = input.addressText.trim();
  const customNotes = input.customNotes.trim();
  const scheduledDate = parseScheduledDate(input.scheduledDate);

  if (!phone || !addressText) {
    throw new Error("Phone and delivery address are required.");
  }
  if (customNotes.length < 8) {
    throw new Error("Please describe the custom order in more detail.");
  }
  if (!scheduledDate) {
    throw new Error("A delivery date and time are required.");
  }
  if (scheduledDate.getTime() < Date.now() + CUSTOM_ORDER_MIN_LEAD_MS) {
    throw new Error("Scheduled delivery must be at least 2 hours from now.");
  }

  const store = await prisma.store.findFirst({
    where: { id: input.storeId, active: true },
    include: { storeType: { select: { name: true, icon: true } } },
  });
  if (!store) {
    throw new Error("Store is not available.");
  }
  if (!storeAllowsCustomOrders({ icon: store.storeType?.icon ?? "store", name: store.storeType?.name ?? "" })) {
    throw new Error("This store does not accept custom orders.");
  }

  const customer = await findOrCreateCustomer(phone);
  const depot = getDepotPoint();
  const deliveryLat =
    input.latitude != null && Number.isFinite(input.latitude) ? input.latitude : depot[0];
  const deliveryLng =
    input.longitude != null && Number.isFinite(input.longitude) ? input.longitude : depot[1];
  const quote = planPickupRoute(
    [{ id: store.id, name: store.name, latitude: store.latitude, longitude: store.longitude }],
    { latitude: deliveryLat, longitude: deliveryLng },
  );
  const trackingToken = createTrackingToken();
  const orderNumber = nextOrderNumber();

  const created = await prisma.order.create({
    data: {
      orderNumber,
      status: "PENDING_QUOTE",
      orderType: "SPECIAL_CUSTOM",
      customerPhone: customer.phone,
      customerId: customer.id,
      storeId: store.id,
      source: "menu-custom",
      addressText,
      pickupLat: store.latitude ?? depot[0],
      pickupLng: store.longitude ?? depot[1],
      deliveryLat,
      deliveryLng,
      deliveryFee: quote.fee,
      customImage: input.customImage?.trim() || null,
      customNotes,
      scheduledDate,
      trackingToken,
      codAmount: quote.fee,
      auditLogs: {
        create: {
          action: "CUSTOM_ORDER_CREATED",
          details: {
            storeId: store.id,
            storeName: store.name,
            scheduledDate: scheduledDate.toISOString(),
          },
        },
      },
    },
    select: { id: true, orderNumber: true },
  });

  await persistOrderTrackingToken(created.id, trackingToken);
  publishDispatchEvent({ type: "orders.changed" });
  void notifyCustomerOrderUpdate({
    phone: customer.phone,
    orderNumber: created.orderNumber,
    trackingToken,
    kind: "custom_placed",
  }).catch(() => undefined);

  return { orderNumber: created.orderNumber, trackingToken };
}

export async function quoteCustomOrder(
  storeId: string,
  orderId: string,
  price: number,
): Promise<void> {
  await ensureCustomOrderSchema();
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Enter a valid quoted price.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId, orderType: "SPECIAL_CUSTOM", status: "PENDING_QUOTE" },
    select: { id: true, orderNumber: true, customerPhone: true, trackingToken: true, deliveryFee: true },
  });
  if (!order) {
    throw new Error("Custom order not found or already quoted.");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      quotedPrice: price,
      status: "QUOTE_ACCEPTED",
      codAmount: price + (order.deliveryFee ?? 0),
    },
  });
  await prisma.auditLog.create({
    data: {
      orderId: order.id,
      action: "CUSTOM_QUOTE_SENT",
      details: { quotedPrice: price },
    },
  });
  publishDispatchEvent({ type: "orders.changed" });
  void notifyCustomerOrderUpdate({
    phone: order.customerPhone,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    kind: "quoted",
    quotedPrice: price,
  }).catch(() => undefined);
}

export async function confirmCustomOrderQuote(trackingToken: string): Promise<{ orderNumber: string }> {
  await ensureCustomOrderSchema();
  const token = trackingToken.trim();
  if (!token) {
    throw new Error("Tracking token is required.");
  }

  const order = await prisma.order.findFirst({
    where: { trackingToken: token, orderType: "SPECIAL_CUSTOM", status: "QUOTE_ACCEPTED" },
    select: {
      id: true,
      orderNumber: true,
      customerPhone: true,
      quotedPrice: true,
      deliveryFee: true,
      trackingToken: true,
    },
  });
  if (!order || order.quotedPrice == null) {
    throw new Error("This quote is no longer available.");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PENDING",
      codAmount: order.quotedPrice + (order.deliveryFee ?? 0),
    },
  });
  await prisma.auditLog.create({
    data: {
      orderId: order.id,
      action: "CUSTOM_QUOTE_CONFIRMED",
      details: { quotedPrice: order.quotedPrice },
    },
  });
  publishDispatchEvent({ type: "orders.changed" });
  void notifyCustomerOrderUpdate({
    phone: order.customerPhone,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    kind: "scheduled",
  }).catch(() => undefined);

  return { orderNumber: order.orderNumber };
}

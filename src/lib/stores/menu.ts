import "server-only";

import { prisma } from "@/lib/db";
import { getDepotPoint } from "@/lib/dispatch/depot";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { queueAutoAssign } from "@/lib/dispatch/queue-auto-assign";
import { nextOrderNumber } from "@/lib/dispatch/order-number";
import { normalizePhone } from "@/lib/dispatch/whatsapp";
import { notifyCustomerOrderUpdate } from "@/lib/stores/order-notify";
import { persistOrderTrackingToken, createTrackingToken } from "@/lib/stores/order-token";
import { effectiveProductPrice } from "@/lib/stores/pricing";
import { loadProductDiscountMap } from "@/lib/stores/service";
import { ensureStoreDirectory } from "@/lib/stores/store-types";
import { listLiveOffers } from "@/lib/stores/offers";
import { applyOfferToProduct } from "@/lib/stores/offer-types";
import { planPickupRoute } from "@/lib/stores/delivery-fee";
import { DINE_IN_GUEST_PHONE, DINE_IN_SOURCE, isRealCustomerPhone } from "@/lib/stores/indoor-service";
import { ensureOrderBundleSchema } from "@/lib/stores/order-bundle";
import { loadProductImagesMap } from "@/lib/stores/product-images-schema";
import {
  composedProductName,
  missingRequiredGroups,
  optionExtrasTotal,
  optionSummary,
} from "@/lib/stores/product-options";
import { ensureProductOptionsSchema } from "@/lib/stores/product-options-schema";
import { loadProductOptionsMap } from "@/lib/stores/product-options-store";
import type { DirectoryStore, MenuStore } from "@/lib/stores/types";

export async function listDirectoryStores(): Promise<DirectoryStore[]> {
  await ensureStoreDirectory();
  const stores = await prisma.store.findMany({
    where: { active: true },
    include: { storeType: true },
    orderBy: { name: "asc" },
  });

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    storeType: {
      id: store.storeType?.id ?? store.storeTypeId ?? "",
      name: store.storeType?.name ?? "أخرى",
      icon: store.storeType?.icon ?? "store",
    },
    phone: store.phone,
    address: store.address,
    city: store.city,
    logoUrl: store.logoUrl,
    coverImage: store.coverImage,
    latitude: store.latitude,
    longitude: store.longitude,
    rating: store.rating,
  }));
}

export async function getPublicMenu(storeId: string): Promise<MenuStore | null> {
  await ensureStoreDirectory();
  await ensureProductOptionsSchema();
  const store = await prisma.store.findFirst({
    where: { id: storeId, active: true },
    include: {
      storeType: true,
      categories: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          products: {
            where: { available: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  if (!store) {
    return null;
  }

  const discounts = await loadProductDiscountMap(store.id);
  const imageMap = await loadProductImagesMap(store.id);
  const optionsMap = await loadProductOptionsMap(store.id);
  const offers = await listLiveOffers(store.id);

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    storeType: {
      id: store.storeType?.id ?? store.storeTypeId ?? "",
      name: store.storeType?.name ?? "أخرى",
      icon: store.storeType?.icon ?? "store",
    },
    phone: store.phone,
    address: store.address,
    city: store.city,
    logoUrl: store.logoUrl,
    coverImage: store.coverImage,
    ...(await loadStoreBranding(store.id)),
    latitude: store.latitude,
    longitude: store.longitude,
    rating: store.rating,
    categories: store.categories.map((category) => ({
      id: category.id,
      name: category.name,
      products: category.products.map((product) => {
        const extra = discounts.get(product.id);
        const images = imageMap.get(product.id) ?? [];
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          hasDiscount: extra?.hasDiscount ?? product.hasDiscount,
          discountPrice: extra?.discountPrice ?? product.discountPrice,
          imageUrl: images[0] ?? product.imageUrl,
          images,
          available: product.available,
          optionGroups: optionsMap.get(product.id) ?? [],
        };
      }),
    })),
    offers,
  };
}

async function loadStoreBranding(storeId: string): Promise<{
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
}> {
  try {
    const rows = await prisma.$queryRaw<
      { primaryColor: string | null; secondaryColor: string | null; welcomeMessage: string | null }[]
    >`
      SELECT "primaryColor", "secondaryColor", "welcomeMessage"
      FROM stores
      WHERE id = ${storeId}
      LIMIT 1
    `;
    const row = rows[0];
    return {
      primaryColor: row?.primaryColor?.trim() || null,
      secondaryColor: row?.secondaryColor?.trim() || null,
      welcomeMessage: row?.welcomeMessage?.trim() || null,
    };
  } catch {
    return { primaryColor: null, secondaryColor: null, welcomeMessage: null };
  }
}

export async function findOrCreateCustomer(phone: string): Promise<{ id: string; phone: string }> {
  const normalized = normalizePhone(phone);
  const existing = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, phone: true },
  });
  if (existing) {
    return existing;
  }

  const suffix = normalized.replace(/\D/g, "").slice(-8) || Date.now().toString(36);
  const created = await prisma.user.create({
    data: {
      name: `Customer ${suffix}`,
      email: `customer.${suffix}@customers.smart-dispatch.local`,
      phone: normalized,
      role: "CUSTOMER",
      language: "ar",
    },
    select: { id: true, phone: true },
  });
  return created;
}

export async function placeMenuOrder(input: {
  phone: string;
  storeId?: string;
  addressText: string;
  items: Array<{
    productId: string;
    quantity: number;
    optionValueIds?: string[];
    note?: string;
  }>;
  latitude?: number | null;
  longitude?: number | null;
  storeNotes?: Record<string, string>;
  fulfillment?: "DELIVERY" | "DINE_IN";
  tableId?: string | null;
  tableLabel?: string | null;
  guestName?: string | null;
}): Promise<{ orderNumber: string; trackingToken: string; deliveryFee: number }> {
  await ensureOrderBundleSchema();
  await ensureProductOptionsSchema();
  const { ensureVendorIntelSchema } = await import("@/lib/stores/vendor-intel-schema");
  await ensureVendorIntelSchema();
  const dineIn = input.fulfillment === "DINE_IN";
  const tableLabel = input.tableLabel?.trim() || null;
  const guestName = input.guestName?.trim() || null;
  const rawPhone = input.phone.trim();
  const phone = dineIn
    ? isRealCustomerPhone(rawPhone)
      ? normalizePhone(rawPhone)
      : DINE_IN_GUEST_PHONE
    : normalizePhone(rawPhone);
  const addressText = dineIn
    ? tableLabel || input.addressText.trim() || "DINE_IN"
    : input.addressText.trim();
  if (!dineIn && (!isRealCustomerPhone(phone) || !addressText)) {
    throw new Error("Phone and delivery address are required.");
  }
  if (dineIn && !addressText) {
    throw new Error("Table is required.");
  }

  const quantities = input.items.filter((item) => item.quantity > 0);
  if (quantities.length === 0) {
    throw new Error("Select at least one product.");
  }

  const productIds = [...new Set(quantities.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      available: true,
      store: { active: true },
    },
    include: {
      store: {
        select: { id: true, name: true, latitude: true, longitude: true, address: true },
      },
    },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products are unavailable.");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const byStore = new Map<
    string,
    {
      store: { id: string; name: string; latitude: number | null; longitude: number | null; address: string | null };
      products: typeof products;
    }
  >();

  for (const product of products) {
    const group = byStore.get(product.storeId);
    if (group) {
      group.products.push(product);
      continue;
    }
    byStore.set(product.storeId, { store: product.store, products: [product] });
  }

  const customer = isRealCustomerPhone(phone) ? await findOrCreateCustomer(phone) : null;
  if (customer && guestName && guestName !== customer.phone) {
    await prisma.user.update({
      where: { id: customer.id },
      data: { name: guestName.slice(0, 80) },
    }).catch(() => undefined);
  }
  const depot = getDepotPoint();
  const firstStore = [...byStore.values()][0]?.store;
  const deliveryLat = dineIn
    ? (firstStore?.latitude ?? depot[0])
    : input.latitude != null && Number.isFinite(input.latitude)
      ? input.latitude
      : depot[0];
  const deliveryLng = dineIn
    ? (firstStore?.longitude ?? depot[1])
    : input.longitude != null && Number.isFinite(input.longitude)
      ? input.longitude
      : depot[1];
  const quote = planPickupRoute(
    [...byStore.values()].map((group) => ({
      id: group.store.id,
      name: group.store.name,
      latitude: group.store.latitude,
      longitude: group.store.longitude,
    })),
    { latitude: deliveryLat, longitude: deliveryLng },
  );

  const trackingToken = createTrackingToken();
  const parentNumber = nextOrderNumber();
  const multi = byStore.size > 1;
  const parentId = crypto.randomUUID();

  const createChild = async (
    storeId: string,
    parentOrderId: string | null,
    bundleRole: "SINGLE" | "CHILD",
    orderNumber: string,
  ): Promise<{ orderNumber: string; itemsTotal: number }> => {
    const group = byStore.get(storeId);
    if (!group) {
      throw new Error("Store group missing.");
    }
    const discounts = await loadProductDiscountMap(storeId);
    const liveOffers = await listLiveOffers(storeId);
    const optionsMap = await loadProductOptionsMap(storeId);
    const pickupLat = group.store.latitude ?? depot[0];
    const pickupLng = group.store.longitude ?? depot[1];
    const kitchenNotes = input.storeNotes?.[storeId]?.trim() || null;
    const notes = [guestName ? `ضيف: ${guestName}` : null, kitchenNotes]
      .filter((part): part is string => Boolean(part))
      .join(" — ") || null;
    const storeLines = quantities.filter((item) => productById.get(item.productId)?.storeId === storeId);
    const itemRows = storeLines.map((line) => {
      const product = productById.get(line.productId);
      if (!product) {
        throw new Error("One or more products are unavailable.");
      }
      const extra = discounts.get(product.id);
      const priced = applyOfferToProduct(
        {
          id: product.id,
          price: product.price,
          hasDiscount: extra?.hasDiscount ?? product.hasDiscount,
          discountPrice: extra?.discountPrice ?? product.discountPrice,
        },
        product.categoryId,
        liveOffers,
      );
      const groups = optionsMap.get(product.id) ?? [];
      const selection = {
        valueIds: line.optionValueIds ?? [],
        note: line.note?.trim() ?? "",
      };
      if (missingRequiredGroups(groups, selection).length > 0) {
        throw new Error("Required product options are missing.");
      }
      const allowed = new Set(groups.flatMap((group) => group.values.map((value) => value.id)));
      const valueIds = selection.valueIds.filter((id) => allowed.has(id));
      const summary = optionSummary(groups, { valueIds, note: selection.note });
      return {
        productId: product.id,
        quantity: line.quantity,
        unitPrice: effectiveProductPrice(priced) + optionExtrasTotal(groups, valueIds),
        name: composedProductName(product.name, summary),
      };
    });
    const subtotal = itemRows.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const fee = dineIn ? 0 : bundleRole === "SINGLE" ? quote.fee : 0;

    const data = {
      orderNumber,
      status: "PENDING" as const,
      customerPhone: customer?.phone ?? phone,
      customerId: customer?.id ?? null,
      storeId,
      parentOrderId,
      bundleRole,
      deliveryFee: fee,
      storeNotes: notes,
      fulfillment: dineIn ? "DINE_IN" : "DELIVERY",
      tableId: dineIn ? input.tableId ?? null : null,
      tableLabel: dineIn ? tableLabel : null,
      source: dineIn ? DINE_IN_SOURCE : "menu",
      addressText,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      codAmount: subtotal + fee,
      items: { create: itemRows },
      auditLogs: {
        create: {
          action: "ORDER_CREATED",
          details: {
            source: dineIn ? DINE_IN_SOURCE : "menu",
            storeId,
            storeName: group.store.name,
            bundleRole,
            parentOrderId,
          },
        },
      },
    };

    try {
      await prisma.order.create({
        data: bundleRole === "SINGLE" ? { ...data, trackingToken } : data,
        select: { id: true },
      });
    } catch {
      await prisma.order.create({
        data,
        select: { id: true },
      });
    }

    return { orderNumber, itemsTotal: subtotal };
  };

  if (!multi) {
    const storeId = [...byStore.keys()][0];
    const created = await createChild(storeId, null, "SINGLE", parentNumber);
    const single = await prisma.order.findFirst({
      where: { orderNumber: created.orderNumber },
      select: { id: true },
    });
    if (single) {
      await persistOrderTrackingToken(single.id, trackingToken);
    }
    if (!dineIn) {
      publishDispatchEvent({
        type: "order.created",
        orderId: single?.id ?? created.orderNumber,
        orderNumber: created.orderNumber,
        source: "menu",
      });
      if (single?.id) {
        queueAutoAssign(single.id);
      }
    }
    if (customer && isRealCustomerPhone(customer.phone) && !dineIn) {
      void notifyCustomerOrderUpdate({
        phone: customer.phone,
        orderNumber: created.orderNumber,
        trackingToken,
        kind: "placed",
      }).catch(() => undefined);
    }
    return { orderNumber: created.orderNumber, trackingToken, deliveryFee: dineIn ? 0 : quote.fee };
  }

  const orderedStoreIds = quote.orderedStops.map((stop) => stop.id);
  const leftover = [...byStore.keys()].filter((id) => !orderedStoreIds.includes(id));
  const storeOrder = [...orderedStoreIds, ...leftover];

  await prisma.order.create({
    data: {
      id: parentId,
      orderNumber: parentNumber,
      status: "PENDING",
      customerPhone: customer?.phone ?? phone,
      customerId: customer?.id ?? null,
      storeId: null,
      bundleRole: "PARENT",
      deliveryFee: dineIn ? 0 : quote.fee,
      fulfillment: dineIn ? "DINE_IN" : "DELIVERY",
      tableId: dineIn ? input.tableId ?? null : null,
      tableLabel: dineIn ? tableLabel : null,
      source: dineIn ? DINE_IN_SOURCE : "menu",
      addressText,
      pickupLat: byStore.get(storeOrder[0])?.store.latitude ?? depot[0],
      pickupLng: byStore.get(storeOrder[0])?.store.longitude ?? depot[1],
      deliveryLat,
      deliveryLng,
      trackingToken,
      codAmount: quote.fee,
      auditLogs: {
        create: {
          action: "ORDER_CREATED",
          details: {
            source: dineIn ? DINE_IN_SOURCE : "menu",
            bundleRole: "PARENT",
            stores: storeOrder,
            deliveryFee: quote.fee,
            distanceKm: quote.distanceKm,
          },
        },
      },
    },
  });

  let itemsTotal = 0;
  for (const [index, storeId] of storeOrder.entries()) {
    const childNumber = `${parentNumber}-${index + 1}`;
    const created = await createChild(storeId, parentId, "CHILD", childNumber);
    itemsTotal += created.itemsTotal;
  }

  await prisma.order.update({
    where: { id: parentId },
    data: { codAmount: itemsTotal + quote.fee },
  });

  await persistOrderTrackingToken(parentId, trackingToken);
  if (!dineIn) {
    publishDispatchEvent({
      type: "order.created",
      orderId: parentId,
      orderNumber: parentNumber,
      source: "menu",
    });
  }
  if (customer && isRealCustomerPhone(customer.phone) && !dineIn) {
    void notifyCustomerOrderUpdate({
      phone: customer.phone,
      orderNumber: parentNumber,
      trackingToken,
      kind: "placed",
    }).catch(() => undefined);
  }

  return { orderNumber: parentNumber, trackingToken, deliveryFee: dineIn ? 0 : quote.fee };
}

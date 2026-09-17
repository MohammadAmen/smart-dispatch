import "server-only";

import { prisma } from "@/lib/db";
import { effectiveProductPrice } from "@/lib/stores/pricing";
import { primaryProductImage } from "@/lib/stores/product-images";
import { ensureStoreStoriesSchema } from "@/lib/stores/story-schema";
import {
  ADMIN_STORY_STORE_ID,
  STORY_MAX_SECONDS,
  STORY_TTL_MS,
  asActionType,
  asMediaType,
  type PublicStory,
  type PublicStoryStore,
  type StoryWriteInput,
  type VendorStoryRecord,
} from "@/lib/stores/story-types";
import { deleteStoryVideo } from "@/lib/stores/story-video";

function clampDuration(value: number | undefined): number {
  if (!Number.isFinite(value) || value == null || value <= 0) {
    throw new Error(`Video must be ${STORY_MAX_SECONDS} seconds or shorter.`);
  }
  const seconds = Math.min(STORY_MAX_SECONDS, Math.round(value));
  if (seconds < 1) {
    throw new Error(`Video must be ${STORY_MAX_SECONDS} seconds or shorter.`);
  }
  return seconds;
}

type StoryRow = {
  id: string;
  storeId: string | null;
  title: string;
  description: string;
  videoUrl: string;
  mediaType?: string | null;
  duration: number;
  isOrderable: boolean;
  isAdminAd?: boolean;
  actionType?: string | null;
  contactNumber?: string | null;
  externalLink?: string | null;
  productId: string | null;
  price: number | null;
  viewsCount: number;
  likesCount: number;
  expiresAt: Date;
  createdAt: Date;
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    coverImage?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    latitude: number | null;
    longitude: number | null;
    storeTypeId: string | null;
    storeType?: { name: string } | null;
  } | null;
  product: {
    id: string;
    name: string;
    price: number;
    hasDiscount: boolean;
    discountPrice: number | null;
    imageUrl: string | null;
    images: unknown;
    available: boolean;
  } | null;
};

function serializePublic(row: StoryRow, liked: boolean): PublicStory {
  const productPrice = row.product ? effectiveProductPrice(row.product) : null;
  const price =
    row.price != null && Number.isFinite(row.price) && row.price >= 0
      ? row.price
      : productPrice;
  const isAdminAd = Boolean(row.isAdminAd);
  return {
    id: row.id,
    storeId: row.storeId ?? ADMIN_STORY_STORE_ID,
    storeName: row.store?.name ?? "Smart Dispatch",
    storeLogoUrl: row.store?.logoUrl ?? null,
    storeLat: row.store?.latitude ?? null,
    storeLng: row.store?.longitude ?? null,
    storeTypeId: row.store?.storeTypeId ?? "",
    title: row.title,
    description: row.description,
    videoUrl: row.videoUrl,
    mediaType: asMediaType(row.mediaType),
    duration: row.duration,
    isOrderable: row.isOrderable,
    isAdminAd,
    actionType: isAdminAd ? asActionType(row.actionType) : "ORDER_PRODUCT",
    contactNumber: row.contactNumber ?? null,
    externalLink: row.externalLink ?? null,
    productId: row.product?.available ? row.product.id : null,
    productName: row.product?.name ?? null,
    productImage: row.product ? primaryProductImage(row.product) : null,
    price,
    viewsCount: row.viewsCount,
    likesCount: row.likesCount,
    liked,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeVendor(row: {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  mediaType?: string | null;
  duration: number;
  isOrderable: boolean;
  isAdminAd?: boolean;
  actionType?: string | null;
  contactNumber?: string | null;
  externalLink?: string | null;
  productId: string | null;
  price: number | null;
  viewsCount: number;
  likesCount: number;
  expiresAt: Date;
  createdAt: Date;
  product: { name: string } | null;
}): VendorStoryRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.videoUrl,
    mediaType: asMediaType(row.mediaType),
    duration: row.duration,
    isOrderable: row.isOrderable,
    isAdminAd: Boolean(row.isAdminAd),
    actionType: asActionType(row.actionType),
    contactNumber: row.contactNumber ?? null,
    externalLink: row.externalLink ?? null,
    productId: row.productId,
    productName: row.product?.name ?? null,
    price: row.price,
    viewsCount: row.viewsCount,
    likesCount: row.likesCount,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    active: row.expiresAt.getTime() > Date.now(),
  };
}

const storyInclude = {
  store: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      coverImage: true,
      phone: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      storeTypeId: true,
      storeType: { select: { name: true } },
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      hasDiscount: true,
      discountPrice: true,
      imageUrl: true,
      images: true,
      available: true,
    },
  },
} as const;

export async function listActiveStoryStores(guestKey: string): Promise<PublicStoryStore[]> {
  await ensureStoreStoriesSchema();
  const rows = await prisma.storeStory.findMany({
    where: {
      expiresAt: { gt: new Date() },
      OR: [{ isAdminAd: true }, { store: { active: true } }],
    },
    include: storyInclude,
    orderBy: { createdAt: "desc" },
  });

  const likedIds = new Set<string>();
  if (guestKey && rows.length > 0) {
    const likes = await prisma.storyLike.findMany({
      where: { guestKey, storyId: { in: rows.map((row) => row.id) } },
      select: { storyId: true },
    });
    for (const like of likes) {
      likedIds.add(like.storyId);
    }
  }

  const grouped = new Map<string, PublicStoryStore>();
  for (const row of rows) {
    const story = serializePublic(row, likedIds.has(row.id));
    const groupId = story.isAdminAd ? ADMIN_STORY_STORE_ID : (row.storeId ?? story.id);
    const current = grouped.get(groupId);
    if (current) {
      current.stories.push(story);
      continue;
    }
    grouped.set(groupId, {
      storeId: groupId,
      storeName: story.isAdminAd ? "Smart Dispatch" : (row.store?.name ?? story.storeName),
      storeLogoUrl: row.store?.logoUrl ?? null,
      storeCoverImage: row.store?.coverImage ?? null,
      storePhone: row.store?.phone ?? story.contactNumber,
      storeAddress: row.store?.address ?? null,
      storeCity: row.store?.city ?? null,
      storeTypeId: row.store?.storeTypeId ?? "",
      storeTypeName: row.store?.storeType?.name ?? null,
      isAdminAd: story.isAdminAd,
      latestAt: row.createdAt.toISOString(),
      stories: [story],
    });
  }

  return [...grouped.values()];
}

export async function listVendorStories(storeId: string): Promise<VendorStoryRecord[]> {
  await ensureStoreStoriesSchema();
  const rows = await prisma.storeStory.findMany({
    where: { storeId, isAdminAd: false },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeVendor);
}

export async function listAdminStories(): Promise<VendorStoryRecord[]> {
  await ensureStoreStoriesSchema();
  const rows = await prisma.storeStory.findMany({
    where: { isAdminAd: true },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeVendor);
}

export async function createStoreStory(
  storeId: string,
  input: StoryWriteInput & { videoUrl: string; duration: number },
): Promise<VendorStoryRecord> {
  await ensureStoreStoriesSchema();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Story title is required.");
  }
  if (!input.videoUrl.trim()) {
    throw new Error("A video is required.");
  }

  let productId: string | null = null;
  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, storeId },
      select: { id: true },
    });
    if (!product) {
      throw new Error("Product not found.");
    }
    productId = product.id;
  }

  const price =
    input.price != null && Number.isFinite(input.price) && input.price >= 0 ? input.price : null;
  const now = new Date();
  const row = await prisma.storeStory.create({
    data: {
      storeId,
      title,
      description: input.description?.trim() ?? "",
      videoUrl: input.videoUrl.trim(),
      mediaType: "VIDEO",
      duration: clampDuration(input.duration),
      isOrderable: Boolean(input.isOrderable),
      isAdminAd: false,
      actionType: "ORDER_PRODUCT",
      productId,
      price,
      expiresAt: new Date(now.getTime() + STORY_TTL_MS),
    },
    include: { product: { select: { name: true } } },
  });
  return serializeVendor(row);
}

export async function createAdminStory(
  input: StoryWriteInput & { videoUrl: string; duration: number },
): Promise<VendorStoryRecord> {
  await ensureStoreStoriesSchema();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Story title is required.");
  }
  if (!input.videoUrl.trim()) {
    throw new Error("Media is required.");
  }
  const actionType = asActionType(input.actionType);
  if (actionType === "CONTACT_US" && !input.contactNumber?.trim()) {
    throw new Error("A contact number is required.");
  }
  if (actionType === "EXTERNAL_LINK" && !input.externalLink?.trim()) {
    throw new Error("An external link is required.");
  }

  const mediaType = asMediaType(input.mediaType);
  const duration = mediaType === "IMAGE" ? 7 : clampDuration(input.duration);
  const expiresAt = input.expiresAt ?? new Date(Date.now() + STORY_TTL_MS);
  const row = await prisma.storeStory.create({
    data: {
      storeId: null,
      title,
      description: input.description?.trim() ?? "",
      videoUrl: input.videoUrl.trim(),
      mediaType,
      duration,
      isOrderable: false,
      isAdminAd: true,
      actionType,
      contactNumber: input.contactNumber?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
      expiresAt,
    },
    include: { product: { select: { name: true } } },
  });
  return serializeVendor(row);
}

export async function updateStoreStory(
  storeId: string,
  id: string,
  input: StoryWriteInput,
): Promise<VendorStoryRecord> {
  await ensureStoreStoriesSchema();
  const existing = await prisma.storeStory.findFirst({
    where: { id, storeId, isAdminAd: false },
    select: { id: true, expiresAt: true },
  });
  if (!existing) {
    throw new Error("Story not found.");
  }
  if (existing.expiresAt.getTime() <= Date.now()) {
    throw new Error("Expired stories cannot be edited.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Story title is required.");
  }

  let productId: string | null = null;
  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, storeId },
      select: { id: true },
    });
    if (!product) {
      throw new Error("Product not found.");
    }
    productId = product.id;
  }

  const price =
    input.price != null && Number.isFinite(input.price) && input.price >= 0 ? input.price : null;
  const row = await prisma.storeStory.update({
    where: { id },
    data: {
      title,
      description: input.description?.trim() ?? "",
      isOrderable: Boolean(input.isOrderable),
      productId,
      price,
    },
    include: { product: { select: { name: true } } },
  });
  return serializeVendor(row);
}

export async function updateAdminStory(id: string, input: StoryWriteInput): Promise<VendorStoryRecord> {
  await ensureStoreStoriesSchema();
  const existing = await prisma.storeStory.findFirst({
    where: { id, isAdminAd: true },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Story not found.");
  }
  const title = input.title.trim();
  if (!title) {
    throw new Error("Story title is required.");
  }
  const actionType = asActionType(input.actionType);
  if (actionType === "CONTACT_US" && !input.contactNumber?.trim()) {
    throw new Error("A contact number is required.");
  }
  if (actionType === "EXTERNAL_LINK" && !input.externalLink?.trim()) {
    throw new Error("An external link is required.");
  }
  const row = await prisma.storeStory.update({
    where: { id },
    data: {
      title,
      description: input.description?.trim() ?? "",
      actionType,
      contactNumber: input.contactNumber?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    },
    include: { product: { select: { name: true } } },
  });
  return serializeVendor(row);
}

export async function deleteStoreStory(storeId: string, id: string): Promise<void> {
  await ensureStoreStoriesSchema();
  const existing = await prisma.storeStory.findFirst({
    where: { id, storeId, isAdminAd: false },
    select: { id: true, videoUrl: true },
  });
  if (!existing) {
    throw new Error("Story not found.");
  }
  await prisma.storeStory.delete({ where: { id } });
  await deleteStoryVideo(existing.videoUrl);
}

export async function deleteAdminStory(id: string): Promise<void> {
  await ensureStoreStoriesSchema();
  const existing = await prisma.storeStory.findFirst({
    where: { id, isAdminAd: true },
    select: { id: true, videoUrl: true },
  });
  if (!existing) {
    throw new Error("Story not found.");
  }
  await prisma.storeStory.delete({ where: { id } });
  await deleteStoryVideo(existing.videoUrl);
}

export async function incrementStoryView(id: string): Promise<number | null> {
  await ensureStoreStoriesSchema();
  const existing = await prisma.storeStory.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    select: { id: true, viewsCount: true },
  });
  if (!existing) {
    return null;
  }
  const row = await prisma.storeStory.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
    select: { viewsCount: true },
  });
  return row.viewsCount;
}

export async function toggleStoryLike(
  id: string,
  guestKey: string,
  userId: string | null,
): Promise<{ liked: boolean; likesCount: number } | null> {
  await ensureStoreStoriesSchema();
  const key = guestKey.trim();
  if (!key) {
    throw new Error("Missing guest key.");
  }

  const story = await prisma.storeStory.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    select: { id: true, likesCount: true },
  });
  if (!story) {
    return null;
  }

  const existing = await prisma.storyLike.findUnique({
    where: { storyId_guestKey: { storyId: id, guestKey: key } },
    select: { id: true },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.storyLike.delete({ where: { id: existing.id } }),
      prisma.storeStory.update({
        where: { id },
        data: { likesCount: { decrement: story.likesCount > 0 ? 1 : 0 } },
      }),
    ]);
    return { liked: false, likesCount: Math.max(0, story.likesCount - 1) };
  }

  await prisma.$transaction([
    prisma.storyLike.create({
      data: { storyId: id, guestKey: key, userId },
    }),
    prisma.storeStory.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    }),
  ]);
  return { liked: true, likesCount: story.likesCount + 1 };
}

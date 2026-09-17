import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import type {
  CategoryRecord,
  CategoryWriteInput,
  DriverWriteInput,
  OwnerWriteInput,
  ProductRecord,
  ProductWriteInput,
  StoreDriverOption,
  StoreOwnerOption,
  StoreRecord,
  StoreTypeRecord,
  StoreWriteInput,
} from "@/lib/stores/types";
import { normalizeProductImages } from "@/lib/stores/product-images";
import {
  ensureProductImagesSchema,
  loadProductImagesMap,
  persistProductImages,
} from "@/lib/stores/product-images-schema";
import { loadProductOptionsMap } from "@/lib/stores/product-options-store";
import { ensureProductOptionsSchema } from "@/lib/stores/product-options-schema";
import { resolveReceiptFooterNote } from "@/lib/stores/receipt-footer";
import { ensureStoreDirectory } from "@/lib/stores/store-types";
import { ensureVendorIntelSchema } from "@/lib/stores/vendor-intel-schema";

function asOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function clampRating(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(5, Math.max(0, Math.round(value * 10) / 10));
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "store";
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let index = 2;

  for (;;) {
    const existing = await prisma.store.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${index}`;
    index += 1;
  }
}

function serializeStoreType(row: {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  _count?: { stores: number };
}): StoreTypeRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sortOrder,
    storeCount: row._count?.stores ?? 0,
  };
}

function serializeStore(
  row: Prisma.StoreGetPayload<{
    include: {
      owner: { select: { id: true; name: true; email: true; phone: true } };
      storeType: true;
      _count: { select: { categories: true; products: true } };
    };
  }>,
): StoreRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    storeTypeId: row.storeTypeId ?? "",
    storeType: serializeStoreType(
      row.storeType ?? {
        id: "",
        name: "أخرى",
        icon: "store",
        sortOrder: 99,
      },
    ),
    phone: row.phone,
    address: row.address,
    city: row.city,
    logoUrl: row.logoUrl,
    coverImage: row.coverImage,
    receiptFooterNote: readReceiptFooterNote(row),
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating,
    active: row.active,
    ownerId: row.ownerId,
    owner: row.owner,
    categoryCount: row._count.categories,
    productCount: row._count.products,
    createdAt: row.createdAt.toISOString(),
  };
}

const storeInclude = {
  owner: { select: { id: true, name: true, email: true, phone: true } },
  storeType: true,
  _count: { select: { categories: true, products: true } },
} as const;

async function attachReceiptFooterNotes(stores: StoreRecord[]): Promise<StoreRecord[]> {
  await ensureVendorIntelSchema();
  if (stores.length === 0) {
    return stores;
  }
  const rows = await prisma.$queryRaw<{ id: string; receiptFooterNote: string | null }[]>`
    SELECT id, receiptFooterNote FROM stores WHERE id IN (${Prisma.join(stores.map((store) => store.id))})
  `;
  const notes = new Map(rows.map((row) => [row.id, row.receiptFooterNote]));
  return stores.map((store) => ({
    ...store,
    receiptFooterNote: notes.get(store.id) ?? store.receiptFooterNote,
  }));
}

function readReceiptFooterNote(row: object): string | null {
  const value = (row as { receiptFooterNote?: unknown }).receiptFooterNote;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function updateStoreReceiptFooter(
  storeId: string,
  note: string,
): Promise<string> {
  await ensureVendorIntelSchema();
  const saved = resolveReceiptFooterNote(note);
  await prisma.$executeRaw`
    UPDATE stores SET receiptFooterNote = ${saved} WHERE id = ${storeId}
  `;
  return saved;
}

export async function listStores(ownerId?: string): Promise<StoreRecord[]> {
  await ensureStoreDirectory();
  const rows = await prisma.store.findMany({
    where: ownerId ? { ownerId } : undefined,
    include: storeInclude,
    orderBy: { name: "asc" },
  });
  return attachReceiptFooterNotes(rows.map(serializeStore));
}

export async function getStoreShellForOwner(
  ownerId: string,
): Promise<{
  id: string;
  active: boolean;
  phone: string | null;
  storeType: { icon: string; name: string };
} | null> {
  await ensureStoreDirectory();
  const row = await prisma.store.findFirst({
    where: { ownerId },
    select: {
      id: true,
      active: true,
      phone: true,
      storeType: { select: { icon: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    active: row.active,
    phone: row.phone,
    storeType: row.storeType ?? { icon: "store", name: "أخرى" },
  };
}

export async function setStoreAcceptingOrders(storeId: string, active: boolean): Promise<boolean> {
  const row = await prisma.store.update({
    where: { id: storeId },
    data: { active },
    select: { active: true },
  });
  return row.active;
}

export async function getStoreForOwner(ownerId: string): Promise<StoreRecord | null> {
  await ensureStoreDirectory();
  const row = await prisma.store.findFirst({
    where: { ownerId },
    include: storeInclude,
    orderBy: { createdAt: "asc" },
  });
  if (!row) {
    return null;
  }
  const [store] = await attachReceiptFooterNotes([serializeStore(row)]);
  return store ?? null;
}

export async function listStoreOwners(): Promise<StoreOwnerOption[]> {
  return prisma.user.findMany({
    where: { role: "STORE_OWNER" },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
}

export async function listStoreDrivers(): Promise<StoreDriverOption[]> {
  const rows = await prisma.driver.findMany({
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.user.id,
    name: row.user.name,
    phone: row.user.phone,
    status: row.status,
    vehicleType: row.vehicleType,
  }));
}

export async function createStore(input: StoreWriteInput): Promise<StoreRecord> {
  await ensureStoreDirectory();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Store name is required.");
  }
  if (!input.storeTypeId) {
    throw new Error("Store type is required.");
  }

  const rating = clampRating(input.rating);

  const row = await prisma.store.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      storeType: { connect: { id: input.storeTypeId } },
      phone: asOptional(input.phone),
      address: asOptional(input.address),
      city: asOptional(input.city),
      logoUrl: asOptional(input.logoUrl),
      coverImage: asOptional(input.coverImage),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      rating,
      active: input.active ?? true,
      ...(input.ownerId ? { owner: { connect: { id: input.ownerId } } } : {}),
    },
    include: storeInclude,
  });

  return serializeStore(row);
}

export async function updateStore(id: string, input: StoreWriteInput): Promise<StoreRecord> {
  await ensureStoreDirectory();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Store name is required.");
  }
  if (!input.storeTypeId) {
    throw new Error("Store type is required.");
  }

  const rating = clampRating(input.rating);

  const row = await prisma.store.update({
    where: { id },
    data: {
      name,
      slug: await uniqueSlug(name, id),
      storeType: { connect: { id: input.storeTypeId } },
      phone: asOptional(input.phone),
      address: asOptional(input.address),
      city: asOptional(input.city),
      logoUrl: asOptional(input.logoUrl),
      coverImage: asOptional(input.coverImage),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      rating,
      active: input.active ?? true,
      owner: input.ownerId
        ? { connect: { id: input.ownerId } }
        : { disconnect: true },
    },
    include: storeInclude,
  });

  return serializeStore(row);
}

export async function deleteStore(id: string): Promise<void> {
  await prisma.store.delete({ where: { id } });
}

export async function createStoreOwner(input: OwnerWriteInput): Promise<StoreOwnerOption> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const name = input.name.trim();
  if (!name || !email || !phone) {
    throw new Error("Name, email, and phone are required.");
  }

  return prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: "STORE_OWNER",
      language: "ar",
      passwordHash: hashPassword(input.password?.trim() || DEMO_PASSWORD),
    },
    select: { id: true, name: true, email: true, phone: true },
  });
}

export async function createStoreDriver(input: DriverWriteInput): Promise<StoreDriverOption> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const name = input.name.trim();
  if (!name || !email || !phone) {
    throw new Error("Name, email, and phone are required.");
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: "DRIVER",
      language: "ar",
      passwordHash: hashPassword(input.password?.trim() || DEMO_PASSWORD),
      driver: {
        create: {
          status: "OFFLINE",
          vehicleType: input.vehicleType?.trim() || "Van",
        },
      },
    },
    include: {
      driver: true,
    },
  });

  if (!created.driver) {
    throw new Error("Driver profile was not created.");
  }

  return {
    id: created.driver.id,
    userId: created.id,
    name: created.name,
    phone: created.phone,
    status: created.driver.status,
    vehicleType: created.driver.vehicleType,
  };
}

function serializeCategory(
  row: Prisma.CategoryGetPayload<{ include: { _count: { select: { products: true } } } }>,
): CategoryRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    sortOrder: row.sortOrder,
    active: row.active,
    productCount: row._count.products,
  };
}

export async function listCategories(storeId: string): Promise<CategoryRecord[]> {
  const rows = await prisma.category.findMany({
    where: { storeId },
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeCategory);
}

export async function createCategory(
  storeId: string,
  input: CategoryWriteInput,
): Promise<CategoryRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required.");
  }

  const row = await prisma.category.create({
    data: {
      storeId,
      name,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    },
    include: { _count: { select: { products: true } } },
  });
  return serializeCategory(row);
}

export async function updateCategory(
  storeId: string,
  id: string,
  input: CategoryWriteInput,
): Promise<CategoryRecord> {
  const existing = await prisma.category.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Category not found.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required.");
  }

  const row = await prisma.category.update({
    where: { id },
    data: {
      name,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    },
    include: { _count: { select: { products: true } } },
  });
  return serializeCategory(row);
}

export async function deleteCategory(storeId: string, id: string): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Category not found.");
  }
  await prisma.category.delete({ where: { id } });
}

function serializeProduct(
  row: Prisma.ProductGetPayload<{ include: { category: { select: { name: true } } } }>,
  images?: string[],
  optionGroups: ProductRecord["optionGroups"] = [],
): ProductRecord {
  const list = normalizeProductImages(row.imageUrl, images);
  return {
    id: row.id,
    storeId: row.storeId,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    name: row.name,
    description: row.description,
    price: row.price,
    hasDiscount: row.hasDiscount,
    discountPrice: row.discountPrice,
    imageUrl: list[0] ?? null,
    images: list,
    available: row.available,
    sortOrder: row.sortOrder,
    optionGroups,
  };
}

function normalizeDiscount(
  price: number,
  hasDiscount: boolean | undefined,
  discountPrice: number | null | undefined,
): { hasDiscount: boolean; discountPrice: number | null } {
  if (!hasDiscount) {
    return { hasDiscount: false, discountPrice: null };
  }

  if (discountPrice == null || !Number.isFinite(discountPrice) || discountPrice < 0) {
    throw new Error("A valid discount price is required.");
  }

  if (discountPrice >= price) {
    throw new Error("Discount price must be lower than the original price.");
  }

  return { hasDiscount: true, discountPrice };
}

async function persistProductDiscount(
  id: string,
  hasDiscount: boolean,
  discountPrice: number | null,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE products
    SET hasDiscount = ${hasDiscount ? 1 : 0},
        discountPrice = ${discountPrice}
    WHERE id = ${id}
  `;
}

export async function loadProductDiscountMap(
  storeId?: string,
): Promise<Map<string, { hasDiscount: boolean; discountPrice: number | null }>> {
  const rows = storeId
    ? await prisma.$queryRaw<
        { id: string; hasDiscount: number | boolean; discountPrice: number | null }[]
      >`
        SELECT id, hasDiscount, discountPrice FROM products WHERE storeId = ${storeId}
      `
    : await prisma.$queryRaw<
        { id: string; hasDiscount: number | boolean; discountPrice: number | null }[]
      >`
        SELECT id, hasDiscount, discountPrice FROM products
      `;

  return new Map(
    rows.map((row) => [
      row.id,
      {
        hasDiscount: row.hasDiscount === true || row.hasDiscount === 1,
        discountPrice: row.discountPrice,
      },
    ]),
  );
}

export async function listProducts(storeId: string): Promise<ProductRecord[]> {
  await ensureProductImagesSchema();
  await ensureProductOptionsSchema();
  const [rows, discounts, imageMap, optionsMap] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      include: { category: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    loadProductDiscountMap(storeId),
    loadProductImagesMap(storeId),
    loadProductOptionsMap(storeId),
  ]);

  return rows.map((row) => {
    const extra = discounts.get(row.id);
    return serializeProduct(
      {
        ...row,
        hasDiscount: extra?.hasDiscount ?? row.hasDiscount,
        discountPrice: extra?.discountPrice ?? row.discountPrice,
      },
      imageMap.get(row.id),
      optionsMap.get(row.id) ?? [],
    );
  });
}

export async function listVendorPosProducts(storeId: string): Promise<ProductRecord[]> {
  const [rows, discounts] = await Promise.all([
    prisma.product.findMany({
      where: { storeId, available: true },
      select: {
        id: true,
        storeId: true,
        categoryId: true,
        name: true,
        price: true,
        hasDiscount: true,
        discountPrice: true,
        available: true,
        sortOrder: true,
        category: { select: { name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    loadProductDiscountMap(storeId),
  ]);

  return rows.map((row) => {
    const extra = discounts.get(row.id);
    return {
      id: row.id,
      storeId: row.storeId,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      name: row.name,
      description: "",
      price: row.price,
      hasDiscount: extra?.hasDiscount ?? row.hasDiscount,
      discountPrice: extra?.discountPrice ?? row.discountPrice,
      imageUrl: null,
      images: [],
      available: row.available,
      sortOrder: row.sortOrder,
      optionGroups: [],
    };
  });
}

export async function createProduct(
  storeId: string,
  input: ProductWriteInput,
): Promise<ProductRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("A valid price is required.");
  }

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, storeId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Category not found.");
  }

  const discount = normalizeDiscount(input.price, input.hasDiscount, input.discountPrice);
  const images = normalizeProductImages(input.imageUrl, input.images);

  const row = await prisma.product.create({
    data: {
      store: { connect: { id: storeId } },
      category: { connect: { id: input.categoryId } },
      name,
      description: input.description?.trim() ?? "",
      price: input.price,
      imageUrl: images[0] ?? null,
      available: input.available ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { category: { select: { name: true } } },
  });
  await persistProductDiscount(row.id, discount.hasDiscount, discount.discountPrice);
  await persistProductImages(row.id, images);
  return serializeProduct(
    {
      ...row,
      imageUrl: images[0] ?? null,
      hasDiscount: discount.hasDiscount,
      discountPrice: discount.discountPrice,
    },
    images,
  );
}

export async function updateProduct(
  storeId: string,
  id: string,
  input: ProductWriteInput,
): Promise<ProductRecord> {
  const existing = await prisma.product.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Product not found.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("A valid price is required.");
  }

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, storeId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Category not found.");
  }

  const discount = normalizeDiscount(input.price, input.hasDiscount, input.discountPrice);
  const images = normalizeProductImages(input.imageUrl, input.images);

  const row = await prisma.product.update({
    where: { id },
    data: {
      category: { connect: { id: input.categoryId } },
      name,
      description: input.description?.trim() ?? "",
      price: input.price,
      imageUrl: images[0] ?? null,
      available: input.available ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { category: { select: { name: true } } },
  });
  await persistProductDiscount(id, discount.hasDiscount, discount.discountPrice);
  await persistProductImages(id, images);
  return serializeProduct(
    {
      ...row,
      imageUrl: images[0] ?? null,
      hasDiscount: discount.hasDiscount,
      discountPrice: discount.discountPrice,
    },
    images,
  );
}

export async function setProductAvailability(
  storeId: string,
  id: string,
  available: boolean,
): Promise<ProductRecord> {
  const existing = await prisma.product.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Product not found.");
  }

  const row = await prisma.product.update({
    where: { id },
    data: { available },
    include: { category: { select: { name: true } } },
  });
  const imageMap = await loadProductImagesMap(storeId);
  return serializeProduct(row, imageMap.get(row.id));
}

export async function deleteProduct(storeId: string, id: string): Promise<void> {
  const existing = await prisma.product.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Product not found.");
  }

  try {
    await ensureProductOptionsSchema();
    await prisma.productOptionValue.deleteMany({ where: { group: { productId: id } } });
    await prisma.productOptionGroup.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
  } catch {
    throw new Error("This product is used in existing orders. Mark it unavailable instead.");
  }
}

export async function assertStoreOwnedBy(storeId: string, ownerId: string): Promise<void> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId },
    select: { id: true },
  });
  if (!store) {
    throw new Error("Store not found for this owner.");
  }
}

import "server-only";

import { prisma } from "@/lib/db";
import { ensureProductOptionsSchema } from "@/lib/stores/product-options-schema";
import {
  isProductOptionType,
  type ProductOptionGroupRecord,
  type ProductOptionType,
} from "@/lib/stores/product-options";

export interface ProductOptionGroupWriteInput {
  id?: string;
  name: string;
  type: ProductOptionType;
  required: boolean;
  sortOrder?: number;
  values: Array<{
    id?: string;
    name: string;
    extraPrice?: number;
    colorHex?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
  }>;
}

function serializeGroup(row: {
  id: string;
  name: string;
  type: string;
  required: boolean;
  sortOrder: number;
  values: Array<{
    id: string;
    name: string;
    extraPrice: number;
    colorHex: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }>;
}): ProductOptionGroupRecord {
  return {
    id: row.id,
    name: row.name,
    type: isProductOptionType(row.type) ? row.type : "SINGLE",
    required: Boolean(row.required),
    sortOrder: row.sortOrder,
    values: row.values
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((value) => ({
        id: value.id,
        name: value.name,
        extraPrice: Number(value.extraPrice) || 0,
        colorHex: value.colorHex,
        imageUrl: value.imageUrl,
        sortOrder: value.sortOrder,
      })),
  };
}

export async function loadProductOptionsMap(
  storeId: string,
): Promise<Map<string, ProductOptionGroupRecord[]>> {
  await ensureProductOptionsSchema();
  const rows = await prisma.productOptionGroup.findMany({
    where: { product: { storeId } },
    include: { values: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const map = new Map<string, ProductOptionGroupRecord[]>();
  for (const row of rows) {
    const list = map.get(row.productId) ?? [];
    list.push(serializeGroup(row));
    map.set(row.productId, list);
  }
  return map;
}

export async function replaceProductOptionGroups(
  productId: string,
  groups: ProductOptionGroupWriteInput[],
): Promise<ProductOptionGroupRecord[]> {
  await ensureProductOptionsSchema();
  const cleaned = groups
    .map((group, index) => ({
      ...group,
      name: group.name.trim(),
      sortOrder: group.sortOrder ?? index,
      values: group.values
        .map((value, valueIndex) => ({
          ...value,
          name: value.name.trim(),
          extraPrice: Number.isFinite(value.extraPrice) ? Number(value.extraPrice) : 0,
          colorHex: value.colorHex?.trim() || null,
          imageUrl: value.imageUrl?.trim() || null,
          sortOrder: value.sortOrder ?? valueIndex,
        }))
        .filter((value) => value.name.length > 0),
    }))
    .filter((group) => group.name.length > 0 && (group.type === "TEXT" || group.values.length > 0));

  await prisma.$transaction(async (tx) => {
    await tx.productOptionValue.deleteMany({ where: { group: { productId } } });
    await tx.productOptionGroup.deleteMany({ where: { productId } });
    for (const group of cleaned) {
      await tx.productOptionGroup.create({
        data: {
          productId,
          name: group.name,
          type: group.type,
          required: group.required,
          sortOrder: group.sortOrder,
          values:
            group.type === "TEXT"
              ? undefined
              : {
                  create: group.values.map((value) => ({
                    name: value.name,
                    extraPrice: Math.max(0, value.extraPrice),
                    colorHex: group.type === "COLOR" ? value.colorHex : null,
                    imageUrl: value.imageUrl,
                    sortOrder: value.sortOrder,
                  })),
                },
        },
      });
    }
  });

  const map = await loadProductOptionsMap(
    (
      await prisma.product.findUnique({
        where: { id: productId },
        select: { storeId: true },
      })
    )?.storeId ?? "",
  );
  return map.get(productId) ?? [];
}

export function parseOptionGroupsJson(raw: string): ProductOptionGroupWriteInput[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        return [];
      }
      const row = entry as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name : "";
      const type = typeof row.type === "string" && isProductOptionType(row.type) ? row.type : "SINGLE";
      const values = Array.isArray(row.values)
        ? row.values.flatMap((value, valueIndex) => {
            if (typeof value !== "object" || value === null) {
              return [];
            }
            const item = value as Record<string, unknown>;
            if (typeof item.name !== "string") {
              return [];
            }
            const extra = typeof item.extraPrice === "number" ? item.extraPrice : Number(item.extraPrice);
            return [
              {
                name: item.name,
                extraPrice: Number.isFinite(extra) ? extra : 0,
                colorHex: typeof item.colorHex === "string" ? item.colorHex : null,
                imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
                sortOrder: valueIndex,
              },
            ];
          })
        : [];
      return [
        {
          name,
          type,
          required: row.required === true,
          sortOrder: index,
          values,
        },
      ];
    });
  } catch {
    return [];
  }
}

export type ProductOptionType = "SINGLE" | "COLOR" | "MULTI" | "TEXT";

export interface ProductOptionValueRecord {
  id: string;
  name: string;
  extraPrice: number;
  colorHex: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ProductOptionGroupRecord {
  id: string;
  name: string;
  type: ProductOptionType;
  required: boolean;
  sortOrder: number;
  values: ProductOptionValueRecord[];
}

export interface ProductOptionSelection {
  valueIds: string[];
  note: string;
}

export function isProductOptionType(value: string): value is ProductOptionType {
  return value === "SINGLE" || value === "COLOR" || value === "MULTI" || value === "TEXT";
}

export function emptyOptionSelection(): ProductOptionSelection {
  return { valueIds: [], note: "" };
}

export function hasConfigurableOptions(groups: ProductOptionGroupRecord[]): boolean {
  return groups.some((group) => group.type === "TEXT" || group.values.length > 0);
}

export function cartLineKey(productId: string, selection: ProductOptionSelection): string {
  const ids = [...selection.valueIds].sort().join(",");
  return `${productId}::${ids}::${selection.note.trim()}`;
}

export function optionExtrasTotal(
  groups: ProductOptionGroupRecord[],
  valueIds: string[],
): number {
  const selected = new Set(valueIds);
  let extra = 0;
  for (const group of groups) {
    for (const value of group.values) {
      if (selected.has(value.id)) {
        extra += Number.isFinite(value.extraPrice) ? value.extraPrice : 0;
      }
    }
  }
  return extra;
}

export function optionSummary(
  groups: ProductOptionGroupRecord[],
  selection: ProductOptionSelection,
): string {
  const selected = new Set(selection.valueIds);
  const labels: string[] = [];
  for (const group of groups) {
    if (group.type === "TEXT") {
      if (selection.note.trim()) {
        labels.push(selection.note.trim());
      }
      continue;
    }
    const picked = group.values.filter((value) => selected.has(value.id)).map((value) => value.name);
    if (picked.length > 0) {
      labels.push(picked.join(" + "));
    }
  }
  return labels.join(" · ");
}

export function missingRequiredGroups(
  groups: ProductOptionGroupRecord[],
  selection: ProductOptionSelection,
): ProductOptionGroupRecord[] {
  const selected = new Set(selection.valueIds);
  return groups.filter((group) => {
    if (!group.required) {
      return false;
    }
    if (group.type === "TEXT") {
      return selection.note.trim().length === 0;
    }
    return !group.values.some((value) => selected.has(value.id));
  });
}

export function composedProductName(name: string, summary: string): string {
  return summary ? `${name} · ${summary}` : name;
}

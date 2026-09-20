"use client";

import { Palette, Plus, Trash2, Type } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { ProductOptionType } from "@/lib/stores/product-options";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export interface OptionValueDraft {
  key: string;
  name: string;
  extraPrice: number;
  colorHex: string;
}

export interface OptionGroupDraft {
  key: string;
  name: string;
  type: ProductOptionType;
  required: boolean;
  values: OptionValueDraft[];
}

export function emptyOptionValue(): OptionValueDraft {
  return { key: crypto.randomUUID(), name: "", extraPrice: 0, colorHex: "#e9b71f" };
}

export function emptyOptionGroup(type: ProductOptionType, name = ""): OptionGroupDraft {
  return {
    key: crypto.randomUUID(),
    name,
    type,
    required: type !== "MULTI" && type !== "TEXT",
    values: type === "TEXT" ? [] : [emptyOptionValue()],
  };
}

export function ProductOptionBuilder({
  groups,
  onChange,
}: {
  groups: OptionGroupDraft[];
  onChange: (groups: OptionGroupDraft[]) => void;
}): ReactNode {
  const { t } = useLocale();

  const updateGroup = (key: string, patch: Partial<OptionGroupDraft>): void => {
    onChange(groups.map((group) => (group.key === key ? { ...group, ...patch } : group)));
  };

  const updateValue = (groupKey: string, valueKey: string, patch: Partial<OptionValueDraft>): void => {
    onChange(
      groups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              values: group.values.map((value) => (value.key === valueKey ? { ...value, ...patch } : value)),
            }
          : group,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("vendor.optionGroups")}</p>
          <p className="text-[11px] text-muted-foreground">{t("vendor.optionGroupsHint")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" onPress={() => onChange([...groups, emptyOptionGroup("COLOR", t("vendor.optionPresetColors"))])}>
            <Palette data-icon="inline-start" />
            {t("vendor.optionPresetColors")}
          </Button>
          <Button type="button" size="sm" variant="outline" onPress={() => onChange([...groups, emptyOptionGroup("SINGLE", t("vendor.optionPresetSizes"))])}>
            {t("vendor.optionPresetSizes")}
          </Button>
          <Button type="button" size="sm" variant="outline" onPress={() => onChange([...groups, emptyOptionGroup("MULTI", t("vendor.optionPresetPack"))])}>
            {t("vendor.optionPresetPack")}
          </Button>
          <Button type="button" size="sm" variant="outline" onPress={() => onChange([...groups, emptyOptionGroup("TEXT", t("vendor.optionPresetNote"))])}>
            {t("vendor.optionPresetNote")}
          </Button>
          <Button type="button" size="sm" onPress={() => onChange([...groups, emptyOptionGroup("SINGLE")])}>
            <Plus data-icon="inline-start" />
            {t("vendor.addOptionGroup")}
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
          {t("vendor.emptyOptionGroups")}
        </p>
      ) : null}

      {groups.map((group) => (
        <article key={group.key} className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
            <input
              value={group.name}
              onChange={(event) => updateGroup(group.key, { name: event.target.value })}
              placeholder={t("vendor.optionGroupName")}
              className={fieldClass}
            />
            <select
              value={group.type}
              onChange={(event) =>
                updateGroup(group.key, {
                  type: event.target.value as ProductOptionType,
                  values: event.target.value === "TEXT" ? [] : group.values.length > 0 ? group.values : [emptyOptionValue()],
                })
              }
              className={fieldClass}
            >
              <option value="SINGLE">{t("vendor.optionTypeSingle")}</option>
              <option value="COLOR">{t("vendor.optionTypeColor")}</option>
              <option value="MULTI">{t("vendor.optionTypeMulti")}</option>
              <option value="TEXT">{t("vendor.optionTypeText")}</option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onPress={() => onChange(groups.filter((item) => item.key !== group.key))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={group.required}
              onChange={(event) => updateGroup(group.key, { required: event.target.checked })}
            />
            {t("vendor.optionRequired")}
          </label>

          {group.type === "TEXT" ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Type className="size-3.5" />
              {t("vendor.optionTextHint")}
            </p>
          ) : (
            <div className="space-y-2">
              {group.values.map((value) => (
                <div key={value.key} className="grid gap-2 sm:grid-cols-[1fr_6.5rem_auto_auto]">
                  <input
                    value={value.name}
                    onChange={(event) => updateValue(group.key, value.key, { name: event.target.value })}
                    placeholder={t("vendor.optionValueName")}
                    className={fieldClass}
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.extraPrice || ""}
                    onChange={(event) =>
                      updateValue(group.key, value.key, { extraPrice: Number(event.target.value) || 0 })
                    }
                    placeholder={t("vendor.optionExtraPrice")}
                    className={fieldClass}
                  />
                  {group.type === "COLOR" ? (
                    <input
                      type="color"
                      value={value.colorHex || "#e9b71f"}
                      onChange={(event) => updateValue(group.key, value.key, { colorHex: event.target.value })}
                      className={cn(fieldClass, "w-14 cursor-pointer p-1")}
                    />
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onPress={() =>
                      updateGroup(group.key, { values: group.values.filter((item) => item.key !== value.key) })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onPress={() => updateGroup(group.key, { values: [...group.values, emptyOptionValue()] })}
              >
                <Plus data-icon="inline-start" />
                {t("vendor.addOptionValue")}
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

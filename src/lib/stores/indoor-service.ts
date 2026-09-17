export function storeUsesDineInTables(storeType: { icon: string; name: string }): boolean {
  return storeType.icon === "utensils" || /مطعم|restaurant/i.test(storeType.name);
}

export const DINE_IN_SOURCE = "DINE_IN";
export const DINE_IN_GUEST_PHONE = "COUNTER";

export function isDineInFulfillment(value: string | null | undefined): boolean {
  return value === "DINE_IN";
}

export function isRealCustomerPhone(phone: string | null | undefined): boolean {
  return (phone ?? "").replace(/\D/g, "").length >= 8;
}

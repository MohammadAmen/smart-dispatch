export const MENU_CHECKOUT_KEY = "sd-menu-checkout-v1";

export interface MenuCheckoutDraft {
  phone: string;
  guestName: string;
  street: string;
  apartment: string;
  notes: string;
  labeledAddress: string;
  latitude: number | null;
  longitude: number | null;
}

export function emptyCheckoutDraft(phone = ""): MenuCheckoutDraft {
  return {
    phone,
    guestName: "",
    street: "",
    apartment: "",
    notes: "",
    labeledAddress: "",
    latitude: null,
    longitude: null,
  };
}

export function composeDeliveryAddress(draft: MenuCheckoutDraft): string {
  const parts = [draft.street || draft.labeledAddress, draft.apartment, draft.notes]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.join(" — ");
}

export function readCheckoutDraft(phone = ""): MenuCheckoutDraft {
  const fallback = emptyCheckoutDraft(phone);
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(MENU_CHECKOUT_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return fallback;
    }

    const row = parsed as Record<string, unknown>;
    return {
      phone: typeof row.phone === "string" && row.phone.trim() ? row.phone : phone,
      guestName: typeof row.guestName === "string" ? row.guestName : "",
      street: typeof row.street === "string" ? row.street : "",
      apartment: typeof row.apartment === "string" ? row.apartment : "",
      notes: typeof row.notes === "string" ? row.notes : "",
      labeledAddress: typeof row.labeledAddress === "string" ? row.labeledAddress : "",
      latitude: typeof row.latitude === "number" && Number.isFinite(row.latitude) ? row.latitude : null,
      longitude:
        typeof row.longitude === "number" && Number.isFinite(row.longitude) ? row.longitude : null,
    };
  } catch {
    return fallback;
  }
}

export function writeCheckoutDraft(draft: MenuCheckoutDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MENU_CHECKOUT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode can block storage.
  }
}

export function locationLabel(draft: MenuCheckoutDraft, fallback: string): string {
  const text = draft.street.trim() || draft.labeledAddress.trim();
  return text.length > 0 ? text : fallback;
}

export function hasValidCoords(draft: MenuCheckoutDraft): boolean {
  return (
    draft.latitude != null &&
    draft.longitude != null &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude)
  );
}

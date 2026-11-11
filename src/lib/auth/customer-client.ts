import { useMenuUiStore } from "@/stores/menu-ui-store";

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export const CUSTOMER_AUTH_EVENT = "beev-customer-auth";
export const CUSTOMER_READY_EVENT = "beev-customer-ready";

/** Close the cart first so the profile gate never sits underneath the checkout sheet. */
export function requestCustomerAuth(): void {
  if (typeof window === "undefined") {
    return;
  }
  useMenuUiStore.getState().closeCart();
  window.dispatchEvent(new Event(CUSTOMER_AUTH_EVENT));
}

export async function fetchCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    const response = await fetch("/api/auth/customer", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { ok?: boolean; user?: CustomerProfile };
    if (!body.ok || !body.user?.phone || !body.user.name) {
      return null;
    }
    return body.user;
  } catch {
    return null;
  }
}

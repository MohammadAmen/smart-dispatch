export const MENU_OPEN_CART_EVENT = "beev-menu-open-cart";
export const MENU_OPEN_SAVED_EVENT = "beev-menu-open-saved";
export const MENU_CHECKOUT_STATE_EVENT = "beev-menu-checkout-state";

export function requestMenuCartOpen(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(MENU_OPEN_CART_EVENT));
}

export function requestMenuSavedOpen(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(MENU_OPEN_SAVED_EVENT));
}

export function publishMenuCheckoutState(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ open: boolean }>(MENU_CHECKOUT_STATE_EVENT, {
      detail: { open },
    }),
  );
  document.documentElement.dataset.menuCheckout = open ? "1" : "0";
}

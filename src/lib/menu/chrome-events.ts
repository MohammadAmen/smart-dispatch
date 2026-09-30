export const MENU_OPEN_CART_EVENT = "beev-menu-open-cart";
export const MENU_OPEN_SAVED_EVENT = "beev-menu-open-saved";

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

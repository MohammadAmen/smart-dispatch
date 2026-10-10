export const DRIVER_OFFER_SECONDS = 50;
/** Accept window after the phone rings, plus a short network buffer. */
export const DRIVER_OFFER_STALE_MS = (DRIVER_OFFER_SECONDS + 5) * 1000;
/** How long an offer may wait for the phone to ring before it is reassigned. */
export const DRIVER_OFFER_UNSEEN_MS = 90_000;

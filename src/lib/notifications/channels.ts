export const CUSTOMER_CHANNEL_ID = "beev_customer";
/** Fresh id so Android applies ringtone importance. Existing channels cannot be upgraded. */
export const DRIVER_CHANNEL_ID = "beev_driver_call";
export const DRIVER_SOUND = "beev_driver";

export type PushAudience = "customer" | "driver";

export function channelIdForAudience(audience: PushAudience): string {
  return audience === "driver" ? DRIVER_CHANNEL_ID : CUSTOMER_CHANNEL_ID;
}

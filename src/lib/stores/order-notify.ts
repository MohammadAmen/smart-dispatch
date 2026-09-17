import "server-only";

import { sendWhatsAppText } from "@/lib/whatsapp/baileys-service";
import { customerOrderTrackingUrl } from "@/lib/stores/public-url";

export async function notifyCustomerOrderUpdate(input: {
  phone: string;
  orderNumber: string;
  trackingToken?: string | null;
  kind: "placed" | "ready" | "transit" | "canceled" | "custom_placed" | "quoted" | "scheduled";
  reason?: string;
  quotedPrice?: number;
}): Promise<void> {
  const trackingUrl = input.trackingToken
    ? customerOrderTrackingUrl(input.trackingToken)
    : null;
  const trackingLines = trackingUrl
    ? ["تتبع طلبك / Track your order:", trackingUrl]
    : [];
  const priceLine =
    input.quotedPrice != null
      ? [`السعر المقترح: ${input.quotedPrice}`, `Quoted price: ${input.quotedPrice}`]
      : [];
  const lines =
    input.kind === "placed"
      ? [
          `تم استلام طلبك ${input.orderNumber} بنجاح.`,
          `Your order ${input.orderNumber} was received.`,
          ...trackingLines,
        ]
      : input.kind === "custom_placed"
        ? [
            `تم استلام طلبك الخاص ${input.orderNumber} وهو بانتظار تسعير المتجر.`,
            `Your custom order ${input.orderNumber} was received and is waiting for a store quote.`,
            ...trackingLines,
          ]
        : input.kind === "quoted"
          ? [
              `حدد المتجر سعر طلبك ${input.orderNumber}. افتح الرابط للتأكيد والدفع.`,
              `A quote is ready for order ${input.orderNumber}. Open the link to confirm.`,
              ...priceLine,
              ...trackingLines,
            ]
          : input.kind === "scheduled"
            ? [
                `تم تأكيد طلبك المجدول ${input.orderNumber}. سيُجهَّز قبل موعد التسليم.`,
                `Your scheduled order ${input.orderNumber} is confirmed. We’ll prepare it before delivery time.`,
                ...trackingLines,
              ]
            : input.kind === "ready"
        ? [
            `طلبك ${input.orderNumber} جاهز للتوصيل، وسيخرج في الطريق إليك قريباً.`,
            `Your order ${input.orderNumber} is ready and will be on the way shortly.`,
            ...trackingLines,
          ]
        : input.kind === "canceled"
          ? [
              `تم إلغاء طلبك ${input.orderNumber}.`,
              input.reason ? `السبب: ${input.reason}` : "",
              `Your order ${input.orderNumber} was canceled.`,
              input.reason ? `Reason: ${input.reason}` : "",
              ...trackingLines,
            ].filter((line) => line.length > 0)
          : [
              `طلبك ${input.orderNumber} في الطريق إليك الآن.`,
              `Your order ${input.orderNumber} is on the way.`,
              ...trackingLines,
            ];

  await sendWhatsAppText(input.phone, lines.join("\n"));
}


/** Stable QR payload for settlement invoice verification / archival. */
export function buildPayoutInvoiceQrPayload(input: {
  invoiceNumber: string
  settlementId: string
  commissionTotal: number
  storeName: string
}): string {
  return [
    "BEEV-INV",
    input.invoiceNumber.trim(),
    input.settlementId.trim(),
    String(Math.round(input.commissionTotal * 100) / 100),
    input.storeName.trim().slice(0, 48),
  ].join("|");
}

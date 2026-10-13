/** Client-safe delivery proof helpers (QR payload + code parsing). */

export const DELIVERY_PROOF_CODE_LENGTH = 6;

const QR_PREFIX = "BEEV1";

export function buildDeliveryProofQrPayload(orderNumber: string, code: string): string {
  return `${QR_PREFIX}|${orderNumber.trim()}|${code.trim()}`;
}

export function parseDeliveryProofQrPayload(
  raw: string,
): { orderNumber: string | null; code: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4,8}$/.test(trimmed)) {
    return { orderNumber: null, code: trimmed };
  }

  const pipe = trimmed.split("|");
  if (pipe[0] === QR_PREFIX && pipe.length >= 3) {
    const code = pipe[pipe.length - 1]?.trim() ?? "";
    if (/^\d{4,8}$/.test(code)) {
      return { orderNumber: pipe[1]?.trim() || null, code };
    }
  }

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code") ?? url.searchParams.get("otp");
    if (code && /^\d{4,8}$/.test(code.trim())) {
      return {
        orderNumber: url.searchParams.get("order") ?? url.searchParams.get("o"),
        code: code.trim(),
      };
    }
  } catch {
    // not a URL
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4 && digits.length <= 8) {
    return { orderNumber: null, code: digits.slice(-DELIVERY_PROOF_CODE_LENGTH) };
  }

  return null;
}

export function isValidDeliveryProofCode(value: string): boolean {
  return /^\d{4,8}$/.test(value.trim());
}

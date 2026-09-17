export function whatsappDigits(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `963${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith("9")) {
    digits = `963${digits}`;
  }

  return digits;
}

export function whatsappHref(phone: string, text?: string): string | null {
  const digits = whatsappDigits(phone);
  if (!digits) {
    return null;
  }

  const url = `https://wa.me/${digits}`;
  if (!text?.trim()) {
    return url;
  }

  return `${url}?text=${encodeURIComponent(text)}`;
}

export function supportWhatsAppPhone(storePhone?: string | null): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || "";
  const fromStore = storePhone?.trim() || "";
  return fromStore || configured || null;
}

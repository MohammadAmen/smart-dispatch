export function whatsappHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : `tel:${phone}`;
}

export function storyActionHref(story: {
  actionType: string;
  contactNumber: string | null;
  externalLink: string | null;
}): string | null {
  if (story.actionType === "EXTERNAL_LINK" && story.externalLink?.trim()) {
    return story.externalLink.trim();
  }
  if (story.contactNumber?.trim()) {
    return whatsappHref(story.contactNumber.trim());
  }
  return null;
}

import "server-only";

import { prisma } from "@/lib/db";

const UPLOAD_PREFIX = "/api/uploads/";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UploadFolder = "products" | "stores" | "offers" | "custom" | "stories";

export function uploadPublicPath(id: string): string {
  return `${UPLOAD_PREFIX}${id}`;
}

export function parseUploadId(url: string | null | undefined): string | null {
  const value = url?.trim() ?? "";
  if (!value.startsWith(UPLOAD_PREFIX)) {
    return null;
  }
  const id = value.slice(UPLOAD_PREFIX.length).split("?")[0]?.trim() ?? "";
  return UUID_RE.test(id) ? id : null;
}

function toPrismaBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy;
}

export async function persistUpload(input: {
  folder: UploadFolder;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<string> {
  const row = await prisma.upload.create({
    data: {
      folder: input.folder,
      mimeType: input.mimeType,
      bytes: toPrismaBytes(input.bytes),
    },
    select: { id: true },
  });
  return uploadPublicPath(row.id);
}

export async function loadUpload(id: string): Promise<{
  mimeType: string;
  bytes: Uint8Array;
} | null> {
  if (!UUID_RE.test(id)) {
    return null;
  }
  const row = await prisma.upload.findUnique({
    where: { id },
    select: { mimeType: true, bytes: true },
  });
  if (!row) {
    return null;
  }
  return {
    mimeType: row.mimeType,
    bytes: row.bytes,
  };
}

export async function deletePersistedUpload(url: string | null | undefined): Promise<void> {
  const id = parseUploadId(url);
  if (!id) {
    return;
  }
  try {
    await prisma.upload.delete({ where: { id } });
  } catch {
    // Already removed.
  }
}

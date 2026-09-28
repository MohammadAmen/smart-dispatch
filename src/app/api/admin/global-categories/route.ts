import { NextResponse } from "next/server";

import { SUPER_ADMIN_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import {
  createGlobalCategory,
  listAdminGlobalCategories,
} from "@/lib/stores/global-categories-admin";
import { isImageFile, saveUploadedImage } from "@/lib/stores/product-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const session = await requireRoles(SUPER_ADMIN_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeTypeId = searchParams.get("storeTypeId");
    const items = await listAdminGlobalCategories(storeTypeId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[admin/global-categories]", error);
    return NextResponse.json({ ok: false, items: [], error: "Failed." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireRoles(SUPER_ADMIN_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let name = "";
    let storeTypeId = "";
    let icon = "📦";
    let imageUrl: string | null = null;
    let sortOrder = 0;
    let isOther = false;
    let active = true;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = String(form.get("name") ?? "");
      storeTypeId = String(form.get("storeTypeId") ?? "");
      icon = String(form.get("icon") ?? "📦") || "📦";
      sortOrder = Number.parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0;
      isOther = form.get("isOther") === "true" || form.get("isOther") === "on";
      active = form.get("active") !== "false" && form.get("active") !== "off";
      const file = form.get("image");
      if (isImageFile(file)) {
        imageUrl = await saveUploadedImage(file, "custom");
      } else {
        const raw = form.get("imageUrl");
        imageUrl = typeof raw === "string" && raw.trim() ? raw.trim() : null;
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      name = typeof body.name === "string" ? body.name : "";
      storeTypeId = typeof body.storeTypeId === "string" ? body.storeTypeId : "";
      icon = typeof body.icon === "string" && body.icon ? body.icon : "📦";
      imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
      sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
      isOther = body.isOther === true;
      active = body.active !== false;
    }

    const item = await createGlobalCategory({
      name,
      storeTypeId,
      icon,
      imageUrl,
      sortOrder,
      isOther,
      active,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

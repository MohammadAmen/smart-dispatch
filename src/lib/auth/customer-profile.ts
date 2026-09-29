import "server-only";

import { randomBytes } from "node:crypto";

import { isSessionRole, type SessionRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { normalizePhone } from "@/lib/dispatch/whatsapp";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { isRealCustomerPhone } from "@/lib/stores/indoor-service";

export interface PhoneSessionUser {
  id: string;
  name: string;
  phone: string;
  role: SessionRole;
  fcmToken: string | null;
}

export async function readPhoneSessionUser(): Promise<PhoneSessionUser | null> {
  const session = await readSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, phone: true, role: true, fcmToken: true },
  });

  if (!user || !isSessionRole(user.role) || !isRealCustomerPhone(user.phone)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    fcmToken: user.fcmToken,
  };
}

export async function upsertCustomerByPhone(
  name: string,
  rawPhone: string,
): Promise<{ ok: true; user: PhoneSessionUser } | { ok: false; error: "invalid" | "staff-phone" }> {
  const trimmedName = name.trim().slice(0, 80);
  const phone = normalizePhone(rawPhone);
  if (trimmedName.length < 2 || !isRealCustomerPhone(phone)) {
    return { ok: false, error: "invalid" };
  }

  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, name: true, phone: true, role: true, fcmToken: true },
  });

  if (existing && existing.role !== "CUSTOMER") {
    return { ok: false, error: "staff-phone" };
  }

  if (existing && isSessionRole(existing.role)) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { name: trimmedName },
      select: { id: true, name: true, phone: true, role: true, fcmToken: true },
    });
    if (!isSessionRole(updated.role)) {
      return { ok: false, error: "invalid" };
    }
    return {
      ok: true,
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
        fcmToken: updated.fcmToken,
      },
    };
  }

  const suffix = phone.replace(/\D/g, "").slice(-8) || Date.now().toString(36);
  const created = await prisma.user.create({
    data: {
      name: trimmedName,
      email: `customer.${suffix}.${randomBytes(4).toString("hex")}@customers.smart-dispatch.local`,
      phone,
      role: "CUSTOMER",
      language: "ar",
      passwordHash: hashPassword(randomBytes(24).toString("hex")),
    },
    select: { id: true, name: true, phone: true, role: true, fcmToken: true },
  });

  if (!isSessionRole(created.role)) {
    return { ok: false, error: "invalid" };
  }

  return {
    ok: true,
    user: {
      id: created.id,
      name: created.name,
      phone: created.phone,
      role: created.role,
      fcmToken: created.fcmToken,
    },
  };
}

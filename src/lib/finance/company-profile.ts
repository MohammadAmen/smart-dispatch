import "server-only";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { ensureFinanceSchema } from "@/lib/finance/ensure-schema";
import { prisma } from "@/lib/db";

export interface CompanyProfile {
  legalName: string
  tradeName: string
  taxId: string
  registrationNumber: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  logoUrl: string
  invoiceFooter: string
  bankName: string
  bankIban: string
  bankAccountName: string
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  legalName: BRAND_NAME,
  tradeName: BRAND_NAME,
  taxId: "",
  registrationNumber: "",
  address: "",
  city: "",
  country: "سوريا",
  phone: "",
  email: "",
  website: "",
  logoUrl: BRAND_LOGO_SRC,
  invoiceFooter: "شكراً لشراكتكم معنا.",
  bankName: "",
  bankIban: "",
  bankAccountName: "",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeCompanyProfile(
  input: Partial<CompanyProfile> | null | undefined,
): CompanyProfile {
  const next = { ...DEFAULT_COMPANY_PROFILE, ...(input ?? {}) };
  return {
    legalName: asString(next.legalName) || DEFAULT_COMPANY_PROFILE.legalName,
    tradeName: asString(next.tradeName) || asString(next.legalName) || DEFAULT_COMPANY_PROFILE.tradeName,
    taxId: asString(next.taxId),
    registrationNumber: asString(next.registrationNumber),
    address: asString(next.address),
    city: asString(next.city),
    country: asString(next.country) || DEFAULT_COMPANY_PROFILE.country,
    phone: asString(next.phone),
    email: asString(next.email),
    website: asString(next.website),
    logoUrl: asString(next.logoUrl) || DEFAULT_COMPANY_PROFILE.logoUrl,
    invoiceFooter: asString(next.invoiceFooter) || DEFAULT_COMPANY_PROFILE.invoiceFooter,
    bankName: asString(next.bankName),
    bankIban: asString(next.bankIban),
    bankAccountName: asString(next.bankAccountName),
  };
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  await ensureFinanceSchema();
  try {
    const rows = await prisma.$queryRaw<{ companyJson: string | null }[]>`
      SELECT "companyJson" FROM app_config WHERE id = 'default' LIMIT 1
    `;
    const raw = rows[0]?.companyJson;
    if (!raw) {
      return normalizeCompanyProfile(null);
    }
    return normalizeCompanyProfile(JSON.parse(raw) as Partial<CompanyProfile>);
  } catch {
    return normalizeCompanyProfile(null);
  }
}

export async function updateCompanyProfile(
  patch: Partial<CompanyProfile>,
): Promise<CompanyProfile> {
  await ensureFinanceSchema();
  const current = await getCompanyProfile();
  const next = normalizeCompanyProfile({ ...current, ...patch });
  const payload = JSON.stringify(next);
  await prisma.$executeRaw`
    UPDATE app_config
    SET "companyJson" = ${payload}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = 'default'
  `;
  return next;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { decideAccess } from "@/lib/auth/middleware";
import { decodeSession } from "@/lib/auth/session-cookie";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const decision = decideAccess(pathname, session?.role ?? null);

  let response: NextResponse;

  if (decision.action === "login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    const locale = request.cookies.get(LOCALE_COOKIE)?.value;
    loginUrl.pathname = isLocale(locale) ? `/${locale}/login` : "/login";
    loginUrl.searchParams.set("next", decision.next);
    response = NextResponse.redirect(loginUrl);
  } else if (decision.action === "redirect") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }

    const target = request.nextUrl.clone();
    target.pathname = decision.to || "/dashboard";
    target.search = "";
    response = NextResponse.redirect(target);
  } else {
    response = NextResponse.next();
  }

  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(current)) {
    response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

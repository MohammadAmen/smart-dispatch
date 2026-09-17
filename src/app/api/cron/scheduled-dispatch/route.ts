import { readSession } from "@/lib/auth/server";
import { isDispatchRole, isSuperAdminRole } from "@/lib/auth/constants";
import { runScheduledDispatch } from "@/lib/dispatch/scheduled-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret && header === `Bearer ${secret}`) {
    return true;
  }

  const session = await readSession();
  return Boolean(session && (isDispatchRole(session.role) || isSuperAdminRole(session.role)));
}

export async function POST(request: Request): Promise<Response> {
  if (!(await authorized(request))) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runScheduledDispatch();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled dispatch failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}

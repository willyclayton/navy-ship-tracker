import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50_000);
  try {
    await fetch(new URL("/", request.url), {
      cache: "no-store",
      headers: { "user-agent": "ship-tracker-morning-refresh" },
      signal: controller.signal,
    });
  } catch {
    // Path is stale; the next visitor regenerates if this warm fetch fails.
  } finally {
    clearTimeout(timer);
  }

  return Response.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
  });
}

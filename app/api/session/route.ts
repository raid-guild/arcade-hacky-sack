import { NextResponse } from "next/server";
import { getOptionalSession, portalModulesUrl } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOptionalSession();
  return NextResponse.json({
    authenticated: Boolean(session.playerId),
    handle: session.handle ?? null,
    portalUrl: portalModulesUrl(),
  });
}

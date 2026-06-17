import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-auth";
import { getDayStats, parseDayWindow } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireAgentAuth(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const window = parseDayWindow(searchParams.get("date"), searchParams.get("tz"));

  if (!window) {
    return NextResponse.json(
      { error: "invalid date or timezone" },
      { status: 400 }
    );
  }

  return NextResponse.json(await getDayStats(window));
}


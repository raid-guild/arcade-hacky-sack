import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-auth";
import { getTopScores, parseDayWindow, parseLimit } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireAgentAuth(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "all-time";
  const limit = parseLimit(searchParams.get("limit"));

  if (limit == null) {
    return NextResponse.json({ error: "invalid limit" }, { status: 400 });
  }

  if (scope === "all-time") {
    return NextResponse.json({
      scope,
      limit,
      scores: await getTopScores({ limit }),
    });
  }

  if (scope === "day") {
    const window = parseDayWindow(
      searchParams.get("date"),
      searchParams.get("tz")
    );

    if (!window) {
      return NextResponse.json(
        { error: "invalid date or timezone" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      scope,
      date: window.date,
      tz: window.tz,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      limit,
      scores: await getTopScores({ limit, window }),
    });
  }

  return NextResponse.json({ error: "invalid scope" }, { status: 400 });
}


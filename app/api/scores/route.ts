import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session.playerId) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { score, durationMs } = body as Record<string, unknown>;
  if (
    !isBoundedInt(score, 10_000_000) ||
    !isBoundedInt(durationMs, 1000 * 60 * 60 * 12)
  ) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 });
  }

  try {
    await db().insert(schema.hackThySackGames).values({
      playerId: session.playerId,
      score,
      durationMs,
    });
  } catch (err) {
    if (isMissingDatabase(err)) {
      return NextResponse.json(
        { error: "database not configured" },
        { status: 503 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getOptionalSession();

  try {
    const top = await db()
      .select({
        handle: schema.players.handle,
        score: schema.hackThySackGames.score,
        playedAt: schema.hackThySackGames.createdAt,
      })
      .from(schema.hackThySackGames)
      .innerJoin(
        schema.players,
        eq(schema.hackThySackGames.playerId, schema.players.id)
      )
      .orderBy(desc(schema.hackThySackGames.score))
      .limit(10);

    let personalBest: number | null = null;
    if (session.playerId) {
      const [row] = await db()
        .select({ best: sql<number>`max(${schema.hackThySackGames.score})` })
        .from(schema.hackThySackGames)
        .where(eq(schema.hackThySackGames.playerId, session.playerId));
      personalBest = row?.best ?? null;
    }

    return NextResponse.json({ top, personalBest });
  } catch (err) {
    if (isMissingDatabase(err)) {
      return NextResponse.json({ top: [], personalBest: null });
    }
    throw err;
  }
}

function isBoundedInt(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
}

function isMissingDatabase(err: unknown) {
  return err instanceof Error && err.message === "DATABASE_URL is not set";
}

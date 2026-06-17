import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession, portalModulesUrl } from "@/lib/session";
import { LaunchTokenError, verifyLaunchToken } from "@/lib/launch-token";

// Portal launch entry point (plan §5):
//   GET /api/auth/callback?token=<JWT>
// Also re-exported for Portal-compatible callback URLs:
//   GET /portal/callback?token=<JWT>
// Verify, upsert the player (handle is a snapshot — refresh it each
// launch), set the session cookie, land on the start screen. Any
// failure — including the designed back-button-after-TTL revisit —
// goes back to the Portal modules page.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return redirectToLaunchError("missing_token");
  }

  try {
    const claims = await verifyLaunchToken(token);

    const [player] = await db()
      .insert(schema.players)
      .values({
        profileId: claims.profileId,
        handle: claims.handle,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.players.profileId,
        set: { handle: claims.handle, lastSeenAt: new Date() },
      })
      .returning();

    const session = await getSession();
    session.playerId = player.id;
    session.profileId = claims.profileId;
    session.handle = claims.handle;
    await session.save();

    return redirectTo("/");
  } catch (err) {
    const reason = launchErrorCode(err);
    console.error("Portal launch rejected", launchErrorLog(err));
    return redirectToLaunchError(reason);
  }
}

function redirectToLaunchError(reason: string) {
  return redirectTo(`/launch-error?reason=${encodeURIComponent(reason)}`);
}

function redirectTo(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}

function launchErrorCode(err: unknown) {
  if (err instanceof LaunchTokenError) return err.code;
  if (err instanceof Error && err.message === "SESSION_SECRET is not set") {
    return "missing_session_secret";
  }
  if (err instanceof Error && err.message === "DATABASE_URL is not set") {
    return "missing_database_url";
  }
  return "callback_failed";
}

function launchErrorLog(err: unknown) {
  if (err instanceof LaunchTokenError) {
    return {
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }
  if (err instanceof Error) {
    return {
      code: launchErrorCode(err),
      message: err.message,
    };
  }
  return { code: "callback_failed" };
}

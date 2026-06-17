import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

// Stateless signed+encrypted cookie session (plan §4) — no session table.

export interface SessionData {
  playerId?: string; // players.id
  profileId?: string;
  handle?: string;
}

function sessionOptions(): SessionOptions {
  const password =
    process.env.SESSION_SECRET ?? "dev-only-secret-change-me-32chars!!";
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set");
  }

  return {
    cookieName: "hack-thy-sack-session",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function getOptionalSession(): Promise<SessionData> {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    return {};
  }

  return getSession();
}

export function portalModulesUrl() {
  return process.env.PORTAL_MODULES_URL ?? "https://portal.raidguild.org/modules";
}

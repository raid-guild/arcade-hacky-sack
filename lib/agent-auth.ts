import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_ENV = "HACK_THY_SACK_AGENT_API_TOKEN";

export function requireAgentAuth(req: NextRequest): NextResponse | null {
  const expected = process.env[TOKEN_ENV];
  const actual = bearerToken(req);

  if (!expected || !actual || !timingSafeTokenEqual(actual, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}

function bearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const [scheme, token] = authorization?.split(/\s+/, 2) ?? [];
  if (scheme?.toLowerCase() !== "bearer") return null;
  return token || null;
}

function timingSafeTokenEqual(a: string, b: string) {
  const aHash = sha256(a);
  const bHash = sha256(b);
  return timingSafeEqual(aHash, bHash);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

import { decodeJwt, errors as joseErrors, jwtVerify } from "jose";

// Portal external-module launch token (plan §5): short-TTL JWT, HS256
// signed with the per-module secret. Claims used: profileID + handle/name
// only (Q9).

export interface LaunchClaims {
  profileId: string;
  handle: string;
}

export class LaunchTokenError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "LaunchTokenError";
  }
}

export async function verifyLaunchToken(token: string): Promise<LaunchClaims> {
  const secret = process.env.MODULE_LAUNCH_SECRET;
  if (!secret) throw new LaunchTokenError("MODULE_LAUNCH_SECRET is not set", "missing_secret");
  const issuer = process.env.PORTAL_ISSUER;
  if (!issuer) throw new LaunchTokenError("PORTAL_ISSUER is not set", "missing_issuer");
  const moduleSlug = process.env.MODULE_SLUG;
  if (!moduleSlug) throw new LaunchTokenError("MODULE_SLUG is not set", "missing_module_slug");

  const untrusted = decodeLaunchSummary(token);

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    ({ payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer,
        audience: moduleSlug,
      }
    ));
  } catch (err) {
    throw new LaunchTokenError("launch token failed JWT verification", jwtErrorCode(err), {
      expectedIssuer: issuer,
      expectedAudience: moduleSlug,
      token: untrusted,
    });
  }

  if (payload.typ !== "portal_module_launch") {
    throw new LaunchTokenError("launch token has invalid typ claim", "invalid_typ", {
      expectedTyp: "portal_module_launch",
      actualTyp: payload.typ,
    });
  }
  if (payload.moduleSlug !== moduleSlug) {
    throw new LaunchTokenError("launch token has invalid moduleSlug claim", "invalid_module_slug", {
      expectedModuleSlug: moduleSlug,
      actualModuleSlug: payload.moduleSlug,
    });
  }

  const profileId = stringClaim(payload.profileID) ?? stringClaim(payload.profileId);
  const userId = stringClaim(payload.userID) ?? stringClaim(payload.userId);
  const subject = stringClaim(payload.sub);
  const identity = profileId ?? userId ?? subject;
  const handle =
    stringClaim(payload.handle) ??
    stringClaim(payload.name) ??
    (identity ? `member-${identity}` : undefined);

  if (!identity || !handle) {
    throw new LaunchTokenError("launch token missing identity/handle claims", "missing_identity", {
      hasProfileID: payload.profileID !== undefined || payload.profileId !== undefined,
      hasUserID: payload.userID !== undefined || payload.userId !== undefined,
      hasSub: payload.sub !== undefined,
      hasHandle: payload.handle !== undefined || payload.name !== undefined,
    });
  }
  return { profileId: identity, handle };
}

function stringClaim(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function decodeLaunchSummary(token: string) {
  try {
    const payload = decodeJwt(token);
    return {
      iss: payload.iss,
      aud: payload.aud,
      typ: payload.typ,
      moduleSlug: payload.moduleSlug,
      exp: payload.exp,
      hasProfileID: payload.profileID !== undefined || payload.profileId !== undefined,
      hasUserID: payload.userID !== undefined || payload.userId !== undefined,
      hasSub: payload.sub !== undefined,
      hasHandle: payload.handle !== undefined || payload.name !== undefined,
    };
  } catch {
    return { malformed: true };
  }
}

function jwtErrorCode(err: unknown) {
  if (err instanceof joseErrors.JWTExpired) return "expired";
  if (err instanceof joseErrors.JWTClaimValidationFailed) {
    return `invalid_${err.claim}`;
  }
  if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
    return "invalid_signature";
  }
  return "invalid_jwt";
}

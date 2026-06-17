import Link from "next/link";
import { portalModulesUrl } from "@/lib/session";

const REASONS: Record<string, string> = {
  callback_failed: "The Portal launch could not be completed.",
  expired: "The Portal launch link expired.",
  invalid_aud: "The Portal launch audience does not match this app.",
  invalid_iss: "The Portal launch issuer does not match this app.",
  invalid_jwt: "The Portal launch token is invalid.",
  invalid_module_slug: "The Portal module slug does not match this app.",
  invalid_signature: "The Portal launch signature is invalid.",
  invalid_typ: "The Portal launch token type is invalid.",
  malformed_token: "The Portal launch token is malformed.",
  missing_database_url: "The app database is not configured.",
  missing_identity: "The Portal launch token is missing player identity.",
  missing_issuer: "The app Portal issuer is not configured.",
  missing_module_slug: "The app module slug is not configured.",
  missing_secret: "The app launch secret is not configured.",
  missing_session_secret: "The app session secret is not configured.",
  missing_token: "The Portal launch token was missing.",
};

interface LaunchErrorPageProps {
  searchParams: Promise<{
    reason?: string;
  }>;
}

export default async function LaunchErrorPage({ searchParams }: LaunchErrorPageProps) {
  const { reason = "callback_failed" } = await searchParams;
  const message = REASONS[reason] ?? REASONS.callback_failed;

  return (
    <main>
      <div className="screen">
        <h1 className="title">
          LAUNCH
          <br />
          FAILED
        </h1>
        <p className="subtitle">{message}</p>
        <a className="coin" href={portalModulesUrl()}>
          BACK TO PORTAL
        </a>
        <Link className="dim" href="/">
          PLAY WITHOUT LEADERBOARD
        </Link>
        <p className="dim">REASON: {reason.toUpperCase()}</p>
      </div>
    </main>
  );
}

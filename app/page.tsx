import Link from "next/link";
import {
  SCORE_BACK_KICK,
  SCORE_HEADER,
  SCORE_KICK,
  SCORE_STREAK_BONUS,
  STREAK_INTERVAL,
} from "@/game/constants";
import { getOptionalSession, portalModulesUrl } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StartScreen() {
  const session = await getOptionalSession();

  return (
    <main>
      <div className="screen">
        <h1 className="title">
          HACK THY
          <br />
          SACK
        </h1>
        <p className="subtitle">
          REACH HACKFINITY
          <br />
          WITH THE RAID GUILD RANGER
        </p>
        <Link className="coin" href="/play">
          CLICK TO START
        </Link>
        <p className="subtitle">POINTS</p>
        <div className="score-guide" aria-label="Scoring guide">
          <div className="score-guide__item">
            <span>KICK {SCORE_KICK}</span>
          </div>
          <div className="score-guide__item">
            <span>HEADER {SCORE_HEADER}</span>
          </div>
          <div className="score-guide__item">
            <span>SPIN KICK {SCORE_BACK_KICK}</span>
          </div>
          <div className="score-guide__item">
            <span>
              {STREAK_INTERVAL} HIT STREAK +{SCORE_STREAK_BONUS}
            </span>
          </div>
        </div>
        <p className="subtitle">CONTROLS</p>
        <div className="controls-guide" aria-label="Controls">
          <span>←→ - MOVE</span>
          <span>↑ - JUMP</span>
          <span>↓ - SPIN KICK</span>
          <span>SPACE - KICK</span>
          <span>TAP - KICK</span>
        </div>
        {session.handle ? (
          <p className="dim">HACKING AS {session.handle.toUpperCase()}</p>
        ) : (
          <p className="dim">
            PLAYING AS A STRANGER —{" "}
            <a href={portalModulesUrl()}>LAUNCH FROM THE PORTAL</a> TO GET ON
            THE LEADERBOARD
          </p>
        )}
      </div>
    </main>
  );
}

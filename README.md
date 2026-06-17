# Hack Thy Sack

Reach Hackfinity with the Raid Guild Ranger.

Hack Thy Sack is a retro footbag arcade game launched from the Raid Guild
Portal. It reuses Brood Tapper's Portal/session/leaderboard pattern with a new
score table for Hack Thy Sack runs.

## Play

- `←/→` — move
- `↑` — jump/header
- `↓` — spin/backward kick
- `Space` — kick
- click/tap — start and basic kick

Keep the red hack sack in the air. Kicks, headers, backward kicks, every
10-hit streak, and kick/header/reverse combos add to the total score. You get 3
lives.

## Development

```bash
npm install
npm run assets
npm run dev
```

The game is playable without a Portal session. Anonymous runs are not recorded
on the leaderboard. Leaderboards and Portal launch need `DATABASE_URL`.

### Project Layout

- `game/` — fixed-timestep footbag simulation, input, rendering, and audio.
- `app/` — Next.js App Router start screen, play route, API routes.
- `lib/` — Drizzle schema/client, iron-session, launch-token verification.
- `assets-src/` — generated background, Ranger pose sheet, and sack sprite.

### Environment

Copy `.env.example` to `.env` and fill in:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Shared Raid arcade Postgres database |
| `MODULE_LAUNCH_SECRET` | Per-module HS256 secret from the Portal CMS |
| `PORTAL_ISSUER` | Expected `iss` claim |
| `MODULE_SLUG` | Expected `aud` claim, `hack-thy-sack` |
| `PORTAL_MODULES_URL` | Redirect target when no/invalid launch token |
| `SESSION_SECRET` | iron-session cookie encryption (32+ chars) |
| `HACK_THY_SACK_AGENT_API_TOKEN` | Bearer token for read-only agent reporting routes |

### Portal Launch Flow

Portal should send the player to `/portal/callback?token=<JWT>`. On success the
player row is upserted, an encrypted session cookie is set, and the player lands
on the start screen. Invalid/missing/expired tokens show a local launch error
page with a link back to the Portal modules page.

### Database

```bash
npm run db:generate
npm run db:migrate
```

Completed authenticated runs are stored in `hack_thy_sack_games`.

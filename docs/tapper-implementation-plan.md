# Brood Tapper — Implementation Plan

> **Brood Tapper**: a web port of the 1983 arcade game *Tapper* (a.k.a. Root Beer Tapper),
> fully rebranded for [Raid Guild](https://www.raidguild.org/) and launched as an
> **external module** from the Raid Guild Portal. The Tavern Keeper pours **Raid Brood** —
> a dark stout in the lineage of Raid Guild's real *Blood of Moloch* beer.
> Source brief: [tapper.md](tapper.md). Reference assets: [tapper-images/](tapper-images/).

---

## 1. Concept

The Tavern Keeper (Raid Guild's bartender icon) serves Raid Brood to a stream of
guild-member customers (the design-system character biticons) across four bars in the
Raid Guild tavern. Faithful recreation of the original look, feel, and gameplay — CRT-era
pixel aesthetic, single screen, four bars — with Raid Guild artwork, palette, and branding.

**Scope (locked):**
- One level. Difficulty ramps via speed/spawn rate.
- **3 lives.** Lose a life when a glass drops, a full mug goes uncaught off the door end,
  or a customer reaches the taps.
- Tips + distraction mechanic included in v1 (simple version).
- Desktop only; mobile visitors see a "best played on desktop" notice.
- Full rebrand: no original sprites, names, or marks. Raid Guild art only.
- Score + high-score list at game over; instant restart.
- Light client: identity from the Portal launch token (live; access key in hand).

---

## 2. Decisions Log (was: Open Questions)

All 14 questions from the first draft are resolved:

| # | Decision |
|---|---|
| Q1 | Reference screens added at [tapper-images/screens/](tapper-images/screens/) (original arcade captures: start, loading, gameplay ×2) |
| Q2 | Character icons added at [tapper-images/characters/](tapper-images/characters/) — **15 customer characters** (alchemist, archer, cleric, druid, dwarf, healer, hunter, monk, necromancer, paladin, ranger, rogue, scribe, warrior, wizard) + **tavern-keeper** as bartender. All 15 are in the customer pool |
| Q3 | **3 lives** |
| Q4 | Customer reaching the taps loses a life (and uncaught full mug at door end) |
| Q5 | Tips + distraction in v1 (tip sprite + bonus; simple distraction, no dancer stage) |
| Q6 | The brew is **Raid Brood** — dark stout (Blood of Moloch heritage). Visually convenient: dark body + foamy head reads exactly like the original root beer mug |
| Q7 | Desktop-only v1; "best on desktop" notice for mobile |
| Q8 | Portal module launch feature is **live**; Sam handles portal-side registration and has the module access key for `.env` |
| Q9 | Claims: `profileID` + `handle`/`name` only |
| Q10 | No launch token → redirect to Portal modules page |
| Q11 | Store every completed game; show all-time top 10 + player's personal best |
| Q12 | **Anti-cheat skipped for v1.** Score submission still requires an authenticated session, and the full `games` table is kept so anomalies can be audited later |
| Q13 | Minimal audio: ~6 chiptune SFX (pour, slide, catch, break, door, tip) + 1 music loop, original or CC0 |
| Q14 | Title: **Brood Tapper**. Full rebrand, RG artwork only |

---

## 3. Game Mechanics

From the [Wikipedia entry](https://en.wikipedia.org/wiki/Tapper_(video_game)),
[gameplay video](https://www.youtube.com/watch?v=ZwhWszgkPow), and the reference screens:

- **Layout** (per `game-1.png` / `game-2.png`): four bars staggered diagonally up the
  screen, **doors at the left** end of each bar, **taps on the right wall**. Bartender
  works the right side. Neon sign top center (ours: **"RAID BROOD ON TAP"**), score at
  top, jukebox/screen on the left wall, status text strip at the bottom.
- **Customers** enter through the doors and advance toward the taps. Catching a full mug
  knocks them back toward the door; knocked past the door, they exit (cleared).
- **Empty mugs** slide back toward the taps after drinking; the bartender must catch them.
- **Lose a life:** empty mug falls off the tap end · full mug reaches the door end
  uncaught · customer reaches the taps. **3 lives, then game over.**
- **Tips:** customers occasionally leave a tip on the bar; collecting it gives bonus
  points and briefly distracts some customers (they pause). No dancer cutaway in v1.

### Single-level difficulty curve

Driven by elapsed time + glasses served:

| Parameter | Start | Ramp |
|---|---|---|
| Customer spawn interval | ~4s | shrink toward ~1.2s floor |
| Customer walk speed | slow | +X% every N served |
| Knockback distance per caught mug | full bar segment | shrinks over time |
| Max simultaneous customers per bar | 2 | up to 4 |
| Mug slide speed | constant | constant (original feel) |

Exact numbers tuned in playtesting against the video reference.

### Scoring

- Mug caught by a customer: **50 pts**
- Customer cleared out the door: **+100 pts**
- Empty mug caught: **25 pts**
- Tip collected: **+1500 pts**

### Controls (desktop)

- `↑/↓` (or `W/S`): move between bars
- `Space` (hold): pour; release: send mug
- `←/→`: step along the bar (decide in M1 playtest whether lane-walking earns its keep)
- `Enter`: insert coin / restart

---

## 4. Architecture

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router), TypeScript** | Per brief; API routes handle auth callback + scores |
| Game rendering | **HTML5 Canvas 2D, hand-rolled loop** (no Phaser) | One screen, 4 lanes, ~5 entity types. A `requestAnimationFrame` loop with fixed-timestep updates is less code than an engine inside React, and keeps the pixel look fully in our control |
| Sprites | Pixel-art PNG sprite sheets, generated via the asset pipeline (§7) | Crisp at integer scales; `image-rendering: pixelated` |
| Database | **Postgres on Railway** | Per brief; one-click managed |
| ORM | **Drizzle** | Lightweight, SQL-shaped; fits a 2-table schema |
| Session | **iron-session** (signed, encrypted cookie) | Stateless, no session table |
| Token verify | **jose** (JWT verify, HS256 w/ module secret) | Standard, audited |

### App structure

```
tapper/
├── app/
│   ├── page.tsx                  # start screen ("INSERT COIN")
│   ├── play/page.tsx             # game canvas (client component)
│   ├── api/
│   │   ├── auth/callback/route.ts  # receives ?token= from Portal launch
│   │   ├── scores/route.ts         # POST submit, GET leaderboard
│   │   ├── agent/scores/route.ts   # key-protected read API for agent reports
│   │   ├── agent/days/route.ts     # key-protected daily game stats
│   │   └── session/route.ts        # GET current user (for client)
├── game/                         # framework-free game engine code
│   ├── loop.ts                   # fixed-timestep update + rAF render
│   ├── state.ts                  # attract → playing → gameover state machine
│   ├── entities/                 # bartender, customer, mug, tip
│   ├── systems/                  # spawning, sliding, collision, difficulty ramp
│   ├── render.ts                 # canvas draw, integer-scaled to viewport
│   └── input.ts                  # keyboard
├── assets-src/                   # asset pipeline: scripts + prompts (§7)
├── lib/
│   ├── db/ (drizzle schema, client)
│   ├── session.ts
│   └── launch-token.ts           # JWT verification per portal spec
└── public/sprites/, public/audio/
```

### Game engine notes

- **Logical resolution:** fixed internal canvas (e.g. 512×448, matching the reference
  captures' proportions), integer-scaled with letterboxing. All positioning in logical
  pixels — this is what makes it *look* right.
- **Fixed timestep:** update at 60Hz, render on rAF. Deterministic ramp, consistent feel.
- **State machine:** `attract → coin-inserted → loading ("GET READY TO SERVE") → playing
  → life-lost anim → game-over/leaderboard → attract`. Maps 1:1 to the reference screens.
- **Lane model:** the bars are diagonal on screen but each is a **1-D lane** in game
  logic — customers, mugs, and tips are scalar positions along the lane, projected onto
  the bar's screen vector at render time. Collision is interval overlap on a line.
- **Screen layout from references:** bar lanes, door positions, tap positions, sign, and
  HUD regions transcribed from `game-1.png`/`game-2.png` into a layout constants file.

---

## 5. Portal Integration (auth)

Portal launch feature is live ([spec](https://github.com/raid-guild/portal/blob/staging/docs/external-module-launch-auth-feature-spec.md));
Sam handles portal-side registration and provides the module secret.

1. Portal sends user to `https://<app>/portal/callback?token=<JWT>` (60–120s TTL,
   HS256 signed with the per-module secret).
2. Verify with `jose`: signature (`MODULE_LAUNCH_SECRET`), `iss`, `aud` (module slug),
   `typ`, `exp`.
3. On success: upsert `players` row keyed on `profileID` (refresh `handle` each launch —
   claims are a snapshot), set iron-session cookie, redirect to `/`.
4. On failure/expiry or no token: redirect to the Portal modules page (token TTL ~90s,
   so back-button revisits land here — that's the designed path).

Env vars (Railway): `MODULE_LAUNCH_SECRET`, `PORTAL_ISSUER`, `MODULE_SLUG`,
`SESSION_SECRET`, `DATABASE_URL`, `BROOD_TAPPER_AGENT_API_TOKEN`.

---

## 6. Data Model & Scores

```sql
players (
  id            uuid pk default gen_random_uuid(),
  profile_id    text unique not null,   -- from launch token
  handle        text not null,          -- refreshed each launch
  created_at    timestamptz default now(),
  last_seen_at  timestamptz
)

games (
  id           uuid pk,
  player_id    uuid fk -> players,
  score        int not null,
  glasses      int not null,
  duration_ms  int not null,
  created_at   timestamptz default now()
)
```

- Every completed game is recorded (also useful for difficulty tuning).
- Leaderboard: all-time top 10 (`order by score desc limit 10`, index on
  `games(score desc)`) + the player's personal best.
- Submission requires an authenticated session; **no other anti-cheat in v1** (Q12).
  The raw `games` table lets us audit/remove anomalies by hand if needed.

### Agent Read API

The game UI keeps using `/api/scores`. Agent-facing reporting gets a separate
read-only namespace under `/api/agent/*`, protected by
`BROOD_TAPPER_AGENT_API_TOKEN`.

Auth:

- Require `Authorization: Bearer <BROOD_TAPPER_AGENT_API_TOKEN>` on every
  `/api/agent/*` route.
- Accept no browser session cookie fallback; the key is service-to-service auth.
- Compare the configured key with a timing-safe helper and return `401` for missing
  or invalid credentials.
- Do not expose `profile_id`; report player `handle` only.

Endpoints:

| Route | Purpose |
|---|---|
| `GET /api/agent/scores?scope=all-time&limit=10` | Current all-time top scores. Default limit `10`, max `100`. |
| `GET /api/agent/scores?scope=day&date=YYYY-MM-DD&limit=10&tz=America/Denver` | Highest scores for a calendar day. The day is interpreted in `tz`, defaulting to `UTC`. |
| `GET /api/agent/days?date=YYYY-MM-DD&tz=America/Denver` | Games played on a day: count, unique players, total glasses, score stats, and top games. |

Response shapes:

```json
{
  "scope": "all-time",
  "limit": 10,
  "scores": [
    {
      "rank": 1,
      "handle": "tavernkeeper",
      "score": 42000,
      "glasses": 210,
      "durationMs": 312000,
      "playedAt": "2026-06-12T18:42:00.000Z"
    }
  ]
}
```

```json
{
  "date": "2026-06-12",
  "tz": "America/Denver",
  "startsAt": "2026-06-12T06:00:00.000Z",
  "endsAt": "2026-06-13T06:00:00.000Z",
  "gamesPlayed": 37,
  "uniquePlayers": 14,
  "totalGlasses": 2880,
  "highestScore": 42000,
  "averageScore": 12540,
  "topScores": []
}
```

Implementation notes:

- `lib/agent-auth.ts` handles bearer-token parsing and timing-safe comparison.
- `lib/reporting.ts` contains query helpers so the two route files share date-window
  and ranking logic.
- For day filtering, convert the requested local date + timezone to UTC bounds and
  query `games.created_at >= startsAt and games.created_at < endsAt`.
- Add an index on `games(created_at)` or `games(created_at, score desc)` if daily
  reporting becomes slow; the current table is small enough to defer this until the
  route lands or real traffic warrants it.
- Keep `AGENTS.md` as the public contract for what data exists, how dates work, and
  how the agent should call these routes.

---

## 7. Asset Plan — AI-Generated Artwork

**Approach: minimal character animation.** Customers and the bartender do **not** need
limb animation — they're static icons that translate along the bar, exactly enough for
the original's low-framecount feel. Sprite states are achieved with cheap transforms:

- **Walk:** slide the sprite along the lane + a 1–2px vertical bob on a timer (code, not frames)
- **Facing:** horizontal flip
- **Demand/drink:** mug sprite overlaid in front of the character
- **Knockback:** slide backward, brief tilt (canvas rotate a few degrees)
- **Exit/cleared:** slide out the door + 1-frame fade
- **Bartender pour:** static keeper sprite at the tap + animated **mug fill** (the mug
  does the animating, not the character)

This removes hand-drawn frame animation from the project almost entirely.

### Asset inventory & generation method

Two generation paths, both scripted and checked into `assets-src/` so all art is
regenerable:

**Path A — code-generated (Claude writes the generator):** deterministic, palette-exact,
trivially tweakable. Used for simple/geometric assets:

| Asset | Notes |
|---|---|
| Mug (full/empty/filling ×3/breaking ×3) | Dark stout body + white foam head — visually mirrors the original root beer mug |
| Taps/kegs (right wall ×4) | Big tap-handle sprites per reference |
| Bars (4 diagonal surfaces) | Procedural wood texture or flat retro shading per reference |
| Doors (left wall ×4) | Simple panels per reference |
| Tip | Small coin / moloch-skull token |
| HUD elements | Score digits, lives icons, status strip |

**Path B — AI image generation (image-capable tooling, e.g. Codex/GPT image gen):**
used where hand-feel matters, generated at logical resolution, palette-constrained,
iterated against the reference captures:

| Asset | Notes |
|---|---|
| Tavern background scene | Walls, floor, jukebox/screen area — composition copied from `game-1.png` |
| "RAID BROOD ON TAP" neon sign | Replaces the Root Beer neon sign, RG palette |
| **Brood Tapper** title logo | Start screen lockup in the spirit of the original logo (per `start.png`), no copied letterforms |
| Loading screen art | "GET READY TO SERVE" layout per `game-loading.png` |

**Path C — SVG rasterization (scripted):** character sprites. A build script
(sharp/resvg) rasterizes the 16 SVGs in [tapper-images/characters/](tapper-images/characters/)
at sprite size, quantizes to the game palette, and emits a sprite sheet. No manual art.

**Branding:** [brand.raidguild.org/logos](https://www.brand.raidguild.org/logos) for the
start screen and any marquee chrome.

**Audio (minimal, per Q13):** 6 SFX — pour, mug slide, catch, glass break, door, tip —
plus one music loop. Source CC0 chiptune packs or generate with a tracker/sfxr-style
tool (jsfxr presets are scriptable, which fits the assets-as-code approach).

**Workflow:** generate → drop into the game → screenshot → compare side-by-side with the
reference capture → regenerate. Since all assets come from scripts or prompts kept in
`assets-src/`, iteration is cheap and nothing is hand-painted.

---

## 8. Deployment (Railway)

- One Railway project: **web service** (Next.js, standalone output) + **Postgres** plugin.
- Drizzle migrations run on deploy (release command).
- Custom domain → registered as the module callback host in the Portal CMS (HTTPS-only).
- No sockets/long-running server — game is fully client-side; the server is one auth
  callback + two score endpoints. Cheapest possible Railway footprint.

---

## 9. Milestones

1. ~~**M0 — Decisions**~~ ✅ All resolved — see §2.
2. **M1 — Playable core (no auth, no db, placeholder rects):** canvas loop, lane model,
   one bar → four bars, serve/catch/knockback/lose-life mechanics, 3 lives, tips,
   difficulty ramp, keyboard controls. *Risk concentrator — get the feel right first.*
3. **M2 — Asset pipeline & art pass:** `assets-src/` generators (Paths A/B/C),
   background + sprites + logo + screens matching the references, SFX + loop,
   start/loading/game-over screens.
4. **M3 — Portal auth:** callback route, JWT verify with the provided module secret,
   session, `players` table.
5. **M4 — Scores:** `games` table, submit endpoint, leaderboard + personal best on the
   game-over screen.
6. **M5 — Deploy & register:** Railway setup, domain, Portal CMS registration (Sam),
   end-to-end launch test, playtest/tuning round.

M1 stays first and auth-free: if it doesn't *feel* like Tapper, nothing else matters,
and it needs zero infrastructure to validate.

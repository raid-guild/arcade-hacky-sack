# Hack Thy Sack Implementation Plan

## Goal

Build `Hack Thy Sack: Reach Hackfinity with the Raid Guild Ranger` as a new app in `hack-thy-sack/`, using `brood-tapper/` as the technical and launch-flow template while recreating the feel of the California Games footbag/hacky sack mini game.

Reference assumptions:

- Target gameplay reference is the old California Games footbag event: centered character, side-scrolling sky/ground background, footbag launched by an initial kick, score driven by repeated timed hits and trick variety.
- The provided YouTube link should still get one manual review pass before final tuning. I could not directly inspect the video from the current environment, but the local captures in `hack-thy-sack/ref/` now provide enough visual direction for the first implementation pass.

## Reference Image Notes

The new captures in `hack-thy-sack/ref/` adjust the visual plan:

- `front.png`, `side.png`, and `back.png` confirm the core turn/spin poses needed for the Ranger.
- The reference scene is a flat green field with a pine-tree horizon, blue sky, white clouds, and a black score band at the bottom.
- The player is not framed close-up. They occupy a small central footprint, roughly 15-20% of the screen height above the score band.
- Score display is minimal: centered yellow pixel digits in the black bottom band.
- Character rotation appears to be a key piece of the trick language, so front/side/back pose readability matters more than limb detail.

This originally pointed toward a field-and-pines background. The current art direction has shifted to an 8-bit dungeon scene based on `hack-thy-sack/ref/bg-ref.png`, while preserving the same side-view layout and black score band.

## Existing Brood Tapper Patterns To Reuse

`brood-tapper/` is a good starter template:

- Next.js app router shell with a pixel-art start screen in `app/page.tsx`.
- Dedicated playable route at `app/play/page.tsx` with a client canvas component.
- Framework-light game engine in `game/`: fixed timestep loop, state machine, input adapter, renderer, audio hooks, and typed game events.
- Integer-scaled logical canvas for crisp pixel art.
- Optional anonymous play, with leaderboard writes gated by a Raid Guild Portal session.
- Portal callback flow:
  - `/portal/callback?token=...` re-exporting `/api/auth/callback`.
  - `verifyLaunchToken()` using HS256 JWT claims from the Portal.
  - `players` table upsert by Portal profile id.
  - encrypted `iron-session` cookie.
- Drizzle/Postgres schema and migrations.
- Asset scripts that rasterize SVG/PNG source art into `public/sprites/*.png` plus JSON metadata.

Recommended approach: scaffold Hack Thy Sack as a sibling Next app by copying the Brood Tapper structure, then rename and reduce the game-specific pieces rather than starting from a blank app.

## Proposed App Structure

```text
hack-thy-sack/
  app/
    api/
      auth/callback/route.ts
      portal/callback/route.ts
      scores/route.ts
      session/route.ts
    launch-error/page.tsx
    play/GameCanvas.tsx
    play/page.tsx
    globals.css
    layout.tsx
    page.tsx
  assets-src/
    build-ranger-sprites.mjs
    build-sack-sprites.mjs
    build-bg.mjs
  drizzle/
  game/
    audio.ts
    constants.ts
    input.ts
    layout.ts
    loop.ts
    render.ts
    sprites.ts
    state.ts
    systems/
      ball.ts
      player.ts
      scoring.ts
    types.ts
  lib/
    db/
      index.ts
      schema.ts
    launch-token.ts
    session.ts
  public/
    sprites/
    bg.png
  bg.png
  ranger.svg
  notes.md
```

Keep Brood Tapper's separation of concerns:

- `app/` owns screens, API, session reads, and score submission.
- `game/state.ts` owns phase transitions and fixed-step simulation.
- `game/systems/*` owns player movement, sack physics, collision windows, and scoring.
- `game/render.ts` owns drawing only.

## Start Screen

Match Brood Tapper's start screen pattern, reskinned:

- Title: `HACK THY SACK`
- Subtitle: `REACH HACKFINITY WITH THE RAID GUILD RANGER`
- Primary action: `CLICK TO START` or `INSERT SACK`
- Score guide:
  - Kick: `100`
  - Header: `150`
  - Backward kick: `175`
  - 10-hit streak bonus: `+50`
- Controls:
  - `←/→`: move
  - `↑`: jump/header
  - `↓`: spin/backward kick
  - `Space`: kick
  - Click/tap: start and basic kick
- Portal session copy:
  - Authenticated: `HACKING AS {HANDLE}`
  - Anonymous: `LAUNCH FROM THE PORTAL TO GET ON THE LEADERBOARD`
- Control hint should be concise and visible on the start screen so players do not need outside instructions.

The start screen button and the canvas itself should respond to pointer/click input. Keyboard start can remain as a secondary convenience.

## Gameplay Model

### Core Loop

Phases:

- `attract`: waiting on click/start.
- `ready`: brief intro pose with the sack near the Ranger's foot.
- `playing`: sack simulation and scoring.
- `dropped`: short fail state after sack hits the ground.
- `game-over`: submit score and show leaderboard.

Run ending:

- Use 3 lives.
- A dropped sack costs 1 life, briefly enters `dropped`, then resets the sack near the Ranger's foot if lives remain.
- After the third drop, enter `game-over`, submit the final total score, and show the leaderboard.

### Player

The Ranger stays near the center but can move left/right within a small play lane.

State fields:

- `x`, `y`
- `vx`
- `facing`: `front | left | right | back`
- `pose`: `idle | kick | header | spin | backKick | jump | recover`
- `poseTimer`
- `grounded`
- `spinCharge` or `spinTimer`
- movement bounds based on dungeon side-wall play-space edges.

Controls:

- Left/right: move horizontally.
- Kick: perform normal kick.
- Jump/header: jump upward, with a header hitbox near the Ranger's head.
- Spin/backward kick: rotate into side/back poses and allow a higher-value hit when timed.
- Click/tap: start the run and perform a basic kick.

Keyboard mapping:

- `ArrowLeft`: move left.
- `ArrowRight`: move right.
- `Space`: kick.
- `ArrowUp`: jump/header.
- `ArrowDown`: spin/backward kick.
- `Enter` or click: start/restart.

Optional later accessibility aliases can add `A/D/W/S`, but v1 should teach the arrow-key controls requested above.

### Sack Physics

Use a simple deterministic 2D physics model:

- `x`, `y`, `vx`, `vy`
- gravity in logical px/s^2
- horizontal air drag
- optional spin/drift after special hits
- side-wall collision bounces the sack back into the playable area
- ground collision costs one life / eventually game over

Initial kick:

- The sack starts near the Ranger's foot.
- First kick launches it upward with a moderate vertical velocity and small horizontal velocity based on facing/input.

Hit detection:

- Each player action owns one or more active hit windows, expressed as rectangles/circles relative to the Ranger.
- A hit only scores once per action using `lastHitActionId`.
- Require the sack to be descending or within an upward-timing window for normal kicks, so button mashing does not dominate.

Suggested hit zones:

- Normal kick: lower-body rectangle, short active window, launches mostly upward.
- Header: head/upper-body rectangle while jumping or at jump apex, launches upward with less horizontal drift.
- Backward kick: rear lower-body rectangle during spin/back pose, launches higher/faster and scores more.

### Scoring

Constants:

```ts
export const SCORE_KICK = 100;
export const SCORE_HEADER = 150;
export const SCORE_BACK_KICK = 175;
export const SCORE_STREAK_BONUS = 50;
export const STREAK_INTERVAL = 10;
```

On every valid hit:

- Increment `hits`.
- Increment `streak`.
- Add base score for hit type.
- If `streak % 10 === 0`, add `50`.
- Emit score popup event, sound event, and optional HUD flash.

Stats to store:

- `score`
- `durationMs`

Keep gameplay-internal counters like hits, streak, lives, and trick type in memory for scoring/feedback, but only persist total score plus duration for v1 high scores.

Bottom HUD:

- Score accumulates in the black bottom band, centered in yellow pixel digits like the captures.
- Do not show streak or trick labels in the persistent in-game HUD.

## Rendering Plan

Logical resolution:

- Prefer a logical aspect matching the reference captures, with a wide landscape playfield and a bottom HUD band. `351x220` is still a workable native target if we reuse the existing `bg.png`, but the captures imply a wider composition closer to `320x220`, `384x240`, or Brood Tapper's scalable canvas approach.
- Scale up by integer factor for desktop, preserving pixelated rendering.
- If UI text needs more room, use a larger logical canvas like `512x320` and draw the playfield/background to fit. Keep the score band height stable so the score never shifts.

Scene layers:

1. Dungeon background based on `hack-thy-sack/ref/bg-ref.png`, or fallback background from `hack-thy-sack/bg.png`.
2. Ranger shadow/contact marker.
3. Ranger sprite.
4. Hack sack sprite.
5. Score popups/trick labels.
6. Bottom HUD strip.
7. Phase overlays.

Ranger placement:

- Ground line should sit just above the black HUD band.
- Initial player anchor should be near center x and just above the HUD strip.
- Tune foot/head hitboxes visually against sprite dimensions after sprites are generated.

HUD:

- Follow the captures for v1: black bottom band with centered yellow score digits.
- Do not show secondary in-game HUD stats in v1. Keep the active HUD to total score only.

### Mobile Support

Support mobile in v1 rather than showing Brood Tapper's desktop-only notice.

- Use responsive integer scaling with the same fixed logical canvas.
- Keep the canvas centered and fit to the viewport without layout shift.
- Add touch controls over or below the playfield:
  - left/right directional buttons.
  - jump button.
  - spin button.
  - kick button.
- Tapping the playfield should start the run and perform a basic kick.
- Keep touch targets at least 44px CSS pixels.
- Prevent browser scrolling/zoom gestures while the game is active.
- Test portrait and landscape. Landscape should be the preferred orientation, but portrait should remain playable with controls below the canvas.
- The start screen should show touch-friendly directions on coarse pointers and keyboard directions on desktop pointers.

## Asset Plan

### Existing Assets

- `hack-thy-sack/ranger.svg`: base Ranger source art.
- `hack-thy-sack/bg.png`: available desert/grid background with bottom HUD strip, but no longer the closest match to the local video captures.
- `hack-thy-sack/ref/front.png`, `hack-thy-sack/ref/side.png`, `hack-thy-sack/ref/back.png`: visual reference for player scale, pose readability, and score band.
- `hack-thy-sack/ref/bg-ref.png`: visual reference for the dungeon background style.
- `brood-tapper/public/sprites/characters.png`: reference for the generated pixel-art style and sprite scale.

### Ranger Sprite Sheet

Create `assets-src/build-ranger-sprites.mjs`, following Brood Tapper's `build-character-sprites.mjs`:

- Rasterize source SVG/PNG variants into a fixed cell sheet.
- Use transparent background.
- Use `sharp`.
- Quantize to a small palette for the retro look.
- Emit:
  - `public/sprites/ranger.png`
  - `public/sprites/ranger.json`

Needed Ranger poses:

- `front-idle`: based on current `ranger.svg`.
- `front-kick`: front view with leg up.
- `side-spin`: side view while spinning.
- `back-idle`: back view.
- `back-kick`: back view with leg up.
- `side-idle`: needed as a readable transition pose during rotation and horizontal movement.
- Optional polish:
  - `jump-header`
  - `recover`
  - `drop-react`

Generation workflow:

- Use the current `ranger.svg` as the style reference.
- Generate missing pose images as transparent-background pixel-art PNGs or SVGs.
- Normalize all poses into one cell size before shipping.
- Keep source prompts/assets in `assets-src/ranger/` so regeneration is documented.

### Hack Sack Sprite

Create a tiny red pixelated bag:

- 8x8 or 12x12 logical sprite.
- 2-3 animation frames for tumbling/spinning.
- Red cloth body with darker red outline and one bright highlight.
- Emit `public/sprites/sack.png` and `public/sprites/sack.json`.

This can be drawn directly as pixel art in a source PNG or generated with a small script.

### Background

Background path:

- Start with a new dungeon background based on `hack-thy-sack/ref/bg-ref.png`: blue stone walls, warm fireplace glow, open stone floor, and black score band.
- Keep background handling flexible so the image can change later without touching gameplay code.
- Put background metadata in one place, for example `game/layout.ts` or `public/backgrounds/dungeon.json`, including ground line, score band bounds, and player spawn anchor.
- Keep the existing desert/grid `hack-thy-sack/bg.png` as a fallback or alternate skin.

## Database Plan

Use the same database and keep `players` shared.

Add a new table for Hack Thy Sack runs instead of overloading Brood Tapper's `games` table:

```ts
export const hackThySackGames = pgTable(
  "hack_thy_sack_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").references(() => players.id).notNull(),
    score: integer("score").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("hack_thy_sack_games_score_idx").on(t.score.desc()),
    index("hack_thy_sack_games_created_at_idx").on(t.createdAt),
  ]
);
```

API:

- `GET /api/scores`: top 10 all-time plus personal best.
- `POST /api/scores`: authenticated score submission.
- `GET /api/agent/scores`: trusted read-only reporting endpoint for all-time and day-scoped high scores.
- `GET /api/agent/days`: trusted read-only day summary endpoint.

Validation:

- `score`: bounded integer.
- `durationMs`: bounded integer.
- Since only total score is persisted, use a generous score/duration sanity check. Like Brood Tapper, v1 still treats completed-game rows as the audit trail rather than adding heavy anti-cheat.

Agent docs:

- Add `hack-thy-sack/AGENTS.md`.
- Document the read-only bearer-token API.
- Expose handles, scores, durations, and timestamps.
- Do not expose Portal profile ids.

## Auth And Deployment

Reuse Brood Tapper auth with app-specific names:

- Cookie: `hack-thy-sack-session`
- `MODULE_SLUG`: `hack-thy-sack`
- `MODULE_LAUNCH_SECRET`, `PORTAL_ISSUER`, `PORTAL_MODULES_URL`, `SESSION_SECRET`, and `DATABASE_URL` same pattern as Brood Tapper.
- `HACK_THY_SACK_AGENT_API_TOKEN`: bearer token for trusted agent reporting routes.

Keep:

- `/portal/callback`
- `/api/auth/callback`
- `/launch-error`
- `/api/session`

Consider extracting shared auth/db code later if these arcade apps keep multiplying, but do not block v1 on a monorepo refactor.

## Implementation Milestones

1. Scaffold app from Brood Tapper.
   - Copy Next.js config, package scripts, app shell, db/session/auth code.
   - Rename package/app/cookie/module copy.
   - Remove Tapper-specific game systems.

2. Add Hack Thy Sack database table.
   - Extend schema with `hack_thy_sack_games`.
   - Generate migration.
   - Update score route to read/write new table.
   - Add trusted read-only agent reporting routes.
   - Add `AGENTS.md` documentation for the reporting API.

3. Build playable graybox.
   - Implement fixed-step player movement.
   - Implement sack physics.
   - Implement hit windows for kick/header/back kick.
   - Implement score, streak bonus, 3 lives, drop, and restart.
   - Render with simple shapes over a dungeon placeholder background.

4. Add first-pass art.
   - Create/use a dungeon background matching `hack-thy-sack/ref/bg-ref.png`, with the current `bg.png` as fallback.
   - Rasterize `ranger.svg` into an idle sprite.
   - Add simple generated hack sack sprite.
   - Wire sprite loader/rendering.

5. Generate Ranger pose sprites.
   - Create missing pose sources.
   - Build sprite sheet and metadata.
   - Tune action windows to sprite frames.

6. Add start/game-over polish.
   - Start screen copied/reskinned from Brood Tapper.
   - Leaderboard overlay.
   - Score guide.
   - Desktop and mobile control directions.
   - Authenticated/anonymous messaging.

7. Add mobile controls.
   - Translucent overlay touch controls for move, kick, jump, and spin.
   - Pointer/tap starts the run and performs a basic kick.
   - Portrait and landscape responsive layout.

8. Add audio and feedback.
   - Kick/header/back-kick blips.
   - Streak bonus sound.
   - Drop sound.
   - Small score popups.

9. Verify.
   - `npm run build`
   - Play locally through start, scoring, drop, restart.
   - Test anonymous play does not submit.
   - Test authenticated score route with a session or route-level mocks.
   - Test `/api/agent/*` with valid and invalid bearer tokens.
   - Test mobile controls in portrait and landscape.
   - Confirm migration targets the shared DB safely.

## Resolved Product Decisions

- Runs use 3 lives.
- Desktop controls: `Space` kick, `ArrowLeft/ArrowRight` move, `ArrowUp` jump/header, `ArrowDown` spin/backward kick.
- Click/tap starts the run and performs a basic kick.
- Mobile support is in scope for v1.
- Start with the dungeon background, but keep background metadata flexible for later swaps.
- In-game HUD shows total score only.
- Persist and rank by total high score only.
- Generate the missing Ranger poses.
- Portal module slug is `hack-thy-sack`.
- Add trusted read-only agent reporting endpoints and an `AGENTS.md` API doc.

## Remaining Open Questions

- Manual art review should happen before launch for generated Ranger poses.

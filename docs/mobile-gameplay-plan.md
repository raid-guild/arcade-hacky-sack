# Mobile Gameplay Plan

This workstream defines how to make Brood Tapper playable on mobile devices
without changing the core arcade rules or the existing desktop keyboard feel.

The current implementation intentionally blocks mobile visitors with a desktop
notice in `app/page.tsx`, `app/play/page.tsx`, and `app/globals.css`. Mobile
support should replace that gate only after touch controls, viewport fit, and
browser gesture handling are ready.

## Goals

- Let a player complete a full game on a touch-only phone.
- Preserve the desktop keyboard controls and fixed logical game resolution.
- Keep all gameplay logic in the existing `InputFrame` shape so systems do not
  need separate mobile branches.
- Make mobile controls readable and reliable while the canvas remains the main
  visual focus.
- Prevent browser scrolling, zooming, pull-to-refresh, and text selection from
  interfering with active play.
- Support portrait as the primary phone layout and landscape as an acceptable
  enhanced layout.

## Current Surfaces

- Mobile gate:
  - `app/page.tsx` renders `.desktop-only` for the start screen and
    `.mobile-notice` for mobile.
  - `app/play/page.tsx` hides `GameCanvas` behind `.desktop-only` on mobile.
  - `app/globals.css` switches `.desktop-only` and `.mobile-notice` at
    `max-width: 900px` or `pointer: coarse`.
- Canvas wrapper:
  - `app/play/GameCanvas.tsx` owns the canvas, integer scale fitting, game loop,
    score submission, and overlays.
- Input:
  - `game/input.ts` maps keyboard events into `InputFrame`.
  - `InputFrame` in `game/types.ts` already has the needed semantic controls:
    `up`, `down`, `left`, `right`, `pourHeld`, `pourReleased`, and `start`.
- Gameplay movement:
  - `game/systems/bartender.ts` treats lane changes as edge-triggered and
    walking/pouring as held inputs.
- Layout:
  - `game/layout.ts` uses `LOGICAL_W = 512` and `LOGICAL_H = 448`.
  - `app/globals.css` centers the canvas in `.stage` and currently gives it
    the full viewport height.

## Control Model

Mobile should expose the same semantic actions as keyboard input:

| Action | Desktop | Mobile |
|---|---|---|
| Start / restart | `Enter` | Tap start button or tap canvas during attract/game-over |
| Change lane | `ArrowUp` / `ArrowDown`, `W` / `S` | Up/down buttons, edge-triggered |
| Walk bar | `ArrowLeft` / `ArrowRight`, `A` / `D` | Left/right buttons, held |
| Pour | Hold `Space`, release to send | Hold pour button, release to send |

Recommended first version:

- Use an on-screen control deck rather than gesture-only play. Tapper needs
  precise lane changes, held walking, and held/released pouring, which are hard
  to discover as invisible gestures.
- Place directional controls on the left and the pour button on the right.
- Make `Start` a centered button only during attract and game-over phases, or
  allow tapping the canvas to emit `start`.
- Keep lane up/down as discrete buttons. Swipes can be added later, but buttons
  should be the reliable baseline.
- Make the pour button large enough for repeated play and visually distinct
  from movement controls.

## Input Architecture

Add touch/pointer support beside the existing keyboard class without changing
the game systems.

### Candidate Implementation

- Extend `Input` in `game/input.ts` to support non-keyboard setters:
  - `press(action)`
  - `release(action)`
  - `tap(action)` for edge-triggered actions
  - or explicit methods such as `setLeftHeld`, `setPourHeld`, `triggerStart`.
- Keep keyboard edge detection exactly as-is for desktop.
- Represent touch actions internally using the same state that `frame()` already
  reads.
- Generate `pourReleased` when the pour pointer ends, is canceled, or leaves
  the active button while captured.
- Use pointer events instead of separate mouse/touch events:
  - `pointerdown`
  - `pointerup`
  - `pointercancel`
  - `lostpointercapture`
- Capture the pointer on each held button so sliding outside the button does
  not leave an action stuck on.
- Support multi-touch: a player should be able to hold pour with one thumb
  while adjusting lanes or walking with the other.

### Suggested Touch Action Names

```ts
type TouchAction = "up" | "down" | "left" | "right" | "pour" | "start";
```

The action names should stay semantic. Avoid leaking DOM button ids or gesture
names into `InputFrame`.

## Mobile UI Layout

Mobile play needs a stable layout that reserves space for controls instead of
overlaying them on critical gameplay lanes.

### Portrait

- Stack the canvas above a fixed-height control deck.
- Fit the canvas within available width and the remaining height after controls.
- Preserve integer scaling when possible.
- If a strict integer scale makes the game too small on common phones, allow a
  mobile-only non-integer CSS scale while keeping `canvas.width` and
  `canvas.height` fixed at logical resolution.
- Keep the control deck below the canvas so thumbs do not cover customers,
  mugs, or the bartender.

### Landscape

- Prefer canvas on the left and controls on the right if vertical space is
  tight.
- If the canvas can fit at a useful size with controls below, reuse the portrait
  structure.
- Avoid requiring landscape. The Portal launch flow and casual event play will
  often happen with phones held normally.

### CSS Notes

- Add `touch-action: none` to the active play surface and control buttons.
- Add `user-select: none` and `-webkit-user-select: none` to controls.
- Use `height: 100dvh` or a custom `--app-height` fallback rather than plain
  `100vh` so mobile browser chrome does not hide controls.
- Respect `env(safe-area-inset-*)` for bottom and side padding.
- Avoid text-heavy instructions inside the game view. Controls should be
  recognizable by placement and concise labels/icons.

## Scaling Plan

The current `fit()` function in `GameCanvas` computes scale from the whole
window:

```ts
Math.floor(Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H))
```

For mobile, this needs to fit inside the canvas region rather than the entire
window.

Implementation options:

- Pass a `stageRef` or `canvasAreaRef` to `fit()` and measure the available
  container using `getBoundingClientRect()`.
- Re-run `fit()` on `resize`, `orientationchange`, and `visualViewport.resize`
  where available.
- Keep logical canvas dimensions fixed:
  - `canvas.width = LOGICAL_W`
  - `canvas.height = LOGICAL_H`
- Set only CSS size based on the measured region.

Recommended behavior:

- Desktop: keep current integer scaling and letterbox.
- Mobile portrait: use the largest scale that fits the canvas region. Prefer
  integer scale, but permit non-integer scale if the game would otherwise be
  cramped on common phone widths.
- Mobile landscape/tablet: use integer scaling when it fits.

## Implementation Phases

### Phase 1: Input Abstraction

- Add public action methods to `Input`.
- Keep keyboard behavior unchanged.
- Add unit-level/manual checks for:
  - tapping start starts or restarts a run.
  - tapping up/down changes exactly one lane per tap.
  - holding left/right continuously walks the bartender.
  - holding pour at the tap fills a mug.
  - releasing pour sends a mug only when the pour completed.
  - canceling a pointer does not leave `pourHeld`, `left`, or `right` stuck.

### Phase 2: Mobile Control Component

- Add a touch controls component near `GameCanvas`, likely in
  `app/play/GameCanvas.tsx` or a sibling client component.
- Wire controls to the shared `Input` instance through refs/callbacks.
- Render controls only when the device is coarse pointer or when the viewport
  is below the mobile breakpoint.
- Include:
  - up button.
  - down button.
  - left button.
  - right button.
  - large pour button.
  - start/restart affordance during attract and game-over.
- Ensure controls are stable size and do not shift when pressed.

### Phase 3: Viewport And Page Fit

- Remove the mobile block from `app/play/page.tsx` after controls exist.
- Keep or update the mobile notice on the start page until the play page is
  fully verified.
- Update `.stage` to support a mobile play layout.
- Prevent page scroll during active play.
- Handle safe-area padding and mobile browser chrome.
- Confirm the leaderboard overlay fits on mobile and does not hide the restart
  action.

### Phase 4: Start Screen Mobile Entry

- Replace the mobile-only desktop notice in `app/page.tsx` with a playable
  mobile start screen.
- Update the control hint copy so it does not mention only keyboard controls on
  touch devices.
- Keep Portal leaderboard/session messaging visible and legible.

### Phase 5: Polish And Accessibility

- Add accessible names to controls.
- Use `aria-pressed` for held buttons where appropriate.
- Make buttons at least `44px` on each side, preferably larger for the pour
  action.
- Support external keyboards on tablets by retaining the existing keyboard
  listeners.
- Consider haptic feedback for successful pour release or life loss only if it
  is subtle and safely guarded behind feature detection.

## Risks

- Pouring is release-sensitive. If pointer cancellation is mishandled, players
  may lose mugs or get stuck pouring.
- Integer scaling may make the 512x448 canvas too small on narrow phones once
  controls are included.
- Browser UI chrome can change viewport height during play, especially after
  taps on iOS Safari.
- The game-over leaderboard overlay currently assumes desktop width with
  `.board { min-width: 380px; }`.
- The game currently unlocks audio only on `keydown`; mobile needs audio unlock
  on first pointer interaction.
- Multi-touch bugs can appear if controls store only one global pointer id.
- Removing the mobile gate too early will create a path where users can launch
  the game but cannot reliably submit a completed score.

## Review Checklist

- Play a complete game on a phone in portrait.
- Start, lose all lives, view leaderboard, and restart without a keyboard.
- Verify desktop keyboard controls still behave exactly the same.
- Confirm no page scroll, pull-to-refresh, pinch zoom, text selection, or
  double-tap zoom interrupts play.
- Confirm controls are reachable with thumbs and do not cover gameplay.
- Confirm the pour button reliably sends a mug on release after a complete pour.
- Confirm lane changes are one lane per tap, not repeated from a long press.
- Confirm walking left/right can be held while pour is pressed or released.
- Confirm audio unlocks on the first mobile interaction.
- Check small phone portrait, large phone portrait, phone landscape, and tablet.
- Check iOS Safari and Android Chrome if physical devices are available.
- Confirm score submission still happens only through the existing authenticated
  `/api/scores` path.

## Definition Of Done

- Mobile visitors can reach `/play` and play with touch controls.
- Desktop visitors still get the existing keyboard-first experience.
- The mobile notice is removed or rewritten so it no longer blocks play.
- A completed mobile game records score, glasses, and duration through the same
  server route as desktop.
- The implementation has been manually verified on at least one narrow mobile
  viewport and one desktop viewport.

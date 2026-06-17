# Visual Assets Workstream

This workstream tracks review and improvement of the in-game visual assets so
the environment feels more intentionally aligned with the character artwork in
`public/sprites/characters.png` and the Tapper reference composition in
`tapper-images/screens/game-1.png`.

## Goals

- Identify which UI and environment elements feel least integrated with the
  current character sprites.
- Establish a shared style target before producing replacement assets.
- Decide which props should remain canvas-drawn and which should move into a
  dedicated sprite asset pipeline.
- Improve readability at the fixed logical resolution without losing the
  arcade-tavern feel.

## Style Questions

- How can each prop use the same black-outline, flat-shaded pixel language as
  the character sprites?
- Which colors should come from the Raid Guild flavored palette, and which
  should come from the character sheet?
- Where should props retain the chunky arcade silhouettes from
  `tapper-images/screens/game-1.png`?
- Which details are worth adding at game scale, and which details will become
  noise once the canvas is scaled?
- Should the tavern read more like a medieval/fantasy guild hall, a re-skinned
  arcade bar, or a blend of both?

## Room Layout Pass

Before replacing the wall banner, do a layout pass that gives the tavern more
room definition and makes the wall/sign area easier to use.

Current surfaces:

- Lane geometry: `LANES`, `BAR_THICKNESS`, and `SIGN_RECT` in
  `game/layout.ts`.
- Room perspective and wall/floor shapes: `drawBackground` in
  `game/render.ts`.
- Actor vertical placement: `drawCustomer` and `drawBartender` in
  `game/render.ts`.
- Bar occlusion/layering: `drawBarSurface` and current render order in
  `game/render.ts`.

### Goals

- Add side/back wall definition so the space reads more clearly as a room.
- Move the bar lanes slightly lower to give the back wall and banner more
  breathing room.
- Remove the odd grey diagonal element near the left doors.
- Keep the existing bar and door art mostly intact.
- Make customers and the bartender feel tucked behind the bar rather than
  standing on top of it.

### Candidate Changes

- Shift `LANES` down by a small fixed amount, likely `12-20` logical pixels.
- Move `SIGN_RECT` down only if needed after the lane shift; the priority is
  preserving more visible back wall around the sign/banner.
- Split the room into clearer planes:
  - Back wall: central wall plane behind the sign and first lane.
  - Right wall: darker keg/tap wall, still following the tap-side diagonal.
  - Left wall: darker door-side wall, without the current tilted grey wedge.
  - Floor: central diagonal slab between door and tap boundaries.
- Remove or replace the current left-wall tilted panel. If a wall detail remains
  there, make it intentional, such as a framed notice board or shelf, and keep
  it out of the door silhouettes.
- Add subtle color steps between planes instead of new busy texture. The room
  should gain depth without competing with characters, mugs, tips, or taps.
- Lower actor draw positions by a few pixels behind the bar top, likely `4-7`
  logical pixels, while keeping collision positions unchanged.
- Consider a simple bar-front occlusion strip drawn after actors. This would
  hide the bottom few pixels of characters and make them appear behind the bar,
  but it must not cover mugs sliding on the bar top.

### Implemented Pass

- Shifted lanes down by `14` logical pixels.
- Moved the current sign rectangle down by `4` logical pixels.
- Reworked `drawBackground` into a back wall, darker left wall, darker right
  wall, and central floor plane.
- Removed the tilted left-wall panel that created the confusing grey diagonal
  near the doors.
- Split bar rendering into top and front layers.
- Lowered actor sprites by `9` logical pixels and redraw the bar front after
  actors, before mugs and tips, so characters read as standing behind the bar.

### Risks To Check

- Moving lanes down affects every gameplay object visually: doors, taps,
  customers, bartender, mugs, tips, and the status strip.
- The lowest lane must still leave space above `STATUS_STRIP_Y`.
- Character drop-behind should not make short sprites look cut off or make the
  bartender harder to read while pouring.
- Bar-front occlusion must not hide empty mugs returning to the bartender.
- Any left wall detail must not recreate the confusing diagonal called out in
  the screenshot.

### Review Checklist

- Compare against `tapper-images/screens/game-2.png` for the room perspective:
  back wall, right wall, left wall, and diagonal floor should all be legible.
- Verify the banner has more visual room before final banner art begins.
- Verify all four lanes still read clearly at desktop and mobile integer scales.
- Capture screenshots with customers on all lanes and the bartender pouring.
- Confirm characters appear behind the bar enough to resolve the current
  standing-on-top issue.

## Initial Asset Candidates

### Mug

Current surfaces:

- Source builder: `assets-src/build-mug-sprites.mjs`.
- Output sprites: `public/sprites/mugs.png` and `public/sprites/mugs.json`.
- Render hooks: `loadMugSprites` in `game/sprites.ts`, then `drawMug` and
  `drawFillingMug` in `game/render.ts`.

States to review:

- Empty mug.
- Filling mug.
- Full mug.
- Life/HUD mug.
- Customer drinking state.
- Sliding readability against the bar top.

Questions:

- Can the mug silhouette better match the chunky glassware in the reference
  while using character-sheet style outlines?
- Should filled mugs show stout/foam more clearly, especially at speed?
- Does the empty mug need a different highlight or rim so it is readable as
  returning glassware rather than a small obstacle?

Notes:

- The large 8-bit reference image is strongest as direction for silhouette,
  black outline, glass highlights, foam shape, and fill bands.
- A generated concept sheet was useful for mood, but too large and loose to use
  directly at the current `16x16` game scale.
- The current candidate is deterministic pixel art generated into a sprite sheet
  so we can tweak individual pixels and regenerate consistently.

### Tap

Current surfaces:

- Source builder: `assets-src/build-tap-sprites.mjs`.
- Output sprites: `public/sprites/taps.png` and `public/sprites/taps.json`.
- Render hooks: `loadTapSprites` in `game/sprites.ts`, then `drawTap` in
  `game/render.ts`.

Questions:

- Should the tap become more tavern-specific, such as a wooden cask, iron
  fixture, brass spout, or guild-marked barrel?
- Can the handle and keg disc use stronger outline pixels like the characters?
- Does each lane need an identical tap, or should perspective/scale vary by
  lane?

Notes:

- The original Tapper tap reference is strongest as direction for composition:
  red handle on the left, short spout, large round cask on the wall.
- A generated concept pass supported the wooden cask / brass rim direction, but
  the current candidate is deterministic pixel art at `40x32` so it remains
  editable and stable at game scale.
- The sprite keeps a slightly larger, darker outline than the old canvas arcs to
  align with the character and mug sprites.

### Bar

Current surface: `drawBarSurface` in `game/render.ts`.

Questions:

- Can the bar front gain wood-grain, trim, or shaded plank details without
  competing with customers and mugs?
- Should the bar top be warmer/darker to sit behind the character sprites?
- Does the current perspective match the Tapper reference closely enough, or
  should the bar ends and edges be more stylized?

Notes:

- The current pass keeps the bar procedural, but splits it into top and front
  layers.
- The front now uses darker vertical ribs and a gold lower trim to match the
  original game reference more closely.
- Customers render behind the bar front; the bartender renders behind the bar
  normally but pops in front while pouring.

### Door

Current surfaces:

- Source builder: `assets-src/build-door-sprites.mjs`.
- Output sprites: `public/sprites/doors.png` and `public/sprites/doors.json`.
- Render hooks: `loadDoorSprites` in `game/sprites.ts`, then `drawDoor` in
  `game/render.ts`.

Questions:

- Should the entry points look like tavern doors, service hatches, guild
  banners, or lane markers?
- Can the door shape use medieval/fantasy iconography while staying readable as
  the customer spawn side?
- Do doors need more contrast against the left wall and floor?

Notes:

- The current candidate uses an open medieval stone arch and wood plank door,
  based on the provided reference's open version.
- The sprite is `34x56`, bottom-aligned to the lane bar surface.

### Wall Banner

Current surfaces:

- Source concept: `assets-src/signs/brood-beer-generated.png`.
- Source builder: `assets-src/build-sign-sprites.mjs`.
- Output sprites: `public/sprites/signs.png` and `public/sprites/signs.json`.
- Render hooks: `loadSignSprites` in `game/sprites.ts`, then `drawSign` in
  `game/render.ts`.

Questions:

- Should the wall sign become a hanging cloth banner, a carved tavern sign, or a
  neon-style arcade sign with fantasy treatment?
- How much text should remain on the sign at 512x448?
- Should this use an image asset for custom lettering rather than canvas text?

Notes:

- The current candidate uses an AI-generated source image for the arcade logo
  feel, then crops/resizes it deterministically into a `172x82` sprite.
- Text is exactly `Brood Beer` with `ON TAP` underneath.
- The treatment follows the original reference's red border, orange/gold
  letter mass, blue outline, and dark interior while avoiding copied text.

### Tips

Current surfaces:

- Source builder: `assets-src/build-tip-sprites.mjs`.
- Output sprites: `public/sprites/tips.png` and `public/sprites/tips.json`.
- Render hooks: `loadTipSprites` in `game/sprites.ts`, then `drawTip` in
  `game/render.ts`.

Questions:

- Should tips read as coin stacks, guild tokens, or a more Brood-specific
  collectible?
- How large can the sprite be before it competes with mugs and customers?
- Should the pickup collision stay wider than the visual sprite for player
  friendliness?

Notes:

- The current candidate follows the 8-bit coin-stack reference: four stacked
  bright gold coins with one leaning coin on the side.
- The visual sprite is `20x16`; pickup width is currently `18` logical pixels.
- The outline is golden-brown rather than black so the stack stays readable
  without becoming too heavy on the red bar surface.

## Review Process

1. Capture baseline screenshots from the current game at desktop and mobile
   scale.
2. Mark each candidate asset by readability, style fit, and gameplay clarity.
3. Produce small concept variants for one asset at a time.
4. Test variants in-game against moving customers, mugs, and HUD overlays.
5. Promote accepted variants into the renderer or an asset pipeline.

## Implementation Notes

- The character sprite pipeline currently outputs
  `public/sprites/characters.png` and `public/sprites/characters.json`.
- Environment props are currently procedural canvas drawings in
  `game/render.ts`.
- If several props become bitmap art, consider adding a `props.png` /
  `props.json` pipeline rather than embedding many one-off images.
- Preserve `ctx.imageSmoothingEnabled = false` for crisp scaling.
- Any new prop dimensions should respect constants in `game/layout.ts`,
  especially `MUG_W`, `MUG_H`, `BAR_THICKNESS`, and lane positions.

## Open Decisions

- Procedural canvas updates vs. new sprite sheet for props.
- Final banner treatment and wording.
- Shared palette for environment props.
- Whether prop variants should be reviewed as static mockups first or directly
  in the playable canvas.

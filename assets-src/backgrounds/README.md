# Background Source

`dungeon-generated-v1.png` was generated with the built-in image generation tool using `hack-thy-sack/ref/bg-ref.png` as a style and composition reference.

Prompt summary:

- Original 8-bit dungeon background.
- Dark blue stone walls, arched masonry, cracked blocks, and open stone floor.
- Warm orange fireplace glow on the left.
- Purple shadow accents and cool blue dungeon lighting.
- No characters, UI, text, logo, or watermark.

`assets-src/build-bg.mjs` crops/resizes this source into the game layout:

- `public/backgrounds/dungeon.png`
- `public/bg.png`

The generated game asset is `384x240`, with the bottom `36px` reserved as the black score band.

// Path C asset pipeline (plan §7): rasterize the design-system character
// SVGs into a single sprite sheet + JSON map. All art is regenerable:
//   npm run sprites
//
// Each character is contain-fit into a square cell, bottom-aligned
// (feet on the bar surface), quantized to a small palette for the
// CRT-era look.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("tapper-images/characters");
const OUT = path.resolve("public/sprites");
const CELL = 56;

// Customer pool order (Q2) — indices 0..14 in game logic;
// the tavern-keeper rides along as the last cell.
const CUSTOMERS = [
  "alchemist",
  "archer",
  "cleric",
  "druid",
  "dwarf",
  "healer",
  "hunter",
  "monk",
  "necromancer",
  "paladin",
  "ranger",
  "rogue",
  "scribe",
  "warrior",
  "wizard",
];
const NAMES = [...CUSTOMERS, "tavern-keeper"];

async function rasterize(name) {
  const svg = await readFile(path.join(SRC, `${name}.svg`));
  return sharp(svg, { density: 96 })
    .resize(CELL, CELL, {
      fit: "contain",
      position: "south",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const cells = await Promise.all(NAMES.map(rasterize));
  const sheet = sharp({
    create: {
      width: CELL * NAMES.length,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(cells.map((input, i) => ({ input, left: i * CELL, top: 0 })));

  await sheet
    .png({ palette: true, colors: 64, dither: 0 })
    .toFile(path.join(OUT, "characters.png"));

  await writeFile(
    path.join(OUT, "characters.json"),
    JSON.stringify({ cell: CELL, names: NAMES }, null, 2)
  );

  console.log(
    `wrote ${NAMES.length} sprites @ ${CELL}px -> public/sprites/characters.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

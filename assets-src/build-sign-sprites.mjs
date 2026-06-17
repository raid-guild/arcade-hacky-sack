// Build the wall sign sprite from the generated Brood Beer concept.
//
// The source concept is intentionally kept in assets-src so the public sprite is
// reproducible. The output is sized to SIGN_RECT in game/layout.ts.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("assets-src/signs/brood-beer-generated.png");
const OUT = path.resolve("public/sprites");
const CELL_W = 172;
const CELL_H = 82;

async function main() {
  await mkdir(OUT, { recursive: true });

  await sharp(SRC)
    .trim({ background: "#000000", threshold: 18 })
    .resize(CELL_W, CELL_H, { fit: "fill", kernel: "nearest" })
    .png({ palette: true, colors: 128, dither: 0 })
    .toFile(path.join(OUT, "signs.png"));

  await writeFile(
    path.join(OUT, "signs.json"),
    JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, names: ["brood-beer"] }, null, 2)
  );

  console.log(
    `wrote 1 sign sprite @ ${CELL_W}x${CELL_H}px -> public/sprites/signs.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

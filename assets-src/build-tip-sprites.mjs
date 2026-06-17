// Deterministic tip sprite sheet.
//
// Tips should read as a small stack of 8-bit coins rather than a flat token.
// This keeps the visual language aligned with the mug/tap sprites and makes the
// bonus pickup easier to spot on the bar.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/sprites");
const CELL_W = 20;
const CELL_H = 16;

const COLORS = {
  k: [111, 82, 16, 255],
  goldDark: [204, 128, 11, 255],
  gold: [242, 187, 25, 255],
  goldLight: [255, 231, 71, 255],
  shine: [255, 248, 164, 255],
};

function put(buf, sheetW, x, y, rgba) {
  if (x < 0 || y < 0 || x >= sheetW || y >= CELL_H) return;
  const i = (y * sheetW + x) * 4;
  buf[i] = rgba[0];
  buf[i + 1] = rgba[1];
  buf[i + 2] = rgba[2];
  buf[i + 3] = rgba[3];
}

function rect(buf, sheetW, x, y, w, h, rgba) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(buf, sheetW, xx, yy, rgba);
  }
}

function coin(buf, sheetW, x, y, w) {
  rect(buf, sheetW, x + 1, y, w - 2, 1, COLORS.goldLight);
  rect(buf, sheetW, x, y + 1, w, 2, COLORS.gold);
  rect(buf, sheetW, x + 1, y + 3, w - 2, 1, COLORS.goldDark);
  put(buf, sheetW, x, y + 3, COLORS.k);
  put(buf, sheetW, x + w - 1, y + 3, COLORS.k);
  rect(buf, sheetW, x + 2, y + 1, 2, 1, COLORS.shine);
}

function drawCoinStack(buf, sheetW) {
  // Leaning single coin at the right, like the reference.
  rect(buf, sheetW, 14, 7, 3, 7, COLORS.k);
  rect(buf, sheetW, 13, 6, 3, 7, COLORS.goldDark);
  rect(buf, sheetW, 12, 5, 3, 7, COLORS.gold);
  rect(buf, sheetW, 12, 5, 1, 2, COLORS.goldLight);
  put(buf, sheetW, 15, 13, COLORS.k);

  // Main stack.
  coin(buf, sheetW, 4, 2, 10);
  coin(buf, sheetW, 3, 5, 11);
  coin(buf, sheetW, 4, 8, 10);
  coin(buf, sheetW, 3, 11, 11);

  // Slight dark grounding pixels that still look like coin edge shadow.
  put(buf, sheetW, 3, 14, COLORS.k);
  rect(buf, sheetW, 5, 14, 8, 1, COLORS.goldDark);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const width = CELL_W;
  const height = CELL_H;
  const buf = Buffer.alloc(width * height * 4);
  drawCoinStack(buf, width);

  await sharp(buf, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 16, dither: 0 })
    .toFile(path.join(OUT, "tips.png"));

  await writeFile(
    path.join(OUT, "tips.json"),
    JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, names: ["coin-stack"] }, null, 2)
  );

  console.log(
    `wrote 1 tip sprite @ ${CELL_W}x${CELL_H}px -> public/sprites/tips.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

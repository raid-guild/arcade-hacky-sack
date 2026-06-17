// Deterministic tap/cask sprite for the right-wall fixtures.
//
// The silhouette follows the original Tapper wall tap: a round cask on the
// right wall, short spout reaching left, and red pull handle. The treatment
// shifts it toward the Brood Tapper fantasy tavern palette.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/sprites");
const CELL_W = 40;
const CELL_H = 32;

const COLORS = {
  k: [9, 13, 27, 255],
  woodDark: [62, 28, 18, 255],
  wood: [102, 49, 24, 255],
  woodLight: [154, 78, 31, 255],
  maroon: [111, 25, 24, 255],
  brassDark: [145, 98, 24, 255],
  brass: [222, 166, 48, 255],
  brassLight: [255, 211, 86, 255],
  ironDark: [43, 48, 54, 255],
  iron: [116, 125, 130, 255],
  ironLight: [190, 197, 194, 255],
  redDark: [116, 25, 31, 255],
  red: [232, 65, 50, 255],
  redLight: [255, 122, 82, 255],
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

function ellipse(buf, sheetW, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(buf, sheetW, x, y, rgba);
    }
  }
}

function drawBolt(buf, sheetW, x, y) {
  rect(buf, sheetW, x, y, 3, 3, COLORS.k);
  put(buf, sheetW, x + 1, y, COLORS.brassLight);
  put(buf, sheetW, x + 1, y + 1, COLORS.brass);
}

function drawTap(buf, sheetW) {
  // Back side of the wall-mounted cask.
  ellipse(buf, sheetW, 28, 16, 11, 14, COLORS.k);
  ellipse(buf, sheetW, 28, 16, 9, 12, COLORS.maroon);
  rect(buf, sheetW, 30, 7, 4, 18, [70, 18, 20, 255]);

  // Main barrel body.
  ellipse(buf, sheetW, 24, 16, 13, 14, COLORS.k);
  ellipse(buf, sheetW, 24, 16, 11, 12, COLORS.wood);
  rect(buf, sheetW, 17, 7, 14, 18, COLORS.woodDark);
  rect(buf, sheetW, 19, 8, 3, 16, COLORS.woodLight);
  rect(buf, sheetW, 29, 8, 2, 16, COLORS.woodDark);

  // Barrel stave bands.
  for (const y of [9, 14, 19, 24]) {
    rect(buf, sheetW, 18, y, 15, 2, COLORS.k);
    rect(buf, sheetW, 19, y, 12, 1, COLORS.woodLight);
  }

  // Front brass rim.
  ellipse(buf, sheetW, 18, 16, 8, 12, COLORS.k);
  ellipse(buf, sheetW, 18, 16, 7, 11, COLORS.brassDark);
  ellipse(buf, sheetW, 18, 16, 5, 9, COLORS.wood);
  rect(buf, sheetW, 14, 8, 2, 16, COLORS.brassLight);
  rect(buf, sheetW, 21, 8, 2, 16, COLORS.brassDark);
  put(buf, sheetW, 15, 6, COLORS.brassLight);
  put(buf, sheetW, 14, 25, COLORS.brassLight);

  drawBolt(buf, sheetW, 25, 6);
  drawBolt(buf, sheetW, 25, 23);

  // Spout and handle assembly reaching over the bar.
  rect(buf, sheetW, 5, 16, 13, 5, COLORS.k);
  rect(buf, sheetW, 6, 17, 10, 3, COLORS.iron);
  rect(buf, sheetW, 6, 17, 8, 1, COLORS.ironLight);
  rect(buf, sheetW, 2, 17, 5, 3, COLORS.k);
  rect(buf, sheetW, 2, 18, 4, 1, COLORS.ironLight);
  rect(buf, sheetW, 15, 14, 4, 9, COLORS.k);
  rect(buf, sheetW, 16, 15, 2, 7, COLORS.ironDark);
  put(buf, sheetW, 17, 15, COLORS.ironLight);

  rect(buf, sheetW, 8, 9, 4, 9, COLORS.k);
  rect(buf, sheetW, 9, 10, 2, 7, COLORS.redDark);
  rect(buf, sheetW, 7, 5, 6, 6, COLORS.k);
  rect(buf, sheetW, 8, 6, 4, 4, COLORS.red);
  put(buf, sheetW, 9, 6, COLORS.redLight);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const width = CELL_W;
  const height = CELL_H;
  const buf = Buffer.alloc(width * height * 4);
  drawTap(buf, width);

  await sharp(buf, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 32, dither: 0 })
    .toFile(path.join(OUT, "taps.png"));

  await writeFile(
    path.join(OUT, "taps.json"),
    JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, names: ["wall-cask"] }, null, 2)
  );

  console.log(
    `wrote 1 tap sprite @ ${CELL_W}x${CELL_H}px -> public/sprites/taps.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

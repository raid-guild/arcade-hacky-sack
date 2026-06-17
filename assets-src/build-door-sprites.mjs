// Deterministic door sprite sheet for lane entrances.
//
// The reference is a small medieval stone arch with a wooden door swung open.
// This keeps the entrance readable while fitting the Raid Guild tavern theme.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/sprites");
const CELL_W = 34;
const CELL_H = 56;

const COLORS = {
  k: [27, 22, 31, 255],
  shadow: [35, 29, 42, 255],
  stoneDark: [79, 87, 99, 255],
  stone: [128, 139, 151, 255],
  stoneLight: [190, 199, 205, 255],
  woodDark: [75, 38, 27, 255],
  wood: [126, 68, 37, 255],
  woodLight: [176, 97, 43, 255],
  brassDark: [151, 92, 20, 255],
  brass: [226, 158, 39, 255],
  brassLight: [255, 211, 83, 255],
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

function drawArch(buf, sheetW) {
  // Outer arch cap and columns.
  ellipse(buf, sheetW, 17, 16, 15, 15, COLORS.k);
  rect(buf, sheetW, 2, 16, 30, 38, COLORS.k);
  ellipse(buf, sheetW, 17, 16, 13, 13, COLORS.stoneDark);
  rect(buf, sheetW, 4, 16, 26, 37, COLORS.stoneDark);

  ellipse(buf, sheetW, 17, 17, 10, 10, COLORS.shadow);
  rect(buf, sheetW, 7, 17, 20, 35, COLORS.shadow);

  // Stone blocks and highlights.
  rect(buf, sheetW, 5, 18, 4, 8, COLORS.stone);
  rect(buf, sheetW, 25, 18, 4, 8, COLORS.stone);
  rect(buf, sheetW, 4, 30, 5, 9, COLORS.stone);
  rect(buf, sheetW, 25, 30, 5, 9, COLORS.stone);
  rect(buf, sheetW, 4, 43, 5, 9, COLORS.stone);
  rect(buf, sheetW, 25, 43, 5, 9, COLORS.stone);
  rect(buf, sheetW, 8, 7, 6, 4, COLORS.stoneLight);
  rect(buf, sheetW, 20, 7, 6, 4, COLORS.stoneLight);
  rect(buf, sheetW, 13, 4, 8, 4, COLORS.stone);
  put(buf, sheetW, 7, 13, COLORS.stoneLight);
  put(buf, sheetW, 26, 13, COLORS.stoneLight);
}

function drawOpenDoor(buf, sheetW) {
  // Hinged open plank, pulled forward from the dark arch.
  for (let y = 15; y <= 55; y++) {
    const left = Math.round(12 - Math.max(0, y - 19) * 0.03);
    const right = Math.round(24 + Math.max(0, y - 19) * 0.03);
    if (y < 19) continue;
    rect(buf, sheetW, left, y, right - left + 1, 1, COLORS.k);
  }
  for (let y = 20; y <= 52; y++) {
    const left = Math.round(14 - Math.max(0, y - 20) * 0.03);
    const right = Math.round(22 + Math.max(0, y - 20) * 0.03);
    rect(buf, sheetW, left, y, right - left + 1, 1, COLORS.wood);
  }

  rect(buf, sheetW, 14, 21, 3, 31, COLORS.woodLight);
  rect(buf, sheetW, 21, 18, 2, 34, COLORS.woodDark);
  rect(buf, sheetW, 13, 30, 11, 3, COLORS.brassDark);
  rect(buf, sheetW, 13, 31, 11, 1, COLORS.brassLight);
  rect(buf, sheetW, 14, 42, 10, 3, COLORS.brassDark);
  rect(buf, sheetW, 14, 43, 10, 1, COLORS.brassLight);
  rect(buf, sheetW, 20, 28, 3, 3, COLORS.brass);
  put(buf, sheetW, 21, 28, COLORS.brassLight);

  // A couple of diagonal plank slashes like the reference.
  for (let i = 0; i < 7; i++) {
    put(buf, sheetW, 15 + i, 25 + i, COLORS.woodDark);
    put(buf, sheetW, 15 + i, 26 + i, COLORS.brassDark);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const width = CELL_W;
  const height = CELL_H;
  const buf = Buffer.alloc(width * height * 4);
  drawArch(buf, width);
  drawOpenDoor(buf, width);

  await sharp(buf, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 48, dither: 0 })
    .toFile(path.join(OUT, "doors.png"));

  await writeFile(
    path.join(OUT, "doors.json"),
    JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, names: ["open-arch"] }, null, 2)
  );

  console.log(
    `wrote 1 door sprite @ ${CELL_W}x${CELL_H}px -> public/sprites/doors.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

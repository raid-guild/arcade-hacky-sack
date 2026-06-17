// Deterministic mug sprite sheet for small gameplay props.
//
// The source reference is the larger 8-bit beer mug direction: chunky side
// silhouette, dark outline, bright foam, readable fill band. These are authored
// as tiny pixel sprites so they remain useful at Brood Tapper's logical scale.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/sprites");
const CELL_W = 16;
const CELL_H = 16;

const COLORS = {
  k: [9, 13, 27, 255],
  glass: [232, 210, 159, 255],
  glassShade: [169, 124, 43, 255],
  shine: [255, 246, 214, 255],
  foam: [248, 238, 205, 255],
  foamShade: [229, 198, 121, 255],
  brood: [36, 20, 17, 255],
  broodLight: [117, 63, 28, 255],
  empty: [82, 68, 70, 255],
  emptyLight: [201, 184, 152, 255],
};

const SPRITES = [
  { name: "empty", fill: 0, foam: false, scale: 1 },
  { name: "filling-1", fill: 0.35, foam: false, scale: 1 },
  { name: "filling-2", fill: 0.68, foam: false, scale: 1 },
  { name: "full", fill: 1, foam: true, scale: 1 },
  { name: "life-full", fill: 1, foam: true, scale: 0.86 },
];

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

function drawFoam(buf, sheetW, ox, oy) {
  rect(buf, sheetW, ox + 2, oy + 1, 8, 1, COLORS.k);
  rect(buf, sheetW, ox + 1, oy + 2, 11, 1, COLORS.k);
  rect(buf, sheetW, ox, oy + 3, 12, 2, COLORS.k);
  rect(buf, sheetW, ox + 1, oy + 2, 9, 3, COLORS.foam);
  rect(buf, sheetW, ox + 3, oy + 1, 3, 1, COLORS.foam);
  rect(buf, sheetW, ox + 8, oy + 1, 2, 1, COLORS.foam);
  rect(buf, sheetW, ox + 9, oy + 3, 3, 2, COLORS.foamShade);
  put(buf, sheetW, ox + 4, oy + 5, COLORS.k);
  put(buf, sheetW, ox + 8, oy + 5, COLORS.k);
  put(buf, sheetW, ox + 2, oy + 2, COLORS.shine);
  put(buf, sheetW, ox + 5, oy + 2, COLORS.shine);
  put(buf, sheetW, ox + 6, oy + 3, COLORS.shine);
}

function drawMug(buf, sheetW, index, sprite) {
  const ox = index * CELL_W + (sprite.scale < 1 ? 1 : 0);
  const oy = sprite.scale < 1 ? 2 : 0;
  const bodyW = sprite.scale < 1 ? 8 : 10;
  const bodyH = sprite.scale < 1 ? 11 : 12;
  const bodyX = ox + 1;
  const bodyY = oy + 3;
  const innerX = bodyX + 1;
  const innerY = bodyY + 1;
  const innerW = bodyW - 2;
  const innerH = bodyH - 2;
  const handleX = bodyX + bodyW - 1;
  const handleY = bodyY + 3;

  rect(buf, sheetW, bodyX, bodyY, bodyW, bodyH, COLORS.k);
  rect(buf, sheetW, innerX, innerY, innerW, innerH, COLORS.glass);

  rect(buf, sheetW, handleX, handleY, 5, 7, COLORS.k);
  rect(buf, sheetW, handleX + 1, handleY + 1, 3, 5, COLORS.glass);
  rect(buf, sheetW, handleX + 2, handleY + 2, 2, 3, [0, 0, 0, 0]);

  rect(buf, sheetW, innerX + 1, innerY + 1, 1, innerH - 3, COLORS.shine);
  rect(buf, sheetW, innerX + innerW - 2, innerY + 1, 1, innerH - 2, COLORS.glassShade);
  rect(buf, sheetW, innerX + 2, innerY + innerH - 1, innerW - 3, 1, COLORS.shine);

  if (sprite.fill > 0) {
    const fillH = Math.max(1, Math.round((innerH - 2) * sprite.fill));
    const fy = innerY + innerH - 1 - fillH;
    rect(buf, sheetW, innerX + 1, fy, innerW - 2, fillH, COLORS.brood);
    rect(buf, sheetW, innerX + 2, fy, 1, fillH, COLORS.broodLight);
    rect(buf, sheetW, innerX + innerW - 2, fy, 1, fillH, [15, 9, 10, 255]);
    if (!sprite.foam) rect(buf, sheetW, innerX + 1, fy, innerW - 2, 1, COLORS.foamShade);
  } else {
    rect(buf, sheetW, innerX + 2, innerY + 3, innerW - 3, innerH - 4, COLORS.empty);
    rect(buf, sheetW, innerX + 2, innerY + 3, 1, innerH - 4, COLORS.emptyLight);
  }

  if (sprite.foam) drawFoam(buf, sheetW, ox, oy);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const width = CELL_W * SPRITES.length;
  const height = CELL_H;
  const buf = Buffer.alloc(width * height * 4);

  SPRITES.forEach((sprite, index) => drawMug(buf, width, index, sprite));

  await sharp(buf, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 32, dither: 0 })
    .toFile(path.join(OUT, "mugs.png"));

  await writeFile(
    path.join(OUT, "mugs.json"),
    JSON.stringify(
      {
        cell: { w: CELL_W, h: CELL_H },
        names: SPRITES.map((sprite) => sprite.name),
      },
      null,
      2
    )
  );

  console.log(
    `wrote ${SPRITES.length} mug sprites @ ${CELL_W}x${CELL_H}px -> public/sprites/mugs.{png,json}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

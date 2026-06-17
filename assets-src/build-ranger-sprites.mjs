import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("assets-src/ranger/generated-pose-sheet-v1-alpha.png");
const OUT = path.resolve("public/sprites");
const CELL = { w: 56, h: 72 };

const POSES = [
  "front-idle",
  "front-kick",
  "side-idle",
  "side-spin",
  "back-idle",
  "back-kick",
  "jump-header",
];

async function findBounds(buffer, info, x0, x1, poseIndex) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = x0; x < x1; x++) {
      const alpha = buffer[(y * info.width + x) * 4 + 3];
      if (alpha <= 40) continue;
      // The generated jump/header pose includes a tiny hack-sack marker above
      // the raised hand. It is useful in the concept sheet, but not in the
      // character sprite cell.
      if (poseIndex === 6 && y < 86) continue;
      // The generated side-idle pose has a detached bow floating behind the
      // body. It reads as an artifact once mirrored for left/right movement.
      if (poseIndex === 2 && x < x0 + 80) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`No sprite pixels found for pose ${POSES[poseIndex]}`);
  }

  return { minX, minY, maxX, maxY };
}

async function buildCell(source, raw, info, index) {
  const x0 = Math.floor((index * info.width) / POSES.length);
  const x1 = Math.floor(((index + 1) * info.width) / POSES.length);
  const bounds = await findBounds(raw, info, x0, x1, index);
  const pad = 8;
  const left = Math.max(0, bounds.minX - pad);
  const top = Math.max(0, bounds.minY - pad);
  const width = Math.min(info.width - left, bounds.maxX - bounds.minX + 1 + pad * 2);
  const height = Math.min(info.height - top, bounds.maxY - bounds.minY + 1 + pad * 2);

  const cropped = await source
    .clone()
    .extract({ left, top, width, height })
    .resize(CELL.w, CELL.h, {
      fit: "contain",
      position: "south",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "nearest",
    })
    .png()
    .toBuffer();

  return cropped;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const source = sharp(SRC).ensureAlpha();
  const { data, info } = await source
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cells = await Promise.all(
    POSES.map((_, index) => buildCell(source, data, info, index))
  );

  await sharp({
    create: {
      width: CELL.w * POSES.length,
      height: CELL.h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(cells.map((input, i) => ({ input, left: i * CELL.w, top: 0 })))
    .png({ palette: true, colors: 96, dither: 0 })
    .toFile(path.join(OUT, "ranger.png"));

  await writeFile(
    path.join(OUT, "ranger.json"),
    JSON.stringify(
      {
        cell: CELL,
        names: POSES,
        source: "assets-src/ranger/generated-pose-sheet-v1-alpha.png",
        review: "Manual art review required before launch.",
      },
      null,
      2
    )
  );

  console.log("wrote public/sprites/ranger.{png,json}");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

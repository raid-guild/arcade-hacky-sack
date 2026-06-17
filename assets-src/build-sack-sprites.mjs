import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/sprites");
const CELL = 12;
const NAMES = ["spin-0", "spin-1", "spin-2"];

function frame(i) {
  const highlights = [
    '<rect x="4" y="3" width="2" height="2" fill="#ff7474"/>',
    '<rect x="6" y="4" width="2" height="2" fill="#ff7474"/>',
    '<rect x="5" y="6" width="2" height="2" fill="#ff7474"/>',
  ];
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}" shape-rendering="crispEdges">
      <rect x="3" y="2" width="6" height="1" fill="#811925"/>
      <rect x="2" y="3" width="8" height="6" fill="#811925"/>
      <rect x="3" y="3" width="6" height="6" fill="#d92736"/>
      <rect x="4" y="8" width="4" height="2" fill="#a91f2e"/>
      ${highlights[i]}
    </svg>
  `;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const cells = await Promise.all(
    NAMES.map((_, i) => sharp(Buffer.from(frame(i))).png().toBuffer())
  );

  await sharp({
    create: {
      width: CELL * NAMES.length,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(cells.map((input, i) => ({ input, left: i * CELL, top: 0 })))
    .png({ palette: true, colors: 16, dither: 0 })
    .toFile(path.join(OUT, "sack.png"));

  await writeFile(
    path.join(OUT, "sack.json"),
    JSON.stringify({ cell: { w: CELL, h: CELL }, names: NAMES }, null, 2)
  );

  console.log("wrote public/sprites/sack.{png,json}");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

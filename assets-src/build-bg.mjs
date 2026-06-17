import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("assets-src/backgrounds/dungeon-generated-v1.png");
const OUT = path.resolve("public/backgrounds");
const W = 384;
const H = 240;
const HUD_Y = 204;

async function main() {
  await mkdir(OUT, { recursive: true });

  const scene = await sharp(SRC)
    .resize(W, H, {
      fit: "cover",
      position: "center",
      kernel: "nearest",
    })
    .composite([
      {
        input: {
          create: {
            width: W,
            height: H - HUD_Y,
            channels: 4,
            background: "#050505",
          },
        },
        left: 0,
        top: HUD_Y,
      },
    ])
    .png({ palette: true, colors: 96, dither: 0 })
    .toBuffer();

  await sharp(scene).toFile(path.join(OUT, "dungeon.png"));
  await sharp(scene).toFile(path.resolve("public/bg.png"));
  console.log("wrote public/backgrounds/dungeon.png and public/bg.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

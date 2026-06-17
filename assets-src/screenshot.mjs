// Dev helper: drive the game headlessly and capture screens for
// side-by-side comparison with the reference captures (plan §7 workflow).
//   node assets-src/screenshot.mjs [baseUrl] [outDir]

import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3111";
const out = process.argv[3] ?? "/tmp/brood-shots";
const { mkdirSync } = await import("node:fs");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

await page.goto(`${base}/play`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1-attract.png` });

await page.keyboard.press("Enter");
await page.waitForTimeout(900); // mid-loading
await page.screenshot({ path: `${out}/2-loading.png` });

await page.waitForTimeout(1500); // into gameplay
await page.screenshot({ path: `${out}/3-playing-early.png` });

// Pour a mug on lane 0, then hop lanes and pour again.
await page.keyboard.down("Space");
await page.waitForTimeout(700);
await page.keyboard.up("Space");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/4-mug-sliding.png` });

await page.keyboard.press("ArrowDown");
await page.keyboard.down("Space");
await page.waitForTimeout(700);
await page.keyboard.up("Space");
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(4000); // let customers pile in, empties return
await page.screenshot({ path: `${out}/5-playing-busy.png` });

await page.waitForTimeout(8000); // let a life be lost eventually
await page.screenshot({ path: `${out}/6-later.png` });

await browser.close();
console.log(`screens -> ${out}`);

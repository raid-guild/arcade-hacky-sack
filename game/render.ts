import {
  GROUND_Y,
  HUD_H,
  HUD_Y,
  LOGICAL_H,
  LOGICAL_W,
  PLAYER_H,
  PLAYER_W,
  SCORE_Y,
} from "./layout";
import { SACK_RADIUS } from "./constants";
import {
  drawRangerSprite,
  drawSackSprite,
  poseSpriteName,
  type RangerSpriteSheet,
  type SackSpriteSheet,
} from "./sprites";
import type { GameState } from "./types";

const PAL = {
  sky: "#6673df",
  skyLight: "#91a4f2",
  cloud: "#f4f1ec",
  cloudShade: "#d7d8ec",
  field: "#26732f",
  fieldDark: "#16551f",
  tree: "#064f43",
  treeDark: "#06352f",
  hud: "#050505",
  score: "#f7de58",
  text: "#f7de58",
  dim: "#9a8a4a",
  white: "#f5efe2",
  red: "#ff4a3d",
  sack: "#d92736",
  sackDark: "#811925",
};

export interface RenderOpts {
  font: string;
  rangerSprites: RangerSpriteSheet | null;
  sackSprites: SackSpriteSheet | null;
  background: HTMLImageElement | null;
  highScore: number;
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: RenderOpts
) {
  ctx.imageSmoothingEnabled = false;
  drawBackground(ctx, opts.background);
  drawPlayerShadow(ctx, state);
  drawPlayer(ctx, state, opts);
  drawSack(ctx, state, opts);
  drawPopups(ctx, state, opts);
  drawHud(ctx, state, opts);
  drawOverlay(ctx, state, opts);
  drawCallouts(ctx, state, opts);
}

function drawBackground(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null) {
  if (image) {
    ctx.drawImage(image, 0, 0, LOGICAL_W, LOGICAL_H);
    return;
  }

  ctx.fillStyle = PAL.sky;
  ctx.fillRect(0, 0, LOGICAL_W, HUD_Y);
  ctx.fillStyle = PAL.skyLight;
  ctx.fillRect(0, 96, LOGICAL_W, 7);
  drawCloud(ctx, 18, 13);
  drawCloud(ctx, 104, 24);
  drawCloud(ctx, 228, 17);
  drawCloud(ctx, 315, 28);

  ctx.fillStyle = "#6dc664";
  ctx.fillRect(0, 104, LOGICAL_W, 4);
  ctx.fillStyle = PAL.fieldDark;
  ctx.fillRect(0, 108, LOGICAL_W, 15);
  ctx.fillStyle = PAL.field;
  ctx.fillRect(0, 123, LOGICAL_W, HUD_Y - 123);

  for (const x of [18, 78, 166, 262, 337]) drawTree(ctx, x, 102);

  ctx.fillStyle = PAL.hud;
  ctx.fillRect(0, HUD_Y, LOGICAL_W, HUD_H);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PAL.cloud;
  ctx.fillRect(x, y + 6, 34, 4);
  ctx.fillRect(x + 8, y + 2, 18, 4);
  ctx.fillRect(x + 24, y + 10, 20, 3);
  ctx.fillStyle = PAL.cloudShade;
  ctx.fillRect(x + 3, y + 10, 36, 2);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  ctx.fillStyle = PAL.treeDark;
  ctx.fillRect(x - 2, baseY - 48, 4, 58);
  ctx.fillStyle = PAL.tree;
  for (let i = 0; i < 7; i++) {
    const y = baseY - 56 + i * 8;
    const w = 10 + i * 4;
    ctx.fillRect(x - w / 2, y, w, 7);
  }
}

function drawPlayerShadow(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(state.player.x - 14, GROUND_Y - 2, 28, 3);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: RenderOpts
) {
  const x = state.player.x - PLAYER_W / 2;
  const y = state.player.y - PLAYER_H;
  if (opts.rangerSprites) {
    const name = poseSpriteName(state.player.pose, state.player.facing);
    const flip = state.player.facing === "left" && name.startsWith("side");
    if (flip) {
      ctx.save();
      ctx.translate(x + PLAYER_W, y);
      ctx.scale(-1, 1);
      drawRangerSprite(ctx, opts.rangerSprites, name, 0, 0, PLAYER_W, PLAYER_H);
      ctx.restore();
    } else {
      drawRangerSprite(ctx, opts.rangerSprites, name, x, y, PLAYER_W, PLAYER_H);
    }
    return;
  }

  ctx.fillStyle = "#f0c34d";
  ctx.fillRect(x + 10, y + 2, 14, 13);
  ctx.fillStyle = "#2f65c8";
  ctx.fillRect(x + 8, y + 20, 18, 20);
  ctx.fillStyle = "#f08d6a";
  ctx.fillRect(x + 6, y + 18, 5, 20);
  ctx.fillRect(x + 24, y + 18, 5, 20);
  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(x + 9, y + 40, 6, 17);
  ctx.fillRect(x + 20, y + 40, 6, 17);
}

function drawSack(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: RenderOpts
) {
  const { sack } = state;
  const size = SACK_RADIUS * 2 + 4;
  if (opts.sackSprites) {
    drawSackSprite(
      ctx,
      opts.sackSprites,
      Math.floor(sack.spin * 4),
      sack.x - size / 2,
      sack.y - size / 2,
      size,
      size
    );
    return;
  }

  ctx.fillStyle = PAL.sackDark;
  ctx.fillRect(sack.x - 5, sack.y - 4, 9, 8);
  ctx.fillStyle = PAL.sack;
  ctx.fillRect(sack.x - 4, sack.y - 5, 8, 8);
  ctx.fillStyle = "#ff7474";
  ctx.fillRect(sack.x - 2, sack.y - 3, 2, 2);
}

function drawPopups(ctx: CanvasRenderingContext2D, state: GameState, opts: RenderOpts) {
  ctx.textAlign = "center";
  ctx.font = `8px ${opts.font}`;
  for (const popup of state.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, popup.timer / 0.35));
    ctx.fillStyle = PAL.score;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
}

function drawCallouts(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: RenderOpts
) {
  const callout = state.callouts.at(-1);
  if (!callout) return;

  const elapsed = callout.duration - callout.timer;
  const progress = Math.max(0, Math.min(1, elapsed / callout.duration));
  const intro = Math.min(1, progress / 0.22);
  const exit = Math.max(0, (progress - 0.64) / 0.36);
  const scale = 0.26 + easeOutBack(intro) * 0.98 - exit * 0.16;
  const alpha = Math.max(0, 1 - exit);
  const maxWidth = LOGICAL_W - 30;
  let fontSize = 28;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  while (fontSize > 12) {
    ctx.font = `${fontSize}px ${opts.font}`;
    if (ctx.measureText(callout.text).width * scale <= maxWidth) break;
    fontSize -= 2;
  }

  ctx.translate(LOGICAL_W / 2, HUD_Y * 0.42);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#26070b";
  ctx.strokeText(callout.text, 0, 0);
  ctx.fillStyle = PAL.score;
  ctx.fillText(callout.text, 0, 0);
  ctx.globalAlpha = Math.max(0, alpha * (1 - progress));
  ctx.fillStyle = PAL.white;
  ctx.fillText(callout.text, 0, -2);
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState, opts: RenderOpts) {
  ctx.fillStyle = PAL.hud;
  ctx.fillRect(0, HUD_Y, LOGICAL_W, HUD_H);
  ctx.textAlign = "center";
  ctx.font = `24px ${opts.font}`;
  ctx.fillStyle = PAL.score;
  ctx.fillText(String(state.stats.score), LOGICAL_W / 2, SCORE_Y);
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState, opts: RenderOpts) {
  if (state.phase === "playing") return;

  const overlay =
    state.phase === "attract"
      ? ["HACK THY SACK", "CLICK OR SPACE"]
      : state.phase === "ready"
        ? ["READY", "TIME THE FIRST KICK"]
        : state.phase === "dropped"
          ? [state.lives > 0 ? "DROPPED" : "NO LIVES", "GET SET"]
          : ["GAME OVER", "ENTER OR TAP"];

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(0, 0, LOGICAL_W, HUD_Y);
  ctx.textAlign = "center";
  ctx.fillStyle = PAL.text;
  ctx.font = `14px ${opts.font}`;
  ctx.fillText(overlay[0], LOGICAL_W / 2, 78);
  ctx.font = `8px ${opts.font}`;
  ctx.fillText(overlay[1], LOGICAL_W / 2, 98);
}

function easeOutBack(value: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

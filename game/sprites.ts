import type { Facing, Pose } from "./types";

export interface RangerSpriteSheet {
  image: HTMLImageElement;
  cell: { w: number; h: number };
  names: string[];
}

export interface SackSpriteSheet {
  image: HTMLImageElement;
  cell: { w: number; h: number };
  names: string[];
}

export async function loadRangerSprites(): Promise<RangerSpriteSheet | null> {
  return loadSheet<RangerSpriteSheet>("/sprites/ranger.json", "/sprites/ranger.png");
}

export async function loadSackSprites(): Promise<SackSpriteSheet | null> {
  return loadSheet<SackSpriteSheet>("/sprites/sack.json", "/sprites/sack.png");
}

async function loadSheet<T extends { image: HTMLImageElement }>(
  metaUrl: string,
  imageUrl: string
): Promise<T | null> {
  try {
    const res = await fetch(metaUrl);
    if (!res.ok) return null;
    const meta = await res.json();

    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    return { ...meta, image } as T;
  } catch {
    return null;
  }
}

export function poseSpriteName(pose: Pose, facing: Facing) {
  if (pose === "kick") return "front-kick";
  if (pose === "header" || pose === "jump") return "jump-header";
  if (pose === "spin") return "side-spin";
  if (pose === "backKick") return "back-kick";
  if (facing === "left" || facing === "right") return "side-idle";
  if (facing === "back") return "back-idle";
  return "front-idle";
}

export function drawRangerSprite(
  ctx: CanvasRenderingContext2D,
  sheet: RangerSpriteSheet,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  drawNamedSprite(ctx, sheet, name, x, y, w, h);
}

export function drawSackSprite(
  ctx: CanvasRenderingContext2D,
  sheet: SackSpriteSheet,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const name = sheet.names[frame % sheet.names.length] ?? sheet.names[0];
  drawNamedSprite(ctx, sheet, name, x, y, w, h);
}

function drawNamedSprite(
  ctx: CanvasRenderingContext2D,
  sheet: RangerSpriteSheet | SackSpriteSheet,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const index = sheet.names.indexOf(name);
  if (index < 0) return;
  ctx.drawImage(
    sheet.image,
    index * sheet.cell.w,
    0,
    sheet.cell.w,
    sheet.cell.h,
    x,
    y,
    w,
    h
  );
}

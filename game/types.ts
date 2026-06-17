export type Phase = "attract" | "ready" | "playing" | "dropped" | "game-over";

export type Facing = "front" | "left" | "right" | "back";

export type Pose =
  | "idle"
  | "kick"
  | "header"
  | "spin"
  | "backKick"
  | "jump"
  | "recover";

export type HitKind = "kick" | "header" | "backKick";

export interface Player {
  x: number;
  y: number;
  vy: number;
  facing: Facing;
  pose: Pose;
  poseTimer: number;
  actionId: number;
  lastScoredActionId: number;
}

export interface Sack {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  spin: number;
}

export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  timer: number;
}

export interface Callout {
  id: number;
  text: string;
  timer: number;
  duration: number;
}

export interface GameStats {
  score: number;
  hits: number;
  streak: number;
  comboHits: HitKind[];
  startedAt: number;
}

export interface GameState {
  phase: Phase;
  phaseTimer: number;
  lives: number;
  elapsed: number;
  player: Player;
  sack: Sack;
  stats: GameStats;
  popups: ScorePopup[];
  callouts: Callout[];
  nextId: number;
  events: GameEvent[];
}

export type GameEvent =
  | { type: "start" }
  | { type: "hit"; kind: HitKind; score: number; bonus: number }
  | { type: "callout"; text: string }
  | { type: "wall-bounce" }
  | { type: "drop" }
  | { type: "life-lost" }
  | { type: "game-over" };

export interface InputFrame {
  left: boolean;
  right: boolean;
  kick: boolean;
  jump: boolean;
  spin: boolean;
  start: boolean;
}

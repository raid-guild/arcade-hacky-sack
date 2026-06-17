import {
  ACTION_TIME,
  CALLOUT_TIME,
  DROP_TIME,
  LIVES,
  PLAYER_GRAVITY,
  PLAYER_JUMP_VELOCITY,
  PLAYER_SPEED,
  READY_TIME,
  SACK_DRAG,
  SACK_GRAVITY,
  SACK_RADIUS,
  SCORE_BACK_KICK,
  SCORE_COMBO_BONUS,
  SCORE_HEADER,
  SCORE_KICK,
  SCORE_POPUP_TIME,
  SCORE_STREAK_BONUS,
  SPIN_TIME,
  STREAK_INTERVAL,
} from "./constants";
import {
  GROUND_Y,
  PLAY_MAX_X,
  PLAY_MIN_X,
  PLAYER_H,
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  PLAYER_START_X,
  SACK_START_OFFSET,
} from "./layout";
import type { GameState, GameStats, HitKind, InputFrame, Pose } from "./types";

export function createGame(): GameState {
  return {
    phase: "attract",
    phaseTimer: 0,
    lives: LIVES,
    elapsed: 0,
    player: createPlayer(),
    sack: createSack(PLAYER_START_X),
    stats: createStats(0),
    popups: [],
    callouts: [],
    nextId: 1,
    events: [],
  };
}

function createPlayer() {
  return {
    x: PLAYER_START_X,
    y: GROUND_Y,
    vy: 0,
    facing: "front" as const,
    pose: "idle" as const,
    poseTimer: 0,
    actionId: 0,
    lastScoredActionId: -1,
  };
}

function createSack(playerX: number) {
  return {
    x: playerX + SACK_START_OFFSET.x,
    y: GROUND_Y + SACK_START_OFFSET.y,
    vx: 0,
    vy: 0,
    active: false,
    spin: 0,
  };
}

function createStats(startedAt: number): GameStats {
  return { score: 0, hits: 0, streak: 0, comboHits: [], startedAt };
}

function startRun(state: GameState) {
  state.lives = LIVES;
  state.elapsed = 0;
  state.player = createPlayer();
  state.sack = createSack(state.player.x);
  state.stats = createStats(Date.now());
  state.popups = [];
  state.callouts = [];
  state.phase = "ready";
  state.phaseTimer = READY_TIME;
  state.events.push({ type: "start" });
}

function resetAfterDrop(state: GameState) {
  state.player = { ...createPlayer(), x: state.player.x };
  state.sack = createSack(state.player.x);
  state.stats.streak = 0;
  state.stats.comboHits = [];
  state.phase = "ready";
  state.phaseTimer = READY_TIME;
}

export function step(state: GameState, dt: number, input: InputFrame) {
  updatePopups(state, dt);
  updateCallouts(state, dt);

  switch (state.phase) {
    case "attract":
      if (input.start || input.kick) startRun(state);
      break;

    case "ready":
      updatePlayer(state, dt, input);
      state.sack.x = state.player.x + SACK_START_OFFSET.x;
      state.sack.y = state.player.y + SACK_START_OFFSET.y;
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0 || input.kick) {
        performAction(state, "kick");
        launchSack(state, "kick");
        state.sack.active = true;
        state.phase = "playing";
      }
      break;

    case "playing":
      state.elapsed += dt;
      updatePlayer(state, dt, input);
      updateSack(state, dt);
      handleActions(state, input);
      handleHit(state);
      if (state.sack.y + SACK_RADIUS >= GROUND_Y) {
        state.lives -= 1;
        state.stats.streak = 0;
        state.stats.comboHits = [];
        state.phase = "dropped";
        state.phaseTimer = DROP_TIME;
        state.events.push({ type: "drop" }, { type: "life-lost" });
        addCallout(state, "DEAD SACK");
      }
      break;

    case "dropped":
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        if (state.lives > 0) {
          resetAfterDrop(state);
        } else {
          state.phase = "game-over";
          state.events.push({ type: "game-over" });
        }
      }
      break;

    case "game-over":
      if (input.start || input.kick) startRun(state);
      break;
  }
}

function updatePlayer(state: GameState, dt: number, input: InputFrame) {
  const player = state.player;
  if (input.left && !input.right) {
    player.x -= PLAYER_SPEED * dt;
    player.facing = "left";
  }
  if (input.right && !input.left) {
    player.x += PLAYER_SPEED * dt;
    player.facing = "right";
  }
  player.x = clamp(player.x, PLAYER_MIN_X, PLAYER_MAX_X);

  if (player.y < GROUND_Y || player.vy !== 0) {
    player.vy += PLAYER_GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y >= GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      if (player.pose === "jump" || player.pose === "header") player.pose = "idle";
    }
  }

  if (player.poseTimer > 0) {
    player.poseTimer -= dt;
    if (player.poseTimer <= 0 && player.pose !== "jump") {
      player.pose = "idle";
    }
  }
}

function handleActions(state: GameState, input: InputFrame) {
  if (input.jump && state.player.y >= GROUND_Y) {
    state.player.vy = PLAYER_JUMP_VELOCITY;
    performAction(state, "header");
    return;
  }
  if (input.spin) {
    performAction(state, "backKick");
    return;
  }
  if (input.kick) {
    performAction(state, "kick");
  }
}

function performAction(state: GameState, kind: HitKind) {
  const player = state.player;
  player.actionId += 1;
  player.poseTimer = kind === "backKick" ? SPIN_TIME : ACTION_TIME;
  if (kind === "kick") player.pose = "kick";
  if (kind === "header") player.pose = "header";
  if (kind === "backKick") {
    player.pose = "backKick";
    player.facing = "back";
  }
}

function updateSack(state: GameState, dt: number) {
  const sack = state.sack;
  if (!sack.active) return;

  sack.vy += SACK_GRAVITY * dt;
  sack.vx *= Math.pow(SACK_DRAG, dt * 60);
  sack.x += sack.vx * dt;
  sack.y += sack.vy * dt;
  sack.spin += (sack.vx * 0.04 + 4) * dt;

  if (sack.x < PLAY_MIN_X + SACK_RADIUS) {
    sack.x = PLAY_MIN_X + SACK_RADIUS;
    sack.vx = Math.abs(sack.vx) * 0.7;
    state.events.push({ type: "wall-bounce" });
  }
  if (sack.x > PLAY_MAX_X - SACK_RADIUS) {
    sack.x = PLAY_MAX_X - SACK_RADIUS;
    sack.vx = -Math.abs(sack.vx) * 0.7;
    state.events.push({ type: "wall-bounce" });
  }
}

function handleHit(state: GameState) {
  const kind = activeHitKind(state.player.pose);
  if (!kind) return;
  if (state.player.lastScoredActionId === state.player.actionId) return;
  if (!isInHitWindow(state, kind)) return;

  state.player.lastScoredActionId = state.player.actionId;
  launchSack(state, kind);
  scoreHit(state, kind);
}

function activeHitKind(pose: Pose): HitKind | null {
  if (pose === "kick") return "kick";
  if (pose === "header" || pose === "jump") return "header";
  if (pose === "backKick" || pose === "spin") return "backKick";
  return null;
}

function isInHitWindow(state: GameState, kind: HitKind) {
  const { player, sack } = state;
  const px = player.x;
  const headY = player.y - PLAYER_H + 8;
  const footY = player.y - 8;

  if (kind === "header") {
    return distance(sack.x, sack.y, px, headY) <= 22 && sack.vy > -90;
  }

  const side = player.facing === "left" ? -1 : 1;
  const xOffset = kind === "backKick" ? -side * 15 : side * 15;
  return distance(sack.x, sack.y, px + xOffset, footY) <= 24 && sack.vy > -80;
}

function launchSack(state: GameState, kind: HitKind) {
  const { player, sack } = state;
  const side = player.facing === "left" ? -1 : 1;
  sack.active = true;

  if (kind === "header") {
    sack.vx = (sack.x - player.x) * 1.7;
    sack.vy = -245;
    return;
  }

  if (kind === "backKick") {
    sack.vx = -side * 72;
    sack.vy = -275;
    return;
  }

  sack.vx = side * 50 + (sack.x - player.x) * 1.4;
  sack.vy = -255;
}

function scoreHit(state: GameState, kind: HitKind) {
  const base =
    kind === "header"
      ? SCORE_HEADER
      : kind === "backKick"
        ? SCORE_BACK_KICK
        : SCORE_KICK;

  state.stats.hits += 1;
  state.stats.streak += 1;
  const streakBonus =
    state.stats.streak % STREAK_INTERVAL === 0 ? SCORE_STREAK_BONUS : 0;
  const scoredCombo = updateCombo(state, kind);
  const comboBonus = scoredCombo ? SCORE_COMBO_BONUS : 0;
  const bonus = streakBonus + comboBonus;
  const score = base + bonus;
  state.stats.score += score;
  state.events.push({ type: "hit", kind, score: base, bonus });
  if (state.stats.streak === 30) addCallout(state, "Hackfinity");
  if (state.stats.streak === 50) addCallout(state, "HACKSTURBATOR");
  if (scoredCombo) addCallout(state, "SACK ON!");
  state.popups.push({
    id: state.nextId++,
    x: state.sack.x,
    y: state.sack.y - 10,
    text: bonus ? `+${base}+${bonus}` : `+${base}`,
    timer: SCORE_POPUP_TIME,
  });
}

function addCallout(state: GameState, text: string) {
  state.callouts.push({
    id: state.nextId++,
    text,
    timer: CALLOUT_TIME,
    duration: CALLOUT_TIME,
  });
  state.events.push({ type: "callout", text });
}

function updateCombo(state: GameState, kind: HitKind) {
  if (state.stats.comboHits.includes(kind)) {
    state.stats.comboHits = [kind];
    return false;
  }

  state.stats.comboHits = [...state.stats.comboHits, kind];
  if (state.stats.comboHits.length < 3) return false;

  state.stats.comboHits = [];
  return true;
}

function updateCallouts(state: GameState, dt: number) {
  for (const callout of state.callouts) {
    callout.timer -= dt;
  }
  state.callouts = state.callouts.filter((callout) => callout.timer > 0);
}

function updatePopups(state: GameState, dt: number) {
  for (const popup of state.popups) {
    popup.timer -= dt;
    popup.y -= 16 * dt;
  }
  state.popups = state.popups.filter((popup) => popup.timer > 0);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

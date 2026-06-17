export const LOGICAL_W = 384;
export const LOGICAL_H = 240;

export const HUD_H = 36;
export const HUD_Y = LOGICAL_H - HUD_H;
export const GROUND_Y = HUD_Y - 4;

export const PLAYER_W = 45;
export const PLAYER_H = 58;
export const PLAY_MIN_X = 28;
export const PLAY_MAX_X = LOGICAL_W - 28;
export const PLAYER_MIN_X = PLAY_MIN_X + PLAYER_W / 2;
export const PLAYER_MAX_X = PLAY_MAX_X - PLAYER_W / 2;
export const PLAYER_START_X = LOGICAL_W / 2;

export const SACK_START_OFFSET = { x: 14, y: -14 };

export const SCORE_Y = HUD_Y + 25;

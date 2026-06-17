"use client";

import { useEffect, useRef, useState } from "react";
import { LOGICAL_H, LOGICAL_W } from "@/game/layout";
import { createGame, step } from "@/game/state";
import { render } from "@/game/render";
import { startLoop } from "@/game/loop";
import { Input } from "@/game/input";
import { Sfx } from "@/game/audio";
import {
  loadRangerSprites,
  loadSackSprites,
  type RangerSpriteSheet,
  type SackSpriteSheet,
} from "@/game/sprites";

const PIXEL_FONT = `"Press Start 2P", monospace`;

interface LeaderboardRow {
  handle: string;
  score: number;
}

interface Leaderboard {
  top: LeaderboardRow[];
  personalBest: number | null;
}

type Control = "left" | "right" | "kick" | "jump" | "spin";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<Input | null>(null);
  const [gameOver, setGameOver] = useState<{ score: number } | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = createGame();
    const input = new Input();
    const sfx = new Sfx();
    inputRef.current = input;

    let rangerSprites: RangerSpriteSheet | null = null;
    let sackSprites: SackSpriteSheet | null = null;
    let background: HTMLImageElement | null = null;
    let highScore = 0;
    let isAuthed = false;
    let submittedGameOver = false;

    loadRangerSprites().then((s) => (rangerSprites = s));
    loadSackSprites().then((s) => (sackSprites = s));
    loadImage("/backgrounds/dungeon.png").then((img) => (background = img));

    fetch("/api/session")
      .then((r) => r.json())
      .then((s) => {
        isAuthed = Boolean(s.authenticated);
        setAuthed(isAuthed);
      })
      .catch(() => setAuthed(false));

    fetch("/api/scores")
      .then((r) => (r.ok ? r.json() : null))
      .then((b: Leaderboard | null) => {
        if (b?.top?.[0]) highScore = b.top[0].score;
      })
      .catch(() => {});

    const fit = () => {
      const scale = Math.max(
        1,
        Math.floor(
          Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H)
        )
      );
      canvas.width = LOGICAL_W;
      canvas.height = LOGICAL_H;
      canvas.style.width = `${LOGICAL_W * scale}px`;
      canvas.style.height = `${LOGICAL_H * scale}px`;
    };
    fit();
    window.addEventListener("resize", fit);

    input.attach(window);
    const unlockAudio = () => sfx.unlock();
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("pointerdown", unlockAudio, { once: true });

    const finishGame = async (score: number, durationMs: number) => {
      setGameOver({ score });
      if (isAuthed) {
        await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, durationMs }),
        }).catch(() => {});
      }
      const res = await fetch("/api/scores").catch(() => null);
      if (res?.ok) {
        const b = (await res.json()) as Leaderboard;
        setBoard(b);
        if (b.top?.[0]) highScore = Math.max(highScore, b.top[0].score);
      }
    };

    const loop = startLoop(
      (dt) => {
        step(game, dt, input.frame());
        for (const e of game.events) {
          if (e.type === "start") {
            submittedGameOver = false;
            setGameOver(null);
            setBoard(null);
          }
          if (e.type === "game-over" && !submittedGameOver) {
            submittedGameOver = true;
            void finishGame(
              game.stats.score,
              Math.max(0, Date.now() - game.stats.startedAt)
            );
          }
        }
        sfx.handle(game.events);
        game.events.length = 0;
      },
      () => {
        render(ctx, game, {
          font: PIXEL_FONT,
          rangerSprites,
          sackSprites,
          background,
          highScore,
        });
      }
    );

    return () => {
      loop.stop();
      input.detach(window);
      inputRef.current = null;
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
    };
  }, []);

  const press = (control: Control, active: boolean) => {
    inputRef.current?.setTouch(control, active);
  };

  const bind = (control: Control) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      press(control, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      press(control, false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      press(control, false);
    },
  });

  return (
    <div className="stage">
      <canvas
        ref={canvasRef}
        onPointerDown={() => inputRef.current?.tapKick()}
        aria-label="Hack Thy Sack game canvas"
      />
      <div className="touch-controls" aria-label="Touch controls">
        <div className="touch-controls__move">
          <button type="button" aria-label="Move left" {...bind("left")}>
            ←
          </button>
          <button type="button" aria-label="Move right" {...bind("right")}>
            →
          </button>
        </div>
        <div className="touch-controls__actions">
          <button type="button" aria-label="Jump" {...bind("jump")}>
            ↑
          </button>
          <button type="button" aria-label="Spin" {...bind("spin")}>
            ↓
          </button>
          <button type="button" aria-label="Kick" {...bind("kick")}>
            K
          </button>
        </div>
      </div>
      {gameOver && board && (
        <div className="overlay">
          <h2>HIGH SCORES</h2>
          <div className="board">
            {board.top.length === 0 && <div>NO SCORES YET</div>}
            {board.top.map((row, i) => (
              <div key={`${row.handle}-${i}`}>
                {String(i + 1).padStart(2, " ")}. {row.handle.toUpperCase()}{" "}
                — {row.score}
              </div>
            ))}
            {board.personalBest !== null && (
              <div className="me">YOUR BEST — {board.personalBest}</div>
            )}
            {authed === false && (
              <div className="me">LAUNCH FROM THE PORTAL TO RANK</div>
            )}
          </div>
          <p className="dim">ENTER OR TAP TO HACK AGAIN</p>
        </div>
      )}
    </div>
  );
}

async function loadImage(src: string) {
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

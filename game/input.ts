import type { InputFrame } from "./types";

const TRACKED = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Enter",
]);

type TouchControl = "left" | "right" | "kick" | "jump" | "spin";

export class Input {
  private held = new Set<string>();
  private touchHeld = new Set<TouchControl>();
  private kickPressed = false;
  private jumpPressed = false;
  private spinPressed = false;
  private startPressed = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (!TRACKED.has(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;

    this.held.add(e.code);
    if (e.code === "Space") this.kickPressed = true;
    if (e.code === "ArrowUp") this.jumpPressed = true;
    if (e.code === "ArrowDown") this.spinPressed = true;
    if (e.code === "Enter") this.startPressed = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (!TRACKED.has(e.code)) return;
    e.preventDefault();
    this.held.delete(e.code);
  };

  attach(target: Window) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
  }

  detach(target: Window) {
    target.removeEventListener("keydown", this.onKeyDown);
    target.removeEventListener("keyup", this.onKeyUp);
  }

  setTouch(control: TouchControl, active: boolean) {
    if (active) this.touchHeld.add(control);
    else this.touchHeld.delete(control);

    if (active && control === "kick") this.kickPressed = true;
    if (active && control === "jump") this.jumpPressed = true;
    if (active && control === "spin") this.spinPressed = true;
  }

  tapKick() {
    this.kickPressed = true;
    this.startPressed = true;
  }

  start() {
    this.startPressed = true;
  }

  frame(): InputFrame {
    const f: InputFrame = {
      left: this.held.has("ArrowLeft") || this.touchHeld.has("left"),
      right: this.held.has("ArrowRight") || this.touchHeld.has("right"),
      kick: this.kickPressed,
      jump: this.jumpPressed,
      spin: this.spinPressed,
      start: this.startPressed,
    };

    this.kickPressed = false;
    this.jumpPressed = false;
    this.spinPressed = false;
    this.startPressed = false;
    return f;
  }
}

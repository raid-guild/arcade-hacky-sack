import type { GameEvent } from "./types";

export class Sfx {
  private ctx: AudioContext | null = null;

  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    void this.ctx.resume();
  }

  handle(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === "hit") {
        const freq =
          event.kind === "header" ? 580 : event.kind === "backKick" ? 420 : 500;
        this.beep(freq, event.bonus ? 0.12 : 0.08, "square");
        if (event.bonus) this.beep(760, 0.11, "triangle", 0.05);
      }
      if (event.type === "wall-bounce") this.beep(230, 0.04, "square");
      if (event.type === "drop") this.beep(130, 0.18, "sawtooth");
      if (event.type === "start") this.beep(360, 0.08, "triangle");
    }
  }

  private beep(
    frequency: number,
    duration: number,
    type: OscillatorType,
    delay = 0
  ) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

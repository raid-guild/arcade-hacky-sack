// Fixed-timestep simulation (60Hz) with render on requestAnimationFrame
// (plan §4): deterministic ramp, consistent feel regardless of refresh rate.

const STEP = 1 / 60;
const MAX_FRAME = 0.25; // clamp away tab-switch time jumps

export interface Loop {
  stop(): void;
}

export function startLoop(
  update: (dt: number) => void,
  render: (alpha: number) => void
): Loop {
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let running = true;

  const frame = (now: number) => {
    if (!running) return;
    acc += Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render(acc / STEP);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}

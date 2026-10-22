import { alpha, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { LAMP_CORE } from "./common";
import { moonAt } from "./sky";

// Fireflies and embers: subtle glowing dots drifting in the side lanes, never behind the tower and
// never near the moon. Each wanders on its own slow loop in a band of the lane (low over the
// square at the start, then wherever the lanes are as you climb: they are near things that keep
// to the screen), and blinks on and off on its own rhythm: a soft glow with a bright core.

const COUNT = 16;
/** A firefly's light, flat in two steps so it reads as a glow (one flat grey-beige disc would read as a stain): wide and faint, then a warmer heart, then the core. */
const GLOWS = [alpha("#ffb83a", 0.12), alpha("#ffcf5a", 0.26)] as const;
const GLOW_R = [0.014, 0.0075] as const;
const DOTS = Array.from({ length: COUNT }, (_, i) => ({
  side: i % 2 ? 1 : -1,
  /** Where in the lane (0 at the column .. 1 at the screen's side) and how high (fraction of the screen). */
  across: hash(i + 9100),
  high: 0.48 + hash(i + 9200) * 0.4,
  ph: hash(i + 9300) * 20,
  rate: 0.5 + hash(i + 9400) * 0.6,
  blink: 0.25 + hash(i + 9500) * 0.3,
}));

/** The fireflies this frame (their glows first, then the cores). */
export function embers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const col0 = s.baseX - u * 0.07;
  const col1 = s.baseX + s.baseW + u * 0.07;
  const m = moonAt(s);
  const keep = m.r * 1.6;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (const d of DOTS) {
      const on = Math.sin(s.t * d.blink + d.ph);
      if (on < 0.2) continue;
      const k = Math.min(1, (on - 0.2) / 0.4);
      const lo = d.side < 0 ? u * 0.03 : col1 + u * 0.03;
      const hi = d.side < 0 ? col0 - u * 0.03 : s.cssW - u * 0.03;
      if (hi - lo < u * 0.04) continue;
      const x = lo + (hi - lo) * (0.5 + 0.45 * Math.sin(s.t * 0.13 * d.rate + d.ph + d.across * 6));
      const y = s.cssH * d.high + Math.sin(s.t * 0.4 * d.rate + d.ph * 2) * u * 0.05;
      if (Math.hypot(x - m.x, y - m.y) < keep) continue;
      const r = pass === 2 ? u * 0.0035 : u * GLOW_R[pass]! * k;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = pass === 2 ? LAMP_CORE : GLOWS[pass]!;
    ctx.fill();
  }
}


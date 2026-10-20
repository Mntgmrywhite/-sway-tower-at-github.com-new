import { hash } from "../../base/draw";
import type { Scene } from "../skin";
import { ridgeY } from "./hollow";
import type { Body } from "./sky";

// Whether the sun or the moon shows, for what must keep off its light (the owner's rule:
// nothing passes over the sun or the moon). A body can be faded out at the low end of its lane,
// or sunk behind what stands in front of it: the far hills, the cloud bank along the horizon,
// and the field from the horizon down. While any of its light shows, the clouds you climb past
// and the V of geese keep off it entirely; once it has gone, they need not, and in between they
// ease from one to the other, so nothing jumps when a body comes or goes.

/** A cloud puff: center and radius, screen px. */
export interface Puff {
  x: number;
  y: number;
  r: number;
}

/** The cloud bank's puffs, reused so nothing allocates per frame. */
const BANK: Puff[] = [];

function setPuff(i: number, x: number, y: number, r: number): void {
  const q = (BANK[i] ??= { x: 0, y: 0, r: 0 });
  q.x = x;
  q.y = y;
  q.r = r;
}

/**
 * The cloud bank's puffs this frame, as the base world piles them along the horizon (high at the
 * sides, low behind the tower), or none while it is below the screen. A reused array: read it
 * before the next call.
 */
export function bankPuffs(s: Scene): Puff[] {
  const base = s.horizonY + s.u * 0.02;
  let n = 0;
  if (base - s.u * 0.4 <= s.cssH) {
    const step = s.u * 0.06;
    for (let i = 0, x = -step; x < s.cssW + step; i++, x += step) {
      const side = Math.abs(x / s.cssW - 0.5) * 2;
      const pile = 0.2 + 0.95 * side * side;
      const r = s.u * (0.05 + hash(i + 600) * 0.04) * (0.7 + pile);
      setPuff(n++, x, base - s.u * 0.12 * pile - r * 0.2, r);
      if (side > 0.45) setPuff(n++, x + step * 0.5, base - s.u * 0.25 * pile, r * 0.75);
    }
  }
  BANK.length = n;
  return BANK;
}

/**
 * A body's light counts as gone once it is this far (in u) behind what stands in front of it, all
 * across it (deep enough that what keeps off it eases over as the camera climbs, not in a lurch)...
 */
const SUNK = 0.15;
/** ...beyond this much (u) kept in hand for the hills' ridge being drawn in straight steps. */
const SUNK_SLACK = 0.006;
/** Points across a body's light (in its reach) where what stands in front of it is checked: its middle, a ring halfway out, its rim. */
const DISC: readonly (readonly [number, number])[] = [
  [0, 0],
  ...Array.from({ length: 8 }, (_, i) => [0.5 * Math.cos((i * Math.PI) / 4), 0.5 * Math.sin((i * Math.PI) / 4)] as const),
  ...Array.from({ length: 20 }, (_, i) => [Math.cos((i * Math.PI) / 10), Math.sin((i * Math.PI) / 10)] as const),
];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/**
 * How firmly things must keep off body b's light: 1 while any of it shows (come on in its lane,
 * opaque enough to see: `lead`, see sky.ts; and some of it clear of the hills, the cloud bank and
 * the field), easing to 0 as it goes off at the low end of its lane or sinks behind them.
 */
export function keepClear(s: Scene, b: Body): number {
  if (!b.on || b.lead <= 0) return 0;
  const bank = bankPuffs(s);
  // How deep the light is behind what stands in front of it: the least depth over points across
  // it (each point as deep as the deepest thing in front of it), at or below 0 where some shows.
  let hidden = Infinity;
  for (const [dx, dy] of DISC) {
    const x = b.x + dx * b.reach;
    const y = b.y + dy * b.reach;
    let depth = Math.max(y - ridgeY(s, x), y - s.horizonY);
    for (const q of bank) depth = Math.max(depth, q.r - Math.hypot(x - q.x, y - q.y));
    hidden = Math.min(hidden, depth);
    if (hidden <= 0) break;
  }
  const sunk = (hidden - s.u * SUNK_SLACK) / (s.u * SUNK);
  return b.lead * (1 - smooth(sunk));
}

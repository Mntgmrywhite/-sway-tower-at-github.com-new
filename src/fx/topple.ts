import { BLOCK_HEIGHT } from "../config";
import { swayOffset, type GameState, type Tip } from "../game";
import type { Falling } from "./falling";

// Hard mode's fall: when a drop tips the tower, the slab above the failing interface swings about
// the contact corner as one rigid piece, speeding up like a falling body, and its bars peel off from
// the top into falling pieces. Renderer-only: the game just reports the tip (state.toppled).
//
// The balance check judges rest positions, but the tower is drawn swaying (frozen at game over),
// and the sway differs from level to level: a slab that tips at rest can look as if its weight were
// still over its support. So the fall starts from the pose on screen and, over its first SETTLE_TIME,
// slides the slab into its rest pose on the bar below it (as that bar is drawn): by the time the
// swing shows, the slab visibly hangs past the corner it tips over.

/** Seconds from the tip to the game-over card. */
export const TOPPLE_TIME = 1.2;
/** Angular acceleration of the tipping slab, rad/s²: it starts slow and gathers speed. */
const TIP_ACCEL = 3.4;
/** The slab's top bar peels off at PEEL_FROM seconds and its bottom bar at PEEL_TO; top-down between. */
const PEEL_FROM = 0.42;
const PEEL_TO = 0.7;
/** Gravity on peeled bars, world units/s²: heavier than a sliced sliver's, a whole tower is going. */
const TOPPLE_GRAVITY = 170;
/** Cap on the speed a bar takes from the swing, units/s, so a tall slab doesn't fling bars off screen. */
const MAX_FLING = 70;
/** Seconds the slab takes to settle from its pose on screen into its rest pose (eased, no jump). */
export const SETTLE_TIME = 0.15;

interface SlabBar {
  /** Center offset from the pivot, world units (y up): as drawn at the tip (dx0), and at rest (dx). */
  dx0: number;
  dx: number;
  dy: number;
  w: number;
  level: number;
  /** Seconds after the tip when this bar peels off. */
  at: number;
}

export interface Topple {
  /** Lowest bar of the slab, and the side it tips toward. */
  level: number;
  dir: -1 | 1;
  /**
   * The contact corner it swings about, world units: px0 as drawn at the tip, px at rest (the bar
   * below stays where it is drawn). The slab settles from one to the other over SETTLE_TIME.
   */
  px0: number;
  px: number;
  py: number;
  /** Seconds since the tip. */
  age: number;
  /** Bars still swinging with the slab, top first. */
  bars: SlabBar[];
}

/** A slab bar's pose right now: center (world units) and screen rotation (clockwise positive). */
export interface SlabPose {
  cx: number;
  cy: number;
  w: number;
  level: number;
  angle: number;
}

/**
 * Start the fall from the slab as drawn (sway frozen at the tip). It settles into its rest pose:
 * every slab bar where the balance check had it, relative to the bar below as that one is drawn.
 */
export function startTopple(state: GameState, tip: Tip): Topple {
  const below = state.blocks[tip.level - 1]!;
  const lowest = state.blocks[tip.level]!;
  const drawn = (i: number) => state.blocks[i]!.x + swayOffset(state, i);
  // At rest the slab rides the bar below's sway: the whole slab shifts by it, nothing else moves.
  const support = swayOffset(state, tip.level - 1);
  const rest = (i: number) => state.blocks[i]!.x + support;
  const corner = (x: (i: number) => number) => {
    const left = Math.max(x(tip.level - 1), x(tip.level));
    const right = Math.min(x(tip.level - 1) + below.w, x(tip.level) + lowest.w);
    return tip.dir > 0 ? right : left;
  };
  const px0 = corner(drawn);
  const px = corner(rest);
  const py = tip.level * BLOCK_HEIGHT;
  const n = state.blocks.length - tip.level;
  const bars: SlabBar[] = [];
  for (let i = state.blocks.length - 1; i >= tip.level; i--) {
    const b = state.blocks[i]!;
    const fromTop = state.blocks.length - 1 - i;
    bars.push({
      dx0: drawn(i) + b.w / 2 - px0,
      dx: rest(i) + b.w / 2 - px,
      dy: (i + 0.5) * BLOCK_HEIGHT - py,
      w: b.w,
      level: i,
      at: PEEL_FROM + (PEEL_TO - PEEL_FROM) * (n > 1 ? fromTop / (n - 1) : 0),
    });
  }
  return { level: tip.level, dir: tip.dir, px0, px, py, age: 0, bars };
}

/** How far the slab has settled from its drawn pose into its rest pose at `age`: 0 → 1, smoothstep. */
function settled(age: number): number {
  const k = Math.min(1, Math.max(0, age / SETTLE_TIME));
  return k * k * (3 - 2 * k);
}

/** The pivot, and a bar's offset from it, settled `k` (0..1) of the way from the drawn to the rest pose. */
function pivotX(t: Topple, k: number): number {
  return t.px0 + (t.px - t.px0) * k;
}
function offsetX(b: SlabBar, k: number): number {
  return b.dx0 + (b.dx - b.dx0) * k;
}

/** True until the card should show. */
export function toppling(t: Topple | null): boolean {
  return t !== null && t.age < TOPPLE_TIME;
}

/** Swing angle (radians, always >= 0) and its rate at `age` seconds. */
function swing(age: number): { theta: number; omega: number } {
  return { theta: 0.5 * TIP_ACCEL * age * age, omega: TIP_ACCEL * age };
}

/** Where a slab bar is at swing angle `theta`: its offset `dx` (and dy) rotated about the pivot toward `dir`. */
function rotate(t: Topple, b: SlabBar, dx: number, theta: number): { x: number; y: number } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: dx * c + t.dir * b.dy * s, y: -t.dir * dx * s + b.dy * c };
}

/** Age the fall by `dt`; bars whose time has come leave the slab and join `falling`. */
export function stepTopple(t: Topple, dt: number, falling: Falling[]): void {
  t.age += dt;
  const { theta, omega } = swing(t.age);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const k = settled(t.age);
  const px = pivotX(t, k);
  const keep: SlabBar[] = [];
  for (const b of t.bars) {
    if (t.age < b.at) {
      keep.push(b);
      continue;
    }
    // Bars peel off well after the slab has settled, so only the swing moves them.
    const dx = offsetX(b, k);
    const p = rotate(t, b, dx, theta);
    // Velocity of a point on the swinging slab (world, y up), capped.
    let vx = omega * (-dx * s + t.dir * b.dy * c);
    let vy = omega * (-t.dir * dx * c - b.dy * s);
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_FLING) {
      vx *= MAX_FLING / speed;
      vy *= MAX_FLING / speed;
    }
    falling.push({
      x: px + p.x - b.w / 2,
      w: b.w,
      y: t.py + p.y - BLOCK_HEIGHT / 2,
      vx,
      vy: -vy,
      angle: t.dir * theta,
      spin: t.dir * omega,
      level: b.level,
      gravity: TOPPLE_GRAVITY,
      alpha: 1,
    });
  }
  t.bars = keep;
}

/** The bars still swinging with the slab, posed for drawing. */
export function slabPoses(t: Topple): SlabPose[] {
  const { theta } = swing(t.age);
  const k = settled(t.age);
  const px = pivotX(t, k);
  return t.bars.map((b) => {
    const p = rotate(t, b, offsetX(b, k), theta);
    return { cx: px + p.x, cy: t.py + p.y, w: b.w, level: b.level, angle: t.dir * theta };
  });
}

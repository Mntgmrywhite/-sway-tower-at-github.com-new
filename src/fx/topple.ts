import { BLOCK_HEIGHT } from "../config";
import { swayOffset, type GameState, type Tip } from "../game";
import type { Falling } from "./falling";

// Hard mode's fall: when a drop tips the tower, the slab above the failing interface swings about
// the contact corner as one rigid piece, speeding up like a falling body, and its bars peel off from
// the top into falling pieces. Renderer-only: the game just reports the tip (state.toppled).

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

interface SlabBar {
  /** Center offset from the pivot at rest, world units (y up). */
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
  /** The contact corner it swings about, world units. */
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

/** Snapshot the slab where it stands (sway frozen at the tip) and start the fall. */
export function startTopple(state: GameState, tip: Tip): Topple {
  const worldX = (i: number) => state.blocks[i]!.x + swayOffset(state, i);
  const below = state.blocks[tip.level - 1]!;
  const lowest = state.blocks[tip.level]!;
  const lx = worldX(tip.level - 1);
  const ux = worldX(tip.level);
  const left = Math.max(lx, ux);
  const right = Math.min(lx + below.w, ux + lowest.w);
  const px = tip.dir > 0 ? right : left;
  const py = tip.level * BLOCK_HEIGHT;
  const n = state.blocks.length - tip.level;
  const bars: SlabBar[] = [];
  for (let i = state.blocks.length - 1; i >= tip.level; i--) {
    const b = state.blocks[i]!;
    const fromTop = state.blocks.length - 1 - i;
    bars.push({
      dx: worldX(i) + b.w / 2 - px,
      dy: (i + 0.5) * BLOCK_HEIGHT - py,
      w: b.w,
      level: i,
      at: PEEL_FROM + (PEEL_TO - PEEL_FROM) * (n > 1 ? fromTop / (n - 1) : 0),
    });
  }
  return { level: tip.level, dir: tip.dir, px, py, age: 0, bars };
}

/** True until the card should show. */
export function toppling(t: Topple | null): boolean {
  return t !== null && t.age < TOPPLE_TIME;
}

/** Swing angle (radians, always >= 0) and its rate at `age` seconds. */
function swing(age: number): { theta: number; omega: number } {
  return { theta: 0.5 * TIP_ACCEL * age * age, omega: TIP_ACCEL * age };
}

/** Where a slab bar is at swing angle `theta`: its rest offset rotated about the pivot toward `dir`. */
function rotate(t: Topple, b: SlabBar, theta: number): { x: number; y: number } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: b.dx * c + t.dir * b.dy * s, y: -t.dir * b.dx * s + b.dy * c };
}

/** Age the fall by `dt`; bars whose time has come leave the slab and join `falling`. */
export function stepTopple(t: Topple, dt: number, falling: Falling[]): void {
  t.age += dt;
  const { theta, omega } = swing(t.age);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const keep: SlabBar[] = [];
  for (const b of t.bars) {
    if (t.age < b.at) {
      keep.push(b);
      continue;
    }
    const p = rotate(t, b, theta);
    // Velocity of a point on the swinging slab (world, y up), capped.
    let vx = omega * (-b.dx * s + t.dir * b.dy * c);
    let vy = omega * (-t.dir * b.dx * c - b.dy * s);
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_FLING) {
      vx *= MAX_FLING / speed;
      vy *= MAX_FLING / speed;
    }
    falling.push({
      x: t.px + p.x - b.w / 2,
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
  return t.bars.map((b) => {
    const p = rotate(t, b, theta);
    return { cx: t.px + p.x, cy: t.py + p.y, w: b.w, level: b.level, angle: t.dir * theta };
  });
}

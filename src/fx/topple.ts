import { BLOCK_HEIGHT } from "../config";
import { swayOffset, topLevel, topplePivot, type GameState } from "../game";
import { hash } from "../base/draw";
import { FALL_DRIFT, FALL_SPIN, type Falling } from "./falling";

// The TOPPLED animation (renderer-only; the logic is frozen at phase 'over'). At age 0 the
// picture is identical to the last playing frame. Timeline, seconds:
//   0 – FLASH        white flash and a crack at the pivot seam
//   FLASH – SPIN_END the slab above the pivot rotates about the pivot block's top corner,
//                    theta = dir * ½ * SPIN_ACCEL * t²; bars peel off as falling pieces once
//                    theta passes PEEL_AT; the camera shakes with decay
//   SLAM             "TOPPLED!" slams in
//   TOPPLE_CARD_AT   the game-over card (titled TOPPLED) fades in over CARD_FADE

export const TOPPLE_FLASH = 0.25;
const TOPPLE_SPIN_END = 1.2;
export const TOPPLE_SLAM = 1.15;
/** The game-over card comes up this long after the topple (restart waits for it), seconds. */
export const TOPPLE_CARD_AT = 1.4;
/** The card fades in, and TOPPLED! fades out, over this long, seconds. */
export const CARD_FADE = 0.2;
const SPIN_ACCEL = 3; // rad/s^2
const PEEL_AT = 0.6; // rad
/** The whole slab has peeled this long after the first bar goes. */
const PEEL_SPAN = 0.3;
/** Extra outward speed for peeled bars, world units/s. */
const PEEL_KICK = 1.4 * FALL_DRIFT;

/**
 * Visual only: a topple always takes at least this many bars with it. topplePivot() picks the
 * narrowest joint, which on a tower whittled by same-side chops is the one right under the top,
 * so on its own the "topple" would be a single bar sliding off a tower that stays standing.
 */
export const MIN_SLAB = 5;

/** The joint the fall breaks at: topplePivot(), but never fewer than MIN_SLAB bars above it. */
export function fallPivot(state: GameState): number {
  return Math.min(topplePivot(state), Math.max(1, topLevel(state) - MIN_SLAB));
}

export interface ToppleFx {
  /** Seconds since the topple. */
  age: number;
  /** The slab above this level breaks off. */
  pivot: number;
  dir: 1 | -1;
  /** Bars already peeled off the top of the slab. */
  peeled: number;
}

/** Slab rotation, radians, before the sign of `dir`. */
export function toppleAngle(age: number): number {
  const t = Math.max(0, Math.min(age, TOPPLE_SPIN_END) - TOPPLE_FLASH);
  return 0.5 * SPIN_ACCEL * t * t;
}

export interface SlabPose {
  pivot: number;
  /** World point the slab rotates about: the pivot block's top corner on the fall side. */
  px: number;
  py: number;
  /** Screen rotation (clockwise positive). */
  angle: number;
  /** Highest level still attached to the slab (the ones above have peeled). */
  keep: number;
}

export function slabPose(tf: ToppleFx, state: GameState): SlabPose {
  const b = state.blocks[tf.pivot];
  const x = b ? b.x + swayOffset(state, tf.pivot) + (tf.dir > 0 ? b.w : 0) : 0;
  return {
    pivot: tf.pivot,
    px: x,
    py: (tf.pivot + 1) * BLOCK_HEIGHT,
    angle: tf.dir * toppleAngle(tf.age),
    keep: topLevel(state) - tf.peeled,
  };
}

/** Rotate a world point with the slab. Screen-clockwise is negative in world (y-up) terms. */
function rotate(p: SlabPose, x: number, y: number): [number, number] {
  const a = -p.angle;
  const dx = x - p.px;
  const dy = y - p.py;
  return [p.px + dx * Math.cos(a) - dy * Math.sin(a), p.py + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Advance the animation and peel bars off the top of the slab into `falling`. */
export function stepTopple(tf: ToppleFx, state: GameState, dt: number, falling: Falling[]): void {
  tf.age += dt;
  const n = topLevel(state);
  const slab = n - tf.pivot;
  const peelStart = TOPPLE_FLASH + Math.sqrt((2 * PEEL_AT) / SPIN_ACCEL);
  if (tf.age < peelStart || slab <= 0) return;
  const want = Math.min(slab, Math.ceil(((tf.age - peelStart) / PEEL_SPAN) * slab) || 1);
  if (tf.peeled >= want) return;
  const pose = slabPose(tf, state);
  const t = Math.max(0, Math.min(tf.age, TOPPLE_SPIN_END) - TOPPLE_FLASH);
  const w = tf.dir * SPIN_ACCEL * t; // screen angular velocity
  while (tf.peeled < want) {
    const level = n - tf.peeled;
    tf.peeled += 1;
    const b = state.blocks[level];
    if (!b) continue;
    const cx = b.x + swayOffset(state, level) + b.w / 2;
    const cy = level * BLOCK_HEIGHT + BLOCK_HEIGHT / 2;
    const [rx, ry] = rotate(pose, cx, cy);
    // Velocity of that point on the spinning slab (world, y up), plus an outward shove.
    const ox = rx - pose.px;
    const oy = ry - pose.py;
    const vx = w * oy + tf.dir * PEEL_KICK * (0.6 + 0.8 * hash(level * 7 + 3));
    const vyUp = -w * ox;
    falling.push({
      x: rx - b.w / 2,
      y: ry - BLOCK_HEIGHT / 2,
      w: b.w,
      vx,
      vy: -vyUp,
      angle: pose.angle,
      spin: tf.dir * FALL_SPIN * (1.2 + hash(level * 13 + 1)),
      level,
    });
  }
}

/** Camera shake in CSS px: a jolt when the slab breaks, a bump when TOPPLED! lands. */
export function toppleShake(tf: ToppleFx | null, u: number): [number, number] {
  if (!tf || tf.age < TOPPLE_FLASH) return [0, 0];
  const a = tf.age;
  let amp = u * 0.014 * Math.exp(-3 * (a - TOPPLE_FLASH));
  if (a >= TOPPLE_SLAM) amp += u * 0.012 * Math.exp(-9 * (a - TOPPLE_SLAM));
  if (amp < 0.2) return [0, 0];
  return [amp * Math.sin(a * 57), amp * 0.7 * Math.cos(a * 43)];
}

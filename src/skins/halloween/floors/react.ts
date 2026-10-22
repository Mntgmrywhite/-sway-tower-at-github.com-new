import type { BarInfo } from "../../skin";

// A new floor lands and the house shudders: shutters rattle, lanterns swing, the windows of the
// floors below blink, dust sifts down from the seam, the roof hops up onto the new top floor, the
// rocking chair gives an extra rock and the skeleton jumps. Only the details move; a floor's outline
// never does (the tower's geometry is the game). With reduce motion on there is no dust and no
// blink, and everything swings at a third.
//
// The painter is told each bar's role but not how tall the tower is, so it remembers the level of
// the last top floor it painted: the four floors from there down react. The renderer paints the
// tower bottom up, so the floors below the top read last frame's top (one frame stale, unseen).

/** How long a landing shakes the house, in seconds. */
export const REACT_TIME = 1.5;
/** How many floors react: the top and the three below it. */
export const REACT_DEPTH = 4;
/** The amplitude of the shudder down the tower, top first. */
const FALLOFF = [1, 0.8, 0.65, 0.5] as const;
/** Shutters: ±0.25 rad, ringing down in 0.25 s. Lanterns: ±0.35 rad, in 0.6 s. */
const SHAKE = 0.25;
const SHAKE_TAU = 0.25;
const SHAKE_W = 45;
const SWING = 0.35;
const SWING_TAU = 0.6;
const SWING_W = 7.8;
/** The windows go dark for a moment on the two floors under the new one. */
const BLINK_FROM = 0.05;
const BLINK_TO = 0.13;
/** Interior details (and the windows) jitter for 0.25 s, ±0.045 h. */
const JITTER_TIME = 0.25;
const JITTER = 0.045;
/** Dust falls down the face of the floor under the new one in 0.7 s. */
export const DUST_TIME = 0.7;
/** The new top floor's roof drops in from 0.15 h up with a damped bounce. */
export const ROOF_DROP = 0.15;
const DROP_TAU = 0.12;
const DROP_W = 14;
/** With reduce motion on, swings are a third as big. */
const STILL = 1 / 3;

let topSeen = -Infinity;

/** The renderer is painting the top floor at `level`. */
export function noteTop(level: number): void {
  topSeen = level;
}

/** What a floor does this frame because a floor landed (all zero when nothing did). */
export interface Shudder {
  /** 0 = the top floor, 1..3 below it; -1 = not reacting. */
  depth: number;
  /** Seconds since the landing (0 when not reacting). */
  since: number;
  /** Shutters' extra angle, rad. */
  shake: number;
  /** Lanterns' extra angle, rad. */
  swing: number;
  /** Every pane dark for a moment. */
  blink: boolean;
  /** Interior details' offset, in floor heights. */
  jx: number;
  jy: number;
  /** Dust down the face: 0..1 progress, -1 none. */
  dust: number;
  /** The roof's offset, in floor heights (negative = up). */
  drop: number;
  /** A jolt for the rooms (the chair rocks, the skeleton jumps): 0..1, decaying. */
  jolt: number;
}

const SHUDDER: Shudder = { depth: -1, since: 0, shake: 0, swing: 0, blink: false, jx: 0, jy: 0, dust: -1, drop: 0, jolt: 0 };

function calm(out: Shudder): Shudder {
  out.depth = -1;
  out.since = 0;
  out.shake = 0;
  out.swing = 0;
  out.blink = false;
  out.jx = 0;
  out.jy = 0;
  out.dust = -1;
  out.drop = 0;
  out.jolt = 0;
  return out;
}

/** How the floor at `level` shudders now (a reused object: read it before the next call). */
export function shudder(level: number, info: BarInfo): Readonly<Shudder> {
  const out = SHUDDER;
  const t = info.sinceLand;
  if (info.role === "slider" || info.role === "loose" || !(t >= 0 && t < REACT_TIME)) return calm(out);
  const depth = info.role === "top" ? 0 : topSeen - level;
  if (!(depth >= 0 && depth < REACT_DEPTH)) return calm(out);
  const amp = FALLOFF[depth]! * (info.still ? STILL : 1);
  out.depth = depth;
  out.since = t;
  out.shake = SHAKE * amp * Math.exp(-t / SHAKE_TAU) * Math.sin(SHAKE_W * t + level);
  out.swing = SWING * amp * Math.exp(-t / SWING_TAU) * Math.sin(SWING_W * t);
  out.blink = !info.still && (depth === 1 || depth === 2) && t >= BLINK_FROM && t < BLINK_TO;
  const j = t < JITTER_TIME ? JITTER * amp * (1 - t / JITTER_TIME) : 0;
  out.jx = j * Math.sin(61 * t + level * 1.7);
  out.jy = j * Math.cos(53 * t + level);
  out.dust = !info.still && depth === 1 && t < DUST_TIME ? t / DUST_TIME : -1;
  out.drop = info.role === "top" ? -ROOF_DROP * (info.still ? STILL : 1) * Math.exp(-t / DROP_TAU) * Math.abs(Math.cos(DROP_W * t)) : 0;
  out.jolt = amp * Math.exp(-t / 0.35);
  return out;
}

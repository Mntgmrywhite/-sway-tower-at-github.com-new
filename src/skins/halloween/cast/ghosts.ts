import type { Ctx } from "../../../base/draw";
import { hash } from "../../../base/draw";
import { GHOST_BODY, GHOST_RIM, GOLD, GOLD_HALO, HOLLOW, INK } from "./palette";
import { bump, Rhythm, smooth, VISIT } from "./time";

// Friendly ghosts: a translucent ghost-white teardrop with a glow of ghost green round its edge,
// big hollow drooping eyes, a little round "oo" of a mouth, two stubby arms and a long wispy tail
// that splits into three curling points. One rises from behind a gravestone now and then (every
// 18-30 s), hovers, waves, and sinks back into the earth; others drift aimlessly across the lanes
// between the buildings and fade away, each one different (DRIFT_KINDS): the plain sheet, a tall
// long-armed one reaching out ahead of itself, a tattered one with a ragged hem and a hole worn
// through, and one carrying a lantern; big or small, rising, wandering up and down, swooping, or
// turning a loop on its way. A floor landing on the tower makes them squash for a moment in
// surprise. Silly-spooky.
//
// Drawn about its tail's base (x, y) (where the tail meets the ground or the stone when it is
// fully up), `h` px tall, facing `dir`.

/** Height in u at k = 1. */
export const GHOST_H = 0.09;

/** A rise from the grave, seconds from its start: up, wave, sink. */
const RISE = 0.8;
const WAVE = 1.4;
const SINK = 0.6;
const VISIT_T = RISE + WAVE + SINK;
/** First rise at 7.0 s (2.2 s earlier per step of its anchor's id mod 3), then every 18-30 s. */
const GRAVE = new Rhythm(7.0, -2.2, 18, 30, 71);
/** Drifting ghosts: one every 12-22 s, the first at 4.0 s, 6-9 s across. */
const DRIFT = new Rhythm(4.0, 1.5, 12, 22, 73);

export interface GhostPose {
  vis: number;
  /** 0 sunk out of sight .. 1 fully risen. */
  rise: number;
  /** Hovering bob, -1..1. */
  bob: number;
  /** 0..1 an arm raised, waving. */
  wave: number;
  /** 0..1 squashed in surprise. */
  squash: number;
}

const POSE: GhostPose = { vis: 0, rise: 0, bob: 0, wave: 0, squash: 0 };

/** The ghost of the gravestone anchored `seed` at time t (pure; the result is reused scratch). */
export function graveGhostAt(t: number, seed: number, sinceLand: number): Readonly<GhostPose> {
  const a = GRAVE.at(t, seed);
  const p = POSE;
  p.vis = 0;
  p.rise = 0;
  p.bob = Math.sin(t * 2.3 + seed);
  p.wave = 0;
  p.squash = 0;
  if (!(a >= 0 && a < VISIT_T)) return p;
  p.rise = smooth(0, RISE, a) * (1 - smooth(RISE + WAVE, VISIT_T, a));
  p.vis = smooth(0, 0.25, p.rise);
  p.wave = bump(RISE, RISE + 0.2, RISE + WAVE - 0.2, RISE + WAVE, a) * (0.6 + 0.4 * Math.sin(t * 9));
  p.squash = sinceLand >= 0 ? bump(0, 0.05, 0.12, 0.2, sinceLand) : 0;
  return p;
}

/** The drifting ghosts' looks: the plain sheet, long-armed, tattered, with a lantern. */
export const DRIFT_KINDS = 4;
/** Their ways across a lane: rising, wandering up and down, swooping, turning a loop. */
export const DRIFT_PATHS = 4;

/** Scratch result of `driftGhostAt`. */
const DRIFTING = { vis: 0, k: 0, bob: 0, dir: 1 as -1 | 1, kind: 0, path: 0, size: 1 };

/**
 * A ghost drifting across the lane anchored `seed`: progress 0..1, opacity, bob, which way; and,
 * new each visit, which ghost it is (kind), its way across (path) and its size (0.75..1.25).
 */
export function driftGhostAt(t: number, seed: number): Readonly<typeof DRIFTING> {
  const a = DRIFT.at(t, seed);
  const v = VISIT.k;
  const dur = 6 + 3 * hash(seed * 31 + v * 11 + 5);
  const d = DRIFTING;
  d.vis = 0;
  d.k = 0;
  d.bob = Math.sin(t * 1.9 + seed * 2);
  d.dir = hash(seed * 29 + v * 3 + 1) < 0.5 ? 1 : -1;
  // Each lane's own order of looks and ways (never the same ghost twice running in a lane).
  d.kind = (Math.floor(hash(seed * 7 + 3) * DRIFT_KINDS) + Math.max(0, v) * (seed % 2 ? 1 : 3)) % DRIFT_KINDS;
  d.path = Math.floor(hash(seed * 13 + v * 17 + 9) * DRIFT_PATHS) % DRIFT_PATHS;
  d.size = 0.75 + 0.5 * hash(seed * 41 + v * 23 + 2);
  if (!(a >= 0 && a < dur)) return d;
  d.k = a / dur;
  d.vis = smooth(0, 1, a) * (1 - smooth(dur - 1, dur, a));
  return d;
}

/** The ghost's outline: dome, shoulders, arms (one waving), tapering to a three-pointed tail. */
function shape(ctx: Ctx, wave: number, t: number): void {
  ctx.moveTo(0, -1.0);
  ctx.bezierCurveTo(0.2, -1.0, 0.3, -0.88, 0.3, -0.7);
  // Right arm: a stub, or raised and waving
  const wa = wave * (0.9 + 0.35 * Math.sin(t * 10));
  ctx.lineTo(0.3 + 0.12 * Math.cos(wa), -0.62 - 0.14 * Math.sin(wa));
  ctx.lineTo(0.31 + 0.15 * Math.cos(wa + 0.35), -0.55 - 0.16 * Math.sin(wa + 0.35));
  ctx.lineTo(0.28, -0.5);
  ctx.bezierCurveTo(0.28, -0.3, 0.18, -0.18, 0.2, 0.0);
  // Three wispy points curling back
  ctx.quadraticCurveTo(0.12, -0.1, 0.06, -0.06);
  ctx.quadraticCurveTo(0.02, 0.02, -0.06, 0.06);
  ctx.quadraticCurveTo(-0.08, -0.06, -0.14, -0.06);
  ctx.quadraticCurveTo(-0.22, 0.0, -0.32, 0.04);
  ctx.bezierCurveTo(-0.24, -0.16, -0.28, -0.32, -0.28, -0.5);
  // Left arm, a stub
  ctx.lineTo(-0.38, -0.55);
  ctx.lineTo(-0.37, -0.62);
  ctx.lineTo(-0.3, -0.68);
  ctx.bezierCurveTo(-0.3, -0.88, -0.2, -1.0, 0, -1.0);
  ctx.closePath();
}

/**
 * A ghost with its tail's base at (x, y), `h` px tall, facing `dir`: risen `rise` (0 sunk
 * 0.6 h lower and faded out), bobbing, waving, squashed, at opacity `vis`.
 */
export function ghost(
  ctx: Ctx,
  x: number,
  y: number,
  h: number,
  dir: -1 | 1,
  rise: number,
  bob: number,
  wave: number,
  squash: number,
  vis: number,
  lw: number,
): void {
  const a = vis * smooth(0, 0.5, rise);
  if (a <= 0.01) return;
  const off = (1 - rise) * h * 0.6 + bob * h * 0.04;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y + off);
  ctx.scale(dir * h * (1 + 0.15 * squash), h * (1 - 0.25 * squash));
  ctx.lineJoin = "round";
  ctx.beginPath();
  shape(ctx, wave, bob * 3);
  ctx.strokeStyle = GHOST_RIM;
  ctx.lineWidth = Math.max(0.06, (lw * 2.2) / h);
  ctx.stroke();
  ctx.fillStyle = GHOST_BODY;
  ctx.fill();
  // Hollow drooping eyes and a little round mouth
  ctx.beginPath();
  ctx.ellipse(-0.12, -0.74, 0.065, 0.11, 0.25, 0, Math.PI * 2);
  ctx.moveTo(0.18, -0.74);
  ctx.ellipse(0.12, -0.74, 0.065, 0.11, -0.25, 0, Math.PI * 2);
  ctx.moveTo(0.045, -0.54 + squash * 0.02);
  ctx.ellipse(0.0, -0.54 + squash * 0.02, 0.045, 0.06 + squash * 0.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = HOLLOW;
  ctx.fill();
  ctx.restore();
}

/** The long-armed ghost: a tall narrow sheet with long thin arms reaching out ahead, fingers spread. */
function longArmed(ctx: Ctx, t: number): void {
  ctx.moveTo(0, -1.05);
  ctx.bezierCurveTo(0.17, -1.05, 0.24, -0.9, 0.24, -0.7);
  ctx.bezierCurveTo(0.24, -0.4, 0.14, -0.2, 0.16, 0.0);
  ctx.quadraticCurveTo(0.08, -0.12, 0.02, -0.04);
  ctx.quadraticCurveTo(-0.04, 0.06, -0.1, -0.02);
  ctx.quadraticCurveTo(-0.18, 0.04, -0.26, 0.06);
  ctx.bezierCurveTo(-0.2, -0.2, -0.24, -0.4, -0.24, -0.7);
  ctx.bezierCurveTo(-0.24, -0.9, -0.17, -1.05, 0, -1.05);
  ctx.closePath();
  // Its arms: long and thin, reaching forward and wavering, three long fingers each.
  const w = Math.sin(t * 2.2) * 0.04;
  for (let k = 0; k < 2; k++) {
    const y0 = -0.66 + k * 0.1;
    const ex = 0.52 - k * 0.04;
    const ey = -0.58 + k * 0.12 + w * (k ? -1 : 1);
    ctx.moveTo(0.18, y0 - 0.03);
    ctx.quadraticCurveTo(0.38, y0 - 0.12, ex, ey - 0.02);
    for (let f = -1; f <= 1; f++) {
      ctx.lineTo(ex + 0.05, ey - 0.02 + f * 0.035);
      ctx.lineTo(ex, ey + f * 0.012);
    }
    ctx.quadraticCurveTo(0.38, y0 - 0.04, 0.18, y0 + 0.03);
    ctx.closePath();
  }
}

/** The tattered ghost: a sheet whose hem hangs in ragged strips that flutter. */
function tattered(ctx: Ctx, t: number): void {
  ctx.moveTo(0, -1.0);
  ctx.bezierCurveTo(0.24, -1.0, 0.34, -0.85, 0.34, -0.6);
  ctx.lineTo(0.36, -0.2);
  for (let k = 0; k <= 6; k++) {
    const x = 0.36 - (k / 6) * 0.72;
    const deep = k % 2 ? -0.18 : 0.04 + 0.03 * Math.sin(t * 5 + k);
    ctx.lineTo(x + 0.03 * Math.sin(t * 4 + k * 1.3), deep);
  }
  ctx.lineTo(-0.36, -0.2);
  ctx.lineTo(-0.34, -0.6);
  ctx.bezierCurveTo(-0.34, -0.85, -0.24, -1.0, 0, -1.0);
  ctx.closePath();
}

/**
 * A ghost drifting through the lanes, `kind` 0..3 (the plain sheet, long-armed, tattered, with a
 * lantern), its tail's base at (x, y), `h` px tall, facing `dir`, bobbing, at opacity `vis`. It
 * keeps inside ghostBox like the sheet ghost.
 */
export function driftGhost(ctx: Ctx, x: number, y: number, h: number, dir: -1 | 1, kind: number, bob: number, vis: number, lw: number, t: number): void {
  if (kind === 0) {
    ghost(ctx, x, y, h, dir, 1, bob, 0, 0, vis, lw);
    return;
  }
  if (vis <= 0.01) return;
  const off = bob * h * 0.04;
  ctx.save();
  ctx.globalAlpha = vis;
  ctx.translate(x, y + off);
  if (kind === 3) {
    // The lantern it carries, out in front: its glow first, behind it.
    ctx.beginPath();
    ctx.arc(dir * 0.42 * h, -0.42 * h, 0.17 * h, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_HALO;
    ctx.fill();
  }
  ctx.scale(dir * h, h);
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (kind === 1) longArmed(ctx, t);
  else if (kind === 2) tattered(ctx, t);
  else shape(ctx, 0.6, bob * 3);
  ctx.strokeStyle = GHOST_RIM;
  ctx.lineWidth = Math.max(0.06, (lw * 2.2) / h);
  ctx.stroke();
  ctx.fillStyle = GHOST_BODY;
  ctx.fill();
  ctx.beginPath();
  if (kind === 1) {
    // Long sad eyes, an O of a mouth.
    ctx.ellipse(-0.09, -0.8, 0.05, 0.12, 0.15, 0, Math.PI * 2);
    ctx.moveTo(0.14, -0.8);
    ctx.ellipse(0.09, -0.8, 0.05, 0.12, -0.15, 0, Math.PI * 2);
    ctx.moveTo(0.05, -0.56);
    ctx.ellipse(0.0, -0.56, 0.05, 0.08, 0, 0, Math.PI * 2);
  } else if (kind === 2) {
    // Mismatched eyes, a worn hole near the hem.
    ctx.ellipse(-0.13, -0.72, 0.08, 0.1, 0.2, 0, Math.PI * 2);
    ctx.moveTo(0.17, -0.74);
    ctx.ellipse(0.12, -0.74, 0.05, 0.07, -0.2, 0, Math.PI * 2);
    ctx.moveTo(0.2, -0.3);
    ctx.ellipse(0.15, -0.3, 0.05, 0.035, 0.4, 0, Math.PI * 2);
  } else {
    ctx.ellipse(-0.12, -0.74, 0.065, 0.11, 0.25, 0, Math.PI * 2);
    ctx.moveTo(0.18, -0.74);
    ctx.ellipse(0.12, -0.74, 0.065, 0.11, -0.25, 0, Math.PI * 2);
    ctx.moveTo(0.045, -0.54);
    ctx.ellipse(0.0, -0.54, 0.045, 0.06, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = HOLLOW;
  ctx.fill();
  if (kind === 3) {
    // The lantern on a crook held in its raised arm, swinging a little.
    const sw = Math.sin(t * 2.6) * 0.05;
    ctx.beginPath();
    ctx.moveTo(0.4, -0.58);
    ctx.lineTo(0.42 + sw, -0.5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(0.04, lw / h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.38 + sw, -0.5);
    ctx.lineTo(0.46 + sw, -0.5);
    ctx.lineTo(0.47 + sw, -0.36);
    ctx.lineTo(0.37 + sw, -0.36);
    ctx.closePath();
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Scratch box of `ghostBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box a ghost covers at (x, y), `h` tall, risen `rise`, bobbing `bob` (any arm, squash or facing). */
export function ghostBox(x: number, y: number, h: number, rise: number, bob: number): Readonly<typeof BOX> {
  const off = (1 - rise) * h * 0.6 + bob * h * 0.04;
  BOX.x0 = x - h * 0.62 - 2;
  BOX.x1 = x + h * 0.62 + 2;
  BOX.y0 = y + off - h * 1.08 - 2;
  BOX.y1 = y + off + h * 0.12 + 2;
  return BOX;
}

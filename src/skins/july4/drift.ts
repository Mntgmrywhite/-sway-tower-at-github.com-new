import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import {
  BALLOON_SHADE,
  BALLOON_SHEEN,
  BASKET,
  BURNER,
  BURNER_CORE,
  CANOPY_SHADE,
  EAGLE,
  EAGLE_BEAK,
  EAGLE_EYE,
  EAGLE_WHITE,
  PILOT_CAP,
  PLANE,
  PLANE_WING,
  PROP_BLUR,
  TIRE,
} from "./colors";
import { wash } from "./paint";
import { birdStroke, dot, starPath } from "./shapes";
import { startHillsTop } from "./hills";
import { BACK, horizon0, MAIN_DROP } from "./land";
import { CHURCH_TOP, COURT_H } from "./landmarks";
import { frontsTop, TREES_TOP } from "./mainstreet";
import { sunAt, sunHaloFoot, SUN_REACH } from "./sky";
import { LOOP, toneOf, type Tone } from "./tone";
import { SKIN_TAN } from "./colors";
import { figure, type Look } from "./folk";
import { ADULT, armTo, blinkAt, J, legTo, pose, scaled, trunk, wave } from "./rig";

// What drifts past as you climb, in the lane down the right of the screen: the Fourth's summer
// sky over a small town, painted like the rest of the storybook (soft round forms, a lit side and
// a shaded side, a fine warm line round the nearer things). Over the square, a bald eagle circles
// under the HUD and a hot-air balloon in the flag's colors hangs over the courthouse, and in the
// left lane, below the sun, a stunt plane flies loop after loop in a ring of red, white and blue
// smoke (START: they hang from the start's own layout). Climb, and Sky Islands' floating island
// comes down the lane through the afternoon to the golden hour (island.ts); through the night the
// show's smoke drifts off. When the story loops (tone.ts), the lane comes round with it, the
// night and the morning bringing the air show: the gold-and-red balloon with its burner lit, the
// silver blimp with its gondola lit at dawn, the eagle huge at sunrise, a parachutist under a
// star-spangled canopy, a flock of swifts, the stunt plane and the barnstormer towing his banner
// (LOOP_OPENING), then the island and the night as the first day. Each thing is anchored at a
// height in the lane, so it comes down past you as the camera climbs and sinks behind the country
// and the town at the bottom of the screen (july4.ts paints the lane behind them); it only moves
// in place: nothing crosses the tower's column. Things are spaced so they never overlap and
// leave the island its stretch.
//
// The left of the sky is the sun's and the moon's (sky.ts): nothing comes down the left lane, so
// no balloon, bird or puff ever slides across either (the owner's rule, drift.test.ts). Over the
// square the stunt plane flies its loops there below the sun, and only ever moves down.

export type Kind = "birds" | "eagle" | "hotair" | "stunt" | "biplane" | "jumper" | "blimp" | "smoke";

export interface Drifter {
  kind: Kind;
  /** Height in the lane, world units. */
  at: number;
  /** Center, in u from the screen center (positive: right of it). */
  x: number;
  /** How big it is drawn (1: the size it hangs at over the town). */
  size: number;
  /** Which of its looks (the balloons' patterns). */
  variant: number;
  phase: number;
}

/** Parallax depth of the lane (1 moves with the tower). */
export const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), its center (u from the screen center), its size and its look. */
type Spec = readonly [kind: Kind, at: number, x: number, size: number, variant?: number];

/**
 * The cameo's height in the lane (island.ts anchors Sky Islands' floating island there, like a
 * lane thing, its middle a little above mid-screen at level 50: high enough that on every screen
 * it hangs clear above the courthouse's flag there, a short phone's and an iPad's included; past
 * its hour it fades into the haze before it reaches the flag). The lane is kept clear for it over
 * a hundred world units either side (no item of a turn is placed there; drift.test.ts holds it).
 */
export const CAMEO_AT = 427;

// The day's story, by hand: over the square the start's things (START); then Sky Islands'
// floating island comes down the lane through the afternoon and the golden hour (island.ts), and
// through the night the show's smoke drifts off.
const DAY: Spec[] = [
  ["smoke", 560, 0.39, 1.6],
  ["smoke", 660, 0.4, 1.6],
  ["smoke", 760, 0.39, 1.6],
  ["smoke", 860, 0.4, 1.6],
];

/**
 * In the story's loop the town lies far below, so the start's two come round big, flying the
 * whole lane like the rest, over the night after the show, the dawn and the morning: the
 * gold-and-red balloon with its burner lit through the night, the silver blimp with its gondola
 * lit at dawn, the eagle at sunrise; then the morning's air show: a parachutist, a flock of
 * swifts, the stunt plane looping in its ring of smoke and the barnstormer towing his banner.
 * Heights within a turn; from the island on, a turn runs as the first day.
 */
const LOOP_OPENING: Spec[] = [
  ["hotair", -70, 0.39, 1.55, 1],
  ["blimp", 20, 0.375, 1.75],
  ["eagle", 90, 0.375, 1.9],
  ["jumper", 160, 0.395, 1.35],
  ["birds", 208, 0.4, 1.3],
  ["stunt", 258, 0.385, 1.2],
  ["biplane", 306, 0.398, 1.35],
];

/**
 * The start's things, placed from the start's own layout rather than at a height in the lane, so
 * they hang just right over the square on every screen: under the HUD's rows (its foot is
 * HUD_SHARE of the screen's height and HUD_U u) or under the sun's halo, `gap` u below it, and
 * from there they only ever move down as you climb (nearly with the lane, START_P). In the right
 * lane, the bald eagle circling under the HUD and the hot-air balloon in the flag's colors below
 * it, over the courthouse; in the left lane, below the sun, the stunt plane flying its loops in
 * its ring of smoke (it never passes the sun, and is gone behind the town long before the sun
 * sets). Only on the first day: in the loop they come down the right lane with the morning.
 */
type StartSpec = readonly [kind: Kind, under: "hud" | "sun", gap: number, x: number, size: number, variant?: number];
const START: readonly StartSpec[] = [
  ["eagle", "hud", 0.045, 0.44, 1],
  ["hotair", "hud", 0.22, 0.43, 1, 0],
  ["stunt", "sun", 0.1, -0.385, 1.15],
];
export const START_P = 1;
const HUD_SHARE = 0.14;
const HUD_U = 0.2;
/** The room the start's things want under the HUD (u): with less, they draw together and shrink. */
const HUD_ROOM = 0.34;
/** The highest over the start's horizon (u) they hang. */
const HUD_HIGH = 0.68;
const START_THINGS: readonly Drifter[] = START.map(([kind, , , x, size, variant = 0], k) => ({ kind, at: 0, x, size, variant, phase: hash(k * 23 + 8100) * 10 }));

/** The stunt plane's reach either side of its loop's middle, at size 1 (u): the loop, its ribbons and the plane's wings. */
const STUNT_REACH = 0.07;

/** Screen y of a start thing now, and (scratch) the size it hangs at: 0 where it has no room. */
const START_AT = { y: 0, size: 0 };
function startAt(s: Scene, sp: StartSpec): typeof START_AT {
  const u = s.u;
  START_AT.size = sp[4];
  if (sp[1] === "hud") {
    // Under the HUD, in the room above the right lane's town (the courthouse, the big tree and the
    // puffball trees on the hills behind): on a screen wide for its height, closer together and a little smaller.
    const line = horizon0(s);
    // Never higher over the horizon than on a tall phone (on a zoomed-out screen the HUD is far above).
    const foot = Math.max(s.cssH * HUD_SHARE + u * HUD_U, line - HUD_HIGH * u);
    const land = Math.min(line + MAIN_DROP * u - Math.max(TREES_TOP, frontsTop(sp[3] - 0.06, sp[3] + 0.06)) * u, line + BACK.drop * u - COURT_H * u, line - startHillsTop(s) * u);
    const f = Math.min(1, (land - foot) / (HUD_ROOM * u));
    START_AT.size = sp[4] * f;
    START_AT.y = foot + sp[2] * f * u;
  } else {
    // Under the sun, in the room between its halo and the land below (the hills and the church
    // as the square sees them): the loop shrinks to fit, or stays away where there is no room.
    const foot = sunHaloFoot(s) + sp[2] * u * 0.35;
    const line = horizon0(s);
    const land = Math.min(line - startHillsTop(s) * u, line + BACK.drop * u - CHURCH_TOP * u, line + MAIN_DROP * u - frontsTop(sp[3] - 0.08, sp[3] + 0.08) * u) - 0.01 * u;
    const room = (land - foot) / (2 * STUNT_REACH * u);
    START_AT.size = room >= 0.75 ? Math.min(sp[4], room) : 0;
    START_AT.y = foot + STUNT_REACH * START_AT.size * u + s.rise * START_P;
    // Always below the sun, even as it sets (on a zoomed-out screen the camera holds and the sun can catch up).
    const sun = sunAt(s, toneOf(s));
    START_AT.y = Math.max(START_AT.y, sun.y + sun.r * SUN_REACH + (sp[2] * 0.35 + STUNT_REACH * START_AT.size) * u);
    return START_AT;
  }
  START_AT.y += s.rise * START_P;
  return START_AT;
}

/** Story heights repeat with the loop: every turn shows the day's things PERIOD higher. */
export const PERIOD = LOOP * BLOCK_HEIGHT;

/** A drifter from its spec: its own rhythm comes from its height in the turn, so it is the same in every turn. */
const drifter = ([kind, at, x, size, variant = 0]: Spec): Drifter => ({ kind, at, x, size, variant, phase: hash(Math.round(at) * 17 + 8000) * 10 });
/** The day's lane, running up from its lowest item; and every later turn's. */
const FIRST: readonly Drifter[] = DAY.map(drifter);
const LATER: readonly Drifter[] = [...LOOP_OPENING, ...DAY].map(drifter);
/** The lowest a turn's things begin (a later turn's balloon comes in below its own first day's start). */
const LOWEST = Math.min(FIRST[0]!.at, LATER[0]!.at);

/** Scratch copies of the loop's things placed in a turn, reused every call (a frame shows a handful). */
const POOL: Drifter[] = Array.from({ length: 32 }, () => ({ ...FIRST[0]! }));

/** Calls `draw` for every item on screen (or close to it), lowest first. */
export function eachVisible(s: Scene, draw: (d: Drifter) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  let pooled = 0;
  // The start's things, while they are on screen: their height in the lane worked out from where they hang.
  for (let i = 0; i < START.length; i++) {
    const { y, size } = startAt(s, START[i]!);
    if (y > s.cssH + margin || size <= 0) continue;
    const p = POOL[pooled++ % POOL.length]!;
    Object.assign(p, START_THINGS[i]!);
    p.at = (base - y) / unit;
    p.size = size;
    draw(p);
  }
  for (let n = Math.max(0, Math.floor(lo / PERIOD)); n * PERIOD + LOWEST <= hi; n++) {
    const off = PERIOD * n;
    for (const d of n === 0 ? FIRST : LATER) {
      const at = d.at + off;
      if (at < lo) continue;
      if (at > hi) break;
      const p = POOL[pooled++ % POOL.length]!;
      Object.assign(p, d);
      p.at = at;
      draw(p);
    }
  }
}

/** Screen y of a lane height. */
export function laneY(s: Scene, at: number): number {
  return layerGround(s, LANE_P) - at * s.scale * LANE_P;
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y0 = laneY(s, d.at);
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.005;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x0 = s.cssW / 2 + d.x * u;
  const k = d.size;
  const big = k !== 1;
  if (big) {
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(k, k);
  }
  const x = (big ? 0 : x0) + sway / k;
  const y = big ? 0 : y0;
  const b = bob / k;
  if (d.kind === "birds") birds(ctx, s, tone, x, y, d.phase, k);
  else if (d.kind === "eagle") eagle(ctx, s, tone, x, y, d.phase, k);
  else if (d.kind === "hotair") hotAir(ctx, s, tone, x, y + b, k, d.variant);
  else if (d.kind === "stunt") stunt(ctx, s, tone, x, y, d.phase, k);
  else if (d.kind === "biplane") biplane(ctx, s, tone, x, y + b, k);
  else if (d.kind === "jumper") jumper(ctx, s, tone, x, y, d.phase, k);
  else if (d.kind === "blimp") blimp(ctx, s, tone, x, y + b * 0.6, k);
  else smoke(ctx, s, tone, x, y + b * 0.4, d.phase);
  if (big) ctx.restore();
}

/** The fine line round the lane's things, at size `k`. */
function lineW(s: Scene, k: number): number {
  return Math.max(0.8, s.u * 0.0024) / k;
}

/** Everything in the lane. */
export function drifters(ctx: Ctx, s: Scene, tone: Tone): void {
  eachVisible(s, (d) => drawDrifter(ctx, s, tone, d));
}

// ---------------------------------------------------------------- birds and the eagle

/** Three swifts wheeling together over the town. */
const FLOCK = [
  [0, 0],
  [-0.026, 0.012],
  [0.024, 0.016],
] as const;

function birds(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number, k: number): void {
  const u = s.u;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0025) / k;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < FLOCK.length; i++) {
    const [dx, dy] = FLOCK[i]!;
    const flap = Math.sin(s.t * 7 + phase + i * 1.9);
    birdStroke(ctx, x + dx * u + Math.sin(s.t * 0.5 + i) * u * 0.004, y + dy * u + Math.sin(s.t * 0.7 + i * 2) * u * 0.004, u * 0.011, flap);
  }
  ctx.stroke();
}

/** How long the eagle takes to go round once (s), and its wingspan's half (u). */
const CIRCLE = 11;
const EAGLE_SPAN = 0.04;

/**
 * A bald eagle soaring in a slow circle: broad dark wings spread wide with fingered tips, softly
 * lit along their leading edge, tilted into the turn, a white head and fanned white tail, a gold
 * beak and talons. Faces the way it is going.
 */
function eagle(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number, k: number): void {
  const u = s.u;
  const a = (s.t / CIRCLE) * Math.PI * 2 + phase;
  const ex = x + Math.cos(a) * u * 0.01;
  const ey = y + Math.sin(a) * u * 0.008;
  const dir = -Math.sin(a) < 0 ? -1 : 1;
  const bank = Math.cos(a) * 0.3;
  const span = u * EAGLE_SPAN;
  const glide = Math.sin(s.t * 1.1 + phase) * 0.06;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.scale(dir, 1);
  ctx.rotate(bank * dir);
  ctx.fillStyle = EAGLE_WHITE;
  ctx.beginPath();
  ctx.moveTo(-span * 0.08, span * 0.1);
  ctx.quadraticCurveTo(-span * 0.32, span * 0.26, -span * 0.24, span * 0.38);
  ctx.quadraticCurveTo(-span * 0.12, span * 0.4, -span * 0.02, span * 0.36);
  ctx.lineTo(span * 0.06, span * 0.12);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lineW(s, k) * 0.8, tone.mainLine);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const lift = side * glide;
    ctx.moveTo(0, -span * 0.02);
    ctx.quadraticCurveTo(side * span * 0.5, -span * (0.22 + lift), side * span * 0.92, -span * (0.3 + lift));
    for (let f = 0; f < 5; f++) {
      ctx.lineTo(side * span * (1.02 - f * 0.04), -span * (0.25 + lift - f * 0.085));
      ctx.lineTo(side * span * (0.86 - f * 0.035), -span * (0.2 + lift - f * 0.085));
    }
    ctx.quadraticCurveTo(side * span * 0.42, span * 0.26, 0, span * 0.16);
    ctx.closePath();
  }
  oval(ctx, 0, span * 0.08, span * 0.15, span * 0.1);
  ctx.fillStyle = wash(ctx, -span * 0.3, span * 0.2, [EAGLE.light, EAGLE.body, EAGLE.shade]);
  ctx.fill();
  ink(ctx, lineW(s, k) * 0.8, tone.mainLine);
  ctx.fillStyle = EAGLE_WHITE;
  ctx.beginPath();
  circle(ctx, span * 0.2, span * 0.0, span * 0.085);
  ctx.fill();
  ctx.fillStyle = EAGLE_BEAK;
  ctx.beginPath();
  ctx.moveTo(span * 0.26, -span * 0.03);
  ctx.lineTo(span * 0.36, span * 0.01);
  ctx.lineTo(span * 0.26, span * 0.05);
  ctx.closePath();
  circle(ctx, -span * 0.02, span * 0.2, span * 0.035);
  ctx.fill();
  ctx.fillStyle = EAGLE_EYE;
  ctx.beginPath();
  circle(ctx, span * 0.235, -span * 0.015, span * 0.014);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the hot-air balloon

/** The envelope's half width down its height (0 crown .. 1 mouth), as a share of its widest. */
const ENVELOPE = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12;
  return t < 0.45 ? Math.sqrt(Math.max(0, 1 - ((0.45 - t) / 0.45) ** 2)) : 1 - 0.72 * ((t - 0.45) / 0.55) ** 1.5;
});
/** Its gores: the boundaries' places across it (sin of evenly spaced angles), and where the blue crown of stars ends. */
const GORES = Array.from({ length: 8 }, (_, j) => Math.sin(-Math.PI / 2 + (j * Math.PI) / 7));
const CROWN = 4;
/** The envelope's widest half width and its height (u), and the basket's drop below its mouth. */
const BALLOON_R = 0.044;
const BALLOON_H = 0.12;
const BASKET_DROP = 0.03;

/** One band of the envelope between gore boundaries k0 and k1 (shares of the half width), rows i0..i1 of ENVELOPE, as its own subpath. */
function gore(ctx: Ctx, x: number, top: number, R: number, H: number, k0: number, k1: number, i0: number, i1: number): void {
  for (let i = i0; i <= i1; i++) {
    const y = top + (H * i) / 12;
    if (i === i0) ctx.moveTo(x + k0 * R * ENVELOPE[i]!, y);
    else ctx.lineTo(x + k0 * R * ENVELOPE[i]!, y);
  }
  for (let i = i1; i >= i0; i--) ctx.lineTo(x + k1 * R * ENVELOPE[i]!, top + (H * i) / 12);
  ctx.closePath();
}

/**
 * A hot-air balloon, in one of three vintage patterns: 0 the flag's (a navy crown with a ring of
 * stars over red and cream gores), 1 gold and red (golden gores with a red crown and a band of
 * red chevrons round its middle), 2 cream with a navy crown and red gores by turns; softly
 * rounded by its light, the ropes, the burner's flame, the wicker basket.
 */
function hotAir(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, variant: number): void {
  const u = s.u;
  const R = BALLOON_R * u;
  const H = BALLOON_H * u;
  const top = y - H * 0.6;
  const mouth = top + H;
  const base = variant === 1 ? tone.gold : variant === 2 ? tone.white : tone.red;
  const alt = variant === 1 ? tone.gold : variant === 2 ? tone.red : tone.white;
  const crown = variant === 1 ? tone.red : tone.blue;
  ctx.fillStyle = base;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, 1, CROWN, 12);
  ctx.fill();
  if (variant !== 1) {
    ctx.fillStyle = alt;
    ctx.beginPath();
    for (let j = 1; j < 7; j += 2) gore(ctx, x, top, R, H, GORES[j]!, GORES[j + 1]!, CROWN, 12);
    ctx.fill();
  } else {
    // A band of red chevrons round its middle, on cream.
    ctx.fillStyle = tone.white;
    ctx.beginPath();
    gore(ctx, x, top, R, H, -1, 1, 6, 8);
    ctx.fill();
    ctx.fillStyle = tone.red;
    ctx.beginPath();
    const y0 = top + (H * 6) / 12;
    const y1 = top + (H * 8) / 12;
    const w0 = R * ENVELOPE[7]!;
    for (let j = -3; j < 3; j++) {
      const xa = x + (j / 3) * w0;
      const xb = x + ((j + 1) / 3) * w0;
      ctx.moveTo(xa, y0 + (y1 - y0) * 0.2);
      ctx.lineTo((xa + xb) / 2, y1 - (y1 - y0) * 0.15);
      ctx.lineTo(xb, y0 + (y1 - y0) * 0.2);
      ctx.lineTo(xb, y0 + (y1 - y0) * 0.55);
      ctx.lineTo((xa + xb) / 2, y1 + (y1 - y0) * 0.1);
      ctx.lineTo(xa, y0 + (y1 - y0) * 0.55);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.fillStyle = crown;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, 1, 0, CROWN);
  ctx.fill();
  // Its roundness: a lit sheen down its left gores and a soft shade down its right ones.
  ctx.fillStyle = BALLOON_SHEEN;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, GORES[2]!, 0, 12);
  ctx.fill();
  ctx.fillStyle = BALLOON_SHADE;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  gore(ctx, x, top, R, H, GORES[5]!, 1, 0, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, 1, 0, 12);
  ink(ctx, lineW(s, k), tone.mainLine);
  ctx.fillStyle = variant === 1 ? tone.gold : tone.white;
  ctx.beginPath();
  const sy = top + ((H * CROWN) / 12) * 0.62;
  for (let j = 0; j < 5; j++) {
    const kk = -0.7 + j * 0.35;
    starPath(ctx, x + kk * R * 0.86, sy + Math.abs(kk) * R * 0.12, R * 0.11);
  }
  ctx.fill();
  const bw = R * 0.4;
  const by = mouth + BASKET_DROP * u;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(0.8, u * 0.0016) / k;
  ctx.beginPath();
  ctx.moveTo(x - R * ENVELOPE[12]!, mouth);
  ctx.lineTo(x - bw, by);
  ctx.moveTo(x + R * ENVELOPE[12]!, mouth);
  ctx.lineTo(x + bw, by);
  ctx.stroke();
  const fh = u * 0.024 * (0.85 + 0.15 * Math.sin(s.t * 13 + x));
  for (const [c, kk] of [
    [BURNER, 1],
    [BURNER_CORE, 0.55],
  ] as const) {
    const w = u * 0.006 * kk;
    const fy = by - u * 0.003;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, fy - fh * kk);
    ctx.quadraticCurveTo(x + w * 1.4, fy - w, x, fy);
    ctx.quadraticCurveTo(x - w * 1.4, fy - w, x, fy - fh * kk);
    ctx.fill();
  }
  // The wicker basket: its body, a lit rim along its top, its shaded foot.
  ctx.fillStyle = BASKET.body;
  ctx.fillRect(x - bw, by, bw * 2, u * 0.018);
  ctx.fillStyle = BASKET.light;
  ctx.fillRect(x - bw, by, bw * 2, u * 0.005);
  ctx.fillStyle = BASKET.shade;
  ctx.fillRect(x - bw, by + u * 0.012, bw * 2, u * 0.006);
  ctx.beginPath();
  ctx.rect(x - bw, by, bw * 2, u * 0.018);
  ink(ctx, lineW(s, k), tone.mainLine);
}

// ---------------------------------------------------------------- the barnstormer

/** The banner's word: short, so the whole tow fits the lane. */
const BANNER = "JULY 4";
const BANNER_W = 0.05;
/** The barnstormer's length (u). */
const PLANE_L = 0.048;

/** A biplane heading right, `L` long: a butter-yellow fuselage, red wings with struts, a tail, wheels, a blurred propeller. */
function plane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, L: number, k: number, stunt = false): void {
  const u = s.u;
  const lw = lineW(s, k);
  ctx.beginPath();
  oval(ctx, x, y, L * 0.52, L * 0.14);
  ctx.moveTo(x - L * 0.42, y);
  ctx.quadraticCurveTo(x - L * 0.58, y - L * 0.32, x - L * 0.44, y - L * 0.3);
  ctx.lineTo(x - L * 0.28, y - L * 0.05);
  ctx.closePath();
  ctx.fillStyle = stunt ? tone.red : wash(ctx, y - L * 0.3, y + L * 0.14, [PLANE.light, PLANE.body, PLANE.shade]);
  ctx.fill();
  ink(ctx, lw, tone.mainLine);
  ctx.beginPath();
  ctx.rect(x - L * 0.3, y - L * 0.36, L * 0.74, L * 0.08);
  ctx.rect(x - L * 0.3, y + L * 0.1, L * 0.74, L * 0.08);
  ctx.rect(x - L * 0.6, y - L * 0.04, L * 0.2, L * 0.06);
  ctx.fillStyle = stunt ? tone.white : PLANE_WING.body;
  ctx.fill();
  ink(ctx, lw, tone.mainLine);
  ctx.strokeStyle = tone.mainLine;
  ctx.lineWidth = Math.max(1, u * 0.0015) / k;
  ctx.beginPath();
  ctx.moveTo(x - L * 0.1, y - L * 0.28);
  ctx.lineTo(x - L * 0.1, y + L * 0.1);
  ctx.moveTo(x + L * 0.3, y - L * 0.28);
  ctx.lineTo(x + L * 0.3, y + L * 0.1);
  ctx.stroke();
  ctx.fillStyle = TIRE;
  ctx.beginPath();
  circle(ctx, x - L * 0.05, y + L * 0.27, L * 0.065);
  circle(ctx, x + L * 0.2, y + L * 0.27, L * 0.065);
  ctx.fill();
  ctx.fillStyle = PILOT_CAP;
  ctx.beginPath();
  circle(ctx, x + L * 0.12, y - L * 0.08, L * 0.055);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = PROP_BLUR;
  ctx.beginPath();
  oval(ctx, x + L * 0.56, y, L * 0.05, L * 0.3, Math.sin(s.t * 40) * 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The barnstormer heading right, its propeller a blur, towing a banner that ripples behind it. */
function biplane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const u = s.u;
  const L = u * PLANE_L;
  const bx1 = x - L * 0.85;
  const bx0 = bx1 - u * BANNER_W;
  const bh = u * 0.026;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0015) / k;
  ctx.beginPath();
  ctx.moveTo(x - L * 0.55, y + L * 0.05);
  ctx.lineTo(bx1, y + bh * 0.1);
  ctx.stroke();
  const ripple = (q: number) => Math.sin(s.t * 5 - q * 7) * bh * 0.14 * (1 - q);
  ctx.beginPath();
  ctx.moveTo(bx1, y - bh * 0.5);
  for (let q = 0; q <= 1; q += 0.2) ctx.lineTo(bx1 - (bx1 - bx0) * q, y - bh * 0.5 + ripple(q));
  for (let q = 1; q >= 0; q -= 0.2) ctx.lineTo(bx1 - (bx1 - bx0) * q, y + bh * 0.5 + ripple(q));
  ctx.closePath();
  ctx.fillStyle = tone.white;
  ctx.fill();
  ink(ctx, lineW(s, k) * 0.8, tone.mainLine);
  ctx.fillStyle = tone.blue;
  ctx.fillRect(bx1 - u * 0.004, y - bh * 0.5, u * 0.004, bh);
  ctx.fillStyle = tone.red;
  ctx.font = `${Math.max(6, Math.round(bh * 0.7))}px Rye, 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(BANNER, (bx0 + bx1) / 2 - u * 0.002, y + ripple(0.5) * 0.5, bx1 - bx0 - bh * 0.35);
  ctx.textBaseline = "alphabetic";
  plane(ctx, s, tone, x, y, L, k);
}

// ---------------------------------------------------------------- the blimp

/** The blimp's length and depth (u). */
const BLIMP_L = 0.108;
const BLIMP_H = 0.042;

/** A blimp heading right: a silver envelope rounded by its light, a red band down its side with cream stars, navy fins, a gondola whose windows light at dusk. */
function blimp(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const u = s.u;
  const L = BLIMP_L * u;
  const H = BLIMP_H * u;
  const lw = lineW(s, k);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(x - L * 0.32, y);
    ctx.lineTo(x - L * 0.5, y + side * H * 0.62);
    ctx.lineTo(x - L * 0.47, y);
    ctx.closePath();
  }
  ctx.fillStyle = tone.blue;
  ctx.fill();
  ink(ctx, lw, tone.mainLine);
  ctx.beginPath();
  oval(ctx, x, y, L * 0.42, H * 0.5);
  ctx.fillStyle = wash(ctx, y - H * 0.5, y + H * 0.5, [tone.cloudLight, tone.white, tone.whiteShade]);
  ctx.fill();
  ink(ctx, lw, tone.mainLine);
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(x + L * 0.38, y - H * 0.06);
  ctx.quadraticCurveTo(x, y - H * 0.14, x - L * 0.38, y - H * 0.04);
  ctx.lineTo(x - L * 0.38, y + H * 0.08);
  ctx.quadraticCurveTo(x, y + H * 0.04, x + L * 0.38, y + H * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) starPath(ctx, x - L * 0.22 + i * L * 0.13, y - H * 0.03 - Math.sin((i / 3) * Math.PI) * H * 0.02, H * 0.06);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - L * 0.08, y + H * 0.48);
  ctx.lineTo(x + L * 0.1, y + H * 0.48);
  ctx.lineTo(x + L * 0.08, y + H * 0.72);
  ctx.lineTo(x - L * 0.06, y + H * 0.72);
  ctx.closePath();
  ctx.fillStyle = tone.slate;
  ctx.fill();
  ink(ctx, lw * 0.8, tone.mainLine);
  ctx.fillStyle = tone.glass;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(x - L * 0.05 + i * L * 0.045, y + H * 0.53, L * 0.025, H * 0.1);
  ctx.fill();
}

// ---------------------------------------------------------------- the stunt plane

/** The stunt plane's loop: its radius (u), seconds a loop, and the share of the loop its smoke ring trails behind it. */
const LOOP_R = 0.05;
const LOOP_TIME = 3.6;
const TRAIL = 0.86;
/** The smoke's three streams: red, cream and blue, abreast and touching (u wide each, fresh). */
const STREAM_W = 0.0058;
/** The fresh smoke runs as a smooth band (in FRESH_PARTS stretches) for FRESH of the trail; older, it breaks up into PUFFS puffs a stream that billow and thin out. */
const FRESH = 0.62;
const FRESH_PARTS = 4;
const PUFFS = 9;

/**
 * A little red biplane flying loop after loop in place, trailing red, white and blue smoke round
 * the loop it has just flown: fresh behind the plane the three streams run abreast as one soft
 * band, and further back they spread, billow into round puffs and thin away toward the tail.
 * Faces the way it is flying.
 */
function stunt(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number, k: number): void {
  const u = s.u;
  const R = LOOP_R * u;
  const a = (s.t / LOOP_TIME) * Math.PI * 2 + phase;
  const inks = [tone.red, tone.white, tone.blue];
  const w = (STREAM_W * u) / k;
  /** Where along the trail (0 its tail, 1 at the plane) is at what angle; how far the streams have spread there. */
  const at = (f: number) => a - Math.PI * 2 * TRAIL * (1 - f);
  const spread = (f: number) => 1 + (1 - f) * 0.7;
  for (let r = 0; r < 3; r++) {
    const off = (r - 1) * w;
    // The old smoke: puffs billowing bigger and fainter toward the tail, in two washes.
    ctx.fillStyle = inks[r]!;
    for (let q = 0; q < 2; q++) {
      ctx.globalAlpha = q === 0 ? 0.22 : 0.42;
      ctx.beginPath();
      for (let j = q * 5; j < Math.min(PUFFS, q * 5 + 5); j++) {
        const f = ((j + 0.5) / PUFFS) * (1 - FRESH);
        const ang = at(f);
        const rr = R + off * spread(f) + Math.sin(j * 2.3 + r) * u * 0.0012;
        dot(ctx, x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, w * (0.8 + (1 - f) * 0.55));
      }
      ctx.fill();
    }
    // The fresh smoke: a smooth stream, thickening and fading a little in stretches back from the plane.
    ctx.strokeStyle = inks[r]!;
    ctx.lineCap = "butt";
    for (let p = 0; p < FRESH_PARTS; p++) {
      const f0 = 1 - FRESH + (FRESH * p) / FRESH_PARTS;
      const f1 = 1 - FRESH + (FRESH * (p + 1)) / FRESH_PARTS;
      ctx.lineWidth = w * (1.25 - 0.3 * (p / FRESH_PARTS));
      ctx.globalAlpha = 0.5 + 0.45 * ((p + 1) / FRESH_PARTS);
      ctx.beginPath();
      // Clockwise on screen: the plane climbs the loop's left side and dives down its right.
      ctx.arc(x, y, R + off * spread((f0 + f1) / 2), at(f0), at(f1) - (p === FRESH_PARTS - 1 ? 0.1 : 0));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // The plane on the loop, nose along it.
  const px = x + Math.cos(a) * R;
  const py = y + Math.sin(a) * R;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a + Math.PI / 2);
  plane(ctx, s, tone, 0, 0, u * 0.034, k, true);
  ctx.restore();
}

// ---------------------------------------------------------------- the parachutist

/** The canopy's half width (u), its gores, and how far below it the jumper hangs. */
const CANOPY_R = 0.042;
const CANOPY_GORES = 8;
const LINES = 0.06;

/**
 * A parachutist floating down in place under a big round canopy of red and cream gores with a
 * navy crown and its star, swinging gently like a pendulum, legs together, one arm waving.
 */
function jumper(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number, k: number): void {
  const u = s.u;
  const R = CANOPY_R * u;
  const swing = Math.sin(s.t * 0.9 + phase) * 0.16;
  const lw = lineW(s, k);
  ctx.save();
  ctx.translate(x, y - R * 0.6);
  ctx.rotate(swing);
  // The rigging lines down to the harness.
  const hy = R * 0.55 + LINES * u;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(0.6, u * 0.0011) / k;
  ctx.beginPath();
  for (const f of [-1, -0.5, 0.5, 1]) {
    ctx.moveTo(f * R * 0.98, R * 0.32);
    ctx.lineTo(f * u * 0.004, hy);
  }
  ctx.stroke();
  // The canopy: a dome of gores, each scalloped at its hem, red and cream by turns, the navy crown.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.white : tone.red;
    ctx.beginPath();
    for (let g = pass; g < CANOPY_GORES; g += 2) {
      const f0 = -1 + (2 * g) / CANOPY_GORES;
      const f1 = -1 + (2 * (g + 1)) / CANOPY_GORES;
      const top0 = -Math.sqrt(1 - f0 * f0) * R * 0.95;
      const top1 = -Math.sqrt(1 - f1 * f1) * R * 0.95;
      ctx.moveTo(f0 * R, R * 0.3);
      ctx.lineTo(f0 * R, top0 + R * 0.3);
      ctx.lineTo(f1 * R, top1 + R * 0.3);
      ctx.lineTo(f1 * R, R * 0.3);
      ctx.quadraticCurveTo(((f0 + f1) / 2) * R, R * 0.42, f0 * R, R * 0.3);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, -R * 0.52);
  ctx.quadraticCurveTo(0, -R * 0.82, R * 0.5, -R * 0.52);
  ctx.quadraticCurveTo(0, -R * 0.45, -R * 0.5, -R * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  starPath(ctx, 0, -R * 0.6, R * 0.1);
  ctx.fill();
  // Its roundness: shade over the right of the dome, lit on the left.
  ctx.fillStyle = CANOPY_SHADE;
  ctx.beginPath();
  ctx.moveTo(R * 0.2, -R * 0.62);
  ctx.quadraticCurveTo(R * 0.95, -R * 0.4, R, R * 0.3);
  ctx.lineTo(R * 0.35, R * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-R, R * 0.3);
  ctx.lineTo(-R, -R * 0.0);
  ctx.quadraticCurveTo(-R * 0.75, -R * 0.75, 0, -R * 0.65);
  ctx.quadraticCurveTo(R * 0.75, -R * 0.75, R, 0);
  ctx.lineTo(R, R * 0.3);
  ink(ctx, lw, tone.mainLine);
  // The jumper on the rig: a navy jumpsuit and a cream helmet, hanging in the harness, his legs
  // dangling and swinging a moment behind the canopy's swing, one hand on a riser, the other waving.
  jumperFigure(ctx, s, tone, hy, phase, swing);
  ctx.restore();
}

/** The parachutist's build (a grown-up at a third of the town's size) and his scratch pose. */
const JUMPER_BUILD = scaled(ADULT, 0.32);
const JP = pose();

/** The parachutist himself, hanging from the harness at hy (in the canopy's swinging frame). */
function jumperFigure(ctx: Ctx, s: Scene, tone: Tone, hy: number, phase: number, swing: number): void {
  const b = JUMPER_BUILD;
  const k = s.u;
  const t = s.t;
  const L = b.thigh + b.shin + b.ankle;
  JP.view = Math.PI * 0.08;
  JP.face = JP.view - 0.2 * Math.sin(t * 0.7 + phase);
  JP.tilt = 0;
  JP.mouth = 0.5;
  JP.puff = 0;
  JP.brow = 0.4;
  JP.blink = blinkAt(t, 901);
  JP.lagX = 0;
  JP.lagY = 0;
  JP.wind = 0;
  trunk(JP, b, 0, 0, -L, 0.02, -swing * 0.3, 0, 0);
  // The legs hang from the harness, swinging a beat behind the canopy and kicking a little by turns.
  const lag = Math.sin(t * 0.9 + phase - 0.9) * 0.16 - swing;
  const kick = Math.sin(t * 2.3 + phase) * 0.0025;
  legTo(JP, b, true, -b.hips + lag * 0.012, 0.002 + kick, -0.002, 0.5);
  legTo(JP, b, false, b.hips + lag * 0.012, 0.002 - kick, -0.003, 0.5);
  // One hand up on the riser, the other waving.
  const cl = JP.j[J.chest * 3]!;
  const cf = JP.j[J.chest * 3 + 1]!;
  const cy = JP.j[J.chest * 3 + 2]!;
  armTo(JP, b, true, cl - b.shoulders * 0.8, cf + 0.002, cy - b.upper - b.fore * 0.7, -1, 0, 0.3);
  wave(JP, b, t, 1.6, 1);
  const look: Look = { skin: SKIN_TAN, hair: tone.white, style: "none", top: { light: tone.blue, body: tone.blue, shade: tone.blueShade }, sleeves: "long", lower: { light: tone.blue, body: tone.blue, shade: tone.blueShade }, legs: "trousers", shoes: tone.bird };
  figure(ctx, JP, b, look, 0, hy + (L + b.spine) * k, k, 1, 0, { lod: 0 }, {
    hat: (c, F) => {
      // A cream helmet over the crown.
      c.fillStyle = tone.white;
      c.beginPath();
      c.arc(F.x[J.head]!, F.y[J.head]! - F.headR * 0.05, F.headR * 1.08, Math.PI * 1.05, Math.PI * 1.95);
      c.closePath();
      c.fill();
    },
  });
}

// ---------------------------------------------------------------- the show's smoke

/** A drift of the show's smoke: soft puffs, drifting slowly, there only while the tone says the smoke hangs. */
function smoke(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  if (tone.smoke <= 0.01) return;
  const u = s.u;
  const r = u * 0.017;
  ctx.globalAlpha = tone.smoke * 0.45;
  ctx.fillStyle = tone.cloud;
  ctx.beginPath();
  circle(ctx, x - r * 1.1 + Math.sin(s.t * 0.3 + phase) * r * 0.2, y + r * 0.2, r * 0.9);
  circle(ctx, x + r * 0.2, y - r * 0.3, r * 1.1);
  circle(ctx, x + r * 1.3, y + r * 0.25 + Math.sin(s.t * 0.4 + phase) * r * 0.2, r * 0.8);
  circle(ctx, x + r * 0.3, y + r * 0.7, r * 0.7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

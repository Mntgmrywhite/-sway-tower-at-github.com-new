import { circle, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { bankTop } from "./clouds";
import { hillsTop } from "./hills";
import { FIREWORK, FIREWORK_LIGHT, SMOKE_LIT } from "./colors";
import { backLine, frontLine, hillLine } from "./land";
import { POLE_TOP, STEEPLE_REACH } from "./landmarks";
import { islandSpan } from "./island";
import { moonAt, MOON_REACH } from "./sky";
import { dot, speck, starPath } from "./shapes";
import type { Tone } from "./tone";
import { POLE_H } from "./town";

// The fireworks, once night has fallen on the climb (tone.ts): elegant shells of red, white, blue
// and gold blooming above the rooftops in the two side lanes, softly lighting the sky round them
// and the town below without overwhelming the scene. Rockets climb on fine gold trails from
// behind the treetops and burst in six designs of our own: peonies (a sphere of glowing stars
// with short tails, turning from one color to another as they fade), chrysanthemums (fine
// trails streaming out to bright heads), gold willows whose trails hang down three times as far
// as they spread, palms (a few heavy gold fronds arching out and down), rings (a circle of stars
// round a heart of another color) and crackling glitter. Each bloom opens with a soft glow that
// fades as its stars spread, and leaves a puff of smoke lit by its last light; the blooms of a
// lane, added up, cast one soft glow of light over its rooftops (townGlow). The stars' trails are
// tapered ribbons laid as fills. Launchers join in one by one as the show builds; at the finale a
// second rank fires fast and the shells grow, their light warms the clouds and the low sky
// (tone.ts), a wall of fountains and Roman candles throws gold and colored stars up from behind
// the treetops at the sides (up to the landmarks' tops, so it never meets a burst), and a
// lancework flag of sparks burns under the moon (lancework() below). Deterministic from the
// scene's clock and hash(): shell n of a launcher goes up at its phase plus n periods. A
// launcher's period never changes with the height (the finale's pace comes from its own fast
// launchers), so climbing never jolts a shell in the air to another age. As long as you stay in
// the night, the show goes on. The show is drawn behind the town (rockets rise from behind the
// treetops) and in front of the far hills and clouds (july4.ts).
//
// Where a burst may go (place()): only in a side lane, never across the tower's column, the
// HUD's corner buttons at the top, the moon (the left lane's bursts stay below it), the steeple
// and the courthouse's dome and flag, the flagpoles, the hills and their trees and the clouds
// banked on them (each lane's stay above its skyline, so none cuts into a burst), Sky Islands'
// floating island (the right lane's stay above it), and never off a side of the screen.
// A burst's reach is a box (the willows hang tall in a narrow lane); a shell that finds no room
// big enough shrinks to fit, or waits.

/** Seconds a rocket climbs, then seconds its burst lasts. */
export const RISE = 0.75;
export const BLOOM = 1.9;
/** A little more (u) round every burst's reach, for its heads' own size. */
const REACH_SLACK = 0.008;
/**
 * The HUD's corner buttons end this far down the screen, and its rows of text (score, best,
 * lives, the perfect count) keep to the column: bursts in the lanes stay below the buttons. The
 * lancework flag hangs below the HUD's rows (HUD_BOTTOM).
 */
const HUD_CORNER = 0.15;
const HUD_BOTTOM = 0.3;
/** Bursts keep this far (u) in from a side of the screen, from the column and from the moon. */
const MARGIN = 0.012;
/** Half width of the tower's column (u): nothing of the show crosses it. */
const COLUMN = 0.242;
/** Burst radius (u): the smallest a shell shrinks to, and its full size before the finale grows it (most shrink to fit a phone's lane). */
const R_MIN = 0.035;
const R_MAX = 0.13;
const FINALE_GROW = 0.25;

export type Style = "peony" | "mum" | "willow" | "ring" | "glitter" | "palm";
/** The show's launchers take their designs in turn from SHOW_STYLES, the finale's from FINALE_STYLES, so every design comes round. */
const SHOW_STYLES: readonly Style[] = ["mum", "willow", "peony", "ring", "palm", "glitter"];
const FINALE_STYLES: readonly Style[] = ["peony", "mum", "willow", "ring", "palm", "peony", "glitter"];

/** How far a burst of radius R reaches over its life, in R: either side, up from its center, and down (the willow's and the palm's trails hang furthest). */
const REACH: Record<Style, readonly [across: number, up: number, down: number]> = {
  peony: [1.1, 1.04, 1.4],
  mum: [1.12, 1.06, 1.42],
  willow: [1.16, 1.02, 2.9],
  ring: [1.1, 0.95, 1.3],
  glitter: [1.04, 1.0, 1.36],
  palm: [1.24, 1.06, 2.1],
};

interface Launcher {
  /** -1 the left lane, 1 the right. */
  side: -1 | 1;
  /** Where in the lane: across (0 inner edge .. 1 outer) and down (0 top .. 1 bottom). */
  fx: number;
  fy: number;
  style: Style;
  period: number;
  phase: number;
  /** Which of the four colors, and its pair. */
  color: number;
  size: number;
}

/** The show's launchers, three a side at first, more joining as it builds; the last FINALE_ONLY fire only in the finale. */
const SHOW_N = 14;
const FINALE_ONLY = 10;
const LAUNCHERS: Launcher[] = Array.from({ length: SHOW_N + FINALE_ONLY }, (_, i) => {
  const h = (n: number) => hash(i * 31 + n + 9000);
  return {
    side: i % 2 ? 1 : -1,
    fx: 0.2 + h(1) * 0.6,
    fy: 0.1 + h(2) * 0.8,
    style: i < SHOW_N ? SHOW_STYLES[i % SHOW_STYLES.length]! : FINALE_STYLES[(i - SHOW_N) % FINALE_STYLES.length]!,
    period: i < SHOW_N ? 2.8 + h(4) * 1.8 : 1.6 + h(4) * 0.8,
    phase: h(5) * 6,
    color: Math.floor(h(6) * 4),
    size: i < SHOW_N ? 0.7 + h(7) * 0.3 : 0.85 + h(7) * 0.15,
  };
});

/** Scratch: where the burst being placed goes. */
const SPOT = { x: 0, y: 0, r: 0 };

/** The lane's room for bursts: inner and outer edges (px), top and bottom. Scratch, so placing allocates nothing. */
const ROOM = { inner: 0, outer: 0, top: 0, bottom: 0 };

/**
 * Where the land tops out in a lane (px): the steeple's cross on the left, the courthouse flag's
 * pole on the right, the flagpoles of the front row, the hills and their trees, or the clouds
 * banked on them.
 */
export function skyline(s: Scene, tone: Tone, side: -1 | 1): number {
  const u = s.u;
  return Math.min(
    backLine(s) - u * (side > 0 ? POLE_TOP : STEEPLE_REACH),
    frontLine(s) - u * (POLE_H + 0.012),
    hillLine(s) - u * Math.max(bankTop(s, tone, side), hillsTop(s)),
  );
}

function room(s: Scene, tone: Tone, side: -1 | 1): typeof ROOM {
  const u = s.u;
  ROOM.inner = s.cssW / 2 + side * u * (COLUMN + MARGIN);
  ROOM.outer = side < 0 ? u * MARGIN : s.cssW - u * MARGIN;
  ROOM.top = s.cssH * HUD_CORNER;
  if (side < 0 && tone.moon > 0) {
    const m = moonAt(s);
    ROOM.top = Math.max(ROOM.top, m.y + m.r * MOON_REACH + u * MARGIN);
  }
  ROOM.bottom = Math.min(s.cssH, skyline(s, tone, side)) - u * MARGIN;
  // Sky Islands' floating island comes down the right lane through the show: the bursts there keep above it.
  if (side > 0) {
    const isle = islandSpan(s);
    if (isle) ROOM.bottom = Math.min(ROOM.bottom, isle.t - u * MARGIN);
  }
  return ROOM;
}

/**
 * Place launcher `l`'s burst (full radius `R`, before any shrink) on this screen: its spot in
 * its lane's room, shrunk to fit if the room is tight. Returns false when there is no room at
 * all (the lane is too short on this screen at this height).
 */
export function place(s: Scene, tone: Tone, l: Launcher, R: number): boolean {
  const u = s.u;
  const [kx, ku, kd] = REACH[l.style];
  const { inner, outer, top, bottom } = room(s, tone, l.side);
  const slack = u * REACH_SLACK;
  const r = Math.min(R, (Math.abs(outer - inner) - 2 * slack) / (2 * kx), (bottom - top - 2 * slack) / (ku + kd));
  if (r < R_MIN * u) return false;
  const x0 = Math.min(inner, outer) + r * kx + slack;
  const x1 = Math.max(inner, outer) - r * kx - slack;
  const y0 = top + r * ku + slack;
  const y1 = bottom - r * kd - slack;
  SPOT.x = x0 + (x1 - x0) * l.fx;
  SPOT.y = y0 + (y1 - y0) * l.fy;
  SPOT.r = r;
  return true;
}

/** The stars of a shell: unit directions and speed jitter. */
const PETALS = 18;
const DIRS = Array.from({ length: PETALS }, (_, j) => {
  const a = (j / PETALS) * Math.PI * 2 + hash(j + 9300) * 0.18;
  return [Math.cos(a), Math.sin(a), 0.82 + hash(j + 9400) * 0.18] as const;
});
/** Glitter: sparks scattered in the burst's disc, each with its own twinkle. */
const SPARKS = 26;
const SPARK = Array.from({ length: SPARKS }, (_, j) => {
  const a = hash(j + 9500) * Math.PI * 2;
  const d = Math.sqrt(hash(j + 9600)) * 0.9;
  return [Math.cos(a) * d, Math.sin(a) * d, hash(j + 9700) * 10] as const;
});

function cubicOut(x: number): number {
  const k = 1 - x;
  return 1 - k * k * k;
}

/** The rocket's trail width (u) and its head's radius, and the sparks it sheds along the trail. */
const TRAIL_W = 0.0032;
const ROCKET_HEAD = 0.0055;
const TRAIL_SPARKS = 4;

/** Where a star is `k` into the bloom: out along (dx, dy) fast, then sinking `sink` R by the end (scratch). */
const AT = { x: 0, y: 0 };
function hang(bx: number, by: number, R: number, dx: number, dy: number, k: number, sink: number): typeof AT {
  const e = cubicOut(Math.min(1, Math.max(0, k) * 1.7));
  AT.x = bx + dx * R * e;
  AT.y = by + dy * R * e * 0.9 + sink * R * k * k;
  return AT;
}

/** Scratch: a trail's points along its track. */
const TRAIL_X = new Float64Array(5);
const TRAIL_Y = new Float64Array(5);

/**
 * Adds a star's trail from `k0` to `k1` of the bloom to the current path as a filled ribbon that
 * tapers from nothing at its tail to `w` wide at its head (a fill costs a fraction of a stroke).
 */
function streak(ctx: Ctx, bx: number, by: number, R: number, dx: number, dy: number, k0: number, k1: number, sink: number, w: number): void {
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const p = hang(bx, by, R, dx, dy, Math.max(0, k0 + ((k1 - k0) * i) / n), sink);
    TRAIL_X[i] = p.x;
    TRAIL_Y[i] = p.y;
  }
  // Out along one side, tail to head, and back along the other.
  for (let side = 1; side >= -1; side -= 2) {
    for (let j = 0; j <= n; j++) {
      const i = side > 0 ? j : n - j;
      const a = Math.max(0, i - 1);
      const b = Math.min(n, i + 1);
      let nx = -(TRAIL_Y[b]! - TRAIL_Y[a]!);
      let ny = TRAIL_X[b]! - TRAIL_X[a]!;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      const half = (w * 0.5 * i) / n;
      const x = TRAIL_X[i]! + nx * half * side;
      const y = TRAIL_Y[i]! + ny * half * side;
      if (side > 0 && j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/** Draw one shell `local` seconds after its launch at SPOT (as place() left it), `on` visible, rising from `launchY`. */
function shell(ctx: Ctx, s: Scene, l: Launcher, seed: number, local: number, on: number, launchY: number): void {
  const u = s.u;
  const { x: bx, y: by, r: R } = SPOT;
  const c1 = l.color;
  const c2 = (l.color + 1 + Math.floor(hash(seed + 2) * 3)) % 4;
  ctx.lineCap = "round";
  if (local < RISE) {
    // The rocket: a bright head climbing on a fine gold trail from behind the treetops, shedding sparks.
    const k = local / RISE;
    const sx = bx + (hash(seed + 9) - 0.5) * u * 0.05;
    const e = cubicOut(k);
    const hx = sx + (bx - sx) * e;
    const hy = launchY + (by - launchY) * e;
    const tail = cubicOut(Math.max(0, k - 0.3));
    const tx = sx + (bx - sx) * tail;
    const ty = launchY + (by - launchY) * tail;
    ctx.globalAlpha = on * 0.8;
    ctx.strokeStyle = FIREWORK[3];
    ctx.lineWidth = Math.max(1, u * TRAIL_W);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.globalAlpha = on;
    ctx.fillStyle = FIREWORK_LIGHT[3];
    ctx.beginPath();
    for (let i = 0; i < TRAIL_SPARKS; i++) {
      const f = (i + hash(seed + i * 3 + Math.floor(local * 20))) / TRAIL_SPARKS;
      speck(ctx, tx + (hx - tx) * f + (hash(seed + i * 7 + Math.floor(local * 24)) - 0.5) * u * 0.008, ty + (hy - ty) * f, u * 0.0018);
    }
    dot(ctx, hx, hy, u * ROCKET_HEAD);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const k = (local - RISE) / BLOOM;
  const fade = on * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
  ctx.lineCap = "butt";
  // The bloom's soft glow: two discs of its light swelling and fading behind the stars, lighting the sky round it.
  if (k < 0.6) {
    const gr = R * (0.4 + 0.65 * cubicOut(Math.min(1, k * 2)));
    const a = fade * (1 - k / 0.6);
    ctx.fillStyle = FIREWORK[c1]!;
    ctx.globalAlpha = a * 0.12;
    ctx.beginPath();
    circle(ctx, bx, by, gr);
    ctx.fill();
    ctx.fillStyle = FIREWORK_LIGHT[c1]!;
    ctx.globalAlpha = a * 0.16;
    ctx.beginPath();
    circle(ctx, bx, by, gr * 0.55);
    ctx.fill();
  }
  // The smoke it leaves: soft puffs swelling at its heart as it fades, lit by its own last light.
  if (k > 0.35) {
    const e = (k - 0.35) / 0.65;
    ctx.globalAlpha = on * 0.16 * Math.sin(e * Math.PI);
    ctx.fillStyle = SMOKE_LIT;
    ctx.beginPath();
    const sr = R * (0.18 + 0.22 * e);
    circle(ctx, bx - sr * 0.6, by + R * 0.12 * e, sr);
    circle(ctx, bx + sr * 0.55, by + R * 0.2 * e, sr * 0.85);
    circle(ctx, bx, by - sr * 0.4 + R * 0.1 * e, sr * 0.9);
    ctx.fill();
  }
  ctx.globalAlpha = fade;
  // The flash at its heart.
  if (k < 0.1) {
    ctx.fillStyle = FIREWORK_LIGHT[1];
    ctx.beginPath();
    dot(ctx, bx, by, R * 0.18 * (1 - k / 0.1));
    ctx.fill();
  }
  if (l.style === "glitter") glitter(ctx, s, bx, by, R, k, c1);
  else if (l.style === "ring") ring(ctx, s, bx, by, R, k, c1, c2);
  else if (l.style === "willow") willow(ctx, s, bx, by, R, k);
  else if (l.style === "palm") palm(ctx, s, bx, by, R, k);
  else if (l.style === "peony") peony(ctx, s, bx, by, R, k, c1, c2);
  else mum(ctx, s, bx, by, R, k, c1);
  ctx.globalAlpha = 1;
}

/** A peony: a sphere of glowing stars with short tails, turning from its color to its pair's as they fade, twinkling out. */
function peony(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: number, c2: number): void {
  const u = s.u;
  const sink = 0.3;
  const turned = k > 0.5;
  const pr = Math.max(u * 0.0026, R * 0.06 * (1 - k * 0.5));
  ctx.fillStyle = FIREWORK[turned ? c2 : c1]!;
  ctx.beginPath();
  const pw = Math.max(1, pr * 1.3);
  for (const [dx, dy, sp] of DIRS) streak(ctx, bx, by, R * sp, dx, dy, k - 0.12, k, sink, pw);
  ctx.fill();
  ctx.fillStyle = FIREWORK_LIGHT[turned ? c2 : c1]!;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) {
    if (k > 0.75 && Math.sin(s.t * 25 + j * 2.3) < 0) continue;
    const [dx, dy, sp] = DIRS[j]!;
    const p = hang(bx, by, R * sp, dx, dy, k, sink);
    dot(ctx, p.x, p.y, pr);
  }
  ctx.fill();
}

/** A chrysanthemum: fine trails streaming out from the heart to bright heads, an inner ring of the paler color. */
function mum(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: number): void {
  const u = s.u;
  const sink = 0.35;
  const pr = Math.max(u * 0.0024, R * 0.05 * (1 - k * 0.5));
  ctx.fillStyle = FIREWORK[c1]!;
  ctx.beginPath();
  const mw = Math.max(1, R * 0.034);
  for (const [dx, dy, sp] of DIRS) streak(ctx, bx, by, R * sp, dx, dy, k * 0.45, k, sink, mw);
  ctx.fill();
  ctx.fillStyle = FIREWORK_LIGHT[c1]!;
  ctx.beginPath();
  for (const [dx, dy, sp] of DIRS) {
    const p = hang(bx, by, R * sp, dx, dy, k, sink);
    dot(ctx, p.x, p.y, pr);
    const q = hang(bx, by, R * sp * 0.48, -dy, dx, k, sink * 0.6);
    if (k < 0.8) dot(ctx, q.x, q.y, pr * 0.6);
  }
  ctx.fill();
}

/** How far (R) the willow's trails sink by the end, and how much of the bloom a trail's tail lags its head. */
const WILLOW_SINK = 1.8;
const WILLOW_LAG = 0.42;

/** A gold willow: trails thrown out from the heart that hang and sink three times as far as they spread, their tips twinkling out. */
function willow(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number): void {
  const u = s.u;
  const pr = Math.max(u * 0.0024, R * 0.045 * (1 - k * 0.5));
  ctx.fillStyle = FIREWORK[3];
  ctx.beginPath();
  const ww = Math.max(1, R * 0.036);
  for (const [dx, dy, sp] of DIRS) streak(ctx, bx, by, R * sp, dx, dy, k - WILLOW_LAG, k, WILLOW_SINK, ww);
  ctx.fill();
  ctx.fillStyle = FIREWORK_LIGHT[3];
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) {
    if (Math.sin(s.t * 23 + j * 2.1) < -0.3) continue;
    const [dx, dy, sp] = DIRS[j]!;
    const p = hang(bx, by, R * sp, dx, dy, k, WILLOW_SINK);
    dot(ctx, p.x, p.y, pr);
  }
  ctx.fill();
}

/** The palm's fronds: their directions (up and out, none straight down), and how far they sink. */
const FRONDS = Array.from({ length: 7 }, (_, j) => {
  const a = -Math.PI / 2 + (j - 3) * 0.5;
  return [Math.cos(a), Math.sin(a)] as const;
});
const PALM_SINK = 1.2;

/** A palm: the rising trail left glowing as a trunk under the heart, and seven heavy gold fronds arching up and out and drooping. */
function palm(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number): void {
  const u = s.u;
  const tk = Math.max(0, 1 - k * 1.6);
  ctx.strokeStyle = FIREWORK[3];
  if (tk > 0) {
    ctx.globalAlpha *= 0.7;
    ctx.lineWidth = Math.max(1, R * 0.03 * tk);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by + R * 1.6 * tk);
    ctx.stroke();
    ctx.globalAlpha /= 0.7;
  }
  ctx.fillStyle = FIREWORK[3];
  ctx.beginPath();
  const fw = Math.max(1.2, R * 0.075 * (1 - k * 0.5));
  for (const [dx, dy] of FRONDS) streak(ctx, bx, by, R, dx, dy, k * 0.4, k, PALM_SINK, fw);
  ctx.fill();
  ctx.fillStyle = FIREWORK_LIGHT[3];
  ctx.beginPath();
  for (const [dx, dy] of FRONDS) {
    const p = hang(bx, by, R, dx, dy, k, PALM_SINK);
    dot(ctx, p.x, p.y, Math.max(u * 0.0026, R * 0.06));
  }
  dot(ctx, bx, by, R * 0.1 * (1 - k * 0.7));
  ctx.fill();
}

/** A ring: a circle of stars drifting down together round a smaller heart of the second color. */
function ring(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: number, c2: number): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.3));
  const droop = R * 0.3 * k * k;
  const pr = Math.max(u * 0.0026, R * 0.06 * (k < 0.5 ? 1 : 1 - (k - 0.5) * 1.2));
  for (let pass = 0; pass < 2; pass++) {
    const rr = R * e * (pass ? 0.42 : 1);
    ctx.fillStyle = pass ? FIREWORK_LIGHT[c2]! : FIREWORK[c1]!;
    ctx.beginPath();
    for (let j = 0; j < PETALS; j += pass + 1) {
      const [dx, dy] = DIRS[j]!;
      const x = bx + dx * rr;
      const y = by + dy * rr * 0.78 + droop;
      if (pass) starPath(ctx, x, y, pr * 1.3);
      else dot(ctx, x, y, pr);
    }
    ctx.fill();
  }
}

/** Crackling glitter: a cloud of sparks that spread, twinkle and sink. */
function glitter(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: number): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.5));
  const sink = R * 0.3 * k * k;
  const pr = Math.max(u * 0.0024, R * 0.045);
  const frame = Math.floor(s.t * 20);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? FIREWORK_LIGHT[1] : FIREWORK[c1]!;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const [dx, dy, ph] = SPARK[j]!;
      const tw = Math.sin(frame * 0.9 + ph);
      if ((tw > 0.3) !== (pass === 1)) continue;
      const x = bx + dx * R * e;
      const y = by + dy * R * e + sink * (0.5 + dx * dx);
      if (pass) starPath(ctx, x, y, pr * 1.3);
      else dot(ctx, x, y, pr);
    }
    ctx.fill();
  }
}

/** Scratch for the tests: the burst last given to `eachBurst`. Its reach is the box everything it draws in bloom stays inside. */
export interface Burst {
  x: number;
  y: number;
  /** Its reach: out either side, up and down from its center (px). */
  across: number;
  up: number;
  down: number;
  side: -1 | 1;
  /** Where its rocket climbs from (px) and how far it wanders sideways of the burst's center on the way. */
  launchY: number;
  wander: number;
}
const BURST: Burst = { x: 0, y: 0, across: 0, up: 0, down: 0, side: 1, launchY: 0, wander: 0 };

/** Where rockets and the finale's ground pieces climb from: behind the front row's treetops (or the screen's bottom). */
function launchFrom(s: Scene): number {
  return Math.min(s.cssH, frontLine(s) - s.u * 0.02) + s.u * 0.04;
}

/**
 * Walk every shell in the air at scene time `s.t`: `cb(local, launcher, seed, on, burst)` with its
 * age since launch, how visible it is (the show and the finale fade their launchers in), and
 * where it bursts. Shells whose launcher has no room on this screen are skipped.
 */
function eachShell(s: Scene, tone: Tone, cb: (local: number, l: Launcher, seed: number, on: number, b: Burst) => void): void {
  const u = s.u;
  if (tone.show <= 0 && tone.finale <= 0) return;
  const lit = tone.show * SHOW_N;
  for (let i = 0; i < LAUNCHERS.length; i++) {
    const l = LAUNCHERS[i]!;
    const on = i < SHOW_N ? Math.min(1, Math.max(0, lit - i)) : tone.finale;
    if (on <= 0.02) continue;
    const period = l.period;
    const R = u * (R_MIN + (R_MAX - R_MIN) * l.size) * (1 + FINALE_GROW * tone.finale);
    if (!place(s, tone, l, R)) continue;
    const n0 = Math.floor((s.t - l.phase) / period);
    for (let n = n0 - 1; n <= n0; n++) {
      if (n < 0) continue;
      const seed = i * 977 + n * 13;
      const launch = l.phase + n * period + hash(seed) * period * 0.3;
      const local = s.t - launch;
      if (local < 0 || local > RISE + BLOOM) continue;
      const [kx, ku, kd] = REACH[l.style];
      const slack = u * REACH_SLACK;
      BURST.x = SPOT.x;
      BURST.y = SPOT.y;
      BURST.across = SPOT.r * kx + slack;
      BURST.up = SPOT.r * ku + slack;
      BURST.down = SPOT.r * kd + slack;
      BURST.side = l.side;
      BURST.launchY = launchFrom(s);
      BURST.wander = u * 0.025;
      cb(local, l, seed, on, BURST);
    }
  }
}

/** For the tests: every burst in the air now, with its reach. */
export function eachBurst(s: Scene, tone: Tone, cb: (b: Burst, local: number) => void): void {
  eachShell(s, tone, (local, _l, _seed, _on, b) => cb(b, local));
}

/** Scratch arguments for the per-frame walk, so it allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null };
function drawShell(local: number, l: Launcher, seed: number, on: number, b: Burst): void {
  shell(NOW.ctx!, NOW.s!, l, seed, local, on, b.launchY);
}

/** The show: the finale's wall of fountains and Roman candles, every shell in the air, and the finale's lancework flag. */
export function fireworks(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  groundPieces(ctx, s, tone);
  eachShell(s, tone, drawShell);
  lancework(ctx, s, tone);
}

/**
 * The bursts' light on the town: the shells in bloom in each lane, added up, lay one soft glow of
 * the brightest one's color over the rooftops and treetops of that lane, strongest as they open.
 * It keeps to its lane, so it never reaches the tower's column.
 */
const LIGHT = { sum: new Float64Array(2), x: new Float64Array(2), best: new Float64Array(2), color: [0, 0], y: new Float64Array(2) };
export function townGlow(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.show <= 0 && tone.finale <= 0) return;
  NOW.ctx = ctx;
  NOW.s = s;
  for (let i = 0; i < 2; i++) LIGHT.sum[i] = LIGHT.x[i] = LIGHT.best[i] = LIGHT.y[i] = 0;
  eachShell(s, tone, lightOne);
  const u = s.u;
  const cx = s.cssW / 2;
  for (let i = 0; i < 2; i++) {
    const sum = LIGHT.sum[i]!;
    if (sum <= 0.01) continue;
    const x = LIGHT.x[i]! / sum;
    const y = LIGHT.y[i]! / sum;
    const r = Math.min(Math.abs(x - cx) - u * (COLUMN + MARGIN), u * 0.3);
    if (r <= u * 0.02) continue;
    // Tinted, not whitened, and feathered out (an even fall-off reads as a bubble round the houses).
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const stops = GLOW_STOPS[LIGHT.color[i]!]!;
    for (let k = 0; k < GLOW_AT.length; k++) g.addColorStop(GLOW_AT[k]!, stops[k]!);
    ctx.globalAlpha = Math.min(0.3, 0.11 * sum);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function lightOne(local: number, l: Launcher, _seed: number, on: number, b: Burst): void {
  const s = NOW.s!;
  if (local < RISE) return;
  const k = (local - RISE) / BLOOM;
  if (k > 0.8) return;
  const w = on * (1 - k / 0.8);
  const i = b.side > 0 ? 1 : 0;
  LIGHT.sum[i] = LIGHT.sum[i]! + w;
  LIGHT.x[i] = LIGHT.x[i]! + w * b.x;
  LIGHT.y[i] = LIGHT.y[i]! + w * Math.min(s.cssH, Math.max(b.y + b.down, b.launchY - s.u * 0.1));
  if (w > LIGHT.best[i]!) {
    LIGHT.best[i] = w;
    LIGHT.color[i] = l.color;
  }
}
/** The light's fall-off from its middle: where each stop is and how strong, eased out to nothing so it has no edge. */
const GLOW_AT = [0, 0.3, 0.55, 0.78, 1] as const;
const GLOW_A = [1, 0.75, 0.38, 0.12, 0] as const;
/** Each firework color's light at those stops, a little warmer than the burst. */
const GLOW_STOPS = FIREWORK.map((c, i) => {
  const lit = mix(c, FIREWORK_LIGHT[i]!, 0.25);
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(lit.slice(k, k + 2), 16));
  return GLOW_A.map((a) => `rgba(${r}, ${g}, ${b}, ${a})`);
});

// ---------------------------------------------------------------- the finale's wall

/**
 * The finale's ground pieces along the skyline at each side, between its landmark and the
 * screen's edge: fountains (gerbs) spraying gold and cream sparks in a sheaf, and Roman candles
 * firing a star of red, cream, blue or gold up the lane every CANDLE_EVERY seconds. They rise
 * from behind the treetops no higher than the lane's skyline (so they never meet a burst, which
 * keep above it), and fade in and out with the finale.
 */
const PIECES = ["fountain", "candle", "fountain", "candle", "fountain"] as const;
/** The ground pieces keep this far (u) out from the center: clear of the steeple (left) and the courthouse's dome (right). */
const WALL_FROM = [0.34, 0.385] as const;
/** Each piece wants this much of the lane's width (u): as many as fit stand evenly along it, fountains and candles by turns. */
const SLOT = 0.065;
/** A fountain's height at most (u), its sparks and how long one takes to rise and fall (s); its sheaf spreads SHEAF of its height either side, or less where its slot is narrow. */
const FOUNTAIN_H = 0.3;
const FOUNTAIN_SPARKS = 22;
const FOUNTAIN_TIME = 1.1;
const SHEAF = 0.11;
const GERB = Array.from({ length: FOUNTAIN_SPARKS }, (_, j) => [(hash(j + 9810) - 0.5) * 2, 0.75 + hash(j + 9820) * 0.25, hash(j + 9830)] as const);
/** A candle's star: how often one goes up (s), how long it climbs (s), its radius (u). */
const CANDLE_EVERY = 0.55;
const CANDLE_RISE = 1.1;
const CANDLE_STAR = 0.011;
/** The sparks' and stars' own size past their tracks (u), which every piece's box allows for. */
const PIECE_SLACK = 0.012;

/** Scratch: a ground piece's place (screen x), its foot and how high it may reach (px), and how far its sheaf spreads either side (px). */
const PIECE = { x: 0, foot: 0, top: 0, spread: 0 };

/** Calls `cb` with every ground piece on screen (PIECE filled in): its kind and index. Returns nothing when the finale is out. */
function eachPiece(s: Scene, tone: Tone, cb: (kind: "fountain" | "candle", i: number) => void): void {
  if (tone.finale <= 0.02) return;
  const u = s.u;
  const cx = s.cssW / 2;
  for (const side of [-1, 1] as const) {
    const from = WALL_FROM[side < 0 ? 0 : 1] * u;
    const room = cx - u * MARGIN - from;
    const n = Math.min(PIECES.length, Math.floor(room / (SLOT * u)));
    if (n < 1) continue;
    const slot = room / n;
    // No higher than the lane's skyline (a candle's star reaching a hair above its track).
    const top = skyline(s, tone, side) + u * PIECE_SLACK;
    for (let i = 0; i < n; i++) {
      const kind = PIECES[i]!;
      PIECE.x = cx + side * (from + slot * (i + 0.5));
      PIECE.foot = launchFrom(s);
      PIECE.top = Math.max(top, PIECE.foot - (kind === "fountain" ? FOUNTAIN_H : 0.6) * u);
      PIECE.spread = Math.min((PIECE.foot - PIECE.top) * SHEAF, slot / 2 - u * PIECE_SLACK);
      if (PIECE.top < PIECE.foot - u * 0.05) cb(kind, i + (side > 0 ? 7 : 0));
    }
  }
}

/** For the tests: every ground piece burning now, with the box it draws inside (x either side `across`, from `top` down to `foot`). */
export function eachPieceBox(s: Scene, tone: Tone, cb: (box: { x: number; across: number; top: number; foot: number }) => void): void {
  const slack = s.u * PIECE_SLACK;
  eachPiece(s, tone, (kind) => cb({ x: PIECE.x, across: (kind === "fountain" ? PIECE.spread : 0) + slack, top: PIECE.top - slack, foot: PIECE.foot + slack }));
}

/** Scratch arguments for the ground pieces' walk. */
const WALL = { ctx: null as Ctx | null, s: null as Scene | null, pass: 0 };

function drawPiece(kind: "fountain" | "candle", i: number): void {
  const ctx = WALL.ctx!;
  const s = WALL.s!;
  const u = s.u;
  const { x, foot, top } = PIECE;
  const h = foot - top;
  if (kind === "fountain") {
    if (WALL.pass > 1) return;
    // Sparks on their arcs up out of the sheaf and down again, gold and cream by turns (one ink a pass).
    for (let j = WALL.pass; j < FOUNTAIN_SPARKS; j += 2) {
      const [vx, vy, ph] = GERB[j]!;
      const a = (((s.t + ph * FOUNTAIN_TIME + i * 0.13) / FOUNTAIN_TIME) % 1 + 1) % 1;
      const y = foot - h * vy * 4 * a * (1 - a);
      speck(ctx, x + vx * PIECE.spread * a, y, u * (0.0045 - a * 0.002));
    }
    return;
  }
  if (WALL.pass < 2) return;
  // A candle: its stars in the air, each climbing and slowing, a short tail under it.
  for (let n = 0; n < 2; n++) {
    const shot = Math.floor(s.t / CANDLE_EVERY) - n + i * 3;
    const a = (s.t - (Math.floor(s.t / CANDLE_EVERY) - n) * CANDLE_EVERY) / CANDLE_RISE;
    if (a < 0 || a >= 1) continue;
    const y = foot - h * cubicOut(a);
    const r = u * CANDLE_STAR * (1 - a * 0.4);
    ctx.fillStyle = FIREWORK[((shot % 4) + 4) % 4]!;
    ctx.beginPath();
    dot(ctx, x, y, r);
    ctx.moveTo(x - r * 0.7, y);
    ctx.lineTo(x, Math.min(foot, y + r * 5 * (1 - a)));
    ctx.lineTo(x + r * 0.7, y);
    ctx.closePath();
    ctx.fill();
  }
}

/** The finale's wall of fountains and Roman candles, at the finale's strength. */
function groundPieces(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.finale <= 0.02) return;
  WALL.ctx = ctx;
  WALL.s = s;
  ctx.globalAlpha = tone.finale;
  // The fountains' sparks, gold and then cream, each ink in one fill; then the candles' stars, each its own.
  for (let pass = 0; pass < 2; pass++) {
    WALL.pass = pass;
    ctx.fillStyle = pass ? FIREWORK_LIGHT[1] : FIREWORK[3];
    ctx.beginPath();
    eachPiece(s, tone, drawPiece);
    ctx.fill();
  }
  WALL.pass = 2;
  eachPiece(s, tone, drawPiece);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the lancework flag

/**
 * The finale's set piece: a lancework flag, the Stars and Stripes printed in sparks as a
 * fireworks show's ground piece is, hung on a pole in the left lane under the moon. It flares up
 * every LANCE_EVERY seconds through the finale and burns LANCE_BURN seconds: thirteen rows of red
 * and cream lances, the canton a field of blue sparks with white stars crackling in it, rippling
 * as the flag would, a few sparks dropping from its foot.
 */
const LANCE_EVERY = 9;
const LANCE_BURN = 6;
/** Its length along the fly at most (u), and its depth as a share of its length (the flag's 1 to 1.9). */
const LANCE_W = 0.2;
const LANCE_ASPECT = 0.53;
/** Lances a stripe, the canton's star rows and columns, and the sparks dropping from the foot. */
const LANCES = 18;
const LANCE_ROWS = 7;
const LANCE_COLS = 6;
const DROPS = 10;

/** Where the lancework flag hangs now and how bright it burns (0 out): its pole's top (x, y), its length and depth. */
const LANCE = { x: 0, y: 0, w: 0, h: 0, on: 0 };

export function lanceAt(s: Scene, tone: Tone): typeof LANCE {
  LANCE.on = 0;
  if (tone.finale <= 0.02) return LANCE;
  const u = s.u;
  const k = (((s.t % LANCE_EVERY) + LANCE_EVERY) % LANCE_EVERY) / LANCE_BURN;
  if (k >= 1) return LANCE;
  // The room: the left lane, below the HUD and the moon, above the steeple and the cumulus.
  const left = u * MARGIN * 2;
  const right = s.cssW / 2 - u * (COLUMN + MARGIN);
  const m = moonAt(s);
  const top = Math.max(s.cssH * HUD_BOTTOM, m.y + m.r * MOON_REACH) + u * MARGIN;
  const bottom = skyline(s, tone, -1) - u * MARGIN;
  const w = Math.min(LANCE_W * u, right - left - u * 0.01, (bottom - top) / LANCE_ASPECT - u * 0.03);
  if (w < u * 0.08) return LANCE;
  LANCE.w = w;
  LANCE.h = w * LANCE_ASPECT;
  LANCE.x = left + (right - left - w) / 2;
  LANCE.y = top + (bottom - top - LANCE.h) / 2;
  LANCE.on = tone.finale * Math.min(1, k / 0.08) * (1 - Math.max(0, (k - 0.82) / 0.18));
  return LANCE;
}

/** The lancework flag, when it burns. */
export function lancework(ctx: Ctx, s: Scene, tone: Tone): void {
  const { x, y, w, h, on } = lanceAt(s, tone);
  if (on <= 0.02) return;
  const u = s.u;
  const frame = Math.floor(s.t * 14);
  const wave = (k: number) => Math.sin(s.t * 3 - k * 4) * h * 0.05 * k;
  const pitch = w / LANCES;
  const lh = h / 13;
  const cw = w * 0.4;
  const ch = lh * 7;
  ctx.globalAlpha = on;
  // The pole.
  ctx.fillStyle = FIREWORK[3];
  ctx.fillRect(x - u * 0.004, y - u * 0.006, u * 0.004, h + u * 0.03);
  // The stripes: a row of lances each, red and cream by turns from a red one at the top, the canton's rows left to it.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? FIREWORK[1] : FIREWORK[0];
    ctx.beginPath();
    for (let row = pass; row < 13; row += 2) {
      const ry = y + row * lh;
      for (let i = 0; i < LANCES; i++) {
        const lx = x + i * pitch;
        if (row < 7 && lx + pitch * 0.7 <= x + cw) continue;
        const k = (i + 0.5) / LANCES;
        ctx.rect(lx + pitch * 0.12, ry + lh * 0.2 + wave(k), pitch * 0.76, lh * 0.62);
      }
    }
    ctx.fill();
  }
  // The canton: a field of blue sparks, and the white stars crackling in it.
  ctx.fillStyle = FIREWORK[2];
  ctx.beginPath();
  for (let i = 0; i * pitch < cw; i++) {
    for (let row = 0; row < 7; row++) ctx.rect(x + i * pitch + pitch * 0.12, y + row * lh + lh * 0.2 + wave((i + 0.5) / LANCES), pitch * 0.76, lh * 0.62);
  }
  ctx.fill();
  ctx.fillStyle = FIREWORK[1];
  ctx.beginPath();
  for (let row = 0; row < LANCE_ROWS; row++) {
    const cols = row % 2 ? LANCE_COLS - 1 : LANCE_COLS;
    for (let c = 0; c < cols; c++) {
      const sx = x + ((c + (row % 2 ? 1 : 0.5)) / LANCE_COLS) * cw;
      const sy = y + ((row + 1) / (LANCE_ROWS + 1)) * ch + wave((sx - x) / w);
      const tw = hash(row * 13 + c + frame * 7) > 0.25 ? 1 : 0.6;
      starPath(ctx, sx, sy, Math.min(cw / LANCE_COLS, ch / LANCE_ROWS) * 0.42 * tw);
    }
  }
  ctx.fill();
  // Sparks dropping from the foot of the flag.
  ctx.fillStyle = FIREWORK_LIGHT[3];
  ctx.beginPath();
  for (let i = 0; i < DROPS; i++) {
    const fall = ((s.t * 0.9 + hash(i + 9800)) % 1);
    dot(ctx, x + hash(i + 9900) * w, y + h + fall * u * 0.04, u * 0.0025 * (1 - fall));
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

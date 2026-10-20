import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FIREWORK, FIREWORK_LIGHT } from "./colors";
import { DOME_TOP, landmarkLine, STEEPLE_REACH } from "./far";
import { moonAt } from "./sky";
import type { Tone } from "./tone";

// The fireworks show, once night has fallen on the climb (tone.ts): shells go up from behind
// the cloud floor in the two side lanes and burst in red, white, blue and gold, in four of our
// own designs: chrysanthemums (a ring of comet petals round a second color's heart),
// willows (gold trails that droop and twinkle out), tricolor rings (a red ring round a white
// one round a blue) and glitter shells (a cloud of twinkling sparks). Launchers join in one by
// one as the show builds; at the finale a second rank of launchers fires fast and the shells
// grow to fill both lanes, their light warming the sky and the cloud floor. Deterministic from the scene's
// clock and hash(): shell n of a launcher goes up at its phase plus n periods. A launcher's
// period never changes with the height (the finale's pace comes from its own fast launchers),
// so climbing never jolts a shell in the air to another age: it only fades launchers in and
// out and grows the bursts. As long as you stay in the night, the show goes on.
//
// Where a burst may go (place()): only in a side lane, never across the tower's column, the
// HUD's rows at the top, the moon (the left lane's bursts stay below it), the steeple and the
// courthouse dome standing out of the clouds (each lane's stay above its landmark, so none
// cuts into a burst) or the cloud floor, and never off a side of the screen. A shell that finds no room big enough shrinks to fit, or
// waits.

/** Seconds a rocket climbs, then seconds its burst lasts. */
export const RISE = 0.7;
export const BLOOM = 1.7;
/** How far a burst of radius R reaches from its center over its life (the willow's trails droop furthest): its room and the circle the tests hold it to. */
const BELOW = 1.4;
const BELOW_WILLOW = 1.75;
/** A little more (u) round every burst's reach, for its heads' own size. */
const REACH_SLACK = 0.006;
/** The HUD's rows end this far down the screen; bursts stay below it. */
const HUD_BOTTOM = 0.3;
/** Bursts keep this far (u) in from a side of the screen, from the column and from the moon. */
const MARGIN = 0.02;
/** Half width of the tower's column (u): no burst crosses it. */
const COLUMN = 0.26;
/** Burst radius (u): the smallest a shell shrinks to, and its full size before the finale grows it. */
const R_MIN = 0.03;
const R_MAX = 0.095;
const FINALE_GROW = 0.25;

export type Style = "mum" | "willow" | "ring" | "glitter";
const STYLES: readonly Style[] = ["mum", "willow", "ring", "glitter", "mum", "mum", "ring"];

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
const SHOW_N = 12;
const FINALE_ONLY = 14;
const LAUNCHERS: Launcher[] = Array.from({ length: SHOW_N + FINALE_ONLY }, (_, i) => {
  const h = (n: number) => hash(i * 31 + n + 9000);
  return {
    side: i % 2 ? 1 : -1,
    fx: 0.2 + h(1) * 0.6,
    fy: 0.1 + h(2) * 0.8,
    style: STYLES[Math.floor(h(3) * STYLES.length)]!,
    period: i < SHOW_N ? 3.6 + h(4) * 2.4 : 1.4 + h(4) * 0.8,
    phase: h(5) * 6,
    color: Math.floor(h(6) * 4),
    size: i < SHOW_N ? 0.6 + h(7) * 0.4 : 0.85 + h(7) * 0.15,
  };
});

/** Scratch: where the burst being placed goes. */
const SPOT = { x: 0, y: 0, r: 0 };

/**
 * Place launcher `l`'s burst (full radius `R`, before any shrink) on this screen: its spot in
 * its lane's room, shrunk to fit if the room is tight. Returns false when there is no room at
 * all (the lane is too short on this screen at this height).
 */
export function place(s: Scene, tone: Tone, floor: number, l: Launcher, R: number): boolean {
  const u = s.u;
  const cx = s.cssW / 2;
  const below = l.style === "willow" ? BELOW_WILLOW : BELOW;
  // The lane's room: between the column and the side, the HUD (or the moon) and the floor (or the lane's landmark).
  const inner = cx + l.side * u * (COLUMN + MARGIN);
  const outer = l.side < 0 ? u * MARGIN : s.cssW - u * MARGIN;
  let top = s.cssH * HUD_BOTTOM;
  let bottom = Math.min(s.cssH, floor) - u * MARGIN;
  if (l.side < 0 && tone.moon > 0) {
    const m = moonAt(s);
    top = Math.max(top, m.y + m.r + u * MARGIN);
  }
  bottom = Math.min(bottom, landmarkLine(s) - u * (l.side > 0 ? DOME_TOP : STEEPLE_REACH) - u * MARGIN);
  const width = Math.abs(outer - inner);
  const height = bottom - top;
  // The biggest radius whose whole reach (the circle everything it draws stays inside) the room
  // allows, down to R_MIN; none if even that will not fit.
  let r = Math.min(R, width / (2 * below), height / (2 * below));
  if (r < R_MIN) return false;
  r = Math.max(r, R_MIN);
  const reach = r * below + u * REACH_SLACK;
  const x0 = Math.min(inner, outer) + reach;
  const x1 = Math.max(inner, outer) - reach;
  const y0 = top + reach;
  const y1 = bottom - reach;
  SPOT.x = x0 + (x1 - x0) * l.fx;
  SPOT.y = y0 + (y1 - y0) * l.fy;
  SPOT.r = r;
  return true;
}

/** Scratch: the heads of the ring being drawn. */
const PETALS = 14;
const HEADS = new Float32Array(PETALS * 2);
/** Unit directions and speed jitter of the petals, and of the inner heart. */
const DIRS = Array.from({ length: PETALS }, (_, j) => {
  const a = (j / PETALS) * Math.PI * 2 + hash(j + 9300) * 0.2;
  return [Math.cos(a), Math.sin(a), 0.8 + hash(j + 9400) * 0.2] as const;
});
const HEART = 7;
const HEART_DIRS = Array.from({ length: HEART }, (_, j) => {
  const a = (j / HEART) * Math.PI * 2 + 0.4;
  return [Math.cos(a), Math.sin(a)] as const;
});
/** Glitter: sparks scattered in the burst's disc, each with its own twinkle. */
const SPARKS = 22;
const SPARK = Array.from({ length: SPARKS }, (_, j) => {
  const a = hash(j + 9500) * Math.PI * 2;
  const d = Math.sqrt(hash(j + 9600)) * 0.9;
  return [Math.cos(a) * d, Math.sin(a) * d, hash(j + 9700) * 10] as const;
});
/** The pop flash: an eight-point star, unit radius. */
const FLASH = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const r = i % 2 ? 0.4 : 1;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});
const HIGHLIGHT = "rgba(255, 255, 255, 0.7)";

function cubicOut(x: number): number {
  const k = 1 - x;
  return 1 - k * k * k;
}

/** Draw one shell `local` seconds after its launch at SPOT (as place() left it), `on` visible, rising from `launchY`. */
function shell(ctx: Ctx, s: Scene, l: Launcher, seed: number, local: number, on: number, launchY: number): void {
  const u = s.u;
  const { x: bx, y: by, r: R } = SPOT;
  const c1 = FIREWORK[l.color]!;
  const c2 = FIREWORK[(l.color + 1 + Math.floor(hash(seed + 2) * 3)) % 4]!;
  if (local < RISE) {
    // The rocket: a bright head on a dotted trail, up from behind the cloud floor.
    const k = local / RISE;
    const sx = bx + (hash(seed + 9) - 0.5) * u * 0.06;
    ctx.globalAlpha = on;
    ctx.fillStyle = FIREWORK[3];
    ctx.beginPath();
    for (let d = 1; d <= 4; d++) {
      const e = cubicOut(Math.max(0, k - d * 0.06));
      circle(ctx, sx + (bx - sx) * e, launchY + (by - launchY) * e, u * (0.006 - d * 0.001));
    }
    ctx.fill();
    const e = cubicOut(k);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    circle(ctx, sx + (bx - sx) * e, launchY + (by - launchY) * e, u * 0.007);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const k = (local - RISE) / BLOOM;
  ctx.globalAlpha = on * (k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2);
  // The pop: a flat white star at the heart.
  if (k < 0.12) {
    const fr = R * 0.4 * (1 - k / 0.12);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(bx + FLASH[0]![0] * fr, by + FLASH[0]![1] * fr);
    for (let j = 1; j < FLASH.length; j++) ctx.lineTo(bx + FLASH[j]![0] * fr, by + FLASH[j]![1] * fr);
    ctx.closePath();
    ctx.fill();
  }
  if (l.style === "glitter") glitter(ctx, s, bx, by, R, k, c1);
  else if (l.style === "ring") rings(ctx, s, bx, by, R, k);
  else petals(ctx, s, bx, by, R, k, l.style === "willow", l.color, c2);
  ctx.globalAlpha = 1;
}

/** A chrysanthemum (or, `willow`, a gold willow): comet petals with tapered trails, a heart of the second color, cel highlights. */
function petals(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, willow: boolean, color: number, c2: string): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.25));
  const et = cubicOut(Math.min(1, Math.max(0, k - (willow ? 0.3 : 0.14)) * 1.25));
  const droop = R * (willow ? 0.6 : 0.28) * k * k;
  const droopT = R * (willow ? 0.6 : 0.28) * Math.max(0, k - 0.2) ** 2;
  const shrink = k < 0.5 ? 1 : 1 - ((k - 0.5) / 0.5) * 0.8;
  const pr = Math.max(u * 0.003, R * (willow ? 0.055 : 0.07) * shrink);
  const head = willow ? FIREWORK[3] : FIREWORK[color]!;
  const trail = willow ? FIREWORK_LIGHT[3] : FIREWORK_LIGHT[color]!;
  for (let j = 0; j < PETALS; j++) {
    const [dx, dy, sp] = DIRS[j]!;
    HEADS[j * 2] = bx + dx * sp * R * e;
    HEADS[j * 2 + 1] = by + dy * sp * R * e + droop;
  }
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) {
    const [dx, dy, sp] = DIRS[j]!;
    ctx.moveTo(bx + dx * sp * R * et, by + dy * sp * R * et + droopT);
    ctx.lineTo(HEADS[j * 2]!, HEADS[j * 2 + 1]!);
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = trail;
  ctx.lineWidth = pr * (willow ? 1.4 : 1.1);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = head;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) circle(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]!, pr);
  ctx.fill();
  if (willow) {
    // The willow's tips twinkle out.
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let j = 0; j < PETALS; j += 2) {
      if (Math.sin(s.t * 23 + j * 2.1) < 0.2) continue;
      circle(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]! + pr * 0.5, pr * 0.45);
    }
    ctx.fill();
    return;
  }
  ctx.fillStyle = c2;
  ctx.beginPath();
  for (const [dx, dy] of HEART_DIRS) circle(ctx, bx + dx * R * e * 0.48, by + dy * R * e * 0.48 + droop * 0.7, pr * 0.85);
  ctx.fill();
  ctx.fillStyle = HIGHLIGHT;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) circle(ctx, HEADS[j * 2]! - pr * 0.3, HEADS[j * 2 + 1]! - pr * 0.3, pr * 0.36);
  ctx.fill();
}

/** A tricolor ring shell: three concentric rings of heads, red outside, white, then blue, drifting down together. */
function rings(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.3));
  const droop = R * 0.3 * k * k;
  const shrink = k < 0.5 ? 1 : 1 - ((k - 0.5) / 0.5) * 0.7;
  const pr = Math.max(u * 0.003, R * 0.065 * shrink);
  const squash = 0.75;
  for (let ring = 0; ring < 3; ring++) {
    const rr = R * e * (1 - ring * 0.3);
    ctx.fillStyle = FIREWORK[ring === 0 ? 0 : ring === 1 ? 1 : 2];
    ctx.beginPath();
    for (let j = 0; j < PETALS; j++) {
      const [dx, dy] = DIRS[j]!;
      circle(ctx, bx + dx * rr, by + dy * rr * squash + droop, pr * (1 - ring * 0.15));
    }
    ctx.fill();
  }
  ctx.fillStyle = HIGHLIGHT;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) {
    const [dx, dy] = DIRS[j]!;
    circle(ctx, bx + dx * R * e - pr * 0.3, by + dy * R * e * squash + droop - pr * 0.3, pr * 0.34);
  }
  ctx.fill();
}

/** A glitter shell: a cloud of sparks that spread, twinkle and sink. */
function glitter(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: string): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.5));
  const sink = R * 0.3 * k * k;
  const pr = Math.max(u * 0.0025, R * 0.045);
  const frame = Math.floor(s.t * 20);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? "#ffffff" : c1;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const [dx, dy, ph] = SPARK[j]!;
      const tw = Math.sin(frame * 0.9 + ph);
      if ((tw > 0.3) !== (pass === 1)) continue;
      circle(ctx, bx + dx * R * e, by + dy * R * e + sink * (0.5 + dx * dx), pr * (pass ? 0.7 : 1));
    }
    ctx.fill();
  }
}

/** Scratch for the tests: the burst last given to `eachBurst`. */
export interface Burst {
  x: number;
  y: number;
  /** Its reach: the circle everything it draws stays inside. */
  reach: number;
  side: -1 | 1;
}
const BURST: Burst = { x: 0, y: 0, reach: 0, side: 1 };

/**
 * Walk every shell in the air at scene time `s.t`: `cb(local, launcher, seed, on, burst)` with its
 * age since launch, how visible it is (the show and the finale fade their launchers in), and
 * where it bursts. Shells whose launcher has no room on this screen are skipped.
 */
function eachShell(s: Scene, tone: Tone, floor: number, cb: (local: number, l: Launcher, seed: number, on: number, b: Burst) => void): void {
  const u = s.u;
  if (tone.show <= 0 && tone.finale <= 0) return;
  const lit = tone.show * SHOW_N;
  for (let i = 0; i < LAUNCHERS.length; i++) {
    const l = LAUNCHERS[i]!;
    // The show's launchers fade in one by one; the finale's fast ones only in the finale.
    const on = i < SHOW_N ? Math.min(1, Math.max(0, lit - i)) : tone.finale;
    if (on <= 0.02) continue;
    const period = l.period;
    const R = u * (R_MIN + (R_MAX - R_MIN) * l.size) * (1 + FINALE_GROW * tone.finale);
    if (!place(s, tone, floor, l, R)) continue;
    const n0 = Math.floor((s.t - l.phase) / period);
    for (let n = n0 - 1; n <= n0; n++) {
      if (n < 0) continue;
      const seed = i * 977 + n * 13;
      const launch = l.phase + n * period + hash(seed) * period * 0.3;
      const local = s.t - launch;
      if (local < 0 || local > RISE + BLOOM) continue;
      BURST.x = SPOT.x;
      BURST.y = SPOT.y;
      BURST.reach = SPOT.r * (l.style === "willow" ? BELOW_WILLOW : BELOW) + u * REACH_SLACK;
      BURST.side = l.side;
      cb(local, l, seed, on, BURST);
    }
  }
}

/** For the tests: every burst in the air now, with its reach. */
export function eachBurst(s: Scene, tone: Tone, floor: number, cb: (b: Burst, local: number) => void): void {
  eachShell(s, tone, floor, (local, _l, _seed, _on, b) => cb(b, local));
}

/** Scratch arguments for the per-frame walk, so it allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, launchY: 0 };
function drawShell(local: number, l: Launcher, seed: number, on: number): void {
  shell(NOW.ctx!, NOW.s!, l, seed, local, on, NOW.launchY);
}

/** The show: every shell in the air, rising from behind the cloud floor (or the bottom of the screen). */
export function fireworks(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.launchY = Math.min(s.cssH, floor) + s.u * 0.04;
  eachShell(s, tone, floor, drawShell);
}

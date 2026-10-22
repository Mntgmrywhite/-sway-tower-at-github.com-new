import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FIREWORK, FIREWORK_LIGHT } from "./colors";
import { dot, starPath } from "./shapes";
import { landmarkLine, stackTop } from "./far";
import { POLE_TOP, STEEPLE_REACH } from "./landmarks";
import { moonAt } from "./sky";
import type { Tone } from "./tone";

// The fireworks show, once night has fallen on the climb (tone.ts): rockets streak up on gold
// trails from behind the cloud floor in the two side lanes and burst in red, cream, blue and
// gold, printed flat like poster bursts over a flat disc of their own ink, in five of our own
// designs: chrysanthemums (broad tapered rays radiating out to round heads, an inner ring of
// short rays and little stars of a second ink round the heart), willows (gold rays that droop
// and twinkle out), tricolor rings (red dots round cream stars round blue dots), glitter shells
// (a cloud of twinkling sparks) and the Pop Art shell (a comic-book starburst, jagged flat
// stars of two inks round a cream heart). Launchers join in one by one as the show builds; at
// the finale a second rank of launchers fires fast and the shells grow to fill both lanes,
// their light warming the sky and the cloud floor, and a lancework flag of sparks burns under
// the moon (lancework() below). Deterministic from the scene's
// clock and hash(): shell n of a launcher goes up at its phase plus n periods. A launcher's
// period never changes with the height (the finale's pace comes from its own fast launchers),
// so climbing never jolts a shell in the air to another age: it only fades launchers in and
// out and grows the bursts. As long as you stay in the night, the show goes on.
//
// Where a burst may go (place()): only in a side lane, never across the tower's column, the
// HUD's rows at the top, the moon (the left lane's bursts stay below it), the steeple and the
// courthouse's dome and flag standing out of the clouds, and the cumulus piled beside them
// (each lane's stay above its landmark and its clouds, so none cuts into a burst) or the cloud
// floor, and never off a side of the screen. A shell that finds no room big enough shrinks to fit, or
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

export type Style = "mum" | "willow" | "ring" | "glitter" | "pop";
const STYLES: readonly Style[] = ["mum", "willow", "ring", "glitter", "pop", "mum", "pop"];

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
  bottom = Math.min(bottom, landmarkLine(s) - u * Math.max(l.side > 0 ? POLE_TOP : STEEPLE_REACH, stackTop(s, tone, l.side)) - u * MARGIN);
  const width = Math.abs(outer - inner);
  const height = bottom - top;
  // The biggest radius whose whole reach (the circle everything it draws stays inside, slack
  // and all) the room allows, down to R_MIN; none if even that will not fit.
  const slack = u * REACH_SLACK;
  const r = Math.min(R, (width - 2 * slack) / (2 * below), (height - 2 * slack) / (2 * below));
  if (r < R_MIN) return false;
  const reach = r * below + slack;
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
const PETALS = 16;
const HEADS = new Float32Array(PETALS * 2);
/** Unit directions and speed jitter of the petals, and of the inner heart. */
const DIRS = Array.from({ length: PETALS }, (_, j) => {
  const a = (j / PETALS) * Math.PI * 2 + hash(j + 9300) * 0.2;
  return [Math.cos(a), Math.sin(a), 0.8 + hash(j + 9400) * 0.2] as const;
});
const HEART = 8;
const HEART_DIRS = Array.from({ length: HEART }, (_, j) => {
  const a = (j / HEART) * Math.PI * 2 + 0.4;
  return [Math.cos(a), Math.sin(a)] as const;
});
/** The Pop Art shell's starburst: how many points. */
const BURST_POINTS = 12;
/** Glitter: sparks scattered in the burst's disc, each with its own twinkle. */
const SPARKS = 28;
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
    // The rocket: a bright head streaking up from behind the cloud floor on a tapered gold trail.
    const k = local / RISE;
    const sx = bx + (hash(seed + 9) - 0.5) * u * 0.06;
    const e = cubicOut(k);
    const hx = sx + (bx - sx) * e;
    const hy = launchY + (by - launchY) * e;
    const tail = cubicOut(Math.max(0, k - 0.3));
    const tx = sx + (bx - sx) * tail;
    const ty = launchY + (by - launchY) * tail;
    const w = u * 0.005;
    ctx.globalAlpha = on;
    ctx.fillStyle = FIREWORK[3];
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx - w, hy);
    ctx.lineTo(hx + w, hy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = FIREWORK[1];
    ctx.beginPath();
    dot(ctx, hx, hy, u * 0.007);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const k = (local - RISE) / BLOOM;
  const fade = on * (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
  // A flat disc of the burst's ink behind it, swelling and fading: the poster's printed glow.
  ctx.globalAlpha = fade * 0.16 * (1 - k);
  ctx.fillStyle = c1;
  ctx.beginPath();
  circle(ctx, bx, by, R * cubicOut(Math.min(1, k * 1.6)) * 1.05);
  ctx.fill();
  ctx.globalAlpha = fade;
  // The pop: a flat cream star at the heart.
  if (k < 0.14) {
    const fr = R * 0.5 * (1 - k / 0.14);
    ctx.fillStyle = FIREWORK[1];
    ctx.beginPath();
    ctx.moveTo(bx + FLASH[0]![0] * fr, by + FLASH[0]![1] * fr);
    for (let j = 1; j < FLASH.length; j++) ctx.lineTo(bx + FLASH[j]![0] * fr, by + FLASH[j]![1] * fr);
    ctx.closePath();
    ctx.fill();
  }
  if (l.style === "glitter") glitter(ctx, s, bx, by, R, k, c1);
  else if (l.style === "ring") rings(ctx, s, bx, by, R, k);
  else if (l.style === "pop") pop(ctx, bx, by, R, k, c1, c2);
  else petals(ctx, s, bx, by, R, k, l.style === "willow", l.color, c2);
  ctx.globalAlpha = 1;
}

/**
 * A chrysanthemum (or, `willow`, a gold willow), printed like a poster: broad flat tapered rays
 * radiating from the heart out to round heads in the main ink, an inner ring of short rays in
 * the second ink, and little five-point stars of it round the heart.
 */
function petals(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, willow: boolean, color: number, c2: string): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.25));
  const et = cubicOut(Math.min(1, Math.max(0, k - (willow ? 0.3 : 0.16)) * 1.25));
  const droop = R * (willow ? 0.6 : 0.26) * k * k;
  const droopT = R * (willow ? 0.6 : 0.26) * Math.max(0, k - 0.2) ** 2;
  const shrink = k < 0.5 ? 1 : 1 - ((k - 0.5) / 0.5) * 0.75;
  const pr = Math.max(u * 0.003, R * (willow ? 0.07 : 0.095) * shrink);
  const head = willow ? FIREWORK[3] : FIREWORK[color]!;
  const ray = willow ? FIREWORK_LIGHT[3] : FIREWORK_LIGHT[color]!;
  for (let j = 0; j < PETALS; j++) {
    const [dx, dy, sp] = DIRS[j]!;
    HEADS[j * 2] = bx + dx * sp * R * e;
    HEADS[j * 2 + 1] = by + dy * sp * R * e + droop;
  }
  // Each ray a wedge from its tail (chasing the head out from the heart) to the head's full width.
  ctx.fillStyle = ray;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) {
    const [dx, dy, sp] = DIRS[j]!;
    const hx = HEADS[j * 2]!;
    const hy = HEADS[j * 2 + 1]!;
    ctx.moveTo(bx + dx * sp * R * et, by + dy * sp * R * et + droopT);
    ctx.lineTo(hx - dy * pr, hy + dx * pr);
    ctx.lineTo(hx + dy * pr, hy - dx * pr);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = head;
  ctx.beginPath();
  for (let j = 0; j < PETALS; j++) dot(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]!, pr);
  ctx.fill();
  if (willow) {
    // The willow's tips twinkle out.
    ctx.fillStyle = FIREWORK[1];
    ctx.beginPath();
    for (let j = 0; j < PETALS; j += 2) {
      if (Math.sin(s.t * 23 + j * 2.1) < 0.2) continue;
      dot(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]! + pr * 0.5, pr * 0.45);
    }
    ctx.fill();
    return;
  }
  // The inner ring: short broad rays of the second ink between the long ones, and stars round the heart.
  const ri = R * e * 0.5;
  ctx.fillStyle = c2;
  ctx.beginPath();
  for (let j = 0; j < HEART; j++) {
    const [dx, dy] = HEART_DIRS[j]!;
    const hx = bx + dx * ri;
    const hy = by + dy * ri + droop * 0.6;
    ctx.moveTo(bx + dx * ri * 0.3, by + dy * ri * 0.3 + droop * 0.4);
    ctx.lineTo(hx - dy * pr * 0.8, hy + dx * pr * 0.8);
    ctx.lineTo(hx + dy * pr * 0.8, hy - dx * pr * 0.8);
    ctx.closePath();
    starPath(ctx, hx, hy, pr * 1.25);
  }
  ctx.fill();
}

/** The Pop Art shell: a comic-book starburst, a jagged flat star of the main ink round a smaller one of the second and a cream heart, swelling and fading. */
function pop(ctx: Ctx, bx: number, by: number, R: number, k: number, c1: string, c2: string): void {
  const e = cubicOut(Math.min(1, k * 1.5));
  const turn = k * 0.4;
  for (let layer = 0; layer < 3; layer++) {
    const r = R * e * (layer === 0 ? 0.92 : layer === 1 ? 0.58 : 0.24);
    ctx.fillStyle = layer === 0 ? c1 : layer === 1 ? c2 : FIREWORK[1];
    ctx.beginPath();
    for (let j = 0; j < BURST_POINTS * 2; j++) {
      const a = (j / (BURST_POINTS * 2)) * Math.PI * 2 + turn * (layer === 1 ? -1 : 1);
      const rr = j % 2 ? r * 0.62 : r * (j % 4 === 0 ? 1 : 0.86);
      if (j === 0) ctx.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
      else ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** A tricolor ring shell: three concentric rings drifting down together, red dots outside, cream stars, then blue dots. */
function rings(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.3));
  const droop = R * 0.3 * k * k;
  const shrink = k < 0.5 ? 1 : 1 - ((k - 0.5) / 0.5) * 0.7;
  const pr = Math.max(u * 0.003, R * 0.085 * shrink);
  const squash = 0.75;
  for (let ring = 0; ring < 3; ring++) {
    const rr = R * e * (1 - ring * 0.3);
    ctx.fillStyle = FIREWORK[ring === 0 ? 0 : ring === 1 ? 1 : 2];
    ctx.beginPath();
    for (let j = 0; j < PETALS; j++) {
      const [dx, dy] = DIRS[j]!;
      const x = bx + dx * rr;
      const y = by + dy * rr * squash + droop;
      if (ring === 1) starPath(ctx, x, y, pr * 1.5);
      else dot(ctx, x, y, pr * (1 - ring * 0.12));
    }
    ctx.fill();
  }
}

/** A glitter shell: a cloud of sparks that spread, twinkle and sink. */
function glitter(ctx: Ctx, s: Scene, bx: number, by: number, R: number, k: number, c1: string): void {
  const u = s.u;
  const e = cubicOut(Math.min(1, k * 1.5));
  const sink = R * 0.3 * k * k;
  const pr = Math.max(u * 0.003, R * 0.06);
  const frame = Math.floor(s.t * 20);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? FIREWORK[1] : c1;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const [dx, dy, ph] = SPARK[j]!;
      const tw = Math.sin(frame * 0.9 + ph);
      if ((tw > 0.3) !== (pass === 1)) continue;
      const x = bx + dx * R * e;
      const y = by + dy * R * e + sink * (0.5 + dx * dx);
      if (pass) starPath(ctx, x, y, pr * 1.2);
      else dot(ctx, x, y, pr);
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

/** The show: every shell in the air, rising from behind the cloud floor (or the bottom of the screen), and the finale's lancework flag. */
export function fireworks(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.launchY = Math.min(s.cssH, floor) + s.u * 0.04;
  eachShell(s, tone, floor, drawShell);
  lancework(ctx, s, tone);
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
  const top = Math.max(s.cssH * HUD_BOTTOM, m.y + m.r) + u * MARGIN;
  const bottom = landmarkLine(s) - u * (Math.max(STEEPLE_REACH, stackTop(s, tone, -1)) + MARGIN);
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

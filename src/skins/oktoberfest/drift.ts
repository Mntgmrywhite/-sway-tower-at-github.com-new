import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { BALLOONS, CANVAS_BLUE, CANVAS_WHITE, INK, LANTERN, LANTERN_LIT, PRETZEL, SALT } from "./colors";
import { block, cloud, lattice, LONG_CLOUD, pretzelPath, TALL_CLOUD, type CloudShape } from "./shapes";
import { LOOP, LOOP_START, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: a bunch of balloons
// that got away from the fair, a string of blue-and-white rhombus pennants slung between two
// balloons, a hot-air balloon in the Bavarian lattice in the golden evening, soft clouds, the
// big pretzel balloon at dusk, and by night sky lanterns rising on their little flames. When
// the story loops (tone.ts), its dawn brings pink-lit clouds, and from the afternoon on the
// lane runs the first day's story again. Each thing is anchored at a height in the lane, so it
// comes down past you as the camera climbs, and it only ever moves gently in place: nothing
// crosses the tower's column. Things are spaced so they never overlap. Near enough to be inked
// (they are the fair's own things), but small.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the mist, the crescent moon comes out in the same place at night, and the sun
// rises there again at the loop's dawn. One of them is up at every height, so nothing drifts
// on the left at all: no balloon or cloud ever slides across the sun or the moon.

type Kind = "cloud" | "balloons" | "pennants" | "hotair" | "pretzel" | "lantern";

export interface Drifter {
  kind: Kind;
  /** Height in the lane, world units. */
  at: number;
  /** Center, in u from the screen center (positive: right of it). */
  x: number;
  /** Size, in u. */
  size: number;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of the lane (1 moves with the tower). */
const LANE_P = 0.7;
/**
 * Where the lane runs, u from the screen's center: right of the church's steeple (which stands
 * out of the mist for good) and in from the screen's edge, so nothing wider than 0.05 u either
 * side of its center fits.
 */
const LANE_X = 0.43;

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, at: number, x?: number];

// The first day's story, by hand. A thing at height `at` is in the middle of a tall phone's
// screen around level at / 8, so the hot-air balloon comes as the evening turns golden, the
// pennants and the balloons at dusk, the pretzel balloon as night falls and the lanterns by
// night. Nothing starts below 345: lower, it would hang in the HUD on the title screen (a
// short phone's sky is only 0.87 u tall under the title), or come down across the village on
// the far right before the mist covers it.
const DAY: Spec[] = [
  ["hotair", 345],
  ["pennants", 395],
  ["balloons", 445],
  ["cloud", 495],
  ["pretzel", 540],
  ["cloud", 585],
  ["lantern", 625],
  ["lantern", 665],
];

// The loop's own stretch before the afternoon (tone.ts: the night hold and the dawn), at story
// heights below the first day's afternoon (storyLevel * BLOCK_HEIGHT, so negative): two
// pink-lit clouds as the sun comes up.
const DAWN: Spec[] = [
  ["cloud", -100],
  ["cloud", -30],
];

/** Story heights from here on repeat with the loop; the first day's lane runs below LOOP_AT. */
const LOOP_AT = LOOP_START * BLOCK_HEIGHT;
const PERIOD = LOOP * BLOCK_HEIGHT;
/** The first day's things from this story height on come round again in every turn of the loop. */
const AGAIN_FROM = 112;

function drifter(kind: Kind, at: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + 59 + n + 8000);
  return {
    kind,
    at,
    x: x ?? LANE_X + (h(1) - 0.5) * 0.012,
    size: kind === "cloud" ? 0.024 + h(2) * 0.003 : kind === "lantern" ? 0.022 : kind === "pennants" ? 0.025 : 0.04,
    shape: h(5) < 0.55 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

function lane(story: Spec[], k0: number): Drifter[] {
  return story.map(([kind, at, x], k) => drifter(kind, at, k + k0, x));
}

/** The first day's lane, running up from its lowest item. */
const FIRST: readonly Drifter[] = lane(DAY, 0);
/**
 * One turn of the loop, at story heights (LOOP_AT - PERIOD .. LOOP_AT): the dawn's things, then
 * the first day's from its afternoon on. Turn n (from 1) shows them PERIOD * n higher.
 */
const TURN: readonly Drifter[] = [...lane(DAWN, 40), ...FIRST.filter((d) => d.at >= AGAIN_FROM)];

/** Scratch copies of the loop's things placed in a turn, reused every call (a frame shows a handful). */
const POOL: Drifter[] = Array.from({ length: 48 }, () => ({ ...FIRST[0]! }));

/** Calls `draw` for every item on screen (or close to it), lowest first. */
export function eachVisible(s: Scene, draw: (d: Drifter) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  // The heights in view: an item at height `at` is at screen y = base - at * unit.
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  let pooled = 0;
  for (const d of FIRST) {
    if (d.at < lo) continue;
    if (d.at > hi) break;
    draw(d);
  }
  if (hi < TURN[0]!.at + PERIOD) return;
  for (let n = Math.max(1, Math.floor((lo - LOOP_AT) / PERIOD)); ; n++) {
    const off = PERIOD * n;
    if (TURN[0]!.at + off > hi) break;
    for (const d of TURN) {
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

/** Ink width for the lane's things: a little thinner than up close. */
function laneInk(u: number): number {
  return Math.max(1.2, u * 0.0045);
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  const lw = laneInk(u);
  if (d.kind === "cloud") cloud(ctx, d.shape, x, y + bob, k, tone.cloudShade, tone.cloud, tone.cloudLight);
  else if (d.kind === "balloons") balloons(ctx, s, x, y + bob, k, lw, d.phase);
  else if (d.kind === "pennants") pennants(ctx, s, x, y + bob, k, lw, d.phase);
  else if (d.kind === "hotair") hotAir(ctx, x, y + bob, k, lw);
  else if (d.kind === "pretzel") pretzelBalloon(ctx, x, y + bob, k, lw);
  else lantern(ctx, s, tone, x, y + bob * 1.6, k, lw, d.phase);
}

/** Scratch arguments for `drawOne`, so the per-frame loop allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, tone: null as Tone | null };
function drawOne(d: Drifter): void {
  drawDrifter(NOW.ctx!, NOW.s!, NOW.tone!, d);
}

export function drifters(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.tone = tone;
  eachVisible(s, drawOne);
}

// ---------------------------------------------------------------- balloons

/** A balloon: a round body with a lit spot and a knot, its string trailing below. */
function balloon(ctx: Ctx, x: number, y: number, r: number, color: string, lw: number, stringTo: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.05);
  ctx.quadraticCurveTo(x + r * 0.1, y + r * 1.4, x - r * 0.1, y + r * 1.4 + stringTo);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, x, y, r, r * 1.12);
  ctx.moveTo(x - r * 0.12, y + r * 1.08);
  ctx.lineTo(x + r * 0.12, y + r * 1.08);
  ctx.lineTo(x, y + r * 0.95);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  oval(ctx, x - r * 0.35, y - r * 0.4, r * 0.2, r * 0.3, -0.5);
  ctx.fill();
}

/** Balloons in a bunch: where each sits round the knot (in balloon radii), and its color. */
const BUNCH = [
  [-1.1, -1.0, 0],
  [1.0, -1.2, 1],
  [0, -1.9, 2],
  [-0.9, 0.3, 3],
  [1.1, 0.2, 4],
] as const;

/** A bunch of five balloons on strings gathered to one knot, drifting up and away. */
function balloons(ctx: Ctx, s: Scene, x: number, y: number, k: number, lw: number, phase: number): void {
  const r = k * 0.42;
  const knotY = y + k * 1.6;
  // Strings from the knot to each balloon.
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  for (const [dx, dy] of BUNCH) {
    const bx = x + dx * r + Math.sin(s.t * 0.7 + phase + dx) * r * 0.08;
    const by = y + dy * r;
    ctx.moveTo(x, knotY);
    ctx.lineTo(bx, by + r * 1.05);
  }
  ctx.moveTo(x, knotY);
  ctx.quadraticCurveTo(x + r * 0.3, knotY + r * 0.6, x - r * 0.1, knotY + r * 1.2);
  ctx.stroke();
  for (const [dx, dy, c] of BUNCH) {
    const bx = x + dx * r + Math.sin(s.t * 0.7 + phase + dx) * r * 0.08;
    const by = y + dy * r;
    balloon(ctx, bx, by, r, BALLOONS[c]!, lw, 0);
  }
}

/** A string of rhombus pennants slung between two balloons: the bunting sags between them. */
function pennants(ctx: Ctx, s: Scene, x: number, y: number, k: number, lw: number, phase: number): void {
  const half = k * 1.5;
  const r = k * 0.36;
  const lift = Math.sin(s.t * 0.5 + phase) * k * 0.1;
  const x0 = x - half;
  const x1 = x + half;
  const y0 = y - lift;
  const y1 = y + lift;
  balloon(ctx, x0, y0 - r * 1.5, r, CANVAS_BLUE, lw, 0);
  balloon(ctx, x1, y1 - r * 1.5, r, BALLOONS[1], lw, 0);
  // The string, sagging.
  const sag = k * 0.9;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x, y + sag * 2, x1, y1);
  ctx.stroke();
  // Pennants hanging from it: along the curve, each a little triangle of lattice.
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x + t * t * x1;
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y + sag * 2) + t * t * y1;
    const w = k * 0.36;
    const h = k * 0.5;
    ctx.beginPath();
    ctx.moveTo(px - w / 2, py);
    ctx.lineTo(px + w / 2, py);
    ctx.lineTo(px, py + h);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? CANVAS_WHITE : CANVAS_BLUE;
    ctx.fill();
    if (i % 2) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = CANVAS_BLUE;
      ctx.beginPath();
      lattice(ctx, px - w / 2, py, w, h, w * 0.25, h * 0.25);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(px - w / 2, py);
    ctx.lineTo(px + w / 2, py);
    ctx.lineTo(px, py + h);
    ctx.closePath();
    ink(ctx, lw * 0.7, INK);
  }
}

/** A hot-air balloon in the Bavarian lattice, a wicker basket slung under it. */
function hotAir(ctx: Ctx, x: number, y: number, k: number, lw: number): void {
  const r = k * 1.05;
  // The envelope: a round top tapering to the throat.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.22, y + r * 1.25);
  ctx.bezierCurveTo(x - r * 1.3, y + r * 0.4, x - r * 1.1, y - r * 1.1, x, y - r * 1.1);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 1.1, x + r * 1.3, y + r * 0.4, x + r * 0.22, y + r * 1.25);
  ctx.closePath();
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  lattice(ctx, x - r, y - r * 1.1, r * 2, r * 2.4, r * 0.22, r * 0.3);
  ctx.fill();
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(x + r * 0.5, y - r * 1.2, r, r * 2.6);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.22, y + r * 1.25);
  ctx.bezierCurveTo(x - r * 1.3, y + r * 0.4, x - r * 1.1, y - r * 1.1, x, y - r * 1.1);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 1.1, x + r * 1.3, y + r * 0.4, x + r * 0.22, y + r * 1.25);
  ctx.closePath();
  ink(ctx, lw, INK);
  // Ropes and the basket.
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2, y + r * 1.25);
  ctx.lineTo(x - r * 0.16, y + r * 1.6);
  ctx.moveTo(x + r * 0.2, y + r * 1.25);
  ctx.lineTo(x + r * 0.16, y + r * 1.6);
  ctx.stroke();
  ctx.beginPath();
  block(ctx, x - r * 0.24, y + r * 1.58, r * 0.48, r * 0.3, r * 0.05);
  ctx.fillStyle = PRETZEL.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.strokeStyle = PRETZEL.shade;
  ctx.lineWidth = Math.max(0.8, lw * 0.4);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.22, y + r * 1.68);
  ctx.lineTo(x + r * 0.22, y + r * 1.68);
  ctx.moveTo(x - r * 0.22, y + r * 1.78);
  ctx.lineTo(x + r * 0.22, y + r * 1.78);
  ctx.stroke();
}

/** The big pretzel balloon: a fat golden pretzel with salt on it, two strings trailing. */
function pretzelBalloon(ctx: Ctx, x: number, y: number, k: number, lw: number): void {
  const size = k * 2.0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - size * 0.3, y + size * 0.36);
  ctx.quadraticCurveTo(x - size * 0.2, y + size * 0.7, x - size * 0.25, y + size * 0.95);
  ctx.moveTo(x + size * 0.3, y + size * 0.36);
  ctx.quadraticCurveTo(x + size * 0.2, y + size * 0.7, x + size * 0.25, y + size * 0.95);
  ctx.stroke();
  ctx.beginPath();
  pretzelPath(ctx, x, y, size);
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.2 + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = PRETZEL.body;
  ctx.lineWidth = size * 0.2;
  ctx.stroke();
  ctx.strokeStyle = PRETZEL.light;
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.36, y - size * 0.3);
  ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.46, x - size * 0.14, y - size * 0.38);
  ctx.moveTo(x + size * 0.14, y - size * 0.38);
  ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.46, x + size * 0.36, y - size * 0.3);
  ctx.stroke();
  ctx.fillStyle = SALT;
  ctx.beginPath();
  circle(ctx, x - size * 0.26, y - size * 0.1, size * 0.028);
  circle(ctx, x + size * 0.1, y - size * 0.3, size * 0.025);
  circle(ctx, x + size * 0.3, y + size * 0.02, size * 0.028);
  circle(ctx, x - size * 0.05, y + size * 0.3, size * 0.025);
  ctx.fill();
}

/** A sky lantern: a paper box glowing from its flame, tilting and flickering as it rises on the air. */
function lantern(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, lw: number, phase: number): void {
  const w = k * 1.4;
  const h = k * 2;
  const tilt = Math.sin(s.t * 0.6 + phase) * 0.12;
  const flicker = 0.85 + 0.15 * Math.sin(s.t * 9 + phase * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // The glow round it by night.
  if (tone.bulbs > 0.01) {
    ctx.fillStyle = `rgba(255, 210, 120, ${0.22 * tone.bulbs * flicker})`;
    ctx.beginPath();
    circle(ctx, 0, 0, w * 1.4);
    ctx.fill();
  }
  // The paper: a tapered box, wider at the top, lit from within.
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w * 0.36, h / 2);
  ctx.lineTo(-w * 0.36, h / 2);
  ctx.closePath();
  ctx.fillStyle = tone.bulbs > 0.5 ? LANTERN_LIT : LANTERN.body;
  ctx.fill();
  ctx.fillStyle = LANTERN.body;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(w * 0.1, -h / 2 + lw, w * 0.24, h - lw * 2);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w * 0.36, h / 2);
  ctx.lineTo(-w * 0.36, h / 2);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  // The ring at its mouth and the flame.
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, h / 2);
  ctx.lineTo(w * 0.36, h / 2);
  ctx.stroke();
  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  oval(ctx, 0, h / 2 - k * 0.1, k * 0.14, k * 0.22 * flicker);
  ctx.fill();
  ctx.fillStyle = "#fff4c0";
  ctx.beginPath();
  oval(ctx, 0, h / 2 - k * 0.06, k * 0.07, k * 0.12 * flicker);
  ctx.fill();
  ctx.restore();
}

import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { birdStroke, cloud, LONG_CLOUD, SMALL_CLOUD, TALL_CLOUD, type CloudShape } from "./shapes";
import { LOOP, LOOP_START, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: a pair of swallows
// back for the spring at the start, then soft clouds; up in the shower two of them let fall a
// few drops (only while you are in it: the weather comes from the altitude, see tone.ts); above
// it a little rainbow standing on two clouds, opposite the sun, a tiny pot of gold at its foot;
// a skein of geese heading home in the golden evening, then the four white swans of the old
// story of the Children of Lir, gliding in a line at dusk; and a calm, sparse night of clouds.
// When the story loops (tone.ts), its dawn brings pink-lit clouds and a pair of skylarks
// hovering and singing, and from the morning on the lane runs the first day's story again.
// Each thing is anchored at a height in the lane, so it comes down past you as the camera
// climbs, and it only ever moves gently in place: nothing crosses the tower's column. Things
// are spaced so they never overlap. Far away, so faded and flat, with no outline.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the cloud floor, the crescent moon comes out in the same place at night, and the
// sun rises there again at the loop's dawn. One of them is up at every height, and a lane
// comes down every height of the screen, so nothing drifts on the left at all: no cloud or bird
// ever slides across the sun or the moon (the owner's rule, drift.test.ts).

type Kind = "cloud" | "swallows" | "rainbow" | "geese" | "swans" | "larks";

export interface Drifter {
  kind: Kind;
  /** Height in the lane, world units. */
  at: number;
  /** Center, in u from the screen center (positive: right of it). */
  x: number;
  /** Size, in u. */
  size: number;
  /** A cloud that rains while you are in the shower. */
  rain: boolean;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of the lane (1 moves with the tower). */
const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind | "rain", at: number, x?: number];

// The first day's story, by hand. A thing at height `at` comes in at the top of the screen
// around level (at - 230) / 8, passes the sun's height around level (at - 95) / 8 and leaves
// at the bottom around level (at + 235) / 8 (on a tall phone).
//
// The swallows are the only thing that comes down past the land before the cloud floor covers
// it, so they fly further out than the rest, clear of the far props (see far.ts). Everything
// else starts high enough to reach the horizon only once the land is covered.
const DAY: Spec[] = [
  ["swallows", 150, 0.43],
  ["rain", 345],
  ["rain", 410],
  ["rainbow", 470, 0.38],
  ["cloud", 530],
  ["geese", 590],
  ["swans", 680, 0.38],
  ["cloud", 780],
];

// The loop's own stretch before the morning (tone.ts: the night hold and the dawn), at story
// heights below the first day's morning (storyLevel * BLOCK_HEIGHT, so negative): two pink-lit
// clouds as the sun comes up, and the skylarks once the moon has gone.
const DAWN: Spec[] = [
  ["cloud", -90],
  ["cloud", -10],
  ["larks", 90, 0.41],
];

/** Story heights from here on repeat with the loop; the first day's lane runs below LOOP_AT. */
const LOOP_AT = LOOP_START * BLOCK_HEIGHT;
const PERIOD = LOOP * BLOCK_HEIGHT;
/** The first day's things from this story height on come round again in every turn of the loop. */
const AGAIN_FROM = 96;

function drifter(kind: Spec[0], at: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + 59 + n + 8000);
  const isCloud = kind === "cloud" || kind === "rain";
  return {
    kind: kind === "rain" ? "cloud" : kind,
    at,
    x: x ?? 0.37 + h(1) * 0.02,
    size: isCloud ? 0.044 + h(2) * 0.01 : kind === "rainbow" ? 0.042 : 0.03,
    rain: kind === "rain",
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
 * the first day's from its morning on. Turn n (from 1) shows them PERIOD * n higher.
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

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = d.kind === "rainbow" ? 0 : Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  if (d.kind === "cloud") {
    if (d.rain && tone.rain > 0.02) rain(ctx, s, tone, x, y + bob, k);
    cloud(ctx, d.shape, x, y + bob, k, tone.cloudShade, tone.cloud, tone.cloudLight);
  } else if (d.kind === "swallows") swallows(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "rainbow") rainbow(ctx, tone, x, y + bob, k);
  else if (d.kind === "geese") geese(ctx, s, tone, x, y, 1, d.phase);
  else if (d.kind === "swans") swans(ctx, s, tone, x, y, 1, d.phase);
  else larks(ctx, s, tone, x, y, d.phase);
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

// ---------------------------------------------------------------- rain

/** Drops under a rain cloud: across (in cloud sizes), phase and speed. */
const DROPS = Array.from({ length: 9 }, (_, i) => ({
  dx: -1.05 + (i / 8) * 2.1 + (hash(i + 8400) - 0.5) * 0.18,
  ph: hash(i + 8500),
  sp: 0.8 + hash(i + 8600) * 0.4,
}));

/** A few soft drops falling from under a cloud of size r, fading out as they fall. */
function rain(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, r: number): void {
  const fall = r * 2.3;
  const len = r * 0.4;
  ctx.strokeStyle = tone.drop;
  ctx.lineWidth = Math.max(1, s.u * 0.0032);
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = tone.rain * (pass ? 0.4 : 0.85);
    ctx.beginPath();
    for (const d of DROPS) {
      const k = (s.t * 0.55 * d.sp + d.ph) % 1;
      if (k > 0.6 !== (pass === 1)) continue;
      const dx = x + d.dx * r - k * r * 0.2;
      const dy = y + r * 0.1 + k * fall;
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - len * 0.2, dy + len);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the rainbow

/**
 * A little rainbow standing on two small clouds, k its size unit. It shows only in the rainbow
 * band (tone.rainbow); below and above it the two clouds drift by on their own.
 */
function rainbow(ctx: Ctx, tone: Tone, x: number, y: number, k: number): void {
  const rx = k * 2;
  const ry = k * 2.2;
  const bw = k * 0.17;
  const n = tone.bands.length;
  if (tone.rainbow > 0.01) {
    ctx.globalAlpha = tone.rainbow;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = tone.bands[i]!;
      ctx.beginPath();
      ctx.ellipse(x, y, rx - i * bw, ry - i * bw, 0, Math.PI, Math.PI * 2);
      ctx.ellipse(x, y, rx - (i + 1) * bw, ry - (i + 1) * bw, 0, Math.PI * 2, Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const foot = rx - (n / 2) * bw;
  cloud(ctx, SMALL_CLOUD, x - foot, y + k * 0.22, k * 0.75, tone.cloudShade, tone.cloud, tone.cloudLight);
  cloud(ctx, SMALL_CLOUD, x + foot, y + k * 0.22, k * 0.75, tone.cloudShade, tone.cloud, tone.cloudLight);
  if (tone.rainbow > 0.01) skyPot(ctx, tone, x + foot + k * 0.12, y - k * 0.08, k * 0.3);
}

const POT_IRON = "#3a3747";
const POT_GOLD = "#ffcf40";
const POT_GLINT = "#fff3b0";

/** The rainbow's tiny pot of gold, sitting on its right-hand cloud: flat, far away. */
function skyPot(ctx: Ctx, tone: Tone, x: number, y: number, r: number): void {
  ctx.globalAlpha = tone.rainbow;
  ctx.fillStyle = POT_GOLD;
  ctx.beginPath();
  oval(ctx, x, y - r * 0.55, r * 0.78, r * 0.42);
  ctx.fill();
  ctx.fillStyle = POT_IRON;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, y - r * 0.5);
  ctx.lineTo(x + r * 0.9, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 1.1, y + r * 0.3, x + r * 0.5, y + r * 0.62, x, y + r * 0.62);
  ctx.bezierCurveTo(x - r * 0.5, y + r * 0.62, x - r * 1.1, y + r * 0.3, x - r * 0.9, y - r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = POT_GLINT;
  ctx.beginPath();
  circle(ctx, x - r * 0.25, y - r * 0.72, r * 0.16);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- birds

/** Two swallows swooping round their spot: "m" wings, a short body and a forked tail. */
function swallows(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const g = u * 0.014;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const t = s.t + phase + i * 2.3;
    const m = Math.cos(t * 0.7) >= 0 ? 1 : -1;
    const bx = x + Math.sin(t * 0.7) * u * 0.018 + (i ? u * 0.012 : -u * 0.012);
    const by = y + Math.sin(t * 1.4) * u * 0.008 + (i ? u * 0.026 : 0);
    birdStroke(ctx, bx, by, g, Math.sin(t * 5));
    ctx.moveTo(bx - m * g * 0.15, by + g * 0.05);
    ctx.lineTo(bx + m * g * 0.3, by - g * 0.02);
    ctx.moveTo(bx - m * g * 0.1, by + g * 0.04);
    ctx.lineTo(bx - m * g * 0.62, by + g * 0.2);
    ctx.moveTo(bx - m * g * 0.1, by + g * 0.04);
    ctx.lineTo(bx - m * g * 0.6, by - g * 0.06);
  }
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/**
 * The four swans of the Children of Lir, gliding in a slanting line led toward `dir` (+1
 * right): long necks reaching ahead, wings beating slowly out of step, a dab of orange bill.
 * One color (the light of the hour on white), no outline.
 */
function swans(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, dir: number, phase: number): void {
  const u = s.u;
  const g = u * 0.023;
  const cx = x + Math.sin(s.t * 0.25 + phase) * u * 0.01 - dir * g * 1.7;
  const cy = y + Math.sin(s.t * 0.5 + phase) * u * 0.006 - g * 0.5;
  ctx.fillStyle = tone.swan;
  ctx.strokeStyle = tone.swan;
  ctx.lineWidth = Math.max(1.2, g * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const bx = cx + dir * i * g * 1.15;
    const by = cy + i * g * 0.42;
    const flap = Math.sin(s.t * 1.6 + phase + i * 0.9);
    // Body, a long oval tipped up toward the head; the head at the end of the neck.
    oval(ctx, bx, by, g * 0.5, g * 0.15, dir * -0.08);
    circle(ctx, bx + dir * g * 1.08, by - g * 0.1, g * 0.1);
    // The wing: from the back, a broad curve up (or down) to its tip behind the shoulder.
    const tipY = by - g * (0.15 + 0.55 * flap);
    ctx.moveTo(bx + dir * g * 0.18, by - g * 0.05);
    ctx.quadraticCurveTo(bx + dir * g * 0.05, tipY - g * 0.2 * flap, bx - dir * g * 0.42, tipY);
    ctx.quadraticCurveTo(bx - dir * g * 0.1, by - g * 0.02, bx - dir * g * 0.25, by + g * 0.02);
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const bx = cx + dir * i * g * 1.15;
    const by = cy + i * g * 0.42;
    ctx.moveTo(bx + dir * g * 0.4, by - g * 0.05);
    ctx.quadraticCurveTo(bx + dir * g * 0.8, by - g * 0.04, bx + dir * g * 1.05, by - g * 0.1);
  }
  ctx.stroke();
  ctx.fillStyle = "#f08a3a";
  ctx.globalAlpha = 1 - tone.stars * 0.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const bx = cx + dir * i * g * 1.15 + dir * g * 1.2;
    const by = cy + i * g * 0.42 - g * 0.09;
    oval(ctx, bx, by, g * 0.09, g * 0.045, 0);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * A pair of skylarks at dawn, each hovering on quick-beating wings over its spot and rising
 * and dropping a little as it sings.
 */
function larks(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const g = u * 0.014;
  ctx.fillStyle = tone.bird;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const t = s.t + phase + i * 1.7;
    const bx = x + (i ? g * 2.2 : -g * 2.2) + Math.sin(t * 0.35) * g * 0.6;
    const by = y + (i ? g * 1.6 : 0) + Math.sin(t * 0.8) * g * 1.1;
    const flap = Math.sin(t * 13);
    oval(ctx, bx, by, g * 0.42, g * 0.2, -0.2);
    circle(ctx, bx + g * 0.36, by - g * 0.14, g * 0.15);
    // Two wings held up in a V, beating fast.
    for (let side = -1; side <= 1; side += 2) {
      const tipX = bx + side * g * (0.75 + 0.15 * flap);
      const tipY = by - g * (0.75 + 0.35 * flap);
      ctx.moveTo(bx - g * 0.1, by - g * 0.08);
      ctx.quadraticCurveTo(bx + side * g * 0.3, by - g * 0.6, tipX, tipY);
      ctx.quadraticCurveTo(bx + side * g * 0.35, by - g * 0.2, bx + g * 0.1, by - g * 0.04);
      ctx.closePath();
    }
    // A short tail.
    ctx.moveTo(bx - g * 0.35, by - g * 0.05);
    ctx.lineTo(bx - g * 0.8, by + g * 0.08);
    ctx.lineTo(bx - g * 0.75, by + g * 0.2);
    ctx.lineTo(bx - g * 0.3, by + g * 0.1);
    ctx.closePath();
  }
  ctx.fill();
}

/** A skein of five geese in a V led toward `dir` (+1 right), flapping slowly, drifting in place. */
function geese(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, dir: number, phase: number): void {
  const u = s.u;
  const g = u * 0.014;
  const cx = x + Math.sin(s.t * 0.3 + phase) * u * 0.014 + dir * g * 1.6;
  const cy = y + Math.sin(s.t * 0.6 + phase) * u * 0.008;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    birdStroke(ctx, cx - dir * rank * g * 1.7, cy + side * rank * g * 0.85, g, Math.sin(s.t * 2.6 + i * 1.3 + phase));
  }
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

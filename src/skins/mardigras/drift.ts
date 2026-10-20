import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { GOLD, GREEN, PURPLE, VIOLET } from "./colors";
import { beadLoop, cloud, fleurPath, LONG_CLOUD, maskEyes, maskPath, sparkle, TALL_CLOUD, type CloudShape } from "./shapes";
import { LOOP, LOOP_START, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: the throws of the
// parade carried up on the wind. A flurry of confetti, strings of beads tumbling over slowly,
// doubloons spinning and glinting, a balloon shaped like a feathered mask on its string, a
// paper jester's hat turning over, soft clouds, and by night paper lanterns glowing as they
// float by. When the story loops (tone.ts), its dawn brings a couple of mist-pale clouds and a
// lone balloon, and from the afternoon on the lane runs the first day's story again. Each thing
// is anchored at a height in the lane, so it comes down past you as the camera climbs, and it
// only ever moves gently in place: nothing crosses the tower's column. Things are spaced so
// they never overlap. Far away, so faded and flat, with no outline.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the cloud floor, the crescent moon comes out in the same place at night and the
// fireworks burst below it, and the sun rises there again at the loop's dawn. Nothing drifts
// on the left at all, so no cloud or balloon ever slides across the sun or the moon (the
// owner's rule, drift.test.ts). The lane's first things ride high enough to come down only
// once the cloud floor has covered the city: nothing drifts over the river, the boat or the
// streetcar.

type Kind = "confetti" | "beads" | "doubloon" | "balloon" | "jester" | "cloud" | "lantern";

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
  /** A color pick (0..2) for things that come in the three colors. */
  color: number;
}

/** Parallax depth of the lane (1 moves with the tower). */
const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, at: number, x?: number];

// The first day's story, by hand. A thing at height `at` comes in at the top of the screen
// around level (at - 230) / 8 and leaves at the bottom around level (at + 235) / 8 (on a tall
// phone). Everything starts high enough to come down to the horizon only once the cloud floor
// has covered the city (level 36): the lowest things are still high in the sky by then.
const DAY: Spec[] = [
  ["confetti", 440],
  ["beads", 505],
  ["doubloon", 570],
  ["balloon", 640, 0.38],
  ["jester", 715],
  ["cloud", 790],
  ["lantern", 870],
  ["doubloon", 950],
  ["lantern", 1030],
  ["beads", 1110],
  ["cloud", 1190],
  ["confetti", 1270],
];

// The loop's own stretch before the afternoon (tone.ts: the night hold and the dawn), at story
// heights below the first day's afternoon (storyLevel * BLOCK_HEIGHT, so negative).
const DAWN: Spec[] = [
  ["cloud", -140],
  ["cloud", -50],
  ["balloon", 30, 0.4],
];

/** Story heights from here on repeat with the loop; the first day's lane runs below LOOP_AT. */
const LOOP_AT = LOOP_START * BLOCK_HEIGHT;
const PERIOD = LOOP * BLOCK_HEIGHT;
/** The first day's things from this story height on come round again in every turn of the loop. */
const AGAIN_FROM = 80;

function drifter(kind: Kind, at: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + 59 + n + 8800);
  return {
    kind,
    at,
    x: x ?? 0.37 + h(1) * 0.02,
    size: kind === "cloud" ? 0.044 + h(2) * 0.01 : kind === "balloon" ? 0.04 : kind === "confetti" ? 0.05 : 0.028,
    shape: h(5) < 0.55 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
    color: Math.floor(h(7) * 3),
  };
}

function lane(story: Spec[], k0: number): Drifter[] {
  return story.map(([kind, at, x], k) => drifter(kind, at, k + k0, x));
}

/** The first day's lane, running up from its lowest item. */
const FIRST: readonly Drifter[] = lane(DAY, 0);
/** One turn of the loop, at story heights (LOOP_AT - PERIOD .. LOOP_AT): the dawn's things, then the first day's from its afternoon on. */
const TURN: readonly Drifter[] = [...lane(DAWN, 40), ...FIRST.filter((d) => d.at >= AGAIN_FROM)];

/** Scratch copies of the loop's things placed in a turn, reused every call (a frame shows a handful). */
const POOL: Drifter[] = Array.from({ length: 48 }, () => ({ ...FIRST[0]! }));

/** Calls `draw` for every item on screen (or close to it), lowest first. */
export function eachVisible(s: Scene, draw: (d: Drifter) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
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

const THREE = [PURPLE, GREEN, GOLD] as const;

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  const c = THREE[d.color]!;
  if (d.kind === "cloud") cloud(ctx, d.shape, x, y + bob, k, tone.cloudShade, tone.cloud, tone.cloudLight);
  else if (d.kind === "confetti") confetti(ctx, s, tone, x, y, k, d.phase);
  else if (d.kind === "beads") beads(ctx, s, tone, x, y + bob, k, c.body, d.phase);
  else if (d.kind === "doubloon") doubloon(ctx, s, tone, x, y + bob, k, d.phase);
  else if (d.kind === "balloon") balloon(ctx, s, tone, x, y + bob, k, d.phase);
  else if (d.kind === "jester") jesterHat(ctx, s, tone, x, y + bob, k, d.phase);
  else lantern(ctx, s, tone, x, y + bob, k, c, d.phase);
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

/** A lane color faded toward the haze of the hour. */
function faded(tone: Tone, c: string): string {
  return mix(c, tone.cloudShade, tone.fade * 0.6);
}

/** Gold faded toward the clouds' lit color instead, so a doubloon still shines by night (toward the shade it goes brown). */
function gilt(tone: Tone, c: string): string {
  return mix(c, tone.cloudLight, tone.fade * 0.4);
}

// ---------------------------------------------------------------- the throws

/** Confetti bits: offsets (sizes), drift phase and color. */
const BITS = Array.from({ length: 12 }, (_, i) => ({
  dx: (hash(i + 8900) - 0.5) * 2,
  dy: (hash(i + 8910) - 0.5) * 2,
  ph: hash(i + 8920) * 6,
  c: i % 3,
}));

/** A flurry of confetti swirling slowly in place, each bit on its own little loop. */
function confetti(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = faded(tone, THREE[c]!.body);
    ctx.beginPath();
    for (const b of BITS) {
      if (b.c !== c) continue;
      const t = s.t * 0.5 + b.ph + phase;
      const bx = x + b.dx * k + Math.sin(t) * k * 0.2;
      const by = y + b.dy * k * 0.8 + Math.cos(t * 1.3) * k * 0.15;
      const w = s.u * 0.013;
      const h = s.u * 0.008 * Math.abs(Math.sin(t * 2));
      ctx.rect(bx - w / 2, by - h / 2, w, Math.max(1, h));
    }
    ctx.fill();
  }
}

/** A string of beads tumbling slowly in the air: a loop turning over, its beads glinting. */
function beads(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, color: string, phase: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(s.t * 0.5 + phase) * 0.6);
  ctx.fillStyle = faded(tone, color);
  ctx.beginPath();
  beadLoop(ctx, 0, -k * 0.8, k * 0.7, k * 1.6, k * 0.17, 9);
  ctx.fill();
  ctx.fillStyle = "#fff6c4";
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(s.t * 3 + phase);
  ctx.beginPath();
  circle(ctx, -k * 0.55, -k * 0.5, k * 0.06);
  circle(ctx, k * 0.1, k * 0.72, k * 0.06);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** A gold doubloon spinning on its axis: a coin narrowing to an edge and back, a fleur-de-lis stamped on its face, a glint as it catches the light. */
function doubloon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const spin = Math.cos(s.t * 1.6 + phase);
  const rx = Math.max(k * 0.06, Math.abs(spin) * k);
  ctx.fillStyle = gilt(tone, spin > 0 ? GOLD.body : GOLD.shade);
  ctx.beginPath();
  oval(ctx, x, y, rx, k);
  ctx.fill();
  if (Math.abs(spin) > 0.3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.abs(spin), 1);
    ctx.fillStyle = gilt(tone, GOLD.shade);
    ctx.beginPath();
    fleurPath(ctx, 0, 0, k * 1.1);
    ctx.fill();
    ctx.restore();
  }
  if (Math.abs(spin) < 0.35) {
    ctx.fillStyle = "#fff6c4";
    ctx.beginPath();
    sparkle(ctx, x, y - k * 0.4, k * 0.5);
    ctx.fill();
  }
}

/** A balloon shaped like a feathered mask, bobbing on its string: a round purple balloon with a gold mask face and two pink feathers. */
function balloon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const tilt = Math.sin(s.t * 0.7 + phase) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // The string, curling below.
  ctx.strokeStyle = faded(tone, "#4a3a6a");
  ctx.lineWidth = Math.max(1, s.u * 0.002);
  ctx.beginPath();
  ctx.moveTo(0, k * 1.0);
  ctx.quadraticCurveTo(k * 0.3, k * 1.8, -k * 0.1, k * 2.6);
  ctx.stroke();
  // Feathers rising from the top.
  ctx.fillStyle = faded(tone, "#ff5fa8");
  ctx.beginPath();
  ctx.moveTo(k * 0.2, -k * 0.7);
  ctx.quadraticCurveTo(k * 0.9, -k * 1.6, k * 0.5, -k * 2.1);
  ctx.quadraticCurveTo(k * 0.7, -k * 1.3, k * 0.4, -k * 0.75);
  ctx.closePath();
  ctx.moveTo(-k * 0.1, -k * 0.75);
  ctx.quadraticCurveTo(-k * 0.3, -k * 1.7, -k * 0.7, -k * 2.0);
  ctx.quadraticCurveTo(-k * 0.2, -k * 1.4, k * 0.1, -k * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = faded(tone, VIOLET.body);
  ctx.beginPath();
  oval(ctx, 0, 0, k * 0.9, k);
  ctx.moveTo(k * 0.08, k * 1.0);
  ctx.lineTo(-k * 0.08, k * 1.0);
  ctx.lineTo(0, k * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = faded(tone, VIOLET.light);
  ctx.beginPath();
  oval(ctx, -k * 0.35, -k * 0.4, k * 0.2, k * 0.3, -0.5);
  ctx.fill();
  ctx.fillStyle = faded(tone, GOLD.body);
  ctx.beginPath();
  maskPath(ctx, 0, k * 0.05, k * 1.5);
  ctx.fill();
  ctx.fillStyle = faded(tone, "#2a1a4a");
  ctx.beginPath();
  maskEyes(ctx, 0, k * 0.05, k * 1.5);
  ctx.fill();
  ctx.restore();
}

/** A paper jester's hat turning slowly over as it drifts: a cap with three fat points, purple, green and gold, a bell on each. */
function jesterHat(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(s.t * 0.4 + phase);
  const tips = [
    [-k * 1.5, -k * 0.9],
    [0, -k * 1.6],
    [k * 1.5, -k * 0.9],
  ] as const;
  // Each point: a fat petal from the cap's band up to its tip.
  const roots = [
    [-k * 0.8, -k * 0.2, -k * 0.1],
    [-k * 0.35, 0, k * 0.35],
    [k * 0.1, -k * 0.2, k * 0.8],
  ] as const;
  for (let i = 0; i < 3; i++) {
    const [tx, ty] = tips[i]!;
    const [a, , b] = roots[i]!;
    ctx.fillStyle = faded(tone, THREE[i]!.body);
    ctx.beginPath();
    ctx.moveTo(a, k * 0.3);
    ctx.quadraticCurveTo(a - k * 0.3, -k * 0.5, tx, ty);
    ctx.quadraticCurveTo(b + k * 0.3, -k * 0.4, b, k * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // The band along the brow, and the bells.
  ctx.fillStyle = faded(tone, "#fff0a0");
  ctx.beginPath();
  ctx.rect(-k * 0.95, k * 0.2, k * 1.9, k * 0.3);
  for (const [tx, ty] of tips) circle(ctx, tx, ty, k * 0.2);
  ctx.fill();
  ctx.restore();
}

/**
 * A paper lantern floating by: a round paper shade in its color with ribs down it, dark caps
 * top and bottom and a tassel. From dusk on it is lit from within: the paper turns pale and
 * warm and a flame flickers at its heart (no halo: a flat glow over the night sky reads as a
 * dark smudge).
 */
function lantern(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, c: (typeof THREE)[number], phase: number): void {
  const lit = tone.lit;
  const flick = 0.5 + 0.5 * Math.sin(s.t * 9 + phase) * Math.sin(s.t * 4.1 + phase);
  const dark = faded(tone, "#3a2a5a");
  // The tassel and the caps.
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, k * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y + k * 1.1);
  ctx.lineTo(x, y + k * 1.55);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.fillRect(x - k * 0.34, y - k * 1.2, k * 0.68, k * 0.18);
  ctx.fillRect(x - k * 0.34, y + k * 1.02, k * 0.68, k * 0.18);
  // The paper: its own color by day, pale and warm once lit.
  ctx.fillStyle = lit > 0.02 ? mix(faded(tone, c.body), mix(c.light, "#ffe7a8", 0.55), lit) : faded(tone, c.body);
  ctx.beginPath();
  oval(ctx, x, y, k * 0.9, k * 1.08);
  ctx.fill();
  // The flame's light at its heart, flickering.
  if (lit > 0.02) {
    ctx.fillStyle = "#fff6cc";
    ctx.globalAlpha = lit * (0.55 + 0.35 * flick);
    ctx.beginPath();
    oval(ctx, x, y + k * 0.1, k * 0.5, k * 0.68);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Ribs down the paper.
  ctx.strokeStyle = faded(tone, c.shade);
  ctx.lineWidth = Math.max(1, k * 0.07);
  ctx.beginPath();
  oval(ctx, x, y, k * 0.45, k * 1.06);
  ctx.moveTo(x, y - k * 1.06);
  ctx.lineTo(x, y + k * 1.06);
  ctx.stroke();
}

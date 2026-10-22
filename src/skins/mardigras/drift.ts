import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { DOVE_SHADE, FEATHER, GLINT, GOLD, GREEN, HAT_BAND, LANTERN_CAP, LANTERN_FLAME, LANTERN_WARM, PELICAN, PURPLE, STRING, VIOLET, WHITE } from "./colors";
import { beadLoop, cloud, fleurPath, LONG_CLOUD, maskEyes, maskPath, sparkle, TALL_CLOUD, type CloudShape } from "./shapes";
import { LOOP, LOOP_START, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: the throws of the
// parade carried up on the wind, and the birds of the river. A flurry of confetti, strings of
// beads tumbling over slowly, doubloons spinning and glinting (one alone, or a shower of them),
// a balloon shaped like a feathered mask on its string, a paper jester's hat turning over, paper
// streamers curling, a swag of beads and paper lanterns strung between two bunches of balloons,
// a line of pelicans gliding home over the river, three white doves at dawn, soft clouds, and
// paper lanterns that glow from dusk on. Each thing is anchored at a height in the lane, so it
// comes down past you as the camera climbs, and it only ever moves gently in place: nothing
// crosses the tower's column. Things are spaced so they never overlap. Far away, so faded and
// flat, with no outline.
//
// The lane's story runs with the light's loop (tone.ts): its things come in from the deep night
// on, through the dawn and the afternoon, and are gone by the night parade, when the right lane
// belongs to the King Gator standing out of the clouds (gator.ts) and the fireworks over him
// (sky.ts): the last thing has come down past the fireworks' spots before the first shell climbs,
// and below the cloud floor's top before the Gator rises (on a phone, a short phone and a
// tablet; lane.ts holds both back on a taller screen while anything is still passing). In the
// first pass the lane's first things come in once Sky Islands' floating island has drifted by
// (island.ts, cameo.test.ts), late in the night parade, so nothing ever drifts over the city.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the cloud floor, the masked moon comes out in the same place at night and the
// fireworks burst below it, and the sun rises there again at the loop's dawn. Nothing drifts
// on the left at all, so no cloud or balloon ever slides across the sun or the moon (the
// owner's rule, drift.test.ts).

type Kind = "confetti" | "beads" | "doubloon" | "balloon" | "jester" | "cloud" | "lantern" | "coins" | "streamers" | "swag" | "pelicans" | "doves";

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

/** One authored entry: what, its story level (tone.ts: storyLevel; its height in the lane is 8 times it), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, story: number, x?: number];

/** Two files down the lane, near the tower and out by the screen's side, and its middle, for the widest things (u from the screen's center). */
const NEAR = 0.322;
const OUT = 0.428;
const MID = 0.375;

// One turn of the story, by hand, in story levels (the height a thing is anchored at is
// BLOCK_HEIGHT times its story level). A thing at story level D comes in at the top of a tall
// phone around D - 29 and leaves at the bottom around D + 29 (D - 22 and D + 22 on a tablet).
// So the first, at -19, comes in during the night before (after the night parade's last shells)
// and the last, at 37, has passed the right lane's fireworks spots by story level 52 and gone
// under the cloud floor's top by 62, before the right show starts (53) and the Gator rises (64).
// The things alternate between the lane's two files, so a short way apart they never meet.
const TURN_SPEC: Spec[] = [
  ["cloud", -19, MID],
  ["doves", -15, NEAR],
  ["beads", -11, OUT],
  ["balloon", -7, NEAR],
  ["cloud", -3, MID],
  ["coins", 1, OUT],
  ["jester", 5, NEAR],
  ["pelicans", 9, MID],
  ["swag", 14, MID],
  ["streamers", 19, NEAR],
  ["doubloon", 22, OUT],
  ["confetti", 26, MID],
  ["lantern", 30, NEAR],
  ["beads", 33, OUT],
  ["lantern", 37, NEAR],
];

/** Story heights from here on repeat with the loop. */
const LOOP_AT = LOOP_START * BLOCK_HEIGHT;
const PERIOD = LOOP * BLOCK_HEIGHT;

/** Each thing's size (u), by kind. */
const SIZE: Record<Kind, number> = {
  cloud: 0.046,
  balloon: 0.04,
  confetti: 0.05,
  beads: 0.028,
  doubloon: 0.028,
  jester: 0.028,
  lantern: 0.028,
  coins: 0.02,
  streamers: 0.03,
  swag: 0.072,
  pelicans: 0.024,
  doves: 0.02,
};

function drifter([kind, story, x]: Spec, k: number): Drifter {
  const h = (n: number) => hash(k * 17 + 59 + n + 8800);
  return {
    kind,
    at: story * BLOCK_HEIGHT,
    x: x ?? MID,
    size: kind === "cloud" ? SIZE.cloud + h(2) * 0.008 : SIZE[kind],
    shape: h(5) < 0.55 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
    color: Math.floor(h(7) * 3),
  };
}

/** One turn of the loop, at story heights (LOOP_AT - PERIOD .. LOOP_AT). */
const TURN: readonly Drifter[] = TURN_SPEC.map(drifter);

/** Scratch copies of the loop's things placed in a turn, reused every call (a frame shows a handful). */
const POOL: Drifter[] = Array.from({ length: 48 }, () => ({ ...TURN[0]! }));

/** Calls `draw` for every item on screen (or close to it), lowest first. The first turn's things come in from the first pass's night (n = 1). */
export function eachVisible(s: Scene, draw: (d: Drifter) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  let pooled = 0;
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

/** Screen y of a drifter's anchor in this scene (before its bob). */
export function drifterY(s: Scene, d: Drifter): number {
  return layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
}

/** How far each kind reaches from its anchor, in its sizes: [either side, up, down]; its sway and bob ride on top (BOX_SLACK). */
const REACH: Record<Kind, readonly [number, number, number]> = {
  cloud: [1.95, 1.75, 0.45],
  balloon: [2.1, 1.75, 2.8],
  confetti: [1.35, 1.05, 1.05],
  beads: [1.8, 1.8, 1.8],
  doubloon: [1.1, 1.1, 1.1],
  jester: [2.0, 2.0, 2.0],
  lantern: [1.0, 1.25, 1.6],
  coins: [2.2, 1.6, 1.6],
  streamers: [1.7, 1.5, 1.5],
  swag: [1.45, 0.95, 0.9],
  pelicans: [3.1, 1.25, 0.85],
  doves: [2.6, 1.3, 1.05],
};
/** The sway and bob every drifter rides on (u). */
const BOX_SLACK = 0.014;

/** Everything a drifter can cover in this scene, px (scratch): for keeping the lane's big things clear of it (lane.ts). */
export function drifterBox(s: Scene, d: Drifter): { l: number; t: number; r: number; b: number } {
  const [w, up, down] = REACH[d.kind];
  const k = d.size * s.u;
  const x = s.cssW / 2 + d.x * s.u;
  const y = drifterY(s, d);
  const e = s.u * BOX_SLACK;
  DBOX.l = x - w * k - e;
  DBOX.r = x + w * k + e;
  DBOX.t = y - up * k - e;
  DBOX.b = y + down * k + e;
  return DBOX;
}
const DBOX = { l: 0, t: 0, r: 0, b: 0 };

const THREE = [PURPLE, GREEN, GOLD] as const;

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = drifterY(s, d);
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
  else if (d.kind === "lantern") lantern(ctx, s, tone, x, y + bob, k, c, d.phase);
  else if (d.kind === "coins") coins(ctx, s, tone, x, y + bob, k, d.phase);
  else if (d.kind === "streamers") streamers(ctx, s, tone, x, y + bob, k, d.phase);
  else if (d.kind === "swag") swag(ctx, s, tone, x, y + bob, k, d.phase);
  else if (d.kind === "pelicans") pelicans(ctx, s, tone, x, y + bob, k, d.phase);
  else doves(ctx, s, tone, x, y + bob, k, d.phase);
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

/** A lane color faded with distance toward the hour's lane shade (midnight blue by night). */
function faded(tone: Tone, c: string): string {
  return mix(c, tone.laneShade, tone.fade * 0.6);
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
  ctx.fillStyle = GLINT;
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
    ctx.fillStyle = GLINT;
    ctx.beginPath();
    sparkle(ctx, x, y - k * 0.4, k * 0.5);
    ctx.fill();
  }
}

/**
 * A balloon shaped like a feathered mask, bobbing on its string: a round purple balloon wearing a
 * gold masquerade mask, its eye holes showing the balloon's lit purple through them (never dark
 * eyes, which read as a scowl at this size), and a plume of three feathers (pink, green and gold)
 * fanning up from the mask's right corner, off to one side so they never read as horns.
 */
function balloon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const tilt = Math.sin(s.t * 0.7 + phase) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // The string, curling below.
  ctx.strokeStyle = faded(tone, STRING);
  ctx.lineWidth = Math.max(1, s.u * 0.002);
  ctx.beginPath();
  ctx.moveTo(0, k * 1.0);
  ctx.quadraticCurveTo(k * 0.3, k * 1.8, -k * 0.1, k * 2.6);
  ctx.stroke();
  // The plume: three feathers fanning up and out from the mask's right corner, trembling.
  const shake = Math.sin(s.t * 3.1 + phase) * 0.06;
  const plume = [
    [-0.15, FEATHER.body],
    [0.25, GREEN.light],
    [0.65, GOLD.body],
  ] as const;
  for (const [a0, color] of plume) {
    const a = a0 + shake;
    const bx = k * 0.62;
    const by = -k * 0.22;
    const tx = bx + Math.sin(a) * k * 1.25;
    const ty = by - Math.cos(a) * k * 1.25;
    const nx = Math.cos(a) * k * 0.2;
    const ny = Math.sin(a) * k * 0.2;
    ctx.fillStyle = faded(tone, color);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + tx) / 2 + nx, (by + ty) / 2 + ny, tx, ty);
    ctx.quadraticCurveTo((bx + tx) / 2 - nx, (by + ty) / 2 - ny, bx, by);
    ctx.closePath();
    ctx.fill();
  }
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
  oval(ctx, -k * 0.35, -k * 0.5, k * 0.2, k * 0.26, -0.5);
  ctx.fill();
  // The mask, its eye holes open onto the balloon's lit purple.
  ctx.fillStyle = faded(tone, GOLD.body);
  ctx.beginPath();
  maskPath(ctx, 0, k * 0.08, k * 1.5);
  maskEyes(ctx, 0, k * 0.08, k * 1.5);
  ctx.fill("evenodd");
  ctx.fillStyle = faded(tone, GOLD.light);
  ctx.beginPath();
  circle(ctx, 0, -k * 0.05, k * 0.09);
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
  ctx.fillStyle = faded(tone, HAT_BAND);
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
  const dark = faded(tone, LANTERN_CAP);
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
  ctx.fillStyle = lit > 0.02 ? mix(faded(tone, c.body), mix(c.light, LANTERN_WARM, 0.55), lit) : faded(tone, c.body);
  ctx.beginPath();
  oval(ctx, x, y, k * 0.9, k * 1.08);
  ctx.fill();
  // The flame's light at its heart, flickering.
  if (lit > 0.02) {
    ctx.fillStyle = LANTERN_FLAME;
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

/** The shower's coins: offsets (sizes) about its middle, and each one's own spin. */
const COINS = [
  [-1.45, -0.55, 0.0],
  [-0.35, -1.0, 1.9],
  [0.85, -0.45, 3.7],
  [-0.95, 0.6, 5.3],
  [0.35, 0.45, 2.6],
  [1.55, 0.85, 4.4],
] as const;

/** A shower of doubloons tumbling together, each spinning on its own and glinting as it turns edge-on. */
function coins(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const r = k * 0.55;
  for (const [dx, dy, ph] of COINS) {
    const spin = Math.cos(s.t * 1.9 + phase + ph);
    const cx = x + dx * k + Math.sin(s.t * 0.7 + ph) * k * 0.12;
    const cy = y + dy * k + Math.cos(s.t * 0.6 + ph) * k * 0.1;
    ctx.fillStyle = gilt(tone, spin > 0 ? GOLD.body : GOLD.shade);
    ctx.beginPath();
    oval(ctx, cx, cy, Math.max(r * 0.08, Math.abs(spin) * r), r);
    ctx.fill();
    if (Math.abs(spin) < 0.3) {
      ctx.fillStyle = GLINT;
      ctx.beginPath();
      sparkle(ctx, cx, cy - r * 0.3, r * 0.8);
      ctx.fill();
    }
  }
}

/** Paper streamers curling as they drift: three ribbons in the season's colors, each an S that slowly turns over. */
function streamers(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, k * 0.2);
  for (let i = 0; i < 3; i++) {
    const t = s.t * 0.8 + phase + i * 2.1;
    const ox = (i - 1) * k * 0.55;
    const c = Math.sin(t) * k * 0.75;
    const tilt = Math.sin(t * 0.6) * k * 0.3;
    ctx.strokeStyle = faded(tone, THREE[i]!.light);
    ctx.beginPath();
    ctx.moveTo(x + ox - tilt, y - k * 1.25);
    ctx.bezierCurveTo(x + ox + c, y - k * 0.45, x + ox - c, y + k * 0.45, x + ox + tilt, y + k * 1.25);
    ctx.stroke();
  }
}

/** The swag's three paper lanterns: where they hang along the garland (0..1), and their colors. */
const SWAG_LANTERNS = [
  [0.27, 0],
  [0.5, 2],
  [0.73, 1],
] as const;

/**
 * A swag of Carnival trimming floating by: two bunches of balloons in purple, green and gold, a
 * garland of gold beads strung between them sagging in the middle, and three paper lanterns
 * hung from it that glow from dusk on. `k` is half its span. It rocks gently on the wind.
 */
function swag(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const rock = Math.sin(s.t * 0.5 + phase) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rock);
  const sag = k * 0.36;
  const br = k * 0.2;
  // The balloons' strings, down to the garland's ends.
  ctx.strokeStyle = faded(tone, STRING);
  ctx.lineWidth = Math.max(1, s.u * 0.0018);
  ctx.beginPath();
  for (const m of [-1, 1]) {
    ctx.moveTo(m * k, -br * 1.1);
    ctx.lineTo(m * k * 0.98, 0);
  }
  ctx.stroke();
  // The garland: gold beads along the sag, a second strand of purple a little lower.
  const garland = (dy: number) => {
    ctx.moveTo(-k, 0);
    ctx.quadraticCurveTo(0, (sag + dy) * 2, k, 0);
  };
  ctx.lineWidth = Math.max(1.2, k * 0.1);
  ctx.lineCap = "round";
  SWAG_DOT[1] = k * 0.13;
  ctx.setLineDash(SWAG_DOT);
  ctx.strokeStyle = faded(tone, GOLD.body);
  ctx.beginPath();
  garland(0);
  ctx.stroke();
  ctx.strokeStyle = faded(tone, PURPLE.light);
  ctx.beginPath();
  garland(k * 0.16);
  ctx.stroke();
  ctx.setLineDash(SWAG_NO_DASH);
  // The lanterns hanging from the gold strand: lit from within once the windows come on.
  const lit = tone.lit;
  for (const [f, ci] of SWAG_LANTERNS) {
    const lx = -k + f * 2 * k;
    const ly = 2 * f * (1 - f) * sag * 2 + k * 0.17;
    const c = THREE[ci]!;
    const lk = k * 0.17;
    ctx.fillStyle = faded(tone, LANTERN_CAP);
    ctx.fillRect(lx - lk * 0.35, ly - lk * 1.25, lk * 0.7, lk * 0.25);
    ctx.fillStyle = lit > 0.02 ? mix(faded(tone, c.body), mix(c.light, LANTERN_WARM, 0.55), lit) : faded(tone, c.body);
    ctx.beginPath();
    oval(ctx, lx, ly, lk * 0.85, lk);
    ctx.fill();
    if (lit > 0.02) {
      ctx.fillStyle = LANTERN_FLAME;
      ctx.globalAlpha = lit * (0.6 + 0.3 * Math.sin(s.t * 7 + f * 9));
      ctx.beginPath();
      oval(ctx, lx, ly + lk * 0.1, lk * 0.45, lk * 0.6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // The bunches: three balloons each, bobbing a little apart, with a shine.
  for (const m of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const bx = m * k + (i - 1) * br * 1.15;
      const by = -br * 1.9 - (i === 1 ? br * 0.9 : 0) + Math.sin(s.t * 1.3 + i + m) * br * 0.12;
      ctx.fillStyle = faded(tone, THREE[(i + (m > 0 ? 1 : 0)) % 3]!.body);
      ctx.beginPath();
      oval(ctx, bx, by, br * 0.85, br);
      ctx.fill();
      ctx.fillStyle = faded(tone, WHITE);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      oval(ctx, bx - br * 0.3, by - br * 0.4, br * 0.2, br * 0.28, -0.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
const SWAG_DOT = [0.001, 1];
const SWAG_NO_DASH: number[] = [];

/** A line of brown pelicans gliding home over the river (our own), each flapping slowly now and then: [x, y] (sizes) and a phase. */
const PELICANS = [
  [-1.95, 0.55, 0],
  [0, 0, 1.3],
  [1.95, -0.55, 2.7],
] as const;

/** Pelicans gliding in a line, wings out, flapping slowly now and then; their long bills toward the tower. */
function pelicans(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  for (const [dx, dy, ph] of PELICANS) {
    const px = x + dx * k;
    const py = y + dy * k + Math.sin(s.t * 0.9 + ph + phase) * k * 0.12;
    // A slow beat every few seconds, gliding between.
    const beat = Math.max(0, Math.sin(s.t * 0.45 + ph + phase)) ** 4;
    const flap = Math.sin(s.t * 5 + ph) * beat;
    // The wings: a long shallow M over the body.
    ctx.fillStyle = faded(tone, PELICAN.wing);
    ctx.beginPath();
    for (const m of [-1, 1]) {
      const tipY = py - k * 0.3 - flap * k * 0.6;
      ctx.moveTo(px - k * 0.15 * m, py - k * 0.05);
      ctx.quadraticCurveTo(px + m * k * 0.55, py - k * 0.55 - flap * k * 0.3, px + m * k * 1.15, tipY);
      ctx.quadraticCurveTo(px + m * k * 0.6, py - k * 0.12, px + k * 0.15 * m, py + k * 0.08);
      ctx.closePath();
    }
    ctx.fill();
    // The body, the white head and neck tucked back, and the long bill with its pouch.
    ctx.fillStyle = faded(tone, PELICAN.body);
    ctx.beginPath();
    oval(ctx, px, py + k * 0.05, k * 0.55, k * 0.22, 0.08);
    ctx.fill();
    ctx.fillStyle = faded(tone, PELICAN.head);
    ctx.beginPath();
    circle(ctx, px - k * 0.55, py - k * 0.06, k * 0.17);
    ctx.fill();
    ctx.fillStyle = faded(tone, PELICAN.bill);
    ctx.beginPath();
    ctx.moveTo(px - k * 0.66, py - k * 0.1);
    ctx.lineTo(px - k * 1.25, py + k * 0.04);
    ctx.quadraticCurveTo(px - k * 0.9, py + k * 0.2, px - k * 0.62, py + k * 0.04);
    ctx.closePath();
    ctx.fill();
  }
}

/** Three white doves fluttering together in a little V: [x, y] (sizes) and a phase. */
const DOVES = [
  [-1.6, 0.45, 0.4],
  [0, -0.35, 1.7],
  [1.6, 0.4, 3.1],
] as const;

/** Doves of peace at dawn: three white doves, wings beating quickly, gliding a moment now and then. */
function doves(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const white = faded(tone, WHITE);
  const shade = faded(tone, DOVE_SHADE);
  for (const [dx, dy, ph] of DOVES) {
    const px = x + dx * k + Math.sin(s.t * 0.8 + ph) * k * 0.15;
    const py = y + dy * k + Math.sin(s.t * 1.1 + ph + phase) * k * 0.15;
    const flap = Math.sin(s.t * 9 + ph * 3);
    // The far wing behind, a shade darker, then the body, head and tail, then the near wing.
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(px + k * 0.05, py - k * 0.05);
    ctx.quadraticCurveTo(px + k * 0.5, py - k * 0.45 * flap - k * 0.2, px + k * 0.95, py - k * 0.75 * flap);
    ctx.quadraticCurveTo(px + k * 0.45, py + k * 0.05, px - k * 0.1, py + k * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = white;
    ctx.beginPath();
    oval(ctx, px, py, k * 0.5, k * 0.24, -0.1);
    circle(ctx, px - k * 0.48, py - k * 0.14, k * 0.17);
    ctx.moveTo(px + k * 0.35, py - k * 0.02);
    ctx.lineTo(px + k * 0.85, py - k * 0.2);
    ctx.lineTo(px + k * 0.85, py + k * 0.18);
    ctx.closePath();
    ctx.moveTo(px - k * 0.05, py - k * 0.08);
    ctx.quadraticCurveTo(px + k * 0.3, py - k * 0.5 * flap - k * 0.3, px + k * 0.75, py - k * 0.95 * flap - k * 0.1);
    ctx.quadraticCurveTo(px + k * 0.35, py + k * 0.02, px - k * 0.2, py + k * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = faded(tone, PELICAN.bill);
    ctx.beginPath();
    circle(ctx, px - k * 0.68, py - k * 0.12, k * 0.06);
    ctx.fill();
  }
}

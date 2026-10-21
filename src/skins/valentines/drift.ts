import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { cloud, heartPath, LONG_CLOUD, petalPath, TALL_CLOUD, type CloudShape } from "./shapes";
import { DAY_FROM, LOOP, LOOP_DAWN, LOOP_START, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: a flurry of rose
// petals as the cloud sea gathers below you, a bunch of heart balloons let go, rising on their
// strings, little stylized clouds (shell lines and a curl, shapes.ts), a paper plane folded
// from a love letter gliding in lazy loops, a pair of doves wheeling together, more petals and
// balloons into the night. When the story loops (tone.ts), its dawn brings pink-lit clouds and
// the doves again, and from the afternoon on the lane runs the first day's story once more.
// Each thing is anchored at a height in the lane, so it comes down past you as the camera
// climbs, and only ever moves gently in place: nothing crosses the tower's column. Things are
// spaced so they never overlap. Far away, so faded and flat, with no outline (but the clouds'
// fine line). They pass in front of the frame down the sky's side (border.ts), which belongs to
// the sky.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and sets
// into the cloud sea, the crescent moon comes out in the same place at night, and the sun rises
// there again at the loop's dawn. One of them is up at every height, so nothing drifts on the
// left at all: nothing ever passes over the sun or the moon (the owner's rule, drift.test.ts).
// And nothing here ever slides across a prop: the lane is painted before the far layer and the
// land (valentines.ts), so what comes down it sinks behind the fair's wheel, the boulevard and
// the cloud bank into the cloud sea (drift.test.ts).

type Kind = "cloud" | "petals" | "balloons" | "plane" | "doves";

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

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, at: number, x?: number];

// The first day's story, by hand. A thing at height `at` comes in at the top of the screen
// around level (at - 230) / 8, passes the sun's height around level (at - 95) / 8 and leaves
// at the bottom around level (at + 235) / 8 (on a tall phone). The opening's sky holds the sun
// and, in the right lane over the fair, a pair of doves wheeling (ambient, there from the
// start; they drop behind the wheel in the first few levels); everything else starts above the
// screen, high enough to reach the boulevard and the fair only once the cloud sea has covered
// the land.
const DAY: Spec[] = [
  ["doves", 170, 0.4],
  ["petals", 380],
  ["balloons", 450, 0.385],
  ["cloud", 520],
  ["plane", 590, 0.39],
  ["doves", 655, 0.4],
  ["petals", 720],
  ["cloud", 785],
];

// The loop's own stretch before the afternoon (tone.ts: the night hold and the dawn), at story
// heights below the first day's afternoon (story level * BLOCK_HEIGHT, so negative): two
// pink-lit clouds as the sun comes up, and the doves once the moon has gone.
const DAWN: Spec[] = [
  ["cloud", -110],
  ["doves", -40, 0.4],
  ["cloud", 40],
];

/** One turn of the loop, in world units. */
const PERIOD = LOOP * BLOCK_HEIGHT;
/** A story height (a first-day height, or the dawn's) shows in the loop's first turn this much higher. */
const SHIFT = (LOOP_START - LOOP_DAWN) * BLOCK_HEIGHT;
/** The first day's things from this story height on come round again in every turn of the loop. */
const AGAIN_FROM = DAY_FROM * BLOCK_HEIGHT;

function drifter(kind: Kind, at: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + 59 + n + 8000);
  return {
    kind,
    at,
    x: x ?? 0.375 + h(1) * 0.015,
    size: kind === "cloud" ? 0.042 + h(2) * 0.01 : kind === "petals" ? 0.05 : 0.03,
    shape: h(5) < 0.55 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

function lane(story: Spec[], k0: number, shift: number): Drifter[] {
  return story.map(([kind, at, x], k) => drifter(kind, at + shift, k + k0, x));
}

/** The first day's lane, running up from its lowest item. */
const FIRST: readonly Drifter[] = lane(DAY, 0, 0);
/**
 * One turn of the loop, at the heights of its first turn (from LOOP_START * BLOCK_HEIGHT on,
 * one PERIOD): the dawn's things, then the first day's from its afternoon on. Turn n (from 0)
 * shows them PERIOD * n higher.
 */
const TURN: readonly Drifter[] = [...lane(DAWN, 40, SHIFT), ...FIRST.filter((d) => d.at >= AGAIN_FROM).map((d) => ({ ...d, at: d.at + SHIFT }))].sort((a, b) => a.at - b.at);

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
  if (hi < TURN[0]!.at) return;
  for (let n = Math.max(0, Math.floor((lo - TURN[0]!.at) / PERIOD)); ; n++) {
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
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.006;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  if (d.kind === "cloud") cloud(ctx, d.shape, x, y + bob, k, tone.cloud, tone.cloudLine);
  else if (d.kind === "petals") petals(ctx, s, tone, x, y, k, d.phase);
  else if (d.kind === "balloons") balloons(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "plane") plane(ctx, s, tone, x, y, d.phase);
  else doves(ctx, s, tone, x, y, d.phase);
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

// ---------------------------------------------------------------- petals

/** A flurry's petals: across (in flurry sizes), phase, fall speed, sway, pale? */
const FLURRY = Array.from({ length: 11 }, (_, i) => ({
  dx: -1.1 + (i / 10) * 2.2 + (hash(i + 8400) - 0.5) * 0.3,
  ph: hash(i + 8500),
  sp: 0.22 + hash(i + 8600) * 0.14,
  sway: 0.5 + hash(i + 8610) * 1.2,
  pale: i % 3 === 1,
}));

/**
 * Rose petals drifting down through a band of the lane about (x, y), each swinging as it
 * falls, fading in at the top of the band and out at its bottom; r is the flurry's size.
 */
function petals(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, r: number, phase: number): void {
  const fall = r * 3;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.petalPale : tone.petal;
    ctx.beginPath();
    for (const p of FLURRY) {
      if (p.pale !== (pass === 1)) continue;
      const k = (s.t * p.sp + p.ph + phase) % 1;
      const fade = Math.min(1, k * 5, (1 - k) * 5);
      if (fade < 0.3) continue;
      const px = x + p.dx * r + Math.sin(s.t * p.sway + p.ph * 7) * r * 0.25;
      const py = y - fall * 0.5 + k * fall;
      petalPath(ctx, px, py, r * 0.3 * fade, Math.sin(s.t * p.sway * 1.3 + p.ph * 9) * 1.2 + p.ph * 6);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- balloons

/** A bunch of three heart balloons let go, rising on their strings (they bob up and sway in place), each lit on its upper left. */
function balloons(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const g = u * 0.034;
  const rise = Math.sin(s.t * 0.5 + phase) * u * 0.008;
  const lean = Math.sin(s.t * 0.3 + phase) * 0.15;
  // The strings, drawn down from each heart toward where they were tied together.
  ctx.strokeStyle = tone.wire;
  ctx.lineWidth = Math.max(0.8, u * 0.002);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const bx = x + (i - 1) * g * 1.1 + Math.sin(s.t * 0.7 + i * 2 + phase) * g * 0.08;
    const by = y + rise - (i === 1 ? g * 0.9 : g * 0.15) + (i === 2 ? g * 0.25 : 0);
    ctx.moveTo(bx, by + g * 0.5);
    ctx.quadraticCurveTo(bx + lean * g * 2 - (i - 1) * g * 0.4, by + g * 1.6, x + lean * g * 3, y + rise + g * 2.4);
  }
  ctx.stroke();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.balloonLit : tone.balloon;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const bx = x + (i - 1) * g * 1.1 + Math.sin(s.t * 0.7 + i * 2 + phase) * g * 0.08;
      const by = y + rise - (i === 1 ? g * 0.9 : g * 0.15) + (i === 2 ? g * 0.25 : 0);
      if (pass === 0) heartPath(ctx, bx, by, g);
      else oval(ctx, bx - g * 0.2, by - g * 0.22, g * 0.1, g * 0.15, -0.5);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the paper plane

/**
 * A paper plane folded from a love letter, gliding a lazy loop about its spot: a pale dart
 * seen from above and behind, a crease down its middle, a heart on one wing, banking as it
 * turns.
 */
function plane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const g = u * 0.03;
  const t = s.t * 0.45 + phase;
  const px = x + Math.sin(t) * u * 0.022;
  const py = y + Math.sin(t * 2) * u * 0.009;
  const heading = Math.cos(t) >= 0 ? 1 : -1;
  const bank = Math.sin(t * 2) * 0.35;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(heading, 1);
  ctx.rotate(bank * heading - 0.25);
  // The two wings (the far one a shade darker), the body fold between.
  ctx.fillStyle = tone.plane;
  ctx.beginPath();
  ctx.moveTo(g * 1.1, 0);
  ctx.lineTo(-g * 0.9, -g * 0.55);
  ctx.lineTo(-g * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.wire;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(g * 1.1, 0);
  ctx.lineTo(-g * 0.9, g * 0.45);
  ctx.lineTo(-g * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = tone.plane;
  ctx.beginPath();
  ctx.moveTo(g * 1.1, 0);
  ctx.lineTo(-g * 0.9, g * 0.45);
  ctx.lineTo(-g * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.letter;
  ctx.beginPath();
  ctx.moveTo(g * 1.1, 0);
  ctx.lineTo(-g * 0.9, g * 0.12);
  ctx.lineTo(-g * 0.9, -g * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.heart;
  ctx.beginPath();
  heartPath(ctx, -g * 0.3, -g * 0.22, g * 0.3);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- doves

/**
 * A pair of white doves wheeling together about their spot, wings beating slowly out of step,
 * fanned tails. Two fills: the bodies, heads and tails, then the wings. (In one path the shapes
 * of a dove facing left wind against its body and cut holes where they overlap it.)
 */
function doves(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const g = u * 0.016;
  ctx.fillStyle = tone.bird;
  for (let pass = 0; pass < 2; pass++) dovePass(ctx, s, x, y, phase, g, pass === 1);
}

/** The two doves' bodies, heads and tails (or, with `wings`, their wings), as one fill. */
function dovePass(ctx: Ctx, s: Scene, x: number, y: number, phase: number, g: number, wings: boolean): void {
  const u = s.u;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const t = s.t * 0.5 + phase + i * Math.PI;
    const dir = Math.cos(t) >= 0 ? 1 : -1;
    const bx = x + Math.sin(t) * u * 0.02;
    const by = y + Math.sin(t * 2) * u * 0.008 + (i ? g * 0.6 : -g * 0.6);
    const flap = Math.sin(s.t * 3.2 + phase + i * 1.4);
    // Body, head, a short fanned tail, and two wings raised or dropped.
    if (!wings) {
      oval(ctx, bx, by, g * 0.55, g * 0.22, 0);
      circle(ctx, bx + dir * g * 0.6, by - g * 0.1, g * 0.16);
      // The tail, wound the body's way round whichever way the dove faces.
      ctx.moveTo(bx - dir * g * 0.4, by - g * 0.05);
      if (dir > 0) {
        ctx.lineTo(bx - g * 0.95, by + g * 0.25);
        ctx.lineTo(bx - g * 0.95, by - g * 0.22);
      } else {
        ctx.lineTo(bx + g * 0.95, by - g * 0.22);
        ctx.lineTo(bx + g * 0.95, by + g * 0.25);
      }
      ctx.closePath();
      continue;
    }
    for (let side = -1; side <= 1; side += 2) {
      const tipX = bx + dir * g * 0.05 + side * g * 0.2;
      const tipY = by - g * (0.25 + 0.75 * flap);
      ctx.moveTo(bx + dir * g * 0.15, by - g * 0.1);
      ctx.quadraticCurveTo(bx - dir * g * 0.1 + side * g * 0.1, by - g * 0.6 * flap, tipX - side * g * 0.5, tipY);
      ctx.quadraticCurveTo(bx - dir * g * 0.3, by - g * 0.1 * flap, bx - dir * g * 0.25, by);
      ctx.closePath();
    }
  }
  ctx.fill();
}

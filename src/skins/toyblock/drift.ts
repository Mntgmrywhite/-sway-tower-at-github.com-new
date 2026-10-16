import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { block, blockCloud, LOW_CLOUD, TALL_CLOUD, type CloudShape } from "./shapes";
import type { Tone } from "./tone";

// What drifts past as you climb, in a lane down each side of the screen: a bunch of party
// balloons carrying a toy block away at the start, block clouds, a kite that got loose, a toy
// airship, and at night a few clouds and a little toy rocket. Each thing is anchored at a
// height in its lane, so it comes down past you as the camera climbs (one parallax depth for
// both lanes), and it only ever moves gently in place: nothing crosses the tower's column.
// Things in a lane are spaced so they never overlap, and the lanes are staggered so left and
// right take turns. Far away, so faded and flat, with no outline.

type Kind = "cloud" | "kite" | "balloons" | "airship" | "rocket";

export interface Drifter {
  kind: Kind;
  /** Height in its lane, world units. */
  at: number;
  /** Center, in u from the screen center (negative is left). */
  x: number;
  /** Size, in u. */
  size: number;
  /** Which way it faces: +1 out to the right, -1 out to the left. */
  m: number;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, at: number, x?: number];

// The story up to nightfall, by hand. A thing at height `at` comes in at the top of the
// screen around level (at - 220) / 8 and leaves at the bottom around level (at + 240) / 8.
// The sun sits up the left lane by day and sets there, and the moon rises up the right lane
// at dusk, so only clouds drift past them: the left lane carries clouds until the sun has set,
// and the right lane's balloons, kite and airship have all come down past the moon's spot by
// dusk.
//
// The balloons are the only thing that comes down past the land before the clouds cover it, so
// they hang a little further out than the rest, clear of the far bridge (see far.ts).
const RIGHT: Spec[] = [
  ["balloons", 150, 0.415],
  ["cloud", 330],
  ["kite", 440],
  ["airship", 640],
  ["cloud", 960],
];
const LEFT: Spec[] = [
  ["cloud", 400],
  ["cloud", 640],
  ["cloud", 860],
  ["kite", 1080],
  ["rocket", 1300],
];

/** After the authored story: a calm, sparse night, generated up to here. */
const TOP = 420 * BLOCK_HEIGHT;
const NIGHT_GAP = 260;

function drifter(kind: Kind, at: number, side: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + side * 59 + n + 4000);
  return {
    kind,
    at,
    x: side * (x ?? (0.37 + h(1) * 0.02)),
    size: kind === "cloud" ? 0.048 + h(2) * 0.01 : 0.03,
    m: side,
    shape: h(5) < 0.55 ? LOW_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

/** A lane: its story, then night clouds (and, where `toys`, now and then a rocket). */
function lane(side: number, story: Spec[], toys: boolean): Drifter[] {
  const items = story.map(([kind, at, x], k) => drifter(kind, at, side, k, x));
  let at = story[story.length - 1]![1];
  for (let k = story.length; at < TOP; k++) {
    at += NIGHT_GAP * (0.85 + hash(k * 5 + side * 3 + 4100) * 0.4);
    const r = hash(k * 13 + side * 101 + 4107);
    if (r < 0.45) items.push(drifter("cloud", at, side, k));
    else if (toys && r < 0.6) items.push(drifter("rocket", at, side, k));
  }
  return items;
}

/** Right lane, then left lane; each runs up from its lowest item. */
const LANES: readonly (readonly Drifter[])[] = [lane(1, RIGHT, false), lane(-1, LEFT, true)];

/** Calls `draw` for every item on screen (or close to it), lowest first, lane by lane. */
export function eachVisible(s: Scene, draw: (d: Drifter, lane: number) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  for (let l = 0; l < LANES.length; l++) {
    for (const d of LANES[l]!) {
      // Items run up the lane, so once one is above the screen the rest are too.
      const y = base - d.at * unit;
      if (y > s.cssH + margin) continue;
      if (y < -margin) break;
      draw(d, l);
    }
  }
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  if (d.kind === "cloud") blockCloud(ctx, d.shape, x, y + bob, k, tone.cloudShade, tone.cloud, tone.cloudLight);
  else if (d.kind === "kite") kite(ctx, s, tone, x, y + bob, k, d.m, d.phase);
  else if (d.kind === "balloons") balloons(ctx, tone, x, y + bob * 1.5, k);
  else if (d.kind === "airship") airship(ctx, tone, x, y + bob, k, d.m);
  else rocket(ctx, s, tone, x, y + bob, k);
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

// ---------------------------------------------------------------- the toys

/**
 * A diamond kite that got loose: four panels in red and yellow, a tail with two bows, and its
 * string trailing down and fading out. `m` is the lane side; the string trails toward the
 * screen edge, away from the tower.
 */
function kite(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, m: number, phase: number): void {
  const red = tone.toys[0];
  const yellow = tone.toys[1];
  const top = y - k * 1.15;
  const bottom = y + k * 1.25;
  const mid = y - k * 0.2;
  const w = k * 0.82;
  // The string, fading out in three steps as it trails away.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  let px = x;
  let py = mid;
  for (let i = 1; i <= 3; i++) {
    const nx = x + m * k * 0.35 * i + Math.sin(s.t * 0.5 + phase + i) * k * 0.08;
    const ny = mid + k * 1.3 * i;
    ctx.globalAlpha = 1 - (i - 1) * 0.33;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo((px + nx) / 2 - m * k * 0.15, (py + ny) / 2, nx, ny);
    ctx.stroke();
    px = nx;
    py = ny;
  }
  ctx.globalAlpha = 1;
  // Tail: a gentle wave from the bottom point, opposite the string, with two bows.
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  for (let i = 1; i <= 4; i++) ctx.lineTo(x - m * k * 0.12 * i + Math.sin(s.t * 1.6 - i + phase) * k * 0.12, bottom + i * k * 0.32);
  ctx.stroke();
  ctx.fillStyle = red.body;
  ctx.beginPath();
  for (let i = 2; i <= 4; i += 2) {
    const bx = x - m * k * 0.12 * i + Math.sin(s.t * 1.6 - i + phase) * k * 0.12;
    const by = bottom + i * k * 0.32;
    const b = k * 0.16;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - b * 1.3, by - b);
    ctx.lineTo(bx - b * 1.3, by + b);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + b * 1.3, by - b);
    ctx.lineTo(bx + b * 1.3, by + b);
    ctx.closePath();
  }
  ctx.fill();
  // The sail: red top-left and bottom-right, yellow in between.
  for (let q = 0; q < 4; q++) {
    ctx.fillStyle = q === 0 || q === 3 ? red.body : yellow.body;
    ctx.beginPath();
    ctx.moveTo(x, mid);
    ctx.lineTo(x, q < 2 ? top : bottom);
    ctx.lineTo(q % 2 ? x + w : x - w, mid);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = yellow.light;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, top + k * 0.3);
  ctx.lineTo(x - w * 0.55, mid - k * 0.1);
  ctx.lineTo(x - w * 0.42, mid - k * 0.1);
  ctx.closePath();
  ctx.fill();
}

/** Balloon centers in units of the bunch's size, and their toy color (red, blue, yellow). */
const BALLOON_AT = [
  [-0.62, -0.25, 0],
  [0.62, -0.38, 2],
  [0.02, -1.05, 1],
] as const;

/** Three party balloons tied together, carrying a little toy block away. */
function balloons(ctx: Ctx, tone: Tone, x: number, y: number, k: number): void {
  const knotY = y + k * 1.5;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.06);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const [bx, by] = BALLOON_AT[i]!;
    ctx.moveTo(x + bx * k, y + (by + 0.8) * k);
    ctx.quadraticCurveTo(x + bx * k * 0.4, y + (by + 1.4) * k, x, knotY);
  }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const [bx, by, c] = BALLOON_AT[i]!;
    const toy = tone.toys[c]!;
    ctx.fillStyle = toy.body;
    ctx.beginPath();
    oval(ctx, x + bx * k, y + by * k, k * 0.6, k * 0.78);
    ctx.moveTo(x + bx * k - k * 0.12, y + (by + 0.86) * k);
    ctx.lineTo(x + bx * k, y + (by + 0.72) * k);
    ctx.lineTo(x + bx * k + k * 0.12, y + (by + 0.86) * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = toy.light;
    ctx.beginPath();
    oval(ctx, x + (bx - 0.22) * k, y + (by - 0.32) * k, k * 0.14, k * 0.22, -0.4);
    ctx.fill();
  }
  // The block on its string.
  const toy = tone.toys[3];
  const b = k * 0.62;
  ctx.fillStyle = toy.body;
  ctx.beginPath();
  block(ctx, x - b / 2, knotY + k * 0.1, b, b, b * 0.16);
  ctx.fill();
  ctx.fillStyle = toy.light;
  ctx.fillRect(x - b * 0.32, knotY + k * 0.1 + b * 0.12, b * 0.64, b * 0.14);
}

/** A toy airship: a plump red envelope with yellow fins at the back and a yellow gondola block. */
function airship(ctx: Ctx, tone: Tone, x: number, y: number, k: number, m: number): void {
  const body = tone.toys[0];
  const gondola = tone.toys[1];
  // Fins at the back (away from the screen edge: the airship noses outward).
  const bx = x - m * k * 1.45;
  ctx.fillStyle = gondola.body;
  ctx.beginPath();
  ctx.moveTo(bx + m * k * 0.3, y - k * 0.2);
  ctx.lineTo(bx - m * k * 0.35, y - k * 0.82);
  ctx.lineTo(bx - m * k * 0.45, y - k * 0.12);
  ctx.closePath();
  ctx.moveTo(bx + m * k * 0.3, y + k * 0.2);
  ctx.lineTo(bx - m * k * 0.35, y + k * 0.82);
  ctx.lineTo(bx - m * k * 0.45, y + k * 0.12);
  ctx.closePath();
  ctx.fill();
  // The gondola, hanging under the middle.
  ctx.beginPath();
  block(ctx, x - k * 0.45, y + k * 0.5, k * 0.9, k * 0.42, k * 0.1);
  ctx.fill();
  ctx.fillStyle = body.body;
  ctx.beginPath();
  oval(ctx, x, y, k * 1.6, k * 0.62);
  ctx.fill();
  ctx.fillStyle = body.light;
  ctx.beginPath();
  oval(ctx, x + m * k * 0.2, y - k * 0.28, k * 0.9, k * 0.13);
  ctx.fill();
}

/** A little toy rocket standing upright: cream body, red nose and fins, a blue window, a small steady flame. */
function rocket(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const red = tone.toys[0];
  const flame = tone.toys[1];
  const w = k * 0.72;
  const top = y - k * 1.1;
  const bottom = y + k * 0.9;
  // Flame: a teardrop that breathes slowly.
  const f = k * (0.55 + 0.08 * Math.sin(s.t * 3));
  ctx.fillStyle = flame.body;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.3, bottom);
  ctx.quadraticCurveTo(x - w * 0.3, bottom + f * 0.6, x, bottom + f);
  ctx.quadraticCurveTo(x + w * 0.3, bottom + f * 0.6, x + w * 0.3, bottom);
  ctx.closePath();
  ctx.fill();
  // Fins.
  ctx.fillStyle = red.body;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, bottom - k * 0.6);
  ctx.lineTo(x - w * 0.95, bottom + k * 0.05);
  ctx.lineTo(x - w * 0.5, bottom);
  ctx.closePath();
  ctx.moveTo(x + w * 0.5, bottom - k * 0.6);
  ctx.lineTo(x + w * 0.95, bottom + k * 0.05);
  ctx.lineTo(x + w * 0.5, bottom);
  ctx.closePath();
  ctx.fill();
  // Body and nose.
  ctx.fillStyle = tone.cloud;
  ctx.beginPath();
  block(ctx, x - w / 2, top + k * 0.45, w, bottom - top - k * 0.45, w * 0.3);
  ctx.fill();
  ctx.fillStyle = red.body;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top + k * 0.6);
  ctx.quadraticCurveTo(x - w * 0.45, top + k * 0.1, x, top);
  ctx.quadraticCurveTo(x + w * 0.45, top + k * 0.1, x + w / 2, top + k * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.toys[2].body;
  ctx.beginPath();
  circle(ctx, x, y - k * 0.1, w * 0.24);
  ctx.fill();
}

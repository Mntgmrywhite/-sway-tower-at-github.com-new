import { hash, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { birdStroke, cloud, LONG_CLOUD, SMALL_CLOUD, TALL_CLOUD, type CloudShape } from "./shapes";
import type { Tone } from "./tone";

// What drifts past as you climb, in a lane down each side of the screen: a pair of swallows
// back for the spring at the start, then soft clouds; up in the shower some of them let fall a
// few drops (only while you are in it: the weather comes from the altitude, see tone.ts); above
// it a little rainbow standing on two clouds in the right lane, opposite the sun; a skein of
// geese heading home in the golden evening; and a calm, sparse night of clouds. Each thing is
// anchored at a height in its lane, so it comes down past you as the camera climbs (one
// parallax depth for both lanes), and it only ever moves gently in place: nothing crosses the
// tower's column. Things in a lane are spaced so they never overlap, and the lanes are
// staggered so left and right take turns. Far away, so faded and flat, with no outline.

type Kind = "cloud" | "swallows" | "rainbow" | "geese";

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
  /** A cloud that rains while you are in the shower. */
  rain: boolean;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind | "rain", at: number, x?: number];

// The story up to nightfall, by hand. A thing at height `at` comes in at the top of the
// screen around level (at - 230) / 8 and leaves at the bottom around level (at + 235) / 8.
// The sun sits up the left lane by day and sets there, and the moon rises up the right lane
// at dusk, so only clouds drift past them: the left lane carries only clouds, and the right
// lane's swallows, rainbow and geese have all come down past the moon's spot by dusk.
//
// The swallows are the only thing that comes down past the land before the cloud floor covers
// it, so they fly further out than the rest, clear of the far bridge (see far.ts). Everything
// else starts high enough to reach the horizon only once the land is covered.
const RIGHT: Spec[] = [
  ["swallows", 150, 0.43],
  ["rain", 340],
  ["rainbow", 440, 0.38],
  ["geese", 560],
  ["cloud", 760],
  ["cloud", 990],
];
const LEFT: Spec[] = [
  ["rain", 390],
  ["cloud", 570],
  ["cloud", 750],
  ["cloud", 930],
  ["cloud", 1130],
];

/** After the authored story: a calm, sparse night, generated up to here. */
const TOP = 420 * BLOCK_HEIGHT;
const NIGHT_GAP = 260;

function drifter(kind: Spec[0], at: number, side: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + side * 59 + n + 8000);
  const isCloud = kind === "cloud" || kind === "rain";
  return {
    kind: kind === "rain" ? "cloud" : kind,
    at,
    x: side * (x ?? 0.37 + h(1) * 0.02),
    size: isCloud ? 0.044 + h(2) * 0.01 : kind === "rainbow" ? 0.042 : 0.03,
    m: side,
    rain: kind === "rain",
    shape: h(5) < 0.55 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

/** A lane: its story, then night clouds. */
function lane(side: number, story: Spec[]): Drifter[] {
  const items = story.map(([kind, at, x], k) => drifter(kind, at, side, k, x));
  let at = story[story.length - 1]![1];
  for (let k = story.length; at < TOP; k++) {
    at += NIGHT_GAP * (0.85 + hash(k * 5 + side * 3 + 8100) * 0.4);
    if (hash(k * 13 + side * 101 + 8107) < 0.5) items.push(drifter("cloud", at, side, k));
  }
  return items;
}

/** Right lane, then left lane; each runs up from its lowest item. */
const LANES: readonly (readonly Drifter[])[] = [lane(1, RIGHT), lane(-1, LEFT)];

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
  const sway = d.kind === "rainbow" ? 0 : Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const k = d.size * u;
  if (d.kind === "cloud") {
    if (d.rain && tone.rain > 0.02) rain(ctx, s, tone, x, y + bob, k);
    cloud(ctx, d.shape, x, y + bob, k, tone.cloudShade, tone.cloud, tone.cloudLight);
  } else if (d.kind === "swallows") swallows(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "rainbow") rainbow(ctx, tone, x, y + bob, k);
  else geese(ctx, s, tone, x, y, d.m, d.phase);
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

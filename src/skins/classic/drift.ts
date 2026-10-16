import { circle, hash, oval, roundRectPath, type Ctx } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { birdStroke, capPath, cloud, LONG_CLOUD, strata, TALL_CLOUD, undersidePath, type Band, type CloudShape } from "./shapes";
import type { Tone } from "./tone";

// What drifts past as you climb, in a lane down each side of the screen: a hot-air balloon at
// the start, clouds and a small flock of birds as you rise into the clouds, then other floating
// islands (some with a tiny tree, some spilling a cloud waterfall into mist), and only a few
// soft clouds and island silhouettes in the night. Each thing is anchored at a height in
// its lane, so it comes down past you as the camera climbs (one parallax depth for both
// lanes), and it only ever moves gently in place: nothing crosses the tower's column. Things
// in a lane are spaced so they never overlap, and the lanes are staggered so left and right
// take turns. Far away, so faded and flat, with no outline.

type Kind = "cloud" | "isle" | "balloon" | "flock";

export interface Drifter {
  kind: Kind;
  /** Height in its lane, world units. */
  at: number;
  /** Center, in u from the screen center (negative is left). */
  x: number;
  /** Size, in u. */
  size: number;
  /** Which way it faces: +1 out to the right, -1 out to the left (mirrors islands, leads the flock). */
  m: number;
  tree: boolean;
  fall: boolean;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
const LANE_P = 0.7;

/** One authored entry: what, and its height in the lane (world units). */
type Spec = readonly [kind: Kind | "tree" | "fall", at: number];

// The story up to nightfall, by hand. A thing at height `at` comes in at the top of the
// screen around level (at - 220) / 8 and leaves at the bottom around level (at + 240) / 8.
// The sun sits up the left lane by day and sets there, and the moon rises up the right lane
// at dusk, so only clouds drift past them: the left lane carries clouds until the sun has set
// (the second one waits above the sun, which sinks away from it), and the right lane's
// islands, balloon and birds have all come down past the moon's spot by dusk.
const RIGHT: Spec[] = [
  ["balloon", 150],
  ["cloud", 330],
  ["flock", 400],
  ["tree", 480],
  ["fall", 600],
  ["cloud", 1000],
];
const LEFT: Spec[] = [
  ["cloud", 420],
  ["cloud", 650],
  ["fall", 820],
  ["tree", 1040],
  ["isle", 1250],
];

/** After the authored story: a calm, sparse night, generated up to here. */
const TOP = 420 * BLOCK_HEIGHT;
const NIGHT_GAP = 260;

function drifter(kind: Spec[0], at: number, side: number, k: number): Drifter {
  const h = (n: number) => hash(k * 17 + side * 59 + n);
  const isle = kind === "isle" || kind === "tree" || kind === "fall";
  return {
    kind: isle ? "isle" : kind,
    at,
    x: side * (0.36 + h(1) * 0.035),
    size: kind === "cloud" ? 0.045 + h(2) * 0.016 : isle ? 0.06 + h(2) * 0.016 : 0.034,
    m: side,
    tree: kind === "tree",
    fall: kind === "fall",
    shape: h(5) < 0.6 ? LONG_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

/** A lane: its story, then night clouds (and, where `isles`, now and then an island). */
function lane(side: number, story: Spec[], isles: boolean): Drifter[] {
  const items = story.map(([kind, at], k) => drifter(kind, at, side, k));
  let at = story[story.length - 1]![1];
  for (let k = story.length; at < TOP; k++) {
    at += NIGHT_GAP * (0.85 + hash(k * 5 + side * 3) * 0.4);
    const r = hash(k * 13 + side * 101 + 7);
    if (r < 0.45) items.push(drifter("cloud", at, side, k));
    else if (isles && r < 0.62) items.push(drifter("isle", at, side, k));
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
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.01;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  if (d.kind === "cloud") cloud(ctx, d.shape, x, y + bob, d.size * u, tone.cloudShade, tone.cloud, tone.cloudLight);
  else if (d.kind === "isle") isle(ctx, s, tone, d, x, y + bob);
  else if (d.kind === "balloon") balloon(ctx, s, tone, x, y + bob * 2, d.size * u);
  else flock(ctx, s, tone, x, y, d.m, d.phase);
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

// ---------------------------------------------------------------- islands

/** Three strata for the small islands (their colors come from the tone, so they are set per draw). */
const ISLE_BANDS: Band[] = [
  { body: "", lit: "", at: 0 },
  { body: "", lit: "", at: 0.34 },
  { body: "", lit: "", at: 0.72 },
];

function isle(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  const u = s.u;
  const hw = d.size * u;
  const depth = hw * 1.25;
  const capH = hw * 0.26;
  const top = y + capH * 0.6;
  if (d.fall) waterfall(ctx, s, tone, x + d.m * hw * 0.62, y + capH * 0.6, hw * 0.4, hw * 2.3, d.phase);
  for (let i = 0; i < 3; i++) {
    const b = ISLE_BANDS[i]!;
    b.body = tone.isleBands[i]!;
    b.lit = tone.isleBandsLit[i]!;
  }
  undersidePath(ctx, x, top, hw, depth, d.m);
  ctx.save();
  ctx.clip();
  strata(ctx, x, top, hw, depth, ISLE_BANDS);
  ctx.restore();
  capPath(ctx, x, y, hw * 1.08, capH, 5);
  ctx.fillStyle = tone.isleGrassShade;
  ctx.fill();
  capPath(ctx, x, y - capH * 0.3, hw * 1.08, capH * 0.9, 5);
  ctx.fillStyle = tone.isleGrass;
  ctx.fill();
  if (d.tree) tinyTree(ctx, tone, x + d.m * hw * 0.4, y + capH * 0.1, hw * 0.46);
}

/** A tiny round tree: trunk and a two-ball crown, flat. */
function tinyTree(ctx: Ctx, tone: Tone, x: number, y: number, h: number): void {
  ctx.fillStyle = tone.isleTrunk;
  ctx.fillRect(x - h * 0.07, y - h * 0.6, h * 0.14, h * 0.6);
  ctx.fillStyle = tone.isleLeafShade;
  ctx.beginPath();
  circle(ctx, x, y - h * 0.85, h * 0.42);
  circle(ctx, x + h * 0.3, y - h * 0.62, h * 0.3);
  ctx.fill();
  ctx.fillStyle = tone.isleLeaf;
  ctx.beginPath();
  circle(ctx, x - h * 0.04, y - h * 0.92, h * 0.36);
  ctx.fill();
}

/**
 * A cloud waterfall: mist pouring off an island's edge in a soft curtain that widens as it
 * falls, brighter streaks sliding down it, and a puff of mist where it lands.
 */
function waterfall(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, w: number, len: number, phase: number): void {
  const sway = Math.sin(s.t * 0.7 + phase) * w * 0.12;
  ctx.fillStyle = tone.cloud;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.quadraticCurveTo(x + w * 0.55, y + len * 0.55, x + w * 0.8 + sway, y + len);
  ctx.lineTo(x - w * 0.8 + sway, y + len);
  ctx.quadraticCurveTo(x - w * 0.55, y + len * 0.55, x - w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Streaks sliding down the curtain, fading in at the lip and out at the foot, so none of
  // them pops back to the top.
  ctx.fillStyle = tone.cloudLight;
  for (let i = 0; i < 3; i++) {
    const k = (s.t * 0.2 + i / 3 + phase) % 1;
    const sx = x + (i - 1) * w * 0.28 + sway * k;
    roundRectPath(ctx, sx - w * 0.07, y + len * k * 0.8, w * 0.14, len * 0.18, w * 0.07);
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Mist where it lands.
  cloud(ctx, LONG_CLOUD, x + sway, y + len + w * 0.2, w * 0.8, tone.cloudShade, tone.cloud, tone.cloudLight);
}

// ---------------------------------------------------------------- balloon and birds

/** A hot-air balloon: coral envelope with a cream middle gore, a little basket on ropes. */
function balloon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, r: number): void {
  const neck = y + r * 1.22;
  const basketY = y + r * 1.62;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.24, neck);
  ctx.lineTo(x - r * 0.2, basketY);
  ctx.moveTo(x + r * 0.24, neck);
  ctx.lineTo(x + r * 0.2, basketY);
  ctx.stroke();
  roundRectPath(ctx, x - r * 0.26, basketY, r * 0.52, r * 0.36, r * 0.08);
  ctx.fillStyle = tone.basket;
  ctx.fill();
  envelope(ctx, x, y, r);
  ctx.fillStyle = tone.balloonA;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  oval(ctx, x, y + r * 0.1, r * 0.4, r * 1.4);
  ctx.fillStyle = tone.balloonB;
  ctx.fill();
  ctx.restore();
}

function envelope(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(x + r * 0.28, y + r * 1.24);
  ctx.lineTo(x - r * 0.28, y + r * 1.24);
  ctx.closePath();
}

/** A small flock: four birds in a loose V led toward `dir` (+1 right), flapping slowly, drifting in place. */
function flock(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, dir: number, phase: number): void {
  const u = s.u;
  const g = u * 0.016;
  const cx = x + Math.sin(s.t * 0.3 + phase) * u * 0.02;
  const cy = y + Math.sin(s.t * 0.6 + phase) * u * 0.008;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    birdStroke(ctx, cx - dir * rank * g * 1.8, cy + side * rank * g * 0.8, g, Math.sin(s.t * 3 + i * 1.3 + phase));
  }
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

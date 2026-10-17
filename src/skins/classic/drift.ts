import { alpha, circle, hash, oval, roundRectPath, type Ctx } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { LAMP, LAMP_GLOW } from "./colors";
import { farSkyline, millShape } from "./far";
import { moonAt, spread, sunHigh } from "./sky";
import { BIG_CLOUD, birdStroke, capPath, cloud, LONG_CLOUD, nestedStrata, TALL_CLOUD, type Band, type CloudShape } from "./shapes";
import { level, LOOP, type Tone } from "./tone";

// What drifts past as you climb, in a lane down each side of the screen. A hot-air balloon at
// the start, clouds and a flock of birds as you rise into the clouds, then the archipelago:
// an island with a windmill, an airship and clouds, the birds flying home at sunset; at dusk
// two islands come down the left lane behind the setting sun (a cottage with its window lit,
// a waterfall turning to mist), moonlit clouds between them, and sky lanterns rise there
// through the night; at dawn the birds are up again on the right, a cloud, a pair of
// balloons, a paper plane gliding by, and an island with a cottage whose chimney smokes and a
// waterfall holding a rainbow in its spray. The story from the high day on repeats every LOOP
// levels, so it never runs out.
//
// Each thing is anchored at a height in its lane, so it comes down past you as the camera
// climbs (one parallax depth for both lanes), and it only ever moves gently in place: nothing
// crosses the tower's column. Things in a lane are spaced so they never overlap.
//
// Nothing ever passes over the sun or the moon. The sun stands in the left lane by day (it
// sets and rises there) and the moon in the right lane by night, and on a phone there is no
// room to go round either, so the lanes take turns: the sun has the left lane to itself by
// day, the moon the right by night. Things come down the left lane only behind the setting
// sun and are gone into the haze before it comes back up out of the sea (the lanterns, lit
// only while it is down, have gone out by then); things in the right lane pass the moon's
// height only while it is down. So the day's clouds pass on the right, the night's on the
// left. Since what a screen shows of a lane depends on its shape, the loop's things are
// placed by when they pass their lane's sun or moon (see PASS): the same story level on every
// screen.
// Mid-distance: flat two-tone fills faded toward the haze, no outline.

type Kind = "cloud" | "isle" | "balloon" | "flock" | "airship" | "lanterns" | "plane";
/** What stands on an island. */
type Deco = "none" | "tree" | "fall" | "mill" | "cottage";

export interface Drifter {
  kind: Kind;
  /** Height in its lane, world units (for a looped item, within one turn of the loop). */
  at: number;
  /** Center, in u from the screen center on a phone (negative is left); wider screens spread it out (see spread()). */
  x: number;
  /** Size, in u. */
  size: number;
  /** Which way it faces: +1 out to the right, -1 out to the left (mirrors islands, leads the flock). */
  m: number;
  deco: Deco;
  /** A second deco on an island (a tree beside the cottage), or "none". */
  extra: Deco;
  /** Pattern of a balloon (0..2), or a second balloon behind it when >= 3. */
  look: number;
  shape: CloudShape;
  phase: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
const LANE_P = 0.7;

/**
 * One authored entry: what, its height in the lane (world units), a seed that picks its size,
 * offset, cloud shape and phase (it stays with the thing wherever it is placed), and for
 * islands what is on them.
 */
type Spec = readonly [kind: Kind, at: number, seed: number, deco?: Deco, extra?: Deco, look?: number];

// The first pass, by hand: the start and the climb into the clouds. A thing at height `at`
// crosses the middle of a tall phone's screen around level (at - 100) / 8. Nothing on the
// left: the sun has that lane to itself through the first day.
const RIGHT_START: Spec[] = [
  ["balloon", 150, 0, "none", "none", 0],
  ["cloud", 330, 1],
  ["flock", 400, 2],
];
const LEFT_START: Spec[] = [];

/** How tall one turn of the loop's lanes is (world units): one turn of the sky. */
export const LOOP_SPAN = LOOP * BLOCK_HEIGHT;

/**
 * The story level at which a thing at the start of a turn passes its lane's sun or moon height,
 * right lane (the moon) then left lane (the sun): a thing at rel into turn k passes it at
 * PASS + rel / BLOCK_HEIGHT + k * LOOP, on every screen. These are where they pass on a tall
 * phone (390x844), where the turn starts about 480 world units up its lanes; a shorter or taller
 * screen shows more or less of a lane above and below the sun and moon, so its turn starts a
 * little lower or higher (see turnStart).
 */
export const PASS = [47, 48] as const;

// One turn of the loop, heights within it (rel). Right lane (the moon's), passing the moon's
// height at story level 47 + rel / 8: only while the moon is down, so before ~70 (rel up to
// ~180) and after ~140 (rel from ~750), the day's clouds among them. Left lane (the sun's),
// passing the sun's height at 48 + rel / 8: the two islands and the moonlit clouds only after
// the sun has begun to set (from ~62) and early enough to be gone into the haze before it comes
// back up (by ~103, rel up to ~440); the lanterns all night, as they are lit only while it is down.
const RIGHT_LOOP: Spec[] = [
  ["isle", 15, 40, "mill", "tree"],
  ["airship", 100, 41],
  ["cloud", 131, 43],
  ["flock", 180, 42],
  ["flock", 755, 46],
  ["cloud", 790, 44],
  ["balloon", 850, 47, "none", "none", 4],
  ["plane", 893, 48],
  ["isle", 960, 49, "fall", "cottage"],
];
const LEFT_LOOP: Spec[] = [
  ["isle", 150, 41, "cottage", "none"],
  ["cloud", 203, 40],
  ["isle", 300, 42, "fall", "tree"],
  ["cloud", 346, 45],
  ["cloud", 408, 47],
  ["lanterns", 470, 43],
  ["lanterns", 560, 44],
  ["lanterns", 650, 46],
];

function drifter(spec: Spec, side: number): Drifter {
  const [kind, at, k, deco = "none", extra = "none", look = 0] = spec;
  const h = (n: number) => hash(k * 17 + side * 59 + n + Math.round(at) * 0.013);
  const size =
    kind === "cloud"
      ? 0.045 + h(2) * 0.016
      : kind === "isle"
        ? 0.066 + h(2) * 0.012
        : kind === "airship"
          ? 0.07
          : kind === "lanterns"
            ? 0.017
            : kind === "plane"
              ? 0.026
              : 0.034;
  return {
    kind,
    at,
    x: side * (kind === "airship" ? 0.375 : 0.36 + h(1) * 0.03),
    size,
    m: side,
    deco,
    extra,
    look,
    shape: h(5) < 0.4 ? LONG_CLOUD : h(5) < 0.75 ? TALL_CLOUD : BIG_CLOUD,
    phase: h(6) * 10,
  };
}

/** The first pass and one turn of the loop, per lane: right lane, then left lane. */
const START: readonly (readonly Drifter[])[] = [RIGHT_START.map((sp) => drifter(sp, 1)), LEFT_START.map((sp) => drifter(sp, -1))];
const TURN: readonly (readonly Drifter[])[] = [RIGHT_LOOP.map((sp) => drifter(sp, 1)), LEFT_LOOP.map((sp) => drifter(sp, -1))];

/**
 * Where turn 0 of a lane's loop starts on this screen (lane height, world units): the height in
 * the lane that is level with its moon (right) or its sun's day height (left) when the climb is
 * at story level PASS.
 */
export function turnStart(s: Scene, lane: number): number {
  const unit = s.scale * LANE_P;
  const sky = lane === 0 ? moonAt(s).y : sunHigh(s);
  // The height level with it now rises with the camera, one for one: take the climb so far off
  // (the same all the way up) and add the climb to PASS.
  return (layerGround(s, LANE_P) - sky) / unit - s.altitude + PASS[lane]! * BLOCK_HEIGHT;
}

/**
 * Calls `draw` for every item on screen (or close to it), lane by lane, lowest first, with its
 * height in the lane (world units). The loop's turns are found from the screen's span, so the
 * cost never grows with the tower.
 */
export function eachVisible(s: Scene, draw: (d: Drifter, lane: number, at: number) => void): void {
  const margin = s.u * 0.32;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  // y = base - at * unit, on screen while -margin < y < cssH + margin.
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  for (let l = 0; l < 2; l++) {
    for (const d of START[l]!) if (d.at > lo && d.at < hi) draw(d, l, d.at);
    const from0 = turnStart(s, l);
    if (hi < from0) continue;
    const k0 = Math.max(0, Math.floor((lo - from0) / LOOP_SPAN));
    const k1 = Math.floor((hi - from0) / LOOP_SPAN);
    for (let k = k0; k <= k1; k++) {
      const from = from0 + k * LOOP_SPAN;
      for (const d of TURN[l]!) {
        const at = from + d.at;
        if (at > lo && at < hi) draw(d, l, at);
      }
    }
  }
}

/**
 * How far an item reaches below its anchor, in units of its size (a flock in u): its
 * underside and roots, a waterfall and its mist, a basket, a gondola, the lowest lantern,
 * a plane's swoop, plus the bob.
 */
function reachBelow(d: Drifter): number {
  if (d.kind === "cloud") return d.size * 0.46;
  if (d.kind === "isle") return d.size * (d.deco === "fall" ? 2.76 : 1.82);
  if (d.kind === "balloon") return d.size * 2.5;
  if (d.kind === "airship") return d.size * 0.76;
  if (d.kind === "lanterns") return d.size * 5.8;
  if (d.kind === "plane") return d.size * 0.66;
  return 0.046;
}

/** How far above the far islands' skyline an item starts to fade (u): about two levels of the climb. */
const HAZE_FADE = 0.08;

/**
 * How much of an item shows at anchor `y`. While the far islands show, things in the lanes
 * fade into the haze as they come down toward the islands' skyline and are gone before they
 * reach it, so none ever stands in front of the lighthouse, the great tree or the hamlet.
 */
function hazeFade(s: Scene, tone: Tone, d: Drifter, y: number): number {
  if (tone.farIsles <= 0.01) return 1;
  const low = y + reachBelow(d) * s.u;
  const k = Math.min(1, Math.max(0, (farSkyline(s, level(s)) - low) / (s.u * HAZE_FADE)));
  return 1 - tone.farIsles * (1 - k * k * (3 - 2 * k));
}

/** Where an item at height `at` in its lane is anchored on screen now (y). */
export function laneY(s: Scene, at: number): number {
  return layerGround(s, LANE_P) - at * s.scale * LANE_P;
}

/** Draw one item where it is now, at height `at` in its lane. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, at: number): void {
  const u = s.u;
  const y = laneY(s, at);
  const fade = hazeFade(s, tone, d, y);
  if (fade <= 0.004) return;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * fade;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.01;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u * spread(s) + sway;
  if (d.kind === "cloud") cloud(ctx, d.shape, x, y + bob, d.size * u, tone.cloudShade, tone.cloud, tone.cloudLight);
  else if (d.kind === "isle") isle(ctx, s, tone, d, x, y + bob);
  else if (d.kind === "balloon") balloons(ctx, s, tone, d, x, y + bob * 2);
  else if (d.kind === "airship") airship(ctx, s, tone, d, x, y + bob);
  else if (d.kind === "lanterns") lanterns(ctx, s, tone, d, x, y);
  else if (d.kind === "plane") plane(ctx, s, tone, d, x, y);
  else flock(ctx, s, tone, x, y, d.m, d.phase);
  ctx.globalAlpha = base;
}

/** Scratch arguments for `drawOne`, so the per-frame loop allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, tone: null as Tone | null };
function drawOne(d: Drifter, _lane: number, at: number): void {
  drawDrifter(NOW.ctx!, NOW.s!, NOW.tone!, d, at);
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
  { body: "", lit: "", at: 0.42 },
  { body: "", lit: "", at: 0.76 },
];

function isle(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  const u = s.u;
  const hw = d.size * u;
  const depth = hw * 1.25;
  const capH = hw * 0.26;
  const top = y + capH * 0.6;
  if (d.deco === "fall") waterfall(ctx, s, tone, x + d.m * hw * 0.62, y + capH * 0.6, hw * 0.4, hw * 2.3, d.phase, d.m);
  for (let i = 0; i < 3; i++) {
    const b = ISLE_BANDS[i]!;
    b.body = tone.isleBands[i]!;
    b.lit = tone.isleBandsLit[i]!;
  }
  // A few roots under it, then the striped underside and the grass cap.
  ctx.strokeStyle = tone.isleTrunk;
  ctx.lineWidth = Math.max(1, hw * 0.05);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const rx = x + d.m * hw * (-0.5 + i * 0.42);
    const ry = top + depth * (0.55 + (i === 1 ? 0.35 : 0));
    const len = hw * (0.28 + 0.1 * i);
    const swing = Math.sin(s.t * 0.7 + d.phase + i) * hw * 0.04;
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx - hw * 0.06, ry + len * 0.6, rx + swing, ry + len);
  }
  ctx.stroke();
  nestedStrata(ctx, x, top, hw, depth, d.m, ISLE_BANDS);
  capPath(ctx, x, y, hw * 1.08, capH, 5);
  ctx.fillStyle = tone.isleGrassShade;
  ctx.fill();
  capPath(ctx, x, y - capH * 0.3, hw * 1.08, capH * 0.9, 5);
  ctx.fillStyle = tone.isleGrass;
  ctx.fill();
  const ground = y + capH * 0.1;
  decorate(ctx, s, tone, d.deco, d, x, ground, hw, 1);
  if (d.extra !== "none") decorate(ctx, s, tone, d.extra, d, x, ground, hw, -1);
}

/** What stands on an island: `slot` 1 is the main spot (toward the outside), -1 the other side. */
function decorate(ctx: Ctx, s: Scene, tone: Tone, deco: Deco, d: Drifter, x: number, ground: number, hw: number, slot: number): void {
  const at = x + d.m * hw * 0.38 * slot;
  if (deco === "tree" || deco === "fall") tinyTree(ctx, tone, slot > 0 ? x + d.m * hw * 0.4 : at, ground, hw * (slot > 0 ? 0.46 : 0.4));
  else if (deco === "mill") millShape(ctx, at, ground, hw * 0.78, s.t * 0.5 + d.phase, tone.wall, tone.roof, null);
  else if (deco === "cottage") cottage(ctx, s, tone, at, ground, hw * 0.5, d.m, d.phase);
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
 * A little cottage standing at (x, y), `w` wide: whitewashed walls with the far side in shade,
 * a red gabled roof, a door, a window lit from dusk to dawn, and a chimney whose smoke drifts
 * up and away (outward, `m`).
 */
function cottage(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, w: number, m: number, phase: number): void {
  const h = w * 0.62;
  const left = x - w / 2;
  const roofH = w * 0.5;
  // Smoke first, behind the chimney: three puffs rising and fading, staggered.
  const chx = x + m * w * 0.26;
  const chy = y - h - roofH * 0.55;
  ctx.fillStyle = tone.cloudLight;
  const base = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const f = (s.t * 0.25 + i / 3 + phase) % 1;
    ctx.globalAlpha = base * 0.85 * Math.sin(f * Math.PI);
    ctx.beginPath();
    circle(ctx, chx + m * f * w * 0.5 + Math.sin(f * 6 + phase) * w * 0.05, chy - w * 0.12 - f * w * 0.75, w * (0.07 + f * 0.1));
    ctx.fill();
  }
  ctx.globalAlpha = base;
  ctx.fillStyle = tone.roofShade;
  ctx.fillRect(chx - w * 0.06, chy - w * 0.1, w * 0.12, w * 0.3);
  // Walls: lit front, shaded far end.
  ctx.fillStyle = tone.wall;
  ctx.fillRect(left, y - h, w, h);
  ctx.fillStyle = tone.wallShade;
  ctx.fillRect(m > 0 ? x + w * 0.22 : left, y - h, w * 0.28, h);
  // Roof: the gable, lit and shaded halves.
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  ctx.moveTo(left - w * 0.1, y - h);
  ctx.lineTo(x, y - h - roofH);
  ctx.lineTo(x + w * 0.6, y - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.roofShade;
  ctx.beginPath();
  if (m > 0) {
    ctx.moveTo(x, y - h - roofH);
    ctx.lineTo(x + w * 0.6, y - h);
    ctx.lineTo(x + w * 0.2, y - h);
  } else {
    ctx.moveTo(x, y - h - roofH);
    ctx.lineTo(left - w * 0.1, y - h);
    ctx.lineTo(x - w * 0.2, y - h);
  }
  ctx.closePath();
  ctx.fill();
  // Door and window.
  ctx.fillStyle = tone.roofShade;
  ctx.fillRect(x - m * w * 0.24 - w * 0.08, y - h * 0.62, w * 0.16, h * 0.62);
  if (tone.lit > 0.02) {
    ctx.fillStyle = alpha(LAMP, 0.3 * tone.lit);
    ctx.beginPath();
    circle(ctx, x + m * w * 0.12, y - h * 0.52, w * 0.2);
    ctx.fill();
  }
  ctx.fillStyle = tone.window;
  ctx.fillRect(x + m * w * 0.12 - w * 0.08, y - h * 0.66, w * 0.16, w * 0.16);
}

/**
 * A cloud waterfall: mist pouring off an island's edge in a soft curtain that widens as it
 * falls, brighter streaks sliding down it, and a puff of mist where it lands.
 */
function waterfall(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, w: number, len: number, phase: number, m: number): void {
  const sway = Math.sin(s.t * 0.7 + phase) * w * 0.12;
  const base = ctx.globalAlpha;
  ctx.fillStyle = tone.cloud;
  ctx.globalAlpha = base * 0.9;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.quadraticCurveTo(x + w * 0.55, y + len * 0.55, x + w * 0.8 + sway, y + len);
  ctx.lineTo(x - w * 0.8 + sway, y + len);
  ctx.quadraticCurveTo(x - w * 0.55, y + len * 0.55, x - w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = base;
  // Streaks sliding down the curtain, fading in at the lip and out at the foot, so none of
  // them pops back to the top.
  ctx.fillStyle = tone.cloudLight;
  for (let i = 0; i < 3; i++) {
    const k = (s.t * 0.2 + i / 3 + phase) % 1;
    const sx = x + (i - 1) * w * 0.28 + sway * k;
    roundRectPath(ctx, sx - w * 0.07, y + len * k * 0.8, w * 0.14, len * 0.18, w * 0.07);
    ctx.globalAlpha = base * Math.sin(k * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = base;
  // By day, a little rainbow standing in the spray, then the mist where it lands.
  if (tone.rainbow > 0.02) rainbow(ctx, x + sway - m * w * 0.5, y + len + w * 0.1, w * 1.9, tone.rainbow);
  cloud(ctx, LONG_CLOUD, x + sway, y + len + w * 0.2, w * 0.8, tone.cloudShade, tone.cloud, tone.cloudLight);
}

/** Rainbow bands, outside in: coral, sunny, mint, sky blue. */
const BOWS = ["#ff7a6a", "#ffd34a", "#7ee08a", "#7ab8f5"] as const;

/** A small flat rainbow standing on (x, y), `r` across its outer band, faded by `k`. */
function rainbow(ctx: Ctx, x: number, y: number, r: number, k: number): void {
  const band = r * 0.12;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * 0.7 * k;
  ctx.lineWidth = band;
  ctx.lineCap = "butt";
  for (let i = 0; i < BOWS.length; i++) {
    const rr = r - band * (i + 0.5);
    ctx.beginPath();
    ctx.arc(x, y, rr, Math.PI, Math.PI * 2);
    ctx.strokeStyle = BOWS[i]!;
    ctx.stroke();
  }
  ctx.globalAlpha = base;
}

// ---------------------------------------------------------------- balloons, the airship, lanterns and birds

/** Flat shading laid over a fill (the side away from the light). */
const SHADE = "rgba(42, 31, 61, 0.16)";
const SHINE = "rgba(255, 255, 255, 0.42)";

/** One balloon, or (look >= 3) a pair: a smaller one higher up behind, toward the column. */
function balloons(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  const r = d.size * s.u;
  if (d.look >= 3) {
    const bob = Math.sin(s.t * 0.33 + d.phase + 2) * r * 0.12;
    balloon(ctx, s, tone, x - d.m * r * 1.15, y - r * 1.9 + bob, r * 0.72, 1);
    balloon(ctx, s, tone, x + d.m * r * 0.35, y + r * 0.2, r, 2);
  } else balloon(ctx, s, tone, x, y, r, d.look);
}

/**
 * A hot-air balloon: the envelope in one of three patterns (coral with a cream gore, sunny
 * with blue bands, blue with cream and coral gores), shaded on its right and lit top left, a
 * wicker basket on ropes with a small flame flickering in the mouth.
 */
function balloon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, r: number, look: number): void {
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
  ctx.fillStyle = SHADE;
  ctx.fillRect(x - r * 0.26, basketY + r * 0.2, r * 0.52, r * 0.16);
  const body = look === 1 ? tone.accentWarm : look === 2 ? tone.accentCool : tone.balloonA;
  envelope(ctx, x, y, r);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  if (look === 1) {
    ctx.rect(x - r, y - r * 0.32, r * 2, r * 0.22);
    ctx.rect(x - r, y + r * 0.3, r * 2, r * 0.2);
    ctx.fillStyle = tone.accentCool;
  } else if (look === 2) {
    oval(ctx, x, y + r * 0.1, r * 0.22, r * 1.4);
    oval(ctx, x - r * 0.72, y + r * 0.1, r * 0.2, r * 1.4);
    oval(ctx, x + r * 0.72, y + r * 0.1, r * 0.2, r * 1.4);
    ctx.fillStyle = tone.accentCream;
  } else {
    oval(ctx, x, y + r * 0.1, r * 0.4, r * 1.4);
    ctx.fillStyle = tone.balloonB;
  }
  ctx.fill();
  if (look === 2) {
    ctx.beginPath();
    oval(ctx, x - r * 0.36, y + r * 0.1, r * 0.12, r * 1.4);
    oval(ctx, x + r * 0.36, y + r * 0.1, r * 0.12, r * 1.4);
    ctx.fillStyle = tone.balloonA;
    ctx.fill();
  }
  // Shade on the right, a shine top left.
  ctx.beginPath();
  circle(ctx, x + r * 0.95, y + r * 0.15, r * 0.95);
  ctx.fillStyle = SHADE;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  oval(ctx, x - r * 0.42, y - r * 0.46, r * 0.2, r * 0.12, -0.7);
  ctx.fillStyle = SHINE;
  ctx.fill();
  // The burner's flame in the mouth, flickering.
  const f = 0.8 + 0.2 * Math.sin(s.t * 9 + x);
  ctx.beginPath();
  oval(ctx, x, neck + r * 0.12, r * 0.07, r * 0.13 * f);
  ctx.fillStyle = LAMP_GLOW;
  ctx.fill();
}

function envelope(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(x + r * 0.28, y + r * 1.24);
  ctx.lineTo(x - r * 0.28, y + r * 1.24);
  ctx.closePath();
}

/**
 * An airship nosing out of the lane: a cream envelope with a coral band and tail fins, a
 * gondola with three windows under it, and a propeller blurring at its tail.
 */
function airship(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  const L = d.size * s.u;
  const R = L * 0.36;
  const m = d.m;
  const tail = x - m * L;
  // Fins: top and bottom at the tail.
  ctx.fillStyle = tone.balloonA;
  ctx.beginPath();
  for (const v of [-1, 1]) {
    ctx.moveTo(tail + m * L * 0.32, y + v * R * 0.4);
    ctx.lineTo(tail - m * L * 0.06, y + v * R * 1.2);
    ctx.lineTo(tail - m * L * 0.08, y + v * R * 0.2);
    ctx.closePath();
  }
  ctx.fill();
  // Gondola on its two struts.
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.beginPath();
  ctx.moveTo(x - L * 0.22, y + R * 0.8);
  ctx.lineTo(x - L * 0.18, y + R * 1.3);
  ctx.moveTo(x + L * 0.22, y + R * 0.8);
  ctx.lineTo(x + L * 0.18, y + R * 1.3);
  ctx.stroke();
  roundRectPath(ctx, x - L * 0.3, y + R * 1.25, L * 0.6, R * 0.5, R * 0.18);
  ctx.fillStyle = tone.basket;
  ctx.fill();
  ctx.fillStyle = tone.window;
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * L * 0.17 - L * 0.05, y + R * 1.35, L * 0.1, R * 0.2);
  // Envelope, its band, shade underneath and a shine on top.
  ctx.beginPath();
  oval(ctx, x, y, L, R);
  ctx.fillStyle = tone.accentCream;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = tone.balloonA;
  ctx.fillRect(x - m * L * 0.15 - L * 0.1, y - R, L * 0.2, R * 2);
  ctx.fillStyle = SHADE;
  ctx.beginPath();
  oval(ctx, x, y + R * 0.95, L * 1.1, R * 0.75);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = SHINE;
  ctx.beginPath();
  oval(ctx, x + m * L * 0.2, y - R * 0.52, L * 0.42, R * 0.14);
  ctx.fill();
  // Propeller: a blade seen edge-on, its width beating fast.
  const beat = Math.abs(Math.sin(s.t * 14 + d.phase));
  ctx.fillStyle = tone.bird;
  ctx.beginPath();
  oval(ctx, tail - m * L * 0.1, y, L * 0.025, R * (0.25 + 0.6 * beat));
  ctx.fill();
}

/** Four sky lanterns in a loose group, rising and bobbing in place, lit only while the sun is down. */
const LANTERNS = [
  [-0.9, 0.5, 1],
  [0.6, -0.9, 0.86],
  [1.45, 1.1, 0.74],
  [-0.2, 2.1, 0.66],
] as const;

function lanterns(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  if (tone.lanterns <= 0.01) return;
  const r = d.size * s.u;
  const base = ctx.globalAlpha;
  for (let pass = 1; pass < 3; pass++) {
    ctx.globalAlpha = base * tone.lanterns;
    ctx.fillStyle = pass === 1 ? LAMP_GLOW : LAMP;
    ctx.beginPath();
    for (let i = 0; i < LANTERNS.length; i++) {
      const [dx, dy, k] = LANTERNS[i]!;
      const lx = x + d.m * dx * r * 2.2 + Math.sin(s.t * 0.3 + d.phase + i) * r * 0.25;
      const ly = y + dy * r * 2.2 + Math.sin(s.t * 0.45 + d.phase + i * 2) * r * 0.35;
      const w = r * k;
      if (pass === 1) {
        // The paper: a rounded trapezoid, wider at the top.
        ctx.moveTo(lx - w * 0.7, ly - w * 0.9);
        ctx.quadraticCurveTo(lx, ly - w * 1.15, lx + w * 0.7, ly - w * 0.9);
        ctx.lineTo(lx + w * 0.5, ly + w * 0.8);
        ctx.quadraticCurveTo(lx, ly + w * 0.92, lx - w * 0.5, ly + w * 0.8);
        ctx.closePath();
      } else {
        // The lit middle and the flame at the mouth.
        oval(ctx, lx - w * 0.08, ly - w * 0.1, w * 0.32, w * 0.55);
        circle(ctx, lx, ly + w * 0.92, w * 0.16);
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

/**
 * A paper plane gliding out of the lane: a folded white dart nosing outward (`m`), its far
 * wing in shade, swooping gently up and down and tilting with it.
 */
function plane(ctx: Ctx, s: Scene, tone: Tone, d: Drifter, x: number, y: number): void {
  const L = d.size * s.u;
  const swoop = Math.sin(s.t * 0.7 + d.phase);
  const px = x + Math.sin(s.t * 0.35 + d.phase) * L * 0.4;
  const py = y + swoop * L * 0.35;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(d.m * Math.cos(s.t * 0.7 + d.phase) * 0.12);
  ctx.scale(d.m, 1);
  // Far wing (shaded), then the near wing over it, then the keel under them.
  ctx.fillStyle = tone.wallShade;
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.lineTo(-L * 0.9, -L * 0.42);
  ctx.lineTo(-L * 0.55, -L * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.accentCream;
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.lineTo(-L, -L * 0.1);
  ctx.lineTo(-L * 0.62, L * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.wallShade;
  ctx.beginPath();
  ctx.moveTo(L * 0.9, L * 0.02);
  ctx.lineTo(-L * 0.62, L * 0.34);
  ctx.lineTo(-L * 0.5, L * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A small flock: five birds in a loose V led toward `dir` (+1 right), flapping slowly, drifting in place. */
function flock(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, dir: number, phase: number): void {
  const u = s.u;
  const g = u * 0.016;
  const cx = x + Math.sin(s.t * 0.3 + phase) * u * 0.02;
  const cy = y + Math.sin(s.t * 0.6 + phase) * u * 0.008;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    birdStroke(ctx, cx + dir * (1 - rank) * g * 1.6, cy + side * rank * g * 0.8, g * (1 - rank * 0.08), Math.sin(s.t * 3 + i * 1.3 + phase));
  }
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

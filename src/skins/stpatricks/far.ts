import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MEADOW } from "./colors";
import { wallTop } from "./front";
import { archPath } from "./shapes";
import { DAY_HIGH, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: a back row of soft blue-green hills, then the
// emerald hills in front, quilted with a patchwork of fields (three greens) parted by dark
// hedgerows and pale dry-stone walls, a few round trees along the hedges and sheep grazing on
// the left slopes. On the left hilltop an old monastic site: a slim round tower under its
// conical cap and a high cross with its ring. Below it a stream comes out under a little
// humpbacked stone bridge and winds away over the brow of the meadow the round tower stands
// on, a hedge along its far edge. (The right side is left to the rainbow and the swallows.)
// Above the start a floor of cloud gathers below you and
// covers the land: from then on its puffy top is the horizon. All of it is faded and flat,
// with no outline, and nothing here moves.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(16, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (s.horizonY + s.u * 0.01 - below) * k;
}

/** The land below shows only until the cloud floor covers it (`top` is the floor's top edge). */
export function landShows(s: Scene, top: number): boolean {
  return top > s.horizonY + s.u * 0.02;
}

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/** Where the sky stops: below this the hills and meadow, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * BACK_BASE : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- hills

/** Polyline step along the hills (u). */
const HILL_STEP = 0.045;

/** The back hills' base line, u below the horizon. */
const BACK_BASE = 0.03;

function backHeight(X: number): number {
  return 0.09 * (0.6 + 0.3 * Math.sin(X * 4.1 + 1.3) + 0.16 * Math.sin(X * 9.7 + 0.4));
}

/** The front hills' base line (the meadow's far edge), u below the horizon. */
const FRONT_BASE = 0.085;

function bump(X: number, c: number, w: number): number {
  const d = (X - c) / w;
  return Math.exp(-d * d);
}

/** Height of the front hills at X (u from center): a big hill on the left, a smaller one on the right. */
function frontHeight(X: number): number {
  return 0.05 + 0.09 * bump(X, -0.4, 0.17) + 0.06 * bump(X, 0.42, 0.17) + 0.012 * Math.sin(X * 7.5 + 1.2);
}

/** Screen y of the front hills' top at X (u from center). */
export function frontTop(s: Scene, X: number): number {
  return s.horizonY + (FRONT_BASE - frontHeight(X)) * s.u;
}

/** A row of hills: the path along their tops, filled down to `bottom`. */
function hillPath(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * HILL_STEP) {
    ctx.lineTo(x, base - u * height((x - cx) / u));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
}

// ---------------------------------------------------------------- patchwork fields

/** Fields are this wide (u) at the hills' foot; their hedges lean out, narrowing toward the tops. */
const FIELD_W = 0.14;
const FIELD_TOP = -0.2;
const FIELD_BOT = FRONT_BASE + 0.012;
const SLANT = 0.78;
/** The two dry-stone walls that run along the slopes, as fractions of the hill height. */
const UPPER_WALL = 0.64;
const LOWER_WALL = 0.3;
/** Scratch corners of every hedge line: x at the top, where it crosses each wall (x, y), x at the foot. */
const MAX_HEDGES = 96;
const TOP_X = new Float64Array(MAX_HEDGES);
const HI_X = new Float64Array(MAX_HEDGES);
const HI_Y = new Float64Array(MAX_HEDGES);
const LO_X = new Float64Array(MAX_HEDGES);
const LO_Y = new Float64Array(MAX_HEDGES);
const BOT_X = new Float64Array(MAX_HEDGES);
/** Where each hedge line meets the hills' skyline. */
const SKY_X = new Float64Array(MAX_HEDGES);
const SKY_Y = new Float64Array(MAX_HEDGES);

function mod3(i: number): number {
  return ((i % 3) + 3) % 3;
}

/** One field: a quad between two hedges and two walls (or the foot), as its own subpath. */
function field(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
}

/**
 * A top field: up its left hedge from the upper wall to the skyline, along the skyline (on the
 * same points the hills' outline uses) to its right hedge, and down to the wall again.
 */
function topField(ctx: Ctx, s: Scene, k: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = s.horizonY + u * FRONT_BASE;
  const step = u * HILL_STEP;
  ctx.moveTo(HI_X[k]!, HI_Y[k]!);
  ctx.lineTo(SKY_X[k]!, SKY_Y[k]!);
  for (let x = -1 + step * Math.ceil((SKY_X[k]! + 1) / step); x < SKY_X[k + 1]!; x += step) {
    ctx.lineTo(x, base - u * frontHeight((x - cx) / u));
  }
  ctx.lineTo(SKY_X[k + 1]!, SKY_Y[k + 1]!);
  ctx.lineTo(HI_X[k + 1]!, HI_Y[k + 1]!);
  ctx.closePath();
}

/**
 * The front hills, made of their fields: three rows between the hedges, split by the walls
 * along the slopes, the top row cut to the skyline. Then the walls, the hedgerows and a few
 * round trees. No clip: every field is drawn to its exact shape.
 */
function patchwork(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const n = Math.min(MAX_HEDGES / 2 - 1, Math.ceil(s.cssW / 2 / u / FIELD_W) + 1);
  const count = n * 2 + 1;
  const span = FIELD_BOT - FIELD_TOP;
  for (let k = 0; k < count; k++) {
    const X = (k - n + 0.5) * FIELD_W;
    const h = frontHeight(X * 0.92);
    const hi = FRONT_BASE - h * UPPER_WALL;
    const lo = FRONT_BASE - h * LOWER_WALL;
    TOP_X[k] = cx + X * SLANT * u;
    BOT_X[k] = cx + X * u;
    const dx = BOT_X[k]! - TOP_X[k]!;
    HI_X[k] = TOP_X[k]! + (dx * (hi - FIELD_TOP)) / span;
    HI_Y[k] = hz + hi * u;
    LO_X[k] = TOP_X[k]! + (dx * (lo - FIELD_TOP)) / span;
    LO_Y[k] = hz + lo * u;
    // Where the hedge meets the skyline: a few steps of "the hedge's x at the skyline's height".
    let sx = HI_X[k]!;
    let sy = 0;
    for (let it = 0; it < 3; it++) {
      sy = FRONT_BASE - frontHeight((sx - cx) / u);
      sx = TOP_X[k]! + (dx * (sy - FIELD_TOP)) / span;
    }
    SKY_X[k] = sx;
    SKY_Y[k] = hz + sy * u;
  }
  const bot = hz + FIELD_BOT * u;
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = tone.fields[c]!;
    ctx.beginPath();
    for (let k = 0; k < count - 1; k++) {
      if (mod3(k) === c) topField(ctx, s, k);
      if (mod3(k + 2) === c) field(ctx, HI_X[k]!, HI_Y[k]!, HI_X[k + 1]!, HI_Y[k + 1]!, LO_X[k + 1]!, LO_Y[k + 1]!, LO_X[k]!, LO_Y[k]!);
      if (mod3(k + 1) === c) field(ctx, LO_X[k]!, LO_Y[k]!, LO_X[k + 1]!, LO_Y[k + 1]!, BOT_X[k + 1]!, bot, BOT_X[k]!, bot);
    }
    ctx.fill();
  }
  // Dry-stone walls along the slopes, pale.
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    if (k === 0) ctx.moveTo(HI_X[k]!, HI_Y[k]!);
    else ctx.lineTo(HI_X[k]!, HI_Y[k]!);
  }
  for (let k = 0; k < count; k++) {
    if (k === 0) ctx.moveTo(LO_X[k]!, LO_Y[k]!);
    else ctx.lineTo(LO_X[k]!, LO_Y[k]!);
  }
  ctx.strokeStyle = tone.wall;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "butt";
  ctx.stroke();
  // Hedgerows between the fields, dark, from the skyline down.
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    ctx.moveTo(SKY_X[k]!, SKY_Y[k]! + u * 0.002);
    ctx.lineTo(BOT_X[k]!, bot);
  }
  ctx.strokeStyle = tone.hedge;
  ctx.lineWidth = Math.max(1, u * 0.0045);
  ctx.stroke();
  // Round trees where hedge meets wall, out at the sides (none behind the tower).
  ctx.fillStyle = tone.hedge;
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    const X = (k - n + 0.5) * FIELD_W;
    if (Math.abs(X) < 0.3) continue;
    const r = u * 0.0095;
    if (k % 2) circle(ctx, LO_X[k]!, LO_Y[k]! - r * 0.7, r);
    else circle(ctx, HI_X[k]!, HI_Y[k]! - r * 0.7, r * 0.85);
  }
  ctx.fill();
}

function hills(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  // The back hills only need to reach the front hills' foot: everything below is covered.
  ctx.fillStyle = tone.hillBack;
  hillPath(ctx, s, hz + u * BACK_BASE, backHeight, Math.min(bottom, hz + u * (FRONT_BASE + 0.012)));
  ctx.fill();
  patchwork(ctx, s, tone);
}

// ---------------------------------------------------------------- sheep and the monastic site

/** Sheep grazing on the left hill: x (u from center), depth below the horizon (u). */
const FAR_SHEEP = [
  [-0.468, 0.04],
  [-0.447, 0.048],
  [-0.3, 0.036],
  [-0.276, 0.044],
] as const;

export function farSheep(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = tone.sheep;
  ctx.beginPath();
  for (const [X, d] of FAR_SHEEP) oval(ctx, cx + X * u, s.horizonY + d * u, u * 0.0085, u * 0.0055);
  ctx.fill();
}

/** The round tower on the left hilltop and the high cross on its slope (u from center). */
export const FAR_TOWER_X = -0.41;
export const CROSS_X = -0.34;

/**
 * An old monastic site on the left hilltop: a slim round tower, tapering a little, its lit side
 * and dark doorway, under a conical cap; and a high cross with its ring, on a stepped base.
 */
export function monastery(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  // The round tower: a tapering drum, lit on the left, a dark doorway halfway up and a window
  // under the cap; the cap a cone over a little eave, a shade darker.
  const x = cx + FAR_TOWER_X * u;
  const foot = frontTop(s, FAR_TOWER_X) + u * 0.008;
  const top = foot - u * 0.104;
  const hb = u * 0.0175;
  const ht = u * 0.014;
  const eave = ht * 1.22;
  const capH = u * 0.036;
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.moveTo(x - hb, foot);
  ctx.lineTo(x - ht, top);
  ctx.lineTo(x + ht, top);
  ctx.lineTo(x + hb, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.moveTo(x - hb * 0.66, foot);
  ctx.lineTo(x - ht * 0.66, top);
  ctx.lineTo(x - ht * 0.12, top);
  ctx.lineTo(x - hb * 0.12, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(x - eave, top + u * 0.003);
  ctx.lineTo(x - ht * 0.2, top - capH);
  ctx.quadraticCurveTo(x, top - capH - u * 0.003, x + ht * 0.2, top - capH);
  ctx.lineTo(x + eave, top + u * 0.003);
  ctx.closePath();
  archPath(ctx, x - u * 0.0042, top + u * 0.062, u * 0.0084, u * 0.016);
  archPath(ctx, x - u * 0.003, top + u * 0.016, u * 0.006, u * 0.011);
  ctx.fill();
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.moveTo(x - eave * 0.86, top + u * 0.001);
  ctx.lineTo(x - ht * 0.16, top - capH + u * 0.004);
  ctx.lineTo(x - ht * 0.02, top - capH + u * 0.004);
  ctx.lineTo(x - eave * 0.3, top + u * 0.001);
  ctx.closePath();
  ctx.fill();

  // The high cross: a stepped base, the shaft, the arms and the ring round their crossing.
  const kx = cx + CROSS_X * u;
  const kfoot = frontTop(s, CROSS_X) + u * 0.005;
  const shaft = u * 0.0085;
  const kTop = kfoot - u * 0.062;
  const armY = kTop + u * 0.016;
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.rect(kx - u * 0.011, kfoot - u * 0.009, u * 0.022, u * 0.009);
  ctx.rect(kx - shaft / 2, kTop, shaft, kfoot - kTop - u * 0.008);
  ctx.rect(kx - u * 0.019, armY - u * 0.004, u * 0.038, u * 0.0085);
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(kx - shaft / 2, kTop + u * 0.001, shaft * 0.4, kfoot - kTop - u * 0.01);
  // The ring round the crossing.
  ctx.strokeStyle = tone.stone;
  ctx.lineWidth = Math.max(1, u * 0.0034);
  ctx.beginPath();
  circle(ctx, kx, armY, u * 0.0105);
  ctx.stroke();
}

// ---------------------------------------------------------------- the stream and its bridge

/** The bridge's center (u from center) and half span; the stream runs out under it toward the left edge. */
export const BRIDGE_X = -0.33;
const BRIDGE_HW = 0.05;
/** Water level under the bridge, and the deck's ends and crown (u below the horizon). */
const WATER = FRONT_BASE + 0.018;
const DECK_END = FRONT_BASE + 0.002;
const DECK_TOP = FRONT_BASE - 0.017;
const ARCH_R = 0.018;

/**
 * The stream: out of the bridge's arch toward you, widening as it winds down and to the left,
 * until it drops out of sight behind the brow of the near meadow (drawn after it).
 */
function stream(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x = cx + BRIDGE_X * u;
  const w = hz + WATER * u;
  const out = hz + (NEAR_MEADOW + 0.03) * u;
  ctx.fillStyle = tone.water;
  ctx.beginPath();
  ctx.moveTo(x + u * 0.017, w - u * 0.004);
  ctx.bezierCurveTo(x + u * 0.03, w + u * 0.05, x - u * 0.03, w + u * 0.07, x - u * 0.06, out);
  ctx.lineTo(x - u * 0.145, out);
  ctx.bezierCurveTo(x - u * 0.09, w + u * 0.07, x - u * 0.03, w + u * 0.04, x - u * 0.017, w - u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.waterLit;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, w + u * 0.014);
  ctx.quadraticCurveTo(x - u * 0.004, w + u * 0.04, x - u * 0.03, w + u * 0.06);
  ctx.moveTo(x - u * 0.06, w + u * 0.08);
  ctx.lineTo(x - u * 0.08, w + u * 0.092);
  ctx.stroke();
}

/** A humpbacked stone bridge with one round arch, the stream showing through it. */
export function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x = cx + BRIDGE_X * u;
  const x0 = x - BRIDGE_HW * u;
  const x1 = x + BRIDGE_HW * u;
  const water = hz + WATER * u;
  const end = hz + DECK_END * u;
  const crown = hz + DECK_TOP * u;
  const r = ARCH_R * u;
  // Water seen through the arch.
  ctx.fillStyle = tone.water;
  ctx.fillRect(x - r, water - r, r * 2, r);
  // The bridge: deck curving over the top, the arch cut from its foot.
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.moveTo(x0, water);
  ctx.lineTo(x0, end);
  ctx.quadraticCurveTo(x, crown - (end - crown), x1, end);
  ctx.lineTo(x1, water);
  ctx.lineTo(x + r, water);
  ctx.arc(x, water, r, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // The shaded inside of the arch, and the lit parapet along the deck.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.arc(x, water, r, Math.PI, Math.PI * 2);
  ctx.arc(x, water, r * 0.82, Math.PI * 2, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.stoneLit;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.003, end + u * 0.002);
  ctx.quadraticCurveTo(x, crown - (end - crown) + u * 0.004, x1 - u * 0.003, end + u * 0.002);
  ctx.stroke();
}

// ---------------------------------------------------------------- meadow

/** Where the deeper green of the near meadow begins (u below the horizon). */
const NEAR_MEADOW = 0.21;

/** A wavy edge across the screen at `y` (continues the path, left to right). */
function rolling(ctx: Ctx, s: Scene, y: number, amp: number, f: number, ph: number): void {
  const u = s.u;
  for (let x = 0; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, y + u * amp * (Math.sin(X * f + ph) + 0.5 * Math.sin(X * f * 2.3 + ph * 1.7)));
    if (x > s.cssW) break;
  }
}

/** The meadow's far band, lighter, from the hedge at the hills' foot down under the near band. */
function meadowFar(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const y0 = hz + FRONT_BASE * u;
  ctx.fillStyle = tone.meadowFar;
  ctx.fillRect(0, y0, s.cssW, Math.max(0, Math.min(bottom, hz + u * (NEAR_MEADOW + 0.03)) - y0));
  // The hedge along the meadow's far edge: a band with a row of round bushes along its top.
  ctx.fillStyle = tone.hedge;
  ctx.beginPath();
  const step = u * 0.042;
  const x0 = s.cssW / 2 - step * Math.ceil(s.cssW / 2 / step) - step;
  ctx.moveTo(x0, y0 + u * 0.005);
  ctx.lineTo(x0, y0 - u * 0.002);
  for (let i = 0, x = x0; x < s.cssW + step; i++, x += step) {
    ctx.quadraticCurveTo(x + step / 2, y0 - u * (0.014 + hash(i + 6100) * 0.006), x + step, y0 - u * 0.002);
  }
  ctx.lineTo(s.cssW + step * 2, y0 + u * 0.005);
  ctx.closePath();
  ctx.fill();
}

/** The near band of the meadow, deeper green, its brow rolling; it stops under the wall in front, which covers the rest. */
function meadowNear(ctx: Ctx, s: Scene, bottom: number): void {
  const u = s.u;
  const near = Math.min(bottom, wallTop(s) + u * 0.01);
  ctx.fillStyle = MEADOW;
  ctx.beginPath();
  ctx.moveTo(0, near);
  rolling(ctx, s, s.horizonY + u * NEAR_MEADOW, 0.012, 5, 2.1);
  ctx.lineTo(s.cssW, near);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the cloud floor

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;

/**
 * The cloud floor: a row of cel-shaded puffs along its top, solid below. It stands still: it
 * runs right behind the tower, where nothing moves.
 */
function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = s.cssW / 2 + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
}

/** Everything on the horizon, back to front. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  if (hz - s.u * 0.2 < s.cssH && landShows(s, top)) {
    const bottom = Math.min(s.cssH, top + s.u * 0.12);
    hills(ctx, s, tone, bottom);
    farSheep(ctx, s, tone);
    monastery(ctx, s, tone);
    meadowFar(ctx, s, tone, bottom);
    stream(ctx, s, tone);
    bridge(ctx, s, tone);
    meadowNear(ctx, s, bottom);
  }
  if (top < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, top);
}

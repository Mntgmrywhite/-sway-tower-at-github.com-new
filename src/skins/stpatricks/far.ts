import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MEADOW } from "./colors";
import { wallTop } from "./front";
import { flock } from "./pasture";
import { archPath } from "./shapes";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon, in three depths. Furthest, the mountains: a hazy
// blue range all along the horizon, on the left a flat-topped mountain with fluted flanks, and
// on the right the holy mountain, a tall cone with the pilgrims' path zigzagging up its sunlit
// face to the little white chapel on its summit (St. Patrick's own mountain, in our own simple
// design). In front of them a back row of soft blue-green hills, then the emerald hills,
// quilted with a patchwork of fields (three greens) parted by dark hedgerows and pale
// dry-stone walls, a few round trees along the hedges, sheep grazing on the left slopes and
// two whitewashed farmhouses on the right. On the left hilltop an old monastic site: a slim
// round tower under its conical cap and a high cross with its ring. Below it a stream comes
// out under a little humpbacked stone bridge and winds away toward the middle, over the brow of
// the meadow the round tower stands on; the back pasture beyond the brow (hedged along its far
// edge) is where the flock frolics (pasture.ts).
// Above the start a floor of cloud gathers below you and covers the land: from then on its
// puffy top is the horizon, and only the mountain tops stand out of it. Then it sinks with them
// to rest low on the screen, and there it stays for good, a calm sea of cloud with the mountain
// tops standing out of it, for the sun to set into and rise out of on every turn of the story's
// loop (tone.ts). All of it is faded and flat, with no outline, and nothing here moves.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;

/**
 * The line the cloud floor lies along once it has gathered, and the mountains stand on: the
 * horizon while the land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  return horizon + (s.cssH - s.u * FLOOR_REST - horizon) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(16, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/**
 * The land below shows only until the cloud floor covers it (`top` is the floor's top edge);
 * once it has, it stays covered as the floor sinks to its rest.
 */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < DAY_HIGH && top > s.horizonY + s.u * 0.02;
}

/** The horizon the mountains stand on: the real one while the land shows, then the cloud floor's line as it sinks to rest. */
export function mountainHorizon(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/** Where the sky stops: below this the hills and meadow, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * BACK_BASE : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled behind the mountains at either side: [X (u from center), height above the horizon (u), radius (u)]. */
const BANK = [
  [-0.66, 0.15, 0.13],
  [-0.53, 0.2, 0.1],
  [-0.43, 0.14, 0.085],
  [-0.33, 0.11, 0.07],
  [-0.24, 0.07, 0.055],
  [0.2, 0.06, 0.05],
  [0.28, 0.1, 0.065],
  [0.44, 0.2, 0.09],
  [0.55, 0.17, 0.11],
  [0.68, 0.13, 0.13],
] as const;

/**
 * Soft white clouds piled along the horizon at either side, behind the mountains: the fair-
 * weather sky of an Irish spring, in the hour's cloud colors, a shaded body and lit caps.
 */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      // On a wider screen the banks keep to its sides.
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
    }
    if (pass === 0) {
      ctx.rect(-1, hz - u * 0.06, Math.max(0, Math.min(cx - u * 0.24, u * 0.26)) + 1, u * 0.12);
      ctx.rect(Math.max(cx + u * 0.2, s.cssW - u * 0.3), hz - u * 0.06, s.cssW, u * 0.12);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- mountains

/** The mountains' base line, u below the horizon (the back hills cover it). */
const MOUNT_BASE = 0.03;

/** The far range: a low hazy ridge all along the horizon (height above its base, u). */
function rangeHeight(X: number): number {
  return 0.085 + 0.03 * Math.sin(X * 6.3 + 0.7) + 0.018 * Math.sin(X * 13.1 + 2.1) + 0.01 * Math.sin(X * 29 + 0.3);
}

/** The flat-topped mountain on the left: its plateau, the gentle slope to its left, the steep prow on its right (X in u). */
const TABLE_L = -0.36;
const TABLE_R = -0.15;
const TABLE_H = 0.175;
const TABLE_FOOT_L = -0.62;
const TABLE_FOOT_R = -0.07;

function tableHeight(X: number): number {
  if (X <= TABLE_FOOT_L || X >= TABLE_FOOT_R) return 0;
  if (X < TABLE_L) {
    const k = (X - TABLE_FOOT_L) / (TABLE_L - TABLE_FOOT_L);
    return TABLE_H * (1 - (1 - k) * (1 - k)) * (0.98 + 0.02 * Math.sin(X * 40));
  }
  if (X <= TABLE_R) return TABLE_H + 0.003 * Math.sin(X * 60);
  const k = (X - TABLE_R) / (TABLE_FOOT_R - TABLE_R);
  return TABLE_H * (1 - k * k * (3 - 2 * k)) * (1 - 0.15 * k);
}

/** The holy mountain on the right: its peak (X in u) and height above the base; its flanks fall in a gentle concave curve. */
export const HOLY_X = 0.33;
const HOLY_H = 0.3;
const HOLY_HW = 0.32;

function holyHeight(X: number): number {
  const d = Math.abs(X - HOLY_X) / HOLY_HW;
  if (d >= 1) return 0;
  const k = 1 - d;
  return HOLY_H * k * k * (1.6 - 0.6 * k) * (X < HOLY_X ? 1 : 0.94);
}

/** A row of mountains along `height`, filled down to the base. */
function ridge(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, x0: number, x1: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(x0, base + 1);
  for (let x = x0; ; x += u * 0.012) {
    const X = (Math.min(x, x1) - cx) / u;
    ctx.lineTo(Math.min(x, x1), base - u * height(X));
    if (x >= x1) break;
  }
  ctx.lineTo(x1, base + 1);
  ctx.closePath();
}

/** Scratch for the chapel's place, so placing it allocates nothing. */
const CHAPEL = { x: 0, y: 0 };

/** Where the chapel stands on the holy mountain's summit (its foot). */
export function chapelAt(s: Scene): typeof CHAPEL {
  CHAPEL.x = s.cssW / 2 + HOLY_X * s.u;
  CHAPEL.y = mountainHorizon(s) + (MOUNT_BASE - HOLY_H) * s.u + s.u * 0.006;
  return CHAPEL;
}

/** The zigzag path up the holy mountain's lit face: [X, height] pairs from the foot to the summit. */
const PATH = [
  [0.236, 0.075],
  [0.266, 0.098],
  [0.25, 0.122],
  [0.284, 0.15],
  [0.27, 0.177],
  [0.302, 0.205],
  [0.29, 0.232],
  [0.314, 0.262],
  [0.326, 0.29],
] as const;

/**
 * The mountains: the hazy range, the flat-topped mountain with fluted flanks, and the holy
 * mountain, its sunlit left face, the pilgrims' path and the chapel at the top.
 */
export function mountains(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = mountainHorizon(s) + MOUNT_BASE * u;
  ctx.fillStyle = tone.mountainFar;
  ridge(ctx, s, base, rangeHeight, -1, s.cssW + 1);
  ctx.fill();
  // The flat-topped mountain, lit along its left slope, its fluted cliffs as darker gullies.
  const tl = Math.max(-1, cx + TABLE_FOOT_L * u);
  const tr = cx + TABLE_FOOT_R * u;
  ctx.fillStyle = tone.mountain;
  ridge(ctx, s, base, tableHeight, tl, tr);
  ctx.fill();
  ctx.fillStyle = tone.mountainLit;
  ctx.beginPath();
  ctx.moveTo(tl, base + 1);
  for (let x = tl; x <= cx + TABLE_L * u; x += u * 0.012) ctx.lineTo(x, base - u * tableHeight((x - cx) / u));
  ctx.lineTo(cx + TABLE_L * u, base - u * TABLE_H);
  ctx.lineTo(cx + (TABLE_L + 0.02) * u, base - u * TABLE_H * 0.55);
  ctx.quadraticCurveTo(cx + (TABLE_L - 0.08) * u, base - u * TABLE_H * 0.3, tl + u * 0.12, base + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.mountainFar;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const X = TABLE_L + 0.01 + i * 0.024;
    const top = TABLE_H - 0.018 - (i % 2) * 0.008;
    ctx.moveTo(cx + X * u, base - u * top);
    ctx.lineTo(cx + (X + 0.004) * u, base - u * (top - 0.05 - hash(i + 6400) * 0.03));
  }
  ctx.stroke();
  // The holy mountain: the cone, its sunlit left face, the path, the chapel.
  const hx = cx + HOLY_X * u;
  const hl = cx + (HOLY_X - HOLY_HW) * u;
  const hr = Math.min(s.cssW + 1, cx + (HOLY_X + HOLY_HW) * u);
  ctx.fillStyle = tone.mountain;
  ridge(ctx, s, base, holyHeight, hl, hr);
  ctx.fill();
  const peak = base - HOLY_H * u;
  ctx.fillStyle = tone.mountainLit;
  ctx.beginPath();
  ctx.moveTo(hx - u * 0.004, peak + u * 0.004);
  for (let X = HOLY_X - 0.01; X > HOLY_X - HOLY_HW; X -= 0.012) ctx.lineTo(cx + X * u, base - u * holyHeight(X));
  ctx.lineTo(hl, base + 1);
  ctx.lineTo(hx - u * 0.12, base + 1);
  ctx.quadraticCurveTo(hx - u * 0.03, base - u * 0.12, hx - u * 0.004, peak + u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.white;
  ctx.globalAlpha = 0.38;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < PATH.length; i++) {
    const [X, h] = PATH[i]!;
    if (i === 0) ctx.moveTo(cx + X * u, base - h * u);
    else ctx.lineTo(cx + X * u, base - h * u);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  chapel(ctx, s, tone);
}

/** The little white chapel on the summit: a gable end with a dark door, a pitched roof, a cross. */
function chapel(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const { x, y } = chapelAt(s);
  const w = u * 0.024;
  const h = u * 0.013;
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h, w, h);
  ctx.moveTo(x - w * 0.56, y - h);
  ctx.lineTo(x - w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.56, y - h);
  ctx.closePath();
  ctx.rect(x - u * 0.0012, y - h - u * 0.022, u * 0.0024, u * 0.012);
  ctx.rect(x - u * 0.0045, y - h - u * 0.018, u * 0.009, u * 0.0022);
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.56, y - h);
  ctx.lineTo(x - w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.56, y - h);
  ctx.closePath();
  archPath(ctx, x - w * 0.12, y, w * 0.24, h * 0.7);
  ctx.fill();
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

/** Whitewashed farmhouses on the right hill's fields: X (u from center), depth below the horizon (u), facing. */
const FARMS = [
  [0.305, 0.052, 1],
  [0.362, 0.03, -1],
] as const;

/** Two little whitewashed farmhouses on the right hill, dark slate roofs, a round tree by each. */
export function farmhouses(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const w = u * 0.026;
  const h = u * 0.011;
  ctx.fillStyle = tone.hedge;
  ctx.beginPath();
  for (const [X, d, m] of FARMS) {
    circle(ctx, cx + (X + m * 0.024) * u, s.horizonY + (d - 0.01) * u, u * 0.0095);
  }
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  for (const [X, d] of FARMS) ctx.rect(cx + X * u - w / 2, s.horizonY + d * u - h, w, h);
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  for (const [X, d, m] of FARMS) {
    const x = cx + X * u;
    const y = s.horizonY + d * u - h;
    ctx.moveTo(x - w * 0.56, y + u * 0.001);
    ctx.lineTo(x - w * 0.4, y - u * 0.008);
    ctx.lineTo(x + w * 0.4, y - u * 0.008);
    ctx.lineTo(x + w * 0.56, y + u * 0.001);
    ctx.closePath();
    // A chimney at one gable, a door and a window in the front.
    ctx.rect(x + m * w * 0.3 - u * 0.002, y - u * 0.012, u * 0.004, u * 0.005);
    ctx.rect(x - m * w * 0.18 - u * 0.0025, y + h * 0.35, u * 0.005, h * 0.65);
    ctx.rect(x + m * w * 0.15 - u * 0.002, y + h * 0.3, u * 0.004, u * 0.0035);
  }
  ctx.fill();
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
 * The stream: out of the bridge's arch toward you, widening as it winds down and to the right,
 * until it drops out of sight behind the brow of the near meadow (drawn after it), behind the
 * round tower, so the back pasture on the left stays all grass for the flock.
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
  ctx.moveTo(x - u * 0.017, w - u * 0.004);
  ctx.bezierCurveTo(x - u * 0.022, w + u * 0.05, x + u * 0.07, w + u * 0.07, x + u * 0.13, out);
  ctx.lineTo(x + u * 0.27, out);
  ctx.bezierCurveTo(x + u * 0.17, w + u * 0.08, x + u * 0.03, w + u * 0.045, x + u * 0.017, w - u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.waterLit;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + u * 0.002, w + u * 0.014);
  ctx.quadraticCurveTo(x + u * 0.006, w + u * 0.045, x + u * 0.05, w + u * 0.07);
  ctx.moveTo(x + u * 0.11, w + u * 0.1);
  ctx.lineTo(x + u * 0.15, w + u * 0.12);
  ctx.moveTo(x + u * 0.17, w + u * 0.155);
  ctx.lineTo(x + u * 0.2, w + u * 0.165);
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

/** Where the deeper green of the near meadow begins (u below the horizon); the back pasture lies beyond it. */
export const NEAR_MEADOW = 0.27;

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
/** Soft swells further down the floor, in rows repeating every SWELL_SPAN (u, nearer rows wider): x (fraction of a span), depth under the top (u), size (u). */
const SWELL_SPAN = 0.7;
const SWELL_ROWS = 3;
const SWELLS = Array.from({ length: 6 }, (_, i) => ({ x: hash(i + 6500), d: 0.1 + hash(i + 6510) * 0.12, r: 0.026 + hash(i + 6520) * 0.022 }));

/**
 * The cloud floor: a row of cel-shaded puffs along its top, solid below, with soft lit swells
 * further down. It stands still: it runs right behind the tower, where nothing moves. It is
 * drawn after everything on the land, the meadow round the round tower included, so as it
 * gathers it covers all of it (only the mountain tops stand out of it); the wall in front
 * stays in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
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
  // Swells: low mounds lit on top, in rows growing toward you down the floor (the lower rows
  // only show while it is still sinking to rest), soft against its shade. Centered, so both
  // edges match at any width.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cloudLight : tone.cloud;
    ctx.globalAlpha = pass ? 0.75 : 0.7;
    ctx.beginPath();
    for (let row = 0; row < SWELL_ROWS; row++) {
      const grow = 1 + row * 0.4;
      const span = u * SWELL_SPAN * grow;
      const reps = Math.ceil(s.cssW / 2 / span) + 1;
      for (let k = -reps; k < reps; k++) {
        for (const w of SWELLS) {
          const r = w.r * u * grow;
          const y = top + (w.d + row * 0.2 * grow) * u + u * 0.05;
          if (y - r > s.cssH) continue;
          const x = s.cssW / 2 + (k + w.x + row * 0.37) * span;
          const rx = r * (pass ? 1.2 : 2.2);
          const ry = r * (pass ? 0.22 : 0.5);
          const ex = x - (pass ? r * 0.35 : 0);
          const ey = y - (pass ? r * 0.2 : 0);
          ctx.moveTo(ex + rx, ey);
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI, true);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Everything on the horizon, back to front (the cloud floor over it is drawn later: `cloudFloor`). */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  // The mountains (and the clouds piled behind them) stand out of the cloud floor once it has covered the land.
  const mh = mountainHorizon(s);
  if (mh - s.u * 0.36 < s.cssH && top - s.u * 0.06 > mh + (MOUNT_BASE - HOLY_H) * s.u) {
    cloudBank(ctx, s, tone, mh);
    mountains(ctx, s, tone);
  }
  if (hz - s.u * 0.2 < s.cssH && landShows(s, top)) {
    const bottom = Math.min(s.cssH, top + s.u * 0.12);
    hills(ctx, s, tone, bottom);
    farSheep(ctx, s, tone);
    monastery(ctx, s, tone);
    farmhouses(ctx, s, tone);
    meadowFar(ctx, s, tone, bottom);
    stream(ctx, s, tone);
    bridge(ctx, s, tone);
    meadowNear(ctx, s, bottom);
    flock(ctx, s);
  }
}

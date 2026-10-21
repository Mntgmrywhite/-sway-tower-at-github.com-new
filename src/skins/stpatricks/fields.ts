import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import type { Tone } from "./tone";

// The hills between the meadow and the mountains, after the owner's photos: a back row of soft
// verdigris hills, then the emerald hills in front, quilted with a patchwork of bright spring
// fields (three greens) parted by dark hedgerows, dry-stone walls (rows of pale stones, dots of
// a pen) and wire fences on little posts, a few round trees, sheep dotted over the fields. On
// the right they come down to the bay (coast.ts). The detail lives out at the sides: behind the
// tower the hedges, walls and fences fade and no trees or sheep stand there.
//
// Positions are in u from the screen center, depths in u below the horizon (negative is up).

/** Half the tower's column (u from the center). */
const COLUMN = 0.21;
/** How much of the hedges and walls shows in the tower's column (the fences stop at it). */
const COLUMN_FADE = 0.35;
/** Polyline step along the hills (u). */
const HILL_STEP = 0.045;

/** The back hills' base line, u below the horizon: they stand along the bay's far shore too. */
export const BACK_BASE = 0.03;

function backHeight(X: number): number {
  return 0.09 * (0.6 + 0.3 * Math.sin(X * 4.1 + 1.3) + 0.16 * Math.sin(X * 9.7 + 0.4));
}

/** The front hills' base line (the meadow's far edge), u below the horizon. */
export const FRONT_BASE = 0.085;

function bump(X: number, c: number, w: number): number {
  const d = (X - c) / w;
  return Math.exp(-d * d);
}

/**
 * Height of the front hills at X (u from center): a big hill on the left where the castle
 * stands, low in the middle, and on the right falling away into the bay.
 */
function frontHeight(X: number): number {
  const fall = X > 0.1 ? Math.min(1, (X - 0.1) / 0.16) : 0;
  return 0.05 + 0.1 * bump(X, -0.4, 0.19) + 0.014 * Math.sin(X * 7.5 + 1.2) - 0.075 * fall * fall * (3 - 2 * fall);
}

/** Screen y of the front hills' top at X (u from center). */
export function frontTop(s: Scene, X: number): number {
  return s.horizonY + (FRONT_BASE - frontHeight(X)) * s.u;
}

/** A row of hills: the path along their tops, filled down to `bottom`, as a new path. */
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
/** The two walls that run along the slopes, as fractions of the hill height; a fence between them. */
const UPPER_WALL = 0.64;
const LOWER_WALL = 0.3;
const FENCE = 0.47;
/** Scratch corners of every hedge line: x at the top, where it crosses each wall and the fence (x, y), x at the foot. */
const MAX_HEDGES = 96;
const TOP_X = new Float64Array(MAX_HEDGES);
const HI_X = new Float64Array(MAX_HEDGES);
const HI_Y = new Float64Array(MAX_HEDGES);
const MID_X = new Float64Array(MAX_HEDGES);
const MID_Y = new Float64Array(MAX_HEDGES);
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

/** Lines between consecutive points of one row (xs, ys), the stretches in (`inside`) or out of the tower's column. */
function rowLines(ctx: Ctx, s: Scene, xs: Float64Array, ys: Float64Array, count: number, inside: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let k = 0; k < count - 1; k++) {
    const mid = (xs[k]! + xs[k + 1]!) / 2;
    if (Math.abs(mid - cx) < COLUMN * u !== inside) continue;
    ctx.moveTo(xs[k]!, ys[k]!);
    ctx.lineTo(xs[k + 1]!, ys[k + 1]!);
  }
}

/** Hedge `k`'s line, from the skyline down to the hills' foot, if it lies in (`inside`) or out of the tower's column. */
function hedgeLines(ctx: Ctx, s: Scene, count: number, bot: number, inside: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let k = 0; k < count; k++) {
    const mid = (SKY_X[k]! + BOT_X[k]!) / 2;
    if (Math.abs(mid - cx) < COLUMN * u !== inside) continue;
    ctx.moveTo(SKY_X[k]!, SKY_Y[k]! + u * 0.002);
    ctx.lineTo(BOT_X[k]!, bot);
  }
}

/** The wall stones' and fence posts' dash patterns (filled per frame), and none. */
const DOTS = [0, 0];
const POSTS = [0, 0];
const NO_DASH: number[] = [];

/** Where a hedge line crosses a line `frac` of the way up the hill at its own x (writes xs[k], ys[k]). */
function across(s: Scene, k: number, X: number, frac: number, span: number, xs: Float64Array, ys: Float64Array): void {
  const y = FRONT_BASE - frontHeight(X * 0.92) * frac;
  const dx = BOT_X[k]! - TOP_X[k]!;
  xs[k] = TOP_X[k]! + (dx * (y - FIELD_TOP)) / span;
  ys[k] = s.horizonY + y * s.u;
}

/**
 * The front hills, made of their fields: three rows between the hedges, split by the walls
 * along the slopes, the top row cut to the skyline. Then the walls (rows of pale stones), a
 * fence along the middle of the slopes (a fine wire on little posts), the hedgerows and a few
 * round trees, faded in the tower's column, and a fine contour along the skyline. No clip:
 * every field is drawn to its exact shape.
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
    TOP_X[k] = cx + X * SLANT * u;
    BOT_X[k] = cx + X * u;
    across(s, k, X, UPPER_WALL, span, HI_X, HI_Y);
    across(s, k, X, FENCE, span, MID_X, MID_Y);
    across(s, k, X, LOWER_WALL, span, LO_X, LO_Y);
    // Where the hedge meets the skyline: a few steps of "the hedge's x at the skyline's height".
    const dx = BOT_X[k]! - TOP_X[k]!;
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
  ctx.lineCap = "round";
  // The fence along the middle of the slopes, out at the sides: a fine wire, then its posts.
  ctx.strokeStyle = tone.fence;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(0.6, u * 0.0016);
  ctx.beginPath();
  rowLines(ctx, s, MID_X, MID_Y, count, false);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, u * 0.0042);
  POSTS[0] = u * 0.0001;
  POSTS[1] = u * 0.016;
  ctx.setLineDash(POSTS);
  ctx.stroke();
  // Dry-stone walls along the slopes: rows of pale stones, dots of a pen; faint behind the tower.
  ctx.strokeStyle = tone.wall;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  DOTS[0] = u * 0.0001;
  DOTS[1] = u * 0.0075;
  ctx.setLineDash(DOTS);
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass ? COLUMN_FADE : 1;
    ctx.beginPath();
    rowLines(ctx, s, HI_X, HI_Y, count, pass === 1);
    rowLines(ctx, s, LO_X, LO_Y, count, pass === 1);
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  // Hedgerows between the fields, dark, from the skyline down.
  ctx.strokeStyle = tone.hedge;
  ctx.lineWidth = Math.max(1, u * 0.005);
  ctx.lineCap = "butt";
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass ? COLUMN_FADE : 1;
    ctx.beginPath();
    hedgeLines(ctx, s, count, bot, pass === 1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The skyline's fine contour.
  ctx.beginPath();
  for (let x = -1; ; x += u * HILL_STEP) {
    const y = s.horizonY + u * (FRONT_BASE - frontHeight((x - cx) / u));
    if (x === -1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    if (x > s.cssW + 1) break;
  }
  ctx.strokeStyle = tone.hillLine;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.lineJoin = "round";
  ctx.stroke();
  // Round trees where hedge meets wall, out at the sides (none behind the tower).
  ctx.fillStyle = tone.hedge;
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    const X = (k - n + 0.5) * FIELD_W;
    if (Math.abs(X) < 0.3 || X > 0.1) continue;
    const r = u * 0.0105;
    if (k % 2) circle(ctx, LO_X[k]!, LO_Y[k]! - r * 0.7, r);
    else circle(ctx, HI_X[k]!, HI_Y[k]! - r * 0.7, r * 0.85);
  }
  ctx.fill();
}

/** The back hills (a fine contour along their tops) and the front hills' patchwork. */
export function hills(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  // The back hills only need to reach the front hills' foot: everything below is covered.
  hillPath(ctx, s, hz + u * BACK_BASE, backHeight, Math.min(bottom, hz + u * (FRONT_BASE + 0.012)));
  ctx.fillStyle = tone.hillBack;
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = tone.hillLine;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.stroke();
  ctx.globalAlpha = 1;
  patchwork(ctx, s, tone);
}

// ---------------------------------------------------------------- sheep on the hills

/** Sheep dotted over the fields on the left hill: x (u from center), depth below the horizon (u), facing. */
const FAR_SHEEP = [
  [-0.475, 0.052, 1],
  [-0.452, 0.06, -1],
  [-0.4, 0.038, 1],
  [-0.355, 0.064, 1],
  [-0.31, 0.046, -1],
  [-0.287, 0.062, 1],
  [-0.262, 0.04, -1],
] as const;

/** Sheep grazing on the left hill: white backs, a dark face at the front. */
export function farSheep(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = tone.sheep;
  ctx.beginPath();
  for (const [X, d] of FAR_SHEEP) oval(ctx, cx + X * u, s.horizonY + d * u, u * 0.0085, u * 0.0055);
  ctx.fill();
  ctx.fillStyle = tone.hillLine;
  ctx.beginPath();
  for (const [X, d, m] of FAR_SHEEP) circle(ctx, cx + (X + m * 0.0085) * u, s.horizonY + (d - 0.001) * u, u * 0.0032);
  ctx.fill();
}

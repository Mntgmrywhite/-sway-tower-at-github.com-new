import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLOCK_X0, BLOCK_X1, CORNICE } from "./boulevard";
import { dashes, heartPath, NO_DASH, scallopArc } from "./shapes";
import { landmarks, landmarksTop, PATH_PAD } from "./skyline";
import { sunPath } from "./sky";
import { DAY_HIGH, level, smooth, sunSideShow, type RowTone, type Tone } from "./tone";

// The far layer: Paris across the rooftops, layered deep to a hazy horizon the way the owner's
// photo shows it, in the warm light of the hour (tone.ts). Back to front: a far hill on the
// horizon with a white basilica of our own on it and a few far spires; then three rows of
// Haussmann blocks, each nearer row bigger, warmer and more detailed and each further one paler
// and bluer: honey limestone fronts with rows of tall windows (blue with the sky by day, lit
// one by one at dusk), lit ledges and iron balcony lines, blue-grey zinc mansard roofs with their
// dormers, chimney stacks with terracotta pots, here and there a corner pavilion under a steep
// roof or a little dome; between the far rows, in the right lane, a bronze lattice tower of our
// own design stands over the city (a rose-glass heart for its beacon) and, nearer, the top of a
// Ferris wheel turns slowly over the rooftops behind the café, lit at dusk; in the left lane a
// long straight avenue lined with round green trees runs from the boulevard's corner up into the
// distance to a gilded dome. The detail lives in the side lanes: behind the tower the rows are
// hazier, their windows a shade off the stone. Far things are flat and faded, with no outline.
// Nothing here moves but the wheel, out in the right lane.
//
// The left lane is the sun's: by day the sun hangs high over the dome and the avenue, and it only
// starts to set (tone.ts) once the evening mist has taken the far city (`mist`) and the cloud
// sea has risen to the boulevard's foot, so it only ever goes down into the cloud sea. Above the
// start, the sea of cloud gathers below you, drawn the Art Nouveau way: rows of scallops, far
// rows small and near rows big, in the hour's pastels, a fine contour along each row and a shell
// line in each big scallop. From then on its top is the land's line, which the lattice tower and
// the wheel stand on (`landLine`), and it sinks with them to rest low on the screen, and there it
// stays for good, a calm sea of cloud for the sun to set into and rise out of on every turn of the
// story's loop. Behind the tower it holds nothing: the boulevard's block went into the evening
// mist with the city (boulevard.ts), and Paris above the clouds stands in the side lanes (the end
// of this file, and skyline.ts).
//
// Positions are in u from the screen center, heights in u above the land's line.

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.24;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;

/**
 * The line the cloud floor lies along once it has gathered, and the boulevard stands on: the
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

/**
 * The line the boulevard, the lattice tower and the wheel (and above the clouds the lanes'
 * rooftops and landmarks) stand on: the horizon while the land shows, then the cloud floor's line
 * as it sinks to rest (and there it stays, so every turn of the loop looks the same).
 */
export function landLine(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;
/** How far under the land's line the city's nearest row reaches (u): the sky must reach it. */
const CITY_FOOT = 0.03;

/** Where the sky stops: below this the city and the boulevard, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * (CITY_FOOT + 0.01) : top + s.u * FLOOR_SOLID;
}

/** Whether the cloud floor is drawn (`top` is its top edge): once it is (nearly) up on screen. */
export function floorShows(s: Scene, top: number): boolean {
  return top < s.cssH + s.u * 0.15;
}

/**
 * How far the far city has gone into the evening mist, 0 clear to 1 gone: it fades as the cloud
 * sea comes up to the boulevard, gone just before the land is covered, and before the sun begins
 * to set over it (tone.ts).
 */
export function mist(s: Scene): number {
  return smooth(DAY_HIGH - 5, DAY_HIGH - 0.5, level(s));
}

// ---------------------------------------------------------------- the rows of blocks

/**
 * A row of Haussmann blocks: its base line, a storey's height and how many storeys its fronts
 * have, a window bay's width (u) and how many bays wide its blocks are, its roofs' height (u), and
 * how much detail. Every storey and every bay of a row is the same size, as on a real boulevard,
 * so each row's windows are drawn as dashed strokes, a floor of a block at a time.
 */
interface RowSpec {
  base: number;
  storey: number;
  f0: number;
  f1: number;
  bay: number;
  w0: number;
  w1: number;
  roof: number;
  /** 0: windows only (far); 1: shop fronts and lit ledges too; 2: and the iron balconies. */
  detail: number;
  seed: number;
}

/**
 * The three rows of the city, far to near; and (LANE) the rooftops of Paris that stand out of the
 * cloud sea in the side lanes once it has covered the land, their lower floors under it.
 */
const SPECS: readonly RowSpec[] = [
  { base: 0.29, storey: 0.0165, f0: 4, f1: 5, bay: 0.0165, w0: 4, w1: 7, roof: 0.024, detail: 0, seed: 1100 },
  { base: 0.175, storey: 0.0215, f0: 5, f1: 6, bay: 0.021, w0: 4, w1: 7, roof: 0.03, detail: 1, seed: 1200 },
  { base: -CITY_FOOT, storey: 0.03, f0: 6, f1: 7, bay: 0.026, w0: 4, w1: 6, roof: 0.034, detail: 2, seed: 1300 },
  { base: -0.08, storey: 0.03, f0: 5, f1: 7, bay: 0.026, w0: 4, w1: 6, roof: 0.04, detail: 2, seed: 1400 },
  { base: 0.0, storey: 0.021, f0: 6, f1: 9, bay: 0.021, w0: 4, w1: 7, roof: 0.03, detail: 0, seed: 1500 },
];
/** The lanes' rooftops: the near row, and a taller one behind it, paler with the distance. */
const LANE = 3;
const LANE_BACK = 4;

/** A block: its sides (u from center), the top of its front and the height of its roof over that (u above the land's line), its roof's kind, window bays and floors (none: a gap in the row). */
interface Block {
  x0: number;
  x1: number;
  /** Its foot, and the top of its front (u above the land's line). */
  base: number;
  top: number;
  roof: number;
  /** 0 a mansard; 1 a mansard with a little dome on its corner; 2 a corner pavilion under a steep roof. */
  kind: number;
  bays: number;
  floors: number;
  /** Chimney stacks on its roof: none, one or two. */
  stacks: number;
  /** Whether its right side shows in shade (its neighbor to the right is lower). */
  side: boolean;
  /** Whether it stands behind the tower, where the city stays quiet. */
  quiet: boolean;
  id: number;
}

/** Under the sun the far rows stand lower, down in the vista the avenue runs into: [x0, x1, row, base] (u). */
const DIPS = [
  [-0.5, -0.26, 0, 0.2],
  [-0.5, -0.26, 1, 0.1],
] as const;
/**
 * Where the rows keep lower, so nothing comes in the way (a block that cannot fit a storey under
 * its cap leaves a gap): under the setting sun every row stays below SUN_CAP; round the dome at
 * the avenue's end the two near rows keep below its drum; behind the lattice tower the far row
 * leaves a gap and the middle row keeps below its first platform. [x0, x1, row, cap] (u).
 */
const SUN_CAP = 0.3;
const CAPS = [
  [-0.5, -0.26, 0, SUN_CAP],
  [-0.5, -0.26, 1, 0.24],
  [-0.44, -0.33, 1, 0.19],
  [-0.48, -0.29, 2, 0.15],
  [0.35, 0.47, 0, 0.31],
  [0.33, 0.48, 1, 0.265],
] as const;

/** Half the band behind the tower (u), where the rows' windows are a shade off the stone. */
const QUIET = 0.22;
/** How far either side of the center the rows run (u): wide enough for a wide window. */
const SPAN = 1.6;

function capFor(row: number, x0: number, x1: number): number {
  let cap = Infinity;
  for (const [a, b, r, c] of CAPS) if (r === row && x1 > a && x0 < b) cap = Math.min(cap, c);
  return cap;
}

function rowBlocks(spec: RowSpec, row: number): Block[] {
  const out: Block[] = [];
  let x = -SPAN;
  for (let k = 0; x < SPAN; k++) {
    const h = (n: number) => hash(spec.seed + k * 7 + n);
    const bays = spec.w0 + Math.floor((spec.w1 - spec.w0 + 1) * h(0) * 0.999);
    const w = bays * spec.bay;
    const kindRoll = h(2);
    const kind = kindRoll < 0.1 ? 1 : kindRoll < 0.24 ? 2 : 0;
    const roof = spec.roof * (kind === 2 ? 1.7 : 1);
    // As many storeys as the row's range allows, fewer under a cap (the chimneys too); none if not one fits.
    const cap = capFor(row, x, x + w);
    let base = spec.base;
    for (const [a, b, r, d] of DIPS) if (r === row && x + w > a && x < b) base = Math.min(base, d);
    const fit = Math.floor((cap - roof - spec.roof * 0.55 - base) / spec.storey + 1e-9);
    const floors = Math.max(0, Math.min(spec.f0 + Math.floor((spec.f1 - spec.f0 + 1) * h(1) * 0.999), fit));
    out.push({
      x0: x,
      x1: x + w,
      base,
      top: base + floors * spec.storey,
      roof,
      kind,
      bays,
      floors,
      stacks: h(3) < 0.25 ? 0 : h(3) < 0.7 ? 1 : 2,
      side: false,
      quiet: x + w > -QUIET && x < QUIET,
      id: spec.seed + k,
    });
    x += w;
  }
  for (let i = 0; i + 1 < out.length; i++) {
    const a = out[i]!;
    const b = out[i + 1]!;
    a.side = a.floors > 0 && (b.floors === 0 || b.top + b.roof < a.top + a.roof - 0.004);
  }
  return out;
}

/** Where the lanes' rooftops begin either side of the center (u): clear of the tower's column. */
export const LANE_X = 0.27;

/**
 * The lanes' rooftops: blocks running out from LANE_X either side to the row's span, left to right
 * (none behind the tower). The innermost block of the left lane shows its shaded side to the gap.
 */
function laneBlocks(spec: RowSpec): Block[] {
  const out: Block[] = [];
  for (const side of [-1, 1]) {
    let x = LANE_X;
    for (let k = 0; x < SPAN; k++) {
      const h = (n: number) => hash(spec.seed + side * 500 + k * 7 + n);
      const bays = spec.w0 + Math.floor((spec.w1 - spec.w0 + 1) * h(0) * 0.999);
      const w = bays * spec.bay;
      const kindRoll = h(2);
      const kind = kindRoll < 0.12 ? 1 : kindRoll < 0.3 ? 2 : 0;
      const floors = spec.f0 + Math.floor((spec.f1 - spec.f0 + 1) * h(1) * 0.999);
      const x0 = side > 0 ? x : -x - w;
      out.push({
        x0,
        x1: x0 + w,
        base: spec.base,
        top: spec.base + floors * spec.storey,
        roof: spec.roof * (kind === 2 ? 1.7 : 1),
        kind,
        bays,
        floors,
        stacks: h(3) < 0.25 ? 0 : h(3) < 0.7 ? 1 : 2,
        side: false,
        quiet: false,
        id: spec.seed + side * 500 + k,
      });
      x += w;
    }
  }
  out.sort((a, b) => a.x0 - b.x0);
  for (let i = 0; i + 1 < out.length; i++) {
    const a = out[i]!;
    const b = out[i + 1]!;
    a.side = b.x0 > a.x1 + 1e-9 || b.top + b.roof < a.top + a.roof - 0.004;
  }
  return out;
}

const ROWS: readonly (readonly Block[])[] = SPECS.map((spec, i) => (i >= LANE ? laneBlocks(spec) : rowBlocks(spec, i)));

/**
 * How much faster than the land's line each row drops as the camera climbs (a fraction of its
 * `rise`): the nearer the row, the faster, so as you climb the rooftops of Paris fall away below
 * you, the near ones first, opening the view over the far ones.
 */
const DROP = [0, 0.025, 0.06, 0, 0] as const;

/** The line row k's heights are measured from on screen: the land's line, dropping with the climb. */
function rowLine(s: Scene, k: number): number {
  return landLine(s) + s.rise * DROP[k]!;
}

/** Whether a block stands wholly behind the boulevard's block (whose fronts hide it up to their cornice). */
function behindBlock(b: Block): boolean {
  return b.x0 >= BLOCK_X0 && b.x1 <= BLOCK_X1;
}

/**
 * Up to what height (u above the land's line) the lanes' rows are hidden, so no window, ledge or
 * balcony under it is drawn: the near row by the cloud sea (its scallops dip to 0.015 u over the
 * land's line), the back row by the near row in front of it as well (its fronts reach at least
 * BACK_COVER).
 */
const SEA_COVER = 0.02;
const BACK_COVER = 0.07;
function laneCover(k: number): number {
  return k === LANE ? SEA_COVER : k === LANE_BACK ? BACK_COVER : -Infinity;
}

/** Up to what height (u above the land's line) a block of row k is hidden: the city's behind the boulevard's block up to its cornice; the lanes' (`laneCover`). */
function coverOf(b: Block, k: number): number {
  if (k >= LANE) return laneCover(k);
  return behindBlock(b) ? CORNICE : -Infinity;
}
/** Scratch: which of a row's blocks on screen are wholly hidden this frame (1), by index. */
const HIDDEN = new Uint8Array(128);

/** Scratch: the first and last block of a row on screen this frame. */
const SEEN = { from: 0, to: 0 };

function seen(s: Scene, blocks: readonly Block[]): typeof SEEN {
  const lo = (-s.cssW / 2) / s.u - 0.05;
  const hi = (s.cssW / 2) / s.u + 0.05;
  let from = 0;
  while (from < blocks.length && blocks[from]!.x1 < lo) from++;
  let to = from;
  while (to < blocks.length && blocks[to]!.x0 < hi) to++;
  SEEN.from = from;
  SEEN.to = to;
  return SEEN;
}

/**
 * The windows of a row's blocks, one floor of a block at a time as a dashed stroke (one dash a
 * window), all of the row's in one stroke: the upper floors' tall windows (`shops` false) or the
 * ground floors' wider shop fronts. Behind the tower (`quiet`) only the blocks there, elsewhere
 * the rest. What the boulevard's block hides is left out.
 */
function windowRows(ctx: Ctx, s: Scene, k: number, color: string, quiet: boolean, shops: boolean): void {
  const spec = SPECS[k]!;
  const blocks = ROWS[k]!;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = rowLine(s, k);
  const bay = spec.bay * u;
  const fh = spec.storey * u;
  const ww = bay * (shops ? 0.66 : 0.46);
  const wh = fh * (shops ? 0.62 : 0.56);
  ctx.beginPath();
  for (let i = SEEN.from; i < SEEN.to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i] || b.quiet !== quiet || b.floors === 0) continue;
    const hidden = coverOf(b, k);
    for (let f = shops ? 0 : spec.detail > 0 ? 1 : 0; f < (shops ? 1 : b.floors); f++) {
      if (b.base + (f + 1) * spec.storey < hidden) continue;
      const y = hz - (b.base + (f + 1) * spec.storey) * u + fh * (shops ? 0.3 : 0.26) + wh / 2;
      ctx.moveTo(cx + b.x0 * u + (bay - ww) / 2, y);
      ctx.lineTo(cx + b.x1 * u, y);
    }
  }
  ctx.setLineDash(dashes(ww, bay - ww));
  ctx.lineCap = "butt";
  ctx.lineWidth = wh;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
}

/**
 * One row of blocks, batched color by color: the limestone fronts, their sunlit left edges and
 * the shaded right sides where a lower neighbor shows them, the ledges and the cornice, the
 * windows (a shade off the stone behind the tower), the balconies, the zinc roofs with a lit
 * slope, the dormers and the chimney stacks with their pots, and the windows lit at dusk.
 */
function row(ctx: Ctx, s: Scene, k: number, rt: RowTone, lights: number, keep?: (b: Block) => boolean): void {
  const spec = SPECS[k]!;
  const blocks = ROWS[k]!;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = rowLine(s, k);
  const { from, to } = seen(s, blocks);
  const X = (x: number) => cx + x * u;
  const Y = (h: number) => hz - h * u;
  // (What the boulevard's block hides wholly is left out: the near row's blocks behind it; and
  // the blocks `keep` leaves out.)
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    HIDDEN[i] = b.floors === 0 || (k === 2 && behindBlock(b)) || (keep !== undefined && !keep(b)) ? 1 : 0;
  }
  // The fronts.
  ctx.fillStyle = rt.stone;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    ctx.rect(X(b.x0), Y(b.top), (b.x1 - b.x0) * u + 0.5, Y(b.base) - Y(b.top) + 1);
  }
  ctx.fill();
  // Shade: the right side of a block over a lower neighbor, and the shadow under each cornice.
  const corn = u * (0.004 + spec.detail * 0.0015);
  ctx.fillStyle = rt.shade;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    ctx.rect(X(b.x0), Y(b.top), (b.x1 - b.x0) * u, corn);
    if (b.side) ctx.rect(X(b.x1) - u * 0.006, Y(b.top) + corn, u * 0.006, Y(b.base) - Y(b.top) - corn);
  }
  ctx.fill();
  // Sunlit: each block's left edge, its cornice's top, and (nearer rows) a ledge under every window row.
  ctx.fillStyle = rt.stoneLit;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    const w = (b.x1 - b.x0) * u;
    ctx.rect(X(b.x0), Y(b.top), Math.max(1, u * 0.004), Y(b.base) - Y(b.top));
    ctx.rect(X(b.x0), Y(b.top) - u * 0.002, w, u * 0.003);
    if (spec.detail > 0 && !b.quiet) {
      const cover = laneCover(k);
      for (let f = 1; f < b.floors; f++) {
        if (b.base + f * spec.storey < cover) continue;
        ctx.rect(X(b.x0), Y(b.base + f * spec.storey) - u * 0.0015, w, Math.max(0.8, u * 0.0022));
      }
    }
  }
  ctx.fill();
  // The windows: tall French windows in every bay of every floor (the ground floor's shop fronts
  // wider and lower), blue with the sky; a shade off the stone behind the tower.
  windowRows(ctx, s, k, rt.glass, false, false);
  if (spec.detail > 0) windowRows(ctx, s, k, rt.glass, false, true);
  windowRows(ctx, s, k, rt.quietGlass, true, false);
  if (spec.detail > 0) windowRows(ctx, s, k, rt.quietGlass, true, true);
  // The iron balconies along the second floor and the top floor.
  if (spec.detail > 1) {
    ctx.fillStyle = rt.balcony;
    ctx.beginPath();
    for (let i = from; i < to; i++) {
      const b = blocks[i]!;
      if (HIDDEN[i] || b.quiet) continue;
      for (const f of [2, b.floors - 1]) {
        if (f < 1 || f >= b.floors || b.base + f * spec.storey < laneCover(k)) continue;
        const y = Y(b.base + f * spec.storey);
        ctx.rect(X(b.x0) + u * 0.003, y - u * 0.0075, (b.x1 - b.x0) * u - u * 0.006, Math.max(0.8, u * 0.0028));
      }
    }
    ctx.fill();
  }
  roofs(ctx, s, k, rt, from, to);
  // The windows lit at dusk, one by one (each its own moment, by its hash; a third stay dark).
  if (lights > 0.02) {
    ctx.fillStyle = rt.lit;
    const alpha = ctx.globalAlpha;
    for (let pass = 0; pass < 2; pass++) {
      const quiet = pass === 1;
      ctx.globalAlpha = alpha * (quiet ? 0.45 : 1);
      ctx.beginPath();
      for (let i = from; i < to; i++) {
        const b = blocks[i]!;
        if (HIDDEN[i] || b.quiet !== quiet) continue;
        litWindows(ctx, s, b, spec, hz, lights, coverOf(b, k));
      }
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
  }
}

/** The windows of a block lit at this point of the dusk, as subpaths: each comes on at its own moment as `lights` goes from 0 to 1, and a third stay dark. */
function litWindows(ctx: Ctx, s: Scene, b: Block, spec: RowSpec, hz: number, lights: number, hidden: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const bay = spec.bay * u;
  const fh = spec.storey * u;
  for (let f = 0; f < b.floors; f++) {
    if (b.base + (f + 1) * spec.storey < hidden) continue;
    const shop = f === 0 && spec.detail > 0;
    const ww = bay * (shop ? 0.66 : 0.46);
    const wh = fh * (shop ? 0.62 : 0.56);
    const y = hz - (b.base + (f + 1) * spec.storey) * u + fh * (shop ? 0.3 : 0.26);
    for (let j = 0; j < b.bays; j++) {
      const r = hash(b.id * 31 + f * 7 + j);
      if (r > 0.66 || r * 1.5 > lights) continue;
      ctx.rect(cx + b.x0 * u + bay * j + (bay - ww) / 2, y, ww, wh);
    }
  }
}

/**
 * The row's roofs: the zinc mansards (their lower slope steep, a flat top), a lit slope on the
 * sun's side; the corner pavilions' steep roofs with a crest, the little corner domes; the
 * dormers in the mansards; the chimney stacks with their pots.
 */
function roofs(ctx: Ctx, s: Scene, k: number, rt: RowTone, from: number, to: number): void {
  const spec = SPECS[k]!;
  const blocks = ROWS[k]!;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = rowLine(s, k);
  const X = (x: number) => cx + x * u;
  const Y = (h: number) => hz - h * u;
  const over = u * 0.003;
  // The roofs' bodies.
  ctx.fillStyle = rt.zinc;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    const x0 = X(b.x0) - over;
    const x1 = X(b.x1) + over;
    const y0 = Y(b.top);
    const y1 = Y(b.top + b.roof);
    const inset = b.roof * u * (b.kind === 2 ? 0.55 : 0.3);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + inset, y1);
    ctx.lineTo(x1 - inset, y1);
    ctx.lineTo(x1, y0);
    ctx.closePath();
    if (b.kind === 1) circle(ctx, x1 - u * 0.012, y1, u * 0.011);
  }
  ctx.fill();
  // The lit slope at each roof's left end, and the lit ridge along its top.
  ctx.fillStyle = rt.zincLit;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    const x0 = X(b.x0) - over;
    const y0 = Y(b.top);
    const y1 = Y(b.top + b.roof);
    const inset = b.roof * u * (b.kind === 2 ? 0.55 : 0.3);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + inset, y1);
    ctx.lineTo(x0 + inset + u * 0.006, y1);
    ctx.lineTo(x0 + u * 0.006, y0);
    ctx.closePath();
    ctx.rect(x0 + inset, y1, X(b.x1) - X(b.x0) - inset * 2 + over * 2, Math.max(0.8, u * 0.002));
    if (b.kind === 1) circle(ctx, X(b.x1) - u * 0.015, y1 - u * 0.004, u * 0.004);
  }
  ctx.fill();
  // Dormers: a little stone front with a window in each bay of the mansard (not on a pavilion;
  // on the far row only the stone fronts), dashed along each roof like the windows.
  const bay = spec.bay * u;
  const rh = spec.roof * u;
  for (let pass = 0; pass < (spec.detail > 0 ? 2 : 1); pass++) {
    ctx.beginPath();
    for (let i = from; i < to; i++) {
      const b = blocks[i]!;
      if (HIDDEN[i] || b.kind === 2) continue;
      const y = Y(b.top) - rh * (pass ? 0.38 : 0.42);
      ctx.moveTo(X(b.x0) + bay * (pass ? 0.37 : 0.25), y);
      ctx.lineTo(X(b.x1), y);
    }
    ctx.setLineDash(pass ? dashes(bay * 0.26, bay * 0.74) : dashes(bay * 0.5, bay * 0.5));
    ctx.lineCap = "butt";
    ctx.lineWidth = rh * (pass ? 0.34 : 0.6);
    ctx.strokeStyle = pass ? rt.glass : rt.stoneLit;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  // The pavilions' crests: a slim dark line along the top.
  ctx.fillStyle = rt.zincShade;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i] || b.kind !== 2) continue;
    const inset = b.roof * u * 0.55;
    const y1 = Y(b.top + b.roof);
    ctx.rect(X(b.x0) + inset - over, y1 - u * 0.004, X(b.x1) - X(b.x0) - inset * 2 + over * 2, u * 0.004);
  }
  ctx.fill();
  // Chimney stacks at the party walls, and their pots.
  const sw = u * (0.006 + spec.detail * 0.002);
  const sh = rh * 0.55;
  ctx.fillStyle = rt.stone;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    for (let n = 0; n < b.stacks; n++) {
      const x = n === 0 ? X(b.x0) + u * 0.012 : X(b.x1) - u * 0.012 - sw * 1.6;
      ctx.rect(x, Y(b.top + b.roof) - sh, sw * 1.6, sh + b.roof * u * 0.5);
    }
  }
  ctx.fill();
  // (The far row's pots and dormer windows would be specks: left out.)
  if (spec.detail === 0) return;
  ctx.fillStyle = rt.pot;
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const b = blocks[i]!;
    if (HIDDEN[i]) continue;
    for (let n = 0; n < b.stacks; n++) {
      const x = n === 0 ? X(b.x0) + u * 0.012 : X(b.x1) - u * 0.012 - sw * 1.6;
      const y = Y(b.top + b.roof) - sh;
      for (let p = 0; p < 2; p++) ctx.rect(x + sw * (0.15 + p * 0.8), y - sh * 0.35, sw * 0.55, sh * 0.35);
    }
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the far hill and its basilica

/** The far hill: its center, half width and height (u); the basilica on its top. */
const HILL_X = -0.03;
const HILL_HW = 0.2;
const HILL_TOP = 0.375;

/**
 * The far hill on the horizon, faded lilac, and on its top a white basilica of our own: a tall
 * egg-shaped dome on a drum between two little domes, a slim bell tower behind; and a few far
 * spires along the horizon. Flat, no outline, hazy behind the tower.
 */
function farHill(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + HILL_X * u;
  const hz = landLine(s);
  const base = hz - SPECS[0]!.base * u;
  const top = hz - HILL_TOP * u;
  ctx.fillStyle = tone.hillFar;
  ctx.beginPath();
  ctx.moveTo(cx - HILL_HW * u, base + u * 0.01);
  ctx.bezierCurveTo(cx - HILL_HW * u * 0.55, base - u * 0.02, cx - HILL_HW * u * 0.4, top, cx, top);
  ctx.bezierCurveTo(cx + HILL_HW * u * 0.4, top, cx + HILL_HW * u * 0.55, base - u * 0.02, cx + HILL_HW * u, base + u * 0.01);
  ctx.closePath();
  // Far spires along the horizon either side.
  for (const [X, h, w] of SPIRES) {
    const x = s.cssW / 2 + X * u;
    ctx.rect(x - w * u, hz - (SPECS[0]!.base + 0.05) * u, w * 2 * u, u * 0.05);
    ctx.moveTo(x - w * u * 1.1, hz - (SPECS[0]!.base + 0.05) * u);
    ctx.lineTo(x, hz - h * u);
    ctx.lineTo(x + w * u * 1.1, hz - (SPECS[0]!.base + 0.05) * u);
    ctx.closePath();
  }
  ctx.fill();
  // The basilica: the bell tower behind, the drum and the big dome, the two little domes, the porch.
  const b = top + u * 0.004;
  ctx.fillStyle = tone.basilicaShade;
  ctx.beginPath();
  ctx.rect(cx + u * 0.03, b - u * 0.075, u * 0.012, u * 0.075);
  ctx.moveTo(cx + u * 0.028, b - u * 0.075);
  ctx.lineTo(cx + u * 0.036, b - u * 0.088);
  ctx.lineTo(cx + u * 0.044, b - u * 0.075);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.basilica;
  ctx.beginPath();
  ctx.rect(cx - u * 0.045, b - u * 0.022, u * 0.09, u * 0.024);
  ctx.rect(cx - u * 0.016, b - u * 0.04, u * 0.032, u * 0.02);
  dome(ctx, cx, b - u * 0.04, u * 0.017, u * 0.032);
  dome(ctx, cx - u * 0.03, b - u * 0.022, u * 0.009, u * 0.016);
  dome(ctx, cx + u * 0.03, b - u * 0.022, u * 0.009, u * 0.016);
  ctx.rect(cx - u * 0.0015, b - u * 0.08, u * 0.003, u * 0.01);
  ctx.fill();
  ctx.fillStyle = tone.basilicaShade;
  ctx.beginPath();
  ctx.rect(cx + u * 0.004, b - u * 0.04, u * 0.012, u * 0.02);
  ctx.rect(cx - u * 0.045, b - u * 0.006, u * 0.09, u * 0.008);
  for (let i = 0; i < 5; i++) ctx.rect(cx - u * 0.036 + i * u * 0.017, b - u * 0.018, u * 0.006, u * 0.01);
  ctx.fill();
}

/** Far spires on the horizon: [X (u from center), tip height (u above the land's line), half width (u)]. */
const SPIRES = [
  [-0.2, 0.43, 0.008],
  [0.165, 0.45, 0.009],
  [0.24, 0.42, 0.006],
] as const;

/** An onion-free dome as its own subpath: a drum-top at y, half width w, rising h, with a pointed crown. */
function dome(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.05, y - h * 0.55, x - w * 0.45, y - h * 0.9, x, y - h);
  ctx.bezierCurveTo(x + w * 0.45, y - h * 0.9, x + w * 1.05, y - h * 0.55, x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- the gilded dome at the avenue's end

/** The dome: its axis (u from center), the foot of its drum, the drum's top, the dome's top and the lantern's tip (u above the land's line). */
const DOME_X = -0.384;
const DRUM_FOOT = 0.196;
const DRUM_TOP = 0.242;
const DOME_TOP = 0.284;
const LANTERN_TIP = SUN_CAP;
const DRUM_HW = 0.025;
const DOME_HW = 0.028;

/**
 * A gilded dome of our own on a colonnaded drum, standing at the end of the avenue under the
 * sun: the drum's columns (lit and shaded) and its windows, a balustrade, the gilded dome with
 * its ribs and a lit flank, a little lantern and its spike.
 */
function gildedDome(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + DOME_X * u;
  const hz = landLine(s);
  const foot = hz - DRUM_FOOT * u;
  const dt = hz - DRUM_TOP * u;
  const top = hz - DOME_TOP * u;
  const w = DRUM_HW * u;
  // The drum, its shaded right half and its columns.
  ctx.fillStyle = tone.drum;
  ctx.fillRect(x - w, dt, w * 2, foot - dt);
  ctx.fillStyle = tone.drumShade;
  ctx.beginPath();
  ctx.rect(x + w * 0.35, dt, w * 0.65, foot - dt);
  ctx.rect(x - w * 1.12, dt - u * 0.004, w * 2.24, u * 0.006);
  for (let i = 0; i < 6; i++) ctx.rect(x - w * 0.86 + i * w * 0.34, dt + u * 0.012, w * 0.12, foot - dt - u * 0.018);
  ctx.fill();
  ctx.fillStyle = tone.rows[1]!.glass;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.rect(x - w * 0.72 + i * w * 0.34, dt + u * 0.02, w * 0.14, u * 0.02);
  ctx.fill();
  // The dome, lit on its left flank, ribbed.
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  dome(ctx, x, dt - u * 0.004, DOME_HW * u, dt - top - u * 0.004);
  ctx.fill();
  ctx.fillStyle = tone.giltLit;
  ctx.beginPath();
  ctx.moveTo(x - DOME_HW * u, dt - u * 0.004);
  ctx.bezierCurveTo(x - DOME_HW * u * 1.05, dt - (dt - top) * 0.55, x - DOME_HW * u * 0.45, top + (dt - top) * 0.06, x - u * 0.004, top + u * 0.002);
  ctx.bezierCurveTo(x - DOME_HW * u * 0.4, dt - (dt - top) * 0.6, x - DOME_HW * u * 0.5, dt - u * 0.01, x - DOME_HW * u * 0.45, dt - u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.giltShade;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const k of [-0.55, 0, 0.55]) {
    ctx.moveTo(x + k * DOME_HW * u, dt - u * 0.005);
    ctx.quadraticCurveTo(x + k * DOME_HW * u * 0.9, top + (dt - top) * 0.25, x, top + u * 0.003);
  }
  ctx.stroke();
  // The lantern and its spike.
  ctx.fillStyle = tone.drum;
  ctx.fillRect(x - u * 0.006, top - u * 0.012, u * 0.012, u * 0.013);
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  dome(ctx, x, top - u * 0.011, u * 0.007, u * 0.005);
  ctx.moveTo(x - u * 0.0015, top - u * 0.015);
  ctx.lineTo(x, hz - LANTERN_TIP * u);
  ctx.lineTo(x + u * 0.0015, top - u * 0.015);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the avenue

/** The avenue: its near end on the land's line (u from center, left and right edges), and its far end at the dome's foot (center, height). */
const AVE_L = -0.43;
const AVE_R = -0.296;
const AVE_FAR_X = -0.384;
const AVE_FAR = DRUM_FOOT + 0.004;
/** Trees along each side, near to far, and the nearest crown's radius (u). */
const TREES = 14;
const CROWN = 0.034;
/** How high each crown's center stands over its tree's foot, and its trunk's width (crown radii): the trunk shows under the crown. */
const CROWN_UP = 1.7;
const TRUNK_W = 0.24;

/** Where along the avenue (0 near .. 1 at its far end) the k-th tree stands, in perspective. */
function treeAt(k: number): number {
  const z = 1 + k * 0.4;
  const zFar = 1 + TREES * 0.4;
  return (1 - 1 / z) / (1 - 1 / zFar);
}

/**
 * The long straight avenue running from the boulevard's corner up into the distance to the
 * gilded dome: its roadway narrowing to the dome's foot, lined each side with round green trees
 * on their trunks that grow smaller with the distance, lit on the sun's side. The nearest stand
 * on the boulevard's pavement, their crowns clear of it.
 */
function avenue(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const fx = cx + AVE_FAR_X * u;
  const fy = hz - AVE_FAR * u;
  // The roadway.
  ctx.fillStyle = tone.road;
  ctx.beginPath();
  ctx.moveTo(cx + AVE_L * u, hz + u * 0.002);
  ctx.lineTo(fx - u * 0.003, fy);
  ctx.lineTo(fx + u * 0.003, fy);
  ctx.lineTo(cx + AVE_R * u, hz + u * 0.002);
  ctx.closePath();
  ctx.fill();
  // The trees, far ones first so the near ones stand in front: trunk, shade, body, lit, as four fills.
  const fills = [tone.trunk, tone.treeShade, tone.tree, tone.treeLit];
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = fills[c]!;
    ctx.beginPath();
    for (let k = TREES - 1; k >= 0; k--) {
      const q = treeAt(k);
      const r = (CROWN * u) / (1 + k * 0.4);
      if (c === 3 && k > TREES / 2) continue;
      const y = hz + (fy - hz) * q;
      for (let side = -1; side <= 1; side += 2) {
        const x0 = side < 0 ? cx + AVE_L * u : cx + AVE_R * u;
        const x = x0 + (fx + side * u * 0.004 - x0) * q;
        const ty = y - r * CROWN_UP;
        if (c === 0) ctx.rect(x - r * TRUNK_W * 0.5, ty, r * TRUNK_W, y - ty);
        else if (c === 1) circle(ctx, x + r * 0.12, ty + r * 0.1, r);
        else if (c === 2) circle(ctx, x - r * 0.04, ty - r * 0.02, r * 0.86);
        else circle(ctx, x - r * 0.3, ty - r * 0.32, r * 0.42);
      }
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the lattice tower

/** The lattice tower: its axis (u from center), and its profile, [height above the land's line, half width] (u), foot to top. */
const TOWER_X = 0.405;
const LEG_FOOT = 0.075;
const PLATFORM1 = 0.262;
const PLATFORM1_HW = 0.04;
const PLATFORM2 = 0.355;
const PLATFORM2_HW = 0.02;
const TOP = 0.452;
const TOP_HW = 0.006;
/** The beacon's heart and the mast's tip over it (u above the land's line). */
const BEACON = 0.462;
const TOWER_TIP = 0.482;

/**
 * Above the clouds the lattice tower and the wheel stand grander (the owner's "big bold"): as the
 * cloud sea sinks to its rest (from DAY_HIGH to FLOOR_SETTLED) they grow by these factors, the
 * tower's foot going down into the sea so its legs still fit the lane on a phone, and both move a
 * little out into the lane, clear of the tower's column.
 */
const TOWER_GROW = 1.35;
const TOWER_SINK = 0.05;
const TOWER_X_HIGH = 0.395;
const WHEEL_GROW = 1.2;
const WHEEL_X_HIGH = 0.362;

/** How far the lattice tower and the wheel have grown, 0 at the start to 1 above the clouds. */
function grown(s: Scene): number {
  return smooth(DAY_HIGH, FLOOR_SETTLED, level(s));
}

/** Scratch for the lattice tower's place, so placing it allocates nothing. */
const TOWER_AT = { x: 0, hz: 0, u: 0 };

/** Where the lattice tower stands: its axis and its foot's line (px), and how many px a u of its drawing is. */
function towerAt(s: Scene): typeof TOWER_AT {
  const g = grown(s);
  TOWER_AT.u = s.u * (1 + (TOWER_GROW - 1) * g);
  TOWER_AT.x = s.cssW / 2 + (TOWER_X + (TOWER_X_HIGH - TOWER_X) * g) * s.u;
  TOWER_AT.hz = landLine(s) + TOWER_SINK * g * s.u;
  return TOWER_AT;
}

/** Half the tower's width at a height: each section narrows fast above its foot and slower toward its top (concave, like a hanging chain). */
function towerHW(h: number): number {
  const ease = (a: number, b: number, k: number) => b + (a - b) * (1 - k) * (1 - k);
  if (h <= PLATFORM1) return ease(LEG_FOOT, PLATFORM1_HW, h / PLATFORM1);
  if (h <= PLATFORM2) return ease(PLATFORM1_HW * 0.86, PLATFORM2_HW, (h - PLATFORM1) / (PLATFORM2 - PLATFORM1));
  return ease(PLATFORM2_HW * 0.82, TOP_HW, Math.min(1, (h - PLATFORM2) / (TOP - PLATFORM2)));
}

/** One side of the tower's silhouette from height h0 to h1 (continues the path), `side` -1 left, 1 right. */
function towerEdge(ctx: Ctx, x: number, hz: number, u: number, h0: number, h1: number, side: number): void {
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const h = h0 + ((h1 - h0) * i) / n;
    ctx.lineTo(x + side * towerHW(h) * u, hz - h * u);
  }
}

/**
 * A bronze lattice tower of our own standing over the city in the right lane: two legs curving
 * up under a great arch to the first platform, a tapering section to the second, and a long
 * slender spire to the top, where a lantern holds a rose-glass heart for a beacon. Lattice is
 * cross-bracing in the shade's bronze; its sunward edges are lit. At dusk its lamps come on
 * along its edges and platforms, and the heart glows: steady, no light show.
 */
export function latticeTower(ctx: Ctx, s: Scene, tone: Tone): void {
  const { x, hz, u } = towerAt(s);
  // The silhouette: up the left side, round the top, down the right, less the arch between the legs.
  ctx.fillStyle = tone.bronze;
  ctx.beginPath();
  ctx.moveTo(x - LEG_FOOT * u, hz + u * 0.01);
  towerEdge(ctx, x, hz, u, 0, PLATFORM1, -1);
  towerEdge(ctx, x, hz, u, PLATFORM1, PLATFORM2, -1);
  towerEdge(ctx, x, hz, u, PLATFORM2, TOP, -1);
  towerEdge(ctx, x, hz, u, TOP, PLATFORM2, 1);
  towerEdge(ctx, x, hz, u, PLATFORM2, PLATFORM1, 1);
  towerEdge(ctx, x, hz, u, PLATFORM1, 0, 1);
  ctx.lineTo(x + LEG_FOOT * u, hz + u * 0.01);
  // The arch: from the legs' inner feet up to its crown under the first platform.
  const ia = LEG_FOOT * 0.55;
  ctx.lineTo(x + ia * u, hz + u * 0.01);
  ctx.bezierCurveTo(x + ia * u, hz - PLATFORM1 * 0.55 * u, x + u * 0.012, hz - (PLATFORM1 - 0.03) * u, x, hz - (PLATFORM1 - 0.028) * u);
  ctx.bezierCurveTo(x - u * 0.012, hz - (PLATFORM1 - 0.03) * u, x - ia * u, hz - PLATFORM1 * 0.55 * u, x - ia * u, hz + u * 0.01);
  ctx.closePath();
  ctx.fill();
  // The lattice: cross-bracing in each section, a row of X's up the legs and the spire.
  ctx.strokeStyle = tone.bronzeShade;
  ctx.lineWidth = Math.max(0.7, u * 0.0018);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  const step = 0.026;
  for (let h = PLATFORM1 + 0.004; h + step < TOP - 0.01; h += step) {
    const w0 = towerHW(h) * u * 0.7;
    const w1 = towerHW(h + step) * u * 0.7;
    const y0 = hz - h * u;
    const y1 = hz - (h + step) * u;
    ctx.moveTo(x - w0, y0);
    ctx.lineTo(x + w1, y1);
    ctx.moveTo(x + w0, y0);
    ctx.lineTo(x - w1, y1);
  }
  for (let h = 0.02; h + step < PLATFORM1 - 0.02; h += step) {
    for (let side = -1; side <= 1; side += 2) {
      const o0 = towerHW(h) * u;
      const o1 = towerHW(h + step) * u;
      const i0 = o0 * 0.68;
      const i1 = o1 * 0.68;
      ctx.moveTo(x + side * o0 * 0.9, hz - h * u);
      ctx.lineTo(x + side * i1, hz - (h + step) * u);
      ctx.moveTo(x + side * i0, hz - h * u);
      ctx.lineTo(x + side * o1 * 0.9, hz - (h + step) * u);
    }
  }
  ctx.stroke();
  // The sunward edges, lit.
  ctx.strokeStyle = tone.bronzeLit;
  ctx.lineWidth = Math.max(0.8, u * 0.0028);
  ctx.beginPath();
  ctx.moveTo(x - LEG_FOOT * u, hz);
  towerEdge(ctx, x, hz, u, 0, PLATFORM1, -1);
  ctx.moveTo(x - towerHW(PLATFORM1) * u, hz - PLATFORM1 * u);
  towerEdge(ctx, x, hz, u, PLATFORM1, PLATFORM2, -1);
  ctx.moveTo(x - towerHW(PLATFORM2) * u, hz - PLATFORM2 * u);
  towerEdge(ctx, x, hz, u, PLATFORM2, TOP, -1);
  ctx.stroke();
  // The platforms: galleries wider than the tower, lit along their tops.
  ctx.fillStyle = tone.bronzeShade;
  ctx.beginPath();
  ctx.rect(x - (PLATFORM1_HW + 0.008) * u, hz - PLATFORM1 * u - u * 0.004, (PLATFORM1_HW + 0.008) * 2 * u, u * 0.012);
  ctx.rect(x - (PLATFORM2_HW + 0.006) * u, hz - PLATFORM2 * u - u * 0.003, (PLATFORM2_HW + 0.006) * 2 * u, u * 0.008);
  ctx.rect(x - (TOP_HW + 0.004) * u, hz - TOP * u - u * 0.002, (TOP_HW + 0.004) * 2 * u, u * 0.006);
  ctx.fill();
  ctx.fillStyle = tone.bronzeLit;
  ctx.beginPath();
  ctx.rect(x - (PLATFORM1_HW + 0.008) * u, hz - PLATFORM1 * u - u * 0.004, (PLATFORM1_HW + 0.008) * 2 * u, u * 0.0035);
  ctx.rect(x - (PLATFORM2_HW + 0.006) * u, hz - PLATFORM2 * u - u * 0.003, (PLATFORM2_HW + 0.006) * 2 * u, u * 0.0028);
  ctx.fill();
  // The lantern: a little cage on the top platform holding the heart, and the mast over it.
  ctx.fillStyle = tone.bronze;
  ctx.beginPath();
  ctx.rect(x - u * 0.0015, hz - TOWER_TIP * u, u * 0.003, (TOWER_TIP - TOP) * u);
  ctx.rect(x - u * 0.007, hz - (BEACON + 0.006) * u, u * 0.014, u * 0.002);
  ctx.fill();
  ctx.fillStyle = tone.towerLamp;
  ctx.beginPath();
  heartPath(ctx, x, hz - BEACON * u + u * 0.002, u * 0.013);
  ctx.fill();
  // Its lamps along the edges and the platforms, lit at dusk.
  if (tone.lights > 0.02) {
    ctx.globalAlpha = tone.lights;
    ctx.fillStyle = tone.towerLamp;
    ctx.beginPath();
    // (Pin-points of light, squares as cheap to fill as they look round at this size.)
    const r = Math.max(0.7, u * 0.0022);
    for (let h = 0.03; h < TOP; h += 0.03) {
      const w = towerHW(h) * u;
      ctx.rect(x - w - r, hz - h * u - r, r * 2, r * 2);
      ctx.rect(x + w - r, hz - h * u - r, r * 2, r * 2);
    }
    for (const [h, hw] of [
      [PLATFORM1, PLATFORM1_HW + 0.008],
      [PLATFORM2, PLATFORM2_HW + 0.006],
    ] as const) {
      for (let k = -2; k <= 2; k++) ctx.rect(x + (k / 2) * hw * u - r, hz - h * u - u * 0.0005 - r, r * 2, r * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- the Ferris wheel

/** The wheel: its axle (u from center, u above the land's line), radius, gondolas, spokes; how fast it turns (radians per second): slowly. */
const WHEEL_X = 0.352;
const AXLE = 0.29;
export const WHEEL_R = 0.08;
const GONDOLA = 0.011;
const SPOKES = 8;
const RIM_BULBS = 24;
/** The gondolas' lights at night, by turns round the wheel. */
const GONDOLA_LIGHTS = ["#ff8fb3", "#ffd36b", "#8ff0c8", "#d2b4ff"] as const;
const TURN = 0.12;

/** Scratch for the wheel's place, so placing it allocates nothing. */
const WHEEL = { x: 0, y: 0, r: 0, u: 0 };

/** Where the wheel is: its axle and radius. */
export function wheelAt(s: Scene): typeof WHEEL {
  const g = grown(s);
  const u = s.u * (1 + (WHEEL_GROW - 1) * g);
  WHEEL.x = s.cssW / 2 + (WHEEL_X + (WHEEL_X_HIGH - WHEEL_X) * g) * s.u;
  WHEEL.y = landLine(s) - AXLE * u;
  WHEEL.r = WHEEL_R * u;
  WHEEL.u = u;
  return WHEEL;
}

/** Whether the wheel is on screen at all. */
function wheelShows(s: Scene): boolean {
  const w = wheelAt(s);
  return w.y - w.r < s.cssH + s.u * 0.02 && w.y + AXLE * s.u > -s.u * 0.1;
}

/**
 * The highest point (screen y, px) of what stands out of the cloud sea between x0 and x1 (px):
 * the lattice tower (to its mast's tip, across its legs' spread), the wheel (to its top gondola)
 * and the landmarks on screen (skyline.ts); the land's line where none of them does. The night's
 * fireworks of hearts go off over it, so no burst goes off behind one of them (fireworks.ts).
 */
export function standoutTop(s: Scene, x0: number, x1: number): number {
  let top = landLine(s);
  const t = towerAt(s);
  if (x0 < t.x + LEG_FOOT * t.u && x1 > t.x - LEG_FOOT * t.u) top = Math.min(top, t.hz - TOWER_TIP * t.u);
  if (wheelShows(s)) {
    const w = wheelAt(s);
    if (x0 < w.x + w.r && x1 > w.x - w.r) top = Math.min(top, w.y - w.r - GONDOLA * w.u);
  }
  return Math.min(top, landmarksTop(s, x0, x1));
}

/**
 * The Ferris wheel over the rooftops behind the café: two A-frame legs down to the land's line,
 * the rim and spokes strung with bulbs, and gondolas hanging from the rim, turning slowly round.
 * Flat and faded, far away; its bulbs come on at dusk.
 */
export function wheel(ctx: Ctx, s: Scene, tone: Tone): void {
  const { x, y, r, u } = wheelAt(s);
  const foot = landLine(s) + u * 0.01;
  // The legs, the rim and the spokes.
  const lw = Math.max(1, u * 0.0035);
  ctx.strokeStyle = tone.wheel;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, foot);
  ctx.lineTo(x, y);
  ctx.lineTo(x + r * 0.62, foot);
  ctx.moveTo(x - r * 0.42, y + (foot - y) * 0.6);
  ctx.lineTo(x + r * 0.42, y + (foot - y) * 0.6);
  const a0w = s.t * TURN;
  for (let i = 0; i < SPOKES; i++) {
    const a = a0w + (i * Math.PI * 2) / SPOKES;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  circle(ctx, x, y, r);
  circle(ctx, x, y, r * 0.92);
  circle(ctx, x, y, r * 0.3);
  ctx.stroke();
  // Gondolas hanging from the rim.
  ctx.fillStyle = tone.gondola;
  ctx.beginPath();
  for (let i = 0; i < SPOKES; i++) {
    const a = a0w + (i * Math.PI * 2) / SPOKES;
    const gx = x + Math.cos(a) * r;
    const gy = y + Math.sin(a) * r + GONDOLA * u * 0.9;
    const g = GONDOLA * u;
    ctx.moveTo(gx - g * 0.55, gy - g * 0.3);
    ctx.lineTo(gx + g * 0.55, gy - g * 0.3);
    ctx.lineTo(gx + g * 0.4, gy + g * 0.4);
    ctx.lineTo(gx - g * 0.4, gy + g * 0.4);
    ctx.closePath();
  }
  ctx.fill();
  // At dusk the gondolas light up from within, rose, gold, mint and lilac by turns.
  if (tone.lights > 0.02) {
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * tone.lights;
    for (let c = 0; c < GONDOLA_LIGHTS.length; c++) {
      ctx.fillStyle = GONDOLA_LIGHTS[c]!;
      ctx.beginPath();
      for (let i = c; i < SPOKES; i += GONDOLA_LIGHTS.length) {
        const a = a0w + (i * Math.PI * 2) / SPOKES;
        const gx = x + Math.cos(a) * r;
        const gy = y + Math.sin(a) * r + GONDOLA * u * 0.9;
        const g = GONDOLA * u;
        ctx.rect(gx - g * 0.4, gy - g * 0.18, g * 0.8, g * 0.42);
      }
      ctx.fill();
    }
    ctx.globalAlpha = a0;
  }
  // The hub, and the bulbs along the spokes and the rim, lit at dusk.
  ctx.fillStyle = tone.wheelLit;
  ctx.beginPath();
  circle(ctx, x, y, lw * 1.6);
  if (tone.lights > 0.02) {
    // (Pin-points of light: squares, as cheap to fill as they look round at this size.)
    const br = Math.max(0.7, u * 0.0022);
    const bulb = (bx: number, by: number) => ctx.rect(bx - br, by - br, br * 2, br * 2);
    for (let i = 0; i < SPOKES; i++) {
      const a = a0w + (i * Math.PI * 2) / SPOKES;
      for (let k = 1; k <= 2; k++) bulb(x + Math.cos(a) * r * (0.32 + k * 0.22), y + Math.sin(a) * r * (0.32 + k * 0.22));
    }
    for (let i = 0; i < RIM_BULBS; i++) {
      const a = a0w + ((i + 0.5) * Math.PI * 2) / RIM_BULBS;
      bulb(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the city

/**
 * The far city while the land shows, back to front: the far hill with its basilica and the far
 * spires, the far row, the lattice tower, the middle row, the gilded dome, the near row and the
 * avenue running up through it to the dome; all of it fading into the evening mist as the cloud
 * sea comes up (`mist`). (The lattice tower and the wheel are drawn with it while it shows,
 * and stand out of the cloud sea on their own once it has gone.)
 */
export function city(ctx: Ctx, s: Scene, tone: Tone): void {
  const fade = 1 - mist(s);
  if (fade <= 0) return;
  ctx.globalAlpha = fade;
  farHill(ctx, s, tone);
  row(ctx, s, 0, tone.rows[0]!, tone.lights);
  gildedDome(ctx, s, tone);
  ctx.globalAlpha = 1;
  latticeTower(ctx, s, tone);
  ctx.globalAlpha = fade;
  row(ctx, s, 1, tone.rows[1]!, tone.lights);
  ctx.globalAlpha = 1;
  if (wheelShows(s)) wheel(ctx, s, tone);
  ctx.globalAlpha = fade;
  row(ctx, s, 2, tone.rows[2]!, tone.lights);
  avenue(ctx, s, tone);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the cloud floor

/**
 * The cloud sea's rows, far to near: how far under its top edge each row's scallops are centered
 * (u), their radius (u), and which of the hour's cloud colors fills it (0 lit, 1 body, 2 shaded).
 * Nearer rows are bigger; each covers the screen from its scallops down to the next row's. The
 * first row's scallops meet well above the top edge, so nothing on the land's line (the
 * boulevard's pavement) shows between them.
 */
const SEA_ROWS = [
  [-0.005, 0.04, 0],
  [0.065, 0.048, 1],
  [0.15, 0.062, 0],
  [0.25, 0.084, 1],
  [0.39, 0.11, 2],
  [0.58, 0.14, 1],
  [0.84, 0.18, 0],
] as const;
/** Half the band behind the tower (u) where the cloud sea's scallops go without their shell lines. */
const SEA_QUIET = 0.2;
/** Scallops along a row: their spacing in radii, and every other one a little smaller. */
const SCALLOP_STEP = 1.62;
const SMALL = 0.82;

/** Row k's first scallop: left of the screen, each row half a step out of line with the last. */
function rowStart(s: Scene, k: number, step: number): number {
  const off = (k % 2) * step * 0.5;
  return s.cssW / 2 - Math.ceil(s.cssW / 2 / step + 1) * step + off;
}

/** Row k's scallops: where its cusps lie, its radius and its step (px), for the cloud floor whose top is `top`. */
function rowAt(s: Scene, top: number, k: number): { cusp: number; r: number; step: number } {
  const [d, R] = SEA_ROWS[k]!;
  const r = R * s.u;
  // The cusps lie half a radius over the row's line, the big scallops' crowns a whole radius over it.
  ROW.cusp = top + (d - R * 0.5) * s.u;
  ROW.r = r;
  ROW.step = r * SCALLOP_STEP;
  return ROW;
}
const ROW = { cusp: 0, r: 0, step: 0 };

/**
 * Row k's scalloped edge across the screen, as Béziers from cusp to cusp (continues the path):
 * left to right, or (`back`) right to left. Every other scallop is a little smaller.
 */
function scallops(ctx: Ctx, s: Scene, k: number, cusp: number, r: number, step: number, back: boolean): void {
  const x0 = rowStart(s, k, step);
  const n = Math.ceil((s.cssW + step - x0) / step);
  for (let j = 0; j < n; j++) {
    const i = back ? n - 1 - j : j;
    const x = x0 + i * step;
    const h = (i % 2 ? SMALL : 1) * r * 0.5 * (4 / 3);
    const e = back ? -step / 2 : step / 2;
    ctx.bezierCurveTo(x - e, cusp - h, x + e, cusp - h, x + e, cusp);
  }
}

/**
 * The cloud floor, the Art Nouveau way: rows of scalloped cloud, far rows small and near rows
 * big, in the hour's pastel cloud colors by turns, a fine contour along every row's scallops and
 * a shell line inside each big one (but behind the tower, which stays quieter). Each row is a
 * band from its scallops down to the next row's, so the bands never overlap and every band of a
 * color is one fill. It is solid from a little under its top edge down to the screen's bottom.
 * It stands still: it runs right behind the tower, where nothing moves. It is drawn after
 * everything on the land, so as it gathers it covers all of it (only Paris above the clouds stands
 * out of it, in the side lanes); the railing in front stays in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  // How many rows show: down to the first whose cusps are below the screen.
  let rows = 0;
  while (rows < SEA_ROWS.length && rowAt(s, top, rows).cusp - ROW.r * 0.5 <= s.cssH) rows++;
  if (rows === 0) return;
  // Under the bands, one flat fill from just under the first row's cusps: where two bands meet,
  // their soft edges would otherwise let a trace of what lies behind show through.
  const under = rowAt(s, top, 0).cusp + 1;
  ctx.fillStyle = tone.cloud;
  ctx.fillRect(0, under, s.cssW, s.cssH - under);
  const fills = [tone.cloudLight, tone.cloud, tone.cloudShade];
  for (let c = 0; c < fills.length; c++) {
    ctx.beginPath();
    for (let k = 0; k < rows; k++) {
      if (SEA_ROWS[k]![2] !== c) continue;
      const { cusp, r, step } = rowAt(s, top, k);
      const left = rowStart(s, k, step) - step / 2;
      ctx.moveTo(left, cusp);
      scallops(ctx, s, k, cusp, r, step, false);
      if (k + 1 < rows) {
        const next = rowAt(s, top, k + 1);
        const nl = rowStart(s, k + 1, next.step) - next.step / 2;
        const nr = nl + Math.ceil((s.cssW + next.step - nl - next.step / 2) / next.step) * next.step;
        ctx.lineTo(nr, next.cusp);
        scallops(ctx, s, k + 1, next.cusp, next.r, next.step, true);
        ctx.lineTo(Math.min(left, nl), next.cusp);
      } else {
        ctx.lineTo(s.cssW + step * 2, s.cssH + 1);
        ctx.lineTo(left, s.cssH + 1);
      }
      ctx.closePath();
    }
    ctx.fillStyle = fills[c]!;
    ctx.fill();
  }
  // The contour along every row's scallops, and the shell lines.
  ctx.beginPath();
  for (let k = 0; k < rows; k++) {
    const { cusp, r, step } = rowAt(s, top, k);
    const x0 = rowStart(s, k, step);
    ctx.moveTo(x0 - step / 2, cusp);
    scallops(ctx, s, k, cusp, r, step, false);
    let i = 0;
    for (let x = x0; x < s.cssW + step; x += step, i++) {
      if (i % 2 || Math.abs(x - s.cssW / 2) < SEA_QUIET * u + r) continue;
      scallopArc(ctx, x, cusp + r * 0.3, r * 0.75);
    }
  }
  ctx.lineWidth = Math.max(0.9, u * 0.0032);
  ctx.lineCap = "round";
  ctx.strokeStyle = tone.cloudLine;
  ctx.stroke();
}

// ---------------------------------------------------------------- Paris above the clouds

/** Scratch for the lanes' filters: the band (px) the sun sweeps, widened by the pad, and the screen's center and u. */
const PATH_NOW = { x0: 0, x1: 0, cx: 0, u: 0 };

function inSunPath(b: Block): boolean {
  const p = PATH_NOW;
  return p.cx + b.x0 * p.u < p.x1 && p.cx + b.x1 * p.u > p.x0;
}
function clearOfSun(b: Block): boolean {
  return !inSunPath(b);
}

/**
 * The rooftops of Paris standing out of the cloud sea in the side lanes, their lower floors under
 * it (none behind the tower): those clear of the sun's path `open` far out of the mist, those in
 * it `sunSide` far (tone.ts `sunSideShow`: never while the sun is low there).
 */
export function laneRoofs(ctx: Ctx, s: Scene, tone: Tone, open: number, sunSide: number, back: boolean): void {
  const p = sunPath(s);
  PATH_NOW.x0 = p.x0 - PATH_PAD * s.u;
  PATH_NOW.x1 = p.x1 + PATH_PAD * s.u;
  PATH_NOW.cx = s.cssW / 2;
  PATH_NOW.u = s.u;
  const k = back ? LANE_BACK : LANE;
  const rt = tone.rows[back ? 0 : 1]!;
  if (open > 0.002) {
    ctx.globalAlpha = open;
    row(ctx, s, k, rt, tone.lights, clearOfSun);
  }
  if (sunSide > 0.002) {
    ctx.globalAlpha = sunSide;
    row(ctx, s, k, rt, tone.lights, inSunPath);
  }
  ctx.globalAlpha = 1;
}

/**
 * Everything beyond the boulevard: the far city while the land shows (with the lattice tower and
 * the wheel in it); and from when the evening mist begins to take it, Paris above the clouds,
 * coming out of the mist as the city goes into it: the landmarks in the side lanes (skyline.ts),
 * the wheel and the lattice tower on the right, and the lanes' rooftops in front of them, all
 * standing out of the cloud sea and none behind the tower. The boulevard, the canal, the garden
 * and the fountain follow in their own modules; the cloud floor over them all comes last.
 * (The lanes' back rooftops and the landmarks go behind the lattice tower and the wheel whether
 * the last of the city is still drawn round them or not, so nothing changes depth with a jump
 * when it goes.)
 */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = landLine(s);
  if (hz - s.u * 0.02 > s.cssH + TOWER_TIP * s.u) return;
  const open = mist(s);
  const cityShows = landShows(s, top) && open < 1;
  const sunSide = Math.min(open, sunSideShow(level(s)));
  if (open > 0) {
    laneRoofs(ctx, s, tone, open, sunSide, true);
    landmarks(ctx, s, tone, open, sunSide);
  }
  if (cityShows) city(ctx, s, tone);
  if (open <= 0) return;
  if (!cityShows) {
    latticeTower(ctx, s, tone);
    if (wheelShows(s)) wheel(ctx, s, tone);
  }
  laneRoofs(ctx, s, tone, open, sunSide, false);
}

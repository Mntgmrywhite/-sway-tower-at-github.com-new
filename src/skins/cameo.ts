import { circle, hash, ink, inkedLine, oval, type Ctx } from "../base/draw";
import { VIEW_WIDTH } from "../camera";
import { BASE_WIDTH, BLOCK_HEIGHT, DEFAULT_TUNING, PERFECT_TOLERANCE, SWAY_BEND_POWER, SWAY_FULL_LEVEL } from "../config";
import * as classic from "./classic/colors";
import {
  BANDS,
  CAP_H,
  CAP_HW,
  CROWN,
  CRYSTALS,
  DAISIES,
  GLINT_EVERY,
  glintPhase,
  GRASS_DROP,
  PEBBLES,
  PLINTH_H,
  ROOTS,
  TREE_X,
  TUFTS,
  UNDER_D,
  UNDER_HW,
  VINES,
} from "./classic/island";
import { capPath, cloud, LONG_CLOUD, undersidePath, type CloudShape } from "./classic/shapes";
import type { Scene } from "./skin";

// The cameo: Sky Islands' home island floating in another skin's sky with a 25-bar Sway Tower
// standing on it (the owner, 2026-10-22: "the classic floating island should be present in the
// sky around stack 50 in each map", and "it should match the art style of the page and have a 25
// stack on it"). This module is its shape, shared by every skin; each skin paints it in its own
// art style. The island is the home island's own design, taken from Classic's tables and path
// tracers (classic/island.ts, classic/shapes.ts): the grass cap with its scalloped lip, tufts and
// daisies; the striped underside (five wavy strata, pebbles, a geode of crystals); roots and
// vines hanging from it; the spring spilling from its left side, here falling into a puff of
// mist; the little round tree and the stone plinth. On the plinth stands a tower of exactly
// CAMEO_BARS bars in the game's own proportions, laid out like a real run (slices, and perfects
// that win a slice back: see DROPS), and it sways the way the game's tower does at that height.
//
// Units: 1 is the cap's half width. The origin is the middle of the cap's top edge (the grass
// line); x runs right (mirrored by the frame's `m`), y down. Everything is precomputed once as
// plain point lists (`cameo()`), so a painter fills, strokes, clips or distorts them as its style
// wants: the trace helpers below add a part's subpaths to the current path (no beginPath), so
// parts can share one fill. Motion (the bob, the tower's sway, the roots and vines, the water)
// is a function of the frame's clock alone, so frames can be compared in tests.
//
// `paintCameo` is the default painter: Classic's look (flat two-tone fills, one ink weight), with
// the small details left out where they would be under a pixel. A skin with its own style writes
// its own painter from the geometry; see cameo.test.ts for the checks each skin adds.

// ---------------------------------------------------------------- units and frames

/** A point in cameo units. */
export type Pt = readonly [number, number];
/** A point list in cameo units: a closed outline unless said otherwise. */
export type Pts = readonly Pt[];

/** How many bars the cameo's tower has. */
export const CAMEO_BARS = 25;

/** u per cameo unit: the home island's cap half width. */
const UNIT = CAP_HW;
/** Cameo units per u. */
const U = 1 / UNIT;
/** Cameo units per world unit (the game's playfield), at the home island's scale. */
const PER_WORLD = U / VIEW_WIDTH;

/** The island's proportions, cameo units. */
export const ISLAND = {
  /** The cap's thickness (its scallops hang below it). */
  capH: CAP_H * U,
  /** Where the underside hangs from: under the cap's top edge, hidden by its lip. */
  underTop: CAP_H * 0.7 * U,
  /** The underside's half width and depth. */
  underHW: UNDER_HW * U,
  underD: UNDER_D * U,
  /** The floor line the tower stands on: the plinth's top, a little above the grass. */
  floor: -GRASS_DROP * U,
  /** The base bar's width and every bar's height, in the game's proportions. */
  barW: BASE_WIDTH * PER_WORLD,
  barH: BLOCK_HEIGHT * PER_WORLD,
} as const;

/** Where a cameo is on screen and how big. Make one with `placeCameo`. */
export interface CameoFrame {
  /** Screen position of the origin (the middle of the cap's top edge), px, bob included. */
  x: number;
  y: number;
  /** Pixels per cameo unit: the cap's half width on screen. */
  k: number;
  /** 1 as designed (the spring on the left), -1 mirrored. Face the spring away from the tower. */
  m: 1 | -1;
  /** The cameo's clock, seconds: drives the bob, the sway, the roots, vines and water. */
  t: number;
}

/** How far the cameo bobs up and down, cameo units, and how fast (radians a second). */
export const CAMEO_BOB = 0.05;
const BOB_RATE = 0.4;

/** How far the whole cameo has bobbed at time `t` (cameo units, down is positive). */
export function cameoBob(t: number): number {
  return Math.sin(t * BOB_RATE) * CAMEO_BOB;
}

/**
 * The frame of a cameo whose origin rests at (x, y) on screen, `k` px to the unit, mirrored by
 * `m`, at time `t` (its bob included). Pass `out` to reuse an object every frame.
 */
export function placeCameo(x: number, y: number, k: number, m: 1 | -1, t: number, out?: CameoFrame): CameoFrame {
  const c = out ?? { x: 0, y: 0, k: 0, m: 1, t: 0 };
  c.x = x;
  c.y = y + cameoBob(t) * k;
  c.k = k;
  c.m = m;
  c.t = t;
  return c;
}

/** A good size for a cameo in a phone's side lane: k = CAMEO_LANE_K * u (about 0.17 u wide, 0.43 u tall). */
export const CAMEO_LANE_K = 0.08;

/**
 * Screen y for a cameo's origin that stands `frac` of the screen's height down when the camera is
 * at tower level `lvl`, and comes down past the screen as the camera climbs, at parallax `p` (1
 * moves with the tower). The same level on every screen.
 */
export function cameoLaneY(s: Scene, lvl: number, frac: number, p: number): number {
  return s.cssH * frac + (s.altitude - (lvl + 1) * BLOCK_HEIGHT) * s.scale * p;
}

/** Screen x of a point in cameo units, in this frame. */
export function toX(c: CameoFrame, x: number): number {
  return c.x + c.m * x * c.k;
}
/** Screen y of a point in cameo units, in this frame. */
export function toY(c: CameoFrame, y: number): number {
  return c.y + y * c.k;
}

/** A box: left, top, right, bottom. */
export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/**
 * Everything the cameo can cover on screen in this frame, px (all its motion but the bob, which is
 * in the frame), widened by `pad` px (an outline's half width).
 */
export function cameoBounds(c: CameoFrame, pad = 0): Box {
  const b = cameo().box;
  const x0 = toX(c, b.l);
  const x1 = toX(c, b.r);
  return { l: Math.min(x0, x1) - pad, t: toY(c, b.t) - pad, r: Math.max(x0, x1) + pad, b: toY(c, b.b) + pad };
}

// ---------------------------------------------------------------- the tower

/**
 * The run the tower was built by: where each bar landed (world units right of the bar below), in
 * order. Within PERFECT_TOLERANCE is a perfect, which sits square and wins back the newest slice
 * on the edge that lost it (the game's rule, so a perfect bar can step out past the one below);
 * anything else is sliced to the overlap. A steady hand with a few wobbles: it zigzags and narrows
 * a little (to three quarters of the base), like a real tower.
 */
const DROPS = [3, 0, -2.5, 2, 0, 0, -3, 2.5, 0, -2, 3, 0, -2.5, 2, 0, 0, -3, 2.5, -2, 0, 3, -2.5, 0, 2] as const;

/** One bar of the cameo's tower at rest, cameo units: left edge, top edge, width, height. */
export interface CameoBar {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Its place in the tower, 0 for the base: picks its color (`bars[level % bars.length]`) and how far it sways. */
  level: number;
}

function buildBars(): CameoBar[] {
  const { barW, barH, floor } = ISLAND;
  // Game positions (world units, tower-local), base centered.
  const row: { x: number; w: number }[] = [{ x: -BASE_WIDTH / 2, w: BASE_WIDTH }];
  const cuts: { w: number; side: -1 | 1 }[] = [];
  for (const d of DROPS) {
    const under = row[row.length - 1]!;
    if (Math.abs(d) <= PERFECT_TOLERANCE) {
      const back = cuts.pop();
      row.push(back ? { x: back.side < 0 ? under.x - back.w : under.x, w: under.w + back.w } : { ...under });
    } else {
      const l = Math.max(under.x + d, under.x);
      const r = Math.min(under.x + d + under.w, under.x + under.w);
      cuts.push({ w: under.w - (r - l), side: d < 0 ? 1 : -1 });
      row.push({ x: l, w: r - l });
    }
  }
  return row.map((b, i) => ({
    x: b.x * PER_WORLD,
    y: floor - (i + 1) * barH,
    w: (b.w / BASE_WIDTH) * barW,
    h: barH,
    level: i,
  }));
}

/** The tower's sway at its top bar's height (world units), as the game sways a tower that tall. */
const SWAY = DEFAULT_TUNING.swayBase;

/** How far bar `level` has swayed at time `t`, cameo units (right is positive, before mirroring). */
export function barSway(level: number, t: number): number {
  const bend = Math.min(1, level / SWAY_FULL_LEVEL) ** SWAY_BEND_POWER;
  return Math.sin((t / DEFAULT_TUNING.swayPeriod) * Math.PI * 2) * SWAY * bend * PER_WORLD;
}

/** The furthest bar `level` ever sways, cameo units. */
function swayReach(level: number): number {
  return SWAY * Math.min(1, level / SWAY_FULL_LEVEL) ** SWAY_BEND_POWER * PER_WORLD;
}

/** Bar `i` on screen in this frame, swayed: left, top, width, height, px. Pass `out` to reuse an object. */
export function barRect(c: CameoFrame, i: number, out?: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const b = cameo().bars[i]!;
  const o = out ?? { x: 0, y: 0, w: 0, h: 0 };
  const x0 = b.x + barSway(i, c.t);
  o.x = c.m > 0 ? toX(c, x0) : toX(c, x0 + b.w);
  o.y = toY(c, b.y);
  o.w = b.w * c.k;
  o.h = b.h * c.k;
  return o;
}

// ---------------------------------------------------------------- the island's parts

/** One stratum of the underside (topsoil, sand, clay, umber, bedrock). */
export interface CameoBand {
  /** Its place, top to bottom (Classic's strata colors by index). */
  index: number;
  /** Its top edge, left to right (open): the wavy line across the underside; the underside's top for the first. */
  edge: Pts;
  /** The underside from this band's top edge down (closed). Fill them in order, each over the last. */
  below: Pts;
  /** This band alone, down to the next band's edge (closed). */
  body: Pts;
  /** The lit strip just under its top edge (closed); empty for the first band, which the cap's lip hides. */
  lit: Pts;
}

/** A shard of the geode: its body, the lit facet down one side, the shaded tip, and the tip a glint flashes on. */
export interface CameoShard {
  body: Pts;
  lit: Pts;
  shade: Pts;
  tip: Pt;
}

/** An ellipse: center, radii, rotation (radians, before mirroring). */
export interface CameoOval {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
}

/** A root at rest: its anchor (hidden in the underside), length, width at the top and bend; a fork may grow from it. */
export interface CameoRoot {
  x: number;
  y: number;
  len: number;
  w: number;
  bend: number;
  fork: { x: number; y: number; len: number; w: number; bend: number } | null;
}

/** A daisy: its stem (from `base`, in the grass, up to `stem`) and head at y, petals round a middle of radius r. */
export interface CameoDaisy {
  x: number;
  base: number;
  stem: number;
  y: number;
  petals: readonly CameoOval[];
  r: number;
}

export interface CameoGeometry {
  /** The grass cap: a flat top with round ends, its lower edge hanging over the soil in scallops. */
  cap: Pts;
  /** The cap's lit body: the cap less a shaded rim along the scallops. */
  capLit: Pts;
  /** A bright strip along the cap's top edge. */
  capTop: Pts;
  /** The striped underside, a lopsided cone stepping in twice to a round tip. */
  underside: Pts;
  bands: readonly CameoBand[];
  /** Pebbles set in the strata: each one's shade, and its lit stone over it. */
  pebbles: { shade: readonly CameoOval[]; lit: readonly CameoOval[] };
  /** The geode near the underside's tip, growing up from it. */
  shards: readonly CameoShard[];
  roots: readonly CameoRoot[];
  /** Grass tufts on the cap's top edge, three blades each (closed triangles). */
  tufts: readonly Pts[];
  daisies: readonly CameoDaisy[];
  /** The little round tree right of the plinth: a trunk under a three-ball crown (circles: x, y, r), lit balls over it, highlights. */
  tree: { trunk: Pts; crown: readonly (readonly [number, number, number])[]; lit: readonly (readonly [number, number, number])[]; shine: readonly CameoOval[] };
  /** The stone plinth under the base bar: a rounded box, its lit top and shaded foot (heights), and two joints (x). */
  plinth: { x: number; y: number; w: number; h: number; r: number; lit: number; shade: number; joints: readonly number[] };
  /** The bars at rest, base first. */
  bars: readonly CameoBar[];
  /**
   * The spring (`traceSpring` draws it): the crack in the underside's left it gushes from, the line
   * it falls down (x) from where it turns down (top) to its foot in the mist, and its half width.
   */
  spring: { mouth: Pt; x: number; top: number; foot: number; w: number };
  /** The puff of mist the spring falls into: a cloud shape (see classic/shapes.ts's `cloud`) at (x, y), size r. */
  mist: { x: number; y: number; r: number; shape: CloudShape };
  /** Everything the cameo can cover (all its motion but the bob), cameo units (`cameoBounds` for px). */
  box: Box;
}

// ---------------------------------------------------------------- building the geometry

/** A path recorder standing in for a canvas: it flattens Classic's path tracers into points. */
class Recorder {
  pts: [number, number][] = [];
  private x = 0;
  private y = 0;
  constructor(private segs: number) {}
  beginPath(): void {
    this.pts = [];
  }
  moveTo(x: number, y: number): void {
    this.lineTo(x, y);
  }
  lineTo(x: number, y: number): void {
    this.pts.push([x, y]);
    this.x = x;
    this.y = y;
  }
  quadraticCurveTo(qx: number, qy: number, x: number, y: number): void {
    const { x: x0, y: y0 } = this;
    for (let i = 1; i <= this.segs; i++) {
      const t = i / this.segs;
      const a = (1 - t) * (1 - t);
      const b = 2 * t * (1 - t);
      this.pts.push([a * x0 + b * qx + t * t * x, a * y0 + b * qy + t * t * y]);
    }
    this.x = x;
    this.y = y;
  }
  closePath(): void {}
}

function record(segs: number, trace: (ctx: Ctx) => void): [number, number][] {
  const rec = new Recorder(segs);
  trace(rec as unknown as Ctx);
  return rec.pts;
}

/** A line given as y over x: xs ascending. */
interface Chain {
  xs: number[];
  ys: number[];
}

/** A chain from points, made to run left to right (points that step back are dropped). */
function chain(pts: readonly Pt[]): Chain {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of pts) {
    if (xs.length && x <= xs[xs.length - 1]!) continue;
    xs.push(x);
    ys.push(y);
  }
  return { xs, ys };
}

function chainY(ch: Chain, x: number): number {
  const { xs, ys } = ch;
  if (x <= xs[0]!) return ys[0]!;
  const n = xs.length - 1;
  if (x >= xs[n]!) return ys[n]!;
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]! <= x) lo = mid;
    else hi = mid;
  }
  const f = (x - xs[lo]!) / (xs[hi]! - xs[lo]!);
  return ys[lo]! + (ys[hi]! - ys[lo]!) * f;
}

/** One open piece of a slab: its top and bottom edges over the same xs, left to right. */
interface Piece {
  top: Pt[];
  bot: Pt[];
}

/**
 * The region below every one of `tops` and above every one of `bots`, from x0 to x1, in pieces
 * where it is open: exact for chains, with corners where they cross.
 */
function slab(tops: readonly Chain[], bots: readonly Chain[], x0: number, x1: number): Piece[] {
  const xs = new Set<number>([x0, x1]);
  for (const ch of [...tops, ...bots]) for (const x of ch.xs) if (x > x0 && x < x1) xs.add(x);
  const B = [...xs].sort((a, b) => a - b);
  const top = (x: number) => Math.max(...tops.map((ch) => chainY(ch, x)));
  const bot = (x: number) => Math.min(...bots.map((ch) => chainY(ch, x)));
  const open = (x: number) => bot(x) - top(x);
  // Between breakpoints every chain is straight: add where two of a kind cross, then where top meets bottom.
  const cross = (f: (x: number) => number, g: (x: number) => number, a: number, b: number): number | null => {
    const da = f(a) - g(a);
    const db = f(b) - g(b);
    if (da === 0 || db === 0 || da > 0 === db > 0) return null;
    return a + ((b - a) * da) / (da - db);
  };
  const fine: number[] = [];
  for (let j = 0; j < B.length - 1; j++) {
    const a = B[j]!;
    const b = B[j + 1]!;
    const here = [a, b];
    for (const group of [tops, bots]) {
      for (let p = 0; p < group.length; p++) {
        for (let q = p + 1; q < group.length; q++) {
          const x = cross(
            (v) => chainY(group[p]!, v),
            (v) => chainY(group[q]!, v),
            a,
            b,
          );
          if (x !== null) here.push(x);
        }
      }
    }
    here.sort((p, q) => p - q);
    for (let i = 0; i < here.length - 1; i++) {
      fine.push(here[i]!);
      const x = cross(bot, top, here[i]!, here[i + 1]!);
      if (x !== null) fine.push(x);
    }
  }
  fine.push(x1);
  const EPS = 1e-9;
  const pieces: Piece[] = [];
  for (let i = 0; i < fine.length; ) {
    if (open(fine[i]!) <= EPS) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < fine.length && open(fine[j + 1]!) > EPS) j++;
    // Take in the crossings either side, where it closes.
    const run = fine.slice(i > 0 ? i - 1 : i, j + 1 < fine.length ? j + 2 : j + 1).filter((x, n, a) => n === 0 || x !== a[n - 1]);
    pieces.push({ top: run.map((x) => [x, top(x)] as const), bot: run.map((x) => [x, Math.max(top(x), bot(x))] as const) });
    i = j + 1;
  }
  return pieces;
}

/** A piece as a closed outline: along its top, left to right, and back along its bottom (a pinched end once). */
function outline(p: Piece): Pt[] {
  const out: Pt[] = [...p.top];
  for (let i = p.bot.length - 1; i >= 0; i--) {
    const q = p.bot[i]!;
    const last = out[out.length - 1]!;
    if (q[0] === last[0] && q[1] === last[1]) continue;
    if (i === 0 && q[0] === out[0]![0] && q[1] === out[0]![1]) continue;
    out.push(q);
  }
  return out;
}

/** The one piece of a slab that must be there. */
function one(pieces: Piece[]): Piece {
  if (pieces.length !== 1) throw new Error(`cameo: expected one piece, got ${pieces.length}`);
  return pieces[0]!;
}

/**
 * How far a simplified outline may stray from the curve it was flattened from, cameo units: a
 * quarter of a pixel on the biggest lane-sized cameo (an iPad's, k about 60 px).
 */
const TOLERANCE = 0.004;

/** An outline with the points it doesn't need dropped (Douglas-Peucker): fewer path calls a frame. */
function simplify(pts: readonly Pt[]): Pt[] {
  if (pts.length < 4) return [...pts];
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a]!;
    const [bx, by] = pts[b]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let far = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]!;
      const d = len > 0 ? Math.abs((px - ax) * dy - (py - ay) * dx) / len : Math.hypot(px - ax, py - ay);
      if (d > far) {
        far = d;
        at = i;
      }
    }
    if (far > TOLERANCE) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** A chain of a flat line at y over x0..x1. */
function flat(y: number, x0: number, x1: number): Chain {
  return { xs: [x0, x1], ys: [y, y] };
}

/** Is (x, y) inside the closed outline? */
export function inside(pts: Pts, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The waterfall's numbers, as Classic's home island has them (island.ts's `waterfall`), in cameo units. */
const SPRING = {
  /** The crack it spills from, on the underside's left. */
  x: -UNDER_HW * 0.97 * U,
  y: (CAP_H * 0.7 + UNDER_D * 0.16) * U,
  /** Half width of the stream, how far it gushes out, how far below the crack it turns down. */
  w: 0.012 * U,
  out: 0.032 * U,
  drop: 0.03 * U,
  /** How far the fall fans out below that, before it runs straight. */
  fan: 0.13 * U,
  /** Where it ends in its puff of mist (the home island's pours on into the cloud bank). */
  foot: 1.1,
  /** How fast the streaks slide down (units a second) and how far apart they come. */
  speed: 0.075 * U,
  gap: 0.055 * U,
} as const;

let geometry: CameoGeometry | null = null;

/** The cameo's geometry, built on first use (so this module can be imported from anywhere in the skins). */
export function cameo(): CameoGeometry {
  return (geometry ??= build());
}

function build(): CameoGeometry {
  const { capH, underTop, underHW, underD } = ISLAND;
  // The cap, from Classic's tracer: a top chain (round ends, flat top) and the scalloped lip.
  const cap = record(12, (ctx) => capPath(ctx, 0, 0, 1, capH, 9));
  const turn = cap.findIndex(([x]) => x >= 1 - 1e-9);
  const capTopChain = chain(cap.slice(0, turn + 1));
  const capLip = cap.slice(turn + 1).reverse();
  const capBot = chain(capLip);
  const lifted = chain(capLip.map(([x, y]) => [x, y - capH * 0.32] as const));
  const capLit = simplify(outline(one(slab([capTopChain], [lifted], -1, 1))));
  const capTop = simplify(outline(one(slab([capTopChain], [capBot, flat(capH * 0.24, -1, 1)], -1, 1))));

  // The underside, from Classic's tracer: its flat top and the bottom chain round the tip.
  const underside = record(24, (ctx) => undersidePath(ctx, 0, underTop, underHW, underD));
  const underTopChain = flat(underTop, -underHW, underHW);
  const underBot = chain(underside.map(([x, y]) => [Math.min(underHW, Math.max(-underHW, x)), y] as const));
  const underOutline = simplify(underside);
  // Each stratum's top edge: the wavy line of classic/shapes.ts's `strata` (ten segments, a sine).
  const amp = underD * 0.035;
  const strip = underD * 0.055;
  const wave = (i: number, dy = 0): Chain => {
    const pts: Pt[] = [];
    for (let j = 0; j <= 10; j++) {
      const f = j / 10;
      pts.push([-underHW * 1.05 + underHW * 2.1 * f, underTop + BANDS[i]!.at * underD + dy + Math.sin(f * 7.5 + i * 1.9) * amp]);
    }
    return chain(pts);
  };
  const bands: CameoBand[] = BANDS.map((_, i) => {
    const top = i === 0 ? underTopChain : wave(i);
    const next = i + 1 < BANDS.length ? [wave(i + 1), underBot] : [underBot];
    const below = one(slab([top], [underBot], -underHW, underHW));
    return {
      index: i,
      edge: simplify(below.top),
      below: i === 0 ? underOutline : simplify(outline(below)),
      body: simplify(outline(one(slab([underTopChain, top], next, -underHW, underHW)))),
      lit: i === 0 ? [] : simplify(outline(one(slab([top], [wave(i, strip), underBot], -underHW, underHW)))),
    };
  });

  // Pebbles, crystals, roots, vines, tufts, daisies, the tree: Classic's tables, scaled to units.
  const pebbles = { shade: [] as CameoOval[], lit: [] as CameoOval[] };
  for (const p of PEBBLES) {
    const x = p.x * underHW;
    const y = underTop + p.y * underD;
    const r = p.r * U;
    pebbles.shade.push({ x, y, rx: r * 1.3, ry: r, rot: 0 });
    pebbles.lit.push({ x: x - r * 0.1, y: y - r * 0.25, rx: r * 1.12, ry: r * 0.72, rot: 0 });
  }

  const gx = underHW * 0.1;
  const gy = underTop + underD * 0.97;
  const gw = 0.0075 * U;
  const shards = CRYSTALS.map(([dx, len, lean]) => {
    const bx = gx + dx * U;
    const sn = Math.sin(lean + Math.PI);
    const c = Math.cos(lean + Math.PI);
    const p = (along: number, side: number): Pt => [bx + sn * along + c * side, gy - gw + c * along - sn * side];
    const L = len * U;
    return {
      body: [p(-gw, -gw), p(L * 0.75, -gw), p(L, 0), p(L * 0.75, gw), p(-gw, gw)],
      lit: [p(-gw, -gw * 0.1), p(L * 0.75, -gw * 0.1), p(L, 0), p(L * 0.75, -gw), p(-gw, -gw)],
      shade: [p(L * 0.75, gw), p(L, 0), p(L * 0.75, gw * 0.35)],
      tip: [bx + Math.sin(lean) * L * 0.8, gy - Math.cos(lean) * L * 0.8 - gw] as Pt,
    };
  });
  // Classic clips the geode to the underside; here it sits a hair higher, wholly inside.
  let lift = 0;
  for (const s of shards) for (const [x, y] of s.body) lift = Math.max(lift, y - (chainY(underBot, x) - underD * 0.02));
  const up = (pts: Pts): Pts => pts.map(([x, y]) => [x, y - lift] as const);
  const geode = shards.map((s) => ({ body: up(s.body), lit: up(s.lit), shade: up(s.shade), tip: [s.tip[0], s.tip[1] - lift] as Pt }));

  const roots = ROOTS.map((r) => {
    const x = r.x * underHW;
    const y = underTop + r.y * underD - 0.014 * U;
    const len = (r.len + 0.014) * U;
    const bend = r.bend * U;
    return {
      x,
      y,
      len,
      w: 0.0105 * U,
      bend,
      fork: r.fork ? { x: x + bend * 0.25, y: y + len * 0.42, len: len * 0.42, w: 0.006 * U, bend: -bend * 1.2 } : null,
    };
  });

  // Tufts and daisies stand on the cap's top line (planted a little lower where its end rounds off).
  const ground = (x: number) => chainY(capTopChain, x);
  const tufts: Pts[] = [];
  TUFTS.forEach((tx, i) => {
    const x = tx * U;
    const h = (0.009 + hash(i + 2100) * 0.004) * U;
    const b = 0.004 * U;
    for (const [dx, lean] of [
      [-b, -0.5],
      [0, 0],
      [b, 0.5],
    ] as const) {
      const y = ground(x + dx);
      tufts.push([
        [x + dx - b * 0.6, y + 0.002 * U],
        [x + dx + lean * b, y - h * (dx === 0 ? 1 : 0.75)],
        [x + dx + b * 0.6, y + 0.002 * U],
      ]);
    }
  });
  const daisies = DAISIES.map(([dx, k]) => {
    const x = dx * U;
    const y0 = ground(x);
    const y = y0 - 0.009 * U * k;
    const r = 0.0042 * U * k;
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, rx: r * 0.75, ry: r * 0.5, rot: a };
    });
    return { x, base: y0 + 0.003 * U, stem: y0 - 0.008 * U * k, y, petals, r: 0.0028 * U * k };
  });

  // The tree, as island.ts's `tree` draws it.
  const tx = TREE_X * U;
  const ty = 0.004 * U;
  const tw = 0.008 * U;
  const th = 0.026 * U;
  const tr = 0.02 * U;
  const ccy = ty - th - 0.004 * U;
  const tree = {
    trunk: [
      [tx - tw, ty],
      [tx - tw * 0.6, ty - th],
      [tx + tw * 0.6, ty - th],
      [tx + tw, ty],
    ] as Pts,
    crown: CROWN.map(([dx, dy, k]) => [tx + dx * tr, ccy + dy * tr, k * tr] as const),
    lit: CROWN.map(([dx, dy, k]) => [tx + dx * tr - k * tr * 0.05, ccy + dy * tr - k * tr * 0.14, k * tr * 0.88] as const),
    shine: CROWN.filter(([, , k]) => k >= 0.8).map(([dx, dy, k]) => ({
      x: tx + (dx - 0.3 * k) * tr,
      y: ccy + (dy - 0.42 * k) * tr,
      rx: k * tr * 0.3,
      ry: k * tr * 0.18,
      rot: -0.5,
    })),
  };

  // The plinth: 1.1 times the base bar, as island.ts's `plinth` stands it.
  const pw = ISLAND.barW * 1.1;
  const ph = PLINTH_H * U;
  const plinth = { x: -pw / 2, y: ISLAND.floor, w: pw, h: ph, r: ph * 0.3, lit: ph * 0.3, shade: ph * 0.28, joints: [-pw / 6, pw / 6] };

  const bars = buildBars();

  const fx = SPRING.x - SPRING.out;
  const spring = { mouth: [SPRING.x, SPRING.y] as Pt, x: fx, top: SPRING.y + SPRING.drop, foot: SPRING.foot, w: SPRING.w };
  const mist = { x: fx + SPRING.w * 0.125, y: SPRING.foot + 0.015, r: 0.1, shape: LONG_CLOUD };

  // The box round everything, with each part's motion at its widest.
  const box: Box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  const add = (x: number, y: number, rx = 0, ry = rx) => {
    box.l = Math.min(box.l, x - rx);
    box.r = Math.max(box.r, x + rx);
    box.t = Math.min(box.t, y - ry);
    box.b = Math.max(box.b, y + ry);
  };
  for (const pts of [cap, underside, ...tufts, tree.trunk]) for (const [x, y] of pts) add(x, y);
  for (const [x, y, r] of tree.crown) add(x, y, r);
  for (const d of daisies) for (const p of d.petals) add(p.x, p.y, p.rx);
  for (const b of bars) {
    const s = swayReach(b.level);
    add(b.x - s, b.y);
    add(b.x + b.w + s, b.y + b.h);
  }
  add(plinth.x, plinth.y);
  add(plinth.x + plinth.w, plinth.y + plinth.h);
  // A root lies within its curves' control points, its tip swung either way.
  const rootBox = (x: number, y: number, len: number, w: number, bend: number, swing: number) => {
    add(x - w / 2 + Math.min(0, bend), y);
    add(x + w / 2 + Math.max(0, bend), y + len * 0.7);
    add(x - w * 0.2 - Math.abs(bend), y + len * 0.7);
    add(x + w * 0.2 + Math.abs(bend), y + len * 0.65);
    add(x + bend * 0.4, y + len, swing, 0);
  };
  for (const r of roots) {
    rootBox(r.x, r.y, r.len, r.w, r.bend, ROOT_SWING);
    if (r.fork) rootBox(r.fork.x, r.fork.y, r.fork.len, r.fork.w, r.fork.bend, ROOT_SWING * 0.6);
  }
  for (const v of VINES) {
    const x = v.x;
    add(x - 0.012 * U - 0.02 * U, ISLAND.capH - 0.01 * U);
    add(x + VINE_SWAY + 0.02 * U, ISLAND.capH + v.len * U + 0.01 * U);
  }
  add(SPRING.x + SPRING.w * 0.4, SPRING.y - SPRING.w * 0.75 - SPRING.w * 0.4);
  add(fx - SPRING.w * 1.05 - SPRING.w * 0.1, SPRING.foot);
  add(fx + SPRING.w * 1.3, SPRING.foot);
  // The mist's cloud: its puffs and flat base, as shapes.ts draws them.
  for (const [dx, dy, r] of mist.shape) add(mist.x + dx * mist.r, mist.y + dy * mist.r, r * mist.r);
  add(mist.x, mist.y + 0.3 * mist.r);

  return { cap: simplify(cap), capLit, capTop, underside: underOutline, bands, pebbles, shards: geode, roots, tufts, daisies, tree, plinth, bars, spring, mist, box };
}

// ---------------------------------------------------------------- motion

/** How far a root's tip swings, and a vine's tip sways, cameo units (Classic's, in u, scaled). */
const ROOT_SWING = 0.003 * U;
const VINE_SWAY = 0.005 * U;

/** How far root `i`'s tip has swung at time `t`, cameo units. */
export function rootSwing(i: number, t: number): number {
  return Math.sin(t * 0.8 + i * 1.7) * ROOT_SWING;
}

/** How far vine `i`'s tip has swayed at time `t`, cameo units. */
export function vineSway(i: number, t: number): number {
  return Math.sin(t * 0.9 + i * 2.3) * VINE_SWAY;
}

// ---------------------------------------------------------------- tracing

/** Adds a point list to the current path, mapped into the frame; closed unless `open`. */
export function tracePts(ctx: Ctx, c: CameoFrame, pts: Pts, open = false): void {
  if (!pts.length) return;
  ctx.moveTo(toX(c, pts[0]![0]), toY(c, pts[0]![1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(c, pts[i]![0]), toY(c, pts[i]![1]));
  if (!open) ctx.closePath();
}

/** Adds ellipses to the current path, each its own subpath. */
export function traceOvals(ctx: Ctx, c: CameoFrame, list: readonly CameoOval[], grow = 1): void {
  for (const o of list) oval(ctx, toX(c, o.x), toY(c, o.y), o.rx * c.k * grow, o.ry * c.k * grow, o.rot * c.m);
}

/** Adds circles ([x, y, r] in units) to the current path, each its own subpath. */
export function traceCircles(ctx: Ctx, c: CameoFrame, list: readonly (readonly [number, number, number])[]): void {
  for (const [x, y, r] of list) circle(ctx, toX(c, x), toY(c, y), r * c.k);
}

/** One tapered root hanging from (x, y) in units, as island.ts's `rootPath` curls it. */
function rootPath(ctx: Ctx, c: CameoFrame, x: number, y: number, len: number, w: number, bend: number, swing: number): void {
  const tx = x + bend * 0.4 + swing;
  const ty = y + len;
  ctx.moveTo(toX(c, x - w / 2), toY(c, y));
  ctx.bezierCurveTo(toX(c, x - w / 2 + bend), toY(c, y + len * 0.35), toX(c, x - w * 0.2 - bend), toY(c, y + len * 0.7), toX(c, tx), toY(c, ty));
  ctx.bezierCurveTo(toX(c, x + w * 0.2 - bend), toY(c, y + len * 0.65), toX(c, x + w / 2 + bend), toY(c, y + len * 0.3), toX(c, x + w / 2), toY(c, y));
  ctx.closePath();
}

/** Adds the roots (and their forks) as they swing now: tapered closed shapes. */
export function traceRoots(ctx: Ctx, c: CameoFrame): void {
  const roots = cameo().roots;
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i]!;
    const swing = rootSwing(i, c.t);
    rootPath(ctx, c, r.x, r.y, r.len, r.w, r.bend, swing);
    if (r.fork) rootPath(ctx, c, r.fork.x, r.fork.y, r.fork.len, r.fork.w, r.fork.bend, swing * 0.6);
  }
}

/** Adds the vines' stems as they sway now: open curves from under the cap's lip (stroke them). */
export function traceVines(ctx: Ctx, c: CameoFrame): void {
  const y = ISLAND.capH;
  for (let i = 0; i < VINES.length; i++) {
    const v = VINES[i]!;
    const len = v.len * U;
    ctx.moveTo(toX(c, v.x), toY(c, y - 0.01 * U));
    ctx.quadraticCurveTo(toX(c, v.x - 0.012 * U), toY(c, y + len * 0.5), toX(c, v.x + vineSway(i, c.t)), toY(c, y + len));
  }
}

/** Adds the vines' leaves, in pairs down each stem, as they sway now. */
export function traceLeaves(ctx: Ctx, c: CameoFrame): void {
  const y = ISLAND.capH;
  for (let i = 0; i < VINES.length; i++) {
    const v = VINES[i]!;
    const x = v.x;
    const len = v.len * U;
    const sway = vineSway(i, c.t);
    for (let k = 1; k <= 3; k++) {
      const f = k / 3.2;
      const lx = (1 - f) * (1 - f) * x + 2 * f * (1 - f) * (x - 0.012 * U) + f * f * (x + sway);
      const ly = y - 0.01 * U + (len + 0.01 * U) * f;
      const side = k % 2 ? -1 : 1;
      oval(ctx, toX(c, lx + side * 0.009 * U), toY(c, ly), 0.009 * U * c.k, 0.005 * U * c.k, side * 0.5 * c.m);
    }
  }
}

/**
 * Adds the spring: a stream gushing out of the crack in the underside's left, turning down and
 * fanning a little, then falling straight into its puff of mist (closed).
 */
export function traceSpring(ctx: Ctx, c: CameoFrame): void {
  const { x, y, w, out, drop, fan, foot } = SPRING;
  const fx = x - out;
  const top = y + drop;
  const wob = Math.sin(c.t * 2.2) * 0.0015 * U;
  const X = (v: number) => toX(c, v);
  const Y = (v: number) => toY(c, v);
  ctx.moveTo(X(x + w * 0.4), Y(y - w * 0.75));
  ctx.bezierCurveTo(X(x - out * 0.45), Y(y - w * 1.1), X(fx - w * 0.75), Y(y - w * 0.2), X(fx - w * 0.55), Y(top));
  ctx.bezierCurveTo(X(fx - w * 0.6 + wob), Y(top + fan * 0.38), X(fx - w * 1.05), Y(top + fan * 0.7), X(fx - w * 1.05), Y(top + fan));
  ctx.lineTo(X(fx - w * 1.05), Y(foot));
  ctx.lineTo(X(fx + w * 1.3), Y(foot));
  ctx.lineTo(X(fx + w * 1.3), Y(top + fan));
  ctx.bezierCurveTo(X(fx + w * 1.3), Y(top + fan * 0.7), X(fx + w * 0.75 - wob), Y(top + fan * 0.38), X(fx + w * 0.55), Y(top + 0.004 * U));
  ctx.bezierCurveTo(X(fx + w * 0.5), Y(y + w * 0.4), X(x - out * 0.3), Y(y + w * 0.3), X(x + w * 0.4), Y(y + w * 0.75));
  ctx.closePath();
}

/** Adds the lighter core where the spring gushes out (closed). */
export function traceSpringCore(ctx: Ctx, c: CameoFrame): void {
  const { x, y, w, out, drop } = SPRING;
  const fx = x - out;
  const top = y + drop;
  ctx.moveTo(toX(c, x - out * 0.2), toY(c, y - w * 0.35));
  ctx.quadraticCurveTo(toX(c, fx), toY(c, y - w * 0.3), toX(c, fx - w * 0.05), toY(c, top + 0.006 * U));
  ctx.lineTo(toX(c, fx + w * 0.2), toY(c, top + 0.006 * U));
  ctx.quadraticCurveTo(toX(c, fx + w * 0.3), toY(c, y), toX(c, x - out * 0.2), toY(c, y + w * 0.05));
  ctx.closePath();
}

/**
 * Calls `each` for every streak sliding down the falling water now, in three lanes that spread
 * with it: its rectangle (left, top, width, height, px; mirrored frames give a left edge too) and
 * how much it shows (0..1, fading in as it leaves the lip).
 */
export function eachStreak(c: CameoFrame, each: (x: number, y: number, w: number, h: number, a: number) => void): void {
  const { x, y, w, out, drop, foot, speed, gap } = SPRING;
  const fx = x - out;
  const top = y + drop;
  const sh = 0.018 * U;
  for (let i = 0; i < 3; i++) {
    const phase = (c.t * speed + (i * gap) / 3 + hash(i + 2300) * gap * 0.3) % gap;
    for (let sy = top + phase; sy < foot; sy += gap) {
      const f = Math.min(1, (sy - top) / (0.09 * U));
      const a = Math.min(1, (sy - top) / (0.025 * U)) * 0.85;
      const sx = fx + w * (0.05 + (i - 1) * (0.3 + 0.35 * f));
      const l = Math.min(toX(c, sx - w * 0.11), toX(c, sx + w * 0.11));
      each(l, toY(c, sy), w * 0.22 * c.k, Math.min(sh, foot - sy) * c.k, a);
    }
  }
}

// ---------------------------------------------------------------- the default painter

/** The colors (and ink) a painter dresses the cameo in. */
export interface CameoLook {
  /** Outline color, and its weight as a multiple of Classic's (0: no outlines). */
  ink: string;
  inkScale: number;
  grass: string;
  grassLight: string;
  grassShade: string;
  /** The strata, top to bottom: body and lit strip. */
  strata: readonly { body: string; lit: string }[];
  pebble: string;
  pebbleShade: string;
  gem: string;
  gemLight: string;
  gemShade: string;
  water: string;
  waterLight: string;
  root: string;
  vine: string;
  vineLeaf: string;
  stone: string;
  stoneLight: string;
  stoneShade: string;
  petal: string;
  sunny: string;
  leaf: string;
  leafLight: string;
  leafShade: string;
  trunk: string;
  /** The puff of mist: shade, body, light caps. */
  mist: readonly [string, string, string];
}

/** Sky Islands' own colors (classic/colors.ts). */
export const CLASSIC_LOOK: CameoLook = {
  ink: classic.INK,
  inkScale: 1,
  grass: classic.GRASS,
  grassLight: classic.GRASS_LIGHT,
  grassShade: classic.GRASS_SHADE,
  strata: classic.STRATA,
  pebble: classic.PEBBLE,
  pebbleShade: classic.PEBBLE_SHADE,
  gem: classic.GEM,
  gemLight: classic.GEM_LIGHT,
  gemShade: classic.GEM_SHADE,
  water: classic.WATER,
  waterLight: classic.WATER_LIGHT,
  root: classic.ROOT,
  vine: classic.VINE,
  vineLeaf: classic.VINE_LEAF,
  stone: classic.STONE,
  stoneLight: classic.STONE_LIGHT,
  stoneShade: classic.STONE_SHADE,
  petal: classic.PETAL,
  sunny: classic.SUNNY,
  leaf: classic.LEAF,
  leafLight: classic.LEAF_LIGHT,
  leafShade: classic.LEAF_SHADE,
  trunk: classic.TRUNK,
  mist: [classic.CLOUD_SHADE, classic.CLOUD, classic.CLOUD_LIGHT],
};

/** Classic's ink weight up close (island.ts's `inkW`: 0.0058 u) per cameo unit, and the thinnest line drawn. */
const INK_PER_UNIT = 0.0058 * U;
const INK_MIN = 0.75;
/** From this size (px per unit) the small things show: tufts, daisies, pebbles, leaves, facets, the tree's shading, streaks, the glint. */
const DETAIL_K = 40;
/** The bars' bevels (Classic's toy-block look): lit top and shaded foot, fractions of the bar's height. */
const BEVEL_TOP = 0.16;
const BEVEL_FOOT = 0.18;

const RECT = { x: 0, y: 0, w: 0, h: 0 };

/**
 * Paints the cameo in Classic's look: flat two-tone fills with one ink weight, the bars in
 * `bars`' colors (a skin's `bars`, by level) with their bevels and outlines. Honors the
 * context's globalAlpha (to fade it into a haze).
 */
export function paintCameo(ctx: Ctx, c: CameoFrame, bars: readonly { color: string }[], look: CameoLook = CLASSIC_LOOK): void {
  const g = cameo();
  const k = c.k;
  const lw = look.inkScale > 0 ? Math.max(INK_MIN, k * INK_PER_UNIT * look.inkScale) : 0;
  const detail = k >= DETAIL_K;
  const base = ctx.globalAlpha;

  // The spring behind the island and the roots, outlined together, then the mist the spring falls into.
  ctx.beginPath();
  traceSpring(ctx, c);
  ctx.fillStyle = look.water;
  ctx.fill();
  if (detail) {
    ctx.fillStyle = look.waterLight;
    ctx.globalAlpha = base * 0.55;
    ctx.beginPath();
    traceSpringCore(ctx, c);
    ctx.fill();
    ctx.globalAlpha = base;
    eachStreak(c, (x, y, w, h, a) => {
      ctx.globalAlpha = base * a;
      ctx.fillRect(x, y, w, h);
    });
    ctx.globalAlpha = base;
  }
  ctx.beginPath();
  traceRoots(ctx, c);
  ctx.fillStyle = look.root;
  ctx.fill();
  if (lw) {
    traceSpring(ctx, c);
    ink(ctx, lw, look.ink);
    // Fill the roots again so the outline only shows outside them (where a fork crosses its root).
    if (detail) {
      ctx.beginPath();
      traceRoots(ctx, c);
      ctx.fill();
    }
  }
  cloud(ctx, g.mist.shape, toX(c, g.mist.x), toY(c, g.mist.y), g.mist.r * k, look.mist[0], look.mist[1], look.mist[2]);

  // The striped underside over the roots' tops.
  for (const b of g.bands) {
    const colors = look.strata[b.index]!;
    ctx.beginPath();
    tracePts(ctx, c, b.below);
    ctx.fillStyle = colors.body;
    ctx.fill();
    if (b.lit.length) {
      ctx.beginPath();
      tracePts(ctx, c, b.lit);
      ctx.fillStyle = colors.lit;
      ctx.fill();
    }
  }
  if (detail) {
    ctx.beginPath();
    traceOvals(ctx, c, g.pebbles.shade);
    ctx.fillStyle = look.pebbleShade;
    ctx.fill();
    ctx.beginPath();
    traceOvals(ctx, c, g.pebbles.lit);
    ctx.fillStyle = look.pebble;
    ctx.fill();
  }
  ctx.beginPath();
  for (const s of g.shards) tracePts(ctx, c, s.body);
  ctx.fillStyle = look.gem;
  ctx.fill();
  if (detail) {
    if (lw) {
      ink(ctx, lw * 0.8, look.ink);
      ctx.fill();
    }
    ctx.beginPath();
    for (const s of g.shards) tracePts(ctx, c, s.lit);
    ctx.fillStyle = look.gemLight;
    ctx.fill();
    ctx.beginPath();
    for (const s of g.shards) tracePts(ctx, c, s.shade);
    ctx.fillStyle = look.gemShade;
    ctx.fill();
  }
  if (lw) {
    ctx.beginPath();
    tracePts(ctx, c, g.underside);
    ink(ctx, lw, look.ink);
  }
  if (detail) glint(ctx, c);

  // Vines over the lip, then the grass cap.
  ctx.beginPath();
  traceVines(ctx, c);
  const vw = Math.max(1, 0.005 * U * k);
  if (lw && detail) inkedLine(ctx, look.vine, vw, lw * 0.5, look.ink);
  else {
    ctx.strokeStyle = look.vine;
    ctx.lineWidth = vw;
    ctx.stroke();
  }
  if (detail) {
    ctx.beginPath();
    traceLeaves(ctx, c);
    ctx.fillStyle = look.vineLeaf;
    ctx.fill();
    if (lw) {
      ink(ctx, lw, look.ink);
      ctx.fill();
    }
  }
  ctx.beginPath();
  tracePts(ctx, c, g.cap);
  ctx.fillStyle = look.grassShade;
  ctx.fill();
  ctx.beginPath();
  tracePts(ctx, c, g.capLit);
  ctx.fillStyle = look.grass;
  ctx.fill();
  ctx.beginPath();
  tracePts(ctx, c, g.capTop);
  ctx.fillStyle = look.grassLight;
  ctx.fill();
  if (lw) {
    ctx.beginPath();
    tracePts(ctx, c, g.cap);
    ink(ctx, lw, look.ink);
  }
  if (detail) flowers(ctx, c, look);

  // The little tree, then the plinth and the tower on it.
  tree(ctx, c, look, lw, detail);
  tower(ctx, c, bars, look, lw, detail);
}

/** Tufts and daisies on the cap's top edge. */
function flowers(ctx: Ctx, c: CameoFrame, look: CameoLook): void {
  const g = cameo();
  ctx.beginPath();
  for (const t of g.tufts) tracePts(ctx, c, t);
  ctx.fillStyle = look.grassLight;
  ctx.fill();
  ctx.beginPath();
  for (const d of g.daisies) {
    ctx.moveTo(toX(c, d.x), toY(c, d.base));
    ctx.lineTo(toX(c, d.x), toY(c, d.stem));
  }
  ctx.strokeStyle = look.grassShade;
  ctx.lineWidth = Math.max(1, 0.0022 * U * c.k);
  ctx.stroke();
  ctx.beginPath();
  for (const d of g.daisies) traceOvals(ctx, c, d.petals);
  ctx.fillStyle = look.petal;
  ctx.fill();
  ctx.beginPath();
  for (const d of g.daisies) circle(ctx, toX(c, d.x), toY(c, d.y), d.r * c.k);
  ctx.fillStyle = look.sunny;
  ctx.fill();
}

/** Now and then a glint flashes on a crystal's tip (Classic's rhythm). */
function glint(ctx: Ctx, c: CameoFrame): void {
  const f = glintPhase(c.t);
  if (f < 0) return;
  const shards = cameo().shards;
  const [x, y] = shards[Math.floor(c.t / GLINT_EVERY) % shards.length]!.tip;
  const gx = toX(c, x);
  const gy = toY(c, y);
  const r = 0.014 * U * c.k * Math.sin(f * Math.PI);
  const w = r * 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(gx, gy - r);
  ctx.quadraticCurveTo(gx + w, gy - w, gx + r, gy);
  ctx.quadraticCurveTo(gx + w, gy + w, gx, gy + r);
  ctx.quadraticCurveTo(gx - w, gy + w, gx - r, gy);
  ctx.quadraticCurveTo(gx - w, gy - w, gx, gy - r);
  ctx.closePath();
  ctx.fill();
}

/** The little tree: trunk and crown outlined in one stroke (twice the ink, half of it covered), then filled. */
function tree(ctx: Ctx, c: CameoFrame, look: CameoLook, lw: number, detail: boolean): void {
  const t = cameo().tree;
  if (lw) {
    ctx.beginPath();
    tracePts(ctx, c, t.trunk);
    traceCircles(ctx, c, t.crown);
    ink(ctx, lw * 2, look.ink);
  }
  ctx.beginPath();
  tracePts(ctx, c, t.trunk);
  ctx.fillStyle = look.trunk;
  ctx.fill();
  ctx.beginPath();
  traceCircles(ctx, c, t.crown);
  ctx.fillStyle = look.leafShade;
  ctx.fill();
  if (!detail) return;
  ctx.beginPath();
  traceCircles(ctx, c, t.lit);
  ctx.fillStyle = look.leaf;
  ctx.fill();
  ctx.beginPath();
  traceOvals(ctx, c, t.shine);
  ctx.fillStyle = look.leafLight;
  ctx.fill();
}

/** A rounded rectangle as its own subpath, wound like `rect` (no beginPath, so it can share a fill). */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * The plinth and the tower on it. Their outlines are one ink fill laid under them (each shape
 * grown by half the ink weight), and each is filled inset by as much: the same lines as stroking
 * every bar, for a fraction of the cost. Then the bevels over all the bars at once.
 */
function tower(ctx: Ctx, c: CameoFrame, bars: readonly { color: string }[], look: CameoLook, lw: number, detail: boolean): void {
  const g = cameo();
  const k = c.k;
  const p = g.plinth;
  const n = g.bars.length;
  const px = Math.min(toX(c, p.x), toX(c, p.x + p.w));
  const py = toY(c, p.y);
  const pw = p.w * k;
  const ph = p.h * k;
  const pr = p.r * k;
  const e = lw / 2;
  if (lw) {
    ctx.beginPath();
    roundRect(ctx, px - e, py - e, pw + lw, ph + lw, pr + e);
    for (let i = 0; i < n; i++) {
      const r = barRect(c, i, RECT);
      ctx.rect(r.x - e, r.y - e, r.w + lw, r.h + lw);
    }
    ctx.fillStyle = look.ink;
    ctx.fill();
  }
  ctx.beginPath();
  roundRect(ctx, px + e, py + e, pw - lw, ph - lw, pr - e);
  ctx.fillStyle = look.stone;
  ctx.fill();
  if (detail) {
    const lit = p.lit * k - e;
    const shade = p.shade * k - e;
    const x0 = px + pr;
    const w = pw - pr * 2;
    ctx.fillStyle = look.stoneLight;
    ctx.fillRect(x0, py + e, w, lit);
    ctx.fillStyle = look.stoneShade;
    ctx.fillRect(x0, py + ph - e - shade, w, shade);
    for (const j of p.joints) ctx.fillRect(toX(c, j) - lw * 0.4, py + e + lit, lw * 0.8, ph - lw - lit - shade);
  }
  for (let i = 0; i < n; i++) {
    const r = barRect(c, i, RECT);
    ctx.fillStyle = bars[i % bars.length]!.color;
    ctx.fillRect(r.x + e, r.y + e, r.w - lw, r.h - lw);
  }
  // Bevels: a lit top and a shaded foot on every bar (white and black laid over, as blocks.ts mixes them).
  const h = ISLAND.barH * k;
  const top = h * BEVEL_TOP - e;
  const foot = h * BEVEL_FOOT - e;
  if (top < 0.5) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = barRect(c, i, RECT);
    ctx.rect(r.x + e, r.y + e, r.w - lw, top);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = barRect(c, i, RECT);
    ctx.rect(r.x + e, r.y + r.h - e - foot, r.w - lw, foot);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fill();
}

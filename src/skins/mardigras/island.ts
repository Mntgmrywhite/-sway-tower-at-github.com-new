import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import {
  barRect,
  CAMEO_BARS,
  CAMEO_LANE_K,
  cameo,
  cameoLaneY,
  eachStreak,
  ISLAND,
  placeCameo,
  rootSwing,
  toX,
  toY,
  traceCircles,
  traceLeaves,
  traceOvals,
  tracePts,
  traceSpring,
  traceSpringCore,
  traceVines,
  type CameoFrame,
  type Pt,
} from "../cameo";
import type { Scene } from "../skin";
import { AMBER, BAR_LIT, BAR_SHADE, DAB, GOLD, GREEN, INK, LIME, MIST, PLUMES, PURPLE, SPRING, SPRING_CORE, THREE, TRUNK, VIOLET, type Shades } from "./colors";
import { cloud } from "./shapes";

// Sky Islands' floating island, drifting by in the right lane around level 50 with its own
// 25-bar Sway Tower (src/skins/cameo.ts gives the shape), painted as a Carnival float: the grass
// cap a papier-mâché mound in Carnival green spangled with gold sequins; the underside's five
// strata painted purple, gold, green, violet and amber like a float's skirt, with brush dabs of
// lighter paint; gold doubloons for its pebbles and a teal jewel for its geode; its roots hung as
// strings of beads in the season's three colors, swinging; ribbon vines with gold leaves; its
// spring a sparkling aqua fall into a lilac puff; the little tree a topiary hung with gold baubles;
// the plinth a purple box trimmed in gold like the reviewing stand; and on it the 25 bars in the
// skin's own colors, swaying as the game's tower does. One ink weight, as up close. It comes down
// the lane with the tower (parallax 1), out of the column and clear of the sun and the moon on the
// left, and passes in front of the cloud floor below it (drawn after it: the island floats over
// the cloud sea, never hidden in it) to leave by the bottom of the screen. The spring faces away
// from the tower.

/** The level it shows at, how far down the screen its cap then rests, and its lane's parallax. */
export const ISLAND_LEVEL = 50;
const FRAC = 0.5;
const P = 1;
/** Its place across: u right of the screen's center (mirrored, so its spring falls on the outside), and its size (px per cameo unit, in u: a little over CAMEO_LANE_K, as much as the lane holds). */
const X = 0.36;
const K = CAMEO_LANE_K * 1.18;

const FRAME: CameoFrame = { x: 0, y: 0, k: 0, m: -1, t: 0 };

/** Where the island is in this scene (its frame, reused). */
export function islandFrame(s: Scene): CameoFrame {
  return placeCameo(s.cssW / 2 + X * s.u, cameoLaneY(s, ISLAND_LEVEL, FRAC, P), s.u * K, -1, s.t, FRAME);
}

/** The strata's paint, top to bottom. */
const STRATA: readonly Shades[] = [PURPLE, GOLD, GREEN, VIOLET, AMBER];
/** Brush dabs of lighter paint on the strata: [band, fraction along its top edge, depth below it (units)]. */
const DABS = Array.from({ length: 10 }, (_, i) => [i % 5, 0.2 + hash(i + 3100) * 0.6, 0.03 + hash(i + 3110) * 0.04] as const);
/** Gold sequins on the cap: x (units) along its top. */
const SEQUINS = Array.from({ length: 9 }, (_, i) => -0.85 + (i / 8) * 1.7 + (hash(i + 3200) - 0.5) * 0.08);

/** A point on a polyline at fraction f of its points. */
function along(pts: readonly Pt[], f: number): Pt {
  const i = Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1))));
  return pts[i]!;
}

/** The bead strands' dash, reused. */
const DASH = [0.001, 1];
const NO_DASH: number[] = [];
const RECT = { x: 0, y: 0, w: 0, h: 0 };

/** The island's roots as strands of beads: each root's center line, swinging (the cameo's own curve). */
function strands(ctx: Ctx, c: CameoFrame, color: number): void {
  const roots = cameo().roots;
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i]!;
    const sw = rootSwing(i, c.t);
    const line = (x: number, y: number, len: number, bend: number, swing: number) => {
      ctx.moveTo(toX(c, x), toY(c, y));
      ctx.bezierCurveTo(toX(c, x + bend), toY(c, y + len * 0.35), toX(c, x - bend), toY(c, y + len * 0.7), toX(c, x + bend * 0.4 + swing), toY(c, y + len));
    };
    if (color < 0 || i % 3 === color) line(r.x, r.y, r.len, r.bend, sw);
    if (r.fork && (color < 0 || (i + 1) % 3 === color)) line(r.fork.x, r.fork.y, r.fork.len, r.fork.bend, sw * 0.6);
  }
}

/** Paints the island and its tower in this frame, papier-mâché style (see the header). */
export function paintIsland(ctx: Ctx, c: CameoFrame, bars: readonly { color: string }[]): void {
  const g = cameo();
  const k = c.k;
  const lw = Math.max(0.8, k * 0.045);
  // The spring behind everything, falling into its puff.
  ctx.beginPath();
  traceSpring(ctx, c);
  ctx.fillStyle = SPRING;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = SPRING_CORE;
  ctx.beginPath();
  traceSpringCore(ctx, c);
  ctx.fill();
  ctx.beginPath();
  eachStreak(c, (x, y, w, h) => ctx.rect(x, y, w, h));
  ctx.fill();
  cloud(ctx, g.mist.shape, toX(c, g.mist.x), toY(c, g.mist.y), g.mist.r * k, MIST[0], MIST[1], MIST[2]);
  // The roots hung as strands of beads: a string of ink under them, then the beads in their colors.
  const bead = Math.max(1.1, k * 0.036);
  ctx.lineCap = "round";
  ctx.beginPath();
  strands(ctx, c, -1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, bead * 0.8);
  ctx.stroke();
  ctx.lineWidth = bead * 2;
  DASH[1] = bead * 2.3;
  ctx.setLineDash(DASH);
  for (let col = 0; col < 3; col++) {
    ctx.beginPath();
    strands(ctx, c, col);
    ctx.strokeStyle = THREE[col]!.body;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  // The strata, each painted over the last, their lit strips, the dabs, the doubloons and the jewel.
  for (const b of g.bands) {
    const paint = STRATA[b.index % STRATA.length]!;
    ctx.beginPath();
    tracePts(ctx, c, b.below);
    ctx.fillStyle = paint.body;
    ctx.fill();
    if (b.lit.length) {
      ctx.beginPath();
      tracePts(ctx, c, b.lit);
      ctx.fillStyle = paint.light;
      ctx.fill();
    }
  }
  ctx.fillStyle = DAB;
  ctx.beginPath();
  for (const [band, f, d] of DABS) {
    const [x, y] = along(g.bands[band]!.edge, f);
    oval(ctx, toX(c, x), toY(c, y + d + 0.03), k * 0.07, k * 0.025, 0.15 * c.m);
  }
  ctx.fill();
  ctx.beginPath();
  traceOvals(ctx, c, g.pebbles.shade, 0.9);
  ctx.fillStyle = GOLD.shade;
  ctx.fill();
  ctx.beginPath();
  traceOvals(ctx, c, g.pebbles.lit, 0.8);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ctx.beginPath();
  for (const sh of g.shards) tracePts(ctx, c, sh.body);
  ctx.fillStyle = PLUMES[1]!.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (const sh of g.shards) tracePts(ctx, c, sh.lit);
  ctx.fillStyle = PLUMES[1]!.light;
  ctx.fill();
  ctx.beginPath();
  tracePts(ctx, c, g.underside);
  ink(ctx, lw, INK);
  // Ribbon vines over the lip with gold leaves.
  ctx.beginPath();
  traceVines(ctx, c);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, k * 0.05) + lw;
  ctx.stroke();
  ctx.strokeStyle = LIME.body;
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.stroke();
  ctx.beginPath();
  traceLeaves(ctx, c);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  // The cap: a papier-mâché mound, shaded rim, green body, lit top, gold sequins along it.
  ctx.beginPath();
  tracePts(ctx, c, g.cap);
  ctx.fillStyle = GREEN.shade;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  tracePts(ctx, c, g.capLit);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ctx.beginPath();
  tracePts(ctx, c, g.capTop);
  ctx.fillStyle = GREEN.light;
  ctx.fill();
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  for (const x of SEQUINS) circle(ctx, toX(c, x), toY(c, ISLAND.capH * 0.55), k * 0.024);
  ctx.fill();
  // Tufts, and the daisies as little purple-and-gold rosettes.
  ctx.beginPath();
  for (const t of g.tufts) tracePts(ctx, c, t);
  ctx.fillStyle = GREEN.light;
  ctx.fill();
  ctx.beginPath();
  for (const d of g.daisies) traceOvals(ctx, c, d.petals);
  ctx.fillStyle = VIOLET.light;
  ctx.fill();
  ctx.beginPath();
  for (const d of g.daisies) circle(ctx, toX(c, d.x), toY(c, d.y), d.r * k);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  // The topiary: a round green tree on a plum trunk, gold baubles on it.
  const tree = g.tree;
  ctx.beginPath();
  tracePts(ctx, c, tree.trunk);
  traceCircles(ctx, c, tree.crown);
  ink(ctx, lw * 2, INK);
  ctx.beginPath();
  tracePts(ctx, c, tree.trunk);
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ctx.beginPath();
  traceCircles(ctx, c, tree.crown);
  ctx.fillStyle = LIME.shade;
  ctx.fill();
  ctx.beginPath();
  traceCircles(ctx, c, tree.lit);
  ctx.fillStyle = LIME.body;
  ctx.fill();
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  for (const [x, y, r] of tree.crown) circle(ctx, toX(c, x + r * 0.3), toY(c, y + r * 0.2), k * 0.018);
  ctx.fill();
  // The plinth: a purple box with a gold band, outlined; then the bars on it.
  const p = g.plinth;
  const px = Math.min(toX(c, p.x), toX(c, p.x + p.w));
  const py = toY(c, p.y);
  ctx.beginPath();
  ctx.rect(px, py, p.w * k, p.h * k);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(px, py + p.h * k * 0.35, p.w * k, p.h * k * 0.25);
  tower(ctx, c, bars, lw);
}

/** The 25 bars on the plinth, swaying: an ink fill under them (each grown by half the ink), each bar in its color inset, a lit top and a shaded foot on every one. */
function tower(ctx: Ctx, c: CameoFrame, bars: readonly { color: string }[], lw: number): void {
  const e = lw / 2;
  ctx.beginPath();
  for (let i = 0; i < CAMEO_BARS; i++) {
    const r = barRect(c, i, RECT);
    ctx.rect(r.x - e, r.y - e, r.w + lw, r.h + lw);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  for (let i = 0; i < CAMEO_BARS; i++) {
    const r = barRect(c, i, RECT);
    ctx.fillStyle = bars[i % bars.length]!.color;
    ctx.fillRect(r.x + e, r.y + e, r.w - lw, r.h - lw);
  }
  const h = ISLAND.barH * c.k;
  const top = h * 0.18 - e;
  if (top < 0.5) return;
  ctx.beginPath();
  for (let i = 0; i < CAMEO_BARS; i++) {
    const r = barRect(c, i, RECT);
    ctx.rect(r.x + e, r.y + e, r.w - lw, top);
  }
  ctx.fillStyle = BAR_LIT;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < CAMEO_BARS; i++) {
    const r = barRect(c, i, RECT);
    ctx.rect(r.x + e, r.y + r.h - e - top, r.w - lw, top);
  }
  ctx.fillStyle = BAR_SHADE;
  ctx.fill();
}

/** The island in the sky, where the scene has it, its bars in `bars`' colors (the skin's); nothing when it is off screen. */
export function skyIsland(ctx: Ctx, s: Scene, bars: readonly { color: string }[]): void {
  const f = islandFrame(s);
  const k = f.k;
  if (f.y + k * 1.3 < 0 || f.y - k * 4.2 > s.cssH) return;
  paintIsland(ctx, f, bars);
}

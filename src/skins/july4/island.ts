import { circle, ink, mix, type Ctx } from "../../base/draw";
import type { Bar, Scene } from "../skin";
import {
  barRect,
  CAMEO_LANE_K,
  cameo,
  cameoBounds,
  eachStreak,
  ISLAND,
  placeCameo,
  toX,
  toY,
  traceCircles,
  traceLeaves,
  traceOvals,
  tracePts,
  traceRoots,
  traceSpring,
  traceSpringCore,
  traceVines,
  type CameoFrame,
} from "../cameo";
import { BAR_SHADE, BAR_SHEEN, GILT, ISLAND_GEM, ISLAND_GRASS, ISLAND_LEAF, ISLAND_ROOT, ISLAND_STONE, ISLAND_STRATA, ISLAND_UNDERSHADE, ISLAND_WATER, ISLAND_WATER_LIGHT, LINEN, SEPIA, TRUNK } from "./colors";
import { CAMEO_AT, LANE_P, laneY, PERIOD } from "./drift";
import { backLine } from "./land";
import { POLE_TOP } from "./landmarks";
import { wash } from "./paint";
import type { Tone } from "./tone";

// Sky Islands' floating island with its 25-bar tower (the owner: "the classic floating island
// should be present in the sky around stack 50 in each map", "it should match the art style of
// the page and have a 25 stack on it"), drifting in the right lane of the Fourth's sky around
// level 50 like a picture on a vintage postcard: every part painted soft and round in a wash from
// its lit top into its shade, the island's grass a lush summer green, its strata warm earth
// tones, the spring a soft blue falling into a puff of cloud painted like the Fourth's own, the
// little tree a round treetop with lit dabs, the bars in the skin's own colors with a soft lit top,
// and a fine sepia line round it all; the evening's warm light lies over it (it comes by in the
// golden hour). Its shape is the shared cameo's (src/skins/cameo.ts); it is anchored at a height
// in the lane like the lane's things (drift.ts CAMEO_AT: its middle a little above mid-screen at
// level 50, clear above the courthouse's flag on every screen, the lane kept clear for it), comes
// down past as you climb and, past its hour, fades into the evening haze before it would reach
// the courthouse's flag (the landmark right under the lane; july4.ts paints the island before the
// town, so it could only sink behind it), and comes round again with every turn of the story's
// loop at the same golden hour. Mirrored so its spring falls on the side away from the tower;
// never in the tower's column, never over the sun or the moon (the left of the sky is theirs),
// never off the screen, and the fireworks keep clear of it (fireworks.ts).


/** Where in the lane the island hangs (u from the screen's center to its middle). */
const ISLAND_X = 0.375;

/** The frame the island is drawn in now, reused. */
const FRAME: CameoFrame = { x: 0, y: 0, k: 0, m: -1, t: 0 };

/** Where the island is in this scene, or null where it is off screen. */
export function islandFrame(s: Scene): CameoFrame | null {
  const k = CAMEO_LANE_K * s.u;
  const box = cameo().box;
  // Mirrored (the spring away from the tower): its box spans x - r k .. x - l k; centered on ISLAND_X.
  const mid = s.cssW / 2 + ISLAND_X * s.u;
  const x = mid + ((box.r + box.l) / 2) * k;
  // It comes round with every turn of the story, at the same hour (tone.ts): the turn nearest the screen.
  const base = laneY(s, CAMEO_AT);
  const turn = PERIOD * s.scale * LANE_P;
  const n = Math.max(0, Math.round((base - s.cssH * 0.5) / turn));
  placeCameo(x, base - n * turn, k, -1, s.t, FRAME);
  const b = cameoBounds(FRAME, 2);
  if (b.b < 0 || b.t > s.cssH) return null;
  return FRAME;
}

/** The island's top and bottom on screen now (px), or null where it is off screen: the fireworks keep clear of it. */
export function islandSpan(s: Scene): { t: number; b: number; l: number } | null {
  const c = islandFrame(s);
  if (!c) return null;
  const b = cameoBounds(c, 2);
  return { t: b.t, b: b.b, l: b.l };
}

/** A color in the hour's light: a step into the haze, warmed by the sunlight. */
function lit(c: string, tone: Tone): string {
  return mix(c, tone.sunlight, tone.lit * 0.7);
}

/** Paints the island in the postcard's style, at frame `c`, its bars in `bars`' colors. */
export function paintIsland(ctx: Ctx, c: CameoFrame, tone: Tone, bars: readonly Pick<Bar, "color">[], alpha = 1): void {
  const g = cameo();
  const k = c.k;
  const lw = Math.max(0.8, k * 0.03);
  ctx.globalAlpha = alpha;
  // The spring behind everything, its gushing core and its streaks; the roots.
  ctx.beginPath();
  traceSpring(ctx, c);
  ctx.fillStyle = wash(ctx, toY(c, g.spring.top - 0.1), toY(c, g.spring.foot), [ISLAND_WATER_LIGHT, ISLAND_WATER]);
  ctx.fill();
  ink(ctx, lw * 0.8, SEPIA);
  ctx.fillStyle = ISLAND_WATER_LIGHT;
  ctx.globalAlpha = 0.6 * alpha;
  ctx.beginPath();
  traceSpringCore(ctx, c);
  ctx.fill();
  eachStreak(c, (x, y, w, h, a) => {
    ctx.globalAlpha = a * 0.7 * alpha;
    ctx.fillRect(x, y, w, h);
  });
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  traceRoots(ctx, c);
  ctx.fillStyle = ISLAND_ROOT;
  ctx.fill();
  // The puff of mist the spring falls into, painted like the Fourth's clouds.
  const m = g.mist;
  const mx = toX(c, m.x);
  const my = toY(c, m.y);
  const mr = m.r * k;
  ctx.fillStyle = tone.cloudShade;
  ctx.beginPath();
  for (const [dx, dy, r] of m.shape) circle(ctx, mx + c.m * dx * mr, my + dy * mr + r * mr * 0.12, r * mr);
  ctx.fill();
  ctx.fillStyle = wash(ctx, my - mr * 1.5, my + mr * 0.6, [tone.cloudLight, tone.cloud, tone.cloudShade]);
  ctx.beginPath();
  for (const [dx, dy, r] of m.shape) circle(ctx, mx + c.m * dx * mr, my + dy * mr - r * mr * 0.04, r * mr * 0.95);
  ctx.fill();
  // The striped underside: each stratum in order, its lit strip, then a soft shade deepening toward the tip and a fine line round it.
  for (const b of g.bands) {
    const colors = ISLAND_STRATA[b.index]!;
    ctx.beginPath();
    tracePts(ctx, c, b.below);
    ctx.fillStyle = lit(colors.body, tone);
    ctx.fill();
    if (b.lit.length) {
      ctx.beginPath();
      tracePts(ctx, c, b.lit);
      ctx.fillStyle = lit(colors.lit, tone);
      ctx.fill();
    }
  }
  const top = toY(c, ISLAND.underTop);
  const tip = toY(c, ISLAND.underTop + ISLAND.underD);
  const shade = ctx.createLinearGradient(0, top, 0, tip);
  shade.addColorStop(0, ISLAND_UNDERSHADE[0]);
  shade.addColorStop(1, ISLAND_UNDERSHADE[1]);
  ctx.beginPath();
  tracePts(ctx, c, g.underside);
  ctx.fillStyle = shade;
  ctx.fill();
  if (k > 30) {
    ctx.beginPath();
    traceOvals(ctx, c, g.pebbles.lit);
    ctx.fillStyle = ISLAND_STONE[1];
    ctx.fill();
  }
  ctx.beginPath();
  for (const sh of g.shards) tracePts(ctx, c, sh.body);
  ctx.fillStyle = ISLAND_GEM[0];
  ctx.fill();
  ctx.beginPath();
  for (const sh of g.shards) tracePts(ctx, c, sh.lit);
  ctx.fillStyle = ISLAND_GEM[1];
  ctx.fill();
  ctx.beginPath();
  tracePts(ctx, c, g.underside);
  ink(ctx, lw, SEPIA);
  // Vines over the lip, their leaves.
  ctx.beginPath();
  traceVines(ctx, c);
  ctx.strokeStyle = ISLAND_LEAF[0];
  ctx.lineWidth = Math.max(0.8, k * 0.02);
  ctx.stroke();
  ctx.beginPath();
  traceLeaves(ctx, c);
  ctx.fillStyle = ISLAND_LEAF[2];
  ctx.fill();
  // The grass cap in a wash from its sunny top into the shade under its lip, a fine line round it.
  const capTop = toY(c, -0.06);
  const capFoot = toY(c, ISLAND.capH + 0.05);
  ctx.beginPath();
  tracePts(ctx, c, g.cap);
  ctx.fillStyle = wash(ctx, capTop, capFoot, [lit(ISLAND_GRASS[2], tone), lit(ISLAND_GRASS[1], tone), ISLAND_GRASS[0]], [0, 0.4, 1]);
  ctx.fill();
  ink(ctx, lw, SEPIA);
  if (k > 30) {
    ctx.beginPath();
    for (const t of g.tufts) tracePts(ctx, c, t);
    ctx.fillStyle = ISLAND_GRASS[2];
    ctx.fill();
    ctx.beginPath();
    for (const d of g.daisies) traceOvals(ctx, c, d.petals);
    ctx.fillStyle = LINEN;
    ctx.fill();
    ctx.beginPath();
    for (const d of g.daisies) circle(ctx, toX(c, d.x), toY(c, d.y), d.r * k);
    ctx.fillStyle = GILT;
    ctx.fill();
  }
  // The little tree: a trunk, a round treetop in a wash, lit dabs.
  const t = g.tree;
  ctx.beginPath();
  tracePts(ctx, c, t.trunk);
  traceCircles(ctx, c, t.crown);
  ink(ctx, lw * 2, SEPIA);
  ctx.beginPath();
  tracePts(ctx, c, t.trunk);
  ctx.fillStyle = TRUNK;
  ctx.fill();
  let ct = Infinity;
  let cb = -Infinity;
  for (const [, y, r] of t.crown) {
    ct = Math.min(ct, y - r);
    cb = Math.max(cb, y + r);
  }
  ctx.beginPath();
  traceCircles(ctx, c, t.crown);
  ctx.fillStyle = wash(ctx, toY(c, ct), toY(c, cb), [lit(ISLAND_LEAF[2], tone), ISLAND_LEAF[1], ISLAND_LEAF[0]]);
  ctx.fill();
  ctx.beginPath();
  traceOvals(ctx, c, t.shine);
  ctx.fillStyle = lit(ISLAND_LEAF[2], tone);
  ctx.fill();
  tower(ctx, c, tone, bars, lw);
}

/** The plinth and the 25 bars on it: soft stone, each bar in the skin's color with a lit top and a shaded foot, a fine sepia line round each. */
function tower(ctx: Ctx, c: CameoFrame, tone: Tone, bars: readonly Pick<Bar, "color">[], lw: number): void {
  const g = cameo();
  const k = c.k;
  const p = g.plinth;
  const px = Math.min(toX(c, p.x), toX(c, p.x + p.w));
  const py = toY(c, p.y);
  const e = lw / 2;
  const R = { x: 0, y: 0, w: 0, h: 0 };
  // The lines: one sepia fill under all of it, each shape grown by half the line.
  ctx.beginPath();
  ctx.rect(px - e, py - e, p.w * k + lw, p.h * k + lw);
  for (let i = 0; i < g.bars.length; i++) {
    const r = barRect(c, i, R);
    ctx.rect(r.x - e, r.y - e, r.w + lw, r.h + lw);
  }
  ctx.fillStyle = SEPIA;
  ctx.fill();
  ctx.fillStyle = wash(ctx, py, py + p.h * k, [ISLAND_STONE[2], ISLAND_STONE[0]]);
  ctx.fillRect(px + e, py + e, p.w * k - lw, p.h * k - lw);
  for (let i = 0; i < g.bars.length; i++) {
    const r = barRect(c, i, R);
    ctx.fillStyle = lit(bars[i % bars.length]!.color, tone);
    ctx.fillRect(r.x + e, r.y + e, r.w - lw, r.h - lw);
  }
  const h = ISLAND.barH * k;
  if (h < 3) return;
  ctx.beginPath();
  for (let i = 0; i < g.bars.length; i++) {
    const r = barRect(c, i, R);
    ctx.rect(r.x + e, r.y + e, r.w - lw, h * 0.22);
  }
  ctx.fillStyle = BAR_SHEEN;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < g.bars.length; i++) {
    const r = barRect(c, i, R);
    ctx.rect(r.x + e, r.y + r.h - e - h * 0.2, r.w - lw, h * 0.2 - e);
  }
  ctx.fillStyle = BAR_SHADE;
  ctx.fill();
}

/**
 * How much of the island shows (1 all of it, 0 gone): coming down the lane past its hour it
 * fades into the evening haze over FADE u, gone before it reaches the courthouse's flagpole (the
 * landmark right under the lane, which would otherwise stand up into it as it sank behind the
 * town).
 */
const FADE = 0.06;
const FADE_CLEAR = 0.02;
/** The island's deepest point over the town (cameo units): its underside's tip or its longest root, whichever hangs lower (the spring's mist hangs further out, over the side). */
let deep = NaN;
function deepest(): number {
  if (Number.isNaN(deep)) {
    const g = cameo();
    deep = Math.max(...g.underside.map(([, y]) => y), ...g.roots.map((r) => r.y + r.len));
  }
  return deep;
}
export function islandShows(s: Scene, c: CameoFrame): number {
  const pole = backLine(s) - (POLE_TOP + FADE_CLEAR) * s.u;
  return Math.max(0, Math.min(1, (pole - toY(c, deepest())) / (FADE * s.u)));
}

/** The island where it is now, if it is on screen, its tower in the skin's bars. */
export function island(ctx: Ctx, s: Scene, tone: Tone, bars: readonly Pick<Bar, "color">[]): void {
  const c = islandFrame(s);
  if (!c) return;
  const a = islandShows(s, c);
  if (a <= 0.01) return;
  paintIsland(ctx, c, tone, bars, a);
  ctx.globalAlpha = 1;
}

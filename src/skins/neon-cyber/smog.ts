import { hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { AMBER, CYAN, MAGENTA } from "./colors";
import { LOOP, LOOP_FROM, type Tone } from "./tone";
import { tint } from "./tube";

// The smog sea: once you have climbed through the smog it lies below you, from the horizon down,
// and settles over the far city. It hides the street, the deep city and the megacity's towers;
// only the giants' crowns and the far skyline's spires poke out of it. It glows with the city's
// light from below: brighter toward the bottom of the screen, with soft patches where whole
// districts shine through, and rows of crests receding toward you so it reads as the top of a
// cloud layer, not a lake. Still: nothing on it moves, so it is calm behind the tower.
// On the way through, the smog is not one flat veil: strata of denser smog, lit from below by
// the city's neon, hang at fixed heights and slide down past you as you climb.

/** How far above the horizon the sea's top settles, in u (the far city's lower floors are under it). */
const SEA_RISE = 0.28;

/** Where the sea's top edge is: none under the smog; above it, along the horizon, settling over the far city. */
export function seaTop(s: Scene, tone: Tone): number {
  if (!tone.above) return s.cssH + s.u;
  return s.horizonY - SEA_RISE * s.u * tone.seaRise;
}

/** Puffs along the top edge, repeating every SPAN of them: size and rise, in u. */
const SPAN = 11;
const PUFFS = Array.from({ length: SPAN }, (_, i) => ({ r: 0.05 + hash(i + 1200) * 0.04, dy: hash(i + 1300) * 0.022 }));

/** Glow patches under the smog: x (u from center), depth below the top (u), size (u), color. */
const PATCHES = Array.from({ length: 9 }, (_, i) => ({
  x: (hash(i + 1400) - 0.5) * 1.2,
  d: 0.12 + hash(i + 1410) * 0.7,
  r: 0.09 + hash(i + 1420) * 0.12,
  c: [MAGENTA, CYAN, AMBER][i % 3]!,
}));

/** Rows of crests inside the sea: depth below its top (u), puff scale, lit-top opacity, and offsets so rows don't line up. */
const CRESTS = [
  { d: 0.09, k: 1.25, a: 0.55, offset: 0.5, shift: 4 },
  { d: 0.2, k: 1.6, a: 0.42, offset: 0.2, shift: 7 },
  { d: 0.36, k: 2.1, a: 0.32, offset: 0.65, shift: 2 },
] as const;
/** The lit arc along a crest's top: the upper part of its oval (canvas angles, y down). */
const ARC0 = Math.PI * 1.12;
const ARC1 = Math.PI * 1.88;

/** The body gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

export function smogSea(ctx: Ctx, s: Scene, tone: Tone, step: number, top: number): void {
  if (top > s.cssH + s.u * 0.1) return;
  const u = s.u;
  if (cache.ctx !== ctx || cache.step !== step || cache.h !== s.cssH || !cache.fill) {
    const g = ctx.createLinearGradient(0, s.cssH * 0.3, 0, s.cssH);
    g.addColorStop(0, tone.sea);
    g.addColorStop(1, tone.seaDeep);
    cache.ctx = ctx;
    cache.step = step;
    cache.h = s.cssH;
    cache.fill = g;
  }
  const step2 = u * 0.09;
  const n = Math.ceil(s.cssW / 2 / step2) + 1;
  const cx = s.cssW / 2;
  // Lit rim first (the puffs' tops peek out above the body), then the body over it.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let j = -n; j <= n; j++) {
      const p = PUFFS[((j % SPAN) + SPAN) % SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.45;
      if (pass === 0) oval(ctx, cx + j * step2, y - u * 0.005, r * 1.3, r * 0.62);
      else oval(ctx, cx + j * step2, y + u * 0.004, r * 1.3, r * 0.6);
    }
    if (pass === 1) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    ctx.fillStyle = pass === 0 ? tone.seaTop : cache.fill;
    ctx.fill();
  }
  // Rows of crests further down, bigger and fainter toward the bottom: the sea's surface
  // receding toward you, each crest's lit top a thin arc (strokes cost far less than fills).
  ctx.strokeStyle = tone.seaTop;
  ctx.lineCap = "round";
  for (const row of CRESTS) {
    // The crests come out as the sea settles (under the murk they would not show anyway).
    const a = row.a * tone.seaRise;
    if (a < 0.02) continue;
    const y0 = top + row.d * u;
    if (y0 - u * 0.12 > s.cssH) break;
    const st = step2 * row.k;
    const m = Math.ceil(s.cssW / 2 / st) + 1;
    ctx.beginPath();
    for (let j = -m; j <= m; j++) {
      const p = PUFFS[(((j + row.shift) % SPAN) + SPAN) % SPAN]!;
      const r = p.r * u * row.k;
      const x = cx + (j + row.offset) * st;
      const y = y0 + p.dy * u * row.k;
      const rx = r * 1.3;
      const ry = r * 0.5;
      ctx.moveTo(x + rx * Math.cos(ARC0), y + ry * Math.sin(ARC0));
      ctx.ellipse(x, y, rx, ry, 0, ARC0, ARC1);
    }
    ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(1, u * 0.004 * row.k);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
  // Districts glowing through the smog.
  for (const p of PATCHES) {
    const y = top + p.d * u;
    if (y - p.r * u > s.cssH) continue;
    ctx.beginPath();
    oval(ctx, cx + p.x * u, y, p.r * u * 1.6, p.r * u * 0.5);
    ctx.fillStyle = tint(p.c, 0.07);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- strata

/** Parallax depth of the strata: just behind the tower, so they slide down past it as you climb. */
const STRATA_P = 0.9;
/** Strata, lowest first: height (world units), center x (u from center), half length (u), thickness (u). */
const STRATA = Array.from({ length: 19 }, (_, i) => ({
  at: (4 + i * 4.4 + hash(i + 1500) * 1.6) * BLOCK_HEIGHT,
  x: (hash(i + 1510) - 0.5) * 0.8,
  w: 0.42 + hash(i + 1520) * 0.4,
  th: 0.01 + hash(i + 1530) * 0.014,
}));

/** The height story's loop (tone.ts): where it starts and how tall one loop is, world units. */
const LOOP_AT = LOOP_FROM * BLOCK_HEIGHT;
const LOOP_SPAN = LOOP * BLOCK_HEIGHT;
/** The loop's thin smog layer: strata from a quarter of the way into each loop to past its
 *  three quarters (heights from the loop's start), lowest first. */
const LOOP_STRATA = Array.from({ length: 16 }, (_, i) => ({
  at: (26 + i * 4.4 + hash(i + 1540) * 1.6) * BLOCK_HEIGHT,
  x: (hash(i + 1550) - 0.5) * 0.8,
  w: 0.42 + hash(i + 1560) * 0.4,
  th: 0.01 + hash(i + 1570) * 0.014,
}));

/** One stratum's body (pass 0) or lit underside (pass 1), as a subpath. */
function stratum(ctx: Ctx, s: Scene, b: (typeof STRATA)[number], y: number, pass: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const th = b.th * u;
  if (pass === 0) oval(ctx, cx + b.x * u, y, b.w * u, th);
  else oval(ctx, cx + (b.x - b.w * 0.08) * u, y + th * 0.7, b.w * u * 0.75, th * 0.55);
}

/**
 * Strata of denser smog you rise through: long thin lenses at fixed heights, each a pale body
 * with its underside lit by the neon below. They show only on the way through the smog (and
 * through the loop's thin layer, every loop) and slide down past you as the camera climbs; in
 * time they hold still.
 */
export function strata(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.strata <= 0.01) return;
  const u = s.u;
  const base = layerGround(s, STRATA_P);
  const unit = s.scale * STRATA_P;
  const margin = u * 0.06;
  // Heights on screen: y = base - at * unit within [-margin, cssH + margin].
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  // The bodies, then their lit undersides.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (const b of STRATA) {
      if (b.at < lo) continue;
      if (b.at > hi) break;
      stratum(ctx, s, b, base - b.at * unit, pass);
    }
    for (let k = Math.max(0, Math.floor((lo - LOOP_AT) / LOOP_SPAN)); LOOP_AT + k * LOOP_SPAN <= hi; k++) {
      for (const b of LOOP_STRATA) {
        const at = LOOP_AT + k * LOOP_SPAN + b.at;
        if (at < lo) continue;
        if (at > hi) break;
        stratum(ctx, s, b, base - at * unit, pass);
      }
    }
    ctx.globalAlpha = tone.strata * (pass === 0 ? 0.36 : 0.26);
    ctx.fillStyle = pass === 0 ? tone.strataBody : tone.strataLit;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

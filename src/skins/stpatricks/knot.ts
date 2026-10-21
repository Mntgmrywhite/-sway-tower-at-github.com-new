import { circle, type Ctx } from "../../base/draw";

// Insular ornament, after the Book of Kells: plaited interlace bands, triskeles and spirals.
//
// A plait of `rows` strands runs along a band `rows` crossing-spacings tall: every strand
// zigzags from the band's top edge to its bottom edge and back, turning round at each in a
// smooth curve, and passes alternately over and under every strand it crosses (the turns at the
// edges count as crossings, so the alternation never breaks). Its geometry is worked out once,
// for one period of the pattern (2 * rows spacings), in units of the spacing; drawing only
// replays it, period after period, so the band tiles with no seam at any width.
//
// Drawing it takes few strokes, which is what keeps a band cheap: each strand is one continuous
// line (a diagonal down, a turn, a diagonal up, a turn, period after period), stroked whole:
// first every strand's ink contour (unless the ink is the ground's own color, where it would
// only paint the ground again), then each strand in its flat color, as the page's knotwork is
// painted. That leaves the strands crossing in no particular order, so the pieces that pass over
// at each crossing (from the midpoint before it to the midpoint after it) are drawn again on
// top, ink and color: their ink cuts across the strand beneath, which is the over-and-under.
// They reach a little past their midpoints, so no seam shows where they end.

/** A plait worked out once: its strands and, per period, the pieces that pass over at its crossings. */
export interface Plait {
  rows: number;
  /** The pattern repeats every `period` spacings. */
  period: number;
  /** The over pieces of one period: x0, y0, x1, y1 each (spacings), and each one's strand. */
  overs: Float64Array;
  overStrand: Uint8Array;
}

/** How far an over piece reaches past its midpoints, along the strand (spacings). */
const LAP = 0.085;
/** How far a turn's control points reach along the strand (spacings): it rounds the band's edge just inside it. */
const TURN = 0.3;
/** The band's margin above and below the plait's turns (spacings). */
const PAD = 0.14;

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** A plait of `rows` strands (2 or more), worked out once. */
export function plait(rows: number): Plait {
  const period = rows * 2;
  const overs: number[] = [];
  const strands: number[] = [];
  for (let i = 0; i < period; i++) {
    // Crossings on the rows inside the band (where i + j is even): down-right through (i, j)
    // passes over where i is even, up-right where it is odd.
    for (let j = 1; j < rows; j++) {
      if ((i + j) % 2) continue;
      if (i % 2 === 0) {
        overs.push(i - 0.5, j - 0.5, i + 0.5, j + 0.5);
        strands.push(mod((i - j) / 2, rows));
      } else {
        overs.push(i - 0.5, j + 0.5, i + 0.5, j - 0.5);
        strands.push(mod((i + j) / 2, rows));
      }
    }
  }
  return { rows, period, overs: Float64Array.from(overs), overStrand: Uint8Array.from(strands) };
}

/**
 * The strands whose color is `color` of `colors` (all of them when `color` < 0), each one line
 * from period `from` to period `to`, as open subpaths. Strand s turns at the
 * top edge round x = 2s, runs down to turn at the bottom round x = 2s + rows, and back up.
 */
function strands(ctx: Ctx, p: Plait, color: number, colors: number, from: number, to: number): void {
  const r = p.rows;
  const top = 0.5;
  const bot = r - 0.5;
  for (let s = 0; s < r; s++) {
    if (color >= 0 && s % colors !== color) continue;
    let x = from * p.period + 2 * s - 0.5;
    ctx.moveTo(x, top);
    for (let k = from; k <= to; k++) {
      ctx.bezierCurveTo(x + TURN, top - TURN, x + 1 - TURN, top - TURN, x + 1, top);
      ctx.lineTo(x + r, bot);
      ctx.bezierCurveTo(x + r + TURN, bot + TURN, x + r + 1 - TURN, bot + TURN, x + r + 1, bot);
      x += p.period;
      ctx.lineTo(x, top);
    }
  }
}

/** The over pieces whose color is `color` of `colors` (all when < 0), periods `from` to `to`, run on by `lap`. */
function overPieces(ctx: Ctx, p: Plait, color: number, colors: number, from: number, to: number, lap: number): void {
  const o = p.overs;
  for (let k = from; k <= to; k++) {
    const ox = k * p.period;
    for (let i = 0; i < p.overStrand.length; i++) {
      if (color >= 0 && p.overStrand[i]! % colors !== color) continue;
      const x0 = o[i * 4]!;
      const y0 = o[i * 4 + 1]!;
      const x1 = o[i * 4 + 2]!;
      const y1 = o[i * 4 + 3]!;
      const ex = (x1 - x0) * lap;
      const ey = (y1 - y0) * lap;
      ctx.moveTo(ox + x0 - ex, y0 - ey);
      ctx.lineTo(ox + x1 + ex, y1 + ey);
    }
  }
}

/** How a plait band is drawn: its ground, its frame, its strands' colors and their ink, and the ribbon's width (spacings). */
export interface PlaitStyle {
  ground: string;
  frame: string;
  strands: readonly string[];
  ink: string;
  /** The ribbon's width and its contour's (each side), in spacings. */
  width: number;
  contour: number;
}

/** A plait band's height for a spacing of `d`: the plait and its margins. */
export function bandHeight(p: Plait, d: number): number {
  return (p.rows + PAD * 2) * d;
}

/** The periods of a plait that reach into x0..x1 (screen x) for a band anchored on cx: period k's strands run from k * period - 0.5 to (k + 1) * period + 2 * rows - 1.5 spacings. */
function periods(p: Plait, cx: number, x0: number, x1: number, d: number, out: Int32Array, i: number): void {
  out[i] = Math.ceil(((x0 - cx) / d - p.period - p.rows * 2 + 1.5) / p.period);
  out[i + 1] = Math.floor(((x1 - cx) / d + 0.5) / p.period);
}

/** Scratch: the first and last period of each band being drawn. */
const SPANS = new Int32Array(8);

/** One layer of `bands` bands (their periods in SPANS) as a new path: the whole strands or (`over`) the pieces that pass over, of one color (all when < 0). */
function traceBands(ctx: Ctx, p: Plait, bands: number, over: boolean, color: number, colors: number, lap: number): void {
  ctx.beginPath();
  for (let b = 0; b < bands; b++) {
    if (over) overPieces(ctx, p, color, colors, SPANS[b * 2]!, SPANS[b * 2 + 1]!, lap);
    else strands(ctx, p, color, colors, SPANS[b * 2]!, SPANS[b * 2 + 1]!);
  }
}

/**
 * Plait bands with a spacing of `d` (bandHeight tall), their top edge at `top`, each from x0 to
 * x1 of `spans` (screen x, pairs; up to four bands on one row share every stroke, which is what
 * keeps them cheap), the pattern anchored on `cx` (so it lines up the same on any width): the
 * ground, the plait, and a fine frame rule along each band's top and bottom edges (`rule` wide).
 * Nothing outside the spans is drawn (bands whose ends are off the screen need no `clip`: their
 * strands overrun them).
 */
export function plaitBand(ctx: Ctx, p: Plait, style: PlaitStyle, cx: number, spans: readonly number[], top: number, d: number, rule: number, clip = true): void {
  const h = bandHeight(p, d);
  const bands = spans.length / 2;
  ctx.fillStyle = style.ground;
  for (let b = 0; b < bands; b++) ctx.fillRect(spans[b * 2]!, top, spans[b * 2 + 1]! - spans[b * 2]!, h);
  ctx.save();
  if (clip) {
    ctx.beginPath();
    for (let b = 0; b < bands; b++) ctx.rect(spans[b * 2]!, top, spans[b * 2 + 1]! - spans[b * 2]!, h);
    ctx.clip();
  }
  ctx.translate(cx, top + PAD * d);
  ctx.scale(d, d);
  for (let b = 0; b < bands; b++) periods(p, cx, spans[b * 2]!, spans[b * 2 + 1]!, d, SPANS, b * 2);
  const n = style.strands.length;
  const w = style.width;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  // Whole strands, then the pieces that pass over again on top: each the ink, then every color.
  for (let layer = 0; layer < 2; layer++) {
    const over = layer === 1;
    // (Where the ink is the ground's own color, the whole strands' contour would only paint the
    // ground again: every place one strand meets another is a crossing, inked by its over piece.)
    if (over || style.ink !== style.ground) {
      traceBands(ctx, p, bands, over, -1, n, 0);
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = w + style.contour * 2;
      ctx.stroke();
    }
    ctx.lineWidth = w;
    for (let c = 0; c < n; c++) {
      traceBands(ctx, p, bands, over, c, n, over ? LAP : 0);
      ctx.strokeStyle = style.strands[c]!;
      ctx.stroke();
    }
  }
  ctx.restore();
  // The frame: a rule along each edge, inked.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? style.frame : style.ink;
    const k = pass ? 0.5 : 1.5;
    for (let b = 0; b < bands; b++) {
      const x0 = spans[b * 2]!;
      const x1 = spans[b * 2 + 1]!;
      ctx.fillRect(x0, top - rule * k, x1 - x0, rule * k * 2);
      ctx.fillRect(x0, top + h - rule * k, x1 - x0, rule * k * 2);
    }
  }
}

/** A dot of a pen a pixel or two across, as its own subpath: a little octagon, round enough at that size and cheaper to fill than a circle. */
export function dot(ctx: Ctx, x: number, y: number, r: number): void {
  const a = r * 0.41;
  ctx.moveTo(x + r, y - a);
  ctx.lineTo(x + r, y + a);
  ctx.lineTo(x + a, y + r);
  ctx.lineTo(x - a, y + r);
  ctx.lineTo(x - r, y + a);
  ctx.lineTo(x - r, y - a);
  ctx.lineTo(x - a, y - r);
  ctx.lineTo(x + a, y - r);
  ctx.closePath();
}

// ---------------------------------------------------------------- triskeles

/** Points along one arm of a unit triskele (radius 1): out of the center, curling round its own eye. */
const ARM_STEPS = 26;
const ARMS: readonly Float64Array[] = [0, 1, 2].map((k) => {
  const phi = (k * Math.PI * 2) / 3 - Math.PI / 2;
  // The arm's eye, half way out; the arm leaves the center and winds in round it, 1.4 turns.
  const ex = Math.cos(phi) * 0.5;
  const ey = Math.sin(phi) * 0.5;
  const out = new Float64Array(ARM_STEPS * 2);
  for (let i = 0; i < ARM_STEPS; i++) {
    const t = i / (ARM_STEPS - 1);
    const a = phi + Math.PI + t * Math.PI * 2 * 1.4;
    const r = 0.5 * (1 - t) ** 1.15 + 0.03 * t;
    out[i * 2] = ex + Math.cos(a) * r;
    out[i * 2 + 1] = ey + Math.sin(a) * r;
  }
  return out;
});

/** A triskele's three arms at (x, y), radius r, turned by `turn` (radians), as open subpaths (stroke them). */
export function triskelePath(ctx: Ctx, x: number, y: number, r: number, turn = 0): void {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  for (const arm of ARMS) {
    for (let i = 0; i < ARM_STEPS; i++) {
      const ax = arm[i * 2]!;
      const ay = arm[i * 2 + 1]!;
      const px = x + (ax * c - ay * s) * r;
      const py = y + (ax * s + ay * c) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
}

/** Points along a unit spiral (outer radius 1, winding in 1.3 turns from angle 0), for the curls in clouds and waves. */
const CURL_STEPS = 36;
const CURL = new Float64Array(CURL_STEPS * 2);
for (let i = 0; i < CURL_STEPS; i++) {
  const t = i / (CURL_STEPS - 1);
  const a = t * Math.PI * 2 * 1.3;
  const r = 1 - 0.82 * t;
  CURL[i * 2] = Math.cos(a) * r;
  CURL[i * 2 + 1] = -Math.sin(a) * r;
}

/** A spiral curl at (x, y), outer radius r, starting at angle `a0` and winding in (dir 1 one way, -1 the other), as an open subpath. */
export function curlPath(ctx: Ctx, x: number, y: number, r: number, a0: number, dir: number): void {
  const c = Math.cos(a0);
  const s = Math.sin(a0);
  for (let i = 0; i < CURL_STEPS; i++) {
    const ax = CURL[i * 2]!;
    const ay = CURL[i * 2 + 1]! * dir;
    const px = x + (ax * c - ay * s) * r;
    const py = y + (ax * s + ay * c) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

/** How a roundel is drawn: its ground, its rim, the triskele's color, the ink and the ring of dots round it. */
export interface RoundelStyle {
  ground: string;
  rim: string;
  arms: string;
  ink: string;
  dots: string;
}

/** Dots round a roundel, and their angles' cosines and sines; how far out they stand and how big they are (radii); how far they reach, all told (radii). */
const RING_DOTS = 18;
const RING_OUT = 1.14;
const RING_DOT = 0.075;
export const ROUNDEL_REACH = RING_OUT + RING_DOT;
const RING = Array.from({ length: RING_DOTS }, (_, i) => [Math.cos((i / RING_DOTS) * Math.PI * 2), Math.sin((i / RING_DOTS) * Math.PI * 2)] as const);

/** Discs of radius r - inset at each of `at` ([x, y, turn] triples), as a new path. */
function discs(ctx: Ctx, at: readonly number[], r: number, inset: number): void {
  ctx.beginPath();
  for (let i = 0; i < at.length; i += 3) circle(ctx, at[i]!, at[i + 1]!, r - inset);
}

/**
 * Roundels of radius r at `at` ([x, y, turn] for each, sharing every fill and stroke): a disc on
 * its ground, an inked rim, a triskele inside turned by `turn`, and a ring of dots round it (the
 * Kells red dots). Their dots reach out to ROUNDEL_REACH r.
 */
export function roundels(ctx: Ctx, at: readonly number[], r: number, style: RoundelStyle, lw: number): void {
  const n = at.length / 3;
  ctx.fillStyle = style.dots;
  ctx.beginPath();
  for (let i = 0; i < n; i++) for (const [c, s] of RING) dot(ctx, at[i * 3]! + c * r * RING_OUT, at[i * 3 + 1]! + s * r * RING_OUT, r * RING_DOT);
  ctx.fill();
  discs(ctx, at, r, 0);
  ctx.fillStyle = style.ink;
  ctx.fill();
  discs(ctx, at, r, lw);
  ctx.fillStyle = style.rim;
  ctx.fill();
  discs(ctx, at, r * 0.8, 0);
  ctx.fillStyle = style.ink;
  ctx.fill();
  discs(ctx, at, r * 0.8, lw);
  ctx.fillStyle = style.ground;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) triskelePath(ctx, at[i * 3]!, at[i * 3 + 1]!, r * 0.66, at[i * 3 + 2]!);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = style.ink;
  ctx.lineWidth = r * 0.17 + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = style.arms;
  ctx.lineWidth = r * 0.17;
  ctx.stroke();
}

import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { INK, type Tone } from "./colors";

// A small hand-inked pen for the Thanksgiving props, in the spirit of a newspaper comic strip:
// straight edges are drawn as gently bowed strokes (each bow fixed by a seed, so a prop always
// wobbles the same way), on top of the usual cartoon fill-and-ink.
//
// Props are designed in local units: 1 = u at the tower's depth, origin on the prop's ground
// point, y up is negative. `pen()` maps local units to the screen (with an optional mirror);
// M/L/Q/B/R/O/C add to the current path. Nothing here allocates per frame.

/** Scratch point for `spot()`, reused so placing props allocates nothing. */
const P = { x: 0, y: 0, k: 1 };

/**
 * A spot on the field: `X` is the sideways offset from the screen center at the tower's depth
 * (in u), `z` the depth (TOWER_DEPTH = the tower's line; bigger is farther). `k` is the
 * perspective scale for anything standing there.
 */
export function spot(s: Scene, X: number, z: number): typeof P {
  P.k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * P.k;
  P.y = fieldY(s, z);
  return P;
}

/** Ink width for a prop at perspective scale k: a fine comic-strip line. */
export function inkW(s: Scene, k = 1): number {
  return Math.max(1.1, s.u * 0.0048 * Math.sqrt(k));
}

let ox = 0;
let oy = 0;
let sc = 1;
let fx = 1;
let seed = 0;
let cx = 0;
let cy = 0;
/** Largest bow of a straight stroke, in local units, and as a fraction of its length. */
const WOB = 0.0062;
const WOB_LEN = 0.09;

/** Point the pen: local (0, 0) at screen (x, y), 1 local unit = `scale` px; `flip` -1 mirrors. */
export function pen(x: number, y: number, scale: number, s0: number, flip = 1): void {
  ox = x;
  oy = y;
  sc = scale;
  fx = flip;
  seed = s0 * 37;
}

/** Screen x / y of a local point. */
export const X = (x: number): number => ox + x * sc * fx;
export const Y = (y: number): number => oy + y * sc;
/** Screen length of a local length. */
export const len = (l: number): number => l * sc;

export function M(ctx: Ctx, x: number, y: number): void {
  ctx.moveTo(X(x), Y(y));
  cx = x;
  cy = y;
}

/** A hand-drawn straight stroke: a slight, seeded bow. */
export function L(ctx: Ctx, x: number, y: number): void {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const b = (hash(seed++) - 0.5) * 2 * Math.min(d * WOB_LEN, WOB);
  const mx = (cx + x) / 2 - (dy / d) * b;
  const my = (cy + y) / 2 + (dx / d) * b;
  ctx.quadraticCurveTo(X(mx), Y(my), X(x), Y(y));
  cx = x;
  cy = y;
}

/** A truly straight stroke (tiny parts, where a bow would only blur). */
export function S(ctx: Ctx, x: number, y: number): void {
  ctx.lineTo(X(x), Y(y));
  cx = x;
  cy = y;
}

export function Q(ctx: Ctx, qx: number, qy: number, x: number, y: number): void {
  ctx.quadraticCurveTo(X(qx), Y(qy), X(x), Y(y));
  cx = x;
  cy = y;
}

export function B(ctx: Ctx, ax: number, ay: number, bx: number, by: number, x: number, y: number): void {
  ctx.bezierCurveTo(X(ax), Y(ay), X(bx), Y(by), X(x), Y(y));
  cx = x;
  cy = y;
}

/** Hand-drawn rectangle as its own closed subpath. */
export function R(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  M(ctx, x, y);
  L(ctx, x + w, y);
  L(ctx, x + w, y + h);
  L(ctx, x, y + h);
  L(ctx, x, y);
  ctx.closePath();
}

/** Straight rectangle (small parts). */
export function RS(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  M(ctx, x, y);
  S(ctx, x + w, y);
  S(ctx, x + w, y + h);
  S(ctx, x, y + h);
  ctx.closePath();
}

export function O(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  oval(ctx, X(x), Y(y), rx * sc, ry * sc, rot * fx);
}

export function C(ctx: Ctx, x: number, y: number, r: number): void {
  circle(ctx, X(x), Y(y), r * sc);
}

/** Fill the current path flat, then ink it. */
export function flat(ctx: Ctx, fill: string, lw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, lw, INK);
}

/**
 * Fill the current path cel-shaded, then ink it: the body color, a lit band across the top
 * and a shaded band across the bottom (between local y `top` and `bottom`, clipped to the shape).
 */
export function cel(ctx: Ctx, t: Tone, top: number, bottom: number, lw: number, lit = 0.24, dark = 0.3): void {
  ctx.fillStyle = t.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const y0 = Y(top);
  const h = Y(bottom) - y0;
  ctx.fillStyle = t.light;
  ctx.fillRect(-1e4, y0 - 2, 3e4, h * lit + 2);
  ctx.fillStyle = t.shade;
  ctx.fillRect(-1e4, y0 + h * (1 - dark), 3e4, h * dark + 2);
  ctx.restore();
  ink(ctx, lw, INK);
}

/** Stroke the current path in one color (details inside a shape: no ink). */
export function line(ctx: Ctx, color: string, w: number): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

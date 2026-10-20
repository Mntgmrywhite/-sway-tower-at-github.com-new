import { circle, hash, ink, inkedLine, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { BRASS, INK, IRON, LOCKS, MARBLE } from "./colors";
import { inkW, paving } from "./garden";
import { block, heartPath } from "./shapes";

// The near edge we look over: the love-lock railing along the plaza's front, wrought iron on a
// marble curb, inked like everything up close: a top rail and a lower rail between round-headed
// balusters, and padlocks in bright enamels clipped all along both rails, each with a brass
// shackle and a heart on its face (every pair who passed left one). In the middle the railing
// stops at two square posts with brass balls, a gateway with the pink pavers running out
// through it. It covers the base band and drops away faster than the tower as the camera
// climbs (parallax 1.6, like the band), so it only frames the start. The gateway stays clear:
// render.ts writes "tap to drop" there at the start (at 0.9 of the screen height), which on a
// short phone falls across the rails and on a tall one across the pavers below them.

/** How far the top rail stands above the base band's top edge (u). */
const RAIL_UP = 0.07;
/** Half the gateway's width (u; "tap to drop" is about 0.29 u wide), and the posts. */
export const GATE = 0.17;
const POST_W = 0.032;
const POST_UP = 0.024;
/** The rails: the top one, the lower one this far under it, their thickness; the balusters' spacing (u). */
const RAILS = 0.055;
const RAIL_T = 0.011;
const BALUSTER = 0.05;
/** The marble curb the railing stands on: its height (u); it hides the seam with the plaza's pavers behind. */
const CURB = 0.034;
/** A lock: its body's width and height, its shackle's radius (u). */
const LOCK_W = 0.024;
const LOCK_H = 0.022;
const SHACKLE = 0.007;

/** The top rail's upper edge on screen (it moves with the base band). */
export function railTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * (0.36 - RAIL_UP);
}

/** The curb's foot: below it the pavers run on down. */
export function railFoot(s: Scene): number {
  return layerGround(s, 1.6) + s.u * 0.36 + s.u * CURB;
}

/** The top of the gateposts' brass balls: the highest thing in front. */
export function gateTop(s: Scene): number {
  return railTop(s) - s.u * (POST_UP + 0.027);
}


/** The locks along one side's rails: on which rail, how far along (u from the gate), size tweak, color, hanging from above (on the lower rail they sit up). */
const LOCK_SPOTS = Array.from({ length: 11 }, (_, i) => ({
  rail: i % 3 === 2 ? 1 : 0,
  d: 0.035 + i * 0.047 + (hash(i + 7700) - 0.5) * 0.016,
  k: 0.85 + hash(i + 7710) * 0.3,
  color: LOCKS[(i * 2 + 1) % LOCKS.length]!,
}));

/** Scratch list of where this frame's locks hang (screen px) and their size tweak, filled by `railing`, drawn by `locks`. */
const HANGING: { x: number; y: number; k: number; color: string }[] = Array.from({ length: 48 }, () => ({ x: 0, y: 0, k: 1, color: LOCKS[0] }));
let hanging = 0;

/**
 * Every padlock on both rails, batched: the brass shackles over the rails as one inked line,
 * the bodies color by color, one ink pass over them all, the lit tops, the hearts on their faces.
 */
function locks(ctx: Ctx, u: number, lw: number): void {
  const n = hanging;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const { x, y, k } = HANGING[i]!;
    const r = SHACKLE * u * k;
    ctx.moveTo(x - r, y + r * 1.2);
    ctx.lineTo(x - r, y);
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.lineTo(x + r, y + r * 1.2);
  }
  inkedLine(ctx, BRASS.body, Math.max(1.5, u * 0.0045), lw * 0.7, INK);
  for (const color of LOCKS) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = HANGING[i]!;
      if (q.color !== color) continue;
      const w = LOCK_W * u * q.k;
      block(ctx, q.x - w / 2, q.y + SHACKLE * u * q.k * 1.1, w, LOCK_H * u * q.k, w * 0.22);
    }
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const q = HANGING[i]!;
    const w = LOCK_W * u * q.k;
    block(ctx, q.x - w / 2, q.y + SHACKLE * u * q.k * 1.1, w, LOCK_H * u * q.k, w * 0.22);
  }
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const q = HANGING[i]!;
    const w = LOCK_W * u * q.k;
    const h = LOCK_H * u * q.k;
    ctx.rect(q.x - w / 2 + w * 0.12, q.y + SHACKLE * u * q.k * 1.1 + h * 0.1, w * 0.76, h * 0.2);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const q = HANGING[i]!;
    const h = LOCK_H * u * q.k;
    heartPath(ctx, q.x, q.y + SHACKLE * u * q.k * 1.1 + h * 0.6, h * 0.42);
  }
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The railing along one side (`side` -1 left, 1 right): balusters, then the two rails; its locks are noted for `locks`. */
function railing(ctx: Ctx, s: Scene, side: number, top: number, lw: number): void {
  const u = s.u;
  const gate = s.cssW / 2 + side * (GATE + POST_W) * u;
  const limit = side < 0 ? gate + u * 0.02 : s.cssW - gate + u * 0.02;
  const lower = top + RAILS * u;
  const foot = top + (RAILS + 0.033) * u;
  // Balusters: slim rods with round heads over the top rail.
  ctx.beginPath();
  for (let d = BALUSTER * 0.6; d < limit / u; d += BALUSTER) {
    const x = gate + side * d * u;
    ctx.rect(x - u * 0.004, top - u * 0.008, u * 0.008, foot - top + u * 0.008);
    circle(ctx, x, top - u * 0.011, u * 0.006);
  }
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.9, INK);
  // The rails: two flat bars, lit along their tops.
  const x0 = side < 0 ? -u * 0.05 : gate;
  const x1 = side < 0 ? gate : s.cssW + u * 0.05;
  ctx.beginPath();
  block(ctx, x0, top, x1 - x0, RAIL_T * u, u * 0.002);
  block(ctx, x0, lower, x1 - x0, RAIL_T * u, u * 0.002);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.fillRect(x0 + u * 0.01, top + u * 0.002, x1 - x0 - u * 0.02, u * 0.003);
  ctx.fillRect(x0 + u * 0.01, lower + u * 0.002, x1 - x0 - u * 0.02, u * 0.003);
  ink(ctx, lw, INK);
  // The locks clipped along the rails: noted here, drawn together for both sides.
  for (const q of LOCK_SPOTS) {
    if (q.d > limit / u - LOCK_W || hanging >= HANGING.length) continue;
    const h = HANGING[hanging++]!;
    h.x = gate + side * q.d * u;
    h.y = (q.rail ? lower : top) + RAIL_T * u * 0.5;
    h.k = q.k;
    h.color = q.color;
  }
}

/** The two square gateposts with brass balls, standing on the curb. */
function posts(ctx: Ctx, s: Scene, top: number, foot: number, lw: number): void {
  const u = s.u;
  const w = POST_W * u;
  const y = top - POST_UP * u;
  for (let side = -1; side <= 1; side += 2) {
    const x = s.cssW / 2 + side * GATE * u - (side < 0 ? w : 0);
    ctx.beginPath();
    block(ctx, x, y, w, foot - y, u * 0.004);
    ctx.fillStyle = IRON.body;
    ctx.fill();
    ctx.fillStyle = IRON.light;
    ctx.fillRect(x + u * 0.004, y + u * 0.005, w * 0.25, foot - y - u * 0.01);
    ctx.fillStyle = IRON.shade;
    ctx.fillRect(x + w * 0.7, y + u * 0.006, w * 0.22, foot - y - u * 0.012);
    ink(ctx, lw, INK);
    ctx.beginPath();
    block(ctx, x - u * 0.004, y - u * 0.006, w + u * 0.008, u * 0.01, u * 0.002);
    ctx.fillStyle = IRON.body;
    ctx.fill();
    ink(ctx, lw * 0.9, INK);
    ctx.beginPath();
    circle(ctx, x + w / 2, y - u * 0.016, u * 0.011);
    ctx.fillStyle = BRASS.body;
    ctx.fill();
    ink(ctx, lw * 0.9, INK);
    ctx.fillStyle = BRASS.light;
    ctx.beginPath();
    circle(ctx, x + w / 2 - u * 0.004, y - u * 0.02, u * 0.004);
    ctx.fill();
  }
}

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = railTop(s);
  if (gateTop(s) > s.cssH) return;
  const lw = inkW(s);
  const band = layerGround(s, 1.6) + u * 0.36;
  const curbTop = band - u * 0.008;
  const foot = railFoot(s);
  // The pavers in front, from the curb down (over the base band's grass and tiles).
  paving(ctx, s, foot - u * 0.002, s.cssH, false);
  // The marble curb the railing stands on, right across, lit along its top.
  ctx.beginPath();
  ctx.rect(-1, curbTop, s.cssW + 2, foot - curbTop);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ctx.fillStyle = MARBLE.light;
  ctx.fillRect(0, curbTop + u * 0.004, s.cssW, u * 0.006);
  ctx.fillStyle = MARBLE.shade;
  ctx.fillRect(0, foot - u * 0.008, s.cssW, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(-1, curbTop);
  ctx.lineTo(s.cssW + 1, curbTop);
  ctx.moveTo(-1, foot);
  ctx.lineTo(s.cssW + 1, foot);
  ink(ctx, lw, INK);
  hanging = 0;
  railing(ctx, s, -1, top, lw);
  railing(ctx, s, 1, top, lw);
  locks(ctx, u, lw);
  posts(ctx, s, top, curbTop + u * 0.012, lw);
}

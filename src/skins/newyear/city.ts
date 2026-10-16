import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FAR_BACK, GOLD, MID_ROW } from "./colors";
import { landmarks } from "./landmarks";
import { underMoon } from "./sky";
import { BACK, cloudCover, MID, MID_WIN, sideOf, type RowTower } from "./skyline";

// The far layer: Manhattan at midnight across the water, the hero of the scene. Back to
// front: gold searchlights sweeping up from behind the city; a hazy back row of faded Deco
// silhouettes; a darker middle row with gilded stepped crowns and lit windows; then the five
// hero towers (landmarks.ts) in black lacquer and gold, with the clock and the New Year's ball.
// The cloud bank (drawn by the base world after this layer) piles up at their feet.

/* ---------------------------------------------------------------- searchlights */

/** Searchlights behind the city: base x (u from center), resting lean (rad, outward), sweep, speed. */
const LIGHTS: readonly (readonly [number, number, number, number])[] = [
  [-0.43, -0.36, 0.26, 0.23],
  [-0.23, -0.12, 0.24, 0.31],
  [0.235, 0.14, 0.25, 0.27],
  [0.44, 0.38, 0.26, 0.21],
];
/** All four beams are one path in a frame stretched so the ceiling is LREF up: one gradient,
 *  fading with height, serves every beam, and they fill in a single pass. */
const LREF = 100;
/** Beam light, added onto the sky. No blue in it: added onto navy, any blue in a gold turns
 *  the beam a cool grey, while a pure amber warms the navy toward champagne gold. */
const BEAM_HOT = "#ffb52e";
const BEAM = "#ffa000";
let beamCtx: Ctx | null = null;
let beamFill: CanvasGradient | null = null;

function beamGradient(ctx: Ctx): CanvasGradient {
  if (beamCtx !== ctx || !beamFill) {
    beamCtx = ctx;
    beamFill = ctx.createLinearGradient(0, 0, 0, -LREF);
    beamFill.addColorStop(0, alpha(BEAM_HOT, 0.62));
    beamFill.addColorStop(0.35, alpha(BEAM, 0.32));
    beamFill.addColorStop(1, alpha(BEAM, 0));
  }
  return beamFill;
}

/** Gold beams sweeping up from behind the city, fading out before the HUD. Drawn additively,
 *  so the gold brightens the navy instead of greying it. */
function searchlights(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const oy = s.horizonY - u * 0.14;
  const rise = oy - s.cssH * 0.3;
  if (rise < u * 0.15) return;
  const k = LREF / rise;
  const w0 = u * 0.01;
  const w1 = u * 0.058;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(0, oy);
  ctx.scale(1, rise / LREF);
  ctx.beginPath();
  for (let i = 0; i < LIGHTS.length; i++) {
    const [bx, lean, sweep, speed] = LIGHTS[i]!;
    const ang = lean + Math.sin(s.t * speed + i * 1.7) * sweep;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const len = Math.min(u * 1.1, rise / c);
    const ox = cx + bx * u;
    const ex = ox + sn * len;
    const ey = -c * len * k;
    ctx.moveTo(ox - w0, 0);
    ctx.lineTo(ex - c * w1, ey - sn * w1 * k);
    ctx.lineTo(ex + c * w1, ey + sn * w1 * k);
    ctx.lineTo(ox + w0, 0);
    ctx.closePath();
  }
  ctx.fillStyle = beamGradient(ctx);
  ctx.fill();
  ctx.restore();
}

/* ---------------------------------------------------------------- rows */

/** The back row is lit by the moon, not floodlit: faded silhouettes with pale blue crowns. */
const BACK_CROWN = mix(FAR_BACK, "#a8c8ff", 0.32);
/** The middle row's gilded crowns and its lit windows share one gold (and one fill). */
const MID_GOLD = mix(MID_ROW, GOLD, 0.82);
const BEACON = "#ff5a6e";
const WIN_W = 0.0075;
const WIN_H = 0.011;

/** A polygon in u at (ox, oy), sunk by `sink`; points on the ground (y = 0) sit at `floor`. */
function poly(ctx: Ctx, pts: readonly number[], ox: number, oy: number, k: number, floor = 0, sink = 0): void {
  ctx.moveTo(ox + pts[0]! * k, oy - (pts[1]! ? pts[1]! - sink : floor) * k);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i]! * k, oy - (pts[i + 1]! ? pts[i + 1]! - sink : floor) * k);
  ctx.closePath();
}

/** Per tower, this frame: how far (u) it sinks to stay under the moon, or -1 when off screen.
 *  Its foot is always under the cloud bank and the field, so sinking it never shows. */
const BACK_SINK = new Float32Array(BACK.length);
const MID_SINK = new Float32Array(MID.length);

function sinks(s: Scene, list: readonly RowTower[], out: Float32Array): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const minX = (-cx - u * 0.1) / u;
  const maxX = (s.cssW - cx + u * 0.1) / u;
  for (let i = 0; i < list.length; i++) {
    const b = list[i]!;
    if (b.x1 < minX || b.x0 > maxX) {
      out[i] = -1;
      continue;
    }
    out[i] = Math.max(0, b.top - underMoon(s, cx + b.x0 * u, cx + b.x1 * u));
  }
}

/** The cloud bank's cover under x0..x1 (u from the center): the least of it, a little less. */
function coverUnder(s: Scene, x0: number, x1: number): number {
  const near = x0 > 0 ? x0 : x1 < 0 ? x1 : 0;
  return Math.max(0, cloudCover(sideOf(s.cssW, s.cssW / 2 + near * s.u)) - 0.006);
}

/** One row of towers as a single flat silhouette. Below the cloud bank's cover nothing shows,
 *  so the towers start there. */
function silhouettes(ctx: Ctx, s: Scene, list: readonly RowTower[], sink: Float32Array, fill: string): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY + 1;
  ctx.beginPath();
  for (let i = 0; i < list.length; i++) {
    const b = list[i]!;
    if (sink[i]! < 0) continue;
    poly(ctx, b.shape, cx, hy, u, coverUnder(s, b.x0, b.x1), sink[i]);
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A row's crowns, added to the current path: the back row's moonlit tips, or (`gilt`) the
 *  middle row's whole gilded crowns with their cornices. */
function crowns(ctx: Ctx, s: Scene, list: readonly RowTower[], sink: Float32Array, gilt: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY + 1;
  for (let i = 0; i < list.length; i++) {
    const b = list[i]!;
    const pts = gilt ? b.gilt : b.crown;
    if (pts.length === 0 || sink[i]! < 0) continue;
    poly(ctx, pts, cx, hy, u, 0, sink[i]);
  }
}

/** A row's lit windows, added to the current path; some switch off and on now and then. */
function windowLights(ctx: Ctx, s: Scene, list: Float32Array, sink: Float32Array): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const ww = Math.max(1, WIN_W * u);
  const wh = Math.max(1, WIN_H * u);
  const slot = Math.floor(s.t * 0.25);
  for (let i = 0; i < list.length; i += 3) {
    const sk = sink[list[i + 2]!]!;
    if (sk < 0) continue;
    const x = cx + list[i]! * u;
    const y = list[i + 1]! - sk;
    if (y + WIN_H < cloudCover(sideOf(s.cssW, x)) - 0.006) continue;
    if (hash(i * 0.37 + slot * 7.1 + (i % 5)) < 0.08) continue;
    ctx.rect(x, hy - y * u - wh, ww, wh);
  }
}

/** Blinking beacons on the rows' mooring masts. */
function beacons(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (let r = 0; r < 2; r++) {
    const list = r ? BACK : MID;
    const sink = r ? BACK_SINK : MID_SINK;
    for (let i = 0; i < list.length; i++) {
      const bc = list[i]!.beacon;
      if (!bc || sink[i]! < 0 || Math.sin(s.t * (2.2 - r * 0.4) + i * 1.3) < 0.1) continue;
      circle(ctx, cx + bc[0] * u, s.horizonY - (bc[1] - sink[i]!) * u, Math.max(1.2, u * 0.0055));
    }
  }
  ctx.fillStyle = BEACON;
  ctx.fill();
}

/** The highest anything in the city reaches (u over the horizon): the back row's spires and
 *  masts by the screen's edges (the heroes stay under CROWN_TOP and the Sunburst's needle). */
const TALLEST = 0.65;

/** The far layer. */
export function city(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * TALLEST > s.cssH) return;
  sinks(s, BACK, BACK_SINK);
  sinks(s, MID, MID_SINK);
  searchlights(ctx, s);
  silhouettes(ctx, s, BACK, BACK_SINK, FAR_BACK);
  ctx.beginPath();
  crowns(ctx, s, BACK, BACK_SINK, false);
  ctx.fillStyle = BACK_CROWN;
  ctx.fill();
  silhouettes(ctx, s, MID, MID_SINK, MID_ROW);
  ctx.beginPath();
  crowns(ctx, s, MID, MID_SINK, true);
  windowLights(ctx, s, MID_WIN, MID_SINK);
  ctx.fillStyle = MID_GOLD;
  ctx.fill();
  beacons(ctx, s);
  landmarks(ctx, s);
}

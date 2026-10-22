import { alpha, circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CANDLE, CANDLE_HOT, CARVED, FLAME, INK, ORANGE, ORANGE_DARK, ORANGE_LIGHT, smooth, STEM } from "./common";
import { HALO_REACH, moonAt } from "./sky";
import { level, LOOP_PERIOD, LOOP_START } from "./tone";

// A jack-o'-lantern hot-air balloon, our own: a great ribbed pumpkin of an envelope whose carved
// grin glows from the burner's flame inside, its curly stem on top, ropes down to a wicker basket
// with a pennant of bunting, the burner flaring now and then. As you climb (once on the first pass
// as the dusk deepens, then round the moonlit night of every turn of the loop) it sinks into view
// from above in the sky over the moon, keeps you company there a while, rising with you and
// drifting a little, then rises away out of sight. It keeps to the left lane above the moon's halo,
// beside the HUD's score: never across the moon, never in the tower's column.

/** The stretches of the climb it keeps you company for: the first pass's, and each loop's (about its seam, in the night). */
export const BALLOON_FIRST = [24, 70] as const;
const LOOP_FROM = -17;
const LOOP_TO = 12;
/** Its envelope's radius (u) at most; the basket hangs this far below its middle (radii). */
const R = 0.065;
const DROP = 2.05;
/** What it fills, in radii: a little above the envelope (the stem) to the basket's foot. */
const ABOVE = 1.42;
const BELOW = DROP + 0.5;
const EDGE = 0.016;
/**
 * It keeps below this fraction of the screen: clear of the corner's button. (The HUD's score, best,
 * lives and perfects stand in the middle of the top of the screen; the balloon keeps to the lane
 * left of the tower's column, clear of them.)
 */
export const BALLOON_TOP = 0.09;

/** Scratch: the envelope's middle and radius on screen. */
const B = { x: 0, y: 0, r: 0, hover: false };

/** The band it hovers in on this screen: above the moon's halo, below the HUD; and its size. */
function band(s: Scene): { y0: number; y1: number; r: number; x0: number; x1: number } {
  const m = moonAt(s);
  const y0 = s.cssH * BALLOON_TOP;
  const y1 = m.y - m.r * HALO_REACH - s.u * 0.012;
  const r = Math.max(0, Math.min(R * s.u, (y1 - y0) / (ABOVE + BELOW)));
  return { y0, y1, r, x0: s.u * EDGE, x1: s.baseX - s.u * (0.05 + EDGE) };
}

/** Where it is at level `lvl` in the stretch [a, b] (levels), or null while it is out of sight. */
function at(s: Scene, lvl: number, a: number, b: number): (typeof B & { hover: boolean }) | null {
  if (lvl <= a || lvl >= b) return null;
  const bd = band(s);
  if (bd.r < s.u * 0.03 || bd.x1 - bd.x0 < bd.r * 2.6) return null;
  const p = (lvl - a) / (b - a);
  // Its drift and bob keep the same rhythm in every turn of the loop.
  const ph = a === BALLOON_FIRST[0] ? 1.3 : 0.4;
  // Sinking into view from above the screen, hovering, then rising away.
  const hover = bd.y0 + bd.r * ABOVE + (bd.y1 - bd.y0 - bd.r * (ABOVE + BELOW)) * (0.5 + 0.5 * Math.sin(s.t * 0.6 + ph));
  const off = -bd.r * (BELOW + 0.2);
  const k = p < 0.15 ? smooth(0, 0.15, p) : p > 0.85 ? 1 - smooth(0.85, 1, p) : 1;
  const half = bd.r * 1.2;
  const lo = bd.x0 + half;
  const hi = bd.x1 - half;
  B.x = (lo + hi) / 2 + ((hi - lo) / 2) * Math.sin(s.t * 0.13 + ph * 2.1);
  B.y = off + (hover - off) * k;
  B.r = bd.r;
  B.hover = k >= 1;
  return B;
}

/** The stretches [from, to] (levels) near this view's level. */
function stretches(lvl: number): [number, number][] {
  const out: [number, number][] = [[BALLOON_FIRST[0], BALLOON_FIRST[1]]];
  const k = Math.floor((lvl - LOOP_START) / LOOP_PERIOD);
  for (let i = Math.max(0, k); i <= Math.max(0, k + 1); i++) {
    const seam = LOOP_START + i * LOOP_PERIOD;
    out.push([seam + LOOP_FROM, seam + LOOP_TO]);
  }
  return out;
}

/** The screen boxes of the balloons in view (envelope, stem and basket), for keeping things clear. */
export function balloonBoxes(s: Scene): { x0: number; y0: number; x1: number; y1: number; hover: boolean }[] {
  const out: { x0: number; y0: number; x1: number; y1: number; hover: boolean }[] = [];
  const lvl = level(s);
  for (const [a, b] of stretches(lvl)) {
    const p = at(s, lvl, a, b);
    if (!p || p.y + p.r * BELOW < 0) continue;
    out.push({ x0: p.x - p.r * 1.2, x1: p.x + p.r * 1.2, y0: p.y - p.r * ABOVE, y1: p.y + p.r * BELOW, hover: p.hover });
  }
  return out;
}

function draw(ctx: Ctx, s: Scene, b: { x: number; y: number; r: number }): void {
  const { x, y, r } = b;
  const lw = Math.max(1.2, s.u * 0.005);
  const flare = Math.max(0, Math.sin(s.t * 1.1)) ** 6;
  const flick = 0.5 + 0.5 * Math.sin(s.t * 9) * Math.sin(s.t * 5.3);
  // Ropes from the envelope's skirt to the basket.
  const by = y + r * DROP;
  const bw = r * 0.42;
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(x + k * r * 0.55, y + r * 0.75);
    ctx.lineTo(x + k * bw * 0.85, by);
    ctx.moveTo(x + k * r * 0.2, y + r * 0.92);
    ctx.lineTo(x + k * bw * 0.3, by);
  }
  ink(ctx, Math.max(0.8, lw * 0.5), INK);
  // A pennant of bunting along the ropes.
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const f = (i + 0.5) / 4;
    const px = x - bw * 0.85 + f * bw * 1.7;
    const py = y + r * (1.25 + Math.sin(f * Math.PI) * 0.12);
    ctx.moveTo(px - r * 0.09, py);
    ctx.lineTo(px + r * 0.09, py);
    ctx.lineTo(px, py + r * 0.18);
    ctx.closePath();
  }
  ctx.fillStyle = "#8a4fd0";
  ctx.fill();
  // The basket: wicker, two bands of weave.
  ctx.beginPath();
  ctx.moveTo(x - bw, by);
  ctx.lineTo(x + bw, by);
  ctx.lineTo(x + bw * 0.85, by + r * 0.42);
  ctx.lineTo(x - bw * 0.85, by + r * 0.42);
  ctx.closePath();
  ctx.fillStyle = "#a8763a";
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    const yy = by + (r * 0.42 * i) / 3;
    ctx.moveTo(x - bw * (1 - 0.05 * i), yy);
    ctx.lineTo(x + bw * (1 - 0.05 * i), yy);
  }
  ctx.strokeStyle = "#6e4a20";
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  // The burner's flame, flaring now and then, under the envelope's mouth.
  ctx.fillStyle = FLAME;
  ctx.beginPath();
  const fh = r * (0.18 + 0.32 * flare);
  ctx.moveTo(x - r * 0.08, by - r * 0.02);
  ctx.quadraticCurveTo(x - r * 0.1, by - fh * 0.6, x, by - fh);
  ctx.quadraticCurveTo(x + r * 0.1, by - fh * 0.6, x + r * 0.08, by - r * 0.02);
  ctx.closePath();
  ctx.fill();
  // The envelope's glow, then the envelope: a ribbed pumpkin, lit from the flame inside.
  ctx.fillStyle = alpha(ORANGE_LIGHT, 0.16 + 0.12 * flare);
  ctx.beginPath();
  circle(ctx, x, y, r * 1.55);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y + r * 0.9);
  ctx.lineTo(x + r * 0.3, y + r * 0.9);
  ctx.lineTo(x + r * 0.2, y + r * 1.08);
  ctx.lineTo(x - r * 0.2, y + r * 1.08);
  ctx.closePath();
  ctx.fillStyle = ORANGE_DARK;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  oval(ctx, x, y, r * 1.12, r);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  oval(ctx, x + r * 0.2, y + r * 0.7, r * 1.3, r * 0.5);
  ctx.fill();
  ctx.fillStyle = ORANGE_LIGHT;
  ctx.beginPath();
  oval(ctx, x - r * 0.55, y - r * 0.5, r * 0.28, r * 0.18, -0.5);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  for (const k of [0.4, 0.8]) {
    ctx.moveTo(x + r * k * Math.cos(Math.PI * 0.62), y + r * 0.97 * Math.sin(Math.PI * 0.62));
    ctx.ellipse(x, y, r * k, r * 0.97, 0, Math.PI * 0.62, Math.PI * 1.38);
    ctx.moveTo(x + r * k * Math.cos(-Math.PI * 0.38), y + r * 0.97 * Math.sin(-Math.PI * 0.38));
    ctx.ellipse(x, y, r * k, r * 0.97, 0, -Math.PI * 0.38, Math.PI * 0.38);
  }
  ctx.strokeStyle = ORANGE_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, x, y, r * 1.12, r);
  ink(ctx, lw, INK);
  // The grin, glowing with the flame: two eyes, a nose, a toothy smile (each its own subpath).
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(x + k * r * 0.62, y - r * 0.08);
    ctx.lineTo(x + k * r * 0.16, y - r * 0.02);
    ctx.lineTo(x + k * r * 0.38, y - r * 0.46);
    ctx.closePath();
  }
  ctx.moveTo(x, y + r * 0.04);
  ctx.lineTo(x - r * 0.09, y + r * 0.2);
  ctx.lineTo(x + r * 0.09, y + r * 0.2);
  ctx.closePath();
  ctx.moveTo(x - r * 0.66, y + r * 0.26);
  for (let i = 1; i <= 6; i++) ctx.lineTo(x - r * 0.66 + (r * 1.32 * i) / 6, y + r * (i % 2 ? 0.42 : 0.3));
  ctx.quadraticCurveTo(x + r * 0.45, y + r * 0.78, x, y + r * 0.76);
  ctx.quadraticCurveTo(x - r * 0.45, y + r * 0.78, x - r * 0.66, y + r * 0.26);
  ctx.closePath();
  ctx.fillStyle = CARVED;
  ctx.fill();
  ctx.fillStyle = flare > 0.3 || flick > 0.6 ? CANDLE_HOT : CANDLE;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.stroke();
  // The stem, curling over on top.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.92);
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 1.2, x + r * 0.1, y - r * 1.28);
  ctx.arc(x + r * 0.16, y - r * 1.2, r * 0.08, Math.PI * 1.3, Math.PI * 3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.16) + lw;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = STEM;
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.stroke();
}

/** The balloon, while it is keeping you company. */
export function balloons(ctx: Ctx, s: Scene): void {
  const lvl = level(s);
  for (const [a, b] of stretches(lvl)) {
    const p = at(s, lvl, a, b);
    if (!p || p.y + p.r * BELOW < 0) continue;
    draw(ctx, s, p);
  }
}

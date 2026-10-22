import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { ASPHALT, CONFETTI, CURB, LANE_LINE, NAVY, PATH_EDGE, STRIPE_BLUE, STRIPE_RED, STRIPE_WHITE } from "./colors";
import { starPath } from "./shapes";
import { sidewalkTop } from "./square";

// The near edge we look over, printed flat: the street in front of the town square. A cream
// concrete sidewalk with its joints, the curb painted red, cream and blue for the Fourth over a
// navy shadow line, then the navy asphalt with its dashed gold center line and the confetti
// and paper stars the parade left behind (the asphalt is laid first under the whole street: the
// lawn stops at the sidewalk). It covers the base band and drops away faster than
// the tower as the camera climbs (parallax 1.6, like the band), so it only frames the start.
// render.ts writes "tap to drop" across it at the start (at 0.9 of the screen height): plain
// asphalt there, so the line reads.

/** The sidewalk's depth (u) and the painted curb's. */
const SIDEWALK_H = 0.055;
const CURB_H = 0.014;
/** How far above its line the sidewalk is painted (u): over the base band's grass tips, under the parade's feet. */
const OVER = 0.012;
/** The curb's shadow line under its paint (u). */
const CURB_SHADOW = 0.006;
/** Confetti on the asphalt: x (fraction of the width), depth below the curb (u), size (u), color, turn, and whether it is a paper star. */
const BITS = Array.from({ length: 26 }, (_, i) => ({
  x: hash(i * 5 + 7000),
  d: 0.03 + hash(i * 5 + 7001) * 0.3,
  w: 0.008 + hash(i * 5 + 7002) * 0.006,
  c: Math.floor(hash(i * 5 + 7003) * CONFETTI.length),
  a: hash(i * 5 + 7004) * Math.PI,
  star: i % 4 === 0,
}));

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = sidewalkTop(s);
  if (top - u * OVER > s.cssH) return;
  const curbY = top + SIDEWALK_H * u;
  // The asphalt under everything from the curb down (the lawn stops at the sidewalk), so no seam between the strips shows through.
  ctx.fillStyle = ASPHALT.body;
  ctx.fillRect(0, curbY, s.cssW, s.cssH - curbY);
  // The sidewalk: concrete slabs with joint lines (it starts a little above its line, over the base band's grass tips).
  ctx.fillStyle = CURB.light;
  ctx.fillRect(0, top - u * OVER, s.cssW, curbY - top + u * OVER + 1);
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  for (let x = (s.cssW / 2) % (u * 0.12); x < s.cssW; x += u * 0.12) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, curbY);
  }
  ctx.moveTo(0, top + u * 0.004);
  ctx.lineTo(s.cssW, top + u * 0.004);
  ctx.stroke();
  // The curb, painted in red, cream and blue blocks, its shadow line under it.
  const blockW = u * 0.06;
  for (let x = (s.cssW / 2) % blockW - blockW, i = Math.floor((s.cssW / 2 - x) / blockW); x < s.cssW; x += blockW, i--) {
    const k = ((i % 3) + 3) % 3;
    ctx.fillStyle = k === 0 ? STRIPE_RED : k === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.fillRect(x, curbY, blockW + 1, CURB_H * u);
  }
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, curbY + CURB_H * u, s.cssW, CURB_SHADOW * u);
  // The asphalt, its gutter shadow, the dashed center line, confetti and paper stars.
  const road = curbY + (CURB_H + CURB_SHADOW) * u;
  if (road > s.cssH) return;
  ctx.fillStyle = ASPHALT.shade;
  ctx.fillRect(0, road, s.cssW, u * 0.012);
  const lineY = road + u * 0.2;
  if (lineY < s.cssH) {
    ctx.fillStyle = LANE_LINE;
    ctx.beginPath();
    for (let x = (s.cssW / 2) % (u * 0.16) - u * 0.16; x < s.cssW; x += u * 0.16) ctx.rect(x, lineY, u * 0.08, u * 0.01);
    ctx.fill();
  }
  // Confetti a color at a time: paper stars, and slips turned at their angles.
  for (let c = 0; c < CONFETTI.length; c++) {
    ctx.fillStyle = CONFETTI[c]!;
    ctx.beginPath();
    for (const b of BITS) {
      const y = road + b.d * u;
      if (b.c !== c || y > s.cssH) continue;
      const x = b.x * s.cssW;
      if (b.star) starPath(ctx, x, y, b.w * u * 0.75, b.a);
      else {
        const ax = Math.cos(b.a) * b.w * u * 0.5;
        const ay = Math.sin(b.a) * b.w * u * 0.5;
        const bx = -Math.sin(b.a) * b.w * u * 0.2;
        const by = Math.cos(b.a) * b.w * u * 0.2;
        ctx.moveTo(x - ax - bx, y - ay - by);
        ctx.lineTo(x + ax - bx, y + ay - by);
        ctx.lineTo(x + ax + bx, y + ay + by);
        ctx.lineTo(x - ax + bx, y - ay + by);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
}

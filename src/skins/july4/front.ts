import { hash, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { ASPHALT, CONFETTI, CURB, INK, LANE_LINE, PATH_EDGE, STRIPE_BLUE, STRIPE_RED, STRIPE_WHITE } from "./colors";
import { inkW, sidewalkTop } from "./square";

// The near edge we look over: the street in front of the town square. A concrete sidewalk
// with its joints, the curb painted red, white and blue for the Fourth, then the asphalt with
// its dashed yellow center line and the confetti the parade left behind. It covers the base
// band and drops away faster than the tower as the camera climbs (parallax 1.6, like the
// band), so it only frames the start. render.ts writes "tap to drop" across it at the start
// (at 0.9 of the screen height): plain asphalt there, so the line reads.

/** The sidewalk's depth (u) and the painted curb's. */
const SIDEWALK_H = 0.055;
const CURB_H = 0.014;
/** How far above its line the sidewalk is painted (u): over the base band's grass tips, under the parade's feet. */
const OVER = 0.012;
/** Confetti on the asphalt: x (fraction of the width), depth below the curb (u), size (u), color, turn. */
const BITS = Array.from({ length: 26 }, (_, i) => ({
  x: hash(i * 5 + 7000),
  d: 0.03 + hash(i * 5 + 7001) * 0.3,
  w: 0.008 + hash(i * 5 + 7002) * 0.006,
  c: Math.floor(hash(i * 5 + 7003) * CONFETTI.length),
  a: hash(i * 5 + 7004) * Math.PI,
}));

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = sidewalkTop(s);
  if (top - u * OVER > s.cssH) return;
  const lw = inkW(s);
  const curbY = top + SIDEWALK_H * u;
  // The sidewalk: concrete slabs with joint lines (it starts a little above its line, over the base band's grass tips).
  ctx.fillStyle = CURB.light;
  ctx.fillRect(0, top - u * OVER, s.cssW, curbY - top + u * OVER);
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
  // The curb, painted in red, white and blue blocks.
  const blockW = u * 0.06;
  for (let x = (s.cssW / 2) % blockW - blockW, i = Math.floor((s.cssW / 2 - x) / blockW); x < s.cssW; x += blockW, i--) {
    const k = ((i % 3) + 3) % 3;
    ctx.fillStyle = k === 0 ? STRIPE_RED : k === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.fillRect(x, curbY, blockW, CURB_H * u);
  }
  ctx.fillStyle = CURB.shade;
  ctx.fillRect(0, curbY + CURB_H * u, s.cssW, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, curbY);
  ctx.lineTo(s.cssW, curbY);
  ctx.moveTo(0, curbY + (CURB_H + 0.006) * u);
  ctx.lineTo(s.cssW, curbY + (CURB_H + 0.006) * u);
  ink(ctx, lw, INK);
  // The asphalt, its gutter shadow, the dashed center line, confetti.
  const road = curbY + (CURB_H + 0.006) * u;
  if (road > s.cssH) return;
  ctx.fillStyle = ASPHALT.body;
  ctx.fillRect(0, road, s.cssW, s.cssH - road);
  ctx.fillStyle = ASPHALT.shade;
  ctx.fillRect(0, road, s.cssW, u * 0.012);
  const lineY = road + u * 0.2;
  if (lineY < s.cssH) {
    ctx.fillStyle = LANE_LINE;
    ctx.beginPath();
    for (let x = (s.cssW / 2) % (u * 0.16) - u * 0.16; x < s.cssW; x += u * 0.16) ctx.rect(x, lineY, u * 0.08, u * 0.01);
    ctx.fill();
  }
  for (const b of BITS) {
    const y = road + b.d * u;
    if (y > s.cssH) continue;
    ctx.save();
    ctx.translate(b.x * s.cssW, y);
    ctx.rotate(b.a);
    ctx.fillStyle = CONFETTI[b.c]!;
    ctx.fillRect(-b.w * u * 0.5, -b.w * u * 0.2, b.w * u, b.w * u * 0.4);
    ctx.restore();
  }
}

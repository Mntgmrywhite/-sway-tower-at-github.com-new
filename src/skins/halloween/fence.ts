import { alpha, hash, neonStroke, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { floor, INK } from "./common";

const IRON_RIM = "#8a45e6";

// A low wrought-iron cemetery fence right at the front of the floor, framing the bottom edge.
// It sits on the floor's nearest row, so it is only on screen at the start and drops away
// fast once the camera climbs; it never reaches up to the tower.

const POSTS = 40;
/** Per-post lean and height jitter, precomputed. */
const LEAN = Array.from({ length: POSTS }, (_, i) => (hash(i + 900) - 0.5) * 0.08);
const TALL = Array.from({ length: POSTS }, (_, i) => 0.92 + hash(i + 950) * 0.12);
/** A missing post here and there (bent off or stolen). */
const GONE = Array.from({ length: POSTS }, (_, i) => hash(i + 990) > 0.93);

export function fence(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const base = floor(s, 0, 0.95).y;
  const h = u * 0.12;
  if (base - h * 1.3 > s.cssH) return;
  const step = u * 0.052;
  const n = Math.min(POSTS, Math.ceil(s.cssW / step) + 1);
  const x0 = (s.cssW - (n - 1) * step) / 2;
  const railHi = base - h * 0.8;
  const railLo = base - h * 0.3;
  const bar = Math.max(1.4, u * 0.006);
  const rim = Math.max(1, u * 0.003);

  // Bars and rails as one path, stroked fat in violet, then dark on top: a rim around the
  // whole ironwork without seams where bars cross the rails.
  const ironwork = () => {
    ctx.beginPath();
    ctx.moveTo(-u * 0.05, railHi);
    ctx.lineTo(s.cssW + u * 0.05, railHi + u * 0.004);
    ctx.moveTo(-u * 0.05, railLo);
    ctx.lineTo(s.cssW + u * 0.05, railLo - u * 0.003);
    for (let i = 0; i < n; i++) {
      if (GONE[i]) continue;
      const x = x0 + i * step;
      const top = base - h * (TALL[i] ?? 1);
      ctx.moveTo(x, base + u * 0.05);
      ctx.lineTo(x + (LEAN[i] ?? 0) * h, top);
    }
  };
  const tips = () => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (GONE[i]) continue;
      const x = x0 + i * step + (LEAN[i] ?? 0) * h;
      const top = base - h * (TALL[i] ?? 1);
      const tw = u * 0.011;
      ctx.moveTo(x, top - u * 0.026);
      ctx.lineTo(x + tw, top + u * 0.002);
      ctx.lineTo(x, top - u * 0.004);
      ctx.lineTo(x - tw, top + u * 0.002);
      ctx.closePath();
    }
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ironwork();
  ctx.strokeStyle = alpha(IRON_RIM, 0.14);
  ctx.lineWidth = bar + rim * 5;
  ctx.stroke();
  ctx.strokeStyle = IRON_RIM;
  ctx.lineWidth = bar + rim * 2;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = bar;
  ctx.stroke();
  // Spear tips
  tips();
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, IRON_RIM, rim, 2.6);
  ctx.restore();
}

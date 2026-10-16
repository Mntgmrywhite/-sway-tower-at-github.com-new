import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { INK, spot } from "./common";

// Short runs of wrought-iron cemetery fence at the back of the graveyard, one each side of
// the tower and never across its column. Inked bars with spear tips, leaning a little, with
// a bar bent off here and there. Each run ends on a thicker post with a round finial.

const IRON = "#4c3f7c";
const IRON_LIGHT = "#6d5fa6";

/** Fence runs: from X0 to X1 (u at the tower's depth), on field row z. */
const RUNS = [
  { X0: -1.2, X1: -0.8, z: 8, seed: 3 },
  { X0: 0.8, X1: 1.2, z: 8, seed: 9 },
] as const;
const BARS = 9;

export const FENCE_Z = RUNS[0].z;

/** Scratch geometry for the run being drawn, reused so nothing allocates per frame. */
const R = { x0: 0, x1: 0, y: 0, h: 0, bar: 0, seed: 0 };

function barX(i: number): number {
  return R.x0 + ((R.x1 - R.x0) * i) / (BARS - 1) + (hash(R.seed * 17 + i) - 0.5) * R.h * 0.12;
}
function barTop(i: number): number {
  return R.y - R.h * (0.92 + hash(R.seed * 13 + i) * 0.1);
}
/** A bar is missing here and there (bent off). */
function gone(i: number): boolean {
  return hash(R.seed * 31 + i) > 0.86;
}

/** Rails and bars. */
function ironPath(ctx: Ctx): void {
  const { x0, x1, y, h } = R;
  ctx.beginPath();
  ctx.moveTo(x0, y - h * 0.78);
  ctx.lineTo(x1, y - h * 0.78);
  ctx.moveTo(x0, y - h * 0.3);
  ctx.lineTo(x1, y - h * 0.3);
  for (let i = 1; i < BARS - 1; i++) {
    if (gone(i)) continue;
    ctx.moveTo(R.x0 + ((x1 - x0) * i) / (BARS - 1), y);
    ctx.lineTo(barX(i), barTop(i));
  }
}

/** Spear tips on the bars. */
function tipsPath(ctx: Ctx): void {
  const b = R.bar;
  ctx.beginPath();
  for (let i = 1; i < BARS - 1; i++) {
    if (gone(i)) continue;
    const x = barX(i);
    const top = barTop(i);
    ctx.moveTo(x, top - b * 2.6);
    ctx.lineTo(x + b * 1.3, top + b * 0.2);
    ctx.lineTo(x - b * 1.3, top + b * 0.2);
    ctx.closePath();
  }
}

/** The two end posts with round finials. */
function postsPath(ctx: Ctx): void {
  const { x0, x1, y, h, bar } = R;
  ctx.beginPath();
  ctx.rect(x0 - bar * 1.1, y - h * 1.05, bar * 2.2, h * 1.05);
  ctx.rect(x1 - bar * 1.1, y - h * 1.05, bar * 2.2, h * 1.05);
  ctx.moveTo(x0 + bar * 1.5, y - h * 1.12);
  ctx.arc(x0, y - h * 1.12, bar * 1.5, 0, Math.PI * 2);
  ctx.moveTo(x1 + bar * 1.5, y - h * 1.12);
  ctx.arc(x1, y - h * 1.12, bar * 1.5, 0, Math.PI * 2);
}

function run(ctx: Ctx, s: Scene, X0: number, X1: number, z: number, seed: number): void {
  const a = spot(s, X0, z);
  R.x0 = a.x;
  R.y = a.y;
  const k = a.k;
  R.x1 = spot(s, X1, z).x;
  R.seed = seed;
  const u = s.u;
  R.h = u * 0.085 * k;
  R.bar = Math.max(1.2, u * 0.006 * k);
  const lw = Math.max(1, u * 0.0045 * Math.sqrt(k));
  const { x0, x1, y, h, bar } = R;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ink first (fat), then the iron on top, so crossings have no seams.
  ironPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = bar + lw * 2;
  ctx.stroke();
  tipsPath(ctx);
  ctx.lineWidth = lw * 2;
  ctx.stroke();
  postsPath(ctx);
  ctx.stroke();
  ironPath(ctx);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = bar;
  ctx.stroke();
  tipsPath(ctx);
  ctx.fillStyle = IRON;
  ctx.fill();
  postsPath(ctx);
  ctx.fill();
  // A glint down the posts
  ctx.fillStyle = IRON_LIGHT;
  ctx.fillRect(x0 - bar * 0.7, y - h, Math.max(1, bar * 0.5), h * 0.9);
  ctx.fillRect(x1 - bar * 0.7, y - h, Math.max(1, bar * 0.5), h * 0.9);
}

export function fence(ctx: Ctx, s: Scene): void {
  for (const r of RUNS) run(ctx, s, r.X0, r.X1, r.z, r.seed);
}

import { type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { INK, tone } from "./colors";
import { cel, L, line, M, pen, spot } from "./pen";

// A weathered post-and-rail fence: square posts with two rails between them, running from
// one field spot to another (so a run can recede in perspective). Hand-inked, rails slightly
// sagging, a post leaning here and there.

const POST = tone("#a8754a", 0.3, 0.26);
const RAIL = "#d2a06a";

const POST_H = 0.082; // local units at the tower's depth
const POST_W = 0.012;
const RAIL_W = 0.008;
const RAILS = [0.3, 0.72] as const;

/** Scratch post positions for the run being drawn (max posts per run). */
const MAX_POSTS = 8;
const PX = new Float64Array(MAX_POSTS);
const PY = new Float64Array(MAX_POSTS);
const PK = new Float64Array(MAX_POSTS);

/** A fence run from (X0, z0) to (X1, z1) with `n` posts (2..8), drawn back to front. */
export function fence(ctx: Ctx, s: Scene, X0: number, z0: number, X1: number, z1: number, n: number, lw: number, seed: number): void {
  const u = s.u;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const p = spot(s, X0 + (X1 - X0) * f, z0 + (z1 - z0) * f);
    PX[i] = p.x;
    PY[i] = p.y;
    PK[i] = p.k;
  }
  // Rails: ink under, wood over, sagging a touch between posts.
  ctx.beginPath();
  for (const r of RAILS) {
    for (let i = 0; i < n - 1; i++) {
      const ya = PY[i]! - POST_H * r * u * PK[i]!;
      const yb = PY[i + 1]! - POST_H * r * u * PK[i + 1]!;
      const sag = u * 0.004 * (PK[i]! + PK[i + 1]!) * 0.5;
      ctx.moveTo(PX[i]!, ya);
      ctx.quadraticCurveTo((PX[i]! + PX[i + 1]!) / 2, (ya + yb) / 2 + sag, PX[i + 1]!, yb);
    }
  }
  const k = (PK[0]! + PK[n - 1]!) / 2;
  line(ctx, INK, RAIL_W * u * k + lw * 2);
  line(ctx, RAIL, RAIL_W * u * k);

  // Posts, back to front (bigger z first).
  const backFirst = z0 > z1;
  for (let j = 0; j < n; j++) {
    const i = backFirst ? j : n - 1 - j;
    pen(PX[i]!, PY[i]!, u * PK[i]!, seed + i);
    const lean = ((seed * 7 + i * 3) % 5 === 0 ? 0.006 : 0) * (i % 2 ? 1 : -1);
    ctx.beginPath();
    M(ctx, -POST_W / 2, 0);
    L(ctx, -POST_W / 2 + lean, -POST_H);
    L(ctx, POST_W / 2 + lean, -POST_H - 0.004);
    L(ctx, POST_W / 2, 0);
    ctx.closePath();
    cel(ctx, POST, -POST_H, 0, lw, 0.15, 0.3);
  }
}

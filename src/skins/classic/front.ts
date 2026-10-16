import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { BLOOMS, INK, inkW, STEM } from "./colors";
import { checkerEarth, EARTH, EARTH_DEEP, grassCap } from "./terrain";

// The near ledge we look over: a thick cap of bright grass hanging in round scallops over
// checker-banded earth, the base band's stone replaced by warm soil. It drops away faster than
// the tower as the camera climbs (parallax 1.6, like the base band it covers). A few tulips
// and daisies grow from the grass at the sides, clear of the "tap to drop" hint in the middle.

/** Flowers on the ledge: [x (fraction of the width from the nearer edge, mirrored by side), side, kind, phase]. */
const FLOWERS = [
  [0.035, -1, 0, 0.2],
  [0.09, -1, 1, 1.4],
  [0.15, -1, 2, 2.6],
  [0.2, -1, 1, 3.1],
  [0.045, 1, 1, 0.9],
  [0.1, 1, 2, 2.2],
  [0.16, 1, 1, 0.4],
  [0.205, 1, 0, 1.8],
] as const;
/** Head colors by kind: pink tulip, white daisy, violet tulip. */
const HEADS = ["#ff4f7e", "#ffffff", "#b46cff"] as const;

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const band = layerGround(s, 1.6) + u * 0.36;
  const capTop = band - u * 0.03;
  if (capTop - u * 0.06 > s.cssH) return;
  const lw = inkW(s, 1.5);
  const cx = s.cssW / 2;
  const capH = u * 0.04;
  const c = u * 0.068;
  const earthTop = capTop + capH * 0.6;
  // The earth darkens a little below its top stratum.
  checkerEarth(ctx, 0, s.cssW, earthTop, s.cssH, c, cx - c / 2, EARTH, true, EARTH_DEEP);
  grassCap(ctx, 0, s.cssW, capTop, capH, u * 0.078, u * 0.012, cx - u * 0.039, lw);
  flowers(ctx, s, capTop + u * 0.012, lw);
}

/** Tulips (cups) and daisies standing on the grass cap at the sides. */
function flowers(ctx: Ctx, s: Scene, y: number, lw: number): void {
  const u = s.u;
  const h = u * 0.05;
  // Stems
  ctx.beginPath();
  for (const [f, side, , ph] of FLOWERS) {
    const x = side < 0 ? f * s.cssW : s.cssW - f * s.cssW;
    const sway = Math.sin(s.t * 1.2 + ph) * h * 0.08;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - h * 0.05, y - h * 0.5, x + sway, y - h * (0.85 + 0.15 * hash(ph * 10)));
  }
  ink(ctx, Math.max(1.5, u * 0.0055) + lw * 1.4, INK);
  ctx.strokeStyle = STEM;
  ctx.lineWidth = Math.max(1.5, u * 0.0055);
  ctx.stroke();
  // Leaves
  ctx.beginPath();
  for (const [f, side, , ph] of FLOWERS) {
    const x = side < 0 ? f * s.cssW : s.cssW - f * s.cssW;
    oval(ctx, x + h * 0.12, y - h * 0.22, h * 0.13, h * 0.05, -0.6 + Math.sin(s.t + ph) * 0.1);
  }
  ctx.fillStyle = STEM;
  ink(ctx, lw * 1.3, INK);
  ctx.fill();
  // Heads: tulip cups in pink and violet, daisies white with gold hearts. Pass 3 inks every
  // head in one stroke; passes 0..2 fill them by kind.
  for (let kind = 3; kind >= 0; kind--) {
    ctx.beginPath();
    for (const [f, side, k, ph] of FLOWERS) {
      if (kind < 3 && k !== kind) continue;
      const x = side < 0 ? f * s.cssW : s.cssW - f * s.cssW;
      const sway = Math.sin(s.t * 1.2 + ph) * h * 0.08;
      const hx = x + sway;
      const hy = y - h * (0.85 + 0.15 * hash(ph * 10));
      if (k === 1) daisy(ctx, hx, hy, h * 0.17);
      else tulip(ctx, hx, hy, h * 0.17);
    }
    if (kind === 3) {
      ink(ctx, lw * 1.3, INK);
      continue;
    }
    ctx.fillStyle = HEADS[kind]!;
    ctx.fill();
  }
  ctx.beginPath();
  for (const [f, side, k, ph] of FLOWERS) {
    if (k !== 1) continue;
    const x = side < 0 ? f * s.cssW : s.cssW - f * s.cssW;
    const sway = Math.sin(s.t * 1.2 + ph) * h * 0.08;
    circle(ctx, x + sway, y - h * (0.85 + 0.15 * hash(ph * 10)), h * 0.07);
  }
  ctx.fillStyle = BLOOMS[2];
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/** A tulip cup of three petals, centered at (x, y), radius r. */
function tulip(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x - r, y - r * 0.9);
  ctx.lineTo(x - r * 0.45, y - r * 0.35);
  ctx.lineTo(x, y - r * 1.1);
  ctx.lineTo(x + r * 0.45, y - r * 0.35);
  ctx.lineTo(x + r, y - r * 0.9);
  ctx.quadraticCurveTo(x + r * 1.05, y + r * 0.7, x, y + r * 0.75);
  ctx.quadraticCurveTo(x - r * 1.05, y + r * 0.7, x - r, y - r * 0.9);
  ctx.closePath();
}

/** A daisy of six round petals, centered at (x, y), radius r. */
function daisy(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.45);
  }
}

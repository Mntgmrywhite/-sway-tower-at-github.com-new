import { circle, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";

// The rolling fields that make the hollow: a low hill on each side of the lawn, standing on
// the horizon in front of the clouds, patched with autumn fields (golden stubble, green
// pasture, rust-brown furrows) and a few round trees. Mid-distance, so flat color with a
// thin darker ridge line and no heavy ink. They stay out of the tower's column.

const STUBBLE = mix("#e2b65c", PALETTE.cloudShadow, 0.12);
const PASTURE = mix("#a6ad4e", PALETTE.cloudShadow, 0.12);
const FURROW = mix("#c27a48", PALETTE.cloudShadow, 0.12);
const RIDGE = mix("#8a6a3e", PALETTE.cloudShadow, 0.2);
const ROWS = mix(FURROW, "#5a3a2a", 0.25);
const TREE = mix("#e07a36", PALETTE.cloudShadow, 0.15);
const TREE_GOLD = mix("#e9b23c", PALETTE.cloudShadow, 0.15);

/** A hill: humps of [center, half-width, height] (fractions of the width / u); x range. */
interface Hill {
  humps: readonly (readonly [number, number, number])[];
  x0: number;
  x1: number;
}

/** Both hills end before the tower's column (which starts at 0.25 of the width). */
const HILLS: readonly Hill[] = [
  {
    humps: [
      [0.07, 0.18, 0.18],
      [-0.1, 0.2, 0.15],
      [0.19, 0.06, 0.05],
    ],
    x0: -0.02,
    x1: 0.245,
  },
  {
    humps: [
      [0.93, 0.17, 0.155],
      [1.08, 0.2, 0.13],
      [0.81, 0.055, 0.045],
    ],
    x0: 0.755,
    x1: 1.02,
  },
];

function height(h: Hill, fx: number): number {
  let best = 0;
  for (const [c, w, H] of h.humps) {
    const d = (fx - c) / w;
    if (d > -1 && d < 1) {
      const v = Math.cos((d * Math.PI) / 2);
      best = Math.max(best, H * v * v);
    }
  }
  return best;
}

const STEPS = 18;
/** Field bands down the slope, as fractions of the local hill height: [top, bottom, color]. */
const BANDS = [
  [0.78, 0.5, PASTURE],
  [0.5, 0.24, FURROW],
] as const;
/** Furrow lines across the plowed band, as fractions of the hill height. */
const FURROWS = [0.43, 0.35, 0.28] as const;
/** Round trees on the slopes: hill, fx, fraction of the height, radius (u), gold. */
const TREES = [
  [0, 0.05, 0.98, 0.016, 0],
  [0, 0.085, 0.97, 0.012, 1],
  [0, 0.19, 0.6, 0.011, 0],
  [1, 0.91, 0.97, 0.014, 1],
  [1, 0.95, 0.96, 0.012, 0],
] as const;

function hillPath(ctx: Ctx, s: Scene, h: Hill, top: number, bottom: number, base: number): void {
  const W = s.cssW;
  for (let i = 0; i <= STEPS; i++) {
    const fx = h.x0 + ((h.x1 - h.x0) * i) / STEPS;
    const y = base - height(h, fx) * s.u * top;
    if (i === 0) ctx.moveTo(fx * W, y);
    else ctx.lineTo(fx * W, y);
  }
  for (let i = STEPS; i >= 0; i--) {
    const fx = h.x0 + ((h.x1 - h.x0) * i) / STEPS;
    ctx.lineTo(fx * W, base - height(h, fx) * s.u * bottom);
  }
  ctx.closePath();
}

export function rollingFields(ctx: Ctx, s: Scene): void {
  const base = s.horizonY + 1;
  if (base - s.u * 0.25 > s.cssH) return;
  const W = s.cssW;
  // Hills: stubble gold overall, then pasture and furrow bands following the slope.
  ctx.beginPath();
  for (const h of HILLS) hillPath(ctx, s, h, 1, 0, base);
  ctx.fillStyle = STUBBLE;
  ctx.fill();
  for (const [top, bottom, color] of BANDS) {
    ctx.beginPath();
    for (const h of HILLS) hillPath(ctx, s, h, top, bottom, base);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // Furrow rows, and the ridge line along each hilltop.
  ctx.beginPath();
  for (const h of HILLS) {
    for (const f of FURROWS) {
      for (let i = 0; i <= STEPS; i++) {
        const fx = h.x0 + ((h.x1 - h.x0) * i) / STEPS;
        const y = base - height(h, fx) * s.u * f;
        if (i === 0) ctx.moveTo(fx * W, y);
        else ctx.lineTo(fx * W, y);
      }
    }
  }
  ctx.strokeStyle = ROWS;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.stroke();
  ctx.beginPath();
  for (const h of HILLS) {
    for (let i = 0; i <= STEPS; i++) {
      const fx = h.x0 + ((h.x1 - h.x0) * i) / STEPS;
      const y = base - height(h, fx) * s.u;
      if (i === 0) ctx.moveTo(fx * W, y);
      else ctx.lineTo(fx * W, y);
    }
  }
  ctx.strokeStyle = RIDGE;
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.lineJoin = "round";
  ctx.stroke();

  // Round trees on short trunks, standing on the slopes.
  ctx.beginPath();
  for (const [hi, fx, f, r] of TREES) {
    const y = base - height(HILLS[hi]!, fx) * s.u * f;
    ctx.rect(fx * W - s.u * 0.0018, y - r * s.u * 1.4, s.u * 0.0036, r * s.u * 1.4 + 1);
  }
  ctx.fillStyle = RIDGE;
  ctx.fill();
  for (let gold = 0; gold < 2; gold++) {
    ctx.beginPath();
    for (const [hi, fx, f, r, g] of TREES) {
      if (g !== gold) continue;
      const y = base - height(HILLS[hi]!, fx) * s.u * f;
      circle(ctx, fx * W, y - r * s.u * 1.9, r * s.u);
    }
    ctx.fillStyle = gold ? TREE_GOLD : TREE;
    ctx.fill();
  }
}

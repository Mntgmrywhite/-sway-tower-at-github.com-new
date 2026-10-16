import { alpha, circle, ink, mix, type Ctx } from "../../base/draw";
import { INK, LIGHTS, RED, SNOW, SNOW_SHADE } from "./colors";

// Path builders and small drawing routines shared by the Christmas layers.
// Path builders only add subpaths (no beginPath), so callers can batch several shapes.

export const TAU = Math.PI * 2;

/** A five-point star as its own subpath. */
export function starPath(ctx: Ctx, x: number, y: number, r: number, inner = 0.42): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A four-point sparkle (concave diamond) as its own subpath. */
export function sparklePath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

/** A tier of a fir: top y, bottom y and half width at the bottom, all as fractions of the height. */
export interface Tier {
  top: number;
  bottom: number;
  half: number;
}

/**
 * Outline of a tiered fir standing at y = 0 with its apex at y = -1, as [x, y] pairs
 * (fractions of the height), clockwise. Notches sit where each tier tucks under the next.
 */
export function firOutline(tiers: Tier[], trunk: number): [number, number][] {
  const right: [number, number][] = [];
  const last = tiers[tiers.length - 1]!;
  right.push([0, tiers[0]!.top]);
  tiers.forEach((t, i) => {
    right.push([t.half, t.bottom]);
    const next = tiers[i + 1];
    if (next) {
      const y = t.bottom - 0.03;
      const k = (y - next.top) / (next.bottom - next.top);
      right.push([next.half * Math.max(0.12, k), y]);
    }
  });
  right.push([trunk, last.bottom - 0.01], [trunk, 0]);
  const left = right
    .slice(1)
    .reverse()
    .map(([x, y]) => [-x, y] as [number, number]);
  return [...right, ...left];
}

/** Add a precomputed fir outline at (x, base), `h` pixels tall, as its own subpath. */
export function firPath(ctx: Ctx, pts: readonly [number, number][], x: number, base: number, h: number): void {
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]!;
    if (i === 0) ctx.moveTo(x + px * h, base + py * h);
    else ctx.lineTo(x + px * h, base + py * h);
  }
  ctx.closePath();
}

/** Top edge of a snow drift from its left foot to its right foot: two soft, uneven humps. */
function moundTop(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.bezierCurveTo(x - w * 0.4, y - h * 0.75, x - w * 0.3, y - h * 1.05, x - w * 0.1, y - h);
  ctx.bezierCurveTo(x + w * 0.05, y - h * 0.95, x + w * 0.12, y - h * 0.78, x + w * 0.22, y - h * 0.8);
  ctx.bezierCurveTo(x + w * 0.34, y - h * 0.82, x + w * 0.42, y - h * 0.5, x + w / 2, y);
}

/**
 * A snow drift planted on the field: an uneven hump `w` wide and `h` tall with its feet at y.
 * Lit snow on top shading to blue at the feet, inked along its top edge only, so it reads
 * as part of the snowfield rather than a sticker on it.
 */
export function mound(ctx: Ctx, x: number, y: number, w: number, h: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  moundTop(ctx, x, y, w, h);
  ctx.quadraticCurveTo(x, y + h * 0.6, x - w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - h, 0, y + h * 0.3);
  g.addColorStop(0, SNOW);
  g.addColorStop(0.55, SNOW);
  g.addColorStop(1, SNOW_SHADE);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  moundTop(ctx, x, y, w, h);
  ink(ctx, lw, INK);
}

/** Each light color in a few brightness steps, dim to lit, worked out once. */
const BULB_STEPS = 6;
const BULB_SHADES = LIGHTS.map((c) =>
  Array.from({ length: BULB_STEPS }, (_, i) => {
    const tw = i / (BULB_STEPS - 1);
    return mix(mix(c, "#ffffff", 0.35 * tw), INK, 0.4 * (1 - tw));
  }),
);
const BULB_GLINT = alpha("#ffffff", 0.85);

/**
 * Twinkling light bulbs in the Christmas colors. `pts` holds x, y pairs already in screen
 * space; bulb i takes color i % 4. Each color brightens and dims in turn, so the lights
 * chase. Flat cartoon bulbs: a faint flat halo when lit, an ink rim and a white glint.
 */
export function drawBulbs(ctx: Ctx, pts: readonly number[], r: number, t: number, speed = 3, lw = 1): void {
  const n = LIGHTS.length;
  for (let c = 0; c < n; c++) {
    const color = LIGHTS[c]!;
    const tw = 0.5 + 0.5 * Math.sin(t * speed - c * (TAU / n));
    if (tw > 0.45) {
      ctx.beginPath();
      for (let i = c * 2; i + 1 < pts.length; i += n * 2) circle(ctx, pts[i]!, pts[i + 1]!, r * 1.9);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 * (tw - 0.45);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (let i = c * 2; i + 1 < pts.length; i += n * 2) circle(ctx, pts[i]!, pts[i + 1]!, r);
    ctx.fillStyle = BULB_SHADES[c]![Math.round(tw * (BULB_STEPS - 1))]!;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) circle(ctx, pts[i]!, pts[i + 1]!, r);
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) circle(ctx, pts[i]! - r * 0.3, pts[i + 1]! - r * 0.3, r * 0.32);
  ctx.fillStyle = BULB_GLINT;
  ctx.fill();
}

/**
 * Add a candy cane: shaft from its foot (x, base) up `h`, hook bending toward `dir`
 * (1 right, -1 left), the whole cane leaning by `tilt` radians (positive leans right).
 */
export function canePath(ctx: Ctx, x: number, base: number, h: number, dir: number, tilt: number): void {
  const r = h * 0.18;
  const sin = Math.sin(tilt);
  const cos = Math.cos(tilt);
  const top = -h + r;
  ctx.moveTo(x, base);
  ctx.lineTo(x - top * sin, base + top * cos);
  const ax = dir * r;
  ctx.arc(
    x + ax * cos - top * sin,
    base + ax * sin + top * cos,
    r,
    (dir > 0 ? Math.PI : 0) + tilt,
    (dir > 0 ? 0 : Math.PI) + tilt,
    dir < 0,
  );
  const tx = dir * r * 2;
  const ty = top + r * 0.75;
  ctx.lineTo(x + tx * cos - ty * sin, base + tx * sin + ty * cos);
}

/** Reused dash pattern for the cane stripes. */
const STRIPES = [0, 0];

/** Stroke the current path as an inked candy cane: ink rim, white tube, red stripes. */
export function caneStroke(ctx: Ctx, w: number, lw: number): void {
  ctx.save();
  ink(ctx, w + lw * 2, INK);
  ctx.strokeStyle = "#fff6f6";
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.lineCap = "butt";
  STRIPES[0] = w * 0.75;
  STRIPES[1] = w * 0.75;
  ctx.setLineDash(STRIPES);
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.restore();
}

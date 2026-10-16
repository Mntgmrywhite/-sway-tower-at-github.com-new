import { alpha, circle, neonStroke, type Ctx } from "../../neon/draw";
import { LIGHTS, SNOW_LIT, SNOW_SHADE, WHITE } from "./colors";

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
export function firPath(ctx: Ctx, pts: [number, number][], x: number, base: number, h: number, w = 1): void {
  for (const [i, [px, py]] of pts.entries()) {
    if (i === 0) ctx.moveTo(x + px * h * w, base + py * h);
    else ctx.lineTo(x + px * h * w, base + py * h);
  }
  ctx.closePath();
}

/** Top edge of a snow drift from its left foot to its right foot: two soft, uneven humps. */
function moundTop(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.bezierCurveTo(x - w * 0.4, y - h * 0.75, x - w * 0.3, y - h * 1.05, x - w * 0.1, y - h);
  ctx.bezierCurveTo(x + w * 0.05, y - h * 0.95, x + w * 0.12, y - h * 0.78, x + w * 0.22, y - h * 0.8);
  ctx.bezierCurveTo(x + w * 0.34, y - h * 0.82, x + w * 0.42, y - h * 0.5, x + w / 2, y);
}

/** Snow drift outline: an uneven hump `h` tall whose feet sit at y, with a slight belly below. */
export function moundPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w / 2, y);
  moundTop(ctx, x, y, w, h);
  ctx.quadraticCurveTo(x, y + h * 0.45, x - w / 2, y);
  ctx.closePath();
}

/** Draw snow drifts (x, y, w, h quads): moonlit fill, bright neon crest. */
export function drawMounds(ctx: Ctx, mounds: readonly number[], lineW: number): void {
  if (mounds.length === 0) return;
  let top = Infinity;
  let bottom = -Infinity;
  ctx.beginPath();
  for (let i = 0; i + 3 < mounds.length; i += 4) {
    const x = mounds[i]!;
    const y = mounds[i + 1]!;
    const w = mounds[i + 2]!;
    const h = mounds[i + 3]!;
    moundPath(ctx, x, y, w, h);
    top = Math.min(top, y - h);
    bottom = Math.max(bottom, y + h * 0.3);
  }
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, SNOW_LIT);
  g.addColorStop(0.5, "#5f88c4");
  g.addColorStop(1, SNOW_SHADE);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i + 3 < mounds.length; i += 4) {
    const x = mounds[i]!;
    const y = mounds[i + 1]!;
    const w = mounds[i + 2]!;
    const h = mounds[i + 3]!;
    ctx.moveTo(x - w / 2, y);
    moundTop(ctx, x, y, w, h);
  }
  ctx.save();
  ctx.globalAlpha = 0.85;
  neonStroke(ctx, WHITE, lineW, 2.6);
  ctx.restore();
}

/**
 * Twinkling light bulbs in the four Christmas colors. `pts` holds x, y pairs already in
 * screen space; bulb i takes color i % 4. The colors chase each other over time.
 */
export function drawBulbs(ctx: Ctx, pts: readonly number[], r: number, t: number, speed = 3): void {
  for (let c = 0; c < LIGHTS.length; c++) {
    const color = LIGHTS[c]!;
    const tw = 0.55 + 0.45 * Math.sin(t * speed - c * (Math.PI / 2));
    ctx.beginPath();
    for (let i = c * 2; i + 1 < pts.length; i += LIGHTS.length * 2) circle(ctx, pts[i]!, pts[i + 1]!, r * 2.6);
    ctx.fillStyle = alpha(color, 0.12 + 0.2 * tw);
    ctx.fill();
    ctx.beginPath();
    for (let i = c * 2; i + 1 < pts.length; i += LIGHTS.length * 2) circle(ctx, pts[i]!, pts[i + 1]!, r);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + 0.5 * tw;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Hot centers on all bulbs at once.
  ctx.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) circle(ctx, pts[i]!, pts[i + 1]!, r * 0.45);
  ctx.fillStyle = alpha("#ffffff", 0.75);
  ctx.fill();
}

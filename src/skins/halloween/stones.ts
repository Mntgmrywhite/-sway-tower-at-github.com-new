import { alpha, circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { INK, MOSS, MOSS_DARK, STONE, STONE_CUT, STONE_LIGHT, STONE_SHADE } from "./common";
import { mound, tuft } from "./dirt";

// Weathered cartoon headstones: flat lavender-grey stone lit from the upper left, an ink
// outline, a chip knocked out, a crack, creeping moss and a worn "RIP" cut into the face.
// Each one is planted: its base runs on below the soil and a dirt mound covers it.

export type Stone = "round" | "slab" | "cross";

/** Light catching the lower lip of the cut lettering. */
const ENGRAVE_LIP = alpha("#ffffff", 0.45);

/** Most a stone leans either way, in radians. */
const MAX_TILT = 0.1;

/** Stone outline in local space: base point at the origin, top at -h, running on below the soil. */
function stonePath(ctx: Ctx, kind: Stone, w: number, h: number, seed: number): void {
  const r = w / 2;
  // Runs on a little under the mound, so a lean never lifts a corner into view; kept shallow so
  // the corner the lean pushes down stays inside the mound's front skirt too (it drops by
  // r * sin(MAX_TILT) ≈ 0.05w, and the skirt there is ≈ 0.1w deep).
  const sunk = w * 0.02;
  ctx.beginPath();
  if (kind === "round") {
    // Rounded top with a chip knocked out of it
    const cy = -h + r;
    const chip = Math.PI * (1.25 + hash(seed + 1) * 0.5);
    const a0 = chip - 0.2;
    const a1 = chip + 0.2;
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, cy);
    ctx.arc(0, cy, r, Math.PI, a0);
    ctx.lineTo(Math.cos(chip) * r * 0.74, cy + Math.sin(chip) * r * 0.74);
    ctx.arc(0, cy, r, a1, Math.PI * 2);
    ctx.lineTo(r, sunk);
  } else if (kind === "slab") {
    // Square shoulders and a pointed cap, one corner broken off
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, -h * 0.74);
    ctx.lineTo(-r * 0.62, -h * 0.84);
    ctx.lineTo(-r * 0.2, -h);
    ctx.lineTo(r * 0.12, -h * 0.97);
    ctx.lineTo(r * 0.3, -h * 0.9);
    ctx.lineTo(r * 0.42, -h * 0.93);
    ctx.lineTo(r * 0.62, -h * 0.84);
    ctx.lineTo(r, -h * 0.74);
    ctx.lineTo(r, sunk);
  } else {
    // Cross, one arm worn short
    const pw = w * 0.19;
    const ay = -h * 0.7;
    const ah = w * 0.17;
    ctx.moveTo(-pw, sunk);
    ctx.lineTo(-pw, ay + ah);
    ctx.lineTo(-r, ay + ah);
    ctx.lineTo(-r, ay - ah);
    ctx.lineTo(-pw, ay - ah);
    ctx.lineTo(-pw, -h);
    ctx.lineTo(pw, -h);
    ctx.lineTo(pw, ay - ah);
    ctx.lineTo(r, ay - ah * 0.8);
    ctx.lineTo(r * 0.9, ay + ah);
    ctx.lineTo(pw, ay + ah);
    ctx.lineTo(pw, sunk);
  }
  ctx.closePath();
}

/** Each stone's banded fill (lit, plain, shaded), made once per stone and width. */
const BANDS = new Map<number, { w: number; fill: CanvasGradient }>();

function bands(ctx: Ctx, seed: number, w: number): CanvasGradient {
  const hit = BANDS.get(seed);
  if (hit && Math.abs(hit.w - w) < 0.01) return hit.fill;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, STONE_LIGHT);
  g.addColorStop(0.24, STONE_LIGHT);
  g.addColorStop(0.24, STONE);
  g.addColorStop(0.8, STONE);
  g.addColorStop(0.8, STONE_SHADE);
  g.addColorStop(1, STONE_SHADE);
  BANDS.set(seed, { w, fill: g });
  return g;
}

/** "RIP" as strokes, its baseline at y, letters `lh` tall, centered on x = 0. */
function ripPath(ctx: Ctx, y: number, lh: number): void {
  const top = y - lh;
  const gap = lh * 0.62;
  // R
  const rx = -gap * 1.15;
  ctx.beginPath();
  ctx.moveTo(rx - lh * 0.22, y);
  ctx.lineTo(rx - lh * 0.22, top);
  ctx.lineTo(rx + lh * 0.05, top);
  ctx.quadraticCurveTo(rx + lh * 0.3, top + lh * 0.26, rx + lh * 0.05, top + lh * 0.5);
  ctx.lineTo(rx - lh * 0.22, top + lh * 0.5);
  ctx.moveTo(rx - lh * 0.02, top + lh * 0.5);
  ctx.lineTo(rx + lh * 0.24, y);
  // I
  ctx.moveTo(0, top);
  ctx.lineTo(0, y);
  // P
  const px = gap * 1.05;
  ctx.moveTo(px - lh * 0.2, y);
  ctx.lineTo(px - lh * 0.2, top);
  ctx.lineTo(px + lh * 0.06, top);
  ctx.quadraticCurveTo(px + lh * 0.32, top + lh * 0.26, px + lh * 0.06, top + lh * 0.52);
  ctx.lineTo(px - lh * 0.2, top + lh * 0.52);
}

/** A weathered headstone: leaning, chipped, cracked, mossy, with a worn "RIP", planted in a mound. */
export function tombstone(ctx: Ctx, x: number, y: number, w: number, h: number, kind: Stone, seed: number, lw: number): void {
  const tilt = (hash(seed) - 0.5) * 2 * MAX_TILT;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Moonlight from the upper left: lit left face, shaded right face, as hard bands in one
  // gradient fill (no clip). The foot is hidden in the mound.
  stonePath(ctx, kind, w, h, seed);
  ctx.fillStyle = bands(ctx, seed, w);
  ctx.fill();
  // Moss creeping up from the soil, and a patch higher up, kept inside the stone's outline.
  const span = kind === "cross" ? 0.1 : 0.37;
  const R = kind === "cross" ? 0.09 : 0.12;
  ctx.fillStyle = MOSS;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) circle(ctx, w * span * ((i / 4) * 2 - 1), -h * 0.08, w * R * (0.6 + hash(seed + 30 + i) * 0.4));
  if (kind === "cross") oval(ctx, -w * 0.28, -h * 0.7, w * 0.12, w * 0.07);
  else oval(ctx, -w * (0.1 + hash(seed + 41) * 0.2), -h * (0.45 + hash(seed + 42) * 0.25), w * 0.12, w * 0.07);
  ctx.fill();
  ctx.fillStyle = MOSS_DARK;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) circle(ctx, w * span * (i - 1) * 0.8, -h * 0.02, w * R * 0.5);
  ctx.fill();
  stonePath(ctx, kind, w, h, seed);
  ink(ctx, lw, INK);

  // Crack running down from the top edge
  ctx.beginPath();
  let cx = (hash(seed + 2) - 0.5) * w * (kind === "cross" ? 0.12 : 0.4);
  let cy = -h + (kind === "round" ? w * 0.5 - Math.sqrt(Math.max(0, (w * w) / 4 - cx * cx)) : h * 0.06);
  ctx.moveTo(cx, cy);
  for (let i = 0; i < 4; i++) {
    cx += (hash(seed + 60 + i) - 0.5) * w * 0.26;
    cy += h * 0.09;
    ctx.lineTo(cx, cy);
  }
  ink(ctx, Math.max(1, lw * 0.6), INK);

  // Worn lettering, cut into the stone: a dark groove with a lit lower lip. Drawn as strokes
  // rather than text: cheaper, and the same on every device.
  if (kind !== "cross") {
    const lh = w * 0.24;
    const lip = Math.max(0.8, w * 0.025);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, w * 0.055);
    ripPath(ctx, -h * 0.5 + lip, lh);
    ctx.strokeStyle = ENGRAVE_LIP;
    ctx.stroke();
    ripPath(ctx, -h * 0.5, lh);
    ctx.strokeStyle = STONE_CUT;
    ctx.stroke();
  }
  ctx.restore();

  mound(ctx, x, y + w * 0.04, w * 0.9, w * 0.27, seed, lw);
  tuft(x - w * 0.66, y + w * 0.08, w * 0.3, seed * 7);
}

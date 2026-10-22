import { alpha, hash, ink, type Ctx } from "../../base/draw";
import { INK, STONE, STONE_CUT, STONE_LIGHT, STONE_SHADE } from "./common";
import { mound, tuft } from "./dirt";

// Burton headstones by moonlight: thin, leaning, crooked stones in cold slate, lit along their
// left edge by the moon and shaded on the right, inked: a round-topped stone with a chip knocked
// out (the crow's), a tall gothic slab whose pointed top curls over into a spiral, a thin cross
// whose arms end in curls; cracks, a carved spiral and a crooked, worn "RIP".
// Each one is planted: its base runs on below the soil and a dirt mound covers it.

export type Stone = "round" | "slab" | "cross";

/** Light catching the lower lip of the cut lettering. */
const ENGRAVE_LIP = alpha("#ffffff", 0.45);

/** Most a stone leans either way, in radians. */
export const MAX_TILT = 0.12;

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
    // Tall and thin, shoulders sloping into a pointed gothic top that curls over at its tip.
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r * 1.04, -h * 0.62);
    ctx.quadraticCurveTo(-r * 0.98, -h * 0.86, -r * 0.2, -h * 0.97);
    ctx.quadraticCurveTo(r * 0.02, -h * 1.02, r * 0.16, -h * 1.06);
    ctx.arc(r * 0.3, -h * 1.04, r * 0.14, Math.PI * 1.1, Math.PI * 2.4);
    ctx.quadraticCurveTo(r * 0.5, -h * 0.94, r * 0.62, -h * 0.84);
    ctx.quadraticCurveTo(r * 0.98, -h * 0.74, r, -h * 0.6);
    ctx.lineTo(r * 0.96, sunk);
  } else {
    // A thin cross, leaning, its arms and head ending in curls.
    const pw = w * 0.15;
    const ay = -h * 0.7;
    const ah = w * 0.12;
    const c = ah * 0.95;
    ctx.moveTo(-pw, sunk);
    ctx.lineTo(-pw, ay + ah);
    ctx.lineTo(-r + c, ay + ah);
    ctx.arc(-r + c, ay, ah, Math.PI / 2, Math.PI * 1.5);
    ctx.lineTo(-pw, ay - ah);
    ctx.lineTo(-pw * 0.9, -h + c);
    ctx.arc(0, -h + c, pw * 0.92, Math.PI, 0);
    ctx.lineTo(pw, ay - ah);
    ctx.lineTo(r * 0.9 - c, ay - ah);
    ctx.arc(r * 0.9 - c, ay, ah, -Math.PI / 2, Math.PI / 2);
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

/** "RIP" as strokes, its baseline at y, letters `lh` tall, centered on x = 0: crooked, each letter its own tilt and height. */
function ripPath(ctx: Ctx, y: number, lh: number): void {
  const gap = lh * 0.62;
  // R, leaning back and a little low.
  const rx = -gap * 1.15;
  const ry = y + lh * 0.06;
  const rt = ry - lh * 0.96;
  ctx.beginPath();
  ctx.moveTo(rx - lh * 0.22, ry);
  ctx.lineTo(rx - lh * 0.17, rt);
  ctx.lineTo(rx + lh * 0.08, rt);
  ctx.quadraticCurveTo(rx + lh * 0.32, rt + lh * 0.26, rx + lh * 0.07, rt + lh * 0.5);
  ctx.lineTo(rx - lh * 0.2, rt + lh * 0.5);
  ctx.moveTo(rx, rt + lh * 0.5);
  ctx.lineTo(rx + lh * 0.26, ry);
  // I, leaning the other way and a little high.
  ctx.moveTo(lh * 0.04, y - lh * 1.08);
  ctx.lineTo(-lh * 0.03, y - lh * 0.04);
  // P, taller.
  const px = gap * 1.05;
  const py = y - lh * 0.02;
  const pt = py - lh * 1.1;
  ctx.moveTo(px - lh * 0.2, py);
  ctx.lineTo(px - lh * 0.24, pt);
  ctx.lineTo(px + lh * 0.04, pt + lh * 0.02);
  ctx.quadraticCurveTo(px + lh * 0.32, pt + lh * 0.3, px + lh * 0.04, pt + lh * 0.56);
  ctx.lineTo(px - lh * 0.22, pt + lh * 0.54);
}

/** A carved spiral centered at (x, y), `r` across, winding in two turns (a Burton mark on the stone). */
function carvedSpiral(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  carvedSpiralAdd(ctx, x, y, r);
}
function carvedSpiralAdd(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 4;
    const rr = r * (1 - i / 26);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

/** A weathered headstone: leaning, chipped, cracked, with a worn "RIP", planted in a mound. */
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
  // rather than text: cheaper, and the same on every device. The slab has a spiral over it.
  if (kind !== "cross") {
    const lh = w * 0.24;
    const lip = Math.max(0.8, w * 0.025);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, w * 0.055);
    const ly = kind === "slab" ? -h * 0.4 : -h * 0.5;
    ripPath(ctx, ly + lip, lh);
    if (kind === "slab") carvedSpiralAdd(ctx, w * 0.02 + lip * 0.3, -h * 0.68 + lip, w * 0.14);
    ctx.strokeStyle = ENGRAVE_LIP;
    ctx.stroke();
    ripPath(ctx, ly, lh);
    if (kind === "slab") carvedSpiralAdd(ctx, w * 0.02, -h * 0.68, w * 0.14);
    ctx.strokeStyle = STONE_CUT;
    ctx.stroke();
  } else {
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, w * 0.05);
    carvedSpiral(ctx, 0, -h * 0.7, w * 0.07);
    ctx.strokeStyle = STONE_CUT;
    ctx.stroke();
  }
  ctx.restore();

  mound(ctx, x, y + w * 0.04, w * 0.9, w * 0.27, seed, lw);
  tuft(x - w * 0.66, y + w * 0.08, w * 0.3, seed * 7);
}

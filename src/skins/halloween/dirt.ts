import { alpha, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { DIRT, DIRT_DARK, DIRT_LIGHT, GRASS, HOLE, INK, PALETTE } from "./common";

// Earth for the graveyard: heaped mounds, the dark holes of open graves, and grass tufts.

/** Soft contact shadow under props, a darker shade of the field. */
export const SHADOW = alpha(mix(PALETTE.fieldNear, INK, 0.45), 0.4);

const LUMPS = 12;

/** Mound outline: a lumpy dome from (x - rx, y) to (x + rx, y), with a shallow rounded foot. */
function moundPath(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number): void {
  ctx.beginPath();
  for (let i = 0; i <= LUMPS; i++) {
    const a = Math.PI + (i / LUMPS) * Math.PI;
    const k = 1 + 0.12 * Math.sin(i * 1.9 + seed * 3.1) * Math.sin(a);
    const px = x + Math.cos(a) * rx;
    const py = y + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.ellipse(x, y, rx, ry * 0.28, 0, 0, Math.PI);
  ctx.closePath();
}

/** A heap of earth: flat brown, lit on top, shaded underneath, inked, with a few pebbles. */
export function mound(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number, lw: number): void {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  oval(ctx, x + rx * 0.06, y + ry * 0.2, rx * 1.12, ry * 0.4);
  ctx.fill();

  moundPath(ctx, x, y, rx, ry, seed);
  ctx.fillStyle = DIRT;
  ctx.fill();
  // Shade along the foot and light on the crown, both shaped to stay inside the dome (no
  // clip: clipping is the slow part of drawing a mound).
  ctx.fillStyle = DIRT_DARK;
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.97, y - ry * 0.06);
  ctx.quadraticCurveTo(x + rx * 0.1, y - ry * 0.5, x + rx * 0.97, y - ry * 0.06);
  ctx.lineTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry * 0.28, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = DIRT_LIGHT;
  ctx.beginPath();
  oval(ctx, x - rx * 0.26, y - ry * 0.68, rx * 0.42, ry * 0.2, -0.12);
  ctx.fill();
  moundPath(ctx, x, y, rx, ry, seed);
  ink(ctx, lw, INK);
}

/** A tuft of cartoon grass blades standing at (x, y), `size` tall, as a closed subpath. */
function tuftPath(ctx: Ctx, x: number, y: number, size: number, seed: number): void {
  ctx.moveTo(x - size * 0.5, y);
  for (let i = 0; i < 3; i++) {
    const bx = x + (i - 1) * size * 0.32;
    const h = size * (0.75 + hash(seed + i) * 0.35);
    const lean = (i - 1) * size * 0.22 + (hash(seed + i + 9) - 0.5) * size * 0.15;
    ctx.lineTo(bx - size * 0.12, y - size * 0.05);
    ctx.lineTo(bx + lean, y - h);
    ctx.lineTo(bx + size * 0.12, y - size * 0.05);
  }
  ctx.lineTo(x + size * 0.5, y);
  ctx.closePath();
}

/**
 * Tufts are queued while the churchyard is drawn and all drawn together at the end by
 * `drawTufts` (one fill, one ink pass). They sit at the feet of mounds, clear of other props.
 */
const QUEUE: number[] = [];
let queued = 0;

export function tuft(x: number, y: number, size: number, seed: number): void {
  const i = queued++ * 4;
  QUEUE[i] = x;
  QUEUE[i + 1] = y;
  QUEUE[i + 2] = size;
  QUEUE[i + 3] = seed;
}

export function drawTufts(ctx: Ctx, lw: number): void {
  if (queued === 0) return;
  ctx.beginPath();
  for (let i = 0; i < queued * 4; i += 4) tuftPath(ctx, QUEUE[i]!, QUEUE[i + 1]!, QUEUE[i + 2]!, QUEUE[i + 3]!);
  queued = 0;
  ctx.fillStyle = GRASS;
  ctx.fill();
  ink(ctx, Math.max(0.8, lw * 0.45), INK);
}

/** Geometry of the hole in the top of a grave mound centered at (x, y) with half-width rx. */
const HOLE_SPOT = { x: 0, y: 0, rx: 0, ry: 0 };
export function holeFor(x: number, y: number, rx: number): typeof HOLE_SPOT {
  HOLE_SPOT.x = x;
  HOLE_SPOT.y = y - rx * 0.27;
  HOLE_SPOT.rx = rx * 0.47;
  HOLE_SPOT.ry = rx * 0.14;
  return HOLE_SPOT;
}

/** Grave mound height as a fraction of its half-width. */
export const GRAVE_RY = 0.5;

/** The dark hole of an open grave, with its far wall showing at the back. */
export function hole(ctx: Ctx, hx: number, hy: number, hrx: number, hry: number, lw: number): void {
  ctx.beginPath();
  oval(ctx, hx, hy, hrx, hry);
  ctx.fillStyle = HOLE;
  ctx.fill();
  // The far wall: a crescent between the rim's top arc and the same arc dropped a little.
  ctx.beginPath();
  ctx.ellipse(hx, hy, hrx, hry, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(hx, hy + hry * 0.45, hrx * 0.97, hry, 0, Math.PI * 2, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = DIRT_DARK;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, hx, hy, hrx, hry);
  ink(ctx, lw, INK);
}

/** Re-ink the hole's front lip over whatever is climbing out, with a lit edge of loose soil. */
export function holeLip(ctx: Ctx, hx: number, hy: number, hrx: number, hry: number, lw: number): void {
  ctx.beginPath();
  ctx.ellipse(hx, hy + lw * 0.9, hrx * 0.96, hry, 0, Math.PI * 0.12, Math.PI * 0.88);
  ctx.strokeStyle = DIRT_LIGHT;
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hx, hy, hrx, hry, 0, 0, Math.PI);
  ink(ctx, lw, INK);
}

import { circle, oval, type Ctx } from "../../base/draw";

// Santa's sleigh and three reindeer as one faded flat silhouette, like everything in the
// distance: bodies, Santa, sack and sleigh filled in one go, legs, antlers, reins and the
// runner stroked in the same color. Only Rudolph's nose has a color of its own.
// Coordinates are in units of `q` pixels around the middle of the team; it faces +x.

/** Reindeer body centers along the team, rear to front (the last one leads). */
const DEER = [-2, 6.5, 15] as const;
const SLEIGH_X = -14;

/** Each reindeer bobs on its own beat. */
function bob(t: number, i: number): number {
  return Math.sin(t * 4 + i * 1.3) * 0.25;
}

/** One reindeer's body, neck and head (fill subpaths). */
function deerBody(ctx: Ctx, x: number, y: number, q: number): void {
  oval(ctx, x * q, y * q, 2.7 * q, 1.25 * q, -0.08);
  // Neck, clockwise so it merges with the body under a nonzero fill.
  ctx.moveTo((x + 1.2) * q, (y - 0.9) * q);
  ctx.lineTo((x + 3.0) * q, (y - 2.9) * q);
  ctx.lineTo((x + 4.0) * q, (y - 2.4) * q);
  ctx.lineTo((x + 2.5) * q, (y + 0.1) * q);
  ctx.closePath();
  oval(ctx, (x + 4.0) * q, (y - 2.7) * q, 1.15 * q, 0.62 * q, 0.38);
}

/** Legs, antlers and tail as open strokes. `g` is the gallop phase. */
function deerLines(ctx: Ctx, x: number, y: number, q: number, g: number): void {
  const swing = Math.sin(g);
  // Front legs reach forward, back legs kick back; each pair slightly apart.
  for (let k = 0; k < 2; k++) {
    const off = k * 0.35;
    const fa = 0.75 - 0.45 * swing + off;
    const fx = (x + 1.7) * q;
    const fy = (y + 0.6) * q;
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(fa) * 1.6 * q, fy + Math.sin(fa) * 1.6 * q);
    ctx.lineTo(fx + Math.cos(fa) * 1.6 * q + 1.1 * q, fy + Math.sin(fa) * 1.6 * q + 0.9 * q * (0.5 + 0.5 * swing));
    const ba = Math.PI - 0.55 + 0.45 * swing - off;
    const bx = (x - 1.9) * q;
    const by = (y + 0.5) * q;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ba) * 2.6 * q, by + Math.sin(ba) * 2.6 * q);
  }
  // Antlers
  const ax = (x + 3.6) * q;
  const ay = (y - 3.1) * q;
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 0.9 * q, ay - 2.0 * q);
  ctx.lineTo(ax - 2.0 * q, ay - 2.6 * q);
  ctx.moveTo(ax - 0.55 * q, ay - 1.2 * q);
  ctx.lineTo(ax + 0.5 * q, ay - 2.1 * q);
  ctx.moveTo(ax - 1.2 * q, ay - 2.15 * q);
  ctx.lineTo(ax - 1.1 * q, ay - 3.1 * q);
  // Tail
  ctx.moveTo((x - 2.6) * q, (y - 0.3) * q);
  ctx.lineTo((x - 3.4) * q, (y - 1.0) * q);
}

/** The sleigh: high backrest, low seat, and a scrolled front (fill subpath). */
function sleighPath(ctx: Ctx, q: number): void {
  const x = SLEIGH_X;
  ctx.moveTo((x - 5.9) * q, -2.8 * q);
  ctx.quadraticCurveTo((x - 5.3) * q, -4.0 * q, (x - 4.4) * q, -3.2 * q);
  ctx.lineTo((x - 3.9) * q, -0.9 * q);
  ctx.lineTo((x + 2.0) * q, -0.9 * q);
  ctx.quadraticCurveTo((x + 3.3) * q, -0.9 * q, (x + 3.9) * q, -2.3 * q);
  ctx.quadraticCurveTo((x + 4.5) * q, -3.6 * q, (x + 5.6) * q, -3.0 * q);
  ctx.quadraticCurveTo((x + 6.3) * q, -2.4 * q, (x + 5.5) * q, -1.8 * q);
  ctx.quadraticCurveTo((x + 5.3) * q, 1.9 * q, (x + 2.2) * q, 2.0 * q);
  ctx.lineTo((x - 4.0) * q, 2.0 * q);
  ctx.quadraticCurveTo((x - 6.5) * q, 1.6 * q, (x - 5.9) * q, -2.8 * q);
  ctx.closePath();
}

/** Santa (body, head, floppy hat with its pompom) and the sack of toys (fill subpaths). */
function santaPath(ctx: Ctx, q: number): void {
  const x = SLEIGH_X;
  oval(ctx, (x - 1.3) * q, -2.3 * q, 1.9 * q, 1.9 * q);
  circle(ctx, (x - 0.8) * q, -4.7 * q, 1.0 * q);
  ctx.moveTo((x - 1.8) * q, -5.1 * q);
  ctx.quadraticCurveTo((x - 2.3) * q, -6.2 * q, (x - 3.5) * q, -6.4 * q);
  ctx.quadraticCurveTo((x - 0.6) * q, -7.6 * q, (x + 0.2) * q, -5.2 * q);
  ctx.closePath();
  circle(ctx, (x - 3.6) * q, -6.3 * q, 0.6 * q);
  oval(ctx, (x - 4.4) * q, -3.9 * q, 1.7 * q, 2.0 * q, -0.4);
}

/**
 * Draw the team with its middle at (x, y), tilted by `angle`, `q` pixels per unit, as a
 * flat silhouette in `color`. `t` drives the gallop and the pulse of Rudolph's `nose`.
 */
export function drawSleigh(
  ctx: Ctx,
  x: number,
  y: number,
  q: number,
  angle: number,
  t: number,
  color: string,
  nose: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Lines: reins, legs, antlers, tails, the runner and its struts.
  const sx = SLEIGH_X;
  ctx.beginPath();
  ctx.moveTo((sx + 0.6) * q, -2.6 * q);
  for (let i = 0; i < DEER.length; i++) ctx.lineTo((DEER[i]! + 1.6) * q, (bob(t, i) - 0.6) * q);
  for (let i = 0; i < DEER.length; i++) deerLines(ctx, DEER[i]!, bob(t, i), q, t * 9 + i * 1.7);
  ctx.moveTo((sx - 6.2) * q, 3.3 * q);
  ctx.lineTo((sx + 4.4) * q, 3.3 * q);
  ctx.quadraticCurveTo((sx + 7.0) * q, 3.3 * q, (sx + 6.6) * q, 1.4 * q);
  ctx.quadraticCurveTo((sx + 6.4) * q, 0.5 * q, (sx + 5.7) * q, 0.9 * q);
  ctx.moveTo((sx - 3.0) * q, 2.0 * q);
  ctx.lineTo((sx - 3.0) * q, 3.3 * q);
  ctx.moveTo((sx + 2.0) * q, 2.0 * q);
  ctx.lineTo((sx + 2.0) * q, 3.3 * q);
  // Santa's arm out to the reins
  ctx.moveTo((sx - 0.6) * q, -2.8 * q);
  ctx.lineTo((sx + 1.0) * q, -2.6 * q);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, q * 0.42);
  ctx.stroke();

  // Bodies: reindeer, Santa and his sack, the sleigh.
  ctx.beginPath();
  for (let i = 0; i < DEER.length; i++) deerBody(ctx, DEER[i]!, bob(t, i), q);
  santaPath(ctx, q);
  sleighPath(ctx, q);
  ctx.fillStyle = color;
  ctx.fill();

  // Rudolph's nose: the one spot of color, pulsing gently.
  const lead = DEER[DEER.length - 1]!;
  const nx = (lead + 5.15) * q;
  const ny = (bob(t, DEER.length - 1) - 2.3) * q;
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.beginPath();
  circle(ctx, nx, ny, q * (1.1 + 0.4 * pulse));
  ctx.fillStyle = nose;
  ctx.globalAlpha = 0.25 + 0.2 * pulse;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  circle(ctx, nx, ny, q * 0.6);
  ctx.fillStyle = nose;
  ctx.fill();

  ctx.restore();
}

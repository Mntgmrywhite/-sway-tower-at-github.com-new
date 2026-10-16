import { circle, ink, outlined, type Ctx } from "../../base/draw";
import { INK } from "./common";

// Crows. In the sky they are faded silhouettes: the classic "M" of spread wings with fingered
// wingtips, a fanned tail below and a small head with its beak turned the way it flies, all as
// one closed subpath so a whole flock shares one fill. Up close one perches on a headstone as
// an ink-outlined cartoon: glossy blue-black, a pale eye, and every few seconds a "caw".

const CROW_BODY = "#2c2546";
const CROW_SHEEN = "#4c4377";
const CROW_BEAK = "#59506f";
const CROW_EYE = "#fff3d2";

/** Scratch for one side of the "M", mirrored for the other side. */
const WING = [
  // x, y at lift 0, y change per unit of lift (wingtips up when lift > 0)
  [0.24, -0.11, -0.16],
  [0.55, -0.09, -0.36],
  [0.97, -0.04, -0.62],
  [0.83, 0.0, -0.5],
  [0.89, 0.06, -0.52],
  [0.74, 0.05, -0.42],
  [0.76, 0.11, -0.42],
  [0.48, 0.09, -0.25],
  [0.2, 0.09, -0.06],
  [0.09, 0.11, 0],
] as const;

/**
 * One flying crow as a closed subpath, centered at (x, y), `s` = half its wingspan, flying
 * toward `dir` (1 right, -1 left). `lift` -1..1 sweeps the wings down and up.
 */
export function crowFly(ctx: Ctx, x: number, y: number, s: number, dir: number, lift: number): void {
  // Head and beak, on the leading side
  ctx.moveTo(x - dir * s * 0.05, y - s * 0.07);
  ctx.lineTo(x - dir * s * 0.06, y - s * 0.13);
  ctx.lineTo(x, y - s * 0.17);
  ctx.lineTo(x + dir * s * 0.07, y - s * 0.15);
  ctx.lineTo(x + dir * s * 0.18, y - s * 0.11);
  ctx.lineTo(x + dir * s * 0.07, y - s * 0.085);
  // Leading-side wing out and back
  for (const [wx, wy, dy] of WING) ctx.lineTo(x + dir * s * wx, y + s * (wy + dy * lift));
  // Fanned tail
  ctx.lineTo(x + dir * s * 0.12, y + s * 0.3);
  ctx.lineTo(x, y + s * 0.34);
  ctx.lineTo(x - dir * s * 0.12, y + s * 0.3);
  // Trailing-side wing, mirrored, from its root out to the tip and back to the head
  for (let i = WING.length - 1; i >= 0; i--) {
    const [wx, wy, dy] = WING[i]!;
    ctx.lineTo(x - dir * s * wx, y + s * (wy + dy * lift));
  }
  ctx.closePath();
}

/**
 * A crow perched at (x, y) (its feet), facing `dir`, `s` tall. `caw` 0..1 opens the beak and
 * leans it forward; `look` -1..1 tips its head.
 */
export function crowPerched(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  dir: number,
  caw: number,
  look: number,
  lw: number,
): void {
  const lean = caw * 0.12;
  const hx = x + dir * s * (0.2 + lean * 0.9);
  const hy = y - s * (0.78 - lean * 0.6) + look * s * 0.02;

  // Legs and toes gripping the perch
  ctx.beginPath();
  ctx.moveTo(x - dir * s * 0.06, y - s * 0.28);
  ctx.lineTo(x - dir * s * 0.04, y);
  ctx.moveTo(x + dir * s * 0.06, y - s * 0.28);
  ctx.lineTo(x + dir * s * 0.08, y);
  ctx.moveTo(x - dir * s * 0.12, y);
  ctx.lineTo(x + dir * s * 0.2, y);
  ink(ctx, Math.max(1, lw * 0.9), INK);

  // Tail, then the body as one teardrop leaning forward
  ctx.beginPath();
  ctx.moveTo(x - dir * s * 0.18, y - s * 0.42);
  ctx.lineTo(x - dir * s * 0.55, y - s * 0.12);
  ctx.lineTo(x - dir * s * 0.46, y - s * 0.04);
  ctx.lineTo(x - dir * s * 0.08, y - s * 0.3);
  ctx.closePath();
  outlined(ctx, CROW_BODY, lw, INK);
  ctx.beginPath();
  ctx.ellipse(x + dir * s * 0.02, y - s * 0.45, s * 0.3, s * 0.21, dir * (-0.5 - lean), 0, Math.PI * 2);
  outlined(ctx, CROW_BODY, lw, INK);
  // Folded wing with a glossy sheen along its top
  ctx.beginPath();
  ctx.moveTo(x + dir * s * 0.16, y - s * 0.55);
  ctx.quadraticCurveTo(x - dir * s * 0.12, y - s * 0.62, x - dir * s * 0.4, y - s * 0.2);
  ctx.quadraticCurveTo(x - dir * s * 0.05, y - s * 0.32, x + dir * s * 0.16, y - s * 0.55);
  ctx.closePath();
  outlined(ctx, CROW_SHEEN, Math.max(1, lw * 0.8), INK);

  // Head, beak (upper and lower, gaping when it caws), eye
  const bx = hx + dir * s * 0.14;
  const gape = caw * s * 0.09;
  ctx.beginPath();
  ctx.moveTo(bx, hy - s * 0.06);
  ctx.lineTo(bx + dir * s * 0.26, hy - s * 0.01 - gape * 0.3);
  ctx.lineTo(bx, hy + s * 0.02);
  ctx.closePath();
  ctx.moveTo(bx, hy + s * 0.01);
  ctx.lineTo(bx + dir * s * 0.2, hy + s * 0.03 + gape);
  ctx.lineTo(bx - dir * s * 0.01, hy + s * 0.07);
  ctx.closePath();
  outlined(ctx, CROW_BEAK, Math.max(1, lw * 0.8), INK);
  ctx.beginPath();
  circle(ctx, hx, hy, s * 0.17);
  outlined(ctx, CROW_BODY, lw, INK);
  ctx.beginPath();
  circle(ctx, hx + dir * s * 0.06, hy - s * 0.04, s * 0.055);
  ctx.fillStyle = CROW_EYE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx + dir * s * 0.075, hy - s * 0.035, s * 0.028);
  ctx.fillStyle = INK;
  ctx.fill();
}

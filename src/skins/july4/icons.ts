import { circle } from "../../base/draw";
import type { Icon } from "../skin";
import { pill, starPath } from "./shapes";

// Symbols for the Independence Day bars, our own simple glyphs: a star, a flag, a firework, an
// eagle, a bell, a snare drum, a hot dog, a slice of pie, a slice of watermelon, a bottle
// rocket, Uncle Sam's top hat and a sparkler. Each draws one bold shape centered at (cx, cy),
// about `s` pixels tall, with the caller's ink style. In play `s` is only ~12 px, so they are
// chunky filled silhouettes with an occasional stroked detail; holes are cut with even-odd
// fills, and every round part is its own subpath. Nothing is allocated: these run hundreds of
// times a frame.

const TAU = Math.PI * 2;

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  starPath(ctx, cx, cy + s * 0.04, s * 0.56);
  ctx.fill();
};

export const flag: Icon = (ctx, cx, cy, s) => {
  // A flag flying to the right from its pole, two stripes cut out of the fly.
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.11);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.42, cy + s * 0.5);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy - s * 0.46);
  ctx.quadraticCurveTo(cx - s * 0.05, cy - s * 0.6, cx + s * 0.44, cy - s * 0.4);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.16, cx + s * 0.44, cy + s * 0.12);
  ctx.quadraticCurveTo(cx - s * 0.05, cy - s * 0.02, cx - s * 0.36, cy + s * 0.14);
  ctx.closePath();
  ctx.rect(cx + s * 0.34, cy - s * 0.3, -s * 0.5, s * 0.07);
  ctx.rect(cx + s * 0.34, cy - s * 0.1, -s * 0.56, s * 0.07);
  ctx.fill("evenodd");
};

/** Unit directions of eight rays. */
const RAYS = Array.from({ length: 8 }, (_, i) => [Math.cos((i * TAU) / 8 + TAU / 16), Math.sin((i * TAU) / 8 + TAU / 16)] as const);

export const firework: Icon = (ctx, cx, cy, s) => {
  // A burst: eight rays with a head on each, and a dot at the heart.
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  for (const [dx, dy] of RAYS) {
    ctx.moveTo(cx + dx * s * 0.14, cy + dy * s * 0.14);
    ctx.lineTo(cx + dx * s * 0.42, cy + dy * s * 0.42);
  }
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (const [dx, dy] of RAYS) circle(ctx, cx + dx * s * 0.46, cy + dy * s * 0.46, s * 0.09);
  circle(ctx, cx, cy, s * 0.1);
  ctx.fill();
};

export const eagle: Icon = (ctx, cx, cy, s) => {
  // An eagle seen from the front, wings spread and tips raised, head turned to one side.
  const y = cy + s * 0.08;
  ctx.beginPath();
  ctx.moveTo(cx, y - s * 0.02);
  ctx.quadraticCurveTo(cx - s * 0.3, y - s * 0.22, cx - s * 0.56, y - s * 0.46);
  ctx.quadraticCurveTo(cx - s * 0.5, y - s * 0.1, cx - s * 0.3, y + s * 0.1);
  ctx.lineTo(cx - s * 0.1, y + s * 0.2);
  ctx.lineTo(cx - s * 0.14, y + s * 0.42);
  ctx.lineTo(cx + s * 0.14, y + s * 0.42);
  ctx.lineTo(cx + s * 0.1, y + s * 0.2);
  ctx.lineTo(cx + s * 0.3, y + s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.5, y - s * 0.1, cx + s * 0.56, y - s * 0.46);
  ctx.quadraticCurveTo(cx + s * 0.3, y - s * 0.22, cx, y - s * 0.02);
  ctx.closePath();
  circle(ctx, cx, y - s * 0.24, s * 0.15);
  ctx.moveTo(cx + s * 0.1, y - s * 0.3);
  ctx.lineTo(cx + s * 0.3, y - s * 0.24);
  ctx.lineTo(cx + s * 0.1, y - s * 0.16);
  ctx.closePath();
  ctx.fill();
};

export const bell: Icon = (ctx, cx, cy, s) => {
  // A bell on its yoke: a dome flaring to a lip, the clapper under it.
  const y = cy - s * 0.04;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, y - s * 0.42);
  ctx.quadraticCurveTo(cx, y - s * 0.56, cx + s * 0.2, y - s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.24, y - s * 0.1, cx + s * 0.4, y + s * 0.2);
  ctx.lineTo(cx + s * 0.44, y + s * 0.32);
  ctx.lineTo(cx - s * 0.44, y + s * 0.32);
  ctx.lineTo(cx - s * 0.4, y + s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.24, y - s * 0.1, cx - s * 0.2, y - s * 0.42);
  ctx.closePath();
  ctx.rect(cx - s * 0.3, y - s * 0.58, s * 0.6, s * 0.1);
  circle(ctx, cx, y + s * 0.42, s * 0.11);
  ctx.fill();
};

export const drum: Icon = (ctx, cx, cy, s) => {
  // A snare drum: the shell with its rims, two sticks crossed above it.
  const y = cy + s * 0.12;
  ctx.beginPath();
  ctx.rect(cx - s * 0.42, y - s * 0.16, s * 0.84, s * 0.44);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, y + s * 0.02);
  ctx.lineTo(cx - s * 0.3, y + s * 0.28);
  ctx.moveTo(cx + s * 0.3, y + s * 0.02);
  ctx.lineTo(cx + s * 0.3, y + s * 0.28);
  ctx.moveTo(cx - s * 0.1, y - s * 0.22);
  ctx.lineTo(cx - s * 0.42, y - s * 0.52);
  ctx.moveTo(cx + s * 0.1, y - s * 0.22);
  ctx.lineTo(cx + s * 0.42, y - s * 0.52);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  circle(ctx, cx - s * 0.42, y - s * 0.52, s * 0.08);
  circle(ctx, cx + s * 0.42, y - s * 0.52, s * 0.08);
  ctx.fill();
};

export const hotDog: Icon = (ctx, cx, cy, s) => {
  // A hot dog in its bun, seen from above: the bun's two halves either side of the sausage.
  ctx.beginPath();
  pill(ctx, cx - s * 0.5, cy - s * 0.3, s, s * 0.22);
  pill(ctx, cx - s * 0.5, cy + s * 0.08, s, s * 0.22);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  pill(ctx, cx - s * 0.56, cy - s * 0.1, s * 1.12, s * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy);
  for (let i = 1; i <= 6; i++) ctx.lineTo(cx - s * 0.4 + (i * s * 0.8) / 6, cy + (i % 2 ? -s * 0.06 : s * 0.06));
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const pieSlice: Icon = (ctx, cx, cy, s) => {
  // A wedge of pie from above, the crust thick along its rim, a curl of steam over it.
  const y = cy + s * 0.14;
  ctx.beginPath();
  ctx.moveTo(cx, y - s * 0.3);
  ctx.lineTo(cx + s * 0.42, y + s * 0.26);
  ctx.quadraticCurveTo(cx, y + s * 0.46, cx - s * 0.42, y + s * 0.26);
  ctx.closePath();
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.13);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.48, y + s * 0.22);
  ctx.quadraticCurveTo(cx, y + s * 0.52, cx - s * 0.48, y + s * 0.22);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx, y - s * 0.4);
  ctx.quadraticCurveTo(cx - s * 0.12, y - s * 0.5, cx, y - s * 0.6);
  ctx.quadraticCurveTo(cx + s * 0.12, y - s * 0.7, cx, y - s * 0.8);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const watermelon: Icon = (ctx, cx, cy, s) => {
  // A slice: a half disc of flesh under a thick rind, three seeds cut out of it.
  const y = cy - s * 0.1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, y);
  ctx.arc(cx, y, s * 0.5, Math.PI, 0, true);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.14 + s * 0.05, y + s * 0.14);
  ctx.ellipse(cx - s * 0.14, y + s * 0.14, s * 0.05, s * 0.08, 0, 0, TAU);
  ctx.moveTo(cx + s * 0.14 + s * 0.05, y + s * 0.14);
  ctx.ellipse(cx + s * 0.14, y + s * 0.14, s * 0.05, s * 0.08, 0, 0, TAU);
  ctx.moveTo(cx + s * 0.05, y + s * 0.32);
  ctx.ellipse(cx, y + s * 0.32, s * 0.05, s * 0.08, 0, 0, TAU);
  ctx.fill("evenodd");
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.12);
  ctx.beginPath();
  ctx.arc(cx, y, s * 0.56, Math.PI, 0, true);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const rocket: Icon = (ctx, cx, cy, s) => {
  // A bottle rocket on its stick, tilted, a spark at its tail.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.55);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.56);
  ctx.lineTo(s * 0.17, -s * 0.28);
  ctx.lineTo(s * 0.17, s * 0.12);
  ctx.lineTo(-s * 0.17, s * 0.12);
  ctx.lineTo(-s * 0.17, -s * 0.28);
  ctx.closePath();
  ctx.rect(-s * 0.05, s * 0.12, s * 0.1, s * 0.44);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(-s * 0.17, s * 0.22);
  ctx.lineTo(-s * 0.3, s * 0.36);
  ctx.moveTo(s * 0.17, s * 0.22);
  ctx.lineTo(s * 0.3, s * 0.36);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.restore();
};

export const topHat: Icon = (ctx, cx, cy, s) => {
  // Uncle Sam's hat: a tall crown over a wide brim, the band cut out across it.
  const y = cy + s * 0.04;
  ctx.beginPath();
  ctx.rect(cx - s * 0.3, y - s * 0.52, s * 0.6, s * 0.72);
  ctx.rect(cx - s * 0.52, y + s * 0.2, s * 1.04, s * 0.14);
  ctx.rect(cx - s * 0.3, y + s * 0.0, s * 0.6, s * 0.08);
  ctx.fill("evenodd");
  ctx.beginPath();
  starPath(ctx, cx, y - s * 0.24, s * 0.1);
  ctx.fill();
};

export const sparkler: Icon = (ctx, cx, cy, s) => {
  // A sparkler: the wire, a burst of sparks at its tip.
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy + s * 0.56);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.07);
  const tx = cx + s * 0.12;
  const ty = cy - s * 0.18;
  ctx.beginPath();
  for (const [dx, dy] of RAYS) {
    ctx.moveTo(tx + dx * s * 0.1, ty + dy * s * 0.1);
    ctx.lineTo(tx + dx * s * 0.36, ty + dy * s * 0.36);
  }
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i < RAYS.length; i += 2) circle(ctx, tx + RAYS[i]![0] * s * 0.42, ty + RAYS[i]![1] * s * 0.42, s * 0.06);
  circle(ctx, tx, ty, s * 0.1);
  ctx.fill();
};

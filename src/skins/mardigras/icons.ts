import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";
import { beadLoop, fleurPath, maskEyes, maskPath, starPath } from "./shapes";

// Symbols for the Mardi Gras bars, our own simple glyphs: a half mask, a fleur-de-lis, a
// jester's hat, a string of beads, a crown, a king cake, a trumpet, a feather, a doubloon, a
// bass drum, a star and a float's wheel. Each draws one bold shape centered at (cx, cy), about
// `s` pixels tall, with the caller's ink style. In play `s` is only ~12 px, so they are chunky
// filled silhouettes with an occasional stroked detail; holes are cut with even-odd fills, and
// every round part is its own subpath. Nothing is allocated.

const TAU = Math.PI * 2;

export const mask: Icon = (ctx, cx, cy, s) => {
  // A half mask with its eye holes, and a plume of two feathers rising from its corner (so it
  // reads as a Carnival mask, not a bat).
  ctx.beginPath();
  maskPath(ctx, cx - s * 0.06, cy + s * 0.16, s * 1.0);
  maskEyes(ctx, cx - s * 0.06, cy + s * 0.16, s * 1.0);
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.3, cy - s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.62, cy - s * 0.3, cx + s * 0.5, cy - s * 0.62);
  ctx.quadraticCurveTo(cx + s * 0.34, cy - s * 0.3, cx + s * 0.22, cy - s * 0.04);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.2, cy - s * 0.04);
  ctx.quadraticCurveTo(cx + s * 0.26, cy - s * 0.4, cx + s * 0.06, cy - s * 0.6);
  ctx.quadraticCurveTo(cx + s * 0.1, cy - s * 0.32, cx + s * 0.12, cy - s * 0.02);
  ctx.closePath();
  ctx.fill();
};

export const fleurDeLis: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  fleurPath(ctx, cx, cy, s * 1.05);
  ctx.fill();
};

export const jesterHat: Icon = (ctx, cx, cy, s) => {
  // A jester's cap: a band, and three floppy points with a bell on each: the side ones droop
  // outward, the middle one curls over (so it never reads as the crown's stiff points).
  const y = cy + s * 0.22;
  ctx.beginPath();
  ctx.rect(cx - s * 0.44, y, s * 0.88, s * 0.2);
  ctx.moveTo(cx - s * 0.44, y + s * 0.02);
  ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.34, cx - s * 0.64, cy + s * 0.06);
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.1, cx - s * 0.12, y + s * 0.02);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.18, y + s * 0.02);
  ctx.quadraticCurveTo(cx - s * 0.14, cy - s * 0.56, cx + s * 0.24, cy - s * 0.46);
  ctx.quadraticCurveTo(cx + s * 0.04, cy - s * 0.3, cx + s * 0.18, y + s * 0.02);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.44, y + s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.34, cx + s * 0.64, cy + s * 0.06);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.1, cx + s * 0.12, y + s * 0.02);
  ctx.closePath();
  circle(ctx, cx - s * 0.63, cy + s * 0.14, s * 0.1);
  circle(ctx, cx + s * 0.3, cy - s * 0.42, s * 0.1);
  circle(ctx, cx + s * 0.63, cy + s * 0.14, s * 0.1);
  ctx.fill();
};

export const beads: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  beadLoop(ctx, cx, cy - s * 0.42, s * 0.42, s * 0.84, s * 0.085, 9);
  ctx.fill();
};

export const crown: Icon = (ctx, cx, cy, s) => {
  const y = cy + s * 0.4;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, y);
  ctx.lineTo(cx - s * 0.5, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.22, cy - s * 0.02);
  ctx.lineTo(cx, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.5, y);
  ctx.closePath();
  circle(ctx, cx - s * 0.5, cy - s * 0.36, s * 0.08);
  circle(ctx, cx, cy - s * 0.5, s * 0.08);
  circle(ctx, cx + s * 0.5, cy - s * 0.36, s * 0.08);
  ctx.fill();
};

export const kingCake: Icon = (ctx, cx, cy, s) => {
  // A ring cake seen from above, with a hole, and three sugar stripes across it.
  ctx.beginPath();
  oval(ctx, cx, cy, s * 0.55, s * 0.36);
  ctx.moveTo(cx + s * 0.22, cy);
  ctx.ellipse(cx, cy, s * 0.22, s * 0.13, 0, 0, TAU, true);
  ctx.fill("evenodd");
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.14);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.3);
  ctx.moveTo(cx + s * 0.5, cy - s * 0.14);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
  ctx.moveTo(cx - s * 0.1, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.36);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const trumpet: Icon = (ctx, cx, cy, s) => {
  // A trumpet pointing right: the mouthpiece and lead pipe, the bell flaring out evenly, the
  // loop of tubing under the pipe, and three valves with their caps on top.
  const y = cy - s * 0.02;
  ctx.beginPath();
  ctx.rect(cx - s * 0.66, y - s * 0.07, s * 0.08, s * 0.14);
  ctx.rect(cx - s * 0.6, y - s * 0.045, s * 0.76, s * 0.09);
  ctx.moveTo(cx + s * 0.14, y - s * 0.05);
  ctx.quadraticCurveTo(cx + s * 0.42, y - s * 0.07, cx + s * 0.6, y - s * 0.3);
  ctx.lineTo(cx + s * 0.6, y + s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.42, y + s * 0.07, cx + s * 0.14, y + s * 0.05);
  ctx.closePath();
  for (let i = 0; i < 3; i++) {
    const x = cx - s * 0.3 + i * s * 0.16;
    ctx.rect(x - s * 0.04, y - s * 0.34, s * 0.08, s * 0.3);
    ctx.rect(x - s * 0.065, y - s * 0.4, s * 0.13, s * 0.06);
  }
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, y);
  ctx.lineTo(cx - s * 0.36, y + s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.36, y + s * 0.3, cx - s * 0.26, y + s * 0.3);
  ctx.lineTo(cx + s * 0.02, y + s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.1, y + s * 0.3, cx + s * 0.1, y + s * 0.2);
  ctx.lineTo(cx + s * 0.1, y);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const feather: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.1, cx - s * 0.1, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.1, cx + s * 0.1, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.16, cy + s * 0.58);
  ctx.quadraticCurveTo(cx, cy, cx - s * 0.1, cy - s * 0.4);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const doubloon: Icon = (ctx, cx, cy, s) => {
  // A coin with a fleur-de-lis stamped in it.
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.5);
  ctx.moveTo(cx + s * 0.4, cy);
  ctx.arc(cx, cy, s * 0.4, 0, TAU, true);
  ctx.fill("evenodd");
  ctx.beginPath();
  fleurPath(ctx, cx, cy, s * 0.6);
  ctx.fill();
};

export const drum: Icon = (ctx, cx, cy, s) => {
  // A snare drum: a shell with its head on top, two sticks crossed over it.
  ctx.beginPath();
  ctx.rect(cx - s * 0.48, cy - s * 0.02, s * 0.96, s * 0.42);
  oval(ctx, cx, cy - s * 0.02, s * 0.48, s * 0.14);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.moveTo(cx + s * 0.4, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.1);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  starPath(ctx, cx, cy + s * 0.04, s * 0.56);
  ctx.fill();
};

export const floatWheel: Icon = (ctx, cx, cy, s) => {
  // A spoked wheel: a rim with a hub and six spokes.
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.5);
  ctx.moveTo(cx + s * 0.38, cy);
  ctx.arc(cx, cy, s * 0.38, 0, TAU, true);
  ctx.fill("evenodd");
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.12);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.moveTo(cx + Math.cos(a) * s * 0.12, cy + Math.sin(a) * s * 0.12);
    ctx.lineTo(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4);
  }
  ctx.stroke();
  ctx.lineWidth = lw;
};

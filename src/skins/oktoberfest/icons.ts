import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";
import { heartPath, pill, pretzelPath, starPath } from "./shapes";

// Symbols for the Oktoberfest bars, our own simple glyphs: a pretzel, a cuckoo clock, a
// gingerbread heart, a sausage, a feathered hat, an accordion, a rhombus pennant, a Ferris wheel,
// a horse, a paper lantern, a roast chicken and an edelweiss. Each draws one bold shape centered at (cx, cy),
// about `s` pixels tall, with the caller's ink style. In play `s` is only ~12 px, so they are
// chunky filled silhouettes with an occasional stroked detail; holes are cut with even-odd
// fills, and every round part is its own subpath. Nothing is allocated: these run hundreds of
// times a frame.

const TAU = Math.PI * 2;

export const pretzel: Icon = (ctx, cx, cy, s) => {
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.6, s * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  pretzelPath(ctx, cx, cy + s * 0.05, s * 1.05);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const cuckooClock: Icon = (ctx, cx, cy, s) => {
  // A little carved house under a steep overhanging roof, a round clock face cut out of it, and
  // two weights hanging below on their chains.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.08);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.32, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.32, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.32, cy - s * 0.08);
  ctx.closePath();
  circle(ctx, cx, cy + s * 0.04, s * 0.15);
  ctx.fill("evenodd");
  // The hands, and the weights on their chains.
  ctx.beginPath();
  ctx.rect(cx - s * 0.025, cy - s * 0.06, s * 0.05, s * 0.12);
  oval(ctx, cx - s * 0.16, cy + s * 0.42, s * 0.07, s * 0.1);
  oval(ctx, cx + s * 0.16, cy + s * 0.42, s * 0.07, s * 0.1);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.16, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.16, cy + s * 0.34);
  ctx.moveTo(cx + s * 0.16, cy + s * 0.22);
  ctx.lineTo(cx + s * 0.16, cy + s * 0.34);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const gingerbreadHeart: Icon = (ctx, cx, cy, s) => {
  // A heart with an iced heart inside it, cut out.
  ctx.beginPath();
  heartPath(ctx, cx, cy + s * 0.02, s * 1.0);
  heartPath(ctx, cx, cy + s * 0.03, s * 0.56);
  ctx.fill("evenodd");
};

export const sausage: Icon = (ctx, cx, cy, s) => {
  // A bratwurst curving up at both ends, on a stick.
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(2, s * 0.3);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy - s * 0.06);
  ctx.quadraticCurveTo(cx, cy + s * 0.34, cx + s * 0.42, cy - s * 0.06);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.05, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.1);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const featheredHat: Icon = (ctx, cx, cy, s) => {
  // An alpine hat: a wide brim and a rounded crown, a feather sweeping up on the right.
  ctx.beginPath();
  pill(ctx, cx - s * 0.5, cy + s * 0.12, s * 1.0, s * 0.18);
  ctx.moveTo(cx - s * 0.32, cy + s * 0.14);
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.3, cx, cy - s * 0.32);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.3, cx + s * 0.32, cy + s * 0.14);
  ctx.closePath();
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.18, cy - s * 0.05);
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.3, cx + s * 0.5, cy - s * 0.48);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const accordion: Icon = (ctx, cx, cy, s) => {
  // Two end boxes with a pleated bellows between them.
  ctx.beginPath();
  ctx.rect(cx - s * 0.48, cy - s * 0.3, s * 0.2, s * 0.62);
  ctx.rect(cx + s * 0.28, cy - s * 0.3, s * 0.2, s * 0.62);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = cx - s * 0.2 + i * s * 0.13;
    ctx.moveTo(x, cy - s * 0.24);
    ctx.lineTo(x, cy + s * 0.26);
  }
  ctx.moveTo(cx - s * 0.28, cy - s * 0.24);
  ctx.lineTo(cx + s * 0.28, cy - s * 0.24);
  ctx.moveTo(cx - s * 0.28, cy + s * 0.26);
  ctx.lineTo(cx + s * 0.28, cy + s * 0.26);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const pennant: Icon = (ctx, cx, cy, s) => {
  // A pennant on a pole, with two diamonds cut out of it.
  ctx.beginPath();
  ctx.rect(cx - s * 0.42, cy - s * 0.46, s * 0.1, s * 0.92);
  ctx.moveTo(cx - s * 0.3, cy - s * 0.42);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.14);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.14);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.14, cy - s * 0.26);
  ctx.lineTo(cx - s * 0.04, cy - s * 0.14);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.24, cy - s * 0.14);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.14);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.02, cy - s * 0.14);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const ferrisWheel: Icon = (ctx, cx, cy, s) => {
  const lw = ctx.lineWidth;
  const r = s * 0.36;
  const y = cy - s * 0.06;
  ctx.lineWidth = Math.max(1.1, s * 0.1);
  ctx.beginPath();
  circle(ctx, cx, y, r);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.moveTo(cx - s * 0.3, cy + s * 0.48);
  ctx.lineTo(cx, y);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.48);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  circle(ctx, cx, y, s * 0.09);
  ctx.fill();
};

export const horse: Icon = (ctx, cx, cy, s) => {
  // A horse's head and neck, facing left: a long muzzle, pricked ears, a mane down the neck.
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.3, cy + s * 0.48);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.05, cy - s * 0.32, cx - s * 0.08, cy - s * 0.32);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.48);
  ctx.lineTo(cx - s * 0.18, cy - s * 0.26);
  ctx.quadraticCurveTo(cx - s * 0.46, cy - s * 0.1, cx - s * 0.48, cy + s * 0.12);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.14, cx - s * 0.16, cy + s * 0.02);
  ctx.quadraticCurveTo(cx - s * 0.02, cy + s * 0.3, cx + s * 0.02, cy + s * 0.48);
  ctx.closePath();
  ctx.fill();
};

export const lantern: Icon = (ctx, cx, cy, s) => {
  // A round paper lantern on its hanging loop: a cap above and below, a slot of light cut down its middle.
  ctx.beginPath();
  oval(ctx, cx, cy + s * 0.04, s * 0.42, s * 0.32);
  oval(ctx, cx, cy + s * 0.04, s * 0.09, s * 0.22);
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.rect(cx - s * 0.2, cy - s * 0.36, s * 0.4, s * 0.1);
  ctx.rect(cx - s * 0.2, cy + s * 0.32, s * 0.4, s * 0.1);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy - s * 0.36);
  ctx.quadraticCurveTo(cx, cy - s * 0.6, cx + s * 0.1, cy - s * 0.36);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const roastChicken: Icon = (ctx, cx, cy, s) => {
  // A roast chicken leg: the plump drumstick down to the left, the bone up to the right with its two knobs.
  ctx.beginPath();
  oval(ctx, cx - s * 0.14, cy + s * 0.12, s * 0.36, s * 0.26, -0.7);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.08, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.36, cy - s * 0.36);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  circle(ctx, cx + s * 0.44, cy - s * 0.3, s * 0.1);
  circle(ctx, cx + s * 0.3, cy - s * 0.44, s * 0.1);
  ctx.fill();
};

export const edelweiss: Icon = (ctx, cx, cy, s) => {
  // A star of woolly petals round a cluster of yellow hearts.
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 6;
    oval(ctx, cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3, s * 0.22, s * 0.1, a);
  }
  ctx.fill();
  ctx.beginPath();
  starPath(ctx, cx, cy, s * 0.17);
  ctx.fill();
};

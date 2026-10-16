import { circle, oval, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";

// Inked icons for the Halloween bars. Each draws one symbol centered at (cx, cy), about `s`
// pixels tall, with the caller's ink stroke/fill style. In play `s` is only ~12 px, so the
// shapes stay bold and simple, and solid silhouettes (hat, bat) are filled; every dot, eye and
// fang is its own subpath (circle/oval or a moveTo + closePath) so nothing joins up. No
// arrays are allocated: these run hundreds of times a frame.

function eyeTriangle(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y - h);
  ctx.closePath();
}

export const pumpkin: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  oval(ctx, cx, cy + s * 0.08, s * 0.54, s * 0.4);
  ctx.moveTo(cx - s * 0.03, cy - s * 0.31);
  ctx.quadraticCurveTo(cx - s * 0.02, cy - s * 0.46, cx + s * 0.15, cy - s * 0.5);
  ctx.moveTo(cx - s * 0.3, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.3);
  ctx.lineTo(cx, cy + s * 0.21);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.2);
  ctx.stroke();
  ctx.beginPath();
  eyeTriangle(ctx, cx - s * 0.21, cy + s * 0.06, s * 0.12, s * 0.18);
  eyeTriangle(ctx, cx + s * 0.21, cy + s * 0.06, s * 0.12, s * 0.18);
  ctx.fill();
};

export const witchHat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  // Cone, its tip flopping over to the right
  ctx.moveTo(cx - s * 0.32, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.16);
  ctx.quadraticCurveTo(cx - s * 0.04, cy - s * 0.46, cx + s * 0.38, cy - s * 0.48);
  ctx.quadraticCurveTo(cx + s * 0.12, cy - s * 0.3, cx + s * 0.14, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.32, cy + s * 0.3);
  ctx.closePath();
  // Brim
  oval(ctx, cx, cy + s * 0.33, s * 0.6, s * 0.11);
  ctx.fill();
};

export const candyCorn: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.22, cy - s * 0.05, cx + s * 0.4, cy + s * 0.36);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx - s * 0.4, cy + s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.22, cy - s * 0.05, cx, cy - s * 0.5);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.07);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.07);
  ctx.moveTo(cx - s * 0.3, cy + s * 0.16);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.16);
  ctx.stroke();
};

export const crow: Icon = (ctx, cx, cy, s) => {
  // A crow perched and facing right, leaning forward: body and head, beak and long tail, legs.
  ctx.beginPath();
  oval(ctx, cx - s * 0.04, cy + s * 0.02, s * 0.17, s * 0.33, 0.95);
  circle(ctx, cx + s * 0.2, cy - s * 0.2, s * 0.15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.28, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.58, cy - s * 0.18);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.12);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.24, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.56, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.48, cy + s * 0.42);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.0, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.46);
  ctx.moveTo(cx + s * 0.1, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.46);
  ctx.stroke();
};

export const bat: Icon = (ctx, cx, cy, s) => {
  const w = s * 0.74;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.12);
  ctx.quadraticCurveTo(cx - w * 0.5, cy - s * 0.42, cx - w, cy - s * 0.15);
  ctx.quadraticCurveTo(cx - w * 0.75, cy + s * 0.05, cx - w * 0.6, cy + s * 0.26);
  ctx.quadraticCurveTo(cx - w * 0.4, cy + s * 0.06, cx - w * 0.22, cy + s * 0.2);
  ctx.quadraticCurveTo(cx - w * 0.1, cy + s * 0.06, cx, cy + s * 0.3);
  ctx.quadraticCurveTo(cx + w * 0.1, cy + s * 0.06, cx + w * 0.22, cy + s * 0.2);
  ctx.quadraticCurveTo(cx + w * 0.4, cy + s * 0.06, cx + w * 0.6, cy + s * 0.26);
  ctx.quadraticCurveTo(cx + w * 0.75, cy + s * 0.05, cx + w, cy - s * 0.15);
  ctx.quadraticCurveTo(cx + w * 0.5, cy - s * 0.42, cx, cy - s * 0.12);
  ctx.closePath();
  // Ears, wound the same way as the wings so the overlap stays solid
  ctx.moveTo(cx - s * 0.13, cy - s * 0.06);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.12);
  ctx.lineTo(cx - s * 0.15, cy - s * 0.36);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.13, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.15, cy - s * 0.36);
  ctx.lineTo(cx + s * 0.02, cy - s * 0.12);
  ctx.closePath();
  ctx.fill();
};

export const tombstone: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + s * 0.42);
  ctx.lineTo(cx - r, cy - s * 0.15);
  ctx.arc(cx, cy - s * 0.15, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy + s * 0.42);
  ctx.moveTo(cx - s * 0.52, cy + s * 0.44);
  ctx.lineTo(cx + s * 0.52, cy + s * 0.44);
  ctx.moveTo(cx, cy - s * 0.27);
  ctx.lineTo(cx, cy + s * 0.2);
  ctx.moveTo(cx - s * 0.14, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.1);
  ctx.stroke();
};

export const mummy: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.45;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.moveTo(cx - r * 0.98, cy - r * 0.3);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.62);
  ctx.moveTo(cx - r * 0.98, cy + r * 0.28);
  ctx.lineTo(cx + r * 0.98, cy + r * 0.05);
  ctx.moveTo(cx - r * 0.66, cy + r * 0.76);
  ctx.lineTo(cx + r * 0.72, cy + r * 0.6);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx - r * 0.34, cy - r * 0.08, s * 0.075);
  circle(ctx, cx + r * 0.3, cy - r * 0.16, s * 0.075);
  ctx.fill();
};

export const moon: Icon = (ctx, cx, cy, s) => {
  // Crescent: an outer arc around the left, then an inner arc back; they meet at the tips.
  const ox = cx - s * 0.1;
  ctx.beginPath();
  ctx.arc(ox, cy, s * 0.42, 1.03, Math.PI * 2 - 1.03);
  ctx.arc(ox + s * 0.22, cy, s * 0.36, -Math.PI / 2, Math.PI / 2, true);
  ctx.closePath();
  ctx.stroke();
  // A little four-point star
  const sx = cx + s * 0.34;
  const sy = cy - s * 0.26;
  const r = s * 0.14;
  ctx.beginPath();
  ctx.moveTo(sx, sy - r);
  ctx.quadraticCurveTo(sx + r * 0.18, sy - r * 0.18, sx + r, sy);
  ctx.quadraticCurveTo(sx + r * 0.18, sy + r * 0.18, sx, sy + r);
  ctx.quadraticCurveTo(sx - r * 0.18, sy + r * 0.18, sx - r, sy);
  ctx.quadraticCurveTo(sx - r * 0.18, sy - r * 0.18, sx, sy - r);
  ctx.closePath();
  ctx.fill();
};

export const skull: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.29);
  ctx.quadraticCurveTo(cx - s * 0.44, cy + s * 0.2, cx - s * 0.44, cy - s * 0.06);
  ctx.arc(cx, cy - s * 0.06, s * 0.44, Math.PI, 0);
  ctx.quadraticCurveTo(cx + s * 0.44, cy + s * 0.2, cx + s * 0.2, cy + s * 0.29);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.46);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.06, cy + s * 0.33);
  ctx.lineTo(cx - s * 0.06, cy + s * 0.46);
  ctx.moveTo(cx + s * 0.06, cy + s * 0.33);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.46);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, cx - s * 0.17, cy - s * 0.01, s * 0.11, s * 0.12);
  oval(ctx, cx + s * 0.17, cy - s * 0.01, s * 0.11, s * 0.12);
  ctx.moveTo(cx, cy + s * 0.13);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.23);
  ctx.lineTo(cx + s * 0.05, cy + s * 0.23);
  ctx.closePath();
  ctx.fill();
};

export const fangs: Icon = (ctx, cx, cy, s) => {
  // Vampire grin: a wide smile with two long fangs hanging from it.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.56, cy - s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.26, cx - s * 0.46, cy - s * 0.28);
  ctx.quadraticCurveTo(cx, cy + s * 0.06, cx + s * 0.46, cy - s * 0.28);
  ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.26, cx + s * 0.56, cy - s * 0.36);
  ctx.stroke();
  ctx.beginPath();
  eyeTriangle(ctx, cx - s * 0.2, cy - s * 0.15, s * 0.11, -s * 0.52);
  eyeTriangle(ctx, cx + s * 0.2, cy - s * 0.15, s * 0.11, -s * 0.52);
  ctx.fill();
};

// Spider legs for the right side, in units of s from the body: knee x, knee y, foot x, foot y.
// Spread top to bottom so the legs fan out and never cross.
const LEGS = [
  [0.26, -0.36, 0.44, -0.16],
  [0.36, -0.14, 0.54, 0.0],
  [0.36, 0.08, 0.52, 0.24],
  [0.26, 0.28, 0.38, 0.46],
] as const;

export const spider: Icon = (ctx, cx, cy, s) => {
  const by = cy + s * 0.02;
  ctx.beginPath();
  // Thread
  ctx.moveTo(cx, cy - s * 0.6);
  ctx.lineTo(cx, by - s * 0.12);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < LEGS.length; i++) {
      const [kx, ky, fx, fy] = LEGS[i]!;
      ctx.moveTo(cx + side * s * 0.06, by + (i - 1.5) * s * 0.05);
      ctx.lineTo(cx + side * s * kx, by + s * ky);
      ctx.lineTo(cx + side * s * fx, by + s * fy);
    }
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, by - s * 0.06, s * 0.11);
  circle(ctx, cx, by + s * 0.15, s * 0.16);
  ctx.fill();
};

export const hauntedHouse: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  // Crooked gable house with a chimney
  ctx.moveTo(cx - s * 0.42, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.04);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.45);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.24, cy - s * 0.24);
  ctx.lineTo(cx + s * 0.24, cy - s * 0.46);
  // Door
  ctx.moveTo(cx - s * 0.09, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.09, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.09, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.09, cy + s * 0.45);
  ctx.stroke();
  // Two lit windows
  ctx.beginPath();
  ctx.rect(cx - s * 0.29, cy + s * 0.0, s * 0.13, s * 0.13);
  ctx.rect(cx + s * 0.16, cy + s * 0.0, s * 0.13, s * 0.13);
  ctx.fill();
};

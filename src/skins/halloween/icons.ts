import { circle, oval, type Ctx } from "../../neon/draw";
import type { Icon } from "../skin";

// Neon line icons for the Halloween bars. Each draws one symbol centered at (cx, cy), about
// `s` pixels tall, with the caller's stroke/fill style. In play `s` is only ~13 px, so the
// shapes stay bold and simple; every dot, eye and fang is its own subpath (circle/oval or a
// moveTo + closePath) so nothing joins up. No arrays are allocated: these run hundreds of
// times a frame.

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
  // Brim
  ctx.moveTo(cx - s * 0.58, cy + s * 0.33);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx + s * 0.58, cy + s * 0.33);
  // Cone, its tip flopping over to the right
  ctx.moveTo(cx - s * 0.3, cy + s * 0.35);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.16);
  ctx.quadraticCurveTo(cx - s * 0.02, cy - s * 0.44, cx + s * 0.36, cy - s * 0.46);
  ctx.quadraticCurveTo(cx + s * 0.1, cy - s * 0.3, cx + s * 0.12, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.35);
  // Band
  ctx.moveTo(cx - s * 0.25, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.18);
  ctx.stroke();
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

export const ghost: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.34;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + s * 0.44);
  ctx.lineTo(cx - r, cy - s * 0.1);
  ctx.arc(cx, cy - s * 0.1, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy + s * 0.44);
  for (let i = 1; i <= 3; i++) {
    const x = cx + r - (i * 2 * r) / 3;
    ctx.quadraticCurveTo(x + r / 3, cy + s * 0.22, x, cy + s * 0.44);
  }
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, cx - s * 0.13, cy - s * 0.08, s * 0.065, s * 0.1);
  oval(ctx, cx + s * 0.13, cy - s * 0.08, s * 0.065, s * 0.1);
  ctx.fill();
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
  // Ears
  ctx.moveTo(cx - s * 0.1, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.34);
  ctx.moveTo(cx + s * 0.1, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.34);
  ctx.stroke();
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
  // Vampire bite: an open mouth with two long fangs hanging from the upper lip.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.56, cy - s * 0.12);
  ctx.quadraticCurveTo(cx, cy - s * 0.44, cx + s * 0.56, cy - s * 0.12);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx - s * 0.56, cy - s * 0.12);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  eyeTriangle(ctx, cx - s * 0.21, cy - s * 0.26, s * 0.1, -s * 0.44);
  eyeTriangle(ctx, cx + s * 0.21, cy - s * 0.26, s * 0.1, -s * 0.44);
  ctx.fill();
};

export const spider: Icon = (ctx, cx, cy, s) => {
  const by = cy + s * 0.04;
  ctx.beginPath();
  // Thread
  ctx.moveTo(cx, cy - s * 0.58);
  ctx.lineTo(cx, by - s * 0.14);
  // Four legs a side: the front pair reach up, the back pair bend down.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const rootY = by - s * 0.06 + i * s * 0.06;
      const kneeX = cx + side * s * (0.27 + (i === 1 || i === 2 ? 0.06 : 0));
      const kneeY = by - s * (0.3 - i * 0.14);
      const footX = cx + side * s * (0.5 - (i === 3 ? 0.08 : 0));
      const footY = by - s * (0.12 - i * 0.16);
      ctx.moveTo(cx + side * s * 0.08, rootY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
    }
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, by - s * 0.06, s * 0.11);
  circle(ctx, cx, by + s * 0.17, s * 0.17);
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

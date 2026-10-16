import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";

// Heraldic charges for the Classic bars. Each draws one bold symbol centered at (cx, cy), about
// `s` pixels tall, with the caller's ink style. In play `s` is only ~12 px, so the shapes are
// chunky silhouettes (filled) with an occasional stroked detail; holes are cut with even-odd
// fills, and every dot is its own subpath. No arrays are allocated: these run hundreds of
// times a frame.

export const crown: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.44, cy + s * 0.34);
  ctx.lineTo(cx - s * 0.46, cy - s * 0.2);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.02);
  ctx.lineTo(cx, cy - s * 0.34);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.46, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.44, cy + s * 0.34);
  ctx.closePath();
  circle(ctx, cx - s * 0.46, cy - s * 0.3, s * 0.08);
  circle(ctx, cx, cy - s * 0.45, s * 0.08);
  circle(ctx, cx + s * 0.46, cy - s * 0.3, s * 0.08);
  ctx.fill();
};

export const shield: Icon = (ctx, cx, cy, s) => {
  // Heater shield with a chevron cut out of it.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy - s * 0.44);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.44);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.34, cy + s * 0.32, cx, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.34, cy + s * 0.32, cx - s * 0.38, cy - s * 0.02);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.08);
  ctx.lineTo(cx, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.22);
  ctx.lineTo(cx, cy - s * 0.06);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.22);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const key: Icon = (ctx, cx, cy, s) => {
  // Lying on its side: a ring bow, the shaft, two bit teeth.
  ctx.beginPath();
  circle(ctx, cx - s * 0.3, cy, s * 0.2);
  ctx.moveTo(cx - s * 0.1, cy);
  ctx.lineTo(cx + s * 0.5, cy);
  ctx.moveTo(cx + s * 0.28, cy);
  ctx.lineTo(cx + s * 0.28, cy + s * 0.2);
  ctx.moveTo(cx + s * 0.44, cy);
  ctx.lineTo(cx + s * 0.44, cy + s * 0.24);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx - s * 0.3, cy, s * 0.07);
  ctx.fill();
};

export const fleurDeLis: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  // Center petal
  ctx.moveTo(cx, cy - s * 0.52);
  ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.26, cx + s * 0.07, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.07, cy + s * 0.06);
  ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.26, cx, cy - s * 0.52);
  ctx.closePath();
  // Side petals curling out and down
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(cx + side * s * 0.06, cy + s * 0.04);
    ctx.quadraticCurveTo(cx + side * s * 0.1, cy - s * 0.3, cx + side * s * 0.38, cy - s * 0.24);
    ctx.quadraticCurveTo(cx + side * s * 0.52, cy - s * 0.1, cx + side * s * 0.36, cy + s * 0.08);
    ctx.quadraticCurveTo(cx + side * s * 0.36, cy - s * 0.1, cx + side * s * 0.22, cy - s * 0.08);
    ctx.quadraticCurveTo(cx + side * s * 0.14, cy - s * 0.02, cx + side * s * 0.16, cy + s * 0.08);
    ctx.closePath();
  }
  // Band and the little foot below it
  ctx.rect(cx - s * 0.28, cy + s * 0.08, s * 0.56, s * 0.11);
  ctx.moveTo(cx - s * 0.06, cy + s * 0.19);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.19);
  ctx.lineTo(cx + s * 0.16, cy + s * 0.44);
  ctx.lineTo(cx, cy + s * 0.34);
  ctx.lineTo(cx - s * 0.16, cy + s * 0.44);
  ctx.closePath();
  ctx.fill();
};

export const sword: Icon = (ctx, cx, cy, s) => {
  // Point up: blade, crossguard, grip and pommel.
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.54);
  ctx.lineTo(cx + s * 0.09, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.09, cy + s * 0.14);
  ctx.lineTo(cx - s * 0.09, cy + s * 0.14);
  ctx.lineTo(cx - s * 0.09, cy - s * 0.4);
  ctx.closePath();
  ctx.rect(cx - s * 0.32, cy + s * 0.14, s * 0.64, s * 0.1);
  ctx.rect(cx - s * 0.05, cy + s * 0.24, s * 0.1, s * 0.16);
  circle(ctx, cx, cy + s * 0.45, s * 0.08);
  ctx.fill();
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? s * 0.22 : s * 0.52;
    const x = cx + Math.cos(a) * r;
    const y = cy + s * 0.04 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
};

export const crescent: Icon = (ctx, cx, cy, s) => {
  // Horns up, as on a coat of arms, wrapping high enough to read as a moon (not a smile).
  // The two arcs meet at the horn tips: outer from -0.674 rad, inner from -0.285 rad.
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.08, s * 0.43, -0.674, Math.PI + 0.674);
  ctx.arc(cx, cy - s * 0.25, s * 0.35, Math.PI + 0.285, -0.285, true);
  ctx.closePath();
  ctx.fill();
};

export const turret: Icon = (ctx, cx, cy, s) => {
  // A castle tower: three merlons, the body, and an arched door cut out.
  const w = s * 0.34;
  const top = cy - s * 0.46;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + s * 0.46);
  ctx.lineTo(cx - w, top);
  ctx.lineTo(cx - w * 0.5, top);
  ctx.lineTo(cx - w * 0.5, top + s * 0.14);
  ctx.lineTo(cx - w * 0.2, top + s * 0.14);
  ctx.lineTo(cx - w * 0.2, top);
  ctx.lineTo(cx + w * 0.2, top);
  ctx.lineTo(cx + w * 0.2, top + s * 0.14);
  ctx.lineTo(cx + w * 0.5, top + s * 0.14);
  ctx.lineTo(cx + w * 0.5, top);
  ctx.lineTo(cx + w, top);
  ctx.lineTo(cx + w, cy + s * 0.46);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.11, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.11, cy + s * 0.16);
  ctx.arc(cx, cy + s * 0.16, s * 0.11, Math.PI, 0);
  ctx.lineTo(cx + s * 0.11, cy + s * 0.46);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const horseshoe: Icon = (ctx, cx, cy, s) => {
  // Opening up (for luck): a thick U with nail holes.
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.02, s * 0.42, Math.PI * 1.12, Math.PI * 1.88, true);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.42);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.42);
  ctx.arc(cx, cy - s * 0.02, s * 0.24, Math.PI * 1.85, Math.PI * 1.15, false);
  ctx.lineTo(cx - s * 0.34, cy - s * 0.42);
  ctx.closePath();
  circle(ctx, cx - s * 0.33, cy + s * 0.04, s * 0.04);
  circle(ctx, cx + s * 0.33, cy + s * 0.04, s * 0.04);
  circle(ctx, cx - s * 0.18, cy + s * 0.3, s * 0.04);
  circle(ctx, cx + s * 0.18, cy + s * 0.3, s * 0.04);
  ctx.fill("evenodd");
};

export const chalice: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  // Bowl
  ctx.moveTo(cx - s * 0.34, cy - s * 0.46);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.46);
  ctx.quadraticCurveTo(cx + s * 0.34, cy + s * 0.02, cx + s * 0.06, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.28);
  // Foot
  ctx.quadraticCurveTo(cx + s * 0.08, cy + s * 0.36, cx + s * 0.28, cy + s * 0.4);
  ctx.lineTo(cx + s * 0.28, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.4);
  ctx.quadraticCurveTo(cx - s * 0.08, cy + s * 0.36, cx - s * 0.06, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.06, cy + s * 0.06);
  ctx.quadraticCurveTo(cx - s * 0.34, cy + s * 0.02, cx - s * 0.34, cy - s * 0.46);
  ctx.closePath();
  // A jewel set in the bowl, cut out
  oval(ctx, cx, cy - s * 0.2, s * 0.08, s * 0.1);
  ctx.fill("evenodd");
};

export const heart: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.46);
  ctx.bezierCurveTo(cx - s * 0.2, cy + s * 0.28, cx - s * 0.52, cy + s * 0.06, cx - s * 0.48, cy - s * 0.2);
  ctx.bezierCurveTo(cx - s * 0.44, cy - s * 0.48, cx - s * 0.08, cy - s * 0.5, cx, cy - s * 0.22);
  ctx.bezierCurveTo(cx + s * 0.08, cy - s * 0.5, cx + s * 0.44, cy - s * 0.48, cx + s * 0.48, cy - s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.52, cy + s * 0.06, cx + s * 0.2, cy + s * 0.28, cx, cy + s * 0.46);
  ctx.closePath();
  ctx.fill();
};

export const dragon: Icon = (ctx, cx, cy, s) => {
  // A dragon's head in profile, facing right: horns swept back, a toothy snout, an eye cut out.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy + s * 0.48);
  ctx.quadraticCurveTo(cx - s * 0.42, cy - s * 0.04, cx - s * 0.16, cy - s * 0.26);
  // Horns
  ctx.lineTo(cx - s * 0.5, cy - s * 0.52);
  ctx.lineTo(cx - s * 0.04, cy - s * 0.32);
  ctx.lineTo(cx - s * 0.22, cy - s * 0.54);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.3);
  // Brow, snout, nostril bump
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.26, cx + s * 0.5, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.52, cy + s * 0.04);
  // Open jaw with a fang
  ctx.lineTo(cx + s * 0.16, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.14);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.05);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.44, cy + s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.36, cx - s * 0.04, cy + s * 0.26);
  ctx.lineTo(cx - s * 0.04, cy + s * 0.48);
  ctx.closePath();
  circle(ctx, cx + s * 0.06, cy - s * 0.13, s * 0.065);
  ctx.fill("evenodd");
};

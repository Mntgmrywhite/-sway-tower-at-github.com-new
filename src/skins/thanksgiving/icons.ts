import { circle, oval, type Ctx } from "../../neon/draw";
import type { Icon } from "../skin";
import { MAPLE } from "./leaves";

// Neon line-art harvest symbols for the bars. Each is drawn in unit space (about -0.5..0.5,
// y down) with the bar's current stroke style; a few add small solid dots with the fill style.
// Bars are only ~20px tall on a phone, so every shape is a bold, simple silhouette.

type Build = (ctx: Ctx) => void;

function icon(lines: Build, dots?: Build): Icon {
  return (ctx, cx, cy, s) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.beginPath();
    lines(ctx);
    ctx.restore();
    ctx.stroke();
    if (dots) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.beginPath();
      dots(ctx);
      ctx.restore();
      ctx.fill();
    }
  };
}

const PI = Math.PI;

/** Front-on turkey: tail fan, round body, small head, feet. */
export const turkey = icon(
  (ctx) => {
    const fy = 0.1;
    ctx.moveTo(-0.5, fy);
    ctx.arc(0, fy, 0.5, PI, PI * 2);
    for (const a of [1.2, 1.4, 1.6, 1.8]) {
      ctx.moveTo(Math.cos(a * PI) * 0.27, fy + Math.sin(a * PI) * 0.27);
      ctx.lineTo(Math.cos(a * PI) * 0.5, fy + Math.sin(a * PI) * 0.5);
    }
    circle(ctx, 0, 0.16, 0.21);
    circle(ctx, 0, -0.12, 0.09);
    ctx.moveTo(-0.08, 0.36);
    ctx.lineTo(-0.11, 0.48);
    ctx.moveTo(0.08, 0.36);
    ctx.lineTo(0.11, 0.48);
  },
  (ctx) => {
    ctx.moveTo(-0.03, -0.09);
    ctx.lineTo(0.03, -0.09);
    ctx.lineTo(0, -0.01);
    ctx.closePath();
  },
);

/** Maple leaf from the shared outline, with a midrib and stem. */
export const mapleLeaf = icon((ctx) => {
  const k = 1.02;
  for (let i = 0; i < MAPLE.length; i += 2) {
    const x = MAPLE[i]! * k;
    const y = MAPLE[i + 1]! * k - 0.03;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.moveTo(0, 0.48);
  ctx.lineTo(0, -0.22);
});

/** Corn cob with a kernel grid and two husk leaves, tilted. */
export const corn = icon((ctx) => {
  ctx.rotate(0.45);
  oval(ctx, 0, -0.1, 0.15, 0.36);
  for (const y of [-0.3, -0.16, -0.02, 0.12]) {
    const hw = 0.15 * Math.sqrt(Math.max(0, 1 - ((y + 0.1) / 0.36) ** 2));
    ctx.moveTo(-hw, y);
    ctx.lineTo(hw, y);
  }
  ctx.moveTo(0, -0.44);
  ctx.lineTo(0, 0.24);
  ctx.moveTo(0, 0.5);
  ctx.quadraticCurveTo(-0.3, 0.3, -0.24, -0.06);
  ctx.quadraticCurveTo(-0.1, 0.14, 0, 0.5);
  ctx.moveTo(0, 0.5);
  ctx.quadraticCurveTo(0.3, 0.3, 0.24, -0.06);
  ctx.quadraticCurveTo(0.1, 0.14, 0, 0.5);
});

/** Wedge of pie in three-quarter view: top face, crust, side, a dollop of cream. */
export const pie = icon((ctx) => {
  ctx.moveTo(-0.52, 0.06);
  ctx.lineTo(0.2, -0.3);
  ctx.quadraticCurveTo(0.44, -0.24, 0.48, -0.02);
  ctx.closePath();
  ctx.moveTo(-0.52, 0.06);
  ctx.lineTo(-0.52, 0.3);
  ctx.lineTo(0.48, 0.24);
  ctx.lineTo(0.48, -0.02);
  ctx.moveTo(0.48, 0.1);
  ctx.lineTo(-0.52, 0.17);
  circle(ctx, 0.12, -0.2, 0.09);
});

/** Pumpkin: ribbed body, stem, curl of vine. */
export const pumpkin = icon((ctx) => {
  oval(ctx, 0, 0.1, 0.48, 0.34);
  oval(ctx, 0, 0.1, 0.19, 0.34);
  ctx.moveTo(-0.04, -0.23);
  ctx.lineTo(-0.02, -0.44);
  ctx.lineTo(0.09, -0.42);
  ctx.lineTo(0.05, -0.23);
  ctx.moveTo(0.08, -0.36);
  ctx.quadraticCurveTo(0.3, -0.5, 0.34, -0.32);
});

/** Three cranberries with a sprig. */
export const cranberry = icon(
  (ctx) => {
    circle(ctx, -0.2, 0.2, 0.19);
    circle(ctx, 0.2, 0.2, 0.19);
    circle(ctx, 0, -0.1, 0.19);
    ctx.moveTo(0, -0.29);
    ctx.lineTo(0.06, -0.44);
    ctx.moveTo(0.04, -0.4);
    ctx.quadraticCurveTo(0.26, -0.52, 0.36, -0.36);
    ctx.quadraticCurveTo(0.2, -0.3, 0.04, -0.4);
  },
  (ctx) => {
    circle(ctx, -0.26, 0.13, 0.045);
    circle(ctx, 0.14, 0.13, 0.045);
    circle(ctx, -0.06, -0.17, 0.045);
  },
);

/** One ear of wheat: stem and chevron kernels, angled from (x0, y0) to (x1, y1). */
function ear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, n: number): void {
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const w = 0.09;
  for (let i = 0; i < n; i++) {
    const f = 0.42 + (i / n) * 0.55;
    const px = x0 + dx * f;
    const py = y0 + dy * f;
    ctx.moveTo(px - uy * w - ux * w, py + ux * w - uy * w);
    ctx.lineTo(px, py);
    ctx.lineTo(px + uy * w - ux * w, py - ux * w - uy * w);
  }
}

/** Sheaf of three wheat stalks tied at the middle. */
export const wheat = icon((ctx) => {
  ear(ctx, 0, 0.48, 0, -0.5, 4);
  ear(ctx, -0.08, 0.48, -0.36, -0.36, 3);
  ear(ctx, 0.08, 0.48, 0.36, -0.36, 3);
  ctx.moveTo(-0.13, 0.22);
  ctx.lineTo(0.13, 0.22);
});

/** Pilgrim hat: tall crown, wide brim, band and buckle. */
export const pilgrimHat = icon((ctx) => {
  ctx.moveTo(-0.26, 0.22);
  ctx.lineTo(-0.2, -0.42);
  ctx.lineTo(0.2, -0.42);
  ctx.lineTo(0.26, 0.22);
  oval(ctx, 0, 0.27, 0.52, 0.12);
  ctx.moveTo(-0.24, 0.0);
  ctx.lineTo(0.24, 0.0);
  ctx.rect(-0.12, -0.06, 0.24, 0.22);
});

/** Apple with a stem and a leaf. */
export const apple = icon((ctx) => {
  ctx.moveTo(0, -0.24);
  ctx.bezierCurveTo(-0.16, -0.38, -0.46, -0.3, -0.44, 0.02);
  ctx.bezierCurveTo(-0.42, 0.32, -0.2, 0.48, -0.1, 0.43);
  ctx.quadraticCurveTo(0, 0.39, 0.1, 0.43);
  ctx.bezierCurveTo(0.2, 0.48, 0.42, 0.32, 0.44, 0.02);
  ctx.bezierCurveTo(0.46, -0.3, 0.16, -0.38, 0, -0.24);
  ctx.closePath();
  ctx.moveTo(0, -0.24);
  ctx.quadraticCurveTo(0.0, -0.4, 0.07, -0.48);
  ctx.moveTo(0.04, -0.38);
  ctx.quadraticCurveTo(0.22, -0.52, 0.34, -0.4);
  ctx.quadraticCurveTo(0.2, -0.3, 0.04, -0.38);
  ctx.moveTo(-0.3, -0.04);
  ctx.quadraticCurveTo(-0.3, 0.14, -0.2, 0.24);
});

/** Bottle gourd: small neck bulb, big base bulb, curly stem, two ribs. */
export const gourd = icon((ctx) => {
  ctx.moveTo(0, -0.36);
  ctx.bezierCurveTo(-0.16, -0.36, -0.16, -0.1, -0.2, -0.02);
  ctx.bezierCurveTo(-0.46, 0.16, -0.38, 0.48, 0, 0.48);
  ctx.bezierCurveTo(0.38, 0.48, 0.46, 0.16, 0.2, -0.02);
  ctx.bezierCurveTo(0.16, -0.1, 0.16, -0.36, 0, -0.36);
  ctx.closePath();
  ctx.moveTo(0, -0.36);
  ctx.quadraticCurveTo(0.02, -0.5, 0.18, -0.48);
  ctx.moveTo(-0.07, -0.08);
  ctx.quadraticCurveTo(-0.2, 0.2, -0.1, 0.46);
  ctx.moveTo(0.07, -0.08);
  ctx.quadraticCurveTo(0.2, 0.2, 0.1, 0.46);
});

/** Acorn: textured cap, pointed nut, stem. */
export const acorn = icon((ctx) => {
  ctx.moveTo(-0.36, -0.06);
  ctx.quadraticCurveTo(-0.34, -0.38, 0, -0.38);
  ctx.quadraticCurveTo(0.34, -0.38, 0.36, -0.06);
  ctx.closePath();
  ctx.moveTo(-0.28, -0.06);
  ctx.bezierCurveTo(-0.3, 0.3, -0.06, 0.42, 0, 0.5);
  ctx.bezierCurveTo(0.06, 0.42, 0.3, 0.3, 0.28, -0.06);
  ctx.moveTo(0, -0.38);
  ctx.lineTo(0.05, -0.5);
  ctx.moveTo(-0.26, -0.2);
  ctx.lineTo(-0.1, -0.06);
  ctx.moveTo(-0.08, -0.34);
  ctx.lineTo(0.18, -0.06);
  ctx.moveTo(0.14, -0.36);
  ctx.lineTo(0.32, -0.16);
});

/** Horn of plenty: a wicker horn rising to a curled tip, fruit spilling from its open mouth. */
export const cornucopia = icon(
  (ctx) => {
    // Horn: mouth at the lower right, tip curling over at the upper left.
    ctx.moveTo(0.1, -0.16);
    ctx.quadraticCurveTo(-0.22, -0.12, -0.38, -0.34);
    ctx.quadraticCurveTo(-0.5, -0.5, -0.3, -0.48);
    ctx.moveTo(-0.38, -0.34);
    ctx.quadraticCurveTo(-0.3, 0.12, 0.14, 0.34);
    oval(ctx, 0.13, 0.09, 0.09, 0.26, -0.15);
    // Wicker bands
    ctx.moveTo(-0.08, -0.15);
    ctx.quadraticCurveTo(-0.15, 0.04, -0.06, 0.22);
    ctx.moveTo(-0.25, -0.2);
    ctx.quadraticCurveTo(-0.3, -0.06, -0.24, 0.06);
    // Fruit: an apple and a pear tumbling out
    circle(ctx, 0.36, 0.25, 0.14);
    ctx.moveTo(0.32, -0.02);
    ctx.bezierCurveTo(0.42, -0.3, 0.52, -0.06, 0.44, 0.04);
  },
  (ctx) => {
    for (const [gx, gy] of [
      [0.26, -0.12],
      [0.2, -0.2],
      [0.3, -0.24],
    ] as const)
      circle(ctx, gx, gy, 0.05);
  },
);

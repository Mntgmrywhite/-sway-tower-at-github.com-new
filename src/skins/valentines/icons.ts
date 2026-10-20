import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";
import { heartPath } from "./shapes";

// Symbols for the Valentine's bars, our own simple glyphs: a heart, a rose, a wrapped bonbon,
// an envelope, Cupid's arrow, a ring, a ribbon bow, a heart balloon, a swan, a cupcake, a key
// and a cut diamond. Each draws one bold shape centered at (cx, cy), about `s` pixels tall,
// with the caller's ink style (fill and stroke are the same color). In play `s` is only ~12 px,
// so they are chunky filled silhouettes with an occasional stroked detail; holes are cut with
// even-odd fills, and every round part is its own subpath. Nothing is allocated here: these
// run hundreds of times a frame.

export const heart: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  heartPath(ctx, cx, cy + s * 0.02, s * 1.04);
  ctx.fill();
};

export const rose: Icon = (ctx, cx, cy, s) => {
  // A long-stemmed rose lying across the bar: the bud at the upper right, two leaves on the stem.
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.11);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.14);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  // The bud: a teardrop pointing up the stem, two sepals at its base; two leaves on the stem.
  ctx.moveTo(cx + s * 0.1, cy - s * 0.06);
  ctx.quadraticCurveTo(cx + s * 0.12, cy - s * 0.5, cx + s * 0.5, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.56, cy - s * 0.12, cx + s * 0.1, cy - s * 0.06);
  ctx.closePath();
  oval(ctx, cx + s * 0.1, cy - s * 0.2, s * 0.14, s * 0.05, -1.3);
  oval(ctx, cx + s * 0.22, cy - s * 0.02, s * 0.14, s * 0.05, 0.2);
  oval(ctx, cx - s * 0.26, cy + s * 0.04, s * 0.17, s * 0.08, -0.4);
  oval(ctx, cx - s * 0.06, cy + s * 0.14, s * 0.17, s * 0.08, 0.5);
  ctx.fill();
};

export const bonbon: Icon = (ctx, cx, cy, s) => {
  // A wrapped sweet: a round middle with a twist of wrapper fanning out at each end.
  ctx.beginPath();
  oval(ctx, cx, cy, s * 0.26, s * 0.24);
  for (let m = -1; m <= 1; m += 2) {
    ctx.moveTo(cx + m * s * 0.22, cy - s * 0.1);
    ctx.lineTo(cx + m * s * 0.5, cy - s * 0.3);
    ctx.lineTo(cx + m * s * 0.42, cy);
    ctx.lineTo(cx + m * s * 0.5, cy + s * 0.3);
    ctx.lineTo(cx + m * s * 0.22, cy + s * 0.1);
    ctx.closePath();
  }
  ctx.fill();
};

export const envelope: Icon = (ctx, cx, cy, s) => {
  // A sealed envelope: the flap's V is cut out of the face (even-odd), its tip a little heart seal.
  const w = s * 0.5;
  const h = s * 0.34;
  ctx.beginPath();
  ctx.rect(cx - w, cy - h, w * 2, h * 2);
  ctx.moveTo(cx - w + s * 0.07, cy - h + s * 0.06);
  ctx.lineTo(cx, cy + s * 0.06);
  ctx.lineTo(cx + w - s * 0.07, cy - h + s * 0.06);
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.beginPath();
  heartPath(ctx, cx, cy + s * 0.03, s * 0.24);
  ctx.fill();
};

export const arrow: Icon = (ctx, cx, cy, s) => {
  // Cupid's arrow flying up to the right: a shaft, a broad head and two fletching feathers.
  const lw = ctx.lineWidth;
  const c = 0.7071;
  const x0 = cx - s * 0.42;
  const y0 = cy + s * 0.42;
  const x1 = cx + s * 0.22;
  const y1 = cy - s * 0.22;
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x0 + s * 0.04, y0 - s * 0.04);
  ctx.lineTo(x0 - s * 0.16, y0 - s * 0.08);
  ctx.moveTo(x0 + s * 0.04, y0 - s * 0.04);
  ctx.lineTo(x0 + s * 0.08, y0 + s * 0.16);
  ctx.moveTo(x0 + s * 0.16, y0 - s * 0.16);
  ctx.lineTo(x0 - s * 0.04, y0 - s * 0.2);
  ctx.moveTo(x0 + s * 0.16, y0 - s * 0.16);
  ctx.lineTo(x0 + s * 0.2, y0 + s * 0.04);
  ctx.stroke();
  ctx.lineWidth = lw;
  // The head: a filled triangle pointing along the shaft.
  const hx = cx + s * 0.46;
  const hy = cy - s * 0.46;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx - s * 0.34 * c - s * 0.17 * c, hy + s * 0.34 * c - s * 0.17 * c);
  ctx.lineTo(hx - s * 0.34 * c + s * 0.17 * c, hy + s * 0.34 * c + s * 0.17 * c);
  ctx.closePath();
  ctx.fill();
};

export const ring: Icon = (ctx, cx, cy, s) => {
  // A thick band with a big pointed stone set on top.
  const y = cy + s * 0.14;
  ctx.beginPath();
  circle(ctx, cx, y, s * 0.4);
  ctx.moveTo(cx + s * 0.24, y);
  ctx.arc(cx, y, s * 0.24, 0, Math.PI * 2, true);
  ctx.moveTo(cx, y - s * 0.68);
  ctx.lineTo(cx + s * 0.28, y - s * 0.42);
  ctx.lineTo(cx, y - s * 0.22);
  ctx.lineTo(cx - s * 0.28, y - s * 0.42);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const bow: Icon = (ctx, cx, cy, s) => {
  // A ribbon bow: two loops either side of a knot, two tails hanging below.
  ctx.beginPath();
  oval(ctx, cx - s * 0.26, cy - s * 0.1, s * 0.26, s * 0.17, 0.35);
  oval(ctx, cx + s * 0.26, cy - s * 0.1, s * 0.26, s * 0.17, -0.35);
  circle(ctx, cx, cy - s * 0.08, s * 0.12);
  ctx.moveTo(cx - s * 0.06, cy);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.36);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.06, cy);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.46);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.36);
  ctx.closePath();
  ctx.fill();
};

export const balloon: Icon = (ctx, cx, cy, s) => {
  // A heart balloon on a curling string.
  ctx.beginPath();
  heartPath(ctx, cx, cy - s * 0.16, s * 0.72);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.16);
  ctx.quadraticCurveTo(cx - s * 0.16, cy + s * 0.36, cx + s * 0.1, cy + s * 0.5);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const swan: Icon = (ctx, cx, cy, s) => {
  // A swan gliding left: a plump body with a raised wing, a long neck curving up to a small head with a bill.
  const lw = ctx.lineWidth;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.26, cy + s * 0.1);
  ctx.quadraticCurveTo(cx - s * 0.1, cy - s * 0.16, cx + s * 0.2, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.44, cy + s * 0.16);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.4, cx, cy + s * 0.4);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.4, cx - s * 0.26, cy + s * 0.1);
  ctx.closePath();
  circle(ctx, cx - s * 0.3, cy - s * 0.4, s * 0.13);
  ctx.moveTo(cx - s * 0.4, cy - s * 0.36);
  ctx.lineTo(cx - s * 0.56, cy - s * 0.28);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1.3, s * 0.16);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.36, cy + s * 0.06, cx - s * 0.16, cy + s * 0.12);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const cupcake: Icon = (ctx, cx, cy, s) => {
  // A fluted cup under a swirl of frosting with a cherry on top.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.36, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.26, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.26, cy + s * 0.48);
  ctx.closePath();
  oval(ctx, cx, cy + s * 0.02, s * 0.42, s * 0.14);
  oval(ctx, cx, cy - s * 0.16, s * 0.32, s * 0.14);
  oval(ctx, cx, cy - s * 0.32, s * 0.2, s * 0.11);
  circle(ctx, cx, cy - s * 0.48, s * 0.09);
  ctx.fill();
};

export const key: Icon = (ctx, cx, cy, s) => {
  // An old key lying on its side: a heart-shaped bow with a hole, a thick shaft and two chunky
  // teeth hanging from its end (one bold silhouette, so it reads at a dozen pixels).
  const y = cy + s * 0.02;
  ctx.beginPath();
  heartPath(ctx, cx - s * 0.24, y, s * 0.64);
  circle(ctx, cx - s * 0.24, y - s * 0.03, s * 0.1);
  ctx.rect(cx - s * 0.04, y - s * 0.12, s * 0.56, s * 0.24);
  ctx.rect(cx + s * 0.34, y + s * 0.1, s * 0.18, s * 0.22);
  ctx.rect(cx + s * 0.1, y + s * 0.1, s * 0.14, s * 0.16);
  ctx.fill("evenodd");
};

export const diamond: Icon = (ctx, cx, cy, s) => {
  // A cut stone: a flat table, the crown's sloping sides, the pavilion coming to a point; the
  // facets stroked across it.
  const lw = ctx.lineWidth;
  const y = cy - s * 0.02;
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.26, y - s * 0.4);
  ctx.lineTo(cx + s * 0.26, y - s * 0.4);
  ctx.lineTo(cx + s * 0.5, y - s * 0.1);
  ctx.lineTo(cx, y + s * 0.46);
  ctx.lineTo(cx - s * 0.5, y - s * 0.1);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.5, y - s * 0.1);
  ctx.lineTo(cx + s * 0.5, y - s * 0.1);
  ctx.moveTo(cx - s * 0.26, y - s * 0.4);
  ctx.lineTo(cx - s * 0.2, y - s * 0.1);
  ctx.lineTo(cx, y + s * 0.46);
  ctx.moveTo(cx + s * 0.26, y - s * 0.4);
  ctx.lineTo(cx + s * 0.2, y - s * 0.1);
  ctx.lineTo(cx, y + s * 0.46);
  ctx.stroke();
  ctx.lineWidth = lw;
};

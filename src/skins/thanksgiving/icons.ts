import { circle, oval, type Ctx } from "../../neon/draw";
import type { Icon } from "../skin";
import { MAPLE } from "./leaves";

// Neon line-art harvest symbols for the bars. Each is designed in unit space (about -0.5..0.5,
// y down) and stroked in one path with the bar's current style; small details like seeds and
// grapes are tiny segments in the same path, which the round line caps turn into solid dots.
// Bars are only ~20px tall on a phone, so every shape is a bold, simple silhouette.

// A tiny pen that maps unit space onto the screen. Icons run a few hundred times a frame, and
// a save/translate/scale/restore per icon costs more than the drawing itself.
let ox = 0;
let oy = 0;
let k = 1;
let rc = 1;
let rs = 0;
let ra = 0;
const X = (x: number, y: number) => ox + (x * rc - y * rs) * k;
const Y = (x: number, y: number) => oy + (x * rs + y * rc) * k;
const M = (ctx: Ctx, x: number, y: number) => ctx.moveTo(X(x, y), Y(x, y));
const L = (ctx: Ctx, x: number, y: number) => ctx.lineTo(X(x, y), Y(x, y));
const Q = (ctx: Ctx, cx: number, cy: number, x: number, y: number) =>
  ctx.quadraticCurveTo(X(cx, cy), Y(cx, cy), X(x, y), Y(x, y));
const B = (ctx: Ctx, ax: number, ay: number, bx: number, by: number, x: number, y: number) =>
  ctx.bezierCurveTo(X(ax, ay), Y(ax, ay), X(bx, by), Y(bx, by), X(x, y), Y(x, y));
const CIRCLE = (ctx: Ctx, x: number, y: number, r: number) => circle(ctx, X(x, y), Y(x, y), r * k);
const OVAL = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) =>
  oval(ctx, X(x, y), Y(x, y), rx * k, ry * k, rot + ra);
/** A seed or glint: a very short segment that the round line cap turns into a solid dot. */
const DOT = (ctx: Ctx, x: number, y: number) => {
  M(ctx, x - 0.012, y);
  L(ctx, x + 0.012, y);
};

function icon(build: (ctx: Ctx) => void, rotation = 0): Icon {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return (ctx, cx, cy, size) => {
    ox = cx;
    oy = cy;
    k = size;
    rc = c;
    rs = s;
    ra = rotation;
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
  };
}

// Constant detail positions, hoisted so drawing icons allocates nothing per frame.
const CORN_ROWS = [-0.3, -0.16, -0.02, 0.12] as const;
const PI = Math.PI;

/**
 * Turkey in profile, facing right: a scalloped tail fan spread behind a round body, the neck
 * rising to a small head with a beak and a dangling wattle, two legs. The lopsided outline
 * (big fan, small head) keeps it a turkey even at bar size.
 */
const FAN_X = -0.13;
const FAN_Y = 0.07;
const FAN_FROM = 0.78 * PI; // lower left, round over the top ...
const FAN_TO = 1.66 * PI; // ... to just short of the head
const FAN_N = 5;
export const turkey = icon((ctx) => {
  const step = (FAN_TO - FAN_FROM) / FAN_N;
  const R = 0.32; // feather joints
  const C = 0.5; // bump control radius: tips reach about 0.42
  const r = 0.17; // where the feathers meet behind the body
  const at = (a: number, rad: number, fn: typeof M) => fn(ctx, FAN_X + Math.cos(a) * rad, FAN_Y + Math.sin(a) * rad);
  at(FAN_FROM, r, M);
  at(FAN_FROM, R, L);
  for (let i = 0; i < FAN_N; i++) {
    const am = FAN_FROM + step * (i + 0.5);
    const a1 = FAN_FROM + step * (i + 1);
    Q(ctx, FAN_X + Math.cos(am) * C, FAN_Y + Math.sin(am) * C, FAN_X + Math.cos(a1) * R, FAN_Y + Math.sin(a1) * R);
  }
  at(FAN_TO, r, L);
  for (let i = 1; i < FAN_N; i++) {
    at(FAN_FROM + step * i, r, M);
    at(FAN_FROM + step * i, R, L);
  }
  // Body with a folded wing
  OVAL(ctx, 0.05, 0.17, 0.25, 0.19);
  M(ctx, -0.1, 0.12);
  Q(ctx, 0.04, 0.04, 0.16, 0.2);
  // Neck, head, beak, wattle
  M(ctx, 0.22, 0.06);
  Q(ctx, 0.3, -0.04, 0.27, -0.17);
  CIRCLE(ctx, 0.29, -0.24, 0.07);
  M(ctx, 0.35, -0.27);
  L(ctx, 0.45, -0.23);
  L(ctx, 0.35, -0.2);
  M(ctx, 0.35, -0.2);
  Q(ctx, 0.38, -0.12, 0.34, -0.08);
  // Legs
  M(ctx, 0.0, 0.35);
  L(ctx, -0.02, 0.48);
  M(ctx, 0.12, 0.35);
  L(ctx, 0.14, 0.48);
});

/** Maple leaf from the shared outline, with a midrib and stem. */
export const mapleLeaf = icon((ctx) => {
  const s = 1.02;
  for (let i = 0; i < MAPLE.length; i += 2) {
    const x = MAPLE[i]! * s;
    const y = MAPLE[i + 1]! * s - 0.03;
    if (i === 0) M(ctx, x, y);
    else L(ctx, x, y);
  }
  ctx.closePath();
  M(ctx, 0, 0.48);
  L(ctx, 0, -0.22);
});

/** Corn cob with a kernel grid and two husk leaves, tilted. */
export const corn = icon((ctx) => {
  OVAL(ctx, 0, -0.1, 0.15, 0.36);
  for (const y of CORN_ROWS) {
    const hw = 0.15 * Math.sqrt(Math.max(0, 1 - ((y + 0.1) / 0.36) ** 2));
    M(ctx, -hw, y);
    L(ctx, hw, y);
  }
  M(ctx, 0, -0.44);
  L(ctx, 0, 0.24);
  M(ctx, 0, 0.5);
  Q(ctx, -0.3, 0.3, -0.24, -0.06);
  Q(ctx, -0.1, 0.14, 0, 0.5);
  M(ctx, 0, 0.5);
  Q(ctx, 0.3, 0.3, 0.24, -0.06);
  Q(ctx, 0.1, 0.14, 0, 0.5);
}, 0.45);

/** Wedge of pie in three-quarter view: top face, crust, side, a dollop of cream. */
export const pie = icon((ctx) => {
  M(ctx, -0.52, 0.06);
  L(ctx, 0.2, -0.3);
  Q(ctx, 0.44, -0.24, 0.48, -0.02);
  ctx.closePath();
  M(ctx, -0.52, 0.06);
  L(ctx, -0.52, 0.3);
  L(ctx, 0.48, 0.24);
  L(ctx, 0.48, -0.02);
  M(ctx, 0.48, 0.1);
  L(ctx, -0.52, 0.17);
  CIRCLE(ctx, 0.12, -0.2, 0.09);
});

/** Pumpkin: ribbed body, stem, curl of vine. */
export const pumpkin = icon((ctx) => {
  OVAL(ctx, 0, 0.1, 0.48, 0.34);
  OVAL(ctx, 0, 0.1, 0.19, 0.34);
  M(ctx, -0.04, -0.23);
  L(ctx, -0.02, -0.44);
  L(ctx, 0.09, -0.42);
  L(ctx, 0.05, -0.23);
  M(ctx, 0.08, -0.36);
  Q(ctx, 0.3, -0.5, 0.34, -0.32);
});

/** Three cranberries with glints, and a sprig. */
export const cranberry = icon((ctx) => {
  CIRCLE(ctx, -0.2, 0.2, 0.19);
  CIRCLE(ctx, 0.2, 0.2, 0.19);
  CIRCLE(ctx, 0, -0.1, 0.19);
  M(ctx, 0, -0.29);
  L(ctx, 0.06, -0.44);
  M(ctx, 0.04, -0.4);
  Q(ctx, 0.26, -0.52, 0.36, -0.36);
  Q(ctx, 0.2, -0.3, 0.04, -0.4);
  DOT(ctx, -0.26, 0.13);
  DOT(ctx, 0.14, 0.13);
  DOT(ctx, -0.06, -0.17);
});

/** Ear of wheat on a slanted stalk: paired kernels up both sides, long awns off the top, a leaf. */
const WHEAT_KERNELS = 5;
export const wheat = icon((ctx) => {
  const x0 = -0.26;
  const y0 = 0.5;
  const dx = 0.48;
  const dy = -0.9;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  M(ctx, x0, y0);
  L(ctx, x0 + dx, y0 + dy);
  const w = 0.12;
  for (let i = 0; i < WHEAT_KERNELS; i++) {
    const f = 0.32 + (i / WHEAT_KERNELS) * 0.6;
    const px = x0 + dx * f;
    const py = y0 + dy * f;
    M(ctx, px - uy * w + ux * w * 0.9, py + ux * w + uy * w * 0.9);
    L(ctx, px, py);
    L(ctx, px + uy * w + ux * w * 0.9, py - ux * w + uy * w * 0.9);
  }
  // Awns
  const tx = x0 + dx * 0.9;
  const ty = y0 + dy * 0.9;
  M(ctx, tx - uy * 0.07, ty + ux * 0.07);
  L(ctx, tx - uy * 0.07 + ux * 0.2 - 0.05, ty + ux * 0.07 + uy * 0.2);
  M(ctx, tx + uy * 0.07, ty - ux * 0.07);
  L(ctx, tx + uy * 0.07 + ux * 0.2 + 0.06, ty - ux * 0.07 + uy * 0.2);
  // Leaf curling off the stalk
  M(ctx, x0 + dx * 0.16, y0 + dy * 0.16);
  Q(ctx, 0.08, 0.3, 0.26, 0.4);
});

/** Pilgrim hat: tall crown, wide brim, band and buckle. */
export const pilgrimHat = icon((ctx) => {
  M(ctx, -0.26, 0.22);
  L(ctx, -0.2, -0.42);
  L(ctx, 0.2, -0.42);
  L(ctx, 0.26, 0.22);
  OVAL(ctx, 0, 0.27, 0.52, 0.12);
  M(ctx, -0.24, 0.0);
  L(ctx, 0.24, 0.0);
  M(ctx, -0.12, -0.06);
  L(ctx, 0.12, -0.06);
  L(ctx, 0.12, 0.16);
  L(ctx, -0.12, 0.16);
  ctx.closePath();
});

/** Apple with a stem, a leaf and a highlight. */
export const apple = icon((ctx) => {
  M(ctx, 0, -0.24);
  B(ctx, -0.16, -0.38, -0.46, -0.3, -0.44, 0.02);
  B(ctx, -0.42, 0.32, -0.2, 0.48, -0.1, 0.43);
  Q(ctx, 0, 0.39, 0.1, 0.43);
  B(ctx, 0.2, 0.48, 0.42, 0.32, 0.44, 0.02);
  B(ctx, 0.46, -0.3, 0.16, -0.38, 0, -0.24);
  ctx.closePath();
  M(ctx, 0, -0.24);
  Q(ctx, 0.0, -0.4, 0.07, -0.48);
  M(ctx, 0.04, -0.38);
  Q(ctx, 0.22, -0.52, 0.34, -0.4);
  Q(ctx, 0.2, -0.3, 0.04, -0.38);
  M(ctx, -0.3, -0.04);
  Q(ctx, -0.3, 0.14, -0.2, 0.24);
});

/** Bottle gourd: small neck bulb, big base bulb, curly stem, two ribs. */
export const gourd = icon((ctx) => {
  M(ctx, 0, -0.36);
  B(ctx, -0.16, -0.36, -0.16, -0.1, -0.2, -0.02);
  B(ctx, -0.46, 0.16, -0.38, 0.48, 0, 0.48);
  B(ctx, 0.38, 0.48, 0.46, 0.16, 0.2, -0.02);
  B(ctx, 0.16, -0.1, 0.16, -0.36, 0, -0.36);
  ctx.closePath();
  M(ctx, 0, -0.36);
  Q(ctx, 0.02, -0.5, 0.18, -0.48);
  M(ctx, -0.07, -0.08);
  Q(ctx, -0.2, 0.2, -0.1, 0.46);
  M(ctx, 0.07, -0.08);
  Q(ctx, 0.2, 0.2, 0.1, 0.46);
});

/** Acorn: textured cap, pointed nut, stem. */
export const acorn = icon((ctx) => {
  M(ctx, -0.36, -0.06);
  Q(ctx, -0.34, -0.38, 0, -0.38);
  Q(ctx, 0.34, -0.38, 0.36, -0.06);
  ctx.closePath();
  M(ctx, -0.28, -0.06);
  B(ctx, -0.3, 0.3, -0.06, 0.42, 0, 0.5);
  B(ctx, 0.06, 0.42, 0.3, 0.3, 0.28, -0.06);
  M(ctx, 0, -0.38);
  L(ctx, 0.05, -0.5);
  M(ctx, -0.26, -0.2);
  L(ctx, -0.1, -0.06);
  M(ctx, -0.08, -0.34);
  L(ctx, 0.18, -0.06);
  M(ctx, 0.14, -0.36);
  L(ctx, 0.32, -0.16);
});

/** Horn of plenty: a wicker horn rising to a curled tip, fruit spilling from its open mouth. */
export const cornucopia = icon((ctx) => {
  // Horn: mouth at the lower right, tip curling over at the upper left.
  M(ctx, 0.1, -0.16);
  Q(ctx, -0.22, -0.12, -0.38, -0.34);
  Q(ctx, -0.5, -0.5, -0.3, -0.48);
  M(ctx, -0.38, -0.34);
  Q(ctx, -0.3, 0.12, 0.14, 0.34);
  OVAL(ctx, 0.13, 0.09, 0.09, 0.26, -0.15);
  // One wicker band
  M(ctx, -0.1, -0.15);
  Q(ctx, -0.17, 0.04, -0.07, 0.22);
  // An apple with a leaf tumbling out of the mouth
  CIRCLE(ctx, 0.34, 0.25, 0.14);
  M(ctx, 0.34, 0.11);
  L(ctx, 0.36, 0.03);
  M(ctx, 0.36, 0.06);
  Q(ctx, 0.44, -0.06, 0.5, 0.02);
  Q(ctx, 0.44, 0.09, 0.36, 0.06);
});

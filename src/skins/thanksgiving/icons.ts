import { circle, oval, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";
import { MAPLE } from "./leaves";

// Harvest symbols inked on the bars. The base bar sets the ink color and line width; each icon
// is designed in unit space (about -0.5..0.5, y down). On a phone a bar is only ~20px tall, so
// an icon is ~12px with ~1.5px lines: every shape is a bold, simple silhouette with only a few
// strokes, kept at least ~0.2 units apart so they don't run together. A few small parts (an
// acorn cap, a hat band, a turkey's body) are filled solid for contrast.

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

/**
 * An icon from a stroked part and an optional filled part (drawn first, as its own path).
 * `rotation` turns the whole design.
 */
function icon(stroke: (ctx: Ctx) => void, fill?: (ctx: Ctx) => void, rotation = 0): Icon {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return (ctx, cx, cy, size) => {
    ox = cx;
    oy = cy;
    k = size;
    rc = c;
    rs = s;
    ra = rotation;
    if (fill) {
      ctx.beginPath();
      fill(ctx);
      ctx.fill();
    }
    ctx.beginPath();
    stroke(ctx);
    ctx.stroke();
  };
}

const PI = Math.PI;

/**
 * Turkey seen from the front, the classic harvest badge: a solid scalloped tail fan spread
 * behind it, a pear-shaped body and head standing in a thin gap cut out of the fan (so the two
 * read apart even at bar size), and two legs.
 */
const FAN_CY = 0.16;
const FAN_R = 0.5;
const FAN_N = 5;
const FAN_GAP = 0.08;
/** The body-and-head pear: head top, neck, belly bottom. Its widest point sits on the fan's foot,
 * so the fan arcs well clear above the little head. */
const PEAR_TOP = -0.13;
const PEAR_W = 0.2;
const NECK_X = 0.065;
const NECK_Y = 0.065;
const PEAR_BOTTOM = 0.42;

/** Upper pear, grown by g: from its widest point on one side over the head to the other side,
 * `side` 1 starting on the right (counter-clockwise), -1 on the left (clockwise). */
function pearTop(ctx: Ctx, g: number, side: number): void {
  const k = side;
  M(ctx, k * (PEAR_W + g), FAN_CY);
  B(ctx, k * (PEAR_W + g), 0.1, k * (0.12 + g), NECK_Y + 0.015, k * (NECK_X + g), NECK_Y);
  B(ctx, k * (0.14 + g), 0.03, k * (0.15 + g), PEAR_TOP - g, 0, PEAR_TOP - g);
  B(ctx, -k * (0.15 + g), PEAR_TOP - g, -k * (0.14 + g), 0.03, -k * (NECK_X + g), NECK_Y);
  B(ctx, -k * (0.12 + g), NECK_Y + 0.015, -k * (PEAR_W + g), 0.1, -k * (PEAR_W + g), FAN_CY);
}

export const turkey = icon(
  (ctx) => {
    // Legs with a toe each
    M(ctx, -0.08, 0.42);
    L(ctx, -0.1, 0.5);
    L(ctx, -0.18, 0.52);
    M(ctx, 0.08, 0.42);
    L(ctx, 0.1, 0.5);
    L(ctx, 0.18, 0.52);
  },
  (ctx) => {
    // The fan, clockwise: scallops over the top, closed along its foot.
    const step = PI / FAN_N;
    M(ctx, -FAN_R, FAN_CY);
    for (let i = 0; i < FAN_N; i++) {
      const am = PI + step * (i + 0.5);
      const a1 = PI + step * (i + 1);
      Q(ctx, Math.cos(am) * FAN_R * 1.24, FAN_CY + Math.sin(am) * FAN_R * 1.24, Math.cos(a1) * FAN_R, FAN_CY + Math.sin(a1) * FAN_R);
    }
    ctx.closePath();
    // Cut the gap out of the fan (wound the other way, and only above its foot)...
    pearTop(ctx, FAN_GAP, 1);
    ctx.closePath();
    // ...then the bird, clockwise: over the head, then round the belly.
    pearTop(ctx, 0, -1);
    B(ctx, PEAR_W, 0.32, 0.12, PEAR_BOTTOM, 0, PEAR_BOTTOM);
    B(ctx, -0.12, PEAR_BOTTOM, -PEAR_W, 0.32, -PEAR_W, FAN_CY);
    ctx.closePath();
  },
);

/** Maple leaf from the shared outline, with a stem. */
export const mapleLeaf = icon((ctx) => {
  const s = 1.04;
  for (let i = 0; i < MAPLE.length; i += 2) {
    const x = MAPLE[i]! * s;
    const y = MAPLE[i + 1]! * s - 0.04;
    if (i === 0) M(ctx, x, y);
    else L(ctx, x, y);
  }
  ctx.closePath();
  M(ctx, 0, 0.5);
  L(ctx, 0, 0.0);
});

/** Corn cob, tilted: a kernel grid on the cob, two solid husk leaves peeling from its foot. */
export const corn = icon(
  (ctx) => {
    OVAL(ctx, 0, -0.12, 0.18, 0.36);
    M(ctx, 0, -0.42);
    L(ctx, 0, 0.18);
    M(ctx, -0.16, -0.2);
    L(ctx, 0.16, -0.2);
    M(ctx, -0.17, 0.02);
    L(ctx, 0.17, 0.02);
  },
  (ctx) => {
    M(ctx, 0, 0.5);
    Q(ctx, -0.2, 0.42, -0.38, 0.0);
    Q(ctx, -0.12, 0.16, 0, 0.5);
    ctx.closePath();
    M(ctx, 0, 0.5);
    Q(ctx, 0.12, 0.16, 0.38, 0.0);
    Q(ctx, 0.2, 0.42, 0, 0.5);
    ctx.closePath();
  },
  0.4,
);

/** Wedge of pie: top face, crust edge, side, and a dollop of cream. */
export const pie = icon(
  (ctx) => {
    M(ctx, -0.5, 0.08);
    L(ctx, 0.2, -0.28);
    Q(ctx, 0.46, -0.22, 0.5, 0.0);
    ctx.closePath();
    M(ctx, -0.5, 0.08);
    L(ctx, -0.5, 0.32);
    L(ctx, 0.5, 0.26);
    L(ctx, 0.5, 0.0);
  },
  (ctx) => {
    CIRCLE(ctx, 0.12, -0.13, 0.1);
  },
);

/** Pumpkin: two ribs, a solid stem. */
export const pumpkin = icon(
  (ctx) => {
    OVAL(ctx, 0, 0.1, 0.48, 0.34);
    OVAL(ctx, 0, 0.1, 0.17, 0.34);
  },
  (ctx) => {
    M(ctx, -0.07, -0.22);
    L(ctx, -0.04, -0.46);
    L(ctx, 0.1, -0.44);
    L(ctx, 0.07, -0.22);
    ctx.closePath();
  },
);

/** Three cranberries and a leaf. */
export const cranberry = icon(
  (ctx) => {
    CIRCLE(ctx, -0.21, 0.22, 0.2);
    CIRCLE(ctx, 0.21, 0.22, 0.2);
    CIRCLE(ctx, 0, -0.12, 0.2);
  },
  (ctx) => {
    M(ctx, 0.04, -0.36);
    Q(ctx, 0.26, -0.56, 0.44, -0.4);
    Q(ctx, 0.24, -0.26, 0.04, -0.36);
    ctx.closePath();
  },
);

/** Ear of wheat on a slanted stalk: three pairs of kernels and an awn. */
const WHEAT_KERNELS = 3;
export const wheat = icon(
  (ctx) => {
    M(ctx, 0, 0.5);
    L(ctx, 0, -0.5);
    for (let i = 0; i < WHEAT_KERNELS; i++) {
      const y = -0.28 + i * 0.22;
      M(ctx, -0.2, y - 0.1);
      L(ctx, 0, y + 0.04);
      L(ctx, 0.2, y - 0.1);
    }
  },
  undefined,
  0.4,
);

/** Pilgrim hat: tall crown, wide brim, a solid band with a buckle gap. */
export const pilgrimHat = icon(
  (ctx) => {
    M(ctx, -0.26, 0.24);
    L(ctx, -0.2, -0.42);
    L(ctx, 0.2, -0.42);
    L(ctx, 0.26, 0.24);
    OVAL(ctx, 0, 0.3, 0.52, 0.12);
  },
  (ctx) => {
    // Band, with a square hole for the buckle (opposite winding)
    M(ctx, -0.24, -0.04);
    L(ctx, 0.24, -0.04);
    L(ctx, 0.25, 0.16);
    L(ctx, -0.25, 0.16);
    ctx.closePath();
    M(ctx, -0.07, 0.01);
    L(ctx, -0.07, 0.11);
    L(ctx, 0.07, 0.11);
    L(ctx, 0.07, 0.01);
    ctx.closePath();
  },
);

/** Apple with a stem and a solid leaf. */
export const apple = icon(
  (ctx) => {
    M(ctx, 0, -0.24);
    B(ctx, -0.16, -0.38, -0.46, -0.3, -0.44, 0.04);
    B(ctx, -0.42, 0.34, -0.2, 0.48, -0.1, 0.44);
    Q(ctx, 0, 0.4, 0.1, 0.44);
    B(ctx, 0.2, 0.48, 0.42, 0.34, 0.44, 0.04);
    B(ctx, 0.46, -0.3, 0.16, -0.38, 0, -0.24);
    ctx.closePath();
    M(ctx, 0, -0.24);
    Q(ctx, 0.0, -0.38, -0.06, -0.48);
  },
  (ctx) => {
    M(ctx, 0.04, -0.34);
    Q(ctx, 0.22, -0.54, 0.4, -0.42);
    Q(ctx, 0.22, -0.26, 0.04, -0.34);
    ctx.closePath();
  },
);

/** Crookneck gourd: a round bulb, a neck curling over at the top, stripes down the bulb. */
export const gourd = icon((ctx) => {
  M(ctx, -0.28, 0.24);
  B(ctx, -0.3, 0.52, 0.3, 0.52, 0.28, 0.24);
  B(ctx, 0.27, 0.06, 0.1, 0.0, 0.09, -0.16);
  Q(ctx, 0.1, -0.32, 0.24, -0.36);
  Q(ctx, 0.32, -0.44, 0.2, -0.47);
  Q(ctx, -0.06, -0.44, -0.09, -0.16);
  B(ctx, -0.1, 0.0, -0.27, 0.06, -0.28, 0.24);
  ctx.closePath();
  M(ctx, 0.25, -0.46);
  L(ctx, 0.36, -0.52);
  M(ctx, -0.1, 0.12);
  Q(ctx, -0.16, 0.28, -0.08, 0.42);
  M(ctx, 0.1, 0.12);
  Q(ctx, 0.16, 0.28, 0.08, 0.42);
});

/** Acorn: a solid cap with its stalk, and the pointed nut below. */
export const acorn = icon(
  (ctx) => {
    M(ctx, -0.27, -0.06);
    B(ctx, -0.3, 0.3, -0.06, 0.42, 0, 0.5);
    B(ctx, 0.06, 0.42, 0.3, 0.3, 0.27, -0.06);
    M(ctx, 0, -0.36);
    L(ctx, 0.06, -0.5);
  },
  (ctx) => {
    M(ctx, -0.38, -0.02);
    Q(ctx, -0.36, -0.38, 0, -0.38);
    Q(ctx, 0.36, -0.38, 0.38, -0.02);
    ctx.closePath();
  },
);

/**
 * Cornucopia: a solid horn swelling from a curled tip on the left to its open mouth on the
 * right, with grapes and an apple spilling out of the mouth.
 */
export const cornucopia = icon(
  (ctx) => {
    // The rim of the mouth, and an apple with its stalk rolling out of it
    OVAL(ctx, 0.12, 0.0, 0.1, 0.26);
    CIRCLE(ctx, 0.36, 0.17, 0.13);
    M(ctx, 0.37, 0.04);
    L(ctx, 0.42, -0.04);
  },
  (ctx) => {
    // A bunch of grapes spilling over the rim
    CIRCLE(ctx, 0.28, -0.2, 0.075);
    CIRCLE(ctx, 0.43, -0.19, 0.075);
    CIRCLE(ctx, 0.355, -0.32, 0.075);
    M(ctx, 0.12, -0.26);
    Q(ctx, -0.2, -0.2, -0.34, 0.06);
    Q(ctx, -0.4, 0.14, -0.5, 0.0);
    Q(ctx, -0.52, 0.22, -0.34, 0.24);
    Q(ctx, -0.12, 0.28, 0.12, 0.26);
    ctx.closePath();
  },
);

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

/** Turkey, front on: a big scalloped tail fan arching over a solid round body and head, two feet. */
const FAN_CY = 0.26;
const FAN_R = 0.42;
const FAN_N = 5;
export const turkey = icon(
  (ctx) => {
    const step = PI / FAN_N;
    M(ctx, -FAN_R, FAN_CY);
    for (let i = 0; i < FAN_N; i++) {
      const am = PI + step * (i + 0.5);
      const a1 = PI + step * (i + 1);
      const C = FAN_R * 1.42;
      Q(ctx, Math.cos(am) * C, FAN_CY + Math.sin(am) * C, Math.cos(a1) * FAN_R, FAN_CY + Math.sin(a1) * FAN_R);
    }
    // Feet
    M(ctx, -0.08, 0.44);
    L(ctx, -0.1, 0.53);
    M(ctx, 0.08, 0.44);
    L(ctx, 0.1, 0.53);
  },
  (ctx) => {
    OVAL(ctx, 0, 0.3, 0.2, 0.17);
    CIRCLE(ctx, 0, 0.03, 0.1);
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

/** Corn cob, tilted, with a kernel grid and two husk leaves peeling away from its foot. */
export const corn = icon(
  (ctx) => {
    OVAL(ctx, 0, -0.14, 0.17, 0.36);
    M(ctx, 0, -0.46);
    L(ctx, 0, 0.18);
    M(ctx, -0.16, -0.24);
    L(ctx, 0.16, -0.24);
    M(ctx, -0.15, 0.0);
    L(ctx, 0.15, 0.0);
    // Husks
    M(ctx, 0, 0.5);
    Q(ctx, -0.16, 0.42, -0.4, 0.06);
    Q(ctx, -0.16, 0.24, 0, 0.5);
    M(ctx, 0, 0.5);
    Q(ctx, 0.16, 0.42, 0.4, 0.06);
    Q(ctx, 0.16, 0.24, 0, 0.5);
  },
  undefined,
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

// Horn of plenty: a horn along a curved spine (a quadratic from the mouth to the tip), widest at
// the open mouth on the right and tapering to a tip that turns up at the left.
const HORN_SPINE = [0.1, -0.02, -0.3, 0.14, -0.5, -0.16] as const;
const HORN_R = 0.24;
/** The mouth faces along the spine's start. */
const HORN_ROT = Math.atan2(HORN_SPINE[3] - HORN_SPINE[1], HORN_SPINE[2] - HORN_SPINE[0]);
const HORN = hornOutline();

/** The horn's open outline, built once: along one side from the mouth to the tip, back along the other. */
function hornOutline(): number[] {
  const [x0, y0, x1, y1, x2, y2] = HORN_SPINE;
  const N = 10;
  const side: number[] = [];
  const other: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * x1 + t * t * x2;
    const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * y1 + t * t * y2;
    const dx = (1 - t) * (x1 - x0) + t * (x2 - x1);
    const dy = (1 - t) * (y1 - y0) + t * (y2 - y1);
    const w = (HORN_R * Math.pow(1 - t, 0.85) + 0.012) / Math.hypot(dx, dy);
    side.push(x - dy * w, y + dx * w);
    other.push(x + dy * w, y - dx * w);
  }
  for (let i = other.length - 2; i >= 0; i -= 2) side.push(other[i]!, other[i + 1]!);
  return side;
}

/** Cornucopia: the horn, its open mouth, and two fruits spilling out. */
export const cornucopia = icon(
  (ctx) => {
    for (let i = 0; i < HORN.length; i += 2) {
      if (i === 0) M(ctx, HORN[i]!, HORN[i + 1]!);
      else L(ctx, HORN[i]!, HORN[i + 1]!);
    }
    OVAL(ctx, HORN_SPINE[0], HORN_SPINE[1], 0.08, HORN_R, HORN_ROT);
  },
  (ctx) => {
    CIRCLE(ctx, 0.36, 0.12, 0.14);
    CIRCLE(ctx, 0.34, -0.2, 0.09);
  },
);

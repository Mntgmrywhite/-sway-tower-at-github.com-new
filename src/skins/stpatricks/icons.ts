import { circle } from "../../base/draw";
import type { Icon } from "../skin";
import { pill, shamrockPath, stemPath } from "./shapes";

// Symbols for the St. Patrick's bars, our own simple glyphs: a shamrock, a harp, a trinity
// knot, a pot of gold, a horseshoe, a rainbow, a stack of gold coins, a fiddle, a bodhrán and
// its tipper, a top hat, a crowned heart and a triskele. Each draws one bold shape centered at
// (cx, cy), about `s` pixels tall, with the caller's ink style. In play `s` is only ~12 px, so
// they are chunky filled silhouettes with an occasional stroked detail; holes are cut with
// even-odd fills or by winding the other way, and every round part is its own subpath.
// Nothing is allocated: these run hundreds of times a frame (curves are precomputed).

const TAU = Math.PI * 2;

type Ctx = Parameters<Icon>[0];

export const shamrock: Icon = (ctx, cx, cy, s) => {
  const y = cy - s * 0.08;
  ctx.beginPath();
  shamrockPath(ctx, cx, y, s * 1.08);
  ctx.fill();
  ctx.beginPath();
  stemPath(ctx, cx, y, s * 1.05);
  ctx.stroke();
};

export const harp: Icon = (ctx, cx, cy, s) => {
  // A small harp facing left: a tapering soundbox rising to the right, a curved neck across
  // the top, a front pillar on the left, and three strings.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.01, cy + s * 0.48);
  ctx.lineTo(cx + s * 0.37, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.26, cy - s * 0.38);
  ctx.closePath();
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.3, s * 0.13);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.18, cy + s * 0.45);
  ctx.quadraticCurveTo(cx - s * 0.36, cy + s * 0.1, cx - s * 0.3, cy - s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.16, cy - s * 0.5, cx + s * 0.06, cy - s * 0.18, cx + s * 0.32, cy - s * 0.42);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.13, cy - s * 0.32);
  ctx.lineTo(cx - s * 0.13, cy + s * 0.4);
  ctx.moveTo(cx - s * 0.02, cy - s * 0.31);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.2);
  ctx.moveTo(cx + s * 0.09, cy - s * 0.33);
  ctx.lineTo(cx + s * 0.09, cy - s * 0.01);
  ctx.stroke();
  ctx.lineWidth = lw;
};

/** The trinity knot's three loops: unit directions of their points. */
const LOOPS = [0, 1, 2].map((i) => {
  const a = -Math.PI / 2 + (i * TAU) / 3;
  return [Math.cos(a), Math.sin(a)] as const;
});

export const knot: Icon = (ctx, cx, cy, s) => {
  // A trinity knot: three pointed loops through a ring, stroked.
  const y = cy + s * 0.04;
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.1, s * 0.1);
  ctx.beginPath();
  for (const [dx, dy] of LOOPS) {
    const ix = cx - dx * s * 0.13;
    const iy = y - dy * s * 0.13;
    const ox = cx + dx * s * 0.47;
    const oy = y + dy * s * 0.47;
    const mx = cx + dx * s * 0.17;
    const my = y + dy * s * 0.17;
    const px = -dy * s * 0.3;
    const py = dx * s * 0.3;
    ctx.moveTo(ix, iy);
    ctx.quadraticCurveTo(mx + px, my + py, ox, oy);
    ctx.quadraticCurveTo(mx - px, my - py, ix, iy);
  }
  circle(ctx, cx, y, s * 0.22);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const potOfGold: Icon = (ctx, cx, cy, s) => {
  // A round pot on two stubby legs under a thick rim, gold coins heaped over it. Every part
  // winds clockwise, so one nonzero fill unites them.
  ctx.beginPath();
  circle(ctx, cx - s * 0.2, cy - s * 0.2, s * 0.12);
  circle(ctx, cx + s * 0.02, cy - s * 0.29, s * 0.13);
  circle(ctx, cx + s * 0.22, cy - s * 0.19, s * 0.11);
  ctx.rect(cx - s * 0.43, cy - s * 0.13, s * 0.86, s * 0.12);
  ctx.moveTo(cx + s * 0.36, cy + s * 0.02);
  ctx.bezierCurveTo(cx + s * 0.47, cy + s * 0.3, cx + s * 0.24, cy + s * 0.4, cx, cy + s * 0.4);
  ctx.bezierCurveTo(cx - s * 0.24, cy + s * 0.4, cx - s * 0.47, cy + s * 0.3, cx - s * 0.36, cy + s * 0.02);
  ctx.closePath();
  ctx.rect(cx - s * 0.28, cy + s * 0.32, s * 0.1, s * 0.16);
  ctx.rect(cx + s * 0.18, cy + s * 0.32, s * 0.1, s * 0.16);
  ctx.fill();
};

/** Nail holes along the horseshoe: angles round its curve. */
const NAILS = [-0.12, 0.12, 0.88, 1.12].map((k) => [Math.cos(k * Math.PI), Math.sin(k * Math.PI)] as const);

export const horseshoe: Icon = (ctx, cx, cy, s) => {
  // Opening upward (for luck): a thick U whose arms rise high and turn in a little, nail
  // holes cut along both arms.
  const y = cy + s * 0.05;
  const rx = s * 0.38;
  const ry = s * 0.44;
  const w = s * 0.16;
  const a0 = -0.3 * Math.PI;
  const a1 = Math.PI - a0;
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, a0, a1);
  ctx.ellipse(cx, y, rx - w, ry - w, 0, a1, a0, true);
  ctx.closePath();
  for (const [c, sn] of NAILS) circle(ctx, cx + c * (rx - w / 2), y + sn * (ry - w / 2), s * 0.035);
  ctx.fill("evenodd");
};

/** One band of a rainbow: a half-ellipse ring standing on y, as its own subpath. */
function arch(ctx: Ctx, x: number, y: number, rx: number, ry: number, w: number): void {
  ctx.moveTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
  ctx.lineTo(x + rx - w, y);
  ctx.ellipse(x, y, rx - w, ry - w, 0, TAU, Math.PI, true);
  ctx.closePath();
}

export const rainbow: Icon = (ctx, cx, cy, s) => {
  // Three bands standing on a little cloud at each foot.
  const y = cy + s * 0.14;
  ctx.beginPath();
  arch(ctx, cx, y, s * 0.46, s * 0.5, s * 0.1);
  arch(ctx, cx, y, s * 0.32, s * 0.36, s * 0.09);
  arch(ctx, cx, y, s * 0.19, s * 0.23, s * 0.08);
  for (let m = -1; m <= 1; m += 2) {
    circle(ctx, cx + m * s * 0.4, y + s * 0.08, s * 0.11);
    circle(ctx, cx + m * s * 0.25, y + s * 0.06, s * 0.13);
    circle(ctx, cx + m * s * 0.12, y + s * 0.12, s * 0.08);
  }
  ctx.fill();
};

export const coins: Icon = (ctx, cx, cy, s) => {
  // A short, slightly uneven stack of gold coins seen edge-on (rounded at the ends, so they read
  // as coins and not as lines), and one standing beside it with a rim cut round its face.
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = cy + s * (0.31 - i * 0.18);
    pill(ctx, cx - s * (0.47 - (i % 2) * 0.05), y, s * 0.4, s * 0.14);
  }
  const x = cx + s * 0.21;
  const y = cy - s * 0.1;
  circle(ctx, x, y, s * 0.26);
  circle(ctx, x, y, s * 0.19);
  circle(ctx, x, y, s * 0.14);
  ctx.fill("evenodd");
};

/** The fiddle leans this far (radians, clockwise) and is drawn in its own upright frame. */
const FIDDLE_COS = Math.cos(0.6);
const FIDDLE_SIN = Math.sin(0.6);
/** Scratch origin and scale of the fiddle being drawn, so its helpers allocate nothing. */
const F = { cx: 0, cy: 0, s: 0 };
function fx(lx: number, ly: number): number {
  return F.cx + (lx * FIDDLE_COS - ly * FIDDLE_SIN) * F.s;
}
function fy(lx: number, ly: number): number {
  return F.cy + (lx * FIDDLE_SIN + ly * FIDDLE_COS) * F.s;
}
function fq(ctx: Ctx, ax: number, ay: number, bx: number, by: number): void {
  ctx.quadraticCurveTo(fx(ax, ay), fy(ax, ay), fx(bx, by), fy(bx, by));
}

/** The fiddle's outline, one side, top to bottom: [control x, y, end x, y] per curve (mirrored for the other side). */
const BOUTS = [
  [0.23, -0.2, 0.22, -0.06],
  [0.21, 0.03, 0.14, 0.06],
  [0.11, 0.1, 0.22, 0.18],
  [0.31, 0.28, 0.25, 0.4],
  [0.16, 0.5, 0, 0.5],
] as const;

export const fiddle: Icon = (ctx, cx, cy, s) => {
  // Leaning right: the body's two bouts and waist in one clockwise outline, the neck and the
  // round scroll, two f-holes wound the other way so they cut through, and the bow across it.
  F.cx = cx;
  F.cy = cy + s * 0.04;
  F.s = s;
  ctx.beginPath();
  ctx.moveTo(fx(0, -0.2), fy(0, -0.2));
  for (const [ax, ay, bx, by] of BOUTS) fq(ctx, ax, ay, bx, by);
  for (let i = BOUTS.length - 1; i >= 0; i--) {
    const [ax, ay] = BOUTS[i]!;
    const prev = i > 0 ? BOUTS[i - 1]! : null;
    fq(ctx, -ax, ay, prev ? -prev[2] : 0, prev ? prev[3] : -0.2);
  }
  ctx.closePath();
  ctx.moveTo(fx(-0.05, -0.56), fy(-0.05, -0.56));
  ctx.lineTo(fx(0.05, -0.56), fy(0.05, -0.56));
  ctx.lineTo(fx(0.05, -0.18), fy(0.05, -0.18));
  ctx.lineTo(fx(-0.05, -0.18), fy(-0.05, -0.18));
  ctx.closePath();
  circle(ctx, fx(0, -0.6), fy(0, -0.6), s * 0.075);
  for (let m = -1; m <= 1; m += 2) {
    const hx = fx(m * 0.1, 0.24);
    const hy = fy(m * 0.1, 0.24);
    ctx.moveTo(hx + s * 0.02, hy);
    ctx.ellipse(hx, hy, s * 0.024, s * 0.085, 0.6, 0, TAU, true);
  }
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(fx(-0.5, 0.2), fy(-0.5, 0.2));
  ctx.lineTo(fx(0.52, 0.02), fy(0.52, 0.02));
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const bodhran: Icon = (ctx, cx, cy, s) => {
  // The frame drum seen from above its rim: the wide, shallow frame, its skin cut out inside
  // the rim, and the tipper (a short stick with a knob at each end) resting across it.
  const x = cx - s * 0.03;
  const y = cy + s * 0.02;
  const rx = s * 0.44;
  const ry = s * 0.24;
  const d = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
  ctx.lineTo(x + rx, y + d);
  ctx.ellipse(x, y + d, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.moveTo(x + rx * 0.8, y);
  ctx.ellipse(x, y, rx * 0.8, ry * 0.7, 0, 0, TAU, true);
  ctx.fill();
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.2, s * 0.085);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.42);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  circle(ctx, cx - s * 0.13, cy + s * 0.07, s * 0.07);
  circle(ctx, cx + s * 0.33, cy - s * 0.43, s * 0.07);
  ctx.fill();
};

export const topHat: Icon = (ctx, cx, cy, s) => {
  // A tall crown flaring a little toward the top, a gap for its band, and a brim curling up
  // at both ends. Everything winds clockwise.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.28, cy - s * 0.38);
  ctx.quadraticCurveTo(cx, cy - s * 0.46, cx + s * 0.28, cy - s * 0.38);
  ctx.lineTo(cx + s * 0.246, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.246, cy + s * 0.05);
  ctx.closePath();
  ctx.rect(cx - s * 0.24, cy + s * 0.15, s * 0.48, s * 0.1);
  ctx.moveTo(cx - s * 0.47, cy + s * 0.18);
  ctx.quadraticCurveTo(cx, cy + s * 0.3, cx + s * 0.47, cy + s * 0.18);
  ctx.quadraticCurveTo(cx + s * 0.45, cy + s * 0.37, cx + s * 0.2, cy + s * 0.37);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.37);
  ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.37, cx - s * 0.47, cy + s * 0.18);
  ctx.closePath();
  ctx.fill();
};

/** A plump heart as its own subpath (wound clockwise), centered on (cx, cy), about s tall. */
function heartPath(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.bezierCurveTo(cx - s * 0.18, cy + s * 0.28, cx - s * 0.5, cy + s * 0.08, cx - s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx - s * 0.46, cy - s * 0.42, cx - s * 0.1, cy - s * 0.48, cx, cy - s * 0.24);
  ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.48, cx + s * 0.46, cy - s * 0.42, cx + s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.08, cx + s * 0.18, cy + s * 0.28, cx, cy + s * 0.45);
  ctx.closePath();
}

export const crownedHeart: Icon = (ctx, cx, cy, s) => {
  // A heart wearing a little three-pointed crown.
  ctx.beginPath();
  heartPath(ctx, cx, cy + s * 0.15, s * 0.72);
  const b = cy - s * 0.17;
  ctx.moveTo(cx - s * 0.19, b);
  ctx.lineTo(cx - s * 0.22, b - s * 0.24);
  ctx.lineTo(cx - s * 0.1, b - s * 0.12);
  ctx.lineTo(cx, b - s * 0.3);
  ctx.lineTo(cx + s * 0.1, b - s * 0.12);
  ctx.lineTo(cx + s * 0.22, b - s * 0.24);
  ctx.lineTo(cx + s * 0.19, b);
  ctx.closePath();
  ctx.fill();
};

/** The triskele's three arms as polylines in units of s: each spirals in round its own center. */
const ARM_POINTS = 14;
const TRISKELE = [0, 1, 2].map((k) => {
  const a = -Math.PI / 2 + (k * TAU) / 3;
  const ox = Math.cos(a) * 0.2;
  const oy = Math.sin(a) * 0.2;
  return Array.from({ length: ARM_POINTS + 1 }, (_, j) => {
    const t = j / ARM_POINTS;
    const th = a + Math.PI + t * 1.3 * TAU;
    const r = 0.2 * (1 - 0.78 * t);
    return [ox + Math.cos(th) * r, oy + Math.sin(th) * r] as const;
  });
});

export const triskele: Icon = (ctx, cx, cy, s) => {
  const y = cy + s * 0.03;
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(1.1, s * 0.1);
  ctx.beginPath();
  for (const arm of TRISKELE) {
    for (let j = 0; j < arm.length; j++) {
      const [px, py] = arm[j]!;
      if (j === 0) ctx.moveTo(cx + px * s, y + py * s);
      else ctx.lineTo(cx + px * s, y + py * s);
    }
  }
  ctx.stroke();
  ctx.lineWidth = lw;
};

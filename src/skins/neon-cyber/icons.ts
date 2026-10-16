import { circle, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";

// Cyber symbols for the bars. Bars are short, so every symbol is a bold silhouette: a few
// thick strokes with solid cores (pads, pupil, keyhole, chip die, packets), and wider than
// tall where that reads better. The neon bar calls each icon twice (soft glow, then the hot
// core) with the stroke and fill already set; icons only thicken the stroke a little and put
// it back. Most cores are drawn as tight stroked loops in the same path as the outline, so an
// icon costs one stroke; only the bolt, the blade, the mask's eye slits and the satellite's
// body need a fill too.

const BOLD = 1.45;
const TAU = Math.PI * 2;

/** Thicken the stroke for this icon; returns the width to put back. */
function thicken(ctx: Ctx): number {
  const lw = ctx.lineWidth;
  ctx.lineWidth = lw * BOLD;
  return lw;
}

/** A solid dot of radius `R` once the path is stroked `lw` wide: tight rings, no hole. */
function dot(ctx: Ctx, x: number, y: number, R: number, lw: number): void {
  let r = R - lw / 2;
  if (r <= 0.05) {
    ctx.moveTo(x + 0.05, y);
    ctx.arc(x, y, 0.05, 0, TAU);
    return;
  }
  for (; r > 0.05; r -= lw * 0.9) circle(ctx, x, y, r);
}

/** A solid square of half-size `R` once stroked `lw` wide. */
function block(ctx: Ctx, x: number, y: number, R: number, lw: number): void {
  for (let r = Math.max(0.05, R - lw / 2); r > 0.04; r -= lw * 0.9) ctx.rect(x - r, y - r, r * 2, r * 2);
}

// Two parallel board traces jogging up at 45 degrees: [y before the jog, x where it starts,
// rise], in s. Each runs from a solid pad on the left to a hollow via on the right.
const TRACES = [
  [-0.02, -0.2, 0.28],
  [0.32, 0.0, 0.28],
] as const;

/** A circuit board: two traces with a 45-degree jog, from solder pads to vias. */
export const circuit: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const w = ctx.lineWidth;
  ctx.beginPath();
  for (const [y, x, rise] of TRACES) {
    ctx.moveTo(cx - s * 0.5, cy + y * s);
    ctx.lineTo(cx + x * s, cy + y * s);
    ctx.lineTo(cx + (x + rise) * s, cy + (y - rise) * s);
    ctx.lineTo(cx + s * 0.5, cy + (y - rise) * s);
    block(ctx, cx - s * 0.6, cy + y * s, s * 0.1, w);
    circle(ctx, cx + s * 0.62, cy + (y - rise) * s, s * 0.12);
  }
  ctx.stroke();
  ctx.lineWidth = lw;
};

const PIN_OFFSETS = [-0.13, 0.13] as const;

/** A square die with pins on every side. */
export const chip: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const b = s * 0.3;
  ctx.beginPath();
  ctx.rect(cx - b, cy - b, b * 2, b * 2);
  for (const o of PIN_OFFSETS) {
    ctx.moveTo(cx + o * s, cy - b);
    ctx.lineTo(cx + o * s, cy - b - s * 0.16);
    ctx.moveTo(cx + o * s, cy + b);
    ctx.lineTo(cx + o * s, cy + b + s * 0.16);
    ctx.moveTo(cx - b, cy + o * s);
    ctx.lineTo(cx - b - s * 0.16, cy + o * s);
    ctx.moveTo(cx + b, cy + o * s);
    ctx.lineTo(cx + b + s * 0.16, cy + o * s);
  }
  block(ctx, cx, cy, s * 0.12, ctx.lineWidth);
  ctx.stroke();
  ctx.lineWidth = lw;
};

/** A watching eye: almond lids and a solid iris. */
export const eye: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.62, cy);
  ctx.quadraticCurveTo(cx, cy - s * 0.62, cx + s * 0.62, cy);
  ctx.quadraticCurveTo(cx, cy + s * 0.62, cx - s * 0.62, cy);
  ctx.closePath();
  dot(ctx, cx, cy, s * 0.2, ctx.lineWidth);
  ctx.stroke();
  ctx.lineWidth = lw;
};

/** A solid lightning bolt. */
export const lightning: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.16, cy - s * 0.52);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.52);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx, cy - s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = lw;
};

function hexPath(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A hex cell with a solid hex core. */
export const hex: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const w = ctx.lineWidth;
  ctx.beginPath();
  hexPath(ctx, cx, cy, s * 0.5);
  for (let r = Math.max(0.05, s * 0.2 - w / 2); r > 0.04; r -= w * 0.9) hexPath(ctx, cx, cy, r);
  ctx.stroke();
  ctx.lineWidth = lw;
};

// Rows of packets streaming right: [y, trail start, trail end, packet x], in s.
const STREAM = [
  [-0.34, -0.62, -0.18, 0.08],
  [0, -0.38, 0.12, 0.4],
  [0.34, -0.66, -0.3, -0.04],
] as const;

/** Data stream: packets racing right, each trailing a streak. */
export const dataStream: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const w = ctx.lineWidth;
  ctx.beginPath();
  for (const [y, a, b, p] of STREAM) {
    ctx.moveTo(cx + a * s, cy + y * s);
    ctx.lineTo(cx + b * s, cy + y * s);
    block(ctx, cx + p * s, cy + y * s, s * 0.11, w);
  }
  ctx.stroke();
  ctx.lineWidth = lw;
};

/** A padlock with a keyhole. */
export const lock: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.04);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.24);
  ctx.arc(cx, cy - s * 0.24, s * 0.2, Math.PI, 0);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.04);
  ctx.rect(cx - s * 0.34, cy - s * 0.04, s * 0.68, s * 0.52);
  // Keyhole: a round head over a short slot
  dot(ctx, cx, cy + s * 0.16, s * 0.08, ctx.lineWidth);
  ctx.moveTo(cx, cy + s * 0.16);
  ctx.lineTo(cx, cy + s * 0.32);
  ctx.stroke();
  ctx.lineWidth = lw;
};

const WAVES = [0.3, 0.5] as const;
const WAVE_SPAN = 0.3 * Math.PI;

/** A radio mast sending waves from its tip. */
export const antenna: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const tx = cx;
  const ty = cy - s * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy + s * 0.52);
  ctx.lineTo(tx, ty);
  ctx.lineTo(cx + s * 0.24, cy + s * 0.52);
  ctx.moveTo(cx - s * 0.13, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.13, cy + s * 0.2);
  for (const r of WAVES) {
    ctx.moveTo(tx + Math.cos(Math.PI - WAVE_SPAN) * r * s, ty + Math.sin(Math.PI - WAVE_SPAN) * r * s);
    ctx.arc(tx, ty, r * s, Math.PI - WAVE_SPAN, Math.PI + WAVE_SPAN);
    ctx.moveTo(tx + Math.cos(-WAVE_SPAN) * r * s, ty + Math.sin(-WAVE_SPAN) * r * s);
    ctx.arc(tx, ty, r * s, -WAVE_SPAN, WAVE_SPAN);
  }
  dot(ctx, tx, ty, s * 0.1, ctx.lineWidth);
  ctx.stroke();
  ctx.lineWidth = lw;
};

const SIDES = [-1, 1] as const;

/** A cyber skull mask: angular eye slits and a barred jaw. */
export const skullMask: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy + s * 0.08);
  ctx.arc(cx, cy - s * 0.06, s * 0.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.lineTo(cx + s * 0.38, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.26);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.26);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.07, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.07, cy + s * 0.46);
  ctx.moveTo(cx + s * 0.07, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.07, cy + s * 0.46);
  ctx.stroke();
  ctx.beginPath();
  for (const m of SIDES) {
    ctx.moveTo(cx + m * s * 0.32, cy - s * 0.1);
    ctx.lineTo(cx + m * s * 0.05, cy - s * 0.01);
    ctx.lineTo(cx + m * s * 0.07, cy + s * 0.12);
    ctx.lineTo(cx + m * s * 0.3, cy + s * 0.07);
    ctx.closePath();
  }
  ctx.fill();
  ctx.lineWidth = lw;
};

/** A katana-like blade: a long curved edge, a guard and a wrapped grip with a pommel. */
export const blade: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.04);
  ctx.quadraticCurveTo(cx + s * 0.32, cy + s * 0.02, cx + s * 0.78, cy - s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.36, cy + s * 0.18, cx - s * 0.2, cy + s * 0.2);
  ctx.closePath();
  // Guard and grip are bare lines in the same path: they stroke but add no fill.
  ctx.moveTo(cx - s * 0.26, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.26, cy + s * 0.34);
  ctx.moveTo(cx - s * 0.32, cy + s * 0.12);
  ctx.lineTo(cx - s * 0.78, cy + s * 0.2);
  circle(ctx, cx - s * 0.8, cy + s * 0.2, s * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = lw;
};

// Satellite parts in s, laid out level and then tilted once here: two open solar panels on
// struts either side of a solid body, and a dish on a short mast above it.
const SAT_TILT = -0.45;
const SAT_DY = 0.08; // drops the whole craft so the dish and panels sit centered
function tilt(x: number, y: number): [number, number] {
  const yy = y + SAT_DY;
  return [x * Math.cos(SAT_TILT) - yy * Math.sin(SAT_TILT), x * Math.sin(SAT_TILT) + yy * Math.cos(SAT_TILT)];
}
function quad(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [tilt(x0, y0), tilt(x1, y0), tilt(x1, y1), tilt(x0, y1)];
}
const SAT_PANELS = [quad(-0.8, -0.22, -0.3, 0.22), quad(0.3, -0.22, 0.8, 0.22)];
const SAT_BODY = quad(-0.15, -0.15, 0.15, 0.15);
const SAT_LINES = [
  [tilt(-0.3, 0), tilt(-0.15, 0)],
  [tilt(0.15, 0), tilt(0.3, 0)],
  [tilt(0, -0.15), tilt(0, -0.28)],
] as const;
// The dish: a bowl on the mast, opening up and away.
const SAT_DISH = tilt(0, -0.5);
const SAT_DISH_R = 0.22;
const SAT_DISH_A0 = SAT_TILT + Math.PI * 0.18;
const SAT_DISH_A1 = SAT_TILT + Math.PI * 0.82;

function poly(ctx: Ctx, cx: number, cy: number, s: number, pts: readonly (readonly [number, number])[]): void {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    if (i === 0) ctx.moveTo(cx + x * s, cy + y * s);
    else ctx.lineTo(cx + x * s, cy + y * s);
  }
  ctx.closePath();
}

/**
 * A satellite: two open solar panels on struts, a solid body and a dish on a mast. Drawn at
 * the bar's own stroke width (not thickened) so the panels stay open on short bars.
 */
export const satellite: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const p of SAT_PANELS) poly(ctx, cx, cy, s, p);
  for (const [[x0, y0], [x1, y1]] of SAT_LINES) {
    ctx.moveTo(cx + x0 * s, cy + y0 * s);
    ctx.lineTo(cx + x1 * s, cy + y1 * s);
  }
  const dx = cx + SAT_DISH[0] * s;
  const dy = cy + SAT_DISH[1] * s;
  ctx.moveTo(dx + Math.cos(SAT_DISH_A0) * s * SAT_DISH_R, dy + Math.sin(SAT_DISH_A0) * s * SAT_DISH_R);
  ctx.arc(dx, dy, s * SAT_DISH_R, SAT_DISH_A0, SAT_DISH_A1);
  poly(ctx, cx, cy, s, SAT_BODY);
  ctx.stroke();
  // The body is solid.
  ctx.beginPath();
  poly(ctx, cx, cy, s, SAT_BODY);
  ctx.fill();
};

const WIFI_RINGS = [0.3, 0.55, 0.8] as const;

/** Wireless: three widening arcs over a dot. */
export const wifi: Icon = (ctx, cx, cy, s) => {
  const lw = thicken(ctx);
  const oy = cy + s * 0.36;
  const a0 = -Math.PI * 0.76;
  const a1 = -Math.PI * 0.24;
  ctx.beginPath();
  for (const r of WIFI_RINGS) {
    ctx.moveTo(cx + Math.cos(a0) * r * s, oy + Math.sin(a0) * r * s);
    ctx.arc(cx, oy, r * s, a0, a1);
  }
  dot(ctx, cx, oy, s * 0.11, ctx.lineWidth);
  ctx.stroke();
  ctx.lineWidth = lw;
};

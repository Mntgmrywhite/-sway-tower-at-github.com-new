import { circle, oval, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";
import { TAU } from "./colors";

// Inked symbols for the bars. Each fits a box about `s` tall centered on (cx, cy) and only
// builds paths and strokes/fills them with the ink the bar has already set. On a phone they
// are drawn about 12 px tall, so each is one bold silhouette: solid shapes where a line would
// blur, no fine detail, and dots made by the stroke's round caps instead of extra fills.

/** A dot drawn by the stroke itself (the bar strokes with round caps). */
function dot(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.012, y);
}

/** Closed polygon from unit-space points. */
function poly(ctx: Ctx, pts: readonly (readonly [number, number])[], cx: number, cy: number, s: number): void {
  for (const [i, [x, y]] of pts.entries()) {
    if (i === 0) ctx.moveTo(cx + x * s, cy + y * s);
    else ctx.lineTo(cx + x * s, cy + y * s);
  }
  ctx.closePath();
}

// Rays turned off the axes (so it never reads as a snowflake), long and short in turn, with a
// gap around a small core so it reads as a burst rather than a sun.
const BURST_DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = -Math.PI / 2 + Math.PI / 8 + (i * TAU) / 8;
  return [Math.cos(a), Math.sin(a), i % 2 ? 0.33 : 0.46] as const;
});

/** Firework: eight rays flying out from a small core. */
export const burst: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const [dx, dy, r] of BURST_DIRS) {
    ctx.moveTo(cx + dx * s * 0.2, cy + dy * s * 0.2);
    ctx.lineTo(cx + dx * s * r, cy + dy * s * r);
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.075);
  ctx.fill();
};

/** Champagne flute: tall bowl filled to the brim, stem, foot, and bubbles rising. */
export const flute: Icon = (ctx, cx, cy, s) => {
  const x = cx - s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, cy - s * 0.46);
  ctx.quadraticCurveTo(x - s * 0.21, cy + s * 0.02, x, cy + s * 0.07);
  ctx.quadraticCurveTo(x + s * 0.21, cy + s * 0.02, x + s * 0.2, cy - s * 0.46);
  ctx.moveTo(x, cy + s * 0.07);
  ctx.lineTo(x, cy + s * 0.38);
  ctx.moveTo(x - s * 0.17, cy + s * 0.44);
  ctx.lineTo(x + s * 0.17, cy + s * 0.44);
  dot(ctx, cx + s * 0.3, cy - s * 0.44, s);
  dot(ctx, cx + s * 0.36, cy - s * 0.18, s);
  ctx.stroke();
  // The champagne, below a clear band at the rim
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, cy - s * 0.22);
  ctx.quadraticCurveTo(x - s * 0.19, cy + s * 0.01, x, cy + s * 0.05);
  ctx.quadraticCurveTo(x + s * 0.19, cy + s * 0.01, x + s * 0.2, cy - s * 0.22);
  ctx.closePath();
  ctx.fill();
};

// Five to midnight: the minute hand on the 11, the hour hand just shy of the 12.
const MINUTE_HAND = [Math.cos(-Math.PI / 2 - TAU / 12), Math.sin(-Math.PI / 2 - TAU / 12)] as const;
const HOUR_HAND = [Math.cos(-Math.PI / 2 - TAU / 144), Math.sin(-Math.PI / 2 - TAU / 144)] as const;

/** Clock face at five to midnight. */
export const clock: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.43);
  ctx.moveTo(cx + MINUTE_HAND[0] * s * 0.3, cy + MINUTE_HAND[1] * s * 0.3);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + HOUR_HAND[0] * s * 0.22, cy + HOUR_HAND[1] * s * 0.22);
  dot(ctx, cx + s * 0.31, cy, s);
  dot(ctx, cx - s * 0.31, cy, s);
  dot(ctx, cx, cy + s * 0.31, s);
  ctx.stroke();
};

const STAR_PTS = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 0.2 : 0.48;
  return [Math.cos(a) * r, Math.sin(a) * r + 0.04] as const;
});

/** Five-point star. */
export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, STAR_PTS, cx, cy, s);
  ctx.stroke();
};

/** Cone party hat: a stripe, a pom-pom on top, a curved brim. */
export const partyHat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.4);
  ctx.lineTo(cx, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.4);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx - s * 0.3, cy + s * 0.4);
  ctx.moveTo(cx - s * 0.17, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.19, cy + s * 0.22);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy - s * 0.38, s * 0.1);
  ctx.fill();
};

/** Balloon on a curly string, with a shine. */
export const balloon: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  oval(ctx, cx, cy - s * 0.13, s * 0.25, s * 0.31);
  ctx.moveTo(cx, cy + s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.16, cy + s * 0.34, cx + s * 0.05, cy + s * 0.5);
  ctx.moveTo(cx - s * 0.13, cy - s * 0.25);
  ctx.quadraticCurveTo(cx - s * 0.12, cy - s * 0.32, cx - s * 0.05, cy - s * 0.34);
  ctx.stroke();
  // Knot
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.16);
  ctx.lineTo(cx + s * 0.07, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.07, cy + s * 0.25);
  ctx.closePath();
  ctx.fill();
};

function fourPoint(ctx: Ctx, x: number, y: number, r: number, k: number): void {
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r * 0.8, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r * 0.8, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.closePath();
}

/** Solid four-point sparkle with a small twin. */
export const sparkle: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  fourPoint(ctx, cx - s * 0.07, cy + s * 0.05, s * 0.44, s * 0.07);
  fourPoint(ctx, cx + s * 0.33, cy - s * 0.3, s * 0.17, s * 0.03);
  ctx.fill();
};

/** Mirror ball on its hanger, with a glint. */
export const discoBall: Icon = (ctx, cx, cy, s) => {
  const x = cx - s * 0.04;
  const y = cy + s * 0.08;
  const r = s * 0.36;
  ctx.beginPath();
  circle(ctx, x, y, r);
  oval(ctx, x, y, r * 0.42, r);
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, cy - s * 0.5);
  ctx.stroke();
  ctx.beginPath();
  fourPoint(ctx, cx + s * 0.36, cy - s * 0.3, s * 0.15, s * 0.025);
  ctx.fill();
};

const HORN_TILT = -0.42;
const HORN_C = Math.cos(HORN_TILT);
const HORN_S = Math.sin(HORN_TILT);
/** Party horn in unit space before the tilt: mouthpiece on the left, flared bell on the right. */
const HORN_OUTLINE: readonly (readonly [number, number])[] = [
  [-0.48, -0.05],
  [-0.32, -0.06],
  [0.24, -0.2],
  [0.3, -0.24],
  [0.3, 0.24],
  [0.24, 0.2],
  [-0.32, 0.06],
  [-0.48, 0.05],
];
const HORN_BODY = HORN_OUTLINE.map(([x, y]) => [x * HORN_C - y * HORN_S, x * HORN_S + y * HORN_C + 0.04] as const);
const HORN_STRIPES = [-0.1, 0.08].map((x) => {
  const h = 0.06 + (x + 0.32) * 0.25; // the cone's half-height at x
  return [
    [x * HORN_C + h * HORN_S, x * HORN_S - h * HORN_C + 0.04],
    [x * HORN_C - h * HORN_S, x * HORN_S + h * HORN_C + 0.04],
  ] as const;
});

/** Party horn: mouthpiece, striped cone, flared bell; tipped upward. */
export const horn: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, HORN_BODY, cx, cy, s);
  for (const [[x0, y0], [x1, y1]] of HORN_STRIPES) {
    ctx.moveTo(cx + x0 * s, cy + y0 * s);
    ctx.lineTo(cx + x1 * s, cy + y1 * s);
  }
  ctx.stroke();
};

const BOW_TIE: readonly (readonly [number, number])[] = [
  [-0.47, -0.27],
  [-0.08, -0.08],
  [0.08, -0.08],
  [0.47, -0.27],
  [0.47, 0.27],
  [0.08, 0.08],
  [-0.08, 0.08],
  [-0.47, 0.27],
];

/** Bow tie: a solid silhouette with the knot picked out. */
export const bowTie: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, BOW_TIE, cx, cy, s);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - s * 0.1, cy - s * 0.13, s * 0.2, s * 0.26);
  ctx.stroke();
};

const CONFETTI_BITS: readonly (readonly [number, number, number])[] = [
  [-0.3, -0.28, 0.6],
  [0.12, -0.34, -0.5],
  [0.34, -0.04, 1.2],
  [-0.08, 0.06, -1.0],
  [-0.36, 0.26, 0.1],
  [0.18, 0.32, 0.7],
];

/** Confetti: tumbling dashes and dots. */
export const confetti: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  const l = s * 0.12;
  for (const [x, y, a] of CONFETTI_BITS) {
    const px = cx + x * s;
    const py = cy + y * s;
    ctx.moveTo(px - Math.cos(a) * l, py - Math.sin(a) * l);
    ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
  }
  dot(ctx, cx + s * 0.4, cy + s * 0.36, s);
  dot(ctx, cx - s * 0.02, cy - s * 0.44, s);
  dot(ctx, cx - s * 0.44, cy - s * 0.02, s);
  ctx.stroke();
};

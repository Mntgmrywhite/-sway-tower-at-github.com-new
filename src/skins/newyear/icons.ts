import { circle, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";
import { TAU } from "./colors";
import { PLUME, plumePath, quillPath } from "./plume";

// Inked Art Deco symbols for the bars. Each fits a box about `s` tall centered on (cx, cy)
// and only builds paths and strokes/fills them with the ink the bar has already set. On a
// phone they are drawn about 12 px tall, so each is one bold silhouette: solid shapes where a
// line would blur, no fine detail, dots made by the stroke's round caps instead of extra
// fills, and every separate piece its own subpath. No allocations: these run every frame.

/** A dot drawn by the stroke itself (the bar strokes with round caps). */
function dot(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.012, y);
}

/** Closed polygon from unit-space points. */
function poly(ctx: Ctx, pts: readonly (readonly [number, number])[], cx: number, cy: number, s: number): void {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    if (i === 0) ctx.moveTo(cx + x * s, cy + y * s);
    else ctx.lineTo(cx + x * s, cy + y * s);
  }
  ctx.closePath();
}

/** Champagne coupe: a wide shallow bowl brimming over, a stem and a foot, two bubbles. */
export const coupe: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.46, cy - s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.44, cy + s * 0.1, cx, cy + s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.44, cy + s * 0.1, cx + s * 0.46, cy - s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.08);
  ctx.lineTo(cx, cy + s * 0.38);
  ctx.moveTo(cx - s * 0.2, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.42);
  dot(ctx, cx - s * 0.12, cy - s * 0.38, s);
  dot(ctx, cx + s * 0.14, cy - s * 0.48, s);
  ctx.stroke();
};

/** Folding fan: five pleats spread from a pivot, with the guard stick below. */
const FAN_PLEATS = Array.from({ length: 5 }, (_, i) => {
  const span = Math.PI - 0.7;
  const a0 = Math.PI + 0.35 + (i / 5) * span + 0.05;
  const a1 = Math.PI + 0.35 + ((i + 1) / 5) * span - 0.05;
  return [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)] as const;
});

export const fan: Icon = (ctx, cx, cy, s) => {
  const px = cx;
  const py = cy + s * 0.34;
  const r0 = s * 0.2;
  const r1 = s * 0.78;
  ctx.beginPath();
  for (const [c0, s0, c1, s1] of FAN_PLEATS) {
    ctx.moveTo(px + c0 * r0, py + s0 * r0);
    ctx.lineTo(px + c0 * r1, py + s0 * r1);
    ctx.lineTo(px + c1 * r1, py + s1 * r1);
    ctx.lineTo(px + c1 * r0, py + s1 * r0);
    ctx.closePath();
  }
  circle(ctx, px, py, s * 0.1);
  ctx.fill();
};

const FEATHER_TURN = 0.62;
const FEATHER_COS = Math.cos(FEATHER_TURN);
const FEATHER_SIN = Math.sin(FEATHER_TURN);

/** Ostrich plume: the scalloped vane, tipped over to the right, with its quill. */
export const feather: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  plumePath(ctx, PLUME, cx + s * 0.02, cy - s * 0.04, s * 1.02, FEATHER_COS, FEATHER_SIN);
  ctx.fill();
  ctx.beginPath();
  quillPath(ctx, cx + s * 0.02, cy - s * 0.04, s * 1.02, FEATHER_COS, FEATHER_SIN);
  ctx.stroke();
};

/** Top hat: a tall solid crown, a light band, a curled brim. */
export const topHat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.27, cy - s * 0.46);
  ctx.lineTo(cx + s * 0.27, cy - s * 0.46);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.25, cy + s * 0.05);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.25, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.27);
  ctx.quadraticCurveTo(cx + s * 0.52, cy + s * 0.26, cx + s * 0.5, cy + s * 0.36);
  ctx.quadraticCurveTo(cx, cy + s * 0.5, cx - s * 0.5, cy + s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.52, cy + s * 0.26, cx - s * 0.25, cy + s * 0.27);
  ctx.closePath();
  ctx.fill();
};

/** String of pearls hanging in a deep U, with a drop pearl at the bottom. */
const PEARLS = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (-0.1 + (i / 8) * 1.2);
  return [Math.cos(a) * 0.36, -0.12 + Math.sin(a) * 0.36] as const;
});

export const pearls: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const [x, y] of PEARLS) circle(ctx, cx + x * s, cy + y * s, s * 0.085);
  circle(ctx, cx, cy + s * 0.38, s * 0.12);
  ctx.fill();
};

/** Gramophone: a little box with a big morning-glory horn flaring up and right off its back. */
export const gramophoneIcon: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.rect(cx - s * 0.46, cy + s * 0.16, s * 0.46, s * 0.28);
  // Horn: from a narrow throat on the box to a wide open bell
  ctx.moveTo(cx - s * 0.16, cy + s * 0.14);
  ctx.quadraticCurveTo(cx - s * 0.02, cy + s * 0.02, cx - s * 0.02, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.48, cy + s * 0.08);
  ctx.quadraticCurveTo(cx + s * 0.06, cy + s * 0.06, cx - s * 0.08, cy + s * 0.16);
  ctx.closePath();
  ctx.fill();
  // The bell's rim, and the tone arm across the box top
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.02, cy - s * 0.4);
  ctx.quadraticCurveTo(cx + s * 0.34, cy - s * 0.34, cx + s * 0.48, cy + s * 0.08);
  ctx.moveTo(cx - s * 0.4, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.16, cy + s * 0.08);
  ctx.stroke();
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

/** Deco sunburst: a solid core with long and short pointed rays. */
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + (i * TAU) / 12;
  const w = 0.16;
  return [Math.cos(a - w), Math.sin(a - w), Math.cos(a), Math.sin(a), Math.cos(a + w), Math.sin(a + w), i % 2 ? 0.4 : 0.56] as const;
});

export const sunburst: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.2);
  for (const [c0, s0, c, sn, c1, s1, r] of SUN_RAYS) {
    ctx.moveTo(cx + c0 * s * 0.24, cy + s0 * s * 0.24);
    ctx.lineTo(cx + c * s * r, cy + sn * s * r);
    ctx.lineTo(cx + c1 * s * 0.24, cy + s1 * s * 0.24);
    ctx.closePath();
  }
  ctx.fill();
};

/** Cocktail: a V glass filled below the rim, stem, foot, and an olive on a pick. */
export const cocktail: Icon = (ctx, cx, cy, s) => {
  const x = cx - s * 0.04;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.36, cy - s * 0.4);
  ctx.lineTo(x + s * 0.36, cy - s * 0.4);
  ctx.lineTo(x, cy + s * 0.06);
  ctx.closePath();
  ctx.moveTo(x, cy + s * 0.06);
  ctx.lineTo(x, cy + s * 0.38);
  ctx.moveTo(x - s * 0.2, cy + s * 0.42);
  ctx.lineTo(x + s * 0.2, cy + s * 0.42);
  ctx.moveTo(x + s * 0.06, cy - s * 0.14);
  ctx.lineTo(x + s * 0.44, cy - s * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.27, cy - s * 0.28);
  ctx.lineTo(x + s * 0.27, cy - s * 0.28);
  ctx.lineTo(x, cy + s * 0.04);
  ctx.closePath();
  circle(ctx, x + s * 0.2, cy - s * 0.28, s * 0.11);
  ctx.fill();
};

/** Saxophone: a crook from the mouthpiece, a fat body down to a U-bend, a wide flared bell. */
export const saxophone: Icon = (ctx, cx, cy, s) => {
  const w = ctx.lineWidth;
  ctx.lineWidth = w * 2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy - s * 0.44);
  ctx.quadraticCurveTo(cx - s * 0.14, cy - s * 0.5, cx - s * 0.14, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.18);
  ctx.arc(cx + s * 0.03, cy + s * 0.18, s * 0.17, Math.PI, 0, true);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.02);
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.13, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.04, cy - s * 0.26);
  ctx.quadraticCurveTo(cx + s * 0.26, cy - s * 0.36, cx + s * 0.48, cy - s * 0.26);
  ctx.lineTo(cx + s * 0.27, cy + s * 0.06);
  ctx.closePath();
  ctx.fill();
};

const STAR_PTS = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 0.2 : 0.48;
  return [Math.cos(a) * r, Math.sin(a) * r + 0.04] as const;
});

/** Five-point star, with a solid heart. */
export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, STAR_PTS, cx, cy, s);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy + s * 0.04, s * 0.1);
  ctx.fill();
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

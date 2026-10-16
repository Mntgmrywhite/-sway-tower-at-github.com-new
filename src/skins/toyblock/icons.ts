import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";

// Symbols for the Toy Kingdom bars: things from a toy box, our own simple glyphs. Each draws one
// bold shape centered at (cx, cy), about `s` pixels tall, with the caller's ink style. In play
// `s` is only ~12 px, so they are chunky filled silhouettes with an occasional stroked detail;
// holes are cut with even-odd fills, and every round part is its own subpath. Nothing is
// allocated: these run hundreds of times a frame.

const TAU = Math.PI * 2;

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const r = i % 2 ? s * 0.22 : s * 0.5;
    const x = cx + Math.cos(a) * r;
    const y = cy + s * 0.04 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
};

/** A plump heart as its own subpath, centered on (cx, cy), about s tall. */
export function heartPath(ctx: Parameters<Icon>[0], cx: number, cy: number, s: number): void {
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.bezierCurveTo(cx - s * 0.18, cy + s * 0.28, cx - s * 0.5, cy + s * 0.08, cx - s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx - s * 0.46, cy - s * 0.42, cx - s * 0.1, cy - s * 0.48, cx, cy - s * 0.24);
  ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.48, cx + s * 0.46, cy - s * 0.42, cx + s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.08, cx + s * 0.18, cy + s * 0.28, cx, cy + s * 0.45);
  ctx.closePath();
}

export const heart: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  heartPath(ctx, cx, cy + s * 0.02, s);
  ctx.fill();
};

export const train: Icon = (ctx, cx, cy, s) => {
  // A little engine facing right: a tall cab with a window cut out, a roof, a long boiler, a
  // chimney, and two wheels just below (kept apart, so one fill never overlaps itself).
  const base = cy + s * 0.17;
  ctx.beginPath();
  ctx.rect(cx - s * 0.46, base - s * 0.56, s * 0.34, s * 0.56);
  ctx.rect(cx - s * 0.5, base - s * 0.64, s * 0.42, s * 0.08);
  ctx.rect(cx - s * 0.12, base - s * 0.36, s * 0.58, s * 0.36);
  ctx.rect(cx + s * 0.22, base - s * 0.56, s * 0.13, s * 0.2);
  ctx.rect(cx - s * 0.38, base - s * 0.46, s * 0.18, s * 0.15);
  circle(ctx, cx - s * 0.28, base + s * 0.16, s * 0.14);
  circle(ctx, cx + s * 0.24, base + s * 0.16, s * 0.14);
  ctx.fill("evenodd");
};

export const ball: Icon = (ctx, cx, cy, s) => {
  // A beach ball: a disc with two curved stripes cut across it.
  const r = s * 0.45;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.moveTo(cx - r * 0.52, cy - r * 0.84);
  ctx.quadraticCurveTo(cx - r * 0.05, cy, cx - r * 0.52, cy + r * 0.84);
  ctx.lineTo(cx - r * 0.3, cy + r * 0.94);
  ctx.quadraticCurveTo(cx + r * 0.25, cy, cx - r * 0.3, cy - r * 0.94);
  ctx.closePath();
  ctx.moveTo(cx + r * 0.52, cy - r * 0.84);
  ctx.quadraticCurveTo(cx + r * 0.05, cy, cx + r * 0.52, cy + r * 0.84);
  ctx.lineTo(cx + r * 0.3, cy + r * 0.94);
  ctx.quadraticCurveTo(cx - r * 0.25, cy, cx + r * 0.3, cy - r * 0.94);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const rocket: Icon = (ctx, cx, cy, s) => {
  // Upright: a pointed body with straight sides, two fins against them (touching, never
  // overlapping, so the even-odd fill keeps them solid), a round window cut out, and a short
  // flame below.
  const w = s * 0.2;
  const side = cy - s * 0.06;
  const foot = cy + s * 0.24;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + w * 1.05, cy - s * 0.36, cx + w, side);
  ctx.lineTo(cx + w, foot);
  ctx.lineTo(cx - w, foot);
  ctx.lineTo(cx - w, side);
  ctx.quadraticCurveTo(cx - w * 1.05, cy - s * 0.36, cx, cy - s * 0.5);
  ctx.closePath();
  circle(ctx, cx, cy - s * 0.14, s * 0.085);
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.34);
  ctx.lineTo(cx - w, foot);
  ctx.closePath();
  ctx.moveTo(cx + w, cy);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.34);
  ctx.lineTo(cx + w, foot);
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy + s * 0.3);
  ctx.quadraticCurveTo(cx, cy + s * 0.58, cx + s * 0.1, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();
};

export const crown: Icon = (ctx, cx, cy, s) => {
  // Three points on a band, a ball on each point.
  const b = cy + s * 0.32;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.46, b);
  ctx.lineTo(cx - s * 0.48, cy - s * 0.22);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.02);
  ctx.lineTo(cx, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.48, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.46, b);
  ctx.closePath();
  circle(ctx, cx - s * 0.48, cy - s * 0.3, s * 0.08);
  circle(ctx, cx, cy - s * 0.41, s * 0.09);
  circle(ctx, cx + s * 0.48, cy - s * 0.3, s * 0.08);
  ctx.fill();
};

export const duck: Icon = (ctx, cx, cy, s) => {
  // A bath duck facing left, as one outline: the raised tail, the back dipping to the neck, the
  // round head, the beak, the plump chest and the flat bottom. The eye is cut out.
  const hx = cx - s * 0.17;
  const hy = cy - s * 0.2;
  const hr = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.48, cy - s * 0.14);
  ctx.quadraticCurveTo(cx + s * 0.28, cy + s * 0.06, hx + hr * 0.5, hy + hr * 0.87);
  ctx.arc(hx, hy, hr, Math.PI / 3, Math.PI - 0.3, true);
  ctx.lineTo(cx - s * 0.56, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.34, cy - s * 0.04);
  ctx.quadraticCurveTo(cx - s * 0.48, cy + s * 0.42, cx + s * 0.02, cy + s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.42, cy + s * 0.42, cx + s * 0.48, cy - s * 0.14);
  ctx.closePath();
  circle(ctx, hx - s * 0.05, hy - s * 0.04, s * 0.045);
  ctx.fill("evenodd");
};

export const top: Icon = (ctx, cx, cy, s) => {
  // A spinning top: a handle, a wide rounded body with a band cut across, and a point below.
  ctx.beginPath();
  ctx.rect(cx - s * 0.05, cy - s * 0.5, s * 0.1, s * 0.16);
  ctx.moveTo(cx - s * 0.46, cy - s * 0.08);
  ctx.quadraticCurveTo(cx - s * 0.44, cy - s * 0.34, cx, cy - s * 0.34);
  ctx.quadraticCurveTo(cx + s * 0.44, cy - s * 0.34, cx + s * 0.46, cy - s * 0.08);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.2, cx, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.2, cx - s * 0.46, cy - s * 0.08);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.13);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.13);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.03);
  ctx.lineTo(cx - s * 0.34, cy - s * 0.03);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const drum: Icon = (ctx, cx, cy, s) => {
  // A toy drum as one outline (round top and bottom), its drumhead rim and a row of diamond
  // lacing cut out, and two sticks crossed above (clear of the drum).
  const t = cy - s * 0.1;
  const b = cy + s * 0.36;
  const w = s * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - w, t);
  ctx.ellipse(cx, t, w, s * 0.12, 0, Math.PI, TAU);
  ctx.lineTo(cx + w, b);
  ctx.ellipse(cx, b, w, s * 0.1, 0, 0, Math.PI);
  ctx.closePath();
  oval(ctx, cx, t, w * 0.78, s * 0.06);
  for (let i = -1; i <= 1; i++) {
    const x = cx + i * w * 0.55;
    const y = (t + b) / 2 + s * 0.06;
    ctx.moveTo(x, y - s * 0.12);
    ctx.lineTo(x + s * 0.08, y);
    ctx.lineTo(x, y + s * 0.12);
    ctx.lineTo(x - s * 0.08, y);
    ctx.closePath();
  }
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.28);
  ctx.moveTo(cx + s * 0.36, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.08, cy - s * 0.28);
  ctx.stroke();
};

/** Kite: half width, where the spars cross (high, like a real kite), the bottom point, the spar gap and the tail's width (in s). */
const KITE_W = 0.3;
const KITE_MID = -0.24;
const KITE_LOW = 0.12;
const KITE_GAP = 0.075;
const KITE_TAIL = 0.09;

export const kite: Icon = (ctx, cx, cy, s) => {
  // An upright toy kite: a diamond in four panels, the cross of its spars left open between
  // them, and a zigzag tail with a bow. One fill, and no two parts overlap (the panels stop at
  // the spars, the tail starts below the panels' tips, the bow's wings meet the tail's edges).
  const w = KITE_W * s;
  const my = cy + KITE_MID * s;
  const g = (KITE_GAP * s) / 2;
  ctx.beginPath();
  for (let q = 0; q < 4; q++) {
    const sx = q % 2 ? 1 : -1;
    const sy = q < 2 ? -1 : 1;
    const tip = sy < 0 ? cy - s * 0.5 : cy + KITE_LOW * s;
    const h = Math.abs(tip - my);
    ctx.moveTo(cx + sx * g, my + sy * g);
    ctx.lineTo(cx + sx * g, tip + (my - tip) * (g / w));
    ctx.lineTo(cx + sx * w * (1 - g / h), my + sy * g);
    ctx.closePath();
  }
  // The tail: a ribbon zigzagging down from the bottom point, a bow at its bend.
  const t = (KITE_TAIL * s) / 2;
  const y0 = cy + KITE_LOW * s;
  const kx = cx + s * 0.07;
  const ky = cy + s * 0.3;
  const ex = cx - s * 0.03;
  const ey = cy + s * 0.5;
  ctx.moveTo(cx - t, y0);
  ctx.lineTo(kx - t, ky);
  ctx.lineTo(ex - t, ey);
  ctx.lineTo(ex + t, ey);
  ctx.lineTo(kx + t, ky);
  ctx.lineTo(cx + t, y0);
  ctx.closePath();
  const b = s * 0.1;
  const bh = s * 0.055;
  ctx.moveTo(kx - t, ky);
  ctx.lineTo(kx - t - b, ky - bh);
  ctx.lineTo(kx - t - b, ky + bh);
  ctx.closePath();
  ctx.moveTo(kx + t, ky);
  ctx.lineTo(kx + t + b, ky - bh);
  ctx.lineTo(kx + t + b, ky + bh);
  ctx.closePath();
  ctx.fill();
};

export const moon: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.44;
  const x = cx + s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, cy - r);
  ctx.arc(x, cy, r, -Math.PI / 2, Math.PI / 2, true);
  ctx.ellipse(x, cy, r * 0.3, r, 0, Math.PI / 2, (Math.PI * 3) / 2, false);
  ctx.closePath();
  ctx.fill();
};

export const letterA: Icon = (ctx, cx, cy, s) => {
  // A bold capital A: two legs and a bar, the counter cut out.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.42, cy + s * 0.46);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.46);
  ctx.lineTo(cx + s * 0.13, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.13, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.46);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.07, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.07, cy + s * 0.06);
  ctx.lineTo(cx, cy - s * 0.18);
  ctx.closePath();
  ctx.fill("evenodd");
};

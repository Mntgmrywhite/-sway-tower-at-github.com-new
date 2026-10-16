import { circle, oval, type Ctx } from "../../base/draw";
import type { Icon } from "../skin";

// Victorian Christmas symbols for the bars, inked onto the face by the base bar: holly, a
// snowflake, a candlestick, a top hat, a plum pudding, a wreath, a gift, a coach lantern, a
// bell, a carol book, the Christmas goose and a pocket watch. Each is centered at (cx, cy)
// and about `s` pixels tall, drawn with the stroke/fill style the bar sets. In play `s` is
// only ~12 px, so shapes stay bold: solid silhouettes (hat, goose, flames) are filled, and
// every dot is its own subpath. No arrays are allocated: these run hundreds of times a frame.

export const snowflake: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.5;
  const b = s * 0.27;
  const bl = s * 0.16;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * r, cy + dy * r);
    const bx = cx + dx * b;
    const by = cy + dy * b;
    ctx.moveTo(bx + Math.cos(a - 0.85) * bl, by + Math.sin(a - 0.85) * bl);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + Math.cos(a + 0.85) * bl, by + Math.sin(a + 0.85) * bl);
  }
  ctx.stroke();
};

export const gift: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.rect(cx - s * 0.32, cy - s * 0.04, s * 0.64, s * 0.48);
  ctx.rect(cx - s * 0.38, cy - s * 0.18, s * 0.76, s * 0.14);
  ctx.moveTo(cx, cy - s * 0.18);
  ctx.lineTo(cx, cy + s * 0.44);
  oval(ctx, cx - s * 0.14, cy - s * 0.3, s * 0.14, s * 0.08, 0.35);
  oval(ctx, cx + s * 0.14, cy - s * 0.3, s * 0.14, s * 0.08, -0.35);
  ctx.stroke();
};

export const bell: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy + s * 0.26);
  ctx.quadraticCurveTo(cx - s * 0.25, cy + s * 0.16, cx - s * 0.25, cy - s * 0.04);
  ctx.bezierCurveTo(cx - s * 0.25, cy - s * 0.44, cx + s * 0.25, cy - s * 0.44, cx + s * 0.25, cy - s * 0.04);
  ctx.quadraticCurveTo(cx + s * 0.25, cy + s * 0.16, cx + s * 0.4, cy + s * 0.26);
  ctx.closePath();
  ctx.moveTo(cx, cy - s * 0.34);
  ctx.lineTo(cx, cy - s * 0.47);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy + s * 0.38, s * 0.09);
  ctx.fill();
};

/** Holly leaf outline down one side: [fraction along the leaf, fraction of the half width]. */
const LEAF_EDGE = [
  [0.2, 0.95],
  [0.36, 0.5],
  [0.5, 1.05],
  [0.64, 0.5],
  [0.8, 0.85],
] as const;

/** A holly leaf from its base (bx, by) to its tip (tx, ty), `w` half wide: a spiky silhouette. */
function leaf(ctx: Ctx, bx: number, by: number, tx: number, ty: number, w: number): void {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  ctx.moveTo(bx, by);
  for (const [f, k] of LEAF_EDGE) ctx.lineTo(bx + dx * f + nx * k, by + dy * f + ny * k);
  ctx.lineTo(tx, ty);
  for (let i = LEAF_EDGE.length - 1; i >= 0; i--) {
    const [f, k] = LEAF_EDGE[i]!;
    ctx.lineTo(bx + dx * f - nx * k, by + dy * f - ny * k);
  }
  ctx.closePath();
}

export const holly: Icon = (ctx, cx, cy, s) => {
  // Two solid spiky leaves fanning up, three berries tucked below them.
  ctx.beginPath();
  leaf(ctx, cx - s * 0.04, cy + s * 0.02, cx - s * 0.54, cy - s * 0.3, s * 0.21);
  leaf(ctx, cx + s * 0.04, cy + s * 0.02, cx + s * 0.54, cy - s * 0.3, s * 0.21);
  circle(ctx, cx - s * 0.13, cy + s * 0.3, s * 0.115);
  circle(ctx, cx + s * 0.13, cy + s * 0.3, s * 0.115);
  circle(ctx, cx, cy + s * 0.14, s * 0.115);
  ctx.fill();
};

export const wreath: Icon = (ctx, cx, cy, s) => {
  const y = cy - s * 0.1;
  const r = s * 0.3;
  // A thick ring of greenery, open at the bottom where the bow is tied...
  ctx.save();
  ctx.lineWidth *= 1.9;
  ctx.beginPath();
  ctx.arc(cx, y, r, Math.PI / 2 + 0.5, Math.PI * 2.5 - 0.5);
  ctx.stroke();
  ctx.restore();
  // ...and the bow: two loops, a knot and two tails.
  const by = y + r;
  ctx.beginPath();
  ctx.moveTo(cx, by);
  ctx.lineTo(cx - s * 0.22, by - s * 0.12);
  ctx.lineTo(cx - s * 0.22, by + s * 0.12);
  ctx.closePath();
  ctx.moveTo(cx, by);
  ctx.lineTo(cx + s * 0.22, by - s * 0.12);
  ctx.lineTo(cx + s * 0.22, by + s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.02, by);
  ctx.lineTo(cx - s * 0.1, by + s * 0.25);
  ctx.moveTo(cx + s * 0.02, by);
  ctx.lineTo(cx + s * 0.1, by + s * 0.25);
  ctx.stroke();
};

export const candle: Icon = (ctx, cx, cy, s) => {
  // Candle and its drip, the dish and its finger ring.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.13, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.13, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.13, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.13, cy + s * 0.3);
  ctx.moveTo(cx + s * 0.13, cy - s * 0.12);
  ctx.quadraticCurveTo(cx + s * 0.04, cy - s * 0.04, cx + s * 0.05, cy + s * 0.06);
  oval(ctx, cx, cy + s * 0.36, s * 0.36, s * 0.08);
  oval(ctx, cx + s * 0.44, cy + s * 0.28, s * 0.09, s * 0.08);
  ctx.stroke();
  // Flame
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.52);
  ctx.quadraticCurveTo(cx + s * 0.15, cy - s * 0.3, cx, cy - s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.15, cy - s * 0.3, cx, cy - s * 0.52);
  ctx.closePath();
  ctx.fill();
};

export const topHat: Icon = (ctx, cx, cy, s) => {
  // A tall solid crown with the band left open, on a curled brim.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy - s * 0.52);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.52);
  ctx.lineTo(cx + s * 0.21, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.21, cy + s * 0.04);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.205, cy + s * 0.15);
  ctx.lineTo(cx + s * 0.205, cy + s * 0.15);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.25);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.54, cy + s * 0.16);
  ctx.quadraticCurveTo(cx - s * 0.46, cy + s * 0.42, cx, cy + s * 0.4);
  ctx.quadraticCurveTo(cx + s * 0.46, cy + s * 0.42, cx + s * 0.54, cy + s * 0.16);
  ctx.quadraticCurveTo(cx + s * 0.42, cy + s * 0.27, cx, cy + s * 0.25);
  ctx.quadraticCurveTo(cx - s * 0.42, cy + s * 0.27, cx - s * 0.54, cy + s * 0.16);
  ctx.closePath();
  ctx.fill();
};

export const plumPudding: Icon = (ctx, cx, cy, s) => {
  // A round pudding on its plate, sauce dripping over the top, a holly sprig on the crown.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy + s * 0.32);
  ctx.bezierCurveTo(cx - s * 0.5, cy - s * 0.12, cx - s * 0.22, cy - s * 0.26, cx, cy - s * 0.26);
  ctx.bezierCurveTo(cx + s * 0.22, cy - s * 0.26, cx + s * 0.5, cy - s * 0.12, cx + s * 0.38, cy + s * 0.32);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.52, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.52, cy + s * 0.42);
  ctx.stroke();
  ctx.beginPath();
  // Sauce cap with three drips
  ctx.moveTo(cx - s * 0.36, cy - s * 0.04);
  ctx.bezierCurveTo(cx - s * 0.3, cy - s * 0.24, cx + s * 0.3, cy - s * 0.24, cx + s * 0.36, cy - s * 0.04);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.14, cx + s * 0.22, cy + s * 0.0);
  ctx.quadraticCurveTo(cx + s * 0.1, cy + s * 0.04, cx + s * 0.04, cy + s * 0.0);
  ctx.quadraticCurveTo(cx - s * 0.04, cy + s * 0.16, cx - s * 0.12, cy + s * 0.0);
  ctx.quadraticCurveTo(cx - s * 0.24, cy + s * 0.06, cx - s * 0.36, cy - s * 0.04);
  ctx.closePath();
  // Holly: two leaves and a berry
  oval(ctx, cx - s * 0.13, cy - s * 0.37, s * 0.14, s * 0.065, -0.35);
  oval(ctx, cx + s * 0.13, cy - s * 0.37, s * 0.14, s * 0.065, 0.35);
  circle(ctx, cx, cy - s * 0.31, s * 0.08);
  ctx.fill("evenodd");
};

export const lantern: Icon = (ctx, cx, cy, s) => {
  // Hanging ring, glass box with a center bar, flame, then a solid cap and base.
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.4, s * 0.09, Math.PI, 0);
  ctx.rect(cx - s * 0.2, cy - s * 0.26, s * 0.4, s * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.24);
  ctx.lineTo(cx, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.24);
  ctx.closePath();
  ctx.rect(cx - s * 0.26, cy + s * 0.26, s * 0.52, s * 0.12);
  ctx.moveTo(cx, cy - s * 0.14);
  ctx.quadraticCurveTo(cx + s * 0.11, cy + s * 0.04, cx, cy + s * 0.12);
  ctx.quadraticCurveTo(cx - s * 0.11, cy + s * 0.04, cx, cy - s * 0.14);
  ctx.closePath();
  ctx.fill();
};

export const carolBook: Icon = (ctx, cx, cy, s) => {
  // An open book: two pages curving from the spine, lines of words on the left, a note on
  // the right.
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.34);
  ctx.quadraticCurveTo(cx - s * 0.22, cy + s * 0.22, cx - s * 0.5, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.5, cy - s * 0.26);
  ctx.quadraticCurveTo(cx - s * 0.22, cy - s * 0.34, cx, cy - s * 0.22);
  ctx.quadraticCurveTo(cx + s * 0.22, cy - s * 0.34, cx + s * 0.5, cy - s * 0.26);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.22, cy + s * 0.22, cx, cy + s * 0.34);
  ctx.closePath();
  ctx.moveTo(cx, cy - s * 0.22);
  ctx.lineTo(cx, cy + s * 0.34);
  ctx.moveTo(cx - s * 0.38, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.12);
  ctx.moveTo(cx - s * 0.38, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.06);
  ctx.moveTo(cx + s * 0.3, cy + s * 0.12);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.12);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, cx + s * 0.22, cy + s * 0.13, s * 0.1, s * 0.07, -0.4);
  ctx.fill();
};

export const goose: Icon = (ctx, cx, cy, s) => {
  // A plump goose facing left: body, tail, head and beak filled; the neck a thick stroke.
  ctx.beginPath();
  oval(ctx, cx + s * 0.06, cy + s * 0.14, s * 0.36, s * 0.21, -0.12);
  ctx.moveTo(cx + s * 0.32, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.53, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.2);
  ctx.closePath();
  circle(ctx, cx - s * 0.26, cy - s * 0.33, s * 0.12);
  ctx.moveTo(cx - s * 0.34, cy - s * 0.38);
  ctx.lineTo(cx - s * 0.54, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.34, cy - s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.lineWidth *= 1.9;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.16, cy + s * 0.08);
  ctx.quadraticCurveTo(cx - s * 0.32, cy - s * 0.08, cx - s * 0.26, cy - s * 0.3);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.02, cy + s * 0.32);
  ctx.lineTo(cx - s * 0.04, cy + s * 0.48);
  ctx.moveTo(cx + s * 0.14, cy + s * 0.32);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.48);
  ctx.stroke();
};

export const pocketWatch: Icon = (ctx, cx, cy, s) => {
  // Case with a ring of hour dots, hands at ten to two, the crown and its bow on top.
  const y = cy + s * 0.12;
  const r = s * 0.34;
  ctx.beginPath();
  circle(ctx, cx, y, r);
  ctx.moveTo(cx + s * 0.1, cy - s * 0.4);
  ctx.arc(cx, cy - s * 0.4, s * 0.1, 0, Math.PI * 2);
  ctx.moveTo(cx, y);
  ctx.lineTo(cx - s * 0.13, y - s * 0.13);
  ctx.moveTo(cx, y);
  ctx.lineTo(cx + s * 0.19, y - s * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - s * 0.07, cy - s * 0.31, s * 0.14, s * 0.1);
  circle(ctx, cx, y, s * 0.06);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    circle(ctx, cx + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, s * 0.04);
  }
  ctx.fill();
};

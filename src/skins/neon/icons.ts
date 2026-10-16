import type { Icon } from "../skin";

// Two synthwave glyphs that join the shared geometric set (src/skins/glyphs.ts) on the bars:
// a sun setting on the horizon and a palm. Few bold strokes, so they read on thin bars.

/** Ray directions for the sunset glyph: straight up, the diagonals, and low either side. */
const RAYS = [-Math.PI / 2, (-Math.PI * 3) / 4, -Math.PI / 4, -Math.PI * 0.94, -Math.PI * 0.06] as const;

/** A half sun on the horizon line, with five short rays. */
export const sunset: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.3;
  const by = cy + s * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - r, by);
  ctx.arc(cx, by, r, Math.PI, 0);
  ctx.moveTo(cx - s * 0.5, by);
  ctx.lineTo(cx + s * 0.5, by);
  for (const a of RAYS) {
    const c = Math.cos(a);
    const n = Math.sin(a);
    ctx.moveTo(cx + c * r * 1.45, by + n * r * 1.45);
    ctx.lineTo(cx + c * r * 2.05, by + n * r * 2.05);
  }
  ctx.stroke();
};

/** A palm: a leaning trunk and four arched fronds. */
export const palm: Icon = (ctx, cx, cy, s) => {
  const tx = cx + s * 0.06;
  const ty = cy - s * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.06, cy + s * 0.05, tx, ty);
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx - s * 0.25, ty - s * 0.2, tx - s * 0.46, ty + s * 0.12);
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx + s * 0.25, ty - s * 0.2, tx + s * 0.44, ty + s * 0.14);
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx - s * 0.12, ty - s * 0.28, tx - s * 0.26, ty - s * 0.24);
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx + s * 0.12, ty - s * 0.3, tx + s * 0.27, ty - s * 0.25);
  ctx.stroke();
};

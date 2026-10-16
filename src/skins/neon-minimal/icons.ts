import { circle } from "../../base/draw";
import type { Icon } from "../skin";
import { crescentPath } from "./shapes";

// Minimal bar symbols, drawn by the neon bar with its tube stroke (and fill, for the solid
// ones). The rest of the set (circle, triangle, square, diamond, plus, wave) comes from glyphs.

/** A rainbow arch on two short legs. */
export const arc: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.38;
  const spring = cy + s * 0.06;
  const foot = cy + s * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx - r, foot);
  ctx.lineTo(cx - r, spring);
  ctx.arc(cx, spring, r, Math.PI, 0);
  ctx.lineTo(cx + r, foot);
  ctx.stroke();
};

/** A single diagonal line. */
export const line: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.32, cy + s * 0.34);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.34);
  ctx.stroke();
};

/** A solid dot. */
export const dot: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.2);
  ctx.fill();
  ctx.stroke();
};

/** A solid crescent moon. */
export const crescent: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  crescentPath(ctx, cx, cy, s * 0.44, 0.84, 0.42, -0.7);
  ctx.fill();
  ctx.stroke();
};

/** How much heavier the line symbols are drawn than the neon bar's default stroke. */
const HEAVY = 1.35;

/** The same line symbol with a heavier stroke, so it still reads on a narrow bar on a phone. */
export function heavy(icon: Icon): Icon {
  return (ctx, cx, cy, s) => {
    const w = ctx.lineWidth;
    ctx.lineWidth = w * HEAVY;
    icon(ctx, cx, cy, s);
    ctx.lineWidth = w;
  };
}

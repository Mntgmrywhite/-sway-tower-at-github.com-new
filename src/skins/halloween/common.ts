import { alpha, type Ctx } from "../../neon/draw";
import type { Scene } from "../skin";

// Colors and small helpers shared by the Halloween layers.

/** Silhouette fill: almost black, a touch of purple so it separates from pure-black shadows. */
export const INK = "#0a0412";
export const ORANGE = "#ff7a1a";
export const AMBER = "#ffb21f";
export const CANDLE = "#ffe27a";
export const GREEN = "#6dff3a";
export const VIOLET = "#a24bff";
export const LAVENDER = "#c79bff";
export const BONE = "#f3eddc";

/** Standard neon rim width for props. */
export function rimW(s: Scene): number {
  return Math.max(1.1, s.u * 0.0038);
}

/** Scratch point for `floor()`, reused so nothing allocates per frame. */
export const P = { x: 0, y: 0 };

/**
 * Project a spot on the neon floor to the screen, matching the base grid's perspective.
 * `X` is the sideways offset from the tower's center at the tower's depth, in units of u;
 * `z` is depth, where 3 is the tower's own line, bigger is farther back, smaller is closer.
 * Closer rows sit lower on screen and slide away faster as the camera climbs.
 */
export function floor(s: Scene, X: number, z: number): typeof P {
  const k = 3 / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = s.horizonY + (s.groundY - s.horizonY) * k;
  return P;
}

/**
 * Stroke the current path as a bone: neon edge glow, colored edge, bone-white core.
 * `width` is the bone's own width; `edge` the rim around it.
 */
export function boneStroke(ctx: Ctx, width: number, edge: number, rim: string): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(rim, 0.22);
  ctx.lineWidth = width + edge * 5;
  ctx.stroke();
  ctx.strokeStyle = rim;
  ctx.lineWidth = width + edge * 2;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = width;
  ctx.stroke();
}

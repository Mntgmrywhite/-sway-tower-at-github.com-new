import { alpha, mix, type Ctx } from "../../base/draw";

// Neon tubes for scenery, with their glow colors built once per color (no per-frame strings).
// `rimTube`: a thin rim, a soft glow under a colored core (two passes, a step dimmer than the
// bars, so props never outshine the tower). `hotTube`: a brighter light (taillights, signs),
// with a hot center like the base neonStroke.

const GLOWS = new Map<string, string>();
const HOTS = new Map<string, string>();

function glowOf(color: string): string {
  let glow = GLOWS.get(color);
  if (!glow) {
    glow = alpha(color, 0.25);
    GLOWS.set(color, glow);
  }
  return glow;
}

export function rimTube(ctx: Ctx, color: string, width: number): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = glowOf(color);
  ctx.lineWidth = width * 2.6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Stroke the current path as a bright neon tube: glow `glow` times the core, core, hot center
 *  (at least `minHot` wide: pass a pixel in the current units when drawing in a scaled frame). */
export function hotTube(ctx: Ctx, color: string, width: number, glow = 3, minHot = 0.6): void {
  let hot = HOTS.get(color);
  if (!hot) {
    hot = mix(color, "#ffffff", 0.65);
    HOTS.set(color, hot);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = glowOf(color);
  ctx.lineWidth = width * glow;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = hot;
  ctx.lineWidth = Math.max(minHot, width * 0.35);
  ctx.stroke();
}

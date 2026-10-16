import { alpha, type Ctx } from "../../base/draw";

// A thin neon rim for scenery: a soft glow under a colored core. Two passes instead of the
// base neonStroke's three (thin rims need no hot white center), and a step dimmer, so props
// never outshine the bars.

const GLOWS = new Map<string, string>();

export function rimTube(ctx: Ctx, color: string, width: number): void {
  let glow = GLOWS.get(color);
  if (!glow) {
    glow = alpha(color, 0.25);
    GLOWS.set(color, glow);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 2.6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

import { ink, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { GOLD, GOLD_DARK, GOLD_LIGHT, INK, LACQUER } from "./colors";

// In front of the tower: a black-and-gold Art Deco rail laid over the base's lip, above the
// indigo marble tiles — black lacquer between gilded edges, with a row of little gold
// sunburst fans and a gold diamond between each pair. It drops away with the tiles as you climb.

/** Fan rays as unit (cos, sin) pairs for the wedge edges of a half sunburst. */
const FAN_RAYS = 5;
const FAN_DIRS = Array.from({ length: FAN_RAYS }, (_, i) => {
  const a0 = Math.PI + (i / FAN_RAYS) * Math.PI + 0.08;
  const a1 = Math.PI + ((i + 1) / FAN_RAYS) * Math.PI - 0.08;
  return [a0, a1] as const;
});

export function decoRail(ctx: Ctx, s: Scene): void {
  const u = s.u;
  // Same line as the base's lip (src/base/world.ts tiles()).
  const top = layerGround(s, 1.6) + u * 0.36;
  const y0 = top - u * 0.026;
  if (y0 > s.cssH) return;
  const y1 = top + u * 0.029;
  const h = y1 - y0;
  const W = s.cssW;
  const edge = h * 0.2;
  ctx.fillStyle = LACQUER;
  ctx.fillRect(0, y0, W, h);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, y0, W, edge);
  ctx.fillRect(0, y1 - edge, W, edge);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(0, y0, W, edge * 0.4);
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(0, y1 - edge * 0.35, W, edge * 0.35);

  // Gold fans standing on the lower gilt edge, diamonds between them
  const step = u * 0.09;
  const base = y1 - edge;
  const r = (h - edge * 2) * 0.86;
  const off = ((W / 2) % step) - step;
  ctx.beginPath();
  for (let x = off; x < W + step; x += step) {
    for (const [a0, a1] of FAN_DIRS) {
      ctx.moveTo(x, base);
      ctx.arc(x, base, r, a0, a1);
      ctx.closePath();
    }
    const dx = x + step / 2;
    const dy = y0 + h * 0.5;
    const d = h * 0.2;
    ctx.moveTo(dx, dy - d);
    ctx.lineTo(dx + d * 0.8, dy);
    ctx.lineTo(dx, dy + d);
    ctx.lineTo(dx - d * 0.8, dy);
    ctx.closePath();
  }
  ctx.fillStyle = GOLD;
  ctx.fill();

  const lw = Math.max(1.5, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(W, y0);
  ctx.moveTo(0, y1);
  ctx.lineTo(W, y1);
  ink(ctx, lw, INK);
}

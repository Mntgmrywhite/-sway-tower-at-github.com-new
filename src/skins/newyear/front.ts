import { ink, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { EMERALD, GOLD, GOLD_DARK, GOLD_LIGHT, INK, LACQUER } from "./colors";

// In front of the tower: an Art Deco frieze laid over the base's lip, above the black marble
// tiles — black lacquer between two gilded rules with an emerald pinstripe, and a row of gold
// sunburst fans (rays in two golds around a bronze hub) with a stack of gold chevrons between
// each pair. It drops away with the tiles as you climb.

const FAN_RAYS = 7;
/** Wedge edges of a half sunburst, as angle pairs (a little gap between rays). */
const FAN_DIRS = Array.from({ length: FAN_RAYS }, (_, i) => {
  const a0 = Math.PI + (i / FAN_RAYS) * Math.PI + 0.06;
  const a1 = Math.PI + ((i + 1) / FAN_RAYS) * Math.PI - 0.06;
  return [a0, a1] as const;
});
/** Pattern repeat, as a fraction of u. */
const STEP = 0.12;

/** Each gilded rule's lit top and shaded bottom, as fractions of its height. */
const LIT = 0.35;
const SHADE = 0.3;

/** Top of the frieze: everything on the ground layer below it is hidden by the frieze and the
 *  base's tiles, so the terrace stops filling there. */
export function friezeTop(s: Scene): number {
  // Same line as the base's lip (src/base/world.ts tiles()), less the frieze's upper half.
  return layerGround(s, 1.6) + s.u * (0.36 - 0.03);
}

export function decoRail(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = layerGround(s, 1.6) + u * 0.36;
  const y0 = friezeTop(s);
  if (y0 > s.cssH) return;
  const y1 = top + u * 0.042;
  const h = y1 - y0;
  const W = s.cssW;
  const edge = h * 0.15;
  ctx.fillStyle = LACQUER;
  ctx.fillRect(0, y0, W, h);
  ctx.fillStyle = EMERALD;
  ctx.fillRect(0, y0 + edge + h * 0.05, W, Math.max(1, h * 0.045));

  // Batched by color: gold (both rules, even fan rays, chevrons), lit gold (the rules' lit
  // tops, odd fan rays), shaded gold (the rules' shaded bottoms, fan hubs).
  const step = u * STEP;
  const base = y1 - edge;
  const inner = base - (y0 + edge + h * 0.1);
  const r = inner * 0.95;
  const off = ((W / 2) % step) - step;
  const cw = step * 0.17;
  const ch = inner * 0.22;
  const t = Math.max(1.5, inner * 0.13);
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    if (pass === 0) {
      ctx.rect(0, y0, W, edge);
      ctx.rect(0, y1 - edge, W, edge);
    } else if (pass === 1) {
      ctx.rect(0, y0, W, edge * LIT);
      ctx.rect(0, y1 - edge, W, edge * LIT);
    } else {
      ctx.rect(0, y0 + edge * (1 - SHADE), W, edge * SHADE);
      ctx.rect(0, y1 - edge * SHADE, W, edge * SHADE);
    }
    for (let x = off; x < W + step; x += step) {
      if (pass < 2) {
        for (let i = pass; i < FAN_RAYS; i += 2) {
          const [a0, a1] = FAN_DIRS[i]!;
          ctx.moveTo(x, base);
          ctx.arc(x, base, r, a0, a1);
          ctx.closePath();
        }
      } else {
        ctx.moveTo(x - r * 0.3, base);
        ctx.arc(x, base, r * 0.3, Math.PI, 0);
        ctx.closePath();
      }
      if (pass === 0) {
        // Three nested chevrons, pointing up, between this fan and the next
        const xc = x + step / 2;
        for (let k = 0; k < 3; k++) {
          const yb = base - inner * 0.12 - k * inner * 0.28;
          const w = cw * (1 - k * 0.22);
          ctx.moveTo(xc - w, yb);
          ctx.lineTo(xc, yb - ch);
          ctx.lineTo(xc + w, yb);
          ctx.lineTo(xc + w, yb - t);
          ctx.lineTo(xc, yb - ch - t);
          ctx.lineTo(xc - w, yb - t);
          ctx.closePath();
        }
      }
    }
    ctx.fillStyle = pass === 0 ? GOLD : pass === 1 ? GOLD_LIGHT : GOLD_DARK;
    ctx.fill();
  }

  const lw = Math.max(1.5, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(W, y0);
  ctx.moveTo(0, y1);
  ctx.lineTo(W, y1);
  ink(ctx, lw, INK);
}

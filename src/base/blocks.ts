import type { CartoonSkin } from "../skins/skin";
import { alpha, ink, mix, roundRectPath, type Ctx } from "./draw";

// The bar every skin shares: a chunky 2D toy block. Flat bright color, a bevel on every side
// (light top and left, shaded bottom and right) so both ends read at a glance, an ink outline,
// and the skin's symbols inked on the face. Tight corners and no glossy caps, so it never reads
// as a capsule.

/** Corner radius as a fraction of bar height. Also used by the perfect-drop tint. */
export const BAR_RADIUS = 0.08;

export function drawBar(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, skin: CartoonSkin): void {
  const bars = skin.bars;
  const bar = bars[((level % bars.length) + bars.length) % bars.length]!;
  const c = bar.color;
  const inkColor = skin.palette.ink;
  const r = h * BAR_RADIUS;
  const bevel = Math.min(h * 0.16, w * 0.12);

  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = c;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Bevels: light from the top left
  ctx.fillStyle = mix(c, "#ffffff", 0.45);
  ctx.fillRect(x, y, w, bevel);
  ctx.fillStyle = mix(c, "#000000", 0.3);
  ctx.fillRect(x, y + h - bevel * 1.15, w, bevel * 1.15);
  ctx.fillStyle = mix(c, "#ffffff", 0.25);
  ctx.fillRect(x, y, bevel, h);
  ctx.fillStyle = mix(c, "#000000", 0.18);
  ctx.fillRect(x + w - bevel, y, bevel, h);
  // A short shine near the top-left corner
  ctx.fillStyle = alpha("#ffffff", 0.55);
  ctx.fillRect(x + bevel * 1.6, y + bevel * 1.35, Math.min(w * 0.18, h * 0.9), Math.max(1, h * 0.07));

  // Symbols, inked on the face between the end bevels
  const inner = w - bevel * 4;
  if (inner > h * 0.8) {
    const s = h * 0.56;
    const step = h * 1.5;
    const n = Math.max(1, Math.floor(inner / step));
    const start = x + bevel * 2 + (inner - n * step) / 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.3, h * 0.075);
    const symbol = alpha(mix(inkColor, c, 0.15), 0.72);
    ctx.strokeStyle = symbol;
    ctx.fillStyle = symbol;
    for (let i = 0; i < n; i++) bar.icon(ctx, start + step * (i + 0.5), y + h / 2 + bevel * 0.05, s);
  }
  ctx.restore();

  roundRectPath(ctx, x, y, w, h, r);
  ink(ctx, Math.max(1.5, h * 0.09), inkColor);
}

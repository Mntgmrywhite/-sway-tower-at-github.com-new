import type { Skin } from "../skins/skin";
import { alpha, mix, neonStroke, roundRectPath, type Ctx } from "./draw";

// Neon bars: the one look every skin shares. Dark glass body tinted by the bar color,
// a glowing tube around the edge, bright end caps so both edges read at a glance,
// and the skin's symbol drawn in neon. Corners are tight so they read as light tubes,
// not capsules.

/** Corner radius as a fraction of bar height. Also used by the perfect-drop tint. */
export const BAR_RADIUS = 0.14;

export function drawBar(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, skin: Skin): void {
  const bars = skin.bars;
  const bar = bars[((level % bars.length) + bars.length) % bars.length]!;
  const c = bar.color;
  const r = h * BAR_RADIUS;
  const tube = Math.max(1.4, h * 0.1);
  const capW = Math.min(h * 0.5, w * 0.2);

  // Dark glass body
  roundRectPath(ctx, x, y, w, h, r);
  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, mix(c, "#000000", 0.62));
  body.addColorStop(0.5, mix(c, "#000000", 0.8));
  body.addColorStop(1, mix(c, "#000000", 0.88));
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Inner reflection along the top
  ctx.fillStyle = alpha("#ffffff", 0.1);
  ctx.fillRect(x, y + h * 0.1, w, h * 0.12);

  // Symbols between the caps, in neon
  const inner = w - capW * 2;
  if (inner > h * 0.8) {
    const s = h * 0.62;
    const step = h * 1.55;
    const n = Math.max(1, Math.floor(inner / step));
    const start = x + capW + (inner - n * step) / 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const icon = mix(c, "#ffffff", 0.35);
    for (const [width, a] of [
      [Math.max(2.5, h * 0.17), 0.22],
      [Math.max(1.1, h * 0.06), 1],
    ] as const) {
      ctx.lineWidth = width;
      ctx.strokeStyle = alpha(icon, a);
      ctx.fillStyle = alpha(icon, a);
      for (let i = 0; i < n; i++) bar.icon(ctx, start + step * (i + 0.5), y + h / 2, s);
    }
  }
  ctx.restore();

  // Neon tube around the edge
  roundRectPath(ctx, x, y, w, h, r);
  neonStroke(ctx, c, tube, 3.2);

  // Bright end caps
  const capInset = tube * 1.4;
  ctx.beginPath();
  ctx.moveTo(x + capInset, y + h * 0.24);
  ctx.lineTo(x + capInset, y + h * 0.76);
  ctx.moveTo(x + w - capInset, y + h * 0.24);
  ctx.lineTo(x + w - capInset, y + h * 0.76);
  neonStroke(ctx, mix(c, "#ffffff", 0.5), Math.max(1.6, h * 0.11), 2.4);
}

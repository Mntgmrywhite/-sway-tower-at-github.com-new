import * as icons from "./halloween-icons";
import { background, foreground } from "./halloween-scene";
import { mix, roundRectPath, type Theme } from "./theme";

// Cartoon bars in the style of the scene: an ink outline, a light top and shaded bottom,
// a glossy highlight stripe, and pipe-style end caps so both edges are easy to read.
// A row of inked Halloween symbols sits between the caps.

const INK = "#2a1f3d";

interface Bar {
  color: string;
  icon: icons.Icon;
}

/** Cycles up the tower; neighbors contrast so every seam is obvious. */
const BARS: Bar[] = [
  { color: "#ff9a2e", icon: icons.pumpkin },
  { color: "#a173e0", icon: icons.witchHat },
  { color: "#ffd23f", icon: icons.candyCorn },
  { color: "#7fdfe6", icon: icons.ghost },
  { color: "#7d6ad0", icon: icons.bat },
  { color: "#9fd67a", icon: icons.tombstone },
  { color: "#e8d6a4", icon: icons.mummy },
  { color: "#78a5ff", icon: icons.moon },
  { color: "#f2eee4", icon: icons.skull },
  { color: "#ff6274", icon: icons.fangs },
  { color: "#ff86d4", icon: icons.spider },
  { color: "#5fd6b0", icon: icons.house },
];

/** Fill a rounded rect with the bar's shading: light top, base middle, dark bottom. */
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  roundRectPath(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, mix(color, "#ffffff", 0.4));
  g.addColorStop(0.35, color);
  g.addColorStop(1, mix(color, "#000000", 0.28));
  ctx.fillStyle = g;
  ctx.fill();
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number): void {
  const bar = BARS[((level % BARS.length) + BARS.length) % BARS.length]!;
  const r = h * 0.2;
  const lw = Math.max(1.5, h * 0.09);
  const capW = Math.min(h * 0.6, w * 0.22);

  shade(ctx, x, y, w, h, r, bar.color);

  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  // Glossy stripe along the top
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(x + capW + h * 0.12, y + h * 0.14, Math.max(0, w - capW * 2 - h * 0.24), h * 0.12);

  // Inked symbols between the caps
  const inner = w - capW * 2;
  if (inner > h * 0.7) {
    const s = h * 0.6;
    const step = h * 1.55;
    const n = Math.max(1, Math.floor(inner / step));
    const start = x + capW + (inner - n * step) / 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.3, h * 0.075);
    ctx.strokeStyle = mix(INK, bar.color, 0.15);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < n; i++) bar.icon(ctx, start + step * (i + 0.5), y + h / 2, s);
    ctx.globalAlpha = 1;
  }

  // Pipe-style end caps: lighter, with an inked seam on the inside edge
  const capColor = mix(bar.color, "#ffffff", 0.18);
  for (const cx of [x, x + w - capW]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, y, capW, h);
    ctx.clip();
    shade(ctx, x, y, w, h, r, capColor);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(cx + capW * 0.22, y + h * 0.14, capW * 0.18, h * 0.6);
    ctx.restore();
  }
  ctx.restore();

  ctx.lineCap = "butt";
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  if (w > capW * 2) {
    ctx.moveTo(x + capW, y);
    ctx.lineTo(x + capW, y + h);
    ctx.moveTo(x + w - capW, y);
    ctx.lineTo(x + w - capW, y + h);
  }
  ctx.stroke();

  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;
  ctx.stroke();
}

export const halloween: Theme = {
  background,
  foreground,
  block,
  hud: {
    display: "Creepster, Impact, 'Arial Black', sans-serif",
    body: "Fredoka, 'Trebuchet MS', system-ui, sans-serif",
    title: "#ff9a2e",
    outline: "#000000",
    score: "#ffffff",
    muted: "#ece7ff",
    life: "#ff9a2e",
    lifeLost: "rgba(255, 255, 255, 0.3)",
    streak: "#ffe066",
  },
};

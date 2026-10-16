import * as icons from "./halloween-icons";
import { background, foreground } from "./halloween-scene";
import { roundRectPath, type Theme } from "./theme";

// Neon bars with Halloween symbols. Each bar: dark tinted fill, glowing neon tube
// around the edge, brighter caps on both ends so the edges are easy to line up,
// and a row of neon line icons inside.

interface Bar {
  hue: number;
  sat: number;
  icon: icons.Icon;
}

/** Cycles up the tower; neighbors are far apart in hue so every seam is obvious. */
const BARS: Bar[] = [
  { hue: 28, sat: 100, icon: icons.pumpkin },
  { hue: 280, sat: 100, icon: icons.witchHat },
  { hue: 50, sat: 100, icon: icons.candyCorn },
  { hue: 185, sat: 100, icon: icons.ghost },
  { hue: 265, sat: 100, icon: icons.bat },
  { hue: 145, sat: 90, icon: icons.tombstone },
  { hue: 35, sat: 60, icon: icons.mummy },
  { hue: 215, sat: 100, icon: icons.moon },
  { hue: 0, sat: 0, icon: icons.skull },
  { hue: 352, sat: 100, icon: icons.fangs },
  { hue: 315, sat: 100, icon: icons.spider },
  { hue: 170, sat: 100, icon: icons.house },
];

const GLOW = "#ffd860";

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number): void {
  const bar = BARS[((level % BARS.length) + BARS.length) % BARS.length]!;
  const hsl = (l: number, a = 1) => `hsla(${bar.hue}, ${bar.sat}%, ${l}%, ${a})`;
  const r = h * 0.28;

  // Dark tinted body
  roundRectPath(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hsl(24));
  g.addColorStop(1, hsl(11));
  ctx.fillStyle = g;
  ctx.fill();

  // Icons, clipped to the bar
  ctx.save();
  ctx.clip();
  const s = h * 0.62;
  const step = h * 1.55;
  const n = Math.max(1, Math.floor(w / step));
  const start = x + (w - n * step) / 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [width, alpha] of [
    [Math.max(2.5, h * 0.16), 0.3],
    [Math.max(1.2, h * 0.06), 1],
  ] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = hsl(74, alpha);
    ctx.fillStyle = hsl(74, alpha);
    for (let i = 0; i < n; i++) bar.icon(ctx, start + step * (i + 0.5), y + h / 2, s);
  }
  ctx.restore();

  // Neon tube around the edge: soft glow, then the crisp tube.
  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = Math.max(4, h * 0.3);
  ctx.strokeStyle = hsl(60, 0.28);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.75, h * 0.1);
  ctx.strokeStyle = hsl(64);
  ctx.stroke();

  // Bright end caps mark exactly where the bar starts and stops.
  const capW = Math.max(2, h * 0.13);
  const inset = capW / 2 + 0.5;
  ctx.lineCap = "round";
  ctx.lineWidth = capW;
  ctx.strokeStyle = hsl(88);
  ctx.beginPath();
  ctx.moveTo(x + inset, y + r * 0.8);
  ctx.lineTo(x + inset, y + h - r * 0.8);
  ctx.moveTo(x + w - inset, y + r * 0.8);
  ctx.lineTo(x + w - inset, y + h - r * 0.8);
  ctx.stroke();
  ctx.lineCap = "butt";
}

export const halloween: Theme = {
  background,
  foreground,
  block,
  hud: {
    score: "#ffb347",
    muted: "rgba(255, 228, 190, 0.75)",
    life: "#ff8a1f",
    lifeLost: "rgba(255, 255, 255, 0.2)",
    streak: GLOW,
  },
};

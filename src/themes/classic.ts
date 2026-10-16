import type { Theme } from "./theme";

function color(level: number, lightness = 60): string {
  return `hsl(${(200 + level * 7) % 360} 70% ${lightness}%)`;
}

export const classic: Theme = {
  background(ctx, s) {
    ctx.fillStyle = "#14161f";
    ctx.fillRect(0, 0, s.cssW, s.cssH);
    // Pedestal under the base so the tower doesn't float.
    ctx.fillStyle = "#232636";
    ctx.fillRect(s.baseX, s.groundY, s.baseW, Math.max(0, s.cssH - s.groundY));
  },

  block(ctx, x, y, w, h, level) {
    ctx.fillStyle = color(level);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color(level, 72);
    ctx.fillRect(x, y, w, Math.max(2, h * 0.18));
  },

  hud: {
    display: "system-ui, sans-serif",
    score: "#ffffff",
    muted: "rgba(255,255,255,0.6)",
    life: "#ff6b7a",
    lifeLost: "rgba(255,255,255,0.15)",
    streak: "#9fd0ff",
  },
};

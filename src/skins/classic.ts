import { hash, type Ctx } from "../base/draw";
import { bolt, chevron, cross, diamond, dots, hexagon, plus, ring, square, star, triangle, wave } from "./glyphs";
import type { CartoonSkin, Scene } from "./skin";

// The default look: a bright 2D cartoon night. Periwinkle sky, teal clouds piled at the sides,
// a faded city on the horizon (all from the base world), hot-air balloons drifting far off,
// and chunky toy-block bars in candy colors.

const BALLOON = "#5a50b4"; // faded, like everything in the distance

/** Far-off hot-air balloons: start x (0..1 of the screen), height (fraction), size (u), drift speed. */
const BALLOONS = [
  [0.62, 0.34, 0.05, 4],
  [0.3, 0.44, 0.032, -3],
  [0.82, 0.5, 0.025, 2.5],
] as const;

function balloon(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r, y - r * 1.4, x + r, y - r * 1.4, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.7, x + r * 0.25, y + r * 1.05);
  ctx.lineTo(x - r * 0.25, y + r * 1.05);
  ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.7, x - r, y);
  ctx.rect(x - r * 0.22, y + r * 1.3, r * 0.44, r * 0.32); // basket
  ctx.fill();
  ctx.fillRect(x - r * 0.2, y + r * 1.05, Math.max(0.8, r * 0.05), r * 0.27);
  ctx.fillRect(x + r * 0.15, y + r * 1.05, Math.max(0.8, r * 0.05), r * 0.27);
}

function sky(ctx: Ctx, s: Scene): void {
  ctx.fillStyle = BALLOON;
  for (const [i, [fx, fy, size, speed]] of BALLOONS.entries()) {
    const span = s.cssW * 1.3;
    const x = ((((fx * s.cssW + s.t * speed) % span) + span) % span) - s.cssW * 0.15;
    const y = s.cssH * fy + Math.sin(s.t * 0.4 + i * 2) * s.u * 0.01;
    if (y > s.horizonY - s.u * 0.1) continue;
    balloon(ctx, x, y, s.u * size);
  }
  // A few birds gliding across
  ctx.strokeStyle = BALLOON;
  ctx.lineWidth = Math.max(1.2, s.u * 0.005);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const span = s.cssW + 80;
    const x = ((s.t * (18 + i * 6) + hash(i) * span) % span) - 40;
    const y = s.cssH * (0.24 + i * 0.05) + Math.sin(s.t + i) * 6;
    const flap = Math.sin(s.t * 6 + i) * s.u * 0.006;
    const w = s.u * (0.018 - i * 0.003);
    ctx.moveTo(x - w, y - flap);
    ctx.quadraticCurveTo(x - w * 0.4, y - w * 0.5, x, y);
    ctx.quadraticCurveTo(x + w * 0.4, y - w * 0.5, x + w, y - flap);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

export const classic: CartoonSkin = {
  id: "classic",
  name: "Classic",
  fonts: ["Luckiest Guy"],
  palette: {
    skyTop: "#3a3c8c",
    skyMid: "#6a62c8",
    skyBottom: "#9a8ae6",
    star: "#ffffff",
    moon: "#eeedf9",
    cloudShadow: "#3f9fb0",
    cloudBase: "#5cc6bf",
    cloudLight: "#90ecd8",
    far: "#544aa9",
    fieldFar: "#5aa36e",
    fieldNear: "#3a7a4c",
    grass: "#a6d047",
    grassDark: "#6f9a2e",
    stone: "#57707f",
    stoneLight: "#6c8796",
    ink: "#2a1f3d",
  },
  bars: [
    { color: "#ff6fae", icon: triangle },
    { color: "#ffd23f", icon: ring },
    { color: "#5fd7f0", icon: bolt },
    { color: "#ff9a2e", icon: diamond },
    { color: "#a6e05a", icon: chevron },
    { color: "#a173e0", icon: square },
    { color: "#ff5a5f", icon: star },
    { color: "#3fd6b0", icon: cross },
    { color: "#5b8cff", icon: hexagon },
    { color: "#ffb35c", icon: wave },
    { color: "#e05ad8", icon: plus },
    { color: "#f5e663", icon: dots },
  ],
  hud: {
    display: "'Luckiest Guy', 'Arial Black', Impact, sans-serif",
    title: "#ffd23f",
    ui: "#3a3180",
    accent: "#ffe066",
    life: "#ff6fae",
  },
  sky,
};

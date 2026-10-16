import { bolt, chevron, cross, diamond, dots, hexagon, plus, ring, square, star, triangle, wave } from "./glyphs";
import type { Skin } from "./skin";

// The pure neon look: magenta sky, cyan grid, striped sun, wireframe mountains (all from the
// neon world), and simple geometric glyphs on the bars.

export const neon: Skin = {
  id: "neon",
  style: "neon",
  name: "Neon",
  palette: {
    skyTop: "#07020f",
    skyMid: "#2a0838",
    skyBottom: "#6a0f5c",
    horizon: "#ff2fa8",
    grid: "#22e3ff",
    floorFar: "#1c0630",
    floorNear: "#05010b",
    sunTop: "#ffe24d",
    sunBottom: "#ff2d8f",
    star: "#ffffff",
  },
  bars: [
    { color: "#ff2fa8", icon: triangle },
    { color: "#22e3ff", icon: ring },
    { color: "#ffe24d", icon: bolt },
    { color: "#9b5cff", icon: diamond },
    { color: "#39ff88", icon: chevron },
    { color: "#ff7a2f", icon: square },
    { color: "#2f7bff", icon: star },
    { color: "#ff3b5c", icon: cross },
    { color: "#e04bff", icon: hexagon },
    { color: "#4dfff0", icon: wave },
    { color: "#c8ff3b", icon: plus },
    { color: "#ff8adf", icon: dots },
  ],
  hud: {
    display: "Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#ffe6fb",
    ui: "#ff2fa8",
    accent: "#ffe24d",
    life: "#ff2fa8",
  },
};

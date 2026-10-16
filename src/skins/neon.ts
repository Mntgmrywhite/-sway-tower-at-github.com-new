import { bolt, chevron, cross, diamond, hexagon, ring, square, star, triangle, wave } from "./glyphs";
import { city } from "./neon/city";
import { CYAN, GOLD, PINK, SKY_BOTTOM, SKY_MID, SKY_TOP } from "./neon/colors";
import { ground } from "./neon/ground";
import { palm, sunset } from "./neon/icons";
import { sky, sun } from "./neon/sky";
import type { NeonSkin } from "./skin";

// Neon Synthwave: an 80s sunset drive. A violet dusk sky with a striped gold-to-pink sun,
// puffy dusk clouds lit pink from below and shooting stars; wireframe mountains and a sunset
// city skyline on the horizon; a cyan grid floor with a roadside arcade, palm silhouettes
// framing the scene and a chrome wedge car (our own design) cruising past, taillights trailing
// light. Props are dark silhouettes with thin neon rims so the glowing bars stay the brightest
// thing on screen. Scenery lives in src/skins/neon/.

export const neon: NeonSkin = {
  id: "neon",
  style: "neon",
  name: "Neon Synthwave",
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_BOTTOM,
    horizon: PINK,
    grid: CYAN,
    floorFar: "#1c0630",
    floorNear: "#05010b",
    sunTop: GOLD,
    sunBottom: "#ff2d8f",
    star: "#ffffff",
  },
  // Sunset neons; neighbors alternate warm / cool so every seam reads.
  bars: [
    { color: "#ff2fa8", icon: triangle },
    { color: "#22e3ff", icon: ring },
    { color: "#ffd84a", icon: bolt },
    { color: "#9b5cff", icon: diamond },
    { color: "#ff8a2a", icon: sunset },
    { color: "#2f7bff", icon: star },
    { color: "#ff3b5c", icon: cross },
    { color: "#4dfff0", icon: wave },
    { color: "#e04bff", icon: hexagon },
    { color: "#3dffa8", icon: chevron },
    { color: "#ff7ad9", icon: palm },
    { color: "#7a8bff", icon: square },
  ],
  hud: {
    display: "Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#ffe6fb",
    ui: "#ff2fa8",
    accent: "#ffe24d",
    life: "#ff2fa8",
  },
  celestial: sun,
  sky,
  far: city,
  ground,
};

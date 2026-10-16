import { diamond, plus, ring, square, triangle, wave } from "./glyphs";
import { BLUE, COVE, GOLD, GREEN, ORANGE, PINK, WARM_WHITE } from "./neon-minimal/colors";
import { ground } from "./neon-minimal/floor";
import { far } from "./neon-minimal/gallery";
import { arc, crescent, dot, heavy, line } from "./neon-minimal/icons";
import { celestial, sky } from "./neon-minimal/sky";
import type { NeonSkin } from "./skin";

// Neon Minimal: an aesthetic art-display room in neon line art. Neutral darks (warm charcoal
// down by the floor, deep slate up high) and lots of empty space; a freestanding orange arch
// framing a gold line and a pink sun, a green botanical sprig mounted on a slate panel, a gold
// crescent-moon line, a turning blue ring and a pink triangle on plinths, all reflected in a
// calm polished floor (the grid is barely there). Everything moves slowly: halos breathe,
// the ring turns, dust drifts through the light, constellations slide past as you climb.

export const neonMinimal: NeonSkin = {
  id: "neon-minimal",
  style: "neon",
  name: "Neon Minimal",
  fonts: ["Comfortaa:wght@700"],
  palette: {
    skyTop: "#0d0f14",
    skyMid: "#18191e",
    skyBottom: "#2a2421",
    horizon: COVE,
    grid: "#201e25", // barely there: the floor reads as polished stone, not a synthwave grid
    floorFar: "#221e20",
    floorNear: "#0b0b0e",
    sunTop: GOLD,
    sunBottom: PINK,
    star: "#77727f",
  },
  // The five neons plus lighter siblings; warm and cool alternate so every seam reads.
  // bars[0] (the base) is ORANGE: the floor reflects it (floor.ts).
  bars: [
    { color: ORANGE, icon: heavy(arc) },
    { color: BLUE, icon: heavy(ring) },
    { color: GOLD, icon: crescent },
    { color: GREEN, icon: heavy(wave) },
    { color: PINK, icon: heavy(triangle) },
    { color: "#3cc8ff", icon: heavy(plus) },
    { color: WARM_WHITE, icon: dot },
    { color: "#9cf03a", icon: heavy(line) },
    { color: "#ff4fd8", icon: heavy(square) },
    { color: "#36f2c2", icon: heavy(diamond) },
  ],
  hud: {
    display: "Comfortaa, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif",
    title: "#fff1e2",
    ui: ORANGE,
    accent: GOLD,
    life: PINK,
  },
  celestial,
  sky,
  far,
  ground,
};

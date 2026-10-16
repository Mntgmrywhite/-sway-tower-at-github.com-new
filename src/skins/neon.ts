import { bolt, chevron, diamond, hexagon, ring, star, triangle, wave } from "./glyphs";
import { city } from "./neon/city";
import { CYAN, GOLD, PINK, SKY_BOTTOM, SKY_MID, SKY_TOP } from "./neon/colors";
import { ground } from "./neon/ground";
import { palm, peaks, planet, sunset } from "./neon/icons";
import { celestial, sky } from "./neon/sky";
import type { NeonSkin } from "./skin";

// Neon Synthwave: an 80s sunset drive, and then up into the stars. At the start, the striped
// gold-to-pink sun sits on the horizon behind wireframe mountains and a sunset city skyline,
// the cyan grid streams toward you, two tall palms frame the scene, a roadside arcade glows
// under one and a chrome wedge coupe (our own design) cruises down the lane under the other;
// on the song's first drop it floors it and drives off into the distance, and eight bars later
// it comes back round from behind us (neon/car.ts). As you climb you rise past the palm crowns
// (the grid keeps its pattern as the floor sinks away), the sun sinks into the horizon, sunset
// cloud streaks and a line of neon flamingos drift by in the side lanes, and a bank of night
// cloud rolls in over the grid. Then the violet hour: neon clouds with glowing bases, shooting
// stars and a wireframe moon. High up the cloud bank swallows the skyline and a ringed planet,
// striped like the sun that set, rises over a starry synth sky with neon constellations. From
// there the sky story loops for as long as you climb: an afterglow rises from below, the clouds
// light up pink, flamingos cross a violet dusk, and the starry night comes out again.
// Props are dark silhouettes with thin neon rims so the glowing bars stay the brightest thing
// on screen, and nothing lives in the tower's column. Scenery lives in src/skins/neon/; the
// height story's colors (and its loop) are in neon/tone.ts.

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
    { color: "#9b5cff", icon: peaks },
    { color: "#ff8a2a", icon: sunset },
    { color: "#2f7bff", icon: star },
    { color: "#ff3b5c", icon: planet },
    { color: "#4dfff0", icon: wave },
    { color: "#e04bff", icon: diamond },
    { color: "#3dffa8", icon: chevron },
    { color: "#ff7ad9", icon: palm },
    { color: "#7a8bff", icon: hexagon },
  ],
  hud: {
    display: "Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#ffe6fb",
    ui: "#ff2fa8",
    accent: "#ffe24d",
    life: "#ff2fa8",
  },
  celestial,
  sky,
  far: city,
  ground,
};

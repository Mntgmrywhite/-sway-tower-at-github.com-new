import type { NeonSkin } from "./skin";
import { city } from "./neon-cyber/city";
import { AMBER, BASE_BAR, BLUE, CYAN, PALETTE, PURPLE } from "./neon-cyber/colors";
import * as icon from "./neon-cyber/icons";
import { hazyMoon, cyberSky } from "./neon-cyber/sky";
import { street } from "./neon-cyber/street";
import { nearRain } from "./neon-cyber/weather";

// Neon Cyberpunk: tech noir in neon blue, electric purple and magenta on charcoal. A rainy
// megacity at night: a hazy moon veiled by smog, searchlights, air traffic, drones and an
// airship gliding between and above the towers; layered skyscrapers with lit window grids,
// vertical glyph signs (our own abstract marks) and a flickering holographic billboard; and
// down on the wet asphalt, shimmering reflections, splashes, a figure under a glowing umbrella
// beneath a street lamp, a noodle stall, a steam vent, a parked hover car and vending machines.
// The scenery stays dark and calm so the glowing bars are the brightest thing on screen.

export const neonCyber: NeonSkin = {
  id: "neon-cyber",
  style: "neon",
  name: "Neon Cyberpunk",
  fonts: ["Zen Dots"],
  palette: PALETTE,
  // Neighbors alternate warm / cool and light / deep so every seam reads.
  bars: [
    { color: BASE_BAR, icon: icon.circuit },
    { color: CYAN, icon: icon.chip },
    { color: PURPLE, icon: icon.eye },
    { color: "#ffe03a", icon: icon.lightning },
    { color: BLUE, icon: icon.hex },
    { color: "#39ffb0", icon: icon.dataStream },
    { color: "#ff3b6b", icon: icon.lock },
    { color: "#5ad8ff", icon: icon.antenna },
    { color: "#d64bff", icon: icon.skullMask },
    { color: "#c4d2ff", icon: icon.blade },
    { color: AMBER, icon: icon.satellite },
    { color: "#2ff5d2", icon: icon.wifi },
  ],
  hud: {
    display: "'Zen Dots', Orbitron, 'Arial Black', sans-serif",
    title: "#e6f3ff",
    ui: "#a04dff",
    accent: "#38e8ff",
    life: "#ff2bd6",
  },
  celestial: hazyMoon,
  sky: cyberSky,
  far: city,
  ground: street,
  foreground: nearRain,
};

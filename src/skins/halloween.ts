import { fence } from "./halloween/fence";
import { graveyard } from "./halloween/graveyard";
import * as icon from "./halloween/icons";
import { flyers, moon } from "./halloween/sky";
import { town } from "./halloween/town";
import type { Skin } from "./skin";

// Halloween on the neon base: a purple-black night with an orange horizon and a violet grid,
// a big cratered moon instead of the striped sun, witches and bats crossing the sky, a haunted
// town and mansion on the horizon, and a graveyard around the tower where skeletons claw their
// way out of the dirt. Props are dark silhouettes with neon rims, like the rest of the game.

export const halloween: Skin = {
  id: "halloween",
  name: "Halloween",
  dates: [{ from: [10, 1], to: [11, 1] }],
  fonts: ["Creepster"],
  palette: {
    skyTop: "#040108",
    skyMid: "#18072a",
    skyBottom: "#4a1244",
    horizon: "#ff7a1a",
    grid: "#a34bff",
    floorFar: "#1e0a2c",
    floorNear: "#050108",
    sunTop: "#fff4d6",
    sunBottom: "#ff7a1a",
    star: "#f4e9ff",
  },
  // Neighbors alternate warm / cool so every seam reads.
  bars: [
    { color: "#ff7a1a", icon: icon.pumpkin },
    { color: "#a64bff", icon: icon.witchHat },
    { color: "#ffd23a", icon: icon.candyCorn },
    { color: "#35e8ff", icon: icon.ghost },
    { color: "#ff3bd4", icon: icon.bat },
    { color: "#6dff3a", icon: icon.tombstone },
    { color: "#ffe3a6", icon: icon.mummy },
    { color: "#5b7cff", icon: icon.moon },
    { color: "#eae6ff", icon: icon.skull },
    { color: "#ff3b4f", icon: icon.fangs },
    { color: "#c6ff2e", icon: icon.spider },
    { color: "#9d5bff", icon: icon.hauntedHouse },
  ],
  hud: {
    display: "Creepster, Impact, 'Arial Black', sans-serif",
    title: "#ff8a1f",
    titleGlow: "#9b3bff",
    accent: "#ffc21a",
    life: "#ff7a1a",
  },
  celestial: moon,
  sky: flyers,
  far: town,
  ground: graveyard,
  foreground: fence,
};

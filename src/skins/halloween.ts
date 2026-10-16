import { PALETTE } from "./halloween/common";
import { graveyard } from "./halloween/graveyard";
import * as icon from "./halloween/icons";
import { flyers, moon } from "./halloween/sky";
import { town } from "./halloween/town";
import type { CartoonSkin } from "./skin";

// Halloween in the bright cartoon style: a periwinkle-purple night with teal clouds piled at
// the sides, a big cream moon with a witch crossing it and bats flitting about, a faded
// haunted town and mansion on the horizon, and a graveyard around the tower: weathered
// tombstones planted in their mounds, a jack-o'-lantern glowing behind the tower, and open
// graves where skeleton hands, skulls and feet pop up at random.

export const halloween: CartoonSkin = {
  id: "halloween",
  name: "Halloween",
  dates: [{ from: [10, 1], to: [11, 1] }],
  fonts: ["Creepster"],
  palette: PALETTE,
  // Candy colors; neighbors alternate warm / cool and light / dark so every seam reads.
  bars: [
    { color: "#ff9a2e", icon: icon.pumpkin },
    { color: "#a173e0", icon: icon.witchHat },
    { color: "#ffd23f", icon: icon.candyCorn },
    { color: "#5fd7f0", icon: icon.ghost },
    { color: "#ff6fae", icon: icon.bat },
    { color: "#a6e05a", icon: icon.tombstone },
    { color: "#f2d7a0", icon: icon.mummy },
    { color: "#5b8cff", icon: icon.moon },
    { color: "#f4f0e4", icon: icon.skull },
    { color: "#ff5a5f", icon: icon.fangs },
    { color: "#e05ad8", icon: icon.spider },
    { color: "#3fd6b0", icon: icon.hauntedHouse },
  ],
  hud: {
    display: "Creepster, Impact, 'Arial Black', sans-serif",
    title: "#ff9a2e",
    ui: "#4a2a86",
    accent: "#ffd23f",
    life: "#ff9a2e",
  },
  celestial: moon,
  sky: flyers,
  far: town,
  ground: graveyard,
};

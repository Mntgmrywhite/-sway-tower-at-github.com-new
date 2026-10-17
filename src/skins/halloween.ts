import { PALETTE } from "./halloween/common";
import { ground } from "./halloween/graveyard";
import { hollow } from "./halloween/hollow";
import * as icon from "./halloween/icons";
import { piles } from "./halloween/leaves";
import { celestial, flyers } from "./halloween/sky";
import type { CartoonSkin } from "./skin";

// Halloween, after Trick 'r Treat and The Legend of Sleepy Hollow, in the bright cartoon
// style. A small town on Halloween night: porch houses lined with jack-o'-lanterns, leaves
// blowing on the wind, and trick-or-treaters in homemade costumes (witch, skeleton, cat,
// pumpkin, caped hero) with their candy bags. The tower stands in the old churchyard, among
// weathered headstones and open graves where skeleton parts pop up at random, with a big
// jack-o'-lantern glowing behind it. Beyond the town lies the misty hollow: a covered bridge,
// a giant gnarled tree, the church steeple in the fog, crows, and on the hill under the
// harvest moon the Headless Horseman galloping past with his flaming pumpkin held high, down
// into the bridge, then charging back up the hill and away into the mist.

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
    { color: "#5fd7f0", icon: icon.crow },
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
  celestial,
  sky: flyers,
  far: hollow,
  ground,
  foreground: piles,
};

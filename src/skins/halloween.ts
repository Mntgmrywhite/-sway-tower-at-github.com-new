import { backdrop } from "./halloween/backdrop";
import { PALETTE } from "./halloween/common";
import { front } from "./halloween/front";
import * as icon from "./halloween/icons";
import type { CartoonSkin } from "./skin";

// Halloween: a Main Street Halloween night in a Tim Burton style, all our own designs (never a
// Disney or Nightmare Before Christmas character, sign or distinctive design). Deep indigo sinking
// to plum with the last pumpkin ember of the dusk on the horizon, Burton swirls of cloud rolled up
// into spirals out in the lanes, and a huge flat cream moon low on the left with rings of
// moonlight round it. Across the hollow (hollow.ts) the Headless Horseman gallops along his hill
// across the moon's face, down into the old covered bridge at the far end of Main Street, and
// charges back; on a jagged crag on the right the crooked mansion (mansion.ts) leans one way while
// its great tower leans the other, up to a clock, a belfry and a witch-hat spire curling into a
// spiral, every window lit, bats flitting round it and a flock of crows wheeling above. Main Street
// (street.ts) runs away from the square behind the tower in one-point perspective, its gas lamps
// and walls of crooked shopfronts lost in drifting bands of fog long before the bridge (the column
// behind the tower kept quiet). On the square (shops.ts) the corner shops lean in over it, inked
// in slate and plum: a sweet shop under a sagging gable strung with lights, a curio shop with a
// mansard, iron cresting and a turret, striped awnings, bunting fans, a stitched patch, shop
// windows glowing with the wares, jack-o'-lanterns lining the steps (spindly tower-houses stand
// further out where a screen is wide enough). The giant jack-o'-lantern, its crown cracked and
// sewn up, grins from a pumpkin pile in a flower bed ringed by a chain railing behind the tower
// (square.ts), towering over the trick-or-treaters in homemade costumes either side; in front of
// a black-and-white striped kerb the old churchyard, its open graves where skeleton parts pop up
// at random and the crow on the RIP stone that takes its turn round the moon (graveyard.ts).
// Fireflies blink in the lanes, leaves blow on the wind, and in front (front.ts) a wrought-iron
// railing curling into spirals, cobwebs, hay bales heaped with pumpkins and lanterns. Glow is the
// only brightness.
//
// Height tells the story and loops (tone.ts): dusk deepens into night as you climb, the mist
// gathers and swallows the town (fog.ts), a jack-o'-lantern hot-air balloon keeps you company in
// the sky over the moon (balloon.ts), the hollow fades, and the mansion stands out of the mist sea
// for good; then night, the mist (curling banks of fog drifting past), the witching hour (the moon
// burns orange, the clock strikes twelve, every window blazes and the bats pour out of the
// belfry) and night again, forever. Nothing ever crosses the moon but the Horseman and the crow.
//
// The skin paints everything behind the tower itself, in one pass (backdrop.ts).

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
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

import type { CartoonSkin } from "./skin";
import { city } from "./newyear/city";
import {
  AMBER,
  AMETHYST,
  AQUA,
  DECO_FACE,
  FAR,
  GOLD,
  INK,
  IVORY,
  LIME,
  MARBLE_FAR,
  MARBLE_NEAR,
  ORCHID,
  ROSE,
  RUBY,
  SAPPHIRE,
  SILVER,
  SKY_BOTTOM,
  SKY_MID,
  SKY_TOP,
} from "./newyear/colors";
import { SEASON_END } from "./newyear/countdown";
import { decoRail } from "./newyear/front";
import { partyTerrace } from "./newyear/ground";
import {
  bowTie,
  clock,
  cocktail,
  coupe,
  fan,
  feather,
  gramophoneIcon,
  pearls,
  saxophone,
  star,
  sunburst,
  topHat,
} from "./newyear/icons";
import { decoMoon, newYearSky } from "./newyear/sky";

// New Year's Eve, 1920s Manhattan, Gatsby glamour: Art Deco in black and gold, drawn in the
// bright cartoon style. A midnight-navy night (blue, never purple) with a pale-gold moon,
// fireworks bursting over the skyline (thicker as you climb), confetti and flapper's plumes
// drifting down the side lanes. Manhattan is the hero (city.ts, landmarks.ts): gold
// searchlights sweeping up behind three depths of our-own Deco towers — a hazy back row, a
// middle row with gilded stepped crowns, and five black-lacquer towers rimmed in gold with lit
// window grids and gilded crowns: the Sunburst's fan and needle spire, and the Times Tower,
// whose Deco screen over its clock always counts down to midnight (marquee.ts, countdown.ts:
// the time left, the last ten seconds big, MIDNIGHT, then HAPPY and the coming year) while the
// New Year's ball comes down its mast to land at midnight, in time with the song's crowd (or on
// its own when the music is off). Navy clouds with moonlit silver tops pile at its feet. Across
// the bay, the Gatsby mansion throws its party with the green light at the end of its dock; on
// our ivory-marble terrace, a gold-and-emerald sunburst inlay, a champagne-coupe tower, a
// gramophone and a cream boat-tail roadster with a boa on its door; in front, a black-and-gold
// Deco frieze of fans and chevrons. Past the climb the night goes round forever (story.ts):
// midnight, the grand finale, balloons let go, snow in the small hours, midnight again.

/** Bar fills: jewel tones, warm and cool alternating so every seam reads. */
const EMERALD_BAR = "#2fd396";

export const newYear: CartoonSkin = {
  id: "newyear",
  style: "cartoon",
  name: "New Year's",
  dates: [{ from: [12, 28], to: SEASON_END }],
  fonts: ["Limelight"],
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_BOTTOM,
    star: "#fff3d0",
    moon: "#fff0c6",
    cloudShadow: "#1f3d73",
    cloudBase: "#2f5494",
    // Moonlit silver caps: the gold stays the city's alone, and the bank recedes behind it.
    cloudLight: "#a9b9dc",
    far: FAR,
    fieldFar: MARBLE_FAR,
    fieldNear: MARBLE_NEAR,
    grass: GOLD,
    grassDark: "#c98a1e",
    stone: "#1a2038",
    stoneLight: "#2b3456",
    ink: INK,
  },
  bars: [
    { color: GOLD, icon: coupe },
    { color: SAPPHIRE, icon: pearls },
    { color: ROSE, icon: feather },
    { color: EMERALD_BAR, icon: fan },
    { color: IVORY, icon: topHat },
    { color: AMETHYST, icon: saxophone },
    { color: AMBER, icon: gramophoneIcon },
    { color: AQUA, icon: clock },
    { color: RUBY, icon: sunburst },
    { color: LIME, icon: cocktail },
    { color: ORCHID, icon: star },
    { color: SILVER, icon: bowTie },
  ],
  hud: {
    display: DECO_FACE,
    title: "#ffd34d",
    // Deep emerald lacquer: the Game Over card and panel rims, and (main.ts copies it to the
    // CSS --accent) the Options sheet's borders and switches, which a near-black lost.
    ui: "#0c5440",
    accent: "#ffe08a",
    life: "#59ffaa",
  },
  celestial: decoMoon,
  sky: newYearSky,
  far: city,
  ground: partyTerrace,
  foreground: decoRail,
};

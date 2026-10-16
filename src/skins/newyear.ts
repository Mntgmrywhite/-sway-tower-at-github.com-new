import type { CartoonSkin } from "./skin";
import { city } from "./newyear/city";
import {
  AMBER,
  AMETHYST,
  AQUA,
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

// New Year's: Manhattan and The Great Gatsby, Art Deco glamour in black and gold, drawn in the
// bright cartoon style. A deep indigo night with a pale-gold moon in flat Deco halos,
// fireworks that come thicker as you climb, confetti and flapper's plumes drifting down; a
// Deco skyline across the bay — stepped crowns floodlit gold, needle spires, a ball sliding
// down its mast toward midnight — with searchlights sweeping behind it and champagne clouds
// piled at its feet; out on a point, a château-style mansion throwing a party, the green light
// at the end of its dock; and on our ivory-marble terrace, a gold-and-emerald sunburst inlay, a
// champagne-coupe tower, a gramophone and a cream boat-tail roadster with a boa on its door.

/** Bar fills: jewel tones, warm and cool alternating so every seam reads. */
const EMERALD_BAR = "#2fd396";

export const newYear: CartoonSkin = {
  id: "newyear",
  style: "cartoon",
  name: "New Year's",
  dates: [{ from: [12, 28], to: [1, 6] }],
  fonts: ["Limelight"],
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_BOTTOM,
    star: "#fff3d0",
    moon: "#fff0c6",
    cloudShadow: "#cfa676",
    cloudBase: "#f4e0b6",
    cloudLight: "#fff8e6",
    far: FAR,
    fieldFar: MARBLE_FAR,
    fieldNear: MARBLE_NEAR,
    grass: GOLD,
    grassDark: "#c98a1e",
    stone: "#3f3680",
    stoneLight: "#5d52a6",
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
    display: "Limelight, 'Arial Black', Impact, sans-serif",
    title: "#ffd34d",
    ui: "#1f5f50",
    accent: "#ffe08a",
    life: "#4dffa0",
  },
  celestial: decoMoon,
  sky: newYearSky,
  far: city,
  ground: partyTerrace,
  foreground: decoRail,
};

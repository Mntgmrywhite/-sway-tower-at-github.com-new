import type { CartoonSkin } from "./skin";
import { city } from "./newyear/city";
import { BLUE, CYAN, FAR, GOLD, INK, LIME, MAGENTA, MINT, ORANGE, PINK, RED, SILVER, VIOLET } from "./newyear/colors";
import { partyPlaza } from "./newyear/ground";
import {
  balloon,
  bowTie,
  burst,
  clock,
  confetti,
  discoBall,
  flute,
  horn,
  partyHat,
  sparkle,
  star,
} from "./newyear/icons";
import { newYearSky, partyMoon } from "./newyear/sky";

// New Year's: a festive midnight city in the bright cartoon style. An indigo-to-violet sky
// with a party-hatted moon, cartoon fireworks that get busier as you climb and confetti
// drifting down; a faded skyline with a clock tower creeping toward twelve and a ball sliding
// down its mast; pink clouds piled at the sides; and on the violet-grey plaza, champagne
// popping in an ice bucket, a party popper, a stack of gifts and a bulb-lit marquee.

export const newYear: CartoonSkin = {
  id: "newyear",
  style: "cartoon",
  name: "New Year's",
  dates: [{ from: [12, 28], to: [1, 6] }],
  fonts: ["Luckiest Guy"],
  palette: {
    skyTop: "#2a2672",
    skyMid: "#4c3cab",
    skyBottom: "#8a5ccc",
    star: "#fff4dc",
    moon: "#fff3cf",
    cloudShadow: "#c0559f",
    cloudBase: "#ee86c4",
    cloudLight: "#ffc2e2",
    far: FAR,
    fieldFar: "#ad97c2",
    fieldNear: "#7a6793",
    grass: "#ffcf3a",
    grassDark: "#e09a1c",
    stone: "#5a5488",
    stoneLight: "#746ea4",
    ink: INK,
  },
  bars: [
    { color: PINK, icon: burst },
    { color: GOLD, icon: flute },
    { color: CYAN, icon: clock },
    { color: VIOLET, icon: partyHat },
    { color: ORANGE, icon: star },
    { color: SILVER, icon: discoBall },
    { color: RED, icon: balloon },
    { color: MINT, icon: sparkle },
    { color: MAGENTA, icon: horn },
    { color: BLUE, icon: bowTie },
    { color: LIME, icon: confetti },
  ],
  hud: {
    display: "'Luckiest Guy', 'Arial Black', Impact, sans-serif",
    title: "#ffd23f",
    ui: "#55309c",
    accent: "#ffe45c",
    life: "#ff4f9a",
  },
  celestial: partyMoon,
  sky: newYearSky,
  far: city,
  ground: partyPlaza,
};

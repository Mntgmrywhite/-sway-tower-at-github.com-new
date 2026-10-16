import type { Skin } from "./skin";
import { city } from "./newyear/city";
import { CYAN, GOLD, MAGENTA, SILVER, VIOLET } from "./newyear/colors";
import { partyFloor } from "./newyear/ground";
import {
  balloon,
  bowTie,
  burst,
  cheers,
  clock,
  confetti,
  crescent,
  discoBall,
  horn,
  partyHat,
  sparkle,
  star,
} from "./newyear/icons";
import { mirrorBall, newYearSky } from "./newyear/sky";

// New Year's: a midnight city celebration in neon. Black-and-violet night, a mirror ball
// rising over the skyline where the synthwave sun would be, fireworks that get busier as you
// climb, a clock tower creeping toward twelve while the ball drops down its mast, and
// champagne, a party popper, gifts and a bulb-lit marquee on the cyan grid.

export const newYear: Skin = {
  id: "newyear",
  name: "New Year's",
  dates: [{ from: [12, 28], to: [1, 6] }],
  fonts: ["Bungee Shade"],
  palette: {
    skyTop: "#030109",
    skyMid: "#150628",
    skyBottom: "#3c0b52",
    horizon: "#ff2fa8",
    grid: "#29e6ff",
    floorFar: "#1a0733",
    floorNear: "#04010a",
    sunTop: "#ffe08a",
    sunBottom: "#ff2fa8",
    star: "#fff4dc",
  },
  bars: [
    { color: GOLD, icon: cheers },
    { color: MAGENTA, icon: burst },
    { color: CYAN, icon: clock },
    { color: VIOLET, icon: partyHat },
    { color: SILVER, icon: discoBall },
    { color: MAGENTA, icon: balloon },
    { color: GOLD, icon: star },
    { color: CYAN, icon: horn },
    { color: VIOLET, icon: bowTie },
    { color: SILVER, icon: sparkle },
    { color: MAGENTA, icon: confetti },
    { color: CYAN, icon: crescent },
  ],
  hud: {
    display: "'Bungee Shade', Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#ffd75e",
    titleGlow: "#ff2fa8",
    accent: "#3ef0ff",
    life: "#ff2fa8",
  },
  celestial: mirrorBall,
  sky: newYearSky,
  far: city,
  ground: partyFloor,
};

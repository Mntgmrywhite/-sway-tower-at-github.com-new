import type { Skin } from "./skin";
import { farm } from "./thanksgiving/farm";
import { harvest, leafLitter } from "./thanksgiving/harvest";
import {
  acorn,
  apple,
  corn,
  cornucopia,
  cranberry,
  gourd,
  mapleLeaf,
  pie,
  pilgrimHat,
  pumpkin,
  turkey,
  wheat,
} from "./thanksgiving/icons";
import { driftingLeaves, geese, harvestMoon } from "./thanksgiving/sky";

// Thanksgiving: an autumn harvest night in neon. Plum-dark sky over an amber grid, a huge
// striped harvest moon rising behind the farm on the horizon, leaves tumbling down, geese
// crossing the moon, and hay, pumpkins, corn shocks and a scarecrow beside the tower.

export const thanksgiving: Skin = {
  id: "thanksgiving",
  style: "neon",
  name: "Thanksgiving",
  dates: [{ from: [11, 2], to: [11, 30] }],
  fonts: ["Rye"],
  palette: {
    skyTop: "#090310",
    skyMid: "#2a0b24",
    skyBottom: "#6a2118",
    horizon: "#ffa21f",
    grid: "#f2741a",
    floorFar: "#280c08",
    floorNear: "#0a0304",
    sunTop: "#ffd45a",
    sunBottom: "#ff4f1f",
    star: "#ffe7c2",
  },
  // Warm neons, with teal, blue, lime and violet dropped in so every seam reads.
  bars: [
    { color: "#ffa62b", icon: turkey },
    { color: "#ff2b4e", icon: mapleLeaf },
    { color: "#ffe04a", icon: corn },
    { color: "#36e7d4", icon: pie },
    { color: "#ff6f1a", icon: pumpkin },
    { color: "#ff3fa0", icon: cranberry },
    { color: "#ffd34d", icon: wheat },
    { color: "#5f8dff", icon: pilgrimHat },
    { color: "#ff3838", icon: apple },
    { color: "#a6ff45", icon: gourd },
    { color: "#ff8a2a", icon: acorn },
    { color: "#b86bff", icon: cornucopia },
  ],
  hud: {
    display: "Rye, 'Rockwell Extra Bold', Georgia, 'Times New Roman', serif",
    title: "#ffd36b",
    ui: "#ff2b4e",
    accent: "#ffb21f",
    life: "#ff7a1a",
  },
  celestial: harvestMoon,
  sky(ctx, s) {
    geese(ctx, s);
    driftingLeaves(ctx, s);
  },
  far: farm,
  ground: harvest,
  foreground: leafLitter,
};

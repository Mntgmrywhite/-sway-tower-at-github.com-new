import type { CartoonSkin } from "./skin";
import { PALETTE } from "./thanksgiving/colors";
import { farm } from "./thanksgiving/farm";
import { harvest } from "./thanksgiving/harvest";
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

// Thanksgiving: a warm autumn evening in the bright cartoon style. A sunset-amber to dusky
// violet sky with a huge harvest moon rising behind a faded farm (silo, barn, windmill,
// farmhouse) on rolling hills, rose-and-peach clouds, leaves tumbling down and geese crossing
// the moon; on the golden stubble field, a scarecrow behind hay bales, corn shocks and a pile of
// pumpkins and gourds beside the tower.

export const thanksgiving: CartoonSkin = {
  id: "thanksgiving",
  style: "cartoon",
  name: "Thanksgiving",
  dates: [{ from: [11, 2], to: [11, 30] }],
  fonts: ["Rye"],
  palette: PALETTE,
  // Candy-bright harvest colors; warm hues alternate with teal, blue, lime and violet so every
  // seam reads.
  bars: [
    { color: "#ffb347", icon: turkey },
    { color: "#ff5a5f", icon: mapleLeaf },
    { color: "#ffd93f", icon: corn },
    { color: "#4fd6c4", icon: pie },
    { color: "#ff8a2a", icon: pumpkin },
    { color: "#ff6fae", icon: cranberry },
    { color: "#f5e663", icon: wheat },
    { color: "#6f8cff", icon: pilgrimHat },
    { color: "#ff5252", icon: apple },
    { color: "#a6e05a", icon: gourd },
    { color: "#c58bff", icon: acorn },
    { color: "#3fd6a0", icon: cornucopia },
  ],
  hud: {
    display: "Rye, 'Rockwell Extra Bold', Georgia, 'Times New Roman', serif",
    title: "#ffd36b",
    ui: "#7a3424",
    accent: "#ffc23a",
    life: "#ff7a1a",
  },
  celestial: harvestMoon,
  sky(ctx, s) {
    geese(ctx, s);
    driftingLeaves(ctx, s);
  },
  far: farm,
  ground: harvest,
};

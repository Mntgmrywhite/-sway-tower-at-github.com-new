import type { CartoonSkin } from "./skin";
import { backdrop } from "./thanksgiving/backdrop";
import { PALETTE } from "./thanksgiving/colors";
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

// Thanksgiving: a cozy small town in a hollow on a late-November afternoon, in a simple, warm
// comic-strip spirit (gently wobbly ink lines, flat autumn colors, lots of open lawn). Lavender
// hills patched with fields ring the hollow, where a little town with a white church steeple
// peeks over apricot clouds under a low comic-strip sun. In the backyard around the tower: the
// farmhouse with its porch, a big orange tree letting go of its leaves, a Thanksgiving table
// out on the lawn with mismatched chairs, where the townsfolk of the hollow (Grandma, Dad, Mom,
// two kids and a neighbor, in everyday autumn clothes) set the table, sit down to supper, clear
// it and set it again on a 40-second round, and friendly turkeys by their rail fence.
// Climb, and the sun sets while a pale moon comes up and geese head south. Climb on past the
// night, and the day comes round again and again: dawn, morning, afternoon, dusk (story.ts).
// Nothing passes over the sun or the moon: the geese climb or dip clear of them, the leaves
// swing round them and the clouds you climb past thin away near them (backdrop.ts, which paints
// the whole scene behind the tower for that).

export const thanksgiving: CartoonSkin = {
  id: "thanksgiving",
  style: "cartoon",
  name: "Thanksgiving",
  dates: [{ from: [11, 2], to: [11, 30] }],
  fonts: ["Chewy"],
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
    display: "Chewy, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif",
    title: "#ffd36b",
    ui: "#7a3424",
    accent: "#ffc23a",
    life: "#ff7a1a",
  },
  ground: backdrop,
  paintsBackdrop: true,
};

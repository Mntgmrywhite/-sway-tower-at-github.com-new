import { PALETTE } from "./classic/colors";
import * as glyph from "./glyphs";
import type { CartoonSkin } from "./skin";

// Oktoberfest: a placeholder until its own scene lands (see the brief in this skin's build). It
// registers the id, the dates, the title font and a bar set, and draws the base cartoon world.

export const oktoberfest: CartoonSkin = {
  id: "oktoberfest",
  name: "Oktoberfest",
  dates: [{ from: [9, 12], to: [9, 30] }],
  fonts: ["Pirata One"],
  palette: PALETTE,
  bars: [
    { color: "#3f8fe8", icon: glyph.star },
    { color: "#ffffff", icon: glyph.ring },
    { color: "#f2b134", icon: glyph.diamond },
    { color: "#8b5a2b", icon: glyph.triangle },
    { color: "#3f8fe8", icon: glyph.hexagon },
    { color: "#ffffff", icon: glyph.chevron },
    { color: "#f2b134", icon: glyph.plus },
    { color: "#8b5a2b", icon: glyph.wave },
    { color: "#3f8fe8", icon: glyph.square },
    { color: "#ffffff", icon: glyph.dots },
    { color: "#f2b134", icon: glyph.bolt },
    { color: "#8b5a2b", icon: glyph.cross },
  ],
  hud: {
    display: "'Pirata One', 'Arial Black', Impact, sans-serif",
    title: "#ffd447",
    ui: "#1f5fb8",
    accent: "#ffe08a",
    life: "#ffb347",
  },
};

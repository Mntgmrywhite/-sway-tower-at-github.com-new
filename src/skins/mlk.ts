import { PALETTE } from "./classic/colors";
import * as glyph from "./glyphs";
import type { CartoonSkin } from "./skin";

// MLK Day: a placeholder until its own scene lands (see the brief in this skin's build). It
// registers the id, the dates, the title font and a bar set, and draws the base cartoon world.

export const mlk: CartoonSkin = {
  id: "mlk",
  name: "MLK Day",
  dates: [{ from: [1, 12], to: [1, 21] }],
  fonts: ["Alfa Slab One"],
  palette: PALETTE,
  bars: [
    { color: "#2f58c8", icon: glyph.star },
    { color: "#f2b134", icon: glyph.ring },
    { color: "#e8e4ff", icon: glyph.diamond },
    { color: "#3dbb7a", icon: glyph.triangle },
    { color: "#2f58c8", icon: glyph.hexagon },
    { color: "#f2b134", icon: glyph.chevron },
    { color: "#e8e4ff", icon: glyph.plus },
    { color: "#3dbb7a", icon: glyph.wave },
    { color: "#2f58c8", icon: glyph.square },
    { color: "#f2b134", icon: glyph.dots },
    { color: "#e8e4ff", icon: glyph.bolt },
    { color: "#3dbb7a", icon: glyph.cross },
  ],
  hud: {
    display: "'Alfa Slab One', 'Arial Black', Impact, sans-serif",
    title: "#ffd447",
    ui: "#2a3f8f",
    accent: "#ffe08a",
    life: "#59ffaa",
  },
};

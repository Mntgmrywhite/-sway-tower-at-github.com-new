import { PALETTE } from "./classic/colors";
import * as glyph from "./glyphs";
import type { CartoonSkin } from "./skin";

// Independence Day: a placeholder until its own scene lands (see the brief in this skin's build). It
// registers the id, the dates, the title font and a bar set, and draws the base cartoon world.

export const july4: CartoonSkin = {
  id: "july4",
  name: "Independence Day",
  dates: [{ from: [6, 28], to: [7, 7] }],
  fonts: ["Rye"],
  palette: PALETTE,
  bars: [
    { color: "#e03a3e", icon: glyph.star },
    { color: "#f4f4f4", icon: glyph.ring },
    { color: "#2b4bbf", icon: glyph.diamond },
    { color: "#ffd447", icon: glyph.triangle },
    { color: "#e03a3e", icon: glyph.hexagon },
    { color: "#f4f4f4", icon: glyph.chevron },
    { color: "#2b4bbf", icon: glyph.plus },
    { color: "#ffd447", icon: glyph.wave },
    { color: "#e03a3e", icon: glyph.square },
    { color: "#f4f4f4", icon: glyph.dots },
    { color: "#2b4bbf", icon: glyph.bolt },
    { color: "#ffd447", icon: glyph.cross },
  ],
  hud: {
    display: "'Rye', 'Arial Black', Impact, sans-serif",
    title: "#ffffff",
    ui: "#1f3f9f",
    accent: "#ffd447",
    life: "#ff5a5a",
  },
};

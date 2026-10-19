import { PALETTE } from "./classic/colors";
import * as glyph from "./glyphs";
import type { CartoonSkin } from "./skin";

// Valentine's Day: a placeholder until its own scene lands (see the brief in this skin's build). It
// registers the id, the dates, the title font and a bar set, and draws the base cartoon world.

export const valentines: CartoonSkin = {
  id: "valentines",
  name: "Valentine's Day",
  dates: [{ from: [2, 7], to: [2, 15] }],
  fonts: ["Pacifico"],
  palette: PALETTE,
  bars: [
    { color: "#ff4f7a", icon: glyph.star },
    { color: "#ffb3c6", icon: glyph.ring },
    { color: "#ff8a5c", icon: glyph.diamond },
    { color: "#b56cf2", icon: glyph.triangle },
    { color: "#ff4f7a", icon: glyph.hexagon },
    { color: "#ffb3c6", icon: glyph.chevron },
    { color: "#ff8a5c", icon: glyph.plus },
    { color: "#b56cf2", icon: glyph.wave },
    { color: "#ff4f7a", icon: glyph.square },
    { color: "#ffb3c6", icon: glyph.dots },
    { color: "#ff8a5c", icon: glyph.bolt },
    { color: "#b56cf2", icon: glyph.cross },
  ],
  hud: {
    display: "'Pacifico', 'Arial Black', Impact, sans-serif",
    title: "#ffd1dc",
    ui: "#b8244f",
    accent: "#ffe08a",
    life: "#ff6b9a",
  },
};

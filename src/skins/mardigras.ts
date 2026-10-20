import { PALETTE } from "./classic/colors";
import { mardiGrasWindows } from "./easter";
import * as glyph from "./glyphs";
import type { CartoonSkin } from "./skin";

// Mardi Gras: a placeholder until its own scene lands (see the brief in this skin's build). It
// registers the id, the season (the days up to Fat Tuesday, which moves with Easter), the title
// font and a bar set, and draws the base cartoon world.

export const mardiGras: CartoonSkin = {
  id: "mardigras",
  name: "Mardi Gras",
  datesFor: mardiGrasWindows,
  fonts: ["Bungee"],
  palette: PALETTE,
  bars: [
    { color: "#6a2fa3", icon: glyph.star },
    { color: "#ffd23f", icon: glyph.ring },
    { color: "#2fb457", icon: glyph.diamond },
    { color: "#6a2fa3", icon: glyph.triangle },
    { color: "#ffd23f", icon: glyph.hexagon },
    { color: "#2fb457", icon: glyph.chevron },
    { color: "#6a2fa3", icon: glyph.plus },
    { color: "#ffd23f", icon: glyph.wave },
    { color: "#2fb457", icon: glyph.square },
    { color: "#6a2fa3", icon: glyph.dots },
    { color: "#ffd23f", icon: glyph.bolt },
    { color: "#2fb457", icon: glyph.cross },
  ],
  hud: {
    display: "'Bungee', 'Arial Black', Impact, sans-serif",
    title: "#ffd23f",
    ui: "#5b2a86",
    accent: "#2fb457",
    life: "#ff6b6b",
  },
};

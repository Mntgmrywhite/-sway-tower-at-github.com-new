import {
  AMBER,
  BLUE,
  FAR,
  FIELD_FAR,
  FIELD_NEAR,
  FOG,
  FOG_LIGHT,
  FOG_SHADE,
  GOLD,
  GREEN,
  ICE,
  INK,
  IVORY,
  LILAC,
  LIME,
  ORANGE,
  PINK,
  RED,
  SKY_BOTTOM,
  SKY_MID,
  SKY_TOP,
  STAR,
  TEAL,
} from "./christmas/colors";
import { far } from "./christmas/far";
import { foreground, ground } from "./christmas/ground";
import {
  bell,
  candle,
  carolBook,
  gift,
  goose,
  holly,
  lantern,
  plumPudding,
  pocketWatch,
  snowflake,
  topHat,
  wreath,
} from "./christmas/icons";
import { celestial, skyLayer } from "./christmas/sky";
import type { CartoonSkin } from "./skin";

// Christmas, after Dickens' A Christmas Carol (1843): a snowy Victorian London street at
// dusk in bright cartoon. A twilight sky warming to a rosy glow, a pale moon, snow falling,
// pigeons wheeling over the chimneys; on the horizon, rooftops bristling with chimney pots, a
// great dome and a church steeple whose bell rings out, all in rolling lavender fog. Around
// the tower: Scrooge & Marley's counting house (Marley's face shimmers in the door knocker)
// and the poulterer's with its prize goose, candlelit windows and wreaths, gas lamps, the
// lamplighter at work, carolers singing by lantern light, pigeons on the snowy cobbles and a
// carriage loping round and round the tower. A snowy kerb in front.
// Climbing, the street falls away into the night; past that the story loops forever
// (christmas/tone.ts): the night lifts into a clear, golden Christmas morning, a bright winter
// day, a rosy dusk like the street's, and night again.

export const christmas: CartoonSkin = {
  id: "christmas",
  style: "cartoon",
  name: "Christmas",
  dates: [{ from: [12, 1], to: [12, 27] }],
  fonts: ["Abril Fatface"],
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_BOTTOM,
    star: STAR,
    moon: "#fff6df",
    cloudShadow: FOG_SHADE,
    cloudBase: FOG,
    cloudLight: FOG_LIGHT,
    far: FAR,
    fieldFar: FIELD_FAR,
    fieldNear: FIELD_NEAR,
    grass: "#fdfcff",
    grassDark: "#d6dcf3",
    stone: "#7c78a8",
    stoneLight: "#c4c0e2",
    ink: INK,
  },
  // Bright and festive; warm and cool alternate so every seam reads.
  bars: [
    { color: RED, icon: holly },
    { color: ICE, icon: snowflake },
    { color: GOLD, icon: candle },
    { color: LILAC, icon: topHat },
    { color: ORANGE, icon: plumPudding },
    { color: GREEN, icon: wreath },
    { color: PINK, icon: gift },
    { color: BLUE, icon: lantern },
    { color: AMBER, icon: bell },
    { color: LIME, icon: carolBook },
    { color: TEAL, icon: goose },
    { color: IVORY, icon: pocketWatch },
  ],
  hud: {
    display: "'Abril Fatface', Georgia, 'Times New Roman', serif",
    title: "#ffffff",
    ui: "#a82638",
    accent: GOLD,
    life: RED,
  },
  celestial,
  sky: skyLayer,
  far,
  ground,
  foreground,
};

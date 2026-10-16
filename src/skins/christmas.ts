import {
  AMBER,
  BLUE,
  COOKIE,
  FAR,
  FIELD_FAR,
  FIELD_NEAR,
  GOLD,
  GREEN,
  ICE,
  INK,
  LILAC,
  LIME,
  ORANGE,
  PINK,
  RED,
  SKY_BOTTOM,
  SKY_MID,
  SKY_TOP,
  TEAL,
} from "./christmas/colors";
import { far } from "./christmas/far";
import { foreground, ground } from "./christmas/ground";
import {
  bell,
  candyCane,
  gift,
  gingerbread,
  holly,
  mitten,
  ornament,
  snowflake,
  star,
  stocking,
  tree,
  wreath,
} from "./christmas/icons";
import { celestial, skyLayer } from "./christmas/sky";
import type { CartoonSkin } from "./skin";

// Christmas: a snowy winter night in bright cartoon. A deep blue sky fading to icy
// periwinkle, a big moon with Santa's sleigh crossing it now and then, snow falling,
// white-blue clouds, a faded snowy forest and a village with lit windows on the horizon,
// a snowfield, and ink-outlined props beside the tower: a decorated tree with twinkling
// lights, presents, a waving snowman and candy canes. Frosty stones under a snowy lip in
// front. Northern lights come out as you climb.

export const christmas: CartoonSkin = {
  id: "christmas",
  style: "cartoon",
  name: "Christmas",
  dates: [{ from: [12, 1], to: [12, 27] }],
  fonts: ["Mountains of Christmas:wght@700"],
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_BOTTOM,
    star: "#ffffff",
    moon: "#fbfcff",
    cloudShadow: "#8eaadf",
    cloudBase: "#c2d6f5",
    cloudLight: "#eef6ff",
    far: FAR,
    fieldFar: FIELD_FAR,
    fieldNear: FIELD_NEAR,
    grass: "#f4f9ff",
    grassDark: "#d2e3f7",
    stone: "#7189bd",
    stoneLight: "#c9dbf3",
    ink: INK,
  },
  // Candy colors, warm and cool alternating so every seam reads.
  bars: [
    { color: ICE, icon: snowflake },
    { color: RED, icon: candyCane },
    { color: GREEN, icon: tree },
    { color: GOLD, icon: star },
    { color: LILAC, icon: ornament },
    { color: ORANGE, icon: gift },
    { color: BLUE, icon: mitten },
    { color: PINK, icon: stocking },
    { color: LIME, icon: holly },
    { color: COOKIE, icon: gingerbread },
    { color: TEAL, icon: wreath },
    { color: AMBER, icon: bell },
  ],
  hud: {
    display: "'Mountains of Christmas', Georgia, serif",
    title: "#ffffff",
    ui: "#c92a42",
    accent: GOLD,
    life: RED,
  },
  celestial,
  sky: skyLayer,
  far,
  ground,
  foreground,
};

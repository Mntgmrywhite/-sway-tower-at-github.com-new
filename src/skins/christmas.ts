import { GOLD, GREEN, ICE, RED, WHITE } from "./christmas/colors";
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
import type { Skin } from "./skin";

// Christmas: a snowy winter night in neon. Indigo sky with a big moon and falling snow,
// Santa's sleigh crossing now and then, a snowy fir forest and a lit village on the
// horizon, an ice-blue grid floor, and a decorated tree, presents, a snowman and candy
// canes beside the tower. Northern lights come out as you climb.

export const christmas: Skin = {
  id: "christmas",
  name: "Christmas",
  dates: [{ from: [12, 1], to: [12, 27] }],
  fonts: ["Mountains of Christmas:wght@700"],
  palette: {
    skyTop: "#02030d",
    skyMid: "#0a1140",
    skyBottom: "#22206e",
    horizon: "#5fe1ff",
    grid: "#62d8ff",
    floorFar: "#13234f",
    floorNear: "#03060f",
    sunTop: "#fff3c4",
    sunBottom: "#5fe1ff",
    star: "#e8f4ff",
  },
  // Red, green and gold repeat with ice and white between, so every seam changes hue.
  bars: [
    { color: WHITE, icon: snowflake },
    { color: RED, icon: candyCane },
    { color: GREEN, icon: tree },
    { color: GOLD, icon: star },
    { color: ICE, icon: ornament },
    { color: RED, icon: gift },
    { color: GREEN, icon: holly },
    { color: GOLD, icon: bell },
    { color: ICE, icon: mitten },
    { color: RED, icon: stocking },
    { color: GREEN, icon: wreath },
    { color: GOLD, icon: gingerbread },
  ],
  hud: {
    display: "'Mountains of Christmas', Georgia, serif",
    title: "#fff6e6",
    titleGlow: RED,
    accent: GOLD,
    life: RED,
  },
  celestial,
  sky: skyLayer,
  far,
  ground,
  foreground,
};

import type { Ctx } from "../base/draw";
import { castle } from "./classic/castle";
import { PALETTE } from "./classic/colors";
import { far } from "./classic/far";
import { front } from "./classic/front";
import * as icon from "./classic/icons";
import { skyLayer, sun } from "./classic/sky";
import { valley } from "./classic/valley";
import type { CartoonSkin, Scene } from "./skin";

// The default look, in the spirit of a classic 16-bit "green hill" stage: you are stacking on
// top of a warm sandstone castle keep, high above a lush valley. A saturated blue day with a
// smiling sun, fluffy clouds, a hawk circling and birds crossing far off; flat-topped hills
// with waterfalls on the horizon; below, rolling green ridges dotted with palms, a forest
// edge with giant sunflowers, and a deep-blue lake fed by waterfalls tumbling off two
// checker-banded mesas, where ducks paddle, deer drink, a fox sits and rabbits hop. The keep's
// crenellated top is the tower's base, hung with flowering vines, window boxes and a royal
// banner; terracotta-roofed towers step down to either side, and we look over a ledge of
// bright grass on checkered earth. Heraldic bars.

function ground(ctx: Ctx, s: Scene): void {
  valley(ctx, s);
  castle(ctx, s);
}

export const classic: CartoonSkin = {
  id: "classic",
  name: "Classic",
  fonts: ["Luckiest Guy"],
  palette: PALETTE,
  // Banner colors with bold crests; warm and cool, light and dark alternate so seams read.
  bars: [
    { color: "#3f72f0", icon: icon.crown },
    { color: "#ffc83a", icon: icon.dragon },
    { color: "#e8374f", icon: icon.fleurDeLis },
    { color: "#36c97a", icon: icon.key },
    { color: "#a066f0", icon: icon.chalice },
    { color: "#ff8c2e", icon: icon.shield },
    { color: "#2fc9c4", icon: icon.sword },
    { color: "#ff6fae", icon: icon.heart },
    { color: "#a6dd52", icon: icon.turret },
    { color: "#5b8cff", icon: icon.crescent },
    { color: "#f4e3b8", icon: icon.horseshoe },
    { color: "#d65ad8", icon: icon.star },
  ],
  hud: {
    display: "'Luckiest Guy', 'Arial Black', Impact, sans-serif",
    title: "#ffd23f",
    ui: "#2f4bb0",
    accent: "#ffe066",
    life: "#ff5a6e",
  },
  celestial: sun,
  sky: skyLayer,
  far,
  ground,
  foreground: front,
};

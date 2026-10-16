import type { Ctx } from "../base/draw";
import { CORAL, PALETTE, SUNNY } from "./classic/colors";
import { drifters } from "./classic/drift";
import { farLayer, seaTop, skyBottom } from "./classic/far";
import { front } from "./classic/front";
import * as icon from "./classic/icons";
import { homeIsland } from "./classic/island";
import { moon, skyFill, stars, sun } from "./classic/sky";
import { level, toneIndex, toneOf } from "./classic/tone";
import type { CartoonSkin, Scene } from "./skin";

// Sky Islands, the default look: the tower grows from a small floating island, its grass cap
// under the base block and its striped underside (soil, sand, clay, umber, bedrock) hung with
// roots and vines. Height tells the story: a bright day over a soft meadow far below, then up
// into the clouds as a cloud sea gathers underneath, other islands drifting past, a warm
// sunset, dusk and the first stars, and at the top a calm starry night. A kite, a balloon and
// a few birds keep to the edges of the screen. Calm by design: flat fills, one ink weight up
// close, faded silhouettes far away, nothing busy behind the tower.
//
// The altitude story needs every layer of the backdrop, so Classic paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const sea = seaTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, sea));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, sea);
  farLayer(ctx, s, tone, sea);
  drifters(ctx, s, tone);
  homeIsland(ctx, s);
}

function none(): void {}

export const classic: CartoonSkin = {
  id: "classic",
  name: "Classic",
  fonts: ["Luckiest Guy"],
  palette: PALETTE,
  // Things of the sky and the islands. Warm and cool, light and dark alternate so seams read,
  // and every color holds up against both the day sky and the night.
  bars: [
    { color: SUNNY, icon: icon.sun },
    { color: "#4f86f0", icon: icon.cloud },
    { color: CORAL, icon: icon.kite },
    { color: "#4cc85a", icon: icon.leaf },
    { color: "#ff9f43", icon: icon.balloon },
    { color: "#8e6cf0", icon: icon.star },
    { color: "#2ec4b6", icon: icon.bird },
    { color: "#ff7eb6", icon: icon.raindrop },
    { color: "#a8d94c", icon: icon.island },
    { color: "#e84e6a", icon: icon.feather },
    { color: "#fff0c2", icon: icon.moon },
    { color: "#d65ad8", icon: icon.rainbow },
  ],
  hud: {
    display: "'Luckiest Guy', 'Arial Black', Impact, sans-serif",
    title: "#ffd447",
    ui: "#2f58c8",
    accent: "#ffe066",
    life: CORAL,
  },
  celestial: none,
  far: none,
  ground: backdrop,
  foreground: front,
};


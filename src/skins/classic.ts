import type { Ctx } from "../base/draw";
import { CORAL, PALETTE, SUNNY } from "./classic/colors";
import { drifters } from "./classic/drift";
import { farLayer, seaTop, skyBottom } from "./classic/far";
import { front } from "./classic/front";
import * as icon from "./classic/icons";
import { homeIsland } from "./classic/island";
import { aurora, dawnStar, meteors, moon, skyFill, stars, sun, sunAt } from "./classic/sky";
import { level, toneIndex, toneOf } from "./classic/tone";
import type { CartoonSkin, Scene } from "./skin";

// Sky Islands, the default look: the tower grows from a small floating island, its grass cap
// (tufts, daisies) under the base block and its striped underside (soil, sand, clay, umber,
// bedrock with a geode) hung with roots and vines, a spring spilling off its side; a kite
// tied at the left edge with a bluebird on its stake, a rope bridge to an islet with a
// birdhouse on the right. Height tells the story: a bright day over a storybook countryside
// far below (snowy peaks, patchwork fields, a river, a village, a windmill, far balloons), up
// into the clouds as a cloud sea gathers and covers the land, then the archipelago drifting
// past (an island with a windmill, an airship, cottages with smoking chimneys, waterfalls
// with rainbows in their spray) over far islands on the sea (a lighthouse, a great tree, a
// hamlet with a windmill and a waterfall); a warm sunset into the cloud sea, dusk as the
// windows and the lighthouse light up, a starry night with sky lanterns, the aurora and
// shooting stars, then first light, the morning star, the sun coming back up out of the sea,
// and the high day again: from there the story loops (tone.ts), so it never runs out. Life
// keeps to the lanes at the screen's sides. Calm by design: flat fills, one ink weight up
// close, faded silhouettes far away, nothing moving behind the tower.
//
// The altitude story needs every layer of the backdrop, so Classic paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const lvl = level(s);
  const sea = seaTop(s, lvl);
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, sea, lvl));
  stars(ctx, s, tone);
  aurora(ctx, s, tone);
  meteors(ctx, s, tone);
  moon(ctx, s, tone);
  dawnStar(ctx, s, tone, sea);
  sun(ctx, s, tone, sea);
  farLayer(ctx, s, tone, lvl, sea, sunAt(s, tone, sea).x);
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
  paintsBackdrop: true,
  foreground: front,
};


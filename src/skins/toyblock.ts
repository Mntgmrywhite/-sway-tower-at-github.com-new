import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { BLUE, GREEN, ORANGE, PALETTE, PINK, PURPLE, RED, TEAL, YELLOW } from "./toyblock/colors";
import { drifters } from "./toyblock/drift";
import { farLayer, floorTop, skyBottom } from "./toyblock/far";
import { meadowProps } from "./toyblock/fort";
import { front } from "./toyblock/front";
import * as icon from "./toyblock/icons";
import { moon, skyFill, stars, sun } from "./toyblock/sky";
import { level, toneIndex, toneOf } from "./toyblock/tone";

// Toy Kingdom: the whole world is built from the same chunky toy blocks as the tower. The tower
// stands on a toy fort (red pillars, a yellow arch gate, purple turrets under red cone roofs)
// on a felt-green meadow, with a lollipop tree on its peg, a tree of stacked rings and a
// wind-up mouse. Beyond, hills of stacked rounded blocks, a toy train running between two
// tunnels and a block bridge over a pool, and in front a shelf of big letter blocks. Climb,
// and block clouds gather into a floor below you; party balloons carry a block away, a loose
// kite and a toy airship drift by, the sun sets, and at the top a calm night with a crescent
// moon, little five-point stars and a toy rocket. Calm by design: flat fills, one ink weight
// up close, faded silhouettes far away, and nothing moves behind the tower.
//
// The altitude story needs every layer of the backdrop, so Toy Kingdom paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  meadowProps(ctx, s);
}

function none(): void {}

export const toyBlock: CartoonSkin = {
  id: "toyblock",
  name: "Toy Kingdom",
  fonts: ["Fredoka"],
  palette: PALETTE,
  // Things from the toy box. Warm and cool, light and dark alternate so every seam reads, and
  // every color holds up against both the day sky and the night.
  bars: [
    { color: YELLOW.body, icon: icon.star },
    { color: BLUE.body, icon: icon.train },
    { color: RED.body, icon: icon.heart },
    { color: GREEN.body, icon: icon.duck },
    { color: ORANGE.body, icon: icon.ball },
    { color: PURPLE.body, icon: icon.rocket },
    { color: "#ffe066", icon: icon.letterA },
    { color: TEAL.body, icon: icon.kite },
    { color: PINK.body, icon: icon.crown },
    { color: "#8fd14f", icon: icon.top },
    { color: "#d660d0", icon: icon.drum },
    { color: "#7fb6ff", icon: icon.moon },
  ],
  hud: {
    display: "Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif",
    title: "#ffd23f",
    ui: "#3d6fe0",
    accent: "#ffe14d",
    life: RED.body,
  },
  celestial: none,
  far: none,
  ground: backdrop,
  foreground: front,
};

import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { BLUE, GREEN, ORANGE, PALETTE, PINK, PURPLE, RED, TEAL, YELLOW } from "./toyblock/colors";
import { farDrifters, nearDrifters } from "./toyblock/drift";
import { farLand, landSkyBottom } from "./toyblock/far";
import { meadowProps } from "./toyblock/fort";
import { front } from "./toyblock/front";
import * as icon from "./toyblock/icons";
import { rocketSky } from "./toyblock/launch";
import { landShows, seaTop } from "./toyblock/place";
import { SEA_SOLID, cloudSea } from "./toyblock/sea";
import { constellations, moon, skyBands, skyFill, stars, sun } from "./toyblock/sky";
import { toneIndex, toneOf } from "./toyblock/tone";

// Toy Kingdom: the whole world is built from the same chunky toy blocks as the tower. The tower
// stands on a toy fort (red pillars, a yellow arch gate, purple turrets under red cone roofs)
// on a felt-green meadow, among lollipop trees, a tree of stacked rings, a wind-up mouse, a
// rocking horse and two drummers of the fort's guard marching in place. Beyond lies the kingdom:
// block mountains, a toy town, the King's castle flying its flag up the left lane and the toy
// rocket on its launch tower up the right, a toy railway between two tunnels, and a block bridge
// over a pool; in front, a shelf of big letter blocks. At 10 s the
// rocket lights, lifts off in a cloud of smoke and corkscrews up into a cloud high above, leaving
// its corkscrew of smoke in the sky for the tower to climb past, up to that cloud (launch.ts).
//
// Climb, and a sea of block clouds billows up and swallows the kingdom (the meadow's toys stand
// in front of it), then falls away below you (place.ts). The day goes on up the sky (tone.ts):
// toys and block clouds drift down the right lane (a loose kite, flights of paper planes, a
// biplane trailing bunting, a teddy in a hot-air balloon, the airship at dusk), the sun sets into
// the clouds up the left lane (nothing ever drifts over it, nor over the moon), and a sleepy moon
// with a mobile of stars rises there for the night, when the rocket (out among the stars since
// its launch) flies past a ringed toy planet, a satellite and a flying saucer, and
// constellations in toy shapes come out under the moon. Then dawn: a toy
// soldier parachutes down, party balloons carry a block away, the sun comes back up, and the day
// goes round again, forever.
// Calm by design: flat fills, one ink weight up close, faded and flat far away, and nothing
// moves behind the tower.
//
// The story needs every layer of the backdrop, so Toy Kingdom paints all of it in one pass
// (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const top = seaTop(s);
  const land = landShows(s, top);
  heavens(ctx, s, tone, top, land);
  farDrifters(ctx, s, tone);
  if (land) farLand(ctx, s, tone, Math.min(s.cssH, top + s.u * 0.12));
  rocketSky(ctx, s, tone);
  cloudSea(ctx, s, tone, top);
  nearDrifters(ctx, s, tone);
  meadowProps(ctx, s);
}

/**
 * The back of the backdrop: the sky down to the land or the sea, its stars, the night's
 * constellation, the sun and the moon. Nothing drawn after it ever passes over the sun or the
 * moon but the cloud sea they set into and rise out of (sky.ts, drift.ts).
 */
export function heavens(ctx: Ctx, s: Scene, tone = toneOf(s), top = seaTop(s), land = landShows(s, top)): void {
  const solid = top + s.u * SEA_SOLID;
  const skyBottom = Math.min(s.cssH, land ? Math.min(landSkyBottom(s), solid) : solid);
  skyFill(ctx, s, skyBands(tone, toneIndex(s)), skyBottom);
  stars(ctx, s, tone, top);
  constellations(ctx, s, tone);
  sun(ctx, s, tone, top);
  moon(ctx, s, tone, top);
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
  paintsBackdrop: true,
  foreground: front,
};

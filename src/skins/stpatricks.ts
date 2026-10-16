import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { PALETTE } from "./stpatricks/colors";
import { drifters } from "./stpatricks/drift";
import { farLayer, floorTop, skyBottom } from "./stpatricks/far";
import { front } from "./stpatricks/front";
import * as icon from "./stpatricks/icons";
import { meadowBack, sheep } from "./stpatricks/meadow";
import { moon, skyFill, stars, sun } from "./stpatricks/sky";
import { level, toneIndex, toneOf } from "./stpatricks/tone";
import { roundTower } from "./stpatricks/tower";

// St. Patrick's Day: a bright Irish spring in our cartoon style. The tower is stacked on an old
// stone round tower (its conical cap long gone, so you can build it higher), a ladder leaning
// up to its raised doorway, on a meadow of emerald grass. Round it a whitewashed cottage under
// golden thatch with a red half-door and a curl of turf smoke, a sheep either side, and at the
// right edge a rainbow coming down out of a little cloud into a pot of gold. Beyond, hills
// quilted with fields, hedgerows and dry-stone walls; on the far hilltop a whole round tower
// and a high cross; a stream winding out under a humpbacked stone bridge. In front, a low
// dry-stone wall with a gateway, shamrocks in the grass verge, and a tiny green hat left on a
// gatepost.
// Climb, and a pair of swallows wheels by, the clouds gather into a floor below you, a soft
// spring shower lets fall a few drops in the side lanes, then the sun breaks through and a
// rainbow stands in the lane opposite it; geese fly home in a golden evening, and at the top
// a calm starry night with a crescent moon. Calm by design: flat fills, one ink weight up
// close, faded silhouettes far away, and nothing moves behind the tower.
//
// The altitude story needs every layer of the backdrop, so St. Patrick's paints all of it in
// one pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  meadowBack(ctx, s);
  roundTower(ctx, s);
  sheep(ctx, s);
}

function none(): void {}

export const stPatricks: CartoonSkin = {
  id: "stpatricks",
  name: "St. Patrick's Day",
  dates: [{ from: [3, 10], to: [3, 18] }],
  fonts: ["Chewy"],
  palette: PALETTE,
  // Our own Irish symbols. Warm and cool, light and dark alternate so every seam reads, and
  // every color holds up against both the day sky and the night. (No green, white and orange
  // run together anywhere in the cycle: that would read as a flag.)
  bars: [
    { color: "#2fbf5a", icon: icon.shamrock },
    { color: "#ffc93a", icon: icon.harp },
    { color: "#4f8ff0", icon: icon.knot },
    { color: "#f2564b", icon: icon.potOfGold },
    { color: "#a3d94a", icon: icon.horseshoe },
    { color: "#9a6cf0", icon: icon.rainbow },
    { color: "#ff9f3a", icon: icon.coins },
    { color: "#2ec4b6", icon: icon.fiddle },
    { color: "#ff7eb3", icon: icon.bodhran },
    { color: "#22a552", icon: icon.topHat },
    { color: "#fff0c2", icon: icon.crownedHeart },
    { color: "#d65ad8", icon: icon.triskele },
  ],
  hud: {
    display: "Chewy, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif",
    title: "#5fe07c",
    ui: "#1f8f4f",
    accent: "#ffd447",
    life: "#3cc85e",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  foreground: front,
};

import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { PALETTE } from "./stpatricks/colors";
import { drifters } from "./stpatricks/drift";
import { cloudFloor, farLayer, floorTop, skyBottom } from "./stpatricks/far";
import { front } from "./stpatricks/front";
import * as icon from "./stpatricks/icons";
import { meadowBack } from "./stpatricks/meadow";
import { moon, morningStar, shootingStar, skyFill, stars, sun } from "./stpatricks/sky";
import { level, toneIndex, toneOf } from "./stpatricks/tone";
import { roundTower } from "./stpatricks/tower";

// St. Patrick's Day: spring in the west of Ireland, after the owner's photos, drawn like a page
// of the Book of Kells. The tower is stacked on an old stone round tower (its conical cap long
// gone, so you can build it higher, a band of interlace carved round it), a ladder leaning up to
// its raised doorway, on a meadow of emerald grass and spring flowers. On the left, near the
// wall, a whitewashed cottage under golden thatch with a red half-door and a curl of turf smoke;
// behind it, in the back pasture, two ewes graze while their lambs race, pronk and skip. As a
// tower starts, a big rainbow sweeps into a round arch behind the round tower, from a tuft of
// grass by the cottage to the meadow on the right, and a leprechaun of our own lugs his pot of
// gold out from behind the round tower and sets it down at its right foot, then keeps watch
// behind it for good, peeking out round it and over it; his cobbling waits on a red toadstool.
// Beside it an old box player plays jigs on his accordion by an upturned barrel with three pints
// of green brew on it, and between tunes raises his pint in a toast to the gold, sets it down
// and plays on. (Every action of the start view happens in its first ten seconds:
// actions.test.ts.)
// Beyond: on the left a great flat-topped mountain, its fluted limestone cliff over long green
// scree, a turreted stone castle on the green rise in front of it, a slate-roofed farmhouse and
// two beehive huts in their ring of dry-stone wall below; hills quilted with bright fields,
// hedgerows, dry-stone walls and fences, sheep dotted over them; a stream coming out under a
// humpbacked stone bridge. On the right the bay of the Atlantic: deep blue, rippled in rows, a
// hooker with rust-red sails at anchor over its reflection, rocks and surf along the meadow's
// edge, and a headland of dark layered sea cliff with a whole round tower and a high cross on it;
// across the bay the holy mountain with the pilgrims' path up to its little chapel. In front, a
// low dry-stone wall with a gateway (a triskele cut into each gatepost), shamrocks at its foot, a
// tiny green hat left on a gatepost, and along the bottom the page's border: a plaited knotwork
// band ringed with red dots, a triskele roundel in its middle.
// Climb, and a pair of swallows wheels by, the clouds gather into a floor below you, swelling up
// over the land as you climb through them (only the mountain tops stand out of it, and it sinks
// with them to rest low on the screen for good, the border's knotwork in its corners), a soft
// spring shower lets fall a few drops in the right-hand lane, then the sun breaks through and a
// little rainbow with its own pot of gold stands in that lane, opposite it; geese fly home in a
// golden evening, the four swans of Lir glide by at dusk, and a calm starry night with a
// crescent moon where the sun set and the odd shooting star. Then the story loops: the night
// gives way to a rose dawn with skylarks and the morning star, and the day comes round again
// (tone.ts). The left of the sky is the sun's and the moon's: nothing drifts across them.
// Calm by design: the detail lives out at the sides; behind the tower the scenery is plain
// washes, and nothing moves there (but the rainbow as it forms, in a tower's first seconds).
//
// The altitude story needs every layer of the backdrop, so St. Patrick's paints all of it in
// one pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  shootingStar(ctx, s, tone);
  morningStar(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  meadowBack(ctx, s);
  roundTower(ctx, s);
  if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
}

function none(): void {}

export const stPatricks: CartoonSkin = {
  id: "stpatricks",
  name: "St. Patrick's Day",
  dates: [{ from: [3, 10], to: [3, 18] }],
  fonts: ["Uncial Antiqua"],
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
    display: "'Uncial Antiqua', Georgia, 'Times New Roman', serif",
    title: "#5fe07c",
    ui: "#1f8f4f",
    accent: "#ffd447",
    life: "#3cc85e",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

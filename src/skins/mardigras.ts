import type { Ctx } from "../base/draw";
import { mardiGrasWindows } from "./easter";
import { beadsInFlight, familyOnDeck, sidewalkKids } from "./mardigras/balcony";
import { AMBER, GOLD, GREEN, LIME, PALETTE, PURPLE, VIOLET } from "./mardigras/colors";
import { drifters } from "./mardigras/drift";
import { cloudFloor, farLayer, floorTop, landShows, skyBottom } from "./mardigras/far";
import { front } from "./mardigras/front";
import * as icon from "./mardigras/icons";
import { parade } from "./mardigras/parade";
import { fireworks, moon, skyFill, stars, sun } from "./mardigras/sky";
import { reviewingStand } from "./mardigras/stand";
import { beyond, cafe, cakeCart, centerBlock, lamppost, leftHouse, streetGround } from "./mardigras/street";
import { level, toneIndex, toneOf } from "./mardigras/tone";
import type { CartoonSkin, Scene } from "./skin";

// Mardi Gras: New Orleans Carnival in our bright cartoon style. The bars are stacked on a
// reviewing stand at the curb of a French Quarter street on a golden Carnival afternoon,
// its front hung with purple, green and gold bunting under a fleur-de-lis crest. Behind it
// the Quarter's galleried townhouses: lacy cast-iron galleries draped in bunting and strings
// of beads, ferns on the rails, paper lanterns strung across the fronts. On the left a family
// at a gallery rail tosses beads down to two kids jumping for them on the sidewalk by a
// king-cake cart; on the right a corner café under a striped awning, with a lamppost crowned
// by a fleur-de-lis. Over the roofs, the river at the end of the street: a riverboat
// churning upriver with its twin stacks smoking, a streetcar rolling along the levee to its
// stop and back, and straight ahead the three spires of our own cathedral on its square, with
// a live oak at the corner. In a tower's first ten seconds the parade passes in front of the
// stand: the grand marshal under his second-line umbrella, flambeaux carriers with their
// torches, a brass band, the jester-and-crown float with masked riders throwing beads to the
// crowd on both sides, a jester on stilts and a little dancer behind; it comes round the block
// again every forty seconds, and the family and the kids keep tossing and catching for as long
// as you stand there. In front, the curb with a parade ladder where two kids sit reaching for
// throws, and barricades either side.
// Climb, and the townhouses drop away to show the cathedral's square behind them (a fenced
// garden of lawns and paths round a fountain, trees, brick rows with galleries down its sides:
// far.ts, square.ts); the sun goes down over the river while a floor of cloud gathers below
// and covers the city (only the cathedral's spires stand out of it); dusk, then the night parade: the
// clouds lit from beneath by the flambeaux, fireworks over the river under the moon, paper
// lanterns floating by; then a calm starry night. Then the story loops: a dawn mist over the
// clouds, the sun comes back up, and the afternoon comes round again (tone.ts). Down the right
// lane the parade's throws drift by: confetti, beads, spinning doubloons, a feathered-mask
// balloon, a paper jester's hat, lanterns by night (drift.ts). The left of the sky is the
// sun's and the moon's: nothing drifts across them.
// Calm by design: flat fills, one ink weight up close, faded silhouettes far away, and nothing
// moves behind the tower (the parade passes below its floor line).
//
// The altitude story needs every layer of the backdrop, so Mardi Gras paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  fireworks(ctx, s, tone);
  if (landShows(s, floor)) streetGround(ctx, s);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  quarter(ctx, s);
  reviewingStand(ctx, s);
  parade(ctx, s);
  if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
}

/** The street: its houses, the café, the lamppost, the cart, the family on the gallery and the kids on the sidewalk. */
export function quarter(ctx: Ctx, s: Scene): void {
  beyond(ctx, s);
  centerBlock(ctx, s);
  leftHouse(ctx, s, (c, deck) => familyOnDeck(c, s, deck));
  cafe(ctx, s);
  lamppost(ctx, s);
  cakeCart(ctx, s);
  sidewalkKids(ctx, s);
  beadsInFlight(ctx, s);
}

function none(): void {}

export const mardiGras: CartoonSkin = {
  id: "mardigras",
  name: "Mardi Gras",
  datesFor: mardiGrasWindows,
  fonts: ["Bungee"],
  palette: PALETTE,
  // Our own Carnival symbols, in the three colors of the season by turns (two tones of each,
  // so no two neighbors match), warm gold between the cool purples and greens so every seam reads.
  bars: [
    { color: PURPLE.body, icon: icon.mask },
    { color: GOLD.body, icon: icon.fleurDeLis },
    { color: GREEN.body, icon: icon.jesterHat },
    { color: VIOLET.body, icon: icon.beads },
    { color: AMBER.body, icon: icon.crown },
    { color: LIME.body, icon: icon.kingCake },
    { color: PURPLE.body, icon: icon.trumpet },
    { color: GOLD.body, icon: icon.feather },
    { color: GREEN.body, icon: icon.doubloon },
    { color: VIOLET.body, icon: icon.drum },
    { color: AMBER.body, icon: icon.star },
    { color: LIME.body, icon: icon.floatWheel },
  ],
  hud: {
    display: "'Bungee', 'Arial Black', Impact, sans-serif",
    title: "#ffd23f",
    ui: "#4b1f7a",
    accent: "#ffe066",
    life: "#4fe06a",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

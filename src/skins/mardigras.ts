import type { Ctx } from "../base/draw";
import { mardiGrasWindows } from "./easter";
import { laneConfetti, routeConfetti } from "./mardigras/air";
import { beadsInFlight, familyOnDeck, sidewalkKids } from "./mardigras/balcony";
import { AMBER, GOLD, GREEN, LIME, PALETTE, PURPLE, VIOLET } from "./mardigras/colors";
import { drifters } from "./mardigras/drift";
import { cloudFloor, farLayer, floorTop, landShows, skyBottom } from "./mardigras/far";
import { front, frontTop } from "./mardigras/front";
import { kingGator } from "./mardigras/gator";
import * as icon from "./mardigras/icons";
import { skyIsland } from "./mardigras/island";
import { rightLaneClear } from "./mardigras/lane";
import { carnivalQueen } from "./mardigras/queen";
import { parade } from "./mardigras/parade";
import { fireworks, moon, rightFireworks, rightShowBox, skyFill, stars, sun } from "./mardigras/sky";
import { reviewingStand } from "./mardigras/stand";
import { beyond, cafe, cakeCart, cornerHouse, lamppost, streetGround, streetLamps } from "./mardigras/street";
import { level, toneIndex, toneOf, type Tone } from "./mardigras/tone";
import type { CartoonSkin, Scene } from "./skin";

// Mardi Gras: Bourbon Street on parade day, in a bright, clean cartoon. The bars are stacked on a
// royal reviewing stand at the curb, its purple velvet hung with bunting and beads under a gold
// medallion over two crossed trumpets. Across the street on the left stands the corner house,
// four storeys of red brick behind three tiers of lacy iron galleries: ferns swaying under the
// top one with a big feathered mask and a banner hung from its canopy, paper lanterns rocking
// under the middle one, beads swinging and bunting on every rail; the family tosses beads from
// the first gallery to the kids on the sidewalk by the king-cake stand. On the right, the corner
// café, beignets in the window under its striped awning, ferns, beads and a green mask on its
// balcony, and a gas lamppost with a street sign, beads and a masked banner. Between them, behind
// the tower, the Quarter steps back instead of walling it in: a row of low Creole cottages, the
// rooftops beyond, our own three-spired cathedral with a tower downtown rising pale beside it, the
// river over the rooftops with a paddlewheeler churning upriver and a streetcar rolling along the
// riverwalk, the long truss bridge over the water, and fair-weather clouds in a violet-and-gold
// afternoon sky under a doubloon of a sun. Confetti drifts down everywhere, with paper streamers
// curling in the sky over the lanes (air.ts; never across the sun or into the title). In a tower's first
// ten seconds the parade passes in front of the stand (parade.ts: the grand marshal under his
// second-line umbrella, flambeaux, the brass band second-lining in two ranks, the skeleton krewe's
// float, the jester-and-crown float with riders throwing beads, a jester on stilts, a second-liner
// and a little dancer with their parasols), and it comes round again every forty seconds. In
// front, the curb we look over: purple barricades, a giant papier-mâché jester's head parked at
// the corner, bobbing on its springs, the parade ladder with two kids on it, a lady in a feathered
// mask dancing and a bead seller with his pole (onlookers.ts), a bead vendor's tree, a harlequin
// frieze, and a street-name inlay and litter of confetti and doubloons in the flagstones (band.ts).
// Everyone is a papier-mâché carnival figure on a rig (rig.ts, folk.ts): planted feet, bending
// knees, each on its own step, its own glances and blinks, feathers, beads and skirts swinging
// after it.
// Climb, and the street drops away to show the cathedral's square behind the cottages (square.ts);
// the sun goes down over the river while a floor of cloud gathers below and covers the city (only
// the cathedral's spires and the tower downtown stand out of it), and the masked moon comes out
// where it sank. Dusk comes down the sky in flat bands: the midnight night over a band of blue-hour
// lavender over the rose afterglow, its edge sweeping down to the clouds (tone.ts, sky.ts). The
// night is a deep midnight indigo and its clouds a moonlit silver-blue, never the violets of the
// bars, so every bar reads against it at every height (colors.ts, CLEAR). Then the night parade:
// the clouds lit from beneath by the flambeaux, fireworks bursting two at a time over the river
// under the masked moon, the show building toward its finale with more shells and fancier ones
// (palms, crossettes, a gold fleur-de-lis, glitter), and below them the night's two great floats
// coming up out of the clouds across the tower from each other: in the left lane the head of the
// Carnival Queen (queen.ts: a masked papier-mâché lady with a crown of chasing bulbs and a
// trembling fan of plumes), and in the right lane, under a second show of fireworks, the King
// Gator (gator.ts: a grinning papier-mâché alligator in a gold crown and a ruff of beads, his
// snout raised to the bursts); then a calm starry night, the two still standing in the clouds.
// Around level 50 Sky Islands' floating island drifts by in the right lane with its own 25-bar
// tower, painted as a papier-mâché float (island.ts), and passes in front of the cloud floor on
// its way down; the Gator rises as it sinks (lane.ts). Then the story loops: the floats sink back
// into the clouds, the night lifts, a dawn mist lies over them, the sun comes back up where the
// Queen stood, and the afternoon comes round again, until they rise again at nightfall (tone.ts).
// Down the right lane, from late in the night parade through the dawn and the day to dusk, the
// parade's throws and the river's birds drift by (drift.ts): beads, doubloons and showers of
// them, mask balloons, jester's hats, streamers, confetti, a swag of beads and paper lanterns
// between two bunches of balloons, a line of pelicans, three doves at dawn, lanterns that glow at
// dusk; they are gone before the Gator and his fireworks come. Both side lanes have something of
// the Carnival at every height (lanes.test.ts). The left of the sky is the sun's and the moon's:
// nothing drifts across them.
// Calm by design: flat fills, one ink weight up close, faded silhouettes far away, and nothing
// moves behind the tower (the parade passes below its floor line; the street's life keeps to the
// lanes).
//
// The altitude story needs every layer of the backdrop, so Mardi Gras paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  fireworks(ctx, s, tone);
  if (tone.rightShow > 0.01) rightFireworks(ctx, s, tone, rightLaneClear(s, rightShowBox(s)));
  if (landShows(s, floor)) streetGround(ctx, s);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  quarter(ctx, s, tone);
  reviewingStand(ctx, s);
  parade(ctx, s);
  routeConfetti(ctx, s);
  carnivalQueen(ctx, s, tone, floor);
  kingGator(ctx, s, tone, floor);
  if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
  // The island floats above the cloud floor: it passes in front of it as you climb past, and
  // leaves by the bottom of the screen, never hidden in it.
  skyIsland(ctx, s, mardiGras.bars);
}

/** The street: its houses, the café, the lamppost, the cart, the family on the gallery, the kids on the sidewalk, the confetti in the lanes. */
export function quarter(ctx: Ctx, s: Scene, tone?: Tone): void {
  if (s.groundY - s.u * 0.7 > s.cssH) return;
  const t = tone ?? toneOf(s);
  beyond(ctx, s, t);
  streetLamps(ctx, s, t);
  cornerHouse(ctx, s, t, (c, deck) => familyOnDeck(c, s, deck));
  cafe(ctx, s, t);
  lamppost(ctx, s, t);
  cakeCart(ctx, s);
  sidewalkKids(ctx, s);
  beadsInFlight(ctx, s);
  laneConfetti(ctx, s);
}

/**
 * In front of the tower: the curb (front.ts). Zoomed out, the cloud floor comes up over the
 * street while the near curb is still on screen below it: it covers the curb and the base band
 * as it covers the street (drawn again over them, with the island that floats in front of it),
 * so the curb never floats on the cloud sea. Only the rows from the curb's tallest prop down are
 * drawn again, and the tower stands above them.
 */
function foreground(ctx: Ctx, s: Scene): void {
  front(ctx, s);
  const floor = floorTop(s, level(s));
  if (floor >= s.cssH + s.u * 0.15) return;
  const y0 = Math.max(frontTop(s), floor - s.u * 0.08);
  if (y0 >= s.cssH) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, s.cssW, s.cssH - y0);
  ctx.clip();
  cloudFloor(ctx, s, toneOf(s), floor);
  skyIsland(ctx, s, mardiGras.bars);
  ctx.restore();
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
  foreground,
};

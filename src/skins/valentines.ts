import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { boulevard, PAVE_DEPTH } from "./valentines/boulevard";
import { PALETTE } from "./valentines/colors";
import { drifters } from "./valentines/drift";
import { cloudFloor, farLayer, floorShows, floorTop, landLine, skyBottom } from "./valentines/far";
import { front } from "./valentines/front";
import { fountain, lawnFar, lawnNear, paving, plazaProps, plazaTop, roseBeds } from "./valentines/garden";
import * as icon from "./valentines/icons";
import { moon, skyFill, stars, sun } from "./valentines/sky";
import { level, toneIndex, toneOf } from "./valentines/tone";
import { waterway } from "./valentines/water";

// Valentine's Day: a candy-box boulevard at the golden hour, in our bright cartoon style. The
// tower rises from the marble pedestal of a heart-shaped fountain in a rose garden; a marble
// cherub of our own stands on a column behind the pool's left lobe and, as a tower starts, comes
// alive, draws his bow and pops the heart balloon tied up over his shoulder in a burst of petals,
// then turns back to marble till a fresh balloon floats in (cupid.ts: the first pop by 3.4 s,
// every action of the start view within its first ten seconds, and every one of them coming round
// again on its own rhythm). Across the lawn a boulevard of candy-colored shop fronts stands on
// the horizon: a chocolate shop with a window of bonbons, a pink townhouse, a flower stall of
// roses and tulips, and the café, where a couple at a terrace table exchange a card and hold
// hands, by turns (couple.ts); strings of lights sag between the fronts to a lamp post. On the
// right a canal runs out from under the boulevard under a little covered bridge with a heart in
// its gable, two swans gliding together in front of it until their necks make a heart, then
// parting and coming together again (water.ts); beyond, lavender hills with a little town, and on
// the fair hill a Ferris wheel turning slowly, lit at dusk (far.ts). In front, the love-lock
// railing along the plaza (front.ts). Climb, and the cotton-candy cloud sea gathers below you and
// covers it all but the fair hill and its wheel; the afternoon goes to a pink-and-peach dusk as
// the sun glides down into the clouds (with the exact height, never in steps) and the lights come
// on, then a violet starry night with a crescent moon where the sun set and the wheel lit far
// below; petals, heart balloons, a paper-plane love letter and doves drift down the right-hand
// lane, far off, and sink behind the fair and the boulevard into the cloud sea (never across
// them). Then the story loops for good: the night gives way to a rose dawn and the day comes
// round again (tone.ts). The left of the sky is the sun's and the moon's: nothing drifts across
// them, and only the cloud sea ever covers the sun as it sets (sky.test.ts). Calm by design: flat
// fills, one ink weight up close, faded silhouettes far away, and nothing moves behind the tower.
//
// The altitude story needs every layer of the backdrop, so Valentine's paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base moon and skyline, which the backdrop would only paint over.

/** The land: the boulevard on the land's line, the lawn with the canal, the plaza with the fountain. */
function land(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hz = landLine(s);
  if (hz - u * 0.3 > s.cssH) return;
  const tone = toneOf(s);
  boulevard(ctx, s, tone);
  lawnFar(ctx, s, hz + PAVE_DEPTH * u - 1, s.cssH);
  lawnNear(ctx, s, s.cssH);
  waterway(ctx, s, tone);
  if (plazaTop(s) < s.cssH) {
    paving(ctx, s, plazaTop(s), s.cssH, true);
    roseBeds(ctx, s);
    plazaProps(ctx, s);
    fountain(ctx, s);
  }
}

/**
 * The scenery after the sky: the far layer, the land, the cloud floor. What drifts down the lane
 * (drift.ts) is painted before all of it: far off, it sinks behind the fair's wheel, the
 * boulevard and the cloud bank into the cloud sea, so nothing ever slides across a prop.
 */
export function scenery(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  farLayer(ctx, s, tone, floor);
  land(ctx, s);
  if (floorShows(s, floor)) cloudFloor(ctx, s, tone, floor);
}

/** Everything the backdrop paints after the sky and what hangs in it: the lane, then the scenery over it. */
export function afterSky(ctx: Ctx, s: Scene): void {
  drifters(ctx, s, toneOf(s));
  scenery(ctx, s);
}

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  afterSky(ctx, s);
}

function none(): void {}

export const valentines: CartoonSkin = {
  id: "valentines",
  name: "Valentine's Day",
  dates: [{ from: [2, 7], to: [2, 15] }],
  fonts: ["Pacifico"],
  palette: PALETTE,
  // Our own Valentine symbols. Warm and cool alternate so every seam reads, and every color
  // holds up against the golden afternoon, the pink dusk and the violet night.
  bars: [
    { color: "#ea3350", icon: icon.heart },
    { color: "#fff0d6", icon: icon.rose },
    { color: "#a8683f", icon: icon.bonbon },
    { color: "#5fb6f5", icon: icon.envelope },
    { color: "#ffc94a", icon: icon.arrow },
    { color: "#b48cf2", icon: icon.ring },
    { color: "#ff7fb3", icon: icon.bow },
    { color: "#4fd6b0", icon: icon.balloon },
    { color: "#ff8a5c", icon: icon.cupcake },
    { color: "#fff6ea", icon: icon.swan },
    { color: "#e8408a", icon: icon.key },
    { color: "#7a8ff5", icon: icon.diamond },
  ],
  hud: {
    display: "'Pacifico', 'Brush Script MT', 'Segoe Script', cursive",
    title: "#ffd9e3",
    ui: "#b8244f",
    accent: "#ffe08a",
    life: "#ff6b9a",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

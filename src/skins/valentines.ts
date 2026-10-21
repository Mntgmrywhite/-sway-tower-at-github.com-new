import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { frame } from "./valentines/border";
import { boulevard, PAVE_DEPTH } from "./valentines/boulevard";
import { PALETTE } from "./valentines/colors";
import { drifters } from "./valentines/drift";
import { cloudFloor, farLayer, floorShows, floorTop, landLine, landShows, skyBottom } from "./valentines/far";
import { front, railFoot } from "./valentines/front";
import { fountain, lawnFar, lawnNear, paving, plazaProps, plazaTop, roseBeds } from "./valentines/garden";
import * as icon from "./valentines/icons";
import { moon, skyFill, stars, sun } from "./valentines/sky";
import { level, toneIndex, toneOf } from "./valentines/tone";
import { waterway } from "./valentines/water";

// Valentine's Day: Paris, the city of love, at the golden hour, drawn as an Art Nouveau poster
// (the owner's style for this skin: Mucha's Paris of 1900, flowing vines and flowers as borders,
// Rococo pastels as the dreamier side of it), with the depth and the honey-and-zinc colors of the
// owner's photo of the Paris rooftops. The sky is framed down both sides like a Mucha panel: a
// strip of stained glass at each edge and a climbing rose winding up it in whiplash curves
// (border.ts), behind the sun and the moon, which hang in halo medallions (sky.ts), over a soft
// gradient sky, cornflower to rose to a honey glow over the rooftops. The tower rises from the
// marble pedestal standing in a heart-shaped fountain in a rose garden, an arcade carved round
// it; a marble cherub of our own stands on a lily-capital column behind the pool's left lobe and,
// as a tower starts, comes alive, draws his bow and pops the heart balloon tied up over his
// shoulder in a burst of petals, then turns back to marble till a fresh balloon floats in
// (cupid.ts: the first pop by 3.4 s, every action of the start view within its first ten seconds,
// and every one of them coming round again on its own rhythm). Across the lawn stands a
// Haussmann block, honey limestone under blue-grey zinc mansards, its shops in the ground floor
// (boulevard.ts): the chocolatier with our own bonbons under a striped awning, a quiet front
// behind the tower, the florist's stall under an arch of Guimard's ironwork, and the café under a
// glass marquise, where a couple at a terrace table exchange a card and hold hands, by turns
// (couple.ts); strings of lights sag along the shopfronts to a lamp in the Metro manner. On the
// right a canal runs out from under the boulevard under a little covered bridge with a rose-glass
// heart in its zinc roof, two swans gliding together in front of it until their necks make a
// heart, then parting and coming together again (water.ts). Beyond, Paris (far.ts): row on row
// of Haussmann rooftops layered deep to a hazy horizon with a white basilica on a far hill; down
// the left a long avenue of round green trees runs to a gilded dome under the sun; on the right a
// bronze lattice tower of our own stands over the city, and the top of a Ferris wheel turns over
// the rooftops behind the café, lit at dusk. In front, the love-lock railing in Guimard's green
// ironwork, iron hearts between its rails, over a fish-scale mosaic (front.ts). Climb, and the
// rooftops fall away below, the near ones first; the evening mist takes the far city and a sea of
// scalloped pastel cloud gathers below you and covers all but the boulevard's block, the lattice
// tower and the wheel; the afternoon goes to a rose-and-violet dusk as the sun glides down into
// the clouds (with the exact height, never in steps) and the windows, the lights and the stained
// glass come on, then a violet starry night with a crescent moon where the sun set and the block,
// the tower's lamps and the wheel lit far below; petals, heart balloons, a paper-plane love letter
// and doves drift down the right-hand lane, far off, and sink behind the tower, the wheel and the
// boulevard into the cloud sea (never across them). Then the story loops for good: the night
// gives way to a blush-and-mint dawn and the day comes round again (tone.ts). The left of the sky
// is the sun's and the moon's: nothing drifts across them, and only the cloud sea ever covers the
// sun as it sets (sky.test.ts). Calm by design: the detail is in the frame at the edges, in the
// side lanes of the city and in the garden up close; the band behind the tower stays quieter and
// lower in contrast (contrast.test.ts), and nothing moves behind the tower.
//
// The altitude story needs every layer of the backdrop, so Valentine's paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base moon and skyline, which the backdrop would only paint over.

/** How far above the railing's curb's foot the plaza's paving stops (u): under the curb. And how far under the floor line its scales begin: above that the pool's lobes cover it. */
const CURB_UNDER = 0.02;
const UNDER_POOL = 0.05;

/**
 * The land: the boulevard on the land's line, the lawn with the canal, the plaza with the
 * fountain. Once the cloud sea has covered the land only the block stands out of it, so the rest
 * (and the café's terrace, whose couple would show their heads over the clouds) is left out.
 */
function land(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hz = landLine(s);
  if (hz - u * 0.3 > s.cssH) return;
  const tone = toneOf(s);
  const shows = landShows(s, floorTop(s, level(s)));
  boulevard(ctx, s, tone, shows);
  if (!shows) return;
  lawnFar(ctx, s, hz + PAVE_DEPTH * u - 1, s.cssH);
  lawnNear(ctx, s, s.cssH);
  waterway(ctx, s, tone);
  if (plazaTop(s) < s.cssH) {
    // (The pool covers the plaza's first rows, and the railing's curb and the paving in front of
    // it everything under its top.)
    paving(ctx, s, plazaTop(s), Math.min(s.cssH, railFoot(s) - s.u * CURB_UNDER), { petals: true, from: s.groundY + s.u * UNDER_POOL, underPool: true });
    roseBeds(ctx, s);
    plazaProps(ctx, s);
    fountain(ctx, s);
  }
}

/**
 * The scenery after the sky: the far layer, the land, the cloud floor. What drifts down the lane
 * (drift.ts) is painted before all of it: far off, it sinks behind the lattice tower, the wheel
 * and the boulevard into the cloud sea, so nothing ever slides across a prop.
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
  const bottom = skyBottom(s, floor);
  skyFill(ctx, s, tone, toneIndex(s), bottom);
  stars(ctx, s, tone);
  frame(ctx, s, tone, bottom);
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

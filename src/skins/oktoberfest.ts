import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { PALETTE } from "./oktoberfest/colors";
import { drifters } from "./oktoberfest/drift";
import { cloudFloor, farLayer, floorTop, skyBottom } from "./oktoberfest/far";
import { band, dancers } from "./oktoberfest/folk";
import { front } from "./oktoberfest/front";
import { bandstand, maypole, meadowNear, tent, trodden } from "./oktoberfest/ground";
import * as icon from "./oktoberfest/icons";
import { parade, waitress } from "./oktoberfest/parade";
import { moon, skyFill, stars, sun } from "./oktoberfest/sky";
import { level, toneIndex, toneOf } from "./oktoberfest/tone";

// Oktoberfest: a Bavarian festival meadow under the Alps, in our bright cartoon style, for the
// whole family (no beer anywhere: the owner's rule). The bars are stacked on the wooden
// bandstand of the big festival tent, whose blue-and-white striped front is open right behind
// the tower (paper lanterns under garlands, long tables laid with pretzels and flowers, our own
// FESTZELT sign on the gable); beside it the oompah band plays (tuba, accordion, trumpet,
// clarinet, in lederhosen), striking up at once and again after every short break, and on the
// other side a pair of dancers does a schuhplattler and bows, round after round. A maypole with
// blue-and-white spirals, little figures of the village trades and a wreath rises behind the
// tent's roof. In the first seconds the harvest parade crosses in front: two draft horses in
// brass harness pulling a wagon dressed with flowers and a giant pretzel; then the pretzel seller
// crosses with her basket; both keep coming round (parade.ts). The stalls frame the bottom of
// the screen (pretzels and gingerbread hearts on the left, sausages on the right, a fence with
// a gap between them, every post planted in the grass). Beyond: the fair's Ferris wheel and
// chain carousel turning, picnic tables and hay bales on the meadow, the village with its
// onion-domed church and half-timbered house, the pine-wooded foothills, and the snowy Alps.
// Climb, and balloons, a string of rhombus pennants, a Bavarian hot-air balloon, clouds, the
// pretzel balloon and sky lanterns come down the right-hand lane; the valley mist gathers
// below and covers the meadow (only the peaks, the steeple and the rides stand out of it), the
// golden evening lights the tent's lanterns and the stalls, the sun glides down behind the
// massif into the mist (placed at the exact altitude, never in steps), dusk lights the wheel,
// and a starry night with a crescent moon where the sun set. Then the story loops: the night
// gives way to a pale dawn with mist on the mountains, and the afternoon comes round again
// (tone.ts). The left of the sky is the sun's and the moon's: nothing drifts across them, and
// only the mountains and the mist ever cover them.
// Calm by design: flat fills, one ink weight up close, faded silhouettes far away, and nothing
// moves behind the tower (the parade and the pretzel seller keep below the floor line).
//
// The altitude story needs every layer of the backdrop, so Oktoberfest paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose:
// they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  skyFill(ctx, s, tone, toneIndex(s), skyBottom(s, floor));
  stars(ctx, s);
  moon(ctx, s);
  sun(ctx, s, tone, floor);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  meadowNear(ctx, s);
  trodden(ctx, s);
  maypole(ctx, s);
  tent(ctx, s, tone);
  bandstand(ctx, s);
  band(ctx, s);
  dancers(ctx, s);
  parade(ctx, s);
  waitress(ctx, s);
  if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
}

function none(): void {}

export const oktoberfest: CartoonSkin = {
  id: "oktoberfest",
  name: "Oktoberfest",
  dates: [{ from: [9, 12], to: [9, 30] }],
  fonts: ["Pirata One"],
  palette: PALETTE,
  // Our own festival symbols. Warm and cool alternate so every seam reads, and every color
  // holds up against both the afternoon sky and the night.
  bars: [
    { color: "#ffc23a", icon: icon.pretzel },
    { color: "#3f8fe8", icon: icon.cuckooClock },
    { color: "#f0506a", icon: icon.gingerbreadHeart },
    { color: "#4ecf7a", icon: icon.sausage },
    { color: "#ff9a3a", icon: icon.featheredHat },
    { color: "#f6f8ff", icon: icon.accordion },
    { color: "#e8403c", icon: icon.pennant },
    { color: "#9a6cf0", icon: icon.ferrisWheel },
    { color: "#c8783a", icon: icon.horse },
    { color: "#2ec4b6", icon: icon.lantern },
    { color: "#ffa528", icon: icon.roastChicken },
    { color: "#3dbd57", icon: icon.edelweiss },
  ],
  hud: {
    display: "'Pirata One', 'Arial Black', Impact, sans-serif",
    title: "#ffd447",
    ui: "#1f5fb8",
    accent: "#ffe08a",
    life: "#ffb347",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

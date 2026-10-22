import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { barbecue, sparklerKids } from "./july4/cast";
import { crowd, strollers } from "./july4/crowd";
import { banks, laneClouds } from "./july4/clouds";
import { PALETTE } from "./july4/colors";
import { drifters } from "./july4/drift";
import { fireworks, townGlow } from "./july4/fireworks";
import { front } from "./july4/front";
import { hills } from "./july4/hills";
import * as icon from "./july4/icons";
import { island } from "./july4/island";
import { backLine, frontLine, hillLine, mainLine, mainShows } from "./july4/land";
import { mainStreet, squareEdge } from "./july4/mainstreet";
import { parade } from "./july4/parade";
import { moon, skyFill, stars, sun } from "./july4/sky";
import { bandstand, lawn, path } from "./july4/square";
import { toneOf } from "./july4/tone";
import { backRow, frontRow } from "./july4/town";

// Independence Day: a small town's Fourth of July as a vintage Americana storybook, after
// mid-century American postcards and the hand-painted backgrounds of classic animation. Soft
// rounded forms, a fine warm sepia line round everything up close, two-tone painting (a lit top,
// a shaded underside, a lit rim) and warm July light, in a coordinated palette of vintage red,
// faded navy, creamy white, golden yellow and lush summer green (colors.ts). A broad, open town,
// not an enclosed one: the tower is stacked on the white bandstand in the town square, hung with
// bunting (square.ts); behind it the square's lawn runs back to Main Street, a row of brick and
// painted storefronts down either side, stepping up to three stories at the screen's sides, with
// striped awnings, sign boards lettered with plain trades, flower boxes, a great flag hung down a
// brick front, a dressed balcony, flags from the upper floors and bunting along the cornices,
// tall elms on the sidewalk, vintage lampposts with patriotic banners, a white picket fence draped
// with bunting and flower beds with butterflies (mainstreet.ts). Over the rooftops the tree-lined
// streets beyond with their flagpoles and strings of pennants, the white church's steeple and the
// courthouse's clock tower and gilt dome (town.ts, landmarks.ts); on the horizon round farm hills
// after Grant Wood, plowed in contour rows, puffball trees on their crests, a red barn, a
// farmhouse and a country road where vintage cars and a little band wagon roll by, and kites
// (hills.ts); fluffy summer clouds in a bright blue sky, banked on the hills (clouds.ts). In
// front, the picnic lawn along the parade route, behind a bunting-covered picket fence: a gingham
// blanket and its basket, a lawn chair, a roadside sign, the lemonade stand with balloons (now
// and then one slips free and floats off), a barrel and a wagon wheel, pinwheels (front.ts). As
// a tower starts, the parade comes through the square (parade.ts); the cook flips burgers at the
// barbecue on the left and two kids wave sparklers on the right, one jumping for the balloon
// that slips free; on the picnic lawn dad claps the band from his lawn chair, mom waves her
// little flag from the blanket and their little girl bounces beside her, and the girl who keeps
// the lemonade stand pours a glass now and then (cast.ts); along Main Street the crowd watches
// the parade go by (a dad with his boy on his shoulders, a lady under a parasol, a girl perched on
// the fence, a fellow who cheers, an old veteran who salutes the colors) and strollers stop to
// watch on their way along the shops (crowd.ts). Every one of them is a storybook figure on a rig
// (rig.ts: a skeleton, two-bone IK, walk, march, stand, hop and sit cycles, each on its own clock;
// folk.ts paints it, hats.ts dresses it). Over the square a bald eagle circles under the HUD, a
// hot-air balloon in the flag's colors hangs over the courthouse, and a stunt plane flies loops in
// a ring of red, white and blue smoke under the sun.
//
// Climb, and you rise over the town: the square drops away, then Main Street, and the town
// opens out row by row, each further row sinking slower, the far hills flattening below you,
// until the treetops, rooftops and landmarks rest along the bottom of the sky (land.ts). The
// summer sky comes down the right lane past you (drift.ts) and, around level 50, Sky Islands'
// floating island with its 25-bar tower, painted as a postcard (island.ts); the cloud banks build
// into towering cumulus. The afternoon warms, the golden evening sets the sun behind the hills,
// a warm twilight follows, and the night brings the fireworks blooming above the rooftops in red,
// white, blue and gold, lighting the clouds and the town, string lights glowing on the pennants
// (fireworks.ts); then the stars have the sky, a rosy dawn brings the sun back up, and the day
// comes round again with the morning's air show (tone.ts). The left of the sky is the sun's and
// the moon's: nothing ever passes across them. Calm by design: the detail and every moving
// thing live at the sides and below the tower's floor; behind the tower the sky is one soft wash
// and the town only treetops.
//
// Independence Day paints all of its backdrop in one pass (`backdrop`, in the ground hook). The
// celestial and far hooks are empty on purpose: they switch off the base moon and skyline,
// which the backdrop would only paint over. The sky's things (the clouds, the lane, the island)
// are painted before the land, so as you climb they sink behind the hills and the town. Each row
// is filled down only as far as the next nearer row leaves it showing.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const u = s.u;
  const hill = hillLine(s);
  skyFill(ctx, s, tone, hill + 1);
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone);
  banks(ctx, s, tone);
  laneClouds(ctx, s, tone);
  // The sky's things pass behind the country and the town: as you climb they sink behind them.
  drifters(ctx, s, tone);
  island(ctx, s, tone, july4.bars);
  const back = backLine(s);
  const near = frontLine(s);
  const main = mainShows(s);
  hills(ctx, s, tone, hill, back + u * 0.02);
  fireworks(ctx, s, tone);
  backRow(ctx, s, tone, near + u * 0.02);
  // While Main Street shows, the trim along its foot and the square's lawn cover everything below its line.
  frontRow(ctx, s, tone, main ? Math.min(s.cssH, mainLine(s) + u * 0.012) : s.cssH);
  townGlow(ctx, s, tone);
  if (main) {
    mainStreet(ctx, s, tone);
    lawn(ctx, s);
    strollers(ctx, s);
    squareEdge(ctx, s, tone);
    crowd(ctx, s);
    path(ctx, s);
    barbecue(ctx, s);
    sparklerKids(ctx, s);
    bandstand(ctx, s);
    parade(ctx, s);
  }
}

function none(): void {}

export const july4: CartoonSkin = {
  id: "july4",
  name: "Independence Day",
  dates: [{ from: [6, 28], to: [7, 7] }],
  fonts: ["Rye"],
  palette: PALETTE,
  // Our own Fourth of July symbols. Red, blue, gold and white go round (warm and cool by turns,
  // so every seam reads), bright enough that the tower stands out of the painted town against
  // the day sky, the sunset and the night of the show.
  bars: [
    { color: "#e8393f", icon: icon.star },
    { color: "#2f58d6", icon: icon.firework },
    { color: "#ffc93a", icon: icon.eagle },
    { color: "#f6f3ea", icon: icon.flag },
    { color: "#e8393f", icon: icon.bell },
    { color: "#2f58d6", icon: icon.drum },
    { color: "#ffc93a", icon: icon.hotDog },
    { color: "#f6f3ea", icon: icon.pieSlice },
    { color: "#e8393f", icon: icon.watermelon },
    { color: "#2f58d6", icon: icon.rocket },
    { color: "#ffc93a", icon: icon.topHat },
    { color: "#f6f3ea", icon: icon.sparkler },
  ],
  hud: {
    display: "'Rye', 'Arial Black', Impact, sans-serif",
    title: "#ffffff",
    ui: "#1f3f9f",
    accent: "#ffd447",
    life: "#ff5a5a",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  paintsBackdrop: true,
  foreground: front,
};

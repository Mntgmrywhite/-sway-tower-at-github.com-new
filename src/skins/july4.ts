import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { PALETTE } from "./july4/colors";
import { drifters } from "./july4/drift";
import { cloudFloor, farLayer, floorTop, landmarkLine, landShows, skyBottom } from "./july4/far";
import { fireworks } from "./july4/fireworks";
import { front } from "./july4/front";
import * as icon from "./july4/icons";
import { parade } from "./july4/parade";
import { halftone, moon, skyFill, stars, sun } from "./july4/sky";
import { bandstand, barbecue, hedge, lampPosts, lawn, path, sparklerKids } from "./july4/square";
import { level, toneOf } from "./july4/tone";

// Independence Day: a small-town Fourth of July, printed like a 1930s WPA screen-print poster
// and pushed to the poster's boldest: flat inks on cream paper (navy, flag red, cream, flag
// blue, a poster sky blue and ochre gold, with the summer greens), two or three flat steps per
// color, every building lit from the left with a flat shadow plane on its right, depth built in
// layers of atmosphere (each row back one ink paler), and a navy key plate (a thin keyline)
// round everything up close. A broad sunburst fans up both lanes from below the town. The tower
// is stacked on the white bandstand in the town square (its roof long gone, so you can build it
// higher), fans of bunting along its deck, a red runner down its steps. Behind it, Main Street
// as a poster town: brick, ochre, cream, sage and blue storefronts with cornices and false
// fronts, sign boards, striped awnings, pleated fans and swags; a white church with a tall
// steeple; the sandstone courthouse with its portico, clock tower and gilt dome flying the flag;
// two rows of rooftops stepping back; the water tower painted with the flag on the hill; big
// summer trees; towering poster cumulus at the sides; the block behind the tower printed faint,
// so the column stays calm. As a tower starts, the parade comes through the square in front of
// the bandstand: the drum major, the color guard, snares, the glockenspiel lyre, sousaphones,
// the vintage fire truck flying the flag with a load of waving kids, Uncle Sam on stilts tipping
// his hat at the tower, a girl on a bike with streamers and a dog (every bit of it past the
// tower within ten seconds: actions.test.ts). The barbecue corner is on the left (the cook
// flips burgers), two kids wave sparklers on the right, and the street in front is painted up
// for the Fourth. Climb, and the Fourth's air show comes down the right lane: a great stars-and-
// stripes hot-air balloon, the bald eagle, a parachutist, party balloons, a kite, a barnstormer
// towing a 4TH banner, a stunt plane looping the loop in red, cream and blue smoke, a blimp.
// The clouds gather into a poster sea of billows that swallows the town (only the steeple and the
// courthouse tower stand out of it, skyline silhouettes after dusk, the flag floodlit all night)
// and sinks to rest low on the screen for good, the cumulus towering out of it by day; the
// afternoon turns to a golden evening, then a dusk whose sunburst is printed as the flag's red
// and cream stripes, with the first stars and a crescent moon where the sun set; then the night
// brings the big fireworks show in both lanes, printed Pop Art: Ben-Day dots, comic-book
// starbursts, chrysanthemums, willows, rings and glitter in red, cream, blue and gold, rockets
// streaking up, building to a finale that lights the cloud sea and burns a lancework flag of
// sparks under the moon; the smoke drifts off and the stars have the sky. Then the story loops:
// the night gives way to a rose dawn with the sun coming back up out of the clouds, and the day
// comes round again (tone.ts). The left of the sky is the sun's and the moon's: nothing drifts
// across them, and the fireworks there burst below the moon. Calm by design: the detail lives
// at the sides and up close, the sky behind the tower is plain bands, and nothing moves behind
// the tower above its floor line (the parade passes below it).
//
// The altitude story needs every layer of the backdrop, so Independence Day paints all of it
// in one pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on
// purpose: they switch off the base moon and skyline, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  const line = landmarkLine(s);
  skyFill(ctx, s, tone, line, skyBottom(s, floor));
  halftone(ctx, s, tone, line);
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  fireworks(ctx, s, tone, floor);
  farLayer(ctx, s, tone, floor);
  drifters(ctx, s, tone);
  if (landShows(s) && s.horizonY < s.cssH) {
    lawn(ctx, s, tone);
    hedge(ctx, s, tone);
    lampPosts(ctx, s, tone);
    path(ctx, s);
    barbecue(ctx, s);
    sparklerKids(ctx, s);
    bandstand(ctx, s);
    parade(ctx, s);
  }
  if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
}

function none(): void {}

export const july4: CartoonSkin = {
  id: "july4",
  name: "Independence Day",
  dates: [{ from: [6, 28], to: [7, 7] }],
  fonts: ["Rye"],
  palette: PALETTE,
  // Our own Fourth of July symbols. Red, blue, gold and white go round (warm and cool by
  // turns, so every seam reads), a step brighter than the poster's inks, so the tower stands
  // out of the print against the day sky, the sunset and the night of the show.
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

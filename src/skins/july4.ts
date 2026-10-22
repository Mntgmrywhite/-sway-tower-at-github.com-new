import type { Ctx } from "../base/draw";
import type { CartoonSkin, Scene } from "./skin";
import { PALETTE } from "./july4/colors";
import { drifters } from "./july4/drift";
import { cloudFloor, farBack, farFront, floorCover, floorTop, landmarkLine, landShows, rayFoot, skyBottom } from "./july4/far";
import { fireworks } from "./july4/fireworks";
import { front } from "./july4/front";
import * as icon from "./july4/icons";
import { parade } from "./july4/parade";
import { halftone, moon, skyFill, stars, sun } from "./july4/sky";
import { bandstand, barbecue, hedge, lampPosts, lawn, path, sparklerKids } from "./july4/square";
import { level, toneOf } from "./july4/tone";
import { townLine } from "./july4/town";

// Independence Day: a small-town Fourth of July, printed like a 1930s WPA screen-print poster
// and pushed to the poster's boldest: flat inks on cream paper (navy, flag red, cream, flag
// blue, a poster sky blue and ochre gold, with the summer greens), two or three flat steps per
// color, every building lit from the left with a flat shadow plane on its right, depth built in
// layers of atmosphere (each row back one ink paler), and a navy key plate (a thin keyline)
// round everything up close. A great sunburst of broad rays radiates from behind the town into
// both lanes and the top corners, cut by a plain panel behind the tower (sky.ts). The tower is
// stacked on the white bandstand in the town square (its roof long gone, so you can build it
// higher), fans of bunting along its deck, a red runner down its steps. Behind it, Main Street
// as a poster town: brick, ochre, cream, sage and blue storefronts with cornices and false
// fronts, sign boards, striped awnings, pleated fans and swags; a white church with a tall
// steeple; the sandstone courthouse with its portico, clock tower and gilt dome flying the flag;
// two rows of rooftops stepping back; big summer trees; the block behind the tower printed
// faint, so the column stays calm. Beyond the town the country rises round it like a bowl, a
// paler ink every row back (country.ts): the near hill with the water tower painted with the
// flag and the park's trees, farm hills plowed in contour stripes of field, wheat and furrows,
// a blue ridge with a far town and its grain elevator on its shoulder, and a far range of
// angular mountains; on the right a great tower of WPA cumulus climbs the lane nearly to the
// top of the screen, a low bank on the left under the sun. As a tower starts, the parade comes
// through the square in front of the bandstand: the drum major, the color guard, snares, the
// glockenspiel lyre, sousaphones, the vintage fire truck flying the flag with a load of waving
// kids, Uncle Sam on stilts tipping his hat at the tower, a girl on a bike with streamers and a
// dog (every bit of it past the tower within ten seconds: actions.test.ts). The barbecue corner
// is on the left (the cook flips burgers), two kids wave sparklers on the right, and the street
// in front is painted up for the Fourth. Climb, and the Fourth's air show comes down the right
// lane, the big things filling it: a stars-and-stripes hot-air balloon, the bald eagle and
// swifts over the park, then a barnstormer towing a 4TH banner, a kite, a bunch of party
// balloons, a parachutist, the eagle huge against the sunburst, a stunt plane looping the loop
// in red, cream and blue smoke, a blimp (drift.ts). The clouds gather into a poster sea of
// billows that swallows the town and piles up on the right under the cumulus tower (only the
// steeple and the courthouse tower stand out of it, skyline silhouettes after dusk, the flag
// floodlit all night) and sinks to rest low on the screen for good; the afternoon turns to a
// golden evening, then a dusk whose sunburst is printed as the flag's red and cream stripes,
// with the first stars and a crescent moon where the sun set; then the night brings the big
// fireworks show in both lanes, printed Pop Art over big Ben-Day dots and bold off-register
// stars: rockets streaking up the whole height of the lanes, chrysanthemums, hanging willows,
// palms, rings, glitter and comic-book starbursts in red, cream, blue and gold, building to a
// finale with a wall of fountains and Roman candles along the skyline at the sides, its light
// warming the sky and the cloud sea, and a lancework flag of sparks under the moon
// (fireworks.ts); the smoke drifts off and the stars have the sky. Then the story loops: the
// night gives way to a rose dawn with the sun coming back up out of the clouds, and the day
// comes round again (tone.ts). The left of the sky is the sun's and the moon's: nothing drifts
// across them, and the fireworks there burst below the moon. Calm by design: the detail lives
// at the sides and up close, the sky behind the tower is plain bands, and nothing moves behind
// the tower above its floor line (the parade passes below it).
//
// The altitude story needs every layer of the backdrop, so Independence Day paints all of it
// in one pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on
// purpose: they switch off the base moon and skyline, which the backdrop would only paint over.
// Back to front: the sky and its sunburst, the halftone, stars, moon and sun; the cumulus and
// the country; the show; the town and its landmarks; the lane (behind the town while the land
// shows); the square and the parade; the cloud floor over all of it. Whatever lies wholly where
// a later layer is solid is left out
// (the rays and the lobes behind the country, the lane things under the lawn or the cloud sea).

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  const line = landmarkLine(s);
  skyFill(ctx, s, tone, line, skyBottom(s, floor), rayFoot(s, floor, line));
  halftone(ctx, s, tone, line);
  stars(ctx, s, tone);
  moon(ctx, s, tone);
  sun(ctx, s, tone, floor);
  farBack(ctx, s, tone, floor);
  const land = landShows(s);
  // The lane is covered below the lawn's edge while the land shows, and below the cloud floor's solid face.
  const cover = Math.min(floorCover(s, floor), land ? townLine(s) + s.u * 0.02 : Infinity);
  // Over the town the lane's slim things keep beyond it, behind its rooftops; once the cloud sea
  // has covered the land, the air show is the nearest thing in the sky, passing in front of the
  // show and the landmarks standing out of the sea (none overlaps them as the land goes:
  // drift.test.ts), so a big thing goes by whole, never cut up by the clock tower.
  if (land) drifters(ctx, s, tone, cover);
  fireworks(ctx, s, tone, floor);
  farFront(ctx, s, tone, floor);
  if (!land) drifters(ctx, s, tone, cover);
  if (land && s.horizonY < s.cssH) {
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

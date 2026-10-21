import type { Ctx } from "../base/draw";
import {
  BAR_AMBER,
  BAR_BLUE,
  BAR_GOLD,
  BAR_GREEN,
  BAR_ICE,
  BAR_IVORY,
  BAR_LILAC,
  BAR_LIME,
  BAR_ORANGE,
  BAR_PINK,
  BAR_RED,
  BAR_TEAL,
  CREAM,
  FAR,
  NAVY,
  SKY_GLOW,
  SKY_MID,
  SKY_TOP,
  SLATE,
  SNOW,
  SNOW_SHADE,
  STUCCO_SHADE,
  TEAL,
} from "./christmas/colors";
import { far } from "./christmas/far";
import { foreground, ground } from "./christmas/ground";
import { hills } from "./christmas/hills";
import {
  bell,
  candle,
  carolBook,
  gift,
  goose,
  holly,
  lantern,
  plumPudding,
  pocketWatch,
  snowflake,
  topHat,
  wreath,
} from "./christmas/icons";
import { bodies, pigeonFlock, skyFill, snow, stars } from "./christmas/sky";
import { toneOf } from "./christmas/tone";
import type { CartoonSkin, Scene } from "./skin";

// Christmas, after Dickens' A Christmas Carol (1843), drawn as a mid-century modern Christmas
// card: snowy Victorian London at dusk in a handful of flat inks (deep teal, slate navy,
// cranberry, dusty pink, mustard, cream, snow white and an evergreen), printed without outlines
// or soft gradients. The sky hangs in flat bands from deep teal down to a pink and mustard glow,
// with a pale flat moon, atomic starbursts and geometric snow. On the horizon, London cut from
// paper: rooftops bristling with chimney pots on a range of snowy hills, a great dome and a
// church steeple whose bell rings out, strips of fog drifting across their feet; in front of
// them rows of snowy hills with stylized firs in the side lanes, which spread apart as the
// tower climbs. Around the tower: Scrooge & Marley's counting house (Marley's face shimmers in
// the door knocker) and the poulterer's with its prize goose, grids of candlelit windows and
// wreaths, gas lamps, the lamplighter at work, carolers singing by lantern light, pigeons on the
// snowy cobbles and a carriage loping round and round the tower. A scalloped snowbank over the
// slate pavement in front. The middle of the scene, behind the tower, is kept open and quiet.
// Climbing, the street falls away into the night; past that the story loops forever
// (christmas/tone.ts): the night lifts into a golden Christmas morning, a bright winter day with
// cut-paper clouds drifting down the right lane, a rosy dusk like the street's, and night again.
//
// The card is printed whole: the skin paints everything behind the tower in one pass
// (`backdrop`, in the ground hook), back to front, so the base world's sky, puffy clouds and
// field never show.

function backdrop(ctx: Ctx, s: Scene): void {
  skyFill(ctx, s, toneOf(s));
  stars(ctx, s);
  pigeonFlock(ctx, s);
  bodies(ctx, s);
  far(ctx, s);
  hills(ctx, s);
  ground(ctx, s);
  snow(ctx, s, -s.u, s.cssH + s.u * 0.1);
}

export const christmas: CartoonSkin = {
  id: "christmas",
  style: "cartoon",
  name: "Christmas",
  dates: [{ from: [12, 1], to: [12, 27] }],
  fonts: ["Abril Fatface"],
  // Only partly read with a backdrop of its own: the bars' ink, the blast's haze, the base band
  // the foreground covers.
  palette: {
    skyTop: SKY_TOP,
    skyMid: SKY_MID,
    skyBottom: SKY_GLOW,
    star: CREAM,
    moon: CREAM,
    cloudShadow: STUCCO_SHADE,
    cloudBase: SNOW_SHADE,
    cloudLight: SNOW,
    far: FAR,
    fieldFar: SNOW,
    fieldNear: SNOW_SHADE,
    grass: SNOW,
    grassDark: SNOW_SHADE,
    stone: SLATE,
    stoneLight: TEAL,
    ink: NAVY,
  },
  // Bright and festive; warm and cool alternate so every seam reads.
  bars: [
    { color: BAR_RED, icon: holly },
    { color: BAR_ICE, icon: snowflake },
    { color: BAR_GOLD, icon: candle },
    { color: BAR_LILAC, icon: topHat },
    { color: BAR_ORANGE, icon: plumPudding },
    { color: BAR_GREEN, icon: wreath },
    { color: BAR_PINK, icon: gift },
    { color: BAR_BLUE, icon: lantern },
    { color: BAR_AMBER, icon: bell },
    { color: BAR_LIME, icon: carolBook },
    { color: BAR_TEAL, icon: goose },
    { color: BAR_IVORY, icon: pocketWatch },
  ],
  hud: {
    display: "'Abril Fatface', Georgia, 'Times New Roman', serif",
    title: "#ffffff",
    ui: "#a82638",
    accent: BAR_GOLD,
    life: BAR_RED,
  },
  ground: backdrop,
  paintsBackdrop: true,
  foreground,
};

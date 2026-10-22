import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Independence Day colors: a 1930s WPA screen-print poster of a small-town Fourth. A tight set of
// bold inks on cream paper: a deep navy (the key plate: the night, shadows, and the thin keyline
// round everything up close), flag red, the cream of the paper itself (the flag's white), flag
// blue, a clear poster sky blue and one warm ochre gold, with the summer greens for the lawn,
// the hills and the trees. Every color comes in flat steps (lit, body, shade); far things carry
// no keyline and are mixed toward the hour's haze, a paler ink a row further back (tone.ts), so
// the town steps back in flat layers of atmosphere as a WPA poster does.

/** The key ink: the darkest step of everything (the night, shadows, eyes, the keyline up close). */
export const NAVY = "#1b2550";
export const INK = NAVY;

/** A color in three flat steps: lit plane, body, shaded plane. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string, light = 0.4, shade = 0.3): Shades {
  return { light: mix(body, CREAM, light), body, shade: mix(body, NAVY, shade) };
}

// ---------------------------------------------------------------- the inks

/** The paper: the flag's white, the stripes' cream. */
export const CREAM = "#f6ead0";
const RED = "#d6363d";
const BLUE = "#2b4796";
const SKY = "#86c2e2";
export const GOLD = "#efa935";
const GREEN = "#5c9f49";

/** The flag's stripes and field, as printed up close. */
export const STRIPE_RED = RED;
export const STRIPE_WHITE = CREAM;
export const STRIPE_BLUE = BLUE;
export const STAR_WHITE = CREAM;
export const FLAG = { red: RED, white: "#fbf3e2", blue: BLUE } as const;

// ---------------------------------------------------------------- the lawn and the street

/** The town square's lawn (its hazy far edge is in tone.ts), mown in two greens. */
export const LAWN = "#6cae4f";
export const LAWN_NEAR = "#5a9c42";
/** The concrete path from the bandstand's steps to the street, and its joints. */
export const PATH = "#e8d3a2";
export const PATH_EDGE = "#c9ac74";
/** The white picket fence along the square's far side: lit pickets, their shaded edge, the rails. */
export const PICKET = shades("#f2e8d2", 0.5, 0.18);
/** The street in front: navy asphalt, its gold center line, the curb painted for the Fourth. */
export const ASPHALT = shades("#34406e", 0.16, 0.3);
export const LANE_LINE = GOLD;
export const CURB = shades("#e9dcbb", 0.5, 0.22);
export const CONFETTI = [RED, CREAM, SKY, GOLD] as const;

// ---------------------------------------------------------------- the bandstand

export const PAINT: Shades = { light: "#fffaee", body: CREAM, shade: "#cbbd9f" };
export const DECK = "#e8d9b6";
/** The lattice skirt's dark backing: the shadow under the deck. */
export const LATTICE_BACK = "#3a4a80";
export const STEP = shades("#eadcb8", 0.45, 0.22);

// ---------------------------------------------------------------- the barbecue corner

export const GRILL = shades("#283258", 0.35, 0.3);
export const CHARCOAL_GLOW = "#ff7b2e";
export const TABLE = shades("#b9793f", 0.35, 0.3);
export const CLOTH_RED = RED;
export const CLOTH_WHITE = CREAM;
export const MELON_RIND = "#3f8f45";
export const MELON_FLESH = "#f2565f";
export const MELON_SEED = NAVY;
export const PIE_CRUST = shades("#dca055", 0.4, 0.26);
export const PIE_FILLING = "#a92f3a";
export const COOLER = shades("#3d84cf", 0.4, 0.3);
export const BUN = shades("#e9b06a", 0.4, 0.22);
export const SAUSAGE = "#b9403a";
export const SMOKE = "#efe6d4";
export const LEMONADE = "#f7dc5a";
/** The flag in a jar of water on the barbecue table. */
export const JAR = "#bfe3ff";
/** The geraniums either side of the bandstand's steps: their clay pots and their leaves. */
export const POT = "#c8643c";
export const LEAVES = "#3f8f45";
/** A sparkler's crackle. */
export const SPARK = "#fff1c4";

// ---------------------------------------------------------------- people

export const SKIN_FAIR = shades("#f6c9a2", 0.4, 0.2);
export const SKIN_TAN = shades("#d39a6a", 0.38, 0.22);
export const SKIN_BROWN = shades("#8a573a", 0.38, 0.26);
export const HAIR_DARK = "#2a2440";
export const HAIR_BROWN = "#774726";
export const HAIR_BLONDE = "#eec266";
export const HAIR_WHITE = "#f4ecdc";
/** The band's uniforms: red jackets with cream trim and gold braid, cream trousers, red shakos. */
export const UNIFORM = shades(RED, 0.4, 0.3);
export const UNIFORM_TRIM = CREAM;
export const BRAID = GOLD;
export const TROUSERS = shades("#efe3c6", 0.45, 0.26);
/** The drum major's coat: flag blue with the band's gold braid and cream trim. */
export const MAJOR_COAT = shades(BLUE, 0.4, 0.3);
export const BRASS = shades("#eeb33f", 0.45, 0.28);
export const DRUM_SHELL = shades(BLUE, 0.4, 0.3);
export const DRUM_HEAD = CREAM;
/** Drumsticks and mallets: pale wood. */
export const STICK = "#ead7b0";
/** Uncle Sam: a blue tailcoat, striped trousers, a cream vest and a starred top hat. */
export const SAM_COAT = shades(BLUE, 0.4, 0.32);
export const SAM_HAT = shades(CREAM, 0.5, 0.2);
export const SAM_BOW = RED;
/** The fire truck: red, with chrome and a wooden ladder. */
export const TRUCK = shades(RED, 0.4, 0.3);
export const CHROME = shades("#d7dde6", 0.5, 0.3);
export const LADDER = shades("#d6a35a", 0.4, 0.26);
export const TIRE = NAVY;
export const HUBCAP = "#e2dccb";
export const WINDSCREEN = "#bfe3ff";
/** The girl's bike and dress. */
export const BIKE = shades("#ee6aa5", 0.4, 0.28);
export const DRESS = shades(CREAM, 0.5, 0.2);
/** The kids' jeans. */
export const JEANS = shades("#3f62b8", 0.4, 0.3);
export const KID_SHIRTS = [shades("#f08a3a"), shades("#3fa9dc"), shades("#8e68d8")] as const;
export const DOG = shades("#f3ead6", 0.5, 0.22);
export const DOG_SPOT = NAVY;
/** The glint in the dog's eye. */
export const GLINT = "#ffffff";
export const BANDANA = BLUE;

// ---------------------------------------------------------------- the sky's things

/** The crescent moon: its lit face and the rim of shade along its inner curve. */
export const MOON = "#fbeec4";
export const MOON_SHADE = "#e9d496";
/** The show night's big stars: cream, printed over an off-register red plate (Pop Art). */
export const STAR_CREAM = "#fff4d6";
export const STAR_RED = "#e0484d";
/** The flag-stripe sunburst's inks at dusk (mixed into the hour's sky, tone.ts). */
export const RAY_RED = "#e2414a";
export const RAY_CREAM = "#fff1d8";
/** The show night's Ben-Day dots: a step of this blue over the sky's low band, a texture, never the picture. */
export const DOT_INK = "#5d77c8";

/** The eagle: dark brown body and wings, white head and tail, gold beak and feet. */
export const EAGLE = shades("#4a2f22", 0.3, 0.3);
export const EAGLE_WHITE = "#fbf6ea";
export const EAGLE_BEAK = GOLD;
/** The barnstormer: a yellow biplane with red wings. */
export const PLANE = shades("#f4c430", 0.45, 0.25);
export const PLANE_WING = shades(RED, 0.4, 0.3);
/** The hot-air balloon's basket and ropes, and its burner's flame (outer, core). */
export const BASKET = shades("#b7834a", 0.35, 0.3);
export const BURNER = "#ffab2e";
export const BURNER_CORE = "#fff0c2";

/** Firework inks: red, cream, sky blue and gold, in a fixed order so hash() can pick from them. */
export const FIREWORK = ["#ff4e55", "#fff3d6", "#7fb6ff", "#ffc843"] as const;
export const FIREWORK_LIGHT = ["#ffa9ad", "#fffaf0", "#c4dcff", "#ffe6a0"] as const;

// ---------------------------------------------------------------- the town behind

export const BRICK = "#b94a3a";
export const BRICK_TAN = "#d9a35a";
export const BRICK_CREAM = "#eedcb8";
export const BRICK_SAGE = "#6fa592";
export const BRICK_BLUE = "#4f72b0";
/** The courthouse's sandstone, a warmer ink than the clouds behind it, and the church's white clapboard. */
export const STONE = "#e6c590";
export const CLAPBOARD = "#f7f0e0";
export const SLATE = "#3d4b7c";
export const GILT = "#f2b33d";
export const WINDOW = "#2c3a6c";
export const WINDOW_LIT = "#ffd36e";
/** The courthouse clock's face, lit after dark. */
export const CLOCK_LIT = "#fff0c2";
export const AWNING = [GREEN, RED, BLUE] as const;
export const TREE = "#4b9447";
export const TREE_LIT = "#7cbd5a";
export const TREE_SHADE = "#3a7a3d";
export const TRUNK = "#6b4426";
/**
 * The country beyond the town, back to front: the far range (the palest ink), the nearer blue
 * ridge, the far town on its shoulder, the farm hills plowed in contour stripes of green field,
 * ochre wheat and rust furrows with dark hedgerows along them, then the near hill with its woods.
 */
export const FAR_RANGE = "#8f9fd8";
export const RIDGE = "#5f86c8";
export const FAR_TOWN = "#d3a184";
export const FIELD = "#79b552";
export const WHEAT = "#e8b843";
export const FURROW = "#c97f45";
export const HEDGEROW = "#3f8a4a";
export const HILL = "#78ad66";
export const WOODS = "#4e8f52";
/** The water tower's steel and its painted tank. */
export const STEEL = "#7d8fb2";
export const TANK = "#eadfc6";
/** The rooftops behind Main Street: their walls (two rows, the far one paler) and roofs. */
export const ROOF_WALL = "#c98f6b";
export const ROOF_TOP = "#6a6f96";

/**
 * The base palette. Independence Day paints its own backdrop over the base sky, field and
 * band (see july4.ts), so these are the afternoon values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#3f7dbf",
  skyMid: "#6aa6d6",
  skyBottom: "#f3e3bd",
  star: CREAM,
  moon: MOON,
  cloudShadow: "#b9cde0",
  cloudBase: "#f6efdd",
  cloudLight: "#fffaf0",
  far: RIDGE,
  fieldFar: "#8fc46a",
  fieldNear: LAWN,
  // The base band in front is covered by the street; these match the curb and the asphalt.
  grass: CURB.body,
  grassDark: CURB.shade,
  stone: ASPHALT.body,
  stoneLight: ASPHALT.light,
  // The bars' outline and the keyline round everything up close.
  ink: "#1f2342",
};

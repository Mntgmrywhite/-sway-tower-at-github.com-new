import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Independence Day colors: a vintage Americana storybook, after mid-century postcards and the
// hand-painted backgrounds of classic animation. A coordinated set of five: vintage red, faded
// navy, creamy white, golden yellow and lush summer green, warmed by the light of a July
// afternoon. Up close everything is painted soft and round (a lit top, a shaded foot, a gentle
// gradient between) and drawn round with a fine warm sepia line; far off the line goes and the
// colors fade into the hour's haze (tone.ts). Never the poster's flat inks or its navy keyline.

/** The fine sepia line round everything up close (and the eyes, seams and shadows of the cast). */
export const SEPIA = "#4b3426";
export const INK = SEPIA;

/** A color in three painted steps: lit, body, shade. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

/** Shades of a body color: lit toward the cream, shaded toward a warm deep brown-navy. */
export function shades(body: string, light = 0.38, shade = 0.28): Shades {
  return { light: mix(body, CREAM, light), body, shade: mix(body, "#2e2a40", shade) };
}

// ---------------------------------------------------------------- the five

/** Creamy white: the flag's white, painted trim, clapboard, the clouds' lit tops. */
export const CREAM = "#f7eedb";
/** Vintage red: the flag's stripes, awnings, the barn, the bunting. */
export const RED = "#c9403a";
/** Faded navy: the flag's union, shutters, uniforms, the night. */
export const NAVY = "#34466e";
/** Golden yellow: the warm light, gilt, brass, lemonade. */
export const GOLD = "#e9b445";
/** Lush summer green: lawns, hills, leaves. */
export const GREEN = "#5f9e48";

/** The flag's stripes and union as painted up close. */
export const STRIPE_RED = RED;
export const STRIPE_WHITE = CREAM;
export const STRIPE_BLUE = NAVY;
export const FLAG = { red: "#c23a37", white: "#fbf4e6", blue: "#2f4272" } as const;

// ---------------------------------------------------------------- the square

/** The town square's lawn: lit, body, the darker mown stripe, and the shade under things. */
export const LAWN = "#79b553";
export const LAWN_LIGHT = "#9ccb68";
export const LAWN_STRIPE = "#6aa748";
export const LAWN_SHADE = "#4d8a3c";
/** The brick walk the parade comes down, in front of the bandstand. */
export const PATH = "#e8d2a6";
export const PATH_EDGE = "#c8a978";
/** The white picket fences: lit pickets, their shaded side, the rails. */
export const PICKET = shades("#f6efe0", 0.5, 0.2);
/** The brick sidewalk along the front, its mortar, and the granite curb. */
export const BRICK_WALK = shades("#c97a5a", 0.32, 0.24);
export const MORTAR = "#e9cfae";
export const CURB = shades("#ddd2bd", 0.5, 0.22);

// ---------------------------------------------------------------- the bandstand

export const PAINT: Shades = { light: "#fffbf1", body: "#f4ead6", shade: "#d3c3a3" };
export const DECK = "#ead9b5";
/** The lattice skirt's backing: the cool shade under the deck. */
export const LATTICE_BACK = "#5a6a8e";
export const STEP = shades("#ecdcb9", 0.45, 0.22);
/** The bandstand's roof posts and its rail. */
export const RAIL = PAINT;

// ---------------------------------------------------------------- the picnic and the barbecue

export const GRILL = shades("#2f3a54", 0.35, 0.3);
export const CHARCOAL_GLOW = "#ff8a3a";
export const TABLE = shades("#b9824a", 0.35, 0.3);
export const CLOTH_RED = RED;
export const CLOTH_WHITE = CREAM;
export const MELON_RIND = "#3f8f45";
export const MELON_FLESH = "#ef5f62";
export const MELON_SEED = "#3b2a26";
export const PIE_CRUST = shades("#dca055", 0.4, 0.26);
export const PIE_FILLING = "#a3313c";
export const COOLER = shades("#4f86c6", 0.4, 0.3);
export const BUN = shades("#e9b06a", 0.4, 0.22);
export const SAUSAGE = "#b9403a";
export const SMOKE = "#f1e9d9";
export const LEMONADE = "#f6d95a";
/** Glass: the flag's jar of water, the pitcher. */
export const JAR = "#cfe8f6";
/** Clay pots, leaves, blooms. */
export const POT = "#c56d43";
export const LEAVES = "#3f8a42";
export const LEAVES_LIGHT = "#6fb257";
/** A sparkler's crackle. */
export const SPARK = "#fff3c8";
/** Wicker, barrel staves and their hoops, a wagon wheel's wood. */
export const WICKER = shades("#d6a35c", 0.4, 0.3);
export const STAVE = shades("#a8703f", 0.35, 0.3);
export const HOOP = "#4d4a52";
/** The picnic blanket's red gingham. */
export const GINGHAM = RED;
/** Flower beds: red geraniums, white daisies, blue cornflowers, golden marigolds. */
export const BLOOMS = ["#d8423f", "#fbf4e6", "#5d82c9", "#f2bb3f"] as const;
/** The butterflies' wings. */
export const BUTTERFLY = ["#f2a541", "#f6efe0", "#8fb7e8"] as const;
/** Balloons on strings: red, cream, navy blue and gold. */
export const BALLOON = ["#d4433f", "#f7eedb", "#4a64a0", "#ecb847"] as const;

// ---------------------------------------------------------------- people

export const SKIN_FAIR = shades("#f6c9a2", 0.4, 0.2);
export const SKIN_TAN = shades("#d39a6a", 0.38, 0.22);
export const SKIN_BROWN = shades("#8a573a", 0.38, 0.26);
export const HAIR_DARK = "#2e2632";
export const HAIR_BROWN = "#774726";
export const HAIR_BLONDE = "#eec266";
export const HAIR_WHITE = "#f4ecdc";
/** The band's uniforms: red jackets with cream trim and gold braid, cream trousers, red shakos. */
export const UNIFORM = shades(RED, 0.4, 0.3);
export const TROUSERS = shades("#efe3c6", 0.45, 0.26);
/** The drum major's coat: faded navy with the band's gold braid and cream trim. */
export const MAJOR_COAT = shades(NAVY, 0.4, 0.3);
export const BRASS = shades("#eab444", 0.45, 0.28);
export const DRUM_SHELL = shades(NAVY, 0.4, 0.3);
export const DRUM_HEAD = CREAM;
/** Drumsticks and mallets: pale wood. */
export const STICK = "#ead7b0";
/** Uncle Sam: a navy tailcoat, striped trousers, a cream vest and a starred top hat. */
export const SAM_COAT = shades(NAVY, 0.4, 0.32);
/** The fire truck: red, with chrome and a wooden ladder. */
export const TRUCK = shades(RED, 0.4, 0.3);
export const CHROME = shades("#d7dde6", 0.5, 0.3);
export const LADDER = shades("#d6a35a", 0.4, 0.26);
export const TIRE = "#2e2a32";
export const HUBCAP = "#e2dccb";
export const WINDSCREEN = "#cfe6f4";
/** The girl's bike and dress. */
export const BIKE = shades("#e9739f", 0.4, 0.28);
export const DRESS = shades(CREAM, 0.5, 0.2);
/** The kids' jeans and shirts. */
export const JEANS = shades("#4b67a8", 0.4, 0.3);
export const KID_SHIRTS = [shades("#ef8f43"), shades("#4aa6d6"), shades("#9a72cf")] as const;
export const DOG = shades("#f3ead6", 0.5, 0.22);
export const DOG_SPOT = "#3b2a26";
/** The glint in an eye. */
export const GLINT = "#ffffff";

// ---------------------------------------------------------------- the sky's things

/** The crescent moon: its lit face and the rim of shade along its inner curve. */
export const MOON = "#fbf0cf";
export const MOON_SHADE = "#eadbab";
/** The stars: cream, a few warm. */
export const STAR = "#fff6dc";
export const STAR_WARM = "#ffe1a8";

/** The eagle: a warm dark brown, a white head and tail, a gold beak and feet. */
export const EAGLE = shades("#5a3a28", 0.32, 0.3);
export const EAGLE_WHITE = "#fbf6ea";
export const EAGLE_BEAK = GOLD;
/** The barnstormer: a butter-yellow biplane with red wings. */
export const PLANE = shades("#f2c84a", 0.45, 0.25);
export const PLANE_WING = shades(RED, 0.4, 0.3);
/** The hot-air balloon's basket and ropes, and its burner's flame (outer, core). */
export const BASKET = shades("#b7834a", 0.35, 0.3);
export const BURNER = "#ffab2e";
export const BURNER_CORE = "#fff0c2";

/** Firework colors: red, white, blue and gold, in a fixed order so hash() can pick from them; their bright hearts. */
export const FIREWORK = ["#ff5a52", "#fff7e6", "#86b8ff", "#ffcf5a"] as const;
export const FIREWORK_LIGHT = ["#ffc2b8", "#ffffff", "#d4e6ff", "#fff0c0"] as const;

// ---------------------------------------------------------------- the town and the country

/** Main Street's fronts: red brick, butter yellow, mint, powder blue, rose and cream clapboard. */
export const FRONTS = ["#b9583f", "#efcf7a", "#9fcdb3", "#9cbfe0", "#e7a492", "#f3e7cf"] as const;
/** Painted trim and cornices. */
export const TRIM = "#fbf4e4";
/** Awning stripes (each with cream): red, green, navy, gold. */
export const AWNINGS = ["#c9403a", "#4f9a5c", "#3f5687", "#e2a43b"] as const;
/** Shop-window glass (a cool reflection), and windows lit warm at dusk. */
export const GLASS = "#6f8fb4";
export const WINDOW_LIT = "#ffd27a";
/** The courthouse's sandstone, the church's white clapboard, slate roofs, gilt. */
export const STONE = "#ead0a0";
export const CLAPBOARD = "#f9f2e2";
export const SLATE = "#6d7896";
export const GILT = "#efb84a";
/** The courthouse clock's face, lit after dark. */
export const CLOCK_LIT = "#fff2c8";
/** Roofs of the town: terracotta, slate, a mossy green, barn red. */
export const ROOFS = ["#c66b4c", "#6d7896", "#5e8466", "#b04a3c"] as const;
/** Walls of the houses beyond Main Street: cream, white, butter, sky, rose. */
export const WALLS = ["#f3e7cf", "#fbf6ea", "#f1d68c", "#b8d3ea", "#ecbcaa"] as const;
/** The big summer trees: body, lit crown, shade, trunk. */
export const TREE = "#4f9447";
export const TREE_LIT = "#88c062";
export const TREE_SHADE = "#2f6a3a";
export const TRUNK = "#7a5234";
/**
 * The country beyond the town, back to front: the far ridge (palest), the rolling farm hills
 * (green and golden fields, hedgerows), the near slopes and their tree lines.
 */
export const RIDGE = "#7fae96";
export const FARM = "#86bb5c";
export const WHEAT = "#e6c25a";
export const MEADOW = "#a5cc66";
export const HEDGEROW = "#3f7d44";
export const SLOPE = "#6aa84f";
export const WOODS = "#3f7a45";
/** The red barn on the far hill and its silo, the water tower. */
export const BARN = "#b8443b";
export const SILO = "#d9d2c2";
export const STEEL = "#8b97b4";
export const TANK = "#efe6d2";

// ---------------------------------------------------------------- the cast's clothes

/** A warm dark brown: everyday shoes, a butterfly's body. */
export const DARK_BROWN = "#3b2a26";
/** Polished black: the band's shoes, cap peaks. */
export const POLISH = "#2a2433";
/** Dress white: gloves, sashes, plumes, a chef's toque. */
export const DRESS_WHITE = "#fbf6ea";
/** Summer linen: a parasol's panels, a sun hat. */
export const LINEN = "#fbf4e6";
/** White summer shoes. */
export const WHITE_SHOES = "#f6efe0";
/** Denim, and the blue of a girl's skirt. */
export const DENIM = "#4b67a8";
/** Blue-grey slacks. */
export const SLACKS = "#6c7fa8";
/** Khaki trousers. */
export const KHAKI = "#c99a5a";
/** A white summer shirt. */
export const SHIRT_WHITE = "#f1f0e8";
/** The cook's pink shirt. */
export const COOK_SHIRT = "#e9878a";
/** Mom's rose dress. */
export const ROSE_DRESS = "#e6a0b4";
/** Her little girl's butter-yellow dress. */
export const BUTTER_DRESS = "#f6e27a";
/** The lemonade girl's mint dress. */
export const MINT_DRESS = "#7fc2a8";
/** Marigold: hair ribbons, flowers in a bike's basket. */
export const MARIGOLD = "#f2bb3f";
/** A straw sun hat. */
export const STRAW = "#f6e7b8";
/** Grandpa's oatmeal cardigan, and his tweed trousers. */
export const OATMEAL = "#f2ead4";
export const TWEED = "#8a7a62";
/** A chambray shirt. */
export const CHAMBRAY = "#7fa8d8";
/** The parasol lady's seafoam dress, and her parasol's pink panels. */
export const SEAFOAM = "#9bd0c4";
export const PARASOL_PINK = "#e98aa0";
/** A tangerine top. */
export const TANGERINE = "#f2a541";
/** The old veteran's blue suit and garrison cap. */
export const VET_BLUE = "#4f6a8e";
/** A stroller's sunflower dress, and another's rust jacket. */
export const SUNFLOWER = "#f2c84a";
export const RUST = "#b9583f";
/** The color guard's coat and his sand trousers. */
export const COLOR_GUARD = "#3d5478";
export const SAND = "#e3d6b8";
/** A girl's pink skirt on the fire truck. */
export const PINK_SKIRT = "#e8739a";
/** More hair: auburn, chestnut, ginger. */
export const HAIR_AUBURN = "#8a5a34";
export const HAIR_CHESTNUT = "#5a3420";
export const HAIR_GINGER = "#c96f3a";
/** Rosy cheeks. */
export const BLUSH = "#f08a7a";
/** The pleats of the cook's toque. */
export const CHEF_PLEAT = "#d9cdb4";
/** A red cap's lit crown. */
export const RED_LIT = "#e05a4f";
/** A straw boater. */
export const BOATER = "#ecd28c";
/** The fire truck's headlamp. */
export const HEADLAMP = "#fff3c8";
/** The bike's saddle and the pale wicker of its basket. */
export const SADDLE = "#7a4a2e";
export const BASKET_PALE = "#f2e2b8";
/** The dog's tongue. */
export const TONGUE = "#e86a6a";
/** The trail a sparkler draws in the air. */
export const SPARK_TRAIL = "rgba(255, 236, 170, 0.55)";

// ---------------------------------------------------------------- the town's lights and fixtures

/** The lawn chair's aluminum frame. */
export const ALUMINUM = "#c9ced8";
/** The lampposts' iron, and their globes by day and lit. */
export const IRON = "#3a3a4e";
export const GLOBE = "#f8f4ea";
export const GLOBE_LIT = "#fff1c8";
/** The little lights strung between the pennants, and their glow. */
export const BULB = "#fff1c4";
export const BULB_GLOW = "#ffc35e";
/** The street lamps along the rows after dark, and their glow. */
export const LAMP_BULB = "#fff3cf";
export const LAMP_GLOW = "#ffc96a";
/** The floodlight's beam up the courthouse's flagpole. */
export const FLOODLIGHT = "#fff0c4";
/** The shade on the far neighborhood's roofs. */
export const BACK_ROOF_SHADE = "#2a2f55";
/** The deepest shade of the bandstand's lattice skirt, its runner's lit red and the clay pots' shade. */
export const LATTICE_DEEP = "#3e4c72";
export const RUNNER_LIT = "#d65047";
export const POT_SHADE = "#9e5232";

// ---------------------------------------------------------------- the sky's things, more

/** The sun's bright heart. */
export const SUN_CORE = "#fffdf0";
/** The eagle's eye. */
export const EAGLE_EYE = "#2a1f24";
/** The hot-air balloon's sheen and shade. */
export const BALLOON_SHEEN = "#fffaeb";
export const BALLOON_SHADE = "#282850";
/** The barnstormer's leather cap and his propeller's blur. */
export const PILOT_CAP = "#7b6a5c";
export const PROP_BLUR = "#e8e2d4";
/** The shade over the parachute's canopy. */
export const CANOPY_SHADE = "rgba(40, 40, 80, 0.18)";
/** The smoke a shell leaves, lit warm. */
export const SMOKE_LIT = "#c9bfd8";

// ---------------------------------------------------------------- the floating island

/** The island's earth, top to bottom: topsoil, sand, clay, umber, bedrock (body and lit strip). */
export const ISLAND_STRATA = [
  { body: "#9a6a44", lit: "#b98a5c" },
  { body: "#d9b678", lit: "#ecd09a" },
  { body: "#c4734e", lit: "#dc9270" },
  { body: "#8a5a40", lit: "#a87656" },
  { body: "#6e7390", lit: "#8b90aa" },
] as const;
/** Its grass (shade, body, lit), its spring's water, its roots, the crystal in its geode, its plinth's stone. */
export const ISLAND_GRASS = [TREE, LAWN, "#a6d26c"] as const;
export const ISLAND_WATER = "#8ec3e6";
export const ISLAND_WATER_LIGHT = "#e2f2fb";
export const ISLAND_ROOT = "#6b4a33";
export const ISLAND_GEM = ["#5f9fc7", "#9fd6ef", "#3b6f9a"] as const;
export const ISLAND_STONE = ["#b9ae9a", "#d8cfbd", "#efe8d8"] as const;
/** The little tree on it. */
export const ISLAND_LEAF = [TREE_SHADE, TREE, TREE_LIT] as const;
/** The shade gathering under the island, and the lit top and shaded foot laid over each bar of its tower. */
export const ISLAND_UNDERSHADE = ["rgba(46, 30, 40, 0)", "rgba(46, 30, 40, 0.38)"] as const;
export const BAR_SHEEN = "rgba(255, 252, 240, 0.42)";
export const BAR_SHADE = "rgba(40, 30, 50, 0.22)";

/**
 * The base palette. Independence Day paints its own backdrop over the base sky, field and band
 * (july4.ts), so these are the afternoon values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#4f8fd0",
  skyMid: "#8cc0e6",
  skyBottom: "#f6e5bf",
  star: STAR,
  moon: MOON,
  cloudShadow: "#c3d1e3",
  cloudBase: "#fbf5e8",
  cloudLight: "#ffffff",
  far: RIDGE,
  fieldFar: MEADOW,
  fieldNear: LAWN,
  // The base band in front is covered by the picnic lawn; these match it.
  grass: LAWN,
  grassDark: LAWN_SHADE,
  stone: CURB.body,
  stoneLight: CURB.light,
  // The bars' outline: a deep warm navy.
  ink: "#232340",
};

import { alpha, mix } from "../../base/draw";

// A Christmas Carol as a mid-century modern Christmas card (a 1950s picture book in the spirit
// of the UPA studio, Mary Blair and Charley Harper): snowy Victorian London at dusk in a handful
// of flat inks, printed without outlines. Deep teal and slate navy for the sky and the iron,
// cranberry and dusty pink for the brick, mustard for every lit window and lamp, cream and snow
// white, and an evergreen for holly and firs. Everything else here is a tint of those inks.

// ---------------------------------------------------------------- the inks

/** Slate navy: the night, iron, hats, eyes and the fine lines (palette.ink for the bars). */
export const NAVY = "#1f2a44";
/** Deep teal and teal: the dusk sky, doors, coats. */
export const TEAL_DEEP = "#1d4f5b";
export const TEAL = "#2f8082";
/** Pale aqua: the winter day, ice, snow in shade. */
export const AQUA = "#9fd3c9";
/** Cranberry: brick, ribbons, berries, the carriage. */
export const CRANBERRY = "#c43d41";
/** Dusty pink: the dusk glow, painted brick, cheeks. */
export const ROSE = "#eda7a0";
/** Mustard: candlelight, lamps, brass, stars. */
export const MUSTARD = "#eeb640";
/** Warm cream: the moon, stucco, the lamps' flames, snow in the glow. */
export const CREAM = "#f8eed6";
/** Snow white, and pure white for glints, twinkles and flakes. */
export const SNOW = "#fcfbf6";
export const WHITE = "#ffffff";
/** Evergreen: holly, wreaths, firs. */
export const EVERGREEN = "#3f8a62";

// ---------------------------------------------------------------- the bars

// Bright bar colors, warm and cool alternating so every seam reads.
export const BAR_RED = "#ff4f5e";
export const BAR_ICE = "#6fd5ff";
export const BAR_GOLD = "#ffd03f";
export const BAR_LILAC = "#b28cff";
export const BAR_ORANGE = "#ff9a3d";
export const BAR_GREEN = "#4fd06b";
export const BAR_PINK = "#ff74b8";
export const BAR_BLUE = "#5b8cff";
export const BAR_AMBER = "#ffbf3a";
export const BAR_LIME = "#9fe04a";
export const BAR_TEAL = "#33d1a8";
export const BAR_IVORY = "#ffe3a3";

// ---------------------------------------------------------------- tints

/**
 * The street's dusk sky, its five inks from the top down to the glow on the horizon: deep teal,
 * teal, a paler aqua teal, dusty pink and a mustard cream (tone.ts prints them as flat bands).
 */
export const SKY_TOP = TEAL_DEEP;
export const SKY_MID = TEAL;
export const SKY_TURN = mix(TEAL, AQUA, 0.45);
export const SKY_LOW = ROSE;
export const SKY_GLOW = mix(CREAM, MUSTARD, 0.3);
/** The night the street climbs into: slate navy down through deep teal to a mauve glow over the city. */
export const NIGHT_TOP = mix(NAVY, TEAL_DEEP, 0.2);
export const NIGHT_MID = mix(NAVY, TEAL_DEEP, 0.62);
export const NIGHT_TURN = mix(TEAL_DEEP, TEAL, 0.3);
export const NIGHT_LOW = mix(NAVY, ROSE, 0.42);
export const NIGHT_GLOW = mix(NAVY, ROSE, 0.6);

/** London on the horizon: faded flat silhouettes in the dusk, their snow and their lit windows. */
export const FAR = mix(TEAL, ROSE, 0.3);
export const FAR_BACK = mix(FAR, SKY_GLOW, 0.42);
export const FAR_LIGHT = mix(MUSTARD, CREAM, 0.35);
export const FAR_SNOW = mix(FAR, SNOW, 0.5);
export const FAR_BACK_SNOW = mix(FAR_BACK, SNOW, 0.4);
/** The fog lying in strips across the city's feet. */
export const FOG = mix(CREAM, ROSE, 0.35);

/** The pale moon: its face, the shade along its rim and on its seas, its halo; the sun's halo. */
export const MOON = CREAM;
export const MOON_SHADE = "#ead6ad";
export const MOON_HALO = "#fff4dc";
export const SUN_HALO = "#fff1c8";

/** Marley's face shimmering in the door knocker: a pale ghostly aqua. */
export const KNOCKER_GHOST = "#d5f4ec";

/** Snow on the hills and the street: lit, and in soft aqua shade. */
export const SNOW_SHADE = mix(SNOW, AQUA, 0.62);
/** The firs on the snowy hills, in a soft tint of the evergreen. */
export const FIR = mix(EVERGREEN, AQUA, 0.42);

/** Brick: the poulterer's cranberry, Scrooge's sooty brick, painted terraces; each with its shaded side. */
export const BRICK = CRANBERRY;
export const BRICK_SHADE = mix(CRANBERRY, NAVY, 0.28);
export const SOOT = mix(CRANBERRY, NAVY, 0.45);
export const SOOT_SHADE = mix(CRANBERRY, NAVY, 0.62);
export const PAINTED = mix(ROSE, CRANBERRY, 0.25);
export const PAINTED_SHADE = mix(PAINTED, NAVY, 0.22);
/** Stucco, sills and lintels, window bars. */
export const STUCCO = CREAM;
export const STUCCO_SHADE = mix(CREAM, AQUA, 0.45);
/** Slate roofs. */
export const SLATE = mix(NAVY, TEAL, 0.3);

/** Candlelight: deep mustard, the window's glow and the bright core. Unlit panes in navy. */
export const LAMP_DEEP = mix(MUSTARD, CRANBERRY, 0.22);
export const LAMP = MUSTARD;
export const LAMP_CORE = mix(CREAM, MUSTARD, 0.15);
export const DIM_PANE = mix(NAVY, TEAL, 0.45);

/** Doors, signs, trim. */
export const DOOR_GREEN = TEAL;
export const DOOR_RED = CRANBERRY;
export const SIGN_GREEN = mix(EVERGREEN, NAVY, 0.4);
export const SIGN_RED = mix(CRANBERRY, NAVY, 0.3);
export const SIGN_GOLD = MUSTARD;
export const BRASS = MUSTARD;
export const IRON = NAVY;

/** Holly and berries. */
export const HOLLY = EVERGREEN;
export const BERRY = CRANBERRY;

/** The street: cobbles showing through the snow, and the carriage's ruts. */
export const COBBLE = mix(SNOW, AQUA, 0.62);
export const RUT = mix(SNOW, TEAL, 0.25);

/** Chimney smoke: flat puffs of the dusk's haze. */
export const SMOKE = alpha(mix(CREAM, AQUA, 0.5), 0.75);

/** Victorian clothes in the card's inks, and faces. */
export const COAT_NAVY = NAVY;
export const COAT_TEAL = TEAL;
export const COAT_RED = CRANBERRY;
export const COAT_MUSTARD = mix(MUSTARD, CRANBERRY, 0.2);
export const SHAWL = CRANBERRY;
export const SKIN = mix(CREAM, ROSE, 0.55);
export const CHEEK = mix(ROSE, CRANBERRY, 0.45);
export const BONNET = ROSE;
export const BOOK = CRANBERRY;

/** The horse (a warm chestnut from the card's inks) and its dark mane, the coach, its wheels. */
export const HORSE = mix(CRANBERRY, MUSTARD, 0.45);
export const HORSE_SHADE = mix(HORSE, NAVY, 0.25);
export const MANE = mix(NAVY, CRANBERRY, 0.3);
export const CARRIAGE = TEAL_DEEP;
export const CARRIAGE_LIGHT = TEAL;
export const WHEEL = MUSTARD;

/** Pigeons: slate blue-grey with a teal neck. */
export const PIGEON = mix(NAVY, AQUA, 0.55);
export const PIGEON_LIGHT = mix(NAVY, AQUA, 0.78);
export const PIGEON_NECK = TEAL;
export const BEAK = mix(MUSTARD, CRANBERRY, 0.35);

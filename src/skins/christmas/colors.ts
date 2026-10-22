import { alpha, mix } from "../../base/draw";

// A Christmas Carol as a mid-century modern Christmas card (a 1950s picture book in the spirit
// of the UPA studio, Mary Blair and Charley Harper): snowy Victorian London at dusk in a handful
// of rich flat inks. Slate navy for the night, the iron and the ink line round everything near;
// deep teal and teal for the dusk sky, doors and coats; cranberry and rose for the brick and the
// afterglow; mustard for every lit window and lamp; cream and snow white; an evergreen for holly
// and firs. Everything else here is a tint of those inks.

// ---------------------------------------------------------------- the inks

/** Slate navy: the night, iron, hats, eyes and the ink line round near things (palette.ink for the bars). */
export const NAVY = "#1a2341";
/** Deep teal and teal: the dusk sky, doors, coats. */
export const TEAL_DEEP = "#15485a";
export const TEAL = "#1f7c7c";
/** Pale aqua: the winter day, ice, snow in shade. */
export const AQUA = "#9ad7cb";
/** Cranberry: brick, ribbons, berries, the afterglow. */
export const CRANBERRY = "#c42e3c";
/** Rose: the dusk glow, painted brick, cheeks. */
export const ROSE = "#ec918a";
/** Mustard: candlelight, lamps, brass, stars. */
export const MUSTARD = "#f4b42e";
/** Warm cream: the moon, stucco, the lamps' flames, snow in the glow. */
export const CREAM = "#fbefd4";
/** Snow white, and pure white for glints, twinkles and flakes. */
export const SNOW = "#fdfcf6";
export const WHITE = "#ffffff";
/** Evergreen: holly, wreaths, firs. */
export const EVERGREEN = "#2a8558";

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

// ---------------------------------------------------------------- the ink line

/** The ink line round every near shape (the street, its folk, the carriage): slate navy. */
export const INK = NAVY;

// ---------------------------------------------------------------- tints

/**
 * The street's dusk sky, its five inks from the top down to the glow on the horizon: blue-black
 * teal, deep teal, teal, the rose afterglow and a mustard glow low over the city (tone.ts prints
 * them as flat bands).
 */
export const SKY_TOP = mix(NAVY, TEAL_DEEP, 0.45);
export const SKY_MID = TEAL_DEEP;
export const SKY_TURN = mix(TEAL_DEEP, TEAL, 0.62);
export const SKY_LOW = mix(ROSE, CRANBERRY, 0.18);
export const SKY_GLOW = mix(MUSTARD, ROSE, 0.3);
/** The night the street climbs into: slate navy down through deep teal to a cranberry glow over the city. */
const NIGHT_INK = "#0c1022";
export const NIGHT_TOP = mix(NAVY, NIGHT_INK, 0.35);
export const NIGHT_MID = mix(TEAL_DEEP, NIGHT_INK, 0.42);
export const NIGHT_TURN = mix(NAVY, TEAL_DEEP, 0.85);
export const NIGHT_LOW = mix(NAVY, CRANBERRY, 0.2);
export const NIGHT_GLOW = mix(NAVY, CRANBERRY, 0.3);

/**
 * London at dusk, cut from paper in rows (tone.ts pales each row further back into the low sky):
 * the front row's plum-navy, the middle row's a shade into the glow; the snow on their roofs, and
 * the candlelight in their windows.
 */
export const CITY = mix(NAVY, CRANBERRY, 0.22);
export const CITY_MID = mix(CITY, SKY_LOW, 0.3);
export const CITY_SNOW = mix(CREAM, ROSE, 0.25);
export const CITY_LIGHT = mix(MUSTARD, CREAM, 0.2);
/** The fog lying in strips across the city's feet. */
export const FOG = mix(CREAM, ROSE, 0.4);

/** The pale moon: its face, the shade along its rim and on its seas, its halo; the sun's halo. */
export const MOON = CREAM;
export const MOON_SHADE = "#ead2a6";
export const MOON_HALO = "#fff4dc";
export const SUN_HALO = "#fff1c8";

/** Marley's face shimmering in the door knocker: a pale ghostly aqua. */
export const KNOCKER_GHOST = "#d5f4ec";

/** Snow on the hills and the street: lit, and in aqua shade. */
export const SNOW_SHADE = mix(SNOW, AQUA, 0.7);
/** The firs on the snowy hills, in an evergreen gone teal with the dusk. */
export const FIR = mix(EVERGREEN, TEAL_DEEP, 0.35);

/** Brick: the poulterer's cranberry, Scrooge's sooty brick, painted terraces; each with its shaded side and its mortar pattern. */
export const BRICK = CRANBERRY;
export const BRICK_SHADE = mix(CRANBERRY, NAVY, 0.32);
export const BRICK_LINE = mix(CRANBERRY, NAVY, 0.18);
export const SOOT = mix(CRANBERRY, NAVY, 0.55);
export const SOOT_SHADE = mix(CRANBERRY, NAVY, 0.72);
export const SOOT_LINE = mix(CRANBERRY, NAVY, 0.64);
export const PAINTED = mix(ROSE, CRANBERRY, 0.2);
export const PAINTED_SHADE = mix(PAINTED, NAVY, 0.25);
export const PAINTED_LINE = mix(PAINTED, CRANBERRY, 0.4);
/** A teal-painted terrace for the wide street, and its shade. */
export const TEAL_HOUSE = mix(TEAL, AQUA, 0.25);
export const TEAL_HOUSE_SHADE = mix(TEAL_HOUSE, NAVY, 0.3);
export const TEAL_HOUSE_LINE = mix(TEAL_HOUSE, NAVY, 0.15);
/** Stucco, sills and lintels, window bars. */
export const STUCCO = CREAM;
export const STUCCO_SHADE = mix(CREAM, AQUA, 0.5);
/** Slate roofs, and the slates' rows a shade darker. */
export const SLATE = mix(NAVY, TEAL, 0.32);
export const SLATE_LINE = mix(NAVY, TEAL, 0.15);

/** Candlelight: deep mustard, the window's glow and the bright core. Unlit panes in navy. */
export const LAMP_DEEP = mix(MUSTARD, CRANBERRY, 0.25);
export const LAMP = MUSTARD;
export const LAMP_CORE = mix(CREAM, MUSTARD, 0.15);
export const DIM_PANE = mix(NAVY, TEAL, 0.4);
/** Lamplight and candlelight lying on the snow: two flat warm tints. */
export const POOL = mix(SNOW, MUSTARD, 0.36);
export const POOL_CORE = mix(SNOW, MUSTARD, 0.6);

/** Doors, signs, trim. */
export const DOOR_GREEN = TEAL;
export const DOOR_RED = CRANBERRY;
export const SIGN_GREEN = mix(EVERGREEN, NAVY, 0.45);
export const SIGN_RED = mix(CRANBERRY, NAVY, 0.3);
export const SIGN_GOLD = MUSTARD;
export const BRASS = MUSTARD;
export const IRON = NAVY;

/** Holly and berries, and holly's shade. */
export const HOLLY = EVERGREEN;
export const HOLLY_DARK = mix(EVERGREEN, NAVY, 0.4);
export const BERRY = CRANBERRY;

/** The street: cobbles showing through the snow, and the carriage's ruts. */
export const COBBLE = mix(SNOW, TEAL, 0.32);
export const RUT = mix(SNOW, TEAL, 0.38);
/** The pavement in front: slate flags, the paler kerbstones, and the joints between them. */
export const FLAG = mix(NAVY, TEAL, 0.36);
export const FLAG_LIGHT = mix(NAVY, AQUA, 0.42);
export const FLAG_JOINT = mix(NAVY, TEAL, 0.12);

/** Chimney smoke: flat puffs of the dusk's haze. */
export const SMOKE = alpha(mix(CREAM, AQUA, 0.45), 0.8);

/** Shadows on the snow: a flat teal tint. */
export const SHADOW = alpha(TEAL, 0.22);

/** Victorian clothes in the card's inks, and faces. */
export const COAT_NAVY = mix(NAVY, TEAL_DEEP, 0.3);
export const COAT_TEAL = TEAL;
export const COAT_RED = CRANBERRY;
export const COAT_MUSTARD = mix(MUSTARD, CRANBERRY, 0.2);
export const SHAWL = CRANBERRY;
export const SKIN = mix(CREAM, ROSE, 0.5);
export const CHEEK = mix(ROSE, CRANBERRY, 0.45);
export const BONNET = ROSE;
export const BOOK = CRANBERRY;

/** The horse (a warm chestnut from the card's inks) and its dark mane, the coach, its wheels. */
export const HORSE = mix(CRANBERRY, MUSTARD, 0.45);
export const HORSE_SHADE = mix(HORSE, NAVY, 0.28);
export const MANE = mix(NAVY, CRANBERRY, 0.3);
export const CARRIAGE = TEAL_DEEP;
export const CARRIAGE_LIGHT = TEAL;
export const WHEEL = MUSTARD;

/** Pigeons: slate blue-grey with a teal neck. */
export const PIGEON = mix(NAVY, AQUA, 0.55);
export const PIGEON_LIGHT = mix(NAVY, AQUA, 0.78);
export const PIGEON_NECK = TEAL;
export const BEAK = mix(MUSTARD, CRANBERRY, 0.35);

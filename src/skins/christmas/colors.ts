import { alpha, mix } from "../../base/draw";

// A Christmas Carol palette: a snowy Victorian London street at dusk. A twilight-blue sky
// warming to a rosy glow behind the fog, faded lavender rooftops and a cathedral dome on the
// horizon, sooty-red brick townhouses with candlelit windows, green doors, holly and brass,
// and snow lit pink by the dusk falling into soft blue shade.

/** Outline color for everything up close: a deep plum navy. */
export const INK = "#2b2140";

// Bright bar colors, warm and cool alternating so every seam reads.
export const RED = "#ff4f5e";
export const ICE = "#6fd5ff";
export const GOLD = "#ffd03f";
export const LILAC = "#b28cff";
export const ORANGE = "#ff9a3d";
export const GREEN = "#4fd06b";
export const PINK = "#ff74b8";
export const BLUE = "#5b8cff";
export const AMBER = "#ffbf3a";
export const LIME = "#9fe04a";
export const TEAL = "#33d1a8";
export const IVORY = "#ffe3a3";
export const WHITE = "#ffffff";

/** The dusk sky, from the top down to the horizon: twilight blue, lavender, a rosy glow. */
export const SKY_TOP = "#3b4799";
export const SKY_MID = "#8a7ccc";
export const SKY_BOTTOM = "#f5b7a6";

/** The fog bank (the base cloud bank): lavender shade, misty body, rosy-white caps. */
export const FOG_SHADE = "#ab9dcb";
export const FOG = "#d3c8e6";
export const FOG_LIGHT = "#fbeff2";

/** Faded silhouettes on the horizon (palette.far), the hazier row behind, and their lights. */
export const FAR = "#7f72b3";
export const FAR_BACK = mix(FAR, SKY_BOTTOM, 0.3);
export const FAR_LIGHT = mix(FAR, "#ffe2a0", 0.62);
export const FAR_SNOW = mix(FAR, "#ffffff", 0.45);
export const FAR_BACK_SNOW = mix(FAR_BACK, "#ffffff", 0.3);

/** The snowy street from the horizon to the viewer. */
export const FIELD_FAR = "#eee3ef";
export const FIELD_NEAR = "#b7c0e8";

/** Snow up close: lit tops falling into soft blue shade. */
export const SNOW = "#fdfcff";
export const SNOW_SHADE = "#cdd5f2";
export const SNOW_DEEP = "#a3afe0";

/** Brick: two houses, each with its lit face, a shaded face and mortar marks. */
export const BRICK = "#c2604f";
export const BRICK_SHADE = mix(BRICK, INK, 0.25);
export const BRICK_MARK = mix(BRICK, INK, 0.32);
export const SOOT = "#9a5552";
export const SOOT_SHADE = mix(SOOT, INK, 0.25);
export const SOOT_MARK = mix(SOOT, INK, 0.3);
/** Painted stucco on the ground floor, cream window frames, stone sills. */
export const STUCCO = "#efe1c9";
export const STUCCO_SHADE = mix(STUCCO, "#9a8fb8", 0.35);
export const FRAME = "#f6eedf";
/** Slate roofs and their snow. */
export const SLATE = "#5e5f97";
export const SLATE_LIGHT = mix(SLATE, "#ffffff", 0.2);
/** Terracotta chimney pots. */
export const POT = "#e07a52";

/** Candlelight in the windows: deep amber, warm gold, the bright core. */
export const LAMP_DEEP = "#ffad3b";
export const LAMP = "#ffd166";
export const LAMP_CORE = "#fff4c4";
export const DIM_PANE = "#7d6a8f";

/** Doors, shopfronts, signs and trim. */
export const DOOR_GREEN = "#2f7d5b";
export const DOOR_GREEN_LIGHT = mix(DOOR_GREEN, "#ffffff", 0.18);
export const DOOR_RED = "#b8323f";
export const SIGN_GREEN = "#24584a";
export const SIGN_RED = "#8f2638";
export const SIGN_GOLD = "#ffd56a";
export const BRASS = "#f2b33d";
export const BRASS_LIGHT = "#ffe08a";
export const IRON = "#3a3554";
export const IRON_LIGHT = "#5f5880";
export const AWNING_A = "#e8414f";
export const AWNING_B = "#fff1dc";

/** Holly, fir and berries. */
export const HOLLY = "#2fae5c";
export const HOLLY_DARK = "#1f8248";
export const BERRY = "#ff3b4e";

/** Cobblestones peeking through the snow. */
export const COBBLE = "#8f8cb8";
export const COBBLE_LIGHT = "#bdb8dc";

/** Chimney smoke, near and far. */
export const SMOKE = alpha("#e9e2f2", 0.55);
export const SMOKE_FAR = alpha(mix(FAR_BACK, "#ffffff", 0.35), 0.5);

/** Victorian clothes: coats, shawls, scarves, skin. */
export const COAT_NAVY = "#3d4a8c";
export const COAT_PLUM = "#7a3f7e";
export const COAT_GREEN = "#2e7d6b";
export const COAT_BROWN = "#8a5a3c";
export const SHAWL = "#d9475b";
export const SCARF_GOLD = "#ffbf3a";
export const SKIN = "#ffd2b0";
export const SKIN_SHADE = "#f2ae8f";
export const CHEEK = "#ff8f8f";
export const HAT = "#2f2a48";
export const HAT_LIGHT = "#4b4570";
export const BONNET = "#f6d6e2";
export const BOOK = "#8f2638";

/** The horse and carriage. */
export const HORSE = "#a8683f";
export const HORSE_SHADE = mix(HORSE, INK, 0.25);
export const MANE = "#4a2f2a";
export const CARRIAGE = "#2f4f86";
export const CARRIAGE_LIGHT = mix(CARRIAGE, "#ffffff", 0.18);
export const WHEEL = "#e0a93a";

/** Pigeons: blue-grey with an iridescent neck. */
export const PIGEON = "#9aa0c8";
export const PIGEON_LIGHT = "#c3c8e6";
export const PIGEON_NECK = "#62b7a6";
export const BEAK = "#ff9a5a";

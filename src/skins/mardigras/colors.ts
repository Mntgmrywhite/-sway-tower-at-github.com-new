import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Mardi Gras colors: Bourbon Street on parade day, in a bright, clean cartoon. The three colors
// of the season (royal purple, Carnival green and gold) on the banners, the bunting, the beads,
// the masks, the floats and the bars; red brick and candy pastels (rose, lilac, mint, butter,
// peach) for the Quarter's houses, a deep plum-black for their lacy cast-iron galleries with gold
// on the finials, fern green on the hanging baskets, and one deep plum ink for every outline up
// close. Near things use these as they are (flat fills, a lit top, a shaded underside, inked);
// far things are mixed toward the sky of the hour (tone.ts) and never outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#23183a";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

export function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1030", shade) };
}

// ---------------------------------------------------------------- readable behind the bars

/** sRGB channel (0..255) to linear light. */
function linear(v: number): number {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** Linear light (0..1) back to an sRGB channel. */
function srgb(x: number): number {
  const v = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16))) as [number, number, number];
}

/** Relative luminance (WCAG) of a #rrggbb color. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The band of tones the bars cannot stand on: the purple bars (the darkest of the twelve, the
 * mask and the trumpet, luminance 0.117) read by their fill on anything darker than its bottom,
 * and every bar reads by its plum ink outline on anything lighter than its top; in between, both
 * sink (a WCAG ratio under 2.45 to the purple's fill and to the ink alike: violet dusk and night
 * skies and clouds lie there). What stands behind the tower keeps out of it: the sky (tone.ts,
 * sky.ts), the cloud floor, the far city standing out of it.
 */
export const CLEAR = { below: 0.018, above: 0.105 } as const;

/**
 * A color held out of the band (CLEAR), keeping its hue: one inside it is darkened to the band's
 * bottom (in linear light, as night would). For the flat far shapes that stand behind the tower's
 * lowest bars (tone.ts): they go to silhouette as the light fails instead of sinking through it.
 */
export function clearOfBars(hex: string): string {
  const c = channels(hex);
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  if (L <= CLEAR.below || L >= CLEAR.above) return hex;
  // A hair under the bottom, so rounding to 8-bit channels cannot lift it back into the band.
  return "#" + c.map((v) => srgb(v * ((CLEAR.below * 0.96) / L)).toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- the three colors

export const PURPLE = shades("#7a3fc4", 0.4, 0.28);
export const GREEN = shades("#2fb45a", 0.42, 0.26);
export const GOLD = shades("#ffc82e", 0.45, 0.2);
/** A second, lighter tone of each, so the bars and the beads never run two of a kind. */
export const VIOLET = shades("#a064de", 0.4, 0.28);
export const LIME = shades("#62d36a", 0.42, 0.26);
export const AMBER = shades("#ffd95e", 0.45, 0.2);
/** The season's three, in order, for things that come in all of them by turns. */
export const THREE = [PURPLE, GREEN, GOLD] as const;

// ---------------------------------------------------------------- the street

/** The houses: red brick, and candy pastels. */
export const BRICK = shades("#d9574a", 0.34, 0.26);
export const CREAM = shades("#fff1cf", 0.3, 0.18);
export const ROSE = shades("#ff9fbf", 0.38, 0.22);
export const LILAC = shades("#c4a0f2", 0.36, 0.24);
export const MINT = shades("#9fe3c3", 0.36, 0.22);
export const BUTTER = shades("#ffd66e", 0.36, 0.2);
export const PEACH = shades("#ffb38a", 0.36, 0.22);
/** Shutters and doors: Creole green, teal and plum. */
export const SHUTTER = shades("#2e8f6e", 0.38, 0.26);
export const TEAL = shades("#2a8d9a", 0.38, 0.26);
export const DOOR = shades("#9b3f8c", 0.38, 0.26);
/** The galleries' cast iron: plum-black, with a lit edge. */
export const IRON: Shades = { light: "#6a5a92", body: "#2c2346", shade: "#1a1430" };
/** Window panes by day, and lit from within by night. */
export const PANE = "#8fb8ec";
export const PANE_DARK = "#3a2f5a";
export const LAMPLIT = "#ffd36a";
/** Slate and tin roofs. */
export const ROOF = shades("#6a6f9a", 0.36, 0.24);
export const TIN = shades("#a7b3cc", 0.4, 0.24);
/** The hanging ferns. */
export const FERN = shades("#3fae4e", 0.42, 0.3);
/** Gas-lamp glass by day. */
export const GLASS = "#fff2b8";
/** The café's awning's cream stripes, and the beignets' sugar. */
export const AWNING_B = "#fff5d6";
export const CAKE = shades("#e8b86a", 0.36, 0.24);
export const ICING = "#fff3e0";
/** The street: asphalt, the far sidewalk, and the curb in front. */
export const STREET_FAR = "#9d8fb8";
export const STREET = "#7a6f98";
export const SIDEWALK = shades("#d4cbe2", 0.3, 0.18);
export const CURB = shades("#ddd4ea", 0.3, 0.22);
/** The parade barricades in front: Carnival purple, with gold rails. */
export const BARRICADE = shades("#8a4fd0", 0.4, 0.28);

// ---------------------------------------------------------------- people

/** Skin tones, hair and clothes for the folks on the street and in the parade. */
export const SKINS: readonly Shades[] = [shades("#ffd3b0", 0.4, 0.16), shades("#d9a071", 0.4, 0.18), shades("#8d5a3b", 0.38, 0.2), shades("#f0b894", 0.4, 0.16)];
export const CHEEK = "#ff9c8c";
export const HAIRS: readonly string[] = ["#3a2a2a", "#8a4a22", "#e0b24a", "#1f1a2e", "#c25a2a"];
/** The band's uniforms: a white shirt with a purple sash, black trousers, a gold cap. */
export const SHIRT: Shades = { light: "#ffffff", body: "#fbf8f0", shade: "#d4cfd8" };
export const TROUSERS = shades("#2b2540", 0.3, 0.2);
export const BRASS = shades("#ffcf4a", 0.45, 0.22);
/** The grand marshal's suit and sash; the flambeaux carriers' coats. */
export const SUIT = shades("#f4efe2", 0.3, 0.22);
export const SASH = PURPLE;
export const COAT = shades("#3b3a52", 0.34, 0.24);
/** Torch flame. */
export const FLAME = "#ffb02e";
export const FLAME_CORE = "#fff1a8";
/** Masks: feathers, the sun's rays, the moon's silver, a cat's pink ears and nose. */
export const FEATHER = shades("#ff5fa8", 0.4, 0.26);
export const SUN_RAY = shades("#ff9a2e", 0.4, 0.22);
export const SILVER = shades("#dfe3ff", 0.5, 0.24);
export const PINK = "#ffb3cf";
/** Feathers on the scenery's masks: magenta, teal and violet plumes. */
export const PLUMES: readonly Shades[] = [shades("#ff5fa8", 0.4, 0.26), shades("#2fc4b8", 0.4, 0.26), shades("#a064de", 0.4, 0.28)];
/** The skeleton krewe: bone white (the skulls, ribs and gloves) and the tailcoats' deep indigo (light enough that the ink outlines still read on them). */
export const BONE = shades("#fbf4e2", 0.6, 0.16);
export const TAILS = shades("#40346c", 0.26, 0.3);
/** Drums. */
export const DRUM_SHELL = shades("#d64a6a", 0.38, 0.24);
export const DRUM_HEAD = "#fff7e6";
/** The floats' gold wheels. */
export const WHEEL = shades("#ffb13a", 0.4, 0.26);
/** The kids' shirts along the curb. */
export const SHIRTS: readonly Shades[] = [shades("#4fa7f5", 0.4, 0.26), shades("#ff7a59", 0.4, 0.26), shades("#f6d34d", 0.4, 0.22), shades("#a56ee8", 0.4, 0.26), shades("#5fd47a", 0.4, 0.26)];
/** Ladder wood. */
export const LADDER = shades("#c98a4a", 0.4, 0.26);
/** Papier-mâché skin on the float pieces: a warm painted cream, and a rosy cheek. */
export const PAPIER = shades("#ffe2c4", 0.4, 0.2);
export const ROUGE = "#ff8fa8";

// ---------------------------------------------------------------- the reviewing stand

export const STAND = shades("#f6e6c8", 0.3, 0.22);
export const STAND_DARK = shades("#5a2d8a", 0.36, 0.26);

// ---------------------------------------------------------------- small paints

/** Pure white: glints in eyes and on sequins, a hanky, a grin's teeth, letters, a coffee cup, steam. */
export const WHITE = "#ffffff";
/** Pearls, pearl buttons, a jewel's setting. */
export const PEARL = "#fff6e6";
/** A lit sweep of shine on a round thing (the sun's coin). */
export const SHINE = "rgba(255, 255, 255, 0.5)";
/** The faces: a mouth, its teeth, a skull's blush; the painted lids over the eyes, by name. */
export const MOUTH = "#7a2236";
export const TEETH = "#fffaf0";
export const BLUSH = "#ffb0c4";
export const LIDS = { blue: "#5aa8e8", violet: "#a77ae6", teal: "#2fb7b0", gold: "#f2b630", green: "#49c26a", rose: "#ef7fae" } as const;
/** Shoes: the street's folk, the band's, and two colored pairs for the dancers. */
export const SHOES = "#3a2a4a";
export const BAND_SHOES = "#2a2038";
export const PLUM_SHOES = "#5a2a6a";
export const BERRY_SHOES = "#7a2a5a";
/** The bead seller's straw boater. */
export const STRAW: Shades = { light: "#fff3c4", body: "#f2d27a", shade: "#c9a54a" };
/** Drumsticks and the bass drum beater's handle, its felt head; a flambeau's wooden pole. */
export const STICK = "#f4e2c0";
export const BEATER = "#fff7e6";
export const POLE = "#8a5a32";
/** The giant jester's grin on its stand at the curb. */
export const JESTER_MOUTH = "#b8324e";
/** The Carnival Queen (queen.ts): her curls and their lit side, her lips and their shine. */
export const QUEEN_HAIR = "#2e1f3e";
export const QUEEN_HAIR_LIT = "#55406e";
export const LIP = "#c8365e";
export const LIP_LIT = "#ee6c8c";
/** The King Gator (gator.ts): his painted hide, its scutes' dark, his belly scales, the gold of his eye. */
export const GATOR = shades("#3aa856", 0.42, 0.3);
export const GATOR_SCUTE = "#1f6a39";
export const GATOR_BELLY = shades("#f4e6b0", 0.4, 0.18);
export const GATOR_EYE = "#ffd23f";
/** The crown's marquee bulbs: lit by turns, and at rest by night (LAMPLIT) and by day. */
export const BULB_ON = "#fffbe6";
export const BULB_DAY = "#fff0c4";

/** The street: the roadway's faded lane line, the decks' and the café eave's shadows on a wall. */
export const LANE_LINE = "#8a7fa8";
export const DECK_SHADOW = "rgba(35, 24, 58, 0.22)";
export const EAVE_SHADOW = "rgba(35, 24, 58, 0.2)";
/** Windows lit by night, and the shine on their panes; the café's warmer glow. */
export const WINDOW_LIT = "#ffcf6a";
export const WINDOW_SHINE = "#fff0b8";
export const CAFE_LIT = "#ffd98a";
/** The street sign on the lamppost, and the street-name inlay in the flagstones: its border, its tiles and their joints. */
export const SIGN_BLUE = "#2b4fa0";
export const INLAY_BORDER = "#f4f1ff";
export const INLAY_TILE = "#2f5bb0";
export const INLAY_JOINT = "rgba(255, 255, 255, 0.25)";
/** Terracotta fern baskets. */
export const TERRACOTTA = "#c8643c";
/** Lamps and lanterns: a gas flame's light, a paper lantern lit and its paper's sheen by day, a crown's lamps. */
export const FLAME_LIGHT = "#fffbe0";
export const PAPER_LIT = "#fff1c0";
export const PAPER_SHEEN = "rgba(255, 255, 255, 0.35)";
export const CROWN_GLOW = "#fff4c0";
/** By night the flambeaux's flicker on the cloud floor's caps. */
export const TORCH_FLECK = "#fff0c8";

/** The riverfront: the paddlewheeler's stacks, the streetcar's headlamp. */
export const STACK = "#2a2440";
export const HEADLAMP = "#fff6c8";

/** The sky: the moon (shade, face, seas), the stars by twinkle group (warm white, pale gold, lilac), a firework's pink and its shell's trail. */
export const MOON = "#fff3c8";
export const MOON_SHADE = "#efd99c";
export const MOON_SEA = "#ead39a";
export const STAR_COLORS = ["#fff6d8", "#ffe8a0", "#e6d8ff"] as const;
export const FIREWORK_PINK = "#ff6fa8";
export const SHELL_TRAIL = "#fff0b0";

/** The lane's throws: a glint, a balloon's string, a paper jester's hat band, a paper lantern's caps, its warm paper and its flame. */
export const GLINT = "#fff6c4";
export const STRING = "#4a3a6a";
export const HAT_BAND = "#fff0a0";
export const LANTERN_CAP = "#3a2a5a";
export const LANTERN_WARM = "#ffe7a8";
export const LANTERN_FLAME = "#fff6cc";
/** The river's brown pelicans gliding by: body, wings, white head, orange bill; and the doves' grey far wing. */
export const PELICAN = { body: "#8a6a4e", wing: "#6e5340", head: "#fbf6ec", bill: "#f2a35a" } as const;
export const DOVE_SHADE = "#d8dcf0";

/** Sky Islands' island as a float (island.ts): its spring and the spring's bright core, its mist (shade, body, light), the topiary's trunk, brush dabs, and the bars' lit tops and shaded feet. */
export const SPRING = "#5fd4e4";
export const SPRING_CORE = "#c8f6ff";
export const MIST = ["#c9b2ec", "#efe4ff", "#ffffff"] as const;
export const TRUNK = "#6a3a7a";
export const DAB = "rgba(255, 255, 255, 0.32)";
export const BAR_LIT = "rgba(255, 255, 255, 0.45)";
export const BAR_SHADE = "rgba(0, 0, 0, 0.28)";

/**
 * The base palette. Mardi Gras paints its own backdrop over the base sky, field and band (see
 * mardigras.ts), so these are the afternoon values the base would show, and the colors of the
 * band in front: plum flagstones under a gold lip, which the harlequin frieze (band.ts) covers.
 */
export const PALETTE: Palette = {
  skyTop: "#6a74e0",
  skyMid: "#a89cf0",
  skyBottom: "#ffe6ae",
  star: "#fff6d8",
  moon: "#fff2cc",
  cloudShadow: "#cdb4ec",
  cloudBase: "#fff2e2",
  cloudLight: "#ffffff",
  far: "#b8a0d8",
  fieldFar: STREET_FAR,
  fieldNear: STREET,
  grass: GOLD.body,
  grassDark: GOLD.shade,
  stone: "#6b58a6",
  stoneLight: "#8b78c4",
  ink: INK,
};

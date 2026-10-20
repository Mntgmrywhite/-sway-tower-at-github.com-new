import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Mardi Gras colors: New Orleans Carnival in bright cartoon. The three colors of the season,
// royal purple, Carnival green and gold, on the bunting, the beads, the float and the bars;
// cream and brick and rose plaster for the Quarter's townhouses, wrought-iron black for their
// lacy galleries and the lampposts, and one deep plum ink for every outline up close. Near
// things use these as they are (flat, two-tone, inked); far things are mixed toward the sky of
// the moment (see tone.ts) and never outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#23183a";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1030", shade) };
}

// ---------------------------------------------------------------- the three colors

export const PURPLE = shades("#7a3fc4", 0.4, 0.28);
export const GREEN = shades("#2fb45a", 0.42, 0.26);
export const GOLD = shades("#ffc82e", 0.45, 0.2);
/** A second, lighter tone of each, so the bars and the beads never run two of a kind. */
export const VIOLET = shades("#a064de", 0.4, 0.28);
export const LIME = shades("#62d36a", 0.42, 0.26);
export const AMBER = shades("#ffd95e", 0.45, 0.2);

// ---------------------------------------------------------------- the street

/** The townhouses: cream, rose plaster, pale mint, brick and butter yellow. */
export const CREAM = shades("#fff1cf", 0.3, 0.2);
export const ROSE = shades("#f2a6a8", 0.38, 0.22);
export const MINT = shades("#b8e4cf", 0.36, 0.22);
export const BRICK = shades("#d9765c", 0.36, 0.24);
export const BUTTER = shades("#ffd978", 0.36, 0.22);
/** Shutters, doors and the galleries' iron. */
export const SHUTTER = shades("#2e8f6e", 0.38, 0.26);
export const DOOR = shades("#9b3f8c", 0.38, 0.26);
export const IRON: Shades = { light: "#5c5470", body: "#2f2a3e", shade: "#1e1a2a" };
/** Window panes: a cool glass. */
export const PANE = "#8bb8e8";
/** Slate and tin roofs. */
export const ROOF = shades("#5d6a8a", 0.36, 0.24);
export const TIN = shades("#9fb3c8", 0.4, 0.24);
/** The hanging ferns. */
export const FERN = shades("#3fae4e", 0.38, 0.26);
/** Paper lanterns on the galleries (purple, green, gold). */
export const LANTERNS = [PURPLE, GREEN, GOLD] as const;
/** The café's stripes and the king cake. */
export const AWNING_A = "#2f9a62";
export const AWNING_B = "#fff5d6";
export const CAKE = shades("#e8b86a", 0.36, 0.24);
export const ICING = "#fff3e0";
/** The street: asphalt, the far sidewalk, and the curb in front. */
export const STREET_FAR = "#8e86a8";
export const STREET = "#6f6788";
export const SIDEWALK = shades("#c9c2d8", 0.3, 0.2);
export const CURB = shades("#d8d1e4", 0.3, 0.22);
/** The parade barricades in front. */
export const BARRICADE = shades("#b9c0cc", 0.4, 0.26);

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
/** The skeleton krewe: bone white (the skulls, ribs and gloves) and the tailcoats' deep indigo (light enough that the ink outlines still read on them). */
export const BONE = shades("#fbf4e2", 0.6, 0.16);
export const TAILS = shades("#40346c", 0.26, 0.3);
/** Drums. */
export const DRUM_SHELL = shades("#d64a6a", 0.38, 0.24);
export const DRUM_HEAD = "#fff7e6";
/** The float: a purple body with gold trim and a green skirt, its wheels. */
export const FLOAT_BODY = PURPLE;
export const FLOAT_TRIM = GOLD;
export const FLOAT_SKIRT = GREEN;
export const WHEEL = shades("#ffb13a", 0.4, 0.26);
/** The kids' shirts along the curb. */
export const SHIRTS: readonly Shades[] = [shades("#4fa7f5", 0.4, 0.26), shades("#ff7a59", 0.4, 0.26), shades("#f6d34d", 0.4, 0.22), shades("#a56ee8", 0.4, 0.26), shades("#5fd47a", 0.4, 0.26)];
/** Ladder wood. */
export const LADDER = shades("#c98a4a", 0.4, 0.26);

// ---------------------------------------------------------------- the reviewing stand

export const STAND = shades("#f6e6c8", 0.3, 0.22);
export const STAND_DARK = shades("#5a2d8a", 0.36, 0.26);
export const CREST = GOLD;

/**
 * The base palette. Mardi Gras paints its own backdrop over the base sky, field and band (see
 * mardigras.ts), so these are the afternoon values the base would show, and the colors of the
 * flagstone curb band in front.
 */
export const PALETTE: Palette = {
  skyTop: "#3f7fd9",
  skyMid: "#6aa9ea",
  skyBottom: "#ffe9b0",
  star: "#fff6d8",
  moon: "#fff2cc",
  cloudShadow: "#d9c3e8",
  cloudBase: "#fff4e0",
  cloudLight: "#ffffff",
  far: "#b8a0c8",
  fieldFar: STREET_FAR,
  fieldNear: STREET,
  // The base band in front: the curb's lip over the flagstones (front.ts paints the curb over the lip).
  grass: CURB.body,
  grassDark: CURB.shade,
  stone: "#a79fbd",
  stoneLight: "#c5bdd8",
  ink: INK,
};

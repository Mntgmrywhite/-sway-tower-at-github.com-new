import { alpha, mix } from "../../../base/draw";
import type { Bar } from "../../skin";
import { INK } from "../common";
import * as icon from "../icons";

// The tower's floors: every bar is a storey of a crooked Burton house, painted in candy colors so
// it reads at a glance against the night (the colors are the bars' own, which the blast debris and
// the Settings swatch use). Each kind has its siding, its window shape, its trim and one lit room
// where something lives. Every color is worked out here once, so drawing a floor allocates nothing.

/** The bars, in order up the tower: the candy colors (and the icons the Settings sheet never draws). */
export const FLOOR_BARS: readonly Bar[] = Object.freeze([
  { color: "#ff9a2e", icon: icon.pumpkin },
  { color: "#a173e0", icon: icon.witchHat },
  { color: "#ffd23f", icon: icon.candyCorn },
  { color: "#5fd7f0", icon: icon.crow },
  { color: "#ff6fae", icon: icon.bat },
  { color: "#a6e05a", icon: icon.tombstone },
  { color: "#f2d7a0", icon: icon.mummy },
  { color: "#5b8cff", icon: icon.moon },
  { color: "#f4f0e4", icon: icon.skull },
  { color: "#ff5a5f", icon: icon.fangs },
  { color: "#e05ad8", icon: icon.spider },
  { color: "#3fd6b0", icon: icon.hauntedHouse },
]);

export { INK };

// ---------------------------------------------------------------- siding, windows, rooms

export const CLAPBOARD = 0;
export const SHINGLES = 1;
export const BRICK = 2;
export const STONE = 3;
export const TIMBER = 4;
export const STRIPES = 5;
export const BOARDS = 6;

export const SQUARE = 0;
export const POINTED = 1;
export const PORTHOLE = 2;
export const TALL = 3;
export const OVAL = 4;
export const ARCHED = 5;
export const DIAMOND = 6;

export const JACK = 0;
export const WITCH = 1;
export const BOOK = 2;
export const LAB = 3;
export const SKELETON = 4;
export const CHAIR = 5;
export const PORTRAIT = 6;
export const CLOCK = 7;
export const CURTAIN = 8;
export const GHOST = 9;
export const CANDLES = 10;
export const CAT = 11;
export const DOOR = 12;

/** Window light (deep and its bright core), an unlit pane, the window frames. */
export const PANE_LIT = "#ffc65a";
export const PANE_CORE = "#ffe9a8";
export const PANE_DARK = "#2a1f3d";
/** A lit pane dimmed for a flicker. */
export const PANE_DIM = mix(PANE_LIT, PANE_DARK, 0.45);
export const FRAME = "#1a1226";
/** Shadow-play figures against a lit room. */
export const SIL = "#2a1436";
/** A dark room's back wall, the warm dark round a light in it, and dark wallpaper. */
export const ROOM_DARK = "#2d1a40";
export const ROOM_GLOW = "#4a2a4c";
export const ROOM_WALL = "#3a2752";
export const BONE = "#efe8d6";
export const BONE_SHADE = "#c3bba6";
export const GOLD = "#ffd25e";
export const GILT = "#d9a441";
export const GILT_DARK = "#8a5a1e";
export const GREEN = "#8cff7a";
export const GREEN_DEEP = "#2f9a46";
export const CREAM = "#fff3d6";
export const PUMPKIN = "#ff8a1e";
export const PUMPKIN_DARK = "#c95a12";
export const STEM = "#5d7a2c";
export const FACE_GLOW = "#ffe27a";
export const FLAME = "#ffa52e";
export const FLAME_HOT = "#fff0a0";
export const WAX = "#f4ead0";
export const SPARK = "#e9f4ff";
export const SPARK_HALO = "#b48cff";
export const COPPER = "#c8743a";
export const STEEL = "#9aa3c8";
export const BEAM = "#3a2a20";
export const STRIPE = "#1b1724";
export const GHOST_BODY = "#eef4ff";
export const GHOST_FACE = "#2a2440";
export const DOOR_PURPLE = "#5b3f7a";
export const DOOR_DARK = "#3a2752";
export const PALE = "#efe6ee";
/** Fabric drawn across a lit window, its folds, and a figure's shadow on it. */
export const FABRIC_FOLD = "#e09a3a";
export const FABRIC_SHADOW = mix(PANE_LIT, "#3a1f2a", 0.85);
/** Dust shaken from a seam when a floor lands. */
export const DUST = alpha("#e8dcc8", 0.7);

/** The roof on the top floor: slate, its ridge, the eave trim, the chimney, the smoke. */
export const SLATE = "#2b2342";
export const SLATE_RIDGE = "#4a3d6a";
/** Moonlight along the roof's edges. */
export const MOON_RIM = "#8077b4";
export const EAVE = "#efe8d6";
export const CHIMNEY = "#6a3a3a";
export const CHIMNEY_CAP = "#3a2230";
export const SMOKE = "#b8b0d8";

export interface Kind {
  /** The candy body and the bands that frame every storey. */
  body: string;
  cornice: string;
  skirt: string;
  /** Siding lines, shutters, curtains, the stitched patch. */
  line: string;
  shutter: string;
  curtain: string;
  curtainShade: string;
  patch: string;
  material: number;
  shape: number;
  room: number;
  /** The room is a dark room (its subject glows), not a lit one (its subject is a shadow). */
  dark: boolean;
  shutters: boolean;
  lantern: boolean;
  patched: boolean;
}

function kind(color: string, material: number, shape: number, room: number, dark: boolean, extra = ""): Kind {
  return {
    body: color,
    cornice: mix(color, "#ffffff", 0.38),
    skirt: mix(color, INK, 0.38),
    line: mix(color, INK, 0.22),
    shutter: mix(color, INK, 0.5),
    curtain: mix(color, INK, 0.35),
    curtainShade: mix(color, INK, 0.55),
    patch: mix(color, "#ffffff", 0.22),
    material,
    shape,
    room,
    dark,
    shutters: extra.includes("s"),
    lantern: extra.includes("l"),
    patched: extra.includes("p"),
  };
}

const c = (i: number) => FLOOR_BARS[i]!.color;

/** The twelve storeys, by level % 12. */
export const KINDS: readonly Kind[] = [
  kind(c(0), CLAPBOARD, SQUARE, JACK, true, "sl"),
  kind(c(1), SHINGLES, POINTED, WITCH, false),
  kind(c(2), CLAPBOARD, PORTHOLE, BOOK, true, "p"),
  kind(c(3), BRICK, TALL, LAB, true),
  kind(c(4), BOARDS, SQUARE, SKELETON, true, "slp"),
  kind(c(5), STONE, ARCHED, CHAIR, false),
  kind(c(6), TIMBER, DIAMOND, PORTRAIT, true),
  kind(c(7), CLAPBOARD, OVAL, CLOCK, false, "l"),
  kind(c(8), STRIPES, TALL, CURTAIN, false),
  kind(c(9), BRICK, ARCHED, GHOST, true, "s"),
  kind(c(10), SHINGLES, PORTHOLE, CANDLES, true, "l"),
  kind(c(11), STONE, POINTED, CAT, false),
];

/** The ground floor (level 0): the front door instead of a room, on a stone plinth. */
export const BASE_KIND: Kind = kind(c(0), STONE, SQUARE, DOOR, false, "l");

export function kindOf(level: number): Kind {
  return level === 0 ? BASE_KIND : KINDS[((level % 12) + 12) % 12]!;
}

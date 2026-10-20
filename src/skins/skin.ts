import type { Ctx } from "../base/draw";

/**
 * Everything a skin needs to place scenery, in CSS pixels. The base computes it each frame.
 *
 * Parallax: a layer at depth `p` has its ground line at  groundY - rise * (1 - p).
 * p = 0 never moves, p = 1 moves with the tower, p > 1 (foreground) drops away faster.
 * Use `layerGround(scene, p)` from the base world module.
 */
export interface Scene {
  cssW: number;
  cssH: number;
  /** Size unit: width of the portrait play area. Size everything from this. */
  u: number;
  /** Pixels per world unit. */
  scale: number;
  /** Seconds of animation time (pauses with the game). */
  t: number;
  /** Pixels the camera has climbed since the start (0 at the ground). */
  rise: number;
  /** Camera height in world units; drives scenery that changes as you climb. */
  altitude: number;
  /** Screen y of the floor line the tower stands on. */
  groundY: number;
  /** Screen y of the horizon: where distant silhouettes stand and the field begins. */
  horizonY: number;
  /** Screen x and width of the base block. */
  baseX: number;
  baseW: number;
  /**
   * Seconds into the current music loop as written (audio.position()), for visuals that keep time
   * with the music; NaN when no music is playing. Optional only so hand-built test scenes needn't
   * set it: read it as `s.songTime ?? NaN`.
   */
  songTime?: number;
}

/** A symbol drawn on a bar, centered at (cx, cy), about `s` pixels tall, with the current stroke/fill style. */
export type Icon = (ctx: Ctx, cx: number, cy: number, s: number) => void;

export interface Palette {
  /** Sky gradient, top to horizon. Bright and readable — never near-black. */
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  star: string;
  /** The base moon, used when the skin draws no celestial body of its own. */
  moon: string;
  /** Puffy cel-shaded clouds: shadow, body, light caps. */
  cloudShadow: string;
  cloudBase: string;
  cloudLight: string;
  /** Faded silhouettes in the distance: one flat color, no outline, a little darker than the sky. */
  far: string;
  /** The field from the horizon (hazy) to the viewer. */
  fieldFar: string;
  fieldNear: string;
  /** Foreground grass lip and its jagged tips. */
  grass: string;
  grassDark: string;
  /** Foreground stone tiles and their lit top edge. */
  stone: string;
  stoneLight: string;
  /** Outline color for everything up close. */
  ink: string;
}

/** Palette for the pure neon style. Keep skies dark: neon needs a dark ground. */
export interface NeonPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  /** Glow band along the horizon. */
  horizon: string;
  /** Neon grid lines on the floor. */
  grid: string;
  /** Floor fill under the grid, near the horizon and near the viewer. */
  floorFar: string;
  floorNear: string;
  /** Retro sun gradient (used when the skin doesn't draw its own celestial body). */
  sunTop: string;
  sunBottom: string;
  star: string;
}

/** An inclusive [month, day] window (1-based months); it may wrap the new year. */
export type DateWindow = { from: [number, number]; to: [number, number] };

export interface Bar {
  /** Bar fill color, #rrggbb. Bright and saturated. */
  color: string;
  icon: Icon;
}

interface SkinBase {
  id: string;
  name: string;
  /** Inclusive [month, day] windows (1-based months) in which "Auto" picks this skin. */
  dates?: DateWindow[];
  /** A season that moves (Mardi Gras with Easter): the windows for a given year, used instead of `dates`. */
  datesFor?: (year: number) => DateWindow[];
  /** Google Fonts families this skin needs (CSS2 `family=` values, e.g. "Creepster"). */
  fonts?: string[];
  /** Bars cycle up the tower in this order. Neighbors should contrast. 8–12 entries. */
  bars: Bar[];
  hud: {
    /** Font family stack for the title and the PERFECT pop. */
    display: string;
    title: string;
    /** UI accent: title shadow, game-over card, panel borders. */
    ui: string;
    /** Perfect counter, PERFECT pop, perfect-drop flash. */
    accent: string;
    life: string;
  };
  /** Replaces the base moon. */
  celestial?(ctx: Ctx, s: Scene): void;
  /** Things in the sky (flyers, sparkles), drawn after the celestial body. */
  sky?(ctx: Ctx, s: Scene): void;
  /** Faded silhouettes standing on horizonY (bottoms touch it). Replaces the base skyline. Drawn behind the cloud bank. */
  far?(ctx: Ctx, s: Scene): void;
  /** Props on the floor around the tower, drawn behind the tower. */
  ground?(ctx: Ctx, s: Scene): void;
  /**
   * The ground hook paints the whole screen behind the tower (a skin with its own backdrop): the
   * base sky, cloud bank, heights and field would be covered anyway, so they aren't painted.
   */
  paintsBackdrop?: boolean;
  /** Props in front of the tower, drawn after the base grass-and-tiles foreground (keep them low). */
  foreground?(ctx: Ctx, s: Scene): void;
}

/** The default look: bright 2D cartoon (src/base/world.ts, src/base/blocks.ts). */
export interface CartoonSkin extends SkinBase {
  style?: "cartoon";
  palette: Palette;
}

/** The pure neon look (src/base/neon-world.ts, src/base/neon-blocks.ts). */
export interface NeonSkin extends SkinBase {
  style: "neon";
  palette: NeonPalette;
}

export type Skin = CartoonSkin | NeonSkin;

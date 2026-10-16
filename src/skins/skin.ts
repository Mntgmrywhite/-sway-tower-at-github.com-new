import type { Ctx } from "../neon/draw";

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
  /** Screen y of the horizon (far end of the neon grid floor). */
  horizonY: number;
  /** Screen x and width of the base block. */
  baseX: number;
  baseW: number;
}

/** A symbol drawn on a bar, centered at (cx, cy), about `s` pixels tall, with the current stroke/fill style. */
export type Icon = (ctx: Ctx, cx: number, cy: number, s: number) => void;

export interface Palette {
  /** Sky gradient, top to just above the horizon. Keep these dark: neon needs a dark ground. */
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

export interface Bar {
  /** Neon tube color for this bar, #rrggbb. */
  color: string;
  icon: Icon;
}

export interface Skin {
  id: string;
  name: string;
  /** Inclusive [month, day] windows (1-based months) in which "Auto" picks this skin. */
  dates?: { from: [number, number]; to: [number, number] }[];
  /** Google Fonts families this skin needs (CSS2 `family=` values, e.g. "Creepster"). */
  fonts?: string[];
  palette: Palette;
  /** Bars cycle up the tower in this order. Neighbors should contrast. 8–12 entries. */
  bars: Bar[];
  hud: {
    /** Font family stack for the title and the PERFECT pop. */
    display: string;
    title: string;
    titleGlow: string;
    /** Perfect counter, PERFECT pop, perfect-drop flash. */
    accent: string;
    life: string;
  };
  /** Replaces the base retro sun. */
  celestial?(ctx: Ctx, s: Scene): void;
  /** Things in the sky (flyers, sparkles), drawn after the celestial body. */
  sky?(ctx: Ctx, s: Scene): void;
  /** Silhouettes standing on the horizon. Replaces the base mountains. */
  far?(ctx: Ctx, s: Scene): void;
  /** Props on the floor around the tower, drawn behind the tower. */
  ground?(ctx: Ctx, s: Scene): void;
  /** Props in front of the tower, drawn after it (keep them low so they never hide the play). */
  foreground?(ctx: Ctx, s: Scene): void;
}

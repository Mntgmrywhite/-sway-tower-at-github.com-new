import type { Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { NeonPalette, Scene } from "../skin";

// Colors, the party's beat clock and placement helpers shared by the Blacklight layers.

/** Deep UV violet-black: the room is dark so the glowing bars stay the brightest thing. */
export const PALETTE: NeonPalette = {
  skyTop: "#030008",
  skyMid: "#0e0324",
  skyBottom: "#250a4e",
  horizon: "#8a3cff",
  grid: "#5b2fc0",
  floorFar: "#170638",
  floorNear: "#040010",
  sunTop: "#b8ff3a",
  sunBottom: "#ff3fd1",
  // The "stars" read as mirror-ball specks on the dark hall.
  star: "#cdb8ff",
};

// Blacklight pigments: what glows under UV.
export const GREEN = "#8cff2e";
export const YELLOW = "#fff23a";
export const PINK = "#ff3fd1";
export const WHITE = "#f4eeff";
export const ORANGE = "#ff9a2a";
export const CYAN = "#3ff0ff";
export const UV = "#9b4dff";

/** Glow colors cycled through by splats, sticks and face paint. */
export const GLOWS = [GREEN, PINK, YELLOW, CYAN, ORANGE, WHITE] as const;

/** Dark silhouettes (people, booth, speakers) and their dim UV rim. */
export const SIL = "#0b0320";
export const SIL_LIGHT = "#170838";
export const RIM = "#6a3ad0";
/** Far silhouettes: a touch lighter than the floor so they read against it. */
export const FAR = "#0f0428";
export const FAR_RIM = "#4a2696";

/** Tempo of the party. Every pulse in the scene is derived from scene.t through this. */
export const BPM = 124;

/** Beats elapsed at time t. */
export function beats(t: number): number {
  return (t * BPM) / 60;
}

/** 1 on the beat, decaying to 0 before the next one. */
export function pulse(t: number, sharp = 3): number {
  const f = beats(t) % 1;
  return Math.pow(1 - f, sharp);
}

/** Scratch point for `spot()`, reused so placing props allocates nothing per frame. */
const P = { x: 0, y: 0, k: 1 };

/**
 * A spot on the floor. `X` is the sideways offset from the tower's center measured at the
 * tower's depth, in units of u; `z` is depth (TOWER_DEPTH is the tower's own line, bigger is
 * farther back). `k` is the perspective scale for anything standing there.
 */
export function spot(s: Scene, X: number, z: number): typeof P {
  const k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = fieldY(s, z);
  P.k = k;
  return P;
}

/** Vertical squash of a flat shape lying on the floor at depth z (1 = seen from straight above). */
export function floorSquash(s: Scene, z: number): number {
  const H = (s.groundY - s.horizonY) * TOWER_DEPTH;
  return Math.min(0.75, Math.max(0.08, H / (0.72 * s.u * z)));
}

/**
 * A cheap glowing line for small accents (sticks, bracelets, face paint): a faint wide glow,
 * then the colored core. Two strokes and no state save, unlike the base neon tube.
 */
export function glowLine(ctx: Ctx, color: string, width: number, glow = 2.6): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = width * glow;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.stroke();
}

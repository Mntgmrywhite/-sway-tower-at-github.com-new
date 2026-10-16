import { horizonFor } from "../../base/world";
import type { Scene } from "../skin";

/** Where render.ts holds the ground at the start, as a fraction of the screen (its GROUND_START). */
export const START_GROUND = 0.7;

/** The start view's horizon: fixed scenery (the moon, constellations) is placed against it. */
export function startHorizon(s: Scene): number {
  return horizonFor(s.cssH * START_GROUND, 0, s.u);
}

/** Lowest point of the HUD's tilt gauge (it sits under the lives, about 0.14 cssH + 0.165u). */
export function gaugeBottom(s: Scene): number {
  return s.cssH * 0.14 + s.u * 0.205;
}

// Where the gallery pieces sit, shared by the far layer (the pieces) and the ground layer
// (their reflections). Everything hugs the tower column from the outside and is sized from u,
// so phones keep a margin to the screen edge and wide screens keep the empty space.

export interface Gallery {
  u: number;
  /** Floor line of the far pieces (the horizon). */
  hy: number;
  /** The tower column (base ± 0.05u) that stays free of props. */
  colL: number;
  colR: number;
  /** The freestanding arch: center x, outer width and height (plinth included). */
  ax: number;
  aw: number;
  ah: number;
  plinthW: number;
  plinthH: number;
  /** The gallery panel with the botanical drawing: left x, width, height. */
  px: number;
  pw: number;
  ph: number;
}

const G: Gallery = { u: 0, hy: 0, colL: 0, colR: 0, ax: 0, aw: 0, ah: 0, plinthW: 0, plinthH: 0, px: 0, pw: 0, ph: 0 };

/** Tube widths, in px, for the far pieces. */
export function tubeW(u: number, k = 1): number {
  return Math.max(1.2, u * 0.0052 * k);
}

/** Lay out the far pieces for this frame (writes into one shared object). */
export function gallery(s: Scene): Gallery {
  const u = s.u;
  G.u = u;
  G.hy = s.horizonY;
  const baseL = s.baseW > 0 ? s.baseX : s.cssW / 2 - u * 0.2;
  const baseR = s.baseW > 0 ? s.baseX + s.baseW : s.cssW / 2 + u * 0.2;
  G.colL = baseL - u * 0.05;
  G.colR = baseR + u * 0.05;

  G.aw = u * 0.15;
  G.ah = u * 0.35;
  G.plinthW = G.aw + u * 0.034;
  G.plinthH = u * 0.016;
  G.ax = Math.max(G.colL - u * 0.04 - G.plinthW / 2, u * 0.03 + G.plinthW / 2);

  G.pw = u * 0.16;
  G.ph = u * 0.31;
  G.px = Math.min(G.colR + u * 0.04, s.cssW - u * 0.035 - G.pw);
  return G;
}

/** Highest point of any far piece above the floor line. */
export function galleryTop(g: Gallery): number {
  return Math.max(g.ah, g.ph);
}

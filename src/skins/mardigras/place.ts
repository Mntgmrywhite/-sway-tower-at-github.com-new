import { layerGround } from "../../base/world";
import type { Scene } from "../skin";

// Where the big pieces of the Mardi Gras scene sit on screen, shared by every layer. Positions
// are in u from the base block's center line, heights in u down from the floor line (the top of
// the reviewing stand the bars stand on).

/** Ink width up close. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** Center line of the tower: under the base block. */
export function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

/** Half width of the tower's column (u): nothing moves in it above the floor line, and the lanes stay out of it. */
export const COLUMN = 0.25;

/** The townhouses' feet (the far sidewalk) stand this far above the floor line (u). */
const STREET_UP = 0.14;
/** The folks on the far sidewalk stand this far below its back edge (u): behind the stand, where the slider passes in front of them as it does the house fronts. */
export const SIDEWALK = 0.045;
/** The parade walks this far below the floor line (u): its feet, in front of the stand. */
export const ROUTE = 0.285;

/** Screen y of the far sidewalk's back edge, where the townhouses stand. */
export function streetLevel(s: Scene): number {
  return s.groundY - s.u * STREET_UP;
}

/**
 * The two kids on the far sidewalk under the gallery (u from the screen's center, and their
 * size): the family tosses them beads, and the float's riders throw to them as it passes.
 */
export const KID_SPOTS = [
  { x: -0.462, size: 0.4 },
  { x: -0.408, size: 0.37 },
] as const;

/** The little one in the jester's hat at the gallery rail (u from the screen's center, and size): the skeletons toss beads up to him. */
export const LITTLE = { x: -0.335, size: 0.4 } as const;
/** The kid in the jester's hat jumping at the left of the curb in front (u from the screen's center, and size). */
export const JUMPER = { x: -0.36, size: 0.52 } as const;

const CATCH = { x: 0, y: 0 };

/** Where sidewalk kid `j`'s raised hands meet (screen px), for the beads to fly to: scratch result. */
export function kidCatch(s: Scene, j: number): typeof CATCH {
  const k = KID_SPOTS[j]!;
  CATCH.x = s.cssW / 2 + k.x * s.u;
  CATCH.y = streetLevel(s) + SIDEWALK * s.u - s.u * k.size * 0.2;
  return CATCH;
}

/** How far the near curb's top stands above the base band's top edge (u). */
const CURB_UP = 0.014;

/** The near curb's top edge on screen (it moves with the base band, parallax 1.6). */
export function curbTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * (0.36 - CURB_UP);
}

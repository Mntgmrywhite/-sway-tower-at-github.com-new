import { BLOCK_HEIGHT } from "../config";
import type { Block } from "../game";

// Cosmetic falling pieces: sliced overhangs, and the bars that peel off a toppling tower.
// Renderer-only; the game never sees them.

/** World units/sec^2; slow enough to watch the chop happen. */
const GRAVITY = 55;
/** Units/sec sideways, away from the tower. */
export const FALL_DRIFT = 9;
/** Radians/sec. */
export const FALL_SPIN = 1.2;

export interface Falling extends Block {
  /** World y of the piece's bottom. */
  y: number;
  vx: number;
  /** Downward speed, world units/sec. */
  vy: number;
  /** Screen rotation, radians (clockwise positive). */
  angle: number;
  spin: number;
  level: number;
}

/** `towerX` is the world x of the tower top's center; pieces tumble away from it. */
export function addFalling(falling: Falling[], piece: Block, level: number, towerX: number): void {
  const dir = piece.x + piece.w / 2 < towerX ? -1 : 1;
  falling.push({
    ...piece,
    y: level * BLOCK_HEIGHT,
    vx: dir * FALL_DRIFT,
    vy: 0,
    angle: 0,
    spin: dir * FALL_SPIN,
    level,
  });
}

/** Advance the pieces; drop the ones far below the camera. */
export function stepFalling(falling: Falling[], dt: number, cameraY: number): Falling[] {
  for (const f of falling) {
    f.vy += GRAVITY * dt;
    f.y -= f.vy * dt;
    f.x += f.vx * dt;
    f.angle += f.spin * dt;
  }
  return falling.filter((f) => f.y > cameraY - 300);
}

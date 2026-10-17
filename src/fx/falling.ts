import { BLOCK_HEIGHT } from "../config";
import type { Block } from "../game";

// Cosmetic falling pieces: the overhang a sloppy drop slices off (or a missed bar) tumbles away.
// Renderer-only; the game never sees them.

/** World units/sec^2; slow enough to watch the chop happen. */
const GRAVITY = 55;
/** Units/sec sideways, away from the tower. */
const FALL_DRIFT = 9;
/** Radians/sec. */
const FALL_SPIN = 1.2;
/** Pieces this far (world units) below the camera are gone for good. */
const FALL_OUT = 300;

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

/** Sliced slivers fade a touch as they leave, so the tower stays the brightest thing. */
export const FALL_ALPHA = 0.9;

/**
 * `towerX` is the world x of the tower top's center; pieces tumble away from it. `vy` is how fast
 * the piece is already falling, world units/sec: in Drop a bar arrives falling, and the overhang it
 * loses (or the whole bar, on a miss) falls on at that speed.
 */
export function addFalling(falling: Falling[], piece: Block, level: number, towerX: number, vy = 0): void {
  const dir = piece.x + piece.w / 2 < towerX ? -1 : 1;
  falling.push({
    ...piece,
    y: level * BLOCK_HEIGHT,
    vx: dir * FALL_DRIFT,
    vy,
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
  return falling.filter((f) => f.y > cameraY - FALL_OUT);
}

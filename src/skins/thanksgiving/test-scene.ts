import { createCanvas } from "@napi-rs/canvas";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";

// Test helpers for Thanksgiving's story and layout tests (not a test file itself): the scene the
// renderer builds at a camera level, on a phone or zoomed out, and canvases to draw it on.

/** The phones the tests run on: a tall one and a short one. */
export const PHONES = [
  [390, 844],
  [375, 667],
] as const;

/**
 * Hard mode's zoomed-out view at its widest (zoom 0.6) on the tall phone: the scene is built for
 * a virtual screen 1/0.6 times the phone's size at the phone's u (and so its scale).
 */
export const ZOOMED = { W: 650, H: 1407, u: 390 } as const;

/** Every screen the sky's lanes are checked on: [W, H, u]. */
export const SCREENS: readonly (readonly [number, number, number])[] = [
  ...PHONES.map(([W, H]) => [W, H, Math.min(W, H * 0.6)] as const),
  [ZOOMED.W, ZOOMED.H, ZOOMED.u],
];

/**
 * The scene with the camera at `lvl` levels (render.ts's camera: a view 1.5 playfields wide at
 * `u`, the camera's level at 38% down, the ground held at 70% until the tower outgrows that).
 */
export function sceneAt(W: number, H: number, lvl: number, t = 0, u = Math.min(W, H * 0.6)): Scene {
  const scale = u / (WORLD_WIDTH * 1.5);
  const offsetX = (W - WORLD_WIDTH * scale) / 2;
  const cameraY = Math.max(lvl * BLOCK_HEIGHT, ((0.7 - 0.38) * H) / scale);
  const groundY = H * 0.38 + cameraY * scale;
  const rise = Math.max(0, groundY - H * 0.7);
  return {
    cssW: W,
    cssH: H,
    u,
    scale,
    t,
    rise,
    altitude: cameraY,
    groundY,
    horizonY: horizonFor(groundY, rise, u),
    baseX: offsetX + ((WORLD_WIDTH - BASE_WIDTH) / 2) * scale,
    baseW: BASE_WIDTH * scale,
  };
}

/** A transparent canvas context of the scene's size. */
export function context(W: number, H: number): CanvasRenderingContext2D {
  return createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
}

/** The pixels of a drawing, RGBA. */
export function pixels(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const ctx = context(W, H);
  draw(ctx);
  return ctx.getImageData(0, 0, W, H).data;
}

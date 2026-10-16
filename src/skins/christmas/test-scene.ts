import { createCanvas } from "@napi-rs/canvas";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";

// Test helpers for the Christmas tests (not a test file itself): the scene the renderer builds
// at a tower level, also for Hard mode's zoomed-out camera, and pixel masks of drawings.

/** The phones the tests run on: a tall one and a short one. */
export const SIZES = [
  [390, 844],
  [375, 667],
] as const;

/** How far Hard mode's camera zooms out at most. */
export const MIN_ZOOM = 0.6;

/**
 * The scene with `lvl` bars placed (so the camera is at lvl + 1 levels: see tone.ts's `level`),
 * with render.ts's camera (view 1.5 playfields wide, top at 38%, ground held at 70%). At zoom
 * z < 1 (Hard mode's zoomed-out camera) it is built for a virtual screen W/z x H/z with the
 * phone's u and scale, which the renderer then draws scaled by z.
 */
export function sceneAt(W: number, H: number, lvl: number, t: number, z = 1): Scene {
  const u = Math.min(W, H * 0.6);
  const scale = u / (WORLD_WIDTH * 1.5);
  const vw = W / z;
  const vh = H / z;
  const offsetX = (vw - WORLD_WIDTH * scale) / 2;
  const cameraY = Math.max((lvl + 1) * BLOCK_HEIGHT, ((0.7 - 0.38) * vh) / scale);
  const groundY = vh * 0.38 + cameraY * scale;
  const rise = Math.max(0, groundY - vh * 0.7);
  return {
    cssW: vw,
    cssH: vh,
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

/** A canvas context of W x H pixels. */
export function context(W: number, H: number): CanvasRenderingContext2D {
  return createCanvas(Math.round(W), Math.round(H)).getContext("2d") as unknown as CanvasRenderingContext2D;
}

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge, or above `min`). */
export function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void, min = 40): Uint8Array {
  const ctx = context(W, H);
  draw(ctx);
  const data = ctx.getImageData(0, 0, Math.round(W), Math.round(H)).data;
  const out = new Uint8Array(data.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > min ? 1 : 0;
  return out;
}

/** How many pixels of a drawing on the canvas's outermost rows and columns show (alpha above `min`). */
export function edgePixels(ctx: CanvasRenderingContext2D, min: number): number {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  let n = 0;
  for (const [x, y, sw, sh] of [
    [0, 0, w, 1],
    [0, h - 1, w, 1],
    [0, 0, 1, h],
    [w - 1, 0, 1, h],
  ] as const) {
    const data = ctx.getImageData(x, y, sw, sh).data;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > min) n++;
  }
  return n;
}

import { createCanvas } from "@napi-rs/canvas";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { thanksgiving } from "../thanksgiving";
import type { CartoonSkin, Scene } from "../skin";

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

/**
 * Canvases by size, reused. A canvas's pixels (and every pixel read back from one) live outside
 * the JavaScript heap, where the garbage collector does not see them: a test that makes a fresh
 * full-screen canvas for each of thousands of frames grows a worker by gigabytes before anything
 * is freed, enough to run the machine out of memory with a few workers going. So each size has
 * one canvas, wiped and its state reset each time it is handed out (the few most recent sizes
 * are kept).
 */
const CANVASES = new Map<string, CanvasRenderingContext2D>();
const KEEP = 8;

/**
 * A transparent canvas context of the scene's size: a reused one, wiped clean, its transform,
 * clip and styles reset. Finish with it (read its pixels) before asking for another of the same size.
 */
export function context(W: number, H: number): CanvasRenderingContext2D {
  const key = `${W}x${H}`;
  let ctx = CANVASES.get(key);
  if (ctx) {
    CANVASES.delete(key);
    ctx.reset();
  } else {
    ctx = createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
    if (CANVASES.size >= KEEP) CANVASES.delete(CANVASES.keys().next().value!);
  }
  CANVASES.set(key, ctx);
  return ctx;
}

/** The pixels of a drawing, RGBA. */
export function pixels(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const ctx = context(W, H);
  draw(ctx);
  return ctx.getImageData(0, 0, W, H).data;
}

/** The scene the start shot renders with on each screen (the shots are slow to build: once each). */
const START = new Map<string, Scene>();

/** The start shot's scene (the title's fresh tower, the renderer's own camera) at scene time t. */
export function startScene(W: number, H: number, t: number): Scene {
  const key = `${W}x${H}`;
  if (!START.has(key)) {
    const shot = shots().find((s) => s.name === "start")!;
    let scene: Scene | undefined;
    const spy: CartoonSkin = { ...thanksgiving, ground: (_, s) => (scene = { ...s }) };
    render(createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
    START.set(key, scene!);
  }
  return { ...START.get(key)!, t };
}

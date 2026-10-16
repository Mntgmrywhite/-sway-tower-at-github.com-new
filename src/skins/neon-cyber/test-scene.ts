import { createCanvas } from "@napi-rs/canvas";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neonCyber } from "../neon-cyber";
import type { NeonSkin, Scene } from "../skin";

// Test helpers for Neon Cyberpunk's layout tests (not a test file itself): the scene the renderer
// builds at a tower level or for the start shot, and pixel masks of drawings.

/** The phones every layout test runs on: a tall one and a short one. */
export const SIZES = [
  [390, 844],
  [375, 667],
] as const;

/**
 * The scene at a tower level, with render.ts's camera (view 1.5 playfields wide, top at 38%,
 * ground held at 70%). With `zoom` < 1 it is Hard mode's zoomed-out camera: the scene for a
 * screen 1/zoom as wide and tall at the phone's u and scale (drawn scaled down by `zoom`).
 */
export function sceneAt(W: number, H: number, lvl: number, t: number, zoom = 1): Scene {
  const u = Math.min(W, H * 0.6);
  const scale = u / (WORLD_WIDTH * 1.5);
  const cssW = W / zoom;
  const cssH = H / zoom;
  const offsetX = (cssW - WORLD_WIDTH * scale) / 2;
  const cameraY = Math.max((lvl + 1) * BLOCK_HEIGHT, ((0.7 - 0.38) * cssH) / scale);
  const groundY = cssH * 0.38 + cameraY * scale;
  const rise = Math.max(0, groundY - cssH * 0.7);
  return {
    cssW,
    cssH,
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

/** The scene the start shot renders with, `t` seconds later. */
export function startScene(W: number, H: number, t: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  shot.view.t += t;
  let scene: Scene | undefined;
  const spy: NeonSkin = { ...neonCyber, ground: (_, s) => (scene = { ...s }) };
  const canvas = createCanvas(W, H);
  render(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
  return scene!;
}

/** A canvas context for drawing at `k` times the scene's size. */
export function context(W: number, H: number, k = 1): CanvasRenderingContext2D {
  const canvas = createCanvas(Math.round(W * k), Math.round(H * k));
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.scale(k, k);
  return ctx;
}

/**
 * Which pixels a drawing covers (alpha above a faint anti-aliased edge, or above `alphaMin`), at `k`
 * times the scene's size.
 */
export function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void, k = 1, alphaMin = 40): Uint8Array {
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const ctx = context(W, H, k);
  draw(ctx);
  const data = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > alphaMin ? 1 : 0;
  return out;
}

/** Pixels set in both masks. */
export function overlap(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i]! & b[i]!;
  return n;
}

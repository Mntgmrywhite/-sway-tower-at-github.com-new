import { createCanvas } from "@napi-rs/canvas";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import type { CartoonSkin, Scene } from "../skin";
import { toyBlock } from "../toyblock";

// Test helpers for Toy Kingdom's layout tests (not a test file itself): the scene the renderer
// builds at a tower level or for the start shot, and pixel masks of drawings.

/** The phones every layout test runs on: a tall one and a short one. */
export const SIZES = [
  [390, 844],
  [375, 667],
] as const;

/** The phone whose u the zoomed-out views keep, and how far Hard's camera can zoom out. */
export const PHONE = [390, 844] as const;
export const MIN_ZOOM = 0.6;

/**
 * The scene at a tower level, with render.ts's camera (view 1.5 playfields wide, top at 38%,
 * ground held at 70%). `u` defaults to the screen's own; Hard's zoomed-out view builds the scene
 * for a bigger virtual screen with the phone's u.
 */
export function sceneAt(W: number, H: number, lvl: number, t: number, u = Math.min(W, H * 0.6)): Scene {
  const scale = u / (WORLD_WIDTH * 1.5);
  const offsetX = (W - WORLD_WIDTH * scale) / 2;
  const cameraY = Math.max((lvl + 1) * BLOCK_HEIGHT, ((0.7 - 0.38) * H) / scale);
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

/** The scene the start shot renders with, at scene time `t` (the scene's clock: 0 as it starts). */
export function startScene(W: number, H: number, t: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  shot.view.t = t;
  let scene: Scene | undefined;
  const spy: CartoonSkin = { ...toyBlock, ground: (_, s) => (scene = { ...s }) };
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

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge), at `k` times the scene's size. */
export function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void, k = 1): Uint8Array {
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const ctx = context(W, H, k);
  draw(ctx);
  const data = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** A reusable mask maker for one screen size: one canvas, cleared between drawings (faster in long loops). */
export function masker(W: number, H: number, k = 1): (draw: (ctx: CanvasRenderingContext2D) => void) => Uint8Array {
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const ctx = context(W, H, k);
  return (draw) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.restore();
    ctx.save();
    draw(ctx);
    ctx.restore();
    ctx.globalAlpha = 1;
    const data = ctx.getImageData(0, 0, w, h).data;
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
    return out;
  };
}

/** A mask of the rows from y0 (px, at the drawing's size), `h` rows tall. */
export interface Band {
  y0: number;
  h: number;
  w: number;
  m: Uint8Array;
}

/**
 * A reusable band-mask maker: draws on one canvas and reads back only the rows from y0 to y1 (in
 * scene px) — much quicker than whole-screen masks for small things. Pixels outside the band are
 * not seen, so callers pick a band the drawing fits in (and can check its edge rows are empty).
 */
export function bandMasker(W: number, H: number, k = 1): (y0: number, y1: number, draw: (ctx: CanvasRenderingContext2D) => void) => Band {
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const ctx = context(W, H, k);
  return (y0, y1, draw) => {
    const r0 = Math.max(0, Math.min(h, Math.floor(y0 * k)));
    const r1 = Math.max(r0, Math.min(h, Math.ceil(y1 * k)));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, r0, w, r1 - r0);
    ctx.restore();
    ctx.save();
    draw(ctx);
    ctx.restore();
    ctx.globalAlpha = 1;
    const m = new Uint8Array(w * (r1 - r0));
    if (r1 > r0) {
      const data = ctx.getImageData(0, r0, w, r1 - r0).data;
      for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
    }
    // Leave the canvas clear for the next drawing (it may reach outside this band).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.restore();
    return { y0: r0, h: r1 - r0, w, m };
  };
}

/** Pixels set in both bands (where their rows meet). */
export function bandOverlap(a: Band, b: Band): number {
  const r0 = Math.max(a.y0, b.y0);
  const r1 = Math.min(a.y0 + a.h, b.y0 + b.h);
  let n = 0;
  for (let r = r0; r < r1; r++) {
    const ia = (r - a.y0) * a.w;
    const ib = (r - b.y0) * b.w;
    for (let x = 0; x < a.w; x++) n += a.m[ia + x]! & b.m[ib + x]!;
  }
  return n;
}

/** The views every lane test runs on: the two phones, and a phone's u on Hard's most zoomed-out virtual screen. */
export const VIEWS: readonly (readonly [W: number, H: number, u: number])[] = [
  ...SIZES.map(([W, H]) => [W, H, Math.min(W, H * 0.6)] as const),
  [Math.round(PHONE[0] / MIN_ZOOM), Math.round(PHONE[1] / MIN_ZOOM), Math.min(PHONE[0], PHONE[1] * 0.6)],
];

/** Pixels set in both masks. */
export function overlap(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i]! & b[i]!;
  return n;
}

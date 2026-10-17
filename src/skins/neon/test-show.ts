import { createCanvas } from "@napi-rs/canvas";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neon } from "../neon";
import type { NeonSkin, Scene } from "../skin";
import { hudBottom } from "./sky";
import { zoomOut } from "./test-scene";

// Test helpers for Synthwave's show (car.test.ts, show.test.ts; not a test file itself).

/** The pixel checks draw a few hundred frames: give them time on a busy machine (ms). */
export const SLOW = 120_000;

/** Phones: a tall one, a short one, and the tall one with Hard's zoomed-out camera (0.6). */
export const SIZES = [
  [390, 844, 1],
  [375, 667, 1],
  [390, 844, 0.6],
] as const;

/** The scene the start shot renders with, on a `W` x `H` phone zoomed out by `z` (Hard's camera). */
export function startScene(W: number, H: number, z: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  let scene: Scene | undefined;
  const spy: NeonSkin = { ...neon, ground: (_, s) => (scene = { ...s }) };
  render(createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
  return z === 1 ? scene! : zoomOut(scene!, z);
}

export function canvas(W: number, H: number): CanvasRenderingContext2D {
  return createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
}

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
export function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const ctx = canvas(W, H);
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** A drawing's raw pixels. */
export function pixels(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const ctx = canvas(W, H);
  draw(ctx);
  return ctx.getImageData(0, 0, W, H).data;
}

export function same(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Pixels drawn (alpha over 40), optionally only inside rows y0..y1. */
export function cover(d: Uint8ClampedArray, W: number, y0 = 0, y1 = Infinity): number {
  let n = 0;
  for (let i = 3; i < d.length; i += 4) {
    const y = Math.floor((i - 3) / 4 / W);
    if (y >= y0 && y <= y1 && d[i]! > 40) n++;
  }
  return n;
}

/** Half the width of "tap to drop" (u) as phones draw it: in Orbitron, the neon HUD's wide face
 *  (fonts.ts; tests draw a narrower fallback), outline included, it reaches 0.176u either side of
 *  the middle on a 375-wide phone; with a few pixels to spare. */
export const TAP_HALF = 0.185;

/** Where things must not go on a scene: the tower's column above its floor line, the HUD, the
 *  sky, and the title's "tap to drop" line (render.ts: centered at 90% of the height; it only
 *  shows at a run's start, where the camera is never zoomed out). */
export function keepOut(s: Scene, zoom: number) {
  return {
    x0: Math.ceil(s.baseX - s.u * 0.05),
    x1: Math.floor(s.baseX + s.baseW + s.u * 0.05),
    hud: Math.round(hudBottom(s)),
    tap:
      zoom === 1
        ? { x0: s.cssW / 2 - s.u * TAP_HALF, x1: s.cssW / 2 + s.u * TAP_HALF, y0: s.cssH * 0.9 - s.u * 0.06, y1: s.cssH * 0.9 + s.u * 0.02 }
        : null,
  };
}

/** Count a mask's pixels in each place it must keep out of. */
export function strays(m: Uint8Array, s: Scene, zoom: number) {
  const W = Math.round(s.cssW);
  const H = Math.round(s.cssH);
  const k = keepOut(s, zoom);
  const out = { drawn: 0, left: 0, right: 0, top: 0, bottom: 0, column: 0, hud: 0, sky: 0, tap: 0, leftHalf: 0 };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      out.drawn++;
      if (x === 0) out.left++;
      if (x === W - 1) out.right++;
      if (y === 0) out.top++;
      if (y === H - 1) out.bottom++;
      if (x < s.cssW / 2) out.leftHalf++;
      if (y < s.groundY && x >= k.x0 && x <= k.x1) out.column++;
      if (y < k.hud) out.hud++;
      if (y < s.horizonY) out.sky++;
      if (k.tap && x >= k.tap.x0 && x <= k.tap.x1 && y >= k.tap.y0 && y <= k.tap.y1) out.tap++;
    }
  }
  return out;
}

/** Pixels two masks share. */
export function overlap(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i]! & b[i]!;
  return n;
}

import { createCanvas } from "@napi-rs/canvas";
import type { BarInfo } from "../../skin";
import { floor } from "./floor";

// Test helpers for the floors' tests (not a test file itself): a floor painted alone on a clear
// canvas with room around it, and its pixels.

/** Floor heights: the phone (390 wide) and the tablet (834 wide). */
export const H_PHONE = 20.8;
export const H_TABLET = 38.2;
/** The playfield width at the phone's scale, 0.4u: the base bar. */
export const BASE_W = 156;

export interface Shot {
  /** RGBA bytes, row-major. */
  data: Uint8ClampedArray;
  W: number;
  H: number;
  /** Where the floor's rectangle sits on the canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
}

const canvases = new Map<string, CanvasRenderingContext2D>();

/** A reused context of W x H pixels (cleared). */
function context(W: number, H: number): CanvasRenderingContext2D {
  const key = `${W}x${H}`;
  let ctx = canvases.get(key);
  if (!ctx) {
    ctx = createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
    canvases.set(key, ctx);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  return ctx;
}

/** Paints one floor at 1:1 with a margin of a floor height (two above, for a roof) and returns its pixels. */
export function shoot(level: number, w: number, h: number, info: BarInfo, scale = 1): Shot {
  const W = Math.ceil((w + 2 * h) * scale) + 2;
  const Hc = Math.ceil(4 * h * scale) + 2;
  const ctx = context(W, Hc);
  // Fractional placement, as in play
  const x = h + 0.37;
  const y = 2 * h + 0.61;
  ctx.scale(scale, scale);
  floor(ctx, x, y, w, h, level, info);
  return { data: ctx.getImageData(0, 0, W, Hc).data, W, H: Hc, x: x * scale, y: y * scale, w: w * scale, h: h * scale };
}

export function info(t: number, role: BarInfo["role"] = "tower", sinceLand = Infinity, still = false): BarInfo {
  return { t, role, sinceLand, still };
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Euclidean distance in RGB. */
export function dist(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

/** WCAG relative luminance of an sRGB color (0..255 channels). */
export function luminance(c: readonly number[]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
}

/** How many pixels differ between two shots of the same size (any channel by more than `tol`). */
export function changed(a: Shot, b: Shot, tol = 8, keep?: (px: number, py: number) => boolean): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (keep && !keep((i / 4) % a.W, Math.floor(i / 4 / a.W))) continue;
    if (
      Math.abs(a.data[i]! - b.data[i]!) > tol ||
      Math.abs(a.data[i + 1]! - b.data[i + 1]!) > tol ||
      Math.abs(a.data[i + 2]! - b.data[i + 2]!) > tol ||
      Math.abs(a.data[i + 3]! - b.data[i + 3]!) > tol
    )
      n++;
  }
  return n;
}

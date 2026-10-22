import { createCanvas } from "@napi-rs/canvas";

// Test helpers for the cast's tests (not a test file itself): where a drawing paints relative to
// a box, a context that refuses non-finite numbers, and one that records every color painted.

type Box = { x0: number; y0: number; x1: number; y1: number };
type Draw = (ctx: CanvasRenderingContext2D) => void;

const SIDE = 640;
const canvas = createCanvas(SIDE, SIDE);
const raw = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

/** Wrap a context so any non-finite number passed to a method or property throws. */
export function strict(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, key) {
      const v = Reflect.get(target, key, target) as unknown;
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) throw new Error(`${String(key)}(${args.join(", ")}): not finite`);
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
    set(target, key, value) {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${String(key)} = ${value}: not finite`);
      return Reflect.set(target, key, value, target);
    },
  });
}

/**
 * Draw `draw` (in screen px) and count the pixels it paints (alpha above `min`), and those outside
 * `box` grown by `pad` px. The drawing is framed round the box with a margin of `margin` px, so
 * strays farther out than that are missed: keep boxes under about 500 px.
 */
export function paint(draw: Draw, box: Box, pad: number, min = 24, margin = 60): { drawn: number; out: number; worst: number } {
  const x0 = Math.floor(box.x0 - pad - margin);
  const y0 = Math.floor(box.y0 - pad - margin);
  const W = Math.min(SIDE, Math.ceil(box.x1 + pad + margin) - x0);
  const H = Math.min(SIDE, Math.ceil(box.y1 + pad + margin) - y0);
  raw.setTransform(1, 0, 0, 1, 0, 0);
  raw.globalAlpha = 1;
  raw.clearRect(0, 0, SIDE, SIDE);
  raw.save();
  raw.translate(-x0, -y0);
  draw(strict(raw));
  raw.restore();
  const data = raw.getImageData(0, 0, W, H).data;
  let drawn = 0;
  let out = 0;
  let worst = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3]! <= min) continue;
      drawn++;
      const px = x0 + x + 0.5;
      const py = y0 + y + 0.5;
      const d = Math.max(box.x0 - pad - px, px - box.x1 - pad, box.y0 - pad - py, py - box.y1 - pad);
      if (d > 0) {
        out++;
        worst = Math.max(worst, d);
      }
    }
  }
  return { drawn, out, worst };
}

/** Which pixels of the frame (x0, y0, W, H) a drawing paints (alpha above `min`), row by row. */
export function maskOf(draw: Draw, x0: number, y0: number, W: number, H: number, min = 24): Uint8Array {
  raw.setTransform(1, 0, 0, 1, 0, 0);
  raw.globalAlpha = 1;
  raw.clearRect(0, 0, SIDE, SIDE);
  raw.save();
  raw.translate(-x0, -y0);
  draw(strict(raw));
  raw.restore();
  const data = raw.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > min ? 1 : 0;
  return out;
}

/** The colors a drawing paints with: every fillStyle and strokeStyle it sets. */
export function colorsOf(draw: Draw): Set<string> {
  const seen = new Set<string>();
  const ctx = new Proxy(raw, {
    get(target, key) {
      const v = Reflect.get(target, key, target) as unknown;
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
    set(target, key, value) {
      if ((key === "fillStyle" || key === "strokeStyle") && typeof value === "string") seen.add(value);
      return Reflect.set(target, key, value, target);
    },
  });
  raw.setTransform(1, 0, 0, 1, 0, 0);
  raw.save();
  draw(ctx);
  raw.restore();
  return seen;
}

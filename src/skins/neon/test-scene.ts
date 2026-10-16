import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";

// Test helpers for Neon Synthwave (not a test file itself).

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

/**
 * A scene the renderer built for a phone, as Hard mode's zoomed-out camera would build it: for a
 * screen 1/zoom as wide and tall at the same u and scale, the camera held as render.ts holds it.
 */
export function zoomOut(s: Scene, zoom: number): Scene {
  const cssW = s.cssW / zoom;
  const cssH = s.cssH / zoom;
  const cameraY = Math.max(s.altitude, ((0.7 - 0.38) * cssH) / s.scale);
  const groundY = cssH * 0.38 + cameraY * s.scale;
  const rise = Math.max(0, groundY - cssH * 0.7);
  return {
    ...s,
    cssW,
    cssH,
    rise,
    altitude: cameraY,
    groundY,
    horizonY: horizonFor(groundY, rise, s.u),
    baseX: s.baseX + (cssW - s.cssW) / 2,
  };
}

/** A color as [r, g, b, a] in 0..1, from "#rrggbb" or "rgba(r, g, b, a)". */
function channels(c: string): number[] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).concat(1);
  }
  const [r = 0, g = 0, b = 0, a = 1] = c.replace(/[^\d.,]/g, "").split(",").map(Number);
  return [r / 255, g / 255, b / 255, a];
}

/**
 * How far apart two looks are, field by field: the largest change in any color channel (0..1),
 * number, or flag; counts (like shooting-star slots) by their share of `counts`' largest value.
 */
export function lookStep<T extends object>(a: T, b: T, counts: Record<string, number> = {}): number {
  let worst = 0;
  for (const key of Object.keys(a) as (keyof T)[]) {
    const x = a[key];
    const y = b[key];
    let d = 0;
    if (typeof x === "string" && typeof y === "string") {
      const p = channels(x);
      const q = channels(y);
      d = Math.max(...p.map((v, i) => Math.abs(v - q[i]!)));
    } else if (typeof x === "number" && typeof y === "number") {
      d = Math.abs(x - y) / (counts[key as string] ?? 1);
    } else if (typeof x === "boolean") {
      d = x === y ? 0 : 1;
    } else if (Array.isArray(x) && Array.isArray(y)) {
      d = Math.max(...x.map((v, i) => lookStep({ v }, { v: y[i] })));
    }
    worst = Math.max(worst, d);
  }
  return worst;
}

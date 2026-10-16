import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible, type Drifter } from "./drift";
import { seaTop } from "./far";
import { moonAt, sunAt } from "./sky";
import { level, toneOf } from "./tone";

// Everything drifting past in the side lanes, all the way up, on a tall and a short phone:
// nothing enters the tower's column or touches a side of the screen, nothing overlaps, and
// only clouds ever pass in front of the sun (left lane) or the moon (right lane).

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
const LEVELS = Array.from({ length: 111 }, (_, i) => i * 2);
const TIMES = [0, 5.3] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

/** The scene at a tower level, with render.ts's camera (view 1.5 playfields wide, top at 38%, ground held at 70%). */
function sceneAt(W: number, H: number, lvl: number, t: number): Scene {
  const u = Math.min(W, H * 0.6);
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

function mask(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.scale(K, K);
  draw(ctx);
  const data = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** Pixels of a mask inside a circle (in full-size coordinates). */
function inCircle(m: Uint8Array, w: number, cx: number, cy: number, r: number): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = (i % w) / K;
    const y = Math.floor(i / w) / K;
    if (Math.hypot(x - cx, y - cy) < r) n++;
  }
  return n;
}

describe("classic drifters", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: lanes stay clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    const h = Math.round(H * K);
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const items: { d: Drifter; lane: number; m: Uint8Array }[] = [];
      eachVisible(s, (d, lane) => items.push({ d, lane, m: mask(w, h, (ctx) => drawDrifter(ctx, s, tone, d)) }));
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      const sun = sunAt(s, tone, seaTop(s, level(s)));
      const moon = moonAt(s);
      items.forEach(({ d, lane, m }, i) => {
        const what = `level ${lvl}: ${d.kind} at ${Math.round(d.at)}`;
        let column = 0;
        let edge = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = k % w;
          if (x >= c0 && x <= c1) column++;
          if (x === 0 || x === w - 1) edge++;
        }
        expect(column, `${what}: pixels in the tower's column`).toBe(0);
        expect(edge, `${what}: pixels on a side of the screen`).toBe(0);
        for (let j = i + 1; j < items.length; j++) {
          const n = items[j]!.m;
          let both = 0;
          for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
          expect(both, `${what} overlaps ${items[j]!.d.kind} at ${Math.round(items[j]!.d.at)}`).toBe(0);
        }
        if (d.kind === "cloud") return;
        if (lane === 1 && tone.sunSet < 1) expect(inCircle(m, w, sun.x, sun.y, sun.r * 1.42), `${what} crosses the sun`).toBe(0);
        if (lane === 0 && tone.moon > 0) expect(inCircle(m, w, moon.x, moon.y, moon.r * 1.1), `${what} crosses the moon`).toBe(0);
      });
    }
  });
});

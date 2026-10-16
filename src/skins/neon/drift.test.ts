import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible, type Drifter } from "./drift";
import { PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { COLUMN, hudBottom, meteorAt, moonAt, planetAt } from "./sky";
import { LOOP, LOOP_FROM, toneOf } from "./tone";

// The side lanes all the way up (through the story and two rounds of its loop), on a tall and a
// short phone: nothing drifting past enters the tower's column or touches a side of the screen,
// nothing overlaps (each other, or the palms while they are still in view), and only clouds ever
// pass in front of the moon or the planet. The moon and the planet themselves stay in their
// lanes and below the HUD, and the shooting stars streak out toward the edges without reaching
// them, the column, or either body.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
/** Every other level from the ground through the story and two full loops of it (tone.ts). */
const LEVELS = Array.from({ length: Math.ceil((LOOP_FROM + 2 * LOOP + 30) / 2) + 1 }, (_, i) => i * 2);
const TIMES = [0, 5.3] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;
/** These walk every other level through two loops: give them time on a busy machine (ms). */
const SLOW = 60_000;

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

/** Pixels of a mask inside an ellipse (in full-size coordinates). */
function inEllipse(m: Uint8Array, w: number, cx: number, cy: number, rx: number, ry: number): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = ((i % w) + 0.5) / K;
    const y = (Math.floor(i / w) + 0.5) / K;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) n++;
  }
  return n;
}

describe("synthwave lanes", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: lanes stay clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    const h = Math.round(H * K);
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const items: { what: string; d?: Drifter; lane: number; m: Uint8Array }[] = [];
      eachVisible(s, (d, lane) => items.push({ what: `${d.kind} at ${Math.round(d.at)}`, d, lane, m: mask(w, h, (ctx) => drawDrifter(ctx, s, tone, d)) }));
      for (const [i, p] of PALMS.entries()) {
        const m = mask(w, h, (ctx) => drawPalm(ctx, s, p, RIM));
        if (m.some((v) => v)) items.push({ what: `palm ${i}`, lane: -1, m });
      }
      const c0 = (s.cssW / 2 - s.u * COLUMN) * K;
      const c1 = (s.cssW / 2 + s.u * COLUMN) * K;
      const moon = moonAt(s);
      const planet = planetAt(s, tone);
      items.forEach(({ what: name, d, lane, m }, i) => {
        const what = `level ${lvl}: ${name}`;
        if (d) {
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
        }
        for (let j = i + 1; j < items.length; j++) {
          const n = items[j]!.m;
          let both = 0;
          for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
          expect(both, `${what} overlaps ${items[j]!.what}`).toBe(0);
        }
        if (!d || d.kind !== "flock") return;
        if (lane === 0 && tone.moon > 0) expect(inEllipse(m, w, moon.x, moon.y, moon.r * 1.35, moon.r * 1.35), `${what} crosses the moon`).toBe(0);
        if (lane === 1 && tone.planet > 0) expect(inEllipse(m, w, planet.x, planet.y, planet.ring * 1.1, planet.r * 1.2), `${what} crosses the planet`).toBe(0);
      });
    }
  }, SLOW);

  it.each(SIZES)("%ix%i: the moon, the planet and the shooting stars keep to the lanes", (W, H) => {
    for (const lvl of LEVELS) {
      const s0 = sceneAt(W, H, lvl, 0);
      const tone = toneOf(s0);
      const cx = W / 2;
      const col = s0.u * COLUMN;
      const hud = hudBottom(s0);
      const moon = moonAt(s0);
      const planet = planetAt(s0, tone);
      if (tone.moon > 0) {
        const r = moon.r * 1.35;
        expect(moon.x - r, `level ${lvl}: moon in the column`).toBeGreaterThan(cx + col);
        expect(moon.x + r, `level ${lvl}: moon off the right side`).toBeLessThan(W - 1);
        expect(moon.y - r, `level ${lvl}: moon in the HUD`).toBeGreaterThan(hud);
      }
      if (tone.planet > 0) {
        expect(planet.x + planet.ring, `level ${lvl}: planet in the column`).toBeLessThan(cx - col);
        expect(planet.x - planet.ring, `level ${lvl}: planet off the left side`).toBeGreaterThan(1);
        expect(planet.y - planet.r * 1.2, `level ${lvl}: planet in the HUD`).toBeGreaterThan(hud);
      }
      // Shooting stars: every slot through a minute (each streak several times), head and tail end.
      for (let t = 0; t < 60; t += 0.1) {
        const s = { ...s0, t };
        for (let i = 0; i < tone.meteors; i++) {
          const m = meteorAt(s, tone, i);
          if (!m.on) continue;
          for (const f of [0, 1]) {
            const x = m.x - m.dx * m.tail * f;
            const y = m.y - m.dy * m.tail * f;
            const what = `level ${lvl}, t=${t.toFixed(2)}: shooting star ${i}`;
            expect(Math.abs(x - cx), `${what} in the column`).toBeGreaterThan(col);
            expect(x, `${what} off the left side`).toBeGreaterThan(2);
            expect(x, `${what} off the right side`).toBeLessThan(W - 2);
            expect(y, `${what} in the HUD`).toBeGreaterThan(hud);
            if (tone.moon > 0) expect(Math.hypot(x - moon.x, y - moon.y), `${what} crosses the moon`).toBeGreaterThan(moon.r * 1.35);
            if (tone.planet > 0) expect(Math.hypot(x - planet.x, y - planet.y), `${what} crosses the planet`).toBeGreaterThan(planet.ring);
          }
        }
      }
    }
  }, SLOW);
});

import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible, laneY, type Drifter } from "./drift";
import { farLayer, seaTop } from "./far";
import { moonAt, sunAt } from "./sky";
import { context, mask, sceneAt, SIZES } from "./test-scene";
import { level, LOOP, LOOP_FROM, SCENE_LOOP_FROM, toneOf, type Tone } from "./tone";

// Everything drifting past in the side lanes, from the start through two full turns of the
// looping story, on a tall and a short phone and zoomed out (Hard's view): nothing enters the
// tower's column or touches a side of the screen, nothing overlaps, and nothing at all (no
// cloud, no lantern, no island, balloon or bird) ever passes over the sun or the moon.

const LEVELS = Array.from({ length: Math.ceil((SCENE_LOOP_FROM + 2 * LOOP) / 2) + 1 }, (_, i) => i * 2);
/** The phones at two moments of the drifters' sway, and zoomed out (Hard's view) at one. */
const FRAMES = SIZES.flatMap(([W, H]) => [
  [W, H, 1, 0],
  [W, H, 1, 5.3],
  [W, H, 0.78, 2.6],
  [W, H, 0.6, 2.6],
] as const);
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("classic drifters", () => {
  it.each(FRAMES)(
    "%ix%i at zoom %s, t=%s: lanes stay clear through two turns of the loop",
    (W, H, z, t) => {
      for (const lvl of LEVELS) {
        const s = sceneAt(W, H, lvl, t, z);
        const w = Math.round(s.cssW * K);
        const tone = toneOf(s);
        const items: { d: Drifter; at: number; m: Uint8Array }[] = [];
        eachVisible(s, (d, _lane, at) => items.push({ d, at, m: mask(s.cssW, s.cssH, (ctx) => drawDrifter(ctx, s, tone, d, at), K) }));
        const c0 = (s.cssW / 2 - s.u * 0.25) * K;
        const c1 = (s.cssW / 2 + s.u * 0.25) * K;
        items.forEach(({ d, at, m }, i) => {
          const what = `level ${lvl}: ${d.kind} at ${Math.round(at)}`;
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
            expect(both, `${what} overlaps ${items[j]!.d.kind} at ${Math.round(items[j]!.at)}`).toBe(0);
          }
        });
      }
    },
    // Many full-scene masks: generous room for a busy machine.
    60_000,
  );
});

/** A light in the sky as a circle: the sun's rays by day (its halo as it swells to set), the moon's outer glow. */
interface Light {
  name: string;
  x: number;
  y: number;
  r: number;
}

/** The sun and the moon wherever they show at this moment. */
function lights(s: Scene, tone: Tone): Light[] {
  const out: Light[] = [];
  if (tone.sunSet < 1) {
    const sun = sunAt(s, tone, seaTop(s, level(s)));
    out.push({ name: "the sun", x: sun.x, y: sun.y, r: sun.r * 1.72 });
  }
  if (tone.moon > 0) {
    const moon = moonAt(s);
    out.push({ name: "the moon", x: moon.x, y: moon.y, r: moon.r * 1.55 });
  }
  return out;
}

/** Pixels of an item drawn over a light's circle (any but the faintest coverage counts). */
function over(s: Scene, tone: Tone, d: Drifter, at: number, light: Light): number {
  const x0 = Math.floor(light.x - light.r) - 1;
  const y0 = Math.floor(light.y - light.r) - 1;
  const size = Math.ceil(light.r * 2) + 3;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.translate(-x0, -y0);
  drawDrifter(ctx, s, tone, d, at);
  const data = ctx.getImageData(0, 0, size, size).data;
  let n = 0;
  for (let i = 0; i < size * size; i++) {
    if (data[i * 4 + 3]! <= 8) continue;
    if (Math.hypot(x0 + (i % size) + 0.5 - light.x, y0 + Math.floor(i / size) + 0.5 - light.y) < light.r) n++;
  }
  return n;
}

describe("classic drifters and the sun and moon", () => {
  // The owner saw the sun "torn" around level 40: a stream of lane clouds sliding down across it,
  // slicing it in half one after another. Nothing may pass over the sun or the moon, ever: on a
  // phone there is no room to go round them, so things come down the sun's lane only behind the
  // setting sun and are gone into the haze before it rises again, and things in the moon's lane
  // pass its height only while it is down. Checked a quarter of a level at a time from the start
  // through two turns of the loop (the sun setting and rising through its lane, the moon fading
  // in and out), each frame a moment further into the drifters' sway and bob. Besides the phones
  // and the zoomed views: a tablet (the squattest frame, where the loop starts lowest in its lanes)
  // and a foldable's tall cover screen (where the day sun is held down, see sunHigh).
  const STEP = 0.25;
  const SKY_FRAMES = [
    ...SIZES.flatMap(([W, H]) => [1, 0.78, 0.6].map((z) => [W, H, z] as const)),
    [768, 1024, 1] as const,
    [300, 820, 1] as const,
  ];
  it.each(SKY_FRAMES)(
    "%ix%i at zoom %s: nothing passes over the sun or the moon",
    (W, H, z) => {
      let near = 0;
      for (let lvl = 0; lvl <= SCENE_LOOP_FROM + 2 * LOOP; lvl += STEP) {
        const s = sceneAt(W, H, lvl, (lvl * 0.73) % 31, z);
        const tone = toneOf(s);
        const sky = lights(s, tone);
        if (!sky.length) continue;
        eachVisible(s, (d, _lane, at) => {
          const y = laneY(s, at);
          for (const light of sky) {
            // Only what is near the light's height on its side of the screen can touch it.
            if (Math.abs(y - light.y) > light.r + s.u * 0.32) continue;
            if (Math.sign(d.x) !== Math.sign(light.x - s.cssW / 2)) continue;
            near++;
            expect(over(s, tone, d, at, light), `level ${lvl}: ${d.kind} at ${Math.round(at)} passes over ${light.name}`).toBe(0);
          }
        });
      }
      // Things do come close (behind the setting sun, below the moon), so the check has teeth.
      expect(near).toBeGreaterThan(50);
    },
    60_000,
  );
});

/** Which pixels the far islands cover (at half size): the far layer with them, against it without. */
function farMask(s: ReturnType<typeof sceneAt>): Uint8Array {
  const tone = toneOf(s);
  const lvl = level(s);
  const sea = seaTop(s, lvl);
  const w = Math.round(s.cssW * K);
  const h = Math.round(s.cssH * K);
  const draw = (isles: number) => {
    const ctx = context(s.cssW, s.cssH, K);
    farLayer(ctx, s, { ...tone, farIsles: isles }, lvl, sea, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const a = draw(1);
  const b = draw(0);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    let d = 0;
    for (let c = 0; c < 4; c++) d += Math.abs(a[i * 4 + c]! - b[i * 4 + c]!);
    out[i] = d > 30 ? 1 : 0;
  }
  return out;
}

describe("classic drifters and the far islands", () => {
  // The far islands on the cloud sea (the lighthouse, the great tree, the hamlet) sit at the foot
  // of both lanes: everything coming down a lane fades into the haze before it reaches their
  // skyline, so none of them is ever covered, through two turns of the loop, zoomed out too.
  it.each(SIZES.flatMap(([W, H]) => [1, 0.6].map((z) => [W, H, z] as const)))("%ix%i at zoom %s: nothing in the lanes covers a far island", (W, H, z) => {
    for (let lvl = LOOP_FROM; lvl <= SCENE_LOOP_FROM + 2 * LOOP; lvl += 3) {
      const s = sceneAt(W, H, lvl, 2.3 + lvl * 0.05, z);
      const tone = toneOf(s);
      const far = farMask(s);
      eachVisible(s, (d, _lane, at) => {
        const m = mask(s.cssW, s.cssH, (ctx) => drawDrifter(ctx, s, tone, d, at), K);
        let both = 0;
        for (let i = 0; i < m.length; i++) both += m[i]! & far[i]!;
        expect(both, `level ${lvl}: ${d.kind} at ${Math.round(at)} covers a far island`).toBe(0);
      });
    }
  }, 60_000);
});

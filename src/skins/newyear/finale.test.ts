import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { COUNT, COUNT_FROM, CYCLE, MIDNIGHT, sceneTimeOf } from "./countdown";
import { FINALE_LEN, finaleBursting, finaleSpots } from "./sky";
import { toneOf } from "./story";
import { sceneAt } from "./test-scene";

// The owner: "The countdown needs to start at 10, with lots more fireworks, then reset after a
// minute", then: "The count should go back to a full minute how you had it first." Every midnight
// the Times Tower counts down to (a minute into a tower's scene, then once a pass of the song), the
// sky erupts: a volley on the stroke of twelve, then a grand finale of big bursts in quick
// succession, going where the sky's own bursts go.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

/** The sky layer alone (fireworks and drifters) at level `lvl`, `t` seconds into the scene (the
 *  song at `songTime`, NaN for none). */
function skyMask(W: number, H: number, lvl: number, t: number, songTime = NaN): { data: Uint8ClampedArray; w: number; h: number; s: Scene } {
  const w = Math.round(W * K);
  const h = Math.round(H * K);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.scale(K, K);
  const s = sceneAt(W, H, lvl, t, songTime);
  newYear.sky!(ctx as unknown as CanvasRenderingContext2D, s);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, s };
}

/** The finale's bursts in bloom on a W x H screen with the camera at tower level `lvl`. */
function spots(W: number, H: number, lvl: number, t: number, songTime = NaN): ReturnType<typeof finaleSpots> {
  const s = sceneAt(W, H, lvl, t, songTime);
  return finaleSpots(s, altitude01(s) + toneOf(s).finale);
}

function litPixels(W: number, H: number, lvl: number, t: number): number {
  const { data } = skyMask(W, H, lvl, t);
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) n++;
  return n;
}

describe("New Year's midnight finale", () => {
  it("bursts on the stroke of midnight, a minute into a tower's scene and every pass after, and keeps bursting for several seconds", () => {
    expect(sceneTimeOf(MIDNIGHT)).toBeCloseTo(60, 9);
    for (const pass of [0, 1, 2, 9]) {
      const t0 = sceneTimeOf(MIDNIGHT, pass);
      expect(finaleBursting({ t: t0 - 0.05 } as Scene), `pass ${pass}`).toBe(0);
      // The volley: half a dozen shells at once, as midnight strikes
      expect(finaleBursting({ t: t0 + 0.15 } as Scene)).toBeGreaterThanOrEqual(6);
      for (let m = 0.5; m < FINALE_LEN; m += 0.25) expect(finaleBursting({ t: t0 + m } as Scene), `${m}s after midnight`).toBeGreaterThanOrEqual(7);
      // ...and it's over well before the next count.
      expect(finaleBursting({ t: t0 + FINALE_LEN + 3 } as Scene)).toBe(0);
    }
  });

  it.each(SIZES)("%ix%i: fills the sky with far more fireworks than the count before it, low and high", (W, H) => {
    for (const lvl of [0, 20, 45]) {
      let count = 0;
      let finale = 0;
      for (const pass of [0, 1]) {
        for (let t = 0.25; t < COUNT; t += 0.5) count += litPixels(W, H, lvl, sceneTimeOf(COUNT_FROM + t, pass));
        for (let t = 0.25; t < COUNT; t += 0.5) finale += litPixels(W, H, lvl, sceneTimeOf(MIDNIGHT + t * (FINALE_LEN / COUNT), pass));
      }
      expect(finale / count, `level ${lvl}`).toBeGreaterThan(1.9);
    }
  });

  it.each(SIZES)("%ix%i: once the camera follows the tower, slips no further behind the bars than the sky's own bursts", (W, H) => {
    /** How close (u from the screen's center) anything lit in the sky comes, under the HUD. */
    const innermost = (lvl: number, p: number): number => {
      const { data, w, h, s } = skyMask(W, H, lvl, sceneTimeOf(p));
      let inner = Infinity;
      for (let y = Math.ceil(H * 0.32 * K); y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3]! < 40) continue;
          inner = Math.min(inner, Math.abs(x / K - W / 2) / s.u);
        }
      }
      return inner;
    };
    let everyday = Infinity;
    let finale = Infinity;
    for (const lvl of [20, 45, 90, 250]) {
      for (let p = 0.25; p < CYCLE; p += 0.5) {
        const i = innermost(lvl, p);
        if (p > MIDNIGHT && p < MIDNIGHT + FINALE_LEN + 2) finale = Math.min(finale, i);
        else everyday = Math.min(everyday, i);
      }
    }
    expect(finale).toBeLessThan(Infinity);
    expect(finale).toBeGreaterThanOrEqual(everyday - 0.01);
  });

  it.each(SIZES)("%ix%i: keeps the sky full: many bursts in bloom all through it, on a short tower and high", (W, H) => {
    for (const lvl of [0, 6, 20, 45, 90]) {
      let sum = 0;
      let n = 0;
      let fewest = Infinity;
      for (const pass of [0, 1, 4]) {
        for (let m = 0.5; m < FINALE_LEN; m += 0.1) {
          const k = spots(W, H, lvl, sceneTimeOf(MIDNIGHT + m, pass)).length;
          sum += k;
          n++;
          fewest = Math.min(fewest, k);
        }
      }
      expect(sum / n, `level ${lvl}`).toBeGreaterThanOrEqual(7.5);
      expect(fewest, `level ${lvl}`).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(SIZES)("%ix%i: a burst stays where it is all through its flight while the camera climbs", (W, H) => {
    // The first midnight comes a minute into a run, the camera anywhere from the ground to high
    // above the city; later ones as the city sinks away under it. At moments all through the
    // finale, the camera swept up from the ground to high in the sky a twentieth of a bar at a
    // time: no burst ever leaps.
    const leap = 0.1 * Math.min(W, H * 0.6);
    for (const pass of [0, 1, 3]) {
      for (let m = 0.3; m < FINALE_LEN + 1; m += 0.8) {
        let prev = new Map<number, { x: number; y: number; on: number }>();
        let seen = 0;
        for (let lvl = 0; lvl <= 140; lvl += 0.05) {
          const now = new Map(spots(W, H, lvl, sceneTimeOf(MIDNIGHT + m, pass)).map((b) => [b.k, b] as const));
          for (const [i, b] of now) {
            const p = prev.get(i);
            if (!p || p.on < 0.2 || b.on < 0.2) continue;
            seen++;
            expect(Math.hypot(b.x - p.x, b.y - p.y), `${m.toFixed(1)}s after midnight ${pass}, level ${lvl.toFixed(2)}: burst ${i}`).toBeLessThan(leap);
          }
          prev = now;
        }
        expect(seen).toBeGreaterThan(5000);
      }
    }
    // Some 25,000 views: about two seconds alone, longer beside the full suite.
  }, 30_000);

  it.each(SIZES)("%ix%i: with music, bursts on the song's midnight, each burst holding its spot however far the scene's clock runs from the song's", (W, H) => {
    // The song sped up (or the scene held under an overlay) runs ahead of the scene's own clock:
    // the finale goes by the song alone, so nothing in it changes as the two drift apart.
    expect(finaleBursting({ t: 3, songTime: MIDNIGHT - 0.05 } as Scene)).toBe(0);
    expect(finaleBursting({ t: 3, songTime: MIDNIGHT + 0.15 } as Scene)).toBeGreaterThanOrEqual(6);
    for (const lvl of [4, 30]) {
      for (let m = 0.3; m < FINALE_LEN; m += 0.7) {
        const song = MIDNIGHT + m;
        const at = (t: number) => JSON.stringify(spots(W, H, lvl, t, song));
        const first = at(sceneTimeOf(song));
        expect(JSON.parse(first).length, `${m.toFixed(1)}s after midnight`).toBeGreaterThan(3);
        for (const t of [sceneTimeOf(song) - 30.4, sceneTimeOf(song, 1) - 41, sceneTimeOf(song, 1) + 0.5, sceneTimeOf(song, 3) - 7.7, 1234.5]) {
          expect(at(t), `${m.toFixed(1)}s after midnight, scene at ${t}s`).toBe(first);
        }
      }
    }
  });
});

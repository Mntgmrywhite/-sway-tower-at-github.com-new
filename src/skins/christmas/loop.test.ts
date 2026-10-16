import { describe, expect, it } from "vitest";
import { mix } from "../../base/draw";
import { kitFor } from "../../base/style";
import { christmas } from "../christmas";
import { SKY_BOTTOM, SKY_MID, SKY_TOP } from "./colors";
import { bodies } from "./sky";
import { context, edgePixels, mask, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";
import { level, LOOP_PERIOD, LOOP_START, loopHorizon, moonUp, STEP, storyLevel, sunUp, toneAt, type Tone } from "./tone";

// The height story loops: the first pass (the street at dusk, up into the night) is as designed,
// and past LOOP_START the night turns through Christmas morning, the day and dusk back to night,
// every LOOP_PERIOD levels, forever. No jump where the loop begins or where it comes round.

const A = LOOP_START;
const P = LOOP_PERIOD;
/** sceneAt takes the bars placed: the camera is a level above them. */
const BARS = (lvl: number) => lvl - 1;

/** A color's channels, 0..255 (alpha too, for rgba()). */
function channels(c: string): number[] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const [r, g, b, a] = c.replace(/[^\d.,]/g, "").split(",").map(Number);
  return [r!, g!, b!, a! * 255];
}

/** Relative luminance (WCAG) of a color's channels. */
function luminance(c: ArrayLike<number>): number {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
}

function colorStep(a: string, b: string): number {
  const x = channels(a);
  const y = channels(b);
  return Math.max(...x.map((v, i) => Math.abs(v - y[i]!)));
}

/** The largest change between two tones, in color channels (fractions count as 255ths). */
function toneStep(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === "number" && typeof y === "number") d = Math.max(d, Math.abs(x - y) * 255);
    else if (typeof x === "string" && typeof y === "string") d = Math.max(d, colorStep(x, y));
    else if (Array.isArray(x) && Array.isArray(y)) x.forEach((c, i) => (d = Math.max(d, colorStep(c, y[i]!))));
  }
  return d;
}

/** Everything that changes with height at a level, as one step-comparable record. */
function storyAt(lvl: number): { tone: Tone; moon: number; sun: number } {
  return { tone: toneAt(lvl), moon: moonUp(lvl), sun: sunUp(lvl) };
}

function step(a: number, b: number): number {
  const x = storyAt(a);
  const y = storyAt(b);
  return Math.max(toneStep(x.tone, y.tone), Math.abs(x.moon - y.moon) * 255, Math.abs(x.sun - y.sun) * 255);
}

describe("christmas looping story", () => {
  it("the first pass is as designed: the base paints the sky, the moon is up, no sun", () => {
    for (let lvl = 0; lvl < A; lvl += 0.75) {
      expect(storyLevel(lvl)).toBe(lvl);
      expect(toneAt(lvl).loop).toBe(false);
      expect(toneAt(lvl).snow).toBe(1);
      expect(moonUp(lvl)).toBe(1);
      expect(sunUp(lvl)).toBe(0);
    }
    expect(toneAt(A).loop).toBe(true);
  });

  it("past LOOP_START everything keyed by height repeats every LOOP_PERIOD", () => {
    for (let lvl = A; lvl < A + P; lvl += STEP) {
      const at = lvl + 0.1;
      for (const turns of [1, 2, 5, 16]) {
        const later = at + turns * P;
        expect(storyLevel(later)).toBeCloseTo(storyLevel(at), 6);
        expect(toneAt(later), `level ${at} + ${turns} turns`).toEqual(toneAt(at));
        expect(moonUp(later)).toBeCloseTo(moonUp(at), 6);
        expect(sunUp(later)).toBeCloseTo(sunUp(at), 6);
      }
    }
  });

  it("a turn of the loop runs night, Christmas morning, a clear day, dusk and night again", () => {
    const at = (p: number) => storyAt(A + P + p);
    // Night where the loop starts: stars out, the moon up, snowing.
    expect(at(0).tone.stars).toBe(1);
    expect(at(0).moon).toBe(1);
    expect(at(0).sun).toBe(0);
    expect(at(0).tone.snow).toBe(1);
    // Morning: the sun has risen and the moon set, the snow has stopped, no stars.
    expect(at(50).sun).toBe(1);
    expect(at(50).moon).toBe(0);
    expect(at(50).tone.snow).toBe(0);
    expect(at(50).tone.stars).toBe(0);
    // The day: bright, the skyline in daylight colors.
    expect(at(68).tone.far).not.toBe(at(0).tone.far);
    // Dusk: the street's own sky again, the moon back up, the sun gone, snowing.
    expect(at(98).tone.sky).toEqual([SKY_TOP, SKY_MID, SKY_BOTTOM]);
    expect(at(98).moon).toBe(1);
    expect(at(98).sun).toBe(0);
    expect(at(98).tone.snow).toBe(1);
    expect(at(115).tone).toEqual(at(0).tone);
  });

  it("no jump where the loop begins or comes round: no step there beats the largest elsewhere", () => {
    const end = A + 3 * P;
    const seams = new Set([A, A + P, A + 2 * P, A + 3 * P].map((l) => Math.round(l / STEP)));
    let elsewhere = 0;
    let atSeams = 0;
    for (let i = 1; i * STEP <= end; i++) {
      const d = step((i - 1) * STEP, i * STEP);
      if (seams.has(i)) atSeams = Math.max(atSeams, d);
      else elsewhere = Math.max(elsewhere, d);
    }
    expect(atSeams).toBeLessThanOrEqual(elsewhere);
    // And the story never jumps anywhere: a step (a quarter level) changes no channel by more than a few.
    expect(elsewhere).toBeLessThan(10);
  });

  it("the loop's sky starts exactly as the base's night sky", () => {
    // The base world's sky once night has fallen (src/base/world.ts).
    const night = "#151640";
    expect(toneAt(A).sky).toEqual([mix(SKY_TOP, night, 0.5), mix(SKY_MID, night, 0.4), mix(SKY_BOTTOM, night, 0.3)]);
    for (const [W, H] of SIZES) {
      for (const z of [1, MIN_ZOOM]) {
        const s = sceneAt(W, H, BARS(A), 0, z);
        expect(loopHorizon(s)).toBeCloseTo(s.horizonY, 6);
        // Higher up it keeps hanging from that horizon, however far the real one has sunk.
        expect(loopHorizon(sceneAt(W, H, BARS(A + 1.5 * P), 0, z))).toBeCloseTo(s.horizonY, 6);
      }
    }
  });

  it.each(SIZES.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the frame just before the loop and at its start look the same",
    (W, H, z) => {
      const kit = kitFor(christmas);
      const frame = (lvl: number) => {
        const s = sceneAt(W, H, BARS(lvl), 2.5, z);
        const ctx = context(s.cssW, s.cssH);
        kit.world(ctx, s);
        kit.front(ctx, s);
        return ctx.getImageData(0, 0, Math.round(s.cssW), Math.round(s.cssH)).data;
      };
      const a = frame(A - 0.002);
      const b = frame(A);
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
      expect(sum / a.length).toBeLessThan(0.05);
    },
  );

  it.each(SIZES.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: over two turns of the loop the sun and the moon keep out of the tower's column",
    (W, H, z) => {
      let sunSeen = 0;
      for (let lvl = A - 10; lvl <= A + 2 * P; lvl += 1.5) {
        const s = sceneAt(W, H, BARS(lvl), lvl * 0.37, z);
        const w = Math.round(s.cssW);
        const m = mask(s.cssW, s.cssH, (ctx) => bodies(ctx, s));
        const x0 = Math.ceil(s.baseX - s.u * 0.05);
        const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
        let column = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const x = i % w;
          if (x >= x0 && x <= x1) column++;
        }
        expect(column, `level ${lvl}: sun or moon pixels in the tower's column`).toBe(0);
        if (sunUp(lvl) > 0.5) sunSeen++;
      }
      expect(sunSeen).toBeGreaterThan(20);
    },
  );

  it.each(SIZES.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: over two turns of the loop the screen's edges never cut the sun or the moon",
    (W, H, z) => {
      // Rising and setting they pass the bottom of the screen; past the first turn no horizon hides
      // them. (Only the soft outer halo may pass a side edge, as the moon's does on the street.)
      const probe = sceneAt(W, H, BARS(A), 0, z);
      const ctx = context(probe.cssW, probe.cssH);
      for (let lvl = A - 10; lvl <= A + 2 * P; lvl += 0.5) {
        const s = sceneAt(W, H, BARS(lvl), lvl * 0.37, z);
        ctx.clearRect(0, 0, s.cssW, s.cssH);
        bodies(ctx, s);
        expect(edgePixels(ctx, 40), `level ${lvl}: sun or moon pixels on the screen's edge`).toBe(0);
      }
    },
  );

  it("by day the pigeons stand out against the sky no more than on the street", () => {
    // They cross at the height of the tower's top, so they must stay as quiet as the first pass has them.
    const kit = kitFor(christmas);
    const [W, H] = SIZES[0];
    // Seconds into the flock's cycle when it is away, so the sky shows where it flies.
    const away = 14;
    const contrast = (lvl: number): number => {
      const s = sceneAt(W, H, BARS(lvl), away);
      const ctx = context(W, H);
      kit.world(ctx, s);
      const y = Math.round(s.cssH * 0.37);
      // The darkest of a few samples in the side lanes (snow and clouds only brighten).
      const sky = Math.min(...[0.05, 0.15, 0.85, 0.95].map((f) => luminance(ctx.getImageData(Math.round(f * W), y, 1, 1).data)));
      const bird = luminance(channels(toneAt(level(s)).flyer));
      return (Math.max(sky, bird) + 0.05) / (Math.min(sky, bird) + 0.05);
    };
    let street = 0;
    for (let lvl = 10; lvl < A; lvl += 4) street = Math.max(street, contrast(lvl));
    for (let lvl = A; lvl < A + P; lvl += 2) expect(contrast(lvl), `level ${lvl}`).toBeLessThan(street * 1.1);
  });

  it("renders any height up to 2000 without errors", () => {
    const kit = kitFor(christmas);
    const [W, H] = SIZES[0];
    for (const z of [1, MIN_ZOOM]) {
      const ctx = context(W, H);
      ctx.scale(z, z);
      for (let lvl = 0; lvl <= 2000; lvl += 3.7) {
        const s = sceneAt(W, H, lvl, lvl * 0.13, z);
        expect(() => {
          kit.world(ctx, s);
          kit.front(ctx, s);
        }, `level ${lvl}`).not.toThrow();
      }
    }
  }, 30_000);

  it("stays within the frame budget at any height (390x844 @2x)", () => {
    const kit = kitFor(christmas);
    const [W, H] = SIZES[0];
    const times: number[] = [];
    for (const z of [1, MIN_ZOOM]) {
      const ctx = context(W * 2, H * 2);
      for (let lvl = 0; lvl <= 2000; lvl += 41.3) {
        const s = sceneAt(W, H, lvl, lvl * 0.13, z);
        ctx.setTransform(2 * z, 0, 0, 2 * z, 0, 0);
        const t0 = performance.now();
        kit.world(ctx, s);
        kit.front(ctx, s);
        ctx.getImageData(0, 0, 1, 1);
        times.push(performance.now() - t0);
      }
    }
    times.sort((a, b) => a - b);
    // About 7–9 ms on a laptop (as Classic); generous, as tests share the machine.
    expect(times[times.length >> 1]).toBeLessThan(40);
  }, 30_000);
});

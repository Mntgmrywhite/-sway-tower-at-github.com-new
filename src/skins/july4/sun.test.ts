import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { cloudFloor, floorTop } from "./far";
import { moonAt, sun, sunAt, SUN_REACH } from "./sky";
import { mask, overlap, sceneAt, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf, type Tone } from "./tone";

// The owner, about the newest skins: "when you get up to the cloud layer, the sun does not
// smoothly come down but shifts jarringly". Here the camera climbs a twentieth of a level at a
// time (the scene rising with it, as render.ts frames it), from the ground up through the cloud
// floor, the sunset, the night and a whole turn of the story's loop: the sun glides (it never
// moves or grows by more than twice what the bars scroll in that step, and never jumps), the
// moon stays where it hangs, and the amounts that fade things in and out change by a sliver a
// step. Fully set, the sun is wholly behind the cloud floor when it stops being drawn (every
// pixel of it under the floor's paint), so it goes without a blink, and it comes back up the
// same way at the loop's dawn. And every color of the light turns by a sliver a step too: a
// tone table in half-level steps popped the sky and the cloud floor a shade at a time.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [1024, 1366, 1],
  [1440, 900, 1],
  [390, 844, 0.6],
] as const;

/** A twentieth of a level: about a frame of the camera's climb after a drop. */
const STEP = 0.05;
const TOP = LOOP_START + LOOP + 2;

function screenAt(W: number, H: number, z: number, lvl: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, 0) : zoomedScene(W, H, z, lvl, 0);
}

/** The amounts that fade or move things as the light changes. */
const AMOUNTS = ["sunSet", "moon", "stars", "show", "finale", "smoke"] as const satisfies readonly (keyof Tone)[];

/** A color's channels, from #rrggbb or rgba(). */
function rgb(c: string): number[] {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
}

/** The largest change of any channel of any color between two tones. */
function colorStep(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    const xs = typeof x === "string" ? [x] : Array.isArray(x) ? x : [];
    const ys = typeof y === "string" ? [y] : Array.isArray(y) ? y : [];
    for (let i = 0; i < xs.length; i++) {
      const p = rgb(xs[i]!);
      const q = rgb(ys[i]!);
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(p[c]! - q[c]!));
    }
  }
  return d;
}

/** The most any color channel may change in a step of the climb (the lit windows turn fastest, at dusk and dawn). */
const COLOR_STEP = 5;

/** Every pixel the sun paints at `s` lies under the cloud floor's paint. */
function underTheFloor(s: Scene, tone: Tone, floor: number): boolean {
  const sunM = mask(s.cssW, s.cssH, (ctx) => sun(ctx, s, tone, floor));
  const floorM = mask(s.cssW, s.cssH, (ctx) => cloudFloor(ctx, s, tone, floor));
  let n = 0;
  for (const v of sunM) n += v;
  return n > 0 && overlap(sunM, floorM) === n;
}

describe("independence day's sun and moon through the climb", () => {
  it.each(SCREENS)("%ix%i at zoom %s: the sun glides down into the clouds and back up, the moon holds still", (W, H, z) => {
    let prev: { x: number; y: number; r: number; up: boolean; moon: { x: number; y: number }; s: Scene; floor: number } | null = null;
    let prevTone: Tone | null = null;
    let setting = 0;
    let sets = 0;
    let rises = 0;
    let colorMoved = 0;
    for (let i = 0; i * STEP <= TOP; i++) {
      const lvl = i * STEP;
      const s = screenAt(W, H, z, lvl);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      const { x, y, r } = sunAt(s, tone, floor);
      const up = tone.sunSet < 1;
      const m = moonAt(s);
      const now = { x, y, r, up, moon: { x: m.x, y: m.y }, s, floor };
      // The most anything may move in a step: twice what the bars scroll past in it (on the
      // virtual screen when zoomed out, whose sun has 1/z as far to go).
      const bound = (2 * STEP * BLOCK_HEIGHT * s.scale) / z;
      if (prev && prevTone) {
        const what = `level ${lvl.toFixed(2)}`;
        for (const key of AMOUNTS) {
          expect(Math.abs(tone[key] - prevTone[key]), `${what}: ${key} jumps`).toBeLessThan(0.02);
        }
        const turned = colorStep(prevTone, tone);
        colorMoved = Math.max(colorMoved, turned);
        expect(turned, `${what}: a color pops`).toBeLessThanOrEqual(COLOR_STEP);
        if (up && prev.up) {
          setting += tone.sunSet > 0 ? 1 : 0;
          expect(Math.abs(x - prev.x), `${what}: the sun jumps sideways`).toBeLessThanOrEqual(bound);
          expect(Math.abs(y - prev.y), `${what}: the sun jumps up or down`).toBeLessThanOrEqual(bound);
          expect(Math.abs(r - prev.r), `${what}: the sun's size jumps`).toBeLessThanOrEqual(bound);
        }
        // Where it goes or comes back, the sun is wholly behind the solid floor: by the geometry, and pixel by pixel.
        if (up !== prev.up) {
          const where = up ? now : prev;
          const light = up ? tone : prevTone;
          if (up) rises++;
          else sets++;
          expect(where.y - where.r * SUN_REACH, `${what}: the sun blinks ${up ? "on" : "out"} above the floor`).toBeGreaterThan(Math.min(where.floor, where.s.cssH) + s.u * 0.015);
          expect(underTheFloor(where.s, light, where.floor), `${what}: a pixel of the sun shows as it blinks ${up ? "on" : "out"}`).toBe(true);
        }
        if (tone.moon > 0 && prevTone.moon > 0) {
          expect(m.x, `${what}: the moon moves`).toBe(prev.moon.x);
          expect(m.y, `${what}: the moon moves`).toBe(prev.moon.y);
        }
      }
      prev = now;
      prevTone = tone;
    }
    expect(setting, "the sun is seen setting and rising").toBeGreaterThan(400);
    expect(sets, "the sun sets on the first day and in the loop").toBe(2);
    expect(rises, "the sun rises at the loop's dawn").toBe(1);
    expect(colorMoved, "the light turns").toBeGreaterThan(1);
  }, 60_000);
});

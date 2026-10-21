import { describe, expect, it } from "vitest";
import { afterSky } from "../valentines";
import type { Scene } from "../skin";
import { cloudFloor, floorShows, floorTop } from "./far";
import { front } from "./front";
import { moonAt, sunAt, SUN_REACH } from "./sky";
import { context, sceneAt, zoomedScene } from "./test-scene";
import { DAY_HIGH, level, LOOP, LOOP_START, toneAtLevel, toneOf } from "./tone";

// The sun and the moon glide. The owner, about the newest skins: "when you get up to the cloud
// layer, the sun does not smoothly come down but shifts jarringly". The light's colors come in
// half-level steps, and the sun's path used to step with them (a jump of a dozen pixels and more
// at every half level as it set into the clouds); now it follows the exact level. Here the
// camera climbs in fiftieths of a level, rise and all, from the ground through the cloud layer,
// the sunset, the night, and a whole turn of the loop with its dawn: at every step the sun and
// the moon move only a little, no step is much bigger than the one before (nothing jumps), and
// they fade in and out without a step. And while the sun sets and rises, the only thing ever on
// top of it is the cloud sea: never the boulevard, the far city, the lattice tower, the wheel,
// the lane or the railing; and nothing at all is ever over the moon.

/** The screens: the phones, a tablet, a wide window, and a phone zoomed out. */
const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [768, 1024, 1],
  [1440, 900, 1],
  [390, 844, 0.6],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** The climb's step, in levels. */
const STEP = 0.02;
const TOP = LOOP_START + LOOP + 2;
// (Eleven thousand steps a screen: quick alone, but the suite's pixel tests share the machine, so
// the timeouts below leave room for a loaded run.)

describe("valentine's sun and moon glide", () => {
  it.each(SCREENS)("%ix%i at zoom %s: they move a little at every step of the climb and never jump", (W, H, z) => {
    const u = screenAt(W, H, z, 0, 0).u;
    // As fast as the sun may go: a quarter of a percent of u in a fiftieth of a level (the tower
    // itself scrolls by about a third of that), and no step more than this bigger than the last;
    // on the screen, so the zoomed-out view (drawn shrunk by z) is measured at its drawn size.
    const most = u * 0.0025;
    const kink = u * 0.0004;
    let prev: { x: number; y: number; r: number; d: number; g: number } | null = null;
    let groundY = NaN;
    let moved = 0;
    let moonPrev = -1;
    let starsPrev = -1;
    let set = 0;
    for (let i = 0; i * STEP <= TOP; i++) {
      const lvl = i * STEP;
      const s = screenAt(W, H, z, lvl, 0);
      const tone = toneOf(s);
      const where = `level ${lvl.toFixed(2)}`;
      // How far the ground moved this step: the test's camera starts climbing with a kink (the
      // game's eases), and the sun's speed may change as much as the scenery's does there.
      const g = Math.abs(s.groundY - groundY) * z;
      groundY = s.groundY;
      if (tone.sunSet < 1) {
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        if (prev) {
          const d: number = (Math.hypot(sun.x - prev.x, sun.y - prev.y) + Math.abs(sun.r - prev.r)) * z;
          expect(d, `${where}: the sun moves ${d.toFixed(2)}px in a step`).toBeLessThan(most);
          if (prev.d >= 0) expect(d - prev.d, `${where}: the sun lurches`).toBeLessThan(kink + 1.5 * Math.abs(g - prev.g));
          moved = Math.max(moved, d);
          prev = { x: sun.x, y: sun.y, r: sun.r, d, g };
        } else prev = { x: sun.x, y: sun.y, r: sun.r, d: -1, g };
        set = Math.max(set, tone.sunSet);
      } else prev = null;
      // The moon stands still where the sun set, fading in at dusk and out at dawn; the stars with it.
      if (moonPrev >= 0) expect(Math.abs(tone.moon - moonPrev), `${where}: the moon pops`).toBeLessThan(0.01);
      if (starsPrev >= 0) expect(Math.abs(tone.stars - starsPrev), `${where}: the stars pop`).toBeLessThan(0.01);
      moonPrev = tone.moon;
      starsPrev = tone.stars;
    }
    expect(moved, "the sun does go down and come up").toBeGreaterThan(u * 0.0005);
    expect(set, "the sun sets all the way").toBeGreaterThan(0.99);
  }, 120_000);

  it("the light holds still between the colors' half-level steps no more: the sun's set changes inside a step", () => {
    // Two levels inside one half-level color step see the sun at different heights while it sets.
    expect(toneAtLevel(DAY_HIGH + 3.9).sunSet).not.toBe(toneAtLevel(DAY_HIGH + 4.0).sunSet);
  });

  it.each(SCREENS)("%ix%i at zoom %s: once set, the sun is wholly under the solid cloud sea", (W, H, z) => {
    for (let lvl = 30; lvl <= 50; lvl += 0.1) {
      const s = screenAt(W, H, z, lvl, 0);
      const tone = toneOf(s);
      if (tone.sunSet < 0.999 || tone.sunSet >= 1) continue;
      const floor = floorTop(s, level(s));
      const sun = sunAt(s, tone, floor);
      // The floor is solid from 0.035 u under its top (far.ts).
      expect(sun.y - sun.r * SUN_REACH, `level ${lvl.toFixed(1)}: the halo's top`).toBeGreaterThan(Math.min(floor, s.cssH) + s.u * 0.035);
    }
  });
});

/** Masks are read at half size to keep this quick. */
const K = 0.5;

/** Whether the canvas pixel at (x, y) (in its own pixels) lies inside a circle given in scene pixels. */
function inside(x: number, y: number, c: { x: number; y: number; r: number }): boolean {
  return Math.hypot((x + 0.5) / K - c.x, (y + 0.5) / K - c.y) < c.r;
}

describe("valentine's sun sets into the clouds", () => {
  // The first sunset (up through the cloud layer) and the loop's dawn, in half levels.
  const LEVELS = [
    ...Array.from({ length: 74 }, (_, i) => 16 + i * 0.5),
    ...Array.from({ length: 70 }, (_, i) => LOOP_START + i * 0.5),
  ];
  it.each(SCREENS)("%ix%i at zoom %s: only the cloud sea ever covers the sun, and nothing the moon", (W0, H0, z) => {
    let covered = 0;
    let sunUp = 0;
    let moonUp = 0;
    for (const lvl of LEVELS) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      const w = Math.floor(s.cssW * K);
      const h = Math.floor(s.cssH * K);
      // Everything painted after the sun and the moon (the lane, the far layer, the land, the cloud floor, the railing)...
      const all = context(s.cssW, s.cssH, K);
      afterSky(all, s);
      front(all, s);
      const a = all.getImageData(0, 0, w, h).data;
      // ...and the cloud sea alone: where it is on top, the whole frame shows just the cloud sea.
      const clouds = context(s.cssW, s.cssH, K);
      if (floorShows(s, floor)) cloudFloor(clouds, s, tone, floor);
      const c = clouds.getImageData(0, 0, w, h).data;
      if (tone.sunSet < 1) {
        sunUp++;
        const sun = sunAt(s, tone, floor);
        const halo = { x: sun.x, y: sun.y, r: sun.r * SUN_REACH };
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (a[i + 3]! <= 40 || !inside(x, y, halo)) continue;
            covered++;
            // (Compared with its alpha too: at the clouds' soft edges the frame is just as soft.)
            const cloud = Math.abs(a[i + 3]! - c[i + 3]!) <= 6 && Math.abs(a[i]! - c[i]!) + Math.abs(a[i + 1]! - c[i + 1]!) + Math.abs(a[i + 2]! - c[i + 2]!) <= 6;
            expect(cloud, `level ${lvl}: something other than the cloud sea over the sun at (${(x / K).toFixed(0)}, ${(y / K).toFixed(0)})`).toBe(true);
          }
        }
      }
      if (tone.moon > 0) {
        moonUp++;
        const moon = moonAt(s);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (a[i + 3]! > 40 && inside(x, y, { x: moon.x, y: moon.y, r: moon.r + 1 })) expect.fail(`level ${lvl}: something over the moon at (${(x / K).toFixed(0)}, ${(y / K).toFixed(0)})`);
          }
        }
      }
    }
    expect(sunUp, "the sun is up in these levels").toBeGreaterThan(40);
    expect(moonUp, "the moon is up in these levels").toBeGreaterThan(20);
    expect(covered, "the sun does go down into the clouds").toBeGreaterThan(100);
  }, 240_000);
});

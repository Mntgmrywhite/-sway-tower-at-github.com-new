import { describe, expect, it } from "vitest";
import { afterSky } from "../valentines";
import type { Scene } from "../skin";
import { cloudFloor, farLayer, floorShows, floorTop, landShows, latticeTower, wheel } from "./far";
import { fireworks } from "./fireworks";
import { landmarks } from "./skyline";
import { context, mask, overlap, sceneAt, zoomedScene } from "./test-scene";
import { DAY_HIGH, fireworksShow, level, LOOP, LOOP_START, sunSideShow, toneAtLevel, toneOf } from "./tone";

// The owner, 2026-10-21: "For valentines day the tower blocks the interesting stuff at higher
// stacks" (the lit boulevard block with its shops, the lattice tower and the wheel stood on the
// cloud sea right behind the tower). Above the city's fade, the standouts live in the side lanes
// and the tower's column stays quiet: plain sky over the cloud sea. Here everything the backdrop
// paints after its sky, stars, frame, moon and sun (the lane, the far layer and what stands out of
// the cloud sea, the fireworks, the land, the cloud floor) is drawn, from the level the cloud sea
// has covered the land (DAY_HIGH) up through two turns of the story's loop, on the phones, a
// tablet, a wide window and a phone zoomed out, at several moments: in the tower's column (the
// base's width and a twentieth of u either side, where the bars stand and sway, as calm.test.ts
// and drift.test.ts take it) every pixel drawn is the cloud sea's own.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [834, 1194, 1],
  [1440, 900, 1],
  [390, 844, 0.6],
] as const;
const TOP = LOOP_START + LOOP * 2;
/** Drawn at half size, every STEP levels (a level scrolls a phone's column by under a tenth of u). */
const K = 0.5;
const STEP = 1;
/** Half the tower's column (u): the base's half width and the margin calm.test.ts gives it. */
const COLUMN = 0.25;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

describe("valentine's column above the clouds", () => {
  it.each(SCREENS)("%ix%i at zoom %s: nothing but the cloud sea stands in the tower's column", (W0, H0, z) => {
    let checked = 0;
    for (let lvl = DAY_HIGH; lvl <= TOP; lvl += STEP) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 2.71) % 31);
      const tone = toneOf(s);
      const w = Math.floor(s.cssW * K);
      const h = Math.floor(s.cssH * K);
      const all = context(s.cssW, s.cssH, K);
      afterSky(all, s);
      const a = all.getImageData(0, 0, w, h).data;
      const sea = context(s.cssW, s.cssH, K);
      const floor = floorTop(s, level(s));
      if (floorShows(s, floor)) cloudFloor(sea, s, tone, floor);
      const c = sea.getImageData(0, 0, w, h).data;
      const x0 = Math.ceil((s.cssW / 2 - s.u * COLUMN) * K);
      const x1 = Math.floor((s.cssW / 2 + s.u * COLUMN) * K);
      let standout = 0;
      let first = "";
      for (let y = 0; y < h; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * w + x) * 4;
          if (a[i + 3]! <= 40) continue;
          const d = Math.abs(a[i]! - c[i]!) + Math.abs(a[i + 1]! - c[i + 1]!) + Math.abs(a[i + 2]! - c[i + 2]!) + Math.abs(a[i + 3]! - c[i + 3]!);
          if (d <= 8) continue;
          if (!standout) first = `(${(x / K).toFixed(0)}, ${(y / K).toFixed(0)})`;
          standout++;
        }
      }
      expect(standout, `level ${lvl}: pixels standing out in the tower's column, first at ${first}`).toBe(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
  }, 300_000);
});

describe("valentine's lanes keep out of the sun's way", () => {
  // What stands out of the cloud sea where the sun sets and rises (the roofs and domes on the
  // left, on a phone the whole lane) goes into the mist before the sun comes down to it and comes
  // back out once the sun is gone or high; the fireworks of hearts are a night thing. Both come
  // and go gently (no step of a twentieth of a level changes them by more than a few percent),
  // repeat with the story's loop, and are there for a good part of every turn of it. (sky.test.ts
  // checks on screen that only the cloud sea ever covers the sun.)
  it("comes and goes without a jump, round the loop, never while the sun is low", () => {
    let prevSide = sunSideShow(0);
    let prevFire = fireworksShow(0);
    let side = 0;
    let fire = 0;
    const STEP = 0.05;
    for (let lvl = STEP; lvl <= LOOP_START + LOOP * 2; lvl += STEP) {
      const s = sunSideShow(lvl);
      const f = fireworksShow(lvl);
      const sunSet = toneAtLevel(lvl).sunSet;
      const where = `level ${lvl.toFixed(2)}`;
      expect(Math.abs(s - prevSide), `${where}: the sun's side jumps`).toBeLessThan(0.03);
      expect(Math.abs(f - prevFire), `${where}: the fireworks jump`).toBeLessThan(0.03);
      if (s > 0) expect(sunSet <= 0.2 || sunSet === 1, `${where}: the sun's side shows with the sun low (set ${sunSet.toFixed(3)})`).toBe(true);
      if (f > 0) expect(sunSet, `${where}: fireworks with the sun up`).toBe(1);
      if (lvl >= LOOP_START) {
        expect(sunSideShow(lvl + LOOP), where).toBeCloseTo(s, 9);
        expect(fireworksShow(lvl + LOOP), where).toBeCloseTo(f, 9);
      }
      if (lvl >= LOOP_START && lvl < LOOP_START + LOOP) {
        if (s >= 1) side++;
        if (f >= 1) fire++;
      }
      prevSide = s;
      prevFire = f;
    }
    // Out for the night and the day, gone for the sunset and the sunrise; the fireworks all night.
    expect(side * STEP, "levels of a turn with the sun's side out").toBeGreaterThan(LOOP * 0.5);
    expect(fire * STEP, "levels of a turn with the fireworks going").toBeGreaterThan(LOOP * 0.4);
  });
});

describe("valentine's fireworks over Paris", () => {
  // The hearts go off over what stands out of the cloud sea, never behind it: no burst is half
  // hidden behind the lattice tower's top, the wheel or a dome, so each heart and each landmark
  // reads whole (a rocket may still rise behind them). Every moment of the night, through two turns
  // of the loop, on every screen: the bursts alone against the lattice tower, the wheel and the
  // landmarks (all drawn wholly out of the mist).
  it.each(SCREENS)("%ix%i at zoom %s: no heart goes off behind the lattice tower, the wheel or a landmark", (W0, H0, z) => {
    let bursts = 0;
    for (let lvl = DAY_HIGH; lvl <= TOP; lvl += 1) {
      if (fireworksShow(lvl) <= 0) continue;
      for (const dt of [0, 1.3, 2.9]) {
        const s = screenAt(W0, H0, z, lvl, (lvl * 1.37 + dt) % 24);
        const tone = toneOf(s);
        const hearts = mask(s.cssW, s.cssH, (ctx) => fireworks(ctx, s, true), K);
        let n = 0;
        for (const v of hearts) n += v;
        if (!n) continue;
        bursts++;
        const paris = mask(
          s.cssW,
          s.cssH,
          (ctx) => {
            latticeTower(ctx, s, tone);
            wheel(ctx, s, tone);
            landmarks(ctx, s, tone, 1, 1);
          },
          K,
        );
        expect(overlap(hearts, paris), `level ${lvl}, t ${s.t.toFixed(2)}: heart pixels behind the lattice tower, the wheel or a landmark`).toBe(0);
      }
    }
    expect(bursts, "moments with hearts going off").toBeGreaterThan(150);
  }, 300_000);
});

describe("valentine's city goes into the mist without a jump", () => {
  // The far city is drawn until the cloud sea covers the land, with the lattice tower and the wheel
  // in it; then they stand on their own, among the lanes' rooftops and the landmarks coming out of
  // the mist. The moment it goes nothing may change depth: the back rooftops and the landmarks are
  // behind the lattice tower and the wheel either side of it (they once covered their legs, then
  // dropped behind them in a single step). The far layer a ten-thousandth of a level either side
  // of that moment is the same picture but for anti-aliasing.
  it.each(SCREENS)("%ix%i at zoom %s: the far layer is the same picture either side of the city's going", (W0, H0, z) => {
    const shows = (lvl: number) => {
      const s = screenAt(W0, H0, z, lvl, 3);
      return landShows(s, floorTop(s, level(s)));
    };
    let a = DAY_HIGH - 10;
    let b = DAY_HIGH;
    expect(shows(a) && !shows(b)).toBe(true);
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (shows(m)) a = m;
      else b = m;
    }
    const far = (lvl: number) => {
      const s = screenAt(W0, H0, z, lvl, 3);
      const ctx = context(s.cssW, s.cssH);
      // (On a solid ground, so the city's last faint trace counts for what it shows.)
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, s.cssW, s.cssH);
      farLayer(ctx, s, toneOf(s), floorTop(s, level(s)));
      return ctx.getImageData(0, 0, s.cssW, s.cssH).data;
    };
    const before = far(a - 1e-4);
    const after = far(b + 1e-4);
    let jumped = 0;
    for (let i = 0; i < before.length; i += 4) {
      const d = Math.abs(before[i]! - after[i]!) + Math.abs(before[i + 1]! - after[i + 1]!) + Math.abs(before[i + 2]! - after[i + 2]!) + Math.abs(before[i + 3]! - after[i + 3]!);
      if (d > 40) jumped++;
    }
    expect(jumped, `pixels that jump as the city goes at level ${b.toFixed(4)}`).toBeLessThan(30);
  });
});

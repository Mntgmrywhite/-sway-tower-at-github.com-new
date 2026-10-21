import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drawDrifter, drifters, eachVisible, type Drifter } from "./drift";
import { bridge, castle, chapelAt, cloudFloor, farLayer, farmhouses, farSheep, floorTop, hooker, landShows, monastery } from "./far";
import { front } from "./front";
import { meadowBack, rainbowArc } from "./meadow";
import { MOON_REACH, moonAt, morningStarAt, shootingStar, stars, sunAt, SUN_REACH } from "./sky";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";
import { roundTower } from "./tower";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps (rain included, while it falls). And the
// owner's rule: nothing ever passes over the sun or the moon, at any height, on any screen,
// zoomed out or not: no cloud, no bird, no rain, no shooting star.

const TOP = LOOP_START + LOOP * 2 + 12;
const LEVELS = Array.from({ length: Math.ceil(TOP / 2) + 1 }, (_, i) => i * 2);
/** Two moments, plus one in the heart of the shower so the rain is checked at its fullest. */
const TIMES = [0, 5.3, 8.9] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("st. patrick's drifters", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: the lane stays clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    const kinds = new Set<string>();
    let rained = false;
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const items: { d: Drifter; m: Uint8Array }[] = [];
      eachVisible(s, (d) => items.push({ d: { ...d }, m: mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K) }));
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      items.forEach(({ d, m }, i) => {
        kinds.add(d.kind);
        if (d.rain && tone.rain > 0.5) rained = true;
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
          expect(overlap(m, items[j]!.m), `${what} overlaps ${items[j]!.d.kind} at ${Math.round(items[j]!.d.at)}`).toBe(0);
        }
      });
    }
    // Every kind of drifter was on screen at some point on the way up, and it rained.
    expect([...kinds].sort()).toEqual(["cloud", "geese", "larks", "rainbow", "swallows", "swans"]);
    expect(rained, "a rain cloud passes through the shower").toBe(true);
  }, 120_000);
});

/** The screens the sun and moon are checked on: phones, a tablet, a wide desktop window, and zoomed out (the virtual screen up to 1/0.6 the phone's size). */
const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [1024, 1366, 1],
  [1440, 900, 1],
  [390, 844, 0.8],
  [390, 844, 0.6],
  [375, 667, 0.8],
  [375, 667, 0.6],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** Pixels drawn (alpha above a faint anti-aliased edge) inside a circle, read from a canvas drawn at K times the scene's size. */
function inCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): number {
  const x0 = Math.max(0, Math.floor((cx - r) * K));
  const y0 = Math.max(0, Math.floor((cy - r) * K));
  const x1 = Math.min(ctx.canvas.width, Math.ceil((cx + r) * K));
  const y1 = Math.min(ctx.canvas.height, Math.ceil((cy + r) * K));
  if (x1 <= x0 || y1 <= y0) return 0;
  const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[((y - y0) * (x1 - x0) + (x - x0)) * 4 + 3]! <= 40) continue;
      if (Math.hypot((x + 0.5) / K - cx, (y + 0.5) / K - cy) < r) n++;
    }
  }
  return n;
}

describe("st. patrick's sun and moon", () => {
  // The owner saw a stream of lane clouds slide down across the sun, one after another, slicing
  // it as the camera climbed. Now nothing passes over the sun (its disc and its halo, wherever it
  // stands as it sets and rises) or the moon, at every half level from the start, through the
  // first day and two turns of the loop.
  it.each(SCREENS)("%ix%i at zoom %s: nothing drifts over the sun or the moon at any height", (W0, H0, z) => {
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    let drawn = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      // The drifters sway, bob and rain with the clock: a different moment at every height.
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      eachVisible(s, (d) => {
        drawn++;
        drawDrifter(ctx, s, tone, d);
      });
      if (tone.sunSet < 1) {
        sunChecked++;
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something drifts over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r * MOON_REACH + 1), `level ${lvl}: something drifts over the moon`).toBe(0);
      }
    }
    expect(drawn, "the lane is busy").toBeGreaterThan(500);
    expect(sunChecked, "the sun is up").toBeGreaterThan(200);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

  it.each(SCREENS)("%ix%i at zoom %s: no shooting star streaks across the moon", (W0, H0, z) => {
    // Shooting stars come only at night, when the moon is up: every one of the first 300 streaks,
    // frame by frame, on a night of the first day and one of the loop.
    let streaks = 0;
    for (const lvl of [100, LOOP_START + LOOP + 4]) {
      const s0 = screenAt(W0, H0, z, lvl, 0);
      const tone = toneOf(s0);
      expect(tone.stars, `level ${lvl}: night`).toBeGreaterThan(0.6);
      const moon = moonAt(s0);
      const ctx = context(s0.cssW, s0.cssH, K);
      for (let n = 0; n < 300; n++) {
        let shown = false;
        for (let k = 0; k <= 1; k += 0.05) {
          const s = { ...s0, t: n * 6.3 + k * 0.75 };
          ctx.clearRect(0, 0, s.cssW, s.cssH);
          shootingStar(ctx, s, tone);
          expect(inCircle(ctx, moon.x, moon.y, moon.r * MOON_REACH + 2), `level ${lvl}, t=${s.t.toFixed(2)}: a shooting star over the moon`).toBe(0);
          if (!shown && ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data.some((v, i) => i % 4 === 3 && v > 40)) shown = true;
        }
        if (shown) streaks++;
      }
    }
    expect(streaks, "shooting stars streak by").toBeGreaterThan(300);
  }, 120_000);

  it.each(SCREENS)("%ix%i at zoom %s: nothing in the whole scene passes over the sun by day or the moon at all", (W0, H0, z) => {
    // Not just the lane: everything the scene paints after the sun and the moon (the far land and
    // mountains, the lane, the meadow, the round tower, the cloud floor, the wall in front). The
    // sun is clear all day, until it begins to set into the cloud floor (and from when it has
    // risen out of it at the loop's dawn); the moon is clear whenever it is up.
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      farLayer(ctx, s, tone, floor);
      drifters(ctx, s, tone);
      meadowBack(ctx, s);
      roundTower(ctx, s);
      if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
      front(ctx, s);
      if (tone.sunSet === 0) {
        sunChecked++;
        const sun = sunAt(s, tone, floor);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r * MOON_REACH + 1), `level ${lvl}: something passes over the moon`).toBe(0);
      }
    }
    expect(sunChecked, "the sun is up").toBeGreaterThan(150);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

  it("the sun rises at dawn only once the moon has gone from where it rises", () => {
    for (const [W0, H0, z] of SCREENS) {
      for (let lvl = 0; lvl <= TOP; lvl += 0.25) {
        const s = screenAt(W0, H0, z, lvl, 0);
        const tone = toneOf(s);
        if (tone.sunSet >= 1 || tone.moon <= 0) continue;
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        const { x, y, r } = sun;
        const moon = moonAt(s);
        expect(Math.hypot(x - moon.x, y - moon.y), `${W0}x${H0} at zoom ${z}, level ${lvl}: the sun meets the moon`).toBeGreaterThan(r * SUN_REACH + moon.r * MOON_REACH);
      }
    }
  });
});

describe("st. patrick's drifters over the land", () => {
  // While the land still shows (until the cloud floor covers it), what comes down the lanes may
  // pass in front of the plain hills, the sea and its cliffs, but never over the far props (the
  // castle, the farmhouse and the beehive huts, the round tower and cross on the headland, the
  // sheep, the bridge, the hooker on the bay, the chapel) or the rainbow coming down into the
  // pot of gold.
  const PROPS_LEVELS = Array.from({ length: 46 }, (_, i) => i);
  it.each(SIZES.flatMap(([W, H]) => [0, 5.3, 11].map((t) => [W, H, t] as const)))("%ix%i at t=%s: nothing drifts over the far props", (W, H, t) => {
    let checked = 0;
    for (const lvl of PROPS_LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      if (!landShows(s, floorTop(s, level(s)))) continue;
      const props = mask(W, H, (ctx) => {
        monastery(ctx, s, tone);
        farSheep(ctx, s, tone);
        farmhouses(ctx, s, tone);
        castle(ctx, s, tone);
        hooker(ctx, s, tone);
        bridge(ctx, s, tone);
        rainbowArc(ctx, s);
        const c = chapelAt(s);
        ctx.fillRect(c.x - s.u * 0.016, c.y - s.u * 0.036, s.u * 0.032, s.u * 0.036);
      });
      eachVisible(s, (d) => {
        checked++;
        const m = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d));
        expect(overlap(m, props), `level ${lvl}: ${d.kind} at ${Math.round(d.at)} over the far props`).toBe(0);
      });
    }
    expect(checked, "drifters seen while the land shows").toBeGreaterThan(10);
  }, 60_000);
});

describe("st. patrick's lanes in the loop", () => {
  // Past LOOP_START the lanes come round again with the story: at L and L + LOOP the same things
  // stand at the same places on screen.
  it.each([LOOP_START, LOOP_START + 7, LOOP_START + 30, LOOP_START + 61, LOOP_START + 95, LOOP_START + 120])("level %i matches a loop later and two", (lvl) => {
    const seen = (l: number) => {
      const s = sceneAt(390, 844, l, 4.2);
      const out: string[] = [];
      eachVisible(s, (d) => out.push(`${d.kind}:${Math.round((s.groundY - s.rise * 0.3 - d.at * s.scale * 0.7) * 10)}:${d.x.toFixed(4)}`));
      return out.join(" ");
    };
    const now = seen(lvl);
    expect(now.length, "something is in the lanes").toBeGreaterThan(0);
    expect(seen(lvl + LOOP)).toBe(now);
    expect(seen(lvl + LOOP * 2)).toBe(now);
  });

  it.each(SIZES)("%ix%i: the morning star stays clear of the lane's birds", (W, H) => {
    // It hangs in the lane at dawn; only clouds may pass it.
    const ctx = context(W, H, K);
    let seen = 0;
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      if (tone.morningStar <= 0.01) continue;
      seen++;
      const star = morningStarAt(s);
      ctx.clearRect(0, 0, W, H);
      eachVisible(s, (d) => {
        if (d.kind !== "cloud") drawDrifter(ctx, s, tone, d);
      });
      expect(inCircle(ctx, star.x, star.y, s.u * 0.035), `level ${lvl}: a bird crosses the morning star`).toBe(0);
    }
    expect(seen, "the morning star shows at dawn").toBeGreaterThan(10);
  }, 60_000);
});

describe("st. patrick's lanes zoomed out", () => {
  // Hard mode's zoomed-out view is up to 1/0.6 times wider and taller at the same u: the lanes
  // keep to their places either side of the tower, nothing reaches the virtual screen's sides.
  it.each(SIZES.flatMap(([W, H]) => [0.6, 0.8].map((z) => [W, H, z] as const)))("%ix%i at zoom %s: lanes stay clear", (W0, H0, z) => {
    for (let lvl = 0; lvl < LOOP_START + LOOP; lvl += 6) {
      const s = zoomedScene(W0, H0, z, lvl, 3);
      const W = Math.round(s.cssW);
      const H = Math.round(s.cssH);
      const tone = toneOf(s);
      const w = Math.round(W * K);
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      eachVisible(s, (d) => {
        const m = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K);
        let column = 0;
        let edge = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = k % w;
          if (x >= c0 && x <= c1) column++;
          if (x === 0 || x === w - 1) edge++;
        }
        expect(column, `level ${lvl}: ${d.kind} in the column`).toBe(0);
        expect(edge, `level ${lvl}: ${d.kind} on a side`).toBe(0);
      });
    }
  }, 60_000);
});

describe("st. patrick's stars", () => {
  // The night's stars are spread across the screen, kept in from its sides so no sparkle is cut
  // in half by an edge.
  it.each(SIZES.flatMap(([W, H]) => [100, LOOP_START + LOOP + 3].map((lvl) => [W, H, lvl] as const)))("%ix%i at level %i: no star touches a side", (W, H, lvl) => {
    const s = sceneAt(W, H, lvl, 0);
    const m = mask(W, H, (ctx) => stars(ctx, s, toneOf(s)));
    let edge = 0;
    let drawn = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      drawn++;
      const x = i % W;
      if (x <= 1 || x >= W - 2) edge++;
    }
    expect(drawn, "stars are out").toBeGreaterThan(50);
    expect(edge, "star pixels on a side of the screen").toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drawDrifter, drifters, eachVisible, type Drifter } from "./drift";
import { cloudFloor, farBack, farFront, floorTop, landmarkLine, landShows } from "./far";
import { church, courthouse } from "./landmarks";
import { fireworks } from "./fireworks";
import { front } from "./front";
import { parade } from "./parade";
import { moonAt, sunAt, SUN_REACH } from "./sky";
import { bandstand, barbecue, hedge, lampPosts, lawn, path, sparklerKids } from "./square";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { trees, waterTower } from "./town";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps. And the owner's rule: nothing ever passes
// over the sun or the moon, at any height, on any screen, zoomed out or not: no balloon, bird,
// plane, kite, puff of smoke, or firework.

const TOP = LOOP_START + LOOP * 2 + 12;
const LEVELS = Array.from({ length: Math.ceil(TOP / 2) + 1 }, (_, i) => i * 2);
const TIMES = [0, 5.3, 8.9] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("independence day's drifters", () => {
  // On both phones at three moments, and on the most zoomed-out view (the virtual screen 1/0.6 the tall phone's size).
  const VIEWS = [...SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, 1, t] as const)), [390, 844, 0.6, 5.3] as const];
  it.each(VIEWS)("%ix%i at zoom %s, t=%s: the lane stays clear all the way up", (W0, H0, z, t) => {
    const W = z === 1 ? W0 : zoomedScene(W0, H0, z, 0, 0).cssW;
    const H = z === 1 ? H0 : zoomedScene(W0, H0, z, 0, 0).cssH;
    const w = Math.round(W * K);
    const kinds = new Set<string>();
    for (const lvl of LEVELS) {
      const s = z === 1 ? sceneAt(W0, H0, lvl, t) : zoomedScene(W0, H0, z, lvl, t);
      const tone = toneOf(s);
      const items: { d: Drifter; m: Uint8Array }[] = [];
      eachVisible(s, (d) => items.push({ d: { ...d }, m: mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K) }));
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      items.forEach(({ d, m }, i) => {
        kinds.add(d.kind);
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
    // Every kind of drifter was on screen at some point on the way up.
    expect([...kinds].sort()).toEqual(["balloons", "biplane", "birds", "blimp", "eagle", "hotair", "jumper", "kite", "smoke", "stunt"]);
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

/**
 * Everything the scene paints after the sun and the moon; without `clouds`, all but the cloud
 * sea (the floor and the cloud bank piled on it), which alone may cover the sun as it sets and rises.
 */
function afterSky(ctx: CanvasRenderingContext2D, s: Scene, clouds = true): void {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  // The far layer as the backdrop draws it, the show and the lane between its back and its front; without the clouds, less the cumulus.
  farBack(ctx, s, tone, floor, clouds);
  drifters(ctx, s, tone);
  fireworks(ctx, s, tone, floor);
  farFront(ctx, s, tone, floor);
  if (landShows(s) && s.horizonY < s.cssH) {
    lawn(ctx, s, tone);
    hedge(ctx, s, tone);
    lampPosts(ctx, s, tone);
    path(ctx, s);
    barbecue(ctx, s);
    sparklerKids(ctx, s);
    bandstand(ctx, s);
    parade(ctx, s);
  }
  if (clouds && floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
  front(ctx, s);
}

describe("independence day's sun and moon", () => {
  // Nothing passes over the sun (its disc and its halo, wherever it stands as it sets and rises)
  // or the moon, at every half level from the start, through the first day and two turns of the
  // loop: not the lane, and not the fireworks either.
  it.each(SCREENS)("%ix%i at zoom %s: nothing drifts or bursts over the sun or the moon at any height", (W0, H0, z) => {
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    let drawn = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      // The drifters sway and bob, and the shells go up and burst, with the clock: a different moment at every height.
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      fireworks(ctx, s, tone, floor);
      eachVisible(s, (d) => {
        drawn++;
        drawDrifter(ctx, s, tone, d);
      });
      if (tone.sunSet < 1) {
        sunChecked++;
        const sun = sunAt(s, tone, floor);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something drifts over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something drifts over the moon`).toBe(0);
      }
    }
    expect(drawn, "the lane is busy").toBeGreaterThan(400);
    expect(sunChecked, "the sun is up").toBeGreaterThan(200);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 120_000);

  it.each(SCREENS)("%ix%i at zoom %s: nothing in the whole scene passes over the sun or the moon, but the clouds it sets into", (W0, H0, z) => {
    // Not just the lane: everything the scene paints after the sun and the moon (the show, the
    // far town and landmarks, the lane, the square, the parade, the cloud floor, the street in
    // front). The sun is clear all day; as it sets into the cloud floor (and rises out of it at
    // the loop's dawn) only the cloud sea may cover it; the moon is clear whenever it is up.
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let settingChecked = 0;
    let moonChecked = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const sun = sunAt(s, tone, floorTop(s, level(s)));
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      afterSky(ctx, s);
      if (tone.sunSet === 0) {
        sunChecked++;
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something passes over the moon`).toBe(0);
      }
      if (tone.sunSet > 0 && tone.sunSet < 1) {
        settingChecked++;
        ctx.clearRect(0, 0, s.cssW, s.cssH);
        afterSky(ctx, s, false);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something but the clouds passes over the setting sun`).toBe(0);
      }
    }
    expect(sunChecked, "the sun is up").toBeGreaterThan(120);
    expect(settingChecked, "the sun sets and rises").toBeGreaterThan(120);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 120_000);

  it("the sun rises at dawn only once the moon has gone from where it rises", () => {
    for (const [W0, H0, z] of SCREENS) {
      for (let lvl = 0; lvl <= TOP; lvl += 0.25) {
        const s = screenAt(W0, H0, z, lvl, 0);
        const tone = toneOf(s);
        if (tone.sunSet >= 1 || tone.moon <= 0) continue;
        const { x, y, r } = sunAt(s, tone, floorTop(s, level(s)));
        const moon = moonAt(s);
        expect(Math.hypot(x - moon.x, y - moon.y), `${W0}x${H0} at zoom ${z}, level ${lvl}: the sun meets the moon`).toBeGreaterThan(r * SUN_REACH + moon.r);
      }
    }
  });
});

describe("independence day's drifters over the land", () => {
  // While the land still shows (until the cloud floor covers it), what comes down the lane may
  // pass in front of the plain hills, the park and the clouds but never over the church, the
  // courthouse, the water tower, the big trees or the lamp posts. Up to the last moment: then the
  // lane comes in front of the landmarks standing out of the cloud sea (july4.ts), so anything
  // overlapping them then would jump from behind them to in front.
  const PROPS_LEVELS = [...Array.from({ length: 32 }, (_, i) => i), 28.5, 28.8, 28.95, 28.99];
  // The moments include the swifts wheeling out to the left edge of their flock (about 20 s).
  it.each(SIZES.flatMap(([W, H]) => [0, 5.3, 11, 19.6, 20.3].map((t) => [W, H, t] as const)))("%ix%i at t=%s: nothing drifts over the far props", (W, H, t) => {
    let checked = 0;
    for (const lvl of PROPS_LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      if (!landShows(s)) continue;
      const props = mask(W, H, (ctx) => {
        const line = landmarkLine(s);
        church(ctx, s, tone, line, true);
        courthouse(ctx, s, tone, line, true);
        waterTower(ctx, s, tone, line);
        trees(ctx, s, tone);
        lampPosts(ctx, s, tone);
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

describe("independence day's lanes in the loop", () => {
  // Past LOOP_START the lane comes round again with the story: at L and L + LOOP the same
  // things stand at the same places on screen.
  it.each([LOOP_START, LOOP_START + 7, LOOP_START + 30, LOOP_START + 61, LOOP_START + 95, LOOP_START + 120])("level %i matches a loop later and two", (lvl) => {
    const seen = (l: number) => {
      const s = sceneAt(390, 844, l, 4.2);
      const out: string[] = [];
      eachVisible(s, (d) => out.push(`${d.kind}:${Math.round((s.groundY - s.rise * 0.3 - d.at * s.scale * 0.7) * 10)}:${d.x.toFixed(4)}`));
      return out.join(" ");
    };
    const now = seen(lvl);
    expect(now.length, "something is in the lane").toBeGreaterThan(0);
    expect(seen(lvl + LOOP)).toBe(now);
    expect(seen(lvl + LOOP * 2)).toBe(now);
  });
});

import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drawDrifter, drifters, eachVisible, type Drifter } from "./drift";
import { church, cloudFloor, farLayer, farLine, floorTop, house, landShows, steeple } from "./far";
import { band, dancers } from "./folk";
import { front } from "./front";
import { bandstand, maypole, meadowNear, tent, trodden } from "./ground";
import { parade, waitress } from "./parade";
import { moonAt, stars, sunAt, SUN_REACH, sunSetAt } from "./sky";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, lightAt, LOOP, LOOP_START, toneOf } from "./tone";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps. And the owner's rule: nothing ever
// passes over the sun or the moon, at any height, on any screen, zoomed out or not: no cloud,
// no balloon, no lantern, nothing in the scene.

const TOP = LOOP_START + LOOP * 2 + 12;
const LEVELS = Array.from({ length: Math.ceil(TOP / 2) + 1 }, (_, i) => i * 2);
const TIMES = [0, 5.3, 8.9] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("oktoberfest drifters", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: the lane stays clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    const kinds = new Set<string>();
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
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
    expect([...kinds].sort()).toEqual(["balloons", "cloud", "hotair", "lantern", "pennants", "pretzel"]);
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

describe("oktoberfest sun and moon", () => {
  it.each(SCREENS)("%ix%i at zoom %s: nothing drifts over the sun or the moon at any height", (W0, H0, z) => {
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    let drawn = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      // The drifters sway and bob with the clock: a different moment at every height.
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      eachVisible(s, (d) => {
        drawn++;
        drawDrifter(ctx, s, tone, d);
      });
      if (sunSetAt(s) < 1) {
        sunChecked++;
        const sun = sunAt(s, floorTop(s, level(s)));
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something drifts over the sun`).toBe(0);
      }
      if (lightAt(level(s)).moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something drifts over the moon`).toBe(0);
      }
    }
    expect(drawn, "the lane is busy").toBeGreaterThan(400);
    expect(sunChecked, "the sun is up").toBeGreaterThan(200);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

  it.each(SCREENS)("%ix%i at zoom %s: nothing in the whole scene passes over the sun by day or the moon at all", (W0, H0, z) => {
    // Not just the lane: everything the scene paints after the sun and the moon (the Alps and
    // the fair, the lane, the meadow, the tent, the folk, the parade, the mist, the stalls in
    // front). The sun is clear all day, until it begins to set into the mist (and from when it
    // has risen out of it at the loop's dawn); the moon is clear whenever it is up.
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
      meadowNear(ctx, s);
      trodden(ctx, s);
      maypole(ctx, s);
      tent(ctx, s, tone);
      bandstand(ctx, s);
      band(ctx, s);
      dancers(ctx, s);
      parade(ctx, s);
      waitress(ctx, s);
      if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
      front(ctx, s);
      if (sunSetAt(s) === 0) {
        sunChecked++;
        const sun = sunAt(s, floor);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (lightAt(level(s)).moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something passes over the moon`).toBe(0);
      }
    }
    expect(sunChecked, "the sun is up").toBeGreaterThan(120);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

  it("the sun rises at dawn only once the moon has gone from where it rises", () => {
    for (const [W0, H0, z] of SCREENS) {
      for (let lvl = 0; lvl <= TOP; lvl += 0.25) {
        const s = screenAt(W0, H0, z, lvl, 0);
        if (sunSetAt(s) >= 1 || lightAt(level(s)).moon <= 0) continue;
        const sun = sunAt(s, floorTop(s, level(s)));
        const moon = moonAt(s);
        expect(Math.hypot(sun.x - moon.x, sun.y - moon.y), `${W0}x${H0} at zoom ${z}, level ${lvl}: the sun meets the moon`).toBeGreaterThan(sun.r * SUN_REACH + moon.r);
      }
    }
  });
});

describe("oktoberfest drifters over the land", () => {
  // While the land still shows (until the mist covers it), what comes down the lane never
  // passes over the village on the right (the church and the house).
  const PROPS_LEVELS = Array.from({ length: 46 }, (_, i) => i);
  it.each(SIZES.flatMap(([W, H]) => [0, 5.3, 11].map((t) => [W, H, t] as const)))("%ix%i at t=%s: nothing drifts over the village", (W, H, t) => {
    let checked = 0;
    for (const lvl of PROPS_LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      if (!landShows(s, floorTop(s, level(s)))) continue;
      const props = mask(W, H, (ctx) => {
        church(ctx, s, tone, farLine(s));
        house(ctx, s, tone, farLine(s));
      });
      eachVisible(s, (d) => {
        checked++;
        const m = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d));
        expect(overlap(m, props), `level ${lvl}: ${d.kind} at ${Math.round(d.at)} over the village`).toBe(0);
      });
    }
    expect(checked, "drifters seen while the land shows").toBeGreaterThan(10);
  }, 60_000);

  it.each([...SIZES.map(([W, H]) => [W, H, 1] as const), [390, 844, 0.6] as const, [375, 667, 0.6] as const])(
    "%ix%i at zoom %s: nothing ever passes over what shows of the village, at any height",
    (W0, H0, z) => {
      // Not only while the land shows: once the mist has gathered, whatever of the church and the
      // house still stands out of it (the steeple; the nave's and the house's roofs are buried,
      // far.ts VILLAGE_FOOT) is clear of everything the lane brings down, all the way up through
      // two turns of the loop. (The builder's first cut let the pretzel balloon, the lanterns and
      // the clouds pass over the two roofs peeking out of the mist on their way into it.)
      const probe = z === 1 ? sceneAt(W0, H0, 0, 0) : zoomedScene(W0, H0, z, 0, 0);
      const W = probe.cssW;
      const H = probe.cssH;
      let checked = 0;
      let shownTotal = 0;
      for (let lvl = 0; lvl <= TOP; lvl += 1) {
        const s = z === 1 ? sceneAt(W0, H0, lvl, (lvl * 1.37) % 23) : zoomedScene(W0, H0, z, lvl, (lvl * 1.37) % 23);
        const tone = toneOf(s);
        const floor = floorTop(s, level(s));
        const village = mask(
          W,
          H,
          (ctx) => {
            church(ctx, s, tone, farLine(s));
            house(ctx, s, tone, farLine(s));
          },
          K,
        );
        const mist = floor < H + s.u * 0.15 ? mask(W, H, (ctx) => cloudFloor(ctx, s, tone, floor), K) : null;
        let shown = 0;
        for (let i = 0; i < village.length; i++) {
          if (mist && mist[i]) village[i] = 0;
          shown += village[i]!;
        }
        if (!shown) continue;
        checked++;
        shownTotal += shown;
        const lane = mask(W, H, (ctx) => drifters(ctx, s, tone), K);
        expect(overlap(village, lane), `level ${lvl}: lane pixels over the village`).toBe(0);
      }
      expect(checked, "the village shows").toBeGreaterThan(100);
      expect(shownTotal / checked, "the steeple stands out of the mist").toBeGreaterThan(20 * K * K * (probe.u / 390) ** 2);
    },
    120_000,
  );

  it.each(SIZES)("%ix%i: nothing ever passes over the church's steeple, which stands out of the mist for good", (W, H) => {
    // (The nave beside it and the house are buried in the mist once it has settled; only the steeple stands out.)
    const ctx = context(W, H, K);
    let seen = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 1) {
      const s = sceneAt(W, H, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const tower = mask(W, H, (c) => steeple(c, s, tone, farLine(s)), K);
      let any = 0;
      for (let i = 0; i < tower.length; i++) any += tower[i]!;
      if (!any) continue;
      seen++;
      ctx.clearRect(0, 0, W, H);
      drifters(ctx, s, tone);
      const data = ctx.getImageData(0, 0, Math.round(W * K), Math.round(H * K)).data;
      let over = 0;
      for (let i = 0; i < tower.length; i++) if (tower[i] && data[i * 4 + 3]! > 40) over++;
      expect(over, `level ${lvl}: lane pixels over the steeple`).toBe(0);
    }
    expect(seen, "the church is on screen").toBeGreaterThan(100);
  }, 60_000);
});

describe("oktoberfest lanes in the loop", () => {
  // Past LOOP_START the lane comes round again with the story: at L and L + LOOP the same things
  // stand at the same places on screen.
  it.each([LOOP_START, LOOP_START + 7, LOOP_START + 30, LOOP_START + 61, LOOP_START + 95])("level %i matches a loop later and two", (lvl) => {
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

describe("oktoberfest lanes zoomed out", () => {
  // The zoomed-out view is up to 1/0.6 times wider and taller at the same u: the lane keeps to
  // its place beside the tower, nothing reaches the virtual screen's sides.
  it.each(SIZES.flatMap(([W, H]) => [0.6, 0.8].map((z) => [W, H, z] as const)))("%ix%i at zoom %s: the lane stays clear", (W0, H0, z) => {
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

describe("oktoberfest stars", () => {
  // The night's stars are spread across the screen, kept in from its sides so no sparkle is cut
  // in half by an edge, and out of the tower's column.
  it.each(SIZES.flatMap(([W, H]) => [72, LOOP_START + LOOP + 3].map((lvl) => [W, H, lvl] as const)))("%ix%i at level %i: no star touches a side or the column", (W, H, lvl) => {
    const s = sceneAt(W, H, lvl, 0);
    const m = mask(W, H, (ctx) => stars(ctx, s));
    const c0 = W / 2 - s.u * 0.25;
    const c1 = W / 2 + s.u * 0.25;
    let edge = 0;
    let column = 0;
    let drawn = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      drawn++;
      const x = i % W;
      if (x <= 1 || x >= W - 2) edge++;
      if (x >= c0 && x <= c1) column++;
    }
    expect(drawn, "stars are out").toBeGreaterThan(50);
    expect(edge, "star pixels on a side of the screen").toBe(0);
    expect(column, "star pixels in the tower's column").toBe(0);
  });
});

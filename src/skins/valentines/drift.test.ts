import { describe, expect, it } from "vitest";
import { afterSky, scenery } from "../valentines";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible, type Drifter } from "./drift";
import { floorTop } from "./far";
import { front } from "./front";
import { moonAt, stars, sunAt, SUN_REACH } from "./sky";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps. And the owner's rule: nothing ever passes
// over the sun or the moon, at any height, on any screen, zoomed out or not: no cloud, no
// petal, no balloon (heart or hot-air), no plane, no dove. Nor across any prop: the lane is
// painted behind the scenery, so what comes down it sinks behind the wheel, the lattice tower,
// the boulevard, Paris's rooftops and the cloud bank into the cloud sea.

const TOP = LOOP_START + LOOP * 2 + 12;
const LEVELS = Array.from({ length: Math.ceil(TOP / 2) + 1 }, (_, i) => i * 2);
/** Three moments, over the petals' fall, the balloons' rise and the plane's loop. */
const TIMES = [0, 5.3, 8.9] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("valentine's drifters", () => {
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
    expect([...kinds].sort()).toEqual(["balloons", "cloud", "doves", "montgolfier", "petals", "plane"]);
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

describe("valentine's sun and moon", () => {
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
      if (tone.sunSet < 1) {
        sunChecked++;
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something drifts over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something drifts over the moon`).toBe(0);
      }
    }
    expect(drawn, "the lane is busy").toBeGreaterThan(500);
    expect(sunChecked, "the sun is up").toBeGreaterThan(200);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

  it.each(SCREENS)("%ix%i at zoom %s: nothing in the whole scene passes over the sun by day or the moon at all", (W0, H0, z) => {
    // Not just the lane: everything the scene paints after the sun and the moon (the far layer,
    // the lane, the boulevard, the lawn and the canal, the plaza and the fountain, the cloud
    // floor, the railing in front). The sun is clear all day, until it begins to set into the
    // cloud bank (and from when it has risen out of it at the loop's dawn); the moon is clear
    // whenever it is up.
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    // Half levels on a phone (zoomed out or not); whole ones on the big screens, whose frames cost
    // the most (nothing can slip past between samples: a level scrolls the scenery about half the
    // moon's width, and the lane less).
    const step = W0 > 600 ? 1 : 0.5;
    for (let lvl = 0; lvl <= TOP; lvl += step) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      // The backdrop but its sky, stars, moon and sun (on a clear canvas, so what is drawn shows), and the railing.
      afterSky(ctx, s);
      front(ctx, s);
      if (tone.sunSet === 0) {
        sunChecked++;
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something passes over the moon`).toBe(0);
      }
    }
    // (The sun starts setting at level 17, and the zoomed-out views hold their camera up past the
    // lowest levels. While it sets and rises, sky.test.ts checks that only the cloud sea covers it.)
    expect(sunChecked, "the sun is up").toBeGreaterThan(15);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 300_000);

  it("the sun rises at dawn only once the moon has gone from where it rises", () => {
    for (const [W0, H0, z] of SCREENS) {
      for (let lvl = 0; lvl <= TOP; lvl += 0.25) {
        const s = screenAt(W0, H0, z, lvl, 0);
        const tone = toneOf(s);
        if (tone.sunSet >= 1 || tone.moon <= 0) continue;
        const sun = sunAt(s, tone, floorTop(s, level(s)));
        const moon = moonAt(s);
        expect(Math.hypot(sun.x - moon.x, sun.y - moon.y), `${W0}x${H0} at zoom ${z}, level ${lvl}: the sun meets the moon`).toBeGreaterThan(sun.r * SUN_REACH + moon.r);
      }
    }
  });
});

describe("valentine's lane behind the scenery", () => {
  // Nothing in the lane ever slides across a prop, at any height, day or night: the lane is
  // painted before the scenery (the cloud bank and the hills, the fair hill and its wheel, the
  // boulevard and its couple, the canal, the bridge and the swans, the garden, the cloud floor),
  // so wherever the scenery paints a solid pixel, the frame with the lane is the frame without
  // it. And the lane does come down behind the scenery (the doves behind the wheel in the first
  // levels, everything into the cloud sea at night), so the order is what keeps it clear.
  it.each(SIZES.flatMap(([W, H]) => [0, 5.3, 11].map((t) => [W, H, t] as const)))("%ix%i at t=%s: the scenery is painted over the lane", (W, H, t) => {
    const w = Math.round(W * K);
    const h = Math.round(H * K);
    let shown = 0;
    let behind = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 2) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const alone = context(W, H, K);
      scenery(alone, s);
      const a = alone.getImageData(0, 0, w, h).data;
      const withLane = context(W, H, K);
      afterSky(withLane, s);
      const b = withLane.getImageData(0, 0, w, h).data;
      let over = 0;
      let lane = 0;
      for (let i = 0; i < a.length; i += 4) {
        // (Where the scenery is fully opaque: at its anti-aliased seams a trace of what lies behind shows through.)
        if (a[i + 3]! === 255) {
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 6) over++;
        } else if (b[i + 3]! > 40 && a[i + 3]! <= 40) lane++;
      }
      expect(over, `level ${lvl}: pixels of the scenery changed by the lane`).toBe(0);
      if (lane > 0) shown++;
      const props = new Uint8Array(w * h);
      for (let i = 0; i < props.length; i++) props[i] = a[i * 4 + 3]! >= 250 ? 1 : 0;
      eachVisible(s, (d) => {
        if (overlap(mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K), props) > 0) behind++;
      });
    }
    expect(shown, "the lane shows at some heights").toBeGreaterThan(20);
    expect(behind, "things in the lane pass behind the scenery").toBeGreaterThan(10);
  }, 120_000);
});

describe("valentine's lanes in the loop", () => {
  // Past LOOP_START the lanes come round again with the story: at L and L + LOOP the same things
  // stand at the same places on screen.
  it.each([LOOP_START, LOOP_START + 7, LOOP_START + 30, LOOP_START + 61, LOOP_START + 95, LOOP_START + 118])("level %i matches a loop later and two", (lvl) => {
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
});

describe("valentine's lanes zoomed out", () => {
  // The zoomed-out view is up to 1/0.6 times wider and taller at the same u: the lanes keep to
  // their places either side of the tower, nothing reaches the virtual screen's sides.
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

describe("valentine's stars", () => {
  // The night's stars are spread across the screen, kept in from its sides so no sparkle is cut
  // in half by an edge, and out of the tower's column.
  it.each(SIZES.flatMap(([W, H]) => [70, LOOP_START + LOOP + 3].map((lvl) => [W, H, lvl] as const)))("%ix%i at level %i: no star touches a side or the column", (W, H, lvl) => {
    const s = sceneAt(W, H, lvl, 0);
    const m = mask(W, H, (ctx) => stars(ctx, s, toneOf(s)));
    const c0 = s.cssW / 2 - s.u * 0.25;
    const c1 = s.cssW / 2 + s.u * 0.25;
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

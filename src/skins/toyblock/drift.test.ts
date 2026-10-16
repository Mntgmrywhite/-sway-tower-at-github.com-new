import { describe, expect, it } from "vitest";
import { drawDrifter, eachVisible, type Drifter } from "./drift";
import { bridge, farTrees, floorTop, landShows, portals } from "./far";
import { moonAt, sunAt } from "./sky";
import { mask, overlap, sceneAt, SIZES } from "./test-scene";
import { level, toneOf } from "./tone";

// Everything drifting past in the side lanes, all the way up, on a tall and a short phone:
// nothing enters the tower's column or touches a side of the screen, nothing overlaps, and
// only clouds ever pass in front of the sun (left lane) or the moon (right lane).

const LEVELS = Array.from({ length: 111 }, (_, i) => i * 2);
const TIMES = [0, 5.3] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

/** Pixels of a mask inside a circle (in full-size coordinates). */
function inCircle(m: Uint8Array, w: number, cx: number, cy: number, r: number): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = (i % w) / K;
    const y = Math.floor(i / w) / K;
    if (Math.hypot(x - cx, y - cy) < r) n++;
  }
  return n;
}

describe("toy kingdom drifters", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: lanes stay clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    const kinds = new Set<string>();
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const items: { d: Drifter; lane: number; m: Uint8Array }[] = [];
      eachVisible(s, (d, lane) => items.push({ d, lane, m: mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K) }));
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      const sun = sunAt(s, tone, floorTop(s, level(s)));
      const moon = moonAt(s);
      items.forEach(({ d, lane, m }, i) => {
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
        if (d.kind === "cloud") return;
        if (lane === 1 && tone.sunSet < 1) expect(inCircle(m, w, sun.x, sun.y, sun.r * 1.7), `${what} crosses the sun`).toBe(0);
        if (lane === 0 && tone.moon > 0) expect(inCircle(m, w, moon.x, moon.y, moon.r * 1.1), `${what} crosses the moon`).toBe(0);
      });
    }
    // Every kind of drifter was on screen at some point on the way up.
    expect([...kinds].sort()).toEqual(["airship", "balloons", "cloud", "kite", "rocket"]);
  });
});

describe("toy kingdom drifters over the land", () => {
  // While the land still shows (until the cloud floor covers it), what comes down the lanes may
  // pass in front of the plain hills but never over the far props: the bridge, the tunnel
  // mouths and the lollipop trees.
  const PROPS_LEVELS = Array.from({ length: 46 }, (_, i) => i);
  it.each(SIZES.flatMap(([W, H]) => [0, 5.3, 11].map((t) => [W, H, t] as const)))("%ix%i at t=%s: nothing drifts over the far props", (W, H, t) => {
    let checked = 0;
    for (const lvl of PROPS_LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      if (!landShows(s, floorTop(s, level(s)))) continue;
      const props = mask(W, H, (ctx) => {
        bridge(ctx, s, tone);
        portals(ctx, s, tone);
        farTrees(ctx, s, tone);
      });
      eachVisible(s, (d) => {
        checked++;
        const m = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d));
        expect(overlap(m, props), `level ${lvl}: ${d.kind} at ${Math.round(d.at)} over the far props`).toBe(0);
      });
    }
    expect(checked, "drifters seen while the land shows").toBeGreaterThan(10);
  });
});

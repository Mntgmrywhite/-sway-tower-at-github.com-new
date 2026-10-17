import { describe, expect, it } from "vitest";
import { drawDrifter, eachVisible, type Drifter } from "./drift";
import { farLayer, seaTop } from "./far";
import { moonAt, sunAt } from "./sky";
import { context, mask, sceneAt, SIZES } from "./test-scene";
import { level, LOOP, LOOP_FROM, SCENE_LOOP_FROM, toneOf } from "./tone";

// Everything drifting past in the side lanes, from the start through two full turns of the
// looping story, on a tall and a short phone: nothing enters the tower's column or touches a
// side of the screen, nothing overlaps, and only clouds (and lanterns, lit only while the sun
// is down) ever pass in front of the sun (left lane) or the moon (right lane).

const LEVELS = Array.from({ length: Math.ceil((SCENE_LOOP_FROM + 2 * LOOP) / 2) + 1 }, (_, i) => i * 2);
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

describe("classic drifters", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))(
    "%ix%i at t=%s: lanes stay clear through two turns of the loop",
    (W, H, t) => {
      const w = Math.round(W * K);
      for (const lvl of LEVELS) {
        const s = sceneAt(W, H, lvl, t);
        const tone = toneOf(s);
        const items: { d: Drifter; lane: number; at: number; m: Uint8Array }[] = [];
        eachVisible(s, (d, lane, at) => items.push({ d, lane, at, m: mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d, at), K) }));
        const c0 = (s.cssW / 2 - s.u * 0.25) * K;
        const c1 = (s.cssW / 2 + s.u * 0.25) * K;
        const sun = sunAt(s, tone, seaTop(s, level(s)));
        const moon = moonAt(s);
        items.forEach(({ d, lane, at, m }, i) => {
          const what = `level ${lvl}: ${d.kind} at ${Math.round(at)}`;
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
            const n = items[j]!.m;
            let both = 0;
            for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
            expect(both, `${what} overlaps ${items[j]!.d.kind} at ${Math.round(items[j]!.at)}`).toBe(0);
          }
          if (d.kind === "cloud") return;
          if (lane === 1 && tone.sunSet < 1) expect(inCircle(m, w, sun.x, sun.y, sun.r * 1.72), `${what} crosses the sun`).toBe(0);
          if (lane === 0 && tone.moon > 0) expect(inCircle(m, w, moon.x, moon.y, moon.r * 1.55), `${what} crosses the moon`).toBe(0);
        });
      }
    },
    // Many full-scene masks: generous room for a busy machine.
    60_000,
  );
});

/** Which pixels the far islands cover (at half size): the far layer with them, against it without. */
function farMask(s: ReturnType<typeof sceneAt>): Uint8Array {
  const tone = toneOf(s);
  const lvl = level(s);
  const sea = seaTop(s, lvl);
  const w = Math.round(s.cssW * K);
  const h = Math.round(s.cssH * K);
  const draw = (isles: number) => {
    const ctx = context(s.cssW, s.cssH, K);
    farLayer(ctx, s, { ...tone, farIsles: isles }, lvl, sea, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const a = draw(1);
  const b = draw(0);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    let d = 0;
    for (let c = 0; c < 4; c++) d += Math.abs(a[i * 4 + c]! - b[i * 4 + c]!);
    out[i] = d > 30 ? 1 : 0;
  }
  return out;
}

describe("classic drifters and the far islands", () => {
  // The far islands on the cloud sea (the lighthouse, the great tree, the hamlet) sit at the foot
  // of both lanes: everything coming down a lane fades into the haze before it reaches their
  // skyline, so none of them is ever covered, through two turns of the loop, zoomed out too.
  it.each(SIZES.flatMap(([W, H]) => [1, 0.6].map((z) => [W, H, z] as const)))("%ix%i at zoom %s: nothing in the lanes covers a far island", (W, H, z) => {
    for (let lvl = LOOP_FROM; lvl <= SCENE_LOOP_FROM + 2 * LOOP; lvl += 3) {
      const s = sceneAt(W, H, lvl, 2.3 + lvl * 0.05, z);
      const tone = toneOf(s);
      const far = farMask(s);
      eachVisible(s, (d, _lane, at) => {
        const m = mask(s.cssW, s.cssH, (ctx) => drawDrifter(ctx, s, tone, d, at), K);
        let both = 0;
        for (let i = 0; i < m.length; i++) both += m[i]! & far[i]!;
        expect(both, `level ${lvl}: ${d.kind} at ${Math.round(at)} covers a far island`).toBe(0);
      });
    }
  }, 60_000);
});

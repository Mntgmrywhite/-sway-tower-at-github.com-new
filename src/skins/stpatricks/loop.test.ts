import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { stPatricks } from "../stpatricks";
import type { Scene } from "../skin";
import { chapelAt, cloudFloor, floorTop, FLOOR_SETTLED, land, landShows } from "./far";
import { context, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { DAY_HIGH, level, LOOP, LOOP_START, storyLevel, toneAtLevel, toneOf, type Tone } from "./tone";

// The height story loops forever (tone.ts): from LOOP_START on, everything keyed by height comes
// round every LOOP levels, the end of the loop flows into its start with no jump, the first
// pass is the designed day, and the scene can be climbed for ever (to level 2000 here) without
// throwing or slowing down. The whole frame repeats too, not just the light. Hard mode's
// zoomed-out view (up to 1/0.6 times the phone's size at the same u) is covered edge to edge by
// the skin's own layers at every height.

function rgb(c: string): [number, number, number] {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
  const m = c.match(/[\d.]+/g)!.map(Number);
  return [m[0]!, m[1]!, m[2]!];
}

/** The largest change between two tones: over every color (RGB distance) and every amount (x 255). */
function step(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === "number" && typeof y === "number") d = Math.max(d, Math.abs(x - y) * 255);
    else if (typeof x === "string" && typeof y === "string") {
      const p = rgb(x);
      const q = rgb(y);
      d = Math.max(d, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    } else if (Array.isArray(x) && Array.isArray(y)) {
      for (let i = 0; i < x.length; i++) {
        const p = rgb(x[i]!);
        const q = rgb(y[i]!);
        d = Math.max(d, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
      }
    }
  }
  return d;
}

describe("st. patrick's looping story", () => {
  it("repeats every LOOP levels past LOOP_START", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP * 2; lvl += 0.75) {
      expect(toneAtLevel(lvl + LOOP), `level ${lvl}`).toEqual(toneAtLevel(lvl));
      expect(toneAtLevel(lvl + LOOP * 5), `level ${lvl}`).toEqual(toneAtLevel(lvl));
      expect(storyLevel(lvl + LOOP)).toBeCloseTo(storyLevel(lvl), 6);
    }
  });

  it("flows on across the seams with no jump", () => {
    const seams = [LOOP_START, LOOP_START + LOOP, LOOP_START + LOOP * 2];
    const near = (lvl: number) => seams.some((s) => Math.abs(lvl - s) <= 3);
    let elsewhere = 0;
    for (let lvl = 0; lvl < LOOP_START + LOOP; lvl += 0.5) {
      if (!near(lvl) && !near(lvl + 0.5)) elsewhere = Math.max(elsewhere, step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)));
    }
    expect(elsewhere, "the story changes somewhere").toBeGreaterThan(1);
    for (const seam of seams) {
      for (let lvl = seam - 3; lvl < seam + 3; lvl += 0.5) {
        expect(step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)), `level ${lvl} -> ${lvl + 0.5}`).toBeLessThanOrEqual(elsewhere);
      }
    }
    // And the whole loop changes smoothly too: no half-level step is far bigger than the first day's largest.
    let first = 0;
    for (let lvl = 0; lvl < LOOP_START; lvl += 0.5) first = Math.max(first, step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)));
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP; lvl += 0.5) {
      expect(step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)), `level ${lvl}`).toBeLessThanOrEqual(first * 1.25);
    }
  });

  it("keeps the first day as designed below LOOP_START", () => {
    for (let lvl = 0; lvl < LOOP_START; lvl += 1.5) expect(storyLevel(lvl)).toBe(lvl);
    expect(toneAtLevel(0).sunSet).toBe(0);
    expect(toneAtLevel(LOOP_START - 0.5).stars).toBe(1);
  });

  it("renders all the way to level 2000 without throwing or slowing down", () => {
    const W = 390;
    const H = 844;
    const ctx = context(W, H);
    const kit = kitFor(stPatricks);
    const time = (lvl: number, t: number) => {
      const s = sceneAt(W, H, lvl, t);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      ctx.getImageData(0, 0, 1, 1);
      return performance.now() - t0;
    };
    const median = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1]!;
    // Warm up, then compare the climb's busiest stretch (the land) with the loop, far up.
    for (let i = 0; i < 5; i++) time(i * 4, i);
    const low: number[] = [];
    const high: number[] = [];
    for (let i = 0; i < 24; i++) low.push(time((i * 7) % 30, i * 0.7));
    for (let lvl = LOOP_START; lvl <= 2000; lvl += 11) high.push(time(lvl, lvl * 0.13));
    expect(median(high), "frame time high up vs near the ground").toBeLessThan(median(low) * 1.5 + 1);
  }, 60_000);
});

describe("st. patrick's loop on screen", () => {
  // Not just the light: past LOOP_START the whole frame comes round every LOOP levels (the cloud
  // floor has settled at its rest with the mountains standing out of it, the lanes repeat), so
  // the frame at L and at L + LOOP is the same picture, on both phones and zoomed out.
  const frame = (s: Scene) => {
    const ctx = context(s.cssW, s.cssH, 0.5);
    const kit = kitFor(stPatricks);
    kit.world(ctx, s);
    kit.front(ctx, s);
    return ctx.getImageData(0, 0, Math.floor(s.cssW * 0.5), Math.floor(s.cssH * 0.5)).data;
  };
  const CASES = [
    [390, 844, 1],
    [375, 667, 1],
    [390, 844, 0.6],
  ] as const;
  it.each(CASES)("%ix%i at zoom %s: the frame at L + LOOP is the frame at L", (W, H, z) => {
    for (const lvl of [LOOP_START, LOOP_START + 13, LOOP_START + 38, LOOP_START + 71, LOOP_START + 104, LOOP_START + 127]) {
      const t = 3.7 + lvl * 0.01;
      const a = frame(zoomedScene(W, H, z, lvl, t));
      for (const n of [1, 3]) {
        const b = frame(zoomedScene(W, H, z, lvl + LOOP * n, t));
        let differ = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 6) differ++;
        }
        expect(differ, `level ${lvl} vs ${lvl + LOOP * n}: pixels that differ`).toBe(0);
      }
    }
  }, 60_000);

  it("the cloud floor settles before the loop starts, with the mountain tops standing out of it", () => {
    expect(FLOOR_SETTLED).toBeLessThanOrEqual(LOOP_START);
    for (const [W, H] of SIZES) {
      for (let lvl = LOOP_START; lvl < LOOP_START + LOOP * 2; lvl += 9) {
        const s = sceneAt(W, H, lvl, 0);
        const top = floorTop(s, level(s));
        expect(top, `level ${lvl}: the floor's top`).toBeCloseTo(s.cssH - s.u * 0.3, 6);
        expect(chapelAt(s).y, `level ${lvl}: the chapel above the floor`).toBeLessThan(top - s.u * 0.1);
      }
    }
  });

  it("gathers, then sinks to its rest, without a jump", () => {
    for (const [W, H] of SIZES) {
      const s0 = sceneAt(W, H, 0, 0);
      let prev = floorTop(s0, 0);
      let gathering = 0;
      let sinking = 0;
      for (let lvl = 0.25; lvl < LOOP_START + 4; lvl += 0.25) {
        const s = sceneAt(W, H, lvl, 0);
        const top = floorTop(s, level(s));
        if (lvl <= DAY_HIGH) gathering = Math.max(gathering, Math.abs(top - prev));
        else sinking = Math.max(sinking, Math.abs(top - prev));
        prev = top;
      }
      expect(gathering, `${W}x${H}: the floor's biggest step as it gathers`).toBeLessThan(s0.u * 0.03);
      // Once it has covered the land it sinks slower than the tower comes down past it (a quarter level is 2 world units).
      expect(sinking, `${W}x${H}: the floor's biggest step as it sinks to rest`).toBeLessThan(s0.scale * 2);
    }
  });
});

/** A canvas for the scene on an opaque magenta ground (anything left showing stands out against it). */
function backed(s: Scene): CanvasRenderingContext2D {
  const ctx = context(s.cssW, s.cssH);
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(0, 0, s.cssW, s.cssH);
  return ctx;
}

/** Pixels that differ clearly between two pictures of the scene. */
function differ(a: CanvasRenderingContext2D, b: CanvasRenderingContext2D, s: Scene): number {
  const p = a.getImageData(0, 0, s.cssW, s.cssH).data;
  const q = b.getImageData(0, 0, s.cssW, s.cssH).data;
  let n = 0;
  for (let i = 0; i < p.length; i += 4) {
    if (Math.abs(p[i]! - q[i]!) + Math.abs(p[i + 1]! - q[i + 1]!) + Math.abs(p[i + 2]! - q[i + 2]!) > 24) n++;
  }
  return n;
}

describe("st. patrick's land under the cloud floor", () => {
  // The land (the hills, the castle, the headland with its round tower and cross, the bay, the
  // meadows) is dropped from the scene once the cloud floor has swelled up over it: at the last
  // moment it is drawn, none of it shows over the floor, so nothing blinks out as you climb. On
  // both phones, a tablet, and zoomed out.
  const SCREENS = [[390, 844, 1], [375, 667, 1], [834, 1194, 1], [390, 844, 0.6], [375, 667, 0.6]] as const;
  it.each(SCREENS)("%ix%i at zoom %s: the land is all under the floor when it is dropped", (W, H, z) => {
    const at = (lvl: number) => (z === 1 ? sceneAt(W, H, lvl, 0) : zoomedScene(W, H, z, lvl, 0));
    let last = -1;
    for (let lvl = 0; lvl < DAY_HIGH + 2; lvl += 0.05) {
      const s = at(lvl);
      if (landShows(s, floorTop(s, level(s)))) last = lvl;
    }
    expect(last, "the land shows at the start").toBeGreaterThan(10);
    const s = at(last);
    const tone = toneOf(s);
    const top = floorTop(s, level(s));
    const withLand = backed(s);
    land(withLand, s, tone, top);
    cloudFloor(withLand, s, tone, top);
    const floorOnly = backed(s);
    cloudFloor(floorOnly, s, tone, top);
    const shows = differ(withLand, floorOnly, s);
    expect(shows, `level ${last.toFixed(2)}: pixels of the land showing over the floor as it is dropped`).toBe(0);
  });

  it.each(SCREENS)("%ix%i at zoom %s: what is left out under the floor would not have shown", (W, H, z) => {
    // As the floor comes up, the parts of the land already under its solid body are left out:
    // with the floor over it, the picture is the same as with the whole land drawn.
    for (let lvl = 16; lvl < DAY_HIGH + 4; lvl += 0.5) {
      const s = z === 1 ? sceneAt(W, H, lvl, 0) : zoomedScene(W, H, z, lvl, 0);
      const top = floorTop(s, level(s));
      if (!landShows(s, top)) continue;
      const tone = toneOf(s);
      const culled = backed(s);
      land(culled, s, tone, top);
      cloudFloor(culled, s, tone, top);
      const whole = backed(s);
      land(whole, s, tone, s.cssH * 4);
      cloudFloor(whole, s, tone, top);
      expect(differ(culled, whole, s), `level ${lvl}: pixels that differ`).toBe(0);
    }
  });
});

describe("st. patrick's zoomed out", () => {
  // Hard mode's zoomed-out view (render.ts: camera.ts's frame for a virtual screen 1/zoom the
  // phone's size at the same u) must be painted edge to edge by the skin itself at every height:
  // only St. Patrick's own layers are drawn here, so a gap would show (in the game the base
  // world's sky and field would show through it).
  const LEVELS = [0, 4, 9, 13, 16, 19, 22, 25, 28, 31, 36, 48, 70, 88, 104, 140, 200, 400, 1500];
  it.each(SIZES.flatMap(([W, H]) => [1, 0.8, 0.6].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the whole virtual screen is covered at every height",
    (W, H, z) => {
      for (const lvl of LEVELS) {
        for (const t of [0.4, 6.1]) {
          const s = zoomedScene(W, H, z, lvl, t);
          const K = 0.5;
          // (The virtual screen can be a fraction of a pixel wider than the whole pixels checked.)
          const w = Math.floor(s.cssW * K);
          const h = Math.floor(s.cssH * K);
          const ctx = context(s.cssW, s.cssH, K);
          stPatricks.ground!(ctx, s);
          stPatricks.foreground!(ctx, s);
          const data = ctx.getImageData(0, 0, w, h).data;
          let holes = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]! < 250) holes++;
          expect(holes, `level ${lvl}, t=${t}: unpainted pixels`).toBe(0);
        }
      }
    },
    60_000,
  );
});

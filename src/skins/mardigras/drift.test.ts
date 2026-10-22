import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import type { Scene } from "../skin";
import { mardiGras, quarter } from "../mardigras";
import { routeConfetti } from "./air";
import { drawDrifter, drifterBox, drifters, eachVisible, type Drifter } from "./drift";
import { cloudFloor, farLayer, floorTop, landShows } from "./far";
import { front } from "./front";
import { skyIsland } from "./island";
import { parade } from "./parade";
import { kingGator } from "./gator";
import { rightLaneClear } from "./lane";
import { carnivalQueen } from "./queen";
import { riverboat, streetcar } from "./river";
import { BURST_R, fireworks, lowestBurst, moonAt, rightFireworks, rightShowBox, sunAt, SUN_REACH } from "./sky";
import { reviewingStand } from "./stand";
import { streetGround } from "./street";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, storyLevel, toneOf } from "./tone";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps. And the owner's rule: nothing ever passes
// over the sun or the moon, at any height, on any screen, zoomed out or not: no cloud, no
// balloon, no confetti, no firework.

const TOP = LOOP_START + LOOP * 2 + 12;
const LEVELS = Array.from({ length: Math.ceil(TOP / 2) + 1 }, (_, i) => i * 2);
const TIMES = [0, 5.3, 8.9] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

describe("mardi gras drifters", () => {
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
    expect([...kinds].sort()).toEqual(["balloon", "beads", "cloud", "coins", "confetti", "doubloon", "doves", "jester", "lantern", "pelicans", "streamers", "swag"]);
  }, 120_000);

  it("every drifter keeps inside the box the lane's big things keep clear of (lane.ts), with all its motion", () => {
    // The King Gator and the right lane's fireworks hold back for whatever is in the lane by these
    // boxes: a drifter painting outside its own would let them meet it.
    const [W, H] = [390, 844];
    let checked = 0;
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP; lvl += 3) {
      for (const t of [0, 2.7, 6.1, 9.4, 13.3, 21.8]) {
        const s = sceneAt(W, H, lvl, t);
        const tone = toneOf(s);
        eachVisible(s, (d) => {
          const b = { ...drifterBox(s, d) };
          const m = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d));
          for (let i = 0; i < m.length; i++) {
            if (!m[i]) continue;
            const x = (i % W) + 0.5;
            const y = Math.floor(i / W) + 0.5;
            if (x < b.l - 1 || x > b.r + 1 || y < b.t - 1 || y > b.b + 1) expect.fail(`level ${lvl}, t=${t}: the ${d.kind} at ${Math.round(d.at)} paints outside its box at (${x}, ${y})`);
          }
          checked++;
        });
      }
    }
    expect(checked, "drifters checked").toBeGreaterThan(300);
  }, 60_000);
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

describe("mardi gras sun and moon", () => {
  it.each(SCREENS)("%ix%i at zoom %s: nothing drifts over the sun or the moon at any height", (W0, H0, z) => {
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    let drawn = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      eachVisible(s, (d) => {
        drawn++;
        drawDrifter(ctx, s, tone, d);
      });
      fireworks(ctx, s, tone);
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

  it.each(SCREENS)("%ix%i at zoom %s: no firework bursts over the moon, and all of them keep to the left lane, above the Queen", (W0, H0, z) => {
    // Fireworks come by night, when the moon is up: every one of the first 200 bursts, frame by
    // frame, on a night of the first day and one of the loop.
    let bursts = 0;
    // The loop's night parade: the first day's level 66 comes round 96 levels into each turn (storyLevel).
    expect(storyLevel(LOOP_START + LOOP + 96)).toBe(66);
    for (const lvl of [66, LOOP_START + LOOP + 96]) {
      const s0 = screenAt(W0, H0, z, lvl, 0);
      const tone = toneOf(s0);
      expect(tone.fireworks, `level ${lvl}: the night parade`).toBeGreaterThan(0.9);
      const moon = moonAt(s0);
      const ctx = context(s0.cssW, s0.cssH, K);
      const w = Math.round(s0.cssW * K);
      const c0 = (s0.cssW / 2 - s0.u * 0.25) * K;
      // Nothing falls below the lowest burst's reach: the Carnival Queen stands under it (queen.ts).
      const lowest = lowestBurst(s0) * K + 1;
      for (let n = 0; n < 200; n++) {
        let shown = false;
        for (let k = 0; k <= 1; k += 0.1) {
          const s = { ...s0, t: n * 2.2 + k * 2.2 };
          ctx.clearRect(0, 0, s.cssW, s.cssH);
          fireworks(ctx, s, tone);
          expect(inCircle(ctx, moon.x, moon.y, moon.r + 2), `level ${lvl}, t=${s.t.toFixed(2)}: a firework over the moon`).toBe(0);
          const data = ctx.getImageData(0, 0, w, ctx.canvas.height).data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i]! <= 40) continue;
            shown = true;
            const x = ((i - 3) / 4) % w;
            expect(x < c0 && x > 0, `level ${lvl}, t=${s.t.toFixed(2)}: a spark at x ${x / K} out of the left lane`).toBe(true);
            const y = Math.floor((i - 3) / 4 / w);
            expect(y, `level ${lvl}, t=${s.t.toFixed(2)}: a spark below the lowest burst's reach`).toBeLessThanOrEqual(lowest);
          }
        }
        if (shown) bursts++;
      }
    }
    expect(bursts, "fireworks burst").toBeGreaterThan(300);
    // The bursts stay a safe way under the moon.
    const s = screenAt(W0, H0, z, 66, 0);
    expect(s.cssH * 0.4 - s.u * BURST_R, "the highest burst's top").toBeGreaterThan(moonAt(s).y + moonAt(s).r + s.u * 0.02);
  }, 120_000);

  it.each(SCREENS)("%ix%i at zoom %s: nothing in the whole scene passes over the sun by day or the moon at all", (W0, H0, z) => {
    // Not just the lane: everything the scene paints after the sun and the moon (the street and
    // the far city, the lane, the houses, the stand, the parade, the confetti, the Carnival
    // Queen and the King Gator, the right lane's fireworks, the cloud floor, the floating island,
    // the curb in front). The sun is clear all day, until it begins to set into the cloud floor (and from
    // when it has risen out of it at the loop's dawn); the moon is clear whenever it is up.
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let moonChecked = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      fireworks(ctx, s, tone);
      rightFireworks(ctx, s, tone, rightLaneClear(s, rightShowBox(s)));
      if (landShows(s, floor)) streetGround(ctx, s);
      farLayer(ctx, s, tone, floor);
      drifters(ctx, s, tone);
      quarter(ctx, s, tone);
      reviewingStand(ctx, s);
      parade(ctx, s);
      routeConfetti(ctx, s);
      carnivalQueen(ctx, s, tone, floor);
      kingGator(ctx, s, tone, floor);
      if (floor < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
      skyIsland(ctx, s, mardiGras.bars);
      front(ctx, s);
      if (tone.sunSet === 0) {
        sunChecked++;
        const sun = sunAt(s, tone, floor);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (tone.moon > 0) {
        moonChecked++;
        const moon = moonAt(s);
        expect(inCircle(ctx, moon.x, moon.y, moon.r + 1), `level ${lvl}: something passes over the moon`).toBe(0);
      }
    }
    expect(sunChecked, "the sun is up").toBeGreaterThan(100);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 60_000);

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

describe("mardi gras drifters over the city", () => {
  // While the city still shows (until the cloud floor covers it), what comes down the lane may
  // never pass over the river's boat or the streetcar, on any screen or zoomed out; on a screen at
  // full size the lane is empty until then (its first things come in above Sky Islands' island,
  // which has the lane to itself around level 50).
  const CITY_LEVELS = Array.from({ length: 80 }, (_, i) => i / 2);
  it.each(SCREENS)("%ix%i at zoom %s: nothing drifts down the lane while the city shows", (W0, H0, z) => {
    let city = 0;
    for (const lvl of CITY_LEVELS) {
      for (const t of [0, 5.3, 11]) {
        const s = screenAt(W0, H0, z, lvl, t);
        if (!landShows(s, floorTop(s, level(s)))) continue;
        city++;
        const props = mask(s.cssW, s.cssH, (ctx) => {
          riverboat(ctx, s, toneOf(s));
          streetcar(ctx, s, toneOf(s));
        }, K);
        eachVisible(s, (d) => {
          const m = mask(s.cssW, s.cssH, (ctx) => drawDrifter(ctx, s, toneOf(s), d), K);
          expect(overlap(m, props), `level ${lvl}: ${d.kind} at ${Math.round(d.at)} over the far city`).toBe(0);
          if (z === 1) expect(d.kind, `level ${lvl}: a ${d.kind} at ${Math.round(d.at)} in the lane while the city shows`).toBe("none");
        });
      }
    }
    expect(city, "levels where the city shows").toBeGreaterThan(40);
  }, 60_000);
});

describe("mardi gras lanes in the loop", () => {
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
});

describe("mardi gras lanes zoomed out", () => {
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

describe("mardi gras island over the cloud floor", () => {
  // Sky Islands' island floats over the cloud sea: as the camera climbs past it, it passes in
  // front of the cloud floor and leaves by the bottom of the screen, never cut off by the floor.
  // Wherever the island alone paints a solid pixel, the whole backdrop shows that very pixel.
  it.each(SIZES)("%ix%i: whole in front of the cloud floor as it comes down", (W, H) => {
    let checked = 0;
    for (let lvl = 44; lvl <= 90; lvl += 2) {
      const s = sceneAt(W, H, lvl, 2.3);
      const alone = context(W, H);
      skyIsland(alone, s, mardiGras.bars);
      const a = alone.getImageData(0, 0, W, H).data;
      const world = context(W, H);
      kitFor(mardiGras).world(world, s);
      const b = world.getImageData(0, 0, W, H).data;
      const floor = floorTop(s, level(s));
      let hidden = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3]! < 255) continue;
        if (Math.floor(i / 4 / W) < floor - s.u * 0.1) continue;
        checked++;
        if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 6) hidden++;
      }
      expect(hidden, `level ${lvl}: island pixels hidden`).toBe(0);
    }
    expect(checked, "the island comes down over the floor").toBeGreaterThan(2000);
  }, 60_000);
});

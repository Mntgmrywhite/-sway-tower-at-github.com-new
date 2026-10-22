import { describe, expect, it } from "vitest";
import { july4 } from "../july4";
import type { Scene } from "../skin";
import { barbecue, sparklerKids } from "./cast";
import { banks, laneClouds } from "./clouds";
import { crowd, strollers } from "./crowd";
import { drawDrifter, drifters, eachVisible, LANE_P, type Drifter } from "./drift";
import { fireworks, townGlow } from "./fireworks";
import { front } from "./front";
import { hills } from "./hills";
import { island, islandFrame } from "./island";
import { backLine, frontLine, hillLine, mainShows } from "./land";
import { mainStreet, squareEdge } from "./mainstreet";
import { parade } from "./parade";
import { moonAt, MOON_REACH, sunAt, SUN_REACH } from "./sky";
import { bandstand, lawn, path } from "./square";
import { context, mask, overlap, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { LOOP, LOOP_START, toneOf } from "./tone";
import { backRow, frontRow } from "./town";
import { cameoBounds } from "../cameo";

// Everything drifting past in the lane, all the way up through the first day and two whole
// turns of the story's loop, on a tall and a short phone: nothing enters the tower's column or
// touches a side of the screen, and nothing overlaps (another drifter or Sky Islands' floating
// island). And the owner's rule: nothing ever passes over the sun or the moon, at any height, on
// any screen, zoomed out or not: no balloon, bird, plane, parachute, puff of cloud or smoke, or
// firework; only the land the sun sets behind (and rises from at the loop's dawn): the far hills
// and the town standing on them.

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
      const isle = islandFrame(s);
      const isleBox = isle ? cameoBounds(isle, 2) : null;
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      items.forEach(({ d, m }, i) => {
        kinds.add(d.kind);
        const what = `level ${lvl}: ${d.kind} at ${Math.round(d.at)}`;
        let column = 0;
        let edge = 0;
        let onIsland = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = k % w;
          const y = Math.floor(k / w);
          if (x >= c0 && x <= c1) column++;
          if (x === 0 || x === w - 1) edge++;
          if (isleBox && x / K >= isleBox.l && x / K <= isleBox.r && y / K >= isleBox.t && y / K <= isleBox.b) onIsland++;
        }
        expect(column, `${what}: pixels in the tower's column`).toBe(0);
        expect(edge, `${what}: pixels on a side of the screen`).toBe(0);
        expect(onIsland, `${what}: pixels over the floating island`).toBe(0);
        for (let j = i + 1; j < items.length; j++) {
          expect(overlap(m, items[j]!.m), `${what} overlaps ${items[j]!.d.kind} at ${Math.round(items[j]!.d.at)}`).toBe(0);
        }
      });
    }
    // Every kind of drifter was on screen at some point on the way up.
    expect([...kinds].sort()).toEqual(["biplane", "birds", "blimp", "eagle", "hotair", "jumper", "smoke", "stunt"]);
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
 * Everything the scene paints after the sun and the moon (july4.ts's order); without `land`, only
 * the sky's things (the clouds, the lane, the island, the show), all but the land the sun sets
 * behind (the hills and the town standing on them).
 */
function afterSky(ctx: CanvasRenderingContext2D, s: Scene, land = true): void {
  const tone = toneOf(s);
  banks(ctx, s, tone);
  laneClouds(ctx, s, tone);
  drifters(ctx, s, tone);
  island(ctx, s, tone, july4.bars);
  if (land) hills(ctx, s, tone, hillLine(s), backLine(s) + s.u * 0.02);
  fireworks(ctx, s, tone);
  if (!land) return;
  backRow(ctx, s, tone, frontLine(s) + s.u * 0.02);
  frontRow(ctx, s, tone, s.cssH);
  townGlow(ctx, s, tone);
  if (mainShows(s)) {
    mainStreet(ctx, s, tone);
    lawn(ctx, s);
    strollers(ctx, s);
    squareEdge(ctx, s, tone);
    crowd(ctx, s);
    path(ctx, s);
    barbecue(ctx, s);
    sparklerKids(ctx, s);
    bandstand(ctx, s);
    parade(ctx, s);
  }
  front(ctx, s);
}

describe("independence day's sun and moon", () => {
  // Nothing passes over the sun (its disc and its halo, wherever it stands as it sets and rises)
  // or the moon (its disc and glow), at every half level from the start, through the first day
  // and two turns of the loop: not the lane, the clouds or the fireworks, nor anything else the
  // scene paints after them; as the sun sets behind the far hills (and rises from them at the
  // loop's dawn) only the land may cover it.
  it.each(SCREENS)("%ix%i at zoom %s: nothing in the scene passes over the sun or the moon, but the land it sets behind", (W0, H0, z) => {
    const probe = screenAt(W0, H0, z, 0, 0);
    const ctx = context(probe.cssW, probe.cssH, K);
    let sunChecked = 0;
    let settingChecked = 0;
    let moonChecked = 0;
    let drawn = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      // The drifters sway and bob, and the shells go up and burst, with the clock: a different moment at every height.
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const tone = toneOf(s);
      eachVisible(s, () => drawn++);
      const sun = sunAt(s, tone);
      if (tone.sunSet === 0 || tone.moon > 0) {
        ctx.clearRect(0, 0, s.cssW, s.cssH);
        afterSky(ctx, s);
        if (tone.sunSet === 0) {
          sunChecked++;
          expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something passes over the sun`).toBe(0);
        }
        if (tone.moon > 0) {
          moonChecked++;
          const moon = moonAt(s);
          expect(inCircle(ctx, moon.x, moon.y, moon.r * MOON_REACH + 1), `level ${lvl}: something passes over the moon`).toBe(0);
        }
      }
      if (tone.sunSet > 0 && tone.sunSet < 1) {
        settingChecked++;
        ctx.clearRect(0, 0, s.cssW, s.cssH);
        afterSky(ctx, s, false);
        expect(inCircle(ctx, sun.x, sun.y, sun.r * SUN_REACH + 1), `level ${lvl}: something in the sky passes over the setting sun`).toBe(0);
      }
    }
    expect(drawn, "the lane is busy").toBeGreaterThan(300);
    expect(sunChecked, "the sun is up").toBeGreaterThan(80);
    expect(settingChecked, "the sun sets and rises").toBeGreaterThan(80);
    expect(moonChecked, "the moon is up").toBeGreaterThan(100);
  }, 180_000);

  it("the sun rises at dawn only once the moon has gone from where it rises", () => {
    for (const [W0, H0, z] of SCREENS) {
      for (let lvl = 0; lvl <= TOP; lvl += 0.25) {
        const s = screenAt(W0, H0, z, lvl, 0);
        const tone = toneOf(s);
        if (tone.sunSet >= 1 || tone.moon <= 0) continue;
        const { x, y, r } = sunAt(s, tone);
        const moon = moonAt(s);
        expect(Math.hypot(x - moon.x, y - moon.y), `${W0}x${H0} at zoom ${z}, level ${lvl}: the sun meets the moon`).toBeGreaterThan(r * SUN_REACH + moon.r);
      }
    }
  });
});

describe("independence day's lanes in the loop", () => {
  // Past LOOP_START the lane comes round again with the story: at L and L + LOOP the same
  // things stand at the same places on screen.
  it.each([LOOP_START, LOOP_START + 7, LOOP_START + 30, LOOP_START + 61, LOOP_START + 95, LOOP_START + 120])("level %i matches a loop later and two", (lvl) => {
    const seen = (l: number) => {
      const s = sceneAt(390, 844, l, 4.2);
      const out: string[] = [];
      eachVisible(s, (d) => out.push(`${d.kind}:${Math.round((s.groundY - s.rise * (1 - LANE_P) - d.at * s.scale * LANE_P) * 10)}:${d.x.toFixed(4)}`));
      return out.join(" ");
    };
    const now = seen(lvl);
    expect(now.length, "something is in the lane").toBeGreaterThan(0);
    expect(seen(lvl + LOOP)).toBe(now);
    expect(seen(lvl + LOOP * 2)).toBe(now);
  });
});

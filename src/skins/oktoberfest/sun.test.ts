import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import {
  beerGarden,
  church,
  cloudBank,
  cloudFloor,
  farLine,
  ferrisWheel,
  floorTop,
  foothills,
  hayBales,
  house,
  landShows,
  meadowFar,
  mistBand,
  mountains,
  swingRide,
} from "./far";
import { band, dancers } from "./folk";
import { front } from "./front";
import { bandstand, maypole, meadowNear, tent, trodden } from "./ground";
import { parade, waitress } from "./parade";
import { moon, moonAt, skyFill, stars, sun, sunAt, sunSetAt } from "./sky";
import { mask, sceneAt, zoomedScene } from "./test-scene";
import { DAY_HIGH, level, lightAt, LOOP, LOOP_START, toneIndex, toneOf } from "./tone";

// The owner, about the newest skins: "when you get up to the cloud layer, the sun does not
// smoothly come down but shifts jarringly". The sun used to be placed from the tone table's
// half-level steps, so as it set it jumped by up to 16 px twice a level. Now it is placed at
// the camera's exact altitude: stepping the climb in fiftieths of a level (with the camera's
// rise), from the ground through the cloud layer, the sunset, the night, the loop's dawn and on
// into the next day, the sun's and the moon's places on screen (and how far they have faded in)
// never move by more than a sliver per step. And nothing but the mountains and the mist ever
// covers either of them: not the fair's rides, not the cloud bank, not the lane, nothing.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [1024, 1366, 1],
  [390, 844, 0.6],
  [375, 667, 0.6],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** Where the climb is checked: the first pass, through the cloud layer and the sunset, and a whole turn of the loop after it. */
const TOP = LOOP_START + LOOP + 6;
const STEP = 0.02;

describe("oktoberfest sun and moon glide", () => {
  it.each(SCREENS)("%ix%i at zoom %s: no jump anywhere in the climb", (W, H, z) => {
    let prev: { x: number; y: number; r: number; up: boolean } | null = null;
    let prevMoon = lightAt(0).moon;
    let prevStars = lightAt(0).stars;
    let sunSteps = 0;
    let biggest = 0;
    let at = 0;
    let lowest = 0;
    for (let lvl = 0; lvl <= TOP; lvl += STEP) {
      const s = screenAt(W, H, z, lvl, 0);
      const up = sunSetAt(s) < 1;
      const p = sunAt(s, floorTop(s, level(s)));
      const now = { x: p.x, y: p.y, r: p.r, up };
      if (prev && prev.up && up) {
        sunSteps++;
        const d = Math.hypot(now.x - prev.x, now.y - prev.y);
        if (d > biggest) {
          biggest = d;
          at = lvl;
        }
        expect(Math.abs(now.r - prev.r), `level ${lvl.toFixed(2)}: the sun's size jumps`).toBeLessThan(s.u * 0.001);
        lowest = Math.max(lowest, now.y);
      }
      // The moon hangs still where the sun set; it and the stars fade in and out smoothly.
      const light = lightAt(level(s));
      expect(Math.abs(light.moon - prevMoon), `level ${lvl.toFixed(2)}: the moon pops`).toBeLessThan(0.01);
      expect(Math.abs(light.stars - prevStars), `level ${lvl.toFixed(2)}: the stars pop`).toBeLessThan(0.01);
      prevMoon = light.moon;
      prevStars = light.stars;
      prev = now;
    }
    // (Its path runs from high on the screen down into the mist, so the bound goes with the screen's height.)
    const h = screenAt(W, H, z, 0, 0).cssH;
    expect(sunSteps, "the sun is up through much of the climb").toBeGreaterThan(2000);
    expect(biggest, `the sun's biggest step (at level ${at.toFixed(2)})`).toBeLessThan(h * 0.0025);
    // And it does set: it goes right down into the mist.
    expect(lowest, "the sun sinks low").toBeGreaterThan(screenAt(W, H, z, 0, 0).cssH * 0.6);
  });

  it("the sun begins to set only once the cloud layer has formed, and rises again at the loop's dawn", () => {
    expect(lightAt(DAY_HIGH).sunSet).toBe(0);
    expect(lightAt(LOOP_START - 1).sunSet).toBe(1);
    let rose = false;
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP; lvl += 0.5) if (lightAt(lvl).sunSet === 0) rose = true;
    expect(rose, "the sun is back up in the loop").toBe(true);
  });
});

/** Pixels in `a` and not in `b`. */
function without(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! & (b[i]! ^ 1);
  return out;
}

const K = 0.5;

describe("oktoberfest: only the mountains and the mist cover the sun and the moon", () => {
  it.each(SCREENS)("%ix%i at zoom %s: nothing else ever passes over them", (W0, H0, z) => {
    let sunChecked = 0;
    let moonChecked = 0;
    for (let lvl = 0; lvl <= TOP; lvl += 0.5) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 23);
      const W = s.cssW;
      const H = s.cssH;
      const tone = toneOf(s);
      const hz = farLine(s);
      const floor = floorTop(s, level(s));
      const sunUp = sunSetAt(s) < 1;
      const moonUp = lightAt(level(s)).moon > 0;
      if (!sunUp && !moonUp) continue;
      // What may cover them: the Alps and the foothills, the dawn's mist on the mountains, the mist floor.
      const cover = mask(
        W,
        H,
        (ctx) => {
          mountains(ctx, s, tone, hz);
          mistBand(ctx, s, tone, hz);
          foothills(ctx, s, tone, hz);
          if (floor < H + s.u * 0.15) cloudFloor(ctx, s, tone, floor);
        },
        K,
      );
      // Everything else the scene paints after them.
      const rest = mask(
        W,
        H,
        (ctx) => {
          cloudBank(ctx, s, tone, hz);
          if (landShows(s, floor)) {
            meadowFar(ctx, s, tone, Math.min(H, floor + s.u * 0.12));
            beerGarden(ctx, s, tone, hz);
            hayBales(ctx, s, tone, hz);
          }
          church(ctx, s, tone, hz);
          house(ctx, s, tone, hz);
          ferrisWheel(ctx, s, tone, hz);
          swingRide(ctx, s, tone, hz);
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
          front(ctx, s);
        },
        K,
      );
      if (sunUp) {
        const disc = without(mask(W, H, (ctx) => sun(ctx, s, tone, floor), K), cover);
        let shows = 0;
        let over = 0;
        for (let i = 0; i < disc.length; i++) {
          shows += disc[i]!;
          over += disc[i]! & rest[i]!;
        }
        if (shows) sunChecked++;
        expect(over, `level ${lvl}: something passes over the sun`).toBe(0);
      }
      if (moonUp) {
        // (The moon's bite is painted with the sky, so the sky goes in first.)
        const disc = without(
          mask(
            W,
            H,
            (ctx) => {
              skyFill(ctx, s, tone, toneIndex(s), 0);
              moon(ctx, s);
            },
            K,
          ),
          cover,
        );
        let over = 0;
        for (let i = 0; i < disc.length; i++) over += disc[i]! & rest[i]!;
        moonChecked++;
        expect(over, `level ${lvl}: something passes over the moon`).toBe(0);
        // The stars keep off it too.
        const m = moonAt(s);
        const st = mask(W, H, (ctx) => stars(ctx, s), K);
        let starsOver = 0;
        for (let i = 0; i < st.length; i++) {
          if (!st[i]) continue;
          const x = ((i % Math.round(W * K)) + 0.5) / K;
          const y = (Math.floor(i / Math.round(W * K)) + 0.5) / K;
          if (Math.hypot(x - m.x, y - m.y) < m.r + 1) starsOver++;
        }
        expect(starsOver, `level ${lvl}: a star over the moon`).toBe(0);
      }
    }
    expect(sunChecked, "the sun is in view").toBeGreaterThan(80);
    expect(moonChecked, "the moon is up").toBeGreaterThan(60);
  }, 120_000);
});

import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drawDrifter, drifterAt, eachVisible, FAR_LANES, type Placed } from "./drift";
import { nozzleOnScreen, padRocket, rocketAt } from "./launch";
import { FLAME, flameColors, landPaint, skyPaint, type RocketPaint } from "./rocket";
import { masker, only, sceneAt, VIEWS } from "./test-scene";
import { toneOf } from "./tone";
import { laneRocket } from "./toys";

// The owner: "The toy kingdom rocket should be the same that blasts off." The rocket that roars up
// the right lane among the stars is the very rocket on the launch pad: drawn by the drifters as
// the game draws them, then turned back upright and brought to the pad rocket's size and place,
// every part of it (the cream body and its shaded side, the red nose and band, the red fins, the
// blue windows) covers the same pixels as on the pad, each in the same part of the paint.

/** The parts of the rocket, each painted in its own color: its name and where it is in a paint. */
const PARTS: readonly (readonly [string, (p: RocketPaint) => string])[] = [
  ["cream body", (p) => p.cream.body],
  ["shaded side", (p) => p.cream.shade],
  ["nose and band", (p) => p.red.body],
  ["fins", (p) => p.red.shade],
  ["windows", (p) => p.blue.light],
];

/** The lane rocket on screen at a level and moment, if it is well inside the screen. */
function laneRocketAt(s: Scene): Placed | null {
  let found: Placed | null = null;
  eachVisible(
    s,
    (p) => {
      if (p.d.kind === "rocket" && p.y > s.u * 0.3 && p.y < s.cssH - s.u * 0.3) found = { ...p };
    },
    (lane) => lane >= FAR_LANES,
  );
  return found;
}

function count(m: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i]!;
  return n;
}

describe("toy kingdom: the rocket up the lane is the one from the launch pad", () => {
  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): the same rocket, part for part", { timeout: 60_000 }, (W, H, u) => {
    const draw = masker(W, H);
    // The rocket standing on its pad at the start, as the launch draws it.
    const s0 = sceneAt(W, H, 0, 0, u);
    const tone0 = toneOf(s0);
    const pad = { ...nozzleOnScreen(s0, rocketAt(0)) };
    const land = { ...landPaint(tone0) };
    let compared = 0;
    for (let lvl = 100; lvl <= 130; lvl += 3) {
      for (const t of [0.4, 2.9, 5.3, 7.75]) {
        const s = sceneAt(W, H, lvl, t, u);
        const p = laneRocketAt(s);
        if (!p) continue;
        const tone = toneOf(s);
        const sky = skyPaint(tone);
        const at = { ...drifterAt(s, p) };
        const pose = { ...laneRocket(s, at.x, at.y, at.k, p.d.phase) };
        // Every part has a color of its own in both paints, so each can be picked out.
        const colors = (paint: RocketPaint) => new Set(PARTS.map(([, c]) => c(paint)));
        expect(colors(land).size).toBe(PARTS.length);
        expect(colors(sky).size).toBe(PARTS.length);
        const fire = flameColors(tone);
        for (const other of [sky.fire, sky.heart, fire.spark, fire.core, ...sky.smoke, ...sky.hot]) expect(colors(sky).has(other), `${other} is a part's color`).toBe(false);
        for (const [part, color] of PARTS) {
          const onPad = draw((ctx) => padRocket(only(ctx, (c) => c === color(land)), s0, tone0));
          // The lane rocket as the game draws it, turned upright and brought to the pad's size and place.
          const inLane = draw((ctx) => {
            ctx.translate(pad.x, pad.y);
            ctx.scale(s0.u / at.k, s0.u / at.k);
            ctx.rotate(-pose.lean);
            ctx.translate(-pose.x, -pose.y);
            drawDrifter(only(ctx, (c) => c === color(sky)), s, tone, p);
          });
          let both = 0;
          let either = 0;
          for (let i = 0; i < onPad.length; i++) {
            both += onPad[i]! & inLane[i]!;
            either += onPad[i]! | inLane[i]!;
          }
          const what = `level ${lvl}, t=${t}: the ${part}`;
          expect(count(onPad), `${what} on the pad`).toBeGreaterThan(part === "windows" || part === "nose and band" || part === "fins" ? 20 : 200);
          expect(both / either, `${what}: pixels in common (of ${either})`).toBeGreaterThan(0.97);
        }
        compared++;
      }
    }
    expect(compared, "moments with the lane rocket on screen").toBeGreaterThanOrEqual(4);
  });

  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): up there it roars: a long flame, sparks and a trail of smoke", (W, H, u) => {
    const draw = masker(W, H);
    let seen = 0;
    for (let lvl = 100; lvl <= 130; lvl += 2) {
      for (const t of [1.1, 3.7, 6.2]) {
        const s = sceneAt(W, H, lvl, t, u);
        const p = laneRocketAt(s);
        if (!p) continue;
        seen++;
        const tone = toneOf(s);
        const sky = skyPaint(tone);
        const fire = flameColors(tone);
        const at = { ...drifterAt(s, p) };
        const pose = { ...laneRocket(s, at.x, at.y, at.k, p.d.phase) };
        const what = `level ${lvl}, t=${t}`;
        expect(pose.flame, `${what}: a longer flame than as it stands lit on its pad`).toBeGreaterThan(FLAME * 1.4);
        const pick = (keep: Set<string>) => count(draw((ctx) => drawDrifter(only(ctx, (c) => keep.has(c)), s, tone, p)));
        expect(pick(new Set([sky.fire, sky.heart])), `${what}: flame px`).toBeGreaterThan(at.k * at.k * 0.002);
        expect(pick(new Set([fire.spark, fire.core])), `${what}: spark px`).toBeGreaterThan(0);
        expect(pick(new Set([...sky.smoke, ...sky.hot])), `${what}: smoke px`).toBeGreaterThan(at.k * at.k * 0.02);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(6);
  });
});

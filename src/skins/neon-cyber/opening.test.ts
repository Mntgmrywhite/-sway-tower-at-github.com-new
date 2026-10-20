import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { heroFoot, HOLO, smogLine } from "./city";
import { drawDrifter, eachVisible } from "./lanes";
import { actTime, BACK_FROM, BACK_TO, CALM, CYCLE, GO, IDLE, jiggleAt, power, puddleFill, racerX, REV, shieldAt, sprayHits } from "./peel";
import { HOLO_PICTURES, holoPicture } from "./signs";
import { PROPS, racer, racerCar, racerWater, rearPuddle, walker } from "./street";
import { mask, SIZES, startScene } from "./test-scene";
import { toneOf } from "./tone";

// The owner's rules: any action happens within the first 10 seconds of a tower's scene (s.t = 0
// on the title's fresh tower and on play again), because after that players have moved on and up;
// and every action repeats: what happens once comes round again on a rhythm for as long as the
// player stands there.
//
// Cyberpunk is calm by design and has one action in its start view: the street racer at the curb
// peels out at about 1 s, soaks the umbrella walker (who shields behind the umbrella) and is out
// of view and the walker back under the umbrella by 3 s; the puddle it spun out refills, and at
// 6 s it comes back round from the left and pulls up at the curb again, the walker peeking out
// warily, all done by 9 s. Then it does it all again, every 20 s (peel.ts; peel.test.ts holds it
// to that frame by frame). Everything else keyed to the clock there is ambient and in motion from t = 0:
//   - rain streaks and splash rings on the wet floor (weather.ts), and the ripples of the neon in
//     the street (street.ts);
//   - the steam from the noodle stall's flue, the cook's bob, the swinging lanterns, the
//     umbrella swaying over the walker, the parked hover car bobbing, the vending buttons (props.ts);
//   - windows switching on and off every 3 s, the beacons blinking (city.ts), tired signs
//     flickering, the billboard's glitches (signs.ts);
//   - the two searchlights' slow sweep (sky.ts, about 27 s a round);
//   - the hover taxi idling in the right lane (lanes.ts: a slow sway and bob in place).
// The one thing that changes in steps is the holo billboard on the towers' faces: its pictures
// (the eye, the koi, the cube, the equalizer) take turns every 4.5 s, and all of them have shown
// by 10 s. The rest of the side lanes' traffic is keyed to height (it comes down past you as you
// climb), so the rule leaves it be.
//
// These tests hold the skin to that: the racer's whole pass, out and back, plays within the first
// 10 s and replays every CYCLE s after; the billboard's pictures all show within the first 10 s;
// and nothing on the street (the racer and its spray included) or in the lanes of the start view,
// watched for a minute and a half, ever goes anywhere it hadn't already been within the first 10 s:
// the racer and the walker, frame for frame, are where they were at the same moment of the first
// pass (or idling, as they were by the end of it).

/** Seconds into a tower's scene by which every action has happened. */
const OPENING = 10;
/** How far the lane traffic's slow sway (a round takes about 37 s) may carry it past where the first 10 s took it, in u. */
const DRIFT = 0.016;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;

/** The start view's scene at clock `t`: the title's camera holds still, only the clock moves. */
function at(s: Scene, t: number): Scene {
  return { ...s, t };
}

/**
 * The moment in the first 10 s that a later moment replays: the same moment of the first pass,
 * or, once a pass has played out, a moment of the first pass's calm (the racer idling at the curb).
 */
function firstPass(t: number): number {
  const a = actTime(t);
  return a < OPENING ? a : OPENING - 0.25;
}

/** The props whose drawing follows the racer's act (the others are ambient). */
const ACTORS = new Set<Draw>([racerCar, racerWater, walker, rearPuddle]);
/**
 * Alpha (of 255) above which a pixel is the racer itself: its faint glow and the reflection
 * rippling under it go where it goes, but ripple with the rain, not the act.
 */
const CAR = 140;

/** `m` grown by `r` pixels in every direction (a square), `w` pixels wide. */
function grow(m: Uint8Array, w: number, r: number): Uint8Array {
  const h = m.length / w;
  const across = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dx = Math.max(0, x - r); dx <= Math.min(w - 1, x + r); dx++) across[y * w + dx] = 1;
    }
  }
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!across[y * w + x]) continue;
      for (let dy = Math.max(0, y - r); dy <= Math.min(h - 1, y + r); dy++) out[dy * w + x] = 1;
    }
  }
  return out;
}

describe("neon cyberpunk opening", () => {
  it("the racer's pass, out and back, plays within the first 10 s, then comes round again and again", () => {
    // The first pass: the rev, the launch, the spray on the umbrella, the racer gone and the
    // walker back under the umbrella, the racer back at the curb and everything still again.
    const { last } = sprayHits();
    for (const moment of [REV, GO, last, CALM, BACK_FROM, BACK_TO, IDLE]) expect(moment).toBeLessThanOrEqual(OPENING);
    // And from the end of a pass to the next one, nothing new: the state of the act is the idle one.
    const s = startScene(390, 844, 0);
    for (let t = IDLE; t < CYCLE; t += 0.05) {
      expect(shieldAt(t), `t=${t.toFixed(2)}`).toBe(0);
      expect(jiggleAt(t), `t=${t.toFixed(2)}`).toBe(0);
      expect(power(t), `t=${t.toFixed(2)}`).toBe(power(0));
      expect(puddleFill(t), `t=${t.toFixed(2)}`).toBe(1);
      expect(racerX(s, 100, 80, t), `t=${t.toFixed(2)}`).toBe(100);
    }
    // It repeats for as long as anyone stands there: each later pass soaks the walker on cue.
    for (const n of [1, 2, 3, 10, 100]) {
      let shielded = 0;
      let peeked = 0;
      // (Off the act's boundaries: a clock n cycles on lands within a hair of the first pass's.)
      for (let t = 0.025; t < CYCLE; t += 0.05) {
        const later = n * CYCLE + t;
        shielded = Math.max(shielded, shieldAt(later));
        if (t > BACK_FROM && t < IDLE) peeked = Math.max(peeked, shieldAt(later));
        expect(shieldAt(later), `t=${later.toFixed(2)}`).toBeCloseTo(shieldAt(t), 6);
        expect(racerX(s, 100, 80, later), `t=${later.toFixed(2)}`).toBeCloseTo(racerX(s, 100, 80, t), 3);
      }
      expect(shielded, `pass ${n}: the walker shields`).toBe(1);
      expect(peeked, `pass ${n}: the walker peeks as it comes back`).toBeGreaterThan(0.3);
    }
  });

  it("the towers' holo billboard shows every one of its pictures within the first 10 s", () => {
    for (const [W, H] of SIZES) {
      const s = startScene(W, H, 0);
      const y = heroFoot(s) - HOLO.y * s.u;
      expect(y > Math.max(0, smogLine(s)) && y < s.cssH, `${W}x${H}: the billboard is in the start view`).toBe(true);
    }
    const first = new Map<number, number>();
    for (let i = 0; i <= 1200; i++) {
      const t = i * 0.05;
      const k = holoPicture(t, HOLO.seed);
      if (!first.has(k)) first.set(k, t);
    }
    expect(first.size, "pictures shown in the first minute").toBe(HOLO_PICTURES);
    for (const [k, t] of first) expect(t, `picture ${k} first shows at (s)`).toBeLessThanOrEqual(OPENING);
  });

  it.each(SIZES)("%ix%i: nothing on the street or in the lanes of the start view goes anywhere new after the first 10 s", (W, H) => {
    const s0 = startScene(W, H, 0);
    const w = Math.round(W * K);
    // The racer in two parts: its water, and the car itself (see CAR).
    const street = [...PROPS.filter((d) => d !== racer), racerWater, rearPuddle];
    const things: { name: string; draw: Draw; solid?: number }[] = street.map((draw) => ({ name: draw.name, draw }));
    things.push({ name: "racerCar", draw: racerCar, solid: CAR });
    eachVisible(s0, (d) => things.push({ name: `lane ${d.kind} at ${d.at}`, draw: (ctx, s) => drawDrifter(ctx, s, toneOf(s), d) }));
    const r = Math.ceil(DRIFT * s0.u * K);
    let lanes = 0;
    for (const { name, draw, solid } of things) {
      // Everywhere it goes within the first 10 s.
      const early = new Uint8Array(w * Math.round(H * K));
      for (let i = 0; i <= OPENING * 4; i++) {
        const m = mask(W, H, (ctx) => draw(ctx, at(s0, i / 4)), K, solid);
        for (let p = 0; p < m.length; p++) if (m[p]) early[p] = 1;
      }
      const seen = early.reduce((n, v) => n + v, 0);
      if (name.startsWith("lane")) {
        // Lane items just off screen are visited too; keep the ones that show.
        if (seen === 0) continue;
        lanes++;
      }
      expect(seen, `${name} is drawn`).toBeGreaterThan(20);
      const room = grow(early, w, r);
      const actor = ACTORS.has(draw);
      // Then for a minute and a half after (the racer's act four times round).
      for (let i = 1; i <= 140; i++) {
        const t = OPENING + i * 0.57;
        const m = mask(W, H, (ctx) => draw(ctx, at(s0, t)), K, solid);
        // An actor may be anywhere it was at the same moment of the first pass.
        const twin = actor ? grow(mask(W, H, (ctx) => draw(ctx, at(s0, firstPass(t))), K, solid), w, r) : null;
        let out = 0;
        for (let p = 0; p < m.length; p++) if (m[p] && !room[p] && !(twin && twin[p])) out++;
        expect(out, `${name} at t=${t.toFixed(2)}: pixels where the first 10 s never took it`).toBe(0);
      }
    }
    expect(lanes, "something hangs in a lane at the start").toBeGreaterThan(0);
  }, 60_000);
});

import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible, FAR_LANES, NEAR_P, type Placed } from "./drift";
import { launchPad } from "./far";
import {
  armSwing,
  BURN,
  CLOUD_Z,
  COUNTDOWN,
  DESCEND,
  gantryBounce,
  GONE,
  IGNITE,
  lampLit,
  LIFTOFF,
  nozzleOnScreen,
  PAD_SQUASH,
  PAD_X,
  padRocket,
  padSmokeBehind,
  padSmokeFront,
  pathX,
  PERIOD,
  rocketAt,
  rocketSky,
  type Rocket,
  TOUCHDOWN,
  TRIP_START,
  tripIndex,
  tripTime,
} from "./launch";
import { COLUMN, horizon, landShows, seaTop } from "./place";
import { moon, sun } from "./sky";
import { context, masker, overlap, sceneAt, SIZES, VIEWS } from "./test-scene";
import { LOOP_START, toneOf } from "./tone";

// The rocket's round trip (launch.ts): the owner asked for the rocket to take off after 10 seconds
// and corkscrew up into the clouds, the tower following its launch cloud; and then for it to come
// back and land ("think Tesla") and go again, as every action must come round again. So: it
// stands on its pad until 10 s, the lamps counting down, lights, lifts off and climbs ever faster,
// corkscrewing, into a cloud, all within a few seconds; it comes back out of the cloud tail first,
// falls, folds out its legs, brakes on its landing burn to a stop on its pad by 28 s, settles and
// goes again every PERIOD seconds, each trip the same as the first; at every height and every
// moment the rocket, its smoke and the cloud keep to the right lane (out of the tower's column,
// clear of the screen's sides, never over the other things in the sky at their depth, nor the sun
// or the moon); its corkscrew of smoke stays put in the sky, so the tower climbs past it to the
// cloud the rocket flew into, and it is all gone well before the story loops; the smoke comes out
// of the rocket's nozzle all the way up, wherever the camera is; the rocket goes into its cloud and
// comes back out of it without popping in or out of sight, and never jumps; the smoke thins away
// without leaving specks; and the launch tower stays standing on its pad.

const FRAME = 1 / 60;

describe("toy kingdom rocket launch", () => {
  it("stands on its pad until 10 s, then lights, lifts off and climbs ever faster into the cloud", () => {
    expect(IGNITE).toBeGreaterThanOrEqual(10);
    expect(IGNITE).toBeLessThan(10.5);
    expect(LIFTOFF - IGNITE, "the engine roars a moment before lift-off").toBeGreaterThan(0.8);
    expect(LIFTOFF - IGNITE).toBeLessThan(2);
    const pad = { ...rocketAt(0) };
    for (let t = 0; t < IGNITE; t += 0.05) {
      const r = rocketAt(t);
      expect(r.phase, `t=${t.toFixed(2)}`).toBe("pad");
      expect(r.flame, `t=${t.toFixed(2)}: no flame yet`).toBe(0);
      expect(r.x).toBe(pad.x);
      expect(r.z).toBe(pad.z);
    }
    // The service arm swings clear just before ignition, and only then.
    expect(armSwing(IGNITE - 1)).toBe(0);
    expect(armSwing(IGNITE)).toBeGreaterThan(1.2);
    for (let t = IGNITE + 0.5; t < LIFTOFF; t += 0.05) {
      const r = rocketAt(t);
      expect(r.phase).toBe("pad");
      expect(r.flame, `t=${t.toFixed(2)}: lit`).toBeGreaterThan(0.05);
      expect(Math.abs(r.x - pad.x), "trembling, but in place").toBeLessThan(0.004);
    }
    // Up and away within a few seconds: gone into the cloud well before players have climbed past.
    expect(GONE - LIFTOFF).toBeGreaterThan(3);
    expect(GONE).toBeLessThan(17);
    expect(rocketAt(GONE).phase).toBe("gone");
    expect(rocketAt(GONE - 0.01).phase).toBe("climb");
    // Climbing, never back down, ever faster; no jump anywhere.
    let last = { ...rocketAt(LIFTOFF - FRAME) };
    let lastStep = 0;
    let crossings = 0;
    let side = 0;
    for (let t = LIFTOFF; t < GONE; t += FRAME) {
      const a = { ...last };
      const r = rocketAt(t);
      const step = r.z - a.z;
      expect(step, `t=${t.toFixed(3)}: climbing`).toBeGreaterThanOrEqual(0);
      expect(step, `t=${t.toFixed(3)}: speeding up`).toBeGreaterThanOrEqual(lastStep - 1e-9);
      expect(step, "no jump").toBeLessThan(0.012);
      expect(Math.abs(r.x - a.x), "no jump across").toBeLessThan(0.012);
      expect(Math.abs(r.lean - a.lean), "no snap in its lean").toBeLessThan(0.15);
      expect(Math.abs(r.k - a.k), "no snap in its size").toBeLessThan(0.02);
      lastStep = step;
      // It corkscrews: the lean swings from one side to the other, again and again.
      const now = Math.sign(r.lean);
      if (Math.abs(r.lean) > 0.15 && now !== side) {
        if (side !== 0) crossings++;
        side = now;
      }
      last = { ...r };
    }
    expect(crossings, "turns of the corkscrew").toBeGreaterThanOrEqual(5);
    // Smaller and smaller as it goes up and away.
    expect(rocketAt(GONE - 0.01).k).toBeLessThan(0.35);
  });

  it("the lamps count down a second apart, red, yellow, green, into ignition", () => {
    expect(COUNTDOWN).toBe(IGNITE - 3);
    for (let n = 0; n < 4; n++) {
      const at = n * PERIOD;
      for (let i = 0; i < 3; i++) {
        expect(lampLit(at + COUNTDOWN + i - 0.05, i), `trip ${n}: lamp ${i} still dark`).toBe(false);
        expect(lampLit(at + COUNTDOWN + i + 0.1, i), `trip ${n}: lamp ${i} lit`).toBe(true);
        expect(lampLit(at + COUNTDOWN + i + 0.3, i), `trip ${n}: lamp ${i} blinks`).toBe(false);
        expect(lampLit(at + IGNITE + 0.5, i), `trip ${n}: lamp ${i} lit at ignition`).toBe(true);
      }
      // Dark the rest of the trip.
      for (let c = LIFTOFF + 1.6; c < PERIOD + COUNTDOWN - 0.01; c += 0.25) {
        for (let i = 0; i < 3; i++) expect(lampLit(at + c, i), `trip ${n}, ${c.toFixed(2)} s in: lamp ${i}`).toBe(false);
      }
    }
    for (let t = 0; t < COUNTDOWN; t += 0.1) for (let i = 0; i < 3; i++) expect(lampLit(t, i)).toBe(false);
  });

  it.each(SIZES)("%ix%i: nothing of the launch shows until the countdown, then the pad lights up", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0.5);
    // Another moment before the countdown with the beacon in the same state.
    let t1 = 4;
    while (Math.sin(t1 * 2.2) > 0 !== Math.sin(0.5 * 2.2) > 0) t1 += 0.05;
    const draw = masker(W, H);
    const pad0 = draw((ctx) => launchPad(ctx, s0, toneOf(s0)));
    const s1 = { ...s0, t: t1 };
    const pad1 = draw((ctx) => launchPad(ctx, s1, toneOf(s1)));
    expect(overlap(pad0, pad1)).toBe(pad0.reduce((a, b) => a + b, 0));
    expect(pad1.reduce((a, b) => a + b, 0)).toBe(pad0.reduce((a, b) => a + b, 0));
    // The sky part draws nothing before lift-off on a phone (its cloud is above the screen).
    for (const t of [0, 5, IGNITE, LIFTOFF - 0.01]) {
      const m = draw((ctx) => rocketSky(ctx, { ...s0, t }, toneOf(s0)));
      expect(m.reduce((a, b) => a + b, 0), `t=${t}`).toBe(0);
    }
    // At ignition the pad gains fire and smoke.
    const pixels = (t: number) => {
      const ctx = context(W, H);
      launchPad(ctx, { ...s0, t }, toneOf(s0));
      return ctx.getImageData(0, 0, W, H).data;
    };
    const calm = pixels(0.5);
    const lit = pixels(IGNITE + 0.8);
    let changed = 0;
    for (let i = 0; i < calm.length; i += 4) {
      if (Math.max(Math.abs(calm[i]! - lit[i]!), Math.abs(calm[i + 1]! - lit[i + 1]!), Math.abs(calm[i + 2]! - lit[i + 2]!), Math.abs(calm[i + 3]! - lit[i + 3]!)) > 30) changed++;
    }
    expect(changed, "pixels of fire and smoke").toBeGreaterThan((s0.u * 0.05) ** 2);
  });
});

describe("toy kingdom rocket round trip", () => {
  it("comes back out of its cloud tail first, falls, folds out its legs and brakes to a stop on its pad", () => {
    expect(DESCEND - GONE, "a few seconds up in its cloud").toBeGreaterThan(2);
    expect(DESCEND - GONE).toBeLessThan(6);
    expect(TOUCHDOWN, "down by 28 s").toBeLessThanOrEqual(28);
    const pad = { ...rocketAt(0) };
    let last = { ...rocketAt(DESCEND) };
    expect(last.phase).toBe("down");
    expect(last.flame, "coasting out of the cloud").toBe(0);
    expect(last.legs, "legs folded").toBe(0);
    let lastStep = 0;
    for (let t = DESCEND + FRAME; t < TOUCHDOWN; t += FRAME) {
      const r = rocketAt(t);
      const what = `t=${t.toFixed(3)}`;
      expect(r.phase, what).toBe("down");
      const step = last.z - r.z;
      expect(step, `${what}: coming down`).toBeGreaterThan(0);
      expect(step, `${what}: no jump`).toBeLessThan(0.008);
      expect(Math.abs(r.x - last.x), `${what}: no jump across`).toBeLessThan(0.002);
      expect(Math.abs(r.lean), `${what}: upright, tail first`).toBeLessThan(0.08);
      expect(r.k, `${what}: bigger as it comes nearer`).toBeGreaterThanOrEqual(last.k - 1e-9);
      // Falling ever faster until the landing burn, then braking evenly.
      if (t < BURN) expect(step, `${what}: falling faster`).toBeGreaterThanOrEqual(lastStep - 1e-9);
      if (t > BURN + 2 * FRAME) expect(step, `${what}: braking`).toBeLessThanOrEqual(lastStep + 1e-9);
      // The landing burn: lit from BURN to touchdown, not before.
      if (t < BURN - 0.3) expect(r.flame, `${what}: no flame yet`).toBe(0);
      if (t > BURN + 0.2) expect(r.flame, `${what}: the landing burn`).toBeGreaterThan(0.05);
      // Legs out well before touchdown.
      if (t > BURN + 0.6) expect(r.legs, `${what}: legs down`).toBe(1);
      lastStep = step;
      last = { ...r };
    }
    expect(lastStep, "at a standstill as it touches down").toBeLessThan(0.0002);
    // Touchdown: on its legs, on its pad, right where it lifted off from, without a jump.
    const down = { ...rocketAt(TOUCHDOWN) };
    expect(down.phase).toBe("pad");
    expect(down.x).toBeCloseTo(pad.x, 9);
    expect(Math.abs(down.z - last.z)).toBeLessThan(0.0002);
    expect(down.nz, "standing on its legs, a little higher than on its fins").toBeGreaterThan(pad.nz);
    expect(down.legs).toBe(1);
    // It bounces on its legs, the flame dies, it folds its legs and settles onto its fins.
    let squashed = 1;
    for (let t = TOUCHDOWN; t < TOUCHDOWN + 1.2; t += FRAME) squashed = Math.min(squashed, rocketAt(t).squash);
    expect(squashed, "a squash at touchdown").toBeLessThan(0.97);
    expect(rocketAt(TOUCHDOWN + 0.4).flame).toBe(0);
    let prev = { ...rocketAt(TOUCHDOWN) };
    for (let t = TOUCHDOWN; t < TRIP_START + PERIOD; t += FRAME) {
      const r = rocketAt(t);
      expect(r.phase).toBe("pad");
      expect(Math.abs(r.nz - prev.nz), `t=${t.toFixed(3)}: settling without a jump`).toBeLessThan(0.002);
      expect(Math.abs(r.squash - prev.squash)).toBeLessThan(0.03);
      prev = { ...r };
    }
    const settled = rocketAt(TRIP_START + PERIOD - 0.01);
    expect(settled.legs, "legs folded away").toBe(0);
    expect(settled.nz).toBeCloseTo(pad.nz, 9);
    expect(settled.z).toBeCloseTo(pad.z, 9);
    expect(settled.squash).toBe(1);
    // The arm swings back to it once it has settled, and is there when the next trip begins.
    expect(armSwing(TOUCHDOWN + 2)).toBeGreaterThan(1.2);
    expect(armSwing(TRIP_START + PERIOD - 0.01)).toBe(0);
    // The launch tower bounces at touchdown, and only then.
    let bounce = 0;
    for (let t = 0; t < TRIP_START + PERIOD; t += FRAME) {
      const b = Math.abs(gantryBounce(t));
      if (t < TOUCHDOWN || t > TOUCHDOWN + 1.6) expect(b, `t=${t.toFixed(3)}`).toBe(0);
      bounce = Math.max(bounce, b);
    }
    expect(bounce).toBeGreaterThan(0.02);
  });

  it("every later trip replays the first, PERIOD seconds on, for as long as the scene runs", () => {
    expect(PERIOD).toBeGreaterThanOrEqual(35);
    expect(PERIOD).toBeLessThanOrEqual(45);
    // Each trip starts with the rocket on its pad, as at the start, before its countdown.
    expect(TRIP_START).toBeGreaterThan(TOUCHDOWN - PERIOD);
    expect(TRIP_START).toBeLessThan(COUNTDOWN);
    const a = (t: number) => ({ ...rocketAt(t) });
    /** The same rocket, give or take the clock's rounding. */
    const same = (p: Rocket, q: Rocket, what: string) => {
      expect(p.phase, what).toBe(q.phase);
      for (const k of ["z", "nz", "x", "y", "k", "lean", "flame", "near", "legs", "squash"] as const) expect(p[k], `${what}: ${k}`).toBeCloseTo(q[k], 9);
    };
    for (let n = 1; n <= 12; n++) {
      expect(tripIndex(TRIP_START + n * PERIOD + 0.01)).toBe(n);
      expect(tripIndex(TRIP_START + n * PERIOD - 0.01)).toBe(n - 1);
      for (let c = TRIP_START; c < TRIP_START + PERIOD; c += 0.37) {
        expect(tripTime(c + n * PERIOD)).toBeCloseTo(c, 9);
        same(a(c + n * PERIOD), a(c), `trip ${n}, ${c.toFixed(2)} s in`);
      }
    }
    // Phases in order, every trip.
    for (let n = 0; n <= 12; n++) {
      const at = n * PERIOD;
      expect(rocketAt(at + COUNTDOWN).phase).toBe("pad");
      expect(rocketAt(at + IGNITE + 0.6).flame).toBeGreaterThan(0.05);
      expect(rocketAt(at + LIFTOFF + 1).phase).toBe("climb");
      expect(rocketAt(at + GONE + 1).phase).toBe("gone");
      expect(rocketAt(at + DESCEND + 1).phase).toBe("down");
      expect(rocketAt(at + TOUCHDOWN + 1).phase).toBe("pad");
    }
    // Where each trip hands over to the next, it stands on its pad just as at the start.
    same(a(TRIP_START + PERIOD - 1e-6), a(TRIP_START + PERIOD + 1e-6), "the hand-over");
    same(a(TRIP_START + PERIOD), a(TRIP_START), "a trip's start");
    same(a(TRIP_START), a(0), "the start");
  });

  it.each(SIZES)("%ix%i: each later trip draws just as the first: the old trail clears before the countdown ends", { timeout: 60_000 }, (W, H) => {
    const pixels = (t: number, lvl: number) => {
      const s = sceneAt(W, H, lvl, t);
      const ctx = context(W, H);
      const tone = toneOf(s);
      if (landShows(s, seaTop(s))) launchPad(ctx, s, tone);
      rocketSky(ctx, s, tone);
      return ctx.getImageData(0, 0, W, H).data;
    };
    for (const lvl of [0, 18]) {
      // From the first ignition on, two trips later it all looks the same, but for the launch
      // tower's beacon, which blinks on its own (the scene's) clock.
      const s0 = sceneAt(W, H, lvl, 0);
      const bx = W / 2 + (PAD_X + 0.061) * s0.u;
      const by = horizon(s0) - (0.36 + 0.016) * PAD_SQUASH * s0.u;
      const r = s0.u * 0.012;
      for (const c of [IGNITE + 0.61, LIFTOFF + 2.21, GONE + 1.01, DESCEND + 2.51, BURN + 1.11, TOUCHDOWN + 0.31, TOUCHDOWN + 4.13, TRIP_START + PERIOD - 1.01]) {
        const a = pixels(c, lvl);
        const b = pixels(c + 2 * PERIOD, lvl);
        let n = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) continue;
          const x = (i / 4) % W;
          const y = Math.floor(i / 4 / W);
          if (Math.abs(x - bx) <= r && Math.abs(y - by) <= r) continue;
          n++;
        }
        expect(n, `level ${lvl}, ${c.toFixed(2)} s in: pixels differing two trips later`).toBe(0);
      }
      // As a later trip begins its sky still shows the last trip's trail, clearing; before the
      // arm swings away for the ignition it is gone, as at the start.
      const sky = (t: number) => {
        const s = sceneAt(W, H, lvl, t);
        const m = masker(W, H)((ctx) => rocketSky(ctx, s, toneOf(s)));
        return sum(m);
      };
      expect(sky(PERIOD + TRIP_START + 0.05), `level ${lvl}: the old trail at the trip's start`).toBeGreaterThan(sky(TRIP_START + PERIOD + 2.5));
      for (const t of [IGNITE - 1, IGNITE, LIFTOFF - 0.01]) expect(sky(PERIOD + t), `level ${lvl}: ${t} s into the next trip`).toBe(sky(t));
    }
  });

  it.each(SIZES)("%ix%i: the rocket never jumps on screen, wherever the camera is", { timeout: 60_000 }, (W, H) => {
    // Its nozzle on screen moves on smoothly from frame to frame through the whole trip, except
    // while it is hidden in its cloud, and through the hand-over to the next trip.
    for (const lvl of [0, 12, 16, 20, 24, 30, 40, 60]) {
      let last: { x: number; y: number } | null = null;
      for (let t = 0; t < TRIP_START + PERIOD + LIFTOFF; t += FRAME) {
        const r = rocketAt(t);
        if (r.phase === "gone") {
          last = null;
          continue;
        }
        const s = sceneAt(W, H, lvl, t);
        const at = { ...nozzleOnScreen(s, r) };
        if (last) {
          const jump = Math.hypot(at.x - last.x, at.y - last.y);
          expect(jump, `level ${lvl}, t=${t.toFixed(3)}: px moved in a frame`).toBeLessThan(s.u * 0.02);
        }
        last = at;
      }
    }
  });

  it.each(SIZES)("%ix%i: on its way down and landed it stands in front of its smoke, wherever the camera is", { timeout: 60_000 }, (W, H) => {
    // The owner's booster landing must read: once out of its cloud the rocket comes down in front
    // of its old corkscrew (never behind its near side, the landing burn hidden in the smoke), and
    // standing on its pad it stays in front of the smoke hanging over it, as the camera climbs (the
    // trail's foot comes down over its nose from about level 15) and as the next trip clears the
    // old trail. Every pixel of its cream body and red nose and band that the rocket shows drawn on
    // its own must show in the drawing with the smoke: above the land's nearer rows and the smoke
    // at its foot, which rightly stand in front of it, and right of its middle, clear of the vent's
    // wisp on its left shoulder, which is let out in front of it.
    let checked = 0;
    for (const lvl of [0, 8, 12, 16, 18]) {
      const times: number[] = [];
      for (let t = DESCEND + 2; t < TOUCHDOWN; t += 0.1) times.push(t);
      for (let t = TOUCHDOWN; t < TRIP_START + PERIOD + 3.5; t += 0.25) times.push(t);
      for (const t of times) {
        const s = sceneAt(W, H, lvl, t);
        const tone = toneOf(s);
        const land = landShows(s, seaTop(s));
        const smoke = smokeColors(s);
        const colors = [tone.landCream.body, tone.landCream.shade, tone.land[0].body].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
        const x0 = Math.ceil(W / 2 + (PAD_X - 0.02) * s.u);
        const y1 = Math.floor(horizon(s) - 0.13 * s.u);
        const body = (draw: (ctx: CanvasRenderingContext2D) => void) => {
          const ctx = context(W, H);
          draw(ctx);
          if (y1 < 1) return 0;
          const d = ctx.getImageData(x0, 0, W - x0, y1).data;
          let n = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3]! < 255) continue;
            if (colors.some(([r, g, b]) => Math.abs(d[i]! - r!) + Math.abs(d[i + 1]! - g!) + Math.abs(d[i + 2]! - b!) <= 6)) n++;
          }
          return n;
        };
        const alone = body((ctx) => {
          const c = only(ctx, (k) => !smoke.has(k));
          if (land) padRocket(c, s, tone);
          rocketSky(c, s, tone);
        });
        if (alone < 100) continue;
        checked++;
        const shown = body((ctx) => {
          if (land) launchPad(ctx, s, tone);
          rocketSky(ctx, s, tone);
        });
        expect(shown, `level ${lvl}, t=${t.toFixed(2)}: px of it showing, of ${alone}`).toBeGreaterThanOrEqual(alone * 0.98);
      }
    }
    expect(checked, "moments with the rocket on screen").toBeGreaterThan(300);
  });

  it.each(SIZES)("%ix%i: its landing legs slide out and back in without popping", { timeout: 60_000 }, (W, H) => {
    // The legs come out of their hinges and go back in: from one frame to the next, the legs as
    // drawn never jump in size (they would if they appeared, or vanished, at any length).
    const draw = masker(W, H);
    const legPixels = (t: number) => {
      const s = sceneAt(W, H, 0, t);
      const tone = toneOf(s);
      const [, yellow, blue] = tone.land;
      const legs = new Set([yellow.body, blue.shade]);
      return sum(
        draw((ctx) => {
          const c = only(ctx, (k) => legs.has(k));
          padRocket(c, s, tone);
          rocketSky(c, s, tone);
        }),
      );
    };
    // Folded away as it comes down, out by the landing burn, folded away again on the pad.
    const [t0, t1] = [BURN - 1.6, TOUCHDOWN + 5.5];
    expect(legPixels(t0)).toBe(0);
    expect(legPixels(t1)).toBe(0);
    for (const [a, b] of [
      [t0, BURN + 0.8],
      [TOUCHDOWN + 2.5, t1],
    ] as const) {
      let last = legPixels(a);
      let most = 0;
      for (let t = a + FRAME; t < b; t += FRAME) {
        const n = legPixels(t);
        most = Math.max(most, n);
        expect(Math.abs(n - last), `t=${t.toFixed(3)}: leg px from ${last} to ${n}`).toBeLessThanOrEqual(0.2 * Math.max(n, last) + 6);
        last = n;
      }
      expect(most, "the legs show").toBeGreaterThan(40);
    }
  });

  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): the rocket comes back out of its cloud without a pop", (W, H, u) => {
    for (const lvl of W > 600 ? [0, 14] : [16, 22]) {
      const visible = (t: number) => {
        const s = sceneAt(W, H, lvl, t, u);
        const smoke = smokeColors(s);
        const all = context(W, H);
        rocketSky(all, s, toneOf(s));
        const bare = context(W, H);
        rocketSky(only(bare, (k) => smoke.has(k)), s, toneOf(s));
        const a = all.getImageData(0, 0, W, H).data;
        const b = bare.getImageData(0, 0, W, H).data;
        let n = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!), Math.abs(a[i + 3]! - b[i + 3]!)) > 24) n++;
        }
        return n;
      };
      expect(visible(DESCEND), `level ${lvl}: still hidden in its cloud as it starts down`).toBeLessThanOrEqual(2);
      expect(visible(DESCEND + 1.5), `level ${lvl}: out of the cloud`).toBeGreaterThan(30);
    }
  });
});

/**
 * Moments through the launch, the way back down and the landing, the next trip's countdown (the
 * old trail clearing) and its launch, and long after.
 */
const MOMENTS = [
  IGNITE + 0.6,
  LIFTOFF + 0.8,
  LIFTOFF + 1.6,
  LIFTOFF + 2.4,
  LIFTOFF + 3,
  LIFTOFF + 3.5,
  LIFTOFF + 4,
  GONE - 0.15,
  GONE + 0.5,
  DESCEND + 0.8,
  DESCEND + 2.2,
  DESCEND + 3.4,
  BURN + 0.3,
  BURN + 1.4,
  TOUCHDOWN - 0.5,
  TOUCHDOWN + 0.2,
  TOUCHDOWN + 3.6,
  TRIP_START + PERIOD + 1.6,
  PERIOD + LIFTOFF + 2.4,
  90,
];
/** Masks are drawn at this fraction of the screen's size, to keep this quick. */
const K = 0.5;

function sum(m: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i]!;
  return n;
}

describe("toy kingdom rocket lane", () => {
  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))(
    "%ix%i (u %i): the rocket, its smoke and its cloud keep to the right lane at every height",
    { timeout: 120_000 },
    (W, H, u) => {
      const draw = masker(W, H, K);
      const w = Math.round(W * K);
      let seen = 0;
      for (let lvl = 0; lvl <= 100; lvl += 4) {
        for (const t of MOMENTS) {
          const s = sceneAt(W, H, lvl, t, u);
          const tone = toneOf(s);
          const land = landShows(s, seaTop(s));
          const sky = draw((ctx) => rocketSky(ctx, s, tone));
          const all = draw((ctx) => {
            if (land) launchPad(ctx, s, tone);
            rocketSky(ctx, s, tone);
          });
          const what = `level ${lvl}, t=${t.toFixed(2)}`;
          const c0 = (W / 2 - u * COLUMN) * K;
          const c1 = (W / 2 + u * COLUMN) * K;
          const floor = s.groundY * K;
          let column = 0;
          let edge = 0;
          for (let i = 0; i < all.length; i++) {
            if (!all[i]) continue;
            const x = i % w;
            const y = Math.floor(i / w);
            if (x >= c0 && x <= c1 && y < floor) column++;
            if (x <= 1 || x >= w - 2) edge++;
          }
          expect(column, `${what}: pixels in the tower's column`).toBe(0);
          expect(edge, `${what}: pixels at a side of the screen`).toBe(0);
          if (!sum(sky)) continue;
          seen++;
          // Nothing else in the sky at its depth, nor the sun or the moon, nor the far clouds behind it.
          const near = draw((ctx) => eachVisible(s, (p: Placed) => drawDrifter(ctx, s, tone, p), (l) => l >= FAR_LANES));
          const far = draw((ctx) => eachVisible(s, (p: Placed) => drawDrifter(ctx, s, tone, p), (l) => l < FAR_LANES));
          const top = seaTop(s);
          const lights = draw((ctx) => {
            sun(ctx, s, tone, top);
            moon(ctx, s, tone, top);
          });
          expect(overlap(sky, near), `${what}: over the near lanes' toys`).toBe(0);
          expect(overlap(sky, far), `${what}: over the far clouds`).toBe(0);
          expect(overlap(sky, lights), `${what}: over the sun or the moon`).toBe(0);
        }
      }
      expect(seen, "moments with the rocket's sky on screen").toBeGreaterThan(20);
    },
  );
});

/** The scene `t` seconds in at a tower level, on the phone. */
function at(W: number, H: number, lvl: number, t: number): Scene {
  return sceneAt(W, H, lvl, t);
}

describe("toy kingdom rocket trail", () => {
  // Landed and standing on its pad: its trail settled in the sky, the smoke at the pad gone.
  const LATE = TOUCHDOWN + 5;
  it.each(SIZES)("%ix%i: the corkscrew of smoke stays in the sky, and the tower climbs past it to the cloud", { timeout: 60_000 }, (W, H) => {
    const draw = masker(W, H);
    // At the start, long after the launch: a tall column of smoke up the right lane, from a little
    // above the launch tower (where its foot tapered away with the lift-off smoke under it) to the
    // top of the screen.
    const s0 = at(W, H, 0, LATE);
    const m0 = draw((ctx) => rocketSky(ctx, s0, toneOf(s0)));
    const gantry = horizon(s0) - 0.36 * PAD_SQUASH * s0.u;
    const foot = gantry - 0.21 * s0.u;
    let rows = 0;
    for (let y = 0; y < foot; y++) {
      let any = false;
      for (let x = Math.floor(W / 2 + s0.u * COLUMN); x < W && !any; x++) any = m0[y * W + x] === 1;
      if (any) rows++;
    }
    expect(rows, "rows of smoke from just above the launch tower up").toBeGreaterThan(foot * 0.98);
    // It is anchored in the world (at the near lanes' depth): as the camera climbs, it comes down
    // by NEAR_P of the climb. Compare two moments of the climb, the first shifted down.
    for (const lvl of [16, 24, 32]) {
      const a = at(W, H, lvl, LATE);
      const b = at(W, H, lvl + 2, LATE);
      const shift = Math.round(b.rise * NEAR_P - a.rise * NEAR_P);
      expect(shift).toBe(Math.round(2 * BLOCK_HEIGHT * a.scale * NEAR_P));
      const ma = draw((ctx) => rocketSky(ctx, a, toneOf(a)));
      const mb = draw((ctx) => rocketSky(ctx, b, toneOf(b)));
      let both = 0;
      let count = 0;
      // Above the land's skyline, where the smoke melts away (and above the cloud sea).
      const low = Math.min(horizon(a) - 0.45 * a.u, seaTop(a) - a.u * 0.25) - shift;
      for (let y = 0; y < low && y + shift < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!ma[y * W + x]) continue;
          count++;
          both += mb[(y + shift) * W + x]!;
        }
      }
      expect(count, `level ${lvl}: smoke on screen`).toBeGreaterThan(200);
      expect(both / count, `level ${lvl}: the smoke a level later is the same smoke, lower`).toBeGreaterThan(0.95);
    }
    // The tower climbs past it: beside the top of the tower (0.38 of the way down the screen, where
    // the camera holds it) there is smoke or the cloud for a long stretch of the climb, the cloud
    // the rocket flew into comes level with the top within a good run, and then it is all below.
    const beside = (lvl: number) => {
      const s = at(W, H, lvl, LATE);
      const m = draw((ctx) => rocketSky(ctx, s, toneOf(s)));
      const y0 = Math.round(H * 0.38);
      let n = 0;
      for (let y = y0 - 4; y <= y0 + 4; y++) for (let x = 0; x < W; x++) n += m[y * W + x]!;
      return n;
    };
    let run = 0;
    let best = 0;
    for (let lvl = 0; lvl <= 70; lvl++) {
      run = beside(lvl) > 0 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    expect(best, "levels climbed with the smoke beside the tower's top").toBeGreaterThanOrEqual(25);
    let reach = -1;
    for (let lvl = 0; lvl <= 80 && reach < 0; lvl++) {
      const s = at(W, H, lvl, LATE);
      if (layerGround(s, NEAR_P) - CLOUD_Z * s.u >= H * 0.38) reach = lvl;
    }
    expect(reach, "the level at which the tower's top reaches the cloud").toBeGreaterThan(12);
    expect(reach).toBeLessThan(55);
    expect(beside(reach), "the cloud is there").toBeGreaterThan(0);
    expect(beside(reach + 20), "and then it is below").toBe(0);
  });

  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): all gone well before the story loops", (W, H, u) => {
    const draw = masker(W, H, K);
    for (const lvl of [LOOP_START, LOOP_START + 40, 400]) {
      for (const t of [LIFTOFF + 2, 60, 600]) {
        const s = sceneAt(W, H, lvl, t, u);
        expect(sum(draw((ctx) => rocketSky(ctx, s, toneOf(s)))), `level ${lvl}, t=${t}`).toBe(0);
        expect(landShows(s, seaTop(s))).toBe(false);
      }
    }
  });
});

/** The smoke's and the clouds' colors in a tone (everything else rocketSky draws is the rocket). */
function smokeColors(s: Scene): Set<string> {
  const t = toneOf(s);
  return new Set([t.cloudShade, t.cloud, t.cloudLight, t.farCloudShade, t.farCloud, t.farCloudLight]);
}

/** A context that only fills and strokes in the colors `keep` passes (the rest of the drawing is skipped). */
function only(ctx: CanvasRenderingContext2D, keep: (color: string) => boolean): CanvasRenderingContext2D {
  let fill = "";
  let stroke = "";
  const call = (name: "fill" | "fillRect" | "stroke", color: () => string) => (...a: unknown[]) =>
    keep(color()) && (ctx[name] as (...b: unknown[]) => void).apply(ctx, a);
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === "fill" || prop === "fillRect") return call(prop, () => fill);
      if (prop === "stroke") return call(prop, () => stroke);
      const v: unknown = Reflect.get(target, prop, target);
      return typeof v === "function" ? (v as (...b: unknown[]) => unknown).bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === "fillStyle") fill = String(value);
      if (prop === "strokeStyle") stroke = String(value);
      return Reflect.set(target, prop, value, target);
    },
  });
}

/** Connected pieces of a mask (8-neighbors): each one's pixel count, and whether it touches the screen's edge. */
function pieces(m: Uint8Array, w: number, h: number): { n: number; edge: boolean }[] {
  const seen = new Uint8Array(m.length);
  const out: { n: number; edge: boolean }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue;
    let n = 0;
    let edge = false;
    seen[i] = 1;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      n++;
      const x = j % w;
      const y = (j - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (m[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
    }
    out.push({ n, edge });
  }
  return out;
}

/** How far (px) the nearest set pixel of a mask is from (x, y). */
function nearest(m: Uint8Array, w: number, x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const px = i % w;
    best = Math.min(best, Math.hypot(px + 0.5 - x, (i - px) / w + 0.5 - y));
  }
  return best;
}

describe("toy kingdom rocket smoke", () => {
  it.each(SIZES)("%ix%i: the smoke comes out of the rocket's nozzle all the way up, wherever the camera is", { timeout: 60_000 }, (W, H) => {
    const draw = masker(W, H);
    let frames = 0;
    // From the title's view to a run some way up when the rocket goes (the camera already risen).
    for (const lvl of [0, 14, 18, 22]) {
      for (let t = LIFTOFF + 0.2; t < GONE - 0.1; t += 1 / 15) {
        const s = sceneAt(W, H, lvl, t);
        const tone = toneOf(s);
        const smoke = smokeColors(s);
        const land = landShows(s, seaTop(s));
        const r = rocketAt(t);
        // The rocket as drawn (with the land while it is low, then in the sky), and the smoke: the
        // lift-off smoke at the pad and the trail.
        const rocket = draw((ctx) => {
          const c = only(ctx, (k) => !smoke.has(k));
          if (land) padRocket(c, s, tone);
          rocketSky(c, s, tone);
        });
        const puffs = draw((ctx) => {
          const c = only(ctx, (k) => smoke.has(k));
          if (land) launchPad(c, s, tone);
          rocketSky(c, s, tone);
        });
        const { x: nx, y: ny } = nozzleOnScreen(s, r);
        if (ny < 0 || ny >= H) continue;
        frames++;
        const what = `level ${lvl}, t=${t.toFixed(2)}`;
        // Its nozzle is on the rocket as drawn, and there is smoke right at it.
        expect(nearest(rocket, W, nx, ny), `${what}: px from the nozzle to the rocket`).toBeLessThan(2);
        expect(nearest(puffs, W, nx, ny), `${what}: px from the nozzle to its smoke`).toBeLessThan(s.u * 0.02);
      }
    }
    expect(frames, "frames checked").toBeGreaterThan(150);
  });

  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): the rocket goes into its cloud and is gone without a pop", (W, H, u) => {
    // Seen with the cloud in view (a run some way up; Hard's zoomed-out view from the start): the
    // rocket is still in sight a moment before it is gone, and none of it shows the frame before.
    for (const lvl of W > 600 ? [0, 14] : [16, 22]) {
      const visible = (t: number) => {
        const s = sceneAt(W, H, lvl, t, u);
        const smoke = smokeColors(s);
        const all = context(W, H);
        rocketSky(all, s, toneOf(s));
        const bare = context(W, H);
        rocketSky(only(bare, (k) => smoke.has(k)), s, toneOf(s));
        const a = all.getImageData(0, 0, W, H).data;
        const b = bare.getImageData(0, 0, W, H).data;
        let n = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!), Math.abs(a[i + 3]! - b[i + 3]!)) > 24) n++;
        }
        return n;
      };
      expect(visible(GONE - 0.4), `level ${lvl}: still in sight`).toBeGreaterThan(30);
      expect(visible(GONE - FRAME), `level ${lvl}: hidden in the cloud the frame before it is gone`).toBeLessThanOrEqual(2);
    }
  });

  /** The smallest puff of smoke allowed on its own (px): a dot of about 2.5 px across is a speck. */
  const SPECK = 20;
  it.each(SIZES)("%ix%i: the smoke thins away, and melts into the skyline as you climb, without leaving specks", { timeout: 60_000 }, (W, H) => {
    const draw = masker(W, H);
    const check = (lvl: number, t: number) => {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const m = draw((ctx) => {
        padSmokeBehind(ctx, s, tone);
        padSmokeFront(ctx, s, tone);
        rocketSky(ctx, s, tone);
      });
      for (const p of pieces(m, W, H)) {
        if (p.edge) continue;
        expect(p.n, `level ${lvl}, t=${t.toFixed(2)}: a speck of smoke`).toBeGreaterThan(SPECK);
      }
    };
    // The lift-off smoke thinning from the bottom up, the trail's foot tapering after it.
    for (const lvl of [0, 16]) for (let t = LIFTOFF + 8; t < LIFTOFF + 36; t += 0.25) check(lvl, t);
    // The trail's foot melting into the land's skyline as the tower climbs past it.
    for (let lvl = 0; lvl <= 60; lvl++) check(lvl, 60);
  });
});

describe("toy kingdom launch tower", () => {
  it.each(SIZES)("%ix%i: the launch tower and its pad still stand after the launch", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0.5);
    let t1 = 60;
    while (Math.sin(t1 * 2.2) > 0 !== Math.sin(0.5 * 2.2) > 0) t1 += 0.05;
    const s1 = { ...s0, t: t1 };
    const draw = masker(W, H);
    const before = draw((ctx) => launchPad(ctx, s0, toneOf(s0)));
    const after = draw((ctx) => launchPad(ctx, s1, toneOf(s1)));
    const u = s0.u;
    const ox = W / 2 + PAD_X * u;
    const hz = horizon(s0);
    // The tower above its service arm, and the pad block beside the rocket's foot.
    const boxes = [
      [ox + 0.03 * u, hz - 0.39 * u, ox + 0.095 * u, hz - 0.32 * u],
      [ox + 0.035 * u, hz - 0.03 * u, ox + 0.1 * u, hz],
    ];
    for (const [x0, y0, x1, y1] of boxes) {
      let same = 0;
      let n = 0;
      for (let y = Math.ceil(y0!); y < y1!; y++) {
        for (let x = Math.ceil(x0!); x < x1!; x++) {
          n++;
          if (before[y * W + x] === after[y * W + x]) same++;
        }
      }
      expect(same, `the same in ${Math.round(x0!)},${Math.round(y0!)}`).toBe(n);
    }
    // And the rocket has gone from beside it.
    const rocket = W / 2 + pathX(0.5) * u;
    const y = Math.round(hz - 0.2 * u);
    expect(before[y * W + Math.round(rocket)]).toBe(1);
    expect(after[y * W + Math.round(rocket)]).toBe(0);
  });
});

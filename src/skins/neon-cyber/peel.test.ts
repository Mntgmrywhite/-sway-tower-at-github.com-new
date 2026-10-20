import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import {
  actTime,
  BACK_FROM,
  BACK_TO,
  CALM,
  CYCLE,
  GO,
  IDLE,
  jiggleAt,
  pitch,
  power,
  puddleFill,
  racerX,
  REV,
  shieldAt,
  shiver,
  spin,
  sprayHits,
  travel,
} from "./peel";
import { lamp, machines, parked, PROPS, racer, racerCar, racerWater, rearPuddle, stall, walker, walkerCanopy, walkerShake } from "./street";
import { HALO_R, moonAt } from "./sky";
import { context, mask, overlap, sceneAt, SIZES, startScene } from "./test-scene";

// The start view's one action (the owner: "The car needs to drive off spraying the person with
// the umbrella. They shield themselves with the umbrella."), and it comes round again (the owner:
// "the car comes back and sprays her again"): the street racer parked at the curb by the umbrella
// walker revs, peels out at GO with its rear wheel throwing a rooster tail of water up at the
// walker, who has tipped the umbrella down sideways like a shield and takes the splash on it, and
// the racer speeds off out of the right edge. The walker shakes the umbrella off and lifts it back,
// and the puddle the wheelspin emptied refills from the wet street. At BACK_FROM the racer comes
// back round the block, in through the left edge and out from behind the vending machines, and
// pulls up at its spot again by BACK_TO, the walker peeking out warily from under a half-lowered
// umbrella; from IDLE the street is calm until the whole act comes round again, every CYCLE s.
// The first pass is all within the first 10 s (the owner's rule), at street level: below the
// tower's floor line in its column, never in the HUD or on "tap to drop", and meeting the other
// props only where the brief has it (the spray on the umbrella; the racer passing behind the
// parked hover car as it leaves and behind the vending machines as it comes back).

const DT = 1 / 24;
/** Frames from the start until just after the street is calm again. */
const TIMES = Array.from({ length: Math.ceil((CALM + 0.25) / DT) }, (_, i) => i * DT);
/** Frames from `from` to `to`, `step` apart. */
function frames(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.ceil((to - from) / step) }, (_, i) => from + i * step);
}
/** The peel-out and the spray, every frame. */
const LEAVE = frames(REV - 0.2, CALM + 0.25, DT);
/** The puddle refilling while the street is otherwise calm. */
const REFILL = [CALM + 0.4, CALM + 1.2, CALM + 2, CALM + 2.6];
/**
 * Frames of the whole first pass, out and back: every frame of the peel-out and the spray, every
 * other one while the racer rolls back in (at not even half the speed it leaves at).
 */
const PASS = [...LEAVE, ...REFILL, ...frames(BACK_FROM - 0.1, IDLE + 0.25, 2 * DT)];
/**
 * The same at a glance for where things may go on the street: the return keeps the racer to its
 * own row of the street, and the walker's peek is a gentler tip of the umbrella than the shield.
 */
const GLANCE = [...LEAVE, ...REFILL, ...frames(BACK_FROM - 0.1, IDLE + 0.25, 1 / 6)];
/**
 * Alpha (of 255) above which a pixel is the car itself, not its faint glow and the rippling
 * reflection under it (which keep moving with the rain while it idles).
 */
const CAR = 140;
/** Later passes checked against the first. */
const REPEATS = [1, 2, 5] as const;
/** Alpha (of 255) above which a pixel is solid: the lamp's cone and pool of light stay under it. */
const SOLID = 120;
/** These draw hundreds of frames each: room for a busy machine (the default is 5 s). */
const SLOW = 60_000;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;

function at(s: Scene, t: number): Scene {
  return { ...s, t };
}

/** Bounding box of a mask `w` wide, or null when it's empty. */
function box(m: Uint8Array, w: number): { x0: number; x1: number; y0: number; y1: number } | null {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x0, x1, y0, y1 };
}

/** When the walker first starts tipping the umbrella down against the spray (s into a pass). */
const SHIELD_START = (() => {
  for (let t = 0; t < CYCLE; t += 0.005) if (shieldAt(t) > 0) return t;
  return CYCLE;
})();

describe("neon cyberpunk peel-out", () => {
  it("happens within the first seconds: the rev, the launch, the shield up before the water lands and down after", () => {
    expect(REV).toBeGreaterThan(0);
    expect(GO, "the racer pulls away at about a second").toBeGreaterThanOrEqual(0.8);
    expect(GO).toBeLessThanOrEqual(1.5);
    expect(CALM, "and the street is calm again well within the first 10 s").toBeLessThanOrEqual(4);
    const step = 0.005;
    let up = Infinity;
    let down = Infinity;
    for (let t = 0; t <= 10; t += step) {
      if (up === Infinity && shieldAt(t) > 0) up = t;
      if (down === Infinity && shieldAt(t) === 1) down = t;
    }
    // The walker reacts to the rev, and tips the umbrella down quickly.
    expect(up, "the umbrella starts to tip after the rev").toBeGreaterThan(REV);
    expect(down - up, "tipping it down takes (s)").toBeLessThanOrEqual(0.3);
    const { first, last } = sprayHits();
    expect(down, "the shield is down before the first water lands").toBeLessThan(first);
    for (let t = down; t <= last; t += step) expect(shieldAt(t), `shield at t=${t.toFixed(3)}`).toBe(1);
    // Only a shudder while the water hits; the hard shakes come after.
    for (let t = first; t <= last; t += step) expect(Math.abs(jiggleAt(t)), `jiggle at t=${t.toFixed(3)}`).toBeLessThan(0.05);
    let shook = 0;
    for (let t = last; t <= CALM; t += step) shook = Math.max(shook, Math.abs(jiggleAt(t)));
    expect(shook, "the walker shakes the water off").toBeGreaterThan(0.15);
    // Then under the umbrella again, peeking out from under it, half lowered at most, while the
    // racer comes back round, and still from IDLE until the next pass.
    let peek = 0;
    for (let t = CALM; t < CYCLE + SHIELD_START; t += 0.01) {
      const what = `t=${t.toFixed(2)}`;
      expect(jiggleAt(t), `jiggle at ${what}`).toBe(0);
      if (t < BACK_FROM || t >= IDLE) {
        expect(shieldAt(t), `shield at ${what}`).toBe(0);
        continue;
      }
      expect(shieldAt(t), `peek at ${what}`).toBeLessThanOrEqual(0.5);
      peek = Math.max(peek, shieldAt(t));
    }
    expect(peek, "the walker peeks out as the racer comes back").toBeGreaterThan(0.3);
  }, SLOW);

  it("is all in the first 10 s and comes round again every 20 to 30 s, for as long as anyone watches", () => {
    expect(CALM).toBeLessThan(BACK_FROM);
    expect(BACK_FROM).toBeLessThan(BACK_TO);
    expect(BACK_TO).toBeLessThanOrEqual(IDLE);
    expect(IDLE, "the racer is back and the walker relaxed within the first 10 s").toBeLessThanOrEqual(10);
    expect(CYCLE).toBeGreaterThanOrEqual(20);
    expect(CYCLE).toBeLessThanOrEqual(30);
    expect(CYCLE, "a calm spell between passes (s)").toBeGreaterThanOrEqual(IDLE + 8);
    expect(actTime(0)).toBe(0);
    expect(actTime(CYCLE * 3 + 1.5)).toBeCloseTo(1.5, 9);
    const s = startScene(390, 844, 0);
    const x0 = 140;
    const L = 100;
    // (Off the act's boundaries: a clock n cycles on lands within a hair of the first pass's.)
    // Misses are collected rather than asserted one by one: 80 000 expects are slow on a busy machine.
    const misses: string[] = [];
    const near = (what: string, t: number, n: number, later: number, first: number, digits: number): void => {
      if (Math.abs(later - first) < 10 ** -digits / 2) return;
      if (misses.length < 8) misses.push(`${what} at t=${t.toFixed(3)}, ${n} cycles on: ${later} vs ${first}`);
    };
    for (let t = 0.005; t < CYCLE; t += 0.01) {
      for (const n of [1, 2, 3, 7, 50]) {
        const later = t + n * CYCLE;
        near("shield", t, n, shieldAt(later), shieldAt(t), 6);
        near("jiggle", t, n, jiggleAt(later), jiggleAt(t), 6);
        near("power", t, n, power(later), power(t), 6);
        near("pitch", t, n, pitch(later), pitch(t), 6);
        near("shiver", t, n, shiver(later), shiver(t), 4);
        near("puddle", t, n, puddleFill(later), puddleFill(t), 6);
        if (t < BACK_FROM && travel(t) > 3) continue; // long gone on the right
        near("racer's x", t, n, racerX(s, x0, L, later), racerX(s, x0, L, t), 3);
        near("wheels", t, n, spin(s, x0, L, later), spin(s, x0, L, t), 2);
      }
    }
    expect(misses, "values a later pass gets wrong").toEqual([]);
    // It idles at its spot from the end of its return to the next rev, just as at the start.
    for (let t = BACK_TO; t <= CYCLE + REV; t += 0.01) {
      expect(racerX(s, x0, L, t), `t=${t.toFixed(2)}`).toBe(x0);
      expect(spin(s, x0, L, t), `t=${t.toFixed(2)}`).toBe(0);
      expect(pitch(t)).toBe(0);
      expect(shiver(t)).toBe(0);
      if (t >= IDLE) expect(power(t), `lights idling at t=${t.toFixed(2)}`).toBe(power(0));
    }
  }, SLOW);

  it("the wheelspin empties the puddle under the racer, and it refills before the racer is back", () => {
    for (let t = 0; t <= GO; t += 0.01) expect(puddleFill(t)).toBe(1);
    expect(puddleFill(GO + 0.5), "emptied by the wheelspin").toBeLessThanOrEqual(0.5);
    let last = 0;
    for (let t = GO + 0.5; t <= BACK_FROM; t += 0.01) {
      expect(puddleFill(t), `t=${t.toFixed(2)}: only ever fills back up`).toBeGreaterThanOrEqual(last - 1e-9);
      last = puddleFill(t);
    }
    // Full again before the racer's wheels roll back into it, and full until the next spin.
    for (let t = BACK_FROM; t <= CYCLE + GO; t += 0.01) expect(puddleFill(t), `t=${t.toFixed(2)}`).toBe(1);
  });

  it.each(SIZES.flatMap(([W, H]) => [1, 0.8, 0.6].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the racer waits at the curb, then leaves through the right edge and is gone by CALM",
    (W, H, z) => {
      const s0 = z === 1 ? startScene(W, H, 0) : sceneAt(W, H, 0, 0, z);
      const w = Math.floor(s0.cssW);
      const h = Math.floor(s0.cssH);
      const parkedBox = box(mask(w, h, (ctx) => racerCar(ctx, at(s0, 0))), w)!;
      expect(parkedBox, "the racer is there at the start").not.toBeNull();
      expect(parkedBox.x0, "clear of the left edge").toBeGreaterThan(0);
      expect(parkedBox.x1, "clear of the right edge").toBeLessThan(w - 1);
      expect(parkedBox.y1, "clear of the bottom").toBeLessThan(h - 1);
      let front = parkedBox.x1;
      let touchedRight = false;
      let goneAt = Infinity;
      for (const t of TIMES) {
        const b = box(mask(w, h, (ctx) => racerCar(ctx, at(s0, t))), w);
        if (t < GO) {
          // Parked: it only shivers with the rev.
          expect(b, `t=${t.toFixed(2)}`).not.toBeNull();
          expect(Math.abs(b!.x0 - parkedBox.x0), `t=${t.toFixed(2)}: moved before the launch`).toBeLessThanOrEqual(1);
          continue;
        }
        if (!b) {
          goneAt = Math.min(goneAt, t);
          continue;
        }
        expect(goneAt, `t=${t.toFixed(2)}: came back after leaving`).toBe(Infinity);
        // Its nose only ever heads right (its speed streaks trail behind it).
        expect(b.x1, `t=${t.toFixed(2)}: only ever drives right`).toBeGreaterThanOrEqual(front - 1);
        expect(b.x0, `t=${t.toFixed(2)}: on the left edge`).toBeGreaterThan(0);
        expect(b.y1, `t=${t.toFixed(2)}: on the bottom edge`).toBeLessThan(h - 1);
        front = b.x1;
        if (b.x1 >= w - 1) touchedRight = true;
      }
      expect(touchedRight, "it drives out through the right edge").toBe(true);
      expect(goneAt, "gone by CALM (s)").toBeLessThan(CALM);
      expect(box(mask(w, h, (ctx) => racer(ctx, at(s0, CALM))), w), "nothing of it left at CALM").toBeNull();
    },
    SLOW,
  );

  it.each(SIZES.flatMap(([W, H]) => [1, 0.8, 0.6].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the racer comes back round, in through the left edge, and pulls up at its spot again",
    (W, H, z) => {
      const s0 = z === 1 ? startScene(W, H, 0) : sceneAt(W, H, 0, 0, z);
      const w = Math.floor(s0.cssW);
      const h = Math.floor(s0.cssH);
      // The car itself, without its faint glow and reflection.
      const car = (t: number) => box(mask(w, h, (ctx) => racerCar(ctx, at(s0, t)), 1, CAR), w);
      const parkedBox = car(0)!;
      // It slides in: as the return starts nothing of it, not even the faint pool of its
      // headlight on the wet floor, is on screen yet, so nothing blinks on at the left edge.
      expect(box(mask(w, h, (ctx) => racer(ctx, at(s0, BACK_FROM)), 1, 0), w), "drawn as the return starts").toBeNull();
      for (let t = CALM; t < BACK_FROM; t += 0.25) {
        expect(box(mask(w, h, (ctx) => racer(ctx, at(s0, t))), w), `t=${t}: nothing of the racer between passes`).toBeNull();
      }
      let front = -Infinity;
      let touchedLeft = false;
      let seen = false;
      for (let t = BACK_FROM; t <= BACK_TO + 0.5; t += DT) {
        const b = car(t);
        if (!b) {
          expect(seen, `t=${t.toFixed(2)}: vanished on the way back`).toBe(false);
          continue;
        }
        seen = true;
        if (b.x0 <= 0) touchedLeft = true;
        // It only ever heads right, slowing to a stop.
        expect(b.x1, `t=${t.toFixed(2)}: only ever drives right`).toBeGreaterThanOrEqual(front - 1);
        expect(b.x1, `t=${t.toFixed(2)}: past its spot`).toBeLessThanOrEqual(parkedBox.x1 + 1);
        expect(b.x1, `t=${t.toFixed(2)}: on the right edge`).toBeLessThan(w - 1);
        expect(b.y1, `t=${t.toFixed(2)}: on the bottom edge`).toBeLessThan(h - 1);
        front = b.x1;
      }
      expect(touchedLeft, "it comes in through the left edge").toBe(true);
      // Back at its spot and idling there, just as at the start, until the next pass.
      for (const t of [BACK_TO, BACK_TO + 0.5, IDLE, 13, CYCLE - 0.05, CYCLE + REV]) {
        const b = car(t)!;
        expect(b, `t=${t}`).not.toBeNull();
        for (const k of ["x0", "x1", "y0", "y1"] as const) expect(Math.abs(b[k] - parkedBox[k]), `t=${t}: parked ${k}`).toBeLessThanOrEqual(1);
      }
      const idle = mask(w, h, (ctx) => racer(ctx, at(s0, IDLE + 0.5)), 1, CAR);
      const start = mask(w, h, (ctx) => racer(ctx, at(s0, 0)), 1, CAR);
      let differ = 0;
      for (let i = 0; i < idle.length; i++) differ += idle[i]! ^ start[i]!;
      expect(differ, "pixels of the idling racer that differ from the start's").toBe(0);
    },
    SLOW,
  );

  it.each(SIZES.flatMap(([W, H]) => [0, ...REPEATS].map((n) => [W, H, n] as const)))(
    "%ix%i, pass %i: the spray flies from the racer's wheel onto the umbrella, held as a shield, and never past it",
    (W, H, n) => {
      const s0 = startScene(W, H, 0);
      const hits = sprayHits();
      const first = hits.first + n * CYCLE;
      const last = hits.last + n * CYCLE;
      let frames = 0;
      let hit = 0;
      let seen = 0;
      for (let t = first; t <= last; t += DT / 2) {
        const s = at(s0, t);
        const water = mask(W, H, (ctx) => racerWater(ctx, s));
        const person = mask(W, H, (ctx) => walker(ctx, s));
        frames++;
        if (overlap(water, person) > 0) hit++;
        // The walker's side of the canopy: behind its rim's line, seen from the street.
        const c = walkerCanopy(s);
        const ax = Math.sin(c.angle);
        const ay = -Math.cos(c.angle);
        let behind = 0;
        for (let i = 0; i < water.length; i++) {
          if (!water[i]) continue;
          seen++;
          const x = i % W;
          const y = Math.floor(i / W);
          if (y > c.y + c.r) continue; // splashes on the floor below the umbrella
          if ((x - c.x) * ax + (y - c.y) * ay < -s.u * 0.006) behind++;
        }
        expect(behind, `t=${t.toFixed(3)}: water on the walker's side of the umbrella`).toBe(0);
      }
      expect(seen, "the spray is drawn").toBeGreaterThan(500);
      expect(hit / frames, "share of the hit window with water on the umbrella").toBeGreaterThan(0.8);
    },
    SLOW,
  );

  it.each(SIZES.flatMap(([W, H]) => [0, 4, 12, 20].map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: frame by frame the action, out and back, keeps to the street: out of the tower's column above its floor, the HUD and 'tap to drop'",
    (W, H, lvl) => {
      const s0 = lvl === 0 ? startScene(W, H, 0) : sceneAt(W, H, lvl, 0);
      const x0 = Math.ceil(s0.baseX - s0.u * 0.05);
      const x1 = Math.floor(s0.baseX + s0.baseW + s0.u * 0.05);
      const floor = Math.min(H, Math.floor(s0.groundY));
      const hud = Math.round(H * 0.14 + s0.u * 0.13);
      // "tap to drop" sits centered at 90% of the height while a run waits for its first drop.
      const tap = { x0: W / 2 - s0.u * 0.22, x1: W / 2 + s0.u * 0.22, y0: H * 0.9 - s0.u * 0.05, y1: H * 0.9 + s0.u * 0.03 };
      for (const draw of [racer, walker, rearPuddle] as Draw[]) {
        for (const t of draw === rearPuddle ? REFILL : GLANCE) {
          const m = mask(W, H, (ctx) => draw(ctx, at(s0, t)));
          let column = 0;
          let top = 0;
          let onTap = 0;
          for (let i = 0; i < m.length; i++) {
            if (!m[i]) continue;
            const x = i % W;
            const y = Math.floor(i / W);
            if (y < floor && x >= x0 && x <= x1) column++;
            if (y < hud) top++;
            if (lvl === 0 && x >= tap.x0 && x <= tap.x1 && y >= tap.y0 && y <= tap.y1) onTap++;
          }
          const what = `${draw.name} at t=${t.toFixed(2)}`;
          expect(column, `${what}: pixels in the tower's column above its floor`).toBe(0);
          expect(top, `${what}: pixels in the HUD`).toBe(0);
          expect(onTap, `${what}: pixels on "tap to drop"`).toBe(0);
        }
      }
    },
    SLOW,
  );

  it.each(SIZES.flatMap(([W, H]) => [1, 0.6].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: out and back, at every height the street shows, nothing of the act comes near the moon or its halo",
    (W, H, z) => {
      // Nothing passes over the sun or the moon (the owner's rule). The act keeps to the street,
      // far below where the moon hangs; this holds it there.
      const k = 0.5;
      const moments = [0, REV + 0.1, GO + 0.15, GO + 0.3, GO + 0.5, GO + 0.8, 2, 2.6, BACK_FROM + 0.4, BACK_FROM + 1, BACK_FROM + 1.5, BACK_TO, IDLE];
      let seen = 0;
      for (const lvl of [0, 6, 12, 20]) {
        const s0 = sceneAt(W, H, lvl, 0, z);
        const w = Math.round(s0.cssW * k);
        const moon = moonAt(s0);
        const reach = moon.r * HALO_R * k;
        for (const t of moments) {
          for (const draw of [racer, walker] as Draw[]) {
            const m = mask(s0.cssW, s0.cssH, (ctx) => draw(ctx, at(s0, t)), k, 0);
            let near = 0;
            for (let i = 0; i < m.length; i++) {
              if (!m[i]) continue;
              seen++;
              const dx = (i % w) - moon.x * k;
              const dy = Math.floor(i / w) - moon.y * k;
              if (dx * dx + dy * dy < reach * reach) near++;
            }
            expect(near, `level ${lvl}, ${draw.name} at t=${t.toFixed(2)}: pixels on the moon or its halo`).toBe(0);
          }
        }
      }
      expect(seen, "the act is drawn").toBeGreaterThan(1000);
    },
    SLOW,
  );

  it.each(SIZES)("%ix%i: out and back, it meets the other props only where the brief has it", (W, H) => {
    const s0 = startScene(W, H, 0);
    const others: [string, Draw][] = [
      ["stall", stall],
      ["lamp", lamp],
      ["walker", walker],
      ["parked car", parked],
      ["vending machines", machines],
    ];
    for (const t of PASS) {
      const s = at(s0, t);
      const car = mask(W, H, (ctx) => racerCar(ctx, s));
      const water = mask(W, H, (ctx) => racerWater(ctx, s));
      for (const [name, draw] of others) {
        const m = mask(W, H, (ctx) => draw(ctx, s));
        const what = `t=${t.toFixed(2)}`;
        // As it leaves, the racer passes behind the parked hover car; coming back round, behind the vending machines.
        const leaving = name === "parked car" && t >= GO && t < BACK_FROM;
        const coming = name === "vending machines" && t >= BACK_FROM && t < BACK_TO;
        if (!leaving && !coming) expect(overlap(car, m), `${what}: the racer overlaps the ${name}`).toBe(0);
        // The spray's whole point is the umbrella; the lamp only shares its light.
        if (name === "walker") continue;
        if (name === "lamp") {
          const a = mask(W, H, (ctx) => racerWater(ctx, s), 1, SOLID);
          const b = mask(W, H, (ctx) => draw(ctx, s), 1, SOLID);
          expect(overlap(a, b), `${what}: the spray overlaps the lamp`).toBe(0);
          continue;
        }
        expect(overlap(water, m), `${what}: the spray overlaps the ${name}`).toBe(0);
      }
    }
  }, SLOW);

  it.each(SIZES)("%ix%i: between passes the street is calm: no racer or water until it comes back, then only the racer idling", (W, H) => {
    const s0 = startScene(W, H, 0);
    for (const n of [0, 2]) {
      for (let t = CALM; t < BACK_FROM; t += 0.5) {
        const m = mask(W, H, (ctx) => racer(ctx, at(s0, t + n * CYCLE)));
        expect(m.some((v) => v > 0), `t=${t + n * CYCLE}: the racer or its water is drawn`).toBe(false);
      }
      const still = mask(W, H, (ctx) => racerCar(ctx, at(s0, IDLE + n * CYCLE)), 1, CAR);
      for (let t = IDLE; t < CYCLE + REV; t += 1) {
        const s = at(s0, t + n * CYCLE);
        expect(mask(W, H, (ctx) => racerWater(ctx, s)).some((v) => v > 0), `t=${s.t}: water while it idles`).toBe(false);
        const m = mask(W, H, (ctx) => racerCar(ctx, s), 1, CAR);
        let differ = 0;
        for (let i = 0; i < m.length; i++) differ += m[i]! ^ still[i]!;
        expect(differ, `t=${s.t}: the idling racer moved`).toBe(0);
      }
    }
  }, SLOW);

  it.each(SIZES)("%ix%i: the racer leaves the props after it drawn exactly as they were (no canvas state carried over)", (W, H) => {
    const s0 = startScene(W, H, 0);
    const pixels = (s: Scene, skip: Draw | null): Uint8ClampedArray => {
      const ctx = context(W, H);
      for (const draw of PROPS) if (draw !== skip) draw(ctx, s);
      return ctx.getImageData(0, 0, W, H).data;
    };
    // Whatever it draws, the canvas is as it found it: a probe drawn after it with the styles,
    // widths, caps, joins, opacity and transform set before it lands exactly as on a fresh canvas.
    // (It draws only low on the street, well under the probe.)
    const probe = (ctx: CanvasRenderingContext2D): void => {
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(70, 40);
      ctx.lineTo(20, 80);
      ctx.stroke();
      ctx.fillRect(100, 20, 40, 30);
    };
    const setUp = (ctx: CanvasRenderingContext2D): void => {
      ctx.translate(3, 5);
      ctx.lineCap = "square";
      ctx.lineJoin = "bevel";
      ctx.lineWidth = 7;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#123456";
      ctx.strokeStyle = "#abcdef";
      ctx.setLineDash([6, 3]);
    };
    const region = (ctx: CanvasRenderingContext2D): Uint8ClampedArray => ctx.getImageData(0, 0, W, 120).data;
    const fresh = context(W, H);
    setUp(fresh);
    probe(fresh);
    const want = region(fresh);
    for (const t of [0, REV + 0.2, GO + 0.3, GO + 0.8, BACK_FROM + 0.8, BACK_TO - 0.3, IDLE + 1, CYCLE + GO + 0.3]) {
      const ctx = context(W, H);
      setUp(ctx);
      racer(ctx, at(s0, t));
      probe(ctx);
      const got = region(ctx);
      let differ = 0;
      for (let i = 0; i < got.length; i++) if (got[i] !== want[i]) differ++;
      expect(differ, `t=${t}: bytes of the probe that differ after the racer`).toBe(0);
    }
    // And while it is away it draws nothing at all.
    for (const t of [CALM, 4.5, CYCLE + 4.5]) {
      const s = at(s0, t);
      const a = pixels(s, null);
      const b = pixels(s, racer);
      let differ = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
      expect(differ, `t=${t}: bytes that differ with the racer drawn (it draws nothing by now)`).toBe(0);
    }
  }, SLOW);

  it.each(SIZES.flatMap(([W, H]) => [0, 2].map((n) => [W, H, n] as const)))(
    "%ix%i, pass %i: the walker shakes the water off toward the street, never over themselves",
    (W, H, n) => {
      const s0 = startScene(W, H, 0);
      let seen = 0;
      for (let t = 0; t <= CALM + 0.5; t += DT / 2) {
        const s = at(s0, t + n * CYCLE);
        const drops = mask(W, H, (ctx) => walkerShake(ctx, s));
        const c = walkerCanopy(s);
        const ax = Math.sin(c.angle);
        const ay = -Math.cos(c.angle);
        let behind = 0;
        for (let i = 0; i < drops.length; i++) {
          if (!drops[i]) continue;
          seen++;
          const x = i % W;
          const y = Math.floor(i / W);
          if ((x - c.x) * ax + (y - c.y) * ay < -s.u * 0.006) behind++;
        }
        expect(behind, `t=${t.toFixed(3)}: drops on the walker's side of the umbrella`).toBe(0);
      }
      expect(seen, "the shake-off is drawn").toBeGreaterThan(40);
    },
    SLOW,
  );
});

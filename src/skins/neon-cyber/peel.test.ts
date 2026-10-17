import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { CALM, GO, jiggleAt, REV, shieldAt, sprayHits } from "./peel";
import { lamp, machines, parked, PROPS, racer, racerCar, racerWater, stall, walker, walkerCanopy, walkerShake } from "./street";
import { context, mask, overlap, sceneAt, SIZES, startScene } from "./test-scene";

// The start view's one action (the owner: "The car needs to drive off spraying the person with
// the umbrella. They shield themselves with the umbrella."): the street racer parked at the curb
// by the umbrella walker revs, peels out at GO with its rear wheel throwing a rooster tail of
// water up at the walker, who has tipped the umbrella down sideways like a shield and takes the
// splash on it, and the racer speeds off out of the right edge. The walker shakes the umbrella off
// and lifts it back, and from CALM on the street is as still as before. All within the first 10 s
// (the owner's rule), at street level: below the tower's floor line in its column, never in the
// HUD or on "tap to drop", and meeting the other props only where the brief has it (the spray on
// the umbrella; the racer passing behind the parked hover car as it leaves).

const DT = 1 / 24;
/** Frames from the start until just after the street is calm again. */
const TIMES = Array.from({ length: Math.ceil((CALM + 0.25) / DT) }, (_, i) => i * DT);
/** Alpha (of 255) above which a pixel is solid: the lamp's cone and pool of light stay under it. */
const SOLID = 120;

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
    for (let t = CALM; t <= 30; t += 0.01) {
      expect(shieldAt(t), `shield at t=${t.toFixed(2)}`).toBe(0);
      expect(jiggleAt(t), `jiggle at t=${t.toFixed(2)}`).toBe(0);
    }
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
  );

  it.each(SIZES)("%ix%i: the spray flies from the racer's wheel onto the umbrella, held as a shield, and never past it", (W, H) => {
    const s0 = startScene(W, H, 0);
    const { first, last } = sprayHits();
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
  });

  it.each(SIZES.flatMap(([W, H]) => [0, 4, 12, 20].map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: frame by frame the action keeps to the street: out of the tower's column above its floor, the HUD and 'tap to drop'",
    (W, H, lvl) => {
      const s0 = lvl === 0 ? startScene(W, H, 0) : sceneAt(W, H, lvl, 0);
      const x0 = Math.ceil(s0.baseX - s0.u * 0.05);
      const x1 = Math.floor(s0.baseX + s0.baseW + s0.u * 0.05);
      const floor = Math.min(H, Math.floor(s0.groundY));
      const hud = Math.round(H * 0.14 + s0.u * 0.13);
      // "tap to drop" sits centered at 90% of the height while a run waits for its first drop.
      const tap = { x0: W / 2 - s0.u * 0.22, x1: W / 2 + s0.u * 0.22, y0: H * 0.9 - s0.u * 0.05, y1: H * 0.9 + s0.u * 0.03 };
      for (const draw of [racer, walker] as Draw[]) {
        for (const t of TIMES) {
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
    60_000,
  );

  it.each(SIZES)("%ix%i: it meets the other props only where the brief has it", (W, H) => {
    const s0 = startScene(W, H, 0);
    const others: [string, Draw][] = [
      ["stall", stall],
      ["lamp", lamp],
      ["walker", walker],
      ["parked car", parked],
      ["vending machines", machines],
    ];
    for (const t of TIMES) {
      const s = at(s0, t);
      const car = mask(W, H, (ctx) => racerCar(ctx, s));
      const water = mask(W, H, (ctx) => racerWater(ctx, s));
      for (const [name, draw] of others) {
        const m = mask(W, H, (ctx) => draw(ctx, s));
        const what = `t=${t.toFixed(2)}`;
        // As it leaves, the racer passes behind the parked hover car.
        if (name !== "parked car" || t < GO) expect(overlap(car, m), `${what}: the racer overlaps the ${name}`).toBe(0);
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
  }, 60_000);

  it.each(SIZES)("%ix%i: afterwards the street is calm: the racer and its water are gone for good", (W, H) => {
    const s0 = startScene(W, H, 0);
    for (let t = CALM; t <= 12; t += 0.25) {
      const m = mask(W, H, (ctx) => racer(ctx, at(s0, t)));
      expect(m.some((v) => v > 0), `t=${t}: the racer or its water is still drawn`).toBe(false);
    }
  });

  it.each(SIZES)("%ix%i: the racer leaves the props after it drawn exactly as they were (no canvas state carried over)", (W, H) => {
    const s0 = startScene(W, H, 0);
    const pixels = (s: Scene, skip: Draw | null): Uint8ClampedArray => {
      const ctx = context(W, H);
      for (const draw of PROPS) if (draw !== skip) draw(ctx, s);
      return ctx.getImageData(0, 0, W, H).data;
    };
    for (const t of [CALM, 4.5, 8, 12]) {
      const s = at(s0, t);
      const a = pixels(s, null);
      const b = pixels(s, racer);
      let differ = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
      expect(differ, `t=${t}: bytes that differ with the racer drawn (it draws nothing by now)`).toBe(0);
    }
  });

  it.each(SIZES)("%ix%i: the walker shakes the water off toward the street, never over themselves", (W, H) => {
    const s0 = startScene(W, H, 0);
    let seen = 0;
    for (let t = 0; t <= CALM + 0.5; t += DT / 2) {
      const s = at(s0, t);
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
  });
});

import { describe, expect, it } from "vitest";
import { CYCLE } from "./flight";
import { RIDE_LOOP, riderAt, riderBox } from "./hollow";
import { horseman } from "./horseman";
import { mask, sceneAt, SIZES } from "./test-scene";

// The Headless Horseman's ride: out of the mist, past the moon and into the covered bridge, then
// turned round, charging back up the hill (faster, the pumpkin thrust up high) and into the mist.
// His box (what the crow keeps clear of) holds all of his drawing either way, he never jumps, and
// every loop is the same ride, a whole number of which make one of the crow's cycles.

const DT = 1 / 60;

describe.each(SIZES)("halloween Horseman, %ix%i", (W, H) => {
  const at = (t: number) => sceneAt(W, H, 0, t);

  it("his box holds all of his drawing, riding out and charging back", () => {
    let seen = 0;
    for (let t = 0; t < RIDE_LOOP; t += 0.1) {
      const s = at(t);
      const box = riderBox(s);
      if (!box) continue;
      const r = { ...riderAt(s) };
      seen++;
      const m = mask(W, H, (ctx) => horseman(ctx, r.x, r.y, r.size, s.t, r.tilt, 1, r.dir, r.charge));
      let outside = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x < box.x0 - 1 || x > box.x1 + 1 || y < box.y0 - 1 || y > box.y1 + 1) outside++;
        }
      }
      expect(drawn, `t=${t.toFixed(1)}: drawn`).toBeGreaterThan(200);
      expect(outside, `t=${t.toFixed(1)}: pixels outside his box`).toBe(0);
    }
    expect(seen, "out on both rides").toBeGreaterThan(40);
  });

  it("charges back much faster than he rode out, the pumpkin held higher", () => {
    const speed = (dir: number) => {
      let dist = 0;
      let time = 0;
      for (let t = 0; t < RIDE_LOOP; t += DT) {
        const a = riderAt(at(t));
        if (a.vis < 0.5 || a.dir !== dir) continue;
        const x = a.x;
        const b = riderAt(at(t + DT));
        if (b.vis < 0.5 || b.dir !== dir) continue;
        dist += Math.abs(b.x - x);
        time += DT;
      }
      return dist / time;
    };
    expect(speed(-1) / speed(1)).toBeGreaterThan(1.5);
    // The top of his drawing (the pumpkin's flame) above the ground under him, in his size unit,
    // drawn large and untilted at each moment of his charge: as he charges, and as he would ride out.
    const S = 40;
    const top = (t: number, dir: number, charge: number) => {
      const m = mask(200, 200, (ctx) => horseman(ctx, 100, 190, S, t, 0, 1, dir, charge));
      return (190 - Math.floor(m.findIndex((v) => v === 1) / 200)) / S;
    };
    let charging = 0;
    let higher = 0;
    for (let t = 0; t < RIDE_LOOP; t += 0.1) {
      const r = { ...riderAt(at(t)) };
      if (r.vis < 0.5 || r.dir > 0) continue;
      charging++;
      expect(r.charge, `t=${t.toFixed(1)}: charging`).toBe(1);
      higher += top(t, -1, 1) - top(t, 1, 0);
    }
    expect(charging, "frames of his charge").toBeGreaterThan(10);
    // On average: the gallop bobs it a little either way.
    expect(higher / charging, "the pumpkin held higher").toBeGreaterThan(0.15);
  });

  it("never jumps while he is seen", () => {
    let last: { x: number; y: number; dir: number } | null = null;
    for (let t = 0; t < RIDE_LOOP * 2; t += DT) {
      const r = riderAt(at(t));
      if (r.vis <= 0.02) {
        last = null;
        continue;
      }
      if (last) {
        expect(Math.hypot(r.x - last.x, r.y - last.y), `t=${t.toFixed(2)}: jump`).toBeLessThan(W * 0.01);
        expect(r.dir, `t=${t.toFixed(2)}: turned round in plain sight`).toBe(last.dir);
      }
      last = { x: r.x, y: r.y, dir: r.dir };
    }
  });
});

describe("halloween Horseman's loop", () => {
  it("rides the same way every loop", () => {
    for (let t = 0; t < RIDE_LOOP; t += 0.37) {
      const a = { ...riderAt(sceneAt(390, 844, 0, t)) };
      const b = { ...riderAt(sceneAt(390, 844, 0, t + 3 * RIDE_LOOP)) };
      expect(b.vis, `t=${t.toFixed(2)}`).toBeCloseTo(a.vis, 6);
      if (a.vis <= 0) continue;
      for (const key of ["x", "y", "size", "tilt", "dir", "charge"] as const) {
        expect(b[key], `t=${t.toFixed(2)}: ${key}`).toBeCloseTo(a[key], 6);
      }
    }
  });

  it("fits a whole number of times into the crow's cycle, so their turns at the moon never meet", () => {
    expect(CYCLE % RIDE_LOOP).toBe(0);
  });
});

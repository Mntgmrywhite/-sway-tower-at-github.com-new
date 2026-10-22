import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { inkW } from "./common";
import { crowFlying } from "./crow";
import { crowPose, TAKE_OFF } from "./flight";
import { graveState } from "./graves";
import { riderAt } from "./hollow";
import { horseman } from "./horseman";
import { hopAt, KIDS } from "./kids";
import { moonAt } from "./sky";
import { mask, sceneAt, SCREENS } from "./test-scene";

// The owner's rule: any action happens within the first 10 s of a scene (a fresh tower on the
// title screen, or a new run), because after that players have climbed past it. Everything a
// player watches happen in the start view (the Headless Horseman's ride past the moon, the crow's
// turn round the moon, the graves' skeleton parts, the crow's caw, the kids' hops) happens for the
// first time, key moment done, by then; later repeats keep their own rhythm. The one exception the
// owner asked for: the Horseman's charge back up the hill, which waits in the bridge for the crow
// to finish round the moon, starts by 10 s and is gone into the mist by ~12 s. Ambient motion (the
// flock circling the steeple, flicker, blowing leaves) and things keyed to height (the bats) are
// not actions. All read from the skin's own timing functions.

const OPENING = 10;
const DT = 1 / 60;

/** How many pixels of the Horseman's and the flying crow's drawings fall on the moon's disc. */
function onMoon(s: Scene): { rider: number; crow: number } {
  const { x, y, r } = moonAt(s);
  const side = Math.ceil(2 * r);
  const count = (draw: (ctx: CanvasRenderingContext2D) => void): number => {
    const m = mask(side, side, (ctx) => {
      ctx.translate(-(x - r), -(y - r));
      draw(ctx);
    });
    let n = 0;
    for (let py = 0; py < side; py++) {
      for (let px = 0; px < side; px++) if (m[py * side + px] && Math.hypot(px + 0.5 - r, py + 0.5 - r) < r) n++;
    }
    return n;
  };
  const h = { ...riderAt(s) };
  const p = { ...crowPose(s) };
  const lw = inkW(s, 3 / p.z);
  return {
    rider: h.vis > 0.02 ? count((ctx) => horseman(ctx, h.x, h.y, h.size, s.t, h.tilt, 1, h.dir, h.charge)) : 0,
    crow: p.perched ? 0 : count((ctx) => crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, lw)),
  };
}

/** The first moment in [0, to) that `test` holds, or Infinity. */
function first(test: (t: number) => boolean, to = 60): number {
  for (let t = 0; t < to; t += DT) if (test(t)) return t;
  return Infinity;
}

describe.each(SCREENS)("halloween opening, %ix%i", (W, H) => {
  const at = (t: number) => sceneAt(W, H, 0, t);

  it("the Headless Horseman comes out of the mist, gallops past the moon and is into the bridge by 10 s", () => {
    expect(riderAt(at(0)).vis, "not already riding when the scene starts").toBeLessThan(0.02);
    const out = first((t) => riderAt(at(t)).vis > 0.02);
    const onMoon = first((t) => {
      const s = at(t);
      const r = riderAt(s);
      const m = moonAt(s);
      return r.vis > 0.5 && Math.abs(r.x - m.x) < m.r * 0.3;
    });
    const gone = first((t) => t > out && riderAt(at(t)).vis <= 0.02);
    expect(out, "comes out of the mist").toBeLessThan(2);
    expect(onMoon, "crosses the moon's face").toBeLessThan(OPENING);
    expect(gone, "rides into the bridge").toBeLessThan(OPENING);
  });

  it("the crow takes off and has circled the moon twice by 10 s", () => {
    expect(crowPose(at(0)).perched, "on its stone when the scene starts").toBe(true);
    const off = first((t) => !crowPose(at(t)).perched);
    expect(off, "takes off").toBeLessThan(OPENING);
    // Its body over the moon's disc: once per turn on each side (two turns, crossing the face).
    let passes = 0;
    let last = -Infinity;
    let was = false;
    for (let t = off; t < off + 15; t += DT) {
      const s = at(t);
      const p = crowPose(s);
      if (p.perched) break;
      const m = moonAt(s);
      const over = Math.hypot(p.x - m.x, p.y - m.y) < m.r;
      if (over && !was) passes++;
      if (over) last = t;
      was = over;
    }
    expect(passes, "crosses the moon on each turn").toBeGreaterThanOrEqual(2);
    expect(last, "its turns round the moon are done").toBeLessThan(OPENING);
  });

  it("the crow caws within 10 s", () => {
    expect(first((t) => crowPose(at(t)).caw > 0.3)).toBeLessThan(OPENING);
  });

  it("then turns in the bridge and charges back up the hill, across the moon and into the mist, by ~12 s", () => {
    const out = first((t) => riderAt(at(t)).vis > 0.02);
    const gone = first((t) => t > out && riderAt(at(t)).vis <= 0.02);
    const back = first((t) => t > gone && riderAt(at(t)).vis > 0.02);
    const away = first((t) => t > back && riderAt(at(t)).vis <= 0.02);
    expect(back, "bursts back out of the bridge").toBeLessThan(OPENING);
    expect(away, "gone into the mist").toBeLessThan(12.5);
    // Turned round, charging: facing left, the pumpkin thrust up high.
    expect({ dir: riderAt(at(back)).dir, charge: riderAt(at(back)).charge }).toEqual({ dir: -1, charge: 1 });
    expect({ dir: riderAt(at(out)).dir, charge: riderAt(at(out)).charge }).toEqual({ dir: 1, charge: 0 });
    // Out of the bridge's portal, at the foot of the hill, up it and across the moon's face.
    const start = { ...riderAt(at(back)) };
    const s0 = at(back);
    expect(Math.abs(start.x - s0.cssW / 2), "at the bridge's portal").toBeLessThan(s0.u * 0.05);
    const onMoon = first((t) => {
      const s = at(t);
      const r = riderAt(s);
      const m = moonAt(s);
      return t > back && r.vis > 0.5 && r.dir < 0 && Math.abs(r.x - m.x) < m.r * 0.3;
    });
    expect(onMoon, "crosses the moon's face going back").toBeLessThan(away);
    const top = { ...riderAt(at(onMoon)) };
    expect(start.y - top.y, "up the hill").toBeGreaterThan(s0.u * 0.08);
    // Up the slope every step of the way, and always on to the left.
    let last = { ...start };
    for (let t = back + DT; t < onMoon; t += DT) {
      const r = riderAt(at(t));
      expect(r.x, `t=${t.toFixed(2)}: on to the left`).toBeLessThan(last.x);
      expect(r.y, `t=${t.toFixed(2)}: never down the hill`).toBeLessThan(last.y + 0.5);
      last = { ...r };
    }
    // Into the mist on the left, where he came out of it.
    const end = riderAt(at(away - DT));
    const m = moonAt(at(away));
    expect(end.x, "into the mist on the left").toBeLessThan(m.x - m.r * 0.6);
  });

  it("the Horseman and the crow take turns: he is out first, past the moon before the crow gets there, and back across it only once the crow has left it", () => {
    const out = first((t) => riderAt(at(t)).vis > 0.02);
    expect(TAKE_OFF - out, "the crow leaves its stone a beat after he comes out").toBeGreaterThan(1);
    const crowOver = (t: number) => {
      const s = at(t);
      const p = crowPose(s);
      const m = moonAt(s);
      return !p.perched && Math.hypot(p.x - m.x, p.y - m.y) < m.r;
    };
    const crowOnMoon = first(crowOver);
    const s = at(crowOnMoon);
    const r = riderAt(s);
    const m = moonAt(s);
    expect(r.vis < 0.02 || r.x > m.x + m.r, "the Horseman is past the moon's face").toBe(true);
    // Charging back, he reaches the moon's disc only after the crow's last pass over it.
    const gone = first((t) => t > out && riderAt(at(t)).vis <= 0.02);
    const back = first((t) => t > gone && riderAt(at(t)).vis > 0.02);
    const backOnMoon = first((t) => {
      const s = at(t);
      const r = riderAt(s);
      return t > back && r.vis > 0.02 && r.x < moonAt(s).x + moonAt(s).r;
    });
    let last = crowOnMoon;
    for (let t = crowOnMoon; t < backOnMoon + 2; t += DT) if (crowOver(t)) last = t;
    expect(last, "the crow's turns are done before he charges back across the moon").toBeLessThan(backOnMoon);
    // And his next ride comes out of the mist only once the crow is back on its stone.
    const away = first((t) => t > back && riderAt(at(t)).vis <= 0.02);
    const again = first((t) => t > away && riderAt(at(t)).vis > 0.02);
    expect(crowPose(at(again)).perched, "the crow is home when he rides again").toBe(true);
  });

  it("they are never on the moon's face together: each hands it over to the other a beat before", () => {
    const last = { rider: -Infinity, crow: -Infinity };
    let holder: "rider" | "crow" | null = null;
    let handovers = 0;
    for (let t = 0; t < 12.5; t += 1 / 30) {
      const n = onMoon(at(t));
      expect(n.rider > 0 && n.crow > 0, `t=${t.toFixed(2)}: both on the moon's face`).toBe(false);
      for (const who of ["rider", "crow"] as const) {
        if (n[who] <= 0) continue;
        if (holder !== null && holder !== who) {
          expect(t - last[holder], `t=${t.toFixed(2)}: the ${who} onto the moon right as the ${holder} leaves it`).toBeGreaterThan(0.1);
          handovers++;
        }
        holder = who;
        last[who] = t;
      }
    }
    expect(handovers, "he hands the moon to the crow, and the crow hands it back").toBe(2);
  });
});

describe("halloween opening, the churchyard and the street", () => {
  it("every grave pops a skeleton part up within 10 s, and all three parts are seen", () => {
    const parts = new Set<number>();
    for (let g = 0; g < 3; g++) {
      let was = graveState(0, g).up > 0.01;
      let popped = Infinity;
      for (let t = DT; t < OPENING; t += DT) {
        const st = graveState(t, g);
        const up = st.up > 0.01;
        if (up) parts.add(st.part);
        if (up && !was) popped = Math.min(popped, t);
        was = up;
      }
      expect(popped, `grave ${g} pops a part up`).toBeLessThan(OPENING);
    }
    expect(parts.size, "hand, skull and feet").toBe(3);
  });

  it("every trick-or-treater hops within 10 s", () => {
    for (const k of KIDS) expect(first((t) => hopAt(t, k.phase) > 0.5), k.costume).toBeLessThan(OPENING);
  });
});

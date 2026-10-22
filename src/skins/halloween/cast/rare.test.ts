import { describe, expect, it } from "vitest";
import type { Scene } from "../../skin";
import { crowBox } from "../flight";
import { riderBox } from "../hollow";
import { moonAt } from "../sky";
import { sceneAt, SCREENS } from "../test-scene";
import { MAX_GAP, moonFree, RARE_FIRST, rareAt, type RareKind } from "./rare";

// Rare events are rare, but the first comes in the opening (the guide: at least one within 15 s),
// one at a time, never the same kind twice running, a quarter-minute or so apart on average and
// never more than half a minute, and every kind about as often as every other. The
// massive shadow over the moon only ever crosses it while the moon is free: never while the
// Headless Horseman rides across it or the crow circles it (checked against their own timing at
// the start view, on every screen).

const DT = 1 / 30;
type Ev = { kind: RareKind; t0: number; dur: number };

/** The events in [0, to), as the director reports them frame by frame. */
function events(to: number): Ev[] {
  const out: Ev[] = [];
  for (let t = 0; t < to; t += DT) {
    const r = rareAt(t);
    if (!r) continue;
    const last = out[out.length - 1];
    if (!last || last.t0 !== r.t0) out.push({ kind: r.kind, t0: r.t0, dur: r.dur });
  }
  return out;
}

/** Whether the box touches the moon's disc. */
function onDisc(b: { x0: number; y0: number; x1: number; y1: number } | null, s: Scene): boolean {
  if (!b) return false;
  const m = moonAt(s);
  const cx = Math.max(b.x0, Math.min(m.x, b.x1));
  const cy = Math.max(b.y0, Math.min(m.y, b.y1));
  return Math.hypot(cx - m.x, cy - m.y) < m.r;
}

describe("halloween rare events", () => {
  const list = events(1800);

  it("the first comes in the opening: the bats scattering at 10.8 s, then the shadow over the moon at 20 s", () => {
    for (let t = 0; t < RARE_FIRST - 0.01; t += DT) expect(rareAt(t), `t=${t.toFixed(2)}`).toBeNull();
    expect(list[0], "the first").toEqual({ kind: "scatter", t0: RARE_FIRST, dur: 2.5 });
    expect(list[0]!.t0).toBeLessThanOrEqual(15);
    expect(list[1], "the second").toEqual({ kind: "shadow", t0: 20, dur: 2.4 });
  });

  it("one at a time, never the same kind twice running, about every 16-28 s, all five kinds", () => {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!;
      const b = list[i]!;
      expect(b.t0, `event ${i} overlaps the one before`).toBeGreaterThanOrEqual(a.t0 + a.dur);
      expect(b.kind, `event ${i} at ${b.t0.toFixed(1)} s: the same kind twice running`).not.toBe(a.kind);
    }
    const mean = (list[list.length - 1]!.t0 - list[0]!.t0) / (list.length - 1);
    expect(mean, "mean spacing").toBeGreaterThanOrEqual(16);
    expect(mean, "mean spacing").toBeLessThanOrEqual(28);
    const kinds = new Set(list.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(["carriage", "eyes", "peek", "scatter", "shadow"]);
    for (const k of kinds) expect(list.filter((e) => e.kind === k).length, `${k} in half an hour`).toBeGreaterThanOrEqual(4);
  });

  it("never keeps you waiting more than half a minute, and deals every kind about as often (over three hours)", () => {
    const long = events(3 * 3600);
    expect(list[0]!.t0, "the first").toBeLessThanOrEqual(15);
    expect(MAX_GAP).toBeLessThanOrEqual(30);
    for (let i = 1; i < long.length; i++) {
      expect(long[i]!.t0 - long[i - 1]!.t0, `from the event at ${long[i - 1]!.t0.toFixed(1)} s to the next`).toBeLessThanOrEqual(30);
    }
    const mean = long.length / 5;
    for (const k of ["scatter", "shadow", "peek", "carriage", "eyes"] as const) {
      const n = long.filter((e) => e.kind === k).length;
      expect(n, `${k}: ${n} of ${long.length}`).toBeGreaterThanOrEqual(mean * 0.88);
      expect(n, `${k}: ${n} of ${long.length}`).toBeLessThanOrEqual(mean * 1.12);
    }
    // And in every half hour each kind comes at least a dozen times (the eyes too).
    for (let h = 0; h < 6; h++) {
      const part = long.filter((e) => e.t0 >= h * 1800 && e.t0 < (h + 1) * 1800);
      for (const k of ["scatter", "shadow", "peek", "carriage", "eyes"] as const) {
        expect(part.filter((e) => e.kind === k).length, `${k} in half hour ${h}`).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it("the shadow crosses the moon only while the moon is free of the Horseman and the crow", () => {
    const shadows = list.filter((e) => e.kind === "shadow");
    expect(shadows.length).toBeGreaterThan(5);
    for (const e of shadows) expect(moonFree(e.t0, e.t0 + e.dur), `shadow at ${e.t0.toFixed(1)} s`).toBe(true);
    // And on every screen, at every frame of every shadow in the first five minutes, neither of
    // them is on the moon's disc.
    for (const [W, H] of SCREENS) {
      for (const e of shadows.filter((x) => x.t0 < 300)) {
        for (let t = e.t0; t <= e.t0 + e.dur; t += DT) {
          const s = sceneAt(W, H, 0, t);
          expect(onDisc(riderBox(s), s), `${W}x${H} t=${t.toFixed(2)}: the Horseman on the moon during a shadow`).toBe(false);
          expect(onDisc(crowBox(s), s), `${W}x${H} t=${t.toFixed(2)}: the crow on the moon during a shadow`).toBe(false);
        }
      }
    }
  });

  it("moonFree agrees with the Horseman's and the crow's own timing over five minutes", () => {
    let free = 0;
    for (let t = 0; t < 300; t += DT) {
      if (!moonFree(t, t)) continue;
      free++;
      for (const [W, H] of SCREENS) {
        const s = sceneAt(W, H, 0, t);
        expect(onDisc(riderBox(s), s) || onDisc(crowBox(s), s), `${W}x${H} t=${t.toFixed(2)}: called free, but taken`).toBe(false);
      }
    }
    // It is not simply "never free": the moon is free for a good part of each half minute.
    expect(free * DT, "seconds the moon is free").toBeGreaterThan(60);
  });

  it("is a pure function of time, whatever order it is asked in", () => {
    const T = Array.from({ length: 80 }, (_, i) => 10 + ((i * 53.7) % 1500));
    const at = (t: number) => JSON.stringify(rareAt(t));
    const forward = T.map(at);
    const back = [...T].reverse().map((t) => {
      rareAt(3000 - t);
      return at(t);
    });
    expect(back.reverse()).toEqual(forward);
  });
});

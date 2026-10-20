import { describe, expect, it } from "vitest";
import { drawDrifter, eachVisible } from "./drift";
import { floorTop } from "./far";
import { BLOOM, eachBurst, RISE } from "./fireworks";
import { hatTip, PARADE_AT, paradeX, PERIOD, SPEED, unitX, UNITS } from "./parade";
import { FLIP_AT, FLIP_EVERY, flipAt, sparklerKids } from "./square";
import { mask, sceneAt, SIZES } from "./test-scene";
import { level, SHOW_FROM, toneAtLevel, toneOf } from "./tone";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. The scene's clock starts at 0 with a fresh tower (the title
// screen, or play again), so every action the start view shows happens for the first time, key
// moment included, by OPENING; later repeats keep their own rhythm.
//
// What the start view shows over time on the Fourth: the parade stepping in from the left and
// passing the bandstand, every unit of it (the drum major, the color guard, the band, the fire
// truck, Uncle Sam, the girl on her bike and the dog) past the tower by ten seconds, Uncle Sam
// tipping his hat right in front of it, and the cook flipping a burger. The rest is ambient:
// the baton and the sticks, the waving kids, the sparklers, the eagle circling, the balloons
// bobbing, the courthouse flag and the barbecue smoke. The fireworks come with the night you
// climb to, so they are exempt.

const OPENING = 10;
const FRAME = 1 / 60;

/** The phones and the iPads (whose center is further from the left edge the parade steps in from). */
const SCREENS = [...SIZES, [768, 1024], [1024, 1366]] as const;

describe("independence day's actions happen in the first 10 seconds", () => {
  it.each(SCREENS)("%ix%i: the whole parade passes the tower, and comes round again", (W, H) => {
    const s = sceneAt(W, H, 0, 0);
    const cx = s.baseX + s.baseW / 2;
    expect(paradeX(0)).toBeLessThan(0);
    expect(paradeX(PARADE_AT + 1) * s.u, "the drum major has stepped in by a second after the start").toBeGreaterThan(0);
    for (const { unit } of UNITS) {
      let passed = -1;
      for (let t = 0; t < OPENING + 5; t += FRAME) {
        if (unitX(s, unit, t) >= cx) {
          passed = t;
          break;
        }
      }
      expect(passed, `${unit} passes the tower`).toBeGreaterThan(0);
      expect(passed, `${unit} passes the tower in time`).toBeLessThan(OPENING);
    }
    // The parade keeps walking at its pace and comes round the block again a PERIOD later.
    expect(paradeX(PARADE_AT + 5) - paradeX(PARADE_AT + 4)).toBeCloseTo(SPEED, 6);
    expect(paradeX(PARADE_AT + 3 + PERIOD)).toBeCloseTo(paradeX(PARADE_AT + 3), 6);
  });

  it.each(SCREENS)("%ix%i: Uncle Sam tips his hat right in front of the tower, and puts it back", (W, H) => {
    const s = sceneAt(W, H, 0, 0);
    let peak = -1;
    let back = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const k = hatTip(s, t);
      if (peak < 0 && k > 0.99) peak = t;
      if (peak > 0 && back < 0 && k === 0) back = t;
    }
    expect(peak, "the hat comes right off").toBeGreaterThan(0);
    expect(peak).toBeLessThan(OPENING);
    expect(back, "and goes back on").toBeGreaterThan(peak);
    expect(back).toBeLessThan(OPENING + 2);
    expect(hatTip(s, 0), "no tip while he is off screen").toBe(0);
  });

  it("the cook flips a burger, first at 3 s and then every 7", () => {
    expect(FLIP_AT).toBeLessThan(OPENING);
    expect(flipAt(0)).toBe(0);
    expect(flipAt(FLIP_AT - 0.01)).toBe(0);
    let peak = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      if (flipAt(t) > 0.99) {
        peak = t;
        break;
      }
    }
    expect(peak).toBeGreaterThan(FLIP_AT);
    expect(peak).toBeLessThan(FLIP_AT + 1);
    expect(flipAt(peak + FLIP_EVERY)).toBeCloseTo(flipAt(peak), 6);
    expect(flipAt(FLIP_AT + 2)).toBe(0);
  });

  it("the fireworks wait for the night, out of reach of the opening seconds", () => {
    for (let lvl = 0; lvl <= SHOW_FROM; lvl += 0.25) {
      expect(toneAtLevel(lvl).show, `level ${lvl}`).toBe(0);
      expect(toneAtLevel(lvl).finale, `level ${lvl}`).toBe(0);
    }
  });
});

// The owner's other rule: every action repeats. Whatever happens once comes round again on a
// rhythm for as long as the player stands there, on the title screen or high in the night: the
// parade (every PERIOD, Uncle Sam tipping his hat each time), the cook's flip (every
// FLIP_EVERY), the eagle's circuit over the park, the kids' sparklers (they never burn out) and
// the fireworks show, whose shells keep going up as long as you stay in the night.

describe("independence day's actions come round again", () => {
  it.each(SCREENS)("%ix%i: the parade comes round the block every PERIOD, the whole of it past the tower again", (W, H) => {
    const s = sceneAt(W, H, 0, 0);
    const cx = s.baseX + s.baseW / 2;
    expect(PERIOD, "the square is never empty for long").toBeLessThanOrEqual(45);
    for (let lap = 1; lap <= 3; lap++) {
      const from = PARADE_AT + lap * PERIOD;
      // Off screen to the left as each lap starts, then every unit passes the tower within the lap's first ten seconds.
      expect(paradeX(from - 0.01) * s.u, `lap ${lap}: the tail of the last lap is long gone`).toBeGreaterThan(W + s.u * 1.6);
      expect(paradeX(from)).toBeCloseTo(paradeX(PARADE_AT), 6);
      for (const { unit } of UNITS) {
        let passed = -1;
        for (let t = from; t < from + OPENING + 5; t += FRAME) {
          if (unitX(s, unit, t) >= cx) {
            passed = t - from;
            break;
          }
        }
        expect(passed, `lap ${lap}: ${unit} passes the tower again`).toBeGreaterThan(0);
        expect(passed, `lap ${lap}: ${unit} passes the tower in its first ten seconds`).toBeLessThan(OPENING);
      }
      let tip = 0;
      for (let t = from; t < from + OPENING + 2; t += FRAME) tip = Math.max(tip, hatTip(s, t));
      expect(tip, `lap ${lap}: Uncle Sam tips his hat again`).toBeGreaterThan(0.99);
    }
  });

  it("the cook keeps flipping, every FLIP_EVERY seconds, for as long as you watch", () => {
    for (const lap of [1, 5, 50, 500]) {
      let peak = 0;
      for (let t = FLIP_AT + lap * FLIP_EVERY; t < FLIP_AT + lap * FLIP_EVERY + FLIP_EVERY; t += FRAME) peak = Math.max(peak, flipAt(t));
      expect(peak, `flip ${lap}`).toBeGreaterThan(0.99);
    }
  });

  it("the eagle keeps circling over the park", { timeout: 30_000 }, () => {
    // The eagle swings from one side of its circle to the other and back about every 11 s: its
    // drawn middle crosses its mean again and again, early and long after the start.
    const W = 390;
    const H = 844;
    for (const t0 of [0, 600]) {
      const xs: number[] = [];
      for (let t = t0; t < t0 + 66; t += 0.5) {
        const s = sceneAt(W, H, 0, t);
        const tone = toneOf(s);
        let eagle: Uint8Array | null = null;
        eachVisible(s, (d) => {
          if (d.kind === "eagle") eagle = mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), 0.5);
        });
        expect(eagle, `t=${t}: the eagle is over the park`).not.toBeNull();
        let sum = 0;
        let n = 0;
        eagle!.forEach((v, i) => {
          if (v) {
            sum += i % (W / 2);
            n++;
          }
        });
        xs.push(sum / n);
      }
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      let crossings = 0;
      for (let i = 1; i < xs.length; i++) if (xs[i - 1]! < mean !== xs[i]! < mean) crossings++;
      expect(crossings, `from ${t0} s: sides the eagle swings to in 66 s`).toBeGreaterThanOrEqual(10);
    }
  });

  it("the kids' sparklers never burn out", { timeout: 30_000 }, () => {
    const W = 390;
    const H = 844;
    for (const t of [12, 47, 130, 1200]) {
      const a = mask(W, H, (ctx) => sparklerKids(ctx, sceneAt(W, H, 0, t)));
      const b = mask(W, H, (ctx) => sparklerKids(ctx, sceneAt(W, H, 0, t + 0.1)));
      let differ = 0;
      for (let i = 0; i < a.length; i++) differ += a[i]! ^ b[i]!;
      expect(differ, `t=${t}: the sparklers crackle and swing`).toBeGreaterThan(20);
    }
  });

  it("the fireworks keep going up for as long as you stay in the night", { timeout: 30_000 }, () => {
    const blooms = (lvl: number, t0: number) => {
      let n = 0;
      for (let t = t0; t < t0 + 30; t += 0.25) {
        const s = sceneAt(390, 844, lvl, t);
        eachBurst(s, toneOf(s), floorTop(s, level(s)), (_b, local) => {
          if (local >= RISE && local < RISE + BLOOM) n++;
        });
      }
      return n;
    };
    for (const lvl of [62, 82]) {
      const first = blooms(lvl, 0);
      expect(first, `level ${lvl}: the show`).toBeGreaterThan(10);
      for (const t0 of [300, 3000]) {
        const later = blooms(lvl, t0);
        expect(later, `level ${lvl}, ${t0} s on`).toBeGreaterThan(first * 0.6);
        expect(later, `level ${lvl}, ${t0} s on`).toBeLessThan(first * 1.6);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { FLIP_AT, FLIP_EVERY, flipAt, POUR_AT, pourAt, sparklerKids } from "./cast";
import { saluteAt } from "./crowd";
import { drawDrifter, eachVisible } from "./drift";
import { BLOOM, eachBurst, RISE } from "./fireworks";
import { FREE_AT, front, looseAt, picnic } from "./front";
import { ROAD_AT } from "./hills";
import { BREEZE_AT, BREEZE_EVERY, breeze } from "./life";
import { hatTip, PARADE_AT, paradeX, PERIOD, SPEED, TOSS_AT, TOSS_EVERY, unitX, UNITS } from "./parade";
import { context, mask, sceneAt, SIZES } from "./test-scene";
import { SHOW_FROM, toneAtLevel, toneOf } from "./tone";
import { july4 } from "../july4";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. The scene's clock starts at 0 with a fresh tower (the title
// screen, or play again), so every action the start view shows happens for the first time, key
// moment included, by OPENING; later repeats keep their own rhythm.
//
// What the start view shows over time on the Fourth: the parade stepping in from the left and
// passing the bandstand, every unit of it (the drum major, the color guard, the band, the fire
// truck, Uncle Sam, the girl on her bike and the dog) past the tower by ten seconds, Uncle Sam
// tipping his hat right in front of it, the cook flipping a burger, the first vintage car rolling
// along the country road, the sun glinting on a shop window, the first breeze through the
// banners and a balloon slipping free from the lemonade stand. The rest is ambient: the baton
// and the sticks, the waving kids, the sparklers, the eagle circling, the kite rising and
// dipping, the balloons bobbing, the flags, the pinwheels, the butterflies, the birds between
// the rooftops and the barbecue smoke. The fireworks come with the night you climb to, so they
// are exempt.

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

  it("the lemonade girl pours her first glass, the drum major tosses his baton and the old veteran salutes the colors, all within ten seconds", () => {
    expect(POUR_AT).toBeLessThan(OPENING - 2);
    expect(pourAt(POUR_AT - 0.01)).toBe(-1);
    expect(pourAt(POUR_AT + 0.5)).toBeGreaterThan(0);
    expect(TOSS_AT).toBeLessThan(OPENING - 1);
    for (const [W, H] of SCREENS) {
      const s0 = sceneAt(W, H, 0, 0);
      let up = -1;
      let down = -1;
      for (let t = 0; t < OPENING + 3; t += FRAME) {
        const k = saluteAt({ ...s0, t });
        if (up < 0 && k > 0.99) up = t;
        if (up > 0 && down < 0 && k === 0) down = t;
      }
      expect(saluteAt({ ...s0, t: 0 }), `${W}x${H}: at ease before the parade`).toBe(0);
      expect(up, `${W}x${H}: the veteran salutes as the flag comes by`).toBeGreaterThan(0);
      expect(up, `${W}x${H}: in the opening`).toBeLessThan(OPENING);
      expect(down, `${W}x${H}: and stands at ease again once it has passed`).toBeGreaterThan(up);
    }
  });

  it("the first breeze runs through the banners, a car comes along the country road and a balloon slips free, all within ten seconds", () => {
    expect(BREEZE_AT).toBeLessThan(OPENING);
    let gust = 0;
    for (let t = 0; t < OPENING; t += FRAME) gust = Math.max(gust, breeze(t));
    expect(gust, "the breeze blows").toBeGreaterThan(0.99);
    expect(ROAD_AT).toBeLessThan(OPENING - 3);
    expect(FREE_AT).toBeLessThan(OPENING - 2);
    // The balloon is seen floating away: off its string and rising, well within the opening.
    const W = 390;
    const H = 844;
    expect(looseAt(sceneAt(W, H, 0, FREE_AT - 0.2)), "all on their strings before").toBeNull();
    const early = looseAt(sceneAt(W, H, 0, FREE_AT + 0.3))!;
    const later = looseAt(sceneAt(W, H, 0, FREE_AT + 2.5))!;
    expect(early, "a balloon slips free").not.toBeNull();
    expect(early.y - later.y, "and rises away").toBeGreaterThan(sceneAt(W, H, 0, 0).u * 0.05);
    const a = context(W, H);
    front(a, sceneAt(W, H, 0, FREE_AT + 2.5));
    const px = a.getImageData(Math.round(later.x), Math.round(later.y), 1, 1).data;
    const b = context(W, H);
    picnic(b, sceneAt(W, H, 0, FREE_AT + 2.5));
    const under = b.getImageData(Math.round(later.x), Math.round(later.y), 1, 1).data;
    expect(Math.abs(px[0]! - under[0]!) + Math.abs(px[1]! - under[1]!) + Math.abs(px[2]! - under[2]!), "it is drawn where it is").toBeGreaterThan(30);
    // On its way it keeps to the right of the square: out of the tower's column, in from the side, below the tower's floor.
    for (const [w, h] of SCREENS) {
      let seen = 0;
      for (let t = FREE_AT; t < FREE_AT + 30; t += 0.25) {
        const s = sceneAt(w, h, 0, t);
        const b = looseAt(s);
        if (!b) continue;
        seen++;
        const what = `${w}x${h} at t=${t}`;
        expect(b.x - b.r - (s.cssW / 2 + s.u * 0.25), `${what}: in the tower's column`).toBeGreaterThan(0);
        expect(b.x + b.r, `${what}: off the side`).toBeLessThan(w - 2);
        expect(b.y - b.r, `${what}: above the tower's floor`).toBeGreaterThan(s.groundY);
      }
      expect(seen, `${w}x${h}: the balloon's flight`).toBeGreaterThan(10);
    }
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

  it("the lemonade girl keeps pouring, the drum major keeps tossing, and the veteran salutes the colors every lap", () => {
    for (const lap of [1, 5, 50]) {
      let pour = 0;
      for (let t = POUR_AT + lap * 6.5; t < POUR_AT + (lap + 1) * 6.5; t += FRAME) pour = Math.max(pour, pourAt(t));
      expect(pour, `pour ${lap}`).toBeGreaterThan(0.9);
      expect(TOSS_EVERY).toBeLessThan(10);
    }
    const s0 = sceneAt(390, 844, 0, 0);
    for (let lap = 1; lap <= 3; lap++) {
      let k = 0;
      for (let t = PARADE_AT + lap * PERIOD; t < PARADE_AT + lap * PERIOD + OPENING; t += FRAME) k = Math.max(k, saluteAt({ ...s0, t }));
      expect(k, `lap ${lap}: the salute`).toBeGreaterThan(0.99);
    }
  });

  it("the breeze comes round every BREEZE_EVERY seconds, for as long as you watch", () => {
    for (const lap of [1, 4, 40, 400]) {
      let gust = 0;
      for (let t = BREEZE_AT + lap * BREEZE_EVERY; t < BREEZE_AT + (lap + 1) * BREEZE_EVERY; t += FRAME) gust = Math.max(gust, breeze(t));
      expect(gust, `gust ${lap}`).toBeGreaterThan(0.99);
    }
  });

  it("the start view keeps moving, early and long after: cars, kites, flags, pinwheels and the rest", { timeout: 60_000 }, () => {
    const W = 390;
    const H = 844;
    const frame = (t: number) => {
      const ctx = context(W, H, 0.5);
      const s = sceneAt(W, H, 0, t);
      july4.ground!(ctx, s);
      july4.foreground!(ctx, s);
      return ctx.getImageData(0, 0, W / 2, H / 2).data;
    };
    for (const t0 of [2, 31, 300, 3000]) {
      const a = frame(t0);
      const b = frame(t0 + 1.3);
      let moved = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 12) moved++;
      expect(moved, `t=${t0}: pixels that change in 1.3 s`).toBeGreaterThan(400);
    }
  });

  it("the fireworks keep going up for as long as you stay in the night", { timeout: 30_000 }, () => {
    const blooms = (lvl: number, t0: number) => {
      let n = 0;
      for (let t = t0; t < t0 + 30; t += 0.25) {
        const s = sceneAt(390, 844, lvl, t);
        eachBurst(s, toneOf(s), (_b, local) => {
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

import { describe, expect, it } from "vitest";
import { RAINBOW } from "./colors";
import { BACK_X, bowSweep, plan, POT_X, SETTLED } from "./gold";
import { flockPoses } from "./pasture";
import { sceneAt } from "./test-scene";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. The scene's clock starts at 0 with a fresh tower (the title
// screen, or play again), so every action the start view shows happens for the first time, key
// moment included, by OPENING; later repeats keep their own rhythm.
//
// What the start view shows over time on St. Patrick's Day: the rainbow sweeping into its arch,
// the leprechaun bringing his pot of gold out from behind the round tower to its foot (then he
// only keeps watch, peeking out now and then), and the flock in the back pasture frolicking (the
// lambs race and then pronk or skip, the ewes look up, bounce and amble a few steps). The rest is
// ambient: the turf smoke, the glint winking on the gold, the swallows wheeling on their spot,
// the clouds bobbing. The lanes' geese, swans and larks, the rain, the sky's rainbow and the
// shooting stars come with the height you climb to, so they are exempt.

const OPENING = 10;
const FRAME = 1 / 60;

describe("st. patrick's actions happen in the first 10 seconds", () => {
  it("the rainbow forms, and the leprechaun brings his gold to its end and settles behind it", () => {
    expect(bowSweep(0, 0), "bare sky at the start").toBe(0);
    expect(bowSweep(RAINBOW.length - 1, 2.5), "the whole arch by 2.5 s").toBe(1);
    // Out with the pot by 2.5 s, set down and hidden behind it by 6 s, peeking out by 10 s.
    let out = -1;
    let peek = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const p = plan(t);
      if (out < 0 && p.shown && p.potX - BACK_X > 0.1) out = t;
      if (peek < 0 && t > SETTLED && p.shown) peek = t;
    }
    expect(out, "comes out with the pot").toBeGreaterThan(0);
    expect(out, "comes out with the pot").toBeLessThan(2.5);
    expect(SETTLED).toBeLessThanOrEqual(6);
    expect(plan(SETTLED).potX).toBe(POT_X);
    expect(plan(SETTLED).shown).toBe(false);
    expect(peek, "peeks out").toBeGreaterThan(0);
    expect(peek, "peeks out").toBeLessThan(7);
  });

  it("the flock frolics: the lambs race, one pronks and one skips, the ewes look up, bounce and amble; then they graze", () => {
    const s0 = sceneAt(390, 844, 0, 0);
    const u = s0.u;
    const home = flockPoses(s0).map((p) => ({ ...p }));
    const lambX = [
      [Infinity, -Infinity],
      [Infinity, -Infinity],
    ];
    let pronk = 0;
    let skipTurns = 0;
    const looked = [false, false];
    const bounced = [false, false];
    const ambled = [false, false];
    const skipM = [0, 0];
    for (let t = 0; t < OPENING; t += FRAME) {
      const poses = flockPoses({ ...s0, t });
      for (let j = 0; j < 2; j++) {
        const l = poses[2 + j]!;
        const r = lambX[j]!;
        r[0] = Math.min(r[0]!, l.x / u);
        r[1] = Math.max(r[1]!, l.x / u);
        if (l.lift > l.L && l.stride === 0) pronk++;
        // A skip: little hops with the legs tucked (stride 0.3), turning about between them.
        if (l.lift > 0 && l.stride === 0.3) {
          if (skipM[j] && l.m !== skipM[j]) skipTurns++;
          skipM[j] = l.m;
        }
        const e = poses[j]!;
        if (e.graze < 0.01) looked[j] = true;
        if (e.lift > e.L * 0.2) bounced[j] = true;
        if (Math.abs(e.x - home[j]!.x) > u * 0.008) ambled[j] = true;
      }
    }
    for (let j = 0; j < 2; j++) expect(lambX[j]![1]! - lambX[j]![0]!, `lamb ${j} races round`).toBeGreaterThan(0.09);
    expect(pronk, "a lamb pronks").toBeGreaterThan(20);
    expect(skipTurns, "a lamb skips about, turning").toBeGreaterThan(0);
    expect(looked, "the ewes look up").toEqual([true, true]);
    expect(bounced, "the ewes bounce").toEqual([true, true]);
    expect(ambled, "the ewes amble a few steps").toEqual([true, true]);
    // And by 10 s all four are back home, grazing quietly, until the next round.
    for (let t = 9.3; t < 12; t += FRAME) {
      flockPoses({ ...s0, t }).forEach((p, i) => {
        expect(p.lift, `t=${t.toFixed(2)}: animal ${i} hops`).toBe(0);
        expect(Math.abs(p.stride), `t=${t.toFixed(2)}: animal ${i} walks`).toBeLessThan(0.01);
        expect(p.graze, `t=${t.toFixed(2)}: animal ${i} looks up`).toBeGreaterThan(0.99);
        expect(Math.abs(p.x - home[i]!.x), `t=${t.toFixed(2)}: animal ${i} away from home`).toBeLessThan(0.5);
      });
    }
  });
});

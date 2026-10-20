import { describe, expect, it } from "vitest";
import { RAINBOW } from "./colors";
import { BACK_X, bowSweep, plan, POT_X, SETTLED } from "./gold";
import { atRest, FULL_RISE, lookout, PEEK_RISE } from "./lookout";
import { flockPoses } from "./pasture";
import { FIRST_TOAST, pose, TOAST, toastAt } from "./session";
import { sceneAt } from "./test-scene";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. The scene's clock starts at 0 with a fresh tower (the title
// screen, or play again), so every action the start view shows happens for the first time, key
// moment included, by OPENING; later repeats keep their own rhythm.
//
// What the start view shows over time on St. Patrick's Day: the rainbow sweeping into its arch,
// the leprechaun bringing his pot of gold out from behind the round tower to its foot (then he
// only keeps watch, peeking out now and then), the second leprechaun coming up from behind the
// gatepost with the hat on his head, grinning and winking, and ducking back down (then he comes
// up now and then), and the flock in the back pasture frolicking (the lambs race and then pronk
// or skip, the ewes look up, bounce and amble a few steps), and the box player outside the
// session, who stops his tune, raises his pint of green brew in a toast, sets it down and plays
// on (then again every 20 to 30 seconds). The rest is ambient: the turf smoke, the glint winking
// on the gold, the swallows wheeling on their spot, the clouds bobbing, the bellows and his
// tapping boot. The lane's geese, swans and larks, the rain, the sky's rainbow and the shooting
// stars come with the height you climb to, so they are exempt.

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

  it("the leprechaun on the gatepost comes up with the hat on his head, grins and winks, and ducks back down", () => {
    let peek = -1;
    let up = -1;
    let wink = -1;
    let down = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const p = lookout(t);
      if (peek < 0 && p.rise > PEEK_RISE * 0.9) peek = t;
      if (up < 0 && p.rise > FULL_RISE * 0.99) up = t;
      if (wink < 0 && p.wink) wink = t;
      if (up > 0 && down < 0 && atRest(p)) down = t;
    }
    expect(peek, "his eyes over the post").toBeGreaterThan(0);
    expect(up, "his whole face").toBeGreaterThan(peek);
    expect(wink, "a wink").toBeGreaterThan(up);
    expect(down, "down again").toBeGreaterThan(wink);
    expect(down, "down again").toBeLessThan(OPENING);
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

  it("the box player stops his tune, raises his pint of green brew in a toast, sets it down and plays on; then again every 20 to 30 s", () => {
    // In the tune from the start.
    for (let t = 0; t < FIRST_TOAST; t += FRAME) {
      const p = pose(t);
      expect(p.playing, `t=${t.toFixed(2)}: playing`).toBe(1);
      expect(p.holding, `t=${t.toFixed(2)}: his pint on the barrel`).toBe(false);
    }
    // Then the toast, every step of it in order, and back in the tune, all by OPENING.
    let quiet = -1;
    let lifted = -1;
    let high = -1;
    let cheers = -1;
    let down = -1;
    let again = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const p = pose(t);
      if (quiet < 0 && p.playing < 0.01) quiet = t;
      if (lifted < 0 && p.holding) lifted = t;
      if (high < 0 && p.raise > 0.99) high = t;
      if (cheers < 0 && p.cheers > 0.9 && p.beam > 0.99) cheers = t;
      if (high > 0 && down < 0 && !p.holding) down = t;
      if (down > 0 && again < 0 && p.playing > 0.99 && p.reach === 0) again = t;
    }
    expect(quiet, "the box goes quiet").toBeGreaterThan(0);
    expect(lifted, "takes up his pint").toBeGreaterThan(quiet);
    expect(high, "raises it high").toBeGreaterThan(lifted);
    expect(cheers, "a beaming cheers up there").toBeGreaterThan(high);
    expect(down, "sets it back down").toBeGreaterThan(cheers);
    expect(again, "plays on").toBeGreaterThan(down);
    expect(again, "plays on").toBeLessThan(OPENING);
    // And again and again, 20 to 30 s apart (varied), every one a whole toast.
    const starts: number[] = [];
    let was = -1;
    for (let t = 0; t < 1800; t += 0.05) {
      const k = toastAt(t);
      if (k >= 0 && was < 0) starts.push(t);
      was = k;
    }
    expect(starts[0], "the first toast").toBeGreaterThan(FIRST_TOAST - 0.01);
    expect(starts[0], "the first toast").toBeLessThan(FIRST_TOAST + 0.06);
    expect(starts.length, "toasts in half an hour").toBeGreaterThan(60);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]!);
    for (const g of gaps) {
      expect(g, "a toast too soon after the last").toBeGreaterThanOrEqual(20 - 0.1);
      expect(g, "a long wait for the next toast").toBeLessThanOrEqual(30 + 0.1);
    }
    expect(Math.max(...gaps) - Math.min(...gaps), "the waits vary").toBeGreaterThan(4);
    for (const t0 of starts.slice(1, 8)) {
      let raised = false;
      for (let t = t0; t < t0 + TOAST; t += FRAME) if (pose(t).raise > 0.99) raised = true;
      expect(raised, `the toast at ${t0.toFixed(1)} s raises the pint`).toBe(true);
      expect(pose(t0 + TOAST + 0.05).playing, `playing on after the toast at ${t0.toFixed(1)} s`).toBe(1);
    }
  });
});

import { describe, expect, it } from "vitest";
import { BACK_X, CYCLE, HIDE_X, plan, POT_X, potAndLeprechaun, runsOff } from "./gold";
import { mask, sceneAt, SIZES } from "./test-scene";
import { roundTower } from "./tower";

// The leprechaun and his pot of gold, over several cycles of his routine: he peeks out and
// ducks back, and now and then (the first time soon after the start) makes off with the pot
// behind the round tower and brings it back. Nothing jumps from one frame to the next, every
// cycle ends with the pot home and him hidden behind it, he vanishes and reappears only behind
// the round tower's drum, and he never comes above the tower's floor line or near the screen's
// edge.

const FRAME = 1 / 60;

describe("st. patrick's leprechaun", () => {
  it("runs off now and then: in the first cycle, and in some (not all) of the rest", () => {
    expect(runsOff(0)).toBe(true);
    const runs = Array.from({ length: 16 }, (_, n) => runsOff(n)).filter(Boolean).length;
    expect(runs).toBeGreaterThan(4);
    expect(runs).toBeLessThan(13);
  });

  it("moves smoothly, and every cycle starts and ends with the pot home and him behind it", () => {
    let prev = { ...plan(0) };
    for (let t = FRAME; t < CYCLE * 8; t += FRAME) {
      const p = { ...plan(t) };
      if (p.potShown && prev.potShown) {
        expect(Math.abs(p.potX - prev.potX), `t=${t.toFixed(2)}: the pot jumps`).toBeLessThan(0.006);
        expect(Math.abs(p.potLift - prev.potLift), `t=${t.toFixed(2)}: the pot jumps`).toBeLessThan(0.004);
      }
      if (p.shown && prev.shown && p.headOut === 0 && prev.headOut === 0) {
        expect(Math.abs(p.x - prev.x), `t=${t.toFixed(2)}: he jumps`).toBeLessThan(0.006);
        expect(Math.abs(p.crouch - prev.crouch), `t=${t.toFixed(2)}: he jumps`).toBeLessThan(0.1);
      }
      // He only ever appears or vanishes behind the pot (crouched or peeking) or behind the round tower.
      if (p.shown !== prev.shown) {
        const q = p.shown ? p : prev;
        const behindPot = (q.headOut > 0 && q.headOut < 0.05) || (q.headOut === 0 && q.crouch > 0.9);
        const behindTower = Math.abs(q.x - HIDE_X) < 0.003 || Math.abs(q.x - BACK_X) < 0.003;
        expect(behindPot || behindTower, `t=${t.toFixed(2)}: he pops in or out of sight`).toBe(true);
      }
      // The pot only goes, and comes back, in his hands behind the tower.
      if (prev.potShown && !p.potShown) expect(prev.shown && Math.abs(prev.x - HIDE_X) < 0.003, `t=${t.toFixed(2)}: the pot vanishes`).toBe(true);
      if (!prev.potShown && p.potShown) expect(p.shown && Math.abs(p.x - BACK_X) < 0.003, `t=${t.toFixed(2)}: the pot appears`).toBe(true);
      prev = p;
    }
    for (let n = 1; n < 8; n++) {
      for (const t of [n * CYCLE - 0.02, n * CYCLE + 0.02]) {
        const p = plan(t);
        expect(p.shown, `t=${t}`).toBe(false);
        expect(p.potShown, `t=${t}`).toBe(true);
        expect(p.potX).toBe(POT_X);
        expect(p.potLift).toBe(0);
      }
    }
  });

  it.each(SIZES)("%ix%i: hides behind the round tower, keeps below its floor line and off the edges", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0);
    const drum = mask(W, H, (ctx) => roundTower(ctx, s0));
    let away = 0;
    for (let t = 0; t < CYCLE * 2; t += 0.1) {
      const s = { ...s0, t };
      const p = plan(t);
      const m = mask(W, H, (ctx) => potAndLeprechaun(ctx, s));
      let edge = 0;
      let high = 0;
      let seen = 0;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        const x = i % W;
        const y = Math.floor(i / W);
        if (x <= 1 || x >= W - 2) edge++;
        if (y < s.groundY) high++;
        if (!drum[i]) seen++;
      }
      expect(edge, `t=${t.toFixed(1)}: on the screen's edge`).toBe(0);
      expect(high, `t=${t.toFixed(1)}: above the tower's floor line`).toBe(0);
      if (!p.potShown) {
        away++;
        continue;
      }
      // Right where he is out of sight, everything of him and the pot is behind the drum.
      if (p.shown && (Math.abs(p.x - HIDE_X) < 0.004 || Math.abs(p.x - BACK_X) < 0.004)) expect(seen, `t=${t.toFixed(1)}: still in sight at the tower`).toBe(0);
    }
    expect(away, "the pot is away a while").toBeGreaterThan(20);
  }, 60_000);
});

import { afterEach, describe, expect, it } from "vitest";
import { resetTuning, tuning } from "../config";
import { canRebuild, drop, leanTarget, newGame, stability, step, timeScale, type GameState } from "../game";
import { DT, dropAt, gauss, perfectTower, rng, topWorldX } from "../testing/bots";
import { newFx, onDrop, regrowSide, toppleSide, updateFx, type Fx } from "./fx";

afterEach(resetTuning);

const FRAME = 1 / 60;

/** Run frames like main.ts (eased slow-motion clock), feeding the view. */
function run(g: GameState, fx: Fx, seconds: number, each?: () => void): void {
  let clock = 1;
  for (let t = 0; t < seconds && g.phase === "playing"; t += FRAME) {
    clock += (timeScale(g) - clock) * (1 - Math.exp(-10 * FRAME));
    step(g, FRAME * clock);
    updateFx(fx, g, FRAME * clock, []);
    each?.();
  }
}

function dropView(g: GameState, fx: Fx, dx: number): void {
  const level = g.blocks.length;
  const leanBefore = leanTarget(g);
  const r = dropAt(g, dx);
  if (r) onDrop(fx, g, { result: r, level, leanBefore, leanAfter: leanTarget(g) });
}

describe("regrowSide", () => {
  it("is the edge a calm perfect grows (mirrors takeCut)", () => {
    let checked = 0;
    for (let seed = 0; seed < 12; seed++) {
      const r = rng(seed + 5);
      const g = newGame(seed);
      tuning.gustsOn = false;
      for (let i = 0; i < 40 && g.phase === "playing"; i++) {
        // A few sloppy drops, then wait for calm and try a perfect.
        dropAt(g, gauss(r) * 5);
        for (let k = 0; k < 600 && !(canRebuild(g) && g.banked === 0); k++) step(g, DT);
        if (g.phase !== "playing" || !canRebuild(g) || g.banked !== 0) continue;
        const side = regrowSide(g);
        g.slider.x = topWorldX(g);
        const res = drop(g);
        if (res?.kind !== "perfect" || res.rebuilt !== 1) continue;
        expect(side).toBe(res.grewLeft > 0 ? -1 : 1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("toppleSide", () => {
  it("puts a balanced tower's ghost on the gust's side during the warning", () => {
    let seen = 0;
    for (let seed = 0; seed < 10; seed++) {
      const g = perfectTower(13, seed);
      g.nextGust = 13;
      step(g, DT);
      if (g.gust.phase !== "warn") continue;
      const st = stability(g);
      expect(Math.abs(st.leanTarget)).toBeLessThan(0.5);
      // Whatever side it held before, the gust's reach wins.
      expect(toppleSide(g, st, 1)).toBe(g.gust.dir);
      expect(toppleSide(g, st, -1)).toBe(g.gust.dir);
      seen++;
    }
    expect(seen).toBeGreaterThan(5);
  });

  it("follows the tilt once it nears the rail, even right after a counterweight flips the drift", () => {
    tuning.gustsOn = false;
    const g = perfectTower(20, 1);
    dropAt(g, -24);
    for (let i = 0; i < 0.9 / DT; i++) step(g, DT);
    dropAt(g, 28);
    let checked = 0;
    for (let i = 0; i < 2 / DT && g.phase === "playing"; i++) {
      step(g, DT);
      const st = stability(g);
      if (st.ratio >= 1) {
        expect(toppleSide(g, st, 1)).toBe(Math.sign(st.tilt));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("LAST CHANCE display", () => {
  it("stays up through dips back to TEETER, and its countdown never goes up", () => {
    tuning.gustsOn = false;
    const g = perfectTower(20, 0);
    const fx = newFx();
    run(g, fx, 0.5);
    dropView(g, fx, 28);
    let started = false;
    let dips = 0;
    let left = 1;
    run(g, fx, 5, () => {
      // A teeter that drains all the way to 0 ends the episode; the next one starts fresh.
      if (g.teeter <= 0) {
        started = false;
        left = 1;
        return;
      }
      if (fx.tier === "lastChance") started = true;
      if (!started) return;
      expect(fx.tier).toBe("lastChance");
      if (stability(g).level === "teeter") dips++;
      const now = fx.lastChance?.left ?? 0;
      expect(now).toBeLessThanOrEqual(left);
      left = now;
    });
    expect(started).toBe(true);
    // The case the latch is for: the logic did dip back to TEETER.
    expect(dips).toBeGreaterThan(0);
  });

  it("ends at the next placed drop, which restarts the teeter", () => {
    tuning.gustsOn = false;
    const g = perfectTower(20, 0);
    const fx = newFx();
    dropView(g, fx, 28);
    let guard = 0;
    while (fx.tier !== "lastChance" && guard++ < 600) run(g, fx, FRAME);
    expect(fx.tier).toBe("lastChance");
    // A small counterweight: unarmed and still past the rail, so the logic teeters again from 0.
    dropView(g, fx, -2);
    expect(g.armed).toBe(false);
    run(g, fx, FRAME * 2);
    expect(stability(g).level).toBe("teeter");
    expect(fx.tier).toBe("teeter");
    expect(fx.lastChance).toBeNull();
  });
});

describe("camera roll", () => {
  it("returns to exactly 0 after the tower leaves the rail, and after a topple's card is up", () => {
    tuning.gustsOn = false;
    const g = perfectTower(20, 0);
    const fx = newFx();
    dropView(g, fx, 28);
    run(g, fx, 1.5);
    expect(fx.roll).not.toBe(0);
    dropView(g, fx, -14);
    run(g, fx, 8);
    expect(g.phase).toBe("playing");
    expect(fx.tier).not.toBe("teeter");
    expect(fx.roll).toBe(0);
    // Topple: keep dropping +6 on the heavy side until it arms and falls; the roll follows the
    // fall, then levels out under the card.
    const h = perfectTower(20, 0);
    const hx = newFx();
    for (let i = 0; i < 12 && h.phase === "playing"; i++) {
      run(h, hx, 0.8);
      dropView(h, hx, 6);
      if (h.armed) run(h, hx, 4);
    }
    expect(h.toppled).not.toBeNull();
    let rolled = false;
    for (let i = 0; i < 300; i++) {
      updateFx(hx, h, FRAME, []);
      if (hx.roll !== 0) rolled = true;
    }
    expect(rolled).toBe(true);
    expect(hx.roll).toBe(0);
  });
});

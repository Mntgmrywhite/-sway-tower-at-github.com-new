import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT, DROP_GAP, WORLD_WIDTH } from "../../config";
import { couplePlan, CYCLE as COUPLE_CYCLE } from "./couple";
import { AWAKE, BALLOON_SIZE, BALLOON_X, BALLOON_Y, cherubPlan, CYCLE, LOOSE, POP, STONE_TO, WAKE } from "./cupid";
import { PLINTH_TOP, PLINTH_X } from "./garden";
import { SWAN_CYCLE, swansPose } from "./water";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. The scene's clock starts at 0 with a fresh tower (the title
// screen, or play again), so every action the start view shows happens for the first time, key
// moment included, by OPENING; later repeats keep their own rhythm.
//
// What the start view shows over time on Valentine's Day: the marble cherub coming alive, raising
// his bow, drawing and loosing his arrow at the heart balloon tied up over his shoulder, which
// pops in a burst of petals (then he hops for joy and hearts float up; every CYCLE seconds a
// fresh balloon floats in from the left and he shoots it too); the couple at the café handing a
// card across the table, reading it, and holding hands; the swans gliding together until their
// necks make a heart. The rest is ambient: the Ferris wheel turning, the glints on the water, the
// balloon bobbing. The lane's petals, balloons, plane and doves come with the height you climb
// to, so they are exempt.
//
// And the owner's newer rule: every action comes round again, on a rhythm, for as long as the
// player stands there. The cherub turns back to marble after each shot and wakes for the next
// balloon every CYCLE; the couple hand the card across every CYCLE (by turns); the swans part,
// turn away a moment and back, drift apart to the banks and come together again every SWAN_CYCLE.

const OPENING = 10;
const FRAME = 1 / 60;
const EDGE = -0.5;

describe("valentine's actions happen in the first 10 seconds", () => {
  it("the cherub wakes, draws, looses, and pops the balloon, then hops and sends up hearts", () => {
    const plan = (t: number) => cherubPlan(t, EDGE, PLINTH_X, PLINTH_TOP);
    expect(plan(0).alive, "marble at the start").toBe(0);
    expect(plan(0).balloon, "the balloon is tied there from the start").toBe(true);
    expect(plan(0).tied).toBe(true);
    expect(plan(AWAKE).alive, "alive").toBe(1);
    let raised = -1;
    let drawn = -1;
    let flying = -1;
    let popped = -1;
    let hopped = -1;
    let heart = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const p = plan(t);
      if (raised < 0 && p.raise > 0.99) raised = t;
      if (drawn < 0 && p.draw > 0.99) drawn = t;
      if (flying < 0 && p.flight >= 0) flying = t;
      if (popped < 0 && !p.balloon) popped = t;
      if (hopped < 0 && p.hop > 0.9) hopped = t;
      if (heart < 0 && p.heart0 > 0) heart = t;
    }
    expect(raised, "the bow comes up").toBeGreaterThan(WAKE);
    expect(drawn, "the string is drawn").toBeGreaterThan(raised);
    expect(flying, "the arrow flies").toBeGreaterThanOrEqual(LOOSE - FRAME);
    expect(popped, "the balloon pops").toBeCloseTo(POP, 1);
    expect(popped).toBeLessThan(4);
    expect(hopped, "he hops").toBeGreaterThan(popped);
    expect(heart, "hearts float up").toBeGreaterThan(popped);
    expect(heart).toBeLessThan(OPENING);
    // The arrow lands in the pool and the burst is over well within the opening.
    expect(plan(POP + 1.6).fall).toBe(-1);
    expect(plan(POP + 1.6).since).toBeGreaterThan(1.5);
  });

  it("every CYCLE a fresh balloon floats in from the left, he tracks it with the bow, and shoots it", () => {
    const plan = (t: number) => cherubPlan(t, EDGE, PLINTH_X, PLINTH_TOP);
    for (const n of [1, 2, 7]) {
      const t0 = n * CYCLE;
      const start = plan(t0 + 0.05);
      expect(start.balloon, `cycle ${n}: a balloon`).toBe(true);
      expect(start.tied, `cycle ${n}: it floats free`).toBe(false);
      expect(start.bx, `cycle ${n}: it starts off the left edge`).toBeLessThan(EDGE);
      let arrived = -1;
      let popped = -1;
      let aimedLeft = false;
      for (let k = 0; k < CYCLE; k += FRAME) {
        const p = plan(t0 + k);
        if (arrived < 0 && p.balloon && Math.abs(p.bx - BALLOON_X) < 0.002 && Math.abs(p.by - BALLOON_Y) < 0.002) arrived = k;
        // (Up and to the left: the balloon floats up over his left shoulder.)
        if (p.raise > 0.99 && Math.cos(p.aim) < -0.2 && Math.sin(p.aim) < -0.5) aimedLeft = true;
        if (popped < 0 && !p.balloon) popped = k;
      }
      expect(arrived, `cycle ${n}: the balloon arrives`).toBeGreaterThan(0);
      expect(popped, `cycle ${n}: he pops it`).toBeGreaterThan(arrived - 0.5);
      expect(popped).toBeLessThan(5);
      expect(aimedLeft, `cycle ${n}: he aims up and left at it, away from the tower`).toBe(true);
    }
  });

  it("the cherub never aims at the tower: the bow points left (or down at rest) and the balloon stays in the left lane", () => {
    for (let t = 0; t < CYCLE * 3; t += FRAME) {
      const p = cherubPlan(t, EDGE, PLINTH_X, PLINTH_TOP);
      if (p.raise > 0.5) expect(Math.cos(p.aim), `t=${t.toFixed(2)}: aiming toward the tower`).toBeLessThan(0);
      if (p.balloon) expect(p.bx, `t=${t.toFixed(2)}: the balloon's x`).toBeLessThan(-0.36);
    }
  });

  it("he and his balloon stand above the slider's lanes in both modes, so the bar never sweeps over them", () => {
    // The view is 1.5 playfields wide (u), so a world unit is u / (1.5 WORLD_WIDTH); the bar
    // runs a bar above the base in Slide, DROP_GAP higher in Drop.
    const lanesTop = ((2 * BLOCK_HEIGHT + DROP_GAP) / (1.5 * WORLD_WIDTH)) * 1;
    expect(PLINTH_TOP).toBeGreaterThan(lanesTop);
    for (let t = 0; t < CYCLE * 3; t += FRAME) {
      const p = cherubPlan(t, EDGE, PLINTH_X, PLINTH_TOP);
      if (p.balloon) expect(p.by - BALLOON_SIZE * 0.5 - 0.01, `t=${t.toFixed(2)}: the balloon's underside`).toBeGreaterThan(lanesTop);
    }
  });

  it("the couple hand the card across, read it, and hold hands", () => {
    let offered = -1;
    let read = -1;
    let hands = -1;
    let heart = -1;
    for (let t = 0; t < OPENING; t += FRAME) {
      const p = couplePlan(t);
      if (offered < 0 && p.card) offered = t;
      if (read < 0 && p.lift > 0.99) read = t;
      if (heart < 0 && p.heart0 > 0) heart = t;
      if (hands < 0 && p.hands > 0.99) hands = t;
    }
    expect(offered, "the card comes out").toBeGreaterThan(0);
    expect(offered).toBeLessThan(2);
    expect(read, "it is held up and read").toBeGreaterThan(offered);
    expect(heart, "hearts float up from the reader").toBeGreaterThan(read - 0.5);
    expect(hands, "their hands meet").toBeGreaterThan(read);
    expect(hands).toBeLessThan(OPENING);
    // Next time round the other one gives the card.
    expect(couplePlan(0.1).giver).toBe(0);
    expect(couplePlan(COUPLE_CYCLE + 0.1).giver).toBe(1);
  });

  it("the swans glide together and make a heart with their necks", () => {
    expect(swansPose(0).heart).toBe(0);
    const apart = swansPose(0).gap;
    expect(swansPose(6).gap).toBeLessThanOrEqual(apart * 0.5);
    expect(swansPose(8).heart).toBe(1);
    expect(swansPose(OPENING).heart).toBe(1);
  });
});

/** The same pose, field by field. */
function same<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((k) => {
    const x = a[k];
    const y = b[k];
    return typeof x === "number" && typeof y === "number" ? Math.abs(x - y) < 1e-6 : x === y;
  });
}

describe("valentine's actions come round again", () => {
  it("the cherub turns back to marble after every shot, and wakes again for the next balloon", () => {
    const plan = (t: number) => ({ ...cherubPlan(t, EDGE, PLINTH_X, PLINTH_TOP) });
    for (let n = 0; n < 6; n++) {
      const t0 = n * CYCLE;
      // A statue as each telling begins, alive for the shot, a statue again well before the next.
      expect(plan(t0 + 0.01).alive, `cycle ${n}: marble at its start`).toBe(0);
      expect(plan(t0 + AWAKE + 0.1).alive, `cycle ${n}: awake`).toBe(1);
      expect(plan(t0 + STONE_TO + 0.1).alive, `cycle ${n}: marble again`).toBe(0);
      let popped = false;
      for (let k = 0; k < CYCLE; k += FRAME) if (!plan(t0 + k).balloon) popped = true;
      expect(popped, `cycle ${n}: a balloon pops`).toBe(true);
    }
    // From the second telling on, every telling is the same.
    for (let k = 0; k < CYCLE; k += 0.37) expect(same(plan(CYCLE + k), plan(CYCLE * 4 + k)), `t=${k.toFixed(2)} into a telling`).toBe(true);
    // He is still while he is marble: no wing beat, no look about, the bow at rest.
    for (let t = STONE_TO + 0.1; t < CYCLE; t += 0.5) {
      const p = plan(t);
      expect(p.alive, `t=${t}`).toBe(0);
      expect(Math.abs(p.look), `t=${t}`).toBe(0);
      expect(Math.abs(p.raise), `t=${t}`).toBe(0);
    }
  });

  it("the couple hand the card across every telling, by turns", () => {
    for (let k = 0; k < COUPLE_CYCLE * 2; k += 0.41) expect(same({ ...couplePlan(k) }, { ...couplePlan(k + COUPLE_CYCLE * 6) }), `t=${k.toFixed(2)}`).toBe(true);
    for (let n = 0; n < 4; n++) {
      let card = false;
      for (let k = 0; k < COUPLE_CYCLE; k += FRAME) if (couplePlan(n * COUPLE_CYCLE + k).card) card = true;
      expect(card, `telling ${n}: the card goes across`).toBe(true);
    }
  });

  it("the swans part, turn away a moment and back, drift apart to the banks and come together again", () => {
    const apart = swansPose(0).gap;
    const together = swansPose(10).gap;
    let away = false;
    let parted = false;
    for (let k = 9; k < SWAN_CYCLE; k += FRAME) {
      const p = swansPose(k);
      if (p.face < -0.99) away = true;
      if (p.heart === 0 && p.gap > apart * 0.99) parted = true;
      // Turned (even half) away only while close together: out by the banks a head turned out
      // pokes over the quay onto the lawn (layout.test.ts checks they keep to the canal).
      if (p.face < 0.99) expect(p.gap, `t=${k.toFixed(2)}: turned away out by the banks`).toBeLessThan(together * 1.02);
    }
    expect(away, "they turn away from each other").toBe(true);
    expect(parted, "they drift back out to the banks").toBe(true);
    // Facing each other again, apart, as the next telling begins; and every telling the same.
    expect(swansPose(SWAN_CYCLE - 0.05).face).toBeGreaterThan(0.99);
    expect(swansPose(SWAN_CYCLE - 0.05).gap).toBeCloseTo(apart, 3);
    for (let k = 0; k < SWAN_CYCLE; k += 0.29) expect(same({ ...swansPose(k) }, { ...swansPose(k + SWAN_CYCLE * 5) }), `t=${k.toFixed(2)}`).toBe(true);
    expect(swansPose(SWAN_CYCLE * 3 + 8).heart, "the heart again").toBe(1);
    // And they move smoothly: no jump in the gap or the turn from frame to frame, the cycle's seam included.
    for (let t = 0; t < SWAN_CYCLE * 2; t += FRAME) {
      const a = { ...swansPose(t) };
      const b = swansPose(t + FRAME);
      expect(Math.abs(b.gap - a.gap), `t=${t.toFixed(2)}: the gap`).toBeLessThan(0.003);
      expect(Math.abs(b.face - a.face), `t=${t.toFixed(2)}: the turn`).toBeLessThan(0.15);
      expect(Math.abs(b.heart - a.heart), `t=${t.toFixed(2)}: the heart`).toBeLessThan(0.03);
    }
  });
});

import { describe, expect, it } from "vitest";
import { reachAt, TOSS_AT, TOSS_EVERY, tossAt } from "./balcony";
import { TRAM_AT, TRAM_EVERY, TRAM_STOP, tramAt, WHISTLE_AT, WHISTLE_EVERY, whistleAt } from "./far";
import { reachAt as ladderReach, seatReach } from "./front";
import { headX, LENGTH, PARADE_AT, PERIOD, THROW_COUNT, throwAt, throwKid, throwSeat, UNITS } from "./parade";

// The owner's rules: any action needs to happen within the first 10 seconds, because after that
// players move past it and up; and every action comes round again on a rhythm for as long as
// the player stands there. The scene's clock starts at 0 with a fresh tower (the title screen,
// or play again), so every action the start view shows happens for the first time, key moment
// included, by OPENING, and again a period later.
//
// What the start view shows over time: the parade stepping in, passing the stand and gone past
// it, the float's riders throwing beads to both sides, the family on the gallery tossing beads
// to the kids below (who reach up and catch them), the kids on the parade ladder reaching up,
// the streetcar rolling in to its stop and back out, and the riverboat blowing its whistle.
// The rest is ambient: the smoke, the paddlewheel, the little one waving. The lane's drifters,
// the fireworks and the lanterns come with the height you climb to, so they are exempt.

const OPENING = 10;
const FRAME = 1 / 60;

/** The first time in [from, to] at which `f` holds, or Infinity. */
function first(f: (t: number) => boolean, from = 0, to = 60): number {
  for (let t = from; t <= to; t += FRAME) if (f(t)) return t;
  return Infinity;
}

describe("mardi gras actions happen in the first 10 seconds, and again", () => {
  it("the parade steps in, passes the stand, and has gone past it by ten seconds; then comes round again", () => {
    expect(PARADE_AT).toBeLessThan(1);
    // The marshal is on a phone's screen within a second, past the tower's center by four.
    expect(first((t) => headX(t) > -0.5)).toBeLessThan(1.2);
    expect(first((t) => headX(t) > 0)).toBeLessThan(4);
    // The last unit has passed the center by ten seconds, and the whole parade a moment later.
    const last = UNITS[UNITS.length - 1]![1];
    expect(first((t) => headX(t) - last > 0)).toBeLessThan(OPENING);
    expect(first((t) => headX(t) - LENGTH > 0)).toBeLessThan(OPENING + 1);
    // Off a phone's right edge by fourteen seconds, and in from the left again a period later.
    expect(first((t) => headX(t) - LENGTH > 0.5)).toBeLessThan(14);
    expect(headX(PARADE_AT + PERIOD + 1)).toBeCloseTo(headX(PARADE_AT + 1), 9);
    expect(PERIOD).toBeGreaterThanOrEqual(35);
    expect(PERIOD).toBeLessThanOrEqual(45);
  });

  it("the float's riders throw beads to the left and to the right of the stand, all within ten seconds", () => {
    const flights: number[] = [];
    for (let i = 0; i < 4; i++) {
      const start = first((t) => throwAt(t, i).flight >= 0);
      const wind = first((t) => throwAt(t, i).wind >= 0);
      expect(wind, `throw ${i} winds up`).toBeLessThan(start);
      expect(start, `throw ${i} flies`).toBeLessThan(OPENING);
      flights.push(start);
      // And again a period later.
      expect(throwAt(start + PERIOD + 0.1, i).flight).toBeCloseTo(throwAt(start + 0.1, i).flight, 6);
    }
    // Two throws come while the float is on the left, two on the right, in order.
    expect(flights[0]!).toBeLessThan(flights[1]!);
    expect(flights[1]!).toBeLessThan(flights[2]!);
    expect(flights[2]!).toBeLessThan(flights[3]!);
    expect(throwAt(flights[1]! + 0.1, 1).x).toBeLessThan(-0.25);
    expect(throwAt(flights[2]! + 0.1, 2).x).toBeGreaterThan(0.2);
    // The first two go back to the kids on the far sidewalk, the last two ahead to the ladder.
    expect([0, 1].map(throwKid)).toEqual([0, 1]);
    expect([2, 3].map(throwSeat)).toEqual([0, 1]);
  });

  it("whoever a string of beads flies to has their arms up when it gets there", () => {
    // The float's throws, to the sidewalk kids and to the ladder.
    for (let i = 0; i < THROW_COUNT; i++) {
      const start = first((t) => throwAt(t, i).flight >= 0);
      const land = first((t) => throwAt(t, i).flight < 0, start);
      for (const t of [land - 0.12, land - 0.12 + PERIOD]) {
        const reach = throwKid(i) >= 0 ? reachAt(t, throwKid(i)) : seatReach(t, throwSeat(i));
        expect(reach, `throw ${i} at ${t.toFixed(2)} s`).toBeGreaterThan(0.9);
      }
    }
    // And their arms go up and come down again smoothly, never in one frame's jump.
    for (let t = FRAME; t < PERIOD + 5; t += FRAME) {
      for (const j of [0, 1]) {
        expect(Math.abs(reachAt(t, j) - reachAt(t - FRAME, j)), `sidewalk kid ${j} at ${t.toFixed(2)} s`).toBeLessThan(0.2);
        expect(Math.abs(seatReach(t, j) - seatReach(t - FRAME, j)), `ladder kid ${j} at ${t.toFixed(2)} s`).toBeLessThan(0.2);
      }
    }
    // The family's tosses down to the kids.
    for (let i = 0; i < 2; i++) {
      const fly = first((t) => tossAt(t, i).flight >= 0);
      const land = first((t) => tossAt(t, i).flight < 0, fly);
      const kid = i === 0 ? 1 : 0;
      for (const t of [land - 0.12, land - 0.12 + TOSS_EVERY * 3]) expect(reachAt(t, kid), `toss ${i} at ${t.toFixed(2)} s`).toBeGreaterThan(0.9);
    }
  });

  it("the parade walks on and off past the edge of any screen: it never stands still or pops in, on a phone, a tablet, a desktop window or zoomed out", () => {
    // Its speed, from the first frame on: no frame where it holds still.
    const speed = (headX(1) - headX(0.5)) / 0.5;
    expect(headX(FRAME) - headX(0)).toBeCloseTo(speed * FRAME, 9);
    // Wherever it jumps back to start a new pass, it is off a screen 1.4 u either side of the center (wider than a desktop window's 1.33).
    const HALF = 1.4;
    for (let t = FRAME; t < PERIOD * 3; t += FRAME) {
      const a = headX(t - FRAME);
      const b = headX(t);
      if (Math.abs(b - a - speed * FRAME) < 1e-6) continue;
      expect(a - LENGTH, `t=${t.toFixed(2)}: the pass ending`).toBeGreaterThan(HALF + 0.1);
      expect(b, `t=${t.toFixed(2)}: the pass beginning`).toBeLessThan(-HALF - 0.1);
    }
  });

  it("the streetcar rolls without a jump, and turns round only out past a phone's edge", () => {
    for (let t = FRAME; t < TRAM_EVERY * 3; t += FRAME) {
      const a = tramAt(t - FRAME).x;
      const b = tramAt(t).x;
      expect(Math.abs(b - a), `t=${t.toFixed(2)}`).toBeLessThan(0.07 * FRAME);
    }
    let far = 0;
    for (let t = 0; t < TRAM_EVERY; t += FRAME) far = Math.max(far, tramAt(t).x);
    // It turns round past the right edge of a tablet (the zoomed-out view, 0.83 u), where the next houses hide it.
    expect(far).toBeGreaterThan(0.9);
  });

  it("the family tosses beads from the gallery and the kids below reach up and catch them, twice over, then every few seconds", () => {
    for (let i = 0; i < 2; i++) {
      const wind = first((t) => tossAt(t, i).k >= 0);
      const fly = first((t) => tossAt(t, i).flight >= 0);
      const caught = first((t) => tossAt(t, i).flight < 0, fly);
      expect(wind, `tosser ${i} winds up`).toBeCloseTo(TOSS_AT[i]!, 1);
      expect(fly, `tosser ${i}: the beads fly`).toBeGreaterThan(wind);
      expect(caught, `tosser ${i}: the beads land`).toBeLessThan(6);
      // The second toss lands within ten seconds too, and they keep coming on the rhythm.
      expect(first((t) => tossAt(t, i).flight < 0, caught + TOSS_EVERY)).toBeLessThan(OPENING + 1);
      expect(tossAt(fly + 0.3 + TOSS_EVERY * 4, i).flight).toBeCloseTo(tossAt(fly + 0.3, i).flight, 6);
    }
    // The kids reach up as the beads come down to them, and are at ease between.
    for (let j = 0; j < 2; j++) {
      const up = first((t) => reachAt(t, j) > 0.9);
      expect(up, `kid ${j} reaches up`).toBeLessThan(6);
      expect(first((t) => reachAt(t, j) === 0, up), `kid ${j} at ease again`).toBeLessThan(up + 1);
    }
  });

  it("the kids on the ladder reach up on their own rhythm", () => {
    const up = first((t) => ladderReach(t) > 0.9);
    expect(up).toBeLessThan(2);
    expect(first((t) => ladderReach(t) === 0, up)).toBeLessThan(OPENING);
    expect(ladderReach(up + 6)).toBeCloseTo(ladderReach(up), 6);
  });

  it("the streetcar rolls in to its stop, waits, and rolls back out; every half minute", () => {
    expect(tramAt(TRAM_AT - 0.1).shown).toBe(false);
    const arrive = first((t) => tramAt(t).shown && tramAt(t).x <= TRAM_STOP + 1e-9);
    expect(arrive).toBeGreaterThan(TRAM_AT);
    expect(arrive).toBeLessThan(OPENING);
    const leave = first((t) => tramAt(t).dir > 0, arrive);
    expect(leave).toBeGreaterThan(arrive + 1);
    expect(leave).toBeLessThan(OPENING);
    const gone = first((t) => !tramAt(t).shown, leave);
    expect(gone).toBeLessThan(TRAM_AT + TRAM_EVERY);
    expect(tramAt(arrive + 0.5 + TRAM_EVERY).x).toBeCloseTo(tramAt(arrive + 0.5).x, 9);
    // It never crosses into the tower's column.
    for (let t = 0; t < 70; t += FRAME) if (tramAt(t).shown) expect(tramAt(t).x).toBeGreaterThanOrEqual(TRAM_STOP);
  });

  it("the riverboat blows its whistle early, and again every so often", () => {
    expect(WHISTLE_AT).toBeLessThan(OPENING);
    expect(whistleAt(WHISTLE_AT - 0.1)).toBe(-1);
    expect(whistleAt(WHISTLE_AT + 0.5)).toBeGreaterThan(0);
    expect(whistleAt(WHISTLE_AT + 0.5 + WHISTLE_EVERY)).toBeCloseTo(whistleAt(WHISTLE_AT + 0.5), 9);
    expect(whistleAt(WHISTLE_AT + 5)).toBe(-1);
  });
});

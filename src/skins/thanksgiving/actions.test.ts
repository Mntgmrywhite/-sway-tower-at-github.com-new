import { describe, expect, it } from "vitest";
import { PROPS, TURKEYS } from "./ground";
import { geese, geeseAcross, geeseCycle, GEESE_FLIGHT, GEESE_PERIOD } from "./sky";
import {
  CAST,
  CUP_X,
  cup,
  cycleTime,
  doing,
  holding,
  ITEMS,
  LX_IN,
  OFF,
  ON,
  OWNER,
  PIE,
  PIE_X,
  PITCHER,
  PITCHER_X,
  PLACES,
  plate,
  seated,
  SUPPER_PERIOD,
  tableAt,
  TURKEY,
  TURKEY_X,
  type Holding,
} from "./supper";
import { context, PHONES, pixels, sceneAt } from "./test-scene";
import { peckAt, strutAt } from "./turkey";

// The owner's rules: every action seen from the start view happens within the first 10 s of the
// scene's clock (s.t = 0 on the title's fresh tower and on a new run), because after that players
// have climbed past it; and every action comes round again for as long as the player stands
// there. The actions here are the family's supper (the table set, eaten at, cleared and set
// again on a 40 s round), the V of geese crossing the sky and the turkeys pecking at the lawn and
// puffing out their fans. Everything else that moves is ambient (leaves always in the air,
// chimney smoke, steam off the dishes, the swing, the sun's rays, twinkling stars), and the
// sunset, the moonrise and the looping day are keyed to height.

/** An action's first occurrence is done by this time, in seconds of s.t. */
const FIRST = 10;

/** Times from 0 to `end` seconds, `dt` apart. */
function times(end: number, dt: number): number[] {
  return Array.from({ length: Math.round(end / dt) + 1 }, (_, i) => i * dt);
}

/** The columns the geese cover in the start view at time t (alpha above 0), or null if none. */
function geeseSpan(W: number, H: number, t: number): [number, number] | null {
  const ctx = context(W, H);
  geese(ctx, sceneAt(W, H, 0, t));
  const data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let x1 = -1;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) continue;
    const x = ((i - 3) / 4) % W;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
  }
  return x1 < 0 ? null : [x0, x1];
}

describe("thanksgiving actions happen in the first 10 seconds", () => {
  it("the first V of geese sets off as the scene starts, and later ones keep their rhythm", () => {
    expect(geeseCycle(0)).toBe(0);
    expect(geeseAcross(0)).toBe(0);
    for (const k of [1, 2, 5]) expect(geeseAcross(k * GEESE_PERIOD), `flight ${k}`).toBe(0);
  });

  it.each(PHONES)("%ix%i: the geese cross the start view within the first 10 s", (W, H) => {
    const s = sceneAt(W, H, 0, 0);
    const column0 = s.baseX - s.u * 0.05;
    const column1 = s.baseX + s.baseW + s.u * 0.05;
    let first = -1;
    let whole = -1;
    let past = -1;
    let last = -1;
    let fromLeft = true;
    for (const t of times(GEESE_FLIGHT, 0.25)) {
      const span = geeseSpan(W, H, t);
      if (!span) continue;
      if (first < 0) {
        first = t;
        fromLeft = span[0] === 0;
      }
      if (whole < 0 && span[0] > 0 && span[1] < W - 1) whole = t;
      if (past < 0 && (fromLeft ? span[0] > column1 : span[1] < column0)) past = t;
      last = t;
    }
    // In from the edge at once, the whole V in view soon after, past the tower and gone by ~10 s.
    expect(first, "first goose in view").toBeGreaterThanOrEqual(0);
    expect(first, "first goose in view").toBeLessThanOrEqual(1);
    expect(whole, "whole V in view").toBeGreaterThanOrEqual(0);
    expect(whole, "whole V in view").toBeLessThanOrEqual(3);
    expect(past, "V past the tower").toBeGreaterThanOrEqual(0);
    expect(past, "V past the tower").toBeLessThanOrEqual(FIRST);
    expect(last, "last goose out of view").toBeLessThanOrEqual(FIRST + 0.5);
  });

  it("every turkey pecks at the lawn and comes back up within the first 10 s, out of step", () => {
    const dips: number[] = [];
    for (const [, , , , phase] of TURKEYS) {
      // A whole peck: head up, down at the lawn, back up.
      let up = false;
      let dip = -1;
      let done = -1;
      for (const t of times(FIRST, 0.02)) {
        const p = peckAt(t, phase);
        if (dip < 0) {
          if (p < 0.05) up = true;
          else if (up && p > 0.6) dip = t;
        } else if (p < 0.05) {
          done = t;
          break;
        }
      }
      expect(dip, `turkey (phase ${phase}): head down`).toBeGreaterThanOrEqual(0);
      expect(done, `turkey (phase ${phase}): back up`).toBeGreaterThanOrEqual(0);
      expect(done, `turkey (phase ${phase}): back up`).toBeLessThanOrEqual(FIRST);
      dips.push(dip);
    }
    // Not in lockstep: the first pecks start at clearly different moments.
    for (let i = 0; i < dips.length; i++) {
      for (let j = i + 1; j < dips.length; j++) expect(Math.abs(dips[i]! - dips[j]!), `turkeys ${i} and ${j}`).toBeGreaterThan(0.4);
    }
  });

  it("every turkey puffs its fan all the way out within the first 10 s", () => {
    for (const [, , , , phase] of TURKEYS) {
      const full = times(FIRST, 0.02).find((t) => strutAt(t, phase) > 0.99);
      expect(full, `turkey (phase ${phase})`).toBeDefined();
    }
  });

  it("and the turkeys keep at it: a peck and a full fan in every 10 s, for as long as the player stands there", () => {
    for (const [, , , , phase] of TURKEYS) {
      for (let from = FIRST; from < 600; from += FIRST) {
        const window = times(FIRST, 0.02).map((t) => from + t);
        expect(window.some((t) => peckAt(t, phase) > 0.6) && window.some((t) => peckAt(t, phase) < 0.05), `turkey (phase ${phase}) pecks after ${from} s`).toBe(true);
        expect(window.some((t) => strutAt(t, phase) > 0.99), `turkey (phase ${phase}) fans out after ${from} s`).toBe(true);
      }
    }
  });
});

/** The first time from `from` (stepping `dt`) that `ok` holds, or -1 within one round. */
function first(ok: (t: number) => boolean, from = 0, dt = 0.02): number {
  for (let t = from; t < from + SUPPER_PERIOD; t += dt) if (ok(t)) return t;
  return -1;
}

/** Everything on the table at once: the cloth down, six places laid, the turkey, pie and milk. */
function set(t: number): boolean {
  const b = tableAt(cycleTime(t));
  return b.cloth === 1 && b.plate.every(Boolean) && b.cup.every(Boolean) && b.turkey && b.pie && b.pitcher;
}

/** Nothing on the table, not even the cloth lying on it. */
function bare(t: number): boolean {
  const b = tableAt(cycleTime(t));
  return b.cloth < 1 && !b.plate.some(Boolean) && !b.cup.some(Boolean) && !b.turkey && !b.pie && !b.pitcher;
}

/** Where each thing stands on the table (local x). */
function itemX(i: number): number {
  if (i < 6) return PLACES[i]!;
  if (i < 12) return CUP_X[i - 6]!;
  return i === TURKEY ? TURKEY_X : i === PIE ? PIE_X : PITCHER_X;
}

/** Whether `h` has thing i in it. */
function has(h: Holding, i: number): boolean {
  if (i < 6) return h.plates > 0;
  if (i < 12) return h.cups > 0;
  return i === TURKEY ? h.turkey : i === PIE ? h.pie : h.pitcher;
}

const H: Holding = { plates: 0, cups: 0, turkey: false, pie: false, pitcher: false };
const NAMES = ["plate", "plate", "plate", "plate", "plate", "plate", "cup", "cup", "cup", "cup", "cup", "cup", "turkey", "pie", "milk jug"];
const name = (i: number) => `${NAMES[i]}${i < 12 ? ` ${i % 6}` : ""}`;

describe("thanksgiving supper: set, eaten at, cleared, set again", () => {
  it("starts at once: the cloth is billowing down in the first half second", () => {
    expect(tableAt(0).cloth).toBe(0);
    const c = tableAt(0.4).cloth;
    expect(c).toBeGreaterThan(0.05);
    expect(c).toBeLessThan(1);
  });

  it("every key moment of the first set lands by 10 s", () => {
    const at = (what: string, ok: (t: number) => boolean) => {
      const t = first(ok);
      expect(t, what).toBeGreaterThanOrEqual(0);
      expect(t, what).toBeLessThanOrEqual(FIRST);
    };
    at("cloth on the table", (t) => tableAt(t).cloth === 1);
    for (let i = 0; i < 6; i++) {
      at(`plate ${i}`, (t) => tableAt(t).plate[i]!);
      at(`cup ${i}`, (t) => tableAt(t).cup[i]!);
    }
    at("turkey", (t) => tableAt(t).turkey);
    at("pitcher", (t) => tableAt(t).pitcher);
    at("pie", (t) => tableAt(t).pie);
    at("everyone seated", (t) => seated(t) === 6);
    expect(set(FIRST)).toBe(true);
  });

  it("the plates and cups go round the table, from Dad's end to Grandma's", () => {
    // The girl lays every plate in turn; the boy follows her with the cups as far as he can go.
    for (let i = 1; i < 6; i++) expect(ON[plate(i)]!, `plate ${i}`).toBeGreaterThan(ON[plate(i - 1)]!);
    expect(OWNER.slice(0, 6).every((w) => w === "girl")).toBe(true);
    const boys = [0, 1, 2, 3, 4, 5].filter((i) => OWNER[cup(i)] === "boy");
    expect(boys.length).toBeGreaterThanOrEqual(4);
    for (let k = 1; k < boys.length; k++) expect(ON[cup(boys[k]!)]!, `cup ${boys[k]}`).toBeGreaterThan(ON[cup(boys[k - 1]!)]!);
    for (let i = 0; i < 6; i++) expect(ON[cup(i)]!, `cup ${i} after its plate`).toBeGreaterThanOrEqual(ON[plate(i)]!);
  });

  it("the turkey, the pie and the milk come out of the porch door, down the garden path, in someone's hands all the way", () => {
    for (const i of [TURKEY, PIE, PITCHER]) {
      const who = OWNER[i]!;
      expect(ON[i]!, `${name(i)} on the table`).toBeLessThanOrEqual(FIRST);
      // Back from the moment it is set down to when its carrier came out of the door.
      let t = ON[i]! - 0.01;
      let steps = 0;
      while (doing(who, cycleTime(t)).act !== "in") {
        expect(has(holding(who, cycleTime(t), H), i), `${who} holds the ${name(i)} at ${cycleTime(t).toFixed(2)}`).toBe(true);
        t -= 0.02;
        expect(++steps, `${who} came out of the house`).toBeLessThan(1000);
      }
      expect(doing(who, cycleTime(t + 0.04)).r, `${who} came out of the door`).toBeLessThan(0.05);
    }
  });

  it("each thing is set down and picked up by the one who carries it, standing right at it", () => {
    for (let i = 0; i < ITEMS; i++) {
      const who = OWNER[i]!;
      for (const [t, act] of [
        [ON[i]!, "place"],
        [OFF[i]!, "pick"],
      ] as const) {
        const d = doing(who, t);
        expect(d.act, `${who}: ${act} the ${name(i)}`).toBe(act);
        expect(d.r, `${who} is at the table`).toBeGreaterThanOrEqual(1);
        expect(Math.abs(LX_IN + d.r - 1 - itemX(i)), `${who}: ${act} the ${name(i)} from where they stand`).toBeLessThan(0.02);
      }
    }
  });

  it("nothing pops on or off the table: each thing is on it, in its carrier's hands, or indoors with them", () => {
    for (let t = 0; t < SUPPER_PERIOD; t += 0.01) {
      const b = tableAt(t);
      for (const who of CAST) {
        const h = holding(who, t, H);
        const out = doing(who, t).act !== "in";
        for (let i = 0; i < ITEMS; i++) {
          if (OWNER[i] !== who) continue;
          const on = i < 6 ? b.plate[i]! : i < 12 ? b.cup[i - 6]! : i === TURKEY ? b.turkey : i === PIE ? b.pie : b.pitcher;
          if (on) expect(out, `${name(i)} on the table while ${who} is out at ${t.toFixed(2)}`).toBe(true);
          else if (out) expect(has(h, i), `${who} holds the ${name(i)} at ${t.toFixed(2)}`).toBe(true);
        }
        // Plates and cups in hand plus on the table make a whole set.
        if (who === "girl" && out) expect(h.plates + b.plate.filter(Boolean).length, `plates at ${t.toFixed(2)}`).toBe(6);
      }
      // The cloth only comes off a bare table.
      if (b.cloth < 1) expect(b.plate.some(Boolean) || b.cup.some(Boolean) || b.turkey || b.pie || b.pitcher, `cloth up at ${t.toFixed(2)}`).toBe(false);
    }
  });

  it("then it is cleared: carried back up the path and the cloth shaken out", () => {
    const emptied = first((t) => tableAt(t).cloth === 1 && !tableAt(t).plate.some(Boolean) && !tableAt(t).cup.some(Boolean) && !tableAt(t).turkey && !tableAt(t).pie && !tableAt(t).pitcher, FIRST);
    expect(emptied, "the table emptied").toBeGreaterThan(FIRST);
    const shake = first((t) => tableAt(cycleTime(t)).shake > 0.9, FIRST);
    expect(shake, "the cloth shaken out").toBeGreaterThan(emptied);
    expect(shake).toBeLessThan(SUPPER_PERIOD);
    // Everyone who carried something back went in through the door.
    for (const who of ["mom", "neighbor", "girl", "boy"] as const) {
      expect(first((t) => doing(who, t).act === "in", FIRST), who).toBeGreaterThan(FIRST);
    }
    // And the cloth is held up again, ready, as the round ends.
    expect(tableAt(SUPPER_PERIOD - 0.01).cloth).toBeLessThan(0.01);
  });

  it("is set again every round, for as long as the player stands there", () => {
    for (const k of [1, 2, 5, 30]) {
      expect(set(k * SUPPER_PERIOD + FIRST), `round ${k}`).toBe(true);
      expect(bare(k * SUPPER_PERIOD + 36), `round ${k} shaken out`).toBe(true);
    }
    // Off the script's own round-number moments, where a hair of float error could tip a step.
    for (let t = 0.0137; t < SUPPER_PERIOD; t += 0.3711) {
      for (const k of [1, 3, 12]) {
        const was = tableAt(cycleTime(t));
        const now = tableAt(cycleTime(t + k * SUPPER_PERIOD));
        expect(now.cloth).toBeCloseTo(was.cloth, 6);
        expect(now.shake).toBeCloseTo(was.shake, 6);
        expect([now.plate, now.cup, now.turkey, now.pie, now.pitcher, now.slice]).toEqual([was.plate, was.cup, was.turkey, was.pie, was.pitcher, was.slice]);
        now.food.forEach((f, i) => expect(f).toBeCloseTo(was.food[i]!, 6));
        for (const who of CAST) {
          const a = doing(who, cycleTime(t));
          const b = doing(who, cycleTime(t + k * SUPPER_PERIOD));
          expect(b.act, `${who} at ${t.toFixed(2)}`).toBe(a.act);
          expect(b.r).toBeCloseTo(a.r, 6);
          expect(b.sit).toBeCloseTo(a.sit, 6);
        }
      }
    }
  });

  it("walks never jump: everyone moves smoothly through the round and across its seam", () => {
    for (const who of CAST) {
      let was = doing(who, SUPPER_PERIOD - 0.005);
      for (let t = 0; t < SUPPER_PERIOD; t += 0.005) {
        const d = doing(who, t);
        if (d.act !== "in" && was.act !== "in") expect(Math.abs(d.r - was.r), `${who} at ${t.toFixed(3)}`).toBeLessThan(0.01);
        expect(Math.abs(d.sit - was.sit), `${who} sitting at ${t.toFixed(3)}`).toBeLessThan(0.05);
        was = d;
      }
    }
  });

  it.each(PHONES)("%ix%i: the supper looks the same every round", (W, H) => {
    const table = PROPS.find((p) => p.name === "table")!;
    for (const t of [0.5, 3.3, 7.9, 15, 23.4, 27.8, 35.6]) {
      const a = pixels(W, H, (ctx) => table.draw(ctx, sceneAt(W, H, 0, t)));
      const b = pixels(W, H, (ctx) => table.draw(ctx, sceneAt(W, H, 0, t + 3 * SUPPER_PERIOD)));
      let max = 0;
      let drawn = 0;
      for (let i = 0; i < a.length; i++) {
        max = Math.max(max, Math.abs(a[i]! - b[i]!));
        if (i % 4 === 3 && a[i]! > 0) drawn++;
      }
      expect(drawn, `t=${t}: drawn`).toBeGreaterThan(1000);
      expect(max, `t=${t} vs three rounds on`).toBeLessThanOrEqual(2);
    }
  });
});

import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { doorway, drawArcade } from "./arcade";
import { carAt, drawCar } from "./car";
import { drawDriver, drawDriverInDoor, driverAt, driverOnScreen, type DriverPhase } from "./driver";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import {
  ALIGHT,
  arcadeDoorAt,
  AT_CAR,
  BOARD,
  BURNOUT,
  CAR_DOOR_SHUT_TIME,
  carDoorIn,
  FIRST,
  GAP_MAX,
  GAP_MIN,
  gapAfter,
  HOME,
  INSIDE,
  OPEN_AGAIN,
  OPEN_CAR,
  OUT,
  PARKED,
  RIDER_FADE,
  riderIn,
  SEATED,
  SHOW_LEN,
  showAt,
  SHUT_AGAIN,
  SHUT_CAR,
  STEP_OUT,
  STOOD,
} from "./show";
import { mask, overlap, pixels, same, SIZES, SLOW, startScene, strays } from "./test-show";

// Synthwave's show (show.ts), as the owner asked for it: 5 to 7 seconds after a tower's scene
// starts, a person (our own 80s driver, driver.ts) comes out of the arcade, walks to the car and
// gets in; the car does its peel-out and donuts, comes back from the bottom of the screen and
// parks; the driver gets out, walks back and goes into the arcade; and 30 to 45 seconds after one
// show starts the next one does, for the whole run. All of it from Scene.t alone.

/** Show starts over the first hour (scene time). */
function starts(until = 3600): number[] {
  const out = [FIRST];
  while (out[out.length - 1]! < until) out.push(out[out.length - 1]! + gapAfter(out.length - 1));
  return out;
}

describe("synthwave show timeline", () => {
  it("starts 5 to 7 seconds in: the arcade door opens and the driver comes out", () => {
    expect(FIRST).toBeGreaterThanOrEqual(5);
    expect(FIRST + OUT).toBeLessThanOrEqual(7.5);
    for (const t of [0, 2, FIRST - 0.01]) {
      expect(showAt(t).n, `no show yet at ${t}`).toBe(-1);
      expect(arcadeDoorAt(t), `door shut at ${t}`).toBe(0);
      expect(driverAt(t).shows, `driver inside at ${t}`).toBe(false);
    }
    expect(arcadeDoorAt(FIRST + 0.5), "the door is open").toBe(1);
    expect(driverAt(FIRST + 0.1).phase).toBe("door");
    expect(driverAt(FIRST + 0.1).shows).toBe(true);
    const out = driverAt(FIRST + (STEP_OUT + OUT) / 2);
    expect(out.phase).toBe("out");
    expect(out.z, "out of the door, toward us").toBeLessThan(ARCADE.z);
    expect(driverAt(FIRST + OUT + 0.5).phase).toBe("walk");
  });

  it("runs in order: out, over to the car and in, the car's show, back, out, and back inside", () => {
    const beats = [STEP_OUT, OUT, AT_CAR, BOARD, SEATED, BURNOUT, PARKED, ALIGHT, STOOD, HOME, INSIDE, SHOW_LEN];
    for (let i = 1; i < beats.length; i++) expect(beats[i]!, `beat ${i}`).toBeGreaterThan(beats[i - 1]!);
    expect(OPEN_CAR).toBeGreaterThanOrEqual(AT_CAR);
    const order: DriverPhase[] = ["inside", "door", "out", "walk", "wait", "board", "driving", "alight", "back", "in", "inside"];
    const seen: DriverPhase[] = [];
    for (let t = FIRST - 1; t < FIRST + SHOW_LEN + 1; t += 1 / 60) {
      const p = driverAt(t).phase;
      if (seen[seen.length - 1] !== p) seen.push(p);
    }
    expect(seen).toEqual(order);
    // The driver is seen all through, except while in the car.
    for (let t = 0; t < SHOW_LEN; t += 0.05) {
      const d = driverAt(FIRST + t);
      expect(d.shows, `at ${t.toFixed(2)} (${d.phase})`).toBe(d.phase !== "driving");
    }
  });

  it("loops for the whole run: each show starts 30 to 45 s after the last, the gaps vary, and it is deterministic", () => {
    expect(SHOW_LEN, "each show is over before the next can start").toBeLessThan(GAP_MIN);
    const list = starts();
    expect(list.length).toBeGreaterThan(3600 / GAP_MAX);
    const gaps = list.slice(1).map((t, i) => t - list[i]!);
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(GAP_MIN);
      expect(g).toBeLessThanOrEqual(GAP_MAX);
    }
    expect(GAP_MIN).toBe(30);
    expect(GAP_MAX).toBe(45);
    expect(new Set(gaps.map((g) => Math.round(g))).size, "the gap varies").toBeGreaterThan(8);
    expect(Math.min(...gaps)).toBeLessThan(34);
    expect(Math.max(...gaps)).toBeGreaterThan(41);
    // showAt agrees with the list, whichever order it is asked in.
    for (const t of [3500, 12, 7.3, 2000.5, 61, 3599]) {
      const n = list.findIndex((s, i) => s <= t && (list[i + 1] ?? Infinity) > t);
      const at = showAt(t);
      expect(at.n, `show at ${t}`).toBe(n);
      expect(at.start).toBe(list[n]);
      expect(at.tau).toBeCloseTo(t - list[n]!, 9);
    }
    // Each show replays the first one: the doors and the driver are the same at the same show time.
    for (const n of [1, 2, 17, 60]) {
      for (const tau of [0.2, 0.7, 3.1, 5.6, 6.0, 20.9, 25, SHOW_LEN - 0.1]) {
        const what = `show ${n} at ${tau}`;
        expect(arcadeDoorAt(list[n]! + tau), what).toBeCloseTo(arcadeDoorAt(FIRST + tau), 6);
        const a = { ...driverAt(list[n]! + tau) };
        const b = { ...driverAt(FIRST + tau) };
        for (const key of Object.keys(a) as (keyof typeof a)[]) {
          if (typeof a[key] === "number") expect(a[key], `${what}: ${key}`).toBeCloseTo(b[key] as number, 6);
          else expect(a[key], `${what}: ${key}`).toBe(b[key]);
        }
      }
    }
  });

  it("opens the doors for the driver: the arcade's as they pass through it, the car's as they get in and out", () => {
    for (let t = -1; t < SHOW_LEN + 1; t += 1 / 120) {
      const d = driverAt(FIRST + t);
      const what = `at ${t.toFixed(3)} (${d.phase})`;
      // Crossing the arcade's threshold, its door is all the way open.
      if (d.shows && Math.abs(d.z - ARCADE.z) < 0.03) expect(arcadeDoorAt(FIRST + t), what).toBe(1);
      // Getting in or out of the car, its door is all the way open; it slams behind them, and it
      // is shut while they walk over to it and away.
      if (d.phase === "board" || d.phase === "alight") expect(carDoorIn(t), what).toBe(1);
      const slam = d.phase === "driving" ? SEATED : d.phase === "back" ? STOOD : -Infinity;
      const shut = (d.phase === "walk" || d.phase === "back" || d.phase === "driving") && t >= slam + CAR_DOOR_SHUT_TIME;
      // (It opens for them before they get out.)
      if (shut && !(d.phase === "driving" && t >= OPEN_AGAIN)) expect(carDoorIn(t), what).toBe(0);
    }
    // The arcade door is shut again once the show is over.
    expect(arcadeDoorAt(FIRST + SHOW_LEN)).toBe(0);
    expect(arcadeDoorAt(FIRST + SHOW_LEN - 0.3)).toBeGreaterThan(0);
  });

  it("slams the car door: it swings shut over a moment, not in one frame", () => {
    for (const shut of [SHUT_CAR, SHUT_AGAIN]) {
      expect(carDoorIn(shut - 0.01), `open before the slam at ${shut}`).toBe(1);
      const mid = carDoorIn(shut + CAR_DOOR_SHUT_TIME / 2);
      expect(mid, `part way shut mid-slam at ${shut}`).toBeGreaterThan(0.2);
      expect(mid).toBeLessThan(0.95);
      expect(carDoorIn(shut + CAR_DOOR_SHUT_TIME), `shut after the slam at ${shut}`).toBe(0);
    }
  });

  it("shows the driver in the car's rear glass while they sit in it, easing in and out", () => {
    expect(riderIn(SEATED - 0.01)).toBe(0);
    expect(riderIn(SEATED + RIDER_FADE)).toBe(1);
    expect(riderIn((SEATED + ALIGHT) / 2)).toBe(1);
    expect(riderIn(ALIGHT - 0.01)).toBeLessThan(0.05);
    expect(riderIn(ALIGHT)).toBe(0);
    // No pop as they sit down or before they get out.
    for (let t = BOARD; t < STOOD; t += 1 / 60) expect(Math.abs(riderIn(t + 1 / 60) - riderIn(t)), `at ${t.toFixed(3)}`).toBeLessThan(0.15);
  });
});

describe("synthwave driver", () => {
  it("walks from the arcade's door to the car's driver door and back, and sits in the car between", () => {
    const s = startScene(390, 844, 1);
    const on = (tau: number) => ({ ...driverOnScreen({ ...s, t: FIRST + tau }) });
    const car = { ...carAt({ ...s, t: FIRST }) };
    const door = { ...doorway(s, ARCADE) };
    const doorX = door.x + door.w / 2;
    // Out in front of the arcade's door, then beside the car, left of it, near its middle.
    const out = on(OUT);
    expect(Math.abs(out.x - doorX)).toBeLessThan(door.w * 0.1);
    expect(out.y, "in front of the arcade").toBeGreaterThan(door.y + door.h);
    const by = on(AT_CAR);
    expect(by.x, "left of the car").toBeLessThan(car.x - car.w / 2 - by.h * 0.2);
    expect(by.x).toBeGreaterThan(car.x - car.w * 1.6);
    expect(Math.abs(by.y - car.y), "beside its middle").toBeLessThan(car.w * 0.15);
    // Readable on a phone: about the height of the car's roof and more.
    expect(by.h).toBeGreaterThan(car.w * 0.6);
    // In the seat: inside the car's width.
    const seat = driverAt(FIRST + SEATED - 0.01);
    expect(seat.sit).toBeGreaterThan(0.99);
    const seated = on(SEATED - 0.01);
    expect(Math.abs(seated.x - car.x)).toBeLessThan(car.w * 0.3);
    // Back at the arcade's door, and in.
    const home = on(HOME);
    expect(Math.abs(home.x - doorX)).toBeLessThan(door.w * 0.1);
    expect(driverAt(FIRST + INSIDE + 0.1).inDoor).toBe(true);
    // Facing the way they walk.
    expect(driverAt(FIRST + (OUT + AT_CAR) / 2).facing).toBe(1);
    expect(driverAt(FIRST + (STOOD + HOME) / 2).facing).toBe(-1);
    expect(driverAt(FIRST + (STEP_OUT + OUT) / 2).view).toBe("front");
    expect(driverAt(FIRST + (HOME + INSIDE) / 2).view).toBe("back");
    // Striding while they walk, still while they wait.
    expect(driverAt(FIRST + (OUT + AT_CAR) / 2).stride).toBe(1);
    expect(driverAt(FIRST + (AT_CAR + BOARD) / 2).stride).toBe(0);
  });

  it("walks back in through the arcade's doorway without stopping on the threshold", () => {
    const dt = 1 / 60;
    let prev = driverAt(FIRST + HOME + 0.15).z;
    for (let t = HOME + 0.15 + dt; t < SHOW_LEN - 0.15; t += dt) {
      const d = driverAt(FIRST + t);
      expect(d.phase).toBe("in");
      expect(d.z - prev, `walking on at ${t.toFixed(3)}`).toBeGreaterThan(0.0008);
      expect(d.stride, `striding at ${t.toFixed(3)}`).toBeGreaterThan(0.5);
      prev = d.z;
    }
    // Over the threshold before the door starts to slide shut behind them.
    expect(driverAt(FIRST + INSIDE).inDoor).toBe(true);
    // In the doorway they stand under its top (deeper in, the wall over the door would hide their
    // head): fully while the door is open, and only a little as it slides shut over them.
    for (const [W, H] of [
      [390, 844],
      [375, 667],
    ] as const) {
      const s = startScene(W, H, 1);
      const door = { ...doorway(s, ARCADE) };
      for (let t = 0; t < SHOW_LEN; t += 0.01) {
        const at = { ...driverOnScreen({ ...s, t: FIRST + t }) };
        if (!at.shows || !at.inDoor) continue;
        const over = door.y - (at.y - 1.04 * at.h);
        const open = arcadeDoorAt(FIRST + t);
        expect(over, `${W}x${H} at ${t.toFixed(2)}: head over the doorway's top (door ${open.toFixed(2)} open)`).toBeLessThan(open === 1 ? 1 : at.h * 0.2);
      }
    }
  });

  it("moves smoothly: no jumps in place or size from one frame to the next", () => {
    const s = startScene(390, 844, 1);
    const dt = 1 / 60;
    let prev = { ...driverOnScreen({ ...s, t: FIRST }) };
    for (let t = FIRST + dt; t < FIRST + SHOW_LEN; t += dt) {
      const d = { ...driverOnScreen({ ...s, t }) };
      if (d.shows && prev.shows) {
        const what = `at ${(t - FIRST).toFixed(3)} (${prev.phase} → ${d.phase})`;
        expect(Math.hypot(d.x - prev.x, d.y - prev.y), `${what}: moved`).toBeLessThan(d.h * 0.06);
        expect(Math.abs(d.h - prev.h), `${what}: grew`).toBeLessThan(d.h * 0.01);
      }
      prev = d;
    }
  });

  it("is drawn in the arcade's doorway as the door opens on them, under the door as it shuts behind them", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    const door = { ...doorway(s, ARCADE) };
    /** Pixels the driver adds to the arcade at t: all within the doorway's open part (the door
     *  panel slides in from the right over them). */
    const inside = (t: number) => {
      const a = pixels(W, H, (ctx) => drawArcade(ctx, { ...s, t }, ARCADE));
      const b = pixels(W, H, (ctx) => drawArcade(ctx, { ...s, t }, ARCADE, drawDriverInDoor));
      const open = door.x + door.w * arcadeDoorAt(t);
      let differ = 0;
      let covered = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) < 6) continue;
          differ++;
          const inDoor = x >= door.x - 1 && x <= door.x + door.w + 1 && y >= door.y - 1 && y <= door.y + door.h + 1;
          expect(inDoor, `at ${t}: drawn outside the doorway (${x}, ${y})`).toBe(true);
          // Under the panel (the doorframe's own lines are drawn over the doorway's edges).
          if (x > open + 1 && x < door.x + door.w - 1 && y > door.y + 1) covered++;
        }
      }
      expect(covered, `at ${t}: showing through the door`).toBe(0);
      return differ;
    };
    expect(inside(FIRST + 0.2), "standing in the doorway").toBeGreaterThan(100);
    expect(inside(FIRST + INSIDE + 0.05), "just inside").toBeGreaterThan(50);
    expect(inside(FIRST + INSIDE + 0.3), "the door sliding shut on them").toBeGreaterThan(10);
    expect(inside(FIRST + SHOW_LEN), "the door has shut on them").toBe(0);
    expect(inside(FIRST + OUT + 0.5), "out on the floor").toBe(0);
    // Out on the floor they are drawn by drawDriver, never in the doorway's slot (and vice versa).
    expect(mask(W, H, (ctx) => drawDriver(ctx, { ...s, t: FIRST + 0.2 })).some((v) => v > 0)).toBe(false);
    expect(mask(W, H, (ctx) => drawDriver(ctx, { ...s, t: FIRST + OUT + 0.5 })).some((v) => v > 0)).toBe(true);
  });

  it("draws the same at the same moment of any show", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    const second = FIRST + gapAfter(0);
    for (const tau of [OUT + 0.37, AT_CAR + 0.2, BOARD + 0.3, ALIGHT + 0.4, STOOD + 1.9]) {
      const a = pixels(W, H, (ctx) => drawDriver(ctx, { ...s, t: FIRST + tau }));
      expect(same(pixels(W, H, (ctx) => drawDriver(ctx, { ...s, t: second + tau })), a), `at ${tau}`).toBe(true);
    }
  });

  it.each(SIZES)(
    "%ix%i (zoom %s): walks the floor in front, clear of the tower, the HUD, \"tap to drop\", the palms, the sign and the edges",
    (W0, H0, z) => {
      const s0 = startScene(W0, H0, z);
      const W = Math.round(s0.cssW);
      const H = Math.round(s0.cssH);
      const palms = PALMS.map((p) => mask(W, H, (ctx) => drawPalm(ctx, s0, p, RIM)));
      const door = { ...doorway(s0, ARCADE) };
      let walked = 0;
      for (let tau = 0; tau < SHOW_LEN; tau += 0.1) {
        const s = { ...s0, t: FIRST + tau };
        const at = driverOnScreen(s);
        const phase = at.phase;
        if (!at.shows || at.inDoor) continue;
        const what = `at ${tau.toFixed(1)} (${phase})`;
        const m = mask(W, H, (ctx) => drawDriver(ctx, s));
        const e = strays(m, s, z);
        expect(e.drawn, `${what}: missing`).toBeGreaterThan(phase === "board" || phase === "alight" ? 20 : 150);
        expect(e.left + e.right + e.top + e.bottom, `${what}: pixels on a screen edge`).toBe(0);
        expect(e.column, `${what}: pixels behind the tower`).toBe(0);
        expect(e.hud, `${what}: pixels in the HUD`).toBe(0);
        expect(e.sky, `${what}: pixels above the horizon`).toBe(0);
        expect(e.tap, `${what}: pixels under "tap to drop"`).toBe(0);
        for (const [i, p] of palms.entries()) expect(overlap(m, p), `${what}: overlaps palm ${i}`).toBe(0);
        // In front of the arcade they may stand before its front, never up by its roof or sign.
        const arcade = mask(W, H, (ctx) => drawArcade(ctx, s, ARCADE));
        let high = 0;
        for (let y = 0; y < Math.floor(door.y) - 1; y++) for (let x = 0; x < W; x++) high += m[y * W + x]! & arcade[y * W + x]!;
        expect(high, `${what}: over the arcade's roof or sign`).toBe(0);
        // Beside the car they keep clear of it but while its door is open for them (or slamming
        // behind them).
        const car = mask(W, H, (ctx) => drawCar(ctx, s));
        if (phase === "walk" || (phase === "back" && tau >= STOOD + CAR_DOOR_SHUT_TIME)) expect(overlap(m, car), `${what}: overlaps the car`).toBe(0);
        if (phase === "walk" || phase === "back") walked++;
      }
      expect(walked).toBeGreaterThan(60);
    },
    SLOW,
  );

  it("floorProps puts the driver in the scene: out on the floor and in the doorway", async () => {
    const { floorProps } = await import("./ground");
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    const scene = (t: number): Scene => ({ ...s, t });
    // The same moment with and without the driver differs only where the driver is.
    for (const tau of [0.2, OUT + 1.3, AT_CAR + 0.2, BOARD + 0.2, ALIGHT + 0.5, STOOD + 2]) {
      const t = FIRST + tau;
      const all = pixels(W, H, (ctx) => floorProps(ctx, scene(t)));
      const at = { ...driverOnScreen(scene(t)) };
      let near = 0;
      let far = 0;
      const bare = pixels(W, H, (ctx) => {
        // Every prop but the driver, in the same order.
        drawArcade(ctx, scene(t), ARCADE);
        drawPalm(ctx, scene(t), PALMS[0]!, RIM);
        drawPalm(ctx, scene(t), PALMS[1]!, RIM);
        drawCar(ctx, scene(t));
      });
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (Math.abs(all[i]! - bare[i]!) + Math.abs(all[i + 1]! - bare[i + 1]!) + Math.abs(all[i + 2]! - bare[i + 2]!) < 30) continue;
          if (Math.abs(x - at.x) < at.h * 0.6 && y > at.y - at.h * 1.2 && y < at.y + at.h * 0.2) near++;
          else far++;
        }
      }
      expect(near, `at ${tau}: the driver is drawn`).toBeGreaterThan(40);
      expect(far, `at ${tau}: nothing else changes`).toBe(0);
    }
  });
});

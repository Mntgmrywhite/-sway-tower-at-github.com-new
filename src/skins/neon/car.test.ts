import { describe, expect, it } from "vitest";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { drawArcade } from "./arcade";
import { CAR_X, carAt, drawCar, HOME_HEADING, LANE_X, SPINS, SPOT_Z } from "./car";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import {
  ALIGHT,
  ARRIVE,
  BOARD,
  BURNOUT,
  DONUTS,
  DONUTS_END,
  FIRST,
  gapAfter,
  GONE,
  LAUNCH,
  OPEN_AGAIN,
  OPEN_CAR,
  PARKED,
  RETURN,
  SEATED,
  SHOW_LEN,
  STOOD,
  ZOOM,
} from "./show";
import { cover, mask, overlap, pixels, same, SIZES, SLOW, startScene, strays } from "./test-show";

// The chrome car's part in the show (show.ts), on the show's clock: parked until its driver is in
// (its door swinging open for them and slamming shut), then a burnout in its spot, a peel-out up
// the grid into the distance, three small donuts far out and a zoom down the lane to the city on
// the horizon, where it fades out; then it comes back in through the bottom of the screen, rolls
// up the floor braking and parks in its spot, and its door opens to let the driver out. Every
// show plays the same. Through the whole show, on the start screen of a tall and a short phone
// (and Hard's zoomed-out view), the car, its door, its smoke and its tyre marks stay in the right
// half of the screen, out of the tower's column above its floor line, clear of the palms, the
// arcade, the HUD, the title's "tap to drop" and every screen edge but the bottom one it comes
// back in through.

/** The second show's start. */
const SECOND = FIRST + gapAfter(0);

/** The car drawn alone at scene time t, as raw pixels. */
function carPixels(s: Scene, t: number): Uint8ClampedArray {
  return pixels(Math.round(s.cssW), Math.round(s.cssH), (ctx) => drawCar(ctx, { ...s, t }));
}

/** Heading difference folded into (-PI, PI]. */
function turn(a: number, b: number): number {
  const d = (((a - b) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d;
}

describe("synthwave car", () => {
  it("waits parked for its driver, then runs its show on the show's clock, and parks again", () => {
    expect(OPEN_CAR).toBeLessThan(BOARD);
    expect(SEATED).toBeLessThanOrEqual(BURNOUT);
    expect(LAUNCH).toBeGreaterThan(BURNOUT);
    expect(DONUTS).toBeGreaterThan(LAUNCH);
    expect(ARRIVE).toBeGreaterThan(DONUTS);
    expect(DONUTS_END).toBeGreaterThan(ARRIVE);
    expect(ZOOM).toBeGreaterThanOrEqual(DONUTS_END);
    expect(GONE).toBeGreaterThan(ZOOM);
    expect(RETURN).toBeGreaterThan(GONE);
    expect(PARKED).toBeGreaterThan(RETURN);
    expect(OPEN_AGAIN).toBeGreaterThan(PARKED);
    const s = startScene(390, 844, 1);
    const phase = (t: number) => carAt({ ...s, t }).phase;
    for (const t of [0, 3, FIRST, FIRST + BURNOUT - 0.01]) expect(phase(t), `at ${t}`).toBe("parked");
    for (const start of [FIRST, SECOND]) {
      expect(phase(start + BURNOUT + 0.5)).toBe("burnout");
      expect(phase(start + LAUNCH + 0.2)).toBe("launch");
      expect(phase(start + DONUTS + 1)).toBe("donuts");
      expect(phase(start + ZOOM + 0.5)).toBe("zoom");
      expect(phase(start + GONE + 0.1)).toBe("away");
      expect(phase(start + RETURN + 0.5)).toBe("return");
      expect(phase(start + PARKED + 0.1)).toBe("parked");
      expect(phase(start + SHOW_LEN + 1)).toBe("parked");
    }
    // Its door is open while the driver gets in and out, shut while it drives.
    const door = (t: number) => carAt({ ...s, t }).door;
    expect(door(FIRST + OPEN_CAR - 0.01)).toBe(0);
    expect(door(FIRST + BOARD + 0.1)).toBe(1);
    for (let t = BURNOUT; t < PARKED + 0.3; t += 0.1) expect(door(FIRST + t), `shut at ${t.toFixed(1)}`).toBe(0);
    expect(door(FIRST + ALIGHT + 0.1)).toBe(1);
    expect(door(FIRST + STOOD + 0.3)).toBe(0);
    // Its driver sits in it from boarding to getting out.
    const seated = (t: number) => carAt({ ...s, t }).seated;
    expect(seated(FIRST + BOARD)).toBe(false);
    expect(seated(FIRST + SEATED + 0.01)).toBe(true);
    expect(seated(FIRST + DONUTS + 1)).toBe(true);
    expect(seated(FIRST + PARKED + 0.1)).toBe(true);
    expect(seated(FIRST + ALIGHT + 0.01)).toBe(false);
  });

  it("shows its driver in the rear glass once they sit down", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    const car = { ...carAt({ ...s, t: 0 }) };
    const empty = carPixels(s, 0);
    /** Pixels that differ from the empty parked car, and whether they all lie in the left half of
     *  its rear glass (the driver's side). */
    const rider = (tau: number) => {
      const d = carPixels(s, FIRST + tau);
      let n = 0;
      let stray = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (Math.abs(d[i]! - empty[i]!) + Math.abs(d[i + 1]! - empty[i + 1]!) + Math.abs(d[i + 2]! - empty[i + 2]!) <= 12) continue;
          n++;
          if (x > car.x || x < car.x - car.w * 0.5 || y > car.y - car.w * 0.25 || y < car.y - car.w) stray++;
        }
      }
      return { n, stray };
    };
    // Seated, the door shut, before the burnout: their head and shoulders show, and nothing else changes.
    const seated = SEATED + 0.5;
    expect(seated).toBeLessThan(BURNOUT);
    const full = rider(seated);
    expect(full.n, "the driver in the rear glass").toBeGreaterThan(30);
    expect(full.stray, "only in the rear glass").toBe(0);
  });

  it("burns out in its spot, peels out into the distance, spins three times far out and zooms off to the city", () => {
    const s = startScene(390, 844, 1);
    const at = (tau: number) => ({ ...carAt({ ...s, t: FIRST + tau }) });
    const home = at(0);
    // Burnout: it stays put, its tail wagging a little.
    let wag = 0;
    for (let t = BURNOUT; t < LAUNCH; t += 0.05) {
      const c = at(t);
      expect(Math.hypot(c.x - home.x, c.y - home.y), `stays in its spot at ${t.toFixed(2)}`).toBeLessThan(home.w * 0.05);
      wag = Math.max(wag, Math.abs(turn(c.heading, home.heading)));
    }
    expect(wag, "fishtails").toBeGreaterThan(0.04);
    expect(wag, "only a little").toBeLessThan(0.12);
    // Peel out: up the grid, further away every step (higher on the screen, smaller), out to the
    // spot more than three times as far away as its home.
    let prev = at(LAUNCH);
    for (let t = LAUNCH + 0.05; t < DONUTS; t += 0.05) {
      const c = at(t);
      expect(c.z, `driving off at ${t.toFixed(2)}`).toBeGreaterThan(prev.z);
      expect(c.y, `up the screen at ${t.toFixed(2)}`).toBeLessThan(prev.y);
      expect(c.w, `shrinking at ${t.toFixed(2)}`).toBeLessThan(prev.w);
      expect(Math.abs(turn(c.heading, home.heading)), `straight on at ${t.toFixed(2)}`).toBeLessThan(0.05);
      prev = c;
    }
    const spot = at(ARRIVE);
    expect(spot.z).toBeGreaterThan(home.z * 3);
    expect(spot.w, "small out there").toBeLessThan(home.w / 3);
    // Donuts: it stays out there while it turns all the way round, SPINS times, through every
    // view (side, front, side, rear).
    let swept = 0;
    let last = at(DONUTS).heading;
    const views = new Set<number>();
    for (let t = DONUTS; t <= DONUTS_END + 1e-9; t += 0.02) {
      const c = at(t);
      swept += turn(c.heading, last);
      last = c.heading;
      views.add(Math.round(turn(c.heading, home.heading) / (Math.PI / 2)) & 3);
      if (t >= ARRIVE) expect(Math.abs(c.z - SPOT_Z), `at the spot at ${t.toFixed(2)}`).toBeLessThan(0.15);
    }
    expect(swept).toBeCloseTo(-SPINS * 2 * Math.PI, 3);
    expect(views.size, "rear, both sides and front").toBe(4);
    // Zoom: out of the last spin pointing at the city, it runs off down the lane (its screen
    // offset holds, so it heads for the skyline right of the tower) toward the horizon, shrinking
    // and fading into the haze; gone by GONE.
    const city = Math.atan2(LANE_X, TOWER_DEPTH);
    prev = at(DONUTS_END);
    expect(turn(prev.heading, city)).toBeCloseTo(0, 6);
    for (let t = ZOOM + 0.05; t < GONE; t += 0.05) {
      const c = at(t);
      expect(c.z, `zooming off at ${t.toFixed(2)}`).toBeGreaterThan(prev.z);
      expect(c.y, `toward the horizon at ${t.toFixed(2)}`).toBeLessThan(prev.y);
      expect(c.y, `on the floor at ${t.toFixed(2)}`).toBeGreaterThan(s.horizonY);
      expect(c.fade, `fading at ${t.toFixed(2)}`).toBeLessThanOrEqual(prev.fade);
      expect(turn(c.heading, city), `pointing at the city at ${t.toFixed(2)}`).toBeCloseTo(0, 6);
      expect((c.x - s.cssW / 2) / s.u, `in the lane at ${t.toFixed(2)}`).toBeCloseTo(LANE_X, 2);
      prev = c;
    }
    expect(at(GONE - 0.15).fade, "nearly gone in the haze").toBeLessThan(0.1);
    expect(at(GONE - 0.6).w, "a speck by then").toBeLessThan(home.w / 12);
    for (let t = GONE; t < RETURN; t += 0.1) expect(at(t).fade, `away at ${t.toFixed(1)}`).toBe(0);
  });

  it.each([
    [412, 915],
    [430, 932],
    [360, 800],
  ] as const)("%ix%i: comes back past \"tap to drop\" with room to spare on a tall phone, clear of the right edge", (W0, H0) => {
    // On a tall phone the text's right end and the screen's right edge leave the car only a little
    // room either side as it comes back up the floor (it swings a little wide of the text).
    const s = startScene(W0, H0, 1);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    let near = 0;
    for (let t = RETURN; t <= PARKED + 1e-9; t += 0.04) {
      const m = mask(W, H, (ctx) => drawCar(ctx, { ...s, t: FIRST + t }));
      const e = strays(m, s, 1);
      const what = `at ${t.toFixed(2)}`;
      expect(e.tap, `${what}: pixels under "tap to drop"`).toBe(0);
      expect(e.left + e.right + e.top, `${what}: pixels on a side or the top edge`).toBe(0);
      if (e.drawn > 0 && carAt({ ...s, t: FIRST + t }).y < s.cssH * 0.9 + s.u * 0.1) near++;
    }
    expect(near, "it passes the text's rows").toBeGreaterThan(5);
  });

  it.each(SIZES)("%ix%i (zoom %s): comes back in through the bottom edge, braking up the floor into its spot", (W0, H0, z) => {
    const s = startScene(W0, H0, z);
    const W = Math.round(s.cssW);
    const H = Math.round(s.cssH);
    const at = (tau: number) => ({ ...carAt({ ...s, t: FIRST + tau }) });
    const home = at(0);
    // Away, then in from below the screen: nothing of it shows as it starts back.
    expect(cover(carPixels(s, FIRST + RETURN - 0.3), W), "away: nothing drawn").toBe(0);
    expect(cover(carPixels(s, FIRST + RETURN), W), "starts back below the screen").toBe(0);
    // It comes into view through the bottom edge (touching it, and no other edge).
    let entered = false;
    let prev = at(RETURN);
    let prevSpeed = Infinity;
    for (let t = RETURN + 0.05; t <= PARKED + 1e-9; t += 0.05) {
      const c = at(t);
      const what = `at ${t.toFixed(2)}`;
      // Up the floor, away from us, slowing down all the way, pointing up the floor.
      expect(c.z, `${what}: up the floor`).toBeGreaterThan(prev.z - 1e-9);
      expect(c.y, `${what}: up the screen`).toBeLessThanOrEqual(prev.y + 1e-9);
      const speed = c.z - prev.z;
      expect(speed, `${what}: braking`).toBeLessThanOrEqual(prevSpeed + 1e-9);
      prevSpeed = speed;
      // (It swings a little wide of "tap to drop", then pulls back into its spot.)
      expect(Math.abs(turn(c.heading, HOME_HEADING)), `${what}: heading home`).toBeLessThan(0.08);
      expect((c.x - s.cssW / 2) / s.u, `${what}: right of the middle`).toBeGreaterThan(CAR_X - 0.01);
      if (!entered) {
        const m = mask(W, H, (ctx) => drawCar(ctx, { ...s, t: FIRST + t }));
        const e = strays(m, s, z);
        if (e.drawn > 0) {
          entered = true;
          expect(e.bottom, `${what}: comes in through the bottom edge`).toBeGreaterThan(0);
        }
      }
      prev = c;
    }
    expect(entered).toBe(true);
    // Parked exactly where it started the show, its brake lights on as it stops, then off.
    const parked = at(PARKED);
    expect(Math.hypot(parked.x - home.x, parked.y - home.y)).toBeLessThan(1e-6);
    expect(turn(parked.heading, home.heading)).toBeCloseTo(0, 9);
    expect(parked.w).toBeCloseTo(home.w, 9);
    for (let t = PARKED - 1; t < PARKED; t += 0.1) expect(at(t).brake, `brakes on at ${t.toFixed(1)}`).toBeGreaterThan(0.9);
    expect(at(PARKED + 1).brake).toBe(0);
  });

  it("moves smoothly: it never jumps in place or heading from one frame to the next (while it shows)", () => {
    const s = startScene(390, 844, 1);
    const dt = 1 / 120;
    let prev = { ...carAt({ ...s, t: FIRST }) };
    for (let i = 1; i * dt < SHOW_LEN + 1; i++) {
      const t = FIRST + i * dt;
      const c = { ...carAt({ ...s, t }) };
      const what = `at ${(t - FIRST).toFixed(3)} (${prev.phase} → ${c.phase})`;
      // While it is away it is nowhere to be seen; it comes back from where it is still off screen.
      if (c.phase !== "away" && prev.phase !== "away") {
        const fast = c.phase === "return" && c.y > s.cssH;
        if (!fast) expect(Math.hypot(c.x - prev.x, c.y - prev.y), `${what}: moved`).toBeLessThan(Math.max(prev.w * 0.05, c.phase === "return" ? 6 : 0));
        expect(Math.abs(turn(c.heading, prev.heading)), `${what}: turned`).toBeLessThan(0.08);
        expect(Math.abs(c.fade - prev.fade), `${what}: faded`).toBeLessThan(0.02);
      }
      prev = c;
    }
  });

  it("billows thick smoke in the burnout, leaves rings and smoke at the far spot, and lets them all fade", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const parked = carPixels(s, 0);
    // Late in the burnout, the car and its smoke cover at least 1.6 times what the car alone does.
    expect(cover(carPixels(s, FIRST + LAUNCH - 0.3), W) / cover(parked, W)).toBeGreaterThan(1.6);
    // Once it has zoomed well off, its tyre rings and smoke are still glowing round the spot.
    const spot = { ...carAt({ ...s, t: FIRST + ARRIVE }) };
    const left = { ...carAt({ ...s, t: FIRST + ZOOM + 0.9 }) };
    expect(spot.y - left.y, "the car has left the spot").toBeGreaterThan(spot.w);
    expect(cover(carPixels(s, FIRST + ZOOM + 0.9), W, spot.y - spot.w * 0.6, spot.y + spot.w * 0.4), "rings and smoke at the spot").toBeGreaterThan(40);
    // The home spot is empty once the burnout's smoke has lifted (and stays so until it is back).
    const floorLine = Math.floor(s.groundY);
    for (const t of [LAUNCH + 3.2, LAUNCH + 5.2, GONE + 0.1, RETURN - 0.2]) expect(cover(carPixels(s, FIRST + t), W, floorLine), `home empty at ${t}`).toBe(0);
    // Nothing is cut short while it is away: a moment before it comes back everything has faded.
    expect(cover(carPixels(s, FIRST + RETURN - 0.05), W)).toBe(0);
  });

  it("spins out there inside its own cloud of smoke", () => {
    // The spinning car never reaches higher than 0.85 of its width above the floor: what shows in
    // the band above that, round the spot, is its smoke rising.
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const spot = { ...carAt({ ...s, t: FIRST + ARRIVE }) };
    for (let t = ARRIVE + 1; t < DONUTS_END; t += 0.4) {
      const d = carPixels(s, FIRST + t);
      let smoke = 0;
      for (let y = Math.floor(spot.y - 2 * spot.w); y <= spot.y - 0.85 * spot.w; y++) {
        for (let x = Math.floor(spot.x - 2.5 * spot.w); x <= spot.x + 2.5 * spot.w; x++) if (d[(y * W + x) * 4 + 3]! > 16) smoke++;
      }
      expect(smoke, `smoke over the donuts at ${t.toFixed(1)}`).toBeGreaterThan(80);
    }
  });

  it.each(SIZES.slice(0, 2))("%ix%i: fades into the haze at the city instead of popping out", (W0, H0, z) => {
    const s = startScene(W0, H0, z);
    const W = Math.round(s.cssW);
    /** The most opaque pixel drawn round the car (its smoke and rings lie far below by then). */
    const brightest = (t: number) => {
      const c = { ...carAt({ ...s, t }) };
      const d = carPixels(s, t);
      const r = Math.max(3, 2 * c.w);
      let max = 0;
      for (let y = Math.floor(c.y - r - 2); y <= Math.ceil(c.y + 3); y++) {
        for (let x = Math.floor(c.x - r); x <= Math.ceil(c.x + r); x++) max = Math.max(max, d[(y * W + x) * 4 + 3]!);
      }
      return max;
    };
    expect(brightest(FIRST + ZOOM + 0.3), "whole as it sets off").toBe(255);
    let checked = 0;
    for (let t = FIRST + ZOOM; t < FIRST + GONE; t += 0.01) {
      const fade = carAt({ ...s, t }).fade;
      if (fade >= 0.05) continue;
      expect(brightest(t), `a faint glimmer at ${t.toFixed(2)} (fade ${fade.toFixed(3)})`).toBeLessThan(255 * (fade < 0.015 ? 0.1 : 0.4));
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });

  it("is parked between shows, every show plays the same, and it draws the same at the same time", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    // Parked and still before the first show and between shows.
    const parked = carPixels(s, 0);
    expect(cover(parked, W)).toBeGreaterThan(500);
    for (const t of [3, FIRST + OPEN_CAR - 0.1, FIRST + SHOW_LEN + 0.5, SECOND - 0.1, SECOND + OPEN_CAR - 0.05]) {
      expect(same(carPixels(s, t), parked), `parked at ${t.toFixed(2)}`).toBe(true);
    }
    // The second and a much later show look exactly like the first, moment by moment.
    let later = SECOND;
    for (let n = 1; n < 40; n++) later += gapAfter(n);
    for (const tau of [OPEN_CAR + 0.2, BURNOUT + 1.37, LAUNCH + 0.33, DONUTS + 1.21, ZOOM + 0.66, RETURN + 1.4, PARKED + 0.2, ALIGHT + 0.3]) {
      const first = carPixels(s, FIRST + tau);
      expect(same(carPixels(s, SECOND + tau), first), `second show at ${tau.toFixed(2)}`).toBe(true);
      expect(same(carPixels(s, later + tau), first), `41st show at ${tau.toFixed(2)}`).toBe(true);
    }
    // Mid-show it is busy (smoke, spinning), so frames differ.
    expect(same(carPixels(s, FIRST + DONUTS + 1), carPixels(s, FIRST + DONUTS + 1.1))).toBe(false);
  });

  it.each(SIZES)(
    "%ix%i (zoom %s): the whole show stays on the floor right of the tower, clear of everything",
    (W0, H0, z) => {
      const s0 = startScene(W0, H0, z);
      const W = Math.round(s0.cssW);
      const H = Math.round(s0.cssH);
      const props = [
        { name: "left palm", m: mask(W, H, (ctx) => drawPalm(ctx, s0, PALMS[0]!, RIM)) },
        { name: "right palm", m: mask(W, H, (ctx) => drawPalm(ctx, s0, PALMS[1]!, RIM)) },
      ];
      // Every moment it moves or its door does; parked and shut it is the start shot's car.
      const times: number[] = [-1];
      for (let t = OPEN_CAR - 0.05; t <= PARKED + 0.6; t += 0.1) {
        const c = carAt({ ...s0, t: FIRST + t });
        if (c.phase !== "away" || (t > GONE && t < GONE + 2.6)) times.push(t);
      }
      for (let t = PARKED + 0.6; t <= STOOD + 0.4; t += 0.1) times.push(t);
      for (const tau of times) {
        const s = { ...s0, t: FIRST + tau };
        const car = carAt(s);
        const what = `at ${tau.toFixed(1)} (${car.phase})`;
        const m = mask(W, H, (ctx) => drawCar(ctx, s));
        const e = strays(m, s, z);
        if (car.phase === "parked" || car.phase === "burnout") expect(e.drawn, `${what}: missing`).toBeGreaterThan(500);
        else if (car.fade > 0.5 && car.y < s.cssH) expect(e.drawn, `${what}: missing`).toBeGreaterThan(20);
        expect(e.left + e.right + e.top, `${what}: pixels on a side or the top edge`).toBe(0);
        if (car.phase !== "return") expect(e.bottom, `${what}: pixels on the bottom edge`).toBe(0);
        expect(e.leftHalf, `${what}: pixels in the left half`).toBe(0);
        expect(e.column, `${what}: pixels behind the tower`).toBe(0);
        expect(e.hud, `${what}: pixels in the HUD`).toBe(0);
        expect(e.sky, `${what}: pixels above the horizon`).toBe(0);
        expect(e.tap, `${what}: pixels under "tap to drop"`).toBe(0);
        // The arcade's door opens and closes with the show: its mask is drawn at the same moment.
        expect(overlap(m, mask(W, H, (ctx) => drawArcade(ctx, s, ARCADE))), `${what}: overlaps the arcade`).toBe(0);
        for (const p of props) expect(overlap(m, p.m), `${what}: overlaps the ${p.name}`).toBe(0);
      }
    },
    SLOW,
  );
});

import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { TOWER_DEPTH } from "../../base/world";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neon } from "../neon";
import type { NeonSkin, Scene } from "../skin";
import { drawArcade } from "./arcade";
import { ARRIVE, BURNOUT, carAt, DONUTS, DONUTS_END, drawCar, GONE, LANE_X, LAUNCH, SHOW_END, SPINS, SPOT_Z, ZOOM } from "./car";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { hudBottom } from "./sky";
import { zoomOut } from "./test-scene";

// The chrome car's show, from the moment a tower's scene starts (Scene.t = 0): a burnout in its
// spot, a peel-out up the grid into the distance, three small donuts far out, and a zoom down the
// lane to the city on the horizon, where it fades out, all inside ten seconds; then it is gone for
// the rest of the run (parked again only when the next scene starts at t = 0). Through the whole
// show, on the start screen of a tall and a short phone (and Hard's zoomed-out view), the car,
// its smoke and its tyre marks stay in the right half of the screen, out of the tower's column
// above its floor line, clear of the palms, the arcade, the HUD, the title's "tap to drop" and
// every screen edge.

/** The pixel checks draw the car a few hundred times: give them time on a busy machine (ms). */
const SLOW = 90_000;

const SIZES = [
  [390, 844, 1],
  [375, 667, 1],
  [390, 844, 0.6],
] as const;

/** The scene the start shot renders with, on a `W` x `H` phone zoomed out by `z` (Hard's camera). */
function startScene(W: number, H: number, z: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  let scene: Scene | undefined;
  const spy: NeonSkin = { ...neon, ground: (_, s) => (scene = { ...s }) };
  render(createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
  return z === 1 ? scene! : zoomOut(scene!, z);
}

function canvas(W: number, H: number): CanvasRenderingContext2D {
  return createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
}

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const ctx = canvas(W, H);
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** The car drawn alone at scene time t, as raw pixels. */
function pixels(s: Scene, t: number, W = Math.round(s.cssW), H = Math.round(s.cssH)): Uint8ClampedArray {
  const ctx = canvas(W, H);
  drawCar(ctx, { ...s, t });
  return ctx.getImageData(0, 0, W, H).data;
}

function same(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Pixels drawn (alpha over 40), optionally only inside rows y0..y1. */
function cover(d: Uint8ClampedArray, W: number, y0 = 0, y1 = Infinity): number {
  let n = 0;
  for (let i = 3; i < d.length; i += 4) {
    const y = Math.floor((i - 3) / 4 / W);
    if (y >= y0 && y <= y1 && d[i]! > 40) n++;
  }
  return n;
}

/** Heading difference folded into (-PI, PI]. */
function turn(a: number, b: number): number {
  const d = (((a - b) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d;
}

describe("synthwave car", () => {
  it("puts its show on from the scene's start and has it over inside ten seconds", () => {
    expect(BURNOUT).toBeLessThan(1);
    expect(LAUNCH).toBeGreaterThan(BURNOUT);
    expect(DONUTS).toBeGreaterThan(LAUNCH);
    expect(ARRIVE).toBeGreaterThan(DONUTS);
    expect(DONUTS_END).toBeGreaterThan(ARRIVE);
    expect(ZOOM).toBeGreaterThanOrEqual(DONUTS_END);
    expect(GONE).toBeGreaterThan(ZOOM);
    expect(GONE).toBeLessThanOrEqual(9.6);
    expect(SHOW_END).toBeLessThanOrEqual(10);
    const s = startScene(390, 844, 1);
    const phase = (t: number) => carAt({ ...s, t }).phase;
    expect(phase(0)).toBe("ready");
    expect(phase(BURNOUT + 0.5)).toBe("burnout");
    expect(phase(LAUNCH + 0.2)).toBe("launch");
    expect(phase(DONUTS + 1)).toBe("donuts");
    expect(phase(ZOOM + 0.5)).toBe("zoom");
    expect(phase(GONE)).toBe("gone");
    expect(phase(500)).toBe("gone");
  });

  it("burns out in its spot, peels out into the distance, spins three times far out and zooms off to the city", () => {
    const s = startScene(390, 844, 1);
    const at = (t: number) => ({ ...carAt({ ...s, t }) });
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
    for (const t of [GONE, SHOW_END, 60, 3600]) expect(at(t).fade, `gone at ${t}`).toBe(0);
  });

  it("moves smoothly: it never jumps in place or heading from one frame to the next", () => {
    const s = startScene(390, 844, 1);
    const dt = 1 / 120;
    let prev = { ...carAt({ ...s, t: 0 }) };
    for (let i = 1; i * dt < GONE; i++) {
      const t = i * dt;
      const c = { ...carAt({ ...s, t }) };
      const what = `at ${t.toFixed(3)} (${prev.phase} → ${c.phase})`;
      expect(Math.hypot(c.x - prev.x, c.y - prev.y), `${what}: moved`).toBeLessThan(prev.w * 0.05);
      expect(Math.abs(turn(c.heading, prev.heading)), `${what}: turned`).toBeLessThan(0.08);
      expect(Math.abs(c.fade - prev.fade), `${what}: faded`).toBeLessThan(0.02);
      prev = c;
    }
  });

  it("billows thick smoke in the burnout, leaves rings and smoke at the far spot, and lets them all fade", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const parked = pixels(s, 0);
    // Late in the burnout, the car and its smoke cover at least 1.6 times what the car alone does.
    expect(cover(pixels(s, LAUNCH - 0.3), W) / cover(parked, W)).toBeGreaterThan(1.6);
    // Once it has zoomed well off, its tyre rings and smoke are still glowing round the spot.
    const spot = { ...carAt({ ...s, t: ARRIVE }) };
    const left = { ...carAt({ ...s, t: ZOOM + 0.9 }) };
    expect(spot.y - left.y, "the car has left the spot").toBeGreaterThan(spot.w);
    expect(cover(pixels(s, ZOOM + 0.9), W, spot.y - spot.w * 0.6, spot.y + spot.w * 0.4), "rings and smoke at the spot").toBeGreaterThan(40);
    // The home spot is empty once the burnout's smoke has lifted (and stays so).
    const floorLine = Math.floor(s.groundY);
    for (const t of [6, 8, GONE + 0.1]) expect(cover(pixels(s, t), W, floorLine), `home empty at ${t}`).toBe(0);
    // Nothing is cut short at SHOW_END: a moment before it everything has faded already.
    expect(cover(pixels(s, SHOW_END - 0.05), W)).toBe(0);
  });

  it("spins out there inside its own cloud of smoke", () => {
    // The spinning car never reaches higher than 0.85 of its width above the floor: what shows in
    // the band above that, round the spot, is its smoke rising.
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    const spot = { ...carAt({ ...s, t: ARRIVE }) };
    for (let t = ARRIVE + 1; t < DONUTS_END; t += 0.4) {
      const d = pixels(s, t);
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
      const d = pixels(s, t);
      const r = Math.max(3, 2 * c.w);
      let max = 0;
      for (let y = Math.floor(c.y - r - 2); y <= Math.ceil(c.y + 3); y++) {
        for (let x = Math.floor(c.x - r); x <= Math.ceil(c.x + r); x++) max = Math.max(max, d[(y * W + x) * 4 + 3]!);
      }
      return max;
    };
    expect(brightest(ZOOM + 0.3), "whole as it sets off").toBe(255);
    let checked = 0;
    for (let t = ZOOM; t < GONE; t += 0.01) {
      const fade = carAt({ ...s, t }).fade;
      if (fade >= 0.05) continue;
      expect(brightest(t), `a faint glimmer at ${t.toFixed(2)} (fade ${fade.toFixed(3)})`).toBeLessThan(255 * (fade < 0.015 ? 0.1 : 0.4));
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });

  it("is gone for the rest of the run, parked again at the scene's start, and draws the same at the same time", () => {
    const s = startScene(390, 844, 1);
    const W = Math.round(s.cssW);
    for (const t of [SHOW_END, SHOW_END + 0.37, 14, 61.3, 3600]) expect(cover(pixels(s, t), W), `at ${t}`).toBe(0);
    // Parked and still before the show begins (where every new scene starts).
    const parked = pixels(s, 0);
    expect(cover(parked, W)).toBeGreaterThan(500);
    expect(same(pixels(s, BURNOUT - 0.1), parked)).toBe(true);
    for (const t of [1.37, 3.33, 5.21, 6.66, 8.08]) expect(same(pixels(s, t), pixels(s, t)), `at ${t}`).toBe(true);
    // Mid-show it is busy (smoke, spinning), so frames differ.
    expect(same(pixels(s, 5.2), pixels(s, 5.3))).toBe(false);
  });

  it.each(SIZES)("%ix%i (zoom %s): the whole show stays on the floor right of the tower, clear of everything", (W0, H0, z) => {
    const s0 = startScene(W0, H0, z);
    const W = Math.round(s0.cssW);
    const H = Math.round(s0.cssH);
    const props = [
      { name: "left palm", m: mask(W, H, (ctx) => drawPalm(ctx, s0, PALMS[0]!, RIM)) },
      { name: "right palm", m: mask(W, H, (ctx) => drawPalm(ctx, s0, PALMS[1]!, RIM)) },
      { name: "arcade", m: mask(W, H, (ctx) => drawArcade(ctx, s0, ARCADE)) },
    ];
    const x0 = Math.ceil(s0.baseX - s0.u * 0.05);
    const x1 = Math.floor(s0.baseX + s0.baseW + s0.u * 0.05);
    const hud = Math.round(hudBottom(s0));
    // The title screen's "tap to drop" line (render.ts: centered at 90% of the height).
    const tap = { x0: s0.cssW / 2 - s0.u * 0.17, x1: s0.cssW / 2 + s0.u * 0.17, y0: s0.cssH * 0.9 - s0.u * 0.06, y1: s0.cssH * 0.9 + s0.u * 0.02 };
    for (let t = 0; t <= SHOW_END + 0.2; t += 0.1) {
      const s = { ...s0, t };
      const car = carAt(s);
      const what = `at ${t.toFixed(1)} (${car.phase})`;
      const m = mask(W, H, (ctx) => drawCar(ctx, s));
      let edge = 0;
      let left = 0;
      let column = 0;
      let top = 0;
      let title = 0;
      let sky = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge++;
          if (x < s.cssW / 2) left++;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (y < s.horizonY) sky++;
          if (x >= tap.x0 && x <= tap.x1 && y >= tap.y0 && y <= tap.y1) title++;
        }
      }
      if (car.phase === "ready" || car.phase === "burnout") expect(drawn, `${what}: missing`).toBeGreaterThan(500);
      else if (car.fade > 0.5) expect(drawn, `${what}: missing`).toBeGreaterThan(30);
      expect(edge, `${what}: pixels on a screen edge`).toBe(0);
      expect(left, `${what}: pixels in the left half`).toBe(0);
      expect(column, `${what}: pixels behind the tower`).toBe(0);
      expect(top, `${what}: pixels in the HUD`).toBe(0);
      expect(sky, `${what}: pixels above the horizon`).toBe(0);
      expect(title, `${what}: pixels under "tap to drop"`).toBe(0);
      for (const p of props) {
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & p.m[k]!;
        expect(both, `${what}: overlaps the ${p.name}`).toBe(0);
      }
    }
  }, SLOW);
});

import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neon } from "../neon";
import type { NeonSkin, Scene } from "../skin";
import { drawArcade } from "./arcade";
import { BURNOUT, carAt, DONUTS, DONUTS_END, drawCar, LAUNCH, PARKED, SETTLED, SHOW_END, SPINS } from "./car";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { hudBottom } from "./sky";
import { zoomOut } from "./test-scene";

// The chrome car's show, from the moment a tower's scene starts (Scene.t = 0): a burnout in its
// spot, a take-off up the floor, three donuts, and back into its spot, all inside ten seconds;
// then it idles, still, for the rest of the run. Through the whole show, on the start screen of a
// tall and a short phone (and Hard's zoomed-out view), the car, its smoke and its tyre marks stay
// in the right half of the screen, below the floor line in the tower's column, clear of the
// palms, the arcade, the HUD, the title's "tap to drop" and every screen edge.

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
    expect(DONUTS_END).toBeGreaterThan(DONUTS);
    expect(PARKED).toBeGreaterThan(DONUTS_END);
    expect(SETTLED).toBeLessThanOrEqual(9.6);
    expect(SHOW_END).toBeLessThanOrEqual(10);
    const s = startScene(390, 844, 1);
    const phase = (t: number) => carAt({ ...s, t }).phase;
    expect(phase(0)).toBe("ready");
    expect(phase(BURNOUT + 0.5)).toBe("burnout");
    expect(phase(LAUNCH + 0.2)).toBe("launch");
    expect(phase(DONUTS + 1)).toBe("donuts");
    expect(phase(DONUTS_END + 0.5)).toBe("back");
    expect(phase(PARKED + 0.01)).toBe("parked");
    expect(phase(500)).toBe("parked");
  });

  it("burns out in its spot, takes off up the floor, spins three times and backs into its spot", () => {
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
    // Take off: up the floor (further away, so higher on the screen and smaller).
    const off = at(DONUTS);
    expect(off.z).toBeGreaterThan(home.z + 0.2);
    expect(off.y).toBeLessThan(home.y);
    // Donuts: it turns all the way round, SPINS times, through every view (side, front, side, rear).
    let swept = 0;
    let last = at(LAUNCH).heading;
    const views = new Set<number>();
    for (let t = LAUNCH; t <= DONUTS_END + 1e-9; t += 0.02) {
      const h = at(t).heading;
      swept += turn(h, last);
      last = h;
      views.add(Math.round(turn(h, home.heading) / (Math.PI / 2)) & 3);
    }
    expect(swept).toBeCloseTo(-SPINS * 2 * Math.PI, 3);
    expect(views.size, "rear, both sides and front").toBe(4);
    // Back: it reverses home (nearer every step), facing away all the way.
    let prev = at(DONUTS_END);
    for (let t = DONUTS_END + 0.05; t < PARKED; t += 0.05) {
      const c = at(t);
      expect(c.z, `reversing at ${t.toFixed(2)}`).toBeLessThanOrEqual(prev.z + 1e-12);
      expect(Math.abs(turn(c.heading, home.heading)), `facing away at ${t.toFixed(2)}`).toBeLessThan(0.05);
      prev = c;
    }
    // Home by PARKED, exactly where it started.
    for (const t of [PARKED, SETTLED, SHOW_END, 60, 3600]) {
      const c = at(t);
      expect(c.x, `at ${t}`).toBeCloseTo(home.x, 6);
      expect(c.y, `at ${t}`).toBeCloseTo(home.y, 6);
      expect(turn(c.heading, home.heading), `at ${t}`).toBeCloseTo(0, 6);
    }
  });

  it("moves smoothly: it never jumps in place or heading from one frame to the next", () => {
    const s = startScene(390, 844, 1);
    const dt = 1 / 120;
    let prev = { ...carAt({ ...s, t: 0 }) };
    for (let i = 1; i * dt <= SHOW_END + 0.5; i++) {
      const t = i * dt;
      const c = { ...carAt({ ...s, t }) };
      const what = `at ${t.toFixed(3)} (${prev.phase} → ${c.phase})`;
      expect(Math.hypot(c.x - prev.x, c.y - prev.y), `${what}: moved`).toBeLessThan(prev.w * 0.05);
      expect(Math.abs(turn(c.heading, prev.heading)), `${what}: turned`).toBeLessThan(0.08);
      prev = c;
    }
  });

  it("billows thick smoke in the burnout, and lets the smoke and tyre marks fade before the show ends", () => {
    const s = startScene(390, 844, 1);
    const idle = pixels(s, SHOW_END);
    const cover = (d: Uint8ClampedArray) => {
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 40) n++;
      return n;
    };
    // Late in the burnout, the car and its smoke cover at least 1.6 times what the car alone does.
    expect(cover(pixels(s, LAUNCH - 0.3)) / cover(idle)).toBeGreaterThan(1.6);
    // Nothing is cut short at SHOW_END: a moment before it the car already looks as it idles.
    expect(same(pixels(s, SHOW_END - 0.05), idle)).toBe(true);
  });

  it("idles still once the show is over, and draws the same at the same time", () => {
    const s = startScene(390, 844, 1);
    const idle = pixels(s, SHOW_END);
    for (const t of [SHOW_END + 0.37, 14, 61.3, 3600]) expect(same(pixels(s, t), idle), `at ${t}`).toBe(true);
    // At rest it looks as it did before the show began.
    expect(same(pixels(s, 0), idle)).toBe(true);
    for (const t of [1.37, 4.21, 6.66, 8.08]) expect(same(pixels(s, t), pixels(s, t)), `at ${t}`).toBe(true);
    // Mid-show it is busy (smoke, spinning), so frames differ.
    expect(same(pixels(s, 4.2), pixels(s, 4.3))).toBe(false);
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
      const what = `at ${t.toFixed(1)} (${carAt(s).phase})`;
      const m = mask(W, H, (ctx) => drawCar(ctx, s));
      let edge = 0;
      let left = 0;
      let column = 0;
      let top = 0;
      let title = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge++;
          if (x < s.cssW / 2) left++;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (x >= tap.x0 && x <= tap.x1 && y >= tap.y0 && y <= tap.y1) title++;
        }
      }
      expect(drawn, `${what}: missing`).toBeGreaterThan(500);
      expect(edge, `${what}: pixels on a screen edge`).toBe(0);
      expect(left, `${what}: pixels in the left half`).toBe(0);
      expect(column, `${what}: pixels behind the tower`).toBe(0);
      expect(top, `${what}: pixels in the HUD`).toBe(0);
      expect(title, `${what}: pixels under "tap to drop"`).toBe(0);
      for (const p of props) {
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & p.m[k]!;
        expect(both, `${what}: overlaps the ${p.name}`).toBe(0);
      }
    }
  }, SLOW);
});

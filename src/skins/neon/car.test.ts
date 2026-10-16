import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neon } from "../neon";
import type { NeonSkin, Scene } from "../skin";
import { drawArcade } from "./arcade";
import { BACK_TIME, carAt, COME_BACK, cycleTime, drawCar, DRIVE_OFF, LOOP_TIME, OFF_TIME } from "./car";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { hudBottom } from "./sky";
import { zoomOut } from "./test-scene";

// The chrome car keeps time with the Neon song: it drives off into the distance on the first
// drop, is gone for a while, comes back round from behind us on the lift and cruises in its
// spot until the next loop's drop (on the scene's clock when there is no music). Through the
// whole cycle, on the start screen of a tall and a short phone (and a zoomed-out view, as Hard's
// camera shows a leaning tower), it never passes behind the tower, never touches a palm, the
// arcade, the HUD or the title's "tap to drop", and never crosses the left side or the top of the screen; only on its way
// back, overtaking us from behind on the right, does it come in over the bottom right corner.

/** The pixel checks draw the car a few hundred times: give them time on a busy machine (ms). */
const SLOW = 60_000;

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

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const ctx = createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** Song times through the drive off and the way back, finely, and a few while it cruises. */
function moments(): number[] {
  const out: number[] = [];
  for (let t = DRIVE_OFF - 0.3; t < DRIVE_OFF + OFF_TIME + 0.3; t += 0.05) out.push(t);
  for (let t = COME_BACK - 0.2; t < COME_BACK + BACK_TIME + 0.3; t += 0.05) out.push(t);
  for (let t = 0; t < LOOP_TIME; t += 7.7) out.push(t);
  return out;
}

describe("synthwave car", () => {
  it("keeps time with the Neon song: off on the first drop (bar 17), back on the lift (bar 25)", () => {
    const beat = 60 / 125;
    expect(LOOP_TIME).toBeCloseTo(48 * 4 * beat, 6);
    expect(DRIVE_OFF).toBeCloseTo(16 * 4 * beat, 6);
    expect(COME_BACK).toBeCloseTo(24 * 4 * beat, 6);
    expect(DRIVE_OFF + OFF_TIME).toBeLessThan(COME_BACK);
  });

  it("drives off into the distance, is gone, comes back round and cruises until the next drop", () => {
    const s = startScene(390, 844, 1);
    const at = (songTime: number) => ({ ...carAt({ ...s, songTime }) });
    const cruise = at(DRIVE_OFF - 1);
    expect(cruise.phase).toBe("cruise");
    // Off: shrinking and climbing toward the horizon the whole way, small by the time it has faded.
    let last = cruise;
    for (let t = DRIVE_OFF + 0.05; t < DRIVE_OFF + OFF_TIME; t += 0.05) {
      const c = at(t);
      expect(c.phase, `at ${t.toFixed(2)}`).toBe("off");
      expect(c.w, `shrinks at ${t.toFixed(2)}`).toBeLessThan(last.w);
      expect(c.y, `heads for the horizon at ${t.toFixed(2)}`).toBeLessThan(last.y);
      expect(c.y).toBeGreaterThan(s.horizonY);
      if (c.alpha < 0.05) expect(c.w, "faded only once small").toBeLessThan(s.u * 0.025);
      last = c;
    }
    expect(at(DRIVE_OFF + OFF_TIME + 0.1).phase).toBe("gone");
    expect(at(COME_BACK - 0.1).phase).toBe("gone");
    // Back from below the screen, easing into its spot.
    const back = at(COME_BACK + 0.01);
    expect(back.phase).toBe("back");
    expect(back.y - back.w * 0.65, "out of sight below the screen").toBeGreaterThan(s.cssH);
    const home = at(COME_BACK + BACK_TIME + 0.01);
    expect(home.phase).toBe("cruise");
    expect(home.x).toBeCloseTo(cruise.x, 6);
    expect(home.w).toBeCloseTo(cruise.w, 6);
    // And round again: the next loop's drop.
    expect(at(DRIVE_OFF + LOOP_TIME + 0.5).phase).toBe("off");
  });

  it("runs the same cycle on the scene's clock when there is no music", () => {
    const s = startScene(390, 844, 1);
    for (const t of [0, 12, DRIVE_OFF + 1, COME_BACK + 1, LOOP_TIME + DRIVE_OFF + 1.3, 5 * LOOP_TIME + COME_BACK + 0.7]) {
      const song = { ...carAt({ ...s, t, songTime: cycleTime({ ...s, t }) }) };
      const silent = { ...carAt({ ...s, t, songTime: NaN }) };
      expect(silent).toEqual(song);
    }
  });

  it.each(SIZES)("%ix%i (zoom %s): it stays clear of the tower, the props and the HUD all the way round", (W0, H0, z) => {
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
    let drawnOff = 0;
    for (const songTime of moments()) {
      const s = { ...s0, songTime };
      const phase = carAt(s).phase;
      const m = mask(W, H, (ctx) => drawCar(ctx, s));
      const what = `at ${songTime.toFixed(2)} (${phase})`;
      let column = 0;
      let sides = 0;
      let right = 0;
      let bottom = 0;
      let top = 0;
      let title = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || y === 0) sides++;
          if (x === W - 1) right++;
          if (y === H - 1) bottom++;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (x >= tap.x0 && x <= tap.x1 && y >= tap.y0 && y <= tap.y1) title++;
        }
      }
      if (phase === "off") drawnOff += drawn;
      if (phase === "gone") expect(drawn, `${what}: drawn while gone`).toBe(0);
      if (phase === "cruise") expect(drawn, `${what}: missing`).toBeGreaterThan(50);
      expect(column, `${what}: pixels behind the tower`).toBe(0);
      expect(sides, `${what}: pixels on the left side or the top of the screen`).toBe(0);
      if (phase !== "back") expect(right + bottom, `${what}: pixels on the right side or the bottom`).toBe(0);
      expect(top, `${what}: pixels in the HUD`).toBe(0);
      expect(title, `${what}: pixels under "tap to drop"`).toBe(0);
      for (const p of props) {
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & p.m[k]!;
        expect(both, `${what}: overlaps the ${p.name}`).toBe(0);
      }
    }
    expect(drawnOff, "it is seen driving off").toBeGreaterThan(1000);
  }, SLOW);
});

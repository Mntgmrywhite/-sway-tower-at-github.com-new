import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { MIDNIGHT, sceneTimeOf } from "./countdown";
import { BLINK, blinkStart, eckleburg, glanceAt, lidsAt } from "./eckleburg";
import { estate } from "./estate";
import { EDGE_Z, PROPS } from "./ground";
import { TIMES_X } from "./landmarks";
import { SIGN } from "./marquee";
import { underMoon } from "./sky";
import { sceneAt } from "./test-scene";

// Doctor T. J. Eckleburg's billboard, across the bay in the right-hand lane: it blinks every 4 to
// 9 s from a tower's first few seconds on, now and then glances over at the tower, keeps to its
// lane on every screen and in the zoomed view, and never touches the other props, the terrace,
// the estate and its dock, the tower column, the moon, or the Times Tower's screen, clock and ball.

const DT = 1 / 240;

/** The times (from `from`, over `span` seconds) at which f turns true. */
function onsets(f: (t: number) => boolean, from: number, span: number): number[] {
  const out: number[] = [];
  let was = f(from);
  for (let t = from + DT; t <= from + span; t += DT) {
    const is = f(t);
    if (is && !was) out.push(t);
    was = is;
  }
  return out;
}

describe("Doctor T. J. Eckleburg's eyes", () => {
  it("blink for the first time within a tower's first 10 s: shut and open again in about a quarter second", () => {
    expect(lidsAt(0)).toBe(0);
    const first = onsets((t) => lidsAt(t) > 0, 0, 10)[0]!;
    expect(first).toBeGreaterThan(0.5);
    expect(first).toBeLessThanOrEqual(10);
    // Fully shut on the way, open again by the end
    let shut = Infinity;
    for (let t = first; t < first + 0.4; t += DT) if (lidsAt(t) === 1) shut = Math.min(shut, t);
    expect(shut - first).toBeLessThan(0.15);
    const open = onsets((t) => lidsAt(t) === 0, first, 1)[0]!;
    expect(open - first).toBeGreaterThan(0.2);
    expect(open - first).toBeLessThan(0.3);
    expect(BLINK).toBeCloseTo(0.25, 1);
  });

  it.each([0, 3000, 86_400])("blink again every 4 to 9 s, forever (from %i s)", (from) => {
    const starts = onsets((t) => lidsAt(t) > 0, from, 400);
    expect(starts.length).toBeGreaterThan(400 / 9 - 1);
    for (let i = 1; i < starts.length; i++) {
      const gap = starts[i]! - starts[i - 1]!;
      expect(gap, `blink ${i} after ${starts[i - 1]!.toFixed(2)} s`).toBeGreaterThanOrEqual(4 - DT);
      expect(gap, `blink ${i} after ${starts[i - 1]!.toFixed(2)} s`).toBeLessThanOrEqual(9 + DT);
    }
    // ...each one all the way shut, the lids sliding (never jumping) down and up
    for (const s of starts) {
      let most = 0;
      let step = 0;
      for (let t = s - DT; t < s + BLINK + DT; t += DT) {
        most = Math.max(most, lidsAt(t));
        step = Math.max(step, Math.abs(lidsAt(t + DT) - lidsAt(t)));
      }
      expect(most).toBe(1);
      expect(step).toBeLessThan(0.1);
    }
  });

  it("glance over at the tower within the first 10 s, then now and then, never while blinking", () => {
    const glances = onsets((t) => glanceAt(t) > 0, 0, 600);
    expect(glances[0]!).toBeLessThanOrEqual(10);
    let full = Infinity;
    for (let t = glances[0]!; t < glances[0]! + 2; t += DT) if (glanceAt(t) === 1) full = Math.min(full, t);
    expect(full).toBeLessThanOrEqual(10);
    // Now and then: after somewhere between a fifth and two thirds of the blinks
    const blinks = onsets((t) => lidsAt(t) > 0, 0, 600).length;
    expect(glances.length).toBeGreaterThan(blinks / 5);
    expect(glances.length).toBeLessThan((blinks * 2) / 3);
    let step = 0;
    for (let t = 0; t < 600; t += DT) {
      if (glanceAt(t) > 0) expect(lidsAt(t), `${t.toFixed(3)} s`).toBe(0);
      step = Math.max(step, Math.abs(glanceAt(t + DT) - glanceAt(t)));
    }
    expect(step).toBeLessThan(0.05);
  });
});

/* ---------------------------------------------------------------- drawing */

const kit = kitFor(newYear);
const BILLBOARD = PROPS.find((p) => p.draw === eckleburg)!;
type Draw = (ctx: CanvasRenderingContext2D) => void;

/** Draw a prop from ground.ts's list where the layer puts it. */
function prop(p: (typeof PROPS)[number], s: Scene): Draw {
  return (ctx) => p.draw(ctx, s, s.cssW / 2 + p.dx * s.u, fieldY(s, p.z), TOWER_DEPTH / p.z);
}

/** A window of the screen (it may run past the screen's edges). */
interface Win {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** Where `draw` puts anything (alpha over 24) inside the window. */
function maskOf(win: Win, draw: Draw): Uint8Array {
  const canvas = createCanvas(win.w, win.h);
  const ctx = canvas.getContext("2d");
  ctx.translate(-win.x0, -win.y0);
  draw(ctx as unknown as CanvasRenderingContext2D);
  const d = ctx.getImageData(0, 0, win.w, win.h).data;
  const m = new Uint8Array(win.w * win.h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3]! > 24 ? 1 : 0;
  return m;
}

function pixelsOf(win: Win, draw: Draw): Uint8ClampedArray {
  const canvas = createCanvas(win.w, win.h);
  const ctx = canvas.getContext("2d");
  ctx.translate(-win.x0, -win.y0);
  draw(ctx as unknown as CanvasRenderingContext2D);
  return ctx.getImageData(0, 0, win.w, win.h).data;
}

/** A window round the billboard, with room to spare on every side. */
function around(s: Scene): Win {
  const k = TOWER_DEPTH / BILLBOARD.z;
  const foot = fieldY(s, BILLBOARD.z);
  const top = foot - BILLBOARD.tall * s.u * k;
  const x0 = Math.floor(s.cssW / 2 + 0.2 * s.u);
  const y0 = Math.floor(top - 0.03 * s.u);
  return { x0, y0, w: Math.ceil(0.36 * s.u), h: Math.ceil(foot - y0 + 0.03 * s.u) };
}

function overlap(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i]! & b[i]!;
  return n;
}

/** The billboard's extent on the screen (inclusive), or null if it draws nothing in the window. */
function extent(win: Win, m: Uint8Array): { x0: number; x1: number; y0: number; y1: number; n: number } | null {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = win.x0 + (i % win.w);
    const y = win.y0 + Math.floor(i / win.w);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    n++;
  }
  return n ? { x0, x1, y0, y1, n } : null;
}

/** The Times Tower's moving parts in the window: wherever the far layer changes as the song runs
 *  through the minute, the count, midnight (the clock face flashes) and the greeting: the screen,
 *  the clock and its hands, and the ball and its rays; and the whole screen, frame and all, with
 *  everything over it up to the ball. */
function timesTower(win: Win, s: Scene): Uint8Array {
  const at = (song: number): Uint8ClampedArray => pixelsOf(win, (ctx) => newYear.far!(ctx, { ...s, songTime: song }));
  const base = at(20.3);
  const out = new Uint8Array(win.w * win.h);
  for (const song of [7.2, 45.1, MIDNIGHT - 3.5, MIDNIGHT + 0.1, MIDNIGHT + 6]) {
    const d = at(song);
    for (let i = 0; i < out.length; i++) {
      const j = i * 4;
      if (d[j] !== base[j] || d[j + 1] !== base[j + 1] || d[j + 2] !== base[j + 2] || d[j + 3] !== base[j + 3]) out[i] = 1;
    }
  }
  const hy = s.horizonY + 1;
  const sx0 = s.cssW / 2 + (TIMES_X - SIGN.hw) * s.u;
  const sx1 = s.cssW / 2 + (TIMES_X + SIGN.hw) * s.u;
  const sy1 = hy - SIGN.y0 * s.u;
  for (let i = 0; i < out.length; i++) {
    const x = win.x0 + (i % win.w);
    const y = win.y0 + Math.floor(i / win.w);
    if (x >= sx0 && x <= sx1 && y <= sy1) out[i] = 1;
  }
  // A couple of pixels of air all round
  const grown = out.slice();
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) continue;
    const x = i % win.w;
    const y = Math.floor(i / win.w);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < win.w && yy < win.h) grown[yy * win.w + xx] = 1;
    }
  }
  return grown;
}

/** Phones, a tablet, and each seen through Hard's zoomed-out camera (a virtual screen 1/0.6 the
 *  size with the device's own u). */
const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [768, 1024, 1],
  [390, 844, 0.6],
  [375, 667, 0.6],
  [768, 1024, 0.6],
] as const;

function screen(pw: number, ph: number, zoom: number, lvl: number, t: number): Scene {
  const u = Math.min(pw, ph * 0.6);
  return sceneAt(Math.round(pw / zoom), Math.round(ph / zoom), lvl, t, NaN, u);
}

/** Tower levels from the start until the billboard has left the screen: closely at first, where
 *  it is nearest the other props, then more sparsely. */
const LEVELS = [...Array.from({ length: 11 }, (_, i) => i * 3), ...Array.from({ length: 19 }, (_, i) => 40 + i * 20)];

/** Moments through the first blink and glance, and the gramophone's notes' rise. */
const TIMES = [0.4, blinkStart(0) + 0.12, 3.6, 5.3, 7.9, 11.05];

describe("Doctor T. J. Eckleburg's billboard in the scene", () => {
  it.each(SCREENS)("%ix%i (zoom %s): keeps to the right-hand lane, clear of the column, the edges and the HUD, up to where it leaves", (pw, ph, zoom) => {
    let seen = 0;
    for (const lvl of LEVELS) {
      const s0 = screen(pw, ph, zoom, lvl, 0);
      const win = around(s0);
      if (win.y0 > s0.cssH) break;
      const W = s0.cssW;
      const H = s0.cssH;
      const c1 = s0.baseX + s0.baseW + s0.u * 0.05;
      for (const t of TIMES) {
        const s = screen(pw, ph, zoom, lvl, t);
        const e = extent(win, maskOf(win, prop(BILLBOARD, s)));
        if (!e) continue;
        seen++;
        const at = `level ${lvl}, t ${t}`;
        // It stands right of the tower column; it is never cut by a side or the top...
        expect(e.x0, at).toBeGreaterThan(c1);
        expect(e.x1, at).toBeLessThan(W - 1);
        expect(e.y0, at).toBeGreaterThan(H * 0.32);
        // ...and, as a tower starts, nor by the bottom: it leaves only as the camera climbs.
        if (lvl === 0) expect(e.y1, at).toBeLessThan(H - 1);
        // It reads at a glance: the board alone is a fifth of u wide.
        expect(e.x1 - e.x0, at).toBeGreaterThan(0.2 * s.u);
        // Never over the moon
        expect((s.horizonY - e.y0) / s.u, at).toBeLessThan(underMoon(s, e.x0, e.x1));
      }
    }
    expect(seen).toBeGreaterThan(20);
  }, 30_000);

  it.each(SCREENS)("%ix%i (zoom %s): never touches another prop, the terrace, the estate or its dock", (pw, ph, zoom) => {
    for (const lvl of LEVELS) {
      const s0 = screen(pw, ph, zoom, lvl, 0);
      const win = around(s0);
      if (win.y0 > s0.cssH) break;
      // The gramophone's notes rise between the posts: follow them through their whole rise as a
      // tower starts, where they come closest.
      const times = lvl === 0 ? Array.from({ length: 24 }, (_, i) => i * 0.1) : TIMES;
      for (const t of times) {
        const s = screen(pw, ph, zoom, lvl, t);
        const at = `level ${lvl}, t ${t}`;
        const m = maskOf(win, prop(BILLBOARD, s));
        const e = extent(win, m);
        if (!e) continue;
        const ye = fieldY(s, EDGE_Z);
        const others: [string, Draw][] = [
          ...PROPS.filter((p) => p !== BILLBOARD).map((p): [string, Draw] => [p.draw.name, prop(p, s)]),
          ["the estate", (ctx) => estate(ctx, s, ye)],
        ];
        // All of them at once; one at a time only to name the one it touches
        if (overlap(m, maskOf(win, (ctx) => others.forEach(([, draw]) => draw(ctx)))) > 0) {
          for (const [name, draw] of others) expect(overlap(m, maskOf(win, draw)), `${name}, ${at}`).toBe(0);
        }
        // The terrace's coping starts a pixel over its edge on the water
        expect(e.y1, `the terrace, ${at}`).toBeLessThan(ye - 2);
      }
    }
  }, 30_000);

  it.each(SCREENS)("%ix%i (zoom %s): stays clear of the Times Tower's screen, clock and ball", (pw, ph, zoom) => {
    for (let lvl = 0; lvl <= 30; lvl += 6) {
      const s0 = screen(pw, ph, zoom, lvl, 0);
      const win = around(s0);
      const times = timesTower(win, s0);
      for (const t of [0.4, blinkStart(0) + 0.12, 3.6]) {
        const m = maskOf(win, prop(BILLBOARD, screen(pw, ph, zoom, lvl, t)));
        expect(overlap(m, times), `level ${lvl}, t ${t}`).toBe(0);
      }
    }
  }, 30_000);

  it("is drawn by the ground layer where the test puts it: its eyes blink there", () => {
    const s = sceneAt(390, 844, 0, 0);
    const win = around(s);
    const open = blinkStart(0) - 0.02;
    const shut = blinkStart(0) + 0.12;
    const alone = maskOf(win, prop(BILLBOARD, sceneAt(390, 844, 0, open)));
    const a = pixelsOf(win, (ctx) => newYear.ground!(ctx, sceneAt(390, 844, 0, open)));
    const b = pixelsOf(win, (ctx) => newYear.ground!(ctx, sceneAt(390, 844, 0, shut)));
    let inside = 0;
    for (let i = 0; i < alone.length; i++) {
      const j = i * 4;
      if (alone[i] && (a[j] !== b[j] || a[j + 1] !== b[j + 1] || a[j + 2] !== b[j + 2])) inside++;
    }
    expect(inside).toBeGreaterThan(150);
  });

  it("draws the very same frame at the same moment, music or not, and moves only when it blinks or looks", () => {
    const W = 390;
    const H = 844;
    const frame = (t: number, song = NaN): Uint8ClampedArray => {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      const s = sceneAt(W, H, 0, t, song);
      kit.world(ctx, s);
      kit.front(ctx, s);
      return ctx.getImageData(0, 0, W, H).data;
    };
    for (const t of [0.4, blinkStart(0) + 0.05, blinkStart(0) + 0.12, 3.6, sceneTimeOf(MIDNIGHT + 1)]) {
      const a = frame(t);
      const b = frame(t);
      let differ = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
      expect(differ, `t ${t}`).toBe(0);
    }
    const s = sceneAt(W, H, 0, 0);
    const win = around(s);
    const alone = (t: number, song = NaN): Uint8ClampedArray => pixelsOf(win, prop(BILLBOARD, sceneAt(W, H, 0, t, song)));
    const same = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean => a.every((v, i) => v === b[i]);
    expect(same(alone(5.3), alone(5.3, 41.7))).toBe(true);
    expect(same(alone(0.4), alone(1.1))).toBe(true);
    expect(same(alone(0.4), alone(blinkStart(0) + 0.12))).toBe(false);
    expect(same(alone(0.4), alone(3.6))).toBe(false);
  });
});

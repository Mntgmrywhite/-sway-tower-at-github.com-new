import { createCanvas } from "@napi-rs/canvas";
import { afterEach, describe, expect, it } from "vitest";
import { BLOCK_HEIGHT, resetTuning, SLIDE_RANGE, WORLD_WIDTH } from "./config";
import { balanceFailure, drop, newGame, sliderSpeed, step, swayOffset, top, type GameState } from "./game";
import { fadeCamera, frameFor, panFade, panTarget, swayReach, type Frame } from "./camera";
import { addTopple, isToppling, newView, render, towerPan, updateView, type View } from "./render";
import { SKINS } from "./skins";

afterEach(resetTuning);

const PHONES = [
  [375, 667],
  [390, 844],
] as const;
const DT = 1 / 60;
const MID = WORLD_WIDTH / 2;

/**
 * A Hard tower: `straight` bars on the base, then a lean of `n` bars where bar k (from the bottom)
 * hangs `share` of 1/(n - k) of half a bar past the one below (harmonic stacking: `share` 1 would
 * balance every part exactly on its edge), toward `dir`.
 */
function leaning(straight: number, n: number, share: number, dir: 1 | -1 = 1): GameState {
  const g = newGame("hard");
  const base = g.blocks[0]!;
  for (let i = 0; i < straight; i++) g.blocks.push({ ...base });
  for (let i = 0; i < n; i++) {
    const below = g.blocks[g.blocks.length - 1]!;
    g.blocks.push({ x: below.x + (dir * share * (base.w / 2)) / (n - i), w: base.w });
  }
  expect(balanceFailure(g.blocks)).toBeNull();
  g.score = g.blocks.length - 1;
  g.slider = { x: top(g).x, w: top(g).w, dir: 1 };
  return g;
}

/** Small seeded PRNG (mulberry32) so the bot runs replay exactly. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** The camera at rest over the tower (where the climb eases to). */
const restingCamera = (g: GameState) => (g.blocks.length + 1) * BLOCK_HEIGHT;

/** Whether world x from `lo` to `hi` is on screen with the tower layer panned by `pan`. */
function inView(frame: Frame, pan: number, lo: number, hi: number): boolean {
  const eps = 1e-9;
  return lo >= MID + pan - frame.halfWidth - eps && hi <= MID + pan + frame.halfWidth + eps;
}

/** Drop with the slider `dx` right of the swaying top, the way main.ts feeds the view. */
function dropAt(g: GameState, view: View, dx: number): void {
  g.slider.x = top(g).x + swayOffset(g, g.blocks.length - 1) + dx;
  const r = drop(g);
  if (r?.kind === "toppled") addTopple(view, g, r.tip);
}

function run(g: GameState, view: View, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += DT) {
    step(g, DT);
    updateView(view, g, DT);
    each?.();
  }
}

describe("sway reach", () => {
  it("bounds the sway at that level for every phase of the wave and the kick", () => {
    const g = leaning(30, 0, 0);
    g.kick = 9;
    g.kickVel = -40;
    for (const level of [1, 5, 12, 30]) {
      const reach = swayReach(g, level);
      let most = 0;
      const s = structuredClone(g);
      for (let i = 0; i < 600; i++) {
        step(s, DT);
        most = Math.max(most, Math.abs(swayOffset(s, level)));
      }
      expect(most).toBeGreaterThan(0);
      // The kick spring is integrated in small steps, which can overshoot its exact amplitude a hair.
      expect(most).toBeLessThanOrEqual(reach * 1.01);
    }
  });
});

describe("Hard's sideways camera target", () => {
  it.each(PHONES)("keeps the top bar (wherever it sways) and most of the slider's run on screen at %ix%i", (w, h) => {
    let needed = 0;
    for (const n of [3, 6, 10]) {
      for (const share of [0.5, 0.85, 0.97]) {
        for (const dir of [1, -1] as const) {
          for (const kick of [0, 12, -25]) {
            const g = leaning(26, n, share, dir);
            g.kick = kick;
            g.swayAngle = 1.1;
            const frame = frameFor(w, h, restingCamera(g));
            const pan = panTarget(g, frame);
            const t = top(g);
            const reach = swayReach(g, g.blocks.length - 1);
            const c = t.x + t.w / 2;
            // The top bar at either end of its sway.
            expect(inView(frame, pan, t.x - reach, t.x + t.w + reach)).toBe(true);
            // At least two thirds of the slider, even at the ends of its run.
            expect(inView(frame, pan, c - SLIDE_RANGE - t.w / 6, c + SLIDE_RANGE + t.w / 6)).toBe(true);
            // Without the pan, the top would have left the screen.
            if (!inView(frame, 0, t.x - reach, t.x + t.w + reach)) needed++;
          }
        }
      }
    }
    expect(needed).toBeGreaterThan(20);
  });

  it("keeps the slider's whole run on screen where it fits (a wider screen)", () => {
    const g = leaning(26, 8, 0.9);
    const frame = frameFor(600, 800, restingCamera(g));
    const pan = panTarget(g, frame);
    const t = top(g);
    const c = t.x + t.w / 2;
    expect(inView(frame, pan, c - SLIDE_RANGE - t.w / 2, c + SLIDE_RANGE + t.w / 2)).toBe(true);
    expect(inView(frame, 0, c - SLIDE_RANGE - t.w / 2, c + SLIDE_RANGE + t.w / 2)).toBe(false);
  });

  it("follows the tower, not the sway: a tower that leaned then went straight up is centered", () => {
    const g = leaning(4, 6, 0.9);
    const leanTop = { ...top(g) };
    for (let i = 0; i < 40; i++) g.blocks.push({ ...leanTop });
    g.slider.w = leanTop.w;
    const [w, h] = PHONES[0];
    const frame = frameFor(w, h, restingCamera(g));
    const pan = panTarget(g, frame);
    expect(pan).toBeCloseTo(leanTop.x + leanTop.w / 2 - MID, 9);
    for (const angle of [0, 1, 2, 3, 4, 5]) {
      g.swayAngle = angle;
      expect(panTarget(g, frame)).toBe(pan);
    }
  });

  it("follows the bars on screen, the top ones most, within what keeps the slider on screen", () => {
    // A long lean: the bars further down sit left of the top, and pull the camera a little left.
    const g = leaning(26, 12, 0.9);
    const [w, h] = PHONES[1];
    const frame = frameFor(w, h, restingCamera(g));
    const pan = panTarget(g, frame);
    const t = top(g);
    const onTop = t.x + t.w / 2 - MID;
    expect(pan).toBeLessThan(onTop);
    expect(pan).toBeGreaterThan(onTop - t.w / 6 - 1e-9);
  });

  it.each(PHONES)("never jolts between drops: a bar leaving the screen or a kick dying down only glides it, at %ix%i", (w, h) => {
    // Seeded bots of mixed skill; the camera climbs, kicks die down, wants start and stop fitting.
    // The target may only change smoothly between drops (a drop may move it anywhere).
    let worst = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = mulberry(seed * 31 + w);
      const sigma = 1 + 7 * r();
      const bias = seed % 3 === 0 ? (r() < 0.5 ? -2 : 2) : 0;
      const g = newGame("hard");
      const view = newView();
      view.screen = { w, h };
      let aim = bias + gauss(r) * sigma;
      let last = NaN;
      for (let f = 0; f < 20000 && g.phase === "playing" && g.score < 80; f++) {
        step(g, DT);
        updateView(view, g, DT);
        const frame = frameFor(w, h, view.cameraY);
        const target = panTarget(g, frame) * frame.scale;
        if (!Number.isNaN(last)) worst = Math.max(worst, Math.abs(target - last));
        last = target;
        const t = top(g);
        if (Math.abs(g.slider.x - (t.x + swayOffset(g, g.blocks.length - 1) + aim)) <= sliderSpeed(g) * DT * 0.5) {
          drop(g);
          last = NaN;
          aim = Math.max(-40, Math.min(40, bias + gauss(r) * sigma));
        }
      }
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThan(8); // px per frame
  });

  it("Normal never pans", () => {
    for (const [w, h] of PHONES) {
      const g = leaning(26, 10, 0.95);
      g.mode = "normal";
      expect(panTarget(g, frameFor(w, h, restingCamera(g)))).toBe(0);
    }
    // A Normal run, sliced and swaying: the view's pan stays exactly 0.
    const g = newGame();
    const view = newView();
    view.screen = { w: 375, h: 667 };
    for (let i = 0; i < 60; i++) {
      dropAt(g, view, [0, 6, -9, 3][i % 4]!);
      run(g, view, 0.3, () => {
        expect(view.panX).toBe(0);
        expect(towerPan(view, g, frameFor(375, 667, view.cameraY))).toBe(0);
      });
    }
  });
});

describe("the pan fade", () => {
  it.each(PHONES)("is 0 while the base can be seen, then rises smoothly to 1 at %ix%i", (w, h) => {
    let last = 0;
    for (let cam = 0; cam < 600; cam += 0.5) {
      const frame = frameFor(w, h, cam);
      const fade = panFade(frame);
      // The base's top edge is at or above the bottom of the screen: no pan at all.
      if (frame.bottom <= BLOCK_HEIGHT) expect(fade).toBe(0);
      expect(Math.abs(fade - last)).toBeLessThan(0.05);
      last = fade;
    }
    expect(last).toBe(1);
    for (const f of [0, 0.25, 0.5, 1]) expect(panFade(frameFor(w, h, fadeCamera(w, h, f)))).toBeCloseTo(f, 9);
  });

  it("the tower is drawn exactly where it would be unpanned while the base is on screen", () => {
    const g = leaning(6, 6, 0.9);
    const frame = frameFor(375, 667, restingCamera(g));
    expect(frame.bottom).toBeLessThan(0);
    const panned = newView();
    panned.cameraY = restingCamera(g);
    panned.panX = 40;
    expect(towerPan(panned, g, frame)).toBe(0);
    const still = { ...panned, panX: 0 };
    expect(pixels(g, panned)).toEqual(pixels(g, still));
  });

  it("Normal is drawn the same whatever the view's pan says", () => {
    const g = leaning(30, 0, 0);
    g.mode = "normal";
    const view = newView();
    view.cameraY = restingCamera(g);
    expect(pixels(g, { ...view, panX: 35 })).toEqual(pixels(g, view));
  });
});

/** Render a frame at 375x667 (Classic) and return its pixels. */
function pixels(g: GameState, view: View): Uint8ClampedArray {
  const canvas = createCanvas(375, 667);
  const ctx = canvas.getContext("2d");
  render(ctx as unknown as CanvasRenderingContext2D, 375, 667, g, view, 0, SKINS[0]!);
  return ctx.getImageData(0, 0, 375, 667).data;
}

describe("Hard's sideways camera in play", () => {
  /** Straight to `straight` bars, then steps of `step` right until the tower tips. */
  function staircase(w: number, h: number, straight: number, stepX: number) {
    const g = newGame("hard");
    const view = newView();
    view.screen = { w, h };
    const drawn: number[] = [];
    const topOut: number[] = [];
    const watch = () => {
      const frame = frameFor(w, h, view.cameraY);
      const pan = towerPan(view, g, frame);
      drawn.push(pan * frame.scale);
      if (g.phase !== "playing") return;
      const t = top(g);
      const x = frame.offsetX + (t.x + swayOffset(g, g.blocks.length - 1) - pan) * frame.scale;
      topOut.push(Math.max(0, -x, x + t.w * frame.scale - w));
    };
    for (let i = 0; i < straight; i++) {
      dropAt(g, view, 0);
      run(g, view, 0.4, watch);
    }
    while (g.phase === "playing") {
      dropAt(g, view, stepX);
      run(g, view, 0.4, watch);
    }
    run(g, view, 1.5, watch);
    const steps = drawn.slice(1).map((p, i) => Math.abs(p - drawn[i]!));
    return { g, view, drawn, topOut, maxStep: Math.max(...steps) };
  }

  it.each(PHONES)("keeps a leaning tower's top on screen every frame, easing smoothly, at %ix%i", (w, h) => {
    const { drawn, topOut, maxStep } = staircase(w, h, 24, 3);
    expect(Math.max(...drawn.map(Math.abs))).toBeGreaterThan(40); // it did pan
    expect(Math.max(...topOut)).toBeLessThan(1);
    expect(maxStep).toBeLessThan(12); // px per frame: eased, never a jump
  });

  it.each(PHONES)(
    "a fall back down to the base lets go of the pan smoothly before the base shows at %ix%i",
    (w, h) => {
      const { g, view, drawn, maxStep } = staircase(w, h, 8, 3);
      // The staircase went over from low down, with the tower well panned: the camera had to come
      // back down to the base.
      expect(g.toppled!.level).toBeLessThan(12);
      expect(Math.abs(view.panAtTopple)).toBeGreaterThan(30);
      expect(maxStep).toBeLessThan(15);
      expect(drawn[drawn.length - 1]).toBe(0);
      expect(isToppling(view)).toBe(false);
      expect(panFade(frameFor(w, h, view.cameraY))).toBe(0);
    },
  );
});

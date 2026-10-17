import { createCanvas } from "@napi-rs/canvas";
import { afterEach, describe, expect, it } from "vitest";
import { BLOCK_HEIGHT, DROP_GAP, resetTuning, SLIDE_RANGE, WORLD_WIDTH } from "./config";
import { drop, newGame, sliderLift, sliderSpeed, step, swayOffset, top, type GameState, type Mode } from "./game";
import {
  frameFor,
  newZoom,
  panFade,
  panTarget,
  stepZoom,
  swayReach,
  VIEW_WIDTH,
  ZOOM_HOLD,
  ZOOM_MIN,
  zoomTarget,
  type Frame,
} from "./camera";
import { addFalling, addFlash, newView, render, towerPan, towerZoom, updateView, type View } from "./render";
import { SKINS } from "./skins";
import type { Scene, Skin } from "./skins/skin";
import { FRAME, topAtContact } from "./testing/bots";

afterEach(resetTuning);

const PHONES = [
  [375, 667],
  [390, 844],
] as const;
const DT = 1 / 60;
const MID = WORLD_WIDTH / 2;

/**
 * A leaning tower, built by hand (no mode builds one now: both slice): `straight` bars on the base,
 * then a lean of `n` full-width bars where bar k (from the bottom) hangs `share` of 1/(n - k) of
 * half a bar past the one below (harmonic stacking), toward `dir`. It is what the following camera
 * (View.follow, off in every run) was built for.
 */
function leaning(straight: number, n: number, share: number, dir: 1 | -1 = 1): GameState {
  const g = newGame();
  const base = g.blocks[0]!;
  for (let i = 0; i < straight; i++) g.blocks.push({ ...base });
  for (let i = 0; i < n; i++) {
    const below = g.blocks[g.blocks.length - 1]!;
    g.blocks.push({ x: below.x + (dir * share * (base.w / 2)) / (n - i), w: base.w });
  }
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

/** The camera at rest over a Slide tower (where the climb eases to). */
const restingCamera = (g: GameState) => (g.blocks.length + 1) * BLOCK_HEIGHT;

/** A view with the zoom and the sideways follow on (no run has them on), framing a `w` x `h` screen. */
function following(w: number, h: number): View {
  const view = newView();
  view.follow = true;
  view.screen = { w, h };
  return view;
}

/** Whether world x from `lo` to `hi` is on screen with the tower layer panned by `pan`. */
function inView(frame: Frame, pan: number, lo: number, hi: number): boolean {
  const eps = 1e-9;
  return lo >= MID + pan - frame.halfWidth - eps && hi <= MID + pan + frame.halfWidth + eps;
}

/** Drop (Slide) with the slider `dx` right of the swaying top. */
function dropAt(g: GameState, dx: number): void {
  g.slider.x = top(g).x + swayOffset(g, g.blocks.length - 1) + dx;
  drop(g);
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

describe("the sideways camera's target", () => {
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
            // As much of the slider as Slide shows (5/6), even at the ends of its run.
            expect(inView(frame, pan, c - SLIDE_RANGE - t.w / 3, c + SLIDE_RANGE + t.w / 3)).toBe(true);
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
    // A long lean: the bars further down sit left of the top, and pull the camera a little left, as
    // far as still shows as much of the slider at the ends of its run as Slide does.
    const g = leaning(26, 12, 0.9);
    const [w, h] = PHONES[1];
    const t = top(g);
    const onTop = t.x + t.w / 2 - MID;
    // On a phone at full zoom that takes the whole view: it centers on the top bar.
    expect(panTarget(g, frameFor(w, h, restingCamera(g)))).toBeCloseTo(onTop, 9);
    // Zoomed out a little, there is room to follow.
    const frame = frameFor(w, h, restingCamera(g), 0.85);
    const pan = panTarget(g, frame);
    expect(pan).toBeLessThan(onTop);
    expect(pan).toBeGreaterThan(onTop - (frame.halfWidth - VIEW_WIDTH / 2) - 1e-9);
  });

  it.each(PHONES)("never jolts between drops: a bar leaving the screen or a kick dying down only glides it, at %ix%i", (w, h) => {
    // Seeded bots of mixed skill; the camera climbs, kicks die down, wants start and stop fitting.
    // The target may only change smoothly between drops (a drop may move it anywhere).
    let worst = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = mulberry(seed * 31 + w);
      const sigma = 1 + 7 * r();
      const bias = seed % 3 === 0 ? (r() < 0.5 ? -2 : 2) : 0;
      const g = newGame();
      const view = following(w, h);
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
  });

  it("the tower is drawn exactly where it would be unpanned while the base is on screen", () => {
    const g = leaning(6, 6, 0.9);
    const frame = frameFor(375, 667, restingCamera(g));
    expect(frame.bottom).toBeLessThan(0);
    const panned = following(375, 667);
    panned.cameraY = restingCamera(g);
    panned.panX = 40;
    panned.fade = 1;
    expect(towerPan(panned, frame)).toBe(0);
    const still = { ...panned, panX: 0 };
    expect(differing(pixels(g, panned), pixels(g, still))).toBe(0);
  });

  it("a run's view (not following) is drawn the same whatever its pan says", () => {
    const g = leaning(30, 0, 0);
    const view = newView();
    view.cameraY = restingCamera(g);
    expect(differing(pixels(g, { ...view, panX: 35, fade: 1 }), pixels(g, view))).toBe(0);
  });
});

/** Render a frame at 375x667 (Classic) and return its pixels. */
function pixels(g: GameState, view: View): Uint8ClampedArray {
  const canvas = createCanvas(375, 667);
  const ctx = canvas.getContext("2d");
  render(ctx as unknown as CanvasRenderingContext2D, 375, 667, g, view, 0, SKINS[0]!);
  return ctx.getImageData(0, 0, 375, 667).data;
}

/** How many bytes two frames' pixels differ in (a plain loop: deep-equal on a million bytes is slow). */
function differing(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length) return Math.max(a.length, b.length);
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

describe("the zoom", () => {
  /** How far the top bar (as drawn, swaying) and the slider stick out past the screen's sides this frame, CSS px. */
  function outside(g: GameState, view: View, w: number, h: number) {
    const zoom = towerZoom(view);
    const frame = frameFor(w, h, view.cameraY, zoom);
    const pan = towerPan(view, frame);
    const px = frame.scale * zoom;
    const lo = MID + pan - frame.halfWidth;
    const hi = MID + pan + frame.halfWidth;
    const t = top(g);
    const x = t.x + swayOffset(g, g.blocks.length - 1);
    const s = g.slider;
    return {
      top: Math.max(0, lo - x, x + t.w - hi) * px,
      slider: Math.max(0, lo - s.x, s.x + s.w - hi) * px,
      /** The slider's width on screen, px. */
      sliderW: s.w * px,
      /** How far left the tower layer is drawn, screen px. */
      pan: pan * px,
    };
  }

  it("lays a zoomed frame out on a virtual screen 1/zoom as big, at the screen's own u and scale", () => {
    for (const [w, h] of PHONES) {
      for (const cam of [0, 120, 400]) {
        const one = frameFor(w, h, cam);
        expect(frameFor(w, h, cam, 1)).toEqual(one);
        expect([one.zoom, one.width, one.height]).toEqual([1, w, h]);
        const out = frameFor(w, h, cam, ZOOM_MIN);
        expect([out.u, out.scale]).toEqual([one.u, one.scale]);
        expect(out.width).toBeCloseTo(w / ZOOM_MIN, 9);
        expect(out.height).toBeCloseTo(h / ZOOM_MIN, 9);
        expect(out.halfWidth).toBeCloseTo(one.halfWidth / ZOOM_MIN, 9);
        // The camera's rules hold on the virtual screen: drawn shrunk by the zoom from the top left,
        // the camera (the tower top, once it climbs) stays where it was on the screen.
        expect(out.anchorPx * ZOOM_MIN).toBeCloseTo(one.anchorPx, 9);
        if (cam === 400) expect(out.cameraY).toBe(one.cameraY);
      }
    }
  });

  it.each(PHONES)("stays at 1 for a straight tower and zooms a short leaning one out just enough, at %ix%i", (w, h) => {
    const straight = leaning(14, 0, 0);
    straight.kick = 12;
    expect(zoomTarget(straight, w, h, restingCamera(straight), 1)).toEqual({ zoom: 1, urgent: false });
    for (const [n, share] of [
      [3, 0.4],
      [4, 0.5],
      [6, 0.6],
    ] as const) {
      // A short tower leaning right: its base is in view, so nothing may pan.
      const g = leaning(4, n, share);
      g.kick = 8;
      const cam = restingCamera(g);
      const aim = zoomTarget(g, w, h, cam, 1);
      expect(aim.urgent).toBe(true);
      expect(aim.zoom).toBeLessThan(0.85);
      expect(aim.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
      const frame = frameFor(w, h, cam, aim.zoom);
      expect(panFade(frame)).toBe(0);
      // There, the top bar at either end of its sway and the slider as far as Slide shows it fit...
      const t = top(g);
      const reach = swayReach(g, g.blocks.length - 1);
      const c = t.x + t.w / 2;
      expect(inView(frame, 0, t.x - reach, t.x + t.w + reach)).toBe(true);
      expect(inView(frame, 0, c - SLIDE_RANGE - t.w / 3, c + SLIDE_RANGE + t.w / 3)).toBe(true);
      // ...only just: a hair further in they wouldn't.
      expect(inView(frameFor(w, h, cam, aim.zoom + 0.003), 0, c - SLIDE_RANGE - t.w / 3, c + SLIDE_RANGE + t.w / 3)).toBe(false);
      // Already out there, it stays.
      expect(zoomTarget(g, w, h, cam, aim.zoom).zoom).toBeCloseTo(aim.zoom, 3);
    }
    // A lean too far for any zoom: it goes no further out than ZOOM_MIN.
    const far = leaning(2, 14, 0.95);
    expect(zoomTarget(far, w, h, restingCamera(far), 1)).toEqual({ zoom: ZOOM_MIN, urgent: true });
  });

  it("eases out briskly, holds, then eases back in gently, never overshooting or jolting", () => {
    const z = newZoom();
    const seen: number[] = [1];
    const out = { zoom: ZOOM_MIN, urgent: true };
    for (let t = 0; t < 2; t += DT) {
      stepZoom(z, out, DT);
      seen.push(z.zoom);
    }
    // It arrives (no endless creep).
    expect(z.zoom).toBe(ZOOM_MIN);
    // More than half the way out within a quarter second.
    expect(seen[Math.round(0.25 / DT)]! - ZOOM_MIN).toBeLessThan(0.5 * (1 - ZOOM_MIN));
    const settled = seen.length;
    // Room again: it holds for ZOOM_HOLD seconds, then eases all the way back in.
    const back = { zoom: 1, urgent: false };
    for (let t = 0; t < ZOOM_HOLD + 5; t += DT) {
      stepZoom(z, back, DT);
      seen.push(z.zoom);
    }
    expect(seen[settled + Math.floor(ZOOM_HOLD / DT) - 2]).toBe(ZOOM_MIN);
    expect(seen[seen.length - 1]).toBe(1);
    const steps = seen.slice(1).map((v, i) => v - seen[i]!);
    expect(Math.min(...seen)).toBe(ZOOM_MIN);
    // Even this whole swing (more than a drop ever asks for at once) moves it by at most 2% a frame.
    expect(Math.max(...steps.map(Math.abs))).toBeLessThan(0.021);
    // Starts and stops without a jolt: the speed changes a little from frame to frame.
    const accel = steps.slice(1).map((v, i) => Math.abs(v - steps[i]!));
    expect(Math.max(...accel)).toBeLessThan(0.006);
  });

  it.each(PHONES)("eases back in once the pan can take over: a lean low down, then straight up past the base, at %ix%i", (w, h) => {
    // Four bars straight up, then six stepping right (about 25 units in all).
    const g = leaning(4, 6, 0.34);
    const view = following(w, h);
    let topOut = 0;
    const settle = (seconds: number) =>
      run(g, view, seconds, () => {
        topOut = Math.max(topOut, outside(g, view, w, h).top);
      });
    settle(2);
    const leaned = view.zoom.zoom;
    expect(leaned).toBeLessThan(0.85);
    // Perfect drops straight up until the base is long gone.
    for (let i = 0; i < 30; i++) {
      dropAt(g, 0);
      settle(0.6);
    }
    expect(g.phase).toBe("playing");
    settle(3);
    const frame = frameFor(w, h, view.cameraY, view.zoom.zoom);
    expect(panFade(frame)).toBe(1);
    expect(view.zoom.zoom).toBeGreaterThan(0.97);
    expect(towerPan(view, frame)).toBeGreaterThan(15);
    expect(topOut).toBeLessThan(1);
  });

  it("draws the world and the tower zoomed, and the HUD and the PERFECT pop at the screen's own size", () => {
    const g = leaning(6, 4, 0.5);
    const view = following(375, 667);
    view.cameraY = restingCamera(g);
    addFlash(view, g.blocks.length - 1, 1);
    view.pops[0]!.age = 0.3; // bounced in
    const seen = (zoom: number) => {
      view.zoom = { ...newZoom(), zoom, goal: zoom };
      const canvas = createCanvas(375, 667);
      const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      let scene: Scene | undefined;
      let worldScale = NaN;
      const base = SKINS[0]!;
      const spy = {
        ...base,
        ground(c: CanvasRenderingContext2D, s: Scene) {
          scene = s;
          worldScale = c.getTransform().a;
        },
      } as Skin;
      const texts = new Map<string, { scale: number; font: string }>();
      /** Where each text is drawn across the screen, px. */
      const at = new Map<string, number>();
      const fill = ctx.fillText.bind(ctx);
      ctx.fillText = (t: string, x: number, y: number) => {
        texts.set(t, { scale: ctx.getTransform().a, font: ctx.font });
        at.set(t, ctx.getTransform().e + x);
        fill(t, x, y);
      };
      render(ctx, 375, 667, g, view, 0, spy);
      return { scene: scene!, worldScale, texts, at };
    };
    const one = seen(1);
    const out = seen(ZOOM_MIN);
    expect(one.worldScale).toBe(1);
    expect(out.worldScale).toBeCloseTo(ZOOM_MIN, 6);
    expect(out.scene.cssW).toBeCloseTo(375 / ZOOM_MIN, 9);
    expect(out.scene.cssH).toBeCloseTo(667 / ZOOM_MIN, 9);
    expect([out.scene.u, out.scene.scale]).toEqual([one.scene.u, one.scene.scale]);
    for (const t of [String(g.score), "PERFECT"]) {
      expect(out.texts.get(t)).toEqual(one.texts.get(t));
      expect(out.texts.get(t)!.scale).toBe(1);
    }
    // The pop rides its bar where the zoom draws it: over the bar's center on the screen.
    const level = g.blocks.length - 1;
    const b = g.blocks[level]!;
    for (const [zoom, drawn] of [
      [1, one],
      [ZOOM_MIN, out],
    ] as const) {
      const f = frameFor(375, 667, view.cameraY, zoom);
      const center = (f.offsetX + (b.x + b.w / 2 + swayOffset(g, level)) * f.scale) * zoom;
      expect(drawn.at.get("PERFECT")).toBeCloseTo(center, 6);
    }
    expect(Math.abs(out.at.get("PERFECT")! - one.at.get("PERFECT")!)).toBeGreaterThan(10);
  });

  it("a straight tower never zooms, whatever the phone's width (rounding in the view's width is no spill)", () => {
    const g = newGame();
    for (let w = 300; w <= 500; w++) {
      for (const h of [568, 667, 844, 932]) {
        if (w > h * 0.6) continue;
        expect(zoomTarget(g, w, h, restingCamera(g), 1)).toEqual({ zoom: 1, urgent: false });
      }
    }
  });

  it("lets falling bars go only once they are below the zoomed-out screen's bottom edge", () => {
    // A tower over at full zoom-out on a tall phone: the screen reaches further below the camera
    // than at zoom 1, and the bars falling off the top must fall all the way out of it.
    const [w, h] = PHONES[1];
    const g = leaning(30, 0, 0);
    g.phase = "over";
    const view = following(w, h);
    view.cameraY = restingCamera(g);
    view.zoom = { ...newZoom(), zoom: ZOOM_MIN, goal: ZOOM_MIN };
    for (let i = 0; i < 6; i++) addFalling(view, { x: 20 + 4 * i, w: 60 }, 30 - i, MID);
    let gone = 0;
    for (let t = 0; t < 8 && view.falling.length > 0; t += DT) {
      const frame = frameFor(w, h, view.cameraY, towerZoom(view));
      const before = view.falling;
      updateView(view, g, DT);
      for (const f of before) {
        if (view.falling.includes(f)) continue;
        gone++;
        // Its center was below the bottom edge by more than it can reach at any angle.
        expect(f.y + BLOCK_HEIGHT / 2 + f.w / 2 + BLOCK_HEIGHT).toBeLessThan(frame.bottom);
      }
    }
    expect(gone).toBe(6);
  });
});

describe("a run's camera", () => {
  it.each<Mode>(["normal", "hard"])("%s never zooms or pans: whatever the view says, nothing is drawn zoomed or panned", (mode) => {
    const [w, h] = PHONES[0];
    const g = newGame(mode);
    const view = newView();
    view.screen = { w, h };
    // Slices and perfects (each perfect wins the slice before it back), the sway kicked both ways.
    const offsets = [0, 4, 0, -4, 0, 0];
    for (let i = 0; i < 40; i++) {
      g.slider.x = topAtContact(g) + offsets[i % offsets.length]!;
      drop(g);
      run(g, view, 0.4, () => {
        expect(view.zoom.zoom).toBe(1);
        expect(view.panX).toBe(0);
        expect(towerZoom(view)).toBe(1);
        expect(towerPan(view, frameFor(w, h, view.cameraY))).toBe(0);
      });
    }
    expect(g.score).toBe(40);
    const still = newView();
    still.cameraY = view.cameraY;
    const told = { ...still, panX: 30, fade: 1, zoom: { ...newZoom(), zoom: ZOOM_MIN, goal: ZOOM_MIN } };
    expect(differing(pixels(g, told), pixels(g, still))).toBe(0);
  });

  it.each(PHONES)("frames Drop a bar higher: its raised slider shows where Slide's does, and the bar falls in view, at %ix%i", (w, h) => {
    const slide = newGame();
    const dropped = newGame("hard");
    const views = new Map<GameState, View>([
      [slide, newView()],
      [dropped, newView()],
    ]);
    for (let i = 0; i < 30; i++) {
      for (const [g, view] of views) {
        g.slider.x = topAtContact(g);
        drop(g);
        run(g, view, 0.5);
      }
    }
    for (const [g, view] of views) run(g, view, 2);
    expect([slide.score, dropped.score]).toEqual([30, 30]);
    const vs = views.get(slide)!;
    const vd = views.get(dropped)!;
    expect(vd.cameraY - vs.cameraY).toBeCloseTo(DROP_GAP, 3);
    /** Screen y of the top edge of the slider's bar, px. */
    const sliderTop = (g: GameState, view: View) => {
      const f = frameFor(w, h, view.cameraY);
      return f.anchorPx - ((g.blocks.length + 1) * BLOCK_HEIGHT + sliderLift(g) - f.cameraY) * f.scale;
    };
    expect(sliderTop(dropped, vd)).toBeCloseTo(sliderTop(slide, vs), 2);
    // A bar let go falls from there to the tower top, every frame of it on screen, under the HUD.
    dropped.slider.x = topAtContact(dropped);
    drop(dropped);
    const topY = frameFor(w, h, vd.cameraY).anchorPx;
    let frames = 0;
    for (;;) {
      step(dropped, FRAME);
      updateView(vd, dropped, FRAME);
      if (!dropped.fall) break; // landed: the next slider is up
      const y = sliderTop(dropped, vd);
      expect(y).toBeGreaterThan(h * 0.3);
      expect(y + BLOCK_HEIGHT * frameFor(w, h, vd.cameraY).scale).toBeLessThan(h);
      expect(y).toBeGreaterThanOrEqual(topY - 0.01);
      frames++;
    }
    expect(frames).toBeGreaterThan(10);
    expect(dropped.score).toBe(31);
  });
});

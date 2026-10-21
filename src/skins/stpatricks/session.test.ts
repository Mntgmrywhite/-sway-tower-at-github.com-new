import { afterEach, describe, expect, it, vi } from "vitest";
import { circle } from "../../base/draw";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import { bridge, castle, farmhouses, farSheep, floorTop, hooker, monastery } from "./far";
import { front } from "./front";
import { potAndLeprechaun } from "./gold";
import { cottage, rainbowArc, smoke, toadstool } from "./meadow";
import { flock } from "./pasture";
import { BARREL_X, FIRST_TOAST, GRAB, pose, RELEASE, session, SESSION_FOOT, TOAST, toastAt, toastStart } from "./session";
import { MOON_REACH, moonAt, sun } from "./sky";
import { context, mask, overlap, sceneAt, startScene, zoomedScene } from "./test-scene";
import { level, toneOf } from "./tone";
import { inkW, roundTower } from "./tower";

// The session outside (the owner: St. Patrick's may "feature some green brew"): a box player on
// a stool by a barrel with three pints of green brew on it, who raises his pint in a toast
// between tunes. It must fit on every screen it is seen on (both phones, a tablet, the zoomed-out
// view) with nothing cut off, never touch another prop at any moment (the toadstool beside it,
// the pot of gold and its leprechaun above it, the rainbow's foot, the round tower, the cottage
// and the flock, the wall in front and the leprechaun on its gatepost, the sun and the moon),
// never stand in the tower's column at any height, and leave the screen only by parallax, off
// its bottom with the ground, as the camera climbs. Everything about it follows from the
// scene's clock alone.

/** The screens: both phones, a tablet, and the zoomed-out view on both phones. */
const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [768, 1024, 1],
  [390, 844, 0.6],
  [375, 667, 0.6],
  [390, 844, 0.8],
] as const;

/** The start view on a screen (zoomed or not) at time `t`. */
function screenAt(W: number, H: number, z: number, t: number): Scene {
  return z === 1 ? startScene(W, H, t) : zoomedScene(W, H, z, 0, t);
}

/** Moments: the tune before the first toast, every tenth of a second through it, and a later toast. */
const TIMES: number[] = [];
for (let t = 0; t < 10; t += 0.1) TIMES.push(t);
for (let t = toastStart(1) - 0.5; t < toastStart(1) + TOAST + 0.5; t += 0.1) TIMES.push(t);

/** Everything else on the start view that the session must never touch, at any of the moments. */
type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
const OTHERS: [string, Draw][] = [
  ["sun", (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s)))],
  // The moon with its ring of dots, where it hangs at night.
  [
    "moon",
    (ctx, s) => {
      const m = moonAt(s);
      ctx.beginPath();
      circle(ctx, m.x, m.y, m.r * MOON_REACH);
      ctx.fill();
    },
  ],
  ["swallows", (ctx, s) => drifters(ctx, s, toneOf(s))],
  ["round tower and high cross", (ctx, s) => monastery(ctx, s, toneOf(s))],
  ["far sheep", (ctx, s) => farSheep(ctx, s, toneOf(s))],
  ["farmhouses", (ctx, s) => farmhouses(ctx, s, toneOf(s))],
  ["castle", (ctx, s) => castle(ctx, s, toneOf(s))],
  ["hooker", (ctx, s) => hooker(ctx, s, toneOf(s))],
  ["bridge", (ctx, s) => bridge(ctx, s, toneOf(s))],
  ["flock", flock],
  ["smoke", smoke],
  ["cottage", cottage],
  ["rainbow", rainbowArc],
  ["pot of gold and leprechaun", potAndLeprechaun],
  ["toadstool", toadstool],
  ["round tower base", roundTower],
  ["wall, gateposts and the leprechaun on the gatepost", front],
];

/** Where a drawing reaches over all the moments (each drawn at its own time, all into one mask). */
function union(s: Scene, draw: Draw, times: readonly number[]): Uint8Array {
  return mask(s.cssW, s.cssH, (ctx) => {
    for (const t of times) draw(ctx, { ...s, t });
  });
}

describe("st. patrick's session outside", () => {
  it.each(SCREENS)("%ix%i at zoom %s: fully on screen and never touching another prop, through a toast and the tune", (W0, H0, z) => {
    const s = screenAt(W0, H0, z, 0);
    const W = Math.floor(s.cssW);
    const H = Math.floor(s.cssH);
    const mine = union(s, session, TIMES);
    let drawn = 0;
    let edge = 0;
    let column = 0;
    let hud = 0;
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    const top = Math.round(H * 0.14 + s.u * 0.13);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!mine[y * Math.round(s.cssW) + x]) continue;
        drawn++;
        if (x <= 1 || x >= W - 2 || y <= 1 || y >= H - 2) edge++;
        if (y < floor && x >= x0 && x <= x1) column++;
        if (y < top) hud++;
      }
    }
    expect(drawn, "the session is drawn").toBeGreaterThan(s.u * s.u * 0.004);
    expect(edge, "pixels on a screen edge").toBe(0);
    expect(column, "pixels in the tower's column above its floor").toBe(0);
    expect(hud, "pixels in the HUD").toBe(0);
    for (const [name, draw] of OTHERS) {
      expect(overlap(mine, union(s, draw, TIMES)), `meets the ${name}`).toBe(0);
    }
  }, 120_000);

  it.each(SCREENS)("%ix%i at zoom %s: never in the tower's column at any height, and leaves only off the bottom, with the ground", (W0, H0, z) => {
    const at = (lvl: number, t: number) => (z === 1 ? sceneAt(W0, H0, lvl, t) : zoomedScene(W0, H0, z, lvl, t));
    const peak = toastStart(0) + (GRAB + RELEASE) / 2;
    let rise0 = NaN;
    let seen = 0;
    // On screen from the start (level 0), then...
    let last = -0.5;
    // With his pint up (his highest), where his top stood on the last frame he was drawn, and the ground then.
    let peakTop = -1;
    let peakGround = NaN;
    let gone = false;
    for (let lvl = 0; lvl <= 2000; lvl += 0.5) {
      for (const t of [0.3, peak]) {
        const s = at(lvl, t);
        // ...once the ground has taken him off the bottom he draws nothing at all, and never comes back.
        if (calls(s) === 0) {
          // He stops drawing only once all of him has gone below the bottom edge: had he been drawn
          // here, his top (moving with the ground) would be off the screen too. No popping out.
          if (t === peak && !gone) {
            gone = true;
            if (peakTop >= 0) expect(peakTop + (s.groundY - peakGround), `level ${lvl}: stops drawing while still on screen`).toBeGreaterThanOrEqual(s.cssH - 1);
          }
          continue;
        }
        expect(last, `level ${lvl}: on screen after leaving it (or not at the start)`).toBeGreaterThanOrEqual(lvl - 0.5);
        last = lvl;
        // While he is on screen, pixel by pixel: never in the tower's column, never cut by a side or the top.
        const W = Math.round(s.cssW);
        const H = Math.round(s.cssH);
        const m = mask(s.cssW, s.cssH, (ctx) => session(ctx, s));
        const x0 = Math.ceil(s.baseX - s.u * 0.05);
        const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
        let column = 0;
        let cut = 0;
        let top = -1;
        let where = "";
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const x = i % W;
          const y = Math.floor(i / W);
          if (top < 0) top = y;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (x <= 1 || x >= W - 2 || y <= 1) cut++;
          if ((column || cut) && !where) where = ` at (${x}, ${y})`;
        }
        expect(column, `level ${lvl}, t=${t}: pixels in the tower's column${where}`).toBe(0);
        expect(cut, `level ${lvl}, t=${t}: pixels cut by a side or the top${where}`).toBe(0);
        // With his pint up, its top stands as far above his ground line as at the start: he moves with the ground.
        if (t === peak) {
          peakTop = top;
          peakGround = s.groundY;
        }
        if (t === peak && top >= 0 && top < H - 2) {
          const rise = s.groundY + SESSION_FOOT * s.u - top;
          if (lvl === 0) rise0 = rise;
          seen++;
          // (Within a pixel: its top is a whole pixel row, its ground line is not.)
          expect(Math.abs(rise - rise0), `level ${lvl}: moves with the ground`).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(seen, "seen at the start of the climb").toBeGreaterThan(0);
    expect(gone, "goes off the bottom with his pint up").toBe(true);
    expect(last, "gone off the bottom early in the climb").toBeLessThan(60);
  }, 120_000);

  it("takes his pint up from its spot and sets it back on it: no jump as it leaves the barrel or comes back", () => {
    // The moment it changes hands it is drawn by him instead of by the barrel: it must stand in the
    // same place, untipped, so the picture's coverage is the same just before and just after.
    const s = startScene(390, 844, 0);
    const K = 4;
    const at = (t: number) => mask(s.cssW, s.cssH, (ctx) => session(ctx, { ...s, t }), K);
    for (const n of [0, 1, 2]) {
      for (const [k, what] of [
        [GRAB, "takes it up"],
        [RELEASE, "sets it down"],
      ] as const) {
        const t = toastStart(n) + k;
        expect(pose(t - 1e-4).holding, `toast ${n}: changes hands at ${what}`).not.toBe(pose(t + 1e-4).holding);
        const before = at(t - 1e-4);
        const after = at(t + 1e-4);
        let differ = 0;
        for (let i = 0; i < before.length; i++) differ += before[i]! ^ after[i]!;
        expect(differ, `toast ${n}: the pint jumps as he ${what}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("sets his pint back down exactly where it stood, and the barrel and its pints never move between toasts", () => {
    const s = startScene(390, 844, 0);
    const u = s.u;
    const cx = s.baseX + s.baseW / 2;
    // The barrel and the pints on it, short of its right edge, where his elbow comes close (his arm only reaches over them during a toast).
    const x = Math.floor(cx + (BARREL_X - 0.03) * u);
    const y = Math.floor(s.groundY + (SESSION_FOOT - 0.088) * u);
    const w = Math.floor(u * 0.05);
    const h = Math.ceil(u * 0.093);
    const barrel = (t: number) => {
      const ctx = context(s.cssW, s.cssH);
      session(ctx, { ...s, t });
      return ctx.getImageData(x, y, w, h).data;
    };
    const rest = barrel(0);
    const same = (t: number) => barrel(t).every((v, i) => v === rest[i]);
    for (const t of [1.7, 4.2, FIRST_TOAST - 0.01, FIRST_TOAST + TOAST + 0.2, toastStart(1) - 1, toastStart(1) + TOAST + 0.2, toastStart(3) + TOAST + 3]) {
      expect(same(t), `t=${t.toFixed(2)}: the barrel and pints as they were`).toBe(true);
    }
    // While his pint is up, one fewer stands on the barrel.
    expect(same(FIRST_TOAST + (GRAB + RELEASE) / 2), "his pint up off the barrel").toBe(false);
  });

  it("moves smoothly: no jumps in the tune, the reach, the raise or the bellows", () => {
    const FRAME = 1 / 60;
    let prev = { ...pose(0) };
    for (let t = FRAME; t < 200; t += FRAME) {
      const p = { ...pose(t) };
      const at = `t=${t.toFixed(2)}`;
      expect(Math.abs(p.playing - prev.playing), `${at}: the tune stops or starts at once`).toBeLessThan(0.08);
      expect(Math.abs(p.reach - prev.reach), `${at}: his hand jumps`).toBeLessThan(0.08);
      expect(Math.abs(p.raise - prev.raise), `${at}: his pint jumps`).toBeLessThan(0.08);
      expect(Math.abs(p.open - prev.open), `${at}: the bellows jump`).toBeLessThan(0.1);
      expect(Math.abs(p.beam - prev.beam), `${at}: his face jumps`).toBeLessThan(0.1);
      // He only takes the pint off the barrel with his hand on it, and only raises it while he holds it.
      if (p.holding !== prev.holding) expect(p.reach, `${at}: lets go or takes hold away from the barrel`).toBeGreaterThan(0.99);
      if (p.raise > 0) expect(p.holding, `${at}: raises an empty hand`).toBe(true);
      // He never plays with his hand off the keys.
      if (p.reach > 0.01) expect(p.playing, `${at}: plays one-handed`).toBeLessThan(0.5);
      prev = p;
    }
  });
});

describe("st. patrick's session is deterministic", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is the same picture at the same moment, whatever was drawn before, with no randomness or wall clock", () => {
    const random = vi.spyOn(Math, "random");
    const now = vi.spyOn(Date, "now");
    const s = startScene(390, 844, 0);
    const frame = (t: number) => {
      const ctx = context(s.cssW, s.cssH);
      session(ctx, { ...s, t });
      return ctx.getImageData(0, 0, s.cssW, s.cssH).data;
    };
    for (const t of [0.4, FIRST_TOAST + 1.6, toastStart(2) + 2.1, 777.7]) {
      const a = frame(t);
      frame(t + 3.3);
      frame(t * 0.37);
      const b = frame(t);
      expect(b.every((v, i) => v === a[i]), `t=${t}: drawn twice, differs`).toBe(true);
    }
    const first = Array.from({ length: 400 }, (_, i) => ({ ...pose(i * 0.731) }));
    const again = Array.from({ length: 400 }, (_, i) => ({ ...pose((399 - i) * 0.731) })).reverse();
    expect(again).toEqual(first);
    for (let t = 0; t < 600; t += 0.37) expect(toastAt(t)).toBe(toastAt(t));
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });
});

/** How many calls the session makes on a context for a scene: none at all once it is off screen. */
function calls(s: Scene): number {
  let n = 0;
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get: (_, key) => (key in target ? target[key as string] : () => void n++),
  }) as unknown as CanvasRenderingContext2D;
  session(ctx, s);
  return n;
}

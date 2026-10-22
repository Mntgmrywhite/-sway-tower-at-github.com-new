import { describe, expect, it } from "vitest";
import type { Ctx } from "../base/draw";
import { BLOCK_HEIGHT, DEFAULT_TUNING } from "../config";
import {
  barRect,
  barSway,
  CAMEO_BARS,
  CAMEO_BOB,
  CAMEO_LANE_K,
  cameo,
  cameoBounds,
  cameoLaneY,
  inside,
  ISLAND,
  paintCameo,
  placeCameo,
  toX,
  toY,
  type Box,
  type CameoFrame,
  type Pts,
} from "./cameo";
import { classic } from "./classic";
import { context, sceneAt as rendererScene } from "./classic/test-scene";
import { SKINS } from "./index";
import type { Scene, Skin } from "./skin";

// The cameo: Sky Islands' floating island with a 25-bar tower on it, placed in every skin's sky
// around level 50 and painted in that skin's style (src/skins/cameo.ts). Two parts:
//
// 1. Its shape and the default painter, checked on their own: exactly 25 bars standing one on
//    another on the plinth, the plinth on the cap, every part of the island attached, the painted
//    cameo one connected piece inside its box, at three sizes and both ways round.
// 2. Every skin that places it (PLACED). A skin's rebuild adds an entry with what the checks need:
//    where its cameo is in a scene, where its sun and moon are, and its painter. Then, on a tall
//    and a short phone and an iPad, and zoomed out: the whole cameo is on screen at level 50
//    (`level` to move it), and wherever it shows (levels 20 to 90, through its bob) it stays out
//    of the tower's column, off the sun and the moon, and clear of both sides of the screen; and
//    it is painted in the skin's own style, not the default look. A skin's own checks ride along.

/** The sun or the moon (its glow or halo included) where it shows: nothing may pass over it. */
interface Disc {
  name: string;
  x: number;
  y: number;
  r: number;
}

/** A skin that places the cameo in its sky. */
interface Placement {
  skin: Skin;
  /** Where the skin's cameo is in this scene (the frame its painter draws), or null where it draws none. */
  frame(s: Scene): CameoFrame | null;
  /** The sun and the moon wherever they show in this scene. */
  lights(s: Scene): readonly Disc[];
  /** Draws the skin's cameo alone, as the skin paints it in this scene. */
  paint(ctx: Ctx, s: Scene): void;
  /** The level at which it shows whole on every screen (default 50). */
  level?: number;
  /** The skin's scene at a level, time and zoom, if its test-scene differs from the renderer's camera. */
  sceneAt?(W: number, H: number, lvl: number, t: number, z: number): Scene;
  /** The skin's own checks, a test each. */
  checks?: Record<string, () => void>;
}

/** The skins that place the cameo. Each skin's rebuild adds itself here. */
const PLACED: Placement[] = [];

const SCREENS = [
  [390, 844],
  [375, 667],
  [834, 1194],
] as const;
/** The screens at full size, and zoomed out to the camera's furthest. */
const VIEWS = SCREENS.flatMap(([W, H]) => [
  [W, H, 1],
  [W, H, 0.6],
] as const);
/** Moments spread over the bob, the sway and the roots' swing. */
const TIMES = [0, 2.1, 5.3, 9.7, 13.9] as const;
/** How far round the cameo's box an outline and its anti-aliasing may reach, px. */
const PAD = 2;

function overlaps(a: Box, l: number, r: number): boolean {
  return a.r > l && a.l < r;
}

/** Does a box touch a disc? */
function touches(b: Box, d: Disc): boolean {
  const x = Math.max(b.l, Math.min(d.x, b.r));
  const y = Math.max(b.t, Math.min(d.y, b.b));
  return Math.hypot(x - d.x, y - d.y) < d.r;
}

/** The alpha of every pixel of a drawing, at `k` times the scene's size. */
function alphas(W: number, H: number, draw: (ctx: Ctx) => void, k = 2): Uint8ClampedArray {
  const ctx = context(W, H, k);
  draw(ctx);
  return ctx.getImageData(0, 0, Math.round(W * k), Math.round(H * k)).data;
}

// ---------------------------------------------------------------- the shape

describe("cameo shape", () => {
  const g = cameo();
  const { barH, barW, floor, capH, underTop, underHW } = ISLAND;
  /** Moments at which the tower stands straight, and leans furthest each way. */
  const SWAYS = [0, 0.25, 0.75].map((f) => f * DEFAULT_TUNING.swayPeriod);

  it("has a tower of exactly 25 bars, each standing on the one below, the base on the plinth", () => {
    expect(g.bars.length).toBe(CAMEO_BARS);
    expect(CAMEO_BARS).toBe(25);
    expect(g.bars[0]!.y + barH).toBeCloseTo(floor, 9);
    expect(g.bars[0]!.w).toBeCloseTo(barW, 9);
    for (let i = 1; i < g.bars.length; i++) {
      const b = g.bars[i]!;
      const under = g.bars[i - 1]!;
      expect(b.level).toBe(i);
      expect(b.y + b.h, `bar ${i} sits on bar ${i - 1}`).toBeCloseTo(under.y, 9);
      for (const t of SWAYS) {
        const l = Math.max(b.x + barSway(i, t), under.x + barSway(i - 1, t));
        const r = Math.min(b.x + b.w + barSway(i, t), under.x + under.w + barSway(i - 1, t));
        expect(r - l, `bar ${i} rests on bar ${i - 1} at t=${t}`).toBeGreaterThan(b.w * 0.8);
      }
    }
    // The base never sways: it stands square on the plinth.
    for (const t of SWAYS) expect(Math.abs(barSway(0, t))).toBe(0);
    expect(g.bars[0]!.x).toBeGreaterThanOrEqual(g.plinth.x);
    expect(g.bars[0]!.x + g.bars[0]!.w).toBeLessThanOrEqual(g.plinth.x + g.plinth.w);
  });

  it("reads like a played tower: it narrows a little, zigzags, and sways most at the top", () => {
    const top = g.bars[g.bars.length - 1]!;
    expect(top.w / barW).toBeGreaterThan(0.6);
    expect(top.w / barW).toBeLessThan(0.9);
    // Slices narrow it; perfects win a slice back, so a bar can step out past the one below.
    const steps = g.bars.slice(1).map((b, i) => b.w - g.bars[i]!.w);
    expect(steps.filter((d) => d < -1e-9).length, "sliced bars").toBeGreaterThan(8);
    expect(steps.filter((d) => d > 1e-9).length, "bars that won a slice back").toBeGreaterThan(3);
    const mids = g.bars.map((b) => b.x + b.w / 2);
    expect(Math.max(...mids) - Math.min(...mids), "it zigzags").toBeGreaterThan(barW * 0.05);
    expect(Math.abs(barSway(24, SWAYS[1]!))).toBeGreaterThan(Math.abs(barSway(12, SWAYS[1]!)));
    expect(Math.abs(barSway(24, SWAYS[1]!))).toBeGreaterThan(0.05);
  });

  it("stands the plinth on the cap, proud of the grass", () => {
    const p = g.plinth;
    expect(p.y).toBeLessThan(0);
    expect(p.y + p.h).toBeGreaterThan(0);
    for (const x of [p.x, p.x + p.w]) expect(inside(g.cap, x, p.y + p.h - 1e-6), "the plinth's foot is in the grass").toBe(true);
  });

  it("holds the island together: underside, strata, geode, roots, vines, tufts, daisies and tree", () => {
    for (const x of [-underHW * 0.999, 0, underHW * 0.999]) expect(inside(g.cap, x, underTop), "the underside hangs from under the cap").toBe(true);
    const near = (pts: Pts, x: number, y: number) => inside(pts, x, y) || pts.some(([px, py]) => Math.hypot(px - x, py - y) < 0.01) || edgeNear(pts, x, y, 0.006);
    for (const b of g.bands) {
      for (const pts of [b.below, b.body, b.lit, b.edge]) for (const [x, y] of pts) expect(near(g.underside, x, y), `band ${b.index} lies within the underside`).toBe(true);
    }
    for (const s of g.shards) for (const [x, y] of s.body) expect(inside(g.underside, x, y), "the geode is in the bedrock").toBe(true);
    for (const o of g.pebbles.shade) expect(inside(g.underside, o.x, o.y)).toBe(true);
    for (const r of g.roots) {
      expect(inside(g.underside, r.x, r.y), "a root grows out of the underside").toBe(true);
      if (r.fork) expect(r.fork.y).toBeGreaterThan(r.y);
    }
    for (const t of g.tufts) expect(inside(g.cap, (t[0]![0] + t[2]![0]) / 2, t[0]![1]), "a tuft stands in the grass").toBe(true);
    for (const d of g.daisies) expect(inside(g.cap, d.x, d.base), "a daisy's stem is planted").toBe(true);
    expect(g.tree.trunk.some(([x, y]) => inside(g.cap, x, y)), "the tree stands on the cap").toBe(true);
    expect(g.capLit.every(([x, y]) => near(g.cap, x, y))).toBe(true);
    expect(g.capTop.every(([x, y]) => near(g.cap, x, y))).toBe(true);
    // The spring leaves the underside's side and falls into its mist.
    const [mx, my] = g.spring.mouth;
    expect(edgeNear(g.underside, mx, my, 0.03) || inside(g.underside, mx, my), "the spring spills from the underside").toBe(true);
    const m = g.mist;
    expect(m.shape.some(([dx, dy, r]) => Math.hypot(m.x + dx * m.r - g.spring.x, m.y + dy * m.r - g.spring.foot) < r * m.r), "the mist takes in the fall's foot").toBe(true);
    expect(capH).toBeGreaterThan(0);
  });

  it("keeps everything inside its box", () => {
    const b = g.box;
    const all = [g.cap, g.underside, ...g.tufts, g.tree.trunk, ...g.shards.map((s) => s.body), ...g.bands.map((x) => x.below)];
    for (const pts of all) for (const [x, y] of pts) expect(x >= b.l && x <= b.r && y >= b.t && y <= b.b).toBe(true);
    // The tower's top is the box's top.
    expect(b.t).toBeCloseTo(g.bars[g.bars.length - 1]!.y, 9);
  });

  it("bobs gently, by its clock alone", () => {
    for (let t = 0; t < 20; t += 0.7) {
      const c = placeCameo(100, 200, 30, 1, t);
      expect(Math.abs(c.y - 200)).toBeLessThanOrEqual(CAMEO_BOB * 30 + 1e-9);
      expect(placeCameo(100, 200, 30, 1, t).y).toBe(c.y);
    }
  });

  it("holds a level's place on every screen in a lane", () => {
    for (const [W, H] of SCREENS) {
      const s = rendererScene(W, H, 50, 0);
      expect(cameoLaneY(s, 50, 0.3, 0.7)).toBeCloseTo(H * 0.3, 6);
      const higher = rendererScene(W, H, 60, 0);
      expect(cameoLaneY(higher, 50, 0.3, 0.7) - H * 0.3).toBeCloseTo(10 * BLOCK_HEIGHT * s.scale * 0.7, 6);
    }
  });
});

/** Is (x, y) within `d` of an edge of the outline? */
function edgeNear(pts: Pts, x: number, y: number, d: number): boolean {
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j]!;
    const [bx, by] = pts[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const L = dx * dx + dy * dy;
    const f = L > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    if (Math.hypot(ax + dx * f - x, ay + dy * f - y) < d) return true;
  }
  return false;
}

// ---------------------------------------------------------------- the default painter

describe("cameo default painter", () => {
  /** A phone lane's size on a short phone and a tall one (k = CAMEO_LANE_K u), and an iPad's. */
  const SIZES = [375 * CAMEO_LANE_K, 390 * CAMEO_LANE_K, 716 * CAMEO_LANE_K];
  const K = 2;

  it.each(SIZES.flatMap((k) => ([1, -1] as const).map((m) => [k, m] as const)))("at k=%s, m=%s: one piece, inside its box", (k, m) => {
    const g = cameo();
    const W = Math.ceil((g.box.r - g.box.l) * k + 40);
    const H = Math.ceil((g.box.b - g.box.t) * k + 40);
    const x = m > 0 ? 20 - g.box.l * k : 20 + g.box.r * k;
    for (const t of [0, 1.3, 3.5]) {
      const c = placeCameo(x, 20 - g.box.t * k, k, m, t);
      const a = alphas(W, H, (ctx) => paintCameo(ctx, c, classic.bars), K);
      const w = W * K;
      const h = H * K;
      const box = cameoBounds(c, PAD);
      const on = new Uint8Array(w * h);
      let n = 0;
      let outside = 0;
      for (let p = 0; p < on.length; p++) {
        if (a[p * 4 + 3]! <= 40) continue;
        on[p] = 1;
        n++;
        const px = (p % w) / K;
        const py = Math.floor(p / w) / K;
        if (px < box.l || px > box.r || py < box.t || py > box.b) outside++;
      }
      expect(outside, `t=${t}: pixels outside the box`).toBe(0);
      // Nothing detached: every painted pixel joins up with the rest (8-connected).
      const seen = new Uint8Array(on.length);
      const stack = [on.indexOf(1)];
      seen[stack[0]!] = 1;
      let reached = 0;
      while (stack.length) {
        const p = stack.pop()!;
        reached++;
        const px = p % w;
        const py = (p - px) / w;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const qx = px + dx;
            const qy = py + dy;
            if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
            const q = qy * w + qx;
            if (on[q] && !seen[q]) {
              seen[q] = 1;
              stack.push(q);
            }
          }
        }
      }
      expect(reached, `t=${t}: every part attached`).toBe(n);
    }
  });

  it.each(SIZES)("at k=%s: 25 bars in the skin's colors, in order, on the plinth on the cap", (k) => {
    const g = cameo();
    const W = Math.ceil((g.box.r - g.box.l) * k + 40);
    const H = Math.ceil((g.box.b - g.box.t) * k + 40);
    // At t = 0 the tower stands straight.
    const c = placeCameo(20 - g.box.l * k, 20 - g.box.t * k, k, 1, 0);
    const ctx = context(W, H, K);
    paintCameo(ctx, c, classic.bars);
    const data = ctx.getImageData(0, 0, W * K, H * K).data;
    const px = (x: number, y: number) => {
      const i = (Math.round(y * K) * W * K + Math.round(x * K)) * 4;
      return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!] as const;
    };
    const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    for (let i = 0; i < CAMEO_BARS; i++) {
      const r = barRect(c, i);
      const [R, G, B, A] = px(r.x + r.w / 2, r.y + r.h / 2);
      const want = hex(classic.bars[i % classic.bars.length]!.color);
      expect(A, `bar ${i} is there`).toBe(255);
      expect(Math.max(Math.abs(R - want[0]!), Math.abs(G - want[1]!), Math.abs(B - want[2]!)), `bar ${i}'s color`).toBeLessThan(6);
    }
    // Nothing above the top bar: there is no 26th.
    const top = barRect(c, CAMEO_BARS - 1);
    expect(px(top.x + top.w / 2, top.y - 3)[3]).toBe(0);
    // Solid from the base bar down through the plinth into the grass and the underside.
    const base = barRect(c, 0);
    for (let y = base.y + base.h / 2; y < toY(c, ISLAND.underTop + 0.2); y += 0.5) {
      expect(px(toX(c, 0), y)[3], `solid at y=${y.toFixed(1)}`).toBe(255);
    }
  });

  it("paints the same pixels at the same moment, and lives over time", () => {
    const k = 31;
    const draw = (t: number) => alphas(120, 240, (ctx) => paintCameo(ctx, placeCameo(50, 180, k, 1, t), classic.bars), 1);
    const once = (t: number) => {
      const ctx = context(120, 240);
      paintCameo(ctx, placeCameo(50, 180, k, 1, t), classic.bars);
      return ctx.getImageData(0, 0, 120, 240).data;
    };
    expect(once(4.2)).toEqual(once(4.2));
    expect(draw(0)).not.toEqual(draw(1.3));
  });
});

// ---------------------------------------------------------------- the skins that place it

describe("cameo placements", () => {
  it("lists real skins, once each", () => {
    const ids = PLACED.map((p) => p.skin.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(SKINS.some((s) => s.id === id), id).toBe(true);
  });
});

for (const p of PLACED) {
  const sceneOf = (W: number, H: number, lvl: number, t: number, z: number) => (p.sceneAt ?? rendererScene)(W, H, lvl, t, z);
  const at = p.level ?? 50;
  describe(`cameo in ${p.skin.id}`, () => {
    it.each(VIEWS)(`%ix%i at zoom %s: the whole cameo is in the sky at level ${at}`, (W, H, z) => {
      for (const t of TIMES) {
        const s = sceneOf(W, H, at, t, z);
        const c = p.frame(s);
        expect(c, `t=${t}: drawn`).not.toBeNull();
        const b = cameoBounds(c!, PAD);
        expect(b.l >= 0 && b.r <= s.cssW && b.t >= 0 && b.b <= s.cssH, `t=${t}: on screen`).toBe(true);
      }
    });

    it.each(VIEWS)("%ix%i at zoom %s: out of the tower's column, off the sun and moon, clear of the sides", (W, H, z) => {
      for (let lvl = 20; lvl <= 90; lvl++) {
        for (const t of TIMES) {
          const s = sceneOf(W, H, lvl, t, z);
          const c = p.frame(s);
          if (!c) continue;
          const b = cameoBounds(c, PAD);
          if (b.b < 0 || b.t > s.cssH) continue;
          const what = `level ${lvl}, t=${t}`;
          expect(overlaps(b, s.baseX - s.u * 0.05, s.baseX + s.baseW + s.u * 0.05), `${what}: in the tower's column`).toBe(false);
          expect(b.l >= 1 && b.r <= s.cssW - 1, `${what}: touches a side of the screen`).toBe(true);
          for (const d of p.lights(s)) expect(touches(b, d), `${what}: over ${d.name}`).toBe(false);
        }
      }
    });

    it("is painted in the skin's own style, all of it in the cameo's box", () => {
      const [W, H] = SCREENS[0];
      const s = sceneOf(W, H, at, 0, 1);
      const c = p.frame(s)!;
      const b = cameoBounds(c, PAD);
      const own = context(W, H, 1);
      p.paint(own, s);
      const mine = own.getImageData(0, 0, W, H).data;
      const def = context(W, H, 1);
      paintCameo(def, c, p.skin.bars);
      const theirs = def.getImageData(0, 0, W, H).data;
      let drawn = 0;
      let outside = 0;
      let differs = 0;
      for (let i = 0; i < W * H; i++) {
        if (mine[i * 4 + 3]! <= 40) continue;
        drawn++;
        const x = i % W;
        const y = Math.floor(i / W);
        if (x < b.l || x > b.r || y < b.t || y > b.b) outside++;
        const d = Math.max(...[0, 1, 2].map((j) => Math.abs(mine[i * 4 + j]! - theirs[i * 4 + j]!)));
        if (d > 24 || theirs[i * 4 + 3]! <= 40) differs++;
      }
      expect(outside, "pixels outside the cameo's box").toBe(0);
      expect(drawn, "the cameo is drawn").toBeGreaterThan((b.r - b.l) * (b.b - b.t) * 0.15);
      if (p.skin.id !== "classic") expect(differs / drawn, "painted its own way, not in the default look").toBeGreaterThan(0.25);
    });

    for (const [name, check] of Object.entries(p.checks ?? {})) it(name, check);
  });
}

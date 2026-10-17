import { describe, expect, it } from "vitest";
import { toyBlock } from "../toyblock";
import { TRAIN_FROM, TRAIN_TO, trainX, tunnelMouths } from "./far";
import { centerX, mouseRun, RUN_DOWN, windUpMouse } from "./fort";
import { footLift, GUARD_FEET, guards, GUARDS, MARCH, SOLDIER_H, stickRaise } from "./meadow";
import { context, masker, sceneAt, SIZES } from "./test-scene";

// The owner's rule for every skin: any action happens within the first 10 seconds of a tower's
// scene (the title's fresh tower, or a new run), as players soon climb past; then the scene
// settles into calm idle motion. Toy Kingdom's actions are the wind-up mouse running down in
// front of the fort and the little train's run out of one tunnel and into the other; the
// rocket's launch comes after them, at 10 s, by the owner's call (launch.test.ts). And the
// mouse's key is seated in its back: its stem comes out of the body, never floating above it.
// The fort's two toy soldiers march in place and drum from the start, forever (the owner: "The
// soldiers should march/drum in place as well").

/** Scene times across the run-down (the waddle's leans both ways) and at rest. */
const TIMES = [0, 0.17, 0.52, 1.3, 2.6, 4.4, 6.1, 7.9, 9.5, 14.2] as const;
/** Drawn at this many times the scene's size, so the stem's few pixels are counted well. */
const K = 3;

describe("toy kingdom wind-up mouse", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: the key's stem comes out of its back", (W, H, t) => {
    const s = sceneAt(W, H, 0, t);
    const draw = masker(W, H, K);
    const key = draw((ctx) => windUpMouse(ctx, s, "key"));
    const body = draw((ctx) => windUpMouse(ctx, s, "body"));
    const w = Math.round(W * K);
    let inside = 0;
    let shows = 0;
    for (let i = 0; i < key.length; i++) {
      if (!key[i]) continue;
      if (body[i]) inside++;
      else shows++;
    }
    const px = s.u * K;
    // The stem goes into the body (at least a stem's width deep), and the key stands out of it.
    expect(inside, "key pixels inside the body").toBeGreaterThan((px * 0.006) ** 2);
    expect(shows, "key pixels showing above the back").toBeGreaterThan((px * 0.014) ** 2);
    // And the key is one piece with the body: every key pixel joins the body through key or body
    // pixels (no gap between the stem and the back).
    const seen = new Uint8Array(key.length);
    const queue: number[] = [];
    for (let i = 0; i < body.length; i++) {
      if (body[i]) {
        seen[i] = 1;
        queue.push(i);
      }
    }
    while (queue.length) {
      const i = queue.pop()!;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= key.length || seen[j] || !key[j]) continue;
        seen[j] = 1;
        queue.push(j);
      }
    }
    let loose = 0;
    for (let i = 0; i < key.length; i++) if (key[i] && !seen[i]) loose++;
    expect(loose, "key pixels not joined to the body").toBe(0);
  });

  it("runs down within the first 10 s, then rests with its key turning slowly", () => {
    expect(RUN_DOWN).toBeLessThanOrEqual(10);
    const start = mouseRun(0);
    const end = mouseRun(RUN_DOWN);
    expect(start.scoot).toBe(0);
    expect(end.scoot, "how far it scoots (u)").toBeGreaterThan(0.03);
    // Off briskly: most of the way in the first half.
    expect(mouseRun(RUN_DOWN / 2).scoot).toBeGreaterThan(end.scoot * 0.6);
    // Never backwards, and no jump: each 1/60 s step is small.
    for (let t = 0; t < RUN_DOWN + 1; t += 1 / 60) {
      const a = mouseRun(t);
      const b = mouseRun(t + 1 / 60);
      expect(b.scoot).toBeGreaterThanOrEqual(a.scoot);
      expect(b.scoot - a.scoot).toBeLessThan(0.002);
      expect(Math.abs(b.rock - a.rock)).toBeLessThan(0.02);
    }
    // At rest: still, upright, its key turning slowly (much slower than freshly wound).
    for (let t = RUN_DOWN; t < 120; t += 0.37) {
      const m = mouseRun(t);
      expect(m.scoot).toBe(end.scoot);
      expect(Math.abs(m.rock)).toBe(0);
    }
    const idle = mouseRun(40).key - mouseRun(39).key;
    const fresh = mouseRun(1).key - mouseRun(0).key;
    expect(idle).toBeGreaterThan(0);
    expect(fresh).toBeGreaterThan(idle * 4);
  });
});

describe("toy kingdom train", () => {
  it("its first run starts with the scene and is back in a tunnel within 10 s", () => {
    for (let t = 0; t <= 8; t += 0.25) expect(Number.isNaN(trainX(t)), `t=${t}: on its run`).toBe(false);
    expect(Number.isNaN(trainX(9.6)), "in the tunnel by 9.6 s").toBe(true);
  });

  // The owner: "The train never makes it through the tunnels — it appears behind them." The whole
  // backdrop is drawn through the run and compared, around the railway, with a frame with the
  // train away in the tunnel: every pixel the train changes must be in tunnel A's dark opening,
  // on the open track between the portals, or in tunnel B's opening (never over a hill or a
  // portal's stonework, the arch's pillar beside the track included: it goes through the arches,
  // not in front of them); it starts unseen in the dark of A, is first seen in A's opening (it
  // comes out of the mouth, not from behind the portal), is seen in both openings on its way, and
  // its last pixels go into the dark of B's opening. Each pillar beside the track stays untouched
  // all the way (the train passes behind it).
  it.each(SIZES)("%ix%i: it comes out of one tunnel's mouth and goes into the other's", { timeout: 30_000 }, (W, H) => {
    const run = (TRAIN_TO - TRAIN_FROM) / (trainX(1) - trainX(0));
    const away = run + 1;
    const s0 = sceneAt(W, H, 0, away);
    const m = tunnelMouths(s0);
    const u = s0.u;
    const x0 = Math.floor(m.a0 - u * 0.05);
    const x1 = Math.ceil(m.b1 + u * 0.05);
    const y0 = Math.floor(m.top - u * 0.02);
    const y1 = Math.ceil(m.rail + u * 0.02);
    const box = (t: number): Uint8ClampedArray => {
      const ctx = context(W, H);
      toyBlock.ground!(ctx, sceneAt(W, H, 0, t));
      return ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    };
    const ref = box(away);
    const w = x1 - x0;
    // Nothing else moves around the railway while the train is away.
    const still = box(away + 2.3);
    for (let i = 0; i < ref.length; i++) expect(still[i], "the railway is still while the train is away").toBe(ref[i]);
    const zone = (x: number, y: number): "a" | "b" | "track" | "out" => {
      if (y < m.top - 1 || y > m.rail + 1) return "out";
      // A pixel counts for a zone if any of it is in that zone; the pillars between the openings
      // and the open track (a1..track0, track1..b0) belong to none.
      if (x >= Math.floor(m.a0) - 1 && x < Math.ceil(m.a1)) return "a";
      if (x >= Math.floor(m.b0) && x <= m.b1 + 1) return "b";
      if (x >= Math.floor(m.track0) && x < Math.ceil(m.track1)) return "track";
      return "out";
    };
    const seen = { a: 0, b: 0, track: 0, out: 0 };
    type Zones = typeof seen;
    let first: Zones | null = null;
    let last: Zones | null = null;
    // Moments when the train is seen both in an opening and on the track: half out of A, half into B.
    let straddleA = 0;
    let straddleB = 0;
    for (let t = 0; t <= run + 0.05; t += 0.1) {
      const now = box(t);
      const here = { a: 0, b: 0, track: 0, out: 0 };
      for (let i = 0; i < ref.length; i += 4) {
        const d = Math.max(Math.abs(now[i]! - ref[i]!), Math.abs(now[i + 1]! - ref[i + 1]!), Math.abs(now[i + 2]! - ref[i + 2]!));
        if (d <= 6) continue;
        const p = i / 4;
        here[zone(x0 + (p % w), y0 + Math.floor(p / w))]++;
      }
      const total = here.a + here.b + here.track + here.out;
      if (t === 0) expect(total, "at the start it is still in the dark of tunnel A").toBe(0);
      expect(here.out, `t=${t.toFixed(1)}: train pixels over a hill or a portal's stonework`).toBe(0);
      if (total > 0 && !first) first = here;
      if (total > 0) last = here;
      if (here.a > 0 && here.track > 0) straddleA++;
      if (here.b > 0 && here.track > 0) straddleB++;
      seen.a += here.a;
      seen.b += here.b;
      seen.track += here.track;
    }
    expect(first, "the train is seen").not.toBeNull();
    expect(first!.a, "first seen in tunnel A's opening").toBeGreaterThan(0);
    expect(first!.track + first!.b, "first seen only in tunnel A's opening").toBe(0);
    expect(last!.b, "last seen in tunnel B's opening").toBeGreaterThan(0);
    expect(last!.a + last!.track, "last seen only in tunnel B's opening").toBe(0);
    expect(seen.a, "seen coming out through tunnel A's mouth").toBeGreaterThan(u * u * 0.002);
    expect(seen.b, "seen going in through tunnel B's mouth").toBeGreaterThan(u * u * 0.002);
    expect(seen.track, "seen on the open track").toBeGreaterThan(u * u * 0.01);
    expect(straddleA, "seen half out of tunnel A, behind its arch's pillar").toBeGreaterThan(0);
    expect(straddleB, "seen half into tunnel B, behind its arch's pillar").toBeGreaterThan(0);
  });
});

describe("toy kingdom guards", () => {
  it("march in step from the start: each foot in turn, a drum stroke as each foot stamps", () => {
    // Lively from t = 0: in the first march both feet lift high, one after the other.
    let left = 0;
    let right = 0;
    for (let t = 0; t <= MARCH; t += MARCH / 200) {
      const l = footLift(t, -1);
      const r = footLift(t, 1);
      left = Math.max(left, l);
      right = Math.max(right, r);
      expect(Math.min(l, r), `t=${t.toFixed(3)}: both feet up`).toBe(0);
      // Periodic, so it goes on the same forever.
      expect(footLift(t + 7 * MARCH, -1)).toBeCloseTo(l, 9);
      expect(stickRaise(t + 7 * MARCH, 1)).toBeCloseTo(stickRaise(t, 1), 9);
    }
    expect(left).toBeGreaterThan(0.99);
    expect(right).toBeGreaterThan(0.99);
    // The left foot stamps at the middle of each march, the right at its end: the stick on that side
    // strikes the drum head then (raise 0), and is up between strokes.
    for (let n = 0; n < 4; n++) {
      expect(stickRaise((n + 0.5) * MARCH, -1)).toBeCloseTo(0, 6);
      expect(stickRaise((n + 1) * MARCH, 1)).toBeCloseTo(0, 6);
      expect(footLift((n + 0.5) * MARCH, -1)).toBeCloseTo(0, 6);
      expect(footLift((n + 1) * MARCH, 1)).toBeCloseTo(0, 6);
      expect(stickRaise((n + 0.75) * MARCH, 1)).toBe(1);
      expect(stickRaise((n + 0.25) * MARCH, -1)).toBe(1);
    }
    // No jumps: small steps frame to frame, except the stroke itself coming down hard.
    for (let t = 0; t < 3 * MARCH; t += 1 / 60) {
      expect(Math.abs(footLift(t + 1 / 60, -1) - footLift(t, -1))).toBeLessThan(0.12);
      expect(Math.abs(stickRaise(t + 1 / 60, 1) - stickRaise(t, 1))).toBeLessThan(0.5);
    }
  });

  /** Opaque pixels of the guards drawn alone at t (the soft shadow under them is left out). */
  function solid(W: number, H: number, t: number): { m: Uint8Array; feet: number; k: number; xs: number[] } {
    const s = sceneAt(W, H, 0, t);
    const ctx = context(W, H);
    guards(ctx, s);
    const data = ctx.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3]! > 160 ? 1 : 0;
    const k = SOLDIER_H * s.u;
    return { m, feet: s.groundY + GUARD_FEET * s.u, k, xs: GUARDS.map((g) => centerX(s) + g * s.u) };
  }

  /** The lowest opaque row in columns x0..x1 (px). */
  function lowest(m: Uint8Array, W: number, H: number, x0: number, x1: number): number {
    for (let y = H - 1; y >= 0; y--) for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) if (m[y * W + x]) return y;
    return -1;
  }

  /** Opaque pixels in a box (soldier heights from a soldier's center line and its feet). */
  function count(g: ReturnType<typeof solid>, W: number, x: number, ax: number, bx: number, ay: number, by: number): number {
    let n = 0;
    for (let y = Math.ceil(g.feet - by * g.k); y <= Math.floor(g.feet - ay * g.k); y++) {
      for (let px = Math.ceil(x + ax * g.k); px <= Math.floor(x + bx * g.k); px++) n += g.m[y * W + px]!;
    }
    return n;
  }

  it.each(SIZES)("%ix%i: both soldiers lift their knees in turn and beat their drums, in place", (W, H) => {
    // A quarter march in, the left feet are up and the right ones down; three quarters in, the other way.
    for (const [t, up] of [
      [MARCH * 0.25, -1],
      [MARCH * 2.75, 1],
    ] as const) {
      const g = solid(W, H, t);
      for (const x of g.xs) {
        const upLeg = up < 0 ? [x - 0.15 * g.k, x - 0.03 * g.k] : [x + 0.03 * g.k, x + 0.15 * g.k];
        const downLeg = up < 0 ? [x + 0.03 * g.k, x + 0.15 * g.k] : [x - 0.15 * g.k, x - 0.03 * g.k];
        expect(lowest(g.m, W, H, upLeg[0]!, upLeg[1]!), `t=${t}: the lifted boot is off the meadow`).toBeLessThan(g.feet - 0.1 * g.k);
        expect(lowest(g.m, W, H, downLeg[0]!, downLeg[1]!), `t=${t}: the other boot is on it`).toBeGreaterThan(g.feet - 0.02 * g.k);
      }
    }
    // Beside each hat, up between strokes: the bass drummer's mallet and the snare drummer's two
    // sticks; on the stroke they are down at the drum and nothing is there.
    const up = solid(W, H, MARCH * 3.75);
    const upL = solid(W, H, MARCH * 3.25);
    const down = solid(W, H, MARCH * 4);
    const downL = solid(W, H, MARCH * 4.5);
    const [bassX, snareX] = up.xs as [number, number];
    expect(count(up, W, bassX, 0.19, 0.36, 0.78, 1.02), "the mallet up beside the hat").toBeGreaterThan(up.k * up.k * 0.004);
    expect(count(down, W, bassX, 0.19, 0.36, 0.78, 1.02), "the mallet down on the drum").toBe(0);
    expect(count(up, W, snareX, 0.19, 0.36, 0.78, 1.02), "the right stick up").toBeGreaterThan(up.k * up.k * 0.004);
    expect(count(down, W, snareX, 0.19, 0.36, 0.78, 1.02), "the right stick down on the drum").toBe(0);
    expect(count(upL, W, snareX, -0.36, -0.19, 0.78, 1.02), "the left stick up").toBeGreaterThan(up.k * up.k * 0.004);
    expect(count(downL, W, snareX, -0.36, -0.19, 0.78, 1.02), "the left stick down on the drum").toBe(0);
    // In place: over many marches every pixel stays within a soldier's reach of its post.
    for (let t = 0; t < 12 * MARCH; t += MARCH / 16 + 0.0137) {
      const g = solid(W, H, t);
      for (let i = 0; i < g.m.length; i++) {
        if (!g.m[i]) continue;
        const x = i % W;
        const y = Math.floor(i / W);
        const near = g.xs.some((gx) => Math.abs(x - gx) <= 0.4 * g.k);
        expect(near && y <= g.feet + 1 && y >= g.feet - 1.3 * g.k, `t=${t.toFixed(2)}: a pixel at ${x}, ${y} away from the guards' posts`).toBe(true);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { trainX } from "./far";
import { mouseRun, RUN_DOWN, windUpMouse } from "./fort";
import { masker, sceneAt, SIZES } from "./test-scene";

// The owner's rule for every skin: any action happens within the first 10 seconds of a tower's
// scene (the title's fresh tower, or a new run), as players soon climb past; then the scene
// settles into calm idle motion. Toy Kingdom's actions are the wind-up mouse running down in
// front of the fort and the little train's run between its tunnels; the rocket's launch comes
// after them, at 10 s, by the owner's call (launch.test.ts). And the mouse's key is seated in its
// back: its stem comes out of the body, never floating above it.

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
});

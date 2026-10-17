import { describe, expect, it } from "vitest";
import { RAINBOW } from "./colors";
import { BACK_X, GLIMMER_HW, glimmerGlow, PEEK, plan, POT_REACH, POT_X, potAndLeprechaun, SET_DOWN, SET_OFF, SETTLED, WATCH, watch } from "./gold";
import { BOW_FOOT, BOW_X, rainbowArc } from "./meadow";
import { context, mask, overlap, sceneAt, SIZES } from "./test-scene";
import { inkW, roundTower } from "./tower";

// The rainbow and the leprechaun's pot of gold. In the first seconds of a tower the rainbow
// sweeps into a round arch over bare grass, and he lugs his pot out from behind the round tower
// and sets it down at its right foot; from then on he keeps watch behind it, peeking out round
// it and over it, and the pot never leaves again. Nothing jumps from one frame to the next, he
// comes into sight and goes out of it only behind the round tower's drum or the pot (sliding
// out bit by bit, never popping up over the gold), the glimmer at the rainbow's end never
// twinkles on the pot, and he never comes above the tower's floor line or near the screen's edge.

const FRAME = 1 / 60;

function count(m: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i]!;
  return n;
}

describe("st. patrick's leprechaun", () => {
  it("brings the pot to the rainbow's end in the first seconds, and never takes it away again", () => {
    // At the start the rainbow's end is bare grass, and he and his pot are out of sight.
    for (let t = 0; t < SET_OFF; t += FRAME) {
      expect(plan(t).potShown, `t=${t.toFixed(2)}`).toBe(false);
      expect(plan(t).shown, `t=${t.toFixed(2)}`).toBe(false);
    }
    // He sets it down and slips behind it well within the first seconds.
    expect(SET_OFF).toBeLessThan(2);
    expect(SETTLED).toBeLessThanOrEqual(6);
    // From then on the pot stays put at the rainbow's foot, for as long as any run lasts.
    for (let t = SET_DOWN; t < 3600; t += 0.37) {
      const p = plan(t);
      expect(p.potShown, `t=${t.toFixed(2)}`).toBe(true);
      expect(p.potX, `t=${t.toFixed(2)}`).toBe(POT_X);
      expect(p.potLift, `t=${t.toFixed(2)}`).toBe(0);
    }
  });

  it("keeps watch: a couple of peeks every watch, the first soon after he settles, in all four ways", () => {
    expect(watch(0).at0).toBeLessThanOrEqual(1);
    const kinds = new Set<number>();
    for (let n = 0; n < 40; n++) {
      const w = { ...watch(n) };
      expect(w.kind1, `watch ${n}: two different peeks`).not.toBe(w.kind0);
      expect(w.at0 + PEEK, `watch ${n}: the peeks overlap`).toBeLessThan(w.at1);
      expect(w.at1 + PEEK, `watch ${n}: runs into the next`).toBeLessThan(WATCH);
      kinds.add(w.kind0).add(w.kind1);
    }
    expect(kinds.size).toBe(4);
  });

  it("moves smoothly, and only comes into sight or goes out of it behind the pot or the round tower", () => {
    let prev = { ...plan(0) };
    let peeks = 0;
    for (let t = FRAME; t < SETTLED + WATCH * 12; t += FRAME) {
      const p = { ...plan(t) };
      if (p.potShown && prev.potShown) {
        expect(Math.abs(p.potX - prev.potX), `t=${t.toFixed(2)}: the pot jumps`).toBeLessThan(0.006);
        expect(Math.abs(p.potLift - prev.potLift), `t=${t.toFixed(2)}: the pot jumps`).toBeLessThan(0.004);
      }
      if (p.shown && prev.shown && p.headOut === 0 && prev.headOut === 0) {
        expect(Math.abs(p.x - prev.x), `t=${t.toFixed(2)}: he jumps`).toBeLessThan(0.006);
        expect(Math.abs(p.crouch - prev.crouch), `t=${t.toFixed(2)}: he jumps`).toBeLessThan(0.1);
        expect(Math.abs(p.lean - prev.lean), `t=${t.toFixed(2)}: he jerks upright`).toBeLessThan(0.02);
      }
      if (p.shown && prev.shown && p.headOut > 0 && prev.headOut > 0) expect(p.m, `t=${t.toFixed(2)}: he switches sides`).toBe(prev.m);
      if (p.shown !== prev.shown) {
        const q = p.shown ? p : prev;
        const behindPot = (q.headOut > 0 && q.headOut < 0.05) || (q.headOut === 0 && q.crouch > 0.9);
        const behindTower = Math.abs(q.x - BACK_X) < 0.003;
        expect(behindPot || behindTower, `t=${t.toFixed(2)}: he pops in or out of sight`).toBe(true);
        if (p.shown && t > SETTLED) peeks++;
      }
      // The pot comes out once, in his hands behind the tower, and never goes.
      if (!prev.potShown && p.potShown) expect(p.shown && Math.abs(p.x - BACK_X) < 0.003, `t=${t.toFixed(2)}: the pot appears`).toBe(true);
      expect(prev.potShown && !p.potShown, `t=${t.toFixed(2)}: the pot vanishes`).toBe(false);
      prev = p;
    }
    expect(peeks, "he peeks out again and again").toBeGreaterThanOrEqual(20);
  });

  it.each(SIZES)("%ix%i: comes out from behind the round tower, keeps below its floor line and in from the edges", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0);
    const drum = mask(W, H, (ctx) => roundTower(ctx, s0));
    const margin = Math.ceil(s0.u * 0.012);
    // Left of the rainbow's end (where the tuft of grass and the glimmer are, in sight all along).
    const away = s0.cssW / 2 + (POT_X - 0.06) * s0.u;
    let behind = 0;
    let open = 0;
    const times: number[] = [];
    for (let t = 0; t < SETTLED + 0.5; t += 1 / 30) times.push(t);
    for (let t = SETTLED + 0.5; t < SETTLED + WATCH * 6; t += 0.1) times.push(t);
    for (const t of times) {
      const s = { ...s0, t };
      const p = plan(t);
      const m = mask(W, H, (ctx) => potAndLeprechaun(ctx, s));
      let edge = 0;
      let high = 0;
      let seen = 0;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        const x = i % W;
        const y = Math.floor(i / W);
        if (x < margin || x >= W - margin) edge++;
        if (y < s.groundY) high++;
        if (!drum[i] && x < away) seen++;
      }
      expect(edge, `t=${t.toFixed(2)}: near the screen's edge`).toBe(0);
      expect(high, `t=${t.toFixed(2)}: above the tower's floor line`).toBe(0);
      // Right where he comes out, all of him and the pot is still behind the drum.
      if (p.shown && Math.abs(p.x - BACK_X) < 0.004) {
        behind++;
        expect(seen, `t=${t.toFixed(2)}: in sight at the tower`).toBe(0);
      }
      if (p.shown && p.potX - BACK_X > 0.15 && p.potX < POT_X - 0.05) {
        open++;
        expect(seen, `t=${t.toFixed(2)}: he and the pot are out on the meadow`).toBeGreaterThan(s.u * s.u * 0.003);
      }
    }
    expect(behind, "he starts out behind the tower").toBeGreaterThan(3);
    expect(open, "and carries the pot across the meadow").toBeGreaterThan(10);
  }, 60_000);

  it.each(SIZES)("%ix%i: slides into sight round the pot and back out of it, nothing popping up over the gold", (W, H) => {
    // Every frame he comes out from behind the pot or goes back behind it, the picture barely
    // changes: at most a sliver of hat at the heap's shoulder as he starts to rise.
    const s0 = sceneAt(W, H, 0, 0);
    const draw = (t: number) => {
      const ctx = context(W, H);
      potAndLeprechaun(ctx, { ...s0, t });
      return ctx.getImageData(0, 0, W, H).data;
    };
    let flips = 0;
    let prev = plan(SETTLED - 0.5).shown;
    for (let t = SETTLED - 0.5 + FRAME; t < SETTLED + WATCH * 8; t += FRAME) {
      const shown = plan(t).shown;
      if (shown === prev) continue;
      prev = shown;
      flips++;
      const a = draw(t - FRAME);
      const b = draw(t);
      let changed = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) + Math.abs(a[i + 3]! - b[i + 3]!) > 60) changed++;
      expect(changed, `t=${t.toFixed(2)}: he pops ${shown ? "into" : "out of"} sight`).toBeLessThan(s0.u * s0.u * 0.00006);
    }
    expect(flips, "peeks in and out").toBeGreaterThan(20);
  }, 60_000);

  it.each(SIZES)("%ix%i: the glimmer at the rainbow's end is gone before the pot gets to it", (W, H) => {
    // The pot and his hands round its rim reach no further right than POT_REACH (measured while
    // it is well clear of the tuft at the rainbow's end).
    const s0 = sceneAt(W, H, 0, 0);
    const cx = s0.cssW / 2;
    const clear = cx + (POT_X - 0.06) * s0.u;
    let measured = 0;
    for (let t = SET_OFF; t < SET_DOWN; t += 0.05) {
      const p = plan(t);
      if (cx + (p.potX + POT_REACH) * s0.u > clear) continue;
      const m = mask(W, H, (ctx) => potAndLeprechaun(ctx, { ...s0, t }));
      let right = 0;
      for (let i = 0; i < m.length; i++) if (m[i] && i % W < clear) right = Math.max(right, i % W);
      expect(right, `t=${t.toFixed(2)}: reaches past POT_REACH`).toBeLessThanOrEqual(cx + (plan(t).potX + POT_REACH) * s0.u + 1);
      measured++;
    }
    expect(measured).toBeGreaterThan(10);
    // It glimmers on the bare grass after the rainbow touches down, and is gone by the time the pot comes near.
    let bright = 0;
    for (let t = 0; t < SETTLED + 1; t += FRAME) {
      const p = plan(t);
      if (p.potShown && p.potX + POT_REACH > POT_X - GLIMMER_HW) expect(glimmerGlow(t), `t=${t.toFixed(2)}: glimmers on the pot`).toBeLessThan(0.01);
      if (glimmerGlow(t) > 0.95) bright++;
    }
    expect(bright * FRAME, "glimmers a while").toBeGreaterThan(0.8);
  }, 60_000);
});

describe("st. patrick's rainbow", () => {
  it.each(SIZES)("%ix%i: sweeps into a round arch in the first seconds, then stands still", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0);
    const at = (t: number) => mask(W, H, (ctx) => rainbowArc(ctx, { ...s0, t }));
    expect(count(at(0)), "bare at the start").toBe(0);
    // It grows, frame by frame, and is whole by 2.5 s.
    let prev = 0;
    for (let t = 0.05; t < 2.5; t += 0.05) {
      const n = count(at(t));
      expect(n, `t=${t.toFixed(2)}: shrinks`).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    const whole = at(2.5);
    for (const t of [3, 7.7, 41, 600]) expect(overlap(whole, at(t)), `t=${t}: changes`).toBe(count(whole));
    expect(count(at(600))).toBe(count(whole));

    // Both feet stand on the same ground line, a gap between them; its top is round and halfway between them.
    const foot = Math.floor(s0.groundY + BOW_FOOT * s0.u) - 1;
    const runs: [number, number][] = [];
    for (let x = 0; x < W; x++) {
      if (!whole[foot * W + x]) continue;
      if (runs.length && runs[runs.length - 1]![1] === x - 1) runs[runs.length - 1]![1] = x;
      else runs.push([x, x]);
    }
    expect(runs.length, "two feet on the ground").toBe(2);
    const [left, right] = runs as [[number, number], [number, number]];
    expect(left[1] - left[0], "feet as wide as each other").toBeCloseTo(right[1] - right[0], -1);
    expect(right[0] - left[1], "an opening between the feet").toBeGreaterThan(s0.u * 0.08);
    let top = -1;
    for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (whole[y * W + x]) top = y;
    let x0: number = W;
    let x1 = 0;
    for (let x = 0; x < W; x++) {
      if (!whole[top * W + x]) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
    const mid = (left[0] + right[1]) / 2;
    expect(Math.abs((x0 + x1) / 2 - mid), "top halfway between the feet").toBeLessThan(2);
    expect(foot - top, "an arch taller than half its width").toBeGreaterThan((right[1] - left[0]) * 0.6);
    expect((x0 + x1) / 2, "standing where it was placed").toBeCloseTo(s0.cssW / 2 + BOW_X * s0.u, -1);

    // Its bands in order, red outside to violet inside, read down through its top.
    const ctx = context(W, H);
    rainbowArc(ctx, { ...s0, t: 3 });
    const column = ctx.getImageData(Math.round(mid), 0, 1, H).data;
    const seen: number[] = [];
    for (let y = top; y < foot; y++) {
      const c = [column[y * 4]!, column[y * 4 + 1]!, column[y * 4 + 2]!];
      const band = RAINBOW.findIndex((hex) => [1, 3, 5].every((k, j) => Math.abs(parseInt(hex.slice(k, k + 2), 16) - c[j]!) < 8));
      if (band >= 0 && seen[seen.length - 1] !== band) seen.push(band);
    }
    expect(seen).toEqual(RAINBOW.map((_, i) => i));

    // Clear of the round tower's drum (both feet show), of the tower's column above its floor, and of the screen's edges.
    expect(overlap(whole, mask(W, H, (ctx) => roundTower(ctx, s0))), "behind the round tower").toBe(0);
    const c1 = Math.floor(s0.baseX + s0.baseW + s0.u * 0.05);
    const floor = s0.groundY - Math.ceil(inkW(s0) / 2) - 1;
    for (let i = 0; i < whole.length; i++) {
      if (!whole[i]) continue;
      const x = i % W;
      const y = Math.floor(i / W);
      if (y < floor) expect(x, `(${x}, ${y}) in the tower's column`).toBeGreaterThan(c1);
      expect(x, "at the screen's edge").toBeLessThan(W - s0.u * 0.02);
    }
  }, 60_000);

  it.each(SIZES)("%ix%i: its right foot ends in the pot of gold once he sets it down", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0);
    const bow = mask(W, H, (ctx) => rainbowArc(ctx, { ...s0, t: SETTLED }));
    const foot = s0.groundY + BOW_FOOT * s0.u;
    const cx = s0.cssW / 2 + BOW_X * s0.u;
    for (const t of [SET_DOWN, SETTLED, SETTLED + 3, SETTLED + 30]) {
      const pot = mask(W, H, (ctx) => potAndLeprechaun(ctx, { ...s0, t }));
      let bare = 0;
      let hidden = 0;
      for (let i = 0; i < bow.length; i++) {
        if (!bow[i]) continue;
        const x = i % W;
        const y = Math.floor(i / W);
        if (x < cx || y < foot - s0.u * 0.025) continue;
        if (pot[i]) hidden++;
        else bare++;
      }
      expect(bare, `t=${t.toFixed(1)}: the foot shows under the pot`).toBe(0);
      expect(hidden, `t=${t.toFixed(1)}: the foot behind the pot`).toBeGreaterThan(s0.u * 0.2);
    }
  }, 60_000);
});

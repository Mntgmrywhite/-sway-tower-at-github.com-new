import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { HAT, SHAMROCK } from "./colors";
import { front, leftPost } from "./front";
import { atRest, FIRST_AT, FIRST_VISIT, FULL_RISE, GRIN_VISIT, LOOK_VISIT, lookout, PEEK_RISE, PEEK_VISIT, SLOT, visitAt, visitLength } from "./lookout";
import { context, SIZES, startScene } from "./test-scene";
import { inkW, roundTower } from "./tower";

// The leprechaun on the gatepost (the owner: "an additional leprechaun that sometimes peeks up
// with the hat on his head that is on the fence"). The tiny hat on the left gatepost is his: now
// and then he rises from behind the post with it on his head, looks about, grins or winks, and
// ducks back down, the hat settling on the post exactly as before. His first visit comes in a
// tower's first seconds, the rest every so often with varied timing. He stays behind the wall
// (only what rises over the post's top shows), clear of "tap to drop", the HUD, the screen's
// edges and the tower above its floor line, and there is only ever the one hat.

const FRAME = 1 / 60;

/** Every visit that starts before `until` (s): its kind and start. */
function visits(until: number): { kind: number; at: number }[] {
  const out: { kind: number; at: number }[] = [];
  let prev = -1;
  for (let t = 0; t < until; t += 0.05) {
    const v = visitAt(t);
    if (v && v.at !== prev) {
      out.push({ kind: v.kind, at: v.at });
      prev = v.at;
    }
  }
  return out;
}

describe("st. patrick's leprechaun on the gatepost", () => {
  it("comes up for the first time in the first seconds: watches the gold go by, grins and winks at you, and ducks", () => {
    expect(visitAt(0), "down at the start").toBeNull();
    expect(FIRST_AT).toBeLessThanOrEqual(3);
    let up = -1;
    let full = -1;
    let right = false;
    let winked = false;
    let grinned = false;
    let down = -1;
    for (let t = 0; t < 10; t += FRAME) {
      const p = lookout(t);
      if (up < 0 && p.rise >= PEEK_RISE * 0.99) up = t;
      if (full < 0 && p.rise >= FULL_RISE * 0.99) full = t;
      if (p.rise > PEEK_RISE * 0.9 && p.turn > 0.4 && p.lookX > 0) right = true;
      if (p.wink && p.turn === 0 && p.rise >= FULL_RISE * 0.99) winked = true;
      if (p.grin > 0.9) grinned = true;
      if (full > 0 && down < 0 && atRest(p)) down = t;
    }
    expect(up, "his eyes come over the post").toBeGreaterThan(0);
    expect(up, "his eyes come over the post").toBeLessThan(3);
    expect(full, "up with his whole face").toBeLessThan(5);
    expect(right, "looks over at the leprechaun with his pot").toBe(true);
    expect(grinned, "grins").toBe(true);
    expect(winked, "winks at you").toBe(true);
    expect(down, "back down, the hat on the post").toBeGreaterThan(0);
    expect(down, "back down, the hat on the post").toBeLessThan(7);
  });

  it("comes up again every so often, at varied times, in different ways", () => {
    const all = visits(1800);
    expect(all[0], "the first visit").toEqual({ kind: FIRST_VISIT, at: FIRST_AT });
    expect(all.length, "visits in half an hour").toBeGreaterThan(90);
    const kinds = new Set(all.slice(1).map((v) => v.kind));
    expect([...kinds].sort()).toEqual([PEEK_VISIT, LOOK_VISIT, GRIN_VISIT].sort());
    const gaps: number[] = [];
    for (let i = 1; i < all.length; i++) {
      const gap = all[i]!.at - all[i - 1]!.at;
      // Never on top of each other, and a breather of a few seconds between them...
      expect(all[i - 1]!.at + visitLength(all[i - 1]!.kind) + 3, `visit ${i}: too soon after the last`).toBeLessThan(all[i]!.at);
      // ...and never gone for long.
      expect(gap, `visit ${i}: a long wait`).toBeLessThan(SLOT * 3);
      gaps.push(gap);
    }
    expect(Math.max(...gaps) - Math.min(...gaps), "the waits vary").toBeGreaterThan(10);
    // The second visit comes within half a minute of the first.
    expect(all[1]!.at).toBeLessThan(30);
  });

  it("moves smoothly, and is at rest between visits", () => {
    let prev = { ...lookout(0) };
    for (let t = FRAME; t < 400; t += FRAME) {
      const p = { ...lookout(t) };
      const at = `t=${t.toFixed(2)}`;
      expect(Math.abs(p.rise - prev.rise), `${at}: he jumps up or down`).toBeLessThan(0.0026);
      expect(Math.abs(p.tilt - prev.tilt), `${at}: his head jerks`).toBeLessThan(0.01);
      expect(Math.abs(p.turn - prev.turn), `${at}: his face jumps`).toBeLessThan(0.07);
      expect(Math.abs(p.lookX - prev.lookX) + Math.abs(p.lookY - prev.lookY), `${at}: his eyes jump`).toBeLessThan(0.0004);
      expect(Math.abs(p.hands - prev.hands), `${at}: his hands jump`).toBeLessThan(0.08);
      expect(Math.abs(p.hop - prev.hop), `${at}: the hat jumps`).toBeLessThan(0.001);
      // Fully down whenever no visit is under way: the hat sits on the post as it always did.
      if (!visitAt(t)) expect(atRest(p), `${at}: not at rest between visits`).toBe(true);
      // He only blinks or winks while his eyes are up over the post.
      if (p.blink || p.wink) expect(p.rise, `${at}: shuts his eyes behind the post`).toBeGreaterThan(PEEK_RISE * 0.9);
      prev = p;
    }
  });
});

/** The front drawn alone at time `t` of a start scene. */
function frontAt(s: Scene, t: number): Uint8ClampedArray {
  const ctx = context(s.cssW, s.cssH);
  front(ctx, { ...s, t });
  return ctx.getImageData(0, 0, s.cssW, s.cssH).data;
}

/** Pixels that differ between two frames (any channel, alpha included, by more than `d`). */
function differ(a: Uint8ClampedArray, b: Uint8ClampedArray, d = 8): Uint8Array {
  const out = new Uint8Array(a.length / 4);
  for (let i = 0; i < out.length; i++) {
    const k = i * 4;
    if (Math.max(Math.abs(a[k]! - b[k]!), Math.abs(a[k + 1]! - b[k + 1]!), Math.abs(a[k + 2]! - b[k + 2]!), Math.abs(a[k + 3]! - b[k + 3]!)) > d) out[i] = 1;
  }
  return out;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Pixels of a frame within `d` of any of `colors`. */
function colored(data: Uint8ClampedArray, colors: string[], d = 18): Uint8Array {
  const cs = colors.map(rgb);
  const out = new Uint8Array(data.length / 4);
  for (let i = 0; i < out.length; i++) {
    const k = i * 4;
    if (data[k + 3]! < 200) continue;
    if (cs.some(([r, g, b]) => Math.abs(data[k]! - r) + Math.abs(data[k + 1]! - g) + Math.abs(data[k + 2]! - b) < d)) out[i] = 1;
  }
  return out;
}

const HAT_COLORS = [HAT.body, HAT.light, HAT.shade];

describe("st. patrick's leprechaun on the gatepost, on screen", () => {
  // Moments through his first visit and two later ones (every pose he takes), on both phones.
  const later = visits(80).slice(1, 4);
  const TIMES: number[] = [];
  for (const v of [{ kind: FIRST_VISIT, at: FIRST_AT }, ...later]) {
    for (let k = 0.04; k < visitLength(v.kind); k += 0.09) TIMES.push(v.at + k);
  }

  it.each(SIZES)("%ix%i: only what rises over the post's top shows, clear of the start line, the HUD, the edges and the tower", (W, H) => {
    const s = startScene(W, H, 0);
    const u = s.u;
    const rest = frontAt(s, 0);
    const post = leftPost(s);
    const lw = inkW(s);
    // The lowest the hat reached at rest (its brim and the brim's ink), and how far either side of the post the brim and a tipped head reach.
    const below = post.top + u * 0.006 + lw;
    const reach = u * 0.034;
    // "tap to drop" (render.ts: centered at 0.9 of the height, 0.055 u type, about 0.29 u wide, with its outline).
    const line = W / 2 - u * 0.155;
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    let shown = 0;
    let tallest = Infinity;
    for (const t of TIMES) {
      const p = lookout(t);
      const d = differ(frontAt(s, t), rest);
      for (let i = 0; i < d.length; i++) {
        if (!d[i]) continue;
        const x = i % W;
        const y = Math.floor(i / W);
        shown++;
        tallest = Math.min(tallest, y);
        const at = `t=${t.toFixed(2)} (${x}, ${y})`;
        expect(y, `${at}: shows below the post's top`).toBeLessThanOrEqual(below);
        expect(Math.abs(x - post.x), `${at}: off the post`).toBeLessThanOrEqual(reach);
        expect(x, `${at}: over "tap to drop"`).toBeLessThan(line);
        expect(y, `${at}: in the HUD`).toBeGreaterThan(hud);
        expect(y, `${at}: above the tower's floor line`).toBeGreaterThan(s.groundY);
        expect(x > 2 && x < W - 3, `${at}: at a screen edge`).toBe(true);
      }
      if (p.rise === 0) expect(d.every((v) => v === 0), `t=${t.toFixed(2)}`).toBe(true);
    }
    expect(shown, "he shows").toBeGreaterThan(1000);
    // Up with his whole face, the hat rides high over the post.
    expect(post.top - tallest, "how high the hat rises").toBeGreaterThan(u * 0.06);
  }, 60_000);

  it.each(SIZES)("%ix%i: comes up in sight bit by bit from behind the post, never popping up", (W, H) => {
    const s = startScene(W, H, 0);
    const rest = frontAt(s, 0);
    // Through the start of his first visit, frame by frame: what shows grows a little at a time.
    let prev = 0;
    for (let t = FIRST_AT; t < FIRST_AT + 0.6; t += FRAME) {
      const d = differ(frontAt(s, t), rest);
      let n = 0;
      for (let i = 0; i < d.length; i++) n += d[i]!;
      expect(n - prev, `t=${t.toFixed(3)}: pixels coming into sight at once`).toBeLessThan(s.u * 0.6);
      prev = n;
    }
  }, 60_000);

  it.each(SIZES)("%ix%i: there is only the one hat: it leaves the post as he rises and sits on it again after", (W, H) => {
    const s = startScene(W, H, 0);
    const u = s.u;
    const post = leftPost(s);
    const restFrame = frontAt(s, 0);
    const restHat = colored(restFrame, HAT_COLORS);
    let restCount = 0;
    for (let i = 0; i < restHat.length; i++) restCount += restHat[i]!;
    expect(restCount, "the hat on the post").toBeGreaterThan(u * u * 0.0008);
    // Right up, the hat is up on his head: none of it is left on the post, and it is all there.
    const t = FIRST_AT + 2.2;
    expect(lookout(t).rise).toBeCloseTo(FULL_RISE, 6);
    const up = colored(frontAt(s, t), HAT_COLORS);
    let upCount = 0;
    let onPost = 0;
    for (let i = 0; i < up.length; i++) {
      if (!up[i]) continue;
      upCount++;
      const x = i % s.cssW;
      const y = Math.floor(i / s.cssW);
      if (y > post.top - u * 0.012 && Math.abs(x - post.x) < u * 0.03) onPost++;
    }
    expect(onPost, "hat left on the post").toBe(0);
    expect(Math.abs(upCount - restCount) / restCount, "the hat on his head is the same hat").toBeLessThan(0.08);
    // And after the visit, exactly as before.
    const after = frontAt(s, FIRST_AT + visitLength(FIRST_VISIT) + 0.01);
    expect(differ(after, restFrame, 0).every((v) => v === 0), "the hat back on the post exactly").toBe(true);
  });

  it.each(SIZES)("%ix%i: rises in front of the round tower's mound but never over a shamrock on it", (W, H) => {
    const s = startScene(W, H, 0);
    const ctx = context(W, H);
    roundTower(ctx, s);
    const tower = ctx.getImageData(0, 0, W, H).data;
    const leaves = colored(tower, [SHAMROCK], 12);
    // A shamrock's ink rim reaches past its leaves.
    const near = Math.ceil(inkW(s) * 2.5);
    const rest = frontAt(s, 0);
    let moundMet = 0;
    for (const t of [FIRST_AT + 2.2, FIRST_AT + 3.15]) {
      const d = differ(frontAt(s, t), rest);
      for (let i = 0; i < d.length; i++) {
        if (!d[i]) continue;
        if (tower[i * 4 + 3]! > 40) moundMet++;
        const x = i % W;
        const y = Math.floor(i / W);
        for (let dy = -near; dy <= near; dy++) {
          for (let dx = -near; dx <= near; dx++) {
            const j = (y + dy) * W + x + dx;
            if (leaves[j]) expect(false, `t=${t}: over a shamrock at (${x}, ${y})`).toBe(true);
          }
        }
      }
    }
    expect(moundMet, "the hat passes in front of the mound's edge").toBeGreaterThan(0);
  });
});

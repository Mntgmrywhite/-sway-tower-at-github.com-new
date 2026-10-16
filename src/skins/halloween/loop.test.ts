import { describe, expect, it } from "vitest";
import { mix } from "../../base/draw";
import { kitFor } from "../../base/style";
import { BLOCK_HEIGHT } from "../../config";
import { halloween } from "../halloween";
import { PALETTE } from "./common";
import { bankBox, BANKS, fogBanks } from "./fog";
import { riderAt } from "./hollow";
import { crowSpot, CROWS, RING_COUNT, ringSpot } from "./sky";
import { column, context, mask, meets, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";
import { LOOP_PERIOD, LOOP_START, STEP, toneOf, toneOfLevel, type Tone } from "./tone";

// The height story loops: the first pass as first drawn, then night, mist, witching hour and
// night again, every LOOP_PERIOD levels from LOOP_START, forever, with no seam. The loop's own
// things (the fog banks, the bats round the moon) keep to the side lanes over whole loops, and
// any height renders, within the frame budget.

/** How far apart two tones are: the biggest change in any color channel or (scaled) number. */
function distance(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    const xs = Array.isArray(x) ? x : [x];
    const ys = Array.isArray(y) ? y : [y];
    xs.forEach((v, i) => {
      const w = ys[i]!;
      if (typeof v === "number" && typeof w === "number") d = Math.max(d, Math.abs(v - w) * (key === "moonR" ? 2000 : 60));
      else if (typeof v === "string" && typeof w === "string") {
        const cv = v.match(/[\d.]+/g) ?? [];
        if (v.startsWith("#")) {
          for (let k = 1; k < 7; k += 2) d = Math.max(d, Math.abs(parseInt(v.slice(k, k + 2), 16) - parseInt(w.slice(k, k + 2), 16)));
        } else {
          const cw = w.match(/[\d.]+/g) ?? [];
          cv.forEach((n, k) => (d = Math.max(d, Math.abs(Number(n) - Number(cw[k])) * (k === 3 ? 255 : 1))));
        }
      }
    });
  }
  return d;
}

describe("halloween height story", () => {
  it("keeps the first pass as first drawn: the base world's dusk deepening to night by level 75", () => {
    for (let lvl = 0; lvl <= 110; lvl += STEP) {
      const a = Math.min(1, (lvl * BLOCK_HEIGHT) / 600);
      const tone = toneOfLevel(lvl);
      expect(tone.sky).toEqual([
        mix(PALETTE.skyTop, "#151640", a * 0.5),
        mix(PALETTE.skyMid, "#151640", a * 0.4),
        mix(PALETTE.skyBottom, "#151640", a * 0.3),
      ]);
      expect(tone.crows).toBe(3 + Math.floor(a * 2.99));
      expect(tone.bats).toBe(a > 0.35 ? 1 : 0);
      expect(tone.moonR).toBeCloseTo(0.125 + a * 0.02, 9);
      expect(tone.ring + tone.veil + tone.extraStars).toBe(0);
    }
    // The hollow is all there through the night, then fades into the mist before the loop.
    expect(toneOfLevel(75).hollow).toBe(1);
    expect(toneOfLevel(LOOP_START - 1).hollow).toBe(0);
  });

  it("repeats exactly every loop, forever", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + 3 * LOOP_PERIOD; lvl += 0.37) {
      expect(toneOfLevel(lvl + LOOP_PERIOD), `level ${lvl}`).toEqual(toneOfLevel(lvl));
      expect(toneOfLevel(lvl + 11 * LOOP_PERIOD), `level ${lvl}`).toEqual(toneOfLevel(lvl));
    }
  });

  it("goes through the mist and the witching hour each time round", () => {
    const seen = { veil: 0, ring: 0, orange: false, noBats: false };
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += STEP) {
      const t = toneOfLevel(lvl);
      seen.veil = Math.max(seen.veil, t.veil);
      seen.ring = Math.max(seen.ring, t.ring);
      seen.orange ||= t.moon !== PALETTE.moon && parseInt(t.moon.slice(5, 7), 16) < 0x80;
      seen.noBats ||= t.bats === 0;
      // The crossing bats roost before the ring of bats comes out round the moon.
      expect(t.ring > 0.01 && t.bats > 0.01, `level ${lvl}: both kinds of bats`).toBe(false);
    }
    expect(seen).toEqual({ veil: 1, ring: 1, orange: true, noBats: true });
  });

  it("has no seam: across the loop's start and end it changes no faster than anywhere else", () => {
    // The largest step inside the loop, away from its ends (where everything eases).
    let most = 0;
    for (let lvl = LOOP_START + STEP; lvl + 2 * STEP < LOOP_START + LOOP_PERIOD; lvl += STEP) {
      most = Math.max(most, distance(toneOfLevel(lvl), toneOfLevel(lvl + STEP)));
    }
    expect(most, "the loop changes at all").toBeGreaterThan(1);
    for (const at of [LOOP_START, LOOP_START + LOOP_PERIOD, LOOP_START + 5 * LOOP_PERIOD]) {
      expect(distance(toneOfLevel(at - STEP), toneOfLevel(at)), `into level ${at}`).toBeLessThanOrEqual(most);
      expect(distance(toneOfLevel(at), toneOfLevel(at + STEP)), `out of level ${at}`).toBeLessThanOrEqual(most);
    }
    // And the end of the loop is its start again.
    expect(distance(toneOfLevel(LOOP_START + LOOP_PERIOD - STEP), toneOfLevel(LOOP_START))).toBeLessThan(2);
  });

  it("paints the same sky either side of the loop's start", () => {
    const [W, H] = SIZES[0];
    const kit = kitFor(halloween);
    const frame = (lvl: number) => {
      const ctx = context(W, H);
      kit.world(ctx, sceneAt(W, H, lvl - 1, 4.2));
      return ctx.getImageData(0, 0, W, Math.round(H * 0.6)).data;
    };
    const a = frame(LOOP_START - 0.05);
    const b = frame(LOOP_START);
    let sum = 0;
    for (let i = 0; i < a.length; i += 4) sum += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
    expect(sum / (a.length / 4) / 3, "mean change per channel").toBeLessThan(1);
  });

  it("leaves the hollow and the Horseman below for good", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 7) {
      expect(riderAt(sceneAt(390, 844, lvl, lvl * 0.31)).vis).toBe(0);
    }
  });
});

describe("halloween loop lanes", () => {
  const ZOOMS = [1, MIN_ZOOM] as const;

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the bats round the moon keep to the lane left of the tower, over two loops",
    (W, H, z) => {
      for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 0.5) {
        const s = sceneAt(W, H, lvl - 1, lvl * 0.53, z);
        if (toneOf(s).ring <= 0.01) continue;
        const col = column(s);
        const flock: { x0: number; y0: number; x1: number; y1: number }[] = [];
        for (let i = 0; i < Math.min(CROWS.length, Math.ceil(toneOf(s).crows - 0.01)); i++) {
          const c = crowSpot(s, i);
          flock.push({ x0: c.x - c.s, x1: c.x + c.s, y0: c.y - c.s * 0.72, y1: c.y + c.s * 0.64 });
        }
        for (let i = 0; i < RING_COUNT; i++) {
          const b = ringSpot(s, i);
          const box = { x0: b.x - b.s, x1: b.x + b.s, y0: b.y - b.s * 0.46, y1: b.y + b.s * 0.46 };
          expect(box.x0 > 0 && box.x1 < col.x0, `level ${lvl}: bat ${i} out of its lane`).toBe(true);
          expect(box.y0 > s.cssH * 0.32 && box.y1 < s.cssH, `level ${lvl}: bat ${i} in the HUD or off the bottom`).toBe(true);
          for (const f of flock) expect(meets(box, f), `level ${lvl}: bat ${i} over the flock`).toBe(false);
        }
      }
    },
  );

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the fog banks keep to the side lanes, whole, over two loops",
    (W, H, z) => {
      let seen = 0;
      for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 2) {
        const s = sceneAt(W, H, lvl - 1, 1, z);
        const w = Math.round(s.cssW);
        const h = Math.round(s.cssH);
        const m = mask(s.cssW, s.cssH, (ctx) => fogBanks(ctx, s));
        const col = column(s);
        let column0 = 0;
        let sides = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!m[y * w + x]) continue;
            seen++;
            if (x >= col.x0 && x <= col.x1) column0++;
            if (x === 0 || x === w - 1) sides++;
          }
        }
        expect(column0, `level ${lvl}: fog in the tower's column`).toBe(0);
        expect(sides, `level ${lvl}: fog cut off by a side`).toBe(0);
      }
      expect(seen, "the mist's banks are drawn").toBeGreaterThan(1000);
    },
  );

  it("each loop's banks are where the last loop's were, a loop higher", () => {
    const s = sceneAt(390, 844, LOOP_START + 30, 0);
    for (let i = 0; i < BANKS.length; i++) {
      const a = { ...bankBox(s, 0, i) };
      const up = sceneAt(390, 844, LOOP_START + 30 + LOOP_PERIOD, 0);
      expect(bankBox(up, 1, i).y0).toBeCloseTo(a.y0, 6);
      expect(bankBox(up, 1, i).x0).toBeCloseTo(a.x0, 6);
    }
  });
});

describe("halloween at any height", () => {
  it.each(SIZES)("%ix%i: renders every height up to 2000 within the frame budget", (W, H) => {
    const kit = kitFor(halloween);
    const ctx = context(W, H);
    const times: number[] = [];
    for (let lvl = 0; lvl <= 2000; lvl += 13) {
      const s = sceneAt(W, H, lvl, lvl * 0.17);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    // Generous for a shared test machine; frames measure 4-13 ms at 2x here (see the report).
    expect(times[Math.floor(times.length / 2)]!).toBeLessThan(40);
  });
});

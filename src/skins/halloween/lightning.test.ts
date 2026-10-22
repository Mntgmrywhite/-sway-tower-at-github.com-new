import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import type { Scene } from "../skin";
import { BOLT_BOX, boltRate, FIRST, fires, flashAt, FLASH, pulse, SLOT, slotTime, strikeAt } from "./lightning";
import { HALO_REACH, moonAt } from "./sky";
import { column, context, sceneAt, SCREENS } from "./test-scene";
import { LOOP_PERIOD, LOOP_START } from "./tone";

// Distant lightning: now and then the sky out in the lanes blinks pale, twice, a thin bolt far off in
// a lane, and the dark shows what it hides. Subtle (the owner's readability rule and the house rule
// for flashes): behind the tower's column the sky brightens by at most WASH_COLUMN's worth, the whole
// frame changes only a little, the moon's disc never changes, and with reduce motion on there is
// none at all. The rate follows the height story: about one slot in four on Main Street and in the
// calm night, more often among the spires, nearly every slot in the storm. The first flash is part
// of the opening (7.6 s).

/** sRGB channel (0..255) to linear light. */
const LIN = Float64Array.from({ length: 256 }, (_, v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
});

function frame(s: Scene): Uint8ClampedArray {
  const ctx = context(s.cssW, s.cssH);
  const kit = kitFor(halloween);
  kit.world(ctx, s);
  kit.front(ctx, s);
  return ctx.getImageData(0, 0, Math.round(s.cssW), Math.round(s.cssH)).data;
}

/** The first moment at or after t0 that a flash peaks at this level's rate. */
function peak(lvl: number, from: number): number {
  const rate = boltRate(lvl);
  for (let k = Math.max(1, Math.floor(from / SLOT)); k < 2000; k++) if (slotTime(k) >= from && fires(k, rate)) return slotTime(k) + 0.03;
  return NaN;
}

describe("halloween lightning", () => {
  it("strikes first in the opening, at 7.6 s, and not before", () => {
    const s0 = sceneAt(390, 844, 0, 0);
    let first = Infinity;
    for (let t = 0; t < 20 && first === Infinity; t += 1 / 60) if (flashAt({ ...s0, t }) > 0) first = t;
    // The cast's cat looks up at the moon for it: the moment is shared, so it is pinned.
    expect(first, "the first flash").toBeCloseTo(7.6, 1);
    for (let t = 0; t < FIRST; t += 1 / 30) expect(flashAt({ ...s0, t }), `t=${t.toFixed(2)}`).toBe(0);
    expect(flashAt({ ...s0, t: FIRST + 0.02 })).toBeGreaterThan(0.5);
    // A flash and its echo, and over within FLASH.
    expect(pulse(0.03)).toBeGreaterThan(0.8);
    expect(pulse(0.17)).toBeGreaterThan(0.4);
    expect(pulse(FLASH)).toBe(0);
  });

  it("never flashes with reduce motion on", () => {
    for (const lvl of [0, 45, 75, 130, 200]) {
      for (let t = 0; t < 120; t += 0.05) {
        const s = { ...sceneAt(390, 844, lvl, t), still: true };
        expect(flashAt(s), `level ${lvl}, t=${t.toFixed(2)}`).toBe(0);
      }
    }
  });

  it("comes at the story's rate: seldom on Main Street and in the calm night, often among the spires, nearly always in the storm", () => {
    const share = (lvl: number) => {
      const rate = boltRate(lvl);
      let n = 0;
      let on = 0;
      for (let k = 2; k < 2000; k++, n++) if (fires(k, rate)) on++;
      return on / n;
    };
    const main = share(5);
    const spires = share(44);
    const storm = share(75);
    const night = share(LOOP_START + 10);
    const loopStorm = share(LOOP_START + 0.68 * LOOP_PERIOD);
    expect(main).toBeGreaterThan(0.18);
    expect(main).toBeLessThan(0.32);
    expect(night).toBeLessThan(0.32);
    expect(spires).toBeGreaterThan(0.32);
    expect(spires).toBeLessThan(0.48);
    expect(storm).toBeGreaterThan(0.68);
    expect(loopStorm).toBeGreaterThan(0.68);
    // Slots keep their order and their spacing: gaps between flashes of 4 to 8 s at the least.
    for (let k = 1; k < 500; k++) expect(slotTime(k + 1) - slotTime(k), `slot ${k}`).toBeGreaterThan(SLOT - 2.1);
    // And a flash is a pure function of the scene.
    expect(strikeAt(431.2, 0.77).k).toBe(strikeAt(431.2, 0.77).k);
  });

  it.each(SCREENS)("%ix%i: subtle: behind the tower barely, the frame a little, the moon's disc never", (W, H) => {
    let checked = 0;
    for (const lvl of [0, 30, 45, 75, 100, LOOP_START + 10, LOOP_START + 0.68 * LOOP_PERIOD]) {
      const base = sceneAt(W, H, lvl, 0);
      const t = peak(base.altitude / 8, 5);
      const s = sceneAt(W, H, lvl, t);
      const L = flashAt(s);
      expect(L, `level ${lvl}: a flash at ${t.toFixed(2)}`).toBeGreaterThan(0.5);
      const lit = frame(s);
      const dark = frame({ ...s, still: true });
      const col = column(s);
      const m = moonAt(s);
      let colLum = 0;
      let colN = 0;
      let change = 0;
      let disc = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const d = Math.abs(lit[i]! - dark[i]!) + Math.abs(lit[i + 1]! - dark[i + 1]!) + Math.abs(lit[i + 2]! - dark[i + 2]!);
          change += d / 3 / 255;
          if (x >= col.x0 && x <= col.x1 && y < Math.min(col.floor, H)) {
            const a = 0.2126 * LIN[lit[i]!]! + 0.7152 * LIN[lit[i + 1]!]! + 0.0722 * LIN[lit[i + 2]!]!;
            const b = 0.2126 * LIN[dark[i]!]! + 0.7152 * LIN[dark[i + 1]!]! + 0.0722 * LIN[dark[i + 2]!]!;
            colLum += a - b;
            colN++;
          }
          if (Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y) < m.r - 1.5 && d > 0) disc++;
        }
      }
      expect(colLum / colN, `level ${lvl}: the column brightens`).toBeLessThanOrEqual(0.03);
      expect(change / (W * H), `level ${lvl}: mean frame change`).toBeLessThanOrEqual(0.04);
      expect(disc, `level ${lvl}: the moon's disc changes`).toBe(0);
      // The bolt keeps out of the column and clear of the moon and its halo.
      if (BOLT_BOX.on) {
        frame(s);
        const b = BOLT_BOX;
        expect(b.x1 < col.x0 || b.x0 > col.x1, `level ${lvl}: the bolt in the column`).toBe(true);
        const cx = Math.max(b.x0, Math.min(m.x, b.x1));
        const cy = Math.max(b.y0, Math.min(m.y, b.y1));
        expect(Math.hypot(cx - m.x, cy - m.y), `level ${lvl}: the bolt by the moon`).toBeGreaterThanOrEqual(m.r * HALO_REACH);
      }
      checked++;
    }
    expect(checked).toBe(7);
  }, 60_000);
});

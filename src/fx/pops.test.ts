import { describe, expect, it } from "vitest";
import type { Ctx } from "../base/draw";
import type { StyleKit } from "../base/style";
import { BLOCK_HEIGHT } from "../config";
import { newGame } from "../game";
import { SKINS } from "../skins";
import { addPop, drawPops, stepPops, type Pop } from "./pops";

/** Where each pop is drawn (its translate), from a stub canvas. */
function popYs(pops: Pop[]): number[] {
  const ys: number[] = [];
  const ctx = {
    save() {},
    restore() {},
    scale() {},
    translate(_x: number, y: number) {
      ys.push(y);
    },
    measureText: () => ({ width: 100 }),
  } as unknown as Ctx;
  const state = newGame();
  state.blocks.push({ ...state.blocks[0]! }, { ...state.blocks[0]! });
  const scale = 2.6;
  drawPops(
    {
      ctx,
      kit: { text() {} } as unknown as StyleKit,
      skin: SKINS[0]!,
      state,
      cssW: 390,
      u: 390,
      scale,
      h: BLOCK_HEIGHT * scale,
      sx: (x) => x * scale,
      sy: (y) => 700 - y * scale,
      hudBottom: 0,
    },
    pops,
  );
  return ys;
}

describe("PERFECT pop", () => {
  it("shows the streak, and a new one fades the older out fast so words never stack", () => {
    const pops: Pop[] = [];
    addPop(pops, 1, 1);
    expect(pops.map((p) => p.text)).toEqual(["PERFECT"]);
    stepPops(pops, 0.2);
    addPop(pops, 2, 2);
    expect(pops.map((p) => p.text)).toEqual(["PERFECT", "PERFECT ×2"]);
    expect(pops[1]!.size).toBeGreaterThan(pops[0]!.size);
    stepPops(pops, 0.2);
    expect(pops.map((p) => p.text)).toEqual(["PERFECT ×2"]);
    stepPops(pops, 1);
    expect(pops).toEqual([]);
  });

  it("grows with the streak up to a cap", () => {
    const size = (streak: number) => {
      const pops: Pop[] = [];
      addPop(pops, 1, streak);
      return pops[0]!.size;
    };
    expect(size(3)).toBeGreaterThan(size(2));
    expect(size(5)).toBeGreaterThan(size(4));
    expect(size(9)).toBe(size(5));
  });

  it("rises smoothly, and a pop that is cut short by a newer one does not jump", () => {
    const pops: Pop[] = [];
    addPop(pops, 1, 1);
    stepPops(pops, 0.3);
    const before = popYs(pops)[0]!;
    addPop(pops, 2, 2);
    expect(popYs(pops)[0]).toBe(before);
    stepPops(pops, 0.05);
    expect(popYs(pops)[0]).toBeLessThan(before); // still rising
    expect(before - popYs(pops)[0]!).toBeLessThan(BLOCK_HEIGHT * 2.6 * 0.3);
  });
});

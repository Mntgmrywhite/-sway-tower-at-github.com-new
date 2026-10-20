import { describe, expect, it } from "vitest";
import { MODEL_LENGTH, SCALE } from "./carriage";
import { CART, CART_LAP, placeCarriage, rig } from "./ground";
import { context, sceneAt, SIZES } from "./test-scene";

// The coachman holds one whip (the owner: "there is a double whip on the Christmas horse and
// buggy"). The reins used to rise from his hands and end in the air over the horse's withers, so
// with the whip two thin lines stood up from the box. Now the reins run down to the horse's bit
// and the whip is the only thing up in the air over the horse.

/** Drawn this many times larger than on the phone, so the thin lines resolve. */
const K = 6;
/**
 * The air over the horse, in the rig's model units (x forward from the tail-board, y up from
 * the ground): from just ahead of the coachman's hat brim to just behind the horse's collar and
 * mane, from a little above the horse's back and the snow on it to well over the coachman's hat.
 */
const AIR = { x0: 0.138, x1: 0.22, y0: 0.108, y1: 0.175 };
/** The coachman's hands are just behind and below AIR's corner nearest him: a held whip comes in within this of it. */
const HELD = 0.012;
/** The whip rises this high above the ground, over the horse's back. */
const WHIP_TOP = 0.13;

interface Air {
  /** Separate lines and shapes drawn in the air (8-connected ink, alpha above a faint edge). */
  pieces: { held: boolean; top: number }[];
}

/** What the rig draws in the air over the horse at time t, on a W x H phone; null while it's round a corner. */
function airOverHorse(W: number, H: number, t: number): Air | null {
  const s = sceneAt(W, H, 0, t);
  if (!placeCarriage(s)) return null;
  const { x, y, U, back } = CART;
  const dir = back ? -1 : 1;
  const P = U * SCALE;
  const sx = (mx: number) => x + dir * P * (mx - MODEL_LENGTH / 2);
  const left = Math.min(sx(AIR.x0), sx(AIR.x1));
  const right = Math.max(sx(AIR.x0), sx(AIR.x1));
  const top = y - P * AIR.y1;
  const bottom = y - P * AIR.y0;
  const w = Math.ceil((right - left) * K);
  const h = Math.ceil((bottom - top) * K);
  const ctx = context(w, h);
  ctx.scale(K, K);
  ctx.translate(-left, -top);
  rig(ctx, s, back);
  const data = ctx.getImageData(0, 0, w, h).data;
  const on = (i: number) => data[i * 4 + 3]! > 40;
  // Model units of a pixel's column ahead of the coachman, and of its row above the ground.
  const ahead = (px: number) => (dir === 1 ? px : w - 1 - px) / (P * K);
  const height = (py: number) => AIR.y1 - py / (P * K);
  const seen = new Uint8Array(w * h);
  const pieces: Air["pieces"] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !on(start)) continue;
    let held = false;
    let highest = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const px = i % w;
      const py = Math.floor(i / w);
      highest = Math.max(highest, height(py));
      if (ahead(px) < HELD && height(py) < AIR.y0 + HELD) held = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (!seen[j] && on(j)) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    pieces.push({ held, top: highest });
  }
  return { pieces };
}

describe("christmas carriage", () => {
  it.each(SIZES)("%ix%i: the coachman holds one whip up over the horse, and nothing else rises from the box", (W, H) => {
    let front = 0;
    let back = 0;
    // A whole lap, both ways, through every phase of the lope and the lash's flick.
    for (let t = 0; t < CART_LAP; t += 0.15) {
      const air = airOverHorse(W, H, t);
      if (!air) continue;
      const at = `t=${t.toFixed(2)} ${CART.back ? "going left, behind" : "going right, in front"}`;
      expect(air.pieces.length, `${at}: lines in the air over the horse`).toBe(1);
      const [whip] = air.pieces;
      expect(whip!.held, `${at}: the whip comes up from the coachman's hands`).toBe(true);
      expect(whip!.top, `${at}: the whip stands up over the horse`).toBeGreaterThan(WHIP_TOP);
      if (CART.back) back++;
      else front++;
    }
    expect(front).toBeGreaterThan(20);
    expect(back).toBeGreaterThan(20);
  });
});

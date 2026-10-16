import { hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { LOOP_PERIOD, LOOP_START } from "./tone";

// The Sleepy Hollow mist, the loop's height-band set piece: as the sky pales into the mist,
// long low banks of fog hang in the side lanes and you climb past them. Each bank is a few
// stretched, overlapping ovals, cel-shaded like the base world's clouds (shade, body, lit cap),
// sized to its lane so it never reaches behind the tower or past the screen's side. A bank hangs
// at its own height in every loop and moves only as the camera climbs (nearly with the tower):
// nothing moves behind the tower, and the banks come and go over the screen's top and bottom.

const SHADE = "#9086c6";
const BODY = "#b6ace2";
const LIGHT = "#d9d2f5";

/** How fast the banks pass as you climb: nearly with the tower, they hang close by. */
const FOG_P = 0.9;
/** Keep this far (u) from the screen's side and from the tower's column. */
const FOG_EDGE = 0.014;
/** Widest a bank grows on a wide screen, in u. */
const FOG_MAX_W = 0.3;
/** Ovals per bank. */
const PARTS = 3;

/** The banks of one loop: where in the loop (fraction), side (-1 left of the tower, 1 right), thickness (u). */
export const BANKS = [
  { at: 0.17, side: -1, h: 0.06 },
  { at: 0.22, side: 1, h: 0.054 },
  { at: 0.28, side: -1, h: 0.05 },
  { at: 0.34, side: 1, h: 0.058 },
  { at: 0.4, side: -1, h: 0.055 },
].map((b, i) => ({ ...b, lvl: b.at * LOOP_PERIOD, seed: 31 + i * 7 }));

/** Scratch box of one bank on screen: its span, its top and bottom. */
const B = { x0: 0, x1: 0, y0: 0, y1: 0 };

/** Where bank `i` of loop `k` is on screen. */
export function bankBox(s: Scene, k: number, i: number): typeof B {
  const b = BANKS[i]!;
  const u = s.u;
  const lvl = LOOP_START + k * LOOP_PERIOD + b.lvl;
  const y = layerGround(s, FOG_P) - lvl * BLOCK_HEIGHT * s.scale * FOG_P;
  const h = b.h * u;
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  const lo = b.side < 0 ? u * FOG_EDGE : col1 + u * FOG_EDGE;
  const hi = b.side < 0 ? col0 - u * FOG_EDGE : s.cssW - u * FOG_EDGE;
  const w = Math.max(0, Math.min(hi - lo, u * FOG_MAX_W));
  // Against the tower's side of the lane, so a wide screen's far edges stay clear.
  B.x0 = b.side < 0 ? hi - w : lo;
  B.x1 = B.x0 + w;
  B.y0 = y - h;
  B.y1 = y;
  return B;
}

/** Oval j of a bank, inside its box: center and radii. */
const O = { x: 0, y: 0, rx: 0, ry: 0 };

function part(seed: number, j: number, box: typeof B): typeof O {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const f = (j + 0.5) / PARTS;
  // Thickest in the middle, thinning to the ends; never past the box.
  const hump = 1 - (2 * f - 1) ** 2;
  O.ry = h * (0.3 + 0.18 * hump) * (0.85 + hash(seed + j) * 0.3);
  O.rx = Math.min(w / (PARTS * 0.68), w * f, w * (1 - f));
  O.x = box.x0 + w * f;
  O.y = box.y1 - O.ry;
  return O;
}

/** Shade, body, lit cap: offset (in radii) and size of each layer. */
const LAYERS = [
  { color: SHADE, dx: 0, dy: 0, k: 1 },
  { color: BODY, dx: -0.04, dy: -0.22, k: 0.9 },
  { color: LIGHT, dx: -0.16, dy: -0.5, k: 0.5 },
] as const;

/** The fog banks within view, in the levels of the loop's mist. */
export function fogBanks(ctx: Ctx, s: Scene): void {
  const lvl = s.altitude / BLOCK_HEIGHT;
  if (lvl < LOOP_START - LOOP_PERIOD * 0.25) return;
  const k0 = Math.floor((lvl - LOOP_START) / LOOP_PERIOD);
  for (let k = Math.max(0, k0 - 1); k <= k0 + 1; k++) {
    for (let i = 0; i < BANKS.length; i++) {
      const box = bankBox(s, k, i);
      if (box.y0 > s.cssH || box.y1 < 0 || box.x1 - box.x0 < s.u * 0.08) continue;
      const seed = BANKS[i]!.seed;
      for (const L of LAYERS) {
        ctx.fillStyle = L.color;
        ctx.beginPath();
        for (let j = 0; j < PARTS; j++) {
          const o = part(seed, j, box);
          oval(ctx, o.x + o.rx * L.dx, o.y + o.ry * L.dy, o.rx * L.k, o.ry * L.k);
        }
        ctx.fill();
      }
    }
  }
}

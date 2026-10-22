import { hash, type Ctx } from "../../base/draw";

// Spindly, crooked trees in a Tim Burton style: long thin limbs that kink and lean, and curl up
// into little spirals at their tips. Built once as flat segment lists (x0, y0, kink x, kink y,
// x1, y1, level, curl), in units of the tree's height (y up), and drawn as strokes per level,
// thick to thin, so a whole tree is a few strokes.

export interface Tree {
  segs: number[];
  /** Height in u; the trunk's flare half-width at the base, in units of the height. */
  h: number;
  flare: number;
}

const STRIDE = 8;
/** Stroke widths per level, in units of the tree's height: trunk to twigs. */
const WIDTHS = [0.075, 0.042, 0.024, 0.014];

/**
 * A crooked tree: `seed` picks its shape, `lean` tilts the trunk (radians), `spread` fans the
 * limbs, `depth` how many times they fork. The thinnest limbs end in a curl (set `curls` 0 for none).
 */
export function crooked(seed: number, lean: number, spread: number, depth: number, curls = 1): Tree {
  const out: number[] = [];
  const grow = (x: number, y: number, ang: number, len: number, d: number, sd: number): void => {
    const a = Math.max(-1.7, Math.min(1.7, ang));
    const x1 = x + Math.sin(a) * len;
    const y1 = y + Math.cos(a) * len;
    const mx = (x + x1) / 2 + (hash(sd + 11) - 0.5) * len * 0.7;
    const my = (y + y1) / 2 + (hash(sd + 13) - 0.5) * len * 0.25;
    const level = Math.max(0, Math.min(3, depth - d - (depth > 4 ? 1 : 0)));
    const curl = d === 0 && curls > 0 && hash(sd + 17) < 0.7 ? (hash(sd + 19) < 0.5 ? -1 : 1) : 0;
    out.push(x, y, mx, my, x1, y1, level, curl);
    if (d === 0) return;
    const n = d >= 2 ? 2 : 2 + (hash(sd + 3) > 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = n === 2 ? (i === 0 ? -1 : 1) : i - 1;
      const sp = spread * (0.45 + hash(sd * 3 + i) * 0.55);
      const nl = len * (0.62 + hash(sd + i + 9) * 0.24);
      const droop = d <= 2 ? (hash(sd + i + 21) - 0.5) * (d <= 1 ? 1.2 : 0.7) : 0;
      grow(x1, y1, a + side * sp + droop + (hash(sd + 5) - 0.5) * 0.3, nl, d - 1, sd * 2 + i + 3);
    }
  };
  grow(0, 0, lean, 0.34, depth, seed);
  return { segs: out, h: 1, flare: 0.07 };
}

/** The furthest any limb reaches from the trunk's foot, in units of the tree's height: [left, right, top]. */
export function reach(tr: Tree): [number, number, number] {
  let l = 0;
  let r = 0;
  let t = 0;
  const s = tr.segs;
  for (let i = 0; i < s.length; i += STRIDE) {
    for (const k of [0, 2, 4]) {
      l = Math.min(l, s[i + k]!);
      r = Math.max(r, s[i + k]!);
      t = Math.max(t, s[i + k + 1]!);
    }
    if (s[i + 7]) {
      // A curl reaches a little past its limb's tip.
      l = Math.min(l, s[i + 4]! - 0.05);
      r = Math.max(r, s[i + 4]! + 0.05);
      t = Math.max(t, s[i + 5]! + 0.05);
    }
  }
  return [l, r, t];
}

/** A tree standing at (x, base), `h` px tall, as flat strokes of `color` (no outline: far away or a silhouette). */
export function drawTree(ctx: Ctx, tr: Tree, x: number, base: number, h: number, color: string): void {
  const s = tr.segs;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let level = 0; level < 4; level++) {
    ctx.beginPath();
    for (let i = 0; i < s.length; i += STRIDE) {
      if (s[i + 6] !== level) continue;
      ctx.moveTo(x + s[i]! * h, base - s[i + 1]! * h);
      ctx.quadraticCurveTo(x + s[i + 2]! * h, base - s[i + 3]! * h, x + s[i + 4]! * h, base - s[i + 5]! * h);
      const c = s[i + 7]!;
      if (c && level === 3) {
        // The tip curls round into a small spiral.
        const r = h * 0.028;
        const tx = x + s[i + 4]! * h;
        const ty = base - s[i + 5]! * h;
        ctx.arc(tx + c * r, ty, r, c > 0 ? Math.PI : 0, c > 0 ? Math.PI * 2.6 : -Math.PI * 1.6, c < 0);
      }
    }
    ctx.lineWidth = Math.max(0.8, WIDTHS[level]! * h);
    ctx.stroke();
  }
  // Root flare
  const f = tr.flare * h;
  ctx.beginPath();
  ctx.moveTo(x - f, base + 1);
  ctx.quadraticCurveTo(x - f * 0.3, base - f * 0.4, x - f * 0.25, base - f * 1.7);
  ctx.lineTo(x + f * 0.25, base - f * 1.7);
  ctx.quadraticCurveTo(x + f * 0.3, base - f * 0.4, x + f, base + 1);
  ctx.closePath();
  ctx.fill();
}

import { hash, type Ctx } from "../../base/draw";

// Spindly, crooked trees in a Tim Burton style: long thin limbs that kink and lean, and curl up
// into little spirals at their tips. Built once as flat segment lists (x0, y0, kink x, kink y,
// x1, y1, level, curl, limb), in units of the tree's height (y up), and drawn as strokes per level,
// thick to thin, so a whole tree is a few strokes. They are alive: they sway in the wind (the tips
// most), and one limb now and then creaks round and reaches out (toward the tower), holds, and
// pulls back.

export interface Tree {
  segs: number[];
  /** Height in u; the trunk's flare half-width at the base, in units of the height. */
  h: number;
  flare: number;
  /** The limb that reaches (its index) and where it grows from (tree units): the pivot it swings round. */
  reacher: number;
  px: number;
  py: number;
}

const STRIDE = 9;
/** Stroke widths per level, in units of the tree's height: trunk to twigs. */
const WIDTHS = [0.075, 0.042, 0.024, 0.014];
/** How far a reaching limb swings round, at full reach (rad). */
export const REACH_ANGLE = 0.42;

/**
 * A crooked tree: `seed` picks its shape, `lean` tilts the trunk (radians), `spread` fans the
 * limbs, `depth` how many times they fork. The thinnest limbs end in a curl (set `curls` 0 for none).
 * `toward` (-1 left, 1 right) picks which limb reaches: the one growing farthest that way.
 */
export function crooked(seed: number, lean: number, spread: number, depth: number, curls = 1, toward = 1): Tree {
  const out: number[] = [];
  let pivotX = 0;
  let pivotY = 0;
  const grow = (x: number, y: number, ang: number, len: number, d: number, sd: number, limb: number): void => {
    const a = Math.max(-1.7, Math.min(1.7, ang));
    const x1 = x + Math.sin(a) * len;
    const y1 = y + Math.cos(a) * len;
    const mx = (x + x1) / 2 + (hash(sd + 11) - 0.5) * len * 0.7;
    const my = (y + y1) / 2 + (hash(sd + 13) - 0.5) * len * 0.25;
    const level = Math.max(0, Math.min(3, depth - d - (depth > 4 ? 1 : 0)));
    const curl = d === 0 && curls > 0 && hash(sd + 17) < 0.7 ? (hash(sd + 19) < 0.5 ? -1 : 1) : 0;
    out.push(x, y, mx, my, x1, y1, level, curl, limb);
    if (d === 0) return;
    if (limb < 0) {
      pivotX = x1;
      pivotY = y1;
    }
    const n = d >= 2 ? 2 : 2 + (hash(sd + 3) > 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = n === 2 ? (i === 0 ? -1 : 1) : i - 1;
      const sp = spread * (0.45 + hash(sd * 3 + i) * 0.55);
      const nl = len * (0.62 + hash(sd + i + 9) * 0.24);
      const droop = d <= 2 ? (hash(sd + i + 21) - 0.5) * (d <= 1 ? 1.2 : 0.7) : 0;
      grow(x1, y1, a + side * sp + droop + (hash(sd + 5) - 0.5) * 0.3, nl, d - 1, sd * 2 + i + 3, limb < 0 ? i : limb);
    }
  };
  grow(0, 0, lean, 0.34, depth, seed, -1);
  // The reaching limb: the one whose tips reach farthest toward `toward`.
  let best = 0;
  let most = -Infinity;
  for (let l = 0; l < 3; l++) {
    let far = -Infinity;
    for (let i = 0; i < out.length; i += STRIDE) if (out[i + 8] === l) far = Math.max(far, out[i + 4]! * toward);
    if (far > most) {
      most = far;
      best = l;
    }
  }
  return { segs: out, h: 1, flare: 0.07, reacher: best, px: pivotX, py: pivotY };
}

/** The furthest any limb reaches from the trunk's foot, in units of the tree's height: [left, right, top]. */
export function reach(tr: Tree): [number, number, number] {
  let l = 0;
  let r = 0;
  let t = 0;
  const s = tr.segs;
  for (let i = 0; i < s.length; i += STRIDE) {
    for (let k = 0; k <= 4; k += 2) {
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

/** How a tree moves now: sway (tree units at the top, sideways), how far its reacher is out (0..1) and which way. */
export interface TreeMotion {
  sway: number;
  reach: number;
  dir: number;
}
/** Standing still. */
export const STILL_TREE: TreeMotion = Object.freeze({ sway: 0, reach: 0, dir: 1 });

/** Scratch: a point of the tree moved by the wind and the reach. */
const MV = { x: 0, y: 0 };
let mSway = 0;
let mCos = 1;
let mSin = 0;
let mLimb = -1;
let mPx = 0;
let mPy = 0;

function move(x: number, y: number, limb: number): typeof MV {
  let X = x;
  let Y = y;
  if (limb === mLimb && mSin !== 0) {
    const dx = X - mPx;
    const dy = Y - mPy;
    X = mPx + dx * mCos - dy * mSin;
    Y = mPy + dx * mSin + dy * mCos;
  }
  MV.x = X + mSway * Y * Y;
  MV.y = Y;
  return MV;
}

/**
 * A tree standing at (x, base), `h` px tall, as flat strokes of `color` (no outline: far away or a
 * silhouette), moved by `m` (the wind's sway, its reaching limb).
 */
export function drawTree(ctx: Ctx, tr: Tree, x: number, base: number, h: number, color: string, m: TreeMotion = STILL_TREE): void {
  const s = tr.segs;
  mSway = m.sway;
  mLimb = m.reach > 0 ? tr.reacher : -1;
  // Swung round its pivot toward `dir` (y is up in tree units, so a positive angle turns it left).
  const ang = -m.dir * m.reach * REACH_ANGLE;
  mCos = Math.cos(ang);
  mSin = Math.sin(ang);
  mPx = tr.px;
  mPy = tr.py;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let level = 0; level < 4; level++) {
    ctx.beginPath();
    for (let i = 0; i < s.length; i += STRIDE) {
      if (s[i + 6] !== level) continue;
      const limb = s[i + 8]!;
      let p = move(s[i]!, s[i + 1]!, limb);
      ctx.moveTo(x + p.x * h, base - p.y * h);
      p = move(s[i + 2]!, s[i + 3]!, limb);
      const cx = x + p.x * h;
      const cy = base - p.y * h;
      p = move(s[i + 4]!, s[i + 5]!, limb);
      const tx = x + p.x * h;
      const ty = base - p.y * h;
      ctx.quadraticCurveTo(cx, cy, tx, ty);
      const c = s[i + 7]!;
      if (c && level === 3) {
        // The tip curls round into a small spiral.
        const r = h * 0.028;
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

/** Scratch motion for `windAt`. */
const WIND: TreeMotion = { sway: 0, reach: 0, dir: 1 };

/**
 * The wind in a tree at time t: a sway of `amp` (tree units at its top) on its own period (3 to 5 s,
 * by seed) with gusts now and then; and, from `reachAt` (0..1, ambient.ts beat), its limb reaching `dir`.
 */
export function windAt(t: number, seed: number, amp: number, reachK: number, dir: number): TreeMotion {
  const period = 3 + hash(seed + 71) * 2;
  const gust = 1 + 0.8 * Math.max(0, Math.sin(t * 0.37 + seed)) ** 6;
  WIND.sway = amp * gust * Math.sin((t * Math.PI * 2) / period + seed);
  WIND.reach = reachK;
  WIND.dir = dir;
  return WIND;
}

/** Scratch point for `forkAt`. */
const FORK = { x: 0, y: 0 };

/**
 * A point on a tree standing at (x, base), `h` px tall, for a bird to perch on: the fork where its
 * trunk splits (limb -1), or the end of limb `limb`'s first stretch (0..2). Screen px.
 */
export function forkAt(tr: Tree, x: number, base: number, h: number, limb = -1): typeof FORK {
  let fx = tr.px;
  let fy = tr.py;
  if (limb >= 0) {
    const s = tr.segs;
    for (let i = 0; i < s.length; i += STRIDE) {
      if (s[i + 8] !== limb || Math.abs(s[i]! - tr.px) > 1e-9 || Math.abs(s[i + 1]! - tr.py) > 1e-9) continue;
      fx = s[i + 4]!;
      fy = s[i + 5]!;
      break;
    }
  }
  FORK.x = x + fx * h;
  FORK.y = base - fy * h;
  return FORK;
}

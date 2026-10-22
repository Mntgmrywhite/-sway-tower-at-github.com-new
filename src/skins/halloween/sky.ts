import { circle, hash, oval, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { STAR } from "./common";
import { coverTop, OVERLAP, skyEnd } from "./lines";
import { floorSpan } from "./street";
import { toneOf, type Tone } from "./tone";

// The Halloween sky, painted like the backdrop of a stop-motion set: a deep indigo sinking through
// violet to plum, the last pumpkin ember of the dusk low on the horizon, a huge flat cream moon low
// on the left with flat rings of moonlight round it, a scatter of twinkling stars, and long flat
// ribbons of cloud that curl up into spirals at their ends, out in the lanes. Everything up here is
// far away: flat fills, no outline. The moon belongs to the left of the sky: no star, ribbon or
// flyer ever crosses it (only the Headless Horseman galloping along his hill, and the churchyard
// crow's two turns round it).
//
// The sky follows the height story (tone.ts): dusk deepening to night, the mist paling it, the
// witching hour turning it deep indigo with the moon burning orange.

// ---------------------------------------------------------------- the moon

/** Moon radius at the start, in u: the moon is placed by it (it swells a little as night falls). */
const MOON_R = 0.145;

/** Scratch result of `moonAt`, reused so nothing allocates per frame. */
const M = { x: 0, y: 0, r: 0, r0: 0, y0: 0 };

/**
 * Where the moon hangs: left of the tower, below the HUD block (the top 32% of the screen), and in
 * the start view 0.28u above the start horizon if that allows, so the Horseman's hill can cross its
 * lower face with the hollow still below (y0, r0: that start-view spot and size, which the hill and
 * the corner shops are laid out by). Fixed on screen while you climb, but as night falls (tone.ts
 * moonUp) it eases up to just under the HUD, out of the lane below it, and swells; it never jumps.
 */
export function moonAt(s: Scene, tone: Tone = toneOf(s)): typeof M {
  const u = s.u;
  M.r0 = u * MOON_R;
  M.r = u * tone.moonR;
  M.x = s.cssW / 2 - u * 0.3;
  const hy0 = s.horizonY - HORIZON_P * s.rise;
  M.y0 = Math.max(s.cssH * 0.32 + M.r0 + u * 0.02, hy0 - u * 0.28);
  // (It rises at most MOON_RISE: on a zoomed-out view the HUD's line is much farther up.)
  const high = Math.max(s.cssH * MOON_HIGH + M.r + u * 0.01, M.y0 - u * MOON_RISE);
  M.y = tone.moonUp > 0 ? M.y0 + (Math.min(M.y0, high) - M.y0) * tone.moonUp : M.y0;
  return M;
}
/** Eased up, the moon's top stands this far down the screen (and a hair more), having risen at most MOON_RISE (u). */
const MOON_HIGH = 0.3;
const MOON_RISE = 0.12;

/** How far out the moon's halo reaches, in radii: nothing in the sky comes nearer than this. */
export const HALO_REACH = 1.5;
const HALO_RINGS = [1.5, 1.28, 1.12] as const;

// Moon surface, in fractions of the radius: soft seas and a few craters, all flat.
const MARIA = [
  { x: -0.32, y: -0.18, rx: 0.3, ry: 0.2, rot: 0.5 },
  { x: 0.22, y: 0.16, rx: 0.26, ry: 0.18, rot: -0.3 },
  { x: -0.06, y: 0.5, rx: 0.2, ry: 0.11, rot: 0.15 },
];
const CRATERS = [
  { x: -0.46, y: 0.26, r: 0.1 },
  { x: 0.44, y: 0.44, r: 0.08 },
  { x: 0.08, y: -0.58, r: 0.08 },
  { x: 0.56, y: -0.16, r: 0.065 },
];

/** The huge moon with its flat halo rings, seas, craters and a lit rim. */
export function moon(ctx: Ctx, s: Scene, tone: Tone = toneOf(s)): void {
  const { x, y, r } = moonAt(s, tone);
  ctx.fillStyle = tone.halo;
  for (const k of HALO_RINGS) {
    // Rings, not discs: their middles would only be painted over by the moon (whose edge hides theirs).
    ctx.beginPath();
    circle(ctx, x, y, r * k);
    circle(ctx, x, y, r * 0.97);
    ctx.fill("evenodd");
  }
  if (tone.ghostHalo) {
    // The spiral calm's ghost-green ring of light, between the inner halo rings.
    ctx.fillStyle = tone.ghostHalo;
    ctx.beginPath();
    circle(ctx, x, y, r * 1.36);
    circle(ctx, x, y, r * 1.06);
    ctx.fill("evenodd");
  }
  ctx.fillStyle = tone.moon;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.moonSea;
  ctx.beginPath();
  for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
  ctx.fill();
  ctx.fillStyle = tone.moonCrater;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + c.x * r, y + c.y * r, c.r * r);
  ctx.fill();
  ctx.fillStyle = tone.moon;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + (c.x + c.r * 0.25) * r, y + (c.y + c.r * 0.25) * r, c.r * r * 0.62);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.88, Math.PI * 0.95, Math.PI * 1.45);
  ctx.strokeStyle = tone.moonRim;
  ctx.lineWidth = r * 0.06;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Whether a box comes within the moon's halo (so sky things keep out of it). */
export function nearMoon(s: Scene, x0: number, y0: number, x1: number, y1: number, tone: Tone = toneOf(s)): boolean {
  const m = moonAt(s, tone);
  const R = m.r * HALO_REACH;
  const cx = Math.max(x0, Math.min(m.x, x1));
  const cy = Math.max(y0, Math.min(m.y, y1));
  return Math.hypot(cx - m.x, cy - m.y) < R;
}

// ---------------------------------------------------------------- the sky's paint

/**
 * The sky: top, middle and horizon colors down to where it ends (skyEnd), as two two-stop
 * gradients split at a whole pixel (the same as one three-stop gradient, at half the cost), and
 * the glow standing on the horizon. Below its end it runs on in the horizon's color.
 */
/** The sky's gradients, kept while the view and the tone stay the same (the start view holds for a dozen bars). */
const SKY = { tone: null as Tone | null, end: NaN, h: NaN, upper: null as CanvasGradient | null, lower: null as CanvasGradient | null, glow: null as CanvasGradient | null };

export function skyFill(ctx: Ctx, s: Scene, tone: Tone): void {
  const end = Math.min(skyEnd(s), s.cssH + s.u);
  const split = Math.round(end * 0.6);
  const h = s.u * 0.32 * tone.glowK;
  if (SKY.tone !== tone || SKY.end !== end || SKY.h !== h) {
    SKY.tone = tone;
    SKY.end = end;
    SKY.h = h;
    SKY.upper = ctx.createLinearGradient(0, 0, 0, split);
    SKY.upper.addColorStop(0, tone.sky[0]);
    SKY.upper.addColorStop(1, tone.sky[1]);
    SKY.lower = ctx.createLinearGradient(0, split, 0, end);
    SKY.lower.addColorStop(0, tone.sky[1]);
    SKY.lower.addColorStop(1, tone.sky[2]);
    SKY.glow = null;
    if (tone.glowK > 0.01) {
      SKY.glow = ctx.createLinearGradient(0, end - h, 0, end);
      SKY.glow.addColorStop(0, tone.sky[2]);
      SKY.glow.addColorStop(1, tone.glow);
    }
  }
  // Each gradient stops where the next fill takes over, and nothing is painted under the near
  // edge (coverTop): a gradient is the dearest fill there is, and the lower one used to run on
  // down the whole screen under the glow, the land and the flagstones.
  // (Each fill runs OVERLAP px on under the next one, so no seam shows through, even scaled down.)
  const floor = Math.min(s.cssH, coverTop(s) + OVERLAP);
  ctx.fillStyle = SKY.upper!;
  ctx.fillRect(0, 0, s.cssW, Math.min(split, floor));
  const lower = Math.min((SKY.glow ? end - h : end) + OVERLAP, floor);
  if (lower > split - 2) {
    ctx.fillStyle = SKY.lower!;
    ctx.fillRect(0, split - 2, s.cssW, lower - split + 2);
  }
  if (SKY.glow && end - h < floor) {
    ctx.fillStyle = SKY.glow;
    ctx.fillRect(0, end - h, s.cssW, Math.min(h + OVERLAP, floor - end + h));
  }
  // Below its end it runs on in the horizon's color (unless Main Street's floor and the
  // churchyard's grass cover all of that, as they do while the street shows).
  const street = floorSpan(s);
  if (end < floor && !(street && street[0] <= end)) {
    ctx.fillStyle = SKY.glow ? tone.glow : tone.sky[2];
    ctx.fillRect(0, end, s.cssW, floor - end);
  }
}

// ---------------------------------------------------------------- stars

/** Stars as fractions of the screen: x, y, size, and whether it is a four-point sparkle. */
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i + 3),
  y: hash(i + 103) * 0.86,
  r: 0.8 + hash(i + 203) * 1.1,
  sparkle: hash(i + 303) > 0.86,
  extra: i >= 44,
}));

/**
 * Stars in the side lanes (never behind the tower), clear of the moon's halo and above the hills.
 * The last ones come out only in the witching hour.
 */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.starGlow < 0.01) return;
  const x0 = s.baseX - s.u * 0.07;
  const x1 = s.baseX + s.baseW + s.u * 0.07;
  const floor = Math.min(skyEnd(s), s.cssH) - s.u * 0.22;
  const m = moonAt(s, tone);
  const R = m.r * HALO_REACH + s.u * 0.01;
  ctx.fillStyle = STAR;
  for (let i = 0; i < STARS.length; i++) {
    const st = STARS[i]!;
    const a = st.extra ? tone.extraStars : 1;
    if (a < 0.01) continue;
    const x = st.x * s.cssW;
    const y = st.y * s.cssH;
    if ((x > x0 && x < x1) || y > floor || Math.hypot(x - m.x, y - m.y) < R) continue;
    ctx.globalAlpha = (0.55 + 0.4 * Math.sin(s.t * (1.2 + (i % 5) * 0.2) + i)) * tone.starGlow * a;
    if (st.sparkle) {
      const r = st.r * 2.4;
      ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
      ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    } else {
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- swirls

/**
 * Burton swirls: long flat clouds that roll up into spirals, painted on the sky out in the lanes
 * (never behind the tower, never near the moon). Each is a tapering band that sweeps along and
 * winds into a spiral of shrinking arcs at its head. side (-1 left, 1 right), height as a fraction
 * of the screen, length and thickness (u), which way it winds, how far into its lane it starts (u
 * past the column's edge).
 */
const SWIRLS = [
  { side: 1, y: 0.255, len: 0.22, th: 0.018, dir: -1, inset: 0.02 },
  { side: -1, y: 0.235, len: 0.24, th: 0.02, dir: 1, inset: 0.0 },
  { side: 1, y: 0.15, len: 0.18, th: 0.014, dir: 1, inset: 0.07 },
  { side: -1, y: 0.13, len: 0.16, th: 0.013, dir: -1, inset: 0.1 },
] as const;

/** Scratch centerline of one swirl: x, y, half-width per point. */
const SW_N = 36;
const SW = new Float64Array(SW_N * 3);

/**
 * One swirl: a ribbon from its pointed tail at x0 sweeping along line y to x1, where it winds up
 * into a spiral (`head` 1 winds over the top, -1 under), thickest along the sweep and tapering into
 * the spiral's eye. Filled as one outline (both edges of the ribbon).
 */
export function swirl(ctx: Ctx, x0: number, x1: number, y: number, th: number, head: number, wave: number): void {
  const d = Math.sign(x1 - x0);
  const R = Math.min(th * 3.2, Math.abs(x1 - x0) * 0.32);
  const cx = x1 - d * R;
  const cy = y - head * R;
  const tailN = 12;
  for (let i = 0; i < SW_N; i++) {
    let x: number;
    let yy: number;
    let w: number;
    if (i < tailN) {
      const f = i / tailN;
      x = x0 + (cx - x0) * f;
      yy = y + wave * Math.sin(f * Math.PI) - head * th * 0.3 * f * f;
      w = th * 0.5 * Math.min(1, f * 2.2);
    } else {
      // The spiral: from straight under (or over) its center, round 1.7 turns, shrinking.
      const f = (i - tailN) / (SW_N - 1 - tailN);
      const a = Math.PI / 2 * head - d * head * f * Math.PI * 3.4;
      const r = R * (1 - f * 0.82);
      x = cx + Math.cos(a) * r;
      yy = cy + Math.sin(a) * r;
      w = th * 0.5 * (1 - f * 0.75);
    }
    SW[i * 3] = x;
    SW[i * 3 + 1] = yy;
    SW[i * 3 + 2] = w;
  }
  // Both edges: along one side, back along the other.
  edge(0, 1);
  ctx.moveTo(EP.x, EP.y);
  for (let i = 1; i < SW_N; i++) {
    edge(i, 1);
    ctx.lineTo(EP.x, EP.y);
  }
  ctx.arc(SW[(SW_N - 1) * 3]!, SW[(SW_N - 1) * 3 + 1]!, SW[(SW_N - 1) * 3 + 2]!, 0, Math.PI);
  for (let i = SW_N - 1; i >= 0; i--) {
    edge(i, -1);
    ctx.lineTo(EP.x, EP.y);
  }
  ctx.closePath();
}

/** Scratch point of a swirl's edge. */
const EP = { x: 0, y: 0 };
function edge(i: number, side: number): void {
  const a = Math.max(0, i - 1);
  const b = Math.min(SW_N - 1, i + 1);
  const tx = SW[b * 3]! - SW[a * 3]!;
  const ty = SW[b * 3 + 1]! - SW[a * 3 + 1]!;
  const n = Math.hypot(tx, ty) || 1;
  const w = SW[i * 3 + 2]! * side;
  EP.x = SW[i * 3]! - (ty / n) * w;
  EP.y = SW[i * 3 + 1]! + (tx / n) * w;
}

/** The swirls that fit their lane on this screen, clear of the moon's halo, the column and the screen's sides. */
export function swirls(ctx: Ctx, s: Scene, tone: Tone, color: string): void {
  const u = s.u;
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  ctx.beginPath();
  for (let i = 0; i < SWIRLS.length; i++) {
    const r = SWIRLS[i]!;
    const y = r.y * s.cssH;
    const lane = r.side < 0 ? col0 : s.cssW - col1;
    const len = Math.min(r.len * u, lane - u * (r.inset + 0.016));
    if (len < u * 0.12) continue;
    const outer = r.side < 0 ? col0 - u * r.inset - len : col1 + u * r.inset + len;
    const inner = r.side < 0 ? col0 - u * r.inset : col1 + u * r.inset;
    const pad = r.th * u * 3.6;
    const lo = Math.min(inner, outer);
    const hi = Math.max(inner, outer);
    if (lo < u * 0.012 || hi > s.cssW - u * 0.012) continue;
    if (nearMoon(s, lo, y - pad * 1.6, hi, y + pad, tone)) continue;
    // Tail toward the column, the spiral out toward the screen's side.
    swirl(ctx, inner, outer, y, r.th * u, r.dir, Math.sin(s.t * 0.2 + i) * r.th * u * 0.4);
  }
  ctx.fillStyle = color;
  ctx.fill();
}

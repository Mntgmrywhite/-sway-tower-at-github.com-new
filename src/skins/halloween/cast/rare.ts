import { hash, type Ctx } from "../../../base/draw";
import { CIRCLING, cycleTime } from "../flight";
import { RIDE_LOOP } from "../hollow";
import {
  BONE,
  BONE_SHADE,
  CARRIAGE_BODY,
  CARRIAGE_LIGHT,
  GHOST_GREEN,
  GOLD,
  GOLD_HALO,
  GREEN_HALO,
  INK,
  MOON_RIM,
  SILHOUETTE,
} from "./palette";
import { bump, smooth } from "./time";

// Rare events, purely for atmosphere, one at a time: a colony of bats bursting out of a belfry and
// scattering; a massive shadow crossing the moon's face (a witch on her broom with her cat on the
// bristles, or a great bat); a skeleton peeking over a rooftop, drumming its long fingers; a ghostly
// carriage rolling along the road to the mansion; a pair of glowing eyes opening in a dark window,
// looking about and blinking. The first comes at 10.8 s (the bats, as the opening's last flourish)
// and the moon's shadow follows at 20 s; then one every 16-28 s (never more than MAX_GAP after the
// last began), never the same kind twice running, and evenly: the kinds are dealt out of a shuffled
// bag of all five, so each comes once in every five (bar a shadow that had to wait its turn), each
// where the scene of the moment has a place for it (the director only says what and when).
// A shadow over the moon waits for a moment the moon is free: the Headless Horseman rides across it
// at the start of each of his 15 s rides and charges back over it, and the churchyard crow circles
// it in one ride of each half minute. When no free moment comes soon enough, another kind out of the
// bag goes first and the shadow keeps its place in the bag for the next turn.

export type RareKind = "scatter" | "shadow" | "peek" | "carriage" | "eyes";

export interface Rare {
  kind: RareKind;
  /** When it started, and how long it lasts (s). */
  t0: number;
  dur: number;
  /** Its progress now, 0..1. */
  k: number;
  /** Its number in the sequence (a seed for its details). */
  seed: number;
  /** Shadow: 0 a witch, 1 a great bat. Carriage: 0 rolls right, 1 left. Eyes: 0 gold, 1 green. */
  variant: number;
}

/** The first rare event (the bats scattering), and the second (the shadow over the moon). */
export const RARE_FIRST = 10.8;
const SECOND = 20.0;
const KINDS: readonly RareKind[] = ["scatter", "shadow", "peek", "carriage", "eyes"];
const SHADOW = 1;
const DURATION: Readonly<Record<RareKind, number>> = { scatter: 2.5, shadow: 2.4, peek: 2.2, carriage: 6.0, eyes: 3.0 };
/** A shadow crosses the moon this long after a ride of the Horseman's starts (in a ride the crow sits out). */
const SHADOW_AT = 5.0;
/** From one rare event's start to the next's: SPACING[0] plus up to SPACING[1] (s); never more than MAX_GAP. */
const SPACING = [16, 12] as const;
export const MAX_GAP = 29;
/** A shadow may come this early after the event before it began (s), to catch a free moon. */
const SHADOW_EARLY = 14;

// ---------------------------------------------------------------- the moon's timetable

/** Seconds of each of the Horseman's rides when he is on or near the moon (measured at the start view, with margins). */
const RIDER_NEAR = [
  [-0.6, 4.45],
  [9.85, 12.4],
] as const;
/** Seconds of its flight plan when the crow is on or near the moon (its turns round it, with margins). */
const CROW_NEAR = [CIRCLING[0] - 0.75, CIRCLING[1] + 0.8] as const;

/** Whether the Horseman or the crow is on or near the moon's face at time t (start view). */
function moonBusy(t: number): boolean {
  const c = t - Math.floor(t / RIDE_LOOP) * RIDE_LOOP;
  for (let i = 0; i < RIDER_NEAR.length; i++) {
    const a = RIDER_NEAR[i]![0];
    const b = RIDER_NEAR[i]![1];
    if ((c >= a && c <= b) || (c - RIDE_LOOP >= a && c - RIDE_LOOP <= b)) return true;
  }
  const f = cycleTime(t);
  return f >= CROW_NEAR[0] && f <= CROW_NEAR[1];
}

/** Whether the moon is free of the Horseman and the crow all through [t0, t1]. */
export function moonFree(t0: number, t1: number): boolean {
  const n = Math.max(1, Math.ceil((t1 - t0) / 0.05));
  for (let i = 0; i <= n; i++) if (moonBusy(t0 + ((t1 - t0) * i) / n)) return false;
  return true;
}

/**
 * The free moment for a shadow nearest `want` within [from, to] (a moment a ride's SHADOW_AT after
 * its start, with the moon free all through the shadow), or NaN if there is none in that window.
 */
function shadowSlot(want: number, from: number, to: number): number {
  let best = NaN;
  for (let r = Math.ceil((from - SHADOW_AT) / RIDE_LOOP); r * RIDE_LOOP + SHADOW_AT <= to; r++) {
    const t = r * RIDE_LOOP + SHADOW_AT;
    if (t < from || !moonFree(t, t + DURATION.shadow)) continue;
    if (!(Math.abs(t - want) >= Math.abs(best - want))) best = t;
  }
  return best;
}

// ---------------------------------------------------------------- the director

/**
 * Memo of the sequence: the slot under way or last begun (number, start, kind), the bag of kinds
 * not yet dealt in this round of five (a bit each), and the slot after it, worked out once and
 * stepped forward as time goes on (rebuilt from the first when time runs backward). Still a pure
 * function of time.
 */
const MEMO = { n: -1, t0: 0, kind: -1, bag: 0, nextT0: 0, nextKind: 0, nextBag: 0 };
const FULL = (1 << KINDS.length) - 1;

/**
 * Deal slot n after one of kind `prev` that began at `prevT0`, from `bag`: the kinds left in the bag
 * in an order of their own for this slot, the first that is not the kind before and (a shadow) has a
 * free moon in reach; a fresh bag once it is empty. Sets MEMO.nextKind, nextT0, nextBag.
 */
function deal(n: number, prev: number, prevT0: number, bag: number): void {
  const want = prevT0 + SPACING[0] + SPACING[1] * hash(13 * n + 5);
  if (n === 1) {
    MEMO.nextKind = SHADOW;
    MEMO.nextT0 = SECOND;
    MEMO.nextBag = FULL & ~(1 << SHADOW) & ~1;
    return;
  }
  // Slot 2 deals from the first bag's rest; then each bag holds all five.
  let left = bag === 0 ? FULL : bag;
  for (let pass = 0; pass < 2; pass++) {
    // The kinds left, in this slot's own order (a hash per kind).
    let tried = 0;
    for (let j = 0; j < KINDS.length; j++) {
      let pickK = -1;
      let lowest = 2;
      for (let k = 0; k < KINDS.length; k++) {
        if (!(left & (1 << k)) || tried & (1 << k)) continue;
        const h = hash(29 * n + 7 + k * 13);
        if (h < lowest) {
          lowest = h;
          pickK = k;
        }
      }
      if (pickK < 0) break;
      tried |= 1 << pickK;
      if (pickK === prev) continue;
      let t0 = want;
      if (pickK === SHADOW) {
        t0 = shadowSlot(want, prevT0 + Math.max(SHADOW_EARLY, DURATION[KINDS[prev]!] + 1), prevT0 + MAX_GAP);
        if (Number.isNaN(t0)) continue;
      }
      MEMO.nextKind = pickK;
      MEMO.nextT0 = t0;
      MEMO.nextBag = pass === 0 ? left & ~(1 << pickK) : bag;
      return;
    }
    // Nothing in the bag will do (only the kind before, or a shadow with no free moon in reach):
    // deal from a full bag this once, leaving the bag as it was.
    left = FULL;
  }
  // (Unreachable: a full bag always holds a kind other than the one before that is not a shadow.)
  MEMO.nextKind = prev === 0 ? 2 : 0;
  MEMO.nextT0 = want;
  MEMO.nextBag = bag;
}

/** Work out the slot after the current one. */
function lookAhead(): void {
  deal(MEMO.n + 1, MEMO.kind, MEMO.t0, MEMO.bag);
}

const RARE: Rare = { kind: "scatter", t0: 0, dur: 0, k: 0, seed: 0, variant: 0 };

/** The rare event under way at time t, if any (pure; the result is reused scratch). */
export function rareAt(t: number): Readonly<Rare> | null {
  if (t < RARE_FIRST) return null;
  if (MEMO.n < 0 || MEMO.t0 > t) {
    MEMO.n = 0;
    MEMO.kind = 0;
    MEMO.t0 = RARE_FIRST;
    MEMO.bag = FULL & ~1;
    lookAhead();
  }
  while (MEMO.nextT0 <= t) {
    MEMO.n++;
    MEMO.t0 = MEMO.nextT0;
    MEMO.kind = MEMO.nextKind;
    MEMO.bag = MEMO.nextBag;
    lookAhead();
  }
  const kind = KINDS[MEMO.kind]!;
  const dur = DURATION[kind];
  if (t >= MEMO.t0 + dur) return null;
  RARE.kind = kind;
  RARE.t0 = MEMO.t0;
  RARE.dur = dur;
  RARE.k = (t - MEMO.t0) / dur;
  RARE.seed = MEMO.n;
  // The first shadow over the moon is the witch on her broom (the opening's set piece); then either.
  RARE.variant = MEMO.n === 1 ? 0 : Math.floor(hash(41 * MEMO.n + 3) * 2) % 2;
  return RARE;
}

/**
 * How close a shadow over the moon is at time t, 0..1: rising to 1 over the `lead` seconds before
 * one begins, 1 while it crosses, and easing back to 0 over the `trail` seconds after it (the bat
 * ring scatters before the great shadow and gathers again after it). Pure, like `rareAt`.
 */
export function shadowNear(t: number, lead: number, trail: number): number {
  if (t < RARE_FIRST) return 0;
  rareAt(t);
  let near = 0;
  if (MEMO.kind === SHADOW) {
    const end = MEMO.t0 + DURATION.shadow;
    near = t <= end ? 1 : 1 - smooth(end, end + trail, t);
  }
  if (MEMO.nextKind === SHADOW) near = Math.max(near, smooth(MEMO.nextT0 - lead, MEMO.nextT0, t));
  return near;
}

/** Scratch box of the eyes, the peeker, the carriage and the moon's shadow. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

// ---------------------------------------------------------------- glowing eyes

/**
 * A pair of almond eyes opening in the dark at (x, y), `size` px across the pair: gold (variant 0)
 * or ghost green (1), slit pupils, a soft halo. Over k 0..1 they open, look left and right,
 * blink twice and close.
 */
export function glowingEyes(ctx: Ctx, x: number, y: number, size: number, k: number, seed: number, variant: number): void {
  const open = smooth(0, 0.12, k) * (1 - smooth(0.88, 1, k)) * (1 - bump(0.66, 0.69, 0.69, 0.72, k)) * (1 - bump(0.76, 0.79, 0.79, 0.82, k));
  if (open <= 0.02) return;
  const look = bump(0.44, 0.5, 0.58, 0.64, k) - bump(0.18, 0.24, 0.36, 0.42, k);
  const tilt = 0.14 + 0.08 * hash(seed * 3 + 1);
  const w = size * 0.13;
  const h = size * 0.075 * open;
  ctx.fillStyle = variant ? GREEN_HALO : GOLD_HALO;
  ctx.beginPath();
  for (let s = -1; s <= 1; s += 2) {
    const ex = x + s * size * 0.28;
    ctx.moveTo(ex + size * 0.22, y);
    ctx.ellipse(ex, y, size * 0.22, size * 0.14 * open + size * 0.04, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  // Almonds, their outer corners tilted up
  ctx.fillStyle = variant ? GHOST_GREEN : GOLD;
  ctx.beginPath();
  for (let s = -1; s <= 1; s += 2) {
    const ex = x + s * size * 0.28;
    const c = Math.cos(-s * tilt);
    const n = Math.sin(-s * tilt);
    ctx.moveTo(ex - w * c, y - w * n);
    ctx.quadraticCurveTo(ex + 2 * h * n, y - 2 * h * c, ex + w * c, y + w * n);
    ctx.quadraticCurveTo(ex - 2 * h * n, y + 2 * h * c, ex - w * c, y - w * n);
    ctx.closePath();
  }
  ctx.fill();
  // Slit pupils, glancing left and right
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let s = -1; s <= 1; s += 2) {
    const px = x + s * size * 0.28 + look * size * 0.06;
    const rx = size * 0.022;
    ctx.moveTo(px + rx, y);
    ctx.ellipse(px, y, rx, Math.max(0.01, size * 0.07 * open), 0, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** The box the eyes and their halo cover, centred at (x, y), `size` across. */
export function eyesBox(x: number, y: number, size: number): Readonly<{ x0: number; y0: number; x1: number; y1: number }> {
  BOX.x0 = x - size * 0.5 - 1;
  BOX.x1 = x + size * 0.5 + 1;
  BOX.y0 = y - size * 0.18 - 1;
  BOX.y1 = y + size * 0.18 + 1;
  return BOX;
}

// ---------------------------------------------------------------- a skeleton peeking over a rim

/** Size in u at k = 1 (its skull is half of it across). */
export const PEEKER_SIZE = 0.05;

/** Scratch for the peeker's long fingers. */
function fingers(ctx: Ctx, hx: number, rimY: number, size: number, side: number, drum: number, i0: number): void {
  for (let i = 0; i < 4; i++) {
    const fx = hx + side * (i - 1.5) * size * 0.07;
    const lift = Math.max(0, Math.sin(drum * 14 - (i + i0) * 0.9)) * size * 0.06 * (drum > 0 ? 1 : 0);
    ctx.moveTo(fx, rimY + size * 0.08);
    ctx.lineTo(fx, rimY - size * 0.03 - lift);
    ctx.lineTo(fx + side * size * 0.04, rimY - size * 0.06 - lift);
    ctx.lineTo(fx + side * size * 0.06, rimY - size * 0.0 - lift * 0.5);
  }
}

/**
 * A skeletal figure peeking up over a rim at rimY (a turret's parapet, a chimney stack) centred at
 * x, `size` px: it rises (k 0..0.23), tilts its head toward the tower (`face` -1 left, 1 right),
 * drums its long fingers on the rim, and ducks back down (from k 0.82). Draw it just before the
 * thing it hides behind: only what shows above the rim is meant to be seen.
 */
export function peeker(ctx: Ctx, x: number, rimY: number, size: number, k: number, seed: number, lw: number, face: -1 | 1 = -1): void {
  const up = smooth(0, 0.23, k) * (1 - smooth(0.82, 1, k));
  if (up <= 0.01) return;
  const r = size * 0.25;
  const cy = rimY + r * 1.6 - up * r * 2.8;
  const tilt = face * 0.3 * bump(0.25, 0.35, 0.7, 0.8, k);
  const drum = k > 0.3 && k < 0.8 ? k : 0;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Neck bones down behind the rim
  ctx.beginPath();
  ctx.moveTo(x, cy + r * 0.8);
  ctx.lineTo(x, cy + r * 3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.36 + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = r * 0.36;
  ctx.stroke();
  // The skull, tilted, big hollow sockets
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.quadraticCurveTo(r, r * 0.6, r * 0.55, r * 0.85);
  ctx.lineTo(r * 0.5, r * 1.1);
  ctx.lineTo(-r * 0.5, r * 1.1);
  ctx.lineTo(-r * 0.55, r * 0.85);
  ctx.quadraticCurveTo(-r, r * 0.6, -r, 0);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r - lw, Math.PI * 1.1, Math.PI * 1.45);
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = Math.max(0.6, lw * 0.7);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.38 + face * r * 0.06, r * 0.12, r * 0.28, r * 0.33, 0.15, 0, Math.PI * 2);
  ctx.moveTo(r * 0.66 + face * r * 0.06, r * 0.12);
  ctx.ellipse(r * 0.38 + face * r * 0.06, r * 0.12, r * 0.28, r * 0.33, -0.15, 0, Math.PI * 2);
  ctx.moveTo(0, r * 0.5);
  ctx.lineTo(-r * 0.1, r * 0.68);
  ctx.lineTo(r * 0.1, r * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * r * 0.18, r * 0.85);
    ctx.lineTo(i * r * 0.18, r * 1.08);
  }
  ctx.lineWidth = Math.max(0.6, lw * 0.6);
  ctx.stroke();
  ctx.restore();
  // Two bony hands gripping the rim, long fingers hooked over it
  if (up > 0.3) {
    const g = smooth(0.3, 0.6, up);
    ctx.beginPath();
    fingers(ctx, x - size * 0.34, rimY + (1 - g) * size * 0.15, size, -1, drum, seed);
    fingers(ctx, x + size * 0.34, rimY + (1 - g) * size * 0.15, size, 1, drum, seed + 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, size * 0.035) + lw * 1.6;
    ctx.stroke();
    ctx.strokeStyle = BONE_SHADE;
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.stroke();
  }
}


/** The box of the peeker's drawing at progress k (including what its rim will hide below rimY). */
export function peekerBox(x: number, rimY: number, size: number, k: number): Readonly<typeof BOX> {
  const up = smooth(0, 0.23, k) * (1 - smooth(0.82, 1, k));
  BOX.x0 = x - size * 0.62;
  BOX.x1 = x + size * 0.62;
  BOX.y0 = rimY - size * (0.16 + 0.48 * up);
  BOX.y1 = rimY + size * 1.25;
  return BOX;
}

// ---------------------------------------------------------------- the ghostly carriage

/** Length (horse and carriage) in u at k = 1. */
export const CARRIAGE_LEN = 0.16;

function wheel(ctx: Ctx, cx: number, cy: number, r: number, t: number, d: number): void {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  for (let i = 0; i < 4; i++) {
    const a = t * 6 * d + (i * Math.PI) / 4;
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
  }
}

/**
 * The ghostly carriage at (x, y) (the road under its middle), `size` px long, rolling toward `dir`:
 * a translucent ghost-green coach on spoked wheels with two green lanterns, a hunched coachman in a
 * top hat, and a skeletal horse in front, all at opacity `vis`.
 */
export function carriage(ctx: Ctx, x: number, y: number, size: number, dir: -1 | 1, t: number, vis: number, lw: number): void {
  if (vis <= 0.01) return;
  const s = size;
  const d = dir;
  const X = x;
  const bob = Math.sin(t * 9) * s * 0.01;
  ctx.save();
  ctx.globalAlpha = vis;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Wheels, turning
  ctx.beginPath();
  wheel(ctx, X - d * s * 0.38, y - s * 0.12, s * 0.12, t, d);
  wheel(ctx, X - d * s * 0.08, y - s * 0.09, s * 0.09, t * 1.3, d);
  ctx.strokeStyle = CARRIAGE_BODY;
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.stroke();
  // The coach: a curved box with a roof and a window, the coachman's bench in front
  ctx.beginPath();
  ctx.moveTo(X - d * s * 0.5, y - s * 0.2 + bob);
  ctx.quadraticCurveTo(X - d * s * 0.52, y - s * 0.44 + bob, X - d * s * 0.4, y - s * 0.46 + bob);
  ctx.lineTo(X - d * s * 0.1, y - s * 0.46 + bob);
  ctx.quadraticCurveTo(X + d * s * 0.0, y - s * 0.44 + bob, X - d * s * 0.02, y - s * 0.2 + bob);
  ctx.quadraticCurveTo(X - d * s * 0.26, y - s * 0.14 + bob, X - d * s * 0.5, y - s * 0.2 + bob);
  ctx.closePath();
  ctx.rect(d > 0 ? X - s * 0.02 : X - s * 0.12, y - s * 0.3 + bob, s * 0.14, s * 0.03);
  ctx.fillStyle = CARRIAGE_BODY;
  ctx.fill();
  ctx.strokeStyle = CARRIAGE_LIGHT;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(X - d * s * 0.36 - (d > 0 ? 0 : s * 0.14), y - s * 0.4 + bob, s * 0.14, s * 0.12);
  ctx.fillStyle = CARRIAGE_LIGHT;
  ctx.fill();
  // The hunched coachman in a top hat, the reins
  ctx.beginPath();
  ctx.moveTo(X + d * s * 0.0, y - s * 0.3 + bob);
  ctx.quadraticCurveTo(X - d * s * 0.04, y - s * 0.46 + bob, X + d * s * 0.04, y - s * 0.5 + bob);
  ctx.lineTo(X + d * s * 0.08, y - s * 0.44 + bob);
  ctx.lineTo(X + d * s * 0.07, y - s * 0.3 + bob);
  ctx.closePath();
  ctx.rect(X + d * s * 0.035 - s * 0.03, y - s * 0.62 + bob, s * 0.06, s * 0.1);
  ctx.rect(X + d * s * 0.035 - s * 0.05, y - s * 0.53 + bob, s * 0.1, s * 0.015);
  ctx.fillStyle = CARRIAGE_BODY;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X + d * s * 0.07, y - s * 0.38 + bob);
  ctx.lineTo(X + d * s * 0.36, y - s * 0.3);
  ctx.strokeStyle = CARRIAGE_LIGHT;
  ctx.lineWidth = Math.max(0.6, lw * 0.4);
  ctx.stroke();
  // Two green lanterns, glowing
  for (let pass = 0; pass < 2; pass++) {
    const r = pass ? s * 0.018 : s * 0.05;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const cx = X - d * s * (i ? 0.52 : 0.0);
      ctx.moveTo(cx + r, y - s * 0.42);
      ctx.arc(cx, y - s * 0.42, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = pass ? GHOST_GREEN : GREEN_HALO;
    ctx.fill();
  }
  // The skeletal horse, trotting: skull, spine, ribs, thin legs
  const gait = t * 9;
  ctx.globalAlpha = vis * 0.6;
  ctx.beginPath();
  const hx0 = X + d * s * 0.2;
  const hx1 = X + d * s * 0.4;
  const hy = y - s * 0.25 + Math.abs(Math.sin(gait)) * s * 0.01;
  ctx.moveTo(hx0, hy);
  ctx.lineTo(hx1, hy - s * 0.01);
  ctx.lineTo(X + d * s * 0.47, hy - s * 0.14);
  for (let i = 0; i < 2; i++) {
    const ph = gait + i * Math.PI;
    for (let j = 0; j < 2; j++) {
      const lx = j ? hx1 - d * s * 0.02 : hx0 + d * s * 0.02;
      ctx.moveTo(lx, hy);
      ctx.lineTo(lx + d * Math.sin(ph) * s * 0.04, hy + s * 0.12);
      ctx.lineTo(lx + d * Math.sin(ph) * s * 0.02, y);
    }
  }
  for (let i = 0; i < 3; i++) {
    const rx = hx0 + d * s * (0.05 + i * 0.045);
    ctx.moveTo(rx, hy);
    ctx.quadraticCurveTo(rx + d * s * 0.02, hy + s * 0.06, rx - d * s * 0.01, hy + s * 0.09);
  }
  ctx.strokeStyle = GHOST_GREEN;
  ctx.lineWidth = Math.max(0.8, s * 0.016);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X + d * s * 0.5, hy - s * 0.15, s * 0.045, s * 0.025, d * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = GHOST_GREEN;
  ctx.fill();
  ctx.restore();
}

/** The carriage's box at (x, y), whichever way it faces. */
export function carriageBox(x: number, y: number, size: number): Readonly<typeof BOX> {
  BOX.x0 = x - size * 0.6 - 2;
  BOX.x1 = x + size * 0.6 + 2;
  BOX.y0 = y - size * 0.64 - 2;
  BOX.y1 = y + size * 0.02 + 2;
  return BOX;
}

// ---------------------------------------------------------------- the shadow across the moon

/** Where the shadow's middle is over the moon at progress k (a shallow arc, left to right). */
const SH = { x: 0, y: 0 };
function shadowSpot(mx: number, my: number, mr: number, k: number): typeof SH {
  SH.x = mx + (k * 2 - 1) * mr * 1.95;
  SH.y = my + mr * 0.12 - Math.sin(k * Math.PI) * mr * 0.3;
  return SH;
}

function witch(ctx: Ctx, x: number, y: number, r: number, t: number): void {
  // Broom: the handle, then the bristles fanned behind, a cat crouched on them
  const L = r * 1.7;
  ctx.moveTo(x + L * 0.5, y - r * 0.06);
  ctx.lineTo(x + L * 0.5, y - r * 0.02);
  ctx.lineTo(x - L * 0.25, y + r * 0.06);
  ctx.lineTo(x - L * 0.25, y + r * 0.02);
  ctx.closePath();
  ctx.moveTo(x - L * 0.22, y + r * 0.02);
  ctx.lineTo(x - L * 0.5, y - r * 0.1);
  ctx.lineTo(x - L * 0.46, y + r * 0.06);
  ctx.lineTo(x - L * 0.52, y + r * 0.16);
  ctx.lineTo(x - L * 0.22, y + r * 0.08);
  ctx.closePath();
  // The cat on the bristles, tail up and curling
  const cx = x - L * 0.36;
  ctx.moveTo(cx - r * 0.09, y);
  ctx.quadraticCurveTo(cx - r * 0.06, y - r * 0.14, cx + r * 0.04, y - r * 0.12);
  ctx.lineTo(cx + r * 0.06, y - r * 0.2);
  ctx.lineTo(cx + r * 0.08, y - r * 0.13);
  ctx.lineTo(cx + r * 0.11, y - r * 0.2);
  ctx.lineTo(cx + r * 0.12, y - r * 0.09);
  ctx.quadraticCurveTo(cx + r * 0.1, y, cx + r * 0.06, y);
  ctx.closePath();
  ctx.moveTo(cx - r * 0.08, y - r * 0.04);
  ctx.quadraticCurveTo(cx - r * 0.2, y - r * 0.12, cx - r * 0.16, y - r * 0.26);
  ctx.quadraticCurveTo(cx - r * 0.12, y - r * 0.32, cx - r * 0.1, y - r * 0.26);
  ctx.quadraticCurveTo(cx - r * 0.14, y - r * 0.12, cx - r * 0.06, y - r * 0.06);
  ctx.closePath();
  // The witch, seated, leaning into the flight: skirt, body, arm on the handle, hooked nose, hat
  const wx = x + L * 0.1;
  const flap = Math.sin(t * 9) * r * 0.04;
  ctx.moveTo(wx - r * 0.2, y);
  ctx.lineTo(wx + r * 0.16, y);
  ctx.lineTo(wx + r * 0.12, y - r * 0.18);
  ctx.lineTo(wx + r * 0.24, y - r * 0.06);
  ctx.lineTo(wx + r * 0.28, y - r * 0.1);
  ctx.lineTo(wx + r * 0.1, y - r * 0.3);
  ctx.lineTo(wx + r * 0.06, y - r * 0.38);
  ctx.lineTo(wx + r * 0.16, y - r * 0.4);
  ctx.lineTo(wx + r * 0.06, y - r * 0.45);
  ctx.lineTo(wx + r * 0.0, y - r * 0.48);
  // The hat, its tip curling back
  ctx.lineTo(wx + r * 0.1, y - r * 0.5);
  ctx.lineTo(wx - r * 0.18, y - r * 0.52);
  ctx.lineTo(wx - r * 0.02, y - r * 0.56);
  ctx.quadraticCurveTo(wx - r * 0.12, y - r * 0.82, wx - r * 0.3, y - r * 0.84);
  ctx.quadraticCurveTo(wx - r * 0.38, y - r * 0.78, wx - r * 0.3, y - r * 0.74);
  ctx.quadraticCurveTo(wx - r * 0.2, y - r * 0.72, wx - r * 0.12, y - r * 0.5);
  // The cape streaming back in points
  ctx.lineTo(wx - r * 0.14, y - r * 0.38);
  ctx.lineTo(wx - r * 0.5, y - r * 0.32 + flap);
  ctx.lineTo(wx - r * 0.38, y - r * 0.24 + flap);
  ctx.lineTo(wx - r * 0.56, y - r * 0.16 + flap);
  ctx.lineTo(wx - r * 0.36, y - r * 0.12);
  ctx.lineTo(wx - r * 0.2, y - r * 0.12);
  ctx.closePath();
}

/** The great bat's wing, shoulder to tip and back along its spiky trailing edge. */
const GB_X = [0.5, 1.0, 0.86, 0.74, 0.6, 0.46, 0.3, 0.08] as const;
const GB_Y = [-0.24, -0.08, 0.14, 0.03, 0.22, 0.07, 0.18, 0.1] as const;

function greatBat(ctx: Ctx, x: number, y: number, r: number, k: number): void {
  // Wingspan 1.3 x the moon's diameter, two slow wingbeats as it crosses
  const s = r * 1.3;
  const L = Math.sin(k * Math.PI * 4) * 0.8;
  ctx.moveTo(x - s * 0.05, y - s * 0.08);
  ctx.lineTo(x - s * 0.09, y - s * 0.24);
  ctx.lineTo(x - s * 0.02, y - s * 0.13);
  ctx.lineTo(x + s * 0.02, y - s * 0.13);
  ctx.lineTo(x + s * 0.09, y - s * 0.24);
  ctx.lineTo(x + s * 0.05, y - s * 0.08);
  for (let i = 0; i < GB_X.length; i++) ctx.lineTo(x + s * GB_X[i]!, y + s * (GB_Y[i]! - L * GB_X[i]! * 0.36));
  ctx.lineTo(x, y + s * 0.26);
  for (let i = GB_X.length - 1; i >= 0; i--) ctx.lineTo(x - s * GB_X[i]!, y + s * (GB_Y[i]! - L * GB_X[i]! * 0.36));
  ctx.closePath();
}

/**
 * The great shadow crossing the moon (center mx, my, radius mr) at progress k: a witch on her
 * broom (variant 0) or a great bat (1), a flat silhouette seen only against the moon's face. With
 * `clipX`, it fades out before it reaches that line (to keep a column clear).
 */
export function moonShadow(ctx: Ctx, mx: number, my: number, mr: number, k: number, variant: number, t: number, clipX = Infinity): void {
  const p = shadowSpot(mx, my, mr, k);
  const a = clipX < Infinity ? 1 - smooth(clipX - mr * 1.1, clipX - mr * 0.2, p.x) : 1;
  if (a <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.clip();
  if (clipX < mx + mr) {
    ctx.beginPath();
    ctx.rect(mx - mr - 1, my - mr - 1, Math.max(0, clipX - (mx - mr - 1)), mr * 2 + 2);
    ctx.clip();
  }
  ctx.globalAlpha = a;
  ctx.beginPath();
  if (variant === 1) greatBat(ctx, p.x, p.y, mr, k);
  else witch(ctx, p.x, p.y, mr, t);
  ctx.fillStyle = SILHOUETTE;
  ctx.fill();
  ctx.restore();
}

/** The box the moon's shadow covers at progress k: its silhouette's, cut to the moon's disc (it is seen only there). */
export function moonShadowBox(mx: number, my: number, mr: number, k: number, variant: number): Readonly<typeof BOX> {
  const p = shadowSpot(mx, my, mr, k);
  const bat = variant === 1;
  BOX.x0 = Math.max(mx - mr, p.x - mr * (bat ? 1.32 : 0.92)) - 1;
  BOX.x1 = Math.min(mx + mr, p.x + mr * (bat ? 1.32 : 0.88)) + 1;
  BOX.y0 = Math.max(my - mr, p.y - mr * (bat ? 0.9 : 0.86)) - 1;
  BOX.y1 = Math.min(my + mr, p.y + mr * (bat ? 0.5 : 0.2)) + 1;
  return BOX;
}

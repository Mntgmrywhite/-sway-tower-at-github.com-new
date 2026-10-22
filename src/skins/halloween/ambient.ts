import { circle, hash, ink, type Ctx } from "../../base/draw";
import { BONE, INK, IRON, LAMP, LAMP_CORE, ORANGE, PURPLE, PURPLE_DARK } from "./common";

// The little things that keep the town alive while nobody is looking, and the clocks they run on.
// Nothing here is ever in lockstep: each prop has its own rhythm, and the things that come to life
// now and then (a jack-o'-lantern changing its face, a window going dark, a drop of wax running
// down a candle) do it on a beat: hashed intervals between a least and a most, from a first moment
// in the opening, the same every time for the same seed (no Math.random, no clock but the scene's).
// The props: a hanging sign that swings on its bracket, a birdcage rocking on its hook, a strip of
// torn fabric streaming from a window. A new floor landing on the tower jolts them (sinceLand).

// ---------------------------------------------------------------- beats

/** Scratch result of `beat`: seconds since the last event (Infinity before the first) and its number. */
const BEAT = { since: Infinity, k: -1 };

/** When event k of a beat comes (seconds): the first at `first`, then a jittered grid whose gaps stay within min..max. */
export function beatTime(k: number, first: number, min: number, max: number, seed: number): number {
  return k <= 0 ? first : first + k * ((min + max) / 2) + (hash(k * 97 + seed * 131 + 7) - 0.5) * (max - min) / 2;
}

/**
 * Events on a hashed beat: the first at `first` seconds, then each `min` to `max` seconds after the
 * one before (a jittered grid: a gap never leaves that range), different for every `seed`. Which
 * event was last at time t, and how long ago. O(1), pure.
 */
export function beat(t: number, first: number, min: number, max: number, seed: number): typeof BEAT {
  BEAT.since = Infinity;
  BEAT.k = -1;
  if (t < first) return BEAT;
  let k = Math.max(0, Math.floor((t - first) / ((min + max) / 2)));
  while (k > 0 && beatTime(k, first, min, max, seed) > t) k--;
  while (beatTime(k + 1, first, min, max, seed) <= t) k++;
  BEAT.since = t - beatTime(k, first, min, max, seed);
  BEAT.k = k;
  return BEAT;
}

/** A damped jolt `dt` seconds after a new floor landed: amplitude a, decay tau (s), rate w (rad/s); a third with reduce motion. */
export function jolt(dt: number, a: number, tau: number, w: number, still: boolean): number {
  if (!(dt >= 0) || dt > tau * 6) return 0;
  return a * (still ? 1 / 3 : 1) * Math.exp(-dt / tau) * Math.sin(w * dt);
}

/** A swing on a hook: a steady rock, gusts now and then (stronger for a few seconds), and the landing's jolt. */
export function swing(t: number, period: number, amp: number, seed: number, sinceLand: number, kick: number, still: boolean): number {
  const g = beat(t, 3 + hash(seed + 5) * 6, 9, 21, seed);
  const gust = g.since < 4 ? Math.sin((g.since / 4) * Math.PI) * 0.8 : 0;
  const k = still ? 0.5 : 1;
  return amp * k * (1 + gust) * Math.sin((t * Math.PI * 2) / period + seed) + jolt(sinceLand, kick, 0.6, 7.8, still);
}

/** A lit window's flicker: full, dimming to 55% for a moment every 5 to 14 s. */
export function flicker(t: number, seed: number): number {
  const b = beat(t, 1 + hash(seed) * 5, 5, 14, seed + 300);
  const len = 0.08 + hash(b.k + seed * 7) * 0.12;
  return b.since < len ? 0.55 : 1;
}

/** Whether a lit window has gone dark for a while (2 to 6 s, every 20 to 40 s; the first at `first`). */
export function lightsOut(t: number, seed: number, first: number): boolean {
  const b = beat(t, first, 20, 40, seed + 500);
  return b.since < 2 + hash(b.k * 3 + seed) * 4;
}

// ---------------------------------------------------------------- jack-o'-lantern faces

/** The faces a jack-o'-lantern pulls: a grin, a toothy grin, an O ("boo"), a wink, a silly frown. */
export const FACES = 5;
export const FACE = { grin: 0, toothy: 1, boo: 2, wink: 3, frown: 4 } as const;
/** How long a blink takes; the face changes as its eyes are shut. */
export const BLINK = 0.12;

/** Scratch: a jack's face now and how far its eyes are shut (0..1). */
const JF = { face: 0, blink: 0 };

/** Each jack's run of faces, memoized forward (a face depends on the one before): seed -> [k, face]. */
const RUNS = new Map<number, [number, number]>();

/** The face after change k of a jack (k 0 is its first face): each change steps to a different face. */
export function faceAfter(k: number, seed: number, firstFace: number): number {
  if (k < 0) return FACE.grin;
  let run = RUNS.get(seed);
  if (!run || run[0] > k) {
    run = [0, firstFace];
    RUNS.set(seed, run);
  }
  while (run[0] < k) {
    run[0]++;
    run[1] = (run[1] + 1 + Math.floor(hash(run[0] * 41 + seed * 7 + 3) * (FACES - 1))) % FACES;
  }
  return run[1];
}

/**
 * A jack-o'-lantern that blinks and pulls a new face on a beat (first at `first`, then every `min`
 * to `max` s), never the same face twice running; it grins until its first change, and `firstFace`
 * is the face it pulls then. The face changes while its eyes are shut.
 */
export function jackFace(t: number, first: number, min: number, max: number, seed: number, firstFace: number): typeof JF {
  const b = beat(t, first, min, max, seed);
  const since = b.since;
  const k = b.k;
  if (since < BLINK) {
    const closing = since < BLINK / 2;
    JF.blink = closing ? since / (BLINK / 2) : 1 - (since - BLINK / 2) / (BLINK / 2);
    JF.face = closing ? faceAfter(k - 1, seed, firstFace) : faceAfter(k, seed, firstFace);
    return JF;
  }
  JF.blink = 0;
  JF.face = faceAfter(k, seed, firstFace);
  return JF;
}

// ---------------------------------------------------------------- the hanging sign

const WRAP_A = ORANGE;
const WRAP_B = "#f3e6c8";
const WRAP_SHADE = "#c96a1c";

/**
 * The sweet shop's sign: a big wrapped sweet (striped orange and cream, twisted wrapper ends)
 * hanging on two chains from an iron bracket that curls into a spiral. The bracket reaches from the
 * wall at (wx, y) out to (x, y); the sign hangs `size` below it, swung by `angle` (rad) about the hook.
 */
export function sweetSign(ctx: Ctx, wx: number, x: number, y: number, size: number, angle: number, lw: number): void {
  // The bracket: an iron arm with a scroll under it.
  const dir = Math.sign(x - wx) || 1;
  ctx.beginPath();
  ctx.moveTo(wx, y);
  ctx.lineTo(x + dir * size * 0.08, y);
  ctx.moveTo(wx, y + size * 0.32);
  ctx.quadraticCurveTo(wx + (x - wx) * 0.3, y + size * 0.05, wx + (x - wx) * 0.62, y + size * 0.02);
  const cr = size * 0.09;
  ctx.moveTo(wx + (x - wx) * 0.45 + cr, y + size * 0.13);
  ctx.arc(wx + (x - wx) * 0.45, y + size * 0.13, cr, 0, Math.PI * 1.6);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1.2, lw);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = size * 0.9;
  const h = size * 0.44;
  const cy = size * 0.42;
  // Chains.
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, cy - h / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(w * 0.28, cy - h / 2);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  // Wrapper ends: twisted fans either side.
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(side * w * 0.42, cy);
    ctx.lineTo(side * w * 0.66, cy - h * 0.52);
    ctx.lineTo(side * w * 0.6, cy - h * 0.12);
    ctx.lineTo(side * w * 0.72, cy + h * 0.06);
    ctx.lineTo(side * w * 0.6, cy + h * 0.2);
    ctx.lineTo(side * w * 0.66, cy + h * 0.52);
    ctx.closePath();
  }
  ctx.fillStyle = PURPLE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // The sweet: an orange oval with curved cream stripes and a shaded underside (no clip: every
  // shape kept inside the oval).
  const rx = w * 0.44;
  const ry = h / 2;
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = WRAP_A;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, cy + ry * 0.12, rx * 0.94, ry * 0.86, 0, 0.15, Math.PI - 0.15);
  ctx.closePath();
  ctx.fillStyle = WRAP_SHADE;
  ctx.fill();
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    const x0 = i * rx * 0.55;
    const half = ry * Math.sqrt(Math.max(0, 1 - ((Math.abs(x0) + rx * 0.24) / rx) ** 2)) * 0.95;
    ctx.moveTo(x0 - rx * 0.1, cy + half);
    ctx.quadraticCurveTo(x0 + rx * 0.1, cy, x0 + rx * 0.06, cy - half);
    ctx.lineTo(x0 + rx * 0.2, cy - half * 0.9);
    ctx.quadraticCurveTo(x0 + rx * 0.24, cy, x0 + rx * 0.04, cy + half * 0.95);
    ctx.closePath();
  }
  ctx.fillStyle = WRAP_B;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ink(ctx, lw, INK);
  ctx.restore();
}

/** How far the sign reaches from its hook, in its size (for boxes): sideways and down. */
export const SIGN_REACH = { x: 0.68, y: 0.7 };

// ---------------------------------------------------------------- the birdcage

/**
 * A birdcage hanging from a hook at (x, y) on a short chain, rocking by `angle`: a domed iron cage
 * `size` tall with a ring on top. `front` false draws its back (the floor, the far bars, the dark
 * inside); true its near bars and rims, over whatever lives in it.
 */
export function cage(ctx: Ctx, x: number, y: number, size: number, angle: number, lw: number, front: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = size * 0.56;
  const top = size * 0.28;
  const foot = size;
  if (!front) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, foot);
    ctx.lineTo(-w / 2, top + w * 0.3);
    ctx.quadraticCurveTo(-w / 2, top - w * 0.05, 0, top - w * 0.12);
    ctx.quadraticCurveTo(w / 2, top - w * 0.05, w / 2, top + w * 0.3);
    ctx.lineTo(w / 2, foot);
    ctx.closePath();
    ctx.fillStyle = "rgba(14, 10, 22, 0.35)";
    ctx.fill();
    ctx.beginPath();
    for (let i = 1; i < 6; i += 2) {
      const bx = -w / 2 + (w * i) / 6;
      ctx.moveTo(bx, foot);
      ctx.lineTo(bx, top);
    }
    ctx.strokeStyle = "#3a2f52";
    ctx.lineWidth = Math.max(0.7, lw * 0.5);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Chain and ring.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, top - w * 0.24);
  ctx.moveTo(size * 0.06, top - w * 0.2);
  ctx.arc(0, top - w * 0.2, size * 0.06, 0, Math.PI * 2);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.75);
  ctx.stroke();
  // Near bars, the dome's ribs, rims and the tray: iron, lit along by the moon.
  ctx.beginPath();
  for (let i = 0; i <= 6; i += 2) {
    const bx = -w / 2 + (w * i) / 6;
    ctx.moveTo(bx, foot);
    ctx.lineTo(bx, top + w * 0.3 * (1 - Math.abs(i - 3) / 3));
  }
  ctx.moveTo(-w / 2, top + w * 0.3);
  ctx.quadraticCurveTo(-w / 2, top - w * 0.05, 0, top - w * 0.12);
  ctx.quadraticCurveTo(w / 2, top - w * 0.05, w / 2, top + w * 0.3);
  ctx.moveTo(-w * 0.52, top + w * 0.32);
  ctx.lineTo(w * 0.52, top + w * 0.32);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1.2, lw * 0.95);
  ctx.stroke();
  ctx.strokeStyle = CAGE_LIT;
  ctx.lineWidth = Math.max(0.6, lw * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, foot);
  ctx.lineTo(w * 0.6, foot);
  ctx.lineTo(w * 0.5, foot + size * 0.07);
  ctx.lineTo(-w * 0.5, foot + size * 0.07);
  ctx.closePath();
  ctx.fillStyle = "#2a2240";
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.restore();
}

const CAGE_LIT = "#8a82b0";

/** The cage's reach from its hook, in its size: sideways and down (tray included). */
export const CAGE_REACH = { x: 0.34, y: 1.08 };

// ---------------------------------------------------------------- fabric

/**
 * A strip of torn fabric streaming from (x, y) toward `dir` (-1 left, 1 right): `len` long and `w`
 * wide, rippling at `rate` Hz, its tattered end in three tongues. One fill and a thin ink.
 */
export function fabric(ctx: Ctx, t: number, x: number, y: number, len: number, w: number, dir: number, rate: number, color: string, lw: number): void {
  const n = 8;
  const ph = t * rate * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const wave = Math.sin(ph - f * 5) * w * 0.7 * f;
    ctx.lineTo(x + dir * len * f, y + wave + f * w * 0.6);
  }
  // The tattered end: three tongues back to the lower edge.
  const ex = x + dir * len;
  const ey = y + Math.sin(ph - 5) * w * 0.7 + w * 0.6;
  ctx.lineTo(ex - dir * len * 0.08, ey + w * 0.35);
  ctx.lineTo(ex + dir * len * 0.02, ey + w * 0.55);
  ctx.lineTo(ex - dir * len * 0.12, ey + w * 0.8);
  ctx.lineTo(ex - dir * len * 0.04, ey + w * 1.05);
  for (let i = n - 1; i >= 0; i--) {
    const f = i / n;
    const wave = Math.sin(ph - f * 5) * w * 0.7 * f;
    ctx.lineTo(x + dir * len * f, y + wave + f * w * 0.6 + w * (1 - f * 0.3));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, Math.max(0.6, lw * 0.5), INK);
}

// ---------------------------------------------------------------- candles

/**
 * A drop of wax running down a candle: 0 none, else 0..1 its way down (it runs over 1.2 s, then
 * hangs there as a drip). Every 3 to 7 s; the first at `first`.
 */
export function waxDrip(t: number, first: number, seed: number): number {
  const b = beat(t, first, 3, 7, seed + 900);
  if (b.since === Infinity) return 0;
  return Math.min(1, b.since / 1.2);
}

/**
 * Candles standing on a line y, given as triples in `c` (x, height, how far a drop of wax has run
 * down 0..1), all in one go: their bodies (and drips) in one fill and one ink, the flames
 * (flickering, each out of step) in one fill, their hearts in another.
 */
export function candles(ctx: Ctx, t: number, c: Float64Array, y: number, lw: number): void {
  ctx.beginPath();
  for (let i = 0; i < c.length; i += 3) {
    const x = c[i]!;
    const h = c[i + 1]!;
    const drip = c[i + 2]!;
    const w = h * 0.34;
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2, y - h);
    ctx.quadraticCurveTo(x - w * 0.2, y - h * 1.06, x, y - h * 0.98);
    ctx.quadraticCurveTo(x + w * 0.25, y - h * 1.06, x + w / 2, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    if (drip > 0) {
      // A drop of wax running down its lit side.
      const dy = y - h + h * 0.8 * drip;
      ctx.moveTo(x - w / 2, y - h * 0.98);
      ctx.lineTo(x - w * 0.18, y - h * 0.98);
      ctx.lineTo(x - w * 0.22, dy);
      ctx.lineTo(x - w * 0.5, dy + w * 0.1);
      ctx.closePath();
      circle(ctx, x - w * 0.32, dy, w * 0.14);
    }
  }
  ctx.fillStyle = BONE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (let i = 0; i < c.length; i += 3) {
    const x = c[i]!;
    const h = c[i + 1]!;
    const w = h * 0.34;
    const fl = 0.85 + 0.15 * Math.sin(t * 11 + i) * Math.sin(t * 6.3 + i * 2);
    ctx.moveTo(x, y - h - h * 0.55 * fl);
    ctx.quadraticCurveTo(x + w * 0.42, y - h - h * 0.18, x, y - h - h * 0.02);
    ctx.quadraticCurveTo(x - w * 0.42, y - h - h * 0.18, x, y - h - h * 0.55 * fl);
    ctx.closePath();
  }
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < c.length; i += 3) {
    const h = c[i + 1]!;
    ctx.rect(c[i]! - h * 0.04, y - h * 1.2, h * 0.08, h * 0.08);
  }
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
}

/** Purple-dark and orange: the bunting's two colors (for props that want them). */
export const BUNTING = [ORANGE, PURPLE, PURPLE_DARK] as const;

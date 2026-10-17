import { BLOCK_HEIGHT } from "../config";
import { swayOffset, type GameState } from "../game";
import { hash, type Ctx } from "../base/draw";
import type { StyleKit } from "../base/style";
import type { Falling } from "./falling";

// The end of a run, in both modes: the miss that takes the last life sends the top of the tower over
// and blows it up. The top section (TOPPLE_BARS bars, or every bar above the base on a shorter
// tower; the base alone on a bare one) swings over toward the side the missed bar fell, about its
// bottom corner on that side, faster and faster. BLAST_AT later it blows up while still falling: a
// flash and a burst, smoke and sparks, and its bars break into chunks (some stay whole) that fly
// out toward that side and up, spinning and tumbling under gravity, while the scene shakes. What
// was still falling (the missed bar) is thrown along with it. Everything has left the screen or
// faded by TOPPLE_TIME, when the game-over card comes.
//
// Renderer-only: the game just ends (phase "over") and stands still. Deterministic from the state,
// the side and the dt it is fed; after the blast everything is a closed-form function of the age
// (nothing is integrated), so it plays the same at any frame rate. The style kit draws it
// (StyleKit.blast, src/fx/blast.ts): the renderer never branches on style.

/** Seconds from the last miss to the game-over card. */
export const TOPPLE_TIME = 1.3;
/** Seconds from the last miss to the blast: the top section has swung about a third of the way over. */
export const BLAST_AT = 0.5;
/** The section that topples: this many bars from the top. */
export const TOPPLE_BARS = 8;
/** Angular acceleration of the swinging section, rad/s²: it starts slow and gathers speed (33° by the blast). */
const TIP_ACCEL = 4.6;

/** Gravity on the chunks, world units/s²: heavier than a sliced sliver's, they are thrown hard. */
const DEBRIS_GRAVITY = 300;
/** Each chunk is thrown toward the toppling side at AWAY_MIN..AWAY_MIN + AWAY_SPREAD units/s... */
const AWAY_MIN = 100;
const AWAY_SPREAD = 90;
/** ...and up at UP_MIN..UP_MIN + UP_SPREAD units/s... */
const UP_MIN = 70;
const UP_SPREAD = 90;
/** ...plus this much outward from the blast's center (units/s, at its rim)... */
const RADIAL = 35;
/** ...plus this share of the speed the swing gave it. */
const INHERIT = 0.45;
/** However the swing and the blast add up, a chunk leaves toward the toppling side at least this fast, units/s. */
const AWAY_LEAST = 55;
/** Chunks spin at SPIN_MIN..SPIN_MIN + SPIN_SPREAD rad/s, mostly the way the section tipped. */
const SPIN_MIN = 3;
const SPIN_SPREAD = 7;
/** A bar breaks into 1..MAX_PIECES chunks; each keeps this share of its slot, so the breaks read. */
const MAX_PIECES = 3;
const PIECE_FILL = 0.9;
/** Chunks still on screen fade out over the last this many seconds before the card. */
export const DEBRIS_FADE = 0.25;

/** The blast's radius, world units: half the toppling section's height, within these bounds. */
const BLAST_MIN_R = 16;
const BLAST_MAX_R = 32;
/** The burst pops up this big (in blast radii) and is gone after BURST_LIFE seconds. */
const BURST_SIZE = 1.25;
const BURST_LIFE = 0.34;
/** The flash over the scene: this bright at the blast, gone after FLASH_LIFE seconds. */
const FLASH_ALPHA = 0.7;
const FLASH_LIFE = 0.2;
/** The scene (not the HUD) shakes for SHAKE_TIME seconds, at most SHAKE of the size unit u either way. */
const SHAKE_TIME = 0.35;
const SHAKE = 0.016;

/** Smoke: this many puffs, thrown out and slowed by drag (per second), rising; each swells by PUFF_GROW, then shrinks away. */
const PUFFS = 10;
const PUFF_DRAG = 3.2;
const PUFF_RISE = 14;
const PUFF_GROW = 0.3;
/** Sparks: this many, at SPARK_SPEED..+SPARK_SPREAD units/s, falling at SPARK_GRAVITY, drawn as streaks SPARK_TRAIL seconds long. */
const SPARKS = 16;
const SPARK_SPEED = 170;
const SPARK_SPREAD = 150;
const SPARK_GRAVITY = 200;
const SPARK_TRAIL = 0.04;

interface SlabBar {
  /** Center offset from the pivot as drawn at the miss, world units (y up). */
  dx: number;
  dy: number;
  w: number;
  level: number;
}

/** A piece thrown by the blast: where and when it was let go, and how fast; poses come from its age. */
interface Chunk {
  /** Age of the topple when it was let go (the blast, or later for what fell into it). */
  t0: number;
  /** Center at t0, world units (y up), and velocity, units/s (y up). */
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  w: number;
  level: number;
  /** Screen rotation at t0 (clockwise positive) and its rate. */
  a0: number;
  spin: number;
}

interface Puff {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** Radius when fully out, world units. */
  r0: number;
  /** Seconds after the blast it appears, and how long it lasts. */
  born: number;
  life: number;
  /** 0 shade, 1 body, 2 light. */
  tone: 0 | 1 | 2;
}

interface Spark {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Topple {
  /** The lowest bar of the toppling section, and the side it goes over to. */
  level: number;
  dir: -1 | 1;
  /** The bottom corner it swings about, world units (y up). */
  px: number;
  py: number;
  /** Seconds since the last miss. */
  age: number;
  /** The section, top bar first, as drawn at the miss: it swings as one piece until the blast. */
  bars: SlabBar[];
  /** The blast's center and radius, world units; null until it goes off. */
  blast: { x: number; y: number; r: number } | null;
  chunks: Chunk[];
  puffs: Puff[];
  sparks: Spark[];
}

/** A bar off the tower, posed for drawing: center (world units), width, rotation, opacity. */
export interface LoosePose {
  cx: number;
  cy: number;
  w: number;
  level: number;
  angle: number;
  alpha: number;
}

/** Which side a missed bar fell to: left (-1) or right (1) of the tower top's center `towerX` (world x). */
export function missSide(cut: { x: number; w: number }, towerX: number): -1 | 1 {
  return cut.x + cut.w / 2 < towerX ? -1 : 1;
}

/** The lowest bar of the section that topples off a tower of `count` bars (base included). */
export function breakLevel(count: number): number {
  return count > 1 ? Math.max(1, count - TOPPLE_BARS) : 0;
}

/**
 * Start the end: the top section, as it is drawn now (the sway stands still once the run is over),
 * goes over toward `dir` about its bottom corner on that side: where it meets the bar below (the
 * ground, for the base).
 */
export function startTopple(state: GameState, dir: -1 | 1): Topple {
  const n = state.blocks.length;
  const level = breakLevel(n);
  const drawn = (i: number) => state.blocks[i]!.x + swayOffset(state, i);
  const low = state.blocks[level]!;
  let px = dir > 0 ? drawn(level) + low.w : drawn(level);
  if (level > 0) {
    // The edge of the contact between the section and the bar below, on the toppling side.
    const below = state.blocks[level - 1]!;
    px = dir > 0 ? Math.min(px, drawn(level - 1) + below.w) : Math.max(px, drawn(level - 1));
  }
  const py = level * BLOCK_HEIGHT;
  const bars: SlabBar[] = [];
  for (let i = n - 1; i >= level; i--) {
    const b = state.blocks[i]!;
    bars.push({ dx: drawn(i) + b.w / 2 - px, dy: (i + 0.5) * BLOCK_HEIGHT - py, w: b.w, level: i });
  }
  return { level, dir, px, py, age: 0, bars, blast: null, chunks: [], puffs: [], sparks: [] };
}

/** True until the game-over card should show. */
export function toppling(t: Topple | null): boolean {
  return t !== null && t.age < TOPPLE_TIME;
}

/** The section's swing at `age`: angle (radians, >= 0) and its rate, held where it was at the blast. */
function swing(age: number): { theta: number; omega: number } {
  const a = Math.min(age, BLAST_AT);
  return { theta: 0.5 * TIP_ACCEL * a * a, omega: TIP_ACCEL * a };
}

/** A point of the section (offset dx, dy from the pivot as drawn) swung `theta` toward the toppling side. */
function swung(t: Topple, dx: number, dy: number, theta: number): { x: number; y: number } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: t.px + dx * c + t.dir * dy * s, y: t.py - t.dir * dx * s + dy * c };
}

/**
 * Age the topple by `dt`. The step that reaches BLAST_AT blows the section up (and throws what is
 * in `falling` along with it, emptying it): it returns true then, so main.ts can play the boom and
 * the heavy haptic with it. Otherwise false.
 */
export function stepTopple(t: Topple, dt: number, falling: Falling[]): boolean {
  const before = t.age;
  t.age += dt;
  if (before >= BLAST_AT || t.age < BLAST_AT) return false;
  explode(t, falling);
  return true;
}

/** Deterministic 0..1 noise for piece `i` of the bar at `level`, channel `k`. */
function noise(level: number, i: number, k: number): number {
  return hash(level * 131 + i * 17 + k * 7919 + 3);
}

/** The blast: the section breaks into chunks, and the smoke and sparks start. */
function explode(t: Topple, falling: Falling[]): void {
  const { theta, omega } = swing(BLAST_AT);
  const dir = t.dir;
  // Its center: the middle of the section (by width) where it has swung to.
  let sw = 0;
  let cx = 0;
  let cy = 0;
  for (const b of t.bars) {
    const p = swung(t, b.dx, b.dy, theta);
    cx += p.x * b.w;
    cy += p.y * b.w;
    sw += b.w;
  }
  cx /= sw;
  cy /= sw;
  const r = Math.min(BLAST_MAX_R, Math.max(BLAST_MIN_R, (t.bars.length * BLOCK_HEIGHT) / 2));
  t.blast = { x: cx, y: cy, r };

  /** Velocity a piece at (x, y) is thrown with (already moving at vx, vy), `near` 0..1 of the blast's full push. */
  const throwFrom = (x: number, y: number, vx: number, vy: number, near: number, seed: [number, number]) => {
    const away = AWAY_MIN + AWAY_SPREAD * noise(seed[0], seed[1], 1);
    const up = UP_MIN + UP_SPREAD * noise(seed[0], seed[1], 2);
    let tx = vx + (dir * away + (RADIAL * (x - cx)) / r) * near;
    const ty = vy + (up + (RADIAL * (y - cy)) / r) * near;
    if (tx * dir < AWAY_LEAST * near) tx = dir * AWAY_LEAST * near;
    const turn = SPIN_MIN + SPIN_SPREAD * noise(seed[0], seed[1], 3);
    const spin = dir * turn * (noise(seed[0], seed[1], 4) < 0.2 ? -1 : 1) * near;
    return { vx: tx, vy: ty, spin };
  };

  for (const b of t.bars) {
    const pieces = 1 + Math.floor(noise(b.level, 0, 5) * MAX_PIECES);
    const slot = b.w / pieces;
    for (let j = 0; j < pieces; j++) {
      const ox = -b.w / 2 + (j + 0.5) * slot;
      const dx = b.dx + ox;
      const p = swung(t, dx, b.dy, theta);
      // A point of the swinging section moves at omega times its arm, at right angles to it.
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const rvx = omega * (-dx * s + dir * b.dy * c);
      const rvy = omega * (-dir * dx * c - b.dy * s);
      const v = throwFrom(p.x, p.y, INHERIT * rvx, INHERIT * rvy, 1, [b.level, j + 1]);
      t.chunks.push({
        t0: BLAST_AT,
        x0: p.x,
        y0: p.y,
        vx: v.vx,
        vy: v.vy,
        w: pieces > 1 ? slot * PIECE_FILL : b.w,
        level: b.level,
        a0: dir * theta,
        spin: v.spin,
      });
    }
  }
  // What was still falling (the missed bar, any slivers) is thrown too, less the further it is.
  falling.forEach((f, i) => {
    const x = f.x + f.w / 2;
    const y = f.y + BLOCK_HEIGHT / 2;
    const near = 1 / (1 + (Math.hypot(x - cx, y - cy) / (2 * r)) ** 2);
    const v = throwFrom(x, y, f.vx, -f.vy, near, [f.level + 1000, i]);
    t.chunks.push({ t0: t.age, x0: x, y0: y, vx: v.vx, vy: v.vy, w: f.w, level: f.level, a0: f.angle, spin: f.spin + v.spin });
  });
  falling.length = 0;
  t.bars = [];

  const seed = t.level + 500;
  const room = TOPPLE_TIME - BLAST_AT - 0.02;
  for (let i = 0; i < PUFFS; i++) {
    const a = (2 * Math.PI * i) / PUFFS + noise(seed, i, 1) * 0.6;
    const d = r * (0.15 + 0.4 * noise(seed, i, 2));
    const speed = 30 + 40 * noise(seed, i, 3);
    const born = 0.02 + 0.1 * noise(seed, i, 4);
    t.puffs.push({
      x0: cx + Math.cos(a) * d,
      y0: cy + Math.sin(a) * d,
      vx: Math.cos(a) * speed + dir * (35 + 40 * noise(seed, i, 5)),
      vy: Math.sin(a) * speed + 15,
      r0: r * (0.24 + 0.14 * noise(seed, i, 6)),
      born,
      life: Math.min(room - born, 0.5 + 0.3 * noise(seed, i, 7)),
      tone: (i % 3) as 0 | 1 | 2,
    });
  }
  for (let i = 0; i < SPARKS; i++) {
    // Out toward the toppling side, from a little below level to nearly straight up.
    const up = -0.3 + 1.75 * noise(seed, i, 8);
    const speed = SPARK_SPEED + SPARK_SPREAD * noise(seed, i, 9);
    t.sparks.push({
      x0: cx,
      y0: cy,
      vx: dir * Math.cos(up) * speed,
      vy: Math.sin(up) * speed,
      life: 0.18 + 0.2 * noise(seed, i, 10),
    });
  }
}

/** Seconds since the blast, or -1 before it. */
function sinceBlast(t: Topple): number {
  return t.blast ? t.age - BLAST_AT : -1;
}

/** The section still swinging (before the blast), posed for drawing. */
export function slabPoses(t: Topple): LoosePose[] {
  const { theta } = swing(t.age);
  return t.bars.map((b) => {
    const p = swung(t, b.dx, b.dy, theta);
    return { cx: p.x, cy: p.y, w: b.w, level: b.level, angle: t.dir * theta, alpha: 1 };
  });
}

/** The chunks flying from the blast, posed for drawing; they fade out over DEBRIS_FADE and are gone by the card. */
export function chunkPoses(t: Topple): LoosePose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const alpha = Math.min(1, (TOPPLE_TIME - t.age) / DEBRIS_FADE);
  return t.chunks.map((c) => {
    const k = t.age - c.t0;
    return {
      cx: c.x0 + c.vx * k,
      cy: c.y0 + c.vy * k - 0.5 * DEBRIS_GRAVITY * k * k,
      w: c.w,
      level: c.level,
      angle: c.a0 + c.spin * k,
      alpha,
    };
  });
}

/** A smoke puff, posed: center and radius (world units), tone, opacity. */
export interface PuffPose {
  x: number;
  y: number;
  r: number;
  tone: 0 | 1 | 2;
  alpha: number;
}

export function puffPoses(t: Topple): PuffPose[] {
  const since = sinceBlast(t);
  const out: PuffPose[] = [];
  for (const p of t.puffs) {
    const k = since - p.born;
    if (k < 0 || k >= p.life) continue;
    const coast = (1 - Math.exp(-PUFF_DRAG * k)) / PUFF_DRAG;
    const f = k / p.life;
    // It pops out in the first tenth of a second and swells, then shrinks away (and thins out) to
    // nothing at the end of its life.
    const pop = Math.min(1, k / 0.1);
    const size = f < 0.5 ? 1 + PUFF_GROW * (f / 0.5) : (1 + PUFF_GROW) * (1 - ((f - 0.5) / 0.5) ** 2);
    out.push({
      x: p.x0 + p.vx * coast,
      y: p.y0 + p.vy * coast + PUFF_RISE * k,
      r: p.r0 * (0.5 + 0.5 * (1 - (1 - pop) ** 2)) * size,
      tone: p.tone,
      alpha: f < 0.45 ? 1 : 1 - ((f - 0.45) / 0.55) ** 1.5,
    });
  }
  return out;
}

/** A spark, posed: its head and the tail of its streak (world units), and how much of it is left (1 → 0). */
export interface SparkPose {
  x: number;
  y: number;
  tx: number;
  ty: number;
  left: number;
}

export function sparkPoses(t: Topple): SparkPose[] {
  const since = sinceBlast(t);
  if (since < 0) return [];
  const at = (s: Spark, k: number) => ({ x: s.x0 + s.vx * k, y: s.y0 + s.vy * k - 0.5 * SPARK_GRAVITY * k * k });
  return t.sparks
    .filter((s) => since < s.life)
    .map((s) => {
      const head = at(s, since);
      const tail = at(s, Math.max(0, since - SPARK_TRAIL));
      return { x: head.x, y: head.y, tx: tail.x, ty: tail.y, left: 1 - since / s.life };
    });
}

/** The burst at the blast's center: radius (world units) and how far through its life (0 → 1), or null once it is gone. */
export function burstPose(t: Topple): { x: number; y: number; r: number; k: number } | null {
  const since = sinceBlast(t);
  if (!t.blast || since >= BURST_LIFE) return null;
  return { x: t.blast.x, y: t.blast.y, r: t.blast.r * BURST_SIZE, k: since / BURST_LIFE };
}

/** How bright the flash over the scene is now (0: none). */
export function flashAlpha(t: Topple): number {
  const since = sinceBlast(t);
  if (since < 0 || since >= FLASH_LIFE) return 0;
  return FLASH_ALPHA * (1 - since / FLASH_LIFE) ** 2;
}

/** How far the scene is shaken now, in u (the size unit), and the most it can be either way this frame; 0s when still. */
export function shakeOffset(t: Topple): { x: number; y: number; amp: number } {
  const since = sinceBlast(t);
  if (since < 0 || since >= SHAKE_TIME) return { x: 0, y: 0, amp: 0 };
  const amp = SHAKE * (1 - since / SHAKE_TIME) ** 2;
  return { x: amp * Math.sin(since * 83), y: amp * Math.sin(since * 61 + 1.3), amp };
}

/** What drawing the topple needs to know about this frame, CSS px. */
export interface ToppleFrame {
  ctx: Ctx;
  kit: StyleKit;
  /** Pixels per world unit, and one bar's height in px. */
  scale: number;
  h: number;
  sx(x: number): number;
  sy(y: number): number;
  /** The screen drawn on: what is off it is skipped. */
  width: number;
  height: number;
}

/**
 * The section swinging, then the blast, back to front: the smoke, the chunks, the burst over them
 * (they fly out of it) and the sparks.
 */
export function drawTopple(f: ToppleFrame, t: Topple): void {
  const { ctx, kit, scale, h } = f;
  const paint = kit.blast;
  const loose = (p: LoosePose) => {
    const pw = p.w * scale;
    const x = f.sx(p.cx);
    const y = f.sy(p.cy);
    const reach = pw / 2 + h;
    if (p.alpha <= 0 || x < -reach || x > f.width + reach || y < -reach || y > f.height + reach) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    kit.bar(ctx, -pw / 2, -h / 2, pw, h, p.level);
    ctx.restore();
  };
  for (const p of slabPoses(t)) loose(p);
  if (!t.blast) return;
  paint.smoke(
    ctx,
    puffPoses(t).map((p) => ({ x: f.sx(p.x), y: f.sy(p.y), r: p.r * scale, tone: p.tone, opacity: p.alpha })),
  );
  for (const p of chunkPoses(t)) loose(p);
  const burst = burstPose(t);
  if (burst) paint.burst(ctx, f.sx(burst.x), f.sy(burst.y), burst.r * scale, burst.k, t.dir);
  const width = Math.max(1.5, h * 0.22);
  for (const s of sparkPoses(t)) {
    paint.spark(ctx, f.sx(s.tx), f.sy(s.ty), f.sx(s.x), f.sy(s.y), width * (0.6 + 0.4 * s.left), Math.min(1, s.left * 4));
  }
}

import { BLOCK_HEIGHT } from "../config";
import { swayOffset, type GameState } from "../game";
import { hash, type Ctx } from "../base/draw";
import type { StyleKit } from "../base/style";
import type { Falling } from "./falling";

// The end of a run, in both modes: the miss that takes the last life sends the top of the tower over
// and blows it up. The top section (TOPPLE_BARS bars, or every bar above the base on a shorter
// tower; the base alone on a bare one) swings over toward the side the missed bar fell, about its
// bottom corner on that side, faster and faster. BLAST_AT later it blows up while still falling, in
// one of five ways (BlastVariant), picked for the run by blastVariant(): the same run always ends
// the same way, and the next run most likely differently. Each goes off toward the toppling side,
// with a flash over the scene and a shake of it, and everything has left the screen or faded by
// TOPPLE_TIME, when the game-over card comes.
//
//   starburst  a burst, smoke and sparks; the bars break into chunks (some stay whole) that fly out
//              toward that side and up, spinning and tumbling under gravity.
//   fireworks  a chrysanthemum of sparks that arc up, slow and glitter down; the bars turn into
//              bright streaks flung that way; a second, smaller bloom goes off beside it.
//   shockwave  a ring races outward (a second behind it), the bars pinwheel away whole, spinning
//              fast, and a mushroom of smoke rises and thins.
//   confetti   a soft pop: the bars crumble into a shower of small colored squares and curling
//              streamers that flutter down slowly.
//   popcorn    three quick little pops race up the swinging section, a chunk flying off each, then
//              the big one (the starburst).
//
// What was still falling (the missed bar) is thrown along with it. Renderer-only: the game just
// ends (phase "over") and stands still. Deterministic from the state, the side and the dt it is
// fed; after the blast everything is a closed-form function of the age (nothing is integrated),
// so it plays the same at any frame rate. The style kit draws it (StyleKit.blast,
// src/fx/blast.ts): the renderer never branches on style.

/** Seconds from the last miss to the game-over card. */
export const TOPPLE_TIME = 1.3;
/** Seconds from the last miss to the blast: the top section has swung about a third of the way over. */
export const BLAST_AT = 0.5;
/** The section that topples: this many bars from the top. */
export const TOPPLE_BARS = 8;
/** Angular acceleration of the swinging section, rad/s²: it starts slow and gathers speed (33° by the blast). */
const TIP_ACCEL = 4.6;

/** The ways the toppling section blows up. */
export type BlastVariant = "starburst" | "fireworks" | "shockwave" | "confetti" | "popcorn";
export const BLAST_VARIANTS: readonly BlastVariant[] = ["starburst", "fireworks", "shockwave", "confetti", "popcorn"];

/** Popcorn: the three little pops race up the section at these ages; the big one comes at BLAST_AT. */
export const POPCORN_POPS: readonly number[] = [0.26, 0.34, 0.42];
/** Popcorn: where up the section (0 bottom → 1 top) each pop takes its bite. */
const POP_HEIGHTS = [0.12, 0.5, 0.9];
/** Popcorn: the share of its bar each pop takes, from the toppling side, and the least a bite is (world units). */
const POP_SHARE = 0.42;
const POP_MIN = 1.5;
/** Popcorn: a pop's little burst, in bar heights, and how long it shows. */
const POP_R = 1.3;
const POP_LIFE = 0.24;

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
/** Confetti floats, so more of it is still in view at the end: it fades over the last this many seconds. */
export const CONFETTI_FADE = 0.4;

/** The blast's radius, world units: half the toppling section's height, within these bounds. */
const BLAST_MIN_R = 16;
const BLAST_MAX_R = 32;
/** The burst pops up this big (in blast radii, per variant; 0: none) and is gone after BURST_LIFE seconds. */
const BURST_SIZE: Record<BlastVariant, number> = { starburst: 1.25, fireworks: 0, shockwave: 0.7, confetti: 0.6, popcorn: 1.25 };
const BURST_LIFE = 0.34;
/** The flash over the scene: this bright at the blast, gone after `life` seconds. */
const FLASH: Record<BlastVariant, { alpha: number; life: number }> = {
  starburst: { alpha: 0.7, life: 0.2 },
  fireworks: { alpha: 0.5, life: 0.18 },
  shockwave: { alpha: 0.8, life: 0.24 },
  confetti: { alpha: 0.35, life: 0.14 },
  popcorn: { alpha: 0.7, life: 0.2 },
};
/** The scene (not the HUD) shakes for `time` seconds, at most `amp` of the size unit u either way. */
const SHAKE: Record<BlastVariant, { amp: number; time: number }> = {
  starburst: { amp: 0.016, time: 0.35 },
  fireworks: { amp: 0.012, time: 0.3 },
  shockwave: { amp: 0.024, time: 0.45 },
  confetti: { amp: 0.005, time: 0.18 },
  popcorn: { amp: 0.016, time: 0.35 },
};

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

/** Fireworks: the first bloom's sparks, their speed, drag and gravity (they arc and slow), and how long they glitter. */
const BLOOM_SPARKS = 42;
const BLOOM_SPEED = 150;
const BLOOM_SPREAD = 50;
const BLOOM_DRAG = 1.6;
const BLOOM_GRAVITY = 110;
const BLOOM_LIFE = 0.5;
const BLOOM_LIFE_SPREAD = 0.22;
/** Fireworks: the second bloom: this long after the first, this far toward the toppling side and up (in blast radii), this much smaller. */
const BLOOM2_AT = 0.28;
const BLOOM2_OFFSET = { x: 0.8, y: 1.1 };
const BLOOM2_SCALE = 0.62;
/** Fireworks: a glittering spark flickers this fast (rad/s) once it is this far through its life. */
const TWINKLE_RATE = 46;
const TWINKLE_FROM = 0.35;
/** Fireworks: the flash at a bloom's heart lasts this long. */
const FLARE_LIFE = 0.26;
/** Fireworks: the bars fly as streaks at STREAK_SPEED..+STREAK_SPREAD units/s, STREAK_TRAIL seconds long. */
const STREAK_SPEED = 210;
const STREAK_SPREAD = 110;
const STREAK_TRAIL = 0.05;

/** Shockwave: the ring races out to this many blast radii in RING_LIFE seconds, this thick (in radii) at first. */
const RING_REACH = 4.6;
const RING_LIFE = 0.5;
const RING_WIDTH = 0.14;
/** Shockwave: the second ring follows this much later, thinner and shorter. */
const RING2_AT = 0.07;
const RING2_SCALE = 0.7;
/** Shockwave: whole bars pinwheel away at PINWHEEL_SPEED..+PINWHEEL_SPREAD units/s, spinning at PINWHEEL_SPIN..+PINWHEEL_SPIN_SPREAD rad/s. */
const PINWHEEL_SPEED = 180;
const PINWHEEL_SPREAD = 90;
const PINWHEEL_SPIN = 18;
const PINWHEEL_SPIN_SPREAD = 10;
/** Shockwave: the mushroom's stem puffs rise this fast; its cap spreads this fast. */
const STEM_PUFFS = 6;
const STEM_RISE = 75;
const CAP_PUFFS = 8;
const CAP_SPREAD = 35;

/** Confetti: this many squares a bar, this big (world units), floating under this drag and gravity (terminal speed gravity/drag). */
const BITS_PER_BAR = 7;
const BIT_SIZE = 2.6;
const BIT_DRAG = 4;
const BIT_GRAVITY = 70;
/** Confetti: a square wafts sideways this far (world units) at this rate (rad/s), and flips at this rate. */
const FLUTTER_AMP = 3;
const FLUTTER_RATE = 9;
const FLIP_RATE = 11;
/** Confetti: this many streamers, each this long (seconds of its path), curling this far (world units) at this rate. */
const RIBBONS = 7;
const RIBBON_LENGTH = 0.24;
const RIBBON_SEGMENTS = 10;
const CURL = 2.4;
const CURL_RATE = 9;
/** Confetti colors cycle through this many (the painter's palette). */
const CONFETTI_COLORS = 6;

interface SlabBar {
  /** Center offset from the pivot as drawn at the miss, world units (y up). */
  dx: number;
  dy: number;
  w: number;
  level: number;
}

/** A piece thrown by the blast: where and when it was let go, and how fast; poses come from its age. */
interface Chunk {
  /** Age of the topple when it was let go (the blast, a pop, or later for what fell into it). */
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
  /** Drawn as a toy block, or (fireworks) as a bright streak of its color. */
  as: "bar" | "streak";
  /** Drag, per second (0: none), and gravity, units/s². */
  drag: number;
  gravity: number;
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
  /** Drag per second, how fast it rises (units/s) and how much it swells. */
  drag: number;
  rise: number;
  grow: number;
}

interface Spark {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** Seconds after the blast it leaves (negative for popcorn's pops before it), and how long it lasts. */
  born: number;
  life: number;
  drag: number;
  gravity: number;
  /** The painter's spark color index (0: the style's own). */
  color: number;
  /** It glitters (flickers) as it falls. */
  twinkle: boolean;
}

/** A square of confetti. */
interface Bit {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  a0: number;
  spin: number;
  /** Its own place in the flutter and the flip. */
  phase: number;
}

/** A curling streamer: its head flies like a bit, and its tail trails the head's path. */
interface Ribbon {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  color: number;
  phase: number;
}

/** The shockwave's ring: from r0 to r1 world units over `life` seconds, `width` units thick at first. */
interface Ring {
  x: number;
  y: number;
  born: number;
  life: number;
  r0: number;
  r1: number;
  width: number;
}

/** A firework bloom's flash: at its heart, `r` world units. */
interface Flare {
  x: number;
  y: number;
  born: number;
  r: number;
  color: number;
}

/** A little burst (popcorn's pops), `r` world units, from `born` (seconds after the blast; negative before it) for `life` seconds. */
interface Pop {
  x: number;
  y: number;
  r: number;
  born: number;
  life: number;
}

export interface Topple {
  /** The lowest bar of the toppling section, and the side it goes over to. */
  level: number;
  dir: -1 | 1;
  /** How it blows up. */
  variant: BlastVariant;
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
  bits: Bit[];
  ribbons: Ribbon[];
  rings: Ring[];
  flares: Flare[];
  pops: Pop[];
}

/** A bar off the tower, posed for drawing: center (world units), width, rotation, opacity; a streak's tail. */
export interface LoosePose {
  cx: number;
  cy: number;
  w: number;
  level: number;
  angle: number;
  alpha: number;
  as: "bar" | "streak";
  tx: number;
  ty: number;
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
 * Which blast ends this run: a pick from the run itself (its score, perfects, mode, the side it
 * went over to, and the tower's exact shape, which the player's timing made), so the same run
 * always gets the same one and the next run most likely another. Integer hashing only, so every
 * platform agrees.
 */
export function blastVariant(state: GameState, dir: -1 | 1): BlastVariant {
  let h = 0x811c9dc5;
  const feed = (v: number) => {
    h = Math.imul(h ^ (v | 0), 0x01000193);
  };
  feed(state.score);
  feed(state.perfects);
  feed(dir + 2);
  feed(state.mode === "hard" ? 7 : 3);
  feed(Math.round(state.swayAngle * 1024));
  for (const b of state.blocks) {
    feed(Math.round(b.x * 64));
    feed(Math.round(b.w * 64));
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return BLAST_VARIANTS[(h >>> 0) % BLAST_VARIANTS.length]!;
}

/** The age at which main.ts plays the variant's sound and the heavy haptic: the blast, or popcorn's first pop (its sound runs pop-pop-pop-BOOM). */
export function blastCueAt(variant: BlastVariant): number {
  return variant === "popcorn" ? POPCORN_POPS[0]! : BLAST_AT;
}

/**
 * Start the end: the top section, as it is drawn now (the sway stands still once the run is over),
 * goes over toward `dir` about its bottom corner on that side: where it meets the bar below (the
 * ground, for the base). `variant` is the run's own unless a preview asks for one.
 */
export function startTopple(state: GameState, dir: -1 | 1, variant: BlastVariant = blastVariant(state, dir)): Topple {
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
  return {
    level,
    dir,
    variant,
    px,
    py,
    age: 0,
    bars,
    blast: null,
    chunks: [],
    puffs: [],
    sparks: [],
    bits: [],
    ribbons: [],
    rings: [],
    flares: [],
    pops: [],
  };
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

/** How fast a point of the section (offset dx, dy) moves as it swings through `theta` at `omega`: at right angles to its arm. */
function swingVelocity(t: Topple, dx: number, dy: number, theta: number, omega: number): { vx: number; vy: number } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { vx: omega * (-dx * s + t.dir * dy * c), vy: omega * (-t.dir * dx * c - dy * s) };
}

/**
 * Age the topple by `dt`. The step that reaches BLAST_AT blows the section up (and throws what is
 * in `falling` along with it, emptying it); popcorn's little pops go off at their own ages before
 * it. It returns true in the step that reaches the variant's cue (blastCueAt), so main.ts can play
 * its sound and the heavy haptic with it. Otherwise false.
 */
export function stepTopple(t: Topple, dt: number, falling: Falling[]): boolean {
  const before = t.age;
  t.age += dt;
  const crossed = (at: number) => before < at && t.age >= at;
  if (t.variant === "popcorn") POPCORN_POPS.forEach((at, i) => crossed(at) && popcornPop(t, i));
  if (crossed(BLAST_AT)) explode(t, falling);
  return crossed(blastCueAt(t.variant));
}

/** Deterministic 0..1 noise for piece `i` of the bar at `level`, channel `k`. */
function noise(level: number, i: number, k: number): number {
  return hash(level * 131 + i * 17 + k * 7919 + 3);
}

/** Distance covered in `k` seconds from speed `v` under drag `d` per second (none when 0). */
function coast(v: number, k: number, d: number): number {
  return d > 0 ? (v * (1 - Math.exp(-d * k))) / d : v * k;
}

/** Height gained in `k` seconds from upward speed `vy` under gravity `g` and drag `d` (terminal speed g/d; none when 0). */
function climb(vy: number, k: number, g: number, d: number): number {
  if (d <= 0) return vy * k - 0.5 * g * k * k;
  const terminal = g / d;
  return ((vy + terminal) * (1 - Math.exp(-d * k))) / d - terminal * k;
}

/** Where the section is at the blast: its center (by width), the blast's radius, and the swing then. */
interface Center {
  cx: number;
  cy: number;
  r: number;
  theta: number;
  omega: number;
}

function sectionCenter(t: Topple): Center {
  const { theta, omega } = swing(BLAST_AT);
  let sw = 0;
  let cx = 0;
  let cy = 0;
  for (const b of t.bars) {
    const p = swung(t, b.dx, b.dy, theta);
    cx += p.x * b.w;
    cy += p.y * b.w;
    sw += b.w;
  }
  if (sw > 0) {
    cx /= sw;
    cy /= sw;
  } else {
    cx = t.px;
    cy = t.py;
  }
  const r = Math.min(BLAST_MAX_R, Math.max(BLAST_MIN_R, (Math.max(1, t.bars.length) * BLOCK_HEIGHT) / 2));
  return { cx, cy, r, theta, omega };
}

/** A direction fanned out `spread` radians around the toppling side (0: straight that way), `u` 0..1 across it. */
function fanAngle(dir: -1 | 1, spread: number, u: number): number {
  return (dir > 0 ? 0 : Math.PI) + dir * (u - 0.5) * spread;
}

/** Seconds the blast's effects have to play before the card. */
const ROOM = TOPPLE_TIME - BLAST_AT - 0.02;

/** The blast: the section breaks up the variant's way, and whatever was still falling goes with it. */
function explode(t: Topple, falling: Falling[]): void {
  const c = sectionCenter(t);
  t.blast = { x: c.cx, y: c.cy, r: c.r };
  switch (t.variant) {
    case "starburst":
    case "popcorn":
      starburst(t, falling, c);
      break;
    case "fireworks":
      fireworks(t, falling, c);
      break;
    case "shockwave":
      shockwave(t, falling, c);
      break;
    case "confetti":
      confetti(t, falling, c);
      break;
  }
  falling.length = 0;
  t.bars = [];
}

/** A chunk let go at `t0`, thrown at (vx, vy), spinning; a toy block falling under the debris' gravity unless said otherwise. */
function chunk(
  t: Topple,
  t0: number,
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  w: number,
  level: number,
  a0: number,
  spin: number,
  extra: Partial<Chunk> = {},
): void {
  t.chunks.push({ t0, x0, y0, vx, vy, w, level, a0, spin, as: "bar", drag: 0, gravity: DEBRIS_GRAVITY, ...extra });
}

type Push = (x: number, y: number, vx: number, vy: number, near: number, seed: [number, number]) => { vx: number; vy: number; spin: number };

/**
 * What was still falling (the missed bar, any slivers) is thrown by the blast too, less the further
 * it is: `push` gives the throw for a piece at (x, y) already moving at (vx, vy), `near` 0..1.
 */
function sweepFalling(t: Topple, falling: Falling[], c: Center, push: Push): void {
  falling.forEach((f, i) => {
    const x = f.x + f.w / 2;
    const y = f.y + BLOCK_HEIGHT / 2;
    const near = 1 / (1 + (Math.hypot(x - c.cx, y - c.cy) / (2 * c.r)) ** 2);
    const v = push(x, y, f.vx, -f.vy, near, [f.level + 1000, i]);
    chunk(t, t.age, x, y, v.vx, v.vy, f.w, f.level, f.angle, f.spin + v.spin);
  });
}

/** The starburst's throw: toward the toppling side and up, out from the center, plus a share of the swing. */
function starburstPush(t: Topple, c: Center): Push {
  const dir = t.dir;
  return (x, y, vx, vy, near, seed) => {
    const away = AWAY_MIN + AWAY_SPREAD * noise(seed[0], seed[1], 1);
    const up = UP_MIN + UP_SPREAD * noise(seed[0], seed[1], 2);
    let tx = vx + (dir * away + (RADIAL * (x - c.cx)) / c.r) * near;
    const ty = vy + (up + (RADIAL * (y - c.cy)) / c.r) * near;
    if (tx * dir < AWAY_LEAST * near) tx = dir * AWAY_LEAST * near;
    const turn = SPIN_MIN + SPIN_SPREAD * noise(seed[0], seed[1], 3);
    const spin = dir * turn * (noise(seed[0], seed[1], 4) < 0.2 ? -1 : 1) * near;
    return { vx: tx, vy: ty, spin };
  };
}

/** A spark from (x, y) at `born`, falling under the usual gravity unless said otherwise; never past the card. */
function spark(t: Topple, x0: number, y0: number, vx: number, vy: number, born: number, life: number, extra: Partial<Spark> = {}): void {
  t.sparks.push({ x0, y0, vx, vy, born, life: Math.min(life, ROOM - born), drag: 0, gravity: SPARK_GRAVITY, color: 0, twinkle: false, ...extra });
}

/** The starburst's sparks from (x, y): `n` of them, out toward the toppling side, from a little below level to nearly straight up. */
function sparkFan(t: Topple, x: number, y: number, n: number, seed: number, born: number, speed: number, spread: number, life: number): void {
  for (let i = 0; i < n; i++) {
    const up = -0.3 + 1.75 * noise(seed, i, 8);
    const v = speed + spread * noise(seed, i, 9);
    spark(t, x, y, t.dir * Math.cos(up) * v, Math.sin(up) * v, born, life * (0.5 + 0.55 * noise(seed, i, 10)));
  }
}

/** Starburst (and popcorn's big one): a burst and smoke; the bars break into chunks that fly out that way and up. */
function starburst(t: Topple, falling: Falling[], c: Center): void {
  const dir = t.dir;
  const push = starburstPush(t, c);
  for (const b of t.bars) {
    const pieces = 1 + Math.floor(noise(b.level, 0, 5) * MAX_PIECES);
    const slot = b.w / pieces;
    for (let j = 0; j < pieces; j++) {
      const dx = b.dx - b.w / 2 + (j + 0.5) * slot;
      const p = swung(t, dx, b.dy, c.theta);
      const r = swingVelocity(t, dx, b.dy, c.theta, c.omega);
      const v = push(p.x, p.y, INHERIT * r.vx, INHERIT * r.vy, 1, [b.level, j + 1]);
      chunk(t, BLAST_AT, p.x, p.y, v.vx, v.vy, pieces > 1 ? slot * PIECE_FILL : b.w, b.level, dir * c.theta, v.spin);
    }
  }
  sweepFalling(t, falling, c, push);

  const seed = t.level + 500;
  for (let i = 0; i < PUFFS; i++) {
    const a = (2 * Math.PI * i) / PUFFS + noise(seed, i, 1) * 0.6;
    const d = c.r * (0.15 + 0.4 * noise(seed, i, 2));
    const speed = 30 + 40 * noise(seed, i, 3);
    const born = 0.02 + 0.1 * noise(seed, i, 4);
    t.puffs.push({
      x0: c.cx + Math.cos(a) * d,
      y0: c.cy + Math.sin(a) * d,
      vx: Math.cos(a) * speed + dir * (35 + 40 * noise(seed, i, 5)),
      vy: Math.sin(a) * speed + 15,
      r0: c.r * (0.24 + 0.14 * noise(seed, i, 6)),
      born,
      life: Math.min(ROOM - born, 0.5 + 0.3 * noise(seed, i, 7)),
      tone: (i % 3) as 0 | 1 | 2,
      drag: PUFF_DRAG,
      rise: PUFF_RISE,
      grow: PUFF_GROW,
    });
  }
  sparkFan(t, c.cx, c.cy, SPARKS, seed, 0, SPARK_SPEED, SPARK_SPREAD, 0.36);
}

/** One bloom of fireworks at (x, y): a flare, and `n` sparks in a round shell going off at `born`, `scale` of the full size. */
function bloom(t: Topple, x: number, y: number, n: number, born: number, scale: number, seed: number, color: number): void {
  const dir = t.dir;
  t.flares.push({ x, y, born, r: BLAST_MAX_R * 0.9 * scale, color });
  for (let i = 0; i < n; i++) {
    // Evenly round the shell (a golden-angle spiral), a little jittered, drifting the toppling way.
    const a = i * 2.39996 + noise(seed, i, 11) * 0.5;
    const v = (BLOOM_SPEED + BLOOM_SPREAD * noise(seed, i, 12)) * scale;
    const life = (BLOOM_LIFE + BLOOM_LIFE_SPREAD * noise(seed, i, 13)) * (0.6 + 0.4 * scale);
    spark(t, x, y, Math.cos(a) * v + dir * 22 * scale, Math.sin(a) * v + 12, born, life, {
      drag: BLOOM_DRAG,
      gravity: BLOOM_GRAVITY,
      color: (color + (i % 3)) % 3,
      twinkle: true,
    });
  }
}

/** Fireworks: a chrysanthemum of glittering sparks, the bars as streaks, a second bloom beside it. */
function fireworks(t: Topple, falling: Falling[], c: Center): void {
  const dir = t.dir;
  const seed = t.level + 700;
  const push: Push = (_x, _y, vx, vy, near, s) => {
    const a = fanAngle(dir, 0.9 * Math.PI, noise(s[0], s[1], 14));
    const v = (STREAK_SPEED + STREAK_SPREAD * noise(s[0], s[1], 15)) * near;
    return { vx: vx + Math.cos(a) * v + dir * 40 * near, vy: vy + Math.sin(a) * v + 40 * near, spin: 0 };
  };
  t.bars.forEach((b, i) => {
    const pieces = b.w > BLOCK_HEIGHT * 2.5 ? 2 : 1;
    const slot = b.w / pieces;
    for (let j = 0; j < pieces; j++) {
      const dx = b.dx - b.w / 2 + (j + 0.5) * slot;
      const p = swung(t, dx, b.dy, c.theta);
      const r = swingVelocity(t, dx, b.dy, c.theta, c.omega);
      const v = push(p.x, p.y, INHERIT * r.vx, INHERIT * r.vy, 1, [b.level, j + 1 + i]);
      chunk(t, BLAST_AT, p.x, p.y, v.vx, v.vy, slot * PIECE_FILL, b.level, 0, 0, { as: "streak", gravity: BLOOM_GRAVITY });
    }
  });
  sweepFalling(t, falling, c, (x, y, vx, vy, near, s) => ({ ...push(x, y, vx, vy, near, s), spin: dir * 6 * near }));
  bloom(t, c.cx, c.cy, BLOOM_SPARKS, 0, 1, seed, 0);
  bloom(t, c.cx + dir * BLOOM2_OFFSET.x * c.r, c.cy + BLOOM2_OFFSET.y * c.r, Math.round(BLOOM_SPARKS * 0.6), BLOOM2_AT, BLOOM2_SCALE, seed + 1, 1);
  // A few light wisps of smoke under the bloom.
  for (let i = 0; i < 4; i++) {
    const born = 0.05 + 0.08 * noise(seed, i, 16);
    t.puffs.push({
      x0: c.cx + (noise(seed, i, 17) - 0.5) * c.r * 0.8,
      y0: c.cy - c.r * 0.3 + noise(seed, i, 18) * c.r * 0.4,
      vx: dir * 20,
      vy: 10,
      r0: c.r * (0.16 + 0.1 * noise(seed, i, 19)),
      born,
      life: Math.min(ROOM - born, 0.45),
      tone: (1 + (i % 2)) as 1 | 2,
      drag: PUFF_DRAG,
      rise: PUFF_RISE,
      grow: PUFF_GROW,
    });
  }
}

/** Shockwave: a ring races out, the bars pinwheel away whole, a mushroom of smoke rises and thins. */
function shockwave(t: Topple, falling: Falling[], c: Center): void {
  const dir = t.dir;
  const seed = t.level + 900;
  t.rings.push({ x: c.cx, y: c.cy, born: 0, life: RING_LIFE, r0: c.r * 0.3, r1: c.r * RING_REACH, width: c.r * RING_WIDTH });
  t.rings.push({
    x: c.cx,
    y: c.cy,
    born: RING2_AT,
    life: RING_LIFE * RING2_SCALE,
    r0: c.r * 0.2,
    r1: c.r * RING_REACH * RING2_SCALE,
    width: c.r * RING_WIDTH * 0.6,
  });
  const push: Push = (_x, _y, vx, vy, near, s) => {
    const a = fanAngle(dir, 1.15 * Math.PI, noise(s[0], s[1], 20));
    const v = (PINWHEEL_SPEED + PINWHEEL_SPREAD * noise(s[0], s[1], 21)) * near;
    const spin = (PINWHEEL_SPIN + PINWHEEL_SPIN_SPREAD * noise(s[0], s[1], 22)) * (noise(s[0], s[1], 23) < 0.35 ? -1 : 1) * near;
    return { vx: vx + Math.cos(a) * v + dir * 120 * near, vy: vy + Math.sin(a) * v + 50 * near, spin };
  };
  for (const b of t.bars) {
    const p = swung(t, b.dx, b.dy, c.theta);
    const r = swingVelocity(t, b.dx, b.dy, c.theta, c.omega);
    const v = push(p.x, p.y, INHERIT * r.vx, INHERIT * r.vy, 1, [b.level, 1]);
    chunk(t, BLAST_AT, p.x, p.y, v.vx, v.vy, b.w, b.level, dir * c.theta, v.spin);
  }
  sweepFalling(t, falling, c, push);
  // The stem: puffs rising straight up from the center...
  for (let i = 0; i < STEM_PUFFS; i++) {
    const n = i / STEM_PUFFS;
    const born = 0.02 + 0.1 * n;
    t.puffs.push({
      x0: c.cx + (noise(seed, i, 24) - 0.5) * c.r * 0.3,
      y0: c.cy - c.r * 0.2 + n * c.r * 0.4,
      vx: dir * 8 + (noise(seed, i, 25) - 0.5) * 10,
      vy: STEM_RISE + 30 * noise(seed, i, 26),
      r0: c.r * (0.2 + 0.1 * noise(seed, i, 27)),
      born,
      life: ROOM - born,
      tone: (i % 3) as 0 | 1 | 2,
      drag: 1,
      rise: 0,
      grow: 0.4,
    });
  }
  // ...and the cap: puffs spreading out above it.
  for (let i = 0; i < CAP_PUFFS; i++) {
    const n = i / CAP_PUFFS;
    const born = 0.14 + 0.12 * noise(seed, i, 28);
    const side = i % 2 === 0 ? 1 : -1;
    t.puffs.push({
      x0: c.cx + (n - 0.5) * c.r * 0.8,
      y0: c.cy + c.r * (1.3 + 0.3 * noise(seed, i, 29)),
      vx: side * (CAP_SPREAD + 40 * noise(seed, i, 30)) + dir * 10,
      vy: 20 + 15 * noise(seed, i, 31),
      r0: c.r * (0.3 + 0.12 * noise(seed, i, 32)),
      born,
      life: ROOM - born,
      tone: ((i + 1) % 3) as 0 | 1 | 2,
      drag: 2.2,
      rise: 10,
      grow: 0.6,
    });
  }
  sparkFan(t, c.cx, c.cy, 10, seed, 0, SPARK_SPEED + 40, SPARK_SPREAD, 0.3);
}

/** Confetti: a soft pop; the bars crumble into squares and streamers that flutter down. */
function confetti(t: Topple, falling: Falling[], c: Center): void {
  const dir = t.dir;
  const seed = t.level + 1100;
  /** A floaty throw: out toward the toppling side, scattered, and a little up (it peaks within a third of a second, then floats down). */
  const toss = (s: number, i: number, spread: number) => ({
    vx: (dir * (30 + 150 * noise(s, i, 33)) + (noise(s, i, 34) - 0.5) * 80) * spread,
    vy: 25 + 45 * noise(s, i, 35),
  });
  let n = 0;
  for (const b of t.bars) {
    for (let j = 0; j < BITS_PER_BAR; j++, n++) {
      const dx = b.dx - b.w / 2 + ((j + 0.5) / BITS_PER_BAR) * b.w;
      const p = swung(t, dx, b.dy + (noise(b.level, j, 36) - 0.5) * BLOCK_HEIGHT * 0.6, c.theta);
      const r = swingVelocity(t, dx, b.dy, c.theta, c.omega);
      const v = toss(b.level, j, 1);
      t.bits.push({
        x0: p.x,
        y0: p.y,
        vx: v.vx + INHERIT * r.vx,
        vy: v.vy + INHERIT * r.vy,
        size: BIT_SIZE * (0.8 + 0.4 * noise(b.level, j, 37)),
        color: n % CONFETTI_COLORS,
        a0: noise(b.level, j, 38) * Math.PI,
        spin: (4 + 6 * noise(b.level, j, 39)) * (noise(b.level, j, 40) < 0.5 ? -1 : 1),
        phase: noise(b.level, j, 41) * 2 * Math.PI,
      });
    }
  }
  for (let i = 0; i < RIBBONS; i++) {
    const b = t.bars[i % Math.max(1, t.bars.length)];
    const p = b ? swung(t, b.dx + (noise(seed, i, 42) - 0.5) * b.w * 0.6, b.dy, c.theta) : { x: c.cx, y: c.cy };
    const v = toss(seed, i, 1.3);
    t.ribbons.push({ x0: p.x, y0: p.y, vx: v.vx, vy: v.vy, color: (i + 2) % CONFETTI_COLORS, phase: noise(seed, i, 43) * 2 * Math.PI });
  }
  // What was falling tumbles on, nudged by the pop.
  sweepFalling(t, falling, c, (_x, _y, vx, vy, near, s) => ({
    vx: vx + dir * 60 * near,
    vy: vy + 50 * near,
    spin: dir * 3 * near * (noise(s[0], s[1], 44) < 0.5 ? -1 : 1),
  }));
  // A little paper dust.
  for (let i = 0; i < 3; i++) {
    const born = 0.02 + 0.05 * i;
    t.puffs.push({
      x0: c.cx + (noise(seed, i, 45) - 0.5) * c.r * 0.6,
      y0: c.cy + (noise(seed, i, 46) - 0.5) * c.r * 0.6,
      vx: dir * 25,
      vy: 20,
      r0: c.r * 0.18,
      born,
      life: Math.min(ROOM - born, 0.4),
      tone: 2,
      drag: PUFF_DRAG,
      rise: PUFF_RISE,
      grow: PUFF_GROW,
    });
  }
}

/** Popcorn: pop `i` takes a bite out of a bar of the swinging section, which flies off with a little burst and a few sparks. */
function popcornPop(t: Topple, i: number): void {
  if (t.bars.length === 0) return;
  const at = POPCORN_POPS[i]!;
  const dir = t.dir;
  const { theta, omega } = swing(at);
  // Bars are top first: the bite's height up the section picks one.
  const b = t.bars[Math.round((t.bars.length - 1) * (1 - POP_HEIGHTS[i]!))]!;
  // A sliver thinner than a bite (a slice can leave one) goes whole: no bar is ever thinner than nothing.
  const piece = Math.min(b.w, Math.max(POP_MIN, b.w * POP_SHARE));
  const dx = b.dx + dir * (b.w / 2 - piece / 2);
  const p = swung(t, dx, b.dy, theta);
  const r = swingVelocity(t, dx, b.dy, theta, omega);
  const n = (k: number) => noise(b.level, i + 50, k);
  chunk(t, at, p.x, p.y, INHERIT * r.vx + dir * (130 + 50 * n(1)), INHERIT * r.vy + 120 + 60 * n(2), piece, b.level, dir * theta, dir * (10 + 6 * n(3)));
  if (piece >= b.w) {
    t.bars.splice(t.bars.indexOf(b), 1);
  } else {
    b.w -= piece;
    b.dx -= (dir * piece) / 2;
  }
  t.pops.push({ x: p.x, y: p.y, r: BLOCK_HEIGHT * POP_R, born: at - BLAST_AT, life: POP_LIFE });
  for (let j = 0; j < 5; j++) {
    const up = -0.1 + 1.4 * noise(b.level, j + 60 + i * 10, 4);
    const v = 90 + 60 * noise(b.level, j + 60 + i * 10, 5);
    spark(t, p.x, p.y, dir * Math.cos(up) * v, Math.sin(up) * v, at - BLAST_AT, 0.18 + 0.1 * noise(b.level, j + 60 + i * 10, 6));
  }
}

/** Seconds since the blast, or -1 before it. */
function sinceBlast(t: Topple): number {
  return t.blast ? t.age - BLAST_AT : -1;
}

/** Seconds since the blast, before (negative) or after it: popcorn's pops run on this clock too. */
function blastClock(t: Topple): number {
  return t.age - BLAST_AT;
}

/** The section still swinging (before the blast), posed for drawing. */
export function slabPoses(t: Topple): LoosePose[] {
  const { theta } = swing(t.age);
  return t.bars.map((b) => {
    const p = swung(t, b.dx, b.dy, theta);
    return { cx: p.x, cy: p.y, w: b.w, level: b.level, angle: t.dir * theta, alpha: 1, as: "bar", tx: p.x, ty: p.y };
  });
}

/** The chunks flying from the blast (and popcorn's pops), posed for drawing; they fade out over DEBRIS_FADE and are gone by the card. */
export function chunkPoses(t: Topple): LoosePose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const alpha = Math.min(1, (TOPPLE_TIME - t.age) / DEBRIS_FADE);
  return t.chunks
    .filter((c) => t.age >= c.t0)
    .map((c) => {
      const k = t.age - c.t0;
      const at = (s: number) => ({ x: c.x0 + coast(c.vx, s, c.drag), y: c.y0 + climb(c.vy, s, c.gravity, c.drag) });
      const head = at(k);
      const tail = c.as === "streak" ? at(Math.max(0, k - STREAK_TRAIL)) : head;
      return { cx: head.x, cy: head.y, w: c.w, level: c.level, angle: c.a0 + c.spin * k, alpha, as: c.as, tx: tail.x, ty: tail.y };
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
    const f = k / p.life;
    // It pops out in the first tenth of a second and swells, then shrinks away (and thins out) to
    // nothing at the end of its life.
    const pop = Math.min(1, k / 0.1);
    const size = f < 0.5 ? 1 + p.grow * (f / 0.5) : (1 + p.grow) * (1 - ((f - 0.5) / 0.5) ** 2);
    out.push({
      x: p.x0 + coast(p.vx, k, p.drag),
      y: p.y0 + coast(p.vy, k, p.drag) + p.rise * k,
      r: p.r0 * (0.5 + 0.5 * (1 - (1 - pop) ** 2)) * size,
      tone: p.tone,
      alpha: f < 0.45 ? 1 : 1 - ((f - 0.45) / 0.55) ** 1.5,
    });
  }
  return out;
}

/** A spark, posed: its head and the tail of its streak (world units), how much of it is left (1 → 0), its color and brightness. */
export interface SparkPose {
  x: number;
  y: number;
  tx: number;
  ty: number;
  left: number;
  color: number;
  alpha: number;
}

export function sparkPoses(t: Topple): SparkPose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const clock = blastClock(t);
  const out: SparkPose[] = [];
  t.sparks.forEach((s, i) => {
    const k = clock - s.born;
    if (k < 0 || k >= s.life) return;
    const at = (q: number) => ({ x: s.x0 + coast(s.vx, q, s.drag), y: s.y0 + climb(s.vy, q, s.gravity, s.drag) });
    const head = at(k);
    const tail = at(Math.max(0, k - SPARK_TRAIL));
    const left = 1 - k / s.life;
    // A glittering spark flickers once it has slowed, each in its own rhythm.
    const glitter = s.twinkle && k > s.life * TWINKLE_FROM ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TWINKLE_RATE * k + i * 1.7)) : 1;
    out.push({ x: head.x, y: head.y, tx: tail.x, ty: tail.y, left, color: s.color, alpha: Math.min(1, left * 4) * glitter });
  });
  return out;
}

/** A burst, posed: center and radius (world units), how far through its life (0 → 1), and whether it is the big one. */
export interface BurstPose {
  x: number;
  y: number;
  r: number;
  k: number;
  big: boolean;
}

/** The burst at the blast's center (the variant's size, if it has one) and popcorn's little pops; none once they are gone. */
export function burstPoses(t: Topple): BurstPose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const out: BurstPose[] = [];
  const since = sinceBlast(t);
  const size = BURST_SIZE[t.variant];
  if (t.blast && since < BURST_LIFE && size > 0) out.push({ x: t.blast.x, y: t.blast.y, r: t.blast.r * size, k: since / BURST_LIFE, big: true });
  const clock = blastClock(t);
  for (const p of t.pops) {
    const k = clock - p.born;
    if (k >= 0 && k < p.life) out.push({ x: p.x, y: p.y, r: p.r, k: k / p.life, big: false });
  }
  return out;
}

/** A shockwave ring, posed: center, radius and line width (world units), opacity. */
export interface RingPose {
  x: number;
  y: number;
  r: number;
  width: number;
  alpha: number;
}

export function ringPoses(t: Topple): RingPose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const since = sinceBlast(t);
  const out: RingPose[] = [];
  for (const g of t.rings) {
    const k = since - g.born;
    if (k < 0 || k >= g.life) continue;
    const f = k / g.life;
    // It races out, slowing, and thins as it goes.
    out.push({ x: g.x, y: g.y, r: g.r0 + (g.r1 - g.r0) * (1 - (1 - f) ** 2), width: g.width * (1 - 0.7 * f), alpha: 1 - f ** 1.5 });
  }
  return out;
}

/** A firework bloom's flash, posed: center and radius (world units), its color, opacity. */
export interface FlarePose {
  x: number;
  y: number;
  r: number;
  color: number;
  alpha: number;
}

export function flarePoses(t: Topple): FlarePose[] {
  if (t.age >= TOPPLE_TIME) return [];
  const since = sinceBlast(t);
  const out: FlarePose[] = [];
  for (const f of t.flares) {
    const k = since - f.born;
    if (k < 0 || k >= FLARE_LIFE) continue;
    const q = k / FLARE_LIFE;
    out.push({ x: f.x, y: f.y, r: f.r * (0.6 + 0.4 * Math.min(1, k / 0.05)) * (1 - 0.5 * q), color: f.color, alpha: (1 - q) ** 1.2 });
  }
  return out;
}

/** A square of confetti, posed: center (world units), size, rotation, how much of its width shows as it flips (0..1), color, opacity. */
export interface BitPose {
  x: number;
  y: number;
  size: number;
  angle: number;
  squash: number;
  color: number;
  alpha: number;
}

/** How faded the confetti is now (1: not yet). */
function confettiAlpha(t: Topple): number {
  return Math.min(1, (TOPPLE_TIME - t.age) / CONFETTI_FADE);
}

export function bitPoses(t: Topple): BitPose[] {
  const k = sinceBlast(t);
  if (k < 0 || t.age >= TOPPLE_TIME) return [];
  const alpha = confettiAlpha(t);
  return t.bits.map((b) => ({
    x: b.x0 + coast(b.vx, k, BIT_DRAG) + FLUTTER_AMP * Math.sin(FLUTTER_RATE * k + b.phase) * Math.min(1, k * 4),
    y: b.y0 + climb(b.vy, k, BIT_GRAVITY, BIT_DRAG),
    size: b.size,
    angle: b.a0 + b.spin * k,
    squash: 0.25 + 0.75 * Math.abs(Math.cos(FLIP_RATE * k + b.phase)),
    color: b.color,
    alpha,
  }));
}

/** A streamer, posed: its points from head to tail (world units), color, opacity. */
export interface RibbonPose {
  points: { x: number; y: number }[];
  color: number;
  alpha: number;
}

export function ribbonPoses(t: Topple): RibbonPose[] {
  const k = sinceBlast(t);
  if (k < 0 || t.age >= TOPPLE_TIME) return [];
  const alpha = confettiAlpha(t);
  return t.ribbons.map((r) => {
    const points: { x: number; y: number }[] = [];
    for (let s = 0; s <= RIBBON_SEGMENTS; s++) {
      const back = s / RIBBON_SEGMENTS;
      const q = Math.max(0, k - back * RIBBON_LENGTH);
      // The tail follows the head's path, curling more the further back it is.
      const curl = CURL * back;
      const w = r.phase + CURL_RATE * back * 2 + k * 5;
      points.push({
        x: r.x0 + coast(r.vx, q, BIT_DRAG) + curl * Math.sin(w),
        y: r.y0 + climb(r.vy, q, BIT_GRAVITY * 0.85, BIT_DRAG) + curl * 0.6 * Math.cos(w),
      });
    }
    return { points, color: r.color, alpha };
  });
}

/** How bright the flash over the scene is now (0: none). */
export function flashAlpha(t: Topple): number {
  const since = sinceBlast(t);
  const { alpha, life } = FLASH[t.variant];
  if (since < 0 || since >= life) return 0;
  return alpha * (1 - since / life) ** 2;
}

/** How far the scene is shaken now, in u (the size unit), and the most it can be either way this frame; 0s when still. */
export function shakeOffset(t: Topple): { x: number; y: number; amp: number } {
  const since = sinceBlast(t);
  const { amp: most, time } = SHAKE[t.variant];
  if (since < 0 || since >= time) return { x: 0, y: 0, amp: 0 };
  const amp = most * (1 - since / time) ** 2;
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
 * The section swinging, then the blast, back to front: the smoke, the streamers and confetti, the
 * chunks (blocks, or streaks), the bursts over them (they fly out of it), the blooms' flares, the
 * rings and the sparks.
 */
export function drawTopple(f: ToppleFrame, t: Topple): void {
  const { ctx, kit, scale, h } = f;
  const paint = kit.blast;
  const onScreen = (x: number, y: number, reach: number) => x >= -reach && x <= f.width + reach && y >= -reach && y <= f.height + reach;
  const loose = (p: LoosePose) => {
    const pw = p.w * scale;
    const x = f.sx(p.cx);
    const y = f.sy(p.cy);
    if (p.alpha <= 0 || !onScreen(x, y, pw / 2 + h)) return;
    if (p.as === "streak") {
      paint.streak(ctx, f.sx(p.tx), f.sy(p.ty), x, y, Math.max(2, h * 0.5), p.alpha, p.level);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    kit.bar(ctx, -pw / 2, -h / 2, pw, h, p.level);
    ctx.restore();
  };
  for (const p of slabPoses(t)) loose(p);
  const puffs = puffPoses(t);
  if (puffs.length > 0) paint.smoke(ctx, puffs.map((p) => ({ x: f.sx(p.x), y: f.sy(p.y), r: p.r * scale, tone: p.tone, opacity: p.alpha })));
  const ribbonWidth = Math.max(1.5, h * 0.3);
  for (const r of ribbonPoses(t)) {
    const points = r.points.map((p) => ({ x: f.sx(p.x), y: f.sy(p.y) }));
    if (points.some((p) => onScreen(p.x, p.y, ribbonWidth * 2))) paint.streamer(ctx, points, ribbonWidth, r.color, r.alpha);
  }
  const bits = bitPoses(t)
    .map((b) => ({ x: f.sx(b.x), y: f.sy(b.y), size: b.size * scale, angle: b.angle, squash: b.squash, color: b.color, opacity: b.alpha }))
    .filter((b) => onScreen(b.x, b.y, b.size));
  if (bits.length > 0) paint.confetti(ctx, bits);
  for (const p of chunkPoses(t)) loose(p);
  for (const b of burstPoses(t)) paint.burst(ctx, f.sx(b.x), f.sy(b.y), b.r * scale, b.k, t.dir);
  for (const fl of flarePoses(t)) paint.flare(ctx, f.sx(fl.x), f.sy(fl.y), fl.r * scale, fl.alpha, fl.color);
  for (const g of ringPoses(t)) paint.ring(ctx, f.sx(g.x), f.sy(g.y), g.r * scale, Math.max(1.5, g.width * scale), g.alpha);
  const width = Math.max(1.5, h * 0.22);
  for (const s of sparkPoses(t)) {
    const x = f.sx(s.x);
    const y = f.sy(s.y);
    if (!onScreen(x, y, width * 4)) continue;
    paint.spark(ctx, f.sx(s.tx), f.sy(s.ty), x, y, width * (0.6 + 0.4 * s.left), s.alpha, s.color);
  }
}

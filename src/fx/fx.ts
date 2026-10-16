import {
  BLOCK_HEIGHT,
  DANGER_FRAC,
  DRIFT_EPS,
  GUST_BLOW,
  LAST_CHANCE_TIME,
  PERFECT_TOLERANCE,
  WARN_FRAC,
  tuning,
} from "../config";
import {
  drift,
  gustPush,
  kickBend,
  stability,
  swayOffset,
  top,
  topLevel,
  type DropResult,
  type GameState,
  type Stability,
} from "../game";
import { hash } from "../base/draw";
import type { Falling } from "./falling";
import { fallPivot, stepTopple, TOPPLE_CARD_AT, type ToppleFx } from "./topple";

// View-side state for the balance telegraphing (docs/balance-spec.md, "Telegraphing"):
// eased label tiers with hysteresis, pops, lean arrows, sparks, banners and the topple.
// Cosmetic only. Everything here is deterministic from the events and dt it is fed.

/** Label tier: the logic's warning() with hysteresis on WOBBLY, a hold on DANGER and a latch on LAST CHANCE. */
export type Tier = Stability["level"];
/** Semantic colors; each style kit maps them (see StyleKit.tones). */
export type Tone = "ok" | "warn" | "danger" | "calm" | "gold" | "accent" | "white";
/** Haptic moments main.ts turns into vibration. */
export type Cue = "whoa" | "creak" | "teeter";

/** WOBBLY label turns on at the logic threshold and off a little below it. */
const WOBBLY_ON = WARN_FRAC;
const WOBBLY_OFF = 0.5;
/** Labels and tints ease toward their tier at this rate, per second. */
const TIER_EASE = 8;
/** DANGER stays up this long after the last swing that reached it, so it doesn't flicker. */
const DANGER_HOLD = 0.8;
/** Camera roll toward the lean while teetering, radians. */
const ROLL_MAX = (2 * Math.PI) / 180;
const ROLL_EASE = 5;
/** Below this the roll snaps to exactly 0, so the camera transform switches off. */
const ROLL_SNAP = 1e-4;
/** Sparks: world units/s^2, and a cap so phones stay smooth. */
const SPARK_GRAVITY = 70;
const MAX_SPARKS = 90;
export const WIND_BANNER_TIME = 1.5;
/** "STEADY! Now balance it" hint length, seconds. */
export const NUDGE_TIME = 2.6;
/** Least time between creak ticks at swing peaks, seconds. */
const CREAK_GAP = 0.7;
/** Heartbeat haptic period while teetering, view seconds (slow motion stretches it). */
const HEARTBEAT = 0.4;
/** Lean changes smaller than this (world units) get no arrow. */
const ARROW_MIN = DRIFT_EPS;
/** Lean arrow life, seconds; while TEETER / LAST CHANCE own the top, arrows age this much faster. */
export const ARROW_TIME = 1;
const ARROW_RUSH = 4;
/** STEADY lock-ring life, seconds. */
export const LOCK_TIME = 1;
/** Rebuild sweep: the bright band runs out over SWEEP_GROW, then fades over SWEEP_FADE. */
export const SWEEP_GROW = 0.3;
export const SWEEP_FADE = 0.15;
/** "PERFECT" pop life, seconds. */
const PERFECT_POP_TIME = 0.9;

export interface Pop {
  text: string;
  tone: Tone;
  /** Block it rides on (follows the sway). */
  level: number;
  /** Seconds; negative while delayed. */
  age: number;
  life: number;
  /**
   * 0: the main line, centered just above the slider row (PERFECT, HOLD ON!, SAVED!).
   * 1: beside the block (STEADY, REBUILT, WHOA!), so it never hides the block it describes.
   * A new pop fades an older one on the same line out fast, so words never stack.
   */
  line: 0 | 1;
  /** Font size, in u. */
  size: number;
  /** Line 1 only: the block's side; 0 picks the side with room at draw time. */
  side: -1 | 0 | 1;
}

export interface LeanArrow {
  level: number;
  dir: -1 | 1;
  /** |change in leanTarget|, world units. */
  mag: number;
  /** The drop made the lean worse (amber/red) or better (green). */
  worse: boolean;
  age: number;
}

/** Regrown strip(s) of a rebuilt bar, world units from each edge. */
export interface Sweep {
  level: number;
  left: number;
  right: number;
  age: number;
}

export interface Spark {
  /** World units, y up. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  tone: Tone;
  /** World units. */
  size: number;
}

export interface Fx {
  tier: Tier;
  wobblyOn: boolean;
  dangerHold: number;
  /** Eased 0..1: amber (WOBBLY and up) and red (DANGER and up). */
  amber: number;
  red: number;
  /** Last non-steady tier, so its tag can fade out. */
  lastTag: Tier;
  /**
   * The side the top can actually topple toward (toppleSide, held): where the rail, tint,
   * crack, vignette, roll and gauge ghost go. 0 until there is one.
   */
  side: -1 | 0 | 1;
  /** The drift (imbalance) side, held while the tower is balanced: the light side is its opposite. */
  driftSide: -1 | 0 | 1;
  /**
   * LAST CHANCE, latched from its first frame until the next placed drop, a save or the fall:
   * the logic dips back to TEETER whenever the top swings inside the rail, but the countdown
   * keeps running. `left` is the countdown's remaining fraction and never goes up.
   */
  lastChance: { age: number; left: number } | null;
  /** Camera roll, radians (eased). */
  roll: number;
  pops: Pop[];
  arrows: LeanArrow[];
  sweeps: Sweep[];
  sparks: Spark[];
  /** STEADY lock-ring clamping on a block. */
  lock: { level: number; age: number } | null;
  /** Seconds since the tower was armed / since SAVED! / since WIND ZONE. */
  armedAge: number;
  savedAge: number;
  windAge: number;
  /** "STEADY! Now balance it" toward `dir`. */
  nudge: { age: number; dir: -1 | 1 } | null;
  topple: ToppleFx | null;
  cues: Cue[];
  /** Counter feeding hash() for spark spreads. */
  seq: number;
  prevTilt: number;
  prevVel: number;
  creakAge: number;
  beatAge: number;
}

export function newFx(): Fx {
  return {
    tier: "steady",
    wobblyOn: false,
    dangerHold: 0,
    amber: 0,
    red: 0,
    lastTag: "wobbly",
    side: 0,
    driftSide: 0,
    lastChance: null,
    roll: 0,
    pops: [],
    arrows: [],
    sweeps: [],
    sparks: [],
    lock: null,
    armedAge: Infinity,
    savedAge: Infinity,
    windAge: Infinity,
    nudge: null,
    topple: null,
    cues: [],
    seq: 0,
    prevTilt: 0,
    prevVel: 0,
    creakAge: Infinity,
    beatAge: Infinity,
  };
}

const sign = (v: number): -1 | 1 => (v < 0 ? -1 : 1);
const isRed = (t: Tier) => t === "danger" || t === "teeter" || t === "lastChance";
/** TEETER or LAST CHANCE: the top is at the rail. */
export const isTipping = (t: Tier) => t === "teeter" || t === "lastChance";

/** Largest gust push still to come, as forecast() counts it (0 when idle). */
function gustAhead(state: GameState): number {
  const g = state.gust;
  if (g.phase === "idle") return 0;
  if (g.phase === "warn" || g.t < GUST_BLOW / 2) return g.amp;
  return Math.abs(gustPush(state));
}

/**
 * How much further right than left the top can reach before the next drop: the forecast's
 * signed lean terms (the lean now, its target, and the target plus the gust still to come).
 * The swing is symmetric, so it never picks a side.
 */
export function reachLead(state: GameState, st: Stability): number {
  const t = st.leanTarget;
  const gust = t + kickBend(topLevel(state)) * state.gust.dir * gustAhead(state);
  return Math.max(0, state.lean, t, gust) - Math.max(0, -state.lean, -t, -gust);
}

/**
 * The side the top can actually topple toward: the tilt's side once it nears the rail, else
 * the side the forecast's lean terms reach further (a gust on a balanced tower: the gust's).
 * Keeps `prev` until the other side leads by more than DRIFT_EPS, so a balanced, swinging
 * tower doesn't flip it every half-swing; with no history it falls back to stability().side.
 */
export function toppleSide(state: GameState, st: Stability, prev: -1 | 0 | 1): -1 | 0 | 1 {
  if (st.ratio >= DANGER_FRAC && st.tilt !== 0) return sign(st.tilt);
  const lead = reachLead(state, st);
  if (Math.abs(lead) > DRIFT_EPS) return sign(lead);
  return prev !== 0 ? prev : st.side;
}

/**
 * A slice on the light side straightens the tower only if it moves the top's center less than
 * twice the drift (the center moves half the slice). When even the smallest slice overshoots,
 * every non-perfect drop makes the imbalance worse, so only a PERFECT is safe.
 */
export function counterweightHelps(state: GameState): boolean {
  return 4 * Math.abs(drift(state)) > PERFECT_TOLERANCE;
}

/** Edge the next rebuild will grow (mirrors the game's takeCut, read-only). */
export function regrowSide(state: GameState): -1 | 1 | 0 {
  const cuts = state.cuts;
  if (cuts.length === 0) return 0;
  const base = state.blocks[0];
  const b = top(state);
  const d = base ? b.x + b.w / 2 - (base.x + base.w / 2) : 0;
  const want = !tuning.leanOn ? 0 : d > DRIFT_EPS ? -1 : d < -DRIFT_EPS ? 1 : 0;
  let pick = cuts[cuts.length - 1];
  if (want !== 0) {
    for (let j = cuts.length - 1; j >= 0; j--) {
      if (cuts[j]?.side === want) {
        pick = cuts[j];
        break;
      }
    }
  }
  return pick ? pick.side : 0;
}

/** World geometry of the rail on `side`: x, and the level it is centered on. */
export function railAt(state: GameState, st: Stability, side: -1 | 0 | 1): { x: number; level: number } | null {
  if (side === 0 || state.blocks.length === 0) return null;
  const n = topLevel(state);
  const b = top(state);
  const column = b.x + b.w / 2 + swayOffset(state, n) - st.tilt;
  return { x: column + side * st.limit, level: n };
}

/** Add a word pop; an older pop on the same line fades out fast so words never stack. */
function pop(fx: Fx, p: Partial<Pop> & Pick<Pop, "text" | "tone" | "level">): void {
  const next: Pop = { age: 0, life: 1, line: 0, size: 0.06, side: 0, ...p };
  for (const o of fx.pops) {
    if (o.line === next.line) o.life = Math.min(o.life, Math.max(0, o.age) + 0.15);
  }
  fx.pops.push(next);
}

function popsActive(fx: Fx, tone: Tone): boolean {
  return fx.pops.some((p) => p.tone === tone && p.age < p.life - 0.15);
}

function burst(
  fx: Fx,
  x: number,
  y: number,
  count: number,
  tone: Tone,
  speed: number,
  spreadX: number,
  spreadY: number,
  dirX = 0,
): void {
  for (let i = 0; i < count; i++) {
    const k = fx.seq++;
    const a = hash(k * 3 + 1) * Math.PI * 2;
    const s = speed * (0.35 + 0.65 * hash(k * 3 + 2));
    fx.sparks.push({
      x: x + (hash(k * 5 + 7) - 0.5) * spreadX,
      y: y + (hash(k * 5 + 9) - 0.5) * spreadY,
      vx: Math.cos(a) * s + dirX * speed * 0.6,
      vy: Math.sin(a) * s + speed * 0.35,
      age: 0,
      life: 0.45 + 0.4 * hash(k * 3 + 3),
      tone,
      size: 1.2 + 1.3 * hash(k * 7 + 5),
    });
  }
  if (fx.sparks.length > MAX_SPARKS) fx.sparks.splice(0, fx.sparks.length - MAX_SPARKS);
}

export interface DropInfo {
  result: DropResult;
  /** Level the bar landed on (or would have). */
  level: number;
  /** leanTarget(state) just before and just after the drop. */
  leanBefore: number;
  leanAfter: number;
}

/** Feed a drop's consequences into the view. Call right after drop(). */
export function onDrop(fx: Fx, state: GameState, d: DropInfo): void {
  const r = d.result;
  if (r.kind === "miss") return;
  fx.nudge = null;
  // A placed drop restarts the logic's teeter (a miss doesn't): end the LAST CHANCE latch.
  fx.lastChance = null;
  const delta = d.leanAfter - d.leanBefore;
  if (Math.abs(delta) >= ARROW_MIN) {
    fx.arrows.push({
      level: d.level,
      dir: sign(delta),
      mag: Math.abs(delta),
      worse: Math.abs(d.leanAfter) > Math.abs(d.leanBefore),
      age: 0,
    });
    if (fx.arrows.length > 3) fx.arrows.shift();
  }
  if (r.kind === "sliced") {
    if (r.armed) {
      fx.armedAge = 0;
      pop(fx, { text: "HOLD ON!", tone: "danger", level: d.level, life: 1.3, size: 0.07 });
    }
    return;
  }
  // Perfect: the word on the main line (bigger as the streak grows), the outcome beside the block.
  const streak = state.streak;
  pop(fx, {
    text: streak >= 2 ? `PERFECT ×${streak}` : "PERFECT",
    tone: "accent",
    level: d.level,
    life: PERFECT_POP_TIME,
    size: 0.065 * (1 + 0.25 * Math.min(1, streak / 5)),
  });
  if (r.steadied) {
    fx.lock = { level: d.level, age: 0 };
    const st = stability(state);
    const tipping = st.forecastRatio >= WOBBLY_OFF || fx.wobblyOn;
    pop(fx, { text: tipping ? "STEADY!" : "STEADY", tone: "calm", level: d.level, line: 1, age: -0.08, life: 1.1 });
    const dr = drift(state);
    if (tipping && counterweightHelps(state)) fx.nudge = { age: 0, dir: dr > 0 ? -1 : 1 };
  }
  if (r.rebuilt > 0) {
    const text = r.rebuilt >= 2 ? `REBUILT ×${r.rebuilt}` : `REBUILT +${Math.round(r.regained)}`;
    pop(fx, { text, tone: "gold", level: d.level, line: 1, age: -0.1, life: 1.2 });
    fx.sweeps.push({ level: d.level, left: r.grewLeft, right: r.grewRight, age: 0 });
  }
}

/** state.saves went up: the tower came back from the rail. */
export function onSaved(fx: Fx, state: GameState): void {
  fx.savedAge = 0;
  fx.nudge = null;
  // The logic just proved the tower is out of danger: drop the DANGER label's hold.
  fx.dangerHold = 0;
  const n = topLevel(state);
  pop(fx, { text: "SAVED!", tone: "accent", level: n, life: 1.3, size: 0.1 });
  const st = stability(state);
  const side = fx.side === 0 ? 1 : fx.side;
  const rail = railAt(state, st, side);
  if (rail) {
    burst(fx, rail.x, (rail.level + 0.5) * BLOCK_HEIGHT, 18, "warn", 34, 2, BLOCK_HEIGHT * 3, side);
    burst(fx, rail.x, (rail.level + 0.5) * BLOCK_HEIGHT, 10, "white", 28, 2, BLOCK_HEIGHT * 3);
  }
}

/** The tower climbed into a windy band. */
export function onWindZone(fx: Fx): void {
  fx.windAge = 0;
}

/** Haptic cues since the last call. */
export function takeCues(fx: Fx): Cue[] {
  const out = fx.cues;
  fx.cues = [];
  return out;
}

function ease(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/** Age every item by `dt` and drop the expired ones, in place (no new array each frame). */
function age<T extends { age: number }>(list: T[], dt: number, life: (x: T) => number): void {
  let j = 0;
  for (const x of list) {
    x.age += dt;
    if (x.age < life(x)) list[j++] = x;
  }
  list.length = j;
}
const popLife = (p: Pop) => p.life;
const arrowLife = () => ARROW_TIME;
const sweepLife = () => SWEEP_GROW + SWEEP_FADE;
const sparkLife = (s: Spark) => s.life;

export function updateFx(fx: Fx, state: GameState, dt: number, falling: Falling[]): void {
  age(fx.pops, dt, popLife);
  age(fx.arrows, isTipping(fx.tier) ? dt * ARROW_RUSH : dt, arrowLife);
  age(fx.sweeps, dt, sweepLife);
  for (const s of fx.sparks) {
    s.vy -= SPARK_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  age(fx.sparks, dt, sparkLife);
  if (fx.lock) {
    fx.lock.age += dt;
    if (fx.lock.age > LOCK_TIME) fx.lock = null;
  }
  if (fx.nudge) {
    fx.nudge.age += dt;
    if (fx.nudge.age > NUDGE_TIME) fx.nudge = null;
  }
  fx.armedAge += dt;
  fx.savedAge += dt;
  fx.windAge += dt;
  fx.creakAge += dt;
  fx.beatAge += dt;

  if (state.phase === "over") {
    fx.lastChance = null;
    if (state.toppled && !fx.topple) {
      const p = fallPivot(state);
      fx.topple = { age: 0, pivot: p, dir: state.toppled.dir, peeled: 0 };
      // Clear the stage for the fall and the TOPPLED! slam.
      for (const o of fx.pops) o.life = Math.min(o.life, Math.max(0, o.age) + 0.2);
      fx.nudge = null;
      const b = state.blocks[p];
      if (b) {
        const x = b.x + swayOffset(state, p) + (state.toppled.dir > 0 ? b.w : 0);
        burst(fx, x - state.toppled.dir * b.w * 0.25, (p + 1) * BLOCK_HEIGHT, 16, "white", 30, b.w * 0.5, 2);
      }
    }
    if (fx.topple) stepTopple(fx.topple, state, dt, falling);
    fx.amber = ease(fx.amber, 0, TIER_EASE, dt);
    fx.red = ease(fx.red, 0, TIER_EASE, dt);
    // Roll with the fall, then level out under the game-over card.
    const falls = fx.topple !== null && fx.topple.age < TOPPLE_CARD_AT;
    setRoll(fx, falls && fx.topple ? fx.topple.dir * ROLL_MAX : 0, dt);
    return;
  }

  const st = stability(state);
  fx.side = toppleSide(state, st, fx.side);
  if (Math.abs(st.leanTarget) > DRIFT_EPS) fx.driftSide = sign(st.leanTarget);
  if (st.forecastRatio >= WOBBLY_ON) fx.wobblyOn = true;
  else if (st.forecastRatio < WOBBLY_OFF) fx.wobblyOn = false;
  if (isRed(st.level)) fx.dangerHold = DANGER_HOLD;
  else fx.dangerHold = Math.max(0, fx.dangerHold - dt);

  const prev = fx.tier;
  // Once LAST CHANCE shows, it stays until a drop resets the teeter (or it drains to a save):
  // the logic reads TEETER again whenever the top swings back inside the rail.
  const latched = fx.lastChance !== null && state.teeter > 0 && !state.armed;
  let tier: Tier = "steady";
  if (st.level === "lastChance" || latched) tier = "lastChance";
  else if (st.level === "teeter") tier = "teeter";
  else if (fx.dangerHold > 0) tier = "danger";
  else if (fx.wobblyOn) tier = "wobbly";
  fx.tier = tier;
  if (tier !== "steady") fx.lastTag = tier;
  if (tier === "lastChance") {
    const left = Math.max(0, Math.min(1, (tuning.teeterTime + LAST_CHANCE_TIME - state.teeter) / LAST_CHANCE_TIME));
    if (fx.lastChance) {
      fx.lastChance.age += dt;
      fx.lastChance.left = Math.min(fx.lastChance.left, left);
    } else fx.lastChance = { age: 0, left };
  } else fx.lastChance = null;

  if (tier === "danger" && !isRed(prev)) {
    // A fresh HOLD ON! already says it.
    if (!popsActive(fx, "danger")) {
      pop(fx, { text: "WHOA!", tone: "danger", level: topLevel(state), line: 1, side: fx.side === 0 ? 1 : fx.side, life: 0.9, size: 0.065 });
    }
    fx.cues.push("whoa");
  }
  // Heartbeat while teetering (from the first frame of it).
  if (tier === "teeter" && (prev !== "teeter" || fx.beatAge >= HEARTBEAT)) {
    fx.cues.push("teeter");
    fx.beatAge = 0;
  }

  fx.amber = ease(fx.amber, tier === "steady" ? 0 : 1, TIER_EASE, dt);
  fx.red = ease(fx.red, isRed(tier) ? 1 : 0, TIER_EASE, dt);
  const rollTarget = tier === "teeter" ? fx.side * ROLL_MAX * st.teeter01 : tier === "lastChance" ? fx.side * ROLL_MAX : 0;
  setRoll(fx, rollTarget, dt);

  // Creak: a tick at each heavy-side swing peak while the tower is wobbly.
  if (dt > 0) {
    const vel = (st.tilt - fx.prevTilt) / dt;
    const side = fx.side;
    const peak = side !== 0 && Math.sign(fx.prevVel) === side && Math.sign(vel) === -side;
    if (peak && tier !== "steady" && st.tilt * side > 0 && fx.creakAge > CREAK_GAP) {
      fx.cues.push("creak");
      fx.creakAge = 0;
    }
    fx.prevVel = vel;
  }
  fx.prevTilt = st.tilt;
}

function setRoll(fx: Fx, target: number, dt: number): void {
  fx.roll = ease(fx.roll, target, ROLL_EASE, dt);
  if (target === 0 && Math.abs(fx.roll) < ROLL_SNAP) fx.roll = 0;
}

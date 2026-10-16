import {
  BASE_WIDTH,
  CALM_EASE,
  CALM_TIME,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_PER_LEVEL,
  SWAY_BEND_POWER,
  SWAY_FULL_LEVEL,
  SWAY_KICK_FULL_LEVEL,
  SWAY_KICK_MAX,
  WORLD_WIDTH,
  tuning,
} from "./config";

/** A block: left edge and width, in world units. */
export interface Block {
  x: number;
  w: number;
}

/** The slider moves in world space; it does not ride the swaying tower. */
export interface Slider extends Block {
  dir: 1 | -1;
}

export type Phase = "playing" | "over";

export interface GameState {
  phase: Phase;
  /**
   * blocks[0] is the base; the last entry is the tower top.
   * Block x is tower-local: its world x is x + swayOffset(state, index).
   */
  blocks: Block[];
  slider: Slider;
  score: number;
  streak: number;
  /** Total perfect drops this game. */
  perfects: number;
  /** The most recent slice off the tower, which the next perfect drop wins back. */
  lastCut: { w: number; side: -1 | 1 } | null;
  lives: number;
  /** Sway phase in radians; accumulated so changing the period mid-game doesn't jump. */
  swayAngle: number;
  /** Kick spring displacement and velocity (world units, units/sec). */
  kick: number;
  kickVel: number;
  /** 0..1, eases toward 1 after a perfect drop and back to 0 when calmTimer runs out. */
  calm: number;
  calmTimer: number;
}

/** Placed is tower-local; cut is world space (it has left the tower). */
export type DropResult =
  | { kind: "perfect"; placed: Block; regained: number }
  | { kind: "sliced"; placed: Block; cut: Block }
  | { kind: "miss"; cut: Block };

export function top(state: GameState): Block {
  const b = state.blocks[state.blocks.length - 1];
  if (!b) throw new Error("tower has no blocks");
  return b;
}

/** Horizontal displacement of the block at `level` right now, in world units. */
export function swayOffset(state: GameState, level: number): number {
  if (!tuning.swayOn) return 0;
  const bend = Math.min(1, level / SWAY_FULL_LEVEL) ** SWAY_BEND_POWER;
  const kickBend = Math.min(1, level / SWAY_KICK_FULL_LEVEL);
  const damp = 1 - tuning.perfectCalm * state.calm;
  return (Math.sin(state.swayAngle) * tuning.swayBase * bend + state.kick * kickBend) * damp;
}

/** Sway angular frequency, radians/sec. */
function omega(): number {
  return (2 * Math.PI) / tuning.swayPeriod;
}

/** Current kick amplitude (peak displacement it would reach), in world units. */
export function kickAmplitude(state: GameState): number {
  return Math.hypot(state.kick, state.kickVel / omega());
}

export function sliderSpeed(state: GameState): number {
  return Math.min(
    tuning.slideSpeed + state.score * SLIDE_SPEED_PER_LEVEL,
    Math.max(SLIDE_SPEED_MAX, tuning.slideSpeed),
  );
}

/** Damped spring; substeps keep it stable on long frames. */
function stepKick(state: GameState, dt: number): void {
  const w = omega();
  // Past critical damping the spring settles *slower*, so cap it there.
  const c = Math.min(tuning.kickDecay, w);
  const n = Math.ceil(dt / (1 / 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = -w * w * state.kick - 2 * c * state.kickVel;
    state.kickVel += acc * h;
    state.kick += state.kickVel * h;
  }
}

/** Push the tower toward `dir`; the position doesn't jump, only the velocity changes. */
function addKick(state: GameState, amount: number, dir: 1 | -1): void {
  state.kickVel += dir * amount * omega();
  const amp = kickAmplitude(state);
  if (amp > SWAY_KICK_MAX) {
    const k = SWAY_KICK_MAX / amp;
    state.kick *= k;
    state.kickVel *= k;
  }
}

function sliderBounds(under: Block, w: number): [number, number] {
  // Centered on the tower's rest position, so the path is fixed in world space.
  const center = under.x + under.w / 2;
  return [center - SLIDE_RANGE - w / 2, center + SLIDE_RANGE - w / 2];
}

function spawnSlider(under: Block, level: number): Slider {
  const fromLeft = level % 2 === 0;
  const [minX, maxX] = sliderBounds(under, under.w);
  return { x: fromLeft ? minX : maxX, w: under.w, dir: fromLeft ? 1 : -1 };
}

export function newGame(): GameState {
  const base: Block = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, w: BASE_WIDTH };
  return {
    phase: "playing",
    blocks: [base],
    slider: spawnSlider(base, 0),
    score: 0,
    streak: 0,
    perfects: 0,
    lastCut: null,
    lives: LIVES,
    swayAngle: 0,
    kick: 0,
    kickVel: 0,
    calm: 0,
    calmTimer: 0,
  };
}

/** Advance time by dt seconds: slider bounces, sway moves, kick decays. */
export function step(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  state.swayAngle = (state.swayAngle + omega() * dt) % (2 * Math.PI);
  if (tuning.swayOn) stepKick(state, dt);
  state.calmTimer = Math.max(0, state.calmTimer - dt);
  const calmTarget = state.calmTimer > 0 ? 1 : 0;
  state.calm += (calmTarget - state.calm) * (1 - Math.exp(-CALM_EASE * dt));

  const s = state.slider;
  const [minX, maxX] = sliderBounds(top(state), s.w);
  s.x += s.dir * sliderSpeed(state) * dt;
  // Reflect off the ends; loop handles a dt long enough to cross both.
  for (;;) {
    if (s.x > maxX) {
      s.x = 2 * maxX - s.x;
      s.dir = -1;
    } else if (s.x < minX) {
      s.x = 2 * minX - s.x;
      s.dir = 1;
    } else break;
  }
}

/** Drop the slider onto the tower. Returns what happened for the renderer. */
export function drop(state: GameState): DropResult | null {
  if (state.phase !== "playing") return null;
  const underLevel = state.blocks.length - 1;
  const newLevel = state.blocks.length;
  const under = top(state);
  const underX = under.x + swayOffset(state, underLevel); // world
  const s = state.slider;

  const left = Math.max(s.x, underX);
  const right = Math.min(s.x + s.w, underX + under.w);
  const overlap = right - left;

  if (overlap <= 0) {
    state.lives -= 1;
    state.streak = 0;
    if (state.lives <= 0) state.phase = "over";
    const cut = { x: s.x, w: s.w };
    state.slider = spawnSlider(under, newLevel);
    return { kind: "miss", cut };
  }

  // Convert world x back to tower-local at the new block's level, so it
  // stays exactly where it was dropped.
  const newOffset = swayOffset(state, newLevel);
  let result: DropResult;
  if (Math.abs(s.x - underX) <= PERFECT_TOLERANCE) {
    // Perfect: sits square on the block below, adds no sway, calms the tower,
    // and wins back the most recent slice on the side it was cut from.
    state.streak += 1;
    state.perfects += 1;
    state.calmTimer = CALM_TIME;
    const back = state.lastCut;
    state.lastCut = null;
    const placed = back
      ? { x: back.side < 0 ? under.x - back.w : under.x, w: under.w + back.w }
      : { x: under.x, w: under.w };
    result = { kind: "perfect", placed, regained: back?.w ?? 0 };
  } else {
    const cutW = s.w - overlap;
    const cut = s.x < underX ? { x: s.x, w: cutW } : { x: right, w: cutW };
    state.streak = 0;
    state.lastCut = { w: cutW, side: s.x < underX ? -1 : 1 };
    if (tuning.swayOn) addKick(state, cutW * tuning.kickPerUnit, s.x < underX ? -1 : 1);
    result = { kind: "sliced", placed: { x: left - newOffset, w: overlap }, cut };
  }

  state.blocks.push(result.placed);
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

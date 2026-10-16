import {
  BASE_WIDTH,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_PER_LEVEL,
  SLIDE_SPEED_START,
  SWAY_BASE,
  SWAY_BEND_POWER,
  SWAY_FULL_LEVEL,
  SWAY_KICK_DECAY,
  SWAY_KICK_FULL_LEVEL,
  SWAY_KICK_MAX,
  SWAY_KICK_PER_UNIT,
  SWAY_PERIOD,
  WORLD_WIDTH,
} from "./config";

/** A block: left edge and width, in world units. */
export interface Block {
  x: number;
  w: number;
}

/** The slider moves in world space; it does not ride the swaying tower. */
export interface Slider extends Block {
  dir: 1 | -1;
  speed: number;
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
  lives: number;
  /** Seconds since the game started; drives the sway phase. */
  time: number;
  /** Kick spring displacement and velocity (world units, units/sec). */
  kick: number;
  kickVel: number;
}

/** Placed is tower-local; cut is world space (it has left the tower). */
export type DropResult =
  | { kind: "perfect"; placed: Block }
  | { kind: "sliced"; placed: Block; cut: Block }
  | { kind: "miss"; cut: Block };

export function top(state: GameState): Block {
  const b = state.blocks[state.blocks.length - 1];
  if (!b) throw new Error("tower has no blocks");
  return b;
}

/** Horizontal displacement of the block at `level` right now, in world units. */
export function swayOffset(state: GameState, level: number): number {
  const wave = Math.sin((2 * Math.PI * state.time) / SWAY_PERIOD);
  const bend = Math.min(1, level / SWAY_FULL_LEVEL) ** SWAY_BEND_POWER;
  const kickBend = Math.min(1, level / SWAY_KICK_FULL_LEVEL);
  return wave * SWAY_BASE * bend + state.kick * kickBend;
}

const OMEGA = (2 * Math.PI) / SWAY_PERIOD;

/** Current kick amplitude (peak displacement it would reach), in world units. */
export function kickAmplitude(state: GameState): number {
  return Math.hypot(state.kick, state.kickVel / OMEGA);
}

/** Damped spring; substeps keep it stable on long frames. */
function stepKick(state: GameState, dt: number): void {
  const n = Math.ceil(dt / (1 / 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = -OMEGA * OMEGA * state.kick - 2 * SWAY_KICK_DECAY * state.kickVel;
    state.kickVel += acc * h;
    state.kick += state.kickVel * h;
  }
}

/** Push the tower toward `dir`; the position doesn't jump, only the velocity changes. */
function addKick(state: GameState, amount: number, dir: 1 | -1): void {
  state.kickVel += dir * amount * OMEGA;
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
  const speed = Math.min(SLIDE_SPEED_START + level * SLIDE_SPEED_PER_LEVEL, SLIDE_SPEED_MAX);
  return { x: fromLeft ? minX : maxX, w: under.w, dir: fromLeft ? 1 : -1, speed };
}

export function newGame(): GameState {
  const base: Block = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, w: BASE_WIDTH };
  return {
    phase: "playing",
    blocks: [base],
    slider: spawnSlider(base, 0),
    score: 0,
    streak: 0,
    lives: LIVES,
    time: 0,
    kick: 0,
    kickVel: 0,
  };
}

/** Advance time by dt seconds: slider bounces, sway moves, kick decays. */
export function step(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  state.time += dt;
  stepKick(state, dt);

  const s = state.slider;
  const [minX, maxX] = sliderBounds(top(state), s.w);
  s.x += s.dir * s.speed * dt;
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
    // Perfect: sits square on the block below; adds no sway.
    state.streak += 1;
    result = { kind: "perfect", placed: { x: under.x, w: under.w } };
  } else {
    const cutW = s.w - overlap;
    const cut = s.x < underX ? { x: s.x, w: cutW } : { x: right, w: cutW };
    state.streak = 0;
    addKick(state, cutW * SWAY_KICK_PER_UNIT, s.x < underX ? -1 : 1);
    result = { kind: "sliced", placed: { x: left - newOffset, w: overlap }, cut };
  }

  state.blocks.push(result.placed);
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

import {
  BALANCE_EPSILON,
  BASE_WIDTH,
  CALM_EASE,
  CALM_TIME,
  HARD_CALM_TIME,
  HARD_KICK_DECAY_SCALE,
  HARD_KICK_SCALE,
  HARD_LIVES,
  HARD_PERFECT_CALM_SCALE,
  HARD_PERFECT_TOLERANCE,
  HARD_SLIDE_SPEED_MAX,
  HARD_SLIDE_SPEED_PER_LEVEL,
  HARD_SLIDE_SPEED_SCALE,
  HARD_SWAY_BEND_POWER,
  HARD_SWAY_FULL_LEVEL,
  HARD_SWAY_KICK_FULL_LEVEL,
  HARD_SWAY_KICK_MAX,
  HARD_SWAY_PERIOD_SCALE,
  HARD_SWAY_SCALE,
  HARD_TEMPO_MAX,
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

/**
 * Normal: the standard rules (overhangs are sliced off, LIVES lives).
 * Hard: real balance (nothing is sliced: a bar keeps its full width where it lands, and the tower
 * tips over when an upper part's center of mass passes its contact edge), one life, and the
 * music's tempo follows the slider. The same rules otherwise, with every difficulty knob turned
 * up: a faster slider that speeds up harder, stronger and faster sway, harder kicks that last
 * longer, a tighter perfect window and a weaker, shorter perfect calm (config.ts HARD_*).
 */
export type Mode = "normal" | "hard";

/** Where a tower tips: the part from bar `level` up falls toward `dir` (-1 left, 1 right). */
export interface Tip {
  level: number;
  dir: -1 | 1;
}

export interface GameState {
  mode: Mode;
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
  /** Every slice taken off the tower, oldest first, by the edge that receded. Each perfect drop wins back the newest. */
  cuts: { w: number; side: -1 | 1 }[];
  lives: number;
  /** Sway phase in radians; accumulated so changing the period mid-game doesn't jump. */
  swayAngle: number;
  /** Kick spring displacement and velocity (world units, units/sec). */
  kick: number;
  kickVel: number;
  /** 0..1, eases toward 1 after a perfect drop and back to 0 when calmTimer runs out. */
  calm: number;
  calmTimer: number;
  /** Hard mode: the tip that ended the run (its bars are falling away), else null. */
  toppled: Tip | null;
}

/** Placed is tower-local; cut is world space (it has left the tower). */
export type DropResult =
  | { kind: "perfect"; placed: Block; regained: number }
  | { kind: "sliced"; placed: Block; cut: Block }
  | { kind: "miss"; cut: Block };

/**
 * Everything a drop can do. Hard mode adds "placed" (an off-center bar keeps its full width where
 * it landed; `overhang` is how far it hangs past the bar below, world units) and "toppled" (the
 * bar landed and the tower tipped over: game over).
 */
export type DropOutcome =
  | DropResult
  | { kind: "placed"; placed: Block; overhang: number }
  | { kind: "toppled"; placed: Block; tip: Tip };

/** Lives a run starts with. */
export function startLives(mode: Mode): number {
  return mode === "hard" ? HARD_LIVES : LIVES;
}

/**
 * The difficulty numbers a mode plays by. The *Scale fields multiply the live tuning (read at call
 * time); the rest stand in for Normal's constants. Normal's are exactly the shipped numbers (and
 * × 1 is exact, so its arithmetic is unchanged); Hard turns every one up (config.ts HARD_*).
 */
interface Rules {
  slideScale: number;
  slidePerLevel: number;
  slideMax: number;
  swayScale: number;
  periodScale: number;
  swayFullLevel: number;
  bendPower: number;
  kickScale: number;
  decayScale: number;
  kickFullLevel: number;
  kickMax: number;
  perfectTolerance: number;
  calmScale: number;
}

const NORMAL_RULES: Readonly<Rules> = {
  slideScale: 1,
  slidePerLevel: SLIDE_SPEED_PER_LEVEL,
  slideMax: SLIDE_SPEED_MAX,
  swayScale: 1,
  periodScale: 1,
  swayFullLevel: SWAY_FULL_LEVEL,
  bendPower: SWAY_BEND_POWER,
  kickScale: 1,
  decayScale: 1,
  kickFullLevel: SWAY_KICK_FULL_LEVEL,
  kickMax: SWAY_KICK_MAX,
  perfectTolerance: PERFECT_TOLERANCE,
  calmScale: 1,
};

const HARD_RULES: Readonly<Rules> = {
  slideScale: HARD_SLIDE_SPEED_SCALE,
  slidePerLevel: HARD_SLIDE_SPEED_PER_LEVEL,
  slideMax: HARD_SLIDE_SPEED_MAX,
  swayScale: HARD_SWAY_SCALE,
  periodScale: HARD_SWAY_PERIOD_SCALE,
  swayFullLevel: HARD_SWAY_FULL_LEVEL,
  bendPower: HARD_SWAY_BEND_POWER,
  kickScale: HARD_KICK_SCALE,
  decayScale: HARD_KICK_DECAY_SCALE,
  kickFullLevel: HARD_SWAY_KICK_FULL_LEVEL,
  kickMax: HARD_SWAY_KICK_MAX,
  perfectTolerance: HARD_PERFECT_TOLERANCE,
  calmScale: HARD_PERFECT_CALM_SCALE,
};

function rules(mode: Mode): Readonly<Rules> {
  return mode === "hard" ? HARD_RULES : NORMAL_RULES;
}

/** A drop this close (world units) to the bar below snaps to a perfect fit. */
export function perfectTolerance(mode: Mode): number {
  return rules(mode).perfectTolerance;
}

export function top(state: GameState): Block {
  const b = state.blocks[state.blocks.length - 1];
  if (!b) throw new Error("tower has no blocks");
  return b;
}

/** Horizontal displacement of the block at `level` right now, in world units. */
export function swayOffset(state: GameState, level: number): number {
  if (!tuning.swayOn) return 0;
  const r = rules(state.mode);
  const bend = Math.min(1, level / r.swayFullLevel) ** r.bendPower;
  const kickBend = Math.min(1, level / r.kickFullLevel);
  const damp = 1 - tuning.perfectCalm * r.calmScale * state.calm;
  return (Math.sin(state.swayAngle) * (tuning.swayBase * r.swayScale) * bend + state.kick * kickBend) * damp;
}

/** Sway angular frequency, radians/sec. */
function omega(mode: Mode): number {
  return (2 * Math.PI) / (tuning.swayPeriod * rules(mode).periodScale);
}

/** Current kick amplitude (peak displacement it would reach), in world units. */
export function kickAmplitude(state: GameState): number {
  return Math.hypot(state.kick, state.kickVel / omega(state.mode));
}

/** Slider speed at level 0, units/sec. */
function startSpeed(mode: Mode): number {
  return tuning.slideSpeed * rules(mode).slideScale;
}

export function sliderSpeed(state: GameState): number {
  const r = rules(state.mode);
  const start = startSpeed(state.mode);
  return Math.min(start + state.score * r.slidePerLevel, Math.max(r.slideMax, start));
}

/** Damped spring; substeps keep it stable on long frames. */
function stepKick(state: GameState, dt: number): void {
  const w = omega(state.mode);
  // Past critical damping the spring settles *slower*, so cap it there.
  const c = Math.min(tuning.kickDecay * rules(state.mode).decayScale, w);
  const n = Math.ceil(dt / (1 / 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = -w * w * state.kick - 2 * c * state.kickVel;
    state.kickVel += acc * h;
    state.kick += state.kickVel * h;
  }
}

/** Push the tower toward `dir`; the position doesn't jump, only the velocity changes. */
function addKick(state: GameState, overhang: number, dir: 1 | -1): void {
  const r = rules(state.mode);
  const w = omega(state.mode);
  state.kickVel += dir * (overhang * (tuning.kickPerUnit * r.kickScale)) * w;
  if (kickAmplitude(state) > r.kickMax) {
    // Cap the swing by trimming velocity only: the tower's position never jumps.
    const room = r.kickMax ** 2 - state.kick ** 2;
    state.kickVel = room > 0 ? Math.sign(state.kickVel) * Math.sqrt(room) * w : 0;
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

export function newGame(mode: Mode = "normal"): GameState {
  const base: Block = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, w: BASE_WIDTH };
  return {
    mode,
    phase: "playing",
    blocks: [base],
    slider: spawnSlider(base, 0),
    score: 0,
    streak: 0,
    perfects: 0,
    cuts: [],
    lives: startLives(mode),
    swayAngle: 0,
    kick: 0,
    kickVel: 0,
    calm: 0,
    calmTimer: 0,
    toppled: null,
  };
}

/** Advance time by dt seconds: slider bounces, sway moves, kick decays. */
export function step(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  state.swayAngle = (state.swayAngle + omega(state.mode) * dt) % (2 * Math.PI);
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
export function drop(state: GameState): DropOutcome | null {
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
  if (state.mode === "hard") return dropHard(state, underX, overlap);

  // Convert world x back to tower-local at the new block's level, so it
  // stays exactly where it was dropped.
  const newOffset = swayOffset(state, newLevel);
  let result: DropResult;
  if (Math.abs(s.x - underX) <= PERFECT_TOLERANCE) {
    // Perfect: sits square on the block below, adds no sway, calms the tower,
    // and wins back the newest remaining slice on the edge that lost it. A run of
    // perfects rebuilds the tower all the way back to its original bar.
    state.streak += 1;
    state.perfects += 1;
    state.calmTimer = CALM_TIME;
    const back = state.cuts.pop();
    const placed = back
      ? { x: back.side < 0 ? under.x - back.w : under.x, w: under.w + back.w }
      : { x: under.x, w: under.w };
    result = { kind: "perfect", placed, regained: back?.w ?? 0 };
  } else {
    const cutW = s.w - overlap;
    const cut = s.x < underX ? { x: s.x, w: cutW } : { x: right, w: cutW };
    state.streak = 0;
    // Record the edge of the tower that receded (opposite the overhang that fell).
    state.cuts.push({ w: cutW, side: s.x < underX ? 1 : -1 });
    if (tuning.swayOn) addKick(state, cutW, s.x < underX ? -1 : 1);
    result = { kind: "sliced", placed: { x: left - newOffset, w: overlap }, cut };
  }

  state.blocks.push(result.placed);
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

/**
 * Hard mode, after a drop that touched the tower: nothing is sliced. A perfect snaps centered on
 * the bar below (calm, streak, PERFECT, as in Normal); any other drop keeps the whole bar where it
 * landed and kicks the sway by the overhang. Then the tower's balance is checked at rest.
 */
function dropHard(state: GameState, underX: number, overlap: number): DropOutcome {
  const under = top(state);
  const s = state.slider;
  const perfect = Math.abs(s.x - underX) <= HARD_PERFECT_TOLERANCE;
  // Back to tower-local at the new bar's level, so it stays exactly where it was dropped.
  const placed = perfect
    ? { x: under.x + (under.w - s.w) / 2, w: s.w }
    : { x: s.x - swayOffset(state, state.blocks.length), w: s.w };
  state.blocks.push(placed);

  const tip = balanceFailure(state.blocks);
  if (tip) {
    // The bar landed, then the tower went over: it does not score, and the one life is gone.
    state.toppled = tip;
    state.streak = 0;
    state.lives = 0;
    state.phase = "over";
    return { kind: "toppled", placed, tip };
  }

  let result: DropOutcome;
  if (perfect) {
    state.streak += 1;
    state.perfects += 1;
    state.calmTimer = HARD_CALM_TIME;
    result = { kind: "perfect", placed, regained: 0 };
  } else {
    const overhang = s.w - overlap;
    state.streak = 0;
    if (tuning.swayOn) addKick(state, overhang, s.x < underX ? -1 : 1);
    result = { kind: "placed", placed, overhang };
  }
  state.score += 1;
  state.slider = spawnSlider(placed, state.score);
  return result;
}

/**
 * Real balance, with every bar's weight proportional to its width (uniform density). For each
 * interface between bar i-1 and bar i, the combined center of mass of bars i..top must lie within
 * their contact span (the overlap of the two bars). Returns the LOWEST interface that fails (the
 * part from bar `level` up tips over toward `dir`, the side its center of mass passed), or null if
 * the tower stands. Uses the bars' rest positions: sway alone never tips a tower.
 */
export function balanceFailure(blocks: readonly Block[]): Tip | null {
  // Weight and moment of bars i..top, built from the top down; the lowest failure is kept.
  let weight = 0;
  let moment = 0;
  let lowest: Tip | null = null;
  for (let i = blocks.length - 1; i >= 1; i--) {
    const bar = blocks[i]!;
    const below = blocks[i - 1]!;
    weight += bar.w;
    moment += bar.w * (bar.x + bar.w / 2);
    const com = moment / weight;
    const left = Math.max(bar.x, below.x);
    const right = Math.min(bar.x + bar.w, below.x + below.w);
    if (com < left - BALANCE_EPSILON || com > right + BALANCE_EPSILON) {
      lowest = { level: i, dir: com < (left + right) / 2 ? -1 : 1 };
    }
  }
  return lowest;
}

/**
 * How fast the music plays, as a multiple of its written tempo. Hard mode: it keeps pace with the
 * slider (as written at Hard's starting speed, up to HARD_TEMPO_MAX). Normal mode, the title screen
 * and game over: 1.
 */
export function musicTempo(state: GameState): number {
  if (state.mode !== "hard" || state.phase !== "playing" || state.score === 0) return 1;
  return Math.max(1, Math.min(HARD_TEMPO_MAX, sliderSpeed(state) / startSpeed("hard")));
}

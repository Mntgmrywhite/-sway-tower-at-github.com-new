import {
  BASE_WIDTH,
  CALM_EASE,
  CALM_TIME,
  DROP_GAP,
  DROP_GRAVITY,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_PER_LEVEL,
  SWAY_BEND_POWER,
  SWAY_FULL_LEVEL,
  SWAY_KICK_FULL_LEVEL,
  SWAY_KICK_MAX,
  TEMPO_MAX,
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
 * The two modes play by the same rules and numbers (overhangs slice off, perfects calm the sway and
 * win slices back, LIVES lives, the same slider speed ramp, sway, kicks and calm). They differ in
 * how a bar reaches the tower:
 * - Normal (shown as "Slide"): the slider runs across the top of the tower; a tap lands it at once.
 * - Hard (shown as "Drop"): the slider runs a bar above the tower (DROP_GAP); a tap stops it and
 *   lets the bar go. It falls straight down while the tower sways on under it, and lands on
 *   contact, judged in world space against the top bar where it has swayed to by then (step()
 *   reports that landing). Taps while it falls do nothing.
 * The ids stay "normal" and "hard": saves (bests, the mode, medals) are keyed by them.
 */
export type Mode = "normal" | "hard";

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
  /**
   * Always null: nothing topples (the old Hard rules' balance check is gone). Kept because the
   * frozen Normal parity test (src/normal-parity.test.ts) checks it.
   */
  toppled: null;
  /**
   * Drop: the bar the last tap let go, falling straight down from the slider's lane onto the tower
   * (`t`: seconds since the tap; it falls at the slider's x), or null while the slider runs.
   * Always null in Slide.
   */
  fall: { t: number } | null;
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

/** Slider speed, units/sec: tuning.slideSpeed at the start of a run, faster with every bar (both modes). */
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
  if (kickAmplitude(state) > SWAY_KICK_MAX) {
    // Cap the swing by trimming velocity only: the tower's position never jumps.
    const room = SWAY_KICK_MAX ** 2 - state.kick ** 2;
    state.kickVel = room > 0 ? Math.sign(state.kickVel) * Math.sqrt(room) * omega() : 0;
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
    lives: LIVES,
    swayAngle: 0,
    kick: 0,
    kickVel: 0,
    calm: 0,
    calmTimer: 0,
    toppled: null,
    fall: null,
  };
}

/** How far the slider's lane runs above the tower top's upper face, world units: 0 in Slide, DROP_GAP in Drop. */
export function sliderGap(mode: Mode): number {
  return mode === "hard" ? DROP_GAP : 0;
}

/** Seconds from a tap to the bar's contact with the tower: 0 in Slide (it lands at once); in Drop, the fall through DROP_GAP. */
export function fallTime(mode: Mode): number {
  return Math.sqrt((2 * sliderGap(mode)) / DROP_GRAVITY);
}

/**
 * How far the slider's bottom is above the tower top's upper face right now, world units: 0 in
 * Slide; in Drop, DROP_GAP while it runs, closing (faster and faster) as a released bar falls.
 */
export function sliderLift(state: GameState): number {
  const t = state.fall?.t ?? 0;
  return Math.max(0, sliderGap(state.mode) - 0.5 * DROP_GRAVITY * t * t);
}

/** How fast a released bar is falling when it reaches the tower, world units/s (0 in Slide). */
export function contactSpeed(mode: Mode): number {
  return DROP_GRAVITY * fallTime(mode);
}

/** The sway moves, the kick decays, the calm eases: everything but the slider, for dt seconds. */
function advance(state: GameState, dt: number): void {
  state.swayAngle = (state.swayAngle + omega() * dt) % (2 * Math.PI);
  if (tuning.swayOn) stepKick(state, dt);
  state.calmTimer = Math.max(0, state.calmTimer - dt);
  const calmTarget = state.calmTimer > 0 ? 1 : 0;
  state.calm += (calmTarget - state.calm) * (1 - Math.exp(-CALM_EASE * dt));
}

/** The slider runs for dt seconds, bouncing off the ends of its path. */
function slide(state: GameState, dt: number): void {
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

/**
 * Advance time by dt seconds: slider bounces, sway moves, kick decays. In Drop, a released bar
 * falls instead of the slider running (straight down: the tower keeps swaying under it); if it
 * reaches the tower within dt, it lands at that exact moment (the sway as it is then) and the rest
 * of dt runs on with the next slider. Returns that landing, else null (always null in Slide).
 */
export function step(state: GameState, dt: number): DropResult | null {
  if (state.phase !== "playing") return null;
  const fall = state.fall;
  if (fall) {
    const left = fallTime(state.mode) - fall.t;
    if (dt < left) {
      advance(state, dt);
      fall.t += dt;
      return null;
    }
    advance(state, left);
    state.fall = null;
    const landed = land(state);
    const rest = dt - left;
    if (state.phase === "playing" && rest > 0) {
      advance(state, rest);
      slide(state, rest);
    }
    return landed;
  }
  advance(state, dt);
  slide(state, dt);
  return null;
}

/**
 * The tap. Slide: the slider lands on the tower now; returns what happened for the renderer.
 * Drop: the bar is let go and null comes back (step() lands it once it has fallen through the
 * gap); a tap while a bar is still falling does nothing.
 */
export function drop(state: GameState): DropResult | null {
  if (state.phase !== "playing") return null;
  if (state.mode === "hard") {
    state.fall ??= { t: 0 };
    return null;
  }
  return land(state);
}

/** The slider's bar meets the tower top where it is right now (world space): what happened. */
function land(state: GameState): DropResult {
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
    if (tuning.swayOn) addKick(state, cutW * tuning.kickPerUnit, s.x < underX ? -1 : 1);
    result = { kind: "sliced", placed: { x: left - newOffset, w: overlap }, cut };
  }

  state.blocks.push(result.placed);
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

/**
 * How fast the music plays, as a multiple of its written tempo. While a run is played (in either
 * mode) it keeps pace with the slider: as written at the run's starting speed, faster as the slider
 * speeds up, up to TEMPO_MAX. The title screen (a fresh run, nothing dropped yet) and game over: 1.
 */
export function musicTempo(state: GameState): number {
  if (state.phase !== "playing" || state.score === 0) return 1;
  return Math.max(1, Math.min(TEMPO_MAX, sliderSpeed(state) / tuning.slideSpeed));
}

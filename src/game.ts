import {
  BASE_WIDTH,
  CALM_EASE,
  CALM_TIME,
  DANGER_FRAC,
  DRIFT_EPS,
  GUST_BAND,
  GUST_BLOW,
  GUST_GAP_MAX,
  GUST_GAP_MIN,
  GUST_START_LEVEL,
  GUST_STRENGTH_FIRST,
  GUST_STRENGTH_STEP,
  GUST_WARN,
  KICK_SUBSTEP,
  LAST_CHANCE_TIME,
  LEAN_EASE,
  LEAN_SPAN,
  LEAN_SWAY_REF,
  LEAN_TOP_EASE,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_PER_LEVEL,
  SWAY_BEND_POWER,
  SWAY_FULL_LEVEL,
  SWAY_KICK_FULL_LEVEL,
  SWAY_KICK_MAX,
  TEETER_RECOVER,
  WARN_FRAC,
  WORLD_WIDTH,
  tuning,
} from "./config";

export interface Block {
  x: number;
  w: number;
}

export interface Slider extends Block {
  dir: 1 | -1;
}

export type Phase = "playing" | "over";
export type GustPhase = "idle" | "warn" | "blow";
export interface Gust {
  phase: GustPhase;
  /** Seconds into the current phase. */
  t: number;
  dir: 1 | -1;
  /** Peak push, world units, captured when the gust starts. */
  amp: number;
}
export type Warning = "steady" | "wobbly" | "danger" | "teeter" | "lastChance";

export interface GameState {
  phase: Phase;
  blocks: Block[];
  slider: Slider;
  score: number;
  streak: number;
  perfects: number;
  cuts: { w: number; side: -1 | 1 }[];
  lives: number;
  swayAngle: number;
  kick: number;
  kickVel: number;
  calm: number;
  calmTimer: number;
  // --- balance ---
  /** Run seed for gust directions/gaps (main passes one; tests pass constants). */
  seed: number;
  /** Structural lean at the top, world units, + = right. Eases toward leanTarget(). */
  lean: number;
  /** Level the lean profile is anchored to; eases toward the top level. */
  leanTop: number;
  /** Game-seconds past the topple rail. 0..teeterTime = TEETER, beyond = LAST CHANCE (unarmed only). */
  teeter: number;
  /** Set by a sloppy drop made while WOBBLY that made the imbalance worse. Only an armed tower topples at teeterTime. */
  armed: boolean;
  /** Rebuilds earned by perfects while the tower was swinging; paid on the next calm perfect. */
  banked: number;
  /** Near-miss bookkeeping for SAVED!. */
  inDanger: boolean;
  saves: number;
  toppled: { dir: 1 | -1; level: number } | null;
  gust: Gust;
  /** Score at/after which the next gust may start. */
  nextGust: number;
}

export type DropResult =
  | {
      kind: "perfect";
      placed: Block;
      regained: number;
      rebuilt: number;
      steadied: boolean;
      grewLeft: number;
      grewRight: number;
    }
  | { kind: "sliced"; placed: Block; cut: Block; armed: boolean }
  | { kind: "miss"; cut: Block };

export function top(state: GameState): Block {
  const b = state.blocks[state.blocks.length - 1];
  if (!b) throw new Error("tower has no blocks");
  return b;
}

export function topLevel(state: GameState): number {
  return state.blocks.length - 1;
}

export function kickBend(level: number): number {
  return Math.min(1, level / SWAY_KICK_FULL_LEVEL);
}

function damp(state: GameState): number {
  return 1 - tuning.perfectCalm * state.calm;
}

/** Sway angular frequency, radians/sec. */
function omega(): number {
  return (2 * Math.PI) / tuning.swayPeriod;
}

// --- balance read functions (pure) ------------------------------------------------

/** Moment arm: top center minus base center, tower-local world units. */
export function drift(state: GameState): number {
  const b = state.blocks[0];
  const t = top(state);
  if (!b) return 0;
  return t.x + t.w / 2 - (b.x + b.w / 2);
}

/** Where the lean is heading: leanGain x kickBend(top) x drift. Short towers are stiff. */
export function leanTarget(state: GameState): number {
  if (!tuning.swayOn || !tuning.leanOn) return 0;
  return tuning.leanGain * kickBend(topLevel(state)) * drift(state);
}

/** 0 at and below leanTop - LEAN_SPAN, ramping to 1 at leanTop and above. The base never moves. */
export function leanShape(state: GameState, level: number): number {
  if (level <= 0) return 0;
  const lt = state.leanTop;
  if (level >= lt) return 1;
  const b = Math.max(0, lt - LEAN_SPAN);
  return level <= b ? 0 : (level - b) / (lt - b);
}

export function gustPush(state: GameState): number {
  const g = state.gust;
  return g.phase === "blow" ? g.dir * g.amp * Math.sin((Math.PI * g.t) / GUST_BLOW) ** 2 : 0;
}

/** Swing at the top (kick amplitude x kickBend): what the regrow-when-calm gate reads. Excludes lean. */
export function unrest(state: GameState): number {
  return kickBend(topLevel(state)) * kickAmplitude(state);
}

/** Largest gust push still to come (0 when idle; falling half: the current push). */
function gustAhead(state: GameState): number {
  const g = state.gust;
  if (g.phase === "idle") return 0;
  if (g.phase === "warn" || g.t < GUST_BLOW / 2) return g.amp;
  return Math.abs(gustPush(state));
}

/** What the lean eases toward right now: imbalance plus any gust, scaled like the lean. */
export function leanGoal(state: GameState): number {
  if (!tuning.swayOn) return 0;
  return leanTarget(state) + kickBend(topLevel(state)) * gustPush(state);
}

/** Non-wave displacement of the top right now, as drawn. The ambient wave never topples. */
export function tilt(state: GameState): number {
  if (!tuning.swayOn) return 0;
  const n = topLevel(state);
  return state.kick * kickBend(n) * damp(state) + state.lean * leanShape(state, n);
}

export function toppleLimit(state: GameState): number {
  return tuning.toppleLimit * (1 - tuning.thinTippy * (1 - Math.min(1, top(state).w / BASE_WIDTH)));
}

/**
 * Upper bound on |tilt| until the next drop or gust start. The lean is a first-order lag,
 * so it stays between its current value and the range its goal will cover (target, and
 * target plus the gust still to come); the swing's energy can't grow. Undamped (ignores
 * calm), so a perfect can't hide danger.
 */
export function forecast(state: GameState): number {
  if (!tuning.swayOn) return 0;
  const n = topLevel(state);
  const t = leanTarget(state);
  const g = t + kickBend(n) * state.gust.dir * gustAhead(state);
  return Math.max(Math.abs(state.lean), Math.abs(t), Math.abs(g)) + kickBend(n) * kickAmplitude(state);
}

export function windStrength(level: number): number {
  if (level < GUST_START_LEVEL) return 0;
  const band = Math.floor((level - GUST_START_LEVEL) / GUST_BAND);
  if (band % 2 === 1) return 0;
  return Math.min(1, GUST_STRENGTH_FIRST + GUST_STRENGTH_STEP * (band / 2));
}

/** Integer hash -> [0,1). Identical in every JS engine. */
export function hash01(seed: number, n: number): number {
  let x = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ (n | 0);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function canRebuild(state: GameState): boolean {
  return state.cuts.length > 0 && (!tuning.regrowNeedsCalm || !tuning.swayOn || unrest(state) <= tuning.regrowCalm);
}

export function warning(state: GameState): Warning {
  if (state.teeter > tuning.teeterTime) return "lastChance";
  if (state.teeter > 0) return "teeter";
  const lim = toppleLimit(state);
  if (Math.abs(tilt(state)) >= DANGER_FRAC * lim) return "danger";
  if (forecast(state) >= WARN_FRAC * lim) return "wobbly";
  return "steady";
}

export interface Stability {
  level: Warning;
  tilt: number;
  lean: number;
  leanTarget: number;
  forecast: number;
  limit: number;
  ratio: number;
  forecastRatio: number;
  /** Heavy side: sign of the lean target, else of tilt. */
  side: -1 | 0 | 1;
  /** 0..1 progress of TEETER, then of LAST CHANCE. */
  teeter01: number;
  lastChance01: number;
  armed: boolean;
  canRebuild: boolean;
  banked: number;
  saves: number;
}

export function stability(state: GameState): Stability {
  const lim = toppleLimit(state);
  const t = tilt(state);
  const f = forecast(state);
  const lt = leanTarget(state);
  const sideOf = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);
  return {
    level: warning(state),
    tilt: t,
    lean: state.lean,
    leanTarget: lt,
    forecast: f,
    limit: lim,
    ratio: Math.abs(t) / lim,
    forecastRatio: f / lim,
    side: Math.abs(lt) > DRIFT_EPS ? sideOf(lt) : sideOf(t),
    teeter01: Math.min(1, state.teeter / tuning.teeterTime),
    lastChance01: Math.max(0, Math.min(1, (state.teeter - tuning.teeterTime) / LAST_CHANCE_TIME)),
    armed: state.armed,
    canRebuild: canRebuild(state),
    banked: state.banked,
    saves: state.saves,
  };
}

/** main.ts eases its clock scale toward this; tests call step() directly. */
export function timeScale(state: GameState): number {
  return state.phase === "playing" && state.teeter > 0 && state.teeter <= tuning.teeterTime ? tuning.teeterSlowmo : 1;
}

/** The joint the top slab breaks at: narrowest block in the top LEAN_SPAN (lowest on ties). */
export function topplePivot(state: GameState): number {
  const n = topLevel(state);
  let best = Math.max(1, n - LEAN_SPAN);
  for (let i = best; i < n; i++) {
    const b = state.blocks[i];
    const cur = state.blocks[best];
    if (b && cur && b.w < cur.w) best = i;
  }
  return Math.min(best, Math.max(0, n - 1));
}

// --- motion ---------------------------------------------------------------------

/** Horizontal displacement of the block at `level` right now, in world units. */
export function swayOffset(state: GameState, level: number): number {
  if (!tuning.swayOn) return 0;
  const bend = Math.min(1, level / SWAY_FULL_LEVEL) ** SWAY_BEND_POWER;
  const lift = 1 + tuning.leanSway * Math.min(1, Math.abs(state.lean) / LEAN_SWAY_REF);
  const wave = Math.sin(state.swayAngle) * tuning.swayBase * bend * lift;
  return (wave + state.kick * kickBend(level)) * damp(state) + state.lean * leanShape(state, level);
}

/** Current kick amplitude about 0 (unchanged meaning), in world units. */
export function kickAmplitude(state: GameState): number {
  return Math.hypot(state.kick, state.kickVel / omega());
}

export function sliderSpeed(state: GameState): number {
  return Math.min(
    tuning.slideSpeed + state.score * SLIDE_SPEED_PER_LEVEL,
    Math.max(SLIDE_SPEED_MAX, tuning.slideSpeed),
  );
}

function stepGust(state: GameState, h: number): void {
  const g = state.gust;
  if (g.phase === "idle") return;
  g.t += h;
  if (g.phase === "warn" && g.t >= GUST_WARN) {
    g.phase = "blow";
    g.t -= GUST_WARN;
  } else if (g.phase === "blow" && g.t >= GUST_BLOW) {
    g.phase = "idle";
    g.t = 0;
  }
}

/** Starts a gust when the schedule allows; never on a tower in danger. */
function maybeStartGust(state: GameState): void {
  if (state.gust.phase !== "idle" || !tuning.gustsOn || tuning.gustPush <= 0) return;
  const level = state.score;
  const strength = windStrength(level);
  if (strength <= 0 || (level - GUST_START_LEVEL) % GUST_BAND < 1 || level < state.nextGust) return;
  if (state.teeter > 0 || forecast(state) >= DANGER_FRAC * toppleLimit(state)) return;
  state.gust = {
    phase: "warn",
    t: 0,
    dir: hash01(state.seed, 2 * level + 1) < 0.5 ? -1 : 1,
    amp: tuning.gustPush * strength,
  };
  state.nextGust =
    level + GUST_GAP_MIN + Math.floor(hash01(state.seed, 2 * level) * (GUST_GAP_MAX - GUST_GAP_MIN + 1));
}

/** Damped spring; calm raises damping toward critical (perfectSteady). Substeps keep it stable. */
function stepKick(state: GameState, dt: number): void {
  const w = omega();
  const c0 = Math.min(tuning.kickDecay, w);
  const c = c0 + (w - c0) * tuning.perfectSteady * state.calm;
  const n = Math.ceil(dt / KICK_SUBSTEP);
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = -w * w * state.kick - 2 * c * state.kickVel;
    state.kickVel += acc * h;
    state.kick += state.kickVel * h;
  }
}

/** Push toward `dir`; only velocity changes. The cap trims velocity, never position. */
function addKick(state: GameState, amount: number, dir: 1 | -1): void {
  const w = omega();
  state.kickVel += dir * amount * w;
  if (kickAmplitude(state) > SWAY_KICK_MAX) {
    state.kickVel = Math.sign(state.kickVel) * w * Math.sqrt(Math.max(0, SWAY_KICK_MAX ** 2 - state.kick ** 2));
  }
}

function updateTopple(state: GameState, dt: number): void {
  const lim = toppleLimit(state);
  const t = tilt(state);
  const ratio = Math.abs(t) / lim;
  if (tuning.toppleOn && tuning.swayOn && ratio >= 1) {
    state.teeter += dt;
    const grace = tuning.lastChance && !state.armed;
    const fallAt = grace ? tuning.teeterTime + LAST_CHANCE_TIME : tuning.teeterTime;
    if (state.teeter >= fallAt) {
      state.phase = "over";
      state.toppled = { dir: t > 0 ? 1 : -1, level: topLevel(state) };
      return;
    }
  } else {
    state.teeter = Math.max(0, state.teeter - TEETER_RECOVER * dt);
  }
  if (ratio >= DANGER_FRAC || state.teeter > 0) state.inDanger = true;
  else if (state.inDanger && forecast(state) < DANGER_FRAC * lim) {
    state.inDanger = false;
    state.saves += 1;
  }
}

function sliderBounds(under: Block, w: number): [number, number] {
  const center = under.x + under.w / 2;
  return [center - SLIDE_RANGE - w / 2, center + SLIDE_RANGE - w / 2];
}

function spawnSlider(under: Block, level: number): Slider {
  const fromLeft = level % 2 === 0;
  const [minX, maxX] = sliderBounds(under, under.w);
  return { x: fromLeft ? minX : maxX, w: under.w, dir: fromLeft ? 1 : -1 };
}

export function newGame(seed = 0): GameState {
  const base: Block = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, w: BASE_WIDTH };
  return {
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
    seed,
    lean: 0,
    leanTop: 0,
    teeter: 0,
    armed: false,
    banked: 0,
    inDanger: false,
    saves: 0,
    toppled: null,
    gust: { phase: "idle", t: 0, dir: 1, amp: 0 },
    nextGust: GUST_START_LEVEL + 1,
  };
}

export function step(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  state.swayAngle = (state.swayAngle + omega() * dt) % (2 * Math.PI);
  if (tuning.swayOn) {
    maybeStartGust(state);
    stepGust(state, dt);
    stepKick(state, dt);
  }
  state.lean += (leanGoal(state) - state.lean) * (1 - Math.exp(-LEAN_EASE * dt));
  state.leanTop += (topLevel(state) - state.leanTop) * (1 - Math.exp(-LEAN_TOP_EASE * dt));
  state.calmTimer = Math.max(0, state.calmTimer - dt);
  const calmTarget = state.calmTimer > 0 ? 1 : 0;
  state.calm += (calmTarget - state.calm) * (1 - Math.exp(-CALM_EASE * dt));

  updateTopple(state, dt);
  if (state.phase !== "playing") return;

  const s = state.slider;
  const [minX, maxX] = sliderBounds(top(state), s.w);
  s.x += s.dir * sliderSpeed(state) * dt;
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

/** Remove and return the cut whose regrow side pulls the top toward the base center. */
function takeCut(state: GameState, placed: Block): { w: number; side: -1 | 1 } {
  const base = state.blocks[0]!;
  const d = placed.x + placed.w / 2 - (base.x + base.w / 2);
  const want = !tuning.leanOn ? 0 : d > DRIFT_EPS ? -1 : d < -DRIFT_EPS ? 1 : 0;
  let i = state.cuts.length - 1;
  if (want !== 0) {
    for (let j = state.cuts.length - 1; j >= 0; j--) {
      if (state.cuts[j]!.side === want) {
        i = j;
        break;
      }
    }
  }
  return state.cuts.splice(i, 1)[0]!;
}

export function drop(state: GameState): DropResult | null {
  if (state.phase !== "playing") return null;
  const underLevel = state.blocks.length - 1;
  const newLevel = state.blocks.length;
  const under = top(state);
  const underX = under.x + swayOffset(state, underLevel);
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

  // Read before anything changes.
  const wasWobbly = forecast(state) >= WARN_FRAC * toppleLimit(state);
  const drift0 = Math.abs(drift(state));
  const newOffset = swayOffset(state, newLevel);
  let result: DropResult;
  if (Math.abs(s.x - underX) <= PERFECT_TOLERANCE) {
    state.streak += 1;
    state.perfects += 1;
    const calmEnough = !tuning.regrowNeedsCalm || !tuning.swayOn || unrest(state) <= tuning.regrowCalm;
    if (tuning.swayOn) state.kickVel *= 1 - tuning.perfectBrace;
    state.calmTimer = CALM_TIME;
    let placed: Block = { x: under.x, w: under.w };
    let regained = 0;
    let rebuilt = 0;
    let grewLeft = 0;
    let grewRight = 0;
    const steadied = !calmEnough && state.cuts.length > 0;
    if (calmEnough) {
      const n = Math.min(state.cuts.length, 1 + state.banked);
      for (let i = 0; i < n; i++) {
        const back = takeCut(state, placed);
        placed = back.side < 0 ? { x: placed.x - back.w, w: placed.w + back.w } : { x: placed.x, w: placed.w + back.w };
        regained += back.w;
        rebuilt += 1;
        if (back.side < 0) grewLeft += back.w;
        else grewRight += back.w;
      }
      state.banked = 0;
    } else {
      state.banked = Math.min(state.banked + 1, state.cuts.length);
    }
    state.armed = false;
    result = { kind: "perfect", placed, regained, rebuilt, steadied, grewLeft, grewRight };
  } else {
    const cutW = s.w - overlap;
    const cut = s.x < underX ? { x: s.x, w: cutW } : { x: right, w: cutW };
    state.streak = 0;
    state.cuts.push({ w: cutW, side: s.x < underX ? 1 : -1 });
    if (tuning.swayOn) addKick(state, cutW * tuning.kickPerUnit, s.x < underX ? -1 : 1);
    const placed = { x: left - newOffset, w: overlap };
    const base = state.blocks[0]!;
    const drift1 = Math.abs(placed.x + placed.w / 2 - (base.x + base.w / 2));
    state.armed = wasWobbly && drift1 > drift0;
    result = { kind: "sliced", placed, cut, armed: state.armed };
  }

  state.blocks.push(result.placed);
  state.teeter = 0;
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

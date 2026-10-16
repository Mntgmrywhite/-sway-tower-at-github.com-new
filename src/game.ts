import {
  BASE_WIDTH,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_PER_LEVEL,
  SLIDE_SPEED_START,
  WORLD_WIDTH,
} from "./config";

/** A block on the tower: left edge and width, in world units. */
export interface Block {
  x: number;
  w: number;
}

export interface Slider extends Block {
  dir: 1 | -1;
  speed: number;
}

export type Phase = "playing" | "over";

export interface GameState {
  phase: Phase;
  /** blocks[0] is the base; the last entry is the tower top. */
  blocks: Block[];
  slider: Slider;
  score: number;
  streak: number;
}

export type DropResult =
  | { kind: "perfect"; placed: Block }
  | { kind: "sliced"; placed: Block; cut: Block }
  | { kind: "miss"; cut: Block };

export function top(state: GameState): Block {
  const b = state.blocks[state.blocks.length - 1];
  if (!b) throw new Error("tower has no blocks");
  return b;
}

function sliderBounds(under: Block, w: number): [number, number] {
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
  return { phase: "playing", blocks: [base], slider: spawnSlider(base, 0), score: 0, streak: 0 };
}

/** Advance the slider by dt seconds, bouncing between its bounds. */
export function step(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
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
  const under = top(state);
  const s = state.slider;

  const left = Math.max(s.x, under.x);
  const right = Math.min(s.x + s.w, under.x + under.w);
  const overlap = right - left;

  let result: DropResult;
  if (overlap <= 0) {
    state.phase = "over";
    return { kind: "miss", cut: { x: s.x, w: s.w } };
  } else if (Math.abs(s.x - under.x) <= PERFECT_TOLERANCE) {
    const placed = { x: under.x, w: under.w };
    state.streak += 1;
    result = { kind: "perfect", placed };
  } else {
    const placed = { x: left, w: overlap };
    const cut = s.x < under.x ? { x: s.x, w: under.x - s.x } : { x: right, w: s.x + s.w - right };
    state.streak = 0;
    result = { kind: "sliced", placed, cut };
  }

  state.blocks.push(result.placed);
  state.score += 1;
  state.slider = spawnSlider(result.placed, state.score);
  return result;
}

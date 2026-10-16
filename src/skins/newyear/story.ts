import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";

// Height tells the New Year's story, in tower levels (camera altitude / BLOCK_HEIGHT).
//
// The first pass is the climb into the party, as designed: from the terrace up past the
// skyline the moon grows, launcher after launcher joins the fireworks, and the confetti, plumes
// and glitter thicken, until CLIMB_TOP (where the base world's altitude01 tops out too).
//
// From LOOP_FROM, long after the terrace has left the view, the night goes round forever, LOOP
// levels a turn, each turn flowing into the next:
//   midnight → the grand finale (the most and biggest bursts, lighting the sky's haze)
//   → the balloon release (gold, silver and ivory balloons rising up the side lanes as the
//     fireworks thin) → the small hours (snow falling under a silvered sky, a few late bursts,
//     plumes and glitter) → midnight again.
// Everything keyed by height reads `toneOf(scene)`, which repeats every LOOP levels past
// LOOP_FROM. (The countdown on the Times Tower keeps time instead: countdown.ts.)

/** Where the first pass's climb tops out (levels): altitude01 reaches 1 at 600 world units. */
export const CLIMB_TOP = 600 / BLOCK_HEIGHT;
/** Where the loop starts, and how many levels one turn of the night takes. */
export const LOOP_FROM = 80;
export const LOOP = 120;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** Where in the story tower level `lvl` is: itself on the first pass, then round the loop. */
export function storyLevel(lvl: number): number {
  return lvl < LOOP_FROM ? lvl : LOOP_FROM + ((lvl - LOOP_FROM) % LOOP);
}

/** Everything in the sky that changes with height, as intensities from 0 to 1. */
export interface Tone {
  /** The first pass's climb (1 from CLIMB_TOP on): the moon's size and the bursts' size. */
  climb: number;
  /** How many launchers fire: their `need` is measured against this. */
  fireworks: number;
  /** The grand finale: extra quick launchers and bigger bursts. */
  finale: number;
  /** Shares of the confetti and plumes falling, and of the glitter popping. */
  confetti: number;
  plumes: number;
  glitter: number;
  /** Snow in the small hours, balloons rising after the finale. */
  snow: number;
  balloons: number;
  /** Light low in the sky: the finale's bursts lighting the haze, and the snow light. */
  glow: number;
  silver: number;
}

type Key = Omit<Tone, "climb"> & { at: number };

/** Midnight: the end of the first pass, and the start and end of every turn of the loop. */
const MIDNIGHT: Omit<Key, "at"> = { fireworks: 1, finale: 0, confetti: 1, plumes: 1, glitter: 1, snow: 0, balloons: 0, glow: 0, silver: 0 };
const FINALE: Omit<Key, "at"> = { fireworks: 1, finale: 1, confetti: 1, plumes: 0.5, glitter: 0.6, snow: 0, balloons: 0, glow: 1, silver: 0 };
const RELEASE: Omit<Key, "at"> = { fireworks: 0.55, finale: 0, confetti: 0.7, plumes: 0.6, glitter: 0.8, snow: 0, balloons: 1, glow: 0.4, silver: 0 };
const SMALL_HOURS: Omit<Key, "at"> = { fireworks: 0.2, finale: 0, confetti: 0.25, plumes: 1, glitter: 1, snow: 1, balloons: 0, glow: 0, silver: 1 };

/** One turn of the loop, in levels from LOOP_FROM: each stage holds a while, then blends on. */
const KEYS: readonly Key[] = [
  { at: 0, ...MIDNIGHT },
  { at: 12, ...MIDNIGHT },
  { at: 30, ...FINALE },
  { at: 42, ...FINALE },
  { at: 56, ...RELEASE },
  { at: 68, ...RELEASE },
  { at: 84, ...SMALL_HOURS },
  { at: 102, ...SMALL_HOURS },
  { at: LOOP, ...MIDNIGHT },
];

const FIELDS = ["fireworks", "finale", "confetti", "plumes", "glitter", "snow", "balloons", "glow", "silver"] as const;

function smooth(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** The tone at story level `lvl` (see storyLevel). */
export function toneAt(lvl: number): Tone {
  if (lvl < LOOP_FROM) {
    // The first pass: everything thickens with the climb, as designed.
    const a = Math.min(1, Math.max(0, lvl / CLIMB_TOP));
    return {
      climb: a,
      fireworks: a,
      finale: 0,
      confetti: (26 + 18 * a) / 44,
      plumes: (3 + 3 * a) / 6,
      glitter: a,
      snow: 0,
      balloons: 0,
      glow: 0,
      silver: 0,
    };
  }
  const x = lvl - LOOP_FROM;
  let i = 1;
  while (i < KEYS.length - 1 && KEYS[i]!.at < x) i++;
  const a = KEYS[i - 1]!;
  const b = KEYS[i]!;
  const k = smooth((x - a.at) / (b.at - a.at));
  const out: Tone = { ...MIDNIGHT, climb: 1 };
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * k;
  return out;
}

/** Tones in half-level steps over the first pass and one turn of the loop. */
const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_FROM + LOOP) / STEP) }, (_, i) => toneAt(i * STEP));

/** The tone at tower level `lvl`, from the table: repeats every LOOP levels past LOOP_FROM. */
export function toneAtLevel(lvl: number): Tone {
  let i = Math.round(storyLevel(Math.max(0, lvl)) / STEP);
  // Rounding up past the end of the turn lands on its start: the same midnight.
  if (i >= TONES.length) i -= LOOP / STEP;
  return TONES[i]!;
}

/** The tone at the scene's height. */
export function toneOf(s: Scene): Tone {
  return toneAtLevel(level(s));
}

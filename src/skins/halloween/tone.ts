import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { DUSK_GLOW, FOG, HAZE, HILL, MOON, SKY_LOW, SKY_MID, SKY_TOP, smooth } from "./common";

// Height tells the story, and loops so a tall tower never runs out of it. Levels here are the
// camera's (level(s)): the start view holds at about 10-13 while the first dozen bars go up.
//
// The first pass climbs out of the village into a gothic sky:
//  A (to 13)  Main Street at dusk: midnight blue with the last pumpkin ember on the horizon.
//  B (13-31)  over the rooftops: night falls, the town sinks away and the far village and the hill
//             cemetery show beyond it before the Sleepy Hollow mist gathers over them all; the moon
//             eases up out of the way and swells.
//  C (31-56)  the gothic skyline: full night, cloud ribbons round the moon, crooked spires and
//             rooftops standing out of the mist in the lanes.
//  D (56-96)  storm over the spires: storm clouds pile up in both lanes, the moon turns cold, distant
//             lightning reveals a colossus striding behind the spires; a ring of bats circles the moon.
//  E (96-120) the spiral sky: the storm winds up into huge Burton spirals and the first floating
//             isles drift by. E is the loop's last stretch, so the seam into the loop is no seam.
// Then the loop, every LOOP_PERIOD levels from LOOP_START, forever: the floating isles in a calm
// night; the witching hour (the moon burns orange and largest, a ring of bats circles it, the
// mansion's clock strikes twelve and the swarm pours from its belfry); the storm; the spiral calm.
// Everything that changes with height is read from here, by level, so the whole story repeats
// exactly with the loop. Colors are precomputed in half-level steps, so drawing never mixes colors
// per frame.

/** Where the loop starts and how long it is, in levels. */
export const LOOP_START = 120;
export const LOOP_PERIOD = 120;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** The level whose story shows at `lvl`: itself on the first pass, folded into the loop past it. */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return Math.max(0, lvl);
  return LOOP_START + ((((lvl - LOOP_START) % LOOP_PERIOD) + LOOP_PERIOD) % LOOP_PERIOD);
}

/** Where each stretch of the first pass begins (camera levels). E is the loop's last fifth. */
export const STRETCH = { B: 13, C: 31, D: 56, E: LOOP_START - 0.2 * LOOP_PERIOD } as const;
/** By this level the dusk has deepened into night. */
export const NIGHTFALL = STRETCH.C;
/** The mist gathers over the town between these levels... */
export const MIST_GATHER = [10, 44] as const;
/** ...and has sunk to rest low on the screen by this one (before the loop). */
export const MIST_SETTLED = 110;
/** The hollow and the Horseman fade into the mist between these levels. */
export const HOLLOW_FADE = [94, 118] as const;

/** The loop's stretches, as fractions of it. */
export const LOOP = { isles: 0.2, witching: 0.3, witchingOut: 0.56, storm: 0.64, stormOut: 0.74, spiral: 0.9 } as const;
/** The mansion's clock strikes twelve here, in the witching hour. */
export const MIDNIGHT = 0.43;

/** Which stretch a level is in: 0 A Main Street, 1 B rooftops, 2 C skyline, 3 D storm, 4 E and the loop. */
export function bandOf(lvl: number): 0 | 1 | 2 | 3 | 4 {
  if (lvl >= STRETCH.E) return 4;
  if (lvl >= STRETCH.D) return 3;
  if (lvl >= STRETCH.C) return 2;
  if (lvl >= STRETCH.B) return 1;
  return 0;
}

/** Everything that changes with height, at one level. */
export interface Tone {
  /** Sky gradient: top, at 60% of the way down, and on the horizon; then the glow on the horizon. */
  sky: [string, string, string];
  glow: string;
  /** Cloud ribbons and swirls painted on the sky: their body and their moonlit edge. */
  swirl: string;
  swirlLit: string;
  /** How tall the horizon's glow stands (0 none .. 1 dusk), as a fraction of its full height. */
  glowK: number;
  /** Star brightness 0..1, and the witching hour's extra stars. */
  starGlow: number;
  extraStars: number;
  /** The moon: radius (in u), how far it has eased up out of the start view (0..1), disc, seas, craters, lit rim, halo. */
  moonR: number;
  moonUp: number;
  moon: string;
  moonSea: string;
  moonCrater: string;
  moonRim: string;
  halo: string;
  /** A ghost-green ring in its halo (the spiral calm), as an rgba string, or "" for none. */
  ghostHalo: string;
  /** Far silhouettes: the back hills and the far skyline (hazy), the near hill and the crag (dark). */
  haze: string;
  hill: string;
  /** Fog: its color and how thick the fog bands lie (0..1). */
  fog: string;
  fogK: number;
  /** Flyers against the sky: a shade darker than it. */
  flyer: string;
  /** How many of the flock circle over the mansion (a fraction fades the last one in). */
  crows: number;
  /** The bats round the mansion's towers, and the witching hour's swarm out of its belfry: opacity. */
  bats: number;
  swarm: number;
  /** The hollow (hill, Horseman, bridge, back hills): opacity. 1 at the start, 0 in the loop. */
  hollow: number;
  /** Storm clouds piled in the lanes (0..1), the huge spirals they wind into (0..1), the ribbons round the moon (0..1). */
  storm: number;
  spiral: number;
  ribbons: number;
  /** The ring of bats round the moon (0..1). */
  ring: number;
  /** Chance a lightning slot fires (lightning.ts). */
  bolt: number;
}

// ---------------------------------------------------------------- the moods

/** A mood's colors and amounts; tones blend between moods. */
interface Mood {
  sky0: string;
  sky1: string;
  sky2: string;
  glow: string;
  glowK: number;
  swirl: string;
  swirlLit: string;
  starGlow: number;
  moon: string;
  sea: string;
  crater: string;
  rim: string;
  haloColor: string;
  haloA: number;
  ghost: number;
  haze: string;
  hill: string;
  fog: string;
  flyer: string;
  storm: number;
  spiral: number;
  ribbons: number;
  bolt: number;
}

const CREAM = { moon: MOON, sea: mix(MOON, "#d9b98a", 0.32), crater: mix(MOON, "#c9a07a", 0.38), rim: mix(MOON, "#ffffff", 0.65) };
const COLD = { moon: "#e6e0fa", sea: mix("#e6e0fa", "#a9a2d0", 0.36), crater: mix("#e6e0fa", "#9890c4", 0.42), rim: "#ffffff" };
const HARVEST = { moon: "#ffaa48", sea: "#f08a3a", crater: "#e27a34", rim: "#ffe0a0" };

const DUSK: Mood = {
  sky0: SKY_TOP,
  sky1: SKY_MID,
  sky2: SKY_LOW,
  glow: DUSK_GLOW,
  glowK: 1,
  swirl: "#2b3168",
  swirlLit: "#59599a",
  starGlow: 0.6,
  ...CREAM,
  haloColor: "#fff1c8",
  haloA: 0.07,
  ghost: 0,
  haze: HAZE,
  hill: HILL,
  fog: FOG,
  flyer: "#0c0b22",
  storm: 0,
  spiral: 0,
  ribbons: 1,
  bolt: 0.25,
};
const NIGHT: Mood = {
  ...DUSK,
  sky0: "#070a1c",
  sky1: "#111634",
  sky2: "#221c46",
  glow: "#3a2152",
  glowK: 0.3,
  swirl: "#1e2352",
  swirlLit: "#4d4f8e",
  starGlow: 1,
  haloA: 0.1,
  haze: "#1f1e44",
  hill: "#0f1029",
  fog: "#46507a",
  flyer: "#05040f",
  bolt: 0.4,
};
const STORM: Mood = {
  ...NIGHT,
  sky0: "#080a19",
  sky1: "#141832",
  sky2: "#2a2a4c",
  glow: "#302a52",
  glowK: 0.45,
  swirl: "#1a1d3c",
  swirlLit: "#8e88c8",
  starGlow: 0.35,
  ...COLD,
  haloColor: "#d8d4f4",
  haloA: 0.1,
  haze: "#1c1c3e",
  fog: "#4a5076",
  storm: 1,
  ribbons: 0,
  bolt: 0.77,
};
const WIND: Mood = { ...STORM, storm: 0.45, spiral: 0.8, ribbons: 0.3, bolt: 0.4, starGlow: 0.6, ghost: 0.5 };
const SPIRAL: Mood = {
  ...NIGHT,
  sky0: "#091024",
  sky1: "#152448",
  sky2: "#22305a",
  glow: "#24485a",
  glowK: 0.4,
  swirl: "#1c2a52",
  swirlLit: "#6f86b8",
  starGlow: 0.9,
  haloA: 0.11,
  ghost: 1,
  haze: "#1a2244",
  fog: "#46587e",
  spiral: 1,
  ribbons: 0.5,
  bolt: 0.25,
};
const ISLES: Mood = {
  ...NIGHT,
  sky0: "#0a0e24",
  sky1: "#161e48",
  sky2: "#29255a",
  glow: "#352a62",
  glowK: 0.4,
  swirl: "#1d2452",
  swirlLit: "#54579a",
  ghost: 0.3,
  spiral: 0.4,
  ribbons: 0.9,
  bolt: 0.25,
};
const WITCHING: Mood = {
  ...ISLES,
  sky0: "#0b0a2a",
  sky1: "#1c1450",
  sky2: "#4a1a5c",
  glow: "#7a2a50",
  glowK: 0.55,
  swirl: "#2a1d5c",
  swirlLit: "#8a5a9a",
  ...HARVEST,
  haloColor: "#ffaa48",
  haloA: 0.13,
  ghost: 0,
  haze: "#1e1446",
  hill: "#0d0a24",
  fog: "#3c2c6c",
  flyer: "#07051a",
  spiral: 0.15,
  ribbons: 1,
};

function blend(a: Mood, b: Mood, k: number): Mood {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const out = { ...a } as Record<string, string | number>;
  for (const key of Object.keys(a) as (keyof Mood)[]) {
    const x = a[key];
    const y = b[key];
    out[key] = typeof x === "number" ? x + ((y as number) - x) * k : mix(x, y as string, k);
  }
  return out as unknown as Mood;
}

/** Keyframes [position, value], eased between. */
type Keys<T> = readonly (readonly [number, T])[];

function at<T>(keys: Keys<T>, f: number, mixer: (a: T, b: T, k: number) => T): T {
  if (f <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [fb, b] = keys[i]!;
    if (f > fb) continue;
    const [fa, a] = keys[i - 1]!;
    return mixer(a, b, smooth(fa, fb, f));
  }
  return keys[keys.length - 1]![1];
}
const num = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- the loop

const L = LOOP;
const LOOP_MOODS: Keys<Mood> = [
  [0, ISLES],
  [L.isles, ISLES],
  [L.witching, WITCHING],
  [L.witchingOut, WITCHING],
  [L.storm, STORM],
  [L.stormOut, STORM],
  [0.82, WIND],
  [L.spiral, SPIRAL],
  [1, ISLES],
];
const LOOP_MOON_R: Keys<number> = [
  [0, 0.165],
  [L.isles, 0.165],
  [L.witching, 0.175],
  [L.witchingOut, 0.175],
  [L.storm, 0.165],
  [1, 0.165],
];
const LOOP_RING: Keys<number> = [
  [0, 0],
  [L.isles + 0.02, 0],
  [L.witching, 1],
  [L.witchingOut, 1],
  [L.witchingOut + 0.04, 0],
  [1, 0],
];
const LOOP_SWARM: Keys<number> = [
  [0, 0],
  [MIDNIGHT - 0.03, 0],
  [MIDNIGHT + 0.02, 1],
  [L.witchingOut - 0.02, 1],
  [L.witchingOut + 0.03, 0],
  [1, 0],
];
// The bats round the spire roost before the swarm pours out of the belfry, and come back after it.
const LOOP_BATS: Keys<number> = [
  [0, 1],
  [L.isles, 1],
  [MIDNIGHT - 0.06, 0],
  [L.witchingOut + 0.04, 0],
  [L.storm, 1],
  [1, 1],
];
const LOOP_EXTRA: Keys<number> = [
  [0, 0],
  [L.isles + 0.02, 0],
  [L.witching, 1],
  [L.witchingOut, 1],
  [L.witchingOut + 0.05, 0],
  [1, 0],
];

function toneFrom(m: Mood, n: { moonR: number; moonUp: number; extra: number; fogK: number; crows: number; bats: number; swarm: number; ring: number; hollow: number }): Tone {
  return {
    sky: [m.sky0, m.sky1, m.sky2],
    glow: m.glow,
    swirl: m.swirl,
    swirlLit: m.swirlLit,
    glowK: m.glowK,
    starGlow: m.starGlow,
    extraStars: n.extra,
    moonR: n.moonR,
    moonUp: n.moonUp,
    moon: m.moon,
    moonSea: m.sea,
    moonCrater: m.crater,
    moonRim: m.rim,
    halo: alpha(m.haloColor, Math.round(m.haloA * 1000) / 1000),
    ghostHalo: m.ghost > 0.01 ? alpha("#c8f0dc", Math.round(m.ghost * 100) / 1000) : "",
    haze: m.haze,
    hill: m.hill,
    fog: m.fog,
    fogK: n.fogK,
    flyer: m.flyer,
    crows: n.crows,
    bats: n.bats,
    swarm: n.swarm,
    hollow: n.hollow,
    storm: m.storm,
    spiral: m.spiral,
    ribbons: m.ribbons,
    ring: n.ring,
    bolt: m.bolt,
  };
}

function loopTone(f: number): Tone {
  return toneFrom(at(LOOP_MOODS, f, blend), {
    moonR: at(LOOP_MOON_R, f, num),
    moonUp: 1,
    extra: at(LOOP_EXTRA, f, num),
    fogK: 1,
    crows: 0,
    bats: at(LOOP_BATS, f, num),
    swarm: at(LOOP_SWARM, f, num),
    ring: at(LOOP_RING, f, num),
    hollow: 0,
  });
}

// ---------------------------------------------------------------- the first pass

const E = STRETCH.E;
/** Where the loop is at E (the first pass hands over to it there). */
const E_F = (E - LOOP_START) / LOOP_PERIOD + 1;
const E_MOOD = at(LOOP_MOODS, E_F, blend);
const FIRST_MOODS: Keys<Mood> = [
  [0, DUSK],
  [STRETCH.B, DUSK],
  [STRETCH.C, NIGHT],
  [50, NIGHT],
  [62, STORM],
  [88, STORM],
  [E, E_MOOD],
];
const FIRST_MOON_R: Keys<number> = [
  [0, 0.145],
  [STRETCH.B, 0.145],
  [40, 0.155],
  [60, 0.165],
];
/** The moon eases up out of the start view over this stretch (slowly: never more than a pixel per half level). */
const MOON_UP = [STRETCH.B, 52] as const;
const FIRST_RING: Keys<number> = [
  [0, 0],
  [STRETCH.D, 0],
  [STRETCH.D + 4, 1],
  [90, 1],
  [E - 1, 0],
];
const FIRST_CROWS: Keys<number> = [
  [0, 3],
  [STRETCH.B, 3],
  [STRETCH.C, 5],
  [50, 5],
  [60, 0],
];
const FIRST_BATS: Keys<number> = [
  [0, 0.7],
  [STRETCH.C, 1],
];

function firstPass(lvl: number): Tone {
  return toneFrom(at(FIRST_MOODS, lvl, blend), {
    moonR: at(FIRST_MOON_R, lvl, num),
    moonUp: smooth(MOON_UP[0], MOON_UP[1], lvl),
    extra: 0,
    fogK: 0.55 + 0.45 * smooth(20, 80, lvl),
    crows: at(FIRST_CROWS, lvl, num),
    bats: at(FIRST_BATS, lvl, num),
    swarm: 0,
    ring: at(FIRST_RING, lvl, num),
    hollow: 1 - smooth(HOLLOW_FADE[0], HOLLOW_FADE[1], lvl),
  });
}

/** The tone at a story level (see storyLevel). From E on it is the loop's (E is the loop's last stretch). */
export function toneAt(lvl: number): Tone {
  if (lvl < E) return firstPass(lvl);
  const f = ((((lvl - LOOP_START) % LOOP_PERIOD) + LOOP_PERIOD) % LOOP_PERIOD) / LOOP_PERIOD;
  const t = loopTone(f);
  // The hollow fades out over E's first levels as it does on the first pass.
  if (lvl < LOOP_START) t.hollow = 1 - smooth(HOLLOW_FADE[0], HOLLOW_FADE[1], lvl);
  return t;
}

/** Tones in half-level steps, from the ground to the end of the loop (which is its start again). */
export const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_START + LOOP_PERIOD) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** Index of the tone step at a level (for caching things built from a tone). */
export function toneIndexAt(lvl: number): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(storyLevel(lvl) / STEP)));
}

/** The tone at a level, from the precomputed steps. */
export function toneOfLevel(lvl: number): Tone {
  return TONES[toneIndexAt(lvl)]!;
}

/** The tone at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneOfLevel(level(s));
}

// ---------------------------------------------------------------- the mansion's clock

/** The clock reads this many hours (on a 12-hour face) at the start... */
const CLOCK_START = 7;
/** ...and midnight at MIDNIGHT in every turn of the loop: the hour it reads as the loop starts. */
const CLOCK_LOOP = 12 - MIDNIGHT * 12;
/** Hours per level on the first pass, so it reads CLOCK_LOOP (a few hours on) as the loop begins. */
const CLOCK_RATE = (CLOCK_LOOP + 12 - CLOCK_START) / LOOP_START;

/**
 * The time on the mansion's clock at a level, in hours on its 12-hour face (0..12): it runs on as
 * you climb, and every turn of the loop goes once round the face, striking twelve at MIDNIGHT.
 * Continuous at every level, the loop's start included.
 */
export function clockHours(lvl: number): number {
  const h =
    lvl < LOOP_START
      ? CLOCK_START + Math.max(0, lvl) * CLOCK_RATE
      : CLOCK_LOOP + (((lvl - LOOP_START) % LOOP_PERIOD) / LOOP_PERIOD) * 12;
  return ((h % 12) + 12) % 12;
}

/** Fraction of the way through the loop at a level (0 on the first pass). */
export function loopFraction(lvl: number): number {
  return lvl < LOOP_START ? 0 : (((lvl - LOOP_START) % LOOP_PERIOD) + LOOP_PERIOD) % LOOP_PERIOD / LOOP_PERIOD;
}

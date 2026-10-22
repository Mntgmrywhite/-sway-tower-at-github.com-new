import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FIREWORK_PINK, GOLD, GREEN, MOON, MOON_SEA, MOON_SHADE, PURPLE, SHELL_TRAIL, SHINE, STAR_COLORS, VIOLET, WHITE } from "./colors";
import { fleurPath, maskEyes, maskPath, sparkle } from "./shapes";
import { BLUE_HOUR_SKY, NIGHT_SKY, type Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts); the afternoon sun up
// on the left, a gold doubloon of a sun (a fleur-de-lis stamped faintly on its face, a rim, and a
// ring of beads round it), which goes amber and sinks into the cloud floor at sunset over the
// river; then the moon in the same place, a pale full moon wearing a purple masquerade mask with
// a little plume; the stars; and by night the fireworks bursting over the river in the left lane,
// under the moon, and later in the right lane over the King Gator (gator.ts), the show building
// to a finale with more shells and more kinds. At the loop's dawn the moon and stars fade and the
// sun comes back up where it set. Celestial things are far away: flat fills, no outline, a flat
// halo instead of a glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), and the
// fireworks burst well below the moon, so nothing ever passes over either.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.36, 0.55, 0.82] as const;

/** The sky is painted as thin flat bands (BAND px each, a color a step), ten times cheaper than a gradient fill and as smooth to the eye; their colors are rebuilt only when the light or the screen height changes. */
const BAND = 8;
const cache = { step: -1, h: -1, colors: [] as string[] };

/** A four-stop gradient's color `f` of the way down the screen. */
function gradient(stops: readonly string[], f: number): string {
  for (let i = 1; i < STOPS.length; i++) {
    if (f <= STOPS[i]!) return mix(stops[i - 1]!, stops[i]!, (f - STOPS[i - 1]!) / (STOPS[i]! - STOPS[i - 1]!));
  }
  return stops[STOPS.length - 1]!;
}

/** Half the soft edge where the night sky meets the lit one (a fraction of the screen's height: about half a bar on a phone). */
export const NIGHT_EDGE = 0.012;
/** Under the night's edge, a band of blue-hour lavender this deep (a fraction of the screen's height), then the lit sky. */
const BLUE_HOUR = 0.04;

/**
 * The sky's color `f` of the way down the screen: the lit sky, and over it the night sky down to
 * the night's edge (tone.ts), a band of blue-hour lavender under it, each meeting the next in a
 * narrow soft edge: dusk comes down the sky in flat cartoon bands. Each keeps out of the band of
 * tones the purple bars sink into (colors.ts, CLEAR); only the night's soft edge passes through it.
 */
function skyColor(tone: Tone, f: number): string {
  const lit = gradient(tone.sky, f);
  const below = (f - tone.night - BLUE_HOUR + NIGHT_EDGE) / (NIGHT_EDGE * 2);
  if (below >= 1) return lit;
  const hour = below <= 0 ? BLUE_HOUR_SKY : mix(BLUE_HOUR_SKY, lit, below * below * (3 - 2 * below));
  const k = (f - tone.night + NIGHT_EDGE) / (NIGHT_EDGE * 2);
  if (k >= 1) return hour;
  const dark = gradient(NIGHT_SKY, f);
  if (k <= 0) return dark;
  return mix(dark, hour, k * k * (3 - 2 * k));
}

/**
 * Paint the sky down to `bottom` (everything below it is covered by the street, or the cloud
 * floor), in bands down the screen's height.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  const n = Math.ceil(s.cssH / BAND);
  if (cache.step !== step || cache.h !== s.cssH) {
    cache.step = step;
    cache.h = s.cssH;
    cache.colors.length = n;
    for (let i = 0; i < n; i++) cache.colors[i] = skyColor(tone, (i + 0.5) / n);
  }
  const end = Math.min(s.cssH, Math.ceil(bottom));
  for (let i = 0; i < n; i++) {
    const y0 = Math.round((i * s.cssH) / n);
    if (y0 >= end) break;
    // Each band runs a pixel into the next, which paints over it: no half-covered seams on a scaled canvas.
    const y1 = Math.min(end, Math.round(((i + 1) * s.cssH) / n) + 1);
    ctx.fillStyle = cache.colors[i]!;
    ctx.fillRect(0, y0, s.cssW, y1 - y0);
  }
}

// ---------------------------------------------------------------- sun

const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;
/** Where the sun and the moon hang: u left of the screen's center. */
const SKY_X = 0.36;
/** The beads round the sun: how many, how far out (disc radii) and how big. */
const SUN_BEADS = 18;
const BEAD_RING = 1.2;
const BEAD_R = 0.075;

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the cloud floor's top), or below the bottom of the screen once the floor
 * has sunk out of view (and it comes up the same way at dawn). `r` is the disc; its halo reaches
 * SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * 0.056;
  const y0 = s.cssH * 0.27;
  SUN.r = r0 * (1 + 0.45 * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * SKY_X);
  SUN.y = y0 + (Math.min(floor, s.cssH) + SUN.r * 1.3 - y0) * k;
  return SUN;
}

/** The sun: a flat halo, a ring of beads, the coin with its rim, the stamped fleur-de-lis, a shine. */
export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, floor);
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  // The bead ring turns very slowly, as if the coin were spinning on a string of beads.
  ctx.fillStyle = tone.sunRing;
  ctx.beginPath();
  const turn = s.t * 0.05;
  for (let i = 0; i < SUN_BEADS; i++) {
    const a = turn + (i / SUN_BEADS) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r * BEAD_RING, y + Math.sin(a) * r * BEAD_RING, r * BEAD_R);
  }
  ctx.fill();
  ctx.fillStyle = tone.sunShade;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.sunBody;
  ctx.beginPath();
  circle(ctx, x - r * 0.05, y - r * 0.06, r * 0.84);
  ctx.fill();
  // The stamp: a fleur-de-lis struck faintly into the coin.
  ctx.fillStyle = tone.sunShade;
  ctx.globalAlpha = 0.38;
  ctx.beginPath();
  fleurPath(ctx, x - r * 0.04, y - r * 0.02, r * 1.05);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = SHINE;
  ctx.beginPath();
  oval(ctx, x - r * 0.42, y - r * 0.44, r * 0.2, r * 0.12, -0.7);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 - s.u * SKY_X);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

/**
 * The moon up on the left, fading in at dusk: a pale full moon with a few soft seas, wearing a
 * purple masquerade mask trimmed in gold with a little plume at its corner. All of it inside the
 * moon's disc, so nothing it draws reaches past the moon.
 */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x - r * 0.05, y - r * 0.06, r * 0.9);
  ctx.fill();
  ctx.fillStyle = MOON_SEA;
  ctx.beginPath();
  oval(ctx, x + r * 0.32, y + r * 0.42, r * 0.2, r * 0.13, 0.3);
  oval(ctx, x - r * 0.38, y + r * 0.5, r * 0.13, r * 0.09);
  ctx.fill();
  // The mask over the moon's eyes, a plume rising in it from the right corner.
  const my = y - r * 0.08;
  ctx.fillStyle = VIOLET.body;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.42, my - r * 0.2);
  ctx.quadraticCurveTo(x + r * 0.62, my - r * 0.62, x + r * 0.34, my - r * 0.78);
  ctx.quadraticCurveTo(x + r * 0.4, my - r * 0.46, x + r * 0.3, my - r * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PURPLE.body;
  ctx.beginPath();
  maskPath(ctx, x, my, r * 1.3);
  maskEyes(ctx, x, my, r * 1.3);
  ctx.fill("evenodd");
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  maskEyes(ctx, x, my, r * 1.3);
  ctx.stroke();
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  circle(ctx, x, my + r * 0.04, r * 0.06);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it sparkles. */
const STARS = Array.from({ length: 52 }, (_, i) => ({
  x: hash(i * 3 + 7700),
  y: 0.03 + hash(i * 3 + 7701) * 0.72,
  r: 0.0028 + hash(i * 3 + 7702) * 0.0034,
  g: i % 3,
  big: hash(i + 7900) > 0.85,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;
/** Stars keep this far (u) in from the screen's sides, so no sparkle is cut in half by an edge. */
const STAR_MARGIN = 0.022;

/** Stars over the night sky in three twinkle groups (one fill each). */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  for (let g = 0; g < 3; g++) {
    ctx.fillStyle = STAR_COLORS[g]!;
    ctx.globalAlpha = tone.stars * (0.62 + 0.38 * Math.sin(s.t * 0.9 + g * 2.1));
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = edge + st.x * span;
      if (x > c0 && x < c1) continue;
      const y = st.y * s.cssH;
      const r = st.r * u;
      if (st.big) sparkle(ctx, x, y, r * 2.6);
      else circle(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- fireworks

/** Every shell climbs for CLIMB s and blooms over BLOOM s, so the next is often up before the last has faded. */
const CLIMB = 0.55;
const BLOOM = 1.5;
/** The left lane's bursts' spots: x (u left of the screen's center), y (fraction of the screen's height). */
const SPOTS = [
  [SKY_X, 0.46],
  [SKY_X + 0.025, 0.54],
  [SKY_X + 0.01, 0.4],
] as const;
/** A left burst's radius (u): everything a burst draws stays within this of its spot (inside the lane, under the moon)... */
export const BURST_R = 0.104;
/** ...but for the sparks falling below it as they fade (a willow's most of all): this much further down, in burst radii. */
const DROOP = 0.154;
const BURST_DROOP = BURST_R * DROOP;
/** How far a burst's sparks sag as they fade (burst radii, at the end of the bloom): a willow's twice as far. */
const SAG = 0.144;
const WILLOW_SAG = 0.288;

/** The lowest any left burst reaches on screen (its lowest spot, plus its reach and its droop): the Carnival Queen keeps under it (queen.ts). */
export function lowestBurst(s: Scene): number {
  return s.cssH * Math.max(...SPOTS.map(([, fy]) => fy)) + s.u * (BURST_R + BURST_DROOP);
}

/**
 * The right lane's show, over the King Gator (gator.ts): smaller bursts (further off, over the
 * river's far bank), at spots [x (u right of the screen's center), y (fraction of the screen's
 * height)], held in from the screen's right side.
 */
const RIGHT_SPOTS = [
  [0.392, 0.3],
  [0.405, 0.38],
  [0.388, 0.455],
] as const;
export const RIGHT_BURST_R = 0.078;
/** Where a right burst's spot is on screen (scratch). */
export function rightSpot(s: Scene, i: number): { x: number; y: number } {
  const [dx, fy] = RIGHT_SPOTS[i]!;
  SPOT.x = Math.min(s.cssW - s.u * (RIGHT_BURST_R + 0.03), s.cssW / 2 + s.u * dx);
  SPOT.y = s.cssH * fy;
  return SPOT;
}
/** The band of the screen the right show can reach: its highest and lowest point (px), and its left and right edges. */
export function rightShowBox(s: Scene): { t: number; b: number; l: number; r: number } {
  const reach = s.u * RIGHT_BURST_R;
  let l = Infinity;
  let r = -Infinity;
  for (let i = 0; i < RIGHT_SPOTS.length; i++) {
    const { x } = rightSpot(s, i);
    l = Math.min(l, x - reach);
    r = Math.max(r, x + reach);
  }
  BOX.l = l;
  BOX.r = r;
  BOX.t = s.cssH * Math.min(...RIGHT_SPOTS.map(([, fy]) => fy)) - reach;
  BOX.b = s.cssH * Math.max(...RIGHT_SPOTS.map(([, fy]) => fy)) + reach * (1 + DROOP);
  return BOX;
}
const BOX = { t: 0, b: 0, l: 0, r: 0 };

const SPARKS = 22;
/** Burst colors: gold, Carnival green, violet, magenta, white; each burst has a second color for its inner ring. */
const COLORS = [GOLD.body, GREEN.light, VIOLET.light, FIREWORK_PINK, WHITE] as const;

/** The orders the spots go off in, three shells at a time (one picked by hash for each three), so the next shell mostly bursts somewhere else. */
const ORDERS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

/** Which of three spots shell `n` of a rhythm goes off at. */
function spotIndex(n: number, seed: number): number {
  const order = ORDERS[Math.floor(hash(Math.floor(n / 3) * 5 + seed) * ORDERS.length) % ORDERS.length]!;
  return order[n % 3]!;
}

/** Where left shell `n` of a rhythm goes off: its spot. */
function spotOf(s: Scene, n: number, seed: number): { x: number; y: number } {
  const [dx, fy] = SPOTS[spotIndex(n, seed)]!;
  SPOT.x = Math.max(s.u * (BURST_R + 0.02), s.cssW / 2 - s.u * dx);
  SPOT.y = s.cssH * fy;
  return SPOT;
}
const SPOT = { x: 0, y: 0 };

/**
 * A rhythm of shells: one every `every` s from `at` on, its kinds drawn from `from` up to `to`
 * (KINDS), its spots and colors by hash from `seed`, and how much of the show it takes to join
 * (0: from the first shell; it fades in as the show builds toward its finale).
 */
interface Rhythm {
  every: number;
  at: number;
  from: number;
  to: number;
  seed: number;
  joins: number;
}

/**
 * Seven kinds of burst: 0 a chrysanthemum (a ring of sparks trailing streaks back to its heart,
 * an inner ring in a second color), 1 a willow (its sparks droop as they fall), 2 a ring of beads
 * (a round string of sparks that sparkles), 3 a palm (gold fronds arching up and over from its
 * heart, a glint at each tip), 4 a crossette (six stars that fly out and split into crosses),
 * 5 a fleur-de-lis spelled out in gold sparks, 6 a glitter ball (a sphere of sparks winking).
 */
const KINDS = 7;

/**
 * The left lane's show: the first rhythm from the night parade's start, the first three kinds
 * (two shells mostly in the air at once); as the night goes on toward the finale a second
 * rhythm joins between its shells with the fancier kinds, then a third with all of them.
 */
const LEFT: readonly Rhythm[] = [
  { every: 1.3, at: 0, from: 0, to: 3, seed: 9300, joins: 0 },
  { every: 1.3, at: 0.65, from: 3, to: KINDS, seed: 9400, joins: 0.35 },
  { every: 2.6, at: 0.33, from: 0, to: KINDS, seed: 9500, joins: 0.78 },
];
/** The right lane's show, a little later and a little slower, building the same way. */
const RIGHT: readonly Rhythm[] = [
  { every: 1.5, at: 0.4, from: 0, to: 3, seed: 9600, joins: 0 },
  { every: 1.5, at: 1.15, from: 3, to: KINDS, seed: 9700, joins: 0.35 },
  { every: 3, at: 0.2, from: 0, to: KINDS, seed: 9800, joins: 0.78 },
];

/** How strongly a rhythm shows at this point of the show (it joins smoothly, never popping in). */
function joined(r: Rhythm, finale: number): number {
  if (r.joins <= 0) return 1;
  const k = (finale - r.joins) / 0.2 + 0.5;
  return k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
}

/** The fleur-de-lis burst's sparks, in burst radii about its heart. */
const FLEUR: readonly (readonly [number, number])[] = [
  [0, -0.95],
  [0.11, -0.72],
  [0.16, -0.48],
  [0.12, -0.24],
  [-0.11, -0.72],
  [-0.16, -0.48],
  [-0.12, -0.24],
  [0.2, 0.0],
  [0.38, -0.22],
  [0.6, -0.3],
  [0.76, -0.14],
  [0.68, 0.1],
  [0.5, 0.18],
  [-0.2, 0.0],
  [-0.38, -0.22],
  [-0.6, -0.3],
  [-0.76, -0.14],
  [-0.68, 0.1],
  [-0.5, 0.18],
  [-0.28, 0.24],
  [-0.1, 0.25],
  [0.1, 0.25],
  [0.28, 0.24],
  [0, 0.48],
  [0, 0.68],
  [-0.16, 0.8],
  [0.16, 0.8],
];
/** The glitter ball's sparks: [distance (radii), angle, twinkle phase]. */
const GLITTER = Array.from({ length: 30 }, (_, j) => [Math.sqrt(hash(j + 9900)) * 0.92, hash(j + 9930) * Math.PI * 2, hash(j + 9960) * 6] as const);

/**
 * One shell (`n` of its rhythm, `age` s after launch) at its spot (x, y), its burst `R` px across
 * at full bloom: the climb on a thin trail, then the bloom of its kind in its colors, fading as
 * it falls. All of it within R of its spot, but for the sparks drooping below as they fade
 * (DROOP radii at most).
 */
function shell(ctx: Ctx, s: Scene, x: number, y: number, R: number, n: number, r: Rhythm, age: number, alpha: number): void {
  const u = s.u;
  const k0 = R / (u * BURST_R);
  if (age < CLIMB) {
    // The shell climbs from below the burst's spot, a little trail behind it.
    const k = age / CLIMB;
    const from = y + R * 1.1;
    const hy = from + (y - from) * (1 - (1 - k) * (1 - k));
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = SHELL_TRAIL;
    ctx.lineWidth = Math.max(1, u * 0.003 * k0);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, hy);
    ctx.lineTo(x, Math.min(from, hy + R * 0.2));
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    circle(ctx, x, hy, u * 0.004 * k0);
    ctx.fill();
    return;
  }
  const ci = Math.floor(hash(n * 5 + r.seed + 1) * COLORS.length) % COLORS.length;
  const color = COLORS[ci]!;
  const inner = COLORS[(ci + 2) % COLORS.length]!;
  const kind = r.from + (Math.floor(hash(n * 5 + r.seed + 5) * (r.to - r.from)) % (r.to - r.from));
  const k = (age - CLIMB) / BLOOM;
  const spread = R * (1 - (1 - k) * (1 - k) * (1 - k) * (1 - k)) * 0.88;
  const drop = R * (kind === 1 ? WILLOW_SAG : SAG) * k * k;
  const fadeOut = 1 - k * k;
  const a0 = hash(n * 7 + r.seed + 2) * 0.5;
  const spark = u * 0.0065 * k0 * (1 - k * 0.4);
  ctx.lineCap = "round";
  if (kind <= 2) {
    if (kind !== 2) {
      // Each spark trails a streak back toward the heart of the burst (drooping, for a willow).
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, u * 0.0035 * k0);
      ctx.globalAlpha = alpha * fadeOut * 0.55;
      ctx.beginPath();
      for (let j = 0; j < SPARKS; j++) {
        const a = (j / SPARKS) * Math.PI * 2 + a0;
        const reach = spread * (0.85 + hash(n * 31 + j + r.seed + 3) * 0.15);
        const sag = kind === 1 ? drop * 0.9 : drop * 0.5;
        ctx.moveTo(x + Math.cos(a) * reach * 0.55, y + Math.sin(a) * reach * 0.5 + drop * 0.3);
        ctx.quadraticCurveTo(x + Math.cos(a) * reach * 0.8, y + Math.sin(a) * reach * 0.72 + sag * 0.6, x + Math.cos(a) * reach * 0.94, y + Math.sin(a) * reach * 0.85 + sag);
      }
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * fadeOut;
    ctx.beginPath();
    const count = kind === 2 ? 26 : SPARKS;
    for (let j = 0; j < count; j++) {
      const a = (j / count) * Math.PI * 2 + a0;
      const reach = kind === 2 ? spread : spread * (0.85 + hash(n * 31 + j + r.seed + 3) * 0.15);
      const sx = x + Math.cos(a) * reach;
      const sy = y + Math.sin(a) * reach * 0.9 + drop;
      const sr = kind === 2 ? spark * 0.8 : spark;
      if (j % 4 === 1 && Math.sin(s.t * 20 + j) > 0) sparkle(ctx, sx, sy, sr * 2.2);
      else circle(ctx, sx, sy, sr);
    }
    ctx.fill();
    // A second, inner ring in another color, smaller.
    ctx.fillStyle = inner;
    ctx.beginPath();
    for (let j = 0; j < SPARKS / 2; j++) {
      const a = (j / (SPARKS / 2)) * Math.PI * 2 + hash(n * 7 + r.seed + 4) * 0.9;
      circle(ctx, x + Math.cos(a) * spread * 0.5, y + Math.sin(a) * spread * 0.45 + drop * 0.6, u * 0.0045 * k0);
    }
    ctx.fill();
  } else if (kind === 3) {
    // A palm: gold fronds arching up and over from the heart, sagging as they fade, a glint at each tip.
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = Math.max(1, u * 0.005 * k0 * (1 - k * 0.5));
    ctx.globalAlpha = alpha * fadeOut;
    ctx.beginPath();
    const tips: number[] = TIPS;
    tips.length = 0;
    for (let j = 0; j < 9; j++) {
      const a = -Math.PI * (0.11 + (j / 8) * 0.78) + (a0 - 0.25) * 0.2;
      const sag = spread * 0.38 * k;
      const tx = x + Math.cos(a) * spread;
      const ty = y + Math.sin(a) * spread * 0.9 + sag;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * spread * 0.75, y + Math.sin(a) * spread * 1.05, tx, ty);
      tips.push(tx, ty);
    }
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    for (let j = 0; j < tips.length; j += 2) {
      if (Math.sin(s.t * 17 + j) > -0.3) sparkle(ctx, tips[j]!, tips[j + 1]!, spark * 1.9);
    }
    ctx.fill();
  } else if (kind === 4) {
    // A crossette: six stars fly out, then each splits into four that fly on as a little cross.
    const split = 0.42;
    ctx.globalAlpha = alpha * fadeOut;
    if (k < split) {
      const e = k / split;
      const d = R * 0.55 * (1 - (1 - e) * (1 - e));
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + a0;
        circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, spark * 1.3);
      }
      ctx.fill();
    } else {
      const e = (k - split) / (1 - split);
      const d = R * 0.32 * (1 - (1 - e) * (1 - e));
      ctx.fillStyle = inner;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + a0;
        const px = x + Math.cos(a) * R * 0.55;
        const py = y + Math.sin(a) * R * 0.55;
        for (const b of CROSS) circle(ctx, px + Math.cos(a + b) * d, py + Math.sin(a + b) * d + drop * 0.5, spark);
      }
      ctx.fill();
    }
  } else if (kind === 5) {
    // A fleur-de-lis spelled out in gold sparks, blooming from its heart.
    ctx.fillStyle = GOLD.light;
    ctx.globalAlpha = alpha * fadeOut;
    ctx.beginPath();
    for (let j = 0; j < FLEUR.length; j++) {
      const [fx, fy] = FLEUR[j]!;
      const sx = x + fx * spread;
      const sy = y + fy * spread + drop * 0.4;
      if (j % 5 === 2 && Math.sin(s.t * 19 + j) > 0) sparkle(ctx, sx, sy, spark * 2.1);
      else circle(ctx, sx, sy, spark * 0.95);
    }
    ctx.fill();
  } else {
    // A glitter ball: a sphere of sparks, each winking on and off as it hangs and falls.
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? WHITE : color;
      ctx.globalAlpha = alpha * fadeOut;
      ctx.beginPath();
      for (let j = pass; j < GLITTER.length; j += 2) {
        const [d, a, ph] = GLITTER[j]!;
        if (Math.sin(s.t * 18 + ph) < -0.2) continue;
        circle(ctx, x + Math.cos(a) * d * spread, y + Math.sin(a) * d * spread * 0.9 + drop, spark * 0.85);
      }
      ctx.fill();
    }
  }
  // The flash at the heart of a fresh burst.
  if (k < 0.25) {
    ctx.globalAlpha = alpha * (1 - k / 0.25) * 0.9;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    circle(ctx, x, y, u * 0.012 * k0 * (1 - k / 0.25));
    ctx.fill();
  }
}
/** The crossette's four sparks, at these angles off their star's flight. */
const CROSS = [-1.1, -0.4, 0.4, 1.1] as const;
/** Scratch for the palm's tips. */
const TIPS: number[] = [];

/** Every shell of a rhythm in the air at the scene's time, drawn by `at` (which gives its spot, or skips it). */
function rhythm(ctx: Ctx, s: Scene, r: Rhythm, alpha: number, R: number, place: (n: number) => { x: number; y: number }): void {
  if (alpha <= 0.01) return;
  const n = Math.floor((s.t - r.at) / r.every);
  for (let i = n - 1; i <= n; i++) {
    if (i < 0) continue;
    const age = s.t - r.at - i * r.every;
    if (age > CLIMB + BLOOM) continue;
    const { x, y } = place(i);
    shell(ctx, s, x, y, R, i, r, age, alpha);
  }
}

/** Scratch for the placing callbacks, so a frame allocates no closures. */
const NOW = { s: null as unknown as Scene, seed: 0 };
function leftPlace(n: number): { x: number; y: number } {
  return spotOf(NOW.s, n, NOW.seed);
}
function rightPlace(n: number): { x: number; y: number } {
  return rightSpot(NOW.s, spotIndex(n, NOW.seed));
}

/**
 * Fireworks over the river by night, in the left lane under the moon: shells climb on thin
 * trails and burst in the season's colors, two mostly in the air at once (the last one's sparks
 * still falling as the next bursts at another spot), the Carnival Queen standing out of the
 * clouds below them (queen.ts). As the night goes on the show builds toward its finale: a second
 * rhythm of shells joins between the first's with the fancier kinds (palms, crossettes, a gold
 * fleur-de-lis, glitter), then a third.
 */
export function fireworks(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.fireworks <= 0.01) return;
  NOW.s = s;
  for (const r of LEFT) {
    NOW.seed = r.seed;
    rhythm(ctx, s, r, tone.fireworks * joined(r, tone.finale), s.u * BURST_R, leftPlace);
  }
  ctx.globalAlpha = 1;
}

/**
 * The right lane's show over the King Gator (gator.ts), from a little later in the night: the
 * same kinds, smaller and further off, building the same way. `clear` (0..1) holds it back while
 * anything else is in its part of the lane (lane.ts: Sky Islands' island passing, a throw drifting
 * down on a tall screen): it fades out rather than burst over them.
 */
export function rightFireworks(ctx: Ctx, s: Scene, tone: Tone, clear: number): void {
  const show = tone.rightShow * clear;
  if (show <= 0.01) return;
  NOW.s = s;
  for (const r of RIGHT) {
    NOW.seed = r.seed;
    rhythm(ctx, s, r, show * joined(r, tone.finale), s.u * RIGHT_BURST_R, rightPlace);
  }
  ctx.globalAlpha = 1;
}

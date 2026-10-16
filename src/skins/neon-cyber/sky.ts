import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLUE, MOON, MOON_SHADE, PURPLE } from "./colors";
import type { Tone } from "./tone";

// The sky over the megacity, for the altitude of the moment (tone.ts): the gradient, a low
// ceiling of smog banks over the street, two searchlights sweeping up into it from the city,
// the moon (a glow behind the smog down on the street, a crisp disc once you are above it),
// stars in the clear night, and the violet murk you climb through. Celestial things are far
// away: flat fills and cached halos, no glow strokes. The searchlights and the twinkle keep
// to the sides of the screen; nothing in the tower's column moves.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.42, 0.72, 0.95] as const;

/** The sky gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

/** Paint the sky down to `bottom` (everything below it is painted over by the city or the smog sea). */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  if (cache.ctx !== ctx || cache.step !== step || cache.h !== s.cssH || !cache.fill) {
    const g = ctx.createLinearGradient(0, 0, 0, s.cssH);
    for (let i = 0; i < STOPS.length; i++) g.addColorStop(STOPS[i]!, tone.sky[i]!);
    cache.ctx = ctx;
    cache.step = step;
    cache.h = s.cssH;
    cache.fill = g;
  }
  ctx.fillStyle = cache.fill;
  ctx.fillRect(0, 0, s.cssW, Math.min(s.cssH, Math.ceil(bottom)));
}

/** How deep the smog ceiling's soft edge reaches below its line, in u. */
const VEIL = 0.13;
/** Opacity of the veil's strips, top to bottom. */
const VEIL_STEPS = [0.9, 0.72, 0.52, 0.34, 0.18, 0.07] as const;

/**
 * The smog ceiling's soft lower edge: strips of the sky itself, more and more see-through
 * downward from `line`, so whatever rises into the smog fades into it.
 */
export function ceilingVeil(ctx: Ctx, s: Scene, line: number): void {
  if (!cache.fill || line > s.cssH) return;
  const h = (VEIL * s.u) / VEIL_STEPS.length;
  ctx.fillStyle = cache.fill;
  for (let i = 0; i < VEIL_STEPS.length; i++) {
    const y = line + i * h;
    if (y + h < 0) continue;
    ctx.globalAlpha = VEIL_STEPS[i]!;
    ctx.fillRect(0, Math.floor(y), s.cssW, Math.ceil(h) + 1);
  }
  ctx.globalAlpha = 1;
}

/** Half width of the tower's column (u): nothing twinkles or sweeps inside it. */
export const COLUMN = 0.27;

// ---------------------------------------------------------------- smog ceiling

/** Smog banks: height over the horizon (u), center x (u from the screen center), half length (u), thickness (u). */
const BANKS = Array.from({ length: 14 }, (_, i) => ({
  h: 0.22 + i * 0.11 + hash(i + 700) * 0.06,
  x: (hash(i + 710) - 0.5) * 1.1,
  w: 0.32 + hash(i + 720) * 0.34,
  th: 0.012 + hash(i + 730) * 0.016,
}));

/** Long still bands of smog hanging under the ceiling, above its `line`: lit from below. */
export function smogBanks(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  if (tone.smogA <= 0) return;
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = tone.smog;
  // Two passes: a wide faint body, then a thinner denser core.
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = tone.smogA * (pass === 0 ? 0.24 : 0.32);
    ctx.beginPath();
    for (const b of BANKS) {
      const y = s.horizonY - b.h * u;
      if (y < -u * 0.05 || y > line + u * 0.02) continue;
      oval(ctx, cx + b.x * u, y, b.w * u * (pass === 0 ? 1 : 0.8), b.th * u * (pass === 0 ? 2.4 : 1));
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- searchlights

/** Two searchlights sweeping slowly up from the city into the smog: x (u), phase, beam fill. */
const BEAMS = [
  { x: -0.38, phase: 0, fill: alpha(BLUE, 0.085) },
  { x: 0.34, phase: 2.4, fill: alpha(PURPLE, 0.085) },
] as const;

/** Faint beams leaning out to the sides, never into the tower's column; they fade into the smog. */
export function searchlights(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.beams <= 0) return;
  const u = s.u;
  const hy = s.horizonY;
  if (hy - u * 0.2 > s.cssH) return;
  ctx.globalAlpha = tone.beams;
  for (const b of BEAMS) {
    const side = b.x < 0 ? -1 : 1;
    const a = side * (0.2 + 0.16 * (0.5 + 0.5 * Math.sin(s.t * 0.23 + b.phase)));
    const x0 = s.cssW / 2 + b.x * u;
    const y0 = hy - u * 0.1;
    const L = u * 0.8;
    const spread = 0.05;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.sin(a - spread) * L, y0 - Math.cos(a - spread) * L);
    ctx.lineTo(x0 + Math.sin(a + spread) * L, y0 - Math.cos(a + spread) * L);
    ctx.closePath();
    ctx.fillStyle = b.fill;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- moon

/** Scratch result of `moonAt`, reused so placing it allocates nothing. */
const MOON_AT = { x: 0, y: 0, r: 0 };

/** Where the moon hangs: up on the right, below the HUD, clear of the tower's column. `r` is the disc. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.056;
  MOON_AT.x = Math.round(Math.min(s.cssW - MOON_AT.r * 2.2, s.cssW / 2 + s.u * 0.36));
  MOON_AT.y = Math.round(s.cssH * 0.27);
  return MOON_AT;
}

const MARIA = [
  { x: -0.28, y: -0.18, rx: 0.3, ry: 0.2, rot: 0.5 },
  { x: 0.22, y: 0.16, rx: 0.26, ry: 0.18, rot: -0.3 },
  { x: -0.12, y: 0.46, rx: 0.2, ry: 0.11, rot: 0.15 },
];

/** Halo radius in moon radii. Clear past it, so it is painted as a disc of that size. */
const HALO_R = 3.2;
/** One cached halo: the moon only moves when the screen changes size. */
const HALO_AT = { ctx: null as Ctx | null, x: NaN, y: NaN, r: NaN };
let halo: CanvasGradient | null = null;
const HALO_IN = alpha(mix(MOON, PURPLE, 0.35), 0.3);
const HALO_MID = alpha(PURPLE, 0.08);
const HALO_OUT = alpha(PURPLE, 0);
const RIM = mix(MOON, "#ffffff", 0.5);

/**
 * The moon. Down on the street it is only a glow in the smog; above the smog it comes out as a
 * crisp pale disc with soft grey seas and a thin bright rim, in a violet halo.
 */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = Math.max(tone.moonGlow, tone.moon);
  if (a <= 0) return;
  const { x, y, r } = moonAt(s);
  if (!halo || HALO_AT.ctx !== ctx || HALO_AT.x !== x || HALO_AT.y !== y || HALO_AT.r !== r) {
    halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * HALO_R);
    halo.addColorStop(0, HALO_IN);
    halo.addColorStop(0.4, HALO_MID);
    halo.addColorStop(1, HALO_OUT);
    HALO_AT.ctx = ctx;
    HALO_AT.x = x;
    HALO_AT.y = y;
    HALO_AT.r = r;
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = halo;
  ctx.beginPath();
  circle(ctx, x, y, r * HALO_R);
  ctx.fill();
  if (tone.moon > 0) {
    ctx.globalAlpha = tone.moon;
    ctx.fillStyle = MOON;
    ctx.beginPath();
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.globalAlpha = tone.moon * 0.5;
    ctx.fillStyle = MOON_SHADE;
    ctx.beginPath();
    for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
    ctx.fill();
    ctx.globalAlpha = tone.moon * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.96, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = RIM;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- stars

/** Stars: position (fractions of the screen), size (u), twinkle group (-1: still), sparkle. */
const STARS = Array.from({ length: 58 }, (_, i) => ({
  x: hash(i * 3 + 800),
  y: 0.02 + hash(i * 3 + 801) * 0.6,
  r: 0.0024 + hash(i * 3 + 802) * 0.003,
  g: i % 3,
  big: hash(i + 990) > 0.88,
}));
const STAR = "#dfe6ff";

/** Stars in the clear night: still in the tower's column, twinkling (two groups) at the sides. */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  ctx.fillStyle = STAR;
  for (let g = 0; g < 3; g++) {
    // Group 0 holds still; groups 1 and 2 twinkle, out of step.
    ctx.globalAlpha = tone.stars * (g === 0 ? 0.75 : 0.55 + 0.4 * Math.sin(s.t * 1.1 + g * 2.3));
    ctx.beginPath();
    for (const st of STARS) {
      const x = st.x * s.cssW;
      const still = x > c0 - u * 0.02 && x < c1 + u * 0.02;
      if ((still ? 0 : st.g) !== g) continue;
      const y = st.y * s.cssH;
      const r = st.r * u;
      if (st.big && !still) sparkle(ctx, x, y, r * 2.8);
      else circle(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A four-point sparkle as its own subpath. */
function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  const w = r * 0.22;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + w, y - w, x + r, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + r);
  ctx.quadraticCurveTo(x - w, y + w, x - r, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - r);
  ctx.closePath();
}

// ---------------------------------------------------------------- murk

/**
 * Inside the smog: a deep violet veil over the whole backdrop (the lanes and the tower stay
 * clear in front). One flat fill: a gradient here would cost several times as much to paint,
 * and the strata drawn over it (smog.ts) already carry the light coming up from the city.
 */
export function murk(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.murkA <= 0.004) return;
  ctx.globalAlpha = tone.murkA;
  ctx.fillStyle = tone.murk;
  ctx.fillRect(0, 0, s.cssW, s.cssH);
  ctx.globalAlpha = 1;
}

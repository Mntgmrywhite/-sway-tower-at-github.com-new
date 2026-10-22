import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MOON, MOON_SHADE, STAR_CREAM, STAR_RED } from "./colors";
import { crescent, dot, starPath } from "./shapes";
import type { Tone } from "./tone";

// The sky, printed like a WPA poster: flat bands of the hour's inks from the top of the screen
// down to the glow on the horizon (no soft gradients), and a sunburst of broad rays fanning up
// from behind the town (later from behind the cloud sea) into both side lanes, each ray printed
// a step toward the next band's ink and the hour's burst ink (the paper by day, gold in the
// evening), over the angles a phone's lane shows, so it reads as a poster's sunburst on every
// screen; at dusk the rays and the slices between them are printed as the flag's red and cream
// stripes. The fan keeps out of the tower's column (it rises from below the skyline, and its
// steepest ray clears the column at the skyline's height), so the sky behind the tower stays
// plain. In the show's night the lanes are printed Pop Art: a texture of Ben-Day halftone dots,
// a step off the sky's ink, that swell toward the screen's edges and the horizon and shrink to
// nothing beside the column (a texture only, never the picture). A summer
// sun hangs up on the left by day (white-gold in the afternoon, amber in the golden evening),
// a flat disc with spoked rays, and sinks into the cloud floor at sunset; then a flat crescent
// moon in the same place, lit on the side the sun set, and bold five-point stars; at the loop's
// dawn the moon and stars fade and the sun comes back up where it set. Celestial things are far
// away: flat inks, no outline, a solid flat halo instead of a glow (a see-through one let the
// band and ray edges show across the sun).
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), and
// the fireworks in that lane burst below the moon (fireworks.ts), so nothing ever passes over
// either.

/** Where each band starts, as a fraction of the way from the top of the screen down to the horizon. */
const BANDS = [0, 0.3, 0.52, 0.7, 0.85] as const;

/** The sunburst's apex lies RAY_DEPTH u below the line; at the line's height its steepest ray is RAY_CLEAR u out from the center. */
const RAY_DEPTH = 0.8;
const RAY_CLEAR = 0.27;
/**
 * The fan's shallowest edge (radians above the horizontal), and how many rays a side: the fan
 * spans the angles a phone's lane shows above the town (shallower rays would only run behind
 * the town and out of the screen's sides), so a lane shows the whole poster burst.
 */
const RAY_FROM = 0.72;
const RAYS_A_SIDE = 7;
/** Its steepest edge: the ray through (RAY_CLEAR, the line). */
const RAY_TO = Math.atan2(RAY_DEPTH, RAY_CLEAR);
const RAY_SLICE = (RAY_TO - RAY_FROM) / (RAYS_A_SIDE * 2 - 1);
/** Each ray's edges, as 1 / tan of their angles: how far out from the center an edge runs per pixel of rise. */
const RAY_RUN = Array.from({ length: RAYS_A_SIDE }, (_, i) => {
  const a0 = RAY_FROM + RAY_SLICE * i * 2;
  return [1 / Math.tan(a0), 1 / Math.tan(a0 + RAY_SLICE)] as const;
});
/** The slices between the rays (printed only at dusk, when the burst becomes the flag's stripes). */
const GAP_RUN = Array.from({ length: RAYS_A_SIDE - 1 }, (_, i) => {
  const a0 = RAY_FROM + RAY_SLICE * (i * 2 + 1);
  return [1 / Math.tan(a0), 1 / Math.tan(a0 + RAY_SLICE)] as const;
});

/** One set of slices across a band, from its top (r0 out per unit of `run`) to its foot, both sides of the center (those wholly off the screen's sides left out). */
function slices(ctx: Ctx, run: readonly (readonly [number, number])[], cx: number, y0: number, y1: number, r0: number, r1: number): void {
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const [k0, k1] of run) {
      if (r1 * k1 > cx + 1) continue;
      ctx.moveTo(cx + side * r0 * k0, y0);
      ctx.lineTo(cx + side * r0 * k1, y0);
      ctx.lineTo(cx + side * r1 * k1, y1);
      ctx.lineTo(cx + side * r1 * k0, y1);
      ctx.closePath();
    }
  }
  ctx.fill();
}

/**
 * Paint the sky down to `bottom` (everything below it is covered by the hills and the lawn, or
 * the cloud floor): flat bands hung from the line the town (later the cloud sea) stands on, the
 * last running on down, and over them the sunburst fanning up from below the line into both
 * lanes, every other slice printed in the band's own ray ink (a step toward the next band down).
 * The fan's steepest edge clears the column at the line's height, so the sky behind the tower
 * stays plain.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, line: number, bottom: number): void {
  const h = Math.max(1, Math.min(line, s.cssH));
  const end = Math.min(s.cssH, Math.ceil(bottom));
  const cx = s.cssW / 2;
  const ay = line + s.u * RAY_DEPTH;
  let y0 = 0;
  for (let i = 0; i < BANDS.length && y0 < end; i++) {
    const y1 = i + 1 < BANDS.length ? Math.min(end, Math.round(BANDS[i + 1]! * h)) : end;
    if (y1 <= y0) continue;
    ctx.fillStyle = tone.sky[i]!;
    // A pixel's overlap into the next band, so no seam shows between them at any zoom.
    const y1o = y1 < end ? y1 + 1 : y1;
    ctx.fillRect(0, y0, s.cssW, y1o - y0);
    // The rays across this band: each a quad between its two edges, from the band's top to its foot
    // (none in the top band, which the HUD's rows cover).
    if (i > 0) {
      const r0 = ay - y0;
      const r1 = Math.max(0, ay - y1o);
      ctx.fillStyle = tone.rays[i]!;
      slices(ctx, RAY_RUN, cx, y0, y1o, r0, r1);
      if (tone.stripe > 0.01) {
        ctx.fillStyle = tone.gaps[i]!;
        slices(ctx, GAP_RUN, cx, y0, y1o, r0, r1);
      }
    }
    y0 = y1;
  }
}

/** The halftone: grid pitch (u), how far out from the center the dots begin, and over how far they swell to full size. */
const DOT_PITCH = 0.046;
const DOT_FROM = 0.27;
const DOT_SWELL = 0.24;
/** The dotted field starts this far down the screen (below the HUD and the moon). */
const DOT_TOP = 0.3;
/**
 * Dot sizes come in DOT_STEPS steps, each printed as one stroke of round-capped dabs (one wide
 * path of hundreds of little circles costs a phone's whole frame; a dab per dot in a few strokes
 * costs about a millisecond).
 */
const DOT_STEPS = 8;
const DAB = 0.01;

/** Ben-Day dots in both lanes through the show's night, in staggered rows, swelling toward the edges and the line. */
export function halftone(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  if (tone.dots <= 0.01) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const g = u * DOT_PITCH;
  const top = s.cssH * DOT_TOP;
  const bottom = Math.min(line, s.cssH);
  if (bottom <= top) return;
  const rMax = g * 0.34 * tone.dots;
  const cols = Math.ceil((s.cssW / 2 - DOT_FROM * u) / g) + 1;
  ctx.strokeStyle = tone.dot;
  ctx.lineCap = "round";
  for (let step = 1; step <= DOT_STEPS; step++) {
    const r = (rMax * step) / DOT_STEPS;
    if (r < 0.4) continue;
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    for (let row = 0, y = top; y < bottom; row++, y += g * 0.87) {
      const fy = Math.sqrt((y - top) / (bottom - top));
      const shift = row % 2 ? g * 0.5 : 0;
      for (let i = 0; i < cols; i++) {
        const d = DOT_FROM * u + i * g + shift;
        const fx = Math.min(1, (d - DOT_FROM * u) / (DOT_SWELL * u));
        if (Math.round(fx * fy * DOT_STEPS) !== step) continue;
        ctx.moveTo(cx - d, y);
        ctx.lineTo(cx - d + DAB, y);
        ctx.moveTo(cx + d, y);
        ctx.lineTo(cx + d + DAB, y);
      }
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- sun

/** Scratch results of `sunAt` / `moonAt`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;
/** How far out in the left lane the sun and the moon hang (u from the screen's center): clear of the steeple, which the sun sets and rises beside. */
export const SUN_X = 0.41;
/**
 * The disc's radius (u) by day, and how much it swells as it sets. On a phone the sun's lane is
 * the room between the screen's left edge and the steeple (far.ts STEEPLE_X), and the whole
 * halo must fit it at every height of the set and the rise, so the owner's rule holds (nothing
 * but the clouds ever covers the sun): a 0.056 u sun swelling by a quarter put its halo behind
 * the steeple's foot as it sank (drift.test.ts).
 */
const SUN_R = 0.052;
const SUN_SWELL = 0.1;
/**
 * The sun's day height: SUN_HEIGHT u below the HUD's top line (render.ts HUD_TOP). The title
 * screen lays its Slide / Drop cards over the scene from that line (title.css: the logo's
 * 0.052 u, then cards 0.14 u deep with a 0.012 u shadow), and the start view shows the sun by
 * day, so the whole halo hangs below the cards on every screen: a sun at a fraction of the
 * screen's height sat under the Slide card on a short phone and on an iPad.
 */
const HUD_TOP = 0.14;
const SUN_HEIGHT = 0.29;

/** The cloud floor's puffs dip at most this far (u) below its top line (far.ts): below it, the floor is solid. */
const FLOOR_DIP = 0.02;

/**
 * Where the sun is: by day left of the tower, below the title's cards; at sunset it swells a little and
 * sinks below `floor` (the cloud floor's top), or below the bottom of the screen once the floor
 * has sunk out of view (and it comes up the same way at dawn). Fully set, the whole halo is
 * behind the solid floor, so it goes without a blink. `r` is the disc; its halo reaches
 * SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * SUN_R;
  const y0 = s.cssH * HUD_TOP + s.u * SUN_HEIGHT;
  SUN.r = r0 * (1 + SUN_SWELL * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * SUN_X);
  SUN.y = y0 + (Math.min(floor, s.cssH) + SUN.r * SUN_REACH + s.u * FLOOR_DIP - y0) * k;
  return SUN;
}

/** Rays round the afternoon sun: a flat spoked halo, long and short by turns. */
const RAYS = 16;

export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, floor);
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  // Straight flat rays, turning slowly: a poster's summer sun.
  ctx.fillStyle = tone.sunShade;
  ctx.beginPath();
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2 + s.t * 0.05;
    const w = 0.08;
    const len = i % 2 ? 1.24 : 1.38;
    ctx.moveTo(x + Math.cos(a - w) * r * 1.02, y + Math.sin(a - w) * r * 1.02);
    ctx.lineTo(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len);
    ctx.lineTo(x + Math.cos(a + w) * r * 1.02, y + Math.sin(a + w) * r * 1.02);
    ctx.closePath();
  }
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.sunBody;
  ctx.beginPath();
  circle(ctx, x, y, r * 0.84);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 - s.u * SUN_X);
  MOON_AT.y = s.cssH * 0.22;
  return MOON_AT;
}

/** A crescent moon up on the left, fading in at dusk, lit low on the side the sun set: the disc less a bite, so the sky shows through the bite. */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  const bx = x + r * 0.5;
  const by = y - r * 0.28;
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  crescent(ctx, x, y, r, bx, by, r * 0.86);
  ctx.fill();
  // The lit crescent, inset toward the lower left so a rim of shade shows along its inner curve.
  ctx.fillStyle = MOON;
  ctx.beginPath();
  crescent(ctx, x - r * 0.08, y + r * 0.02, r * 0.92, bx, by, r * 0.94);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it is a big five-point star. */
const STARS = Array.from({ length: 52 }, (_, i) => ({
  x: hash(i * 3 + 4700),
  y: 0.03 + hash(i * 3 + 4701) * 0.7,
  r: 0.0028 + hash(i * 3 + 4702) * 0.0034,
  g: i % 3,
  big: hash(i + 4900) > 0.85,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;
/** Stars keep this far (u) in from the screen's sides, so no star is cut in half by an edge. */
const STAR_MARGIN = 0.022;

/** How far the big stars' red plate is printed off register, below and to the right of the cream (in star radii): Pop Art. */
const OFF_REGISTER = 0.22;

/** Stars over the night sky in three twinkle groups: bold five-point stars (each on its off-register red) and dots. */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = tone.stars * (0.62 + 0.38 * Math.sin(s.t * 0.9 + g * 2.1));
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? STAR_CREAM : STAR_RED;
      ctx.beginPath();
      for (const st of STARS) {
        if (st.g !== g || (!pass && !st.big)) continue;
        const x = edge + st.x * span;
        if (x > c0 && x < c1) continue;
        const y = st.y * s.cssH;
        const r = st.r * u;
        if (!pass) starPath(ctx, x + r * 2.4 * OFF_REGISTER, y + r * 2.4 * OFF_REGISTER, r * 2.4);
        else if (st.big) starPath(ctx, x, y, r * 2.4);
        else dot(ctx, x, y, r);
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

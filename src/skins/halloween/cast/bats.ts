import { hash, type Ctx } from "../../../base/draw";
import { GOLD } from "./palette";
import { Rhythm, smooth } from "./time";

// Bats, the Burton way: big pointed ears and jagged wings whose trailing edges hang in spiky
// points between the finger bones. One bat is one closed subpath, so a whole flock shares one
// fill (in the color the caller passes: far flyers are flat silhouettes). Near ones get two tiny
// gold eyes. Three bats leave a roost now and then (every 8-16 s), loop round it and fade into the
// dark; at height a ring of six circles the moon like a planet's ring, crossing its face in front
// and hidden behind it; and once in a while a whole colony bursts out of a belfry and scatters.

// One wing, from the shoulder out and back along its spiky trailing edge: x, y at lift 0, and the
// change in y per unit of lift (wingtips up when lift > 0).
const WING = [
  [0.08, -0.08, 0],
  [0.5, -0.24, -0.2],
  [1.0, -0.1, -0.34],
  [0.84, 0.13, -0.3],
  [0.72, 0.02, -0.25],
  [0.6, 0.22, -0.2],
  [0.46, 0.06, -0.15],
  [0.3, 0.19, -0.08],
  [0.08, 0.1, 0],
] as const;

/**
 * One bat, wings spread, as a closed subpath centered at (x, y), `s` = half its wingspan. `lift`
 * -1..1 raises or drops the wingtips. Inside x ± s, y ± 0.46 s.
 */
export function batPath(ctx: Ctx, x: number, y: number, s: number, lift: number): void {
  const L = Math.max(-1, Math.min(1, lift));
  if (s < 6) {
    // Small and far: the same silhouette with fewer points (ears, one spike a wing).
    ctx.moveTo(x - s * 0.1, y - s * 0.3);
    ctx.lineTo(x, y - s * 0.12);
    ctx.lineTo(x + s * 0.1, y - s * 0.3);
    ctx.lineTo(x + s * 0.5, y - s * (0.24 + 0.2 * L));
    ctx.lineTo(x + s, y - s * (0.1 + 0.34 * L));
    ctx.lineTo(x + s * 0.62, y + s * (0.18 - 0.2 * L));
    ctx.lineTo(x + s * 0.4, y + s * (0.06 - 0.15 * L));
    ctx.lineTo(x, y + s * 0.28);
    ctx.lineTo(x - s * 0.4, y + s * (0.06 - 0.15 * L));
    ctx.lineTo(x - s * 0.62, y + s * (0.18 - 0.2 * L));
    ctx.lineTo(x - s, y - s * (0.1 + 0.34 * L));
    ctx.lineTo(x - s * 0.5, y - s * (0.24 + 0.2 * L));
    ctx.closePath();
    return;
  }
  // Ears and head
  ctx.moveTo(x - s * 0.06, y - s * 0.1);
  ctx.lineTo(x - s * 0.11, y - s * 0.32);
  ctx.lineTo(x - s * 0.02, y - s * 0.17);
  ctx.lineTo(x + s * 0.02, y - s * 0.17);
  ctx.lineTo(x + s * 0.11, y - s * 0.32);
  ctx.lineTo(x + s * 0.06, y - s * 0.1);
  for (let i = 0; i < WING.length; i++) {
    const w = WING[i]!;
    ctx.lineTo(x + s * w[0], y + s * (w[1] + w[2] * L));
  }
  // The body hanging below, then the other wing back to the ears
  ctx.lineTo(x, y + s * 0.28);
  for (let i = WING.length - 1; i >= 0; i--) {
    const w = WING[i]!;
    ctx.lineTo(x - s * w[0], y + s * (w[1] + w[2] * L));
  }
  ctx.closePath();
}

/** Two tiny gold eyes for a near bat (only where it is big enough to show them). */
function eyes(ctx: Ctx, x: number, y: number, s: number): void {
  if (s < 5) return;
  const r = Math.max(0.5, s * 0.035);
  ctx.moveTo(x - s * 0.035 + r, y - s * 0.12);
  ctx.arc(x - s * 0.035, y - s * 0.12, r, 0, Math.PI * 2);
  ctx.moveTo(x + s * 0.035 + r, y - s * 0.12);
  ctx.arc(x + s * 0.035, y - s * 0.12, r, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- the ring round the moon

/** The ring's bats: orbit radius (in moon radii), angular speed (rad/s), phase, wingbeat. */
const RING = [
  [1.2, 1.1, 0.0, 13],
  [1.32, 0.95, 1.1, 15],
  [1.24, 1.25, 2.2, 14],
  [1.38, 0.9, 3.3, 12],
  [1.18, 1.3, 4.3, 16],
  [1.3, 1.05, 5.3, 13.5],
] as const;
/** The ring is tilted this much (unless the caller tilts it more, to fit), and seen this flat. */
export const TILT = -0.22;
export const FLAT = 0.32;
/** The ring's widest orbit, in moon radii. */
export const RING_REACH = 1.38;
/** Bat half-span, in moon radii (big enough to read as bats against the moon on a phone). */
const RING_BAT = 0.15;

/**
 * Six bats circling the moon (center mx, my, radius mr) like a ring round a planet: in front of
 * its face on the near side of their orbit, hidden behind it on the far side. `scatter` 0..1
 * flings them outward and fades them (as a great shadow comes); `clipX` fades out any that come
 * near it from the left (to keep a column clear), `loX` any that come near it from the right (a
 * screen's edge). `tilt` turns the ring (radians; steeper fits a moon close to a screen's edge).
 */
export function batRing(
  ctx: Ctx,
  mx: number,
  my: number,
  mr: number,
  t: number,
  vis: number,
  scatter: number,
  color: string,
  clipX = Infinity,
  tilt = TILT,
  loX = -Infinity,
): void {
  if (vis <= 0.01) return;
  // Drawn at the opacity the caller set, times its own.
  const base = ctx.globalAlpha;
  const s = mr * RING_BAT;
  const c = Math.cos(tilt);
  const n = Math.sin(tilt);
  ctx.fillStyle = color;
  for (let i = 0; i < RING.length; i++) {
    const [R0, w, ph, rate] = RING[i]!;
    const th = t * w + ph;
    const R = mr * R0 * (1 + 1.5 * scatter);
    const ox = Math.cos(th) * R;
    const oy = Math.sin(th) * R * FLAT;
    const x = mx + ox * c - oy * n;
    const y = my + ox * n + oy * c;
    let a = vis * (1 - scatter);
    // Behind the moon on the far side of the orbit
    if (Math.sin(th) < 0) a *= smooth(mr * 0.85, mr * 1.05 + s, Math.hypot(x - mx, y - my));
    if (clipX < Infinity) a *= 1 - smooth(clipX - s * 3, clipX - s, x);
    if (loX > -Infinity) a *= smooth(loX + s, loX + s * 3, x);
    // (Too faint to see is not drawn at all: a whisper of a bat over the moon's face would only smudge it.)
    if (a <= 0.04) continue;
    ctx.globalAlpha = base * a;
    ctx.beginPath();
    batPath(ctx, x, y, s * (1 - 0.08 * Math.sin(th)), Math.sin(t * rate + i * 1.7));
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

/** Scratch box of `batRingBox`. */
const RBOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The box the ring of bats can cover round the moon, at a given scatter and tilt. */
export function batRingBox(mx: number, my: number, mr: number, scatter: number, tilt = TILT): Readonly<typeof RBOX> {
  const R = mr * RING_REACH * (1 + 1.5 * scatter);
  const bat = mr * RING_BAT * 1.1;
  const c = Math.cos(tilt);
  const n = Math.sin(tilt);
  // The tilted ellipse's half-width and half-height, and a bat's reach beyond its orbit.
  const hx = R * Math.sqrt(c * c + FLAT * FLAT * n * n) + bat;
  const hy = Math.max((R + bat) * 0.45, R * Math.sqrt(n * n + FLAT * FLAT * c * c) + bat * 0.6);
  RBOX.x0 = mx - hx;
  RBOX.x1 = mx + hx;
  RBOX.y0 = my - hy;
  RBOX.y1 = my + hy;
  return RBOX;
}

/**
 * The ring's tilt that fits it between the moon's center and a screen's edge `room` px away
 * (moon radius mr): the ring's own tilt if there is room, steeper (up to about 70 degrees) if not.
 */
export function ringTilt(mr: number, room: number): number {
  const R = mr * RING_REACH;
  const ex = (room - mr * RING_BAT * 1.1) / R;
  const c0 = Math.cos(TILT);
  if (ex >= Math.sqrt(c0 * c0 + FLAT * FLAT * (1 - c0 * c0))) return TILT;
  const cc = Math.max(0, (ex * ex - FLAT * FLAT) / (1 - FLAT * FLAT));
  return -Math.min(1.22, Math.acos(Math.min(1, Math.sqrt(cc))));
}

// ---------------------------------------------------------------- a roost's evening trip

/** Trips: three bats every 8-16 s, the first at 4.4 s (1.6 s later per step of the roost's id mod 3), 3 s each. */
const TRIPS = new Rhythm(4.4, 1.6, 8, 16, 83);
const TRIP = 3;

/** Scratch result of `batTripAt`. */
const TRIP_STATE = { k: 0, vis: 0 };

/** A trip out of the roost anchored `seed` under way at time t: progress 0..1 and opacity; null between trips. */
export function batTripAt(t: number, seed: number): Readonly<typeof TRIP_STATE> | null {
  const a = TRIPS.at(t, seed);
  if (!(a >= 0 && a < TRIP)) return null;
  TRIP_STATE.k = a / TRIP;
  TRIP_STATE.vis = smooth(0, 0.08, TRIP_STATE.k) * (1 - smooth(0.72, 1, TRIP_STATE.k));
  return TRIP_STATE;
}

/** Where trip bat j is at progress k, relative to the roost, in units of the bat's size. */
const TP = { x: 0, y: 0, s: 1 };
/** A trip's loop round the roost (radius, sizes; each bat a little wider), and how far it heads away and up after. */
const LOOP_R = 1.5;
const LOOP_STEP = 0.35;
const AWAY = 2.6;
const AWAY_UP = 2.2;
function tripSpot(j: number, k: number, side: number): typeof TP {
  const delay = j * 0.09;
  const q = Math.max(0, Math.min(1, (k - delay) / (1 - delay)));
  // Out and up, once round the roost, then away to the lane's outer side and up into the dark.
  const loop = Math.min(1, q / 0.62);
  const th = -Math.PI / 2 + side * loop * Math.PI * 2;
  const r = LOOP_R + j * LOOP_STEP;
  const away = Math.max(0, (q - 0.62) / 0.38);
  const e = smooth(0, 0.15, q);
  TP.x = Math.cos(th) * r * e + side * away * AWAY;
  TP.y = (-1.2 + (Math.sin(th) - 1) * r * 0.6) * e - away * AWAY_UP;
  TP.s = (0.55 + 0.45 * smooth(0, 0.2, q)) * (1 - 0.35 * away);
  return TP;
}
/** How far a trip reaches from its roost, in sizes: toward its heading, away from it, and up (the bats' wings included). */
export const TRIP_BACK = LOOP_R + LOOP_STEP * 2 + 1;
export const TRIP_OUT = TRIP_BACK + AWAY + 1;
export const TRIP_UP = 1.2 + (LOOP_R + LOOP_STEP * 2) * 1.2 + AWAY_UP + 0.6;

/** Three bats out of the roost at (x, y), each `size` px across half its wings, at trip progress k, heading to `side`. */
export function batTrip(ctx: Ctx, x: number, y: number, size: number, k: number, side: -1 | 1, color: string): void {
  const vis = smooth(0, 0.08, k) * (1 - smooth(0.72, 1, k));
  if (vis <= 0.01) return;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * vis;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let j = 0; j < 3; j++) {
    const p = tripSpot(j, k, side);
    batPath(ctx, x + p.x * size, y + p.y * size, size * p.s, Math.sin(k * 60 + j * 2));
  }
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let j = 0; j < 3; j++) {
    const p = tripSpot(j, k, side);
    eyes(ctx, x + p.x * size, y + p.y * size, size * p.s);
  }
  ctx.fill();
  ctx.globalAlpha = base;
}

/** Scratch box for the trip and the burst. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box a roost's trip can cover (whole trip), from the roost (x, y). */
export function batTripBox(x: number, y: number, size: number, side: -1 | 1): Readonly<typeof BOX> {
  BOX.x0 = x - (side > 0 ? TRIP_BACK : TRIP_OUT) * size;
  BOX.x1 = x + (side > 0 ? TRIP_OUT : TRIP_BACK) * size;
  BOX.y0 = y - TRIP_UP * size;
  BOX.y1 = y + 0.6 * size;
  return BOX;
}

// ---------------------------------------------------------------- the colony bursting out

const BURST = 14;
/** How far a burst reaches back from its side, in sizes: a bat's half wingspan (1.2 at most), its wobble (0.6) and a hair. */
const BURST_BACK = 1.2 + 0.6 + 0.1;

/** Where burst bat j is at progress k, relative to the roost, in units of size (`fan` narrows the fan toward straight up). */
function burstSpot(j: number, k: number, seed: number, side: number, fan: number): typeof TP {
  const delay = hash(seed * 31 + j) * 0.25;
  const q = Math.max(0, Math.min(1, (k - delay) / (1 - delay)));
  const ang = -Math.PI / 2 + side * (0.05 + 1.05 * hash(seed * 17 + j * 3 + 1)) * fan;
  const R = 6 + 7 * hash(seed * 13 + j * 5 + 2);
  const d = R * (1 - (1 - q) * (1 - q));
  const wob = Math.sin(q * 14 + j) * 0.6 * q;
  TP.x = Math.cos(ang) * d + wob;
  TP.y = Math.sin(ang) * d * 0.9;
  TP.s = (0.7 + 0.5 * hash(seed * 7 + j)) * (1 - 0.45 * q);
  return TP;
}

/**
 * A colony of 14 bats bursting out of the roost at (x, y) and fanning up toward `side`, shrinking
 * and fading; k 0..1. `fan` (0..1) narrows the fan toward straight up, for a roost near a lane's edge.
 */
export function batBurst(ctx: Ctx, x: number, y: number, size: number, k: number, seed: number, side: -1 | 1, color: string, fan = 1): void {
  const vis = smooth(0, 0.05, k) * (1 - smooth(0.6, 1, k));
  if (vis <= 0.01) return;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * vis;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let j = 0; j < BURST; j++) {
    const p = burstSpot(j, k, seed, side, fan);
    if (p.s * size < 1) continue;
    batPath(ctx, x + p.x * size, y + p.y * size, size * p.s, Math.sin(k * 80 + j * 1.3));
  }
  ctx.fill();
  ctx.globalAlpha = base;
}

/** The screen box the burst covers at progress k (from the roost at (x, y)), fanned `fan`. */
export function batBurstBox(x: number, y: number, size: number, k: number, side: -1 | 1, fan = 1): Readonly<typeof BOX> {
  const q = Math.max(0, Math.min(1, k));
  const d = 13 * (1 - (1 - q) * (1 - q)) + 0.6 + 1.2;
  // Toward its side: as far as the fan's widest bat reaches across (the whole way at fan 1).
  const out = (13 * (1 - (1 - q) * (1 - q)) * Math.sin(Math.min(Math.PI / 2, 1.1 * fan))) / Math.sin(1.1) + 0.6 + 1.2;
  // Away from its side: never past straight up (burstSpot), so only a wingspan and the wobble.
  BOX.x0 = x - (side > 0 ? BURST_BACK : out) * size;
  BOX.x1 = x + (side > 0 ? out : BURST_BACK) * size;
  BOX.y0 = y - (d * 0.9 + 0.6) * size;
  BOX.y1 = y + (0.6 + 0.6) * size;
  return BOX;
}

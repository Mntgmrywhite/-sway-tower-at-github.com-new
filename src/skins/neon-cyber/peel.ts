import { circle, easeOut, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CYAN, MAGENTA, PURPLE } from "./colors";
import { canopyAt, type Canopy } from "./props";
import { REAR, WHEEL_R, WHEEL_X } from "./racer";
import { tint, whiten } from "./tube";

// The start view's one action, and it comes round again: the street racer parked at the curb by
// the umbrella walker peels out. Its rims light up, the rear wheel spins in the puddle under it and
// throws a rooster tail of spray up at the walker, who ducks and tips the umbrella down sideways
// like a shield and takes the splash on it; the racer rips through the puddle in the middle of the
// street and speeds out of view past the parked hover car on the right. The walker shakes the
// umbrella off and lifts it back overhead, and the puddle it spun out refills from the wet street.
// Then the racer comes back round the block: its headlights slide in from the left, it rolls out
// from behind the vending machines, through the refilled puddle, and pulls up at its spot again,
// while the walker peeks out warily from under a half-lowered umbrella. From about 9 s the street
// is calm, the racer idling at the curb, until the act comes round again, every CYCLE seconds for
// as long as the player stands there: rev, spray, shield, shake, back round.
// Everything is keyed to the scene's clock (s.t, 0 when a tower's scene starts) folded onto one
// cycle (`actTime`), and drawn at street level: the racer below the tower's floor line, the spray
// only beside the tower's column.

/** The whole act comes round again this often (s): the owner's rule, every action repeats. */
export const CYCLE = 20;
/** The rims and lights come up: the driver's about to go (s). */
export const REV = 0.6;
/** The wheels spin up and the racer launches (s). */
export const GO = 1.0;
/** The walker tips the umbrella down (s): quick, a beat after the rev, before the spray lands. */
const SHIELD_FROM = 0.84;
const SHIELD_TO = 1.1;
/** Shaking the water off (s), then lifting it back overhead. */
const SHAKE_FROM = 1.85;
const SHAKE_TO = 2.4;
const SHAKES = 3;
const SHAKE_ANGLE = 0.24;
const LIFT_FROM = 2.4;
const LIFT_TO = 2.95;
/** After this the racer and its water are gone and the walker is back under the umbrella (s). */
export const CALM = 3;
/** The racer comes back round the block: in from the left edge at BACK_FROM, pulled up at its spot by BACK_TO (s). */
export const BACK_FROM = 6;
export const BACK_TO = 8;
/** Its lights dim back to idling after it pulls up (s). */
const DIM = 0.6;
/** The walker peeks out from under a half-lowered umbrella as it rolls back in: how far it tips (0..1) and when (s). */
const PEEK = 0.42;
const PEEK_FROM = BACK_FROM + 0.25;
const PEEK_IN = BACK_FROM + 0.6;
const PEEK_HOLD = BACK_TO + 0.2;
const PEEK_TO = BACK_TO + 0.85;
/** From here until the next rev the street is calm, the racer idling at the curb (s). */
export const IDLE = 9;

/** The time within the act: the scene's clock folded onto one cycle (s, 0 .. CYCLE). */
export function actTime(t: number): number {
  const a = t % CYCLE;
  return a < 0 ? a + CYCLE : a;
}

/** The racer's launch: distance (u per s³) covered as GO + τ: a wheelspin creep, then a rocket. */
const LAUNCH = 0.9;
/** Wheelspin on top of rolling (radians per s). */
const WHEELSPIN = 38;

/** Seconds since the launch (negative before it), in act time. */
function since(a: number): number {
  return a - GO;
}

/** How far the racer has gone from its spot as it peels out, in u (screen widths on a phone). */
export function travel(t: number): number {
  const tau = since(actTime(t));
  return tau <= 0 ? 0 : LAUNCH * tau * tau * tau;
}

/** The racer's speed as it peels out (u per s), `a` in act time. */
function speed(a: number): number {
  const tau = since(a);
  return tau <= 0 ? 0 : 3 * LAUNCH * tau * tau;
}

/** When the racer has covered `d` u as it peels out (act time, s). */
function whenAt(d: number): number {
  return GO + Math.cbrt(Math.max(0, d) / LAUNCH);
}

/**
 * How far ahead of its middle the racer's light reaches (of its length): the headlight's pool on
 * the wet floor, out past its nose.
 */
const LIGHT_REACH = 1.2;

/**
 * How far left of its spot (px) the racer starts its return: all of it, the headlight's pool
 * included, just off the left edge, so it slides in rather than blinking on.
 */
function backReach(x0: number, L: number): number {
  return x0 + L * LIGHT_REACH + 2;
}

/** The return's progress (0 .. 1) at act time `a`. */
function backP(a: number): number {
  return Math.min(1, Math.max(0, (a - BACK_FROM) / (BACK_TO - BACK_FROM)));
}

/** When on its return (act time) the racer's middle is at `x` (px), parked at x0, `L` px long. */
function backWhen(x: number, x0: number, L: number): number {
  const left = (x0 - x) / backReach(x0, L);
  return BACK_FROM + (BACK_TO - BACK_FROM) * (1 - Math.sqrt(Math.min(1, Math.max(0, left))));
}

/**
 * The x of the racer's middle on screen at time t, `L` px long and parked at x0: peeling out to the
 * right, gone, coming back in from the left and braking to a stop at its spot, then idling there.
 */
export function racerX(s: Scene, x0: number, L: number, t: number): number {
  const a = actTime(t);
  if (a < BACK_FROM) return x0 + travel(a) * s.u;
  // In at a cruise, braking evenly to a stop at its spot.
  const q = 1 - backP(a);
  return x0 - backReach(x0, L) * q * q;
}

/** Whether the racer, `L` px long with its middle at x, is out of view: gone on the right, or not yet in on the left. */
export function gone(s: Scene, x: number, L: number): boolean {
  return x - L * (REAR + 0.1) > s.cssW || x + L * LIGHT_REACH < 0;
}

/** Rims and lights: idling dim, coming up with the rev, on while it drives, dimming once it's back. */
export function power(t: number): number {
  const a = actTime(t);
  if (a <= REV) return 0;
  if (a < GO) return (a - REV) / (GO - REV);
  if (a <= BACK_TO) return 1;
  return Math.max(0, 1 - (a - BACK_TO) / DIM);
}

/** The racer's nose lifting as it bites (radians). */
export function pitch(t: number): number {
  const tau = since(actTime(t));
  if (tau <= 0 || tau >= 0.5) return 0;
  return 0.045 * Math.sin((Math.PI * tau) / 0.5);
}

/**
 * The wheels' turn (radians) for the racer `L` px long parked at x0: wheelspin and rolling as it
 * peels out, rolling as it comes back (ending where it started, so the next launch picks up from 0).
 */
export function spin(s: Scene, x0: number, L: number, t: number): number {
  const a = actTime(t);
  if (a >= BACK_FROM) return (racerX(s, x0, L, a) - x0) / (WHEEL_R * L);
  const tau = since(a);
  if (tau <= 0) return 0;
  return WHEELSPIN * Math.min(tau, 0.6) + (travel(a) * s.u) / (WHEEL_R * L);
}

/** The engine's idle shiver before the launch, as a fraction of the racer's length. */
export function shiver(t: number): number {
  const a = actTime(t);
  if (a <= REV || a >= GO) return 0;
  return Math.sin(a * 190) * 0.003;
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/**
 * How far the walker's umbrella is tipped down (0 overhead .. 1 a shield): all the way against the
 * spray, and partway, peeking out from under it, while the racer rolls back in.
 */
export function shieldAt(t: number): number {
  const a = actTime(t);
  if (a > SHIELD_FROM && a < LIFT_TO) {
    if (a < SHIELD_TO) return easeOut((a - SHIELD_FROM) / (SHIELD_TO - SHIELD_FROM));
    if (a <= LIFT_FROM) return 1;
    return 1 - smooth((a - LIFT_FROM) / (LIFT_TO - LIFT_FROM));
  }
  if (a > PEEK_FROM && a < PEEK_TO) {
    if (a < PEEK_IN) return PEEK * easeOut((a - PEEK_FROM) / (PEEK_IN - PEEK_FROM));
    if (a <= PEEK_HOLD) return PEEK;
    return PEEK * (1 - smooth((a - PEEK_HOLD) / (PEEK_TO - PEEK_HOLD)));
  }
  return 0;
}

/** The umbrella shaking: a shudder as the spray hits, then a few hard shakes to get the water off (radians). */
export function jiggleAt(t: number): number {
  const a = actTime(t);
  if (a > SHAKE_FROM && a < SHAKE_TO) {
    const p = (a - SHAKE_FROM) / (SHAKE_TO - SHAKE_FROM);
    return SHAKE_ANGLE * (1 - p) * Math.sin(p * SHAKES * Math.PI * 2);
  }
  const h = a - HIT_FROM;
  if (h > 0 && h < HIT_LEN) return 0.035 * Math.sin(h * 46) * Math.sin((Math.PI * h) / HIT_LEN);
  return 0;
}

/** How full the puddle under the racer's rear wheel is (0..1): the wheelspin throws most of it out, then the wet street runs back in. */
const DRAIN = 0.45;
const LOW = 0.4;
const REFILL_FROM = 2.4;
const REFILL_TO = 5.6;
export function puddleFill(t: number): number {
  const a = actTime(t);
  const tau = since(a);
  if (tau <= 0) return 1;
  if (tau < DRAIN) return 1 - (1 - LOW) * easeOut(tau / DRAIN);
  if (a < REFILL_FROM) return LOW;
  if (a < REFILL_TO) return LOW + (1 - LOW) * smooth((a - REFILL_FROM) / (REFILL_TO - REFILL_FROM));
  return 1;
}

// ------------------------------------------------------------------------------------- spray

interface Drop {
  /** Launched this long after GO (s). */
  at: number;
  /** Flight time to the umbrella (s). */
  fly: number;
  /** Where on the canopy's face it lands: -1 its top end .. 1 its bottom end. */
  face: number;
  /** How far left of the gate's middle it passes (0..1). */
  gate: number;
  /** Catches the city's magenta instead of the lamp's cyan. */
  pink: boolean;
}

const DROPS = 40;
const SPRAY: Drop[] = Array.from({ length: DROPS }, (_, i) => ({
  at: 0.01 + (0.3 * i) / DROPS + hash(i + 7100) * 0.03,
  fly: 0.2 + hash(i + 7140) * 0.08,
  face: -0.4 + hash(i + 7180) * 1.25,
  gate: hash(i + 7220),
  pink: hash(i + 7260) < 0.3,
}));
/** Strands of the sheet of water: where on the face each aims (the first and last are its edges). */
const SHEET = [-0.3, 0.05, 0.35, 0.65, 0.9] as const;
const SHEET_FROM = 0.02;
const SHEET_GROW = 0.2;
const SHEET_FADE = 0.42;
const SHEET_STEPS = 10;
/** The spray's first and last hits on the umbrella (s): the walker shudders through them. */
const HIT_FROM = GO + 0.2;
const HIT_LEN = 0.42;
/** A hit's burst of droplets lasts this long (s). */
const BURST = 0.18;
const BEADS = 4;
/**
 * Every path squeezes through a gate just beside the tower's column at its floor line, `GATE` u
 * wide and as far along the path as `GATE_AT`: the rooster tail is a narrow jet off the wheel that
 * fans out on its way to the umbrella, and stays out of the column.
 */
const GATE = 0.01;
const GATE_GAP = 0.008;
const GATE_AT = 0.4;

const SPRAY_COLOR = "#bdf3ff";
const SPRAY_GLOW = tint(CYAN, 0.24);
const SPRAY_CORE = tint(whiten(SPRAY_COLOR, 0.4), 0.9);
const PINK_GLOW = tint(MAGENTA, 0.22);
const PINK_CORE = tint(whiten(MAGENTA, 0.55), 0.9);
const SHEET_FILL = tint(SPRAY_COLOR, 0.13);
const SHEET_STYLE = tint(SPRAY_COLOR, 0.4);
const PUDDLE_RING = tint(PURPLE, 0.5);
const RING_LIT = tint(CYAN, 0.45);

/** When the first water reaches the umbrella and when the last of it is done bursting off (s). */
export function sprayHits(): { first: number; last: number } {
  let first = GO + SHEET_FROM + SHEET_GROW;
  let last = GO + SHEET_FADE;
  for (const d of SPRAY) {
    first = Math.min(first, GO + d.at + d.fly);
    last = Math.max(last, GO + d.at + d.fly + BURST);
  }
  return { first, last };
}

/** Scratch points, so a frame allocates nothing. */
const A = { x: 0, y: 0 };
const B = { x: 0, y: 0 };
const T = { x: 0, y: 0 };
const G = { x: 0, y: 0 };

/** A point on the canopy's convex face: `f` from -1 (its upper rim end) to 1 (its lower one). */
function facePoint(c: Canopy, f: number, out: { x: number; y: number }): void {
  const ax = Math.sin(c.angle);
  const ay = -Math.cos(c.angle);
  // Along the rim: perpendicular to the axis.
  const rx = -ay;
  const ry = ax;
  const bulge = c.dome * (1 - f * f) * 0.95;
  out.x = c.x + rx * c.r * f + ax * bulge;
  out.y = c.y + ry * c.r * f + ay * bulge;
}

/** The gate for a path `g` (0..1) of the way across it. */
function gateAt(s: Scene, g: number): void {
  G.x = s.baseX - s.u * (0.05 + GATE_GAP + GATE * g);
  G.y = s.groundY - s.u * 0.003;
}

/**
 * A droplet's path from the wheel (sx, sy) through the gate G to the face point T: it leaves the
 * puddle steeply and bends over toward the umbrella, `p` 0..1 along it.
 */
function pathAt(sx: number, sy: number, p: number, out: { x: number; y: number }): void {
  // The bend that takes the curve through the gate at GATE_AT.
  const w = 2 * GATE_AT * (1 - GATE_AT);
  const cx = (G.x - (1 - GATE_AT) * (1 - GATE_AT) * sx - GATE_AT * GATE_AT * T.x) / w;
  const cy = (G.y - (1 - GATE_AT) * (1 - GATE_AT) * sy - GATE_AT * GATE_AT * T.y) / w;
  const q = 1 - p;
  out.x = q * q * sx + 2 * p * q * cx + p * p * T.x;
  out.y = q * q * sy + 2 * p * q * cy + p * p * T.y;
}

/**
 * Clip to where the spray may fly: anywhere but the tower's column above its floor line. The
 * paths keep out of it anyway; this makes sure.
 */
function sprayZone(ctx: Ctx, s: Scene): void {
  const pad = s.u * 0.05;
  const x0 = s.baseX - pad;
  const x1 = s.baseX + s.baseW + pad;
  ctx.beginPath();
  ctx.rect(0, 0, Math.max(0, x0), s.cssH);
  ctx.rect(x1, 0, Math.max(0, s.cssW - x1), s.cssH);
  if (s.groundY < s.cssH) ctx.rect(x0, s.groundY, x1 - x0, s.cssH - s.groundY);
  ctx.clip();
}

const HUES = [false, true] as const;

/** Trace one strand of the sheet, `from` to `to` of the way along, onto the current path. */
function strand(ctx: Ctx, s: Scene, sx: number, sy: number, c: Canopy, f: number, from: number, to: number, join: boolean): void {
  facePoint(c, f, T);
  gateAt(s, (f + 0.3) / 1.2);
  for (let k = 0; k <= SHEET_STEPS; k++) {
    pathAt(sx, sy, from + ((to - from) * k) / SHEET_STEPS, A);
    if (k === 0 && !join) ctx.moveTo(A.x, A.y);
    else ctx.lineTo(A.x, A.y);
  }
}

/** Add droplets of one color to the current path: streaks along their paths. */
function streaks(s: Scene, ctx: Ctx, sx: number, sy: number, c: Canopy, tau: number, pink: boolean): void {
  for (const d of SPRAY) {
    if (d.pink !== pink) continue;
    const p = (tau - d.at) / d.fly;
    if (p <= 0 || p >= 1) continue;
    facePoint(c, d.face, T);
    gateAt(s, d.gate);
    pathAt(sx, sy, Math.max(0, p - 0.15), A);
    pathAt(sx, sy, p, B);
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
  }
}

/**
 * The rooster tail: from (sx, sy) at the racer's rear wheel up onto the walker's canopy `c`
 * (where it is now: it was tipped down to meet the water), its bursts dropping to the walker's
 * `floor`. A sheet of water, droplet streaks
 * catching the lamp's cyan and the city's magenta and, where they land, bursts off the umbrella.
 */
export function spray(ctx: Ctx, s: Scene, sx: number, sy: number, c: Canopy, floor: number): void {
  const tau = since(actTime(s.t));
  if (tau <= 0 || tau > SHEET_FADE + 0.4) return;
  const u = s.u;
  ctx.save();
  sprayZone(ctx, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // The sheet: growing from the wheel to the umbrella, then letting go of the wheel and thinning.
  if (tau > SHEET_FROM && tau < SHEET_FADE) {
    const head = Math.min(1, (tau - SHEET_FROM) / SHEET_GROW);
    const tail = Math.max(0, (tau - SHEET_FROM - SHEET_GROW) / (SHEET_FADE - SHEET_FROM - SHEET_GROW));
    ctx.globalAlpha = 1 - tail;
    ctx.beginPath();
    strand(ctx, s, sx, sy, c, SHEET[0], tail, head, false);
    strand(ctx, s, sx, sy, c, SHEET[SHEET.length - 1]!, head, tail, true);
    ctx.closePath();
    ctx.fillStyle = SHEET_FILL;
    ctx.fill();
    ctx.beginPath();
    for (const f of SHEET) strand(ctx, s, sx, sy, c, f, tail, head, false);
    ctx.strokeStyle = SHEET_STYLE;
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Droplets in flight, in the lamp's cyan and the city's magenta.
  for (const pink of HUES) {
    ctx.beginPath();
    streaks(s, ctx, sx, sy, c, tau, pink);
    ctx.strokeStyle = pink ? PINK_GLOW : SPRAY_GLOW;
    ctx.lineWidth = Math.max(2.4, u * 0.011);
    ctx.stroke();
    ctx.strokeStyle = pink ? PINK_CORE : SPRAY_CORE;
    ctx.lineWidth = Math.max(1, u * 0.0042);
    ctx.stroke();
  }

  // Bursts where they land: beads thrown up and down along the face and back out off it.
  ctx.beginPath();
  const ax = Math.sin(c.angle);
  const ay = -Math.cos(c.angle);
  for (let i = 0; i < SPRAY.length; i++) {
    const d = SPRAY[i]!;
    const age = tau - d.at - d.fly;
    if (age <= 0 || age >= BURST) continue;
    facePoint(c, d.face, T);
    const k = age / BURST;
    for (let j = 0; j < BEADS; j++) {
      const along = j === 0 ? -1.2 : j === 1 ? -0.5 : j === 2 ? 0.4 : 1;
      const out = j === 1 || j === 2 ? 0.7 : 0.2;
      const reach = u * 0.034 * (0.6 + hash(i * BEADS + j + 7300) * 0.6) * easeOut(k);
      const x = T.x + (Math.cos(c.angle) * along + ax * out) * reach;
      const y = T.y + (Math.sin(c.angle) * along + ay * out) * reach + u * 0.07 * k * k;
      if (y > floor) continue;
      circle(ctx, x, y, Math.max(0.7, u * 0.004 * (1 - k * 0.6)));
    }
  }
  ctx.fillStyle = SPRAY_CORE;
  ctx.fill();
  ctx.restore();
}

/**
 * Drops shaken off on every swing: where on the canopy's face each leaves from (-1 its top end ..
 * 1 its bottom end), and how hard it is flung out off the face toward the street and up (u per s).
 * Gently enough that every drop is on the floor before the tower's column: there is only about
 * 0.05 u of street between the shield and the column.
 */
const SHAKE_DROPS = [
  { f: -0.8, out: 0.1, up: 0.09 },
  { f: -0.2, out: 0.13, up: 0.06 },
  { f: 0.5, out: 0.15, up: 0 },
] as const;
const SHAKE_FALL = 1.6;
const SHAKE_LIFE = 0.5;
/** Scratch canopy for where the umbrella was when a drop let go. */
const AT: Canopy = { x: 0, y: 0, angle: 0, r: 0, dome: 0 };

/**
 * Water shaken off the umbrella of the walker standing at (x, y) at size U (`seed` its sway's
 * seed): on every swing drops leave its face, thrown out toward the street and away from the
 * walker, and fall to the floor at `floor`.
 */
export function shakeOff(ctx: Ctx, s: Scene, x: number, y: number, U: number, seed: number, floor: number): void {
  const t = actTime(s.t);
  if (t < SHAKE_FROM || t > SHAKE_TO + SHAKE_LIFE) return;
  const u = s.u;
  ctx.save();
  sprayZone(ctx, s);
  ctx.beginPath();
  const half = (SHAKE_TO - SHAKE_FROM) / (SHAKES * 2);
  for (let k = 0; k < SHAKES * 2; k++) {
    const t0 = SHAKE_FROM + half * (k + 0.5);
    const age = t - t0;
    if (age <= 0 || age > SHAKE_LIFE) continue;
    // Where the canopy was as they let go, and which way its face looked.
    const c = canopyAt(AT, x, y, U, t0, seed, shieldAt(t0), jiggleAt(t0));
    const ax = Math.sin(c.angle);
    const ay = -Math.cos(c.angle);
    for (let j = 0; j < SHAKE_DROPS.length; j++) {
      const d = SHAKE_DROPS[j]!;
      facePoint(c, d.f, A);
      const kick = 0.75 + hash(k * 3 + j + 7400) * 0.5;
      const vx = ax * d.out * u * kick;
      const vy = (ay * d.out - d.up) * u * kick;
      const dx = vx * age;
      const dy = vy * age + u * SHAKE_FALL * age * age;
      if (A.y + dy > floor) continue;
      circle(ctx, A.x + dx, A.y + dy, Math.max(0.7, u * 0.003));
    }
  }
  ctx.fillStyle = SPRAY_CORE;
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------------------ the racer

const WHEELS = [-WHEEL_X, WHEEL_X] as const;
/** Coming back from the left the front wheel meets the puddle first. */
const WHEELS_BACK = [WHEEL_X, -WHEEL_X] as const;

/** How long a ring on a puddle lasts (s). */
const RING_LIFE = 0.9;

/**
 * Rings on a puddle at (x, y) after `age` s, `n` of them `gap` s apart, `rx` px across at most,
 * stroked in `style` at opacity `fade`: each spreads out and fades away (so none blinks off at the
 * puddle's rim).
 */
function rings(ctx: Ctx, x: number, y: number, rx: number, age: number, n: number, gap: number, style: string, width: number, fade = 1): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  for (let i = 0; i < n; i++) {
    const a = age - i * gap;
    if (a <= 0 || a >= RING_LIFE) continue;
    const k = a / RING_LIFE;
    const spread = 0.25 + 0.75 * easeOut(k);
    ctx.beginPath();
    oval(ctx, x, y, rx * spread, rx * 0.18 * spread);
    ctx.globalAlpha = fade * (1 - k * k);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The two puddles the racer splashes through (screen px): the one under its rear wheel (p) and the one in the middle of the street (q). */
export interface Puddles {
  px: number;
  py: number;
  prx: number;
  qx: number;
  qy: number;
  qrx: number;
}

/**
 * Splashes off the floor by the racer parked at x0 (`L` px long, standing at y): the rear wheel's
 * puddle (at px, py, `prx` px across) ringing from the wheelspin, and, as each wheel rips through
 * the puddle in the middle of the street (qx, qy, `qrx` across), a crown of water thrown up and
 * back, then its rings. Coming back, each wheel rolls through the refilled rear puddle and rings it.
 */
export function wake(ctx: Ctx, s: Scene, x0: number, y: number, L: number, pud: Puddles): void {
  const t = actTime(s.t);
  const u = s.u;
  const width = Math.max(0.8, u * 0.0025);
  if (t >= BACK_FROM) {
    // Back over the rear puddle, front wheel first.
    for (const wx of WHEELS_BACK) {
      const enter = backWhen(pud.px - pud.prx - wx * L, x0, L);
      rings(ctx, pud.px, pud.py, pud.prx, t - enter, 2, 0.18, RING_LIT, width);
    }
    return;
  }
  const tau = since(t);
  if (tau <= 0 || tau > 2.5) return;
  rings(ctx, pud.px, pud.py, pud.prx, tau, 3, 0.16, RING_LIT, width);

  // Through the middle puddle: each wheel throws water as it crosses.
  const enter = pud.qx - pud.qrx;
  const leave = pud.qx + pud.qrx;
  ctx.beginPath();
  for (const wx of WHEELS) {
    const w0 = x0 + wx * L;
    const N = 7;
    for (let i = 0; i < N; i++) {
      const at = enter + ((leave - enter) * (i + 0.5)) / N;
      if (at < w0) continue;
      const tp = whenAt((at - w0) / u);
      const age = t - tp;
      if (age <= 0 || age > 0.36) continue;
      const v = speed(tp) * u;
      for (let j = 0; j < 3; j++) {
        // Thrown up, some back along the street and some ahead, slowed by the air.
        const vx = -v * (0.08 + 0.12 * j) * (j === 1 ? -0.6 : 1);
        const vy = -u * (0.42 + 0.25 * hash(i * 3 + j + 7500 + (wx > 0 ? 50 : 0)));
        const x = at + vx * age;
        const dy = vy * age + u * 4.2 * age * age;
        if (dy > 0) continue;
        circle(ctx, x, y + dy, Math.max(0.7, u * 0.0035));
      }
    }
  }
  ctx.fillStyle = SPRAY_CORE;
  ctx.fill();
  // Its rings once it has passed.
  const crossed = whenAt((pud.qx - (x0 - WHEEL_X * L)) / u);
  rings(ctx, pud.qx, pud.qy, pud.qrx, t - crossed, 2, 0.2, PUDDLE_RING, width);
}

/**
 * Runnels of the wet street running back into the puddle the wheelspin emptied: where each comes
 * in from (-1 the left, 1 the right), how far out it starts (of the full puddle's half width) and
 * how far above or below the puddle's middle it runs (of its half height).
 */
const RUNNELS = [
  { side: -1, from: 2.3, dy: -0.35 },
  { side: 1, from: 2.6, dy: 0.25 },
  { side: 1, from: 2.0, dy: -0.45 },
  { side: -1, from: 2.5, dy: 0.4 },
] as const;
const RUNNEL_BEADS = 3;
/** A bead of water runs in this many times a second. */
const RUNNEL_RATE = 1.3;
/** Rain rings on the refilling puddle, one every RING_LIFE s (so each has faded out before the next). */
const REFILL_RINGS = tint(CYAN, 0.3);

/**
 * The rear puddle at (x, y), `rx` by `ry` px when full, refilling: beads of water run in along the
 * wet street from both sides and rings spread on it, fading in and out over the refill.
 */
export function refill(ctx: Ctx, s: Scene, x: number, y: number, rx: number, ry: number): void {
  const a = actTime(s.t);
  if (a <= REFILL_FROM || a >= REFILL_TO) return;
  const k = Math.sin((Math.PI * (a - REFILL_FROM)) / (REFILL_TO - REFILL_FROM));
  const fill = puddleFill(a);
  const u = s.u;
  ctx.save();
  ctx.lineCap = "round";
  ctx.beginPath();
  const seg = Math.max(2, rx * 0.22);
  for (let i = 0; i < RUNNELS.length; i++) {
    const r = RUNNELS[i]!;
    const to = rx * fill * 0.9;
    const from = rx * r.from;
    for (let j = 0; j < RUNNEL_BEADS; j++) {
      const p = (a * RUNNEL_RATE + j / RUNNEL_BEADS + hash(i + 7600)) % 1;
      const d = from + (to - from) * p;
      const by = y + ry * r.dy * (1 - p * 0.6);
      ctx.moveTo(x + r.side * (d + seg * (1 - p * 0.5)), by);
      ctx.lineTo(x + r.side * d, by);
    }
  }
  ctx.globalAlpha = k;
  ctx.strokeStyle = RING_LIT;
  ctx.lineWidth = Math.max(0.8, u * 0.0028);
  ctx.stroke();
  rings(ctx, x, y, rx * fill, (a - REFILL_FROM) % RING_LIFE, 1, 0, REFILL_RINGS, Math.max(0.8, u * 0.002), k);
  ctx.restore();
}

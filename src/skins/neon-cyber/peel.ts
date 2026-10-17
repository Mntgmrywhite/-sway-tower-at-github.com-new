import { circle, easeOut, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CYAN, MAGENTA, PURPLE } from "./colors";
import { canopyAt, type Canopy } from "./props";
import { REAR, WHEEL_R, WHEEL_X } from "./racer";
import { tint, whiten } from "./tube";

// The start view's one action: the street racer parked at the curb by the umbrella walker peels
// out. Its rims light up, the rear wheel spins in the puddle under it and throws a rooster tail of
// spray up at the walker, who ducks and tips the umbrella down sideways like a shield and takes
// the splash on it; the racer rips through the puddle in the middle of the street and speeds out
// of view past the parked hover car on the right. The walker shakes the umbrella off and lifts it
// back overhead, and from about 3 s the street is as calm as ever.
// Everything is keyed to the scene's clock (s.t, 0 when a tower's scene starts) and drawn at
// street level: the racer below the tower's floor line, the spray only beside the tower's column.

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
/** After this the street is calm again (s). */
export const CALM = 3;

/** The racer's launch: distance (u per s³) covered as GO + τ: a wheelspin creep, then a rocket. */
const LAUNCH = 0.9;
/** Wheelspin on top of rolling (radians per s). */
const WHEELSPIN = 38;

/** Seconds since the launch (negative before it). */
function since(t: number): number {
  return t - GO;
}

/** How far the racer has gone from its spot, in u (screen widths on a phone). */
export function travel(t: number): number {
  const tau = since(t);
  return tau <= 0 ? 0 : LAUNCH * tau * tau * tau;
}

/** The racer's speed (u per s). */
function speed(t: number): number {
  const tau = since(t);
  return tau <= 0 ? 0 : 3 * LAUNCH * tau * tau;
}

/** When the racer has covered `d` u (s). */
function whenAt(d: number): number {
  return GO + Math.cbrt(Math.max(0, d) / LAUNCH);
}

/** Rims and lights: idling dim, coming up with the rev. */
export function power(t: number): number {
  if (t <= REV) return 0;
  return Math.min(1, (t - REV) / (GO - REV));
}

/** The racer's nose lifting as it bites (radians). */
export function pitch(t: number): number {
  const tau = since(t);
  if (tau <= 0 || tau >= 0.5) return 0;
  return 0.045 * Math.sin((Math.PI * tau) / 0.5);
}

/** The wheels' turn (radians), for a racer `L` u long. */
export function spin(t: number, L: number): number {
  const tau = since(t);
  if (tau <= 0) return 0;
  return WHEELSPIN * Math.min(tau, 0.6) + travel(t) / (WHEEL_R * L);
}

/** The engine's idle shiver before the launch, as a fraction of the racer's length. */
export function shiver(t: number): number {
  if (t <= REV || t >= GO) return 0;
  return Math.sin(t * 190) * 0.003;
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** How far the walker's umbrella is tipped down (0 overhead .. 1 a shield). */
export function shieldAt(t: number): number {
  if (t <= SHIELD_FROM || t >= LIFT_TO) return 0;
  if (t < SHIELD_TO) return easeOut((t - SHIELD_FROM) / (SHIELD_TO - SHIELD_FROM));
  if (t <= LIFT_FROM) return 1;
  return 1 - smooth((t - LIFT_FROM) / (LIFT_TO - LIFT_FROM));
}

/** The umbrella shaking: a shudder as the spray hits, then a few hard shakes to get the water off (radians). */
export function jiggleAt(t: number): number {
  if (t > SHAKE_FROM && t < SHAKE_TO) {
    const p = (t - SHAKE_FROM) / (SHAKE_TO - SHAKE_FROM);
    return SHAKE_ANGLE * (1 - p) * Math.sin(p * SHAKES * Math.PI * 2);
  }
  const h = t - HIT_FROM;
  if (h > 0 && h < HIT_LEN) return 0.035 * Math.sin(h * 46) * Math.sin((Math.PI * h) / HIT_LEN);
  return 0;
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
  const tau = since(s.t);
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
  const t = s.t;
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

/** The x of the racer's middle on screen at time t, parked at x0. */
export function racerX(s: Scene, x0: number, t: number): number {
  return x0 + travel(t) * s.u;
}

/** Whether the racer, `L` px long with its middle at x, has left the screen on the right. */
export function gone(s: Scene, x: number, L: number): boolean {
  return x - L * (REAR + 0.1) > s.cssW;
}

const WHEELS = [-WHEEL_X, WHEEL_X] as const;

/** How long a ring on a puddle lasts (s). */
const RING_LIFE = 0.9;

/**
 * Rings on a puddle at (x, y) after `age` s, `n` of them `gap` s apart, `rx` px across at most,
 * stroked in `style`: each spreads out and fades away (so none blinks off at the puddle's rim).
 */
function rings(ctx: Ctx, x: number, y: number, rx: number, age: number, n: number, gap: number, style: string, width: number): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  for (let i = 0; i < n; i++) {
    const a = age - i * gap;
    if (a <= 0 || a >= RING_LIFE) continue;
    const k = a / RING_LIFE;
    const spread = 0.25 + 0.75 * easeOut(k);
    ctx.beginPath();
    oval(ctx, x, y, rx * spread, rx * 0.18 * spread);
    ctx.globalAlpha = 1 - k * k;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Splashes off the floor by the racer: the rear wheel's puddle (at px, py, `prx` px across)
 * ringing from the wheelspin, and, as each wheel rips through the puddle in the middle of the
 * street (qx, qy, `qrx` across), a crown of water thrown up and back, then its rings.
 */
export function wake(
  ctx: Ctx,
  s: Scene,
  x0: number,
  y: number,
  L: number,
  pud: { px: number; py: number; prx: number; qx: number; qy: number; qrx: number },
): void {
  const t = s.t;
  const tau = since(t);
  if (tau <= 0 || tau > 2.5) return;
  const u = s.u;
  rings(ctx, pud.px, pud.py, pud.prx, tau, 3, 0.16, RING_LIT, Math.max(0.8, u * 0.0025));

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
  rings(ctx, pud.qx, pud.qy, pud.qrx, t - crossed, 2, 0.2, PUDDLE_RING, Math.max(0.8, u * 0.0025));
}

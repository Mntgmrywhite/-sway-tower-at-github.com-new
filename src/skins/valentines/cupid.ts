import { circle, ink, inkedLine, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BALLOON, BRASS, CHEEK, CREAM, CURLS, FOAM, INK, PETAL, PETAL_PALE, ROSE, SASH, SKIN, STONE, STRING, TUNIC, WING } from "./colors";
import { heartPath, petalPath, sparkle } from "./shapes";

// The cherub by the fountain, a public-domain Cupid of our own: a chubby little archer with
// golden curls, two small white wings, a sky-blue tunic with a pink sash over it, standing on his
// column behind the pool's left lobe with a brass bow. His story is told in the first seconds of
// every tower (the scene's clock starts at 0 with the title screen's tower and with every new
// run): he stands there a marble statue, with a heart balloon tied to the fountain's rim bobbing
// up over his left shoulder, clear of him; then color blooms over him and his wings stir, he
// raises the bow up at it, draws, and looses his arrow, and the balloon pops in a burst of rose
// petals (the string drops limp, the arrow tumbles down into the pool with a little splash) by
// 3.4 s; he hops for joy, wings fluttering, and little hearts float up from him. He looks about a
// while, then settles back into his statue's pose and turns to marble again. And every CYCLE
// seconds it all comes round: a fresh balloon floats in from the left of the screen, trailing its
// string, he wakes, tracks it with the bow and shoots it the same way. Near: flat two-tone fills,
// one ink weight. Everything is a function of the scene's time; nothing here is allocated per
// frame.
//
// He stays in the left lane, clear of the boulevard behind him: nothing of this ever enters the
// tower's column, and the burst (its flash and its petals) and the tumbling arrow never reach the
// screen's left edge (only a fresh balloon floating in crosses it). His column stands him above
// the slider's lane in both modes (garden.ts PLINTH_TOP), so the bar sweeping across never passes
// over him or his balloon: only its string, and the arrow dropping into the pool, cross the
// lanes.
//
// Positions are in u from the screen center, heights in u above the tower's floor line.

/**
 * Where the balloon floats (its heart's center): up over his left shoulder, its underside clear
 * above his curls and wing tips and its right side clear of his raised bow, so the two never
 * touch (layout.test.ts), and close enough to the screen's middle that the pop's flash and petals
 * stay in from the left edge. Its string is tied to the rim of the pool's left lobe.
 */
export const BALLOON_X = -0.41;
export const BALLOON_Y = 0.385;
export const BALLOON_SIZE = 0.08;
const TIE_X = -0.445;
const TIE_Y = -0.026;

/** One telling of the story (s). */
export const CYCLE = 20;
/** The first cycle: the statue wakes, draws, looses; the arrow's flight; the pop. */
export const WAKE = 0.5;
export const AWAKE = 1.5;
const RAISE = 1.6;
export const DRAW = 2.0;
export const DRAWN = 2.9;
export const LOOSE = 3.0;
export const FLIGHT = 0.35;
export const POP = LOOSE + FLIGHT;
/** Later cycles: a fresh balloon floats in over ENTER seconds (from ENTER_Y above the floor: over the slider's lanes), he draws, looses and pops it. */
export const ENTER = 4;
const ENTER_Y = 0.23;
const RAISE2 = 2.2;
const DRAW2 = 2.6;
const DRAWN2 = 3.9;
const LOOSE2 = 4.2;
const POP2 = LOOSE2 + FLIGHT;
/** After the pop: the arrow's drop into the pool, the burst, the hop, the hearts. */
const DROP = 0.45;
const BURST = 1.5;
const HOP_AT = 0.45;
const HOP = 0.7;
const HEARTS = [0.9, 1.8] as const;
const FLOAT = 1.9;
const STRING_DROP = 0.7;
/** Late in every cycle: he stops looking about, then turns back to marble, and stands a statue till the next. */
const STILL = 14.5;
export const STONE_FROM = 15.5;
export const STONE_TO = 17;

/** Whether a fresh balloon is floating in from the screen's left side at scene time `t` (from the second telling on, its first ENTER seconds). */
export function floatingIn(t: number): boolean {
  return t >= CYCLE && t - Math.floor(t / CYCLE) * CYCLE < ENTER;
}

export interface Plan {
  /** 0 marble, 1 flesh and color. */
  alive: number;
  /** The bow: raised (0 at rest by his side, 1 up and aimed), its aim (radians, screen coordinates), and how far the string is drawn (0..1). */
  raise: number;
  aim: number;
  draw: number;
  /** The arrow: nocked on the bow, in flight (0..1 along its way), or falling into the pool (0..1), else gone. */
  nocked: boolean;
  flight: number;
  fall: number;
  /** The balloon: whether it is here, its center (u from the screen center, u above the floor), and whether its string is tied to the rim (else it trails). */
  balloon: boolean;
  bx: number;
  by: number;
  tied: boolean;
  /** Seconds since the pop (-1: no pop lately): the burst, the string dropping, the splash. */
  since: number;
  /** His hop (0..1 up), wing beat (0 idle .. 1 fluttering), and where his eyes look (-1 away .. 1 toward the tower). */
  hop: number;
  flutter: number;
  look: number;
  /** The two hearts floating up from him (0 none .. 1 gone). */
  heart0: number;
  heart1: number;
}

const PLAN: Plan = { alive: 0, raise: 0, aim: 0, draw: 0, nocked: false, flight: -1, fall: -1, balloon: true, bx: BALLOON_X, by: BALLOON_Y, tied: true, since: -1, hop: 0, flutter: 0, look: 0, heart0: 0, heart1: 0 };

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** Where his bow hand is when the bow is up (u from his center / above his feet). */
const HAND_X = -0.03;
const HAND_Y = 0.07;

/** The aim from his bow hand (at `hx`, `hy` on screen) to the balloon's heart. */
function aimAt(hx: number, hy: number, bx: number, by: number): number {
  return Math.atan2(by - hy, bx - hx);
}

/**
 * What he and the balloon are doing at scene time `t`. `edge` is where a fresh balloon floats
 * in from: the screen's left edge, in u from the screen center (negative). `cx` is his column's
 * center in u from the screen center, and `feet` its top, in u above the floor line.
 */
export function cherubPlan(t: number, edge: number, cx: number, feet: number): Plan {
  const p = PLAN;
  const n = Math.floor(t / CYCLE);
  const k = t - n * CYCLE;
  const first = n === 0;
  p.alive = ease((k - WAKE) / (AWAKE - WAKE)) * (1 - ease((k - STONE_FROM) / (STONE_TO - STONE_FROM)));
  p.look = 0;
  p.heart0 = 0;
  p.heart1 = 0;
  p.hop = 0;
  p.fall = -1;
  p.flight = -1;
  p.nocked = false;
  // The balloon: tied in place in the first cycle; later it floats in from the left edge.
  const pop = first ? POP : POP2;
  const loose = first ? LOOSE : LOOSE2;
  const draw0 = first ? DRAW : DRAW2;
  const drawn = first ? DRAWN : DRAWN2;
  const raise0 = first ? RAISE : RAISE2;
  if (first) {
    p.bx = BALLOON_X;
    p.by = BALLOON_Y;
    p.tied = true;
  } else {
    const q = ease(k / ENTER);
    const e = 1 - (1 - q) * (1 - q);
    p.bx = edge - 0.07 + (BALLOON_X - edge + 0.07) * e;
    p.by = ENTER_Y + (BALLOON_Y - ENTER_Y) * e;
    p.tied = false;
  }
  p.balloon = k < pop;
  p.since = k >= pop ? k - pop : -1;
  // The bow: up from RAISE, tracking the balloon, drawn and loosed; down again after the pop.
  p.raise = ease((k - raise0) / 0.5) * (1 - ease((k - pop - 0.3) / 0.6));
  const hx = cx + HAND_X;
  const hy = -(feet + HAND_Y);
  // Screen coordinates: y grows downward, so the balloon (above) is at -by.
  p.aim = aimAt(hx, hy, p.bx, -p.by);
  p.draw = ease((k - draw0) / (drawn - draw0)) * (k < loose ? 1 : 0);
  p.nocked = k >= draw0 - 0.2 && k < loose;
  if (k >= loose && k < pop) p.flight = (k - loose) / FLIGHT;
  if (p.since >= 0 && p.since < DROP) p.fall = p.since / DROP;
  // Joy: a hop with fluttering wings, and two hearts; then he looks about, now at the tower, now away.
  if (p.since >= 0) {
    p.hop = Math.sin(Math.PI * clamp01((p.since - HOP_AT) / HOP));
    p.heart0 = clamp01((p.since - HEARTS[0]) / FLOAT);
    p.heart1 = clamp01((p.since - HEARTS[1]) / FLOAT);
    p.look = p.since > 3 ? Math.sin((p.since - 3) * 0.45) * (1 - ease((k - STILL) / 0.8)) : 0;
  }
  const waking = k > WAKE && k < AWAKE + 0.6;
  p.flutter = waking || (p.since >= 0 && p.since < HOP_AT + HOP + 0.3) ? 1 : 0.15;
  return p;
}

// ---------------------------------------------------------------- colors as he wakes

/** His colors from marble (0) to life (1), in a few steps, so waking mixes nothing per frame. */
const STEPS = 7;
function ramp(color: string): string[] {
  return Array.from({ length: STEPS }, (_, i) => mix(STONE.body, color, i / (STEPS - 1)));
}
function rampLight(color: string): string[] {
  return Array.from({ length: STEPS }, (_, i) => mix(STONE.light, color, i / (STEPS - 1)));
}
function rampShade(color: string): string[] {
  return Array.from({ length: STEPS }, (_, i) => mix(STONE.shade, color, i / (STEPS - 1)));
}
const C = {
  skin: ramp(SKIN.body),
  cheek: ramp(CHEEK),
  curls: ramp(CURLS.body),
  curlsLight: rampLight(CURLS.light),
  sash: ramp(SASH.body),
  tunic: ramp(TUNIC.body),
  tunicLight: rampLight(TUNIC.light),
  tunicShade: rampShade(TUNIC.shade),
  wing: ramp(WING.body),
  wingShade: rampShade(WING.shade),
  bow: ramp(BRASS.body),
  bowLight: rampLight(BRASS.light),
};

// ---------------------------------------------------------------- the figure

/** His size: feet to the top of his curls (u). */
const HEIGHT = 0.12;

/** Scratch for the bow's geometry (screen px), filled by `bowAt`. */
const BOW = { gx: 0, gy: 0, dx: 0, dy: 0, px: 0, py: 0, nx: 0, ny: 0 };
/** The bow's half length (u) and how far the nock is pulled back at full draw. */
const LIMB = 0.034;
const PULL = 0.028;

/** The bow's grip, direction, perpendicular and nock point for the plan, him centered at (x, foot). */
function bowAt(x: number, foot: number, u: number, p: Plan): typeof BOW {
  const b = BOW;
  // At rest the bow hangs by his side pointing down; raised, it is held out along the aim
  // (swung up the short way round, so it never sweeps through pointing at the tower).
  const rest = Math.PI * 0.5 + 0.3;
  let aim = p.aim;
  if (aim - rest > Math.PI) aim -= Math.PI * 2;
  if (aim - rest < -Math.PI) aim += Math.PI * 2;
  const a = p.raise > 0.999 ? aim : aim * p.raise + rest * (1 - p.raise);
  b.dx = Math.cos(a);
  b.dy = Math.sin(a);
  const reach = u * (0.016 + 0.016 * p.raise);
  const sx = x - u * 0.012;
  const sy = foot - u * 0.066;
  b.gx = sx + b.dx * reach;
  b.gy = sy + b.dy * reach;
  b.px = -b.dy;
  b.py = b.dx;
  const back = u * (LIMB * 0.35 + PULL * p.draw);
  b.nx = b.gx - b.dx * back;
  b.ny = b.gy - b.dy * back;
  return b;
}

/** A wing: a plump leaf from the shoulder out to its tip, with a shaded inner curve. */
function wing(ctx: Ctx, sx: number, sy: number, tx: number, ty: number, u: number, body: string, shade: string, lw: number): void {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const nx = -(ty - sy) * 0.5;
  const ny = (tx - sx) * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx * 0.6, my - ny * 0.6, sx, sy);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ink(ctx, lw * 0.85, INK);
  ctx.strokeStyle = shade;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  ctx.moveTo(sx + (tx - sx) * 0.25 - nx * 0.1, sy + (ty - sy) * 0.25 - ny * 0.1);
  ctx.quadraticCurveTo(mx - nx * 0.15, my - ny * 0.15, sx + (tx - sx) * 0.8 - nx * 0.05, sy + (ty - sy) * 0.8 - ny * 0.05);
  ctx.stroke();
}

/** The bow: two limbs of brass bowing toward the target, the string from tip to tip through the nock. */
function bow(ctx: Ctx, u: number, b: typeof BOW, lw: number, brass: string, light: string): void {
  const L = LIMB * u;
  const t1x = b.gx - b.dx * L * 0.35 + b.px * L;
  const t1y = b.gy - b.dy * L * 0.35 + b.py * L;
  const t2x = b.gx - b.dx * L * 0.35 - b.px * L;
  const t2y = b.gy - b.dy * L * 0.35 - b.py * L;
  ctx.strokeStyle = STRING;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(t1x, t1y);
  ctx.lineTo(b.nx, b.ny);
  ctx.lineTo(t2x, t2y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(t1x, t1y);
  ctx.quadraticCurveTo(b.gx + b.dx * L * 0.3 + b.px * L * 0.45, b.gy + b.dy * L * 0.3 + b.py * L * 0.45, b.gx, b.gy);
  ctx.quadraticCurveTo(b.gx + b.dx * L * 0.3 - b.px * L * 0.45, b.gy + b.dy * L * 0.3 - b.py * L * 0.45, t2x, t2y);
  inkedLine(ctx, brass, u * 0.008, lw * 0.8, INK);
  ctx.strokeStyle = light;
  ctx.lineWidth = u * 0.003;
  ctx.beginPath();
  ctx.moveTo(b.gx + b.px * L * 0.2, b.gy + b.py * L * 0.2);
  ctx.lineTo(b.gx + b.px * L * 0.7 - b.dx * L * 0.1, b.gy + b.py * L * 0.7 - b.dy * L * 0.1);
  ctx.stroke();
}

/** The arrow's length (u). */
const ARROW = 0.075;

/** An arrow with its nock at (x, y) pointing along (dx, dy): a cream shaft, pink fletching, a heart for a head. */
function arrow(ctx: Ctx, u: number, x: number, y: number, dx: number, dy: number, lw: number): void {
  const L = ARROW * u;
  const tx = x + dx * L;
  const ty = y + dy * L;
  const px = -dy;
  const py = dx;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx - dx * u * 0.012, ty - dy * u * 0.012);
  inkedLine(ctx, CREAM.body, u * 0.005, lw * 0.7, INK);
  // Fletching: two little vanes.
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    ctx.moveTo(x + dx * u * 0.004, y + dy * u * 0.004);
    ctx.lineTo(x - dx * u * 0.006 + px * m * u * 0.007, y - dy * u * 0.006 + py * m * u * 0.007);
    ctx.lineTo(x + dx * u * 0.018 + px * m * u * 0.0055, y + dy * u * 0.018 + py * m * u * 0.0055);
    ctx.lineTo(x + dx * u * 0.02, y + dy * u * 0.02);
    ctx.closePath();
  }
  ctx.fillStyle = PETAL;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // The head: a heart, its point forward.
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
  ctx.beginPath();
  heartPath(ctx, 0, u * 0.006, u * 0.02);
  ctx.fillStyle = ROSE.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.restore();
}

/** The figure, centered at x with his feet at `foot`, from the plan. His colors at step `c` of waking. */
function figure(ctx: Ctx, x: number, foot: number, u: number, p: Plan, lw: number, t: number): void {
  const c = Math.round(p.alive * (STEPS - 1));
  const skin = C.skin[c]!;
  const fy = foot - p.hop * u * 0.025;
  const b = bowAt(x, fy, u, p);
  // Wings behind him: up and out from his shoulder blades, beating with the flutter (still as stone while he is marble).
  const lift = p.flutter * p.alive;
  const flap = Math.sin(t * (lift > 0.5 ? 24 : 2.5)) * (0.2 + lift * 0.8) * p.alive;
  for (let m = -1; m <= 1; m += 2) {
    const sx = x + m * u * 0.01;
    const sy = fy - u * 0.072;
    wing(ctx, sx, sy, x + m * u * (0.036 + flap * 0.01), fy - u * (0.1 + lift * 0.012 + flap * 0.02), u, C.wing[c]!, C.wingShade[c]!, lw);
  }
  // Legs: two stubby legs with little feet.
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    const lx = x + m * u * 0.009;
    ctx.moveTo(lx - u * 0.007, fy - u * 0.032);
    ctx.lineTo(lx + u * 0.007, fy - u * 0.032);
    ctx.lineTo(lx + u * 0.007, fy - u * 0.006);
    ctx.lineTo(lx - u * 0.007, fy - u * 0.006);
    ctx.closePath();
    oval(ctx, lx - m * u * 0.002, fy - u * 0.005, u * 0.011, u * 0.005);
  }
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, lw, INK);
  // The draw arm, behind the body: hanging, or back at the string's nock.
  const ax = x + u * 0.012;
  const ay = fy - u * 0.064;
  const restX = x + u * 0.018;
  const restY = fy - u * 0.04;
  const drawing = p.raise * ease((p.draw - 0.05) / 0.3);
  const hx = restX + (b.nx - restX) * drawing;
  const hy = restY + (b.ny - restY) * drawing;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(hx, hy);
  inkedLine(ctx, skin, u * 0.011, lw * 0.8, INK);
  // His tunic: a little flared skirt to the knees, then the round body over it, lit on the left, with the sash across it.
  ctx.beginPath();
  ctx.moveTo(x - u * 0.022, fy - u * 0.046);
  ctx.lineTo(x - u * 0.027, fy - u * 0.019);
  ctx.quadraticCurveTo(x, fy - u * 0.012, x + u * 0.027, fy - u * 0.019);
  ctx.lineTo(x + u * 0.022, fy - u * 0.046);
  ctx.closePath();
  ctx.fillStyle = C.tunicShade[c]!;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  oval(ctx, x, fy - u * 0.05, u * 0.024, u * 0.027);
  ctx.fillStyle = C.tunic[c]!;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.tunicLight[c]!;
  ctx.beginPath();
  circle(ctx, x - u * 0.009, fy - u * 0.058, u * 0.011);
  ctx.fill();
  ctx.fillStyle = C.tunicShade[c]!;
  ctx.fillRect(x - u * 0.03, fy - u * 0.031, u * 0.06, u * 0.01);
  ctx.strokeStyle = C.sash[c]!;
  ctx.lineWidth = u * 0.011;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x + u * 0.03, fy - u * 0.074);
  ctx.lineTo(x - u * 0.03, fy - u * 0.034);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  oval(ctx, x, fy - u * 0.05, u * 0.024, u * 0.027);
  ink(ctx, lw, INK);
  // The sash's knot and tails at his hip.
  ctx.beginPath();
  circle(ctx, x - u * 0.02, fy - u * 0.04, u * 0.006);
  ctx.moveTo(x - u * 0.022, fy - u * 0.036);
  ctx.lineTo(x - u * 0.03, fy - u * 0.016);
  ctx.lineTo(x - u * 0.02, fy - u * 0.02);
  ctx.closePath();
  ctx.fillStyle = C.sash[c]!;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The head: round, with cheeks, two eyes, a smile, and a cap of golden curls.
  const headX = x - u * 0.003;
  const headY = fy - u * 0.098;
  const r = u * 0.023;
  ctx.beginPath();
  circle(ctx, headX, headY, r);
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = C.cheek[c]!;
  ctx.beginPath();
  circle(ctx, headX - r * 0.55, headY + r * 0.3, r * 0.22);
  circle(ctx, headX + r * 0.45, headY + r * 0.3, r * 0.22);
  ctx.fill();
  const look = p.look * r * 0.12;
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, headX - r * 0.42 + look, headY - r * 0.02, r * 0.11);
  circle(ctx, headX + r * 0.2 + look, headY - r * 0.02, r * 0.11);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.beginPath();
  ctx.arc(headX - r * 0.12, headY + r * 0.32, r * 0.3, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.08 + i * 0.21);
    circle(ctx, headX + Math.cos(a) * r * 0.78, headY + Math.sin(a) * r * 0.78, r * 0.42);
  }
  circle(ctx, headX, headY - r * 1.05, r * 0.32);
  ctx.fillStyle = C.curls[c]!;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = C.curlsLight[c]!;
  ctx.beginPath();
  circle(ctx, headX - r * 0.55, headY - r * 0.78, r * 0.14);
  circle(ctx, headX + r * 0.1, headY - r * 1.12, r * 0.12);
  ctx.fill();
  // The bow arm, in front: out to the grip.
  const sx = x - u * 0.012;
  const sy = fy - u * 0.066;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(b.gx, b.gy);
  inkedLine(ctx, skin, u * 0.011, lw * 0.8, INK);
  bow(ctx, u, b, lw, C.bow[c]!, C.bowLight[c]!);
  if (p.nocked) arrow(ctx, u, b.nx, b.ny, b.dx, b.dy, lw);
  ctx.beginPath();
  circle(ctx, b.gx, b.gy, u * 0.0075);
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  if (drawing > 0.01) {
    ctx.beginPath();
    circle(ctx, hx, hy, u * 0.0075);
    ctx.fillStyle = skin;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
  }
}

// ---------------------------------------------------------------- the balloon, the burst, the splash

/** A heart balloon with its knot, centered at (x, y), about `size` tall: lit on the upper left, shaded low on the right. */
function balloon(ctx: Ctx, x: number, y: number, size: number, lw: number): void {
  ctx.beginPath();
  heartPath(ctx, x, y, size);
  ctx.fillStyle = BALLOON.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = BALLOON.shade;
  ctx.beginPath();
  heartPath(ctx, x + size * 0.1, y + size * 0.1, size);
  ctx.rect(x - size, y + size * 0.25, size * 2, size);
  ctx.fill("evenodd");
  ctx.fillStyle = BALLOON.light;
  ctx.beginPath();
  oval(ctx, x - size * 0.22, y - size * 0.22, size * 0.1, size * 0.16, -0.5);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  heartPath(ctx, x, y, size);
  ink(ctx, lw, INK);
  ctx.beginPath();
  oval(ctx, x, y + size * 0.48, size * 0.06, size * 0.04);
  ctx.fillStyle = BALLOON.shade;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/**
 * The burst's petals: direction, speed (u/s), spin, pale? Flung up and out (none much below
 * level, so as they sink they stay above the slider's lanes), and those flung left are slower,
 * so none reaches the screen's edge.
 */
const BURST_PETALS = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI - 0.22 + (i / 11) * (Math.PI + 0.44) + Math.sin(i * 7.3) * 0.08;
  const left = Math.cos(a) < 0;
  return { a, v: (left ? 0.11 : 0.2) + Math.abs(Math.sin(i * 3.1)) * (left ? 0.04 : 0.08), spin: 2 + (i % 3), pale: i % 3 === 1 };
});

/** The pop's flash: a white four-point star this big (u) at its height, its points well in from the screen's left edge. */
const FLASH = 0.056;

/** The pop: a white flash, then petals flung out, tumbling and sinking, fading away. */
function burst(ctx: Ctx, x: number, y: number, u: number, since: number): void {
  if (since < 0.2) {
    const k = Math.sin((Math.PI * since) / 0.2);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    sparkle(ctx, x, y, u * FLASH * k);
    ctx.fill();
  }
  if (since >= BURST) return;
  const slow = (1 - Math.exp(-since * 2.5)) / 2.5;
  ctx.globalAlpha = 1 - (since / BURST) * (since / BURST);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? PETAL_PALE : PETAL;
    ctx.beginPath();
    for (const q of BURST_PETALS) {
      if (q.pale !== (pass === 1)) continue;
      const px = x + Math.cos(q.a) * q.v * u * slow;
      const py = y + Math.sin(q.a) * q.v * u * slow + u * 0.035 * since * since;
      petalPath(ctx, px, py, u * 0.016, q.a + since * q.spin);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Where the arrow drops into the pool (u from the screen center, u above the floor line). */
const SPLASH_X = BALLOON_X + 0.015;
const SPLASH_Y = -0.065;
/** The tumbling arrow turns about this fraction of its length back from its head, and is pointing down by this fraction (inverse) of its fall. */
const TUMBLE = 0.3;
const TURN_OVER = 2.2;

/** The splash as the arrow hits the pool: a foam ring widening and three drops, gone in half a second. */
function splash(ctx: Ctx, x: number, y: number, u: number, k: number): void {
  if (k < 0 || k >= 1) return;
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = FOAM;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  oval(ctx, x, y, u * (0.006 + 0.022 * k), u * (0.002 + 0.008 * k));
  ctx.stroke();
  ctx.fillStyle = FOAM;
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    const h = Math.sin(Math.PI * Math.min(1, k * 1.2));
    circle(ctx, x + i * u * 0.012 * (0.4 + k), y - u * 0.03 * h - Math.abs(i) * u * 0.008 * h, u * 0.003);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * The parts of his story, for drawing (and testing) one at a time: the figure himself with the
 * bow, the nocked arrow and the hearts he sends up; the balloon on its string; the pop's flash and
 * petals; and the loosed arrow in flight, tumbling down, and its splash.
 */
export type CherubPart = "all" | "figure" | "balloon" | "burst" | "arrow";

/**
 * The cherub on his plinth, with his balloon up over his shoulder, the arrow where it is, the
 * burst and the splash: everything in his story but the plinth (or only `part` of it). `px` is
 * the plinth's center (screen x) and `top` its top edge (where his feet stand).
 */
export function cherub(ctx: Ctx, s: Scene, px: number, top: number, lw: number, part: CherubPart = "all"): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const gy = s.groundY;
  const p = cherubPlan(s.t, -cx / u, (px - cx) / u, (gy - top) / u);
  const bx = cx + p.bx * u;
  const by = gy - p.by * u + Math.sin(s.t * 1.3) * u * 0.005;
  const bob = Math.sin(s.t * 0.9) * u * 0.004;
  // The string: tied to the rim, or trailing below a balloon floating in; dropping limp after the pop.
  const tieX = cx + TIE_X * u;
  const tieY = gy - TIE_Y * u;
  const all = part === "all";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.4);
  ctx.lineCap = "round";
  if (!all && part !== "balloon") {
    // (Not this part.)
  } else if (p.balloon) {
    const kx = bx + bob;
    const ky = by + BALLOON_SIZE * u * 0.5;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    if (p.tied) ctx.quadraticCurveTo(kx - u * 0.01, (ky + tieY) / 2, tieX, tieY);
    else ctx.quadraticCurveTo(kx - u * 0.02, ky + u * 0.07, kx - u * 0.035, ky + u * 0.11);
    ctx.stroke();
    balloon(ctx, kx, by, BALLOON_SIZE * u, lw);
  } else if (p.tied && p.since >= 0 && p.since < STRING_DROP) {
    // The tied string falls: its top end drops and swings in toward the tie. (A free balloon's
    // string goes with the scraps.)
    const q = ease(p.since / STRING_DROP);
    const kx = bx + bob;
    const ky = by + BALLOON_SIZE * u * 0.5;
    const endX = tieX;
    const endY = tieY;
    const topX = kx + (endX - kx) * q * 0.8;
    const topY = ky + (endY - ky) * q + u * 0.04 * Math.sin(Math.PI * q);
    ctx.globalAlpha = 1 - q;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX - u * 0.015 * (1 - q), (topY + endY) / 2 + u * 0.01, endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // The arrow in flight, or tumbling down into the pool: it keeps the way it flew at the pop and
  // turns over, head first past straight up and out to the right, up above his curls, till it
  // points down and drops into the water (the other way round its shaft would swing into him).
  // It turns about a point TUMBLE of its length back from the head, so its tail swings out no
  // further toward the screen's edge than it must, and comes down with its head on the splash.
  if (all || part === "arrow") {
    if (p.flight >= 0) {
      const b = bowAt(px, top, u, p);
      const ex = bx - b.dx * ARROW * u * 0.5;
      const ey = by - b.dy * ARROW * u * 0.5;
      const q = p.flight;
      arrow(ctx, u, b.nx + (ex - b.nx) * q, b.ny + (ey - b.ny) * q, b.dx, b.dy, lw);
    } else if (p.fall >= 0) {
      const q = p.fall;
      const L = ARROW * u;
      const sx = cx + SPLASH_X * u;
      const sy = gy - SPLASH_Y * u - L * TUMBLE;
      const ax = bx + (sx - bx) * q;
      const ay = by + (sy - by) * q * q;
      const a0 = p.aim > Math.PI / 2 ? p.aim - Math.PI * 2 : p.aim;
      const a = a0 + (Math.PI / 2 - a0) * ease(q * TURN_OVER);
      const back = L * (1 - TUMBLE);
      arrow(ctx, u, ax - Math.cos(a) * back, ay - Math.sin(a) * back, Math.cos(a), Math.sin(a), lw);
    }
    if (p.since >= 0) splash(ctx, cx + SPLASH_X * u, gy - SPLASH_Y * u, u, (p.since - DROP) / 0.5);
  }
  if ((all || part === "burst") && p.since >= 0) burst(ctx, bx, by, u, p.since);
  if (!all && part !== "figure") return;
  figure(ctx, px, top, u, p, lw, s.t);
  // Hearts floating up from him, fading as they rise.
  for (const h of [p.heart0, p.heart1]) {
    if (h <= 0 || h >= 1) continue;
    ctx.globalAlpha = 1 - h * h;
    ctx.fillStyle = ROSE.body;
    ctx.beginPath();
    heartPath(ctx, px + Math.sin(h * 8) * u * 0.008, top - u * (HEIGHT + 0.015) - h * u * 0.035, u * (0.012 + h * 0.008));
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
    ctx.globalAlpha = 1;
  }
}

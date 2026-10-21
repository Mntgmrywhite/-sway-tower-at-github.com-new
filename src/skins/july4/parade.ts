import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BANDANA,
  BIKE,
  BRAID,
  BRASS,
  CHROME,
  DOG,
  DOG_SPOT,
  DRESS,
  DRUM_HEAD,
  DRUM_SHELL,
  HAIR_BLONDE,
  HAIR_BROWN,
  HAIR_DARK,
  HAIR_WHITE,
  HUBCAP,
  INK,
  KID_SHIRTS,
  LADDER,
  MAJOR_COAT,
  SAM_BOW,
  SAM_COAT,
  SAM_HAT,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  STAR_WHITE,
  STICK,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TIRE,
  TROUSERS,
  TRUCK,
  UNIFORM,
  UNIFORM_TRIM,
  type Shades,
} from "./colors";
import { block, line, smooth, starPath, swagBand } from "./shapes";
import { centerX, head, inkW } from "./square";

// The Fourth of July parade, passing left to right across the square in front of the
// bandstand (the owner's rule: every action in a run's first ten seconds, so it steps in at
// PARADE_AT and the last of it has passed the tower by ten seconds; it comes round the block
// again every PERIOD). In order: the drum major high-stepping and twirling his baton, a color
// guard with the flag, two snare drummers, the glockenspiel lyre, two sousaphones, the vintage
// open-cab fire truck with its wooden ladder and a load of waving kids, Uncle Sam on stilts
// (he tips his hat as he passes the bandstand), a girl on a bike with streamers flying from
// the handlebars, and a spotted dog trotting after her. Everything is near, printed flat like
// the rest of the poster: no outlines, a body and a lit plane per color, limbs and the far leg a
// step darker so they read against the body, and it all stays below the tower's floor line.
//
// Positions along the route are in u from the parade's head; screen x comes from paradeX().

/**
 * When the drum major steps in from the left, how fast the parade walks (u/s), and how often it
 * comes round. The walk is paced so the dog at the tail has passed the tower by ten seconds on
 * an iPad too (its center is 0.625 u from the left edge, a phone's 0.5 u): actions.test.ts.
 */
export const PARADE_AT = 0.3;
export const SPEED = 0.235;
export const PERIOD = 40;
/** Where the head starts (u left of the screen's left edge: the whole drum major off screen). */
const HEAD_IN = -0.08;
/** The route: the paraders' feet, u below the floor line. */
export const ROUTE = 0.285;

/** The drum major's screen x (u from the screen's left edge) at scene time t; off to the left before PARADE_AT. */
export function paradeX(t: number): number {
  if (t < PARADE_AT) return HEAD_IN;
  return HEAD_IN + SPEED * ((t - PARADE_AT) % PERIOD);
}

export type Unit = "drumMajor" | "flag" | "snare" | "snare2" | "lyre" | "tuba" | "tuba2" | "truck" | "uncleSam" | "bike" | "dog";

/** Each unit's distance behind the drum major (u), and how far either side of that it reaches. */
export const UNITS: readonly { unit: Unit; back: number; reach: number }[] = [
  { unit: "drumMajor", back: 0, reach: 0.05 },
  { unit: "flag", back: 0.13, reach: 0.05 },
  { unit: "snare", back: 0.25, reach: 0.04 },
  { unit: "snare2", back: 0.34, reach: 0.04 },
  { unit: "lyre", back: 0.45, reach: 0.04 },
  { unit: "tuba", back: 0.57, reach: 0.05 },
  { unit: "tuba2", back: 0.68, reach: 0.05 },
  { unit: "truck", back: 0.93, reach: 0.15 },
  { unit: "uncleSam", back: 1.2, reach: 0.07 },
  { unit: "bike", back: 1.38, reach: 0.07 },
  { unit: "dog", back: 1.52, reach: 0.04 },
];

/** Screen x (px) of a unit's center at scene time t. */
export function unitX(s: Scene, unit: Unit, t: number): number {
  const back = UNITS.find((u) => u.unit === unit)!.back;
  return (paradeX(t) - back) * s.u;
}

/** Uncle Sam tips his hat as he passes the bandstand: 0 away from it, 1 right in front of the tower. */
export function hatTip(s: Scene, t: number): number {
  const d = Math.abs(unitX(s, "uncleSam", t) - centerX(s)) / s.u;
  return 1 - smooth(0.04, 0.16, d);
}

/** Steps per second of the marchers. */
const STEP_RATE = 1.9;

// ---------------------------------------------------------------- figures

/** A marching leg: from the hip, swung by `swing` (-1..1), the foot lifted on the forward swing. */
function leg(ctx: Ctx, x: number, hip: number, len: number, swing: number, color: string, w: number): void {
  const kx = x + swing * len * 0.35;
  const ky = hip + len * 0.5 - Math.max(0, swing) * len * 0.25;
  const fx = x + swing * len * 0.5;
  const fy = hip + len - Math.max(0, swing) * len * 0.35;
  ctx.beginPath();
  ctx.moveTo(x, hip);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  line(ctx, color, w);
  ctx.beginPath();
  circle(ctx, fx + w * 0.2, fy, w * 0.55);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** An arm from the shoulder (x, y): angle `a` (0 hanging, negative forward and up), bent a little. */
function arm(ctx: Ctx, x: number, y: number, len: number, a: number, side: number, color: string, w: number): void {
  const ex = x + Math.sin(a) * len * 0.55 * side;
  const ey = y + Math.cos(a) * len * 0.55;
  const hx = ex + Math.sin(a - 0.5) * len * 0.5 * side;
  const hy = ey + Math.cos(a - 0.5) * len * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  line(ctx, color, w);
}

/** Where an arm's hand ends up (the same reach as `arm`). */
function hand(x: number, y: number, len: number, a: number, side: number): readonly [number, number] {
  const ex = x + Math.sin(a) * len * 0.55 * side;
  const ey = y + Math.cos(a) * len * 0.55;
  return [ex + Math.sin(a - 0.5) * len * 0.5 * side, ey + Math.cos(a - 0.5) * len * 0.5];
}

interface Marcher {
  /** Height from foot to the top of the head (u). */
  h: number;
  jacket: Shades;
  trousers: Shades;
  skin: Shades;
  hair: string;
  /** Arm angles, left and right (0 hanging, negative forward and up). */
  armL: number;
  armR: number;
  /** Which hat: a shako with a plume, a cap, or none. */
  hat: "shako" | "cap" | "none";
  plume: string;
}

/** Scratch: where the marcher's shoulders and head came out, for things held in its hands. */
const POSE = { x: 0, shoulderY: 0, hipY: 0, headY: 0, headR: 0, armLen: 0, torsoW: 0 };

/** A marcher walking right: legs in stride, a jacket with trim and braid, arms, a head and its hat. Fills POSE. */
function marcher(ctx: Ctx, s: Scene, x: number, foot: number, m: Marcher, stride: number): void {
  const u = s.u;
  const lw = inkW(s) * 0.85;
  const h = m.h * u;
  const legLen = h * 0.36;
  const torsoH = h * 0.32;
  const headR = h * 0.12;
  const torsoW = h * 0.26;
  const bob = Math.abs(Math.cos(stride * Math.PI)) * h * 0.02;
  const hip = foot - legLen - bob;
  const swing = Math.sin(stride * Math.PI);
  // The far leg a step darker, so the stride reads without outlines.
  leg(ctx, x - torsoW * 0.18, hip, legLen, -swing, m.trousers.shade, h * 0.09);
  leg(ctx, x + torsoW * 0.18, hip, legLen, swing, m.trousers.body, h * 0.09);
  // The jacket, with a lit front, white trim down the front and gold braid across the chest.
  const top = hip - torsoH;
  ctx.beginPath();
  block(ctx, x - torsoW / 2, top, torsoW, torsoH + h * 0.02, h * 0.03);
  ctx.fillStyle = m.jacket.body;
  ctx.fill();
  ctx.fillStyle = m.jacket.light;
  ctx.fillRect(x - torsoW / 2 + lw, top + lw, torsoW * 0.35, torsoH * 0.5);
  ctx.fillStyle = UNIFORM_TRIM;
  ctx.fillRect(x + torsoW * 0.05, top + h * 0.02, torsoW * 0.12, torsoH * 0.85);
  ctx.fillStyle = BRAID;
  ctx.fillRect(x - torsoW * 0.4, top + torsoH * 0.3, torsoW * 0.8, h * 0.015);
  ctx.fillRect(x - torsoW * 0.4, top + torsoH * 0.5, torsoW * 0.8, h * 0.015);
  const shoulderY = top + h * 0.04;
  const armLen = h * 0.3;
  // Sleeves in the jacket's shade, so they read against it.
  arm(ctx, x - torsoW * 0.45, shoulderY, armLen, m.armL, -1, m.jacket.shade, h * 0.07);
  arm(ctx, x + torsoW * 0.45, shoulderY, armLen, m.armR, 1, m.jacket.shade, h * 0.07);
  const headY = top - headR * 0.95;
  head(ctx, x, headY, headR, m.skin, m.hair);
  if (m.hat === "shako") {
    // A tall shako with a chin strap line, a brass plate and a plume.
    ctx.beginPath();
    block(ctx, x - headR * 0.95, headY - headR * 2.3, headR * 1.9, headR * 1.6, headR * 0.15);
    ctx.fillStyle = m.jacket.body;
    ctx.fill();
    ctx.fillStyle = m.jacket.light;
    ctx.fillRect(x - headR * 0.95 + lw, headY - headR * 2.3 + lw, headR * 0.5, headR * 1.3);
    ctx.beginPath();
    ctx.rect(x - headR * 1.05, headY - headR * 0.75, headR * 2.1, headR * 0.16);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = BRAID;
    ctx.beginPath();
    circle(ctx, x + headR * 0.3, headY - headR * 1.5, headR * 0.26);
    ctx.fill();
    ctx.beginPath();
    oval(ctx, x - headR * 0.3, headY - headR * 2.75, headR * 0.3, headR * 0.5);
    ctx.fillStyle = m.plume;
    ctx.fill();
  } else if (m.hat === "cap") {
    ctx.beginPath();
    ctx.moveTo(x - headR * 1.05, headY - headR * 0.3);
    ctx.arc(x, headY - headR * 0.3, headR * 1.05, Math.PI, 0);
    ctx.lineTo(x + headR * 1.5, headY - headR * 0.3);
    ctx.lineTo(x + headR * 1.5, headY - headR * 0.1);
    ctx.lineTo(x - headR * 1.05, headY - headR * 0.1);
    ctx.closePath();
    ctx.fillStyle = m.jacket.body;
    ctx.fill();
  }
  POSE.x = x;
  POSE.shoulderY = shoulderY;
  POSE.hipY = hip;
  POSE.headY = headY;
  POSE.headR = headR;
  POSE.armLen = armLen;
  POSE.torsoW = torsoW;
}

const BAND: Omit<Marcher, "armL" | "armR"> = {
  h: 0.13,
  jacket: UNIFORM,
  trousers: TROUSERS,
  skin: SKIN_FAIR,
  hair: HAIR_BROWN,
  hat: "shako",
  plume: STRIPE_WHITE,
};
const MAJOR: Marcher = {
  h: 0.145,
  jacket: MAJOR_COAT,
  trousers: TROUSERS,
  skin: SKIN_BROWN,
  hair: HAIR_DARK,
  armL: 0.6,
  armR: -1.9,
  hat: "shako",
  plume: STRIPE_RED,
};

/** The drum major: high-stepping, twirling his baton overhead. */
function drumMajor(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const stride = t * STEP_RATE;
  marcher(ctx, s, x, foot, MAJOR, stride);
  // The baton spins in his raised right hand.
  const [hx, hy] = hand(POSE.x + POSE.torsoW * 0.45, POSE.shoulderY, POSE.armLen, MAJOR.armR, 1);
  const a = t * 9;
  const len = u * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - Math.cos(a) * len, hy - Math.sin(a) * len);
  ctx.lineTo(hx + Math.cos(a) * len, hy + Math.sin(a) * len);
  line(ctx, CHROME.body, u * 0.005);
  ctx.fillStyle = STRIPE_WHITE;
  ctx.beginPath();
  circle(ctx, hx - Math.cos(a) * len, hy - Math.sin(a) * len, u * 0.007);
  circle(ctx, hx + Math.cos(a) * len, hy + Math.sin(a) * len, u * 0.007);
  ctx.fill();
}

/** The color guard: a marcher carrying the flag on a tall pole, the flag rippling behind. */
function flagBearer(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const stride = t * STEP_RATE + 0.5;
  marcher(ctx, s, x, foot, { ...BAND, armL: 0.2, armR: -1.2, hair: HAIR_BLONDE, skin: SKIN_TAN }, stride);
  const [hx, hy] = hand(POSE.x + POSE.torsoW * 0.45, POSE.shoulderY, POSE.armLen, -1.2, 1);
  const top = hy - u * 0.085;
  ctx.beginPath();
  ctx.moveTo(hx, hy + u * 0.03);
  ctx.lineTo(hx, top);
  line(ctx, CHROME.body, u * 0.005);
  ctx.fillStyle = BRAID;
  ctx.beginPath();
  circle(ctx, hx, top - u * 0.004, u * 0.005);
  ctx.fill();
  // The flag flies back (left) from the pole.
  const w = u * 0.055;
  const h = u * 0.034;
  const ripple = (k: number) => Math.sin(t * 7 - k * 6) * h * 0.1 * k;
  ctx.beginPath();
  ctx.moveTo(hx, top);
  for (let k = 0; k <= 1; k += 0.25) ctx.lineTo(hx - w * k, top + ripple(k));
  for (let k = 1; k >= 0; k -= 0.25) ctx.lineTo(hx - w * k, top + h + ripple(k));
  ctx.closePath();
  ctx.fillStyle = STRIPE_RED;
  ctx.fill();
  ctx.fillStyle = STRIPE_WHITE;
  ctx.beginPath();
  for (let i = 1; i < 7; i += 2) {
    const y0 = top + (h * i) / 7;
    ctx.moveTo(hx, y0);
    for (let k = 0; k <= 1; k += 0.25) ctx.lineTo(hx - w * k, y0 + ripple(k));
    for (let k = 1; k >= 0; k -= 0.25) ctx.lineTo(hx - w * k, y0 + h / 7 + ripple(k));
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fillRect(hx - w * 0.42, top, w * 0.42, h * 0.55);
  ctx.fillStyle = STAR_WHITE;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) starPath(ctx, hx - w * (0.09 + i * 0.12), top + h * (0.18 + (i % 2) * 0.2), u * 0.0035);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx, top);
  for (let k = 0; k <= 1; k += 0.25) ctx.lineTo(hx - w * k, top + ripple(k));
  for (let k = 1; k >= 0; k -= 0.25) ctx.lineTo(hx - w * k, top + h + ripple(k));
  ctx.closePath();
}

/** A snare drummer: the drum slung in front at the hips, sticks beating by turns. */
function snare(ctx: Ctx, s: Scene, x: number, foot: number, t: number, which: number): void {
  const u = s.u;
  const lw = inkW(s);
  const beat = Math.sin(t * STEP_RATE * Math.PI * 2 + which);
  marcher(ctx, s, x, foot, { ...BAND, armL: -1.1 + beat * 0.25, armR: -1.1 - beat * 0.25, skin: which ? SKIN_BROWN : SKIN_FAIR, hair: which ? HAIR_DARK : HAIR_BROWN }, t * STEP_RATE + which * 0.3);
  const dy = POSE.hipY - u * 0.012;
  const w = u * 0.04;
  const h = u * 0.026;
  ctx.beginPath();
  block(ctx, x - w / 2, dy - h / 2, w, h, u * 0.003);
  ctx.fillStyle = DRUM_SHELL.body;
  ctx.fill();
  ctx.fillStyle = DRUM_SHELL.light;
  ctx.fillRect(x - w / 2 + lw, dy - h / 2 + lw, w * 0.3, h - lw * 2);
  ctx.beginPath();
  oval(ctx, x, dy - h / 2, w / 2, h * 0.22);
  ctx.fillStyle = DRUM_HEAD;
  ctx.fill();
  // The sticks from the hands.
  for (const [side, a] of [
    [-1, -1.1 + beat * 0.25],
    [1, -1.1 - beat * 0.25],
  ] as const) {
    const [hx, hy] = hand(x + POSE.torsoW * 0.45 * side, POSE.shoulderY, POSE.armLen, a, side);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + side * u * 0.004, hy + u * 0.018);
    line(ctx, STICK, u * 0.0035);
  }
}

/** The glockenspiel lyre: a gold lyre frame of bars carried upright in front. */
function lyre(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  marcher(ctx, s, x, foot, { ...BAND, armL: -1.6, armR: -1.3, skin: SKIN_TAN, hair: HAIR_DARK }, t * STEP_RATE + 0.7);
  const cx = x + u * 0.012;
  const base = POSE.shoulderY + u * 0.01;
  const top = base - u * 0.06;
  ctx.beginPath();
  ctx.moveTo(cx, base + u * 0.02);
  ctx.lineTo(cx, top + u * 0.012);
  ctx.moveTo(cx - u * 0.016, base - u * 0.004);
  ctx.quadraticCurveTo(cx - u * 0.024, top + u * 0.016, cx - u * 0.01, top);
  ctx.moveTo(cx + u * 0.016, base - u * 0.004);
  ctx.quadraticCurveTo(cx + u * 0.024, top + u * 0.016, cx + u * 0.01, top);
  line(ctx, BRASS.body, u * 0.004);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const w = u * (0.028 - i * 0.004);
    ctx.rect(cx - w / 2, base - u * 0.008 - i * u * 0.0095, w, u * 0.005);
  }
  ctx.fillStyle = BRASS.light;
  ctx.fill();
  // A little mallet in the right hand.
  const [hx, hy] = hand(x + POSE.torsoW * 0.45, POSE.shoulderY, POSE.armLen, -1.3, 1);
  const bob = Math.sin(t * STEP_RATE * Math.PI * 2) * u * 0.004;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx - u * 0.012, hy - u * 0.014 + bob);
  line(ctx, STICK, u * 0.003);
  ctx.beginPath();
  circle(ctx, hx - u * 0.012, hy - u * 0.014 + bob, u * 0.004);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** A sousaphone player: the brass bell up over the left shoulder, the tubing round the body. */
function tuba(ctx: Ctx, s: Scene, x: number, foot: number, t: number, which: number): void {
  const u = s.u;
  // The tubing behind the body first.
  marcher(ctx, s, x, foot, { ...BAND, armL: -0.9, armR: -1.4, skin: which ? SKIN_FAIR : SKIN_BROWN, hair: which ? HAIR_BLONDE : HAIR_DARK }, t * STEP_RATE + which * 0.4 + 1.1);
  const by = POSE.shoulderY;
  ctx.beginPath();
  ctx.arc(x - u * 0.004, by + u * 0.02, u * 0.03, -Math.PI * 0.9, Math.PI * 0.6);
  line(ctx, BRASS.body, u * 0.007);
  // The bell: a big brass disc over the left shoulder, with a darker throat and a lit rim.
  const bx = x - u * 0.016;
  const bellY = by - u * 0.05;
  const r = u * 0.03;
  ctx.beginPath();
  circle(ctx, bx, bellY, r);
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, bx, bellY, r * 0.62);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, bx, bellY, r * 0.25);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, bellY, r * 0.82, Math.PI * 1.1, Math.PI * 1.6);
  ctx.strokeStyle = BRASS.light;
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** How fast the wheels turn (radians per u of travel): rolling without slip. */
const WHEEL_R = 0.026;

/** A spoked wheel: tire, hubcap, spokes turned by `roll`. */
function wheel(ctx: Ctx, s: Scene, x: number, y: number, r: number, roll: number, hub: string, spokes: number): void {
  const lw = inkW(s);
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = TIRE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.62);
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = roll + (i * Math.PI * 2) / spokes;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.14);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The vintage fire truck float: an open cab, a long red bed with the ladder on top, chrome, a bell, bunting, and kids in the back waving. */
function fireTruck(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const lw = inkW(s);
  const L = u * 0.26;
  const wr = WHEEL_R * u;
  const bedTop = foot - u * 0.075;
  const roll = (paradeX(t) * u) / wr;
  const x0 = x - L / 2;
  // The kids in the back first (behind the bed's side): three heads and waving arms.
  for (let i = 0; i < 3; i++) {
    const kx = x0 + L * (0.2 + i * 0.16);
    const wave = Math.sin(t * 5 + i * 1.3);
    const ky = bedTop - u * 0.02;
    const skin = i === 0 ? SKIN_BROWN : i === 1 ? SKIN_FAIR : SKIN_TAN;
    ctx.beginPath();
    ctx.moveTo(kx + u * 0.012, ky + u * 0.006);
    ctx.lineTo(kx + u * 0.022 + wave * u * 0.004, ky - u * 0.022);
    line(ctx, skin.body, u * 0.006);
    ctx.beginPath();
    block(ctx, kx - u * 0.013, ky - u * 0.004, u * 0.026, u * 0.03, u * 0.004);
    ctx.fillStyle = KID_SHIRTS[i]!.body;
    ctx.fill();
    head(ctx, kx, ky - u * 0.014, u * 0.012, skin, i === 1 ? HAIR_BLONDE : HAIR_DARK);
  }
  // The bed and the cab: red, lit along the top, a chrome running board.
  ctx.beginPath();
  block(ctx, x0, bedTop, L * 0.74, u * 0.05, u * 0.004);
  block(ctx, x0 + L * 0.7, bedTop - u * 0.045, L * 0.2, u * 0.095, u * 0.006);
  block(ctx, x0 + L * 0.86, bedTop + u * 0.005, L * 0.14, u * 0.045, u * 0.004);
  ctx.fillStyle = TRUCK.body;
  ctx.fill();
  ctx.fillStyle = TRUCK.light;
  ctx.fillRect(x0 + lw, bedTop + lw, L * 0.74 - lw * 2, u * 0.008);
  ctx.fillRect(x0 + L * 0.7 + lw, bedTop - u * 0.045 + lw, L * 0.2 - lw * 2, u * 0.008);
  ctx.fillStyle = TRUCK.shade;
  ctx.fillRect(x0 + lw, bedTop + u * 0.04, L - lw * 2, u * 0.01);
  // Bunting along the bed's side.
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? STRIPE_RED : band === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) swagBand(ctx, x0 + (L * 0.7 * i) / 3, x0 + (L * 0.7 * (i + 1)) / 3, bedTop + u * 0.012, u * 0.012, band, 3);
    ctx.fill();
  }
  // The windscreen, the chrome grille and headlamp, the bell on the cowl.
  ctx.beginPath();
  block(ctx, x0 + L * 0.74, bedTop - u * 0.04, L * 0.13, u * 0.028, u * 0.003);
  ctx.fillStyle = "#bfe3ff";
  ctx.fill();
  ctx.beginPath();
  block(ctx, x0 + L * 0.975, bedTop + u * 0.01, L * 0.03, u * 0.03, u * 0.003);
  ctx.fillStyle = CHROME.body;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x0 + L * 0.95, bedTop + u * 0.016, u * 0.007);
  ctx.fillStyle = CHROME.light;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + L * 0.88, bedTop + u * 0.004);
  ctx.quadraticCurveTo(x0 + L * 0.9, bedTop - u * 0.014, x0 + L * 0.92, bedTop + u * 0.004);
  ctx.closePath();
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  // The wooden ladder along the top of the bed.
  const ly = bedTop - u * 0.014;
  ctx.beginPath();
  ctx.rect(x0 + L * 0.02, ly - u * 0.004, L * 0.68, u * 0.004);
  ctx.rect(x0 + L * 0.02, ly + u * 0.006, L * 0.68, u * 0.004);
  for (let i = 0; i < 7; i++) ctx.rect(x0 + L * (0.05 + i * 0.1), ly - u * 0.004, u * 0.004, u * 0.014);
  ctx.fillStyle = LADDER.body;
  ctx.fill();
  // Wheels, turning as it rolls.
  wheel(ctx, s, x0 + L * 0.2, foot - wr, wr, roll, HUBCAP, 8);
  wheel(ctx, s, x0 + L * 0.8, foot - wr, wr, roll, HUBCAP, 8);
}

/** Uncle Sam on stilts: striped trousers down to the stilts, a blue tailcoat, a white vest and goatee, the starred top hat he tips at the bandstand. */
function uncleSam(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const lw = inkW(s);
  const tip = hatTip(s, t);
  const stride = t * STEP_RATE * 0.5;
  const swing = Math.sin(stride * Math.PI);
  const h = u * 0.22;
  const stilt = h * 0.36;
  const legLen = h * 0.22;
  const hip = foot - stilt - legLen;
  // The stilts and the striped trouser legs over them.
  for (const side of [-1, 1]) {
    const sw = swing * side;
    const fx = x + side * h * 0.05 + sw * h * 0.06;
    const fy = foot - Math.max(0, sw) * h * 0.04;
    const kx = x + side * h * 0.05 + sw * h * 0.04;
    const ky = hip + legLen;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(fx, fy);
    line(ctx, LADDER.body, h * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + side * h * 0.05, hip);
    ctx.lineTo(kx, ky);
    line(ctx, STRIPE_WHITE, h * 0.085);
    ctx.beginPath();
    ctx.moveTo(x + side * h * 0.05 - h * 0.02, hip);
    ctx.lineTo(kx - h * 0.02, ky);
    ctx.moveTo(x + side * h * 0.05 + h * 0.02, hip);
    ctx.lineTo(kx + h * 0.02, ky);
    ctx.strokeStyle = STRIPE_RED;
    ctx.lineWidth = h * 0.022;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.beginPath();
    circle(ctx, fx, fy - h * 0.005, h * 0.03);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  // The tailcoat (its tails flaring behind), the white vest, a red bow tie.
  const torsoH = h * 0.26;
  const torsoW = h * 0.22;
  const top = hip - torsoH;
  ctx.beginPath();
  ctx.moveTo(x - torsoW / 2, top);
  ctx.lineTo(x + torsoW / 2, top);
  ctx.lineTo(x + torsoW / 2, hip);
  ctx.lineTo(x - torsoW * 0.1, hip);
  ctx.lineTo(x - torsoW * 0.75, hip + h * 0.08);
  ctx.lineTo(x - torsoW * 0.55, hip - h * 0.02);
  ctx.lineTo(x - torsoW / 2, hip);
  ctx.closePath();
  ctx.fillStyle = SAM_COAT.body;
  ctx.fill();
  ctx.fillStyle = SAM_COAT.light;
  ctx.fillRect(x - torsoW / 2 + lw, top + lw, torsoW * 0.3, torsoH * 0.5);
  ctx.beginPath();
  ctx.rect(x + torsoW * 0.05, top + h * 0.01, torsoW * 0.26, torsoH * 0.8);
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fill();
  ctx.beginPath();
  starPath(ctx, x + torsoW * 0.18, top + torsoH * 0.35, h * 0.018);
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fill();
  // Arms: the left swings, the right rises to the hat as he tips it.
  const shoulderY = top + h * 0.03;
  const armLen = h * 0.24;
  arm(ctx, x - torsoW * 0.45, shoulderY, armLen, 0.4 + swing * 0.2, -1, SAM_COAT.shade, h * 0.055);
  const aR = -0.6 - tip * 2.3;
  arm(ctx, x + torsoW * 0.45, shoulderY, armLen, aR, 1, SAM_COAT.shade, h * 0.055);
  // The head: white goatee, white hair, the hat lifted and tilted by the tip.
  const headR = h * 0.09;
  const headY = top - headR * 0.9;
  head(ctx, x, headY, headR, SKIN_FAIR, HAIR_WHITE);
  ctx.beginPath();
  ctx.moveTo(x - headR * 0.35, headY + headR * 0.55);
  ctx.lineTo(x + headR * 0.35, headY + headR * 0.55);
  ctx.lineTo(x, headY + headR * 1.35);
  ctx.closePath();
  ctx.fillStyle = HAIR_WHITE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - headR * 0.6, headY + headR * 1.2);
  ctx.lineTo(x - headR * 0.15, headY + headR * 1.05);
  ctx.lineTo(x - headR * 0.6, headY + headR * 0.9);
  ctx.closePath();
  ctx.moveTo(x + headR * 0.6, headY + headR * 1.2);
  ctx.lineTo(x + headR * 0.15, headY + headR * 1.05);
  ctx.lineTo(x + headR * 0.6, headY + headR * 0.9);
  ctx.closePath();
  ctx.fillStyle = SAM_BOW;
  ctx.fill();
  // The hat: a tall white crown with a blue starred band and a wide brim; tipped, it lifts off and leans.
  const [hx, hy] = hand(x + torsoW * 0.45, shoulderY, armLen, aR, 1);
  const hatX = headY - headR * 0.9;
  const liftX = tip * (hx - (x + headR * 0.6)) * 0.6;
  const liftY = tip * (hy - hatX) * 0.6;
  ctx.save();
  ctx.translate(x + liftX, hatX + liftY);
  ctx.rotate(tip * 0.4);
  ctx.beginPath();
  block(ctx, -headR * 0.85, -headR * 2.3, headR * 1.7, headR * 2.35, headR * 0.12);
  ctx.fillStyle = SAM_HAT.body;
  ctx.fill();
  ctx.fillStyle = SAM_HAT.light;
  ctx.fillRect(-headR * 0.85 + lw, -headR * 2.3 + lw, headR * 0.4, headR * 2);
  ctx.fillStyle = STRIPE_RED;
  ctx.fillRect(-headR * 0.85, -headR * 2.3, headR * 1.7, headR * 0.3);
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fillRect(-headR * 0.85, -headR * 0.75, headR * 1.7, headR * 0.5);
  ctx.fillStyle = STAR_WHITE;
  ctx.beginPath();
  starPath(ctx, -headR * 0.4, -headR * 0.5, headR * 0.16);
  starPath(ctx, 0, -headR * 0.5, headR * 0.16);
  starPath(ctx, headR * 0.4, -headR * 0.5, headR * 0.16);
  ctx.fill();
  ctx.beginPath();
  block(ctx, -headR * 1.25, -headR * 0.1, headR * 2.5, headR * 0.24, headR * 0.1);
  ctx.fillStyle = SAM_HAT.body;
  ctx.fill();
  ctx.restore();
}

/** The girl on her bike: streamers flying from the handlebars and the spokes, legs pedaling, a helmet. */
function girlOnBike(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const wr = u * 0.018;
  const roll = (paradeX(t) * u) / wr;
  const rearX = x - u * 0.028;
  const frontX = x + u * 0.03;
  const axleY = foot - wr;
  const seatY = axleY - u * 0.03;
  const barY = axleY - u * 0.034;
  // Streamers from the handlebars, flying back.
  for (let i = 0; i < 3; i++) {
    const c = i === 0 ? STRIPE_RED : i === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.beginPath();
    ctx.moveTo(frontX, barY);
    for (let k = 0.2; k <= 1; k += 0.2) {
      ctx.lineTo(frontX - u * 0.03 * k, barY - u * 0.004 + (i - 1) * u * 0.004 * k + Math.sin(t * 9 - k * 6 + i) * u * 0.004 * k);
    }
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, u * 0.0025);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  // The frame, the wheels, the pedals.
  wheel(ctx, s, rearX, axleY, wr, roll, HUBCAP, 6);
  wheel(ctx, s, frontX, axleY, wr, roll, HUBCAP, 6);
  ctx.beginPath();
  ctx.moveTo(rearX, axleY);
  ctx.lineTo(x - u * 0.008, seatY);
  ctx.lineTo(x + u * 0.004, axleY + u * 0.002);
  ctx.lineTo(rearX, axleY);
  ctx.moveTo(x - u * 0.008, seatY);
  ctx.lineTo(frontX - u * 0.004, barY);
  ctx.lineTo(frontX, axleY);
  ctx.moveTo(x + u * 0.004, axleY + u * 0.002);
  ctx.lineTo(frontX - u * 0.004, barY);
  line(ctx, BIKE.body, u * 0.005);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.016, seatY - u * 0.002);
  ctx.lineTo(x, seatY - u * 0.002);
  line(ctx, INK, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(frontX - u * 0.01, barY - u * 0.002);
  ctx.lineTo(frontX + u * 0.004, barY - u * 0.002);
  line(ctx, INK, u * 0.005);
  // The girl: pedaling legs, a white dress, arms to the bars, a helmet over blonde hair.
  const h = u * 0.085;
  const hipX = x - u * 0.008;
  const hipY = seatY - u * 0.004;
  const crankX = x + u * 0.004;
  const crankY = axleY;
  for (const side of [-1, 1]) {
    const a = roll * 0.8 + (side < 0 ? Math.PI : 0);
    const px = crankX + Math.cos(a) * u * 0.009;
    const py = crankY + Math.sin(a) * u * 0.009;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo((hipX + px) / 2 + u * 0.008, (hipY + py) / 2);
    ctx.lineTo(px, py);
    line(ctx, SKIN_FAIR.body, h * 0.09);
  }
  ctx.beginPath();
  ctx.moveTo(hipX - h * 0.16, hipY + h * 0.04);
  ctx.lineTo(hipX + h * 0.16, hipY + h * 0.04);
  ctx.lineTo(hipX + h * 0.12, hipY - h * 0.36);
  ctx.lineTo(hipX - h * 0.12, hipY - h * 0.36);
  ctx.closePath();
  ctx.fillStyle = DRESS.body;
  ctx.fill();
  ctx.fillStyle = STRIPE_RED;
  ctx.beginPath();
  starPath(ctx, hipX, hipY - h * 0.16, h * 0.07);
  ctx.fill();
  const shoulderY = hipY - h * 0.32;
  ctx.beginPath();
  ctx.moveTo(hipX + h * 0.08, shoulderY);
  ctx.lineTo(frontX - u * 0.006, barY);
  line(ctx, SKIN_FAIR.body, h * 0.08);
  const headR = h * 0.17;
  const headY = shoulderY - headR * 1.1;
  head(ctx, hipX, headY, headR, SKIN_FAIR, HAIR_BLONDE);
  ctx.beginPath();
  ctx.moveTo(hipX - headR * 1.08, headY - headR * 0.2);
  ctx.arc(hipX, headY - headR * 0.2, headR * 1.08, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fill();
  ctx.fillStyle = STAR_WHITE;
  ctx.beginPath();
  starPath(ctx, hipX, headY - headR * 0.75, headR * 0.3);
  ctx.fill();
}

/** The dog trotting after the bike: white with a black patch over one eye, a blue bandana, a wagging tail. */
function dog(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const u = s.u;
  const h = u * 0.04;
  const trot = t * STEP_RATE * 2;
  const swing = Math.sin(trot * Math.PI);
  const bodyY = foot - h * 0.55;
  for (const [dx, sw] of [
    [-h * 0.45, swing],
    [-h * 0.3, -swing],
    [h * 0.3, -swing],
    [h * 0.45, swing],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx, bodyY);
    ctx.lineTo(x + dx + sw * h * 0.2, foot - Math.max(0, sw) * h * 0.1);
    line(ctx, DOG.body, h * 0.14);
  }
  ctx.beginPath();
  oval(ctx, x, bodyY, h * 0.6, h * 0.3);
  ctx.fillStyle = DOG.body;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - h * 0.55, bodyY - h * 0.1);
  ctx.quadraticCurveTo(x - h * 0.8, bodyY - h * 0.4 + Math.sin(t * 14) * h * 0.15, x - h * 0.95, bodyY - h * 0.25);
  line(ctx, DOG.body, h * 0.09);
  ctx.beginPath();
  circle(ctx, x + h * 0.2, bodyY - h * 0.1, h * 0.2);
  ctx.fillStyle = DOG_SPOT;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + h * 0.4, bodyY - h * 0.1);
  ctx.lineTo(x + h * 0.75, bodyY - h * 0.05);
  ctx.lineTo(x + h * 0.45, bodyY + h * 0.2);
  ctx.closePath();
  ctx.fillStyle = BANDANA;
  ctx.fill();
  head(ctx, x + h * 0.7, bodyY - h * 0.35, h * 0.26, DOG, DOG.body);
  ctx.beginPath();
  circle(ctx, x + h * 0.62, bodyY - h * 0.4, h * 0.14);
  ctx.fillStyle = DOG_SPOT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x + h * 0.62, bodyY - h * 0.4, h * 0.04);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x + h * 0.95, bodyY - h * 0.28, h * 0.06);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x + h * 0.5, bodyY - h * 0.5, h * 0.08, h * 0.16, 0.5);
  ctx.fillStyle = DOG_SPOT;
  ctx.fill();
}

/** One unit of the parade, centered at screen x, its feet on the route. */
export function drawUnit(ctx: Ctx, s: Scene, unit: Unit, x: number, foot: number, t: number): void {
  switch (unit) {
    case "drumMajor":
      drumMajor(ctx, s, x, foot, t);
      break;
    case "flag":
      flagBearer(ctx, s, x, foot, t);
      break;
    case "snare":
      snare(ctx, s, x, foot, t, 0);
      break;
    case "snare2":
      snare(ctx, s, x, foot, t, 1);
      break;
    case "lyre":
      lyre(ctx, s, x, foot, t);
      break;
    case "tuba":
      tuba(ctx, s, x, foot, t, 0);
      break;
    case "tuba2":
      tuba(ctx, s, x, foot, t, 1);
      break;
    case "truck":
      fireTruck(ctx, s, x, foot, t);
      break;
    case "uncleSam":
      uncleSam(ctx, s, x, foot, t);
      break;
    case "bike":
      girlOnBike(ctx, s, x, foot, t);
      break;
    case "dog":
      dog(ctx, s, x, foot, t);
      break;
  }
}

/** The parade, every unit that is on screen (or close to it), rearmost first so the leaders are in front. */
export function parade(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const foot = s.groundY + ROUTE * u;
  if (foot - u * 0.3 > s.cssH) return;
  const headX = paradeX(s.t) * u;
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const { unit, back, reach } = UNITS[i]!;
    const x = headX - back * u;
    if (x + reach * u < -u * 0.02 || x - reach * u > s.cssW + u * 0.02) continue;
    drawUnit(ctx, s, unit, x, foot, s.t);
  }
}

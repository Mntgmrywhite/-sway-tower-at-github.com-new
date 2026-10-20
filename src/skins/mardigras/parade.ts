import { circle, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BRASS,
  COAT,
  DRUM_HEAD,
  DRUM_SHELL,
  FLAME,
  FLAME_CORE,
  FLOAT_BODY,
  FLOAT_SKIRT,
  FLOAT_TRIM,
  GOLD,
  GREEN,
  HAIRS,
  INK,
  IRON,
  MASKS,
  PURPLE,
  SASH,
  SHIRT,
  SHIRTS,
  SKINS,
  SUIT,
  TROUSERS,
  VIOLET,
  WHEEL,
  type Shades,
} from "./colors";
import { figure, nearHand, standing, walk, type Figure } from "./folk";
import { centerX, curbTop, inkW, kidCatch, ROUTE } from "./place";
import { beadLoop, block, starPath } from "./shapes";

// The parade, passing left to right in front of the reviewing stand, below the tower's floor
// line (so nothing moves behind the tower): the grand marshal strutting under his second-line
// umbrella in a white suit and purple sash, a flambeaux carrier with his torch held high, the
// brass band (a trumpet, a trombone with its slide going, a sousaphone wrapped round its
// player, a snare and a bass drum), the float of our own (a grinning jester's head at the
// prow, a crown at the stern, purple and gold over a green skirt on big gold wheels) with
// three masked riders who throw strings of beads to the crowd on either side, a jester on
// stilts, a second flambeaux carrier, and a little one dancing along behind with a parasol.
// It steps in at PARADE_AT and the last of it has passed the tower by ten seconds (the
// owner's rule), and it comes round the block again every PERIOD. On a screen wider than a
// phone (a tablet, a desktop window, the zoomed-out view) it is already walking in from past
// the edge, so it never stands still or pops in. Everything is near: flat two-tone fills and
// one ink weight.
//
// Positions along the route are in u behind the parade's head; screen x comes from headX().

/** When the marshal steps in from the left, how fast the parade walks (u/s), and how often it comes round. */
export const PARADE_AT = 0.3;
const SPEED = 0.23;
export const PERIOD = 40;
/** Where the head starts: u left of the screen's center, past any phone's edge. */
const HEAD_IN = -0.62;
/** A stride every this far travelled (u). */
const STRIDE = 0.1;

/**
 * Each pass begins this long before the head reaches HEAD_IN (s), far off to the left: on a
 * phone nothing shows until HEAD_IN, while a wider screen sees the parade walk in from its edge
 * (each pass ends as far off to the right, where no screen up to LEAD * SPEED + 0.6 u either
 * side of the center sees it).
 */
const LEAD = 10;

/** Seconds into the current pass, counted from the head at HEAD_IN: from -LEAD to PERIOD - LEAD. */
function passTime(t: number): number {
  return ((((t - PARADE_AT + LEAD) % PERIOD) + PERIOD) % PERIOD) - LEAD;
}

/** The marshal's x (u from the screen's center) at scene time t: at HEAD_IN at PARADE_AT and every PERIOD after. */
export function headX(t: number): number {
  return HEAD_IN + SPEED * passTime(t);
}

type Unit = "marshal" | "flambeau" | "trumpet" | "trombone" | "sousaphone" | "snare" | "bass" | "float" | "stilts" | "flambeau2" | "dancer";

/** Each unit's place behind the head (u). */
export const UNITS: readonly (readonly [Unit, number])[] = [
  ["marshal", 0],
  ["flambeau", 0.14],
  ["trumpet", 0.28],
  ["trombone", 0.41],
  ["sousaphone", 0.54],
  ["snare", 0.66],
  ["bass", 0.78],
  ["float", 1.06],
  ["stilts", 1.32],
  ["flambeau2", 1.43],
  ["dancer", 1.54],
];
/** How long the parade is (u): the head to the last dancer, plus her reach. */
export const LENGTH = 1.6;
/** The float's half length (u). */
const FLOAT_HL = 0.19;

/** Whether any of the parade is on a screen `half` u wide either side of the center at time t. */
function paradeShown(t: number, half: number): boolean {
  const x = headX(t);
  return x + 0.1 > -half && x - LENGTH < half;
}

// ---------------------------------------------------------------- the figures

const m = (top: Shades, bottom: Shades, skin: number, hair: number): Figure => standing(top, bottom, SKINS[skin]!, HAIRS[hair]!);

const MARSHAL = m(SUIT, SUIT, 2, 0);
MARSHAL.hat = "topHat";
MARSHAL.hatColor = PURPLE;
const CARRIERS = [m(COAT, TROUSERS, 1, 3), m(COAT, TROUSERS, 3, 1)];
const BAND = [m(SHIRT, TROUSERS, 0, 1), m(SHIRT, TROUSERS, 2, 0), m(SHIRT, TROUSERS, 1, 2), m(SHIRT, TROUSERS, 3, 4), m(SHIRT, TROUSERS, 0, 0)];
for (const b of BAND) {
  b.hat = "cap";
  b.hatColor = GOLD;
}
const RIDERS = [m(VIOLET, PURPLE, 1, 0), m(GOLD, GREEN, 3, 2), m(GREEN, PURPLE, 0, 4)];
RIDERS.forEach((r, i) => {
  r.hat = "mask";
  r.hatColor = MASKS[i]!;
  r.size = 0.7;
});
const STILTS = m(GOLD, GREEN, 2, 3);
STILTS.hat = "jester";
STILTS.hatColor = PURPLE;
STILTS.size = 0.8;
const DANCER = m(SHIRTS[1]!, VIOLET, 0, 2);
DANCER.size = 0.55;
DANCER.skirt = true;

// ---------------------------------------------------------------- the bead throws

/**
 * The float's throws: at these float positions (u from the center) a rider throws a string of
 * beads, back and up to one of the kids on the far sidewalk (`kid`), or ahead to one of the two
 * on the parade ladder at the curb (`seat`, 0 the left one).
 */
const THROWS = [
  { at: -0.4, rider: 2, dir: -1, kid: 0, seat: -1 },
  { at: -0.3, rider: 1, dir: -1, kid: 1, seat: -1 },
  { at: 0.24, rider: 2, dir: 1, kid: -1, seat: 0 },
  { at: 0.33, rider: 1, dir: 1, kid: -1, seat: 1 },
] as const;
/** How many throws a pass has. */
export const THROW_COUNT = THROWS.length;

/** Which sidewalk kid throw `i` goes to (-1: to the ladder). */
export function throwKid(i: number): number {
  return THROWS[i]!.kid;
}

/** Which ladder seat throw `i` goes to (-1: to the sidewalk). */
export function throwSeat(i: number): number {
  return THROWS[i]!.seat;
}
/** A throw's flight (s) and arc (u). */
const FLIGHT = 0.7;
const ARC = 0.08;

/** Scratch result of `throwAt`: the float's x at the throw, the flight (0..1 or -1), and the throw's number. */
const THROW = { x: 0, flight: -1, wind: -1, landed: -1 };
/** How long after a catch the catcher's arms take to come down (s). */
export const LOWER = 0.35;

/**
 * Where throw `i` stands at time t: its flight fraction (or -1), the rider's wind-up (0..1 just
 * before it, or -1), and how long ago the beads were caught (within LOWER of it, or -1).
 */
export function throwAt(t: number, i: number): typeof THROW {
  const th = THROWS[i]!;
  THROW.flight = -1;
  THROW.wind = -1;
  THROW.landed = -1;
  // The float's center reaches th.at at this time into each pass.
  const reach = (th.at - (HEAD_IN - UNITS[7]![1])) / SPEED;
  const e = passTime(t) - reach;
  THROW.x = th.at;
  if (e >= 0 && e < FLIGHT) THROW.flight = e / FLIGHT;
  else if (e >= -0.4 && e < 0) THROW.wind = 1 + e / 0.4;
  else if (e >= FLIGHT && e < FLIGHT + LOWER) THROW.landed = e - FLIGHT;
  return THROW;
}

/** Scratch: where a throw's beads are (screen px). */
const BEADS = { x: 0, y: 0 };

/** The ladder's two kids' raised hands (u from the screen's center), and how far above the curb (u). */
const SEATS: readonly number[] = [0.336, 0.384];
const SEAT_UP = 0.31;

/** Where throw `i`'s beads are at `flight` (0..1): from the rider's raised hand to the target's hands, in an arc. */
function throwBeadsAt(s: Scene, i: number, flight: number): typeof BEADS {
  const th = THROWS[i]!;
  const u = s.u;
  const cx = centerX(s);
  const x0 = cx + (th.at + RIDER_X[th.rider]! + th.dir * 0.08) * u;
  const y0 = s.groundY + ROUTE * u - FLOAT_DECK * u - RELEASE * u;
  // To the sidewalk kids' raised hands behind, or to the kids on the parade ladder in front.
  let x1: number;
  let y1: number;
  if (th.kid >= 0) {
    const c = kidCatch(s, th.kid);
    x1 = c.x;
    y1 = c.y;
  } else {
    x1 = s.cssW / 2 + SEATS[th.seat]! * u;
    y1 = curbTop(s) - u * SEAT_UP;
  }
  BEADS.x = x0 + (x1 - x0) * flight;
  BEADS.y = y0 + (y1 - y0) * flight - ARC * u * 4 * flight * (1 - flight);
  return BEADS;
}

// ---------------------------------------------------------------- the float

/** The riders' places on the deck (u from the float's center), the deck's height over the route, the wheels. */
const RIDER_X = [-0.06, 0.0, 0.06] as const;
const FLOAT_DECK = 0.1;
const WHEEL_R = 0.036;
/** The float's body (u): its height over the deck; the riders stand behind it, this far below its top edge. */
const BODY_H = 0.07;
const RIDER_DOWN = 0.05;
/** Where a throw leaves a rider's raised hand: this far above the deck (u). */
const RELEASE = BODY_H - RIDER_DOWN + 0.125;

/** A spoked gold wheel at (x, y), turned by `a`. */
function wheel(ctx: Ctx, x: number, y: number, r: number, a: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = WHEEL.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.72);
  ctx.fillStyle = WHEEL.light;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const t = a + (i * Math.PI) / 3;
    ctx.moveTo(x + Math.cos(t) * r * 0.15, y + Math.sin(t) * r * 0.15);
    ctx.lineTo(x + Math.cos(t) * r * 0.7, y + Math.sin(t) * r * 0.7);
  }
  inkedLine(ctx, WHEEL.body, lw * 1.2, lw * 0.5, INK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.16);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The jester's head at the float's prow: a grinning face under a three-pointed hat with bells. */
function jesterHead(ctx: Ctx, x: number, y: number, r: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = "#ffd3b0";
  ctx.fill();
  ink(ctx, lw, INK);
  // The hat: three points, purple, green and gold, with gold bells.
  const tips = [
    [x - r * 1.5, y - r * 1.2],
    [x, y - r * 2.1],
    [x + r * 1.5, y - r * 1.2],
  ] as const;
  const colors = [PURPLE, GREEN, GOLD] as const;
  for (let i = 0; i < 3; i++) {
    const [tx, ty] = tips[i]!;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9 + i * r * 0.6, y - r * 0.55);
    ctx.quadraticCurveTo((x + tx) / 2 - r * 0.2, y - r * 1.1, tx, ty);
    ctx.quadraticCurveTo((x + tx) / 2 + r * 0.2, y - r * 0.9, x - r * 0.3 + i * r * 0.6, y - r * 0.55);
    ctx.closePath();
    ctx.fillStyle = colors[i]!.body;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
  }
  ctx.beginPath();
  block(ctx, x - r * 1.0, y - r * 0.7, r * 2.0, r * 0.26, r * 0.1);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (const [tx, ty] of tips) circle(ctx, tx, ty, r * 0.2);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // The face: rosy cheeks, bright eyes, a big grin.
  ctx.fillStyle = "#ff9c8c";
  ctx.beginPath();
  oval(ctx, x - r * 0.55, y + r * 0.2, r * 0.22, r * 0.15);
  oval(ctx, x + r * 0.55, y + r * 0.2, r * 0.22, r * 0.15);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x - r * 0.32, y - r * 0.12, r * 0.12);
  circle(ctx, x + r * 0.32, y - r * 0.12, r * 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y + r * 0.3);
  ctx.quadraticCurveTo(x, y + r * 0.85, x + r * 0.5, y + r * 0.3);
  ctx.quadraticCurveTo(x, y + r * 0.55, x - r * 0.5, y + r * 0.3);
  ctx.closePath();
  ctx.fillStyle = "#7a2633";
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** A gold crown at the float's stern: five points with jewels, on a purple cushion. */
function crown(ctx: Ctx, x: number, y: number, w: number, lw: number): void {
  const h = w * 0.7;
  ctx.beginPath();
  oval(ctx, x, y, w * 0.6, w * 0.12);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.1);
  ctx.lineTo(x - w / 2, y - h * 0.75);
  ctx.lineTo(x - w * 0.25, y - h * 0.45);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w * 0.25, y - h * 0.45);
  ctx.lineTo(x + w / 2, y - h * 0.75);
  ctx.lineTo(x + w / 2, y - h * 0.1);
  ctx.closePath();
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(x - w * 0.44, y - h * 0.4, w * 0.12, h * 0.26);
  const jewels = [GREEN.body, PURPLE.body, GREEN.body];
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    circle(ctx, x + (i - 1) * w * 0.3, y - h * 0.25, w * 0.06);
    ctx.fillStyle = jewels[i]!;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
  }
  ctx.beginPath();
  circle(ctx, x - w / 2, y - h * 0.78, w * 0.05);
  circle(ctx, x, y - h * 1.03, w * 0.05);
  circle(ctx, x + w / 2, y - h * 0.78, w * 0.05);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/** The float at center x (screen px), its wheels on the route at y. */
function float(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  const turn = (x / u) * (Math.PI * 2) * 0.8;
  // The skirt: green drape down to the wheels, with gold fringe.
  ctx.beginPath();
  ctx.rect(x - hl, deck, hl * 2, y - deck - u * 0.016);
  ctx.fillStyle = FLOAT_SKIRT.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = FLOAT_SKIRT.shade;
  ctx.beginPath();
  for (let sx = x - hl + u * 0.012; sx < x + hl; sx += u * 0.03) ctx.rect(sx, deck + u * 0.01, u * 0.012, y - deck - u * 0.03);
  ctx.fill();
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  for (let sx = x - hl; sx < x + hl - u * 0.002; sx += u * 0.012) {
    ctx.moveTo(sx, y - u * 0.016);
    ctx.lineTo(sx + u * 0.006, y - u * 0.004);
    ctx.lineTo(sx + u * 0.012, y - u * 0.016);
    ctx.closePath();
  }
  ctx.fill();
  wheel(ctx, x - hl * 0.62, y - WHEEL_R * u, WHEEL_R * u, turn, lw);
  wheel(ctx, x + hl * 0.62, y - WHEEL_R * u, WHEEL_R * u, turn, lw);
  // The riders stand on the deck behind the body's side, which hides them to the waist: masks,
  // feathers and arms over it, throwing.
  const bodyH = BODY_H * u;
  const stand = deck - bodyH + RIDER_DOWN * u;
  for (let i = 0; i < RIDERS.length; i++) {
    const f = RIDERS[i]!;
    const rx = x + RIDER_X[i]! * u;
    f.m = i === 0 ? -1 : 1;
    let wind = 0;
    let fly = 0;
    for (let k = 0; k < THROWS.length; k++) {
      if (THROWS[k]!.rider !== i) continue;
      const th = throwAt(s.t, k);
      if (th.wind >= 0) wind = Math.max(wind, th.wind);
      if (th.flight >= 0 && th.flight < 0.3) fly = Math.max(fly, 1 - th.flight / 0.3);
      if (th.wind >= 0 || th.flight >= 0) f.m = THROWS[k]!.dir;
    }
    const wave = Math.sin(s.t * 3 + i * 2.1);
    f.handLx = -0.03;
    f.handLy = -0.1 + wave * 0.01;
    f.handRx = 0.035 + wind * -0.05 + fly * 0.09;
    f.handRy = -0.1 - wind * 0.06 - fly * 0.08 - (1 - wind - fly) * (0.02 + wave * 0.015);
    f.lean = -wind * 0.15 + fly * 0.3;
    f.mouth = 0.4 + fly * 0.5;
    figure(ctx, f, rx, stand, u, lw);
    if (wind > 0.1) {
      const h = nearHand(f, rx, stand, u);
      ctx.beginPath();
      beadLoop(ctx, h.x, h.y, u * 0.007, u * 0.016, u * 0.0025, 7);
      ctx.fillStyle = GOLD.body;
      ctx.fill();
      ink(ctx, lw * 0.5, INK);
      ctx.fill();
    }
  }
  // The body: a purple box with gold trim, a star on its side and a lit top edge.
  ctx.beginPath();
  block(ctx, x - hl, deck - bodyH, hl * 2, bodyH, u * 0.006);
  ctx.fillStyle = FLOAT_BODY.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = FLOAT_BODY.light;
  ctx.fillRect(x - hl + lw, deck - bodyH + lw, hl * 2 - lw * 2, u * 0.008);
  ctx.fillStyle = FLOAT_TRIM.body;
  ctx.fillRect(x - hl, deck - u * 0.012, hl * 2, u * 0.006);
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) starPath(ctx, x + i * u * 0.052, deck - bodyH * 0.5, u * 0.014);
  ctx.fillStyle = FLOAT_TRIM.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
  // The jester's head at the prow and the crown at the stern.
  jesterHead(ctx, x + hl * 0.76, deck - bodyH - u * 0.028, u * 0.032, lw);
  crown(ctx, x - hl * 0.74, deck - bodyH + u * 0.004, u * 0.08, lw);
}

// ---------------------------------------------------------------- the instruments and props

/** A second-line umbrella: a fringed dome on a pole, held at (x, y) by the pole's foot. */
function umbrella(ctx: Ctx, x: number, y: number, u: number, lw: number, color: Shades): void {
  const r = u * 0.04;
  const top = y - u * 0.055;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, top);
  inkedLine(ctx, IRON.light, lw * 0.8, lw * 0.5, INK);
  ctx.beginPath();
  ctx.moveTo(x - r, top);
  ctx.quadraticCurveTo(x, top - r * 1.3, x + r, top);
  ctx.closePath();
  ctx.fillStyle = color.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = color.light;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, top - u * 0.002);
  ctx.quadraticCurveTo(x - r * 0.4, top - r * 0.9, x, top - r * 0.5);
  ctx.quadraticCurveTo(x - r * 0.3, top - r * 0.35, x - r * 0.55, top - u * 0.002);
  ctx.closePath();
  ctx.fill();
  // The fringe along the brim.
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) circle(ctx, x - r + (i * r * 2) / 6, top + u * 0.004, u * 0.004);
  ctx.fill();
  ink(ctx, lw * 0.4, INK);
}

/** A flambeau: a pole with a flaming head, its foot at (x, y). */
function torch(ctx: Ctx, s: Scene, x: number, y: number, u: number, lw: number, phase: number): void {
  const top = y - u * 0.1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, top);
  inkedLine(ctx, IRON.light, lw * 1.2, lw * 0.5, INK);
  ctx.beginPath();
  block(ctx, x - u * 0.012, top - u * 0.012, u * 0.024, u * 0.016, u * 0.003);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The flame: a leaping tongue of orange with a pale core, flickering.
  const f = Math.sin(s.t * 11 + phase);
  const g = Math.sin(s.t * 7.3 + phase * 1.7);
  const h = u * (0.03 + f * 0.005);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.012, top - u * 0.01);
  ctx.quadraticCurveTo(x - u * 0.016 + g * u * 0.004, top - h * 0.5, x + g * u * 0.006, top - h - u * 0.008);
  ctx.quadraticCurveTo(x + u * 0.016 + f * u * 0.004, top - h * 0.5, x + u * 0.012, top - u * 0.01);
  ctx.closePath();
  ctx.fillStyle = FLAME;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.005, top - u * 0.01);
  ctx.quadraticCurveTo(x - u * 0.007, top - h * 0.3, x + g * u * 0.003, top - h * 0.55);
  ctx.quadraticCurveTo(x + u * 0.007, top - h * 0.3, x + u * 0.005, top - u * 0.01);
  ctx.closePath();
  ctx.fillStyle = FLAME_CORE;
  ctx.fill();
}

/** A trumpet held forward from (x, y) (the mouthpiece), tipped up by `up` radians. */
function trumpet(ctx: Ctx, x: number, y: number, u: number, lw: number, up: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-up);
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.004);
  ctx.lineTo(u * 0.05, -u * 0.004);
  ctx.lineTo(u * 0.075, -u * 0.016);
  ctx.lineTo(u * 0.075, u * 0.016);
  ctx.lineTo(u * 0.05, u * 0.004);
  ctx.lineTo(0, u * 0.004);
  ctx.closePath();
  ctx.rect(u * 0.018, -u * 0.014, u * 0.005, u * 0.012);
  ctx.rect(u * 0.027, -u * 0.014, u * 0.005, u * 0.012);
  ctx.rect(u * 0.036, -u * 0.014, u * 0.005, u * 0.012);
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = BRASS.light;
  ctx.fillRect(u * 0.004, -u * 0.003, u * 0.04, u * 0.002);
  ctx.restore();
}

/** A trombone from (x, y) (the mouthpiece), its slide out by `slide` (0..1). */
function trombone(ctx: Ctx, x: number, y: number, u: number, lw: number, slide: number): void {
  const len = u * (0.05 + slide * 0.03);
  ctx.beginPath();
  ctx.rect(x, y - u * 0.003, u * 0.085, u * 0.006);
  ctx.rect(x, y + u * 0.006, len, u * 0.005);
  ctx.rect(x + len - u * 0.004, y - u * 0.002, u * 0.005, u * 0.014);
  ctx.moveTo(x + u * 0.085, y - u * 0.003);
  ctx.lineTo(x + u * 0.11, y - u * 0.018);
  ctx.lineTo(x + u * 0.11, y + u * 0.012);
  ctx.lineTo(x + u * 0.085, y + u * 0.003);
  ctx.closePath();
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** A sousaphone round its player at (x, y the feet): the tubing round the body and the big bell over the head, facing forward. */
function sousaphone(ctx: Ctx, x: number, y: number, u: number, lw: number, m: number): void {
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.beginPath();
  circle(ctx, x, y - u * 0.1, u * 0.04);
  ctx.lineWidth = lw * 2 + u * 0.012;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = u * 0.012;
  ctx.stroke();
  // The bell: a big disc above the head, a dark throat, a lit rim.
  const bx = x + m * u * 0.01;
  const by = y - u * 0.21;
  ctx.beginPath();
  circle(ctx, bx, by, u * 0.045);
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, bx, by, u * 0.03);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, bx, by, u * 0.012);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.beginPath();
  oval(ctx, bx - u * 0.02, by - u * 0.025, u * 0.012, u * 0.006, -0.7);
  ctx.fill();
  // The neck from the body up to the bell.
  ctx.beginPath();
  ctx.moveTo(x - m * u * 0.03, y - u * 0.12);
  ctx.quadraticCurveTo(x - m * u * 0.04, y - u * 0.18, bx - m * u * 0.01, by + u * 0.04);
  inkedLine(ctx, BRASS.body, u * 0.009, lw * 0.5, INK);
}

/** A snare drum slung at the waist, at (x, y its top center), with two sticks. */
function snare(ctx: Ctx, x: number, y: number, u: number, lw: number, beat: number): void {
  ctx.beginPath();
  ctx.rect(x - u * 0.03, y, u * 0.06, u * 0.028);
  ctx.fillStyle = DRUM_SHELL.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  oval(ctx, x, y, u * 0.03, u * 0.008);
  ctx.fillStyle = DRUM_HEAD;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.02, y - u * 0.02 - beat * u * 0.012);
  ctx.lineTo(x - u * 0.005, y - u * 0.002);
  ctx.moveTo(x + u * 0.02, y - u * 0.02 - (1 - beat) * u * 0.012);
  ctx.lineTo(x + u * 0.005, y - u * 0.002);
  inkedLine(ctx, "#f4e2c0", lw * 0.9, lw * 0.4, INK);
}

/** A bass drum carried in front at (x, y its center), a beater swinging onto it. */
function bassDrum(ctx: Ctx, x: number, y: number, u: number, lw: number, beat: number): void {
  const r = u * 0.05;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = DRUM_SHELL.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.78);
  ctx.fillStyle = DRUM_HEAD;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  starPath(ctx, x, y, r * 0.35);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  // The beater: from above, swinging in to the head on the beat.
  const bx = x + r * 0.5;
  const by = y - r * (1.3 - beat * 0.5);
  ctx.beginPath();
  ctx.moveTo(bx + r * 0.3, by - r * 0.5);
  ctx.lineTo(bx, by);
  inkedLine(ctx, "#f4e2c0", lw * 0.9, lw * 0.4, INK);
  ctx.beginPath();
  circle(ctx, bx, by, r * 0.14);
  ctx.fillStyle = "#f4e2c0";
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/** A sash across a figure's chest, from its far shoulder to its near hip. */
function sash(ctx: Ctx, f: Figure, x: number, y: number, u: number, lw: number): void {
  const k = u * f.size;
  ctx.save();
  ctx.translate(x, y - f.lift * k);
  ctx.scale(k * f.m, k);
  ctx.rotate(f.lean);
  ctx.beginPath();
  ctx.moveTo(-0.022, -0.118);
  ctx.lineTo(-0.012, -0.124);
  ctx.lineTo(0.022, -0.08);
  ctx.lineTo(0.012, -0.072);
  ctx.closePath();
  ctx.fillStyle = SASH.body;
  ctx.fill();
  ink(ctx, lw / k * 0.6, INK);
  ctx.restore();
}

// ---------------------------------------------------------------- the parade

/** Scratch: the unit's figure for this frame. */
let stride = 0;

/** Draw the parade where it is at the scene's time, its feet on the route in front of the stand. */
export function parade(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const half = s.cssW / 2 / u + 0.2;
  if (!paradeShown(s.t, half)) return;
  const y = s.groundY + ROUTE * u;
  if (y - u * 0.3 > s.cssH) return;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const hx = headX(s.t);
  const beat = (Math.sin((hx / STRIDE) * Math.PI * 2) + 1) / 2;
  // Back to front along the route: the last units first, so the float's beads fly over the band.
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [unit, pos] = UNITS[i]!;
    const ux = hx - pos;
    if (ux < -half || ux > half) continue;
    const x = cx + ux * u;
    stride = (ux / STRIDE) * Math.PI * 2;
    if (unit === "float") float(ctx, s, x, y, lw);
    else if (unit === "marshal") {
      const f = walk(MARSHAL, stride, 0.03, 0.01);
      // Strutting: the knees high, the umbrella pumped up and down with the beat.
      f.raiseL *= 2.2;
      f.raiseR *= 2.2;
      f.lean = -0.08;
      f.handRx = 0.01;
      f.handRy = -0.165 - beat * 0.012;
      f.handLx = -0.03;
      f.handLy = -0.095;
      f.mouth = 0.3;
      figure(ctx, f, x, y, u, lw);
      sash(ctx, f, x, y, u, lw);
      const h = nearHand(f, x, y, u);
      umbrella(ctx, h.x, h.y - u * 0.004, u, lw, PURPLE);
    } else if (unit === "flambeau" || unit === "flambeau2") {
      const f = walk(CARRIERS[unit === "flambeau" ? 0 : 1]!, stride);
      f.handRx = 0.03;
      f.handRy = -0.15;
      figure(ctx, f, x, y, u, lw);
      const h = nearHand(f, x, y, u);
      torch(ctx, s, h.x, h.y + u * 0.03, u, lw, unit === "flambeau" ? 0 : 2);
    } else if (unit === "trumpet") {
      const f = walk(BAND[0]!, stride, 0.026, 0);
      const up = 0.25 + beat * 0.3;
      f.handRx = 0.03;
      f.handRy = -0.14;
      f.handLx = 0.055;
      f.handLy = -0.15;
      f.mouth = 0.6;
      figure(ctx, f, x, y, u, lw);
      const h = nearHand(f, x, y, u);
      trumpet(ctx, h.x - u * 0.01, h.y, u, lw, up);
    } else if (unit === "trombone") {
      const f = walk(BAND[1]!, stride, 0.026, 0);
      f.handRx = 0.03;
      f.handRy = -0.135;
      f.handLx = 0.075 + beat * 0.03;
      f.handLy = -0.128;
      f.mouth = 0.6;
      figure(ctx, f, x, y, u, lw);
      const h = nearHand(f, x, y, u);
      trombone(ctx, h.x - u * 0.012, h.y, u, lw, beat);
    } else if (unit === "sousaphone") {
      const f = walk(BAND[2]!, stride, 0.026, 0);
      f.handRx = 0.035;
      f.handRy = -0.1;
      f.handLx = -0.035;
      f.handLy = -0.1;
      f.mouth = 0.4 + beat * 0.5;
      figure(ctx, f, x, y, u, lw);
      sousaphone(ctx, x, y, u, lw, f.m);
    } else if (unit === "snare") {
      const f = walk(BAND[3]!, stride, 0.026, 0);
      f.handRx = 0.03;
      f.handRy = -0.1 - beat * 0.01;
      f.handLx = -0.006;
      f.handLy = -0.1 - (1 - beat) * 0.01;
      figure(ctx, f, x, y, u, lw);
      snare(ctx, x + u * 0.012, y - u * 0.088, u, lw, beat);
    } else if (unit === "bass") {
      const f = walk(BAND[4]!, stride, 0.026, 0);
      f.handRx = 0.075;
      f.handRy = -0.11 + beat * 0.02;
      f.handLx = 0.03;
      f.handLy = -0.13;
      figure(ctx, f, x, y, u, lw);
      bassDrum(ctx, x + u * 0.05, y - u * 0.09, u, lw, beat);
    } else if (unit === "stilts") {
      // The jester up on his stilts: the poles from the route up to his feet, a slow high stride.
      const f = walk(STILTS, stride * 0.5, 0.03, 0.02);
      const up = u * 0.08;
      const k = u * f.size;
      ctx.beginPath();
      ctx.moveTo(x + f.footL * k, y - f.raiseL * k - up);
      ctx.lineTo(x + f.footL * k * 1.3, y - f.raiseL * k * 0.3);
      ctx.moveTo(x + f.footR * k, y - f.raiseR * k - up);
      ctx.lineTo(x + f.footR * k * 1.3, y - f.raiseR * k * 0.3);
      inkedLine(ctx, GOLD.body, u * 0.008, lw * 0.5, INK);
      f.handLx = -0.05;
      f.handLy = -0.15 + beat * 0.02;
      f.handRx = 0.05;
      f.handRy = -0.15 - beat * 0.02;
      f.mouth = 0.5;
      figure(ctx, f, x, y - up, u, lw);
    } else {
      // The little dancer: bouncing along, twirling a parasol.
      const f = walk(DANCER, stride * 1.5, 0.024, 0.01);
      f.lift += Math.max(0, Math.sin(stride * 1.5)) * 0.012;
      f.handRx = 0.02;
      f.handRy = -0.16;
      f.handLx = -0.03;
      f.handLy = -0.08;
      f.mouth = 0.5;
      figure(ctx, f, x, y, u, lw);
      const h = nearHand(f, x, y, u);
      umbrella(ctx, h.x, h.y - u * 0.004, u, lw, GREEN);
    }
  }
  // The beads the riders have thrown, in the air on their way to the crowd.
  for (let i = 0; i < THROWS.length; i++) {
    const th = throwAt(s.t, i);
    if (th.flight < 0) continue;
    const b = throwBeadsAt(s, i, th.flight);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(th.flight * 6);
    ctx.beginPath();
    beadLoop(ctx, 0, -u * 0.012, u * 0.011, u * 0.028, u * 0.0036, 8);
    ctx.fillStyle = i % 2 ? GREEN.body : GOLD.body;
    ctx.fill();
    ink(ctx, lw * 0.5, INK);
    ctx.fill();
    ctx.restore();
  }
}

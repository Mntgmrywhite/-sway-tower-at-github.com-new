import { circle, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BONE,
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
  PURPLE,
  SASH,
  SHIRT,
  SHIRTS,
  SILVER,
  SKINS,
  SUIT,
  TAILS,
  TROUSERS,
  VIOLET,
  WHEEL,
  type Shades,
} from "./colors";
import { figure, nearHand, standing, walk, type Figure, type Mask } from "./folk";
import { centerX, curbTop, inkW, JUMPER, kidCatch, LITTLE, ROUTE } from "./place";
import { beadLoop, block, starPath, swagPath } from "./shapes";
import { deckY } from "./street";

// The parade, passing left to right in front of the reviewing stand, below the tower's floor
// line (so nothing moves behind the tower): the grand marshal strutting under his second-line
// umbrella in a white suit, purple sash and a gold sequined mask, a flambeaux carrier with his
// torch held high, the brass band (a trumpet, a trombone with its slide going, a sousaphone
// wrapped round its player, a snare and a bass drum), then the skeleton krewe's float (our own,
// in the spirit of the city's old bone gangs: a giant grinning skull in a top hat at the prow,
// a giant white glove waving at the stern, green draped in purple and gold swags and hung with bones, and
// three grinning skeletons in top hats and tailcoats dancing to the band, waving white gloves and
// tossing beads up to the little one on the gallery, down to the kid at the curb and over to the
// ladder), the jester-and-crown float (a grinning jester's head at the prow, a crown at the
// stern, purple and gold over a green skirt on big gold wheels) with three riders in a sun, a
// moon and a feathered mask, who throw strings of beads to the crowd on either side, a jester on
// stilts in a harlequin mask, a second flambeaux carrier, and a little one in a cat mask dancing
// along behind with a parasol. It steps in at PARADE_AT and the last of it has passed the tower
// by ten seconds (the owner's rule), and it comes round the block again every PERIOD. On a
// screen wider than a phone (a tablet, a desktop window, the zoomed-out view) it is already
// walking in from past the edge, so it never stands still or pops in. Everything is near: flat
// two-tone fills and one ink weight.
//
// Positions along the route are in u behind the parade's head; screen x comes from headX().

/** When the marshal steps in from the left, how fast the parade walks (u/s), and how often it comes round. */
export const PARADE_AT = 0.1;
const SPEED = 0.27;
export const PERIOD = 40;
/** Where the head starts: u left of the screen's center, past any phone's edge. */
const HEAD_IN = -0.58;
/** The band's beat (strides a second, the drums and the dancers on it), and a stride's length (u). */
const STEPS = 2.3;
const STRIDE = SPEED / STEPS;

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

type Unit = "marshal" | "flambeau" | "trumpet" | "trombone" | "sousaphone" | "snare" | "bass" | "bones" | "float" | "stilts" | "flambeau2" | "dancer";

/** Each unit's place behind the head (u). */
export const UNITS: readonly (readonly [Unit, number])[] = [
  ["marshal", 0],
  ["flambeau", 0.14],
  ["trumpet", 0.28],
  ["trombone", 0.41],
  ["sousaphone", 0.54],
  ["snare", 0.66],
  ["bass", 0.78],
  ["bones", 1.06],
  ["float", 1.51],
  ["stilts", 1.77],
  ["flambeau2", 1.88],
  ["dancer", 1.99],
];
/** How long the parade is (u): the head to the last dancer, plus her reach. */
export const LENGTH = 2.05;
/** A float's half length (u): both floats are built on the same chassis. */
export const FLOAT_HL = 0.19;
/** The two floats' places behind the head: 0 the skeleton krewe's, 1 the jester's. */
export const FLOAT_AT: readonly number[] = [unitAt("bones"), unitAt("float")];

function unitAt(unit: Unit): number {
  return UNITS.find(([u]) => u === unit)![1];
}

/** Whether any of the parade is on a screen `half` u wide either side of the center at time t. */
function paradeShown(t: number, half: number): boolean {
  const x = headX(t);
  return x + 0.1 > -half && x - LENGTH < half;
}

// ---------------------------------------------------------------- the figures

const m = (top: Shades, bottom: Shades, skin: number, hair: number): Figure => standing(top, bottom, SKINS[skin]!, HAIRS[hair]!);
const masked = (f: Figure, mask: Mask, color: Shades): Figure => {
  f.mask = mask;
  f.maskColor = color;
  return f;
};

const MARSHAL = masked(m(SUIT, SUIT, 2, 0), "sequin", GOLD);
MARSHAL.hat = "topHat";
MARSHAL.hatColor = PURPLE;
const CARRIERS = [m(COAT, TROUSERS, 1, 3), m(COAT, TROUSERS, 3, 1)];
const BAND = [m(SHIRT, TROUSERS, 0, 1), m(SHIRT, TROUSERS, 2, 0), m(SHIRT, TROUSERS, 1, 2), m(SHIRT, TROUSERS, 3, 4), m(SHIRT, TROUSERS, 0, 0)];
for (const b of BAND) {
  b.hat = "cap";
  b.hatColor = GOLD;
}
/** The jester float's riders: a sun mask, a moon mask, a feathered mask. */
const RIDERS = [masked(m(VIOLET, PURPLE, 1, 0), "sun", GOLD), masked(m(GOLD, GREEN, 3, 2), "moon", SILVER), masked(m(GREEN, PURPLE, 0, 4), "feather", PURPLE)];
for (const r of RIDERS) r.size = 0.7;
/** The skeleton krewe: skulls, tailcoats and white gloves, a top hat each in the season's colors. */
const SKELETONS = [PURPLE, GREEN, GOLD].map((hat) => {
  const f = standing(TAILS, TAILS, BONE, INK);
  f.skull = true;
  f.suit = "tails";
  f.gloves = true;
  f.hat = "topHat";
  f.hatColor = hat;
  f.size = 0.74;
  return f;
});
const STILTS = masked(m(GOLD, GREEN, 2, 3), "harlequin", GREEN);
STILTS.hat = "jester";
STILTS.hatColor = PURPLE;
STILTS.size = 0.8;
const DANCER = masked(m(SHIRTS[1]!, VIOLET, 0, 2), "cat", GOLD);
DANCER.size = 0.55;
DANCER.skirt = true;

// ---------------------------------------------------------------- the bead throws

/** Who a throw goes to: a sidewalk kid, a kid on the ladder, the little one on the gallery, or the kid jumping at the curb. */
export type Target = "kid" | "seat" | "gallery" | "jumper";

/**
 * The floats' throws, in the order they fly: at float position `at` (u from the center) a
 * rider of float `float` (0 the skeletons', 1 the jester's) throws a string of beads ahead
 * (`dir` 1) or back (-1) to `to`: one of the kids on the far sidewalk (`n`), one of the two on
 * the parade ladder at the curb (`n`, 0 the left one), the little one up on the gallery, or the
 * kid jumping at the left of the curb.
 */
const THROWS: readonly { float: number; at: number; rider: number; dir: number; to: Target; n: number }[] = [
  { float: 0, at: -0.46, rider: 2, dir: 1, to: "gallery", n: 0 },
  { float: 0, at: -0.32, rider: 1, dir: -1, to: "jumper", n: 0 },
  { float: 1, at: -0.4, rider: 2, dir: -1, to: "kid", n: 0 },
  { float: 1, at: -0.3, rider: 1, dir: -1, to: "kid", n: 1 },
  { float: 0, at: 0.26, rider: 0, dir: 1, to: "seat", n: 1 },
  { float: 1, at: 0.24, rider: 2, dir: 1, to: "seat", n: 0 },
  { float: 1, at: 0.33, rider: 1, dir: 1, to: "seat", n: 1 },
];
/** How many throws a pass has. */
export const THROW_COUNT = THROWS.length;

/** Who throw `i` goes to, and which of them (`n`). */
export function throwTarget(i: number): { to: Target; n: number } {
  return THROWS[i]!;
}

/** Which float throw `i` comes from: 0 the skeleton krewe's, 1 the jester's. */
export function throwFloat(i: number): number {
  return THROWS[i]!.float;
}

/** Which sidewalk kid throw `i` goes to (-1: elsewhere). */
export function throwKid(i: number): number {
  return THROWS[i]!.to === "kid" ? THROWS[i]!.n : -1;
}

/** Which ladder seat throw `i` goes to (-1: elsewhere). */
export function throwSeat(i: number): number {
  return THROWS[i]!.to === "seat" ? THROWS[i]!.n : -1;
}
/** A throw's flight (s) and arc (u). */
const FLIGHT = 0.7;
const ARC = 0.08;
/** The strings' colors, throw by throw. */
const BEAD_COLORS: readonly Shades[] = [PURPLE, GOLD, GREEN];

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
  const reach = (th.at - (HEAD_IN - FLOAT_AT[th.float]!)) / SPEED;
  const e = passTime(t) - reach;
  THROW.x = th.at;
  if (e >= 0 && e < FLIGHT) THROW.flight = e / FLIGHT;
  else if (e >= -0.4 && e < 0) THROW.wind = 1 + e / 0.4;
  else if (e >= FLIGHT && e < FLIGHT + LOWER) THROW.landed = e - FLIGHT;
  return THROW;
}

/** How much `who` (throws to it: `to` and `n`) reaches up for the floats' beads at time t: up as they come, down again after the catch. */
export function catchReach(t: number, to: Target, n: number, from = 0.2): number {
  let r = 0;
  for (let i = 0; i < THROWS.length; i++) {
    const th = THROWS[i]!;
    if (th.to !== to || th.n !== n) continue;
    const at = throwAt(t, i);
    if (at.flight >= 0) r = Math.max(r, smoothstep((at.flight - from) / 0.3));
    else if (at.landed >= 0) r = Math.max(r, 1 - smoothstep(at.landed / LOWER));
  }
  return r;
}

function smoothstep(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** Scratch: where a throw's beads are (screen px). */
const BEADS = { x: 0, y: 0 };

/** The ladder's two kids' raised hands (u from the screen's center), and how far above the curb (u). */
const SEATS: readonly number[] = [0.336, 0.384];
const SEAT_UP = 0.31;
/** Where the catchers' hands meet when they reach up (u above their feet, at full size), and how far ahead of their middle. */
export const CATCH_UP = 0.185;
export const CATCH_AHEAD = 0.008;

/** Where throw `i`'s beads are at `flight` (0..1): from the rider's raised hand to the target's hands, in an arc. */
function throwBeadsAt(s: Scene, i: number, flight: number): typeof BEADS {
  const th = THROWS[i]!;
  const u = s.u;
  const cx = centerX(s);
  const x0 = cx + (th.at + RIDER_X[th.rider]! + th.dir * 0.08) * u;
  const y0 = s.groundY + ROUTE * u - FLOAT_DECK * u - release(th.float) * u;
  // To the sidewalk kids' raised hands behind, to the kids on the parade ladder in front, up to
  // the little one on the gallery, or down to the kid jumping at the curb.
  let x1: number;
  let y1: number;
  if (th.to === "kid") {
    const c = kidCatch(s, th.n);
    x1 = c.x;
    y1 = c.y;
  } else if (th.to === "seat") {
    x1 = s.cssW / 2 + SEATS[th.n]! * u;
    y1 = curbTop(s) - u * SEAT_UP;
  } else if (th.to === "gallery") {
    x1 = s.cssW / 2 + (LITTLE.x + CATCH_AHEAD * LITTLE.size) * u;
    y1 = deckY(s, 1) - CATCH_UP * LITTLE.size * u;
  } else {
    x1 = s.cssW / 2 + (JUMPER.x + CATCH_AHEAD * JUMPER.size) * u;
    y1 = curbTop(s) + u * 0.004 - CATCH_UP * JUMPER.size * u;
  }
  BEADS.x = x0 + (x1 - x0) * flight;
  BEADS.y = y0 + (y1 - y0) * flight - ARC * u * 4 * flight * (1 - flight);
  return BEADS;
}

// ---------------------------------------------------------------- the floats

/** The riders' places on the deck (u from the float's center), the deck's height over the route, the wheels. */
const RIDER_X = [-0.06, 0.0, 0.06] as const;
const FLOAT_DECK = 0.1;
const WHEEL_R = 0.036;
/** The float's body (u): its height over the deck; the riders stand behind it, this far below its top edge. */
const BODY_H = 0.07;
const RIDER_DOWN = 0.05;
/** Where a throw leaves a rider's raised hand: this far above the deck (u), on float `which`. */
function release(which: number): number {
  return BODY_H - RIDER_DOWN + 0.18 * (which === 0 ? SKELETONS : RIDERS)[0]!.size;
}

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

/** A float's chassis at center x (screen px), its wheels on the route at y: a skirt draped to the wheels with gold fringe, and the wheels. */
function chassis(ctx: Ctx, s: Scene, x: number, y: number, lw: number, skirt: Shades): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  const turn = (x / u) * (Math.PI * 2) * 0.8;
  ctx.beginPath();
  ctx.rect(x - hl, deck, hl * 2, y - deck - u * 0.016);
  ctx.fillStyle = skirt.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = skirt.shade;
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
}

/** Scratch: a rider's throw this frame: the wind-up (0..1), the follow-through (1 at the release, 0 by 0.3 of the flight), the way it goes, and how much the throw holds the pose (0..1). */
const THROWING = { wind: 0, fly: 0, dir: 0, hold: 0, k: -1 };

function riderThrow(t: number, which: number, rider: number): typeof THROWING {
  THROWING.wind = 0;
  THROWING.fly = 0;
  THROWING.dir = 0;
  THROWING.hold = 0;
  THROWING.k = -1;
  for (let k = 0; k < THROWS.length; k++) {
    const th = THROWS[k]!;
    if (th.float !== which || th.rider !== rider) continue;
    const at = throwAt(t, k);
    if (at.wind >= 0) {
      THROWING.wind = Math.max(THROWING.wind, at.wind);
      THROWING.hold = Math.max(THROWING.hold, Math.min(1, at.wind * 3));
    }
    if (at.flight >= 0) {
      if (at.flight < 0.3) THROWING.fly = Math.max(THROWING.fly, 1 - at.flight / 0.3);
      THROWING.hold = Math.max(THROWING.hold, at.flight < 0.3 ? 1 : 1 - (at.flight - 0.3) / 0.7);
    }
    if (at.wind >= 0 || at.flight >= 0) {
      THROWING.dir = th.dir;
      THROWING.k = k;
    }
  }
  return THROWING;
}

/**
 * A skeleton dancing on the float at the band's beat phase `p`: bouncing on every beat, swaying
 * every two with its hat tipping, one white glove waving overhead and the other pumping.
 */
function dance(f: Figure, i: number, t: number, p: number): void {
  const b = (Math.sin(p + i * 2.1) + 1) / 2;
  const sway = Math.sin(p / 2 + i * 1.3);
  const wave = t * 6 + i * 2;
  f.m = i === 1 ? -1 : 1;
  f.lift = 0.008 * b;
  f.lean = 0.12 * sway;
  f.hatTilt = 0.16 * Math.sin(p / 2 + i * 1.3 + 0.9);
  f.handLx = -0.018 + 0.018 * Math.sin(wave);
  f.handLy = -0.183 + 0.005 * Math.cos(wave);
  f.handRx = 0.036;
  f.handRy = -0.1 - 0.03 * b;
  f.mouth = 0.3 + 0.5 * b;
}

/**
 * The riders of float `which` (0 the skeletons, 1 the jester's riders) at center x, standing at
 * `stand` behind the body's side, which hides them to the waist: masks or skulls, hats and arms
 * over it, throwing; `p` is the band's beat phase.
 */
function riders(ctx: Ctx, s: Scene, which: number, x: number, stand: number, lw: number, p: number): void {
  const u = s.u;
  const crew = which === 0 ? SKELETONS : RIDERS;
  for (let i = 0; i < crew.length; i++) {
    const f = crew[i]!;
    const rx = x + RIDER_X[i]! * u;
    const th = riderThrow(s.t, which, i);
    const { wind, fly } = th;
    if (which === 0) {
      dance(f, i, s.t, p);
      if (th.dir !== 0) {
        // The throw takes over the near arm and the lean from the dance, and gives them back after.
        const k = th.hold;
        f.m = th.dir;
        f.handRx += (0.035 - wind * 0.05 + fly * 0.09 - f.handRx) * k;
        f.handRy += (-0.1 - wind * 0.06 - fly * 0.08 - (1 - wind - fly) * 0.02 - f.handRy) * k;
        f.lean += (-wind * 0.15 + fly * 0.3 - f.lean) * k;
        f.mouth = Math.max(f.mouth, fly);
      }
    } else {
      f.m = th.dir !== 0 ? th.dir : i === 0 ? -1 : 1;
      const wave = Math.sin(s.t * 3 + i * 2.1);
      f.handLx = -0.03;
      f.handLy = -0.1 + wave * 0.01;
      f.handRx = 0.035 + wind * -0.05 + fly * 0.09;
      f.handRy = -0.1 - wind * 0.06 - fly * 0.08 - (1 - wind - fly) * (0.02 + wave * 0.015);
      f.lean = -wind * 0.15 + fly * 0.3;
      f.mouth = 0.4 + fly * 0.5;
    }
    figure(ctx, f, rx, stand, u, lw);
    if (wind > 0.1) {
      const h = nearHand(f, rx, stand, u);
      ctx.beginPath();
      beadLoop(ctx, h.x, h.y, u * 0.007, u * 0.016, u * 0.0025, 7);
      ctx.fillStyle = BEAD_COLORS[th.k % BEAD_COLORS.length]!.body;
      ctx.fill();
      ink(ctx, lw * 0.5, INK);
      ctx.fill();
    }
  }
}

/** The jester's float at center x (screen px), its wheels on the route at y; `p` is the band's beat phase. */
function jesterFloat(ctx: Ctx, s: Scene, x: number, y: number, lw: number, p: number): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  chassis(ctx, s, x, y, lw, FLOAT_SKIRT);
  const bodyH = BODY_H * u;
  riders(ctx, s, 1, x, deck - bodyH + RIDER_DOWN * u, lw, p);
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

// ---------------------------------------------------------------- the skeleton krewe's float

/** How many swags drape the top of the skeleton float's side, and how deep they sag (u). */
const BONE_SWAGS = 6;
const BONE_SAG = 0.013;

/** A cartoon bone at (x, y), `len` long with knobs of radius r, turned by `a`: inked as one shape. */
function bone(ctx: Ctx, x: number, y: number, len: number, r: number, a: number, lw: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.rect(-len / 2, -r * 0.55, len, r * 1.1);
  circle(ctx, -len / 2, -r * 0.62, r);
  circle(ctx, -len / 2, r * 0.62, r);
  circle(ctx, len / 2, -r * 0.62, r);
  circle(ctx, len / 2, r * 0.62, r);
  // Ink round the whole, then the fill over the inner strokes, so it reads as one bone.
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.6;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ctx.fillStyle = BONE.light;
  ctx.fillRect(-len / 2 + r * 0.4, -r * 0.4, len - r * 0.8, r * 0.3);
  ctx.restore();
}

/**
 * The krewe's emblem at the prow: a giant grinning skull, rosy-cheeked, in a purple top hat with
 * a gold band and a green feather, tipped at a jaunty angle; it nods to the band by `nod`
 * radians, about its jaw. (x, y) is the cranium's center, R its radius.
 */
function bigSkull(ctx: Ctx, x: number, y: number, R: number, lw: number, nod: number): void {
  ctx.save();
  ctx.translate(x, y + R * 0.9);
  ctx.rotate(nod);
  ctx.translate(-x, -(y + R * 0.9));
  ctx.beginPath();
  block(ctx, x - R * 0.56, y + R * 0.42, R * 1.12, R * 0.62, R * 0.26);
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x, y - R * 0.06, R);
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = BONE.light;
  ctx.beginPath();
  oval(ctx, x - R * 0.42, y - R * 0.6, R * 0.32, R * 0.16, -0.6);
  ctx.fill();
  // Rosy cheeks, big round eye sockets with a glint in each, a little nose.
  ctx.fillStyle = "#ffb0b8";
  ctx.beginPath();
  oval(ctx, x - R * 0.62, y + R * 0.32, R * 0.18, R * 0.12);
  oval(ctx, x + R * 0.62, y + R * 0.32, R * 0.18, R * 0.12);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, x - R * 0.37, y - R * 0.06, R * 0.26, R * 0.31);
  oval(ctx, x + R * 0.37, y - R * 0.06, R * 0.26, R * 0.31);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, x - R * 0.3, y - R * 0.16, R * 0.09);
  circle(ctx, x + R * 0.44, y - R * 0.16, R * 0.09);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x, y + R * 0.14);
  ctx.lineTo(x - R * 0.11, y + R * 0.34);
  ctx.lineTo(x + R * 0.11, y + R * 0.34);
  ctx.closePath();
  ctx.fill();
  // The grin: a row of teeth under a wide smile.
  ctx.beginPath();
  block(ctx, x - R * 0.48, y + R * 0.5, R * 0.96, R * 0.3, R * 0.08);
  ctx.fillStyle = BONE.light;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const tx = x - R * 0.48 + (R * 0.96 * i) / 5;
    ctx.moveTo(tx, y + R * 0.52);
    ctx.lineTo(tx, y + R * 0.78);
  }
  ctx.moveTo(x - R * 0.64, y + R * 0.36);
  ctx.quadraticCurveTo(x, y + R * 0.6, x + R * 0.64, y + R * 0.36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = "round";
  ctx.stroke();
  // The top hat, tipped over one eye.
  ctx.translate(x, y - R * 0.8);
  ctx.rotate(-0.16);
  ctx.beginPath();
  ctx.rect(-R * 1.05, -R * 0.1, R * 2.1, R * 0.2);
  ctx.rect(-R * 0.68, -R * 1.2, R * 1.36, R * 1.12);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.fillRect(-R * 0.5, -R * 1.1, R * 0.22, R * 0.75);
  ctx.beginPath();
  ctx.rect(-R * 0.68, -R * 0.42, R * 1.36, R * 0.26);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // A green feather tucked in the band.
  ctx.beginPath();
  ctx.moveTo(R * 0.45, -R * 0.3);
  ctx.quadraticCurveTo(R * 0.95, -R * 0.9, R * 0.85, -R * 1.55);
  ctx.quadraticCurveTo(R * 0.6, -R * 0.9, R * 0.3, -R * 0.36);
  ctx.closePath();
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.restore();
}

/**
 * A finger: a stick `len` long and `w` wide with a round tip, from its base (x, y) up and tilted
 * by `a` radians (+ to the right), as its own subpath (worked out point by point, so it can share
 * a path with the palm without a turn of the canvas).
 */
function stick(ctx: Ctx, x: number, y: number, len: number, w: number, a: number): void {
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const r = w / 2;
  const tx = x + dx * (len - r);
  const ty = y + dy * (len - r);
  const ang = Math.atan2(dy, dx);
  ctx.moveTo(x + Math.cos(ang - Math.PI / 2) * r, y + Math.sin(ang - Math.PI / 2) * r);
  ctx.lineTo(tx + Math.cos(ang - Math.PI / 2) * r, ty + Math.sin(ang - Math.PI / 2) * r);
  ctx.arc(tx, ty, r, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.lineTo(x + Math.cos(ang + Math.PI / 2) * r, y + Math.sin(ang + Math.PI / 2) * r);
  ctx.closePath();
}

/**
 * A giant white glove rising from a cuff striped purple, green and gold, its wrist at (x, y),
 * waving side to side by `wave` radians: the krewe's wave to the crowd.
 */
function bigGlove(ctx: Ctx, x: number, y: number, u: number, lw: number, wave: number): void {
  const cuff = u * 0.016;
  const palmW = u * 0.034;
  const palmH = u * 0.03;
  const top = -cuff - palmH;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wave);
  // The hand: a palm, four fingers fanned a little and a short thumb, inked round as one shape
  // (the ink fills the slivers between the fingers, so each reads on its own).
  ctx.beginPath();
  block(ctx, -palmW / 2, top, palmW, palmH + u * 0.004, u * 0.009);
  const fw = u * 0.0085;
  const fingers = [0.024, 0.029, 0.028, 0.022];
  for (let i = 0; i < 4; i++) stick(ctx, -palmW / 2 + fw / 2 + (i * (palmW - fw)) / 3, top + u * 0.006, fingers[i]! * u, fw, (i - 1.5) * 0.08);
  stick(ctx, -palmW / 2 + u * 0.003, top + palmH * 0.6, u * 0.017, u * 0.009, -0.95);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 2;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.fillStyle = BONE.light;
  ctx.fill();
  // The cuff: three stripes, flaring a little toward the wrist.
  const stripes = [PURPLE, GREEN, GOLD] as const;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(-u * (0.019 + i * 0.001), -cuff + (i * cuff) / 3, u * (0.038 + i * 0.002), cuff / 3);
    ctx.fillStyle = stripes[i]!.body;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-u * 0.019, -cuff);
  ctx.lineTo(u * 0.019, -cuff);
  ctx.lineTo(u * 0.021, 0);
  ctx.lineTo(-u * 0.021, 0);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  ctx.restore();
}

/**
 * The skeleton krewe's float at center x (screen px), its wheels on the route at y: a purple
 * skirt over the gold wheels, a green body draped along its top in purple and gold swags with
 * gold rosettes and hung with bones, the giant skull at the prow and the waving glove at the stern,
 * and the three skeletons dancing behind its side; `p` is the band's beat phase.
 */
function bonesFloat(ctx: Ctx, s: Scene, x: number, y: number, lw: number, p: number): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  chassis(ctx, s, x, y, lw, PURPLE);
  const bodyH = BODY_H * u;
  const top = deck - bodyH;
  riders(ctx, s, 0, x, top + RIDER_DOWN * u, lw, p);
  ctx.beginPath();
  block(ctx, x - hl, top, hl * 2, bodyH, u * 0.006);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(x - hl, deck - u * 0.012, hl * 2, u * 0.006);
  // The bones hung along the side, tilted by turns.
  for (let i = 0; i < 3; i++) bone(ctx, x + (i - 1) * u * 0.11, top + bodyH * 0.62, u * 0.045, u * 0.0065, i % 2 ? 0.22 : -0.22, lw);
  // The swags along the top, purple and gold, with a rosette where they meet.
  const span = (hl * 2) / BONE_SWAGS;
  for (let i = 0; i < BONE_SWAGS; i++) {
    const c = i % 2 ? GOLD : PURPLE;
    const x0 = x - hl + i * span;
    ctx.beginPath();
    swagPath(ctx, x0, x0 + span, top + lw * 0.5, BONE_SAG * u);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
  }
  ctx.beginPath();
  for (let i = 0; i <= BONE_SWAGS; i++) circle(ctx, x - hl + i * span, top + u * 0.006, u * 0.0075);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fill();
  bigSkull(ctx, x + hl * 0.74, top - u * 0.022, u * 0.03, lw, 0.1 * Math.sin(p));
  bigGlove(ctx, x - hl * 0.72, top + u * 0.006, u, lw, 0.26 * Math.sin(p / 2));
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
  // The band's beat: its phase, and 0..1 on it.
  const p = (hx / STRIDE) * Math.PI * 2;
  const beat = (Math.sin(p) + 1) / 2;
  // Back to front along the route: the last units first, so the float's beads fly over the band.
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [unit, pos] = UNITS[i]!;
    const ux = hx - pos;
    if (ux < -half || ux > half) continue;
    const x = cx + ux * u;
    stride = (ux / STRIDE) * Math.PI * 2;
    if (unit === "float") jesterFloat(ctx, s, x, y, lw, p);
    else if (unit === "bones") bonesFloat(ctx, s, x, y, lw, p);
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
    ctx.fillStyle = BEAD_COLORS[i % BEAD_COLORS.length]!.body;
    ctx.fill();
    ink(ctx, lw * 0.5, INK);
    ctx.fill();
    ctx.restore();
  }
}

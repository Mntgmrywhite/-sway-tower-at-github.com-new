import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BASKET_PALE,
  BIKE,
  BRASS,
  CHROME,
  COLOR_GUARD,
  CREAM,
  DENIM,
  DOG,
  DOG_SPOT,
  DRESS,
  DRESS_WHITE,
  DRUM_HEAD,
  DRUM_SHELL,
  FLAG,
  GOLD,
  HAIR_BLONDE,
  HAIR_BROWN,
  HAIR_DARK,
  HAIR_WHITE,
  HEADLAMP,
  HUBCAP,
  INK,
  KID_SHIRTS,
  LADDER,
  MAJOR_COAT,
  MARIGOLD,
  NAVY,
  PINK_SKIRT,
  POLISH,
  RED,
  SADDLE,
  SAM_COAT,
  SAND,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  STICK,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TIRE,
  TONGUE,
  TROUSERS,
  TRUCK,
  UNIFORM,
  WINDSCREEN,
  shades,
  type Shades,
} from "./colors";
import { usFlag } from "./flag";
import { figure, limb, type Frame, type Look } from "./folk";
import { ballCap, bow, braid, fireHelmet, garrison, inked, medals, sash, shako, topHat } from "./hats";
import { breeze } from "./life";
import { ADULT, armTo, build, CHILD, ease, fract, J, legTo, phaseAt, pose, scaled, trunk, walk, wave, type Build, type Gait, type Pose, type WalkStyle } from "./rig";
import { smooth, starPath, swagBand } from "./shapes";
import { centerX, keyW } from "./square";

// The Fourth of July parade, passing left to right across the square in front of the bandstand
// (the owner's rule: every action in a run's first ten seconds, so it steps in at PARADE_AT and
// the last of it has passed the tower by ten seconds; it comes round the block again every
// PERIOD). In order: the drum major high-stepping, his baton twirling before him and tossed up
// spinning now and then to be caught again; a veteran of the color guard in his garrison cap and
// medals, bearing the flag; two snare drummers, sticks flying; the glockenspiel lyre; the
// sousaphone, cheeks puffing on the beat; the vintage fire truck with its brass bell, its driver
// waving and two kids in the back waving little flags; Uncle Sam on stilts (he tips his hat as
// he passes the bandstand); a girl on her bike with streamers flying, her ponytail streaming; and
// a spotted dog bounding after her, ears flopping.
//
// Every marcher is a storybook figure on a rig (rig.ts, folk.ts): the band steps together but
// each a little out of the others' time, with its own build, face and gait, the feet planted on
// the route while they bear weight, knees lifting, arms swinging or busy with an instrument, the
// plumes, ribbons, coat-tails and flags trailing the motion a moment behind. It all stays below
// the tower's floor line; every flag is the Stars and Stripes (flag.ts).
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

export type Unit = "drumMajor" | "flag" | "snare" | "snare2" | "lyre" | "tuba" | "truck" | "uncleSam" | "bike" | "dog";

/** Each unit's distance behind the drum major (u), and how far either side of that it reaches. */
export const UNITS: readonly { unit: Unit; back: number; reach: number }[] = [
  { unit: "drumMajor", back: 0, reach: 0.05 },
  { unit: "flag", back: 0.13, reach: 0.05 },
  { unit: "snare", back: 0.25, reach: 0.04 },
  { unit: "snare2", back: 0.34, reach: 0.04 },
  { unit: "lyre", back: 0.45, reach: 0.04 },
  { unit: "tuba", back: 0.57, reach: 0.05 },
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

/** How far (u) the nearest unit of the parade is from screen x at time t (Infinity while none is on its way): the crowd watches it. */
export function nearestUnit(s: Scene, x: number, t: number): number {
  if (t < PARADE_AT) return Infinity;
  const head = paradeX(t) * s.u;
  let best = Infinity;
  for (const { back } of UNITS) {
    const d = (head - back * s.u - x) / s.u;
    if (Math.abs(d) < Math.abs(best)) best = d;
  }
  return best;
}

/** Uncle Sam tips his hat as he passes the bandstand: 0 away from it, 1 right in front of the tower. */
export function hatTip(s: Scene, t: number): number {
  const d = Math.abs(unitX(s, "uncleSam", t) - centerX(s)) / s.u;
  return 1 - smooth(0.04, 0.16, d);
}

// ---------------------------------------------------------------- the band's step

/** The figures' size (a grown-up ADULT at this scale), the side they are seen from, the band's cadence (cycles a second: two steps). */
const FS = 1.06;
const VIEW = Math.PI * 0.39;
const CADENCE = 1.95;

/** A marcher's gait at the parade's pace: its own phase, how high it lifts its knees. */
function marchGait(fs: number, phase: number, high: number, cadence = CADENCE): Gait {
  return { speed: SPEED / (fs * Math.sin(VIEW)), cadence, phase, duty: 0.54, lift: 0.0045, high, stance: 0.0052 };
}

const MARCH: WalkStyle = { arms: 0.32, elbow: 0.45, lean: 0.02, twist: 0.16, bounce: 0.0012, nod: 0.03 };

/** The scratch pose every marcher is posed in, in turn. */
const P = pose();

/** The pelvis's bob a moment ago against now (u): loose things trail it. */
function bobLag(_b: Build, g: Gait, t: number): number {
  const p0 = phaseAt(g, t);
  const p1 = phaseAt(g, t - 0.09);
  const c = (k: number) => (Math.cos((k - 0.06) * Math.PI * 4) + 1) / 2;
  return (c(p1) - c(p0)) * 0.004 * (1 + g.high);
}

/** Sets the face: looking ahead along the route, glancing toward the crowd (toward us) now and then. */
function faceOf(t: number, id: number, toward = 0.5): void {
  const k = Math.max(0, Math.sin(t * 0.7 + id * 2.3)) ** 3;
  P.face = VIEW - toward * k * 0.9;
  P.tilt = 0;
  P.brow = k * 0.4;
  P.mouth = 0;
  P.puff = 0;
  P.blink = blink(t, id);
}

/** Blinks every few seconds, each on its own rhythm. */
function blink(t: number, id: number): number {
  const every = 2.6 + hash(id * 7 + 3) * 2.8;
  const at = fract(t / every + hash(id * 11)) * every;
  return at < 0.13 ? Math.sin((at / 0.13) * Math.PI) : 0;
}

/** The line round everything in the parade (px), and a figure's scale (px a u). */
function lineOf(s: Scene): number {
  return keyW(s) * 0.9;
}

/** Puts a point of the pose's body space on the screen as the painter does (after `figure` has run, or with the same numbers). */
function onScreen(x: number, foot: number, k: number, l: number, f: number, y: number): readonly [number, number] {
  return [x + k * (l * Math.cos(VIEW) + f * Math.sin(VIEW)), foot + k * y];
}

// ---------------------------------------------------------------- the drum major

const MAJOR_BUILD = scaled(build({ thigh: 0.039, shin: 0.037, spine: 0.047, chestW: 0.0158, depth: 0.0125, bust: 0.003, belly: 0.0005 }), FS * 1.02);
const MAJOR_LOOK: Look = { skin: SKIN_BROWN, hair: HAIR_DARK, style: "crop", top: MAJOR_COAT, sleeves: "long", lower: TROUSERS, legs: "trousers", shoes: POLISH, gloves: DRESS_WHITE, mustache: true };
const MAJOR_GAIT = marchGait(FS * 1.02, 0.03, 1);
/** The baton is tossed up spinning every TOSS_EVERY seconds (first at TOSS_AT) and caught TOSS_TIME later. */
export const TOSS_AT = 3.4;
export const TOSS_EVERY = 6.5;
export const TOSS_TIME = 0.9;

/** The drum major: a tall navy coat with gold braid and epaulettes, a white cross-belt, white gloves, a towering shako with a white plume; he high-steps, his left hand on his hip, the baton twirling overhead in his right, tossed up spinning now and then and caught. */
function drumMajor(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const b = MAJOR_BUILD;
  const k = s.u;
  P.view = VIEW;
  walk(P, b, MAJOR_GAIT, { ...MARCH, arms: 0.2, lean: -0.04 }, t);
  faceOf(t, 1, 0.3);
  P.tilt = -0.08;
  P.mouth = 0.2;
  // The toss: the hand goes up to send it and to catch it; he watches it.
  const tk = t >= TOSS_AT ? fract((t - TOSS_AT) / TOSS_EVERY) * TOSS_EVERY : -1;
  const tossing = tk >= 0 && tk < TOSS_TIME;
  const tossK = tossing ? tk / TOSS_TIME : 0;
  const [cl, cf, cy] = [P.j[J.chest * 3]!, P.j[J.chest * 3 + 1]!, P.j[J.chest * 3 + 2]!];
  const reachUp = tossing ? 0.006 * Math.sin(tossK * Math.PI) : 0;
  const twirl = t * 2.2 * Math.PI * 2;
  // The baton hand: out before him at the shoulder, circling a little as it twirls; up high to toss and to catch.
  const up = tossing ? Math.sin(tossK * Math.PI) : 0;
  const hy = cy + 0.006 - up * 0.05 - reachUp;
  armTo(P, b, true, cl - 0.006 + Math.cos(twirl) * 0.0018, cf + 0.03 - up * 0.008 + Math.sin(twirl) * 0.002, hy, -0.6, -0.5, 0.5);
  // The other on his hip, elbow out.
  armTo(P, b, false, P.j[J.hipF * 3]! + 0.01, P.j[J.hipF * 3 + 1]! + 0.004, P.j[J.pelvis * 3 + 2]! - 0.006, 1, -0.3, 0);
  if (tossing) {
    P.face = VIEW - 0.15;
    P.tilt = -0.35 * Math.sin(tossK * Math.PI);
    P.brow = 0.8;
  }
  const bob = bobLag(b, MAJOR_GAIT, t) * 220;
  const kw = lineOf(s);
  figure(ctx, P, b, MAJOR_LOOK, x, foot, k, 1, kw, { lod: 2, nearLast: up > 0.3 }, {
    body: (c, F) => {
      sash(c, F, DRESS_WHITE, F.k * 0.004);
      braid(c, F, GOLD, 3, true);
    },
    hat: (c, F) => shako(c, F, P, MAJOR_COAT, DRESS_WHITE, bob, 1.2),
    front: (c, F) => baton(c, F, t, tossK),
  });
}

/** The baton: a chrome rod with white knobs, twirling in the hand, or up in the air spinning. */
function baton(ctx: Ctx, F: Frame, t: number, toss: number): void {
  const len = F.k * 0.026;
  let x = F.x[J.handN]!;
  let y = F.y[J.handN]! - F.k * 0.002;
  let a = t * 2.2 * Math.PI * 2;
  if (toss > 0) {
    y -= F.k * 0.075 * 4 * toss * (1 - toss);
    x += F.k * 0.004 * Math.sin(toss * Math.PI);
    a = t * 5.5 * Math.PI * 2;
  }
  // Seen edge-on as it spins: foreshortened along its turn.
  const c = Math.cos(a);
  const sn = Math.sin(a) * 0.45;
  ctx.beginPath();
  ctx.moveTo(x - c * len, y - sn * len);
  ctx.lineTo(x + c * len, y + sn * len);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = F.k * 0.0042 + F.kw;
  ctx.stroke();
  ctx.strokeStyle = CHROME.light;
  ctx.lineWidth = F.k * 0.0042;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - c * len, y - sn * len, F.k * 0.0052, 0, Math.PI * 2);
  ctx.moveTo(x + c * len + F.k * 0.0042, y + sn * len);
  ctx.arc(x + c * len, y + sn * len, F.k * 0.0042, 0, Math.PI * 2);
  inked(ctx, DRESS_WHITE, F.kw * 0.8);
}

// ---------------------------------------------------------------- the color guard

const VET_BUILD = scaled(build({ belly: 0.0065, waistW: 0.0138, hipW: 0.0146, chestW: 0.0154, depth: 0.0128, spine: 0.045, head: 0.0162 }), FS * 0.98);
const VET_COAT = shades(COLOR_GUARD, 0.4, 0.3);
const VET_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_WHITE, style: "fringe", top: VET_COAT, sleeves: "long", lower: shades(SAND, 0.45, 0.26), legs: "trousers", shoes: POLISH, mustache: true };
const VET_GAIT = marchGait(FS * 0.98, 0.47, 0.12);
/** The color guard's flag: its length and depth (u). */
const COLORS_W = 0.064;
const COLORS_H = 0.042;

/** The color guard: a veteran in his garrison cap, medals on his chest, bearing the flag on a tall pole socketed at his belt, both hands on it, the flag rippling back from it. */
function flagBearer(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const b = VET_BUILD;
  const k = s.u;
  P.view = VIEW;
  walk(P, b, VET_GAIT, { ...MARCH, arms: 0, lean: -0.02, twist: 0.08 }, t);
  faceOf(t, 2, 0.4);
  P.mouth = 0.1;
  // The pole: its foot in the cup at his belt, leaning a little forward, up past his head.
  const pl = P.j[J.pelvis * 3]! - 0.002;
  const pf = P.j[J.pelvis * 3 + 1]! + b.depth * 1.15;
  const py = P.j[J.pelvis * 3 + 2]! + 0.004;
  const topY = py - 0.16;
  const topF = pf + 0.012;
  const on = (k2: number) => [pl, pf + (topF - pf) * k2, py + (topY - py) * k2] as const;
  const [l1, f1, y1] = on(0.12);
  const [l2, f2, y2] = on(0.33);
  armTo(P, b, true, l1, f1, y1, -0.6, -0.6, 0.3);
  armTo(P, b, false, l2, f2, y2, 0.8, -0.5, 0.3);
  const kw = lineOf(s);
  const [bx, by] = onScreen(x, foot, k, pl, pf, py);
  const [tx, ty] = onScreen(x, foot, k, pl, topF, topY);
  const wind = breeze(t);
  figure(ctx, P, b, VET_LOOK, x, foot, k, 1, kw, { lod: 2, farFront: true }, {
    body: (c, F) => {
      medals(c, F);
      // The pole, in front of the body and behind the hands.
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(tx, ty);
      c.lineCap = "round";
      c.strokeStyle = INK;
      c.lineWidth = F.k * 0.0042 + kw;
      c.stroke();
      c.strokeStyle = CHROME.body;
      c.lineWidth = F.k * 0.0042;
      c.stroke();
    },
    hat: (c, F) => garrison(c, F, P, VET_COAT),
    front: (c) => {
      // The flag flies back from the pole's head, its canton by the pole; the gold finial on top.
      usFlag(c, tx - k * 0.002, ty + k * 0.004, COLORS_W * k, COLORS_H * k, -1, COLORS_H * k * (0.1 + 0.06 * wind), t * 7, FLAG);
      c.beginPath();
      starPath(c, tx, ty - k * 0.002, k * 0.0075);
      inked(c, GOLD, kw * 0.7);
    },
  });
}

// ---------------------------------------------------------------- the snare drummers

const BAND_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_BROWN, style: "crop", top: UNIFORM, sleeves: "long", lower: TROUSERS, legs: "trousers", shoes: POLISH };
const SNARE_BUILDS = [
  scaled(build({ thigh: 0.038, shin: 0.036, spine: 0.047, chestW: 0.0142, waistW: 0.0115, depth: 0.0112 }), FS),
  scaled(build({ thigh: 0.033, shin: 0.031, spine: 0.043, chestW: 0.0156, waistW: 0.0138, hipW: 0.0145, belly: 0.004, head: 0.0164 }), FS),
];
const SNARE_LOOKS: Look[] = [
  { ...BAND_LOOK, skin: SKIN_FAIR, hair: HAIR_BROWN },
  { ...BAND_LOOK, skin: SKIN_BROWN, hair: HAIR_DARK, style: "curls" },
];
const SNARE_GAITS = [marchGait(FS, 0.92, 0.35), marchGait(FS, 0.06, 0.28)];

/** A snare drummer: the drum slung at the hip, bouncing with the step, the sticks flying in a rudiment, the drummer watching them. */
function snare(ctx: Ctx, s: Scene, x: number, foot: number, t: number, which: number): void {
  const b = SNARE_BUILDS[which]!;
  const g = SNARE_GAITS[which]!;
  const k = s.u;
  P.view = VIEW;
  walk(P, b, g, { ...MARCH, arms: 0 }, t);
  faceOf(t, 3 + which, 0.3);
  P.tilt = 0.12;
  P.face = VIEW - 0.05;
  // The drum on its sling at the near hip, swinging a moment behind the step.
  const swing = bobLag(b, g, t);
  const dl = P.j[J.pelvis * 3]! - 0.004;
  const df = P.j[J.pelvis * 3 + 1]! + b.depth + 0.014;
  const dy = P.j[J.pelvis * 3 + 2]! + 0.008 + swing * 1.5;
  const R = 0.0175;
  const top = dy - 0.008;
  // A rudiment: four strokes a step, the hands by turns, an accent on the one.
  const beat = (t * CADENCE * 4 + which * 0.37) % 2;
  const lift = (h: number) => {
    const k2 = fract(h);
    return 0.004 + 0.012 * Math.max(0, Math.sin(k2 * Math.PI * 2 - 0.3)) ** 1.5;
  };
  const upN = lift(beat / 2);
  const upF = lift(beat / 2 + 0.5);
  armTo(P, b, true, dl - 0.004, df - 0.004, top - 0.009 - upN, -0.5, -1, 0.2);
  armTo(P, b, false, dl + 0.004, df - 0.008, top - 0.008 - upF, 0.6, -1, 0.2);
  P.mouth = Math.max(0, Math.sin(t * 1.3 + which)) > 0.6 ? 0.45 : 0.05;
  const kw = lineOf(s);
  const [cx, cy] = onScreen(x, foot, k, dl, df, dy);
  const bobbing = bobLag(b, g, t) * 200;
  figure(ctx, P, b, SNARE_LOOKS[which]!, x, foot, k, 1, kw, { lod: 2, farFront: true }, {
    body: (c, F) => {
      sash(c, F, DRESS_WHITE, F.k * 0.0035);
      braid(c, F, GOLD, 2);
      drum(c, F, cx, cy, R * k, kw);
    },
    hat: (c, F) => shako(c, F, P, UNIFORM, DRESS_WHITE, bobbing, 1),
    front: (c, F) => {
      // The sticks: from each hand forward and down to the drum's head (both in one line, then one color).
      c.beginPath();
      for (const near of [false, true]) {
        c.moveTo(F.x[near ? J.handN : J.handF]!, F.y[near ? J.handN : J.handF]!);
        c.lineTo(cx + (near ? -0.25 : 0.25) * R * k + k * 0.004, cy - R * k * 0.5 - (near ? upN : upF) * k * 0.8);
      }
      c.lineCap = "round";
      c.strokeStyle = INK;
      c.lineWidth = k * 0.0052 + kw * 0.7;
      c.stroke();
      c.strokeStyle = STICK;
      c.lineWidth = k * 0.0052;
      c.stroke();
    },
  });
}

/** A drumstick from the hand to its tip, the tip a little bead. */
function stick(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, kw: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 2 + kw;
  ctx.stroke();
  ctx.strokeStyle = STICK;
  ctx.lineWidth = w * 2;
  ctx.stroke();
}

/** A snare drum seen a little from above: a navy shell with gold cords laced in a zigzag, a cream head, chrome hoops. */
function drum(ctx: Ctx, F: Frame, x: number, y: number, R: number, kw: number): void {
  const h = R * 0.95;
  ctx.beginPath();
  ctx.moveTo(x - R, y - h * 0.5);
  ctx.lineTo(x - R, y + h * 0.5);
  ctx.ellipse(x, y + h * 0.5, R, R * 0.32, 0, Math.PI, 0, true);
  ctx.lineTo(x + R, y - h * 0.5);
  ctx.closePath();
  inked(ctx, DRUM_SHELL.body, kw);
  ctx.fillStyle = DRUM_SHELL.light;
  ctx.fillRect(x - R * 0.82, y - h * 0.4, R * 0.28, h * 0.9);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(0.7, R * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const xa = x - R * 0.8 + (i * R * 1.6) / 5;
    ctx.moveTo(xa, y - h * 0.38);
    ctx.lineTo(xa + R * 0.16, y + h * 0.55);
    ctx.lineTo(xa + R * 0.32, y - h * 0.38);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.5, R, R * 0.32, 0, 0, Math.PI * 2);
  inked(ctx, DRUM_HEAD, kw);
  void F;
}

// ---------------------------------------------------------------- the glockenspiel

const LYRE_BUILD = scaled(build({ thigh: 0.035, shin: 0.033, chestW: 0.0145, depth: 0.0118, bust: 0.0045, waistW: 0.0108, hipW: 0.0145, head: 0.0158 }), FS * 0.98);
const LYRE_LOOK: Look = { ...BAND_LOOK, skin: SKIN_TAN, hair: HAIR_DARK, style: "bun" };
const LYRE_GAIT = marchGait(FS * 0.98, 0.15, 0.3);

/** The glockenspiel player: the gold lyre of bars held up on its pole before her face, a mallet in her other hand picking out the tune bar by bar. */
function lyre(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const b = LYRE_BUILD;
  const k = s.u;
  P.view = VIEW;
  walk(P, b, LYRE_GAIT, { ...MARCH, arms: 0 }, t);
  faceOf(t, 6, 0.25);
  P.mouth = 0.15;
  const pl = P.j[J.pelvis * 3]! - 0.002;
  const pf = P.j[J.pelvis * 3 + 1]! + b.depth * 1.2;
  const py = P.j[J.pelvis * 3 + 2]! + 0.002;
  // The lyre's frame: up the pole to before her chest, its top under her chin.
  const ly = P.j[J.chest * 3 + 2]! + 0.013;
  const lf = pf + 0.02;
  armTo(P, b, false, pl + 0.002, pf + 0.002, py - 0.04, 0.8, -0.6, 0.3);
  // The mallet hand moves bar to bar: a note on every beat, rising and falling with the tune.
  const note = Math.floor(t * CADENCE * 2);
  const bar = Math.floor(hash(note * 7 + 3) * 5);
  const strike = Math.max(0, Math.sin(fract(t * CADENCE * 2) * Math.PI * 2));
  const by = ly + 0.013 - bar * 0.005;
  armTo(P, b, true, pl - 0.006, lf - 0.004, by - 0.004 - strike * 0.006, -0.5, -1, 0.3);
  const kw = lineOf(s);
  const [px0, py0] = onScreen(x, foot, k, pl, pf, py);
  const [lx, lyy] = onScreen(x, foot, k, pl, lf, ly);
  figure(ctx, P, b, LYRE_LOOK, x, foot, k, 1, kw, { lod: 2, farFront: true }, {
    body: (c, F) => {
      sash(c, F, DRESS_WHITE, k * 0.0035);
      lyreFrame(c, px0, py0, lx, lyy, k, kw);
    },
    hat: (c, F) => shako(c, F, P, UNIFORM, STRIPE_RED, bobLag(b, LYRE_GAIT, t) * 200, 0.9),
    front: (c, F) => {
      const hx = F.x[J.handN]!;
      const hy = F.y[J.handN]!;
      const mx = lx + k * 0.004;
      const my = lyy + (0.013 - bar * 0.005) * k - strike * k * 0.004;
      stick(c, hx, hy, mx, my, k * 0.0018, kw * 0.6);
      c.beginPath();
      c.arc(mx, my, k * 0.0034, 0, Math.PI * 2);
      inked(c, RED, kw * 0.6);
    },
  });
}

/** The lyre: its pole from the belt, a gold lyre frame of curving arms, and its five bars, longest at the foot. */
function lyreFrame(ctx: Ctx, px: number, py: number, x: number, y: number, k: number, kw: number): void {
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(x, y + k * 0.022);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.0034 + kw;
  ctx.stroke();
  ctx.strokeStyle = BRASS.shade;
  ctx.lineWidth = k * 0.0034;
  ctx.stroke();
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(x + side * k * 0.012, y + k * 0.022);
    ctx.quadraticCurveTo(x + side * k * 0.023, y + k * 0.004, x + side * k * 0.008, y - k * 0.01);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.0036 + kw;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = k * 0.0036;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const w = k * (0.022 - i * 0.003);
    ctx.rect(x - w / 2, y + k * 0.015 - i * k * 0.005, w, k * 0.003);
  }
  inked(ctx, BRASS.light, kw * 0.6);
  // A red tassel at the top.
  ctx.beginPath();
  circle(ctx, x, y - k * 0.012, k * 0.0036);
  inked(ctx, RED, kw * 0.6);
}

// ---------------------------------------------------------------- the sousaphone

const TUBA_BUILD = scaled(build({ chestW: 0.0162, waistW: 0.015, hipW: 0.0152, depth: 0.0135, belly: 0.006, thigh: 0.035, shin: 0.033, head: 0.0166 }), FS);
const TUBA_LOOK: Look = { ...BAND_LOOK, skin: SKIN_BROWN, hair: HAIR_DARK, style: "crop", mustache: true };
const TUBA_GAIT = marchGait(FS, 0.36, 0.18);

/** The sousaphone player: the brass coil round the body over the left shoulder, the great bell up over the head facing ahead and swaying with the step, a hand on the valves, cheeks puffing on the oom of each beat. */
function tuba(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const b = TUBA_BUILD;
  const g = TUBA_GAIT;
  const k = s.u;
  P.view = VIEW;
  walk(P, b, g, { ...MARCH, arms: 0, lean: -0.05 }, t);
  faceOf(t, 8, 0.2);
  // The oom: a puff on each downbeat.
  const oom = Math.max(0, Math.sin(fract(t * CADENCE) * Math.PI * 2));
  P.puff = oom > 0.4 ? oom : 0;
  P.brow = 0.3 * oom;
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  // The valves before the chest; the other hand on the tubing at the side.
  armTo(P, b, true, cl - 0.004, cf + b.depth + 0.008, cy + 0.016 + oom * 0.0015, -0.6, -0.8, 0.4);
  armTo(P, b, false, cl + 0.006, cf + b.depth * 0.6, cy + 0.03, 0.8, -0.6, 0.3);
  const kw = lineOf(s);
  const sway = bobLag(b, g, t) * 260;
  const [ox, oy] = onScreen(x, foot, k, cl, cf, cy + 0.02);
  figure(ctx, P, b, TUBA_LOOK, x, foot, k, 1, kw, { lod: 2, farFront: true }, {
    back: (c, F) => hornNeck(c, F, k, kw, sway),
    body: (c, F) => coil(c, F, ox, oy, k, kw),
    hat: (c, F) => bandCap(c, F, P, UNIFORM),
    front: (c, F) => bell(c, F, k, kw, sway),
  });
}

/** The sousaphone's coil: a broad brass ring round the body, lit along its top, the valves before the chest. */
function coil(ctx: Ctx, F: Frame, x: number, y: number, k: number, kw: number): void {
  const r = k * 0.026;
  ctx.beginPath();
  ctx.ellipse(x - k * 0.002, y, r * 1.05, r * 0.82, -0.25, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.0085 + kw * 2;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = k * 0.0085;
  ctx.stroke();
  // The valves.
  const vx = F.x[J.handN]! + k * 0.002;
  const vy = F.y[J.handN]! + k * 0.004;
  ctx.fillStyle = BRASS.light;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(vx - k * 0.006 + i * k * 0.004, vy - k * 0.002, k * 0.0028, k * 0.01);
  ctx.fill();
}

/** Where the bell's mouth is: over the head, a little behind, swaying. */
function bellAt(F: Frame, k: number, sway: number): readonly [number, number] {
  return [F.x[J.head]! - k * 0.004 + sway * k * 0.002, F.y[J.head]! - F.headR - k * 0.03 + Math.abs(sway) * k * 0.001];
}

/** The horn's neck from behind the far shoulder up behind the head to the bell (drawn behind the player). */
function hornNeck(ctx: Ctx, F: Frame, k: number, kw: number, sway: number): void {
  const [bx, by] = bellAt(F, k, sway);
  const sx = F.x[J.shF]! - k * 0.01;
  const sy = F.y[J.shF]! + k * 0.004;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx - k * 0.022, sy - k * 0.02, bx - k * 0.03, by + k * 0.02, bx - k * 0.012, by + k * 0.004);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.009 + kw * 2;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = k * 0.009;
  ctx.stroke();
}

/** The bell: up over the head, its mouth facing ahead, swaying a moment behind the step; the mouthpiece's pipe to the lips. */
function bell(ctx: Ctx, F: Frame, k: number, kw: number, sway: number): void {
  const [bx, by] = bellAt(F, k, sway);
  // The mouthpiece pipe from the coil's top to the lips.
  const mx = F.x[J.head]! + F.fd * F.headR * 0.95;
  const my = F.y[J.head]! + F.headR * 0.42;
  ctx.beginPath();
  ctx.moveTo(mx + F.fd * k * 0.004, my + k * 0.001);
  ctx.quadraticCurveTo(mx + F.fd * k * 0.012, my + k * 0.006, mx + F.fd * k * 0.008, my + k * 0.02);
  ctx.strokeStyle = BRASS.shade;
  ctx.lineWidth = k * 0.0034;
  ctx.stroke();
  // The bell's mouth: a wide brass flare seen at an angle, its rim, a dark throat, one line round it.
  const r = k * 0.03;
  const flare = () => {
    ctx.moveTo(bx - k * 0.012, by - r * 0.35);
    ctx.quadraticCurveTo(bx + k * 0.002, by - r * 0.4, bx + k * 0.006, by - r);
    ctx.lineTo(bx + k * 0.006, by + r);
    ctx.quadraticCurveTo(bx + k * 0.002, by + r * 0.4, bx - k * 0.012, by + r * 0.35);
    ctx.closePath();
  };
  ctx.beginPath();
  flare();
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + k * 0.007, by, r * 0.36, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = BRASS.light;
  ctx.fill();
  ctx.fillStyle = BRASS.shade;
  ctx.beginPath();
  ctx.ellipse(bx + k * 0.0085, by, r * 0.22, r * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  flare();
  ctx.moveTo(bx + k * 0.007 + r * 0.36, by);
  ctx.ellipse(bx + k * 0.007, by, r * 0.36, r, 0, 0, Math.PI * 2);
  ctx.lineWidth = kw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** A band cap: a flat crown with a black peak and a gold band. */
function bandCap(ctx: Ctx, F: Frame, Q: Pose, color: Shades): void {
  ballCap(ctx, F, Q, color.body);
  const hx = F.x[J.head]!;
  const hy = F.y[J.head]!;
  const r = F.headR;
  ctx.fillStyle = GOLD;
  ctx.fillRect(hx - r * 0.95, hy - r * 0.52, r * 1.9, r * 0.16);
}

// ---------------------------------------------------------------- the fire truck

/** How fast the wheels turn: rolling without slip. */
const WHEEL_R = 0.026;

/** A spoked wheel: tire, cream rim, red spokes turned by `roll`, a gold hub. */
function wheel(ctx: Ctx, x: number, y: number, r: number, roll: number, spokes: number, kw: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r + kw * 0.5);
  ctx.fillStyle = TIRE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.72);
  ctx.fillStyle = HUBCAP;
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = roll + (i * Math.PI * 2) / spokes;
    ctx.moveTo(x + Math.cos(a) * r * 0.16, y + Math.sin(a) * r * 0.16);
    ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.2);
  ctx.fillStyle = GOLD;
  ctx.fill();
}

/** The fire truck's flag on its pole at the back of the bed: its length and depth (u). */
const TRUCK_FLAG_W = 0.064;
const TRUCK_FLAG_H = 0.042;
/** The kids riding in the back: their builds, looks, where they stand along the bed, their own rhythm of waving. */
const KID_BUILD = scaled(CHILD, 0.95);
const RIDERS: { look: Look; at: number; rate: number; phase: number; flag: boolean }[] = [
  { look: { skin: SKIN_BROWN, hair: HAIR_DARK, style: "pigtails", ribbon: STRIPE_RED, top: KID_SHIRTS[2], sleeves: "short", lower: shades(PINK_SKIRT), legs: "skirt", shoes: RED }, at: 0.24, rate: 1.7, phase: 0.1, flag: true },
  { look: { skin: SKIN_TAN, hair: HAIR_BLONDE, style: "bob", top: KID_SHIRTS[0], sleeves: "short", lower: shades(DENIM), legs: "skirt", shoes: RED }, at: 0.5, rate: 1.4, phase: 0.3, flag: true },
];
const DRIVER_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_BROWN, style: "crop", top: shades(NAVY), sleeves: "long", lower: shades(NAVY), legs: "trousers", shoes: POLISH, mustache: true };
const DRIVER_BUILD = scaled(ADULT, FS * 0.92);

/** The vintage fire truck float: a rounded hood and fenders, a long red bed with the ladder on top, bunting, a brass bell, a flag flying from the back; a fireman at the wheel who waves now and then, and kids standing in the back waving little flags and bouncing over the bumps. */
function fireTruck(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const k = s.u;
  const kw = lineOf(s);
  const L = k * 0.27;
  const wr = WHEEL_R * k;
  const travel = paradeX(t) * k;
  const roll = travel / wr;
  // The truck's springs: a gentle bounce over the bricks.
  const bump = (Math.sin(travel / (k * 0.031)) * 0.6 + Math.sin(travel / (k * 0.047) + 1) * 0.4) * k * 0.0012;
  const x0 = x - L / 2;
  const bedTop = foot - k * 0.068 + bump;
  // The flag on its pole at the back, flying back from it.
  const poleX = x0 + L * 0.035;
  const poleTop = bedTop - k * 0.078;
  ctx.beginPath();
  ctx.moveTo(poleX, bedTop + k * 0.01);
  ctx.lineTo(poleX, poleTop);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.004 + kw;
  ctx.stroke();
  ctx.strokeStyle = CHROME.body;
  ctx.lineWidth = k * 0.004;
  ctx.stroke();
  usFlag(ctx, poleX - k * 0.002, poleTop + k * 0.002, TRUCK_FLAG_W * k, TRUCK_FLAG_H * k, -1, TRUCK_FLAG_H * k * (0.12 + 0.06 * breeze(t)), t * 7 + 2, FLAG);
  // The kids in the back, behind the bed's side: they stand, bounce with the truck, and wave.
  RIDERS.forEach((r, i) => rider(ctx, s, x0 + L * r.at, bedTop + k * 0.012, t, r, i, bump, kw));
  // The driver in the open cab.
  driver(ctx, s, x0 + L * 0.74, bedTop + k * 0.014, t, kw);
  // The body: the bed, the cab's cowl and the long rounded hood, the fenders over the wheels.
  ctx.beginPath();
  ctx.moveTo(x0, bedTop);
  ctx.lineTo(x0 + L * 0.66, bedTop);
  ctx.lineTo(x0 + L * 0.66, bedTop - k * 0.028);
  ctx.quadraticCurveTo(x0 + L * 0.7, bedTop - k * 0.05, x0 + L * 0.76, bedTop - k * 0.05);
  ctx.lineTo(x0 + L * 0.8, bedTop - k * 0.012);
  ctx.quadraticCurveTo(x0 + L * 0.92, bedTop - k * 0.016, x0 + L * 0.985, bedTop + k * 0.002);
  ctx.quadraticCurveTo(x0 + L * 1.01, bedTop + k * 0.026, x0 + L * 0.99, bedTop + k * 0.044);
  ctx.lineTo(x0 + L * 0.02, bedTop + k * 0.044);
  ctx.quadraticCurveTo(x0 - L * 0.01, bedTop + k * 0.02, x0, bedTop);
  ctx.closePath();
  inked(ctx, TRUCK.body, kw);
  ctx.fillStyle = TRUCK.light;
  ctx.beginPath();
  ctx.rect(x0 + L * 0.02, bedTop + k * 0.003, L * 0.62, k * 0.006);
  ctx.moveTo(x0 + L * 0.81, bedTop - k * 0.008);
  ctx.quadraticCurveTo(x0 + L * 0.92, bedTop - k * 0.012, x0 + L * 0.97, bedTop + k * 0.002);
  ctx.lineTo(x0 + L * 0.95, bedTop + k * 0.006);
  ctx.quadraticCurveTo(x0 + L * 0.9, bedTop - k * 0.004, x0 + L * 0.81, bedTop - k * 0.002);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TRUCK.shade;
  ctx.fillRect(x0 + L * 0.02, bedTop + k * 0.034, L * 0.96, k * 0.008);
  // The gold stripe and the bunting along the bed's side.
  ctx.fillStyle = GOLD;
  ctx.fillRect(x0 + L * 0.02, bedTop + k * 0.029, L * 0.96, k * 0.003);
  const swing = Math.sin(t * 3.1) * 0.15 + breeze(t) * 0.3;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? STRIPE_RED : band === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = x0 + L * 0.04 + (L * 0.6 * i) / 3;
      const bnd = x0 + L * 0.04 + (L * 0.6 * (i + 1)) / 3;
      swagBand(ctx, a, bnd, bedTop + k * 0.008, k * (0.013 + 0.001 * swing), band, 3);
    }
    ctx.fill();
  }
  // The windscreen, the grille, the headlamp and the brass bell.
  ctx.beginPath();
  ctx.moveTo(x0 + L * 0.77, bedTop - k * 0.05);
  ctx.lineTo(x0 + L * 0.79, bedTop - k * 0.078);
  ctx.lineTo(x0 + L * 0.81, bedTop - k * 0.078);
  ctx.lineTo(x0 + L * 0.8, bedTop - k * 0.048);
  ctx.closePath();
  inked(ctx, WINDSCREEN, kw * 0.8);
  ctx.beginPath();
  ctx.rect(x0 + L * 0.965, bedTop + k * 0.006, L * 0.03, k * 0.03);
  inked(ctx, CHROME.body, kw * 0.8);
  ctx.beginPath();
  circle(ctx, x0 + L * 0.94, bedTop - k * 0.006, k * 0.0075);
  inked(ctx, HEADLAMP, kw * 0.8);
  const ring = Math.sin(t * 9) * Math.max(0, Math.sin(t * 0.9)) * 0.4;
  ctx.save();
  ctx.translate(x0 + L * 0.86, bedTop - k * 0.02);
  ctx.rotate(ring);
  ctx.beginPath();
  ctx.moveTo(-k * 0.008, k * 0.008);
  ctx.quadraticCurveTo(-k * 0.008, -k * 0.008, 0, -k * 0.009);
  ctx.quadraticCurveTo(k * 0.008, -k * 0.008, k * 0.008, k * 0.008);
  ctx.closePath();
  inked(ctx, GOLD, kw * 0.8);
  ctx.restore();
  // The wooden ladder along the top of the bed.
  const ly = bedTop - k * 0.012;
  ctx.beginPath();
  ctx.rect(x0 + L * 0.05, ly - k * 0.004, L * 0.6, k * 0.0035);
  ctx.rect(x0 + L * 0.05, ly + k * 0.006, L * 0.6, k * 0.0035);
  for (let i = 0; i < 7; i++) ctx.rect(x0 + L * (0.07 + i * 0.088), ly - k * 0.004, k * 0.0035, k * 0.0135);
  inked(ctx, LADDER.body, kw * 0.55);
  // The fenders over the wheels and the wheels, turning as it rolls.
  ctx.beginPath();
  for (const wx of [x0 + L * 0.2, x0 + L * 0.8]) {
    ctx.moveTo(wx - wr * 1.35, foot - wr * 0.8);
    ctx.quadraticCurveTo(wx - wr * 1.3, foot - wr * 2.25, wx, foot - wr * 2.25);
    ctx.quadraticCurveTo(wx + wr * 1.3, foot - wr * 2.25, wx + wr * 1.35, foot - wr * 0.8);
    ctx.closePath();
  }
  inked(ctx, TRUCK.shade, kw);
  wheel(ctx, x0 + L * 0.2, foot - wr, wr, roll, 10, kw);
  wheel(ctx, x0 + L * 0.8, foot - wr, wr, roll, 10, kw);
}

/** A child standing in the truck's bed: bouncing over the bumps a moment behind the truck, waving a little flag or a hand, cheering now and then. */
function rider(ctx: Ctx, s: Scene, x: number, foot: number, t: number, r: (typeof RIDERS)[number], i: number, bump: number, kw: number): void {
  const b = KID_BUILD;
  const k = s.u;
  const bounce = Math.max(0, Math.sin(t * 2.6 + i * 2.1)) * 0.0025;
  P.view = Math.PI * (0.18 + i * 0.07);
  trunk(P, b, 0, 0, -(b.thigh + b.shin + b.ankle - 0.002) - bounce, 0.03, Math.sin(t * 1.3 + i) * 0.05, 0, 0);
  legTo(P, b, true, -0.005, 0.002, -bounce * 0.4);
  legTo(P, b, false, 0.005, -0.002, -bounce * 0.4);
  // The waving arm: up over the head, swinging side to side; the other on the bed's rail.
  const w = Math.sin((t * r.rate + r.phase) * Math.PI * 2);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  armTo(P, b, true, cl - 0.012 + w * 0.006, cf + 0.004, cy - b.upper * 0.95 - b.fore * 0.5 + Math.abs(w) * 0.003, -1, 0, 0.4);
  armTo(P, b, false, cl + 0.012, cf + 0.01, cy + b.upper * 0.85, 1, -0.4, 0.3);
  const cheer = Math.max(0, Math.sin(t * 0.8 + i * 1.9));
  P.face = Math.PI * 0.12 + Math.sin(t * 0.5 + i) * 0.2;
  P.tilt = Math.sin(t * 1.1 + i) * 0.08;
  P.mouth = cheer > 0.7 ? 0.9 : 0.25;
  P.brow = cheer;
  P.puff = 0;
  P.blink = blink(t, 20 + i);
  P.lagX = -Math.cos((t * r.rate + r.phase) * Math.PI * 2) * 0.002;
  P.lagY = bump / k;
  P.wind = 0.4;
  figure(ctx, P, b, r.look, x, foot, k, 1, kw, { lod: 1, legs: false }, {
    front: (c, F) => {
      if (!r.flag) return;
      // A little flag on a stick in the waving hand, flying back from it.
      const hx = F.x[J.handN]!;
      const hy = F.y[J.handN]!;
      c.beginPath();
      c.moveTo(hx, hy + k * 0.006);
      c.lineTo(hx + k * 0.002, hy - k * 0.03);
      c.strokeStyle = INK;
      c.lineWidth = k * 0.0022 + kw * 0.6;
      c.stroke();
      c.strokeStyle = STICK;
      c.lineWidth = k * 0.0022;
      c.stroke();
      usFlag(c, hx + k * 0.002, hy - k * 0.03, KID_FLAG_W * k, KID_FLAG_H * k, w > 0 ? -1 : 1, KID_FLAG_H * k * 0.14, t * 9 + i, FLAG);
    },
  });
}

/** A child's hand flag: its length and depth (u). */
export const KID_FLAG_W = 0.032;
export const KID_FLAG_H = 0.021;

/** The fireman at the wheel: his hands on it, the helmet on, waving to the crowd now and then. */
function driver(ctx: Ctx, s: Scene, x: number, foot: number, t: number, kw: number): void {
  const b = DRIVER_BUILD;
  const k = s.u;
  P.view = VIEW;
  trunk(P, b, 0, 0, -0.035, 0.08, 0, 0, 0);
  legTo(P, b, true, -0.006, 0.03, 0);
  legTo(P, b, false, 0.006, 0.03, 0);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  // A wave every few seconds: the near hand lifts off the wheel and waves.
  const wk = fract((t + 1.4) / 4.6);
  const waving = wk < 0.35 ? Math.sin((wk / 0.35) * Math.PI) : 0;
  const w = Math.sin(t * 14) * waving;
  armTo(P, b, false, cl + 0.004, cf + 0.026, cy + 0.018, 0.6, -0.6, 0.6);
  if (waving > 0.05) armTo(P, b, true, cl - 0.01 + w * 0.004, cf + 0.01, cy - 0.03 * waving + 0.018 * (1 - waving), -1, -0.2, 0.3);
  else armTo(P, b, true, cl - 0.004, cf + 0.026, cy + 0.02, -0.6, -0.6, 0.6);
  P.face = VIEW - 0.6 * waving;
  P.tilt = 0;
  P.mouth = 0.3 + waving * 0.5;
  P.brow = waving * 0.6;
  P.puff = 0;
  P.blink = blink(t, 30);
  figure(ctx, P, b, DRIVER_LOOK, x, foot, k, 1, kw, { lod: 1, legs: false }, {
    body: (c) => {
      // The steering wheel before him.
      const [sx, sy] = onScreen(x, foot, k, cl, cf + 0.03, cy + 0.02);
      c.beginPath();
      c.ellipse(sx, sy, k * 0.004, k * 0.011, 0.2, 0, Math.PI * 2);
      c.strokeStyle = INK;
      c.lineWidth = k * 0.003 + kw;
      c.stroke();
    },
    hat: (c, F) => fireHelmet(c, F, P),
  });
}

// ---------------------------------------------------------------- Uncle Sam

/** Uncle Sam's build: long legs on stilts under his striped trousers (the stilt is in the shin). */
const SAM_BUILD = scaled(build({ thigh: 0.036, shin: 0.07, ankle: 0.004, spine: 0.048, chestW: 0.0152, waistW: 0.0122, hipW: 0.0128, depth: 0.0122, bust: 0.003, leg0: 0.0074, leg1: 0.006, leg2: 0.005 }), 0.98);
const SAM_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_WHITE, style: "side", top: SAM_COAT, sleeves: "long", lower: shades(CREAM, 0.5, 0.2), legs: "trousers", shoes: POLISH, gloves: DRESS_WHITE, beard: 1 };
const SAM_GAIT: Gait = { speed: SPEED / (0.98 * Math.sin(VIEW)), cadence: 1.5, phase: 0.2, duty: 0.56, lift: 0.006, high: 0, stance: 0.006 };

/** Uncle Sam on stilts: long striped trousers down over the stilts, a navy tailcoat whose tails swing behind, a white goatee, white gloves, and the starred top hat he lifts off and tips to the bandstand as he passes it; his other hand waves. */
function uncleSam(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const b = SAM_BUILD;
  const k = s.u;
  const tip = hatTip(s, t);
  P.view = VIEW;
  walk(P, b, SAM_GAIT, { ...MARCH, arms: 0.28, lean: -0.03, twist: 0.1 }, t);
  P.face = VIEW - 0.55 * tip - 0.15;
  P.tilt = -0.1 * tip;
  P.mouth = 0.3 + 0.5 * tip;
  P.brow = 0.6 * tip;
  P.puff = 0;
  P.blink = blink(t, 40);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const hy = P.j[J.head * 3 + 2]!;
  // His far hand waves at the crowd; passing the bandstand it goes to the brim, then lifts the hat up and out toward it.
  wave(P, b, t, 1.3, 1);
  if (tip > 0.01) {
    const up = ease(tip);
    const m = ease(Math.min(1, tip * 2.5));
    const [hl0, hf0, hy0] = [P.j[J.handF * 3]!, P.j[J.handF * 3 + 1]!, P.j[J.handF * 3 + 2]!];
    armTo(P, b, false, hl0 + (cl + 0.004 - hl0) * m, hf0 + (cf + 0.014 + 0.014 * up - hf0) * m, hy0 + (hy - b.head * 1.1 - 0.012 * up - hy0) * m, 0.8, 0.3, 0.6);
  }
  const kw = lineOf(s);
  const swing = bobLag(b, SAM_GAIT, t);
  figure(ctx, P, b, SAM_LOOK, x, foot, k, 1, kw, { lod: 2 }, {
    back: (c, F) => tails(c, F, swing, kw),
    body: (c, F) => {
      stripes(c, F);
      vest(c, F, kw);
    },
    hat: (c, F) => topHat(c, F, P, ease(tip), F.x[J.handF]! - F.k * 0.002, F.y[J.handF]! - F.k * 0.004),
  });
}

/** The red stripes down the trousers (over the legs drawn before the torso), and the stilts' feet. */
function stripes(ctx: Ctx, F: Frame): void {
  ctx.strokeStyle = STRIPE_RED;
  ctx.lineWidth = Math.max(0.8, F.k * 0.0024);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const [h, kn, an] of [
    [J.hipF, J.kneeF, J.ankleF],
    [J.hipN, J.kneeN, J.ankleN],
  ] as const) {
    for (const off of [-0.0028, 0.0028]) {
      const dx = F.y[an]! - F.y[h]!;
      const dy = F.x[h]! - F.x[an]!;
      const d = Math.hypot(dx, dy) || 1;
      const ox = (dx / d) * off * F.k;
      const oy = (dy / d) * off * F.k;
      ctx.moveTo(F.x[h]! + ox, F.y[h]! + oy + F.k * 0.006);
      ctx.lineTo(F.x[kn]! + ox, F.y[kn]! + oy);
      ctx.lineTo(F.x[an]! + ox * 0.8, F.y[an]! + oy * 0.8 - F.k * 0.004);
    }
  }
  ctx.stroke();
  ctx.lineCap = "round";
}

/** The vest and bow tie: a cream vest down the front with a blue star, a red bow at the collar. */
function vest(ctx: Ctx, F: Frame, kw: number): void {
  const cx = F.x[J.chest]! + F.fd * F.side * F.k * 0.006;
  const cy = F.y[J.chest]!;
  const px = F.x[J.pelvis]! + F.fd * F.side * F.k * 0.007;
  const py = F.y[J.pelvis]!;
  const w = F.k * 0.006;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + F.k * 0.004);
  ctx.lineTo(cx + w * 0.7, cy + F.k * 0.004);
  ctx.lineTo(px + w * 0.6, py - F.k * 0.004);
  ctx.lineTo(px - w * 0.9, py - F.k * 0.002);
  ctx.closePath();
  inked(ctx, CREAM, kw * 0.7);
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  starPath(ctx, (cx + px) / 2, (cy + py) / 2, F.k * 0.004);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.9, cy - F.k * 0.002);
  ctx.lineTo(cx, cy + F.k * 0.002);
  ctx.lineTo(cx - w * 0.9, cy + F.k * 0.006);
  ctx.closePath();
  ctx.moveTo(cx + w * 0.9, cy - F.k * 0.002);
  ctx.lineTo(cx, cy + F.k * 0.002);
  ctx.lineTo(cx + w * 0.9, cy + F.k * 0.006);
  ctx.closePath();
  inked(ctx, RED, kw * 0.6);
}

/** The tailcoat's tails, hanging from the back of the waist and swinging a moment behind his stride. */
function tails(ctx: Ctx, F: Frame, swing: number, kw: number): void {
  const px = F.x[J.pelvis]!;
  const py = F.y[J.pelvis]!;
  const back = -F.dir;
  const k = F.k;
  const sw = swing * k * 1.6;
  ctx.beginPath();
  ctx.moveTo(px - back * k * 0.004, py - k * 0.016);
  ctx.quadraticCurveTo(px + back * k * 0.018, py - k * 0.004, px + back * k * (0.024 + 0.004) + sw, py + k * 0.038);
  ctx.lineTo(px + back * k * 0.012 + sw, py + k * 0.034);
  ctx.quadraticCurveTo(px + back * k * 0.006, py + k * 0.01, px - back * k * 0.004, py + k * 0.004);
  ctx.closePath();
  inked(ctx, SAM_COAT.shade, kw);
}

// ---------------------------------------------------------------- the girl on her bike

const BIKER_BUILD = scaled(CHILD, 1.02);
const BIKER_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_BLONDE, style: "pony", ribbon: STRIPE_RED, top: DRESS, sleeves: "short", lower: DRESS, legs: "dress", hem: 0.55, shoes: RED };

/** How far (u) the girl's feet fell short of her pedals and her hands of the handlebars, as last drawn (for the rig's tests). */
export const BIKER_REACH = { feet: 0, hands: 0 };

/** The girl on her bike: a curvy pink bike with a basket of flowers and a little flag, streamers flying from the handlebars, her legs pedaling, her ponytail streaming, ringing her bell and waving now and then. */
function girlOnBike(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const k = s.u;
  const kw = lineOf(s);
  const wr = k * 0.021;
  const travel = paradeX(t) * k;
  const roll = travel / wr;
  const rearX = x - k * 0.032;
  const frontX = x + k * 0.034;
  const axleY = foot - wr;
  const seatX = x - k * 0.01;
  const seatY = axleY - k * 0.036;
  const barX = frontX - k * 0.01;
  const barY = axleY - k * 0.05;
  // Streamers from the handlebars, flying back and rippling.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    for (let q = 0.2; q <= 1.001; q += 0.2) {
      ctx.lineTo(barX - k * 0.034 * q, barY + (i - 1) * k * 0.004 * q + Math.sin(t * 11 - q * 7 + i) * k * 0.004 * q);
    }
    ctx.strokeStyle = i === 0 ? STRIPE_RED : i === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.lineWidth = Math.max(1, k * 0.003);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  // The far pedal's leg goes behind the frame: pose her first.
  const b = BIKER_BUILD;
  const crank = roll * 0.55;
  const crankR = 0.009;
  const cx = x + k * 0.003;
  const cy = axleY + k * 0.002;
  P.view = Math.PI * 0.45;
  const hipF = (seatX - x) / k / Math.sin(P.view);
  trunk(P, b, 0, hipF, (seatY - foot) / k - 0.002, 0.42, 0, 0.05, 0);
  BIKER_REACH.feet = 0;
  for (const near of [true, false]) {
    const a = crank + (near ? 0 : Math.PI);
    const pf = (cx - x) / k / Math.sin(P.view) + Math.cos(a) * crankR;
    const py = (cy - foot) / k + Math.sin(a) * crankR;
    BIKER_REACH.feet = Math.max(BIKER_REACH.feet, legTo(P, b, near, near ? -0.004 : 0.004, pf + b.ball * 0.3, py, 0.2));
  }
  // Waving: every 5 s her near hand leaves the bars and waves.
  const wk = fract((t + 0.6) / 5);
  const waving = wk < 0.3 ? Math.sin((wk / 0.3) * Math.PI) : 0;
  const bf = (barX - x) / k / Math.sin(P.view);
  const by = (barY - foot) / k;
  BIKER_REACH.hands = armTo(P, b, false, 0.004, bf, by, 0.5, -0.5, 0.5);
  if (waving > 0.05) {
    const cl = P.j[J.chest * 3]!;
    const cf = P.j[J.chest * 3 + 1]!;
    const cy2 = P.j[J.chest * 3 + 2]!;
    armTo(P, b, true, cl - 0.01 + Math.sin(t * 13) * 0.004 * waving, cf + 0.006, cy2 - 0.03 * waving + (by - cy2) * (1 - waving), -1, -0.2, 0.3);
  } else BIKER_REACH.hands = Math.max(BIKER_REACH.hands, armTo(P, b, true, -0.004, bf, by, -0.5, -0.5, 0.5));
  P.face = P.view - 0.5 * waving - 0.1;
  P.tilt = 0;
  P.mouth = 0.35 + 0.5 * waving;
  P.brow = waving * 0.7;
  P.puff = 0;
  P.blink = blink(t, 50);
  P.lagX = -0.006 - Math.sin(crank * 2) * 0.0006;
  P.lagY = Math.sin(crank * 2) * 0.0008;
  P.wind = 0.6;
  const swing = Math.sin(crank * 2);
  figure(ctx, P, b, BIKER_LOOK, x, foot, k, 1, kw, { lod: 2, flow: 1.5, swing }, {
    back: (c) => {
      // The bike under her: the wheels, the frame, the saddle, the basket; drawn before her so her near leg is over it.
      wheel(c, rearX, axleY, wr, roll, 12, kw);
      wheel(c, frontX, axleY, wr, roll, 12, kw);
      c.beginPath();
      c.moveTo(rearX, axleY);
      c.lineTo(seatX, seatY + k * 0.004);
      c.moveTo(seatX + k * 0.002, seatY + k * 0.004);
      c.quadraticCurveTo(x - k * 0.002, axleY - k * 0.002, cx, cy);
      c.lineTo(rearX, axleY);
      c.moveTo(cx, cy);
      c.quadraticCurveTo(x + k * 0.018, axleY - k * 0.03, barX - k * 0.002, barY + k * 0.008);
      c.lineTo(frontX, axleY);
      c.lineCap = "round";
      c.strokeStyle = INK;
      c.lineWidth = k * 0.0045 + kw;
      c.stroke();
      c.strokeStyle = BIKE.body;
      c.lineWidth = k * 0.0045;
      c.stroke();
      c.beginPath();
      c.ellipse(seatX, seatY + k * 0.002, k * 0.008, k * 0.0028, 0, 0, Math.PI * 2);
      inked(c, SADDLE, kw * 0.7);
      // The basket on the front, with flowers and a little flag.
      c.beginPath();
      c.moveTo(frontX - k * 0.002, barY + k * 0.004);
      c.lineTo(frontX + k * 0.016, barY + k * 0.004);
      c.lineTo(frontX + k * 0.013, barY + k * 0.018);
      c.lineTo(frontX + k * 0.001, barY + k * 0.018);
      c.closePath();
      inked(c, BASKET_PALE, kw * 0.7);
      c.fillStyle = STRIPE_RED;
      c.beginPath();
      circle(c, frontX + k * 0.004, barY + k * 0.002, k * 0.0035);
      circle(c, frontX + k * 0.011, barY + k * 0.001, k * 0.003);
      c.fill();
      c.fillStyle = MARIGOLD;
      c.beginPath();
      circle(c, frontX + k * 0.008, barY - k * 0.001, k * 0.003);
      c.fill();
      c.beginPath();
      c.moveTo(barX - k * 0.008, barY);
      c.lineTo(barX + k * 0.004, barY - k * 0.003);
      c.strokeStyle = INK;
      c.lineWidth = k * 0.003 + kw;
      c.stroke();
    },
    hat: (c, F) => bow(c, F, P, STRIPE_RED),
  });
  // The near pedal and crank over her foot.
  const a = crank;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * crankR * k * Math.sin(P.view), cy + Math.sin(a) * crankR * k);
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.0025 + kw;
  ctx.stroke();
  ctx.strokeStyle = CHROME.body;
  ctx.lineWidth = k * 0.0025;
  ctx.stroke();
}

// ---------------------------------------------------------------- the dog

/** The dog's legs: hip/shoulder across (u from the body's middle), phase in the bound, which side. */
const DOG_LEGS = [
  { at: -0.016, phase: 0.0, near: false },
  { at: 0.017, phase: 0.42, near: false },
  { at: -0.0145, phase: 0.08, near: true },
  { at: 0.0185, phase: 0.5, near: true },
] as const;
const DOG_RATE = 2.9;
const DOG_DUTY = 0.38;

/** The dog bounding after the bike: a cream coat with a dark patch over one eye, floppy ears, a navy bandana, a wagging tail and a lolling tongue; each foot planted while it bears weight, the back flexing with the bound. */
function dog(ctx: Ctx, s: Scene, x: number, foot: number, t: number): void {
  const k = s.u;
  const kw = lineOf(s);
  const p = fract(t * DOG_RATE + 0.3);
  const S = (SPEED * k) / DOG_RATE;
  // The body rides up between the bounds and pitches nose-up, then nose-down.
  const rise = Math.max(0, Math.sin((p - 0.15) * Math.PI * 2)) * k * 0.004;
  const pitch = Math.sin(p * Math.PI * 2 + 0.6) * 0.12;
  const bodyY = foot - k * 0.03 - rise;
  const legLen = k * 0.022;
  const feet: [number, number, number, number, boolean][] = [];
  for (const leg of DOG_LEGS) {
    const q = fract(p - leg.phase);
    const rootX = x + leg.at * k;
    const rootY = bodyY + Math.sin(pitch) * leg.at * k + k * 0.004;
    let fx: number;
    let fy: number;
    if (q < DOG_DUTY) {
      fx = rootX + S * (DOG_DUTY / 2 - q);
      fy = foot;
    } else {
      const sw = (q - DOG_DUTY) / (1 - DOG_DUTY);
      fx = rootX - (S * DOG_DUTY) / 2 + S * DOG_DUTY * ease(sw);
      fy = foot - Math.sin(sw * Math.PI) * k * 0.008;
    }
    // Two bones, the knee (hind) bent back and the elbow (fore) bent forward... as dogs' are.
    const dx = fx - rootX;
    const dy = fy - rootY;
    const d = Math.min(Math.hypot(dx, dy), legLen * 0.999);
    const a = Math.atan2(dy, dx);
    const half = legLen / 2;
    const off = Math.sqrt(Math.max(0, half * half - (d / 2) * (d / 2)));
    const bend = leg.at < 0 ? -1 : 1;
    const mx = rootX + Math.cos(a) * d * 0.5 - Math.sin(a) * off * bend;
    const my = rootY + Math.sin(a) * d * 0.5 + Math.cos(a) * off * bend;
    feet.push([mx, my, rootX + Math.cos(a) * d, rootY + Math.sin(a) * d, leg.near]);
    void rootX;
  }
  const drawLegs = (near: boolean) => {
    for (let i = 0; i < DOG_LEGS.length; i++) {
      const leg = DOG_LEGS[i]!;
      if (leg.near !== near) continue;
      const [mx, my, fx, fy] = feet[i]!;
      const rootX = x + leg.at * k;
      const rootY = bodyY + Math.sin(pitch) * leg.at * k + k * 0.004;
      ctx.beginPath();
      limb(ctx, rootX, rootY, mx, my, fx, fy, k * 0.0052, k * 0.0034, k * 0.003, 0.1);
      ctx.fillStyle = near ? DOG.body : DOG.shade;
      ctx.fill();
      ctx.lineWidth = kw;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  };
  drawLegs(false);
  // The tail: up and wagging.
  const wag = Math.sin(t * 15) * 0.5;
  const tx = x - k * 0.026;
  const ty = bodyY - k * 0.002;
  ctx.beginPath();
  ctx.moveTo(tx + k * 0.004, ty + k * 0.002);
  ctx.quadraticCurveTo(tx - k * 0.008, ty - k * 0.004, tx - k * 0.01 + wag * k * 0.006, ty - k * 0.018);
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.004 + kw;
  ctx.stroke();
  ctx.strokeStyle = DOG.body;
  ctx.lineWidth = k * 0.004;
  ctx.stroke();
  // The body: a soft bean, pitched with the bound, a dark patch on its back.
  ctx.save();
  ctx.translate(x, bodyY);
  ctx.rotate(pitch);
  ctx.beginPath();
  ctx.moveTo(-k * 0.028, 0);
  ctx.bezierCurveTo(-k * 0.03, -k * 0.016, k * 0.026, -k * 0.016, k * 0.028, -k * 0.002);
  ctx.bezierCurveTo(k * 0.03, k * 0.014, -k * 0.026, k * 0.016, -k * 0.028, 0);
  ctx.closePath();
  inked(ctx, DOG.body, kw);
  ctx.fillStyle = DOG_SPOT;
  ctx.beginPath();
  ctx.ellipse(-k * 0.006, -k * 0.007, k * 0.009, k * 0.005, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawLegs(true);
  // The head: up and forward, the bandana under it, floppy ears flying back with the bound, the tongue out.
  const hx = x + k * 0.03 + Math.cos(pitch) * k * 0.002;
  const hy = bodyY - k * 0.014 + Math.sin(pitch) * k * 0.028;
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.012, hy + k * 0.004);
  ctx.lineTo(hx - k * 0.002, hy + k * 0.016);
  ctx.lineTo(hx - k * 0.016, hy + k * 0.014);
  ctx.closePath();
  inked(ctx, NAVY, kw * 0.7);
  ctx.beginPath();
  ctx.moveTo(hx + k * 0.018, hy + k * 0.006);
  ctx.quadraticCurveTo(hx + k * 0.02, hy + k * 0.012, hx + k * 0.016, hy + k * 0.015);
  ctx.quadraticCurveTo(hx + k * 0.012, hy + k * 0.012, hx + k * 0.012, hy + k * 0.006);
  ctx.closePath();
  inked(ctx, TONGUE, kw * 0.6);
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.01, hy);
  ctx.bezierCurveTo(hx - k * 0.011, hy - k * 0.014, hx + k * 0.008, hy - k * 0.013, hx + k * 0.011, hy - k * 0.004);
  ctx.quadraticCurveTo(hx + k * 0.021, hy - k * 0.002, hx + k * 0.02, hy + k * 0.005);
  ctx.quadraticCurveTo(hx + k * 0.012, hy + k * 0.01, hx - k * 0.002, hy + k * 0.009);
  ctx.quadraticCurveTo(hx - k * 0.01, hy + k * 0.008, hx - k * 0.01, hy);
  ctx.closePath();
  inked(ctx, DOG.body, kw);
  ctx.fillStyle = DOG_SPOT;
  ctx.beginPath();
  ctx.ellipse(hx + k * 0.005, hy - k * 0.004, k * 0.0045, k * 0.004, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(hx + k * 0.006, hy - k * 0.0045, k * 0.0016, k * 0.0019, 0, 0, Math.PI * 2);
  ctx.moveTo(hx + k * 0.022, hy + k * 0.001);
  ctx.ellipse(hx + k * 0.0205, hy + k * 0.001, k * 0.0022, k * 0.0018, 0, 0, Math.PI * 2);
  ctx.fill();
  // The ears: flopping, flying up as the body drops.
  const flop = Math.sin(p * Math.PI * 2 - 1.2);
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.004, hy - k * 0.01);
  ctx.quadraticCurveTo(hx - k * 0.016, hy - k * 0.012 - flop * k * 0.005, hx - k * 0.017, hy + k * 0.002 - flop * k * 0.007);
  ctx.quadraticCurveTo(hx - k * 0.01, hy + k * 0.002, hx - k * 0.001, hy - k * 0.007);
  ctx.closePath();
  inked(ctx, DOG_SPOT, kw * 0.8);
}

// ---------------------------------------------------------------- the parade

/** One unit of the parade, centered at screen x, its feet on the route. */
export function drawUnit(ctx: Ctx, s: Scene, unit: Unit, x: number, foot: number, t: number): void {
  P.lagX = 0;
  P.lagY = 0;
  P.wind = breeze(t);
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
      tuba(ctx, s, x, foot, t);
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

/** The marchers' gaits, for the rig's tests: each band member's own (the same cadence, its own phase). */
export const BAND_GAITS: readonly { id: string; gait: Gait; build: Build }[] = [
  { id: "drumMajor", gait: MAJOR_GAIT, build: MAJOR_BUILD },
  { id: "flag", gait: VET_GAIT, build: VET_BUILD },
  { id: "snare", gait: SNARE_GAITS[0]!, build: SNARE_BUILDS[0]! },
  { id: "snare2", gait: SNARE_GAITS[1]!, build: SNARE_BUILDS[1]! },
  { id: "lyre", gait: LYRE_GAIT, build: LYRE_BUILD },
  { id: "tuba", gait: TUBA_GAIT, build: TUBA_BUILD },
  { id: "uncleSam", gait: SAM_GAIT, build: SAM_BUILD },
];

/** How a walker's ground point maps to the screen: the parade's figures are seen from VIEW at FS. */
export const PARADE_VIEW = VIEW;

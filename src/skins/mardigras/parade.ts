import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BAND_SHOES, BERRY_SHOES, BONE, COAT, GOLD, GREEN, HAIRS, INK, LIDS, PLUM_SHOES, PURPLE, SHIRT, SHIRTS, SILVER, SKINS, SUIT, TROUSERS, VIOLET, type Shades } from "./colors";
import { BODY_H, bonesFloat, FLOAT_DECK, FLOAT_HL, jesterFloat, RIDER_DOWN } from "./floats";
import { draw, folk, toScreen, type Folk, type Look } from "./folk";
import { centerX, curbTop, inkW, JUMPER, kidCatch, LITTLE, ROUTE } from "./place";
import {
  bassDrum,
  beadString,
  flambeau,
  hanky,
  holdBass,
  holdSax,
  holdSnare,
  holdSousaphone,
  holdTrombone,
  holdTrumpet,
  inFrame,
  parasol,
  sax,
  snare,
  sousaphone,
  trombone,
  trumpet,
  umbrella,
} from "./props";
import { ADULT, BONY, blinkAt, build, CHILD, dance, glance, now, pick, shoulderY, smooth, STILTED, walk, type Gait } from "./rig";
import { deckY } from "./street";

export { FLOAT_HL };

// The parade, passing left to right in front of the reviewing stand, below the tower's floor
// line (so nothing moves behind the tower): papier-mâché carnival figures on their rigs (folk.ts,
// rig.ts), every one stepping on its own feet. The grand marshal struts at the head in a white
// suit, a purple sash and a gold sequined mask, pumping his fringed second-line umbrella and
// waving his handkerchief; a flambeau carrier holds his torch high and twirls it now and then;
// the brass band second-lines behind them in two ranks (a trumpet tipping up to the sky, a tenor
// sax swaying, a trombone working its slide, a sousaphone round its player, a snare and a bass
// drum), each player on his own step; then the skeleton krewe's float (our own, in the spirit of
// the city's old bone gangs: a giant grinning skull in a top hat at the prow, a giant white glove
// waving at the stern, three papier-mâché skeletons in top hats and tailcoats dancing to the band
// and tossing beads up to the little one on the gallery, down to the kid at the curb and over to
// the ladder), the jester-and-crown float (a giant jester's head at the prow, a crown at the
// stern) with three riders in a sun, a moon and a feathered mask who throw strings of beads to
// the crowd on either side, a jester on stilts in harlequin, a second flambeau, a second-liner
// with a parasol and a handkerchief, and a little one in a cat mask skipping along with hers.
// It steps in at PARADE_AT and the last of it has passed the tower by ten seconds (the owner's
// rule), and it comes round the block again every PERIOD. On a screen wider than a phone it is
// already walking in from past the edge, so it never stands still or pops in.
//
// Every walker plants its feet: its gait's phase is its place along the route over its stride,
// so a foot set down stays where it was set while the body passes over it. No two walk in step:
// each has its own stride and its own offset, its own glances and blinks.
//
// Positions along the route are in u behind the parade's head; screen x comes from headX().

/** When the marshal steps in from the left, how fast the parade walks (u/s), and how often it comes round. */
export const PARADE_AT = 0.1;
const SPEED = 0.27;
export const PERIOD = 40;
/** Where the head starts: u left of the screen's center, past any phone's edge. */
const HEAD_IN = -0.58;

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

/**
 * Where the parade member nearest to x (u from the center) is at time t (u), for the crowd to
 * watch it go by; NaN while no part of the parade is within `reach` of x.
 */
export function nearestUnit(t: number, x: number, reach = 0.7): number {
  const hx = headX(t);
  let best = NaN;
  let d = reach;
  for (const [, pos] of UNITS) {
    const ux = hx - pos;
    if (Math.abs(ux - x) < d) {
      d = Math.abs(ux - x);
      best = ux;
    }
  }
  return best;
}

type Unit =
  | "marshal"
  | "flambeau"
  | "trumpet"
  | "sax"
  | "trombone"
  | "sousaphone"
  | "snare"
  | "bass"
  | "bones"
  | "float"
  | "stilts"
  | "flambeau2"
  | "liner"
  | "dancer";

/** Each unit's place behind the head (u). */
export const UNITS: readonly (readonly [Unit, number])[] = [
  ["marshal", 0],
  ["flambeau", 0.13],
  ["trumpet", 0.25],
  ["sax", 0.34],
  ["trombone", 0.42],
  ["sousaphone", 0.55],
  ["snare", 0.66],
  ["bass", 0.77],
  ["bones", 1.06],
  ["float", 1.51],
  ["stilts", 1.77],
  ["flambeau2", 1.88],
  ["liner", 1.94],
  ["dancer", 1.99],
];
/** Who walks in the second rank, a little further back (up the screen) and smaller. */
const BACK_RANK: ReadonlySet<Unit> = new Set<Unit>(["flambeau", "sax", "snare", "flambeau2", "liner"]);
/** The second rank's step back up the screen (u) and its scale. */
const BACK_UP = 0.024;
const BACK_K = 0.94;
/** How long the parade is (u): the head to the last dancer, plus her reach. */
export const LENGTH = 2.05;
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
    if (at.flight >= 0) r = Math.max(r, smooth((at.flight - from) / 0.3));
    else if (at.landed >= 0) r = Math.max(r, 1 - smooth(at.landed / LOWER));
  }
  return r;
}

/** Scratch: where a throw's beads are (screen px). */
const BEADS = { x: 0, y: 0 };

/** The ladder's two kids' raised hands (u from the screen's center), and how far above the curb (u). */
export const SEATS: readonly number[] = [0.336, 0.384];
export const SEAT_UP = 0.3;
/** Where the catchers' hands meet when they reach up (u above their feet, at full size), and how far ahead of their middle. */
export const CATCH_UP = 0.16;
export const CATCH_AHEAD = 0.008;

/** The riders' places on the deck (u from the float's center). */
const RIDER_X = [-0.062, 0.0, 0.062] as const;
/** Where a throw leaves a rider's raised hand: this far above the deck (u). */
const RELEASE = BODY_H - RIDER_DOWN + 0.17;

/** Where throw `i`'s beads are at `flight` (0..1): from the rider's raised hand to the target's hands, in an arc. */
function throwBeadsAt(s: Scene, i: number, flight: number): typeof BEADS {
  const th = THROWS[i]!;
  const u = s.u;
  const cx = centerX(s);
  const x0 = cx + (th.at + RIDER_X[th.rider]! + th.dir * 0.07) * u;
  const y0 = s.groundY + ROUTE * u - FLOAT_DECK * u - RELEASE * u;
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

// ---------------------------------------------------------------- the cast

const BRASS_BAND = (skin: number, hair: number, over: Partial<Look> = {}): Look => ({
  b: ADULT,
  skin: SKINS[skin]!,
  hair: HAIRS[hair]!,
  hairDo: "short",
  top: SHIRT,
  bottom: TROUSERS,
  shoes: BAND_SHOES,
  hat: "cap",
  hatColor: TROUSERS,
  hatTrim: GOLD,
  mask: "none",
  maskColor: GOLD,
  lids: LIDS.blue,
  collar: "bow",
  collarColor: PURPLE,
  ...over,
});

/** The grand marshal: a tall white suit, a purple sash, a gold sequined mask, a purple top hat with a green plume, beads. */
const MARSHAL = folk(
  BRASS_BAND(2, 0, { b: build({ spine: 0.06, thigh: 0.042, shin: 0.04 }), top: SUIT, bottom: SUIT, hat: "topHat", hatColor: PURPLE, mask: "sequin", maskColor: GOLD, sash: PURPLE, beads: [GOLD, GREEN], collar: "bow", collarColor: GOLD }),
  1.02,
  101,
);
/** The flambeaux carriers: dark coats, bright headscarves. */
const CARRIERS = [
  folk(BRASS_BAND(1, 3, { top: COAT, bottom: TROUSERS, hat: "scarf", hatColor: GOLD, collar: undefined, vest: GREEN }), 1.06, 102),
  folk(BRASS_BAND(3, 1, { b: build({ belly: 0.006, chestW: 0.027 }), top: COAT, bottom: TROUSERS, hat: "scarf", hatColor: PURPLE, collar: undefined, vest: GOLD }), 1.06, 111),
];
/** The band: white shirts and bow ties, dark trousers, band caps; each of his own build. */
const TRUMPET = folk(BRASS_BAND(0, 1, { b: build({ spine: 0.054 }) }), 1.1, 103);
const SAX = folk(BRASS_BAND(2, 3, { b: build({ belly: 0.004, thigh: 0.041 }), hat: "beret", hatColor: PURPLE, lids: LIDS.violet }), 1.08, 104);
const TROMBONE = folk(BRASS_BAND(1, 2, { b: build({ spine: 0.058, chestW: 0.026 }) }), 1.1, 105);
const TUBA = folk(BRASS_BAND(3, 4, { b: build({ belly: 0.009, chestW: 0.029, waistW: 0.024, hipW: 0.024, spine: 0.055 }), hatColor: PURPLE }), 1.02, 106);
const SNARE = folk(BRASS_BAND(2, 0, { b: build({ thigh: 0.038, shin: 0.037 }), lids: LIDS.teal }), 1.06, 107);
const BASS = folk(BRASS_BAND(0, 4, { b: build({ belly: 0.006, spine: 0.057 }), hatColor: GREEN }), 1.1, 108);

/** The jester float's riders: a sun mask, a moon mask, a feathered mask; beads round their necks. */
const RIDER = (top: Shades, mask: Look["mask"], mc: Shades, skin: number, hair: number, hairDo: Look["hairDo"], id: number): Folk => {
  const f = folk({ b: ADULT, skin: SKINS[skin]!, hair: HAIRS[hair]!, hairDo, top, bottom: top, shoes: BAND_SHOES, hat: "none", hatColor: GOLD, mask, maskColor: mc, lids: LIDS.gold, beads: [GOLD, GREEN, PURPLE], collar: "ruff", collarColor: top }, 0.72, id);
  f.legs = false;
  return f;
};
const RIDERS = [RIDER(VIOLET, "sun", GOLD, 1, 0, "curly", 121), RIDER(GOLD, "moon", SILVER, 3, 2, "long", 122), RIDER(GREEN, "feather", PURPLE, 0, 4, "bun", 123)];
const THREEC = [PURPLE, GREEN, GOLD] as const;
/** The skeleton krewe: grinning skulls, tailcoats open on their ribs, white gloves, top hats in the season's colors, beads. */
const SKELETONS = [PURPLE, GREEN, GOLD].map((hat, i) => {
  const coat = [GREEN, VIOLET, PURPLE][i]!;
  const f = folk(
    { b: BONY, skin: BONE, hair: INK, hairDo: "bald", top: coat, bottom: coat, shoes: BAND_SHOES, tails: true, pattern: "ribs", hat: "topHat", hatColor: hat, hatTrim: i === 2 ? PURPLE : GOLD, plume: [GREEN, GOLD, PURPLE][i], mask: "none", maskColor: GOLD, lids: LIDS.blue, gloves: true, skull: true, beads: [THREEC[(i + 1) % 3]!] },
    0.72,
    131 + i,
  );
  f.legs = false;
  return f;
});
/** The jester on stilts: harlequin diamonds, a three-pointed cap, a harlequin mask, long purple trousers down over the stilts. */
const STILTS = folk(
  { b: STILTED, skin: SKINS[2]!, hair: HAIRS[3]!, hairDo: "short", top: GREEN, bottom: PURPLE, shoes: BAND_SHOES, pattern: "harlequin", patternColor: GOLD, hat: "jester", hatColor: PURPLE, mask: "harlequin", maskColor: GREEN, lids: LIDS.gold, collar: "ruff", collarColor: GOLD },
  0.8,
  140,
);
/** The second-liner: a dress in the season's colors, a feathered headdress, a parasol and a handkerchief. */
const LINER = folk(
  { b: build({ waistW: 0.016, hipW: 0.022 }), skin: SKINS[2]!, hair: HAIRS[3]!, hairDo: "afro", top: GOLD, bottom: GOLD, shoes: BERRY_SHOES, skirt: PURPLE, frill: GREEN, skirtLen: 0.07, hat: "plumes", hatColor: GREEN, plume: VIOLET, hatTrim: GOLD, mask: "none", maskColor: GOLD, lids: LIDS.violet, beads: [GREEN, GOLD] },
  1.0,
  150,
);
/** The little one in a cat mask, skipping with her parasol. */
const DANCER = folk(
  { b: CHILD, skin: SKINS[0]!, hair: HAIRS[1]!, hairDo: "braids", top: SHIRTS[1]!, bottom: SHIRTS[1]!, shoes: PLUM_SHOES, skirt: VIOLET, frill: GOLD, skirtLen: 0.05, hat: "none", hatColor: GOLD, mask: "cat", maskColor: GOLD, lids: LIDS.rose },
  0.66,
  151,
);

// ---------------------------------------------------------------- gaits

/** The band's march: a quick, bouncing second-line step. */
const MARCH: Gait = { step: 0.06, duty: 0.56, lift: 0.016, bounce: 0.005, swing: 0.014, lean: 0.03, roll: 0.02 };
/** The marshal's strut: knees high, leaning back. */
const STRUT: Gait = { step: 0.058, duty: 0.58, lift: 0.032, bounce: 0.007, swing: 0.01, lean: -0.07, roll: 0.03 };
/** The second-liner's dance-walk: a sway in the hips. */
const SASHAY: Gait = { step: 0.06, duty: 0.56, lift: 0.02, bounce: 0.006, swing: 0.016, lean: 0.02, roll: 0.06 };
/** The stilt walker's long, slow stride. */
const STILT_STEP: Gait = { step: 0.112, duty: 0.6, lift: 0.03, bounce: 0.006, swing: 0.01, lean: 0.02, roll: 0.02 };
/** The little one skips: a run with a hop in it. */
const SKIP: Gait = { step: 0.075, duty: 0.4, lift: 0.024, bounce: 0.008, swing: 0.02, lean: 0.05, roll: 0.04 };

/**
 * A walker's gait phase at route place ux (u from the center): its place over its stride, so
 * its planted foot stays put on the street while it walks over it, plus its own offset so no
 * two walk in step.
 */
export function stridePhase(ux: number, g: Gait, size: number, id: number): number {
  return ux / (2 * g.step * size) + pick(id, 0, 3);
}

/** Each walker's figure, gait and size on the route (for tests): the band, the marshal, the carriers, the stilts, the second line. */
export function walkers(): readonly { unit: Unit; f: Folk; g: Gait; k: number }[] {
  return WALKERS;
}

const WALKERS: { unit: Unit; f: Folk; g: Gait; k: number }[] = [
  { unit: "marshal", f: MARSHAL, g: STRUT, k: 1 },
  { unit: "flambeau", f: CARRIERS[0]!, g: MARCH, k: BACK_K },
  { unit: "trumpet", f: TRUMPET, g: MARCH, k: 1 },
  { unit: "sax", f: SAX, g: { ...MARCH, step: 0.064, roll: 0.035 }, k: BACK_K },
  { unit: "trombone", f: TROMBONE, g: { ...MARCH, step: 0.062 }, k: 1 },
  { unit: "sousaphone", f: TUBA, g: { ...MARCH, step: 0.057, bounce: 0.006, lift: 0.013 }, k: 1 },
  { unit: "snare", f: SNARE, g: { ...MARCH, step: 0.059 }, k: BACK_K },
  { unit: "bass", f: BASS, g: { ...MARCH, step: 0.063, lift: 0.014 }, k: 1 },
  { unit: "stilts", f: STILTS, g: STILT_STEP, k: 1 },
  { unit: "flambeau2", f: CARRIERS[1]!, g: { ...MARCH, step: 0.058 }, k: BACK_K },
  { unit: "liner", f: LINER, g: SASHAY, k: BACK_K },
  { unit: "dancer", f: DANCER, g: SKIP, k: 1 },
];
const WALKER_OF = new Map(WALKERS.map((w) => [w.unit, w]));


// ---------------------------------------------------------------- the riders

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

/** A skeleton's beat phase at time t (cycles): the band's tempo, each skeleton on its own count. */
export function bonesPhase(t: number, i: number): number {
  return t * (1.05 + i * 0.07) + pick(131 + i, 0, 5);
}

/**
 * The riders of float `which` (0 the skeletons, 1 the jester's riders) at center x, standing at
 * `stand` behind the body's side, which hides them to the waist. The skeletons dance, each to its
 * own count (a bounce, a step from foot to foot, hips and shoulders swaying, a glove waving
 * overhead and the other pumping, the top hat tipping), and break off to throw; the riders wave
 * and bob, look about, and wind up and throw.
 */
function riders(ctx: Ctx, s: Scene, which: number, x: number, stand: number, lw: number): void {
  const u = s.u;
  const crew = which === 0 ? SKELETONS : RIDERS;
  for (let i = 0; i < crew.length; i++) {
    const f = crew[i]!;
    const p = f.pose;
    const b = f.look.b;
    const rx = x + RIDER_X[i]! * u;
    const th = riderThrow(s.t, which, i);
    p.t = s.t;
    // The pelvis first: the shoulders' height (where the hands are set from) hangs on it, and it
    // must be this frame's, never the last one drawn.
    if (which === 0) dance(p, b, bonesPhase(s.t, i), 1);
    else p.hipY = (b.thigh + b.shin) * 0.97 + b.ankle - 0.004 * Math.max(0, Math.sin(s.t * 4.2 + i * 2));
    const sh = shoulderY(p, b);
    if (which === 0) {
      const ph = bonesPhase(s.t, i);
      f.m = i === 1 ? -1 : 1;
      const q = ph * Math.PI * 2;
      // One glove waving overhead, the other pumping at the hip.
      p.handFX = -0.02 + 0.016 * Math.sin(q * 2 + i);
      p.handFY = sh - 0.05 - 0.008 * Math.cos(q * 2);
      p.elbowF = 1;
      p.handNX = 0.03;
      p.handNY = sh + 0.03 - 0.02 * Math.max(0, Math.sin(q * 2));
      p.elbowN = 1;
      p.mouth = 0.3 + 0.5 * Math.max(0, Math.sin(q * 2));
      p.tilt = 0.1 * Math.sin(q + i);
      p.turn = 0.3 + 0.4 * Math.sin(q * 0.5 + i * 2);
    } else {
      const lk = glance(s.t, f.id, 0.2, 0.6);
      p.lean = 0.04 * Math.sin(s.t * 2.1 + i * 1.7);
      p.twist = 0.5 * Math.sin(s.t * 2.1 + i);
      p.turn = lk.turn;
      p.tilt = lk.tilt;
      f.m = i === 0 ? -1 : 1;
      const wave = Math.sin(s.t * (3 + i * 0.4) + i * 2.1);
      p.handFX = -0.03;
      p.handFY = sh + 0.04;
      p.elbowF = 1;
      p.handNX = 0.036 + wave * 0.006;
      p.handNY = sh - 0.04 + wave * 0.01;
      p.elbowN = 1;
      p.mouth = 0.4;
      p.swing = Math.sin(s.t * 2.1 + i - 1.1);
    }
    if (th.dir !== 0) {
      // The throw takes over the near arm and the lean, and gives them back after.
      const k = th.hold;
      f.m = th.dir;
      const hx = 0.035 - th.wind * 0.05 + th.fly * 0.09;
      const hy = sh - 0.02 - th.wind * 0.06 - th.fly * 0.08;
      p.handNX += (hx - p.handNX) * k;
      p.handNY += (hy - p.handNY) * k;
      p.elbowN = 1;
      p.lean += (-th.wind * 0.15 + th.fly * 0.3 - p.lean) * k;
      p.mouth = Math.max(p.mouth, th.fly);
      p.turn += (0.9 - p.turn) * k;
    }
    p.blink = blinkAt(s.t, f.id);
    draw(ctx, f, rx, stand, u, lw);
    if (th.wind > 0.1) {
      const h = toScreen(f, f.rig.wrN, rx, stand, u, HAND);
      beadString(ctx, h.x, h.y, u * 0.02, BEAD_COLORS[th.k % BEAD_COLORS.length]!, lw * 0.6);
    }
  }
}
const HAND = { x: 0, y: 0 };

// ---------------------------------------------------------------- the walkers

/** Draw walker `unit` at route place ux (u from the center), feet at y. */
function walker(ctx: Ctx, s: Scene, unit: Unit, ux: number, y: number, lw: number): void {
  const w = WALKER_OF.get(unit)!;
  const f = w.f;
  const u = s.u;
  const size0 = f.size;
  f.size = size0 * w.k;
  // The second rank, half hidden behind the first, is drawn without its finest touches.
  f.lod = w.k < 1 ? 0.65 : 1;
  const ph = stridePhase(ux, w.g, f.size, f.id);
  const p = f.pose;
  const b = f.look.b;
  p.t = s.t;
  walk(p, b, ph, w.g);
  const lk = glance(s.t, f.id, 0.5, unit === "marshal" || unit === "stilts" || unit === "liner" ? 0.8 : 0.3);
  p.turn = lk.turn;
  p.tilt = lk.tilt * 0.6;
  p.blink = blinkAt(s.t, f.id);
  p.mouth = 0.35;
  const x = s.cssW / 2 + ux * u;
  const q = ph * Math.PI * 2;
  const sh = shoulderY(p, b);
  const fw = (lw * 0.6) / (u * f.size);
  if (unit === "marshal") {
    // The umbrella pumped up on every other step, the handkerchief waving; now and then he
    // spins the umbrella and leans back to grin at us.
    const pump = Math.max(0, Math.sin(q * 2));
    const show = now(s.t, f.id, 7.5, 1.6, 2.2);
    p.handNX = 0.05;
    p.handNY = sh - 0.012 - pump * 0.01 - show * 0.006;
    p.elbowN = 1;
    p.handFX = -0.028 + Math.sin(s.t * 6) * 0.006;
    p.handFY = sh - 0.03 + Math.cos(s.t * 6) * 0.004;
    p.elbowF = 1;
    p.lean -= show * 0.08;
    p.turn = p.turn * (1 - show) + 0.1 * show;
    p.mouth = 0.5 + show * 0.4;
    draw(ctx, f, x, y, u, lw);
    inFrame(ctx, f, x, y, u, (c) => {
      const r = f.rig;
      umbrella(c, r.wrN.x, r.wrN.y, 0.034, 0.42 + 0.08 * Math.sin(q), s.t * 0.6 + show * 2, s.t, 1.3, fw);
      hanky(c, r.wrF.x, r.wrF.y - 0.004, 0.018, s.t, 0.5, fw);
    });
  } else if (unit === "flambeau" || unit === "flambeau2") {
    // The torch held high in both hands, swaying with the stride; every so often a twirl.
    const twirl = now(s.t, f.id, 6.5, 1.1, unit === "flambeau" ? 3.4 : 1.2);
    const spin = twirl > 0 ? Math.PI * 2 * smooth(phaseIn(s.t, 6.5, 1.1, unit === "flambeau" ? 3.4 : 1.2)) : 0;
    p.handNX = 0.03;
    p.handNY = sh + 0.006 + 0.004 * Math.sin(q * 2);
    p.handFX = 0.026;
    p.handFY = sh + 0.03;
    p.elbowN = 1;
    p.elbowF = 1;
    if (twirl > 0) {
      p.handFX = -0.034;
      p.handFY = sh - 0.02;
      p.elbowF = 1;
      p.mouth = 0.8;
    }
    draw(ctx, f, x, y, u, lw, (c) =>
      inFrame(c, f, x, y, u, (cc) => {
        const r = f.rig;
        flambeau(cc, r.wrN.x, r.wrN.y + 0.006, 0.12, 0.06 * Math.sin(q) + spin, s.t, f.id, fw);
      }),
    );
  } else if (unit === "trumpet") {
    // Horn up to the sky on the accents, higher still on a solo every few seconds.
    const solo = now(s.t, f.id, 8.5, 2.2, 1.0);
    p.turn = 0.85;
    p.tilt = -0.1 - solo * 0.25;
    p.lean = w.g.lean - solo * 0.12;
    holdTrumpet(f, 0.1 + 0.12 * Math.max(0, Math.sin(q * 2)) + solo * 0.35);
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => trumpet(cc, fw)));
  } else if (unit === "sax") {
    p.turn = 0.8;
    p.tilt = 0.05 * Math.sin(q);
    const dip = now(s.t, f.id, 7, 2, 4.2);
    p.hipY -= dip * 0.008;
    p.lean += 0.06 * Math.sin(q) - dip * 0.1;
    holdSax(f, 0.12 * Math.sin(q) - dip * 0.15);
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => sax(cc, fw)));
  } else if (unit === "trombone") {
    p.turn = 0.85;
    holdTrombone(f, (1 + Math.sin(q * 2)) / 2, 0.05 + 0.05 * Math.sin(q));
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => trombone(cc, fw)));
  } else if (unit === "sousaphone") {
    p.turn = 0.7;
    holdSousaphone(f, Math.sin(q * 2));
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => sousaphone(cc, f, fw)));
  } else if (unit === "snare") {
    p.turn = 0.4;
    holdSnare(f, ph * 4);
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => snare(cc, f, fw)));
  } else if (unit === "bass") {
    p.turn = 0.5;
    const beat = Math.pow(Math.max(0, Math.cos(q * 2)), 6);
    holdBass(f, beat);
    p.mouth = 0.3 + beat * 0.5;
    draw(ctx, f, x, y, u, lw, (c) => inFrame(c, f, x, y, u, (cc) => bassDrum(cc, f, fw)));
  } else if (unit === "stilts") {
    // Arms out wide and waving by turns, the cap's points flopping.
    p.handNX = 0.05 + 0.01 * Math.sin(q);
    p.handNY = sh - 0.045 + 0.02 * Math.sin(q + 1);
    p.elbowN = 1;
    p.handFX = -0.05 - 0.01 * Math.sin(q);
    p.handFY = sh - 0.03 - 0.02 * Math.sin(q + 1);
    p.elbowF = 1;
    p.mouth = 0.7;
    draw(ctx, f, x, y, u, lw);
  } else if (unit === "liner") {
    // A parasol up in the near hand, bobbing; the handkerchief waving in the far.
    p.handNX = 0.03;
    p.handNY = sh - 0.034 - 0.008 * Math.max(0, Math.sin(q * 2));
    p.elbowN = 1;
    p.handFX = -0.03 + 0.01 * Math.sin(s.t * 5.5);
    p.handFY = sh - 0.02 + 0.006 * Math.cos(s.t * 5.5);
    p.elbowF = 1;
    p.mouth = 0.6;
    p.swing = Math.sin(q - 1.4);
    draw(ctx, f, x, y, u, lw);
    inFrame(ctx, f, x, y, u, (c) => {
      const r = f.rig;
      parasol(c, r.wrN.x, r.wrN.y, 0.032, 0.12 * Math.sin(q) + 0.18, GREEN, s.t, 0.9, fw);
      hanky(c, r.wrF.x, r.wrF.y - 0.003, 0.016, s.t, 2.1, fw);
    });
  } else {
    // The little one skipping, her parasol up and twirling.
    p.handNX = 0.046;
    p.handNY = sh - 0.04;
    p.elbowN = 1;
    p.handFX = -0.03;
    p.handFY = sh + 0.02 - 0.01 * Math.sin(q * 2);
    p.mouth = 0.7;
    draw(ctx, f, x, y, u, lw);
    inFrame(ctx, f, x, y, u, (c) => {
      const r = f.rig;
      parasol(c, r.wrN.x, r.wrN.y, 0.044, -0.35 + 0.18 * Math.sin(s.t * 3), VIOLET, s.t, 2.7, fw);
    });
  }
  f.size = size0;
}

/** Where figure `id` is through an occasional act (0..1 across its `len` s, or 0 outside it). */
function phaseIn(t: number, every: number, len: number, at: number): number {
  const e = (((t - at) % every) + every) % every;
  return e > len ? 0 : e / len;
}

// ---------------------------------------------------------------- the parade

/** Draw the parade where it is at the scene's time, its feet on the route in front of the stand. */
export function parade(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const half = s.cssW / 2 / u + 0.2;
  if (!paradeShown(s.t, half)) return;
  const y = s.groundY + ROUTE * u;
  if (y - u * 0.3 > s.cssH) return;
  const lw = inkW(s);
  const hx = headX(s.t);
  const beat = (hx / 0.12) * Math.PI * 2;
  // The second rank first, then the first; each back to front along the route, so the floats'
  // beads fly over the band.
  for (let rank = 1; rank >= 0; rank--) {
    for (let i = UNITS.length - 1; i >= 0; i--) {
      const [unit, pos] = UNITS[i]!;
      if ((BACK_RANK.has(unit) ? 1 : 0) !== rank) continue;
      const ux = hx - pos;
      if (ux < -half || ux > half) continue;
      const x = s.cssW / 2 + ux * u;
      const ry = rank ? y - BACK_UP * u : y;
      if (unit === "float") jesterFloat(ctx, s, x, ry, lw, beat, (stand) => riders(ctx, s, 1, x, stand, lw));
      else if (unit === "bones") bonesFloat(ctx, s, x, ry, lw, beat, (stand) => riders(ctx, s, 0, x, stand, lw));
      else walker(ctx, s, unit, ux, ry, lw);
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
    beadString(ctx, 0, -u * 0.012, u * 0.028, BEAD_COLORS[i % BEAD_COLORS.length]!, lw * 0.6);
    ctx.restore();
  }
}

/** For tests: float `which`'s crew (0 the skeletons, 1 the jester's riders), as last drawn. */
export function ridersOf(which: number): readonly Folk[] {
  return which === 0 ? SKELETONS : RIDERS;
}


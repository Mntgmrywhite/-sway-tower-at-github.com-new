import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { BEARD, CHEEK, HAT, INK, SKIN } from "./colors";
import { block } from "./shapes";

// The hat on the gatepost, and whose it is. On the left gatepost of the dry-stone wall in front
// sits a tiny green hat, as if someone had left it there. Now and then it lifts: a second
// leprechaun of our own has been crouched behind the post all along with the hat on his head.
// He is of the same family as the one minding the pot of gold (rosy cheeks, ginger hair and
// beard; his green coat stays down behind the wall), younger and cheekier: a short round beard
// and a curled moustache, a grin, a wink. Up he comes, eyes first from under the brim, his
// fingertips curling over the top of the post; he looks about, at the leprechaun with his pot
// or at the cottage, then at you, grins and maybe winks, and ducks back down. The hat comes
// down with him and sits on the post exactly as it did.
//
// His first visit is in a tower's first seconds: he watches the other one lug his pot of gold
// out to the rainbow's end, rises to see it set down, then turns to you with a grin and a wink,
// and ducks just as the other one slips behind his pot. After that he comes up once in most
// SLOT seconds (never missing two running), at a moment picked by hash, in one of three ways: a
// quick peek with only his eyes over the post, a long look about, or a look about that ends in
// a grin and a wink (the first of these is always a long look about).
//
// He stays behind the wall: his head is narrower than the post (front.ts), so all that ever
// shows is what rises above the post's top: the hat, his head and his fingertips. Everything is
// a function of the scene's clock. Sizes and offsets are in u.

/** How he is placed this frame. All zero is the rest: down behind the post, the hat on it. */
export interface Pose {
  /** How far he has risen (u). */
  rise: number;
  /** His face turned toward his left (-1) or right (1): his features slide across his head. */
  turn: number;
  /** His head tipped (radians, + toward the screen's right). */
  tilt: number;
  /** Where his eyes look (u). */
  lookX: number;
  lookY: number;
  /** 0 a smile, 1 a big open grin. */
  grin: number;
  /** Brows raised (0..1). */
  brows: number;
  /** His fingertips: 0 down behind the post, 1 curled over its top. */
  hands: number;
  /** Both eyes shut (a blink), his left eye shut (a wink): 0 or 1. */
  blink: number;
  wink: number;
  /** The hat hopping up off his head as he grins (u). */
  hop: number;
}

const POSE: Pose = { rise: 0, turn: 0, tilt: 0, lookX: 0, lookY: 0, grin: 0, brows: 0, hands: 0, blink: 0, wink: 0, hop: 0 };

/** How far he rises to peek with his eyes over the post (the nose just showing), and to show his whole face. */
export const PEEK_RISE = 0.019;
export const FULL_RISE = 0.038;

/** How high the hat hops off his head as he grins (u), and so the highest it ever goes above its rest on the post. */
const HOP = 0.006;
export const HAT_HIGHEST = FULL_RISE + HOP;

/** Whether a pose is the rest: down behind the post, the hat on it. */
export function atRest(p: Pose): boolean {
  return (
    p.rise === 0 &&
    p.turn === 0 &&
    p.tilt === 0 &&
    p.lookX === 0 &&
    p.lookY === 0 &&
    p.grin === 0 &&
    p.brows === 0 &&
    p.hands === 0 &&
    p.blink === 0 &&
    p.wink === 0 &&
    p.hop === 0
  );
}

// ---------------------------------------------------------------- the visits

/** A key pose: time into the visit (s), then rise, turn, tilt, lookX, lookY, grin, brows, hands. */
type Key = readonly [t: number, rise: number, turn: number, tilt: number, lookX: number, lookY: number, grin: number, brows: number, hands: number];
/** A span of a visit (s): [from, to]. */
type Span = readonly [number, number];

interface Visit {
  keys: readonly Key[];
  blinks: readonly Span[];
  winks: readonly Span[];
  hops: readonly Span[];
}

const P = PEEK_RISE;
const F = FULL_RISE;
/** Eyes to the right and a little up (toward the pot of gold), and to the left (the cottage). */
const RIGHT = 0.0022;
const UP = -0.0008;
const LEFT = -0.0022;
const REST: Key = [0, 0, 0, 0, 0, 0, 0, 0, 0];

/**
 * His first visit, while the other leprechaun lugs his pot out (gold.ts: from 1.4 s, set down at
 * 4.5 s, slips behind it by 5.4 s, peeks out at 6 s): eyes over the post following him across,
 * up to see the pot set down, then a grin and a wink at you, and down as the other one peeks.
 */
const FIRST: Visit = {
  keys: [
    REST,
    [0.55, P, 0.5, 0.03, RIGHT * 0.7, UP, 0, 1, 0],
    [1.5, P, 0.7, 0.05, RIGHT, UP, 0, 1, 0],
    [1.9, F, 0.7, 0.05, RIGHT, UP, 0.4, 0.5, 1],
    [2.6, F, 0.8, 0.06, RIGHT, UP * 0.6, 0.5, 0.3, 1],
    [2.95, F, 0, -0.04, 0, 0, 1, 0.6, 1],
    [3.75, F, 0, -0.04, 0, 0, 1, 0.6, 1],
    [4.3, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  blinks: [],
  winks: [[3.05, 3.5]],
  hops: [[2.95, 3.4]],
};

/** A quick peek: only his eyes come over the post, dart left and right, a blink, and down. */
const PEEK: Visit = {
  keys: [
    REST,
    [0.45, P, 0, 0, 0, 0, 0, 1, 0],
    [0.95, P, -0.5, -0.03, LEFT, 0, 0, 1, 0],
    [1.55, P, 0.6, 0.03, RIGHT, UP, 0, 1, 0],
    [2.1, P, 0, 0, 0, 0, 0, 0.5, 0],
    [2.7, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  blinks: [[1.75, 1.88]],
  winks: [],
  hops: [],
};

/** A long look about: right up, hands on the post, to the left and the right, a blink, and down. */
const LOOK: Visit = {
  keys: [
    REST,
    [0.5, F, 0, 0, 0, 0, 0.2, 0.8, 1],
    [1.2, F, -0.7, -0.05, LEFT, 0, 0.2, 0.4, 1],
    [1.9, F, -0.7, -0.05, LEFT, UP, 0.2, 0.4, 1],
    [2.5, F, 0.7, 0.06, RIGHT, UP, 0.3, 0.4, 1],
    [3.1, F, 0.7, 0.06, RIGHT, UP, 0.3, 0.4, 1],
    [3.6, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  blinks: [[2.2, 2.33]],
  winks: [],
  hops: [],
};

/** A look about that ends with a grin and a wink at you, the hat hopping on his head. */
const GRIN: Visit = {
  keys: [
    REST,
    [0.5, F, 0, 0, 0, 0, 0.3, 0.6, 1],
    [1.1, F, -0.6, -0.05, LEFT, 0, 0.3, 0.3, 1],
    [1.8, F, 0.7, 0.06, RIGHT, UP, 0.3, 0.3, 1],
    [2.3, F, 0, 0, 0, 0, 1, 0.7, 1],
    [3.0, F, 0, 0, 0, 0, 1, 0.7, 1],
    [3.6, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  blinks: [],
  winks: [[2.4, 2.8]],
  hops: [[2.35, 2.8]],
};

/** The kinds of later visit, in the order `visitAt` reports them (FIRST is kind 0). */
const VISITS = [FIRST, PEEK, LOOK, GRIN] as const;
export const FIRST_VISIT = 0;
export const PEEK_VISIT = 1;
export const LOOK_VISIT = 2;
export const GRIN_VISIT = 3;

/** How long a visit lasts (s). */
export function visitLength(kind: number): number {
  const keys = VISITS[kind]!.keys;
  return keys[keys.length - 1]![0];
}

/** His first visit starts this soon into a tower (s). */
export const FIRST_AT = 2;
/** After it, the clock is cut into slots of SLOT seconds from SLOTS_FROM; most hold one visit, at least GAP seconds clear of the slot's ends. */
const SLOTS_FROM = 12;
export const SLOT = 13;
const GAP = 4;
/** How often a slot (after the first, which always has one) holds a visit; never two empty slots running. */
const SHOWS = 0.8;

/** Whether he stays down all through slot `n`. */
function skipped(n: number): boolean {
  return n > 0 && hash(n * 7 + 9800) > SHOWS;
}

/** Scratch result of `slot`. */
const SLOT_VISIT = { kind: 0, at: 0 };

/** The visit in slot `n` (from 0): its kind and start (s), or null if he stays down all slot. */
export function slot(n: number): typeof SLOT_VISIT | null {
  if (skipped(n) && !skipped(n - 1)) return null;
  const kind = n === 0 ? LOOK_VISIT : 1 + Math.floor(hash(n * 7 + 9801) * 3);
  SLOT_VISIT.kind = kind;
  SLOT_VISIT.at = SLOTS_FROM + n * SLOT + GAP / 2 + hash(n * 7 + 9802) * (SLOT - GAP - visitLength(kind));
  return SLOT_VISIT;
}

/** Scratch result of `visitAt`. */
const NOW = { kind: 0, at: 0 };

/** The visit under way at time `t`: its kind and when it started, or null while he is down. */
export function visitAt(t: number): typeof NOW | null {
  if (t < SLOTS_FROM) {
    if (t < FIRST_AT || t >= FIRST_AT + visitLength(FIRST_VISIT)) return null;
    NOW.kind = FIRST_VISIT;
    NOW.at = FIRST_AT;
    return NOW;
  }
  const v = slot(Math.floor((t - SLOTS_FROM) / SLOT));
  if (!v || t < v.at || t >= v.at + visitLength(v.kind)) return null;
  NOW.kind = v.kind;
  NOW.at = v.at;
  return NOW;
}

function ease(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** 1 inside any of `spans` at `k` (eased in and out over `fade`), else 0. */
function within(spans: readonly Span[], k: number, fade: number): number {
  let v = 0;
  for (let i = 0; i < spans.length; i++) {
    const a = spans[i]![0];
    const b = spans[i]![1];
    v = Math.max(v, ease((k - a) / fade) * (1 - ease((k - b + fade) / fade)));
  }
  return v;
}

/** Field `j` of a key pose, eased `e` of the way from key `a` to key `b`. */
function between(a: Key, b: Key, j: number, e: number): number {
  return a[j]! + (b[j]! - a[j]!) * e;
}

/** How he is placed at time `t`: at rest between visits, else eased between his visit's key poses. */
export function lookout(t: number): Pose {
  const p = POSE;
  p.rise = p.turn = p.tilt = p.lookX = p.lookY = p.grin = p.brows = p.hands = p.blink = p.wink = p.hop = 0;
  const v = visitAt(t);
  if (!v) return p;
  const visit = VISITS[v.kind]!;
  const k = t - v.at;
  const keys = visit.keys;
  let i = 1;
  while (i < keys.length - 1 && keys[i]![0] <= k) i++;
  const a = keys[i - 1]!;
  const b = keys[i]!;
  const e = ease((k - a[0]) / (b[0] - a[0]));
  p.rise = between(a, b, 1, e);
  p.turn = between(a, b, 2, e);
  p.tilt = between(a, b, 3, e);
  p.lookX = between(a, b, 4, e);
  p.lookY = between(a, b, 5, e);
  p.grin = between(a, b, 6, e);
  p.brows = between(a, b, 7, e);
  p.hands = between(a, b, 8, e);
  p.blink = within(visit.blinks, k, 0.04) > 0.5 ? 1 : 0;
  p.wink = within(visit.winks, k, 0.08) > 0.5 ? 1 : 0;
  p.hop = within(visit.hops, k, 0.2) * HOP;
  return p;
}


// ---------------------------------------------------------------- drawing

/** His head's radius (with its ink and his ginger sideburns, narrower than the post: front.ts POST_W). */
const HEAD_R = 0.0135;
/** His round nose: a shade deeper than the other's, since it has no outline. */
const NOSE = "#f79a86";
/** Where the hat's brim sits below the post's top at rest (u), the brim above his head's center (on his head), and so his head's center below the post's top at rest. */
const HAT_REST = 0.002;
const HAT_Y = -0.0125;
const HEAD_Y = HAT_REST - HAT_Y;
/** His eyes' radius (u). */
const EYE_R = 0.0023;
/** How far his features slide across his head as he turns it (u). */
const TURN_SHIFT = 0.004;
/** His fingertips: either side of the post's center, their size, and how far below its top they wait (u). */
const HAND_X = 0.012;
const TIP_R = 0.003;
const HAND_DOWN = 0.012;

/**
 * The hat on the gatepost (`x` its center, `y` its brim): a brim, a tall crown a little wider at
 * the top, a darker band.
 */
export function gateHat(ctx: Ctx, u: number, x: number, y: number, lw: number): void {
  const crownW = u * 0.032;
  const crownH = u * 0.036;
  ctx.beginPath();
  ctx.moveTo(x - crownW / 2, y - u * 0.003);
  ctx.lineTo(x - crownW * 0.56, y - crownH);
  ctx.quadraticCurveTo(x, y - crownH - u * 0.005, x + crownW * 0.56, y - crownH);
  ctx.lineTo(x + crownW / 2, y - u * 0.003);
  ctx.closePath();
  ctx.fillStyle = HAT.body;
  ctx.fill();
  ctx.fillStyle = HAT.light;
  ctx.fillRect(x - crownW * 0.4, y - crownH + u * 0.005, crownW * 0.2, crownH - u * 0.016);
  ctx.fillStyle = HAT.shade;
  ctx.fillRect(x - crownW * 0.52, y - u * 0.015, crownW * 1.04, u * 0.008);
  ink(ctx, lw * 0.85, INK);
  ctx.beginPath();
  block(ctx, x - u * 0.028, y - u * 0.005, u * 0.056, u * 0.009, u * 0.0045);
  ctx.fillStyle = HAT.body;
  ctx.fill();
  ink(ctx, lw * 0.85, INK);
}

/**
 * The hat where it is this frame: on the post (`x` the post's center, `top` its top), or on his
 * head as he rises, tipping with it and hopping as he grins. At rest it is drawn exactly as it
 * always sat there.
 */
export function hatOnPost(ctx: Ctx, u: number, x: number, top: number, lw: number, p: Pose): void {
  if (atRest(p)) {
    gateHat(ctx, u, x, top + u * HAT_REST, lw);
    return;
  }
  ctx.save();
  ctx.translate(x, top + u * (HEAD_Y - p.rise));
  ctx.rotate(p.tilt);
  gateHat(ctx, u, 0, u * (HAT_Y - p.hop), lw);
  ctx.restore();
}

/**
 * Him, behind the post (`x` its center, `top` its top), drawn before the wall and the posts so
 * they hide all of him below the post's top: his head (no hat: that is drawn last, over the
 * post), and his fingertips on the top of the post.
 */
export function lookoutBehind(ctx: Ctx, u: number, x: number, top: number, lw: number, p: Pose): void {
  if (atRest(p)) return;
  const w = lw / u;
  const hy = top + u * (HEAD_Y - p.rise);
  ctx.save();
  ctx.translate(x, hy);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.rotate(p.tilt);
  head(ctx, p, w);
  ctx.restore();
  if (p.hands > 0.01) {
    // Fingertips coming up behind the post's top either side of him (only what clears it shows).
    const y = top + u * (HAND_DOWN * (1 - p.hands) - TIP_R * 0.4);
    const r = u * TIP_R;
    ctx.beginPath();
    for (let side = -1; side <= 1; side += 2) {
      const hx = x + side * u * HAND_X;
      circle(ctx, hx - r * 1.4, y + r * 0.2, r);
      circle(ctx, hx, y - r * 0.15, r);
      circle(ctx, hx + r * 1.4, y + r * 0.2, r);
    }
    ctx.fillStyle = SKIN.body;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
    ctx.fill();
  }
}

/**
 * His short round beard, cheek to cheek under the chin (`bx` shifts it as he turns): its outer
 * edge, and (`whole`) back along the line of his moustache, closed for filling.
 */
function beardPath(ctx: Ctx, bx: number, whole: boolean): void {
  ctx.beginPath();
  ctx.moveTo(-0.0136, -0.001);
  ctx.quadraticCurveTo(-0.0165, 0.012, bx - 0.007, 0.019);
  ctx.quadraticCurveTo(bx, 0.0235, bx + 0.007, 0.019);
  ctx.quadraticCurveTo(0.0165, 0.012, 0.0136, -0.001);
  if (!whole) return;
  ctx.quadraticCurveTo(bx + 0.008, 0.0068, bx, 0.0064);
  ctx.quadraticCurveTo(bx - 0.008, 0.0068, -0.0136, -0.001);
  ctx.closePath();
}

/** His head at (0, 0), in u: his face, ginger sideburns and beard, his mouth and moustache, cheeks and nose, eyes and brows. */
function head(ctx: Ctx, p: Pose, w: number): void {
  const fx = p.turn * TURN_SHIFT;
  const bx = fx * 0.5;
  ctx.beginPath();
  circle(ctx, 0, 0, HEAD_R);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.65, INK);
  ctx.fillStyle = SKIN.light;
  ctx.beginPath();
  oval(ctx, fx * 0.3 - 0.0045, -0.0068, 0.005, 0.0032, -0.4);
  ctx.fill();
  // Ginger hair under his hat, down his temples to the beard.
  ctx.beginPath();
  oval(ctx, -0.0112, -0.0068, 0.0032, 0.0052, 0.35);
  oval(ctx, 0.0112, -0.0068, 0.0032, 0.0052, -0.35);
  ctx.fillStyle = BEARD.body;
  ctx.fill();
  beardPath(ctx, bx, true);
  ctx.fillStyle = BEARD.body;
  ctx.fill();
  ctx.fillStyle = BEARD.light;
  ctx.beginPath();
  oval(ctx, bx - 0.0072, 0.0115, 0.0021, 0.0042, 0.4);
  ctx.fill();
  beardPath(ctx, bx, false);
  ink(ctx, w * 0.65, INK);
  mouth(ctx, fx, p.grin, w);
  // A curled ginger moustache under his nose.
  ctx.beginPath();
  oval(ctx, fx * 0.9 - 0.0034, 0.0071, 0.0036, 0.0015, 0.28);
  oval(ctx, fx * 0.9 + 0.0034, 0.0071, 0.0036, 0.0015, -0.28);
  ctx.fillStyle = BEARD.shade;
  ctx.fill();
  // Rosy cheeks and a round nose.
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, fx - 0.0076, 0.0034, 0.0029, 0.0021);
  oval(ctx, fx + 0.0076, 0.0034, 0.0029, 0.0021);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, fx * 1.2, 0.0034, 0.003);
  ctx.fillStyle = NOSE;
  ctx.fill();
  eyes(ctx, p, fx, w);
}

/** A smile in his beard, opening into a grin (`grin` 0..1). */
function mouth(ctx: Ctx, fx: number, grin: number, w: number): void {
  const x = fx * 0.8;
  const y = 0.0104;
  const half = 0.0038 + grin * 0.0012;
  if (grin < 0.35) {
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.quadraticCurveTo(x, y + 0.0034 + grin * 0.002, x + half, y);
    ctx.strokeStyle = BEARD.shade;
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
    return;
  }
  // An open grin: a dark mouth, a strip of teeth along its top.
  const deep = 0.002 + grin * 0.0035;
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.quadraticCurveTo(x, y + 0.0012, x + half, y);
  ctx.quadraticCurveTo(x, y + deep * 2, x - half, y);
  ctx.closePath();
  ctx.fillStyle = "#7a2633";
  ctx.fill();
  ink(ctx, w * 0.5, INK);
  ctx.beginPath();
  ctx.moveTo(x - half * 0.7, y + 0.0011);
  ctx.quadraticCurveTo(x, y + 0.0022, x + half * 0.7, y + 0.0011);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = w * 0.55;
  ctx.stroke();
}

/** His eyes, looking where he looks (shut for a blink; his left one shut in a happy curve for a wink), and bushy ginger brows. */
function eyes(ctx: Ctx, p: Pose, fx: number, w: number): void {
  const y = -0.0026 + p.lookY;
  const lx = fx - 0.0045 + p.lookX;
  const rx = fx + 0.0045 + p.lookX;
  const leftOpen = p.blink === 0;
  const rightOpen = p.blink === 0 && p.wink === 0;
  ctx.beginPath();
  if (leftOpen) circle(ctx, lx, y, EYE_R);
  if (rightOpen) circle(ctx, rx, y, EYE_R);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  if (leftOpen) circle(ctx, lx + 0.0008, y - 0.0009, 0.0009);
  if (rightOpen) circle(ctx, rx + 0.0008, y - 0.0009, 0.0009);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  if (!leftOpen) {
    ctx.moveTo(lx - 0.0022, y);
    ctx.lineTo(lx + 0.0022, y);
  }
  if (!rightOpen && p.blink) {
    ctx.moveTo(rx - 0.0022, y);
    ctx.lineTo(rx + 0.0022, y);
  } else if (!rightOpen) {
    ctx.moveTo(rx - 0.0024, y + 0.0006);
    ctx.quadraticCurveTo(rx, y - 0.0022, rx + 0.0024, y + 0.0006);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.8;
  ctx.stroke();
  // Brows: raised as he peeks, the winking one drawn down.
  const up = p.brows * 0.0014;
  const by = -0.0068 - up;
  const wb = p.wink ? 0.0012 + up : 0;
  ctx.beginPath();
  ctx.moveTo(fx - 0.0072, by + 0.0004);
  ctx.quadraticCurveTo(fx - 0.0044, by - 0.0022, fx - 0.0016, by);
  ctx.moveTo(fx + 0.0016, by + wb);
  ctx.quadraticCurveTo(fx + 0.0044, by - 0.0022 + wb, fx + 0.0072, by + 0.0004 + wb);
  ctx.strokeStyle = BEARD.shade;
  ctx.lineWidth = w * 0.75;
  ctx.stroke();
}

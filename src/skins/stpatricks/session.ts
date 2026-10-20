import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { ARAN, BELLOWS, BOX, BREW, CAP, CHEEK, FOAM, GOLD, INK, IRON, SHOE, SKIN, TROUSERS, WHISKERS, WOOD } from "./colors";
import { block } from "./shapes";
import { centerX, inkW } from "./tower";

// The session outside: a little pub touch on the meadow. In the front corner on the right,
// between the cobbler's toadstool and the screen's edge (the only open ground near enough to
// read: the cottage on the left fills its corner from the screen's edge to the round tower's
// mound, with the wall just below it and the flock just above), an old box player sits on a
// three-legged stool by an upturned barrel, playing jigs on his button accordion: a cream Aran
// jumper, a tweed flat cap, a short white beard, eyes shut in the tune, his boot tapping the
// beat. On the barrel's head stand three pints of green brew under creamy heads. Between tunes
// he lets the box rest, reaches over for his pint, raises it high to the gold up the meadow in a
// toast (a couple of little cheers-bobs, beaming), sets it back down on the barrel and plays on.
// The first toast comes just after the leprechaun has set his pot down (FIRST_TOAST), then one
// every 20 to 30 seconds. Nobody drinks, nobody staggers: a raised glass and a tune.
//
// Near, so drawn like the toadstool beside it: flat two-tone fills, one ink weight, our own
// figure. He stays below the tower's floor line, under the pot of gold and clear of the
// toadstool, the wall and the screen's edge, even with his pint raised (session.test.ts).
// Everything is a function of the scene's time.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The ground they stand on (a little nearer than the toadstool's), the barrel's center and the stool's (u). */
export const SESSION_FOOT = 0.302;
export const BARREL_X = 0.3865;
export const PLAYER_X = 0.448;
/** The barrel: half its width at the heads and at the belly, its height (u). */
const BARREL_END = 0.021;
const BARREL_BELLY = 0.0243;
const BARREL_H = 0.048;
/** The pints on the barrel's head (u from its center); he takes the last, the one nearest him. */
const PINTS = [-0.0148, 0, 0.0148] as const;
const HIS = 2;
/** A pint on its own, in his hand (u from where it stands). */
const ZERO = [0] as const;
/** A pint: height to the rim, half widths at the foot and the rim, the head's depth and its dome over the rim (u). */
const PINT_H = 0.025;
const PINT_FOOT = 0.0054;
const PINT_RIM = 0.0071;
const HEAD = 0.005;
const DOME = 0.0028;

/** The first toast (s): just after the pot of gold is down and he has slipped behind it (gold.ts: SETTLED). */
export const FIRST_TOAST = 5.6;
/** Then one toast a slot, give or take half the jitter, so they come 20 to 30 s apart (s). */
export const TOAST_SLOT = 25;
const TOAST_JITTER = 5;
/** A toast from the box going quiet to playing on again (s). */
export const TOAST = 3.4;
/** The tune: a beat (a jig's dotted crotchet, s) and one push and pull of the bellows (s). */
const BEAT = 0.5;
const SQUEEZE = 2;
/** Within a toast (s from its start): the box goes quiet, his hand reaches for the pint, raises it, holds it up, lowers it, lets go, goes back to the keys, and the tune starts again. */
const QUIET = 0.45;
const REACH_AT = 0.35;
const REACH_T = 0.45;
export const GRAB = 0.8;
const RAISE_T = 0.6;
const HOLD_AT = GRAB + RAISE_T;
const HOLD_T = 0.8;
const LOWER_T = 0.55;
export const RELEASE = HOLD_AT + HOLD_T + LOWER_T;
const BACK_T = 0.4;
const PLAY_AGAIN = 3;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** When toast `n` starts (s): the first by hand, then one a slot with a little jitter by hash. */
export function toastStart(n: number): number {
  if (n <= 0) return FIRST_TOAST;
  return FIRST_TOAST + n * TOAST_SLOT + (hash(n * 17 + 9900) - 0.5) * TOAST_JITTER;
}

/** Seconds into the toast under way at `t`, or -1 between toasts. */
export function toastAt(t: number): number {
  const n = Math.round((t - FIRST_TOAST) / TOAST_SLOT);
  for (let i = Math.max(0, n - 1); i <= n + 1; i++) {
    const k = t - toastStart(i);
    if (k >= 0 && k < TOAST) return k;
  }
  return -1;
}

/** What he is doing this frame. */
export interface Pose {
  /** How much he is playing: 1 in the tune, 0 resting the box between tunes. */
  playing: number;
  /** How far the bellows are drawn open (0 closed .. 1 wide). */
  open: number;
  /** His nod on the beat (0..1) and his boot's tap (0 down .. 1 toe up). */
  bob: number;
  tap: number;
  /** His right hand: 0 on the keys .. 1 at his pint on the barrel; then how high he has raised it (0 on the barrel .. 1 high), and the cheers-bob up there (0..1). */
  reach: number;
  raise: number;
  cheers: number;
  /** Whether his pint is in his hand, off the barrel. */
  holding: boolean;
  /** 0 eyes shut in the tune .. 1 eyes open, beaming, for the toast. */
  beam: number;
}

const POSE: Pose = { playing: 1, open: 0.5, bob: 0, tap: 0, reach: 0, raise: 0, cheers: 0, holding: false, beam: 0 };

/** His pose at time `t` (a shared scratch object: copy it to keep it). */
export function pose(t: number): Pose {
  const p = POSE;
  const k = toastAt(t);
  if (k < 0) {
    p.playing = 1;
    p.reach = 0;
    p.raise = 0;
    p.cheers = 0;
    p.holding = false;
    p.beam = 0;
  } else {
    p.playing = k < PLAY_AGAIN ? 1 - ease(k / QUIET) : ease((k - PLAY_AGAIN) / (TOAST - PLAY_AGAIN));
    p.reach = k < RELEASE ? ease((k - REACH_AT) / REACH_T) : 1 - ease((k - RELEASE) / BACK_T);
    p.raise = k < HOLD_AT ? ease((k - GRAB) / RAISE_T) : 1 - ease((k - HOLD_AT - HOLD_T) / LOWER_T);
    const c = (k - HOLD_AT) / HOLD_T;
    p.cheers = c > 0 && c < 1 ? 0.5 - 0.5 * Math.cos(c * Math.PI * 4) : 0;
    p.holding = k >= GRAB && k < RELEASE;
    p.beam = ease((k - 0.3) / 0.3) * (1 - ease((k - RELEASE) / 0.45));
  }
  const pl = p.playing;
  p.open = 0.15 * (1 - pl) + pl * (0.5 + 0.5 * Math.sin((t / SQUEEZE) * Math.PI * 2));
  const beat = Math.sin((t / BEAT) * Math.PI * 2);
  p.bob = pl * Math.max(0, beat) ** 2;
  p.tap = pl * Math.max(0, -beat);
  return p;
}

// ---------------------------------------------------------------- the pints

/** A pint's glass (foot at x, y; tapering in to its foot) with the head's dome over its rim, as one subpath (u frame). */
function pintPath(ctx: Ctx, x: number, y: number): void {
  const top = y - PINT_H;
  ctx.moveTo(x - PINT_FOOT, y);
  ctx.lineTo(x - PINT_RIM, top);
  ctx.quadraticCurveTo(x, top - DOME * 2, x + PINT_RIM, top);
  ctx.lineTo(x + PINT_FOOT, y);
  ctx.closePath();
}

/** The brew below the head, as a subpath. */
function brewPath(ctx: Ctx, x: number, y: number): void {
  const line = y - PINT_H + HEAD;
  const hw = PINT_RIM - ((PINT_RIM - PINT_FOOT) * HEAD) / PINT_H;
  ctx.moveTo(x - PINT_FOOT, y);
  ctx.lineTo(x - hw, line);
  ctx.lineTo(x + hw, line);
  ctx.lineTo(x + PINT_FOOT, y);
  ctx.closePath();
}

/**
 * Pints of green brew standing at `xs` (their feet on y), in the u frame: the creamy head
 * domed over the rim, the brew lit just under it and deeper toward the glass's thick foot, a
 * glint down the glass's left side, the ink round each.
 */
function pints(ctx: Ctx, xs: readonly number[], n: number, y: number, w: number): void {
  ctx.beginPath();
  for (let i = 0; i < n; i++) pintPath(ctx, xs[i]!, y);
  ctx.fillStyle = FOAM.body;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) brewPath(ctx, xs[i]!, y);
  ctx.fillStyle = BREW.body;
  ctx.fill();
  const line = y - PINT_H + HEAD;
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(xs[i]! - PINT_RIM * 0.82, line, PINT_RIM * 1.64, 0.0028);
  ctx.fillStyle = BREW.light;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(xs[i]! - PINT_FOOT, y - 0.0032, PINT_FOOT * 2, 0.0032);
  ctx.fillStyle = BREW.shade;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(xs[i]! - PINT_RIM * 0.9, line - 0.0012, PINT_RIM * 1.8, 0.0012);
  ctx.fillStyle = FOAM.shade;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) pintPath(ctx, xs[i]!, y);
  ink(ctx, w * 0.75, INK);
  // A glint down each glass's left side, and a light catch on each head.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    ctx.rect(x - PINT_RIM * 0.55, line + 0.0042, 0.0016, PINT_H - HEAD - 0.0085);
    oval(ctx, x - PINT_RIM * 0.3, y - PINT_H - DOME * 0.25, 0.0021, 0.0011);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the barrel and the stool

/** The control point's x of the staves' curve (u): it makes the curve pass through the belly at mid-height. */
const STAVE_C = 2 * BARREL_BELLY - BARREL_END;

/** The barrel's half width at height `y` (u, 0 at its foot, -BARREL_H at its head): the staves' curve. */
function barrelHalf(y: number): number {
  const k = -y / BARREL_H;
  return BARREL_END + 2 * k * (1 - k) * (STAVE_C - BARREL_END);
}

/** The barrel's outline (foot at 0, 0; u frame): staves bulging to its belly, a slightly rounded foot. */
function barrelPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-BARREL_END, 0);
  ctx.quadraticCurveTo(-STAVE_C, -BARREL_H / 2, -BARREL_END, -BARREL_H);
  ctx.lineTo(BARREL_END, -BARREL_H);
  ctx.quadraticCurveTo(STAVE_C, -BARREL_H / 2, BARREL_END, 0);
  ctx.quadraticCurveTo(0, 0.004, -BARREL_END, 0);
  ctx.closePath();
}

/** Where the two iron hoops sit (u above the barrel's foot), and their width. */
const HOOPS = [0.0057, BARREL_H - 0.011] as const;
const HOOP = 0.0048;
/** The stave joints' width (u). */
const JOINT = 0.0013;

/** The barrel's outline for the ink: down its left staves, along its foot, up its right staves (its head's oval closes it). */
function barrelSides(ctx: Ctx): void {
  ctx.moveTo(-BARREL_END, -BARREL_H);
  ctx.quadraticCurveTo(-STAVE_C, -BARREL_H / 2, -BARREL_END, 0);
  ctx.quadraticCurveTo(0, 0.004, BARREL_END, 0);
  ctx.quadraticCurveTo(STAVE_C, -BARREL_H / 2, BARREL_END, -BARREL_H);
}

/** His three-legged stool (a creepie), in the barrel's frame: how far it stands from the barrel, and its seat (u). */
const STOOL_X = PLAYER_X - BARREL_X;
const SEAT_TOP = -0.032;
const SEAT_H = 0.0062;
/** The stool's two front legs, splayed under the seat (x under it and at the foot), and their width (u). */
const LEGS = [
  [-0.011, -0.017],
  [0.011, 0.017],
] as const;
const LEG_W = 0.0042;

/** The stool's seat as a subpath (barrel frame). */
function seatPath(ctx: Ctx): void {
  block(ctx, STOOL_X - 0.0185, SEAT_TOP, 0.037, SEAT_H, 0.0022);
}

/** The stool's legs (barrel frame): inked wooden strokes, drawn first, so the seat covers their tops. */
function stoolLegs(ctx: Ctx, w: number): void {
  ctx.beginPath();
  for (const [a, b] of LEGS) {
    ctx.moveTo(STOOL_X + a, -0.026);
    ctx.lineTo(STOOL_X + b, -0.0008);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = LEG_W + w;
  ctx.stroke();
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = LEG_W;
  ctx.stroke();
}

/**
 * An upturned oak barrel for a table (lit staves on the left, shaded on the right, two iron
 * hoops, its head on top) and, beside it, his stool, mostly hidden by him: the seat's ends and
 * its two front legs. They stand apart, so they share their fills and their ink: eight calls a
 * frame for the lot.
 */
function barrelAndStool(ctx: Ctx, w: number): void {
  stoolLegs(ctx, w);
  barrelPath(ctx);
  seatPath(ctx);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  // The shaded staves on the right, out to the barrel's edge, and the stave joints bowed out
  // with the belly (thin strips, so they share the fill).
  ctx.beginPath();
  ctx.moveTo(0.01, 0.0012);
  ctx.lineTo(0.01, -BARREL_H);
  ctx.lineTo(BARREL_END, -BARREL_H);
  ctx.quadraticCurveTo(STAVE_C, -BARREL_H / 2, BARREL_END, 0);
  ctx.closePath();
  const j = JOINT / 2;
  for (const sx of [-0.0035, 0.0035, 0.0105]) {
    ctx.moveTo(sx - j, 0.002);
    ctx.quadraticCurveTo(sx * 1.35 - j, -BARREL_H / 2, sx - j, -BARREL_H);
    ctx.lineTo(sx + j, -BARREL_H);
    ctx.quadraticCurveTo(sx * 1.35 + j, -BARREL_H / 2, sx + j, 0.002);
    ctx.closePath();
  }
  ctx.fillStyle = WOOD.shade;
  ctx.fill();
  // The light: the barrel's lit staves, its head seen a little from above (the table top), and
  // the top of the stool's seat.
  ctx.beginPath();
  ctx.rect(-0.0135, -BARREL_H, 0.0065, BARREL_H);
  oval(ctx, 0, -BARREL_H, BARREL_END, 0.0042);
  ctx.rect(STOOL_X - 0.016, SEAT_TOP + 0.001, 0.032, 0.0016);
  ctx.fillStyle = WOOD.light;
  ctx.fill();
  // Two iron hoops, as wide as the barrel where they sit, lit along their top.
  ctx.beginPath();
  for (const h of HOOPS) {
    const hw = barrelHalf(-h - HOOP / 2);
    ctx.rect(-hw, -h - HOOP, hw * 2, HOOP);
  }
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.beginPath();
  for (const h of HOOPS) {
    const hw = barrelHalf(-h - HOOP);
    ctx.rect(-hw, -h - HOOP, hw * 2, 0.0012);
  }
  ctx.fillStyle = IRON.light;
  ctx.fill();
  ctx.beginPath();
  barrelSides(ctx);
  oval(ctx, 0, -BARREL_H, BARREL_END, 0.0042);
  seatPath(ctx);
  ink(ctx, w, INK);
}

// ---------------------------------------------------------------- the box player

/** Scratch points for his right arm this frame (his frame): shoulder, elbow, hand. */
const ARM = { ex: 0, ey: 0, hx: 0, hy: 0 };

/** His right shoulder, and the arm's keyframes: hand and elbow on the keys, at his pint on the barrel, raised high (his frame). */
const SHOULDER = [-0.0135, -0.066] as const;
/** The accordion across his lap (his frame): its top and height, the treble end's left edge and width, the bass end's width, the bellows' pleats. */
const BOX_TOP = -0.0598;
const BOX_H = 0.0275;
const TREBLE_X = -0.0275;
const TREBLE_W = 0.0115;
const BASS_W = 0.0095;
const FOLDS = 6;
const KEYS = { hx: TREBLE_X + 0.0022, hy: -0.0455, ex: TREBLE_X - 0.0008, ey: -0.0545 };
/** The hand grips his pint round its right side, halfway up. */
const AT_PINT = { hx: BARREL_X + PINTS[HIS] - PLAYER_X + PINT_RIM * 0.75, hy: -BARREL_H - PINT_H * 0.45, ex: -0.032, ey: -0.0575 };
const RAISED = { hx: -0.027, hy: -0.111, ex: -0.0315, ey: -0.087 };

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Where his right arm is this frame. */
function rightArm(p: Pose): typeof ARM {
  const a = ARM;
  const r = p.raise;
  if (r > 0) {
    // Straight up off the barrel first, clear of the other pints, then over toward him; then
    // the cheers-bob. Lowering it, the same way back: over, then straight down onto its spot.
    const up = 1 - (1 - r) * (1 - r);
    const over = r * r;
    a.hx = lerp(AT_PINT.hx, RAISED.hx, over);
    a.hy = lerp(AT_PINT.hy, RAISED.hy, up) + p.cheers * 0.0035;
    a.ex = lerp(AT_PINT.ex, RAISED.ex, over);
    a.ey = lerp(AT_PINT.ey, RAISED.ey, up) + p.cheers * 0.002;
  } else {
    const q = p.reach;
    // Out over the barrel's head, so the hand never sweeps through the pints.
    const over = Math.sin(q * Math.PI) * 0.006;
    a.hx = lerp(KEYS.hx, AT_PINT.hx, q);
    a.hy = lerp(KEYS.hy, AT_PINT.hy, q) - over;
    a.ex = lerp(KEYS.ex, AT_PINT.ex, q);
    a.ey = lerp(KEYS.ey, AT_PINT.ey, q) - over * 0.5;
  }
  return a;
}

/** A sleeve from (x0, y0) through the elbow to the wrist, as a subpath (his frame). */
function sleeve(ctx: Ctx, x0: number, y0: number, ex: number, ey: number, hx: number, hy: number): void {
  ctx.moveTo(x0, y0);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
}

/** The sleeves' path, inked, then the wool along it (they never cross, so both arms share the two strokes). */
function sleeveStrokes(ctx: Ctx, w: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0078 + w;
  ctx.stroke();
  ctx.strokeStyle = ARAN.body;
  ctx.lineWidth = 0.0078;
  ctx.stroke();
}

/** His hands: small round fists (u). */
const HAND = 0.0042;

/** The bellows' width (his frame): from squeezed shut to drawn wide. */
function bellowsWidth(open: number): number {
  return 0.0135 + 0.0165 * open;
}

/**
 * The button accordion across his lap, wider than he is (his frame): the red treble end at his
 * right with its keyboard, the bellows in pale and dark pleats squeezing and drawing with the
 * tune, the bass end at his left with its buttons.
 */
function accordion(ctx: Ctx, open: number, w: number): void {
  const top = BOX_TOP;
  const h = BOX_H;
  const x0 = TREBLE_X;
  const bx = x0 + TREBLE_W;
  const bw = bellowsWidth(open);
  const ex = bx + bw;
  ctx.beginPath();
  ctx.rect(bx - 0.001, top + 0.0022, bw + 0.002, h - 0.0044);
  ctx.fillStyle = BELLOWS.body;
  ctx.fill();
  ctx.beginPath();
  const fw = bw / FOLDS;
  for (let i = 0; i < FOLDS; i += 2) ctx.rect(bx + (i + 0.5) * fw, top + 0.0034, fw, h - 0.0068);
  ctx.fillStyle = BELLOWS.light;
  ctx.fill();
  // The two ends: red boxes lit along the top, a gold trim where they meet the bellows.
  ctx.beginPath();
  block(ctx, x0, top, TREBLE_W, h, 0.0024);
  block(ctx, ex, top, BASS_W, h, 0.0024);
  ctx.fillStyle = BOX.body;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0 + 0.0015, top + 0.0013, TREBLE_W - 0.003, 0.0026);
  ctx.rect(ex + 0.0015, top + 0.0013, BASS_W - 0.003, 0.0026);
  ctx.fillStyle = BOX.light;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0 + 0.0015, top + h - 0.0034, TREBLE_W - 0.003, 0.0021);
  ctx.rect(ex + 0.0015, top + h - 0.0034, BASS_W - 0.003, 0.0021);
  ctx.fillStyle = BOX.shade;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(bx - 0.0027, top + 0.0022, 0.0014, h - 0.0044);
  ctx.rect(ex + 0.0013, top + 0.0022, 0.0014, h - 0.0044);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  // The ink round both ends, and along the bellows' top and bottom between them.
  ctx.beginPath();
  block(ctx, x0, top, TREBLE_W, h, 0.0024);
  block(ctx, ex, top, BASS_W, h, 0.0024);
  ctx.moveTo(bx, top + 0.0022);
  ctx.lineTo(ex, top + 0.0022);
  ctx.moveTo(bx, top + h - 0.0022);
  ctx.lineTo(ex, top + h - 0.0022);
  ink(ctx, w * 0.85, INK);
  // The keyboard down the treble end's face (white keys, the black ones between) and the bass
  // end's buttons.
  ctx.beginPath();
  ctx.rect(x0 + 0.0022, top + 0.0045, 0.0052, h - 0.009);
  for (let j = 0; j < 3; j++) circle(ctx, ex + BASS_W * 0.45, top + 0.0085 + j * 0.0058, 0.0014);
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.beginPath();
  for (let y = top + 0.0068; y < top + h - 0.0055; y += 0.0042) ctx.rect(x0 + 0.0045, y, 0.0029, 0.0019);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The jumper's outline (his frame): broad round shoulders down to where he sits. */
function jumperPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.0158, -0.031);
  ctx.lineTo(-0.0168, -0.06);
  ctx.quadraticCurveTo(-0.0168, -0.0695, -0.0085, -0.0705);
  ctx.lineTo(0.0085, -0.0705);
  ctx.quadraticCurveTo(0.0168, -0.0695, 0.0168, -0.06);
  ctx.lineTo(0.0158, -0.031);
  ctx.quadraticCurveTo(0, -0.0285, -0.0158, -0.031);
  ctx.closePath();
}

/** His legs, seated: short thighs coming toward you, shins down to his boots; his left boot taps (his frame). */
function legs(ctx: Ctx, tap: number, w: number): void {
  const lift = tap * 0.0035;
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    const up = i > 0 ? lift : 0;
    ctx.moveTo(i * 0.0075, -0.034);
    ctx.lineTo(i * 0.0112, -0.0295 - up * 0.4);
    ctx.lineTo(i * 0.0122, -0.0065 - up);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0098 + w;
  ctx.stroke();
  ctx.strokeStyle = TROUSERS.body;
  ctx.lineWidth = 0.0098;
  ctx.stroke();
  // Lit down the shins' left sides.
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    const up = i > 0 ? lift : 0;
    ctx.moveTo(i * 0.0112 - 0.0025, -0.027 - up * 0.4);
    ctx.lineTo(i * 0.0122 - 0.0025, -0.0095 - up);
  }
  ctx.strokeStyle = TROUSERS.light;
  ctx.lineWidth = 0.0018;
  ctx.stroke();
  // Boots: round toes toward you; the tapping one tips up at the toe.
  ctx.beginPath();
  oval(ctx, -0.0128, -0.0032, 0.0071, 0.0037);
  oval(ctx, 0.0128, -0.0032 - lift, 0.0071, 0.0037, -tap * 0.35);
  ctx.fillStyle = SHOE;
  ctx.fill();
  ink(ctx, w * 0.75, INK);
  ctx.fillStyle = "#5a5468";
  ctx.beginPath();
  oval(ctx, -0.0145, -0.0047, 0.0026, 0.0011);
  oval(ctx, 0.0111, -0.0047 - lift, 0.0026, 0.0011, -tap * 0.35);
  ctx.fill();
}

/** His short white beard (head at 0, 0): round his jaw from ear to ear, up under his cheeks to his mouth. */
function beardPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.0127, -0.0005);
  ctx.quadraticCurveTo(-0.0138, 0.0125, -0.0062, 0.0172);
  ctx.quadraticCurveTo(0, 0.0205, 0.0062, 0.0172);
  ctx.quadraticCurveTo(0.0138, 0.0125, 0.0127, -0.0005);
  ctx.quadraticCurveTo(0.0085, 0.0052, 0, 0.0054);
  ctx.quadraticCurveTo(-0.0085, 0.0052, -0.0127, -0.0005);
  ctx.closePath();
}

/** His head (center at 0, 0): ears, a rosy-cheeked face in a short white beard, his eyes shut in the tune or open and beaming, and his flat cap. */
function head(ctx: Ctx, beam: number, w: number): void {
  ctx.beginPath();
  circle(ctx, -0.0124, -0.0005, 0.0036);
  circle(ctx, 0.0124, -0.0005, 0.0036);
  circle(ctx, 0, 0, 0.0125);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.beginPath();
  circle(ctx, 0, 0, 0.0125);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ctx.fillStyle = SKIN.light;
  ctx.beginPath();
  oval(ctx, -0.0045, -0.0055, 0.0045, 0.003, -0.4);
  circle(ctx, 0, 0.0028, 0.0026);
  ctx.fill();
  beardPath(ctx);
  ctx.fillStyle = WHISKERS.body;
  ctx.fill();
  ctx.fillStyle = WHISKERS.light;
  ctx.beginPath();
  oval(ctx, -0.0068, 0.0105, 0.0024, 0.0042, 0.35);
  ctx.fill();
  beardPath(ctx);
  ink(ctx, w * 0.75, INK);
  // The mouth in the beard: a smile in the tune, a big open grin for the toast.
  if (beam > 0.5) {
    ctx.beginPath();
    ctx.moveTo(-0.0042, 0.0082);
    ctx.quadraticCurveTo(0, 0.0138, 0.0042, 0.0082);
    ctx.closePath();
    ctx.fillStyle = "#8a2f3a";
    ctx.fill();
    ink(ctx, w * 0.5, INK);
  } else {
    ctx.beginPath();
    ctx.moveTo(-0.0034, 0.009);
    ctx.quadraticCurveTo(0, 0.0118, 0.0034, 0.009);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.6;
    ctx.stroke();
  }
  // A white moustache over it, rosy cheeks, a round button nose.
  ctx.beginPath();
  oval(ctx, -0.0034, 0.0064, 0.0042, 0.0019, 0.22);
  oval(ctx, 0.0034, 0.0064, 0.0042, 0.0019, -0.22);
  ctx.fillStyle = WHISKERS.light;
  ctx.fill();
  ctx.strokeStyle = WHISKERS.shade;
  ctx.lineWidth = w * 0.45;
  ctx.stroke();
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, -0.0068, 0.0022, 0.0026, 0.0019);
  oval(ctx, 0.0068, 0.0022, 0.0026, 0.0019);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0.0028, 0.0026);
  ctx.strokeStyle = SKIN.shade;
  ctx.lineWidth = w * 0.5;
  ctx.stroke();
  // Eyes: shut in happy arcs while he plays, round and bright for the toast. Bushy white brows.
  if (beam > 0.5) {
    ctx.beginPath();
    circle(ctx, -0.0046, -0.0028, 0.002);
    circle(ctx, 0.0046, -0.0028, 0.002);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    circle(ctx, -0.004, -0.0035, 0.0007);
    circle(ctx, 0.0052, -0.0035, 0.0007);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-0.0068, -0.0018);
    ctx.quadraticCurveTo(-0.0046, -0.0046, -0.0024, -0.0018);
    ctx.moveTo(0.0024, -0.0018);
    ctx.quadraticCurveTo(0.0046, -0.0046, 0.0068, -0.0018);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-0.0076, -0.0064 - beam * 0.001);
  ctx.quadraticCurveTo(-0.0046, -0.0086 - beam * 0.0015, -0.0017, -0.0068 - beam * 0.001);
  ctx.moveTo(0.0017, -0.0068 - beam * 0.001);
  ctx.quadraticCurveTo(0.0046, -0.0086 - beam * 0.0015, 0.0076, -0.0064 - beam * 0.001);
  ctx.strokeStyle = WHISKERS.shade;
  ctx.lineWidth = w * 1.1;
  ctx.stroke();
  cap(ctx, w);
}

/** The cap's crown (head at 0, 0): flat and full, drawn forward over the brow. */
function capPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.0136, -0.0062);
  ctx.quadraticCurveTo(-0.0158, -0.0158, -0.004, -0.0172);
  ctx.quadraticCurveTo(0.0122, -0.0186, 0.0148, -0.0098);
  ctx.lineTo(0.0138, -0.0062);
  ctx.quadraticCurveTo(0, -0.0082, -0.0136, -0.0062);
  ctx.closePath();
}

/** His tweed flat cap: the full crown lit along its top, the peak over his brow picked out in the cloth's shade. */
function cap(ctx: Ctx, w: number): void {
  capPath(ctx);
  ctx.fillStyle = CAP.body;
  ctx.fill();
  ctx.fillStyle = CAP.light;
  ctx.beginPath();
  oval(ctx, -0.0035, -0.0148, 0.0068, 0.0018, -0.06);
  ctx.fill();
  capPath(ctx);
  ink(ctx, w * 0.85, INK);
  ctx.beginPath();
  ctx.moveTo(-0.0128, -0.0064);
  ctx.quadraticCurveTo(0, -0.0094, 0.0132, -0.0064);
  ctx.quadraticCurveTo(0.0128, -0.0028, 0.0105, -0.0032);
  ctx.quadraticCurveTo(0, -0.0052, -0.0105, -0.0032);
  ctx.quadraticCurveTo(-0.0128, -0.0028, -0.0128, -0.0064);
  ctx.closePath();
  ctx.fillStyle = CAP.body;
  ctx.fill();
  ctx.strokeStyle = CAP.shade;
  ctx.lineWidth = w * 0.6;
  ctx.stroke();
}

/** How high his head's center sits (his frame), and how far it tips back to look up at his raised pint (radians). */
const HEAD_Y = -0.0835;
const HEAD_TIP = -0.12;

/**
 * The box player on his stool at (x, foot), in his own frame (u): the stool, his legs and
 * boots, the jumper, the accordion on his lap with his left hand on its bass end, his head,
 * then his right arm, on the keys or with his pint (drawn in his hand, over the barrel).
 */
function player(ctx: Ctx, x: number, foot: number, u: number, p: Pose, lw: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  legs(ctx, p.tap, w);
  // He nods down a touch on the beat.
  const nod = p.bob * 0.0011;
  ctx.translate(0, nod);
  jumperPath(ctx);
  ctx.fillStyle = ARAN.body;
  ctx.fill();
  ctx.fillStyle = ARAN.light;
  ctx.fillRect(-0.0125, -0.066, 0.0045, 0.03);
  ctx.fillStyle = ARAN.shade;
  ctx.fillRect(-0.0155, -0.0365, 0.031, 0.0045);
  // The Aran cables: a twisted rope down either side of the chest.
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    for (let y = -0.067; y < -0.035; y += 0.006) {
      ctx.moveTo(i * 0.0062 - 0.0018, y);
      ctx.quadraticCurveTo(i * 0.0062 + 0.0022, y + 0.003, i * 0.0062 - 0.0018, y + 0.006);
    }
  }
  ctx.strokeStyle = ARAN.shade;
  ctx.lineWidth = 0.0012;
  ctx.stroke();
  jumperPath(ctx);
  ink(ctx, w, INK);
  // A ribbed collar.
  ctx.beginPath();
  oval(ctx, 0, -0.0702, 0.0068, 0.0022);
  ctx.fillStyle = ARAN.shade;
  ctx.fill();
  ink(ctx, w * 0.6, INK);
  // Both sleeves go behind the box: his left arm down to its bass end, out and in with the
  // bellows; his right to the keys, or out over the barrel for his pint and up with it.
  const right = TREBLE_X + TREBLE_W + bellowsWidth(p.open) + BASS_W;
  const a = rightArm(p);
  ctx.beginPath();
  sleeve(ctx, 0.0135, -0.066, right + 0.0008, -0.0555, right - 0.0016, -0.0465);
  sleeve(ctx, SHOULDER[0], SHOULDER[1], a.ex, a.ey, a.hx, a.hy);
  sleeveStrokes(ctx, w);
  accordion(ctx, p.open, w);
  ctx.save();
  ctx.translate(0.0005, HEAD_Y);
  ctx.rotate(HEAD_TIP * p.raise);
  head(ctx, p.beam, w);
  ctx.restore();
  // The pint in his hand, tipped a little toward the gold as he raises it; then his hands.
  if (p.holding) {
    ctx.save();
    ctx.translate(a.hx - PINT_RIM * 0.75, a.hy + PINT_H * 0.45);
    ctx.rotate(-0.16 * p.raise);
    pints(ctx, ZERO, 1, 0, w);
    ctx.restore();
  }
  ctx.beginPath();
  circle(ctx, right - 0.0016, -0.0465, HAND);
  circle(ctx, a.hx, a.hy, HAND);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
  ctx.restore();
}

/**
 * The session: the barrel with its pints (less his, while it is in his hand), and the box
 * player beside it. Drawn on the meadow after the toadstool; it touches nothing else.
 */
export function session(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const foot = s.groundY + SESSION_FOOT * u;
  if (foot - u * 0.14 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const w = lw / u;
  const p = pose(s.t);
  ctx.save();
  ctx.translate(cx + BARREL_X * u, foot);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  barrelAndStool(ctx, w);
  pints(ctx, PINTS, p.holding ? HIS : PINTS.length, -BARREL_H, w);
  ctx.restore();
  player(ctx, cx + PLAYER_X * u, foot, u, p, lw);
}

import { hash } from "../../base/draw";

// The skeleton every townsperson of the Fourth is built on (folk.ts paints it as a storybook
// figure). A pelvis, a spine up to the base of the neck, the head on its neck, two legs of two
// bones and a foot, two arms of two bones and a hand. A behavior poses it each frame: where the
// pelvis is and how the spine leans and twists, where each foot and hand should be; `legTo` and
// `armTo` place the knees and elbows by two-bone inverse kinematics, so a foot set on the ground
// stays on it, a hand set on a drumstick or a flagpole stays there, and no joint ever comes apart
// (rig.test.ts holds every bone to its length).
//
// The pose is worked out in the figure's own body space, in u at its own size: l across it (its
// left side positive), f forward (the way it faces), y down (the ground at 0, up negative). It is
// seen from the side it is turned by `view` (0 facing us, PI/2 in profile facing screen right,
// PI facing away): `project` lays it on the screen, the near limbs in front and the far ones
// behind. A figure facing screen left is the same pose drawn mirrored.
//
// The cycles (walk and march, the stilt walk, skipping and hopping in place, standing with the
// weight shifting from foot to foot, sitting) are functions of a phase; what a figure chooses
// (where it looks, when it blinks, when it waves) is a function of the scene's clock and a hash of
// its id and a cycle index, never Math.random: the same moment always draws the same frame. Loose
// things (plumes, ribbons, ponytails, skirts, coat-tails) follow the body a moment behind: `lag`
// is how far the body has moved in that moment, for the painter to hang them on.

/** Body proportions, in u at full size. */
export interface Build {
  /** Leg bones; the ankle's height over the sole; the ball of the foot ahead of the ankle, the toe past it, the heel behind. */
  thigh: number;
  shin: number;
  ankle: number;
  ball: number;
  toe: number;
  heel: number;
  /** Pelvis to the base of the neck, and on to the head's center; the head's radius. */
  spine: number;
  neck: number;
  head: number;
  /** Arm bones. */
  upper: number;
  fore: number;
  /** Half widths across the shoulders and the hips (to the joints), and the torso's half widths and depth for the painter. */
  shoulders: number;
  hips: number;
  chestW: number;
  waistW: number;
  hipW: number;
  depth: number;
  /** How far the belly rounds out in front (u), and the chest. */
  belly: number;
  bust: number;
  /** Limb half widths: the thigh at the hip, the knee, the ankle; the arm at the shoulder, the elbow, the wrist; the hand's radius. */
  leg0: number;
  leg1: number;
  leg2: number;
  arm0: number;
  arm1: number;
  arm2: number;
  hand: number;
}

/** A grown-up of middling build (about 0.15 u tall). */
export const ADULT: Build = {
  thigh: 0.036,
  shin: 0.034,
  ankle: 0.005,
  ball: 0.008,
  toe: 0.004,
  heel: 0.004,
  spine: 0.046,
  neck: 0.0185,
  head: 0.0158,
  upper: 0.0275,
  fore: 0.0255,
  shoulders: 0.0135,
  hips: 0.0075,
  chestW: 0.0148,
  waistW: 0.0122,
  hipW: 0.0138,
  depth: 0.0118,
  belly: 0.0022,
  bust: 0.0024,
  leg0: 0.0078,
  leg1: 0.0052,
  leg2: 0.0038,
  arm0: 0.0048,
  arm1: 0.0038,
  arm2: 0.003,
  hand: 0.0042,
};

/** A build from another with some proportions changed. */
export function build(over: Partial<Build>, from: Build = ADULT): Build {
  return { ...from, ...over };
}

/** A build scaled as a whole (a taller or a smaller grown-up of the same shape). */
export function scaled(b: Build, k: number): Build {
  const out = { ...b };
  for (const key of Object.keys(out) as (keyof Build)[]) out[key] = b[key] * k;
  return out;
}

/** A child of about eight: a big head for the body, short limbs, round. */
export const CHILD: Build = build({
  thigh: 0.023,
  shin: 0.022,
  ankle: 0.004,
  ball: 0.0062,
  toe: 0.003,
  heel: 0.003,
  spine: 0.031,
  neck: 0.0165,
  head: 0.0142,
  upper: 0.017,
  fore: 0.016,
  shoulders: 0.0098,
  hips: 0.0058,
  chestW: 0.0108,
  waistW: 0.0102,
  hipW: 0.0104,
  depth: 0.0088,
  belly: 0.0012,
  bust: 0,
  leg0: 0.0056,
  leg1: 0.0045,
  leg2: 0.0035,
  arm0: 0.0038,
  arm1: 0.0032,
  arm2: 0.0027,
  hand: 0.0034,
});

/** The pelvis's height over the ground standing straight (u). */
export function legLength(b: Build): number {
  return b.thigh + b.shin + b.ankle;
}

// ---------------------------------------------------------------- the skeleton

/** The joints, in a pose's packed (l, f, y) array. N is the near side's (the figure's right), F the far side's (its left). */
export const J = {
  pelvis: 0,
  chest: 1,
  head: 2,
  hipN: 3,
  kneeN: 4,
  ankleN: 5,
  ballN: 6,
  toeN: 7,
  heelN: 8,
  hipF: 9,
  kneeF: 10,
  ankleF: 11,
  ballF: 12,
  toeF: 13,
  heelF: 14,
  shN: 15,
  elbowN: 16,
  handN: 17,
  shF: 18,
  elbowF: 19,
  handF: 20,
} as const;
export const JOINTS = 21;

/** A posed skeleton, and what the face and the loose things are doing. */
export interface Pose {
  /** The joints in body space, (l, f, y) each. */
  j: Float64Array;
  /** Which way the body is seen (radians: 0 facing us, PI/2 in profile facing screen right). */
  view: number;
  /** Which way the face looks, the same way (it may turn from the body), and the head's tilt (radians, clockwise on screen). */
  face: number;
  tilt: number;
  /** The face: 0 a closed smile, 1 a wide open grin (a cheer, a song); cheeks puffed (0..1, a horn player); eyes shut (0..1); brows raised (0..1). */
  mouth: number;
  puff: number;
  blink: number;
  brow: number;
  /** How far the body moved this last moment (u, screen x and y, positive right and down): loose things trail it. */
  lagX: number;
  lagY: number;
  /** The breeze on the loose things (0..1). */
  wind: number;
}

export function pose(): Pose {
  return { j: new Float64Array(JOINTS * 3), view: Math.PI / 2, face: Math.PI / 2, tilt: 0, mouth: 0, puff: 0, blink: 0, brow: 0, lagX: 0, lagY: 0, wind: 0 };
}

/** A joint's place: l, f, y. */
export function at(P: Pose, i: number): readonly [number, number, number] {
  return [P.j[i * 3]!, P.j[i * 3 + 1]!, P.j[i * 3 + 2]!];
}

function put(P: Pose, i: number, l: number, f: number, y: number): void {
  P.j[i * 3] = l;
  P.j[i * 3 + 1] = f;
  P.j[i * 3 + 2] = y;
}

/** The distance between two joints of a pose. */
export function bone(P: Pose, a: number, b: number): number {
  return Math.hypot(P.j[a * 3]! - P.j[b * 3]!, P.j[a * 3 + 1]! - P.j[b * 3 + 1]!, P.j[a * 3 + 2]! - P.j[b * 3 + 2]!);
}

/**
 * Sets the trunk: the pelvis at (l, f, y), the spine leaning forward by `lean` (radians) and to the
 * figure's left by `side`, the shoulders turned by `twist` (radians, the left shoulder forward)
 * and the hips by `hipTwist`, the shoulders dropped on the near side by `shrug` (u), the head
 * nodded forward by `nod` (radians).
 */
export function trunk(P: Pose, b: Build, l: number, f: number, y: number, lean: number, side: number, twist: number, hipTwist: number, shrug = 0, nod = 0): void {
  put(P, J.pelvis, l, f, y);
  // The spine: up, leaned forward by `lean`, then to the side by `side` (a unit direction, so it keeps its length).
  const cs = Math.cos(side);
  const cl = l + Math.sin(side) * b.spine;
  const cf = f + cs * Math.sin(lean) * b.spine;
  const cy = y - cs * Math.cos(lean) * b.spine;
  put(P, J.chest, cl, cf, cy);
  const hl = cl + Math.sin(side) * 0.6 * b.neck;
  const hf = cf + Math.sin(lean + nod) * b.neck;
  const hy = cy - Math.cos(lean + nod) * b.neck;
  put(P, J.head, hl, hf, hy);
  // The shoulders across the top of the spine, turned by the twist (the near one is the figure's right).
  const sc = Math.cos(twist) * b.shoulders;
  const ss = Math.sin(twist) * b.shoulders;
  put(P, J.shN, cl - sc, cf - ss, cy + b.shoulders * 0.18 + shrug);
  put(P, J.shF, cl + sc, cf + ss, cy + b.shoulders * 0.18 - shrug);
  const hc = Math.cos(hipTwist) * b.hips;
  const hs = Math.sin(hipTwist) * b.hips;
  put(P, J.hipN, l - hc, f - hs, y + b.hips * 0.3);
  put(P, J.hipF, l + hc, f + hs, y + b.hips * 0.3);
}

// ---------------------------------------------------------------- two-bone IK

/** Scratch for the solver. */
const V = new Float64Array(3);

/**
 * Two-bone IK from joint `root` (already placed) toward the target (tl, tf, ty): places `mid` and
 * `end` with bones `a` and `b`, the middle joint bent toward the pole (pl, pf, py). A target out of
 * reach is reached for along the line to it, the limb straight. Returns how far short it fell (u).
 */
export function reach(P: Pose, root: number, mid: number, end: number, a: number, b: number, tl: number, tf: number, ty: number, pl: number, pf: number, py: number): number {
  const rl = P.j[root * 3]!;
  const rf = P.j[root * 3 + 1]!;
  const ry = P.j[root * 3 + 2]!;
  let dl = tl - rl;
  let df = tf - rf;
  let dy = ty - ry;
  const full = Math.hypot(dl, df, dy) || 1e-9;
  const most = (a + b) * 0.99999;
  const least = Math.abs(a - b) + 1e-6;
  const d = Math.min(most, Math.max(least, full));
  dl /= full;
  df /= full;
  dy /= full;
  // The middle joint: along the line by a cos A, and off it toward the pole by a sin A.
  const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
  const along = a * cosA;
  const off = a * Math.sqrt(1 - cosA * cosA);
  // The pole's part across the line.
  const dot = pl * dl + pf * df + py * dy;
  V[0] = pl - dot * dl;
  V[1] = pf - dot * df;
  V[2] = py - dot * dy;
  let n = Math.hypot(V[0], V[1], V[2]);
  if (n < 1e-9) {
    // A pole along the line: bend any way across it.
    V[0] = -df;
    V[1] = dl;
    V[2] = 0;
    n = Math.hypot(V[0], V[1]) || 1;
  }
  put(P, mid, rl + dl * along + (V[0] / n) * off, rf + df * along + (V[1] / n) * off, ry + dy * along + (V[2] / n) * off);
  put(P, end, rl + dl * d, rf + df * d, ry + dy * d);
  return Math.max(0, full - d);
}

/**
 * Places a leg: the ball of its foot at (l, f, y), the heel lifted by `pitch` (radians; negative
 * lifts the toe), the knee bent forward (or to `knee` across: a sitting figure's knees fall out).
 * Returns how far short the leg fell of the foot (0 when the foot is where it was set).
 */
export function legTo(P: Pose, b: Build, near: boolean, l: number, f: number, y: number, pitch = 0, kneeOut = 0): number {
  const hip = near ? J.hipN : J.hipF;
  const knee = near ? J.kneeN : J.kneeF;
  const ankle = near ? J.ankleN : J.ankleF;
  // The ankle over the ball: back by `ball` and up by `ankle`, turned about the ball by the pitch.
  const c = Math.cos(pitch);
  const sn = Math.sin(pitch);
  const af = f - b.ball * c + b.ankle * sn;
  const ay = y - b.ankle * c - b.ball * sn;
  const short = reach(P, hip, knee, ankle, b.thigh, b.shin, l, af, ay, near ? -kneeOut : kneeOut, 1, 0);
  // The foot hangs from where the ankle came out (the same pitch), so it never parts from the leg.
  const al = P.j[ankle * 3]!;
  const fa = P.j[ankle * 3 + 1]!;
  const ya = P.j[ankle * 3 + 2]!;
  const bf = fa + b.ball * c - b.ankle * sn;
  const by = ya + b.ankle * c + b.ball * sn;
  put(P, near ? J.ballN : J.ballF, al, bf, by);
  // The toes bend at the ball and stay on the ground when the heel rises; they lift with a raised toe.
  const ts = Math.min(0, sn);
  const tc = sn < 0 ? c : 1;
  put(P, near ? J.toeN : J.toeF, al, bf + b.toe * tc, by + b.toe * ts);
  put(P, near ? J.heelN : J.heelF, al, fa - b.heel * c - b.ankle * sn, ya + b.ankle * c - b.heel * sn);
  return short;
}

/** Places an arm: the hand at (l, f, y), the elbow bent toward the pole (default back, out and down). Returns how far short it fell. */
export function armTo(P: Pose, b: Build, near: boolean, l: number, f: number, y: number, pl?: number, pf = -1, py = 0.4): number {
  const out = near ? -1 : 1;
  return reach(P, near ? J.shN : J.shF, near ? J.elbowN : J.elbowF, near ? J.handN : J.handF, b.upper, b.fore, l, f, y, pl ?? out * 0.5, pf, py);
}

/**
 * Swings an arm from its shoulder: `swing` forward (radians from hanging, positive ahead), `out`
 * away from the side, the elbow bent by `bend` (radians, the forearm forward).
 */
export function armSwing(P: Pose, b: Build, near: boolean, swing: number, out: number, bend: number): void {
  const sh = near ? J.shN : J.shF;
  const side = near ? -1 : 1;
  const sl = P.j[sh * 3]!;
  const sf = P.j[sh * 3 + 1]!;
  const sy = P.j[sh * 3 + 2]!;
  const el = sl + side * Math.sin(out) * b.upper;
  const ef = sf + Math.sin(swing) * Math.cos(out) * b.upper;
  const ey = sy + Math.cos(swing) * Math.cos(out) * b.upper;
  put(P, near ? J.elbowN : J.elbowF, el, ef, ey);
  // The forearm carries on out to the side as the upper arm does, bent forward by `bend` (a unit direction: it keeps its length).
  const a = swing + bend;
  put(P, near ? J.handN : J.handF, el + side * Math.sin(out) * b.fore, ef + Math.sin(a) * Math.cos(out) * b.fore, ey + Math.cos(a) * Math.cos(out) * b.fore);
}

/**
 * A wave: the hand up beside the face on the side the figure faces (the far arm, so it shows in
 * front of the face, not across it), the forearm rocking side to side `rate` times a second.
 * `k` (0..1) raises it from wherever the arm hung.
 */
export function wave(P: Pose, b: Build, t: number, rate: number, k: number, near = false): void {
  if (k <= 0) return;
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  const rock = Math.sin(t * rate * Math.PI * 2);
  const side = near ? -1 : 1;
  const hand = near ? J.handN : J.handF;
  const hl = cl + side * (b.shoulders + 0.006 + rock * 0.005);
  const hf = cf + b.depth * 1.6 + b.head * 0.6 + rock * 0.004;
  const hy = cy - b.neck - b.head * 0.2 - Math.abs(rock) * 0.002;
  const fl = P.j[hand * 3]! + (hl - P.j[hand * 3]!) * k;
  const ff = P.j[hand * 3 + 1]! + (hf - P.j[hand * 3 + 1]!) * k;
  const fy = P.j[hand * 3 + 2]! + (hy - P.j[hand * 3 + 2]!) * k;
  armTo(P, b, near, fl, ff, fy, side * 0.6, 0.2, 1);
}

// ---------------------------------------------------------------- cycles

/** 0..1, the fractional part (also of negatives). */
export function fract(x: number): number {
  return x - Math.floor(x);
}

/** Eased 0..1. */
export function ease(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** A gait: how the legs step. */
export interface Gait {
  /** Travel (u a second, in the figure's own units: 0 steps in place). */
  speed: number;
  /** Full cycles (two steps) a second. */
  cadence: number;
  /** Where in its cycle the figure is at t = 0 (0..1). */
  phase: number;
  /** Share of a cycle each foot is on the ground. */
  duty: number;
  /** How high a foot lifts (u), and how far the knee comes up on a high step (0 a walk, 1 the thigh level). */
  lift: number;
  high: number;
  /** How far apart the feet stand across (u, each side of the middle). */
  stance: number;
}

/** A foot in a gait at phase p: where its ball is relative to the pelvis's ground point (forward, up) and its pitch. On the ground while `planted`. */
export const FOOT = { f: 0, y: 0, pitch: 0, planted: false, swing: 0 };

/** Where a foot is at its own phase q (0 the moment it lands). Fills FOOT. */
export function footAt(g: Gait, q: number): typeof FOOT {
  const S = g.speed / g.cadence;
  const reachHalf = (S * g.duty) / 2;
  if (q < g.duty) {
    // On the ground: it stays where it landed while the body passes over it, the heel rising at the end.
    FOOT.f = reachHalf - S * q;
    FOOT.y = 0;
    const late = (q - g.duty * 0.62) / (g.duty * 0.38);
    FOOT.pitch = late > 0 ? late * late * 0.55 : 0;
    FOOT.planted = true;
    FOOT.swing = 0;
  } else {
    const s = (q - g.duty) / (1 - g.duty);
    // In the air: lifted and carried forward to land ahead, toe up as it reaches.
    const e = ease(s);
    FOOT.f = -reachHalf + S * g.duty * e;
    FOOT.y = -g.lift * Math.sin(Math.PI * Math.pow(s, 0.85));
    FOOT.pitch = 0.55 * (1 - s) * (1 - s) - 0.25 * Math.sin(Math.PI * s) * s;
    FOOT.planted = false;
    FOOT.swing = s;
  }
  return FOOT;
}

/** The pelvis's dip for a gait (u): how far it comes down at each landing so the leg behind still reaches its foot. Worked out once a gait. */
const DIPS = new Map<string, number>();
function dip(b: Build, g: Gait): number {
  const key = `${b.thigh},${b.shin},${b.ankle},${b.ball},${b.hips},${g.speed},${g.cadence},${g.duty}`;
  const known = DIPS.get(key);
  if (known !== undefined) return known;
  const R = (b.thigh + b.shin) * 0.985;
  const top = b.thigh + b.shin + b.ankle - 0.0015;
  let d = 0;
  for (let i = 0; i < 64; i++) {
    const p = i / 64;
    const c = lowAt(p);
    for (const off of [0, 0.5]) {
      const foot = footAt(g, fract(p + off));
      if (!foot.planted) continue;
      // The ankle over this ball, and the highest the pelvis may ride for the leg to reach it.
      const cs = Math.cos(foot.pitch);
      const sn = Math.sin(foot.pitch);
      const af = foot.f - b.ball * cs + b.ankle * sn;
      const ay = -b.ankle * cs - b.ball * sn;
      const most = Math.sqrt(Math.max(0, R * R - af * af)) - ay + b.hips * 0.3;
      if (most < top) d = Math.max(d, (top - most) / Math.max(0.15, c));
    }
  }
  DIPS.set(key, d);
  return d;
}

/** How low the pelvis rides at phase p (0..1): lowest just after each landing, highest as the body passes over the foot. */
function lowAt(p: number): number {
  return (Math.cos((p - 0.06) * Math.PI * 4) + 1) / 2;
}

/** Options for a walk: how the arms swing, how upright and bouncy it is. */
export interface WalkStyle {
  /** Arm swing (radians each way) and elbow bend; 0 swing keeps the arms for the caller. */
  arms: number;
  elbow: number;
  /** Forward lean of the spine (radians), and the shoulders' counter-twist (radians). */
  lean: number;
  twist: number;
  /** Extra bounce (u) at each step. */
  bounce: number;
  /** How far the head nods with the step (radians). */
  nod: number;
}

export const STROLL: WalkStyle = { arms: 0.38, elbow: 0.35, lean: 0.04, twist: 0.22, bounce: 0.002, nod: 0.03 };

/**
 * A walk (or a march, a high step, a stride in place) at time t: the feet stepping with the gait,
 * each planted while it bears weight, the pelvis riding lowest as a foot lands and highest as the
 * body passes over it and swaying over the foot it stands on, the shoulders turning against the
 * hips, the arms swinging against the legs. The pelvis's ground point is at f = 0, l = 0.
 */
export function walk(P: Pose, b: Build, g: Gait, w: WalkStyle, t: number): void {
  const p = fract(t * g.cadence + g.phase);
  const L = b.thigh + b.shin + b.ankle;
  const d = dip(b, g) + w.bounce;
  // Lowest at each landing (p = 0 and 0.5), highest between.
  const c = lowAt(p);
  const high = g.high;
  const y = -(L - 0.0015 - d * c - high * 0.002);
  // The weight over the foot that bears it: the near foot from p = 0 to 0.5.
  const sway = Math.sin(p * Math.PI * 2) * b.hips * 0.25;
  // The near leg is forward as it lands (p = 0) and back as the far one lands (p = 0.5): the arms and shoulders go against it.
  const turn = Math.cos(p * Math.PI * 2);
  trunk(P, b, -sway, 0, y, w.lean + high * 0.06, -sway * 0.6, w.twist * turn, -w.twist * 0.5 * turn, 0, w.nod * c);
  for (const near of [true, false]) {
    const q = fract(p + (near ? 0 : 0.5));
    const foot = footAt(g, q);
    let fy = foot.y;
    let ff = foot.f;
    // A high step lifts the knee: the foot comes up under it, and forward.
    if (!foot.planted && high > 0) {
      const lift = Math.sin(Math.PI * foot.swing);
      fy -= high * b.thigh * 0.85 * lift;
      ff += high * b.thigh * 0.15 * lift;
    }
    legTo(P, b, near, (near ? -1 : 1) * g.stance, ff, fy, foot.pitch);
  }
  // The arms swing against the legs (or, with no swing, hang at rest for the caller to place).
  armSwing(P, b, true, -w.arms * turn, 0.08, w.elbow * (1 + 0.8 * Math.max(0, -turn)));
  armSwing(P, b, false, w.arms * turn, 0.08, w.elbow * (1 + 0.8 * Math.max(0, turn)));
}

/** How far the pelvis is through its cycle (0..1) at time t. */
export function phaseAt(g: Gait, t: number): number {
  return fract(t * g.cadence + g.phase);
}

/**
 * Standing at ease: the feet planted `stance` apart, the weight shifting from one to the other
 * every `every` seconds (the free knee easing forward), the chest rising with each breath, the
 * hips swaying a little. `seed` keeps one figure out of step with the next.
 */
export function stand(P: Pose, b: Build, t: number, seed: number, stance: number, every = 4.5, lean = 0): void {
  const L = b.thigh + b.shin + b.ankle;
  const k = Math.sin((t / every) * Math.PI * 2 + seed * 6.1);
  const breath = Math.sin(t * 1.6 + seed * 3.7);
  const sway = k * stance * 0.45;
  // Standing on one leg lets that hip ride up and the other knee go easy.
  const y = -(L - 0.0018 - Math.abs(k) * 0.0012 + breath * 0.0003);
  // The chest lifts and settles with the breath (the spine straightening a little).
  trunk(P, b, sway, 0, y, lean + 0.012 * breath, -k * 0.035, k * 0.05, -k * 0.04, 0, -0.01 * breath);
  legTo(P, b, true, -stance, 0.002, 0, 0, 0.12);
  legTo(P, b, false, stance, -0.002, 0, 0, 0.12);
  // The arms hang easy, swaying a little with the weight.
  armSwing(P, b, true, 0.06 + k * 0.04, 0.1, 0.3);
  armSwing(P, b, false, 0.04 - k * 0.04, 0.1, 0.3);
}

/**
 * Hopping in place, as children do when they are excited: a little skip from one foot to the other
 * (the free foot kicked up behind), `cadence` hops a second, both feet leaving the ground at the
 * top of each hop. Returns the hop's height now (u).
 */
export function hop(P: Pose, b: Build, t: number, cadence: number, phase: number, height: number, stance: number): number {
  const p = fract(t * cadence + phase);
  const L = b.thigh + b.shin + b.ankle;
  // Crouch on landing, spring, fly.
  const air = Math.max(0, Math.sin(p * Math.PI * 2 - 0.4));
  const crouch = Math.max(0, -Math.sin(p * Math.PI * 2 - 0.4)) * 0.0045;
  const up = air * height;
  const odd = Math.floor(t * cadence + phase) % 2 === 0;
  const y = -(L - 0.002 - crouch) - up;
  const sway = (odd ? 1 : -1) * stance * 0.3;
  trunk(P, b, sway, 0, y, 0.05 + crouch * 6, (odd ? 1 : -1) * 0.04, 0, 0, 0, -0.04 * air);
  // The foot it hops on stays under it and leaves the ground only in the air; the other is kicked up behind.
  const kick = Math.max(0, Math.sin(p * Math.PI * 2 - 0.2));
  legTo(P, b, odd, (odd ? -1 : 1) * stance, 0.001, -up, 0.15 * air);
  legTo(P, b, !odd, (odd ? 1 : -1) * stance, -0.006 - kick * 0.006, -up - 0.004 - kick * 0.012, -0.4 * kick);
  // The arms fly up a little with each hop.
  armSwing(P, b, true, 0.3 + air * 0.5, 0.35 + air * 0.4, 0.6);
  armSwing(P, b, false, 0.3 + air * 0.5, 0.35 + air * 0.4, 0.6);
  return up;
}

/**
 * Sitting on a seat `seat` u high (0 on the ground), the knees forward, the feet on the ground ahead
 * (or, on the ground, the legs folded to one side: `fold`), the back leaning by `lean`.
 */
export function sit(P: Pose, b: Build, seat: number, lean: number, twist: number, fold: number): void {
  const y = -seat - b.hips * 0.6;
  perch(P, b, y, seat, lean, twist, fold);
}

/** Sitting with the pelvis at `y` (u, up negative): a figure on a rail or on someone's shoulders, its legs set by the caller (or as `sit` sets them). */
export function perch(P: Pose, b: Build, y: number, seat: number, lean: number, twist: number, fold: number): void {
  trunk(P, b, 0, 0, y, lean, 0, twist, 0, 0, 0);
  if (seat > b.shin * 0.6) {
    // On a chair or a bench: shins down to the ground.
    legTo(P, b, true, -b.hips, b.thigh * 0.95 + b.ball, 0, 0);
    legTo(P, b, false, b.hips, b.thigh * 0.9 + b.ball, 0, 0);
  } else {
    // On the ground: the knees up and the feet drawn in, or folded to the side.
    const kf = b.thigh * (0.95 - fold * 0.2);
    legTo(P, b, true, -b.hips - fold * 0.004, kf + b.shin * 0.2 - fold * 0.02, -b.ankle * 0.2, -0.3 * (1 - fold), 0.2 + fold);
    legTo(P, b, false, b.hips + fold * 0.004, kf + b.shin * 0.05 - fold * 0.025, -b.ankle * 0.2 - fold * 0.002, -0.3 * (1 - fold), 0.2 + fold);
  }
  // The hands in the lap.
  armSwing(P, b, true, 0.5, 0.1, 0.9);
  armSwing(P, b, false, 0.45, 0.1, 0.9);
}

// ---------------------------------------------------------------- choices and the face

/** A figure's own clock: a choice that holds for `hold` seconds and is re-picked by hash for each span (0..1). */
export function choice(t: number, hold: number, id: number, salt = 0): number {
  return hash(Math.floor(t / hold + hash(id * 13 + salt) * 7) * 97 + id * 31 + salt * 7);
}

/**
 * Blinks: the eyes shut for a tenth of a second now and then, every 2.5 to 5.5 seconds, each
 * figure on its own rhythm. Returns 0 open .. 1 shut.
 */
export function blinkAt(t: number, id: number): number {
  const every = 2.5 + hash(id * 7 + 3) * 3;
  const k = fract(t / every + hash(id * 11 + 5));
  const at = k * every;
  return at < 0.12 ? Math.sin((at / 0.12) * Math.PI) : 0;
}

/**
 * Where a figure looks (an angle of the face from its body's view, radians) as it glances about:
 * every few seconds it picks a new direction between `from` and `to`, turning to it in a beat.
 */
export function glance(t: number, id: number, from: number, to: number, hold = 2.6): number {
  const span = hold * (0.7 + hash(id * 5 + 1) * 0.6);
  const n = Math.floor(t / span + hash(id * 3));
  const k = fract(t / span + hash(id * 3));
  const a = from + (to - from) * hash(n * 53 + id * 17);
  const b0 = from + (to - from) * hash((n - 1) * 53 + id * 17);
  const e = ease(k / 0.18);
  return b0 + (a - b0) * e;
}

/**
 * A loose thing hung on the body (a plume, a ponytail, a ribbon, a skirt's hem): its swing
 * (-1..1) from the body's motion a moment ago: it trails the bob and the sway by a quarter of
 * their rhythm and settles. `rate` is the rhythm (cycles a second), `phase` where the body is in it.
 */
export function trail(t: number, rate: number, phase: number, lagBy = 0.22): number {
  return Math.sin((t * rate + phase - lagBy) * Math.PI * 2);
}

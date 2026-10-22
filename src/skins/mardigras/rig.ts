import { hash } from "../../base/draw";

// The skeleton every Mardi Gras figure is built on (folk.ts paints it as a papier-mâché carnival
// sculpture): a pelvis, a spine up to the base of the neck, a head on the neck, two legs and two
// arms of two bones each. A behavior sets a Pose each frame (where the pelvis is, the torso's lean
// and turn, the head's tilt and turn, and where each foot and hand should be), and `solve` places
// every joint: the knees and elbows by two-bone inverse kinematics, so a foot set on the ground
// stays on it and a hand set on a trumpet's valves stays on them, and no joint ever comes apart.
//
// Coordinates are the figure's own: u at full size, the feet on y = 0, y up negative, facing +x
// (the painter mirrors a figure facing left). "Near" is the side toward us, "far" the side away.
//
// The cycles (walk, strut, run, dance in place, sit) are functions of a phase, and the behaviors'
// choices (where to look, when to blink, when to wave) are functions of the scene's clock and a
// hash of the figure's id and a cycle index, never Math.random: the same moment always draws the
// same frame. Loose things (feathers, beads, ribbons, skirts, coat-tails, hat points) follow the
// body with a lag: `swing` and `bob` are the body's motion a moment ago, for the painter to hang
// them on.

/** A joint's place. */
export interface Vec {
  x: number;
  y: number;
}

/** Body proportions (u at full size). */
export interface Build {
  /** Leg bones, and the ankle's height over the ball of the foot. */
  thigh: number;
  shin: number;
  ankle: number;
  /** From the ball of the foot back to the ankle, and on to the toe's tip. */
  heel: number;
  toe: number;
  /** Pelvis to the base of the neck, and on to the head's center. */
  spine: number;
  neck: number;
  /** Arm bones. */
  upper: number;
  fore: number;
  /** The head's half width and half height. */
  headW: number;
  headH: number;
  /** Half widths of the torso at the hips, the waist and the chest, and how far the belly rounds out in front. */
  hipW: number;
  waistW: number;
  chestW: number;
  belly: number;
  /** Limb radii: the leg at the hip, the knee and the ankle; the arm at the shoulder, the elbow and the wrist. */
  leg0: number;
  leg1: number;
  leg2: number;
  arm0: number;
  arm1: number;
  arm2: number;
  /** The hand's radius. */
  hand: number;
}

/** A grown-up of middling build: a big carnival head, a sculpted chest, long tapered limbs. */
export const ADULT: Build = {
  thigh: 0.04,
  shin: 0.038,
  ankle: 0.007,
  heel: 0.007,
  toe: 0.009,
  spine: 0.056,
  neck: 0.026,
  upper: 0.031,
  fore: 0.029,
  headW: 0.027,
  headH: 0.029,
  hipW: 0.021,
  waistW: 0.018,
  chestW: 0.025,
  belly: 0.002,
  leg0: 0.0108,
  leg1: 0.008,
  leg2: 0.0064,
  arm0: 0.0078,
  arm1: 0.0063,
  arm2: 0.0053,
  hand: 0.0076,
};

/** A build from ADULT with some proportions changed. */
export function build(over: Partial<Build>, from: Build = ADULT): Build {
  return { ...from, ...over };
}

/** A child's build (drawn at a smaller size too): a bigger head for the body, shorter limbs. */
export const CHILD: Build = build({
  thigh: 0.033,
  shin: 0.031,
  spine: 0.048,
  neck: 0.027,
  upper: 0.027,
  fore: 0.025,
  headW: 0.032,
  headH: 0.033,
  hipW: 0.019,
  waistW: 0.018,
  chestW: 0.021,
  belly: 0.003,
  leg0: 0.0108,
  leg1: 0.0088,
  leg2: 0.0074,
  arm0: 0.0082,
  arm1: 0.007,
  arm2: 0.006,
  hand: 0.0084,
});

/** A skeleton of the krewe: long thin bones, a big skull. */
export const BONY: Build = build({
  thigh: 0.042,
  shin: 0.04,
  spine: 0.054,
  headW: 0.028,
  headH: 0.028,
  hipW: 0.016,
  waistW: 0.012,
  chestW: 0.022,
  belly: -0.002,
  leg0: 0.008,
  leg1: 0.006,
  leg2: 0.0052,
  arm0: 0.0066,
  arm1: 0.0052,
  arm2: 0.0046,
});

/** A stilt walker: long striped trousers over the stilts make legs twice a body's. */
export const STILTED: Build = build({ thigh: 0.05, shin: 0.098, ankle: 0.006, leg0: 0.0105, leg1: 0.0072, leg2: 0.0052 });

/** What a behavior sets each frame. */
export interface Pose {
  /** The pelvis: x from the figure's origin, height above the ground (positive). */
  hipX: number;
  hipY: number;
  /** The torso's lean about the pelvis (radians, + forward) and the shoulders' turn against the hips (-1..1, + near shoulder forward). */
  lean: number;
  twist: number;
  /** The head: its tilt on the neck (radians, + forward) and its turn (0 toward us, 1 three-quarters ahead, -1 looking back). */
  tilt: number;
  turn: number;
  /** Each foot's ball (x, y: y up negative, 0 on the ground) and pitch (radians, + heel up). */
  nearX: number;
  nearY: number;
  nearP: number;
  farX: number;
  farY: number;
  farP: number;
  /** Each wrist's target. */
  handNX: number;
  handNY: number;
  handFX: number;
  handFY: number;
  /** Which way each elbow bends: +1 back and down (at ease), -1 out in front (an arm raised to wave or throw). */
  elbowN: number;
  elbowF: number;
  /** The face: the mouth (0 a smile, 1 open wide) and the eyelids (0 open, 1 shut). */
  mouth: number;
  blink: number;
  /** Loose things' lag: how far they swing behind the body's sway (-1..1), and its bounce a moment ago (-1..1, + rising). */
  swing: number;
  bob: number;
  /** The scene's clock, for flutter. */
  t: number;
}

/** A pose standing at ease (for `build` b). */
export function rest(p: Pose, b: Build): Pose {
  p.hipX = 0;
  p.hipY = (b.thigh + b.shin) * 0.985 + b.ankle;
  p.lean = 0;
  p.twist = 0;
  p.tilt = 0;
  p.turn = 0.4;
  p.nearX = 0.005;
  p.nearY = 0;
  p.nearP = 0;
  p.farX = -0.006;
  p.farY = 0;
  p.farP = 0;
  const sh = shoulderY(p, b);
  const reach = (b.upper + b.fore) * 0.93;
  p.handNX = 0.006;
  p.handNY = sh + reach;
  p.handFX = -0.008;
  p.handFY = sh + reach;
  p.elbowN = 1;
  p.elbowF = 1;
  p.mouth = 0;
  p.blink = 0;
  p.swing = 0;
  p.bob = 0;
  p.t = 0;
  return p;
}

/** A fresh pose. */
export function pose(b: Build): Pose {
  return rest(
    {
      hipX: 0,
      hipY: 0,
      lean: 0,
      twist: 0,
      tilt: 0,
      turn: 0,
      nearX: 0,
      nearY: 0,
      nearP: 0,
      farX: 0,
      farY: 0,
      farP: 0,
      handNX: 0,
      handNY: 0,
      handFX: 0,
      handFY: 0,
      elbowN: 1,
      elbowF: 1,
      mouth: 0,
      blink: 0,
      swing: 0,
      bob: 0,
      t: 0,
    },
    b,
  );
}

/** The shoulders' height in a pose without lean (y, negative up): for setting hands. */
export function shoulderY(p: Pose, b: Build): number {
  return -p.hipY - b.spine + SHOULDER_DROP;
}

/** How far the shoulders sit below the base of the neck (u). */
const SHOULDER_DROP = 0.006;

/** The joints a pose puts where they go. */
export interface Rig {
  pelvis: Vec;
  /** The base of the neck, and the head's center. */
  neck: Vec;
  head: Vec;
  /** The torso's up direction (unit), and the head's angle (radians). */
  up: Vec;
  headA: number;
  hipN: Vec;
  kneeN: Vec;
  ankleN: Vec;
  ballN: Vec;
  hipF: Vec;
  kneeF: Vec;
  ankleF: Vec;
  ballF: Vec;
  shN: Vec;
  elN: Vec;
  wrN: Vec;
  shF: Vec;
  elF: Vec;
  wrF: Vec;
  /** Each foot's pitch. */
  pitchN: number;
  pitchF: number;
}

const v = (): Vec => ({ x: 0, y: 0 });

export function rig(): Rig {
  return {
    pelvis: v(),
    neck: v(),
    head: v(),
    up: v(),
    headA: 0,
    hipN: v(),
    kneeN: v(),
    ankleN: v(),
    ballN: v(),
    hipF: v(),
    kneeF: v(),
    ankleF: v(),
    ballF: v(),
    shN: v(),
    elN: v(),
    wrN: v(),
    shF: v(),
    elF: v(),
    wrF: v(),
    pitchN: 0,
    pitchF: 0,
  };
}

/**
 * Two-bone IK: from the root (ax, ay) toward the target (tx, ty) with bones a and b, the middle
 * joint bending to the `bend` side (+1: turning clockwise on screen from the root-to-target line,
 * -1 the other way). Writes the middle joint into `mid` and the end into `end` (the target, or as
 * near to it as the bones reach).
 */
export function ik(ax: number, ay: number, tx: number, ty: number, a: number, b: number, bend: number, mid: Vec, end: Vec): void {
  const dx = tx - ax;
  const dy = ty - ay;
  const d = Math.hypot(dx, dy);
  const max = a + b - 1e-7;
  const min = Math.abs(a - b) + 1e-7;
  const r = d > max ? max : d < min ? min : d;
  const ux = d > 1e-9 ? dx / d : 0;
  const uy = d > 1e-9 ? dy / d : 1;
  const cos = (a * a + r * r - b * b) / (2 * a * r);
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos)) * bend;
  mid.x = ax + a * (ux * cos - uy * sin);
  mid.y = ay + a * (ux * sin + uy * cos);
  end.x = ax + ux * r;
  end.y = ay + uy * r;
}

/** Where the ankle is for a foot's ball at (bx, by) pitched by p (heel up +). */
function ankleOf(b: Build, bx: number, by: number, p: number, out: Vec): void {
  // The ankle sits `heel` behind the ball and `ankle` above the sole; pitching the foot turns
  // that offset about the ball (the ball stays put, as a foot rolls onto its toes).
  const ox = -b.heel;
  const oy = -b.ankle;
  const c = Math.cos(p);
  const s = Math.sin(p);
  out.x = bx + ox * c + oy * s;
  out.y = by - ox * s + oy * c;
}

const ANKLE = v();

/** Put the joints where the pose wants them. */
export function solve(b: Build, p: Pose, r: Rig): Rig {
  const px = p.hipX;
  const py = -p.hipY;
  r.pelvis.x = px;
  r.pelvis.y = py;
  const ux = Math.sin(p.lean);
  const uy = -Math.cos(p.lean);
  r.up.x = ux;
  r.up.y = uy;
  r.neck.x = px + ux * b.spine;
  r.neck.y = py + uy * b.spine;
  r.headA = p.lean * 0.5 + p.tilt;
  r.head.x = r.neck.x + Math.sin(r.headA) * b.neck;
  r.head.y = r.neck.y - Math.cos(r.headA) * b.neck;
  // The hips, a little apart across the pelvis (we see the figure three-quarters on).
  r.hipN.x = px + b.hipW * 0.32;
  r.hipN.y = py + 0.002;
  r.hipF.x = px - b.hipW * 0.32;
  r.hipF.y = py;
  // The legs: the knees bend forward (+x).
  r.pitchN = p.nearP;
  r.pitchF = p.farP;
  r.ballN.x = p.nearX;
  r.ballN.y = p.nearY;
  r.ballF.x = p.farX;
  r.ballF.y = p.farY;
  ankleOf(b, p.nearX, p.nearY, p.nearP, ANKLE);
  ik(r.hipN.x, r.hipN.y, ANKLE.x, ANKLE.y, b.thigh, b.shin, -1, r.kneeN, r.ankleN);
  ankleOf(b, p.farX, p.farY, p.farP, ANKLE);
  ik(r.hipF.x, r.hipF.y, ANKLE.x, ANKLE.y, b.thigh, b.shin, -1, r.kneeF, r.ankleF);
  // The shoulders, below the base of the neck along the torso, turned against the hips.
  const sx = r.neck.x - ux * SHOULDER_DROP;
  const sy = r.neck.y - uy * SHOULDER_DROP;
  const across = b.chestW * 0.62;
  const tw = p.twist * b.chestW * 0.35;
  r.shN.x = sx + across * 0.55 + tw;
  r.shN.y = sy + 0.001;
  r.shF.x = sx - across * 0.55 - tw;
  r.shF.y = sy - 0.001;
  // The arms: an elbow at ease bends back and down; raised, it comes out in front.
  ik(r.shN.x, r.shN.y, p.handNX, p.handNY, b.upper, b.fore, p.elbowN, r.elN, r.wrN);
  ik(r.shF.x, r.shF.y, p.handFX, p.handFY, b.upper, b.fore, p.elbowF, r.elF, r.wrF);
  return r;
}

// ---------------------------------------------------------------- cycles

/** How a figure walks. Lengths are the figure's own (u at full size). */
export interface Gait {
  /** One step's length. */
  step: number;
  /** The share of a cycle each foot is on the ground (over 0.5: a walk, both feet down a moment; under: a run, with a flight). */
  duty: number;
  /** How high a swinging foot is lifted (a strut's knee comes up high). */
  lift: number;
  /** How far the pelvis dips at each footfall below its height at the passing step. */
  bounce: number;
  /** How far the hands swing forward and back. */
  swing: number;
  /** The torso's lean (radians, + forward) and how much it rolls with each step. */
  lean: number;
  roll: number;
}

/** Scratch for a foot in a cycle. */
const FOOT = { x: 0, y: 0, p: 0, down: false };

function smooth(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

function frac(x: number): number {
  return x - Math.floor(x);
}

/**
 * A foot in a cycle at local phase q (0..1, 0 its footfall): planted while down, its ball
 * sweeping back at the body's speed, rolling onto its toes at the end; then lifted forward in an
 * arc to the next footfall.
 */
function foot(g: Gait, q: number): typeof FOOT {
  const sweep = 2 * g.step * g.duty;
  if (q < g.duty) {
    const s = q / g.duty;
    FOOT.x = sweep * (0.5 - s);
    FOOT.y = 0;
    // The heel comes up over the last third of the stance, the ball staying put.
    FOOT.p = 0.75 * smooth((s - 0.62) / 0.38);
    FOOT.down = true;
  } else {
    const s = (q - g.duty) / (1 - g.duty);
    FOOT.x = -sweep / 2 + sweep * smooth(s);
    FOOT.y = -g.lift * Math.sin(Math.PI * Math.min(1, s * 1.1));
    // Toes still pointing down as it leaves, the foot level again before it lands.
    FOOT.p = 0.75 * (1 - smooth(s / 0.45)) - 0.12 * Math.sin(Math.PI * s);
    FOOT.down = false;
  }
  return FOOT;
}

/** Whether the near foot is on the ground at phase φ (for tests). */
export function nearDown(g: Gait, phase: number): boolean {
  return frac(phase) < g.duty;
}

/**
 * A walking (or running) pose at phase φ (cycles: one cycle is two steps, the near foot landing
 * at φ = 0, the far at 0.5) for build b: the feet planted and swung, the pelvis dipping at each
 * footfall (never so high that a planted foot leaves the ground), the torso leaning and rolling
 * against the hips, the arms swinging against the legs. The hands hang from the shoulders; a
 * behavior overrides them to hold something.
 */
export function walk(p: Pose, b: Build, phase: number, g: Gait): Pose {
  const q = frac(phase);
  const legs = b.thigh + b.shin;
  let hip = legs * 0.985 + b.ankle;
  const n = foot(g, q);
  p.nearX = n.x;
  p.nearY = n.y;
  p.nearP = n.p;
  const nDown = n.down;
  const f = foot(g, q + 0.5 - Math.floor(q + 0.5));
  p.farX = f.x;
  p.farY = f.y;
  p.farP = f.p;
  const fDown = f.down;
  // The pelvis: lowest at each footfall, highest as the legs pass. A run rises in its flight.
  const c = Math.cos(4 * Math.PI * q);
  hip -= g.bounce * (1 + c) * 0.5;
  if (g.duty < 0.5) hip += g.bounce * 1.6 * Math.max(0, -c);
  p.hipX = 0;
  // Never higher than a planted foot can reach.
  const reach = legs - 0.0005;
  if (nDown) hip = Math.min(hip, heightFor(b, p.nearX, p.nearP, reach, 0.32));
  if (fDown) hip = Math.min(hip, heightFor(b, p.farX, p.farP, reach, -0.32));
  p.hipY = hip;
  p.lean = g.lean + g.roll * Math.sin(4 * Math.PI * q);
  p.twist = -0.6 * Math.cos(2 * Math.PI * q);
  // The arms swing against the legs: the near hand back as the near foot lands.
  const sh = shoulderY(p, b);
  const hang = (b.upper + b.fore) * 0.9;
  const a = Math.cos(2 * Math.PI * q);
  p.handNX = 0.004 - g.swing * a;
  p.handNY = sh + hang - Math.abs(a) * g.swing * 0.3;
  p.handFX = -0.006 + g.swing * a;
  p.handFY = sh + hang - Math.abs(a) * g.swing * 0.3;
  p.elbowN = 1;
  p.elbowF = 1;
  p.bob = Math.sin(4 * Math.PI * q - 1.1);
  p.swing = Math.sin(2 * Math.PI * q - 1.2);
  return p;
}

/** The highest the pelvis can be with a foot's ball at x (pitched by p) on the ground. */
function heightFor(b: Build, x: number, pitch: number, reach: number, side: number): number {
  ankleOf(b, x, 0, pitch, ANKLE);
  const dx = ANKLE.x - b.hipW * side;
  const up = Math.sqrt(Math.max(0, reach * reach - dx * dx));
  return up - ANKLE.y;
}

/** Dancing in place at beat phase φ (cycles, one a beat pair): a bounce on every beat, a step from foot to foot, the hips swaying, the arms out with the swing. */
export function dance(p: Pose, b: Build, phase: number, amount = 1): Pose {
  const q = frac(phase);
  const legs = b.thigh + b.shin;
  const beat = Math.cos(4 * Math.PI * q);
  // A step from foot to foot: each foot lifts in its half of the bar.
  const liftN = Math.max(0, Math.sin(2 * Math.PI * q)) * 0.012 * amount;
  const liftF = Math.max(0, -Math.sin(2 * Math.PI * q)) * 0.012 * amount;
  p.nearX = 0.012;
  p.nearY = -liftN;
  p.nearP = liftN * 20;
  p.farX = -0.012;
  p.farY = -liftF;
  p.farP = liftF * 20;
  p.hipX = 0.004 * Math.sin(2 * Math.PI * q) * amount;
  p.hipY = legs * 0.95 + b.ankle - 0.008 * (1 + beat) * 0.5 * amount;
  p.lean = 0.1 * Math.sin(2 * Math.PI * q) * amount;
  p.twist = 0.8 * Math.sin(2 * Math.PI * q + 0.6) * amount;
  p.bob = Math.sin(4 * Math.PI * q - 1.1);
  p.swing = Math.sin(2 * Math.PI * q - 1.2);
  return p;
}

/** Sitting (on a seat `seat` high, u): the thighs forward along it, the shins hanging, the feet a little apart. */
export function sit(p: Pose, b: Build, seat: number, kick = 0): Pose {
  p.hipX = 0;
  p.hipY = seat;
  p.nearX = b.thigh * 0.95 + 0.006 + kick * 0.01;
  p.nearY = Math.min(0, -seat + b.shin + b.ankle) - kick * 0.008;
  p.nearP = -0.2;
  p.farX = b.thigh * 0.9 + 0.002 - kick * 0.006;
  p.farY = Math.min(0, -seat + b.shin + b.ankle) + kick * 0.004;
  p.farP = -0.1;
  return p;
}

// ---------------------------------------------------------------- behaviors

/** A deterministic 0..1 for figure `id`, cycle `n` and channel `c`. */
export function pick(id: number, n: number, c = 0): number {
  return hash(id * 97.13 + n * 13.37 + c * 5.71 + 0.5);
}

/** 0..1 eased in and out. */
export { smooth };

/** Scratch result of `glance`. */
const LOOK = { turn: 0, tilt: 0 };

/**
 * Where figure `id` looks at time t: every few seconds (its own interval) it turns its head to a
 * new place (toward the way it faces, toward us, a glance back, now and then a tilt), easing
 * there over half a second. `bias` is the turn it favors, `range` how far it wanders from it.
 */
export function glance(t: number, id: number, bias = 0.45, range = 0.7): typeof LOOK {
  const every = 2.1 + pick(id, 0, 9) * 1.9;
  const k = (t + pick(id, 1, 9) * every) / every;
  const n = Math.floor(k);
  const e = smooth((k - n) * every * 2.2);
  const at = (i: number) => bias + (pick(id, i, 1) - 0.5) * 2 * range;
  const tl = (i: number) => (pick(id, i, 2) - 0.5) * 0.22;
  LOOK.turn = at(n - 1) + (at(n) - at(n - 1)) * e;
  LOOK.tilt = tl(n - 1) + (tl(n) - tl(n - 1)) * e;
  return LOOK;
}

/** How shut figure `id`'s eyes are at time t: a quick blink every few seconds. */
export function blinkAt(t: number, id: number): number {
  const every = 2.6 + pick(id, 0, 7) * 2.4;
  const k = (t + pick(id, 0, 8) * every) / every;
  const e = (k - Math.floor(k)) * every;
  return e < 0.16 ? Math.sin((e / 0.16) * Math.PI) : 0;
}

/** Whether figure `id` is in its window of an occasional act at time t: 0..1..0 over `len` s, once every `every` s at its own offset. */
export function now(t: number, id: number, every: number, len: number, at = pick(id, 3, 4) * every): number {
  const e = (((t - at) % every) + every) % every;
  if (e > len) return 0;
  return Math.sin((e / len) * Math.PI);
}

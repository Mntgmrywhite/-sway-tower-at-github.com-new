import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, GOLD, MAGENTA, ORANGE, PINK, RED, SHADOW, SHADOW_MID, VIOLET } from "./colors";
import { hotTube, rimTube } from "./tube";

// A chrome wedge coupe of our own design (no real marque), parked on the grid right of the
// tower, tail toward us: a chrome body mirroring the sunset, a full-width taillight bar split by
// a small chrome chevron, a raked cabin with dark glass, a ducktail wing on two struts.
//
// It puts on a show as each tower's scene starts (Scene.t from 0), over in under ten seconds:
// a burnout in its spot (brakes on, rear wheels spinning, thick neon-tinted tyre smoke billowing
// out behind, a little fishtail, the body shaking on the revs and the exhausts popping), then it
// grips and peels out, straight up the grid into the distance, shrinking in the floor's
// perspective. Far out it kicks its tail out into three tight donuts (small, with its smoke and
// glowing tyre rings that fade), comes out of the last spin pointing at the city, and zooms off
// down the same line to the skyline on the horizon, fading into the haze there. It does not come
// back: its spot stays empty for the rest of the run (it is parked there again when the next
// tower's scene starts). The whole show keeps to one lane right of the tower: the line from its
// spot to the city runs between the tower's column and the right palm's trunk, so it never goes
// behind the tower, and it stays clear of the palms, the arcade, the screen edges and the
// "tap to drop" line.
//
// The car is a small 3D model (a wedge-prism body, a frustum cabin, a wing, four wheels) drawn
// through the floor's own perspective, linearized at the car's middle, so as it spins it turns
// through its rear, side and front views. Faces facing away are skipped; each visible face is
// drawn in its own flat frame (the rear panel keeps the original chrome art). Everything follows
// from Scene.t alone: the path, the smoke puffs and the tyre marks are worked out once.

// ------------------------------------------------------------------ where and when

/** Home: depth on the floor and screen offset from the middle (u) where it parks. */
export const CAR_Z = 1.75;
export const CAR_X = 0.3;
/** Width (u at the tower's depth; depth is in the same units). */
const CAR_W = 0.09;
const HOME_A = (CAR_X * CAR_Z) / TOWER_DEPTH;
/** Parked pointing straight away from us, so the idle view is a square rear view. */
const HOME_HEADING = Math.atan2(HOME_A, CAR_Z);

/** It spins about a point this far ahead of its middle (car widths): the tail swings widest. */
const PIVOT = 0.12;
/** Forward unit vector on the floor (a, z) for a heading (0: away from us, + to the right). */
const FWD_A = Math.sin(HOME_HEADING);
const FWD_Z = Math.cos(HOME_HEADING);
/** The pivot at home. */
const HOME_PA = HOME_A + PIVOT * CAR_W * FWD_A;
const HOME_PZ = CAR_Z + PIVOT * CAR_W * FWD_Z;

/** The lane: the screen offset (u) of the line on the floor it drives out along, from just past
 *  its spot to the city on the horizon, halfway between the tower's column and the palm. Driving
 *  straight up the floor along it keeps that offset all the way to the horizon. */
export const LANE_X = 0.335;
/** How far up the floor (depth) the pivot takes to ease over from its spot's line into the lane. */
const STEER = 1.2;
/** The donut spot, out in the lane: the depth of the point it spins about. */
export const SPOT_Z = 6;
const SPOT_A = (LANE_X * SPOT_Z) / TOWER_DEPTH;
/** Heading along the lane (it points at the city). */
const CITY_HEADING = Math.atan2(LANE_X, TOWER_DEPTH);
/** From the spot to the city: how far it runs (depth) until it is gone in the haze, and the
 *  depth from which it starts fading. */
const ZOOM_RUN = 50;
const FADE_FROM = 14;
const FADE_TO = SPOT_Z + ZOOM_RUN;

/** The show's timeline (seconds of Scene.t). */
export const BURNOUT = 0.5;
export const LAUNCH = 2.8;
/** The tail steps out as it slides into the spot. */
export const DONUTS = 4.0;
/** When the pivot reaches the donut spot. */
export const ARRIVE = 4.5;
export const DONUTS_END = 7.4;
/** A beat out of the last spin, then it zooms off to the city, gone by GONE. */
export const ZOOM = 7.6;
export const GONE = 9.4;
/** Full turns in the donuts (it turns left all the way, ending pointing at the city). */
export const SPINS = 3;
/** By now the last smoke and tyre marks have faded: from here on nothing is drawn. */
export const SHOW_END = 10;

const TAU = Math.PI * 2;

/** Burnout: fishtail swing (radians) and rate (Hz), body shake (car widths), squat (radians). */
const FISHTAIL = 0.07;
const FISHTAIL_HZ = 1.4;
const SHAKE = 0.007;
const SQUAT = 0.03;
/** Rear-wheel spin as drawn while they light up (radians per second). */
const WHEEL_SPIN = 9;
/** Wheels' spokes and tread repeat every third of a turn. */
const WHEEL_REPEAT = TAU / 3;
const snapWheel = (a: number): number => Math.round(a / WHEEL_REPEAT) * WHEEL_REPEAT;
/** The front wheels only turn from the launch on (from where they stood: a whole repeat). */
const FRONT_LAG = snapWheel(WHEEL_SPIN * (LAUNCH - BURNOUT));

export type CarPhase = "ready" | "burnout" | "launch" | "donuts" | "zoom" | "gone";

function clamp01(k: number): number {
  return k < 0 ? 0 : k > 1 ? 1 : k;
}

function smooth(k: number): number {
  const x = clamp01(k);
  return x * x * (3 - 2 * x);
}

/** 0 → 1 with its fastest move a third of the way in: a launch that keeps easing into the spot. */
function surge(k: number): number {
  const x = clamp01(k);
  return x * x * (6 - 8 * x + 3 * x * x);
}

/** Turning speed through the donuts: knots of [time, share of PEAK]. */
const TURN: readonly (readonly [number, number])[] = [
  [DONUTS, 0],
  [ARRIVE + 0.2, 1],
  [DONUTS_END - 0.6, 1],
  [DONUTS_END, 0],
];
/** The top turning speed that makes the total exactly SPINS turns. */
const PEAK = (() => {
  let per = 0;
  for (let i = 0; i + 1 < TURN.length; i++) per += ((TURN[i]![1] + TURN[i + 1]![1]) / 2) * (TURN[i + 1]![0] - TURN[i]![0]);
  return (SPINS * TAU) / per;
})();

/** How far it has turned (left, radians) since the donuts began. */
function turned(t: number): number {
  let sum = 0;
  for (let i = 0; i + 1 < TURN.length; i++) {
    const [t0, k0] = TURN[i]!;
    const [t1, k1] = TURN[i + 1]!;
    if (t <= t0) break;
    const w0 = k0 * PEAK;
    const w1 = k1 * PEAK;
    const dt = Math.min(t, t1) - t0;
    sum += w0 * dt + ((w1 - w0) * dt * dt) / (2 * (t1 - t0));
  }
  return sum;
}

/** The pivot's way out, by depth: the screen offset (u) of its line, easing from its spot's
 *  line into the lane, and its heading there (along the line it traces on the floor). */
function wayX(z: number): number {
  return CAR_X + (LANE_X - CAR_X) * smooth((z - HOME_PZ) / STEER);
}
function wayHeading(z: number): number {
  if (z >= HOME_PZ + STEER) return CITY_HEADING;
  const k = clamp01((z - HOME_PZ) / STEER);
  const slope = (LANE_X - CAR_X) * ((6 * k * (1 - k)) / STEER);
  // The floor point is (offset * z / TOWER_DEPTH, z): its slope across per unit of depth.
  return Math.atan((wayX(z) + z * slope) / TOWER_DEPTH);
}

/** Car fade with depth: whole until FADE_FROM, gone in the haze at FADE_TO. */
function fadeAt(z: number): number {
  return 1 - smooth((z - FADE_FROM) / (FADE_TO - FADE_FROM));
}

/** Scratch pose (world units on the floor). */
const POSE = {
  a: HOME_A,
  z: CAR_Z,
  heading: HOME_HEADING,
  /** Body pitch (radians, nose up) and heave (car widths). */
  pitch: 0,
  heave: 0,
  /** Wheel angles (radians). */
  rear: 0,
  front: 0,
  /** Exhaust flames, brake lights (0..1). */
  flare: 0,
  brake: 0,
  /** How much of it shows (0..1): it fades into the haze at the city. */
  fade: 1,
  phase: "ready" as CarPhase,
};
type Pose = typeof POSE;

/** Nose-up squat and exhaust flare as it takes off, k seconds after. */
function squat(k: number): number {
  return SQUAT * (1 + 0.8 * Math.exp(-k * 5)) * Math.exp(-k * 1.5);
}

/** Where the car is at scene time t, and what it is doing. Pure in t. */
function poseAt(t: number): Pose {
  const p = POSE;
  p.pitch = 0;
  p.heave = 0;
  p.flare = 0;
  p.brake = 0;
  p.front = 0;
  p.fade = 1;
  p.rear = WHEEL_SPIN * (Math.min(Math.max(t, BURNOUT), GONE) - BURNOUT);
  let heading = HOME_HEADING;
  let a = HOME_A;
  let z = CAR_Z;
  if (t < BURNOUT) {
    p.phase = "ready";
  } else if (t < LAUNCH) {
    // Burnout: brakes on, rear wheels lit, the tail wagging about the pivot, shaking on the revs.
    p.phase = "burnout";
    const k = t - BURNOUT;
    const env = Math.min(1, k / 0.5) * Math.min(1, (LAUNCH - t) / 0.3);
    heading = HOME_HEADING + FISHTAIL * env * Math.sin(TAU * FISHTAIL_HZ * k);
    a = HOME_PA - PIVOT * CAR_W * Math.sin(heading);
    z = HOME_PZ - PIVOT * CAR_W * Math.cos(heading);
    const on = Math.min(1, k / 0.3);
    const rev = Math.sin(TAU * 2.2 * k);
    p.pitch = SQUAT * on;
    p.heave = SHAKE * on * Math.sin(t * 61) * (0.6 + 0.4 * rev * rev);
    p.flare = on * (0.35 + 0.65 * Math.max(0, rev));
    p.brake = 1;
  } else {
    // Peel out up the floor into the lane and out to the spot; the tail steps out as it slides in
    // and it spins about the pivot; out of the last spin it points at the city and zooms off.
    p.phase = t < DONUTS ? "launch" : t < DONUTS_END ? "donuts" : t < GONE ? "zoom" : "gone";
    let pz = SPOT_Z;
    let pa = SPOT_A;
    if (t < ARRIVE) {
      pz = HOME_PZ + (SPOT_Z - HOME_PZ) * surge((t - LAUNCH) / (ARRIVE - LAUNCH));
      pa = (wayX(pz) * pz) / TOWER_DEPTH;
    } else if (t > ZOOM) {
      const k = clamp01((t - ZOOM) / (GONE - ZOOM));
      pz = SPOT_Z + ZOOM_RUN * k * k;
      pa = (LANE_X * pz) / TOWER_DEPTH;
    }
    heading = wayHeading(pz) - turned(t);
    a = pa - PIVOT * CAR_W * Math.sin(heading);
    z = pz - PIVOT * CAR_W * Math.cos(heading);
    const k = t - LAUNCH;
    const go = t - ZOOM;
    p.pitch = squat(k) + (go > 0 ? squat(go) : 0);
    p.flare =
      Math.exp(-k * 3) +
      (p.phase === "donuts" ? 0.35 * Math.max(0, Math.sin(t * 9.3) * Math.sin(t * 4.1)) : 0) +
      (go > 0 ? Math.exp(-go * 3) : 0);
    p.front = p.rear - FRONT_LAG;
    p.fade = fadeAt(pz);
  }
  p.a = a;
  p.z = z;
  p.heading = heading;
  return p;
}

// ------------------------------------------------------------------ smoke and tyre marks

/** A rear wheel's contact patch on the floor (a, z) for a pose: side -1 left, +1 right. */
function rearPatch(p: Pose, side: number, out: Float64Array, i: number): void {
  const s = Math.sin(p.heading);
  const c = Math.cos(p.heading);
  const x = side * 0.41 * CAR_W;
  const l = -0.62 * CAR_W;
  out[i] = p.a + x * c + l * s;
  out[i + 1] = p.z - x * s + l * c;
}

/** Smoke puffs, worked out once: when and where each leaves a rear tyre, and how it drifts. */
const PUFF_FIELDS = 9;
const PUFF = { t0: 0, a: 1, z: 2, va: 3, vz: 4, rise: 5, r: 6, life: 7, tint: 8 } as const;
/** Puffs: thrown back (u/s), spread out sideways (u/s), rising (u/s), full size (u), life (s). */
const SMOKE_WINDOWS: readonly {
  from: number;
  to: number;
  rate: number;
  back: number;
  spread: number;
  rise: number;
  size: number;
  life: number;
}[] = [
  { from: BURNOUT + 0.15, to: LAUNCH, rate: 9, back: 0.2, spread: 0.08, rise: 0.022, size: 0.048, life: 2.1 },
  // Wheelspin off the line, into the burnout's cloud.
  { from: LAUNCH, to: LAUNCH + 0.45, rate: 16, back: 0.12, spread: 0.03, rise: 0.02, size: 0.04, life: 1.4 },
  // The far donuts: a cloud rising round the spinning car.
  { from: DONUTS, to: DONUTS_END - 0.6, rate: 24, back: 0.04, spread: 0.012, rise: 0.03, size: 0.055, life: 1.7 },
  // A burst of wheelspin as it zooms off the spot.
  { from: ZOOM, to: ZOOM + 0.15, rate: 40, back: 0.1, spread: 0.03, rise: 0.02, size: 0.05, life: 1.2 },
];
/** Smoke drifts a touch toward the middle of the floor (u/s), away from the palm; the right
 *  tyre's smoke billows out on that side only this much of the left tyre's, in puffs this much
 *  smaller. */
const SMOKE_WIND = -0.03;
const RIGHT_SPREAD = 0.25;
const RIGHT_SIZE = 0.75;
/** How fast a puff loses its throw (s) and grows to full size (s). */
const SMOKE_DRAG = 0.45;
const SMOKE_GROW = 0.8;
const SMOKE_ALPHA = 0.5;

const PUFFS: Float64Array = (() => {
  const out: number[] = [];
  const patch = new Float64Array(2);
  let n = 0;
  for (const w of SMOKE_WINDOWS) {
    const count = Math.floor((w.to - w.from) * w.rate);
    for (let k = 0; k < count; k++) {
      for (const side of [-1, 1]) {
        n++;
        const t0 = w.from + (k + 0.8 * hash(n * 3.1)) / w.rate;
        const p = poseAt(t0);
        rearPatch(p, side, patch, 0);
        const s = Math.sin(p.heading);
        const c = Math.cos(p.heading);
        const back = w.back * (0.6 + 0.8 * hash(n * 5.7));
        const out1 = side * w.spread * (side > 0 ? RIGHT_SPREAD : 1) * (hash(n * 7.3) * 1.6 - 0.3);
        out.push(
          t0,
          patch[0]!,
          patch[1]!,
          -back * s + out1 * c + SMOKE_WIND,
          -back * c - out1 * s,
          w.rise * (0.6 + 0.8 * hash(n * 9.1)),
          w.size * (side > 0 ? RIGHT_SIZE : 1) * (0.75 + 0.5 * hash(n * 11.9)),
          w.life * (0.8 + 0.4 * hash(n * 13.3)),
          Math.floor(hash(n * 17.7) * 3),
        );
      }
    }
  }
  // In the order they leave the tyres, so drawing can stop at the first one still to come.
  const rows: number[][] = [];
  for (let i = 0; i < out.length; i += PUFF_FIELDS) rows.push(out.slice(i, i + PUFF_FIELDS));
  rows.sort((p, q) => p[0]! - q[0]!);
  return Float64Array.from(rows.flat());
})();

/** Tyre marks: both rear patches sampled through the donuts (rings round the spot). */
const MARK_DT = 1 / 30;
const MARK_FROM = DONUTS + 0.15;
const MARK_COUNT = Math.floor((DONUTS_END - MARK_FROM) / MARK_DT) + 1;
const MARKS: Float64Array = (() => {
  const out = new Float64Array(MARK_COUNT * 4);
  for (let i = 0; i < MARK_COUNT; i++) {
    const p = poseAt(MARK_FROM + i * MARK_DT);
    rearPatch(p, -1, out, i * 4);
    rearPatch(p, 1, out, i * 4 + 2);
  }
  return out;
})();
/** Samples per stroke (each fades on its own), how long a mark glows (s) and how brightly. */
const MARK_CHUNK = 10;
const MARK_LIFE = 2.4;
const MARK_ALPHA = 0.55;

// ------------------------------------------------------------------ projection

/** This frame's projection: the floor's own perspective, linearized at the car's middle. */
const VIEW = {
  /** Screen per world unit across the floor (f), and f times the camera's height. */
  f: 0,
  fh: 0,
  cx: 0,
  hy: 0,
};

function setView(s: Scene): void {
  VIEW.f = TOWER_DEPTH * s.u;
  VIEW.fh = (s.groundY - s.horizonY) * TOWER_DEPTH;
  VIEW.cx = s.cssW / 2;
  VIEW.hy = s.horizonY;
}

/** Screen point of a floor point (a, z) at height h (world units), into SX, SY. */
let SX = 0;
let SY = 0;
function project(a: number, z: number, h: number): void {
  SX = VIEW.cx + (VIEW.f * a) / z;
  SY = VIEW.hy + (VIEW.fh - VIEW.f * h) / z;
}

/**
 * Linear maps from the car's own axes (x right, l forward, h up; car widths) to screen pixels,
 * as [x.sx, x.sy, l.sx, l.sy, h.sx, h.sy]: CH for the chassis (wheels, shadow), BD for the body
 * (pitched). With their origins (the middle on the floor; the body's raised by its heave) and the
 * direction we look along, in each frame's axes (for skipping faces turned away).
 */
const CH = new Float64Array(6);
const BD = new Float64Array(6);
const VC = new Float64Array(3);
const VB = new Float64Array(3);
let OX = 0;
let OY = 0;
let BX = 0;
let BY = 0;

function setCar(p: Pose): void {
  const { f, fh } = VIEW;
  const z = p.z;
  // d(screen)/d(world): across, in depth, up.
  const xa = f / z;
  const xz = (-f * p.a) / (z * z);
  const yz = -fh / (z * z);
  const yh = -f / z;
  const s = Math.sin(p.heading);
  const c = Math.cos(p.heading);
  const W = CAR_W;
  // Chassis: x → (c, -s, 0), l → (s, c, 0), h → (0, 0, 1).
  CH[0] = W * (xa * c - xz * s);
  CH[1] = W * (-yz * s);
  CH[2] = W * (xa * s + xz * c);
  CH[3] = W * (yz * c);
  CH[4] = 0;
  CH[5] = W * yh;
  // Body: pitched nose-up by `pitch` about its middle.
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  BD[0] = CH[0];
  BD[1] = CH[1];
  BD[2] = CH[2] * cp + CH[4] * sp;
  BD[3] = CH[3] * cp + CH[5] * sp;
  BD[4] = -CH[2] * sp + CH[4] * cp;
  BD[5] = -CH[3] * sp + CH[5] * cp;
  project(p.a, z, 0);
  OX = SX;
  OY = SY;
  BX = OX;
  BY = OY + W * yh * p.heave;
  // Looking from the camera (above the floor's middle, at depth 0) to the car.
  const camH = fh / f;
  const n = Math.hypot(p.a, z, camH);
  const va = p.a / n;
  const vz = z / n;
  const vh = -camH / n;
  VC[0] = va * c - vz * s;
  VC[1] = va * s + vz * c;
  VC[2] = vh;
  VB[0] = VC[0];
  VB[1] = VC[1] * cp + VC[2] * sp;
  VB[2] = -VC[1] * sp + VC[2] * cp;
}

/** Is a face with outward normal (x, l, h) turned toward us? */
function seen(v: Float64Array, x: number, l: number, h: number): boolean {
  return v[0]! * x + v[1]! * l + v[2]! * h < -0.03;
}

/** Screen point of a point on the car (car widths), through a map and its origin, into SX, SY. */
function at(m: Float64Array, ox: number, oy: number, x: number, l: number, h: number): void {
  SX = ox + m[0]! * x + m[2]! * l + m[4]! * h;
  SY = oy + m[1]! * x + m[3]! * l + m[5]! * h;
}

/**
 * Draw in a flat frame on the car: origin o, axes e1 and e2 (car widths). Returns one pixel in
 * the frame's units. Pair with ctx.restore().
 */
function frame(
  ctx: Ctx,
  m: Float64Array,
  ox: number,
  oy: number,
  o: readonly [number, number, number],
  e1: readonly [number, number, number],
  e2: readonly [number, number, number],
): number {
  const a = m[0]! * e1[0] + m[2]! * e1[1] + m[4]! * e1[2];
  const b = m[1]! * e1[0] + m[3]! * e1[1] + m[5]! * e1[2];
  const c = m[0]! * e2[0] + m[2]! * e2[1] + m[4]! * e2[2];
  const d = m[1]! * e2[0] + m[3]! * e2[1] + m[5]! * e2[2];
  at(m, ox, oy, o[0], o[1], o[2]);
  ctx.save();
  ctx.transform(a, b, c, d, SX, SY);
  // A pixel along the frame's longer axis: lines on a face seen nearly edge-on get thinner
  // across it, never longer along it.
  return 1 / Math.max(1e-3, Math.hypot(a, b), Math.hypot(c, d));
}

// ------------------------------------------------------------------ the model

/** Rear panel (the original rear art), as [x, y] in car widths (y up is negative). */
const PANEL: readonly (readonly [number, number])[] = [
  [-0.33, -0.08],
  [0.33, -0.08],
  [0.36, -0.15],
  [0.5, -0.17],
  [0.5, -0.33],
  [0.46, -0.385],
  [-0.46, -0.385],
  [-0.5, -0.33],
  [-0.5, -0.17],
  [-0.36, -0.15],
];
/** Rear and front glass: the cabin's end faces (x, y as on the rear panel), and the glass in them. */
const CABIN_END: readonly (readonly [number, number])[] = [
  [-0.38, -0.395],
  [0.38, -0.395],
  [0.27, -0.585],
  [0.24, -0.6],
  [-0.24, -0.6],
  [-0.27, -0.585],
];
const GLASS_END: readonly (readonly [number, number])[] = [
  [-0.31, -0.42],
  [0.31, -0.42],
  [0.225, -0.565],
  [-0.225, -0.565],
];

/** Body side profile, (l, h): a wedge, tail at l = -1, nose at +1; bottom at BODY_LOW. */
const BODY_LOW = 0.085;
const DECK_REAR = 0.385;
const DECK_FRONT = 0.4;
const HOOD_L = 0.4;
const NOSE_H = 0.22;
/** Wheels: centers along the car (±l), across (inner and outer face), radius; arch radius. */
const AXLE = 0.62;
const TYRE_IN = 0.345;
const TYRE_OUT = 0.475;
const TYRE_R = 0.16;
const ARCH_R = 0.185;
const ARCH_A = Math.atan2(TYRE_R - BODY_LOW, Math.sqrt(ARCH_R * ARCH_R - (TYRE_R - BODY_LOW) ** 2));
const ARCH_DX = Math.sqrt(ARCH_R * ARCH_R - (TYRE_R - BODY_LOW) ** 2);
/** Cabin: base (h, l from tail to front, half-width) and roof (h, l, half-width). */
const CAB_H0 = 0.395;
const CAB_L0 = -0.6;
const CAB_L1 = 0.3;
const CAB_X0 = 0.38;
const ROOF_H = 0.6;
const ROOF_L0 = -0.22;
const ROOF_L1 = 0.02;
const ROOF_X = 0.24;
/** Wing: span, plate (l from, to; h low, high), struts (x, l). */
const WING_X = 0.48;
const WING_L0 = -0.98;
const WING_L1 = -0.84;
const WING_H0 = 0.47;
const WING_H1 = 0.5;
const STRUT_X = 0.255;
const STRUT_L = -0.92;
/** Engine-deck louvres between the wing and the cabin (l). */
const LOUVRES = [-0.79, -0.72, -0.65] as const;

/** Hood and deck normals (l, h), unit length. */
const HOOD_N = (() => {
  const dl = 1 - HOOD_L;
  const dh = NOSE_H - DECK_FRONT;
  const n = Math.hypot(dl, dh);
  return [-dh / n, dl / n] as const;
})();
const DECK_N = (() => {
  const dl = HOOD_L + 1;
  const dh = DECK_FRONT - DECK_REAR;
  const n = Math.hypot(dl, dh);
  return [-dh / n, dl / n] as const;
})();
/** Cabin face normals: rear glass and windscreen (l, h), side glass (x, h). */
const REAR_GLASS_N = (() => {
  const dl = ROOF_L0 - CAB_L0;
  const dh = ROOF_H - CAB_H0;
  const n = Math.hypot(dl, dh);
  return [-dh / n, dl / n] as const;
})();
const SCREEN_N = (() => {
  const dl = ROOF_L1 - CAB_L1;
  const dh = ROOF_H - CAB_H0;
  const n = Math.hypot(dl, dh);
  return [dh / n, -dl / n] as const;
})();
const SIDE_GLASS_N = (() => {
  const dx = ROOF_X - CAB_X0;
  const dh = ROOF_H - CAB_H0;
  const n = Math.hypot(dx, dh);
  return [dh / n, -dx / n] as const;
})();

const CHROME = [
  [0, "#7f9cf0"],
  [0.34, "#e6e0ff"],
  [0.4, "#3a0f4c"],
  [0.72, "#a2348c"],
  [1, "#ff86b8"],
] as const;
/** The sides mirror the dark floor more than the sky: a dimmer chrome. */
const SIDE_CHROME = [
  [0, "#4e43a8"],
  [0.3, "#a596f0"],
  [0.38, "#260b3a"],
  [0.72, "#73215f"],
  [1, "#c64f88"],
] as const;
const CABIN_FILL = "#2a1d63";
const GLASS = "#120a2c";
const GLINT = alpha(CYAN, 0.6);
const WING = "#4a3d9c";
const LOUVRE = alpha(SHADOW, 0.85);
const TOP = mix(SHADOW_MID, VIOLET, 0.32);
const PLATE = "#1a0b2e";
const PLATE_RIM = alpha(CYAN, 0.7);
const TAIL = mix(RED, PINK, 0.25);
const BRAKE_GLOW = alpha(TAIL, 0.35);
const HEADLIGHT = mix(CYAN, "#ffffff", 0.45);
const SHADE = "rgba(0, 0, 0, 0.55)";
const TAIL_GLOW = alpha(TAIL, 0.2);
const HEAD_GLOW = alpha(CYAN, 0.12);
const EXHAUST = mix(SHADOW_MID, ORANGE, 0.35);
const FLAME = mix(ORANGE, PINK, 0.3);
const FLAME_CORE = mix(GOLD, "#ffffff", 0.4);
const TYRE = mix(SHADOW, VIOLET, 0.12);
const TYRE_RIM = alpha(VIOLET, 0.55);
const HUB = mix(SHADOW_MID, VIOLET, 0.45);
const SPOKE = alpha(CYAN, 0.75);
const STRIPE = alpha(CYAN, 0.85);
const SMOKE = [mix(VIOLET, "#ffffff", 0.6), mix(PINK, "#ffffff", 0.62), mix(CYAN, "#ffffff", 0.66)] as const;
const MARK = MAGENTA;
const MARK_GLOW = alpha(MAGENTA, 0.3);

/** Per context, built once: the chrome gradients (in the faces' own frames) and a soft unit
 *  puff per smoke tint (drawn scaled to each puff). */
const cache = {
  ctx: null as Ctx | null,
  chrome: null as CanvasGradient | null,
  side: null as CanvasGradient | null,
  puffs: [] as CanvasGradient[],
};

function build(ctx: Ctx): void {
  const chrome = ctx.createLinearGradient(0, -0.385, 0, -0.08);
  for (const [stop, c] of CHROME) chrome.addColorStop(stop, c);
  const side = ctx.createLinearGradient(0, -0.4, 0, -BODY_LOW);
  for (const [stop, c] of SIDE_CHROME) side.addColorStop(stop, c);
  cache.puffs = SMOKE.map((c) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, alpha(c, 1));
    g.addColorStop(0.45, alpha(c, 0.75));
    g.addColorStop(1, alpha(c, 0));
    return g;
  });
  cache.ctx = ctx;
  cache.chrome = chrome;
  cache.side = side;
}

function poly(ctx: Ctx, pts: readonly (readonly [number, number])[]): void {
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
}

/** A quad on the car through a map, as its own subpath. */
function quad(
  ctx: Ctx,
  m: Float64Array,
  ox: number,
  oy: number,
  q: readonly (readonly [number, number, number])[],
): void {
  for (let i = 0; i < q.length; i++) {
    const [x, l, h] = q[i]!;
    at(m, ox, oy, x, l, h);
    if (i === 0) ctx.moveTo(SX, SY);
    else ctx.lineTo(SX, SY);
  }
  ctx.closePath();
}

const DECK_Q = [
  [-0.5, -1, DECK_REAR],
  [0.5, -1, DECK_REAR],
  [0.5, HOOD_L, DECK_FRONT],
  [-0.5, HOOD_L, DECK_FRONT],
] as const;
const HOOD_Q = [
  [-0.5, HOOD_L, DECK_FRONT],
  [0.5, HOOD_L, DECK_FRONT],
  [0.5, 1, NOSE_H],
  [-0.5, 1, NOSE_H],
] as const;
const ROOF_Q = [
  [-ROOF_X, ROOF_L0, ROOF_H],
  [ROOF_X, ROOF_L0, ROOF_H],
  [ROOF_X, ROOF_L1, ROOF_H],
  [-ROOF_X, ROOF_L1, ROOF_H],
] as const;
/** Side glass (right; x is mirrored for the left), and the glass inset in it. */
const SIDE_Q = [
  [CAB_X0, CAB_L0, CAB_H0],
  [CAB_X0, CAB_L1, CAB_H0],
  [ROOF_X, ROOF_L1, ROOF_H],
  [ROOF_X, ROOF_L0, ROOF_H],
] as const;
const SIDE_GLASS_Q = SIDE_Q.map(([x, l, h]) => {
  // 18% of the way toward the face's middle.
  const mx = (CAB_X0 + ROOF_X) / 2;
  const ml = (CAB_L0 + CAB_L1 + ROOF_L0 + ROOF_L1) / 4;
  const mh = (CAB_H0 + ROOF_H) / 2;
  return [x + (mx - x) * 0.18, l + (ml - l) * 0.18, h + (mh - h) * 0.18] as const;
});
const LEFT = SIDE_Q.map(([x, l, h]) => [-x, l, h] as const);
const LEFT_GLASS = SIDE_GLASS_Q.map(([x, l, h]) => [-x, l, h] as const);
const WING_TOP = [
  [-WING_X, WING_L0, WING_H1],
  [WING_X, WING_L0, WING_H1],
  [WING_X, WING_L1, WING_H1],
  [-WING_X, WING_L1, WING_H1],
] as const;
const WING_BACK = [
  [-WING_X, WING_L0, WING_H0],
  [WING_X, WING_L0, WING_H0],
  [WING_X, WING_L0, WING_H1],
  [-WING_X, WING_L0, WING_H1],
] as const;
const WING_FRONT = WING_BACK.map(([x, , h]) => [x, WING_L1, h] as const);

/** Body side (l, y = -h): the wedge profile with the two wheel arches cut out of its foot. */
function sidePath(ctx: Ctx): void {
  ctx.moveTo(-1, -BODY_LOW);
  ctx.lineTo(-1, -DECK_REAR);
  ctx.lineTo(HOOD_L, -DECK_FRONT);
  ctx.lineTo(1, -NOSE_H);
  ctx.lineTo(1, -BODY_LOW);
  ctx.lineTo(AXLE + ARCH_DX, -BODY_LOW);
  ctx.arc(AXLE, -TYRE_R, ARCH_R, ARCH_A, Math.PI - ARCH_A, true);
  ctx.lineTo(-AXLE + ARCH_DX, -BODY_LOW);
  ctx.arc(-AXLE, -TYRE_R, ARCH_R, ARCH_A, Math.PI - ARCH_A, true);
  ctx.closePath();
}

const O_REAR = [0, -1, 0] as const;
const O_NOSE = [0, 1, 0] as const;
const O_LEFT = [-0.5, 0, 0] as const;
const O_RIGHT = [0.5, 0, 0] as const;
const O_FLOOR = [0, 0, 0] as const;
const E_X = [1, 0, 0] as const;
const E_L = [0, 1, 0] as const;
const E_DOWN = [0, 0, -1] as const;
/** The cabin's end faces: x across, and per unit of y (= -h) along the sloping glass. */
const REAR_GLASS_E2 = [0, -(ROOF_L0 - CAB_L0) / (ROOF_H - CAB_H0), -1] as const;
const REAR_GLASS_O = [0, CAB_L0 - (CAB_H0 * (ROOF_L0 - CAB_L0)) / (ROOF_H - CAB_H0), 0] as const;
const SCREEN_E2 = [0, -(ROOF_L1 - CAB_L1) / (ROOF_H - CAB_H0), -1] as const;
const SCREEN_O = [0, CAB_L1 - (CAB_H0 * (ROOF_L1 - CAB_L1)) / (ROOF_H - CAB_H0), 0] as const;

/** Points on half a rim (a tyre's outline) or a whole hub. */
const RIM_STEPS = 10;
/** Wheel drawing order along the car: the far end first. */
const FRONT_FIRST = [1, -1] as const;
const REAR_FIRST = [-1, 1] as const;

/** One wheel (side -1 left, +1 right; end -1 rear, +1 front): tyre, hub and spokes, tread. */
function drawWheel(ctx: Ctx, side: number, end: number, angle: number): void {
  const m = CH;
  const l = end * AXLE;
  // The disc's axes on screen (tyre radius) and the tyre's width (inner → outer face).
  const Lx = m[2]! * TYRE_R;
  const Ly = m[3]! * TYRE_R;
  const Hx = m[4]! * TYRE_R;
  const Hy = m[5]! * TYRE_R;
  const Dx = m[0]! * side * (TYRE_OUT - TYRE_IN);
  const Dy = m[1]! * side * (TYRE_OUT - TYRE_IN);
  at(m, OX, OY, side * TYRE_IN, l, TYRE_R);
  const ix = SX;
  const iy = SY;
  // Outline: the half of the inner rim away from the outer face, the half of the outer rim
  // beyond it, joined where the rims' tangents run along the width.
  const phi = Math.atan2(Hx * Dy - Hy * Dx, Lx * Dy - Ly * Dx);
  const tx = Math.cos(phi) * Lx + Math.sin(phi) * Hx;
  const ty = Math.cos(phi) * Ly + Math.sin(phi) * Hy;
  const mid = phi + Math.PI / 2;
  const mx = Math.cos(mid) * Lx + Math.sin(mid) * Hx;
  const my = Math.cos(mid) * Ly + Math.sin(mid) * Hy;
  const firstOut = Math.sign(tx * my - ty * mx) === Math.sign(tx * Dy - ty * Dx);
  ctx.beginPath();
  for (let half = 0; half < 2; half++) {
    const out = (half === 0) === firstOut;
    for (let k = 0; k <= RIM_STEPS; k++) {
      const q = phi + Math.PI * (half + k / RIM_STEPS);
      const px = ix + Math.cos(q) * Lx + Math.sin(q) * Hx + (out ? Dx : 0);
      const py = iy + Math.cos(q) * Ly + Math.sin(q) * Hy + (out ? Dy : 0);
      if (half === 0 && k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = TYRE;
  ctx.fill();
  // Tread grooves on the part of the tyre facing us: they run round as the wheel turns.
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const q = angle + (k * Math.PI) / 3;
    const cl = Math.cos(q);
    const ch = Math.sin(q);
    if (!seen(VC, 0, cl, ch)) continue;
    const gx = ix + cl * Lx + ch * Hx;
    const gy = iy + cl * Ly + ch * Hy;
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Dx, gy + Dy);
  }
  ctx.strokeStyle = TYRE_RIM;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Hub, when its face is toward us.
  if (seen(VC, side, 0, 0)) {
    const hx = ix + Dx;
    const hy = iy + Dy;
    ctx.beginPath();
    for (let k = 0; k < RIM_STEPS; k++) {
      const q = (k / RIM_STEPS) * TAU;
      const x = hx + 0.62 * (Math.cos(q) * Lx + Math.sin(q) * Hx);
      const y = hy + 0.62 * (Math.cos(q) * Ly + Math.sin(q) * Hy);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = HUB;
    ctx.fill();
    ctx.strokeStyle = TYRE_RIM;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const q = angle + (k * TAU) / 3;
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + 0.55 * (Math.cos(q) * Lx + Math.sin(q) * Hx), hy + 0.55 * (Math.cos(q) * Ly + Math.sin(q) * Hy));
    }
    ctx.strokeStyle = SPOKE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Shadow on the grid and the lights' glow spilling onto it, in the floor's frame. */
function drawFloorLight(ctx: Ctx): void {
  frame(ctx, CH, OX, OY, O_FLOOR, E_X, E_L);
  ctx.beginPath();
  oval(ctx, 0, 0, 0.6, 1.1);
  ctx.fillStyle = SHADE;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0, -1.25, 0.5, 0.26);
  ctx.fillStyle = TAIL_GLOW;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0, 1.35, 0.42, 0.3);
  ctx.fillStyle = HEAD_GLOW;
  ctx.fill();
  ctx.restore();
}

/** The tail: the original chrome rear panel, plate, exhausts (flaring), taillights. */
function drawRear(ctx: Ctx, p: Pose, t: number): void {
  const px = frame(ctx, BD, BX, BY, O_REAR, E_X, E_DOWN);
  ctx.beginPath();
  poly(ctx, PANEL);
  ctx.fillStyle = cache.chrome!;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.8 * px, 0.008));

  ctx.beginPath();
  ctx.rect(-0.1, -0.21, 0.2, 0.075);
  ctx.fillStyle = PLATE;
  ctx.fill();
  ctx.strokeStyle = PLATE_RIM;
  ctx.lineWidth = Math.max(0.8 * px, 0.008);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, -0.3, -0.115, 0.024);
  circle(ctx, 0.3, -0.115, 0.024);
  ctx.fillStyle = EXHAUST;
  ctx.fill();
  if (p.flare > 0.02) {
    // On the revs: the exhausts flare, flickering.
    const f = p.flare * (0.8 + 0.2 * Math.sin(t * 47));
    ctx.beginPath();
    oval(ctx, -0.3, -0.105, 0.095 * f, 0.065 * f);
    oval(ctx, 0.3, -0.105, 0.095 * f, 0.065 * f);
    ctx.fillStyle = FLAME;
    ctx.fill();
    ctx.beginPath();
    oval(ctx, -0.3, -0.11, 0.045 * f, 0.032 * f);
    oval(ctx, 0.3, -0.11, 0.045 * f, 0.032 * f);
    ctx.fillStyle = FLAME_CORE;
    ctx.fill();
  }

  // The taillight bar, split by a small chrome chevron; brighter with the brakes on.
  ctx.beginPath();
  ctx.moveTo(-0.43, -0.29);
  ctx.lineTo(-0.07, -0.29);
  ctx.moveTo(0.07, -0.29);
  ctx.lineTo(0.43, -0.29);
  if (p.brake > 0.02) {
    ctx.strokeStyle = BRAKE_GLOW;
    ctx.lineWidth = 0.07 * p.brake;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  hotTube(ctx, TAIL, Math.max(1.2 * px, 0.032), 2.6, 0.6 * px);
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.31);
  ctx.lineTo(0, -0.27);
  ctx.lineTo(0.04, -0.31);
  ctx.strokeStyle = "#e6e0ff";
  ctx.lineWidth = Math.max(px, 0.014);
  ctx.stroke();
  ctx.restore();
}

/** The nose: a dark bumper with a neon edge and a headlight bar each side. */
function drawNose(ctx: Ctx): void {
  const px = frame(ctx, BD, BX, BY, O_NOSE, E_X, E_DOWN);
  ctx.beginPath();
  ctx.rect(-0.5, -NOSE_H, 1, NOSE_H - BODY_LOW);
  ctx.fillStyle = PLATE;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.8 * px, 0.008));
  ctx.beginPath();
  ctx.moveTo(-0.42, -0.155);
  ctx.lineTo(-0.16, -0.155);
  ctx.moveTo(0.16, -0.155);
  ctx.lineTo(0.42, -0.155);
  hotTube(ctx, HEADLIGHT, Math.max(1.1 * px, 0.03), 2.4, 0.6 * px);
  ctx.restore();
}

/** A body side: chrome, the arches, a cyan stripe at the waist. */
function drawSide(ctx: Ctx, side: number, facing: number): void {
  const px = frame(ctx, BD, BX, BY, side < 0 ? O_LEFT : O_RIGHT, E_L, E_DOWN);
  // Seen nearly edge-on it is a sliver: let it fade in rather than flash.
  ctx.globalAlpha *= Math.min(1, facing / 0.25);
  ctx.beginPath();
  sidePath(ctx);
  ctx.fillStyle = cache.side!;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.8 * px, 0.008));
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.3);
  ctx.lineTo(0.62, -0.322);
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = Math.max(px, 0.014);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/** A cabin end (rear glass or windscreen): its frame, the dark cabin, the glass and a glint. */
function drawCabinEnd(ctx: Ctx, o: readonly [number, number, number], e2: readonly [number, number, number]): void {
  const px = frame(ctx, BD, BX, BY, o, E_X, e2);
  ctx.beginPath();
  poly(ctx, CABIN_END);
  ctx.fillStyle = CABIN_FILL;
  ctx.fill();
  ctx.beginPath();
  poly(ctx, GLASS_END);
  ctx.fillStyle = GLASS;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.548);
  ctx.lineTo(0.02, -0.548);
  ctx.strokeStyle = GLINT;
  ctx.lineWidth = Math.max(px, 0.012);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawCabin(ctx: Ctx): void {
  const v = VB;
  if (seen(v, 0, REAR_GLASS_N[0], REAR_GLASS_N[1])) drawCabinEnd(ctx, REAR_GLASS_O, REAR_GLASS_E2);
  if (seen(v, 0, SCREEN_N[0], SCREEN_N[1])) drawCabinEnd(ctx, SCREEN_O, SCREEN_E2);
  for (const side of [-1, 1]) {
    if (!seen(v, side * SIDE_GLASS_N[0], 0, SIDE_GLASS_N[1])) continue;
    ctx.beginPath();
    quad(ctx, BD, BX, BY, side < 0 ? LEFT : SIDE_Q);
    ctx.fillStyle = CABIN_FILL;
    ctx.fill();
    ctx.beginPath();
    quad(ctx, BD, BX, BY, side < 0 ? LEFT_GLASS : SIDE_GLASS_Q);
    ctx.fillStyle = GLASS;
    ctx.fill();
  }
  if (seen(v, 0, 0, 1)) {
    ctx.beginPath();
    quad(ctx, BD, BX, BY, ROOF_Q);
    ctx.fillStyle = CABIN_FILL;
    ctx.fill();
  }
}

function drawWing(ctx: Ctx, w: number): void {
  // Struts, then the plate: its top and whichever edge faces us, with a neon trailing edge.
  ctx.beginPath();
  for (const x of [-STRUT_X, STRUT_X]) {
    at(BD, BX, BY, x, STRUT_L, DECK_REAR);
    ctx.moveTo(SX, SY);
    at(BD, BX, BY, x, STRUT_L, WING_H0);
    ctx.lineTo(SX, SY);
  }
  ctx.strokeStyle = WING;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.beginPath();
  quad(ctx, BD, BX, BY, WING_TOP);
  quad(ctx, BD, BX, BY, seen(VB, 0, -1, 0) ? WING_BACK : WING_FRONT);
  ctx.fillStyle = WING;
  ctx.fill();
  ctx.beginPath();
  at(BD, BX, BY, -WING_X, WING_L0, WING_H1);
  ctx.moveTo(SX, SY);
  at(BD, BX, BY, WING_X, WING_L0, WING_H1);
  ctx.lineTo(SX, SY);
  rimTube(ctx, PINK, Math.max(0.6, w * 0.006));
}

function drawBody(ctx: Ctx, p: Pose, t: number, w: number): void {
  const v = VB;
  if (seen(v, -1, 0, 0)) drawSide(ctx, -1, v[0]!);
  if (seen(v, 1, 0, 0)) drawSide(ctx, 1, -v[0]!);
  if (seen(v, 0, DECK_N[0], DECK_N[1])) {
    ctx.beginPath();
    quad(ctx, BD, BX, BY, DECK_Q);
    ctx.fillStyle = TOP;
    ctx.fill();
    ctx.beginPath();
    for (const l of LOUVRES) {
      at(BD, BX, BY, -0.3, l, DECK_REAR);
      ctx.moveTo(SX, SY);
      at(BD, BX, BY, 0.3, l, DECK_REAR);
      ctx.lineTo(SX, SY);
    }
    ctx.strokeStyle = LOUVRE;
    ctx.lineWidth = Math.max(0.8, w * 0.014);
    ctx.lineCap = "butt";
    ctx.stroke();
  }
  if (seen(v, 0, HOOD_N[0], HOOD_N[1])) {
    ctx.beginPath();
    quad(ctx, BD, BX, BY, HOOD_Q);
    ctx.fillStyle = TOP;
    ctx.fill();
    rimTube(ctx, PINK, Math.max(0.5, w * 0.005));
  }
  if (seen(v, 0, 1, 0)) drawNose(ctx);
  if (seen(v, 0, -1, 0)) drawRear(ctx, p, t);
  // Seen from behind the wing stands in front of the cabin; from ahead, the cabin hides it.
  if (v[1]! > 0) {
    drawCabin(ctx);
    drawWing(ctx, w);
  } else {
    drawWing(ctx, w);
    drawCabin(ctx);
  }
}

// ------------------------------------------------------------------ public

/** Scratch result of `carAt`. */
const CAR = { x: 0, y: 0, w: 0, z: CAR_Z, heading: HOME_HEADING, fade: 1, phase: "ready" as CarPhase };

/** Where the car is now: its middle on the floor (x, y), its width (px), depth, heading, how much
 *  of it shows (it fades into the haze at the city), phase. */
export function carAt(s: Scene): typeof CAR {
  const p = poseAt(s.t);
  setView(s);
  project(p.a, p.z, 0);
  CAR.x = SX;
  CAR.y = SY;
  CAR.w = (VIEW.f * CAR_W) / p.z;
  CAR.z = p.z;
  CAR.heading = p.heading;
  CAR.fade = p.phase === "gone" ? 0 : p.fade;
  CAR.phase = p.phase;
  return CAR;
}

/** The glowing tyre marks laid so far, each stretch fading on its own. */
function drawMarks(ctx: Ctx, t: number): void {
  const last = Math.min(MARK_COUNT - 1, Math.floor((t - MARK_FROM) / MARK_DT));
  if (last < 1) return;
  // Its own line style: the car's outlines are drawn after it, and must look as they do idling.
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let c0 = 0; c0 < last; c0 += MARK_CHUNK) {
    const c1 = Math.min(last, c0 + MARK_CHUNK);
    const age = t - (MARK_FROM + ((c0 + c1) / 2) * MARK_DT);
    const k = 1 - age / MARK_LIFE;
    if (k <= 0) continue;
    ctx.beginPath();
    for (let w = 0; w < 2; w++) {
      for (let i = c0; i <= c1; i++) {
        project(MARKS[i * 4 + w * 2]!, MARKS[i * 4 + w * 2 + 1]!, 0);
        if (i === c0) ctx.moveTo(SX, SY);
        else ctx.lineTo(SX, SY);
      }
    }
    ctx.globalAlpha = MARK_ALPHA * k;
    ctx.strokeStyle = MARK_GLOW;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = MARK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Smoke puffs alive now: those further away than `split` (depth) or nearer. */
function drawSmoke(ctx: Ctx, t: number, split: number, far: boolean): void {
  const f = VIEW.f;
  for (let i = 0; i < PUFFS.length; i += PUFF_FIELDS) {
    const t0 = PUFFS[i + PUFF.t0]!;
    if (t0 > t) break;
    const age = t - t0;
    const life = PUFFS[i + PUFF.life]!;
    if (age >= life) continue;
    const drift = SMOKE_DRAG * (1 - Math.exp(-age / SMOKE_DRAG));
    const z = PUFFS[i + PUFF.z]! + PUFFS[i + PUFF.vz]! * drift;
    if (z > split !== far) continue;
    const a = PUFFS[i + PUFF.a]! + PUFFS[i + PUFF.va]! * drift;
    const r = 0.008 + (PUFFS[i + PUFF.r]! - 0.008) * (1 - Math.exp(-age / SMOKE_GROW));
    const h = 0.006 + PUFFS[i + PUFF.rise]! * age + r * 0.6;
    const k = 1 - age / life;
    project(a, z, h);
    const R = (f * r) / z;
    ctx.globalAlpha = SMOKE_ALPHA * Math.min(1, age / 0.12) * k * k;
    ctx.translate(SX, SY);
    ctx.scale(R, R);
    ctx.beginPath();
    circle(ctx, 0, 0, 1);
    ctx.fillStyle = cache.puffs[PUFFS[i + PUFF.tint]!]!;
    ctx.fill();
    ctx.scale(1 / R, 1 / R);
    ctx.translate(-SX, -SY);
  }
  ctx.globalAlpha = 1;
}

/** The deepest any smoke drifts (depth): all that is left to draw once the car is gone. */
const FAR_SMOKE_Z = (() => {
  let far = SPOT_Z;
  for (let i = 0; i < PUFFS.length; i += PUFF_FIELDS) far = Math.max(far, PUFFS[i + PUFF.z]! + Math.max(0, PUFFS[i + PUFF.vz]!) * SMOKE_DRAG);
  return far;
})();

export function drawCar(ctx: Ctx, s: Scene): void {
  const t = s.t;
  if (t >= SHOW_END) return;
  const p = poseAt(t);
  const gone = p.phase === "gone";
  setView(s);
  // All of the show lies at or nearer than the car (or, once it is gone, its last smoke): when
  // that is below the screen, so is everything else.
  const zFar = gone ? FAR_SMOKE_Z : p.z;
  project(0, zFar, 0);
  if (SY - (VIEW.f * CAR_W * 2) / zFar > s.cssH) return;
  if (cache.ctx !== ctx) build(ctx);
  ctx.save();
  drawMarks(ctx, t);
  if (gone) {
    drawSmoke(ctx, t, Infinity, false);
    ctx.restore();
    return;
  }
  setCar(p);
  ctx.globalAlpha = p.fade;
  drawFloorLight(ctx);
  drawSmoke(ctx, t, p.z, true);
  // Wheels first (the body hides all but their feet and what shows in the arches), far side first.
  // Looking along +x we see the left side (the near one); looking along +l, the rear wheels are nearer.
  ctx.globalAlpha = p.fade;
  const w = (VIEW.f * CAR_W) / p.z;
  const near = VC[0]! < 0 ? 1 : -1;
  const ends = VC[1]! > 0 ? FRONT_FIRST : REAR_FIRST;
  for (const side of [-near, near]) {
    for (const end of ends) drawWheel(ctx, side, end, end < 0 ? p.rear : p.front);
  }
  drawBody(ctx, p, t, w);
  ctx.globalAlpha = 1;
  drawSmoke(ctx, t, p.z, false);
  ctx.restore();
}

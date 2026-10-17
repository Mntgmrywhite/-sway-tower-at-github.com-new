import { alpha, circle, mix, oval, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { ARCADE } from "./arcade";
import { besideCar } from "./car";
import { CYAN, GOLD, MAGENTA, PINK, SHADOW, SHADOW_MID, VIOLET } from "./colors";
import { ALIGHT, AT_CAR, BOARD, HOME, OPEN_CAR, OUT, SEATED, SHOW_LEN, showTime, smooth, STEP_OUT, STOOD } from "./show";

// The car's driver, our own 80s character: a big-shouldered jacket with a popped collar over a
// pink tee, a quiff with a mullet, mirrored shades that catch the sunset, jeans and white
// sneakers. Drawn like the rest of the skin's props, as a dark silhouette in neon line art: each
// part outlined in a thin glowing tube (cyan jacket, violet jeans, pink hair), so it reads at a
// few dozen pixels tall.
//
// In the show (show.ts) they step out of the arcade's open door toward us, walk across the
// floor in front of the tower (below its floor line, well above "tap to drop") to the car's
// driver's door, wait for it to swing open, and get in; later, with the car parked again, they
// get out, walk back and go in through the arcade's door. Inside the doorway they are clipped
// to it (they come out of the light and go back into it). Pure in Scene.t.

/** Height (u at the tower's depth, like everything on the floor): a little under the arcade's
 *  door, taller than the car's roof. */
export const PERSON_H = 0.06;

/** Where they walk (floor a, z): just inside the arcade's door, just out in front of it, beside
 *  the car's driver's door (clear of its swing), in the driver's seat, and on inside the arcade
 *  as its door shuts. (Deeper in, the wall over the door hides their head: they only get past
 *  DOOR_IN_Z once the door has started to slide shut over them, and not much further.) */
const DOOR_IN_Z = ARCADE.z + 0.05;
const DOOR_OUT_Z = ARCADE.z - 0.09;
const DEEP_Z = ARCADE.z + 0.1;
const DOOR_A = (z: number) => (ARCADE.x * z) / TOWER_DEPTH;
const BY_CAR = { a: 0, z: 0 };
besideCar(-0.9, -0.4, BY_CAR);
const SEAT = { a: 0, z: 0 };
besideCar(-0.2, -0.05, SEAT);

/** Walking: a step is this long (heights), the legs and arms swing this far (radians). */
const STEP = 0.55;
const LEG_SWING = 0.42;
const KNEE_BEND = 0.9;
const ARM_SWING = 0.32;
/** The figure's proportions (heights): thigh and shin, hip height standing. */
const THIGH = 0.25;
const SHIN = 0.24;
const LEG = THIGH + SHIN;

/** Inside the arcade (door shut), in its doorway as the door opens, stepping out, walking over,
 *  waiting for the car door, getting in, driving (in the car), getting out, walking back, and
 *  going in (on inside as the door shuts). */
export type DriverPhase = "inside" | "door" | "out" | "walk" | "wait" | "board" | "driving" | "alight" | "back" | "in";
type View = "front" | "side" | "back";

/** Scratch: where the driver is (floor a, z), how they look, and what they are doing. */
const DRIVER = {
  a: 0,
  z: DOOR_IN_Z,
  view: "front" as View,
  /** +1 facing right, -1 left (side view). */
  facing: 1,
  /** Gait phase (radians) and how much they are striding (0..1). */
  gait: 0,
  stride: 0,
  /** Sitting down into the car (0 standing .. 1 seated), and an arm out to the door (0..1). */
  sit: 0,
  reach: 0,
  /** Seen at all (not shut in the arcade or sitting in the car). */
  shows: false,
  /** In the arcade's doorway or beyond: the arcade draws them, under its sliding door. */
  inDoor: false,
  phase: "inside" as DriverPhase,
};
export type Driver = typeof DRIVER;

/** A walk from (a0, z0) to (a1, z1) over [t0, t1], easing in and out, striding as it goes. */
function walk(d: Driver, t: number, t0: number, t1: number, a0: number, z0: number, a1: number, z1: number): void {
  const k = (t - t0) / (t1 - t0);
  const e = smooth(k);
  d.a = a0 + (a1 - a0) * e;
  d.z = z0 + (z1 - z0) * e;
  const dist = Math.hypot(a1 - a0, z1 - z0) * e;
  d.gait = (dist / (STEP * PERSON_H)) * Math.PI;
  d.stride = Math.min(1, k / 0.15, (1 - k) / 0.15);
}

/** The driver at show time t (seconds into the current show). Pure in t. */
export function driverIn(t: number): Driver {
  const d = DRIVER;
  d.gait = 0;
  d.stride = 0;
  d.sit = 0;
  d.reach = 0;
  d.shows = true;
  d.view = "side";
  d.facing = 1;
  if (t < 0 || t >= SHOW_LEN) {
    d.phase = "inside";
    d.view = "front";
    d.a = DOOR_A(DOOR_IN_Z);
    d.z = DOOR_IN_Z;
    d.shows = false;
  } else if (t < STEP_OUT) {
    // Standing just inside as the door slides open on them.
    d.phase = "door";
    d.view = "front";
    d.a = DOOR_A(DOOR_IN_Z);
    d.z = DOOR_IN_Z;
  } else if (t < OUT) {
    // Out of the light, toward us.
    d.phase = "out";
    d.view = "front";
    walk(d, t, STEP_OUT, OUT, DOOR_A(DOOR_IN_Z), DOOR_IN_Z, DOOR_A(DOOR_OUT_Z), DOOR_OUT_Z);
  } else if (t < AT_CAR) {
    d.phase = "walk";
    walk(d, t, OUT, AT_CAR, DOOR_A(DOOR_OUT_Z), DOOR_OUT_Z, BY_CAR.a, BY_CAR.z);
  } else if (t < BOARD) {
    // At the car: a hand out to the door as it swings open.
    d.phase = "wait";
    d.a = BY_CAR.a;
    d.z = BY_CAR.z;
    d.reach = Math.min(smooth((t - OPEN_CAR) / 0.2), 1 - smooth((t - BOARD + 0.12) / 0.12));
  } else if (t < SEATED) {
    // In: a step across into the car, ducking and sitting down behind its body.
    d.phase = "board";
    const k = (t - BOARD) / (SEATED - BOARD);
    const e = smooth(k);
    d.a = BY_CAR.a + (SEAT.a - BY_CAR.a) * e;
    d.z = BY_CAR.z + (SEAT.z - BY_CAR.z) * e;
    d.sit = smooth((k - 0.15) / 0.75);
    d.gait = e * Math.PI;
    d.stride = Math.min(1, k / 0.2, (1 - k) / 0.2) * 0.7;
  } else if (t < ALIGHT) {
    d.phase = "driving";
    d.a = SEAT.a;
    d.z = SEAT.z;
    d.sit = 1;
    d.shows = false;
  } else if (t < STOOD) {
    // Out: up out of the seat and a step back out beside the car.
    d.phase = "alight";
    d.facing = -1;
    const k = (t - ALIGHT) / (STOOD - ALIGHT);
    const e = smooth(k);
    d.a = SEAT.a + (BY_CAR.a - SEAT.a) * e;
    d.z = SEAT.z + (BY_CAR.z - SEAT.z) * e;
    d.sit = 1 - smooth(k / 0.75);
    d.gait = e * Math.PI;
    d.stride = Math.min(1, k / 0.2, (1 - k) / 0.2) * 0.7;
  } else if (t < HOME) {
    d.phase = "back";
    d.facing = -1;
    walk(d, t, STOOD, HOME, BY_CAR.a, BY_CAR.z, DOOR_A(DOOR_OUT_Z), DOOR_OUT_Z);
  } else {
    // Back into the light, away from us, through the doorway without a pause and on inside as the
    // door slides shut behind them (one walk: they are past the threshold by INSIDE).
    d.phase = "in";
    d.view = "back";
    walk(d, t, HOME, SHOW_LEN, DOOR_A(DOOR_OUT_Z), DOOR_OUT_Z, DOOR_A(DEEP_Z), DEEP_Z);
  }
  d.inDoor = d.z > ARCADE.z;
  return d;
}

/** The driver at scene time t. */
export function driverAt(t: number): Driver {
  return driverIn(showTime(t));
}

// ------------------------------------------------------------------ drawing

const JACKET = mix(SHADOW, VIOLET, 0.3);
const JEANS = mix(SHADOW, SHADOW_MID, 0.5);
const SKIN = mix(SHADOW_MID, PINK, 0.18);
const HAIR = SHADOW;
const TEE = mix(PINK, "#ffffff", 0.55);
const SHADES = mix(GOLD, "#ffffff", 0.35);
const SNEAKER = mix(CYAN, "#ffffff", 0.72);
const JACKET_RIM = CYAN;
const JEANS_RIM = VIOLET;
const HAIR_RIM = mix(MAGENTA, PINK, 0.5);
const FOOT_SHADOW = "rgba(0, 0, 0, 0.5)";
/** Outline passes: a soft glow, then the tube, then the part's own fill on top (so a group's
 *  parts merge into one outlined silhouette). Extra widths in pixels. */
const GLOW_PX = 2;
const RIM_PX = 0.85;
const GLOWS = new Map<string, string>();
function glowOf(c: string): string {
  let g = GLOWS.get(c);
  if (!g) {
    g = alpha(c, 0.28);
    GLOWS.set(c, g);
  }
  return g;
}

/** This frame's pose, in heights from the feet (y up is negative), facing +x. */
const P = {
  px: 1,
  hipY: -LEG,
  /** Feet and knees, near leg (0) and far leg (1). */
  knee: [0, 0, 0, 0],
  foot: [0, 0, 0, 0],
  /** Shin angles (radians from straight down, forward +). */
  shin: [0, 0],
  /** Elbows and hands, near arm (0) and far arm (1). */
  elbow: [0, 0, 0, 0],
  hand: [0, 0, 0, 0],
  lean: 0,
};

/** A part of a silhouette: a closed shape to fill (width 0) or a line of some width. */
type Part = (ctx: Ctx) => number;

/** Draw parts as one neon-outlined silhouette: glow, tube, then the fill over it. */
function sticker(ctx: Ctx, parts: readonly Part[], fill: string, rim: string): void {
  const px = P.px;
  for (let pass = 0; pass < 3; pass++) {
    const extra = pass === 0 ? GLOW_PX : pass === 1 ? RIM_PX : 0;
    const color = pass === 0 ? glowOf(rim) : pass === 1 ? rim : fill;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    for (const part of parts) {
      ctx.beginPath();
      const w = part(ctx);
      if (w === 0) {
        if (extra > 0) {
          ctx.lineWidth = 2 * extra * px;
          ctx.stroke();
        }
        ctx.fill();
      } else {
        ctx.lineWidth = w + 2 * extra * px;
        ctx.stroke();
      }
    }
  }
}

// Parts, reading the pose in P.

const legPart = (i: number): Part => (ctx) => {
  ctx.moveTo(0, P.hipY);
  ctx.lineTo(P.knee[i * 2]!, P.knee[i * 2 + 1]!);
  ctx.lineTo(P.foot[i * 2]!, P.foot[i * 2 + 1]!);
  return 0.075;
};
const sidePartsLeg = [[legPart(1)], [legPart(0)]] as const;

const armPart = (i: number): Part => (ctx) => {
  const y = P.hipY - 0.31;
  ctx.moveTo(0, y);
  ctx.lineTo(P.elbow[i * 2]!, P.elbow[i * 2 + 1]!);
  ctx.lineTo(P.hand[i * 2]!, P.hand[i * 2 + 1]!);
  return 0.062;
};

const sideTorso: Part = (ctx) => {
  const y = P.hipY;
  // Boxy, with a padded shoulder and the collar turned up at the back.
  ctx.moveTo(-0.082, y + 0.02);
  ctx.lineTo(-0.098, y - 0.18);
  ctx.lineTo(-0.088, y - 0.33);
  ctx.lineTo(-0.065, y - 0.39);
  ctx.lineTo(-0.025, y - 0.35);
  ctx.lineTo(0.06, y - 0.348);
  ctx.lineTo(0.09, y - 0.3);
  ctx.lineTo(0.088, y - 0.22);
  ctx.lineTo(0.075, y + 0.02);
  ctx.closePath();
  return 0;
};
const sideHead: Part = (ctx) => {
  const y = P.hipY;
  circle(ctx, 0.018, y - 0.415, 0.068);
  ctx.moveTo(0.0, y - 0.33);
  ctx.lineTo(0.012, y - 0.37);
  ctx.lineTo(0.03, y - 0.37);
  ctx.closePath();
  return 0;
};
const sideHair: Part = (ctx) => {
  const y = P.hipY;
  // A quiff swept up at the front, a mullet down the back of the neck.
  ctx.moveTo(-0.045, y - 0.345);
  ctx.quadraticCurveTo(-0.085, y - 0.4, -0.06, y - 0.465);
  ctx.quadraticCurveTo(-0.02, y - 0.515, 0.04, y - 0.515);
  ctx.quadraticCurveTo(0.085, y - 0.512, 0.098, y - 0.485);
  ctx.lineTo(0.07, y - 0.468);
  ctx.quadraticCurveTo(0.02, y - 0.465, -0.012, y - 0.43);
  ctx.quadraticCurveTo(-0.02, y - 0.38, -0.01, y - 0.352);
  ctx.closePath();
  return 0;
};

const frontTorso: Part = (ctx) => {
  const y = P.hipY;
  ctx.moveTo(-0.125, y + 0.02);
  ctx.lineTo(-0.12, y - 0.12);
  ctx.lineTo(-0.15, y - 0.26);
  ctx.lineTo(-0.19, y - 0.3);
  ctx.lineTo(-0.168, y - 0.342);
  ctx.lineTo(-0.065, y - 0.35);
  ctx.lineTo(-0.06, y - 0.39);
  ctx.lineTo(-0.025, y - 0.35);
  ctx.lineTo(0.025, y - 0.35);
  ctx.lineTo(0.06, y - 0.39);
  ctx.lineTo(0.065, y - 0.35);
  ctx.lineTo(0.168, y - 0.342);
  ctx.lineTo(0.19, y - 0.3);
  ctx.lineTo(0.15, y - 0.26);
  ctx.lineTo(0.12, y - 0.12);
  ctx.lineTo(0.125, y + 0.02);
  ctx.closePath();
  return 0;
};
const frontHead: Part = (ctx) => {
  circle(ctx, 0, P.hipY - 0.415, 0.07);
  return 0;
};
const frontHair: Part = (ctx) => {
  const y = P.hipY;
  ctx.moveTo(-0.074, y - 0.39);
  ctx.quadraticCurveTo(-0.098, y - 0.47, -0.05, y - 0.51);
  ctx.quadraticCurveTo(0, y - 0.535, 0.05, y - 0.51);
  ctx.quadraticCurveTo(0.098, y - 0.47, 0.074, y - 0.39);
  ctx.quadraticCurveTo(0.068, y - 0.45, 0.04, y - 0.462);
  ctx.quadraticCurveTo(0, y - 0.47, -0.04, y - 0.462);
  ctx.quadraticCurveTo(-0.068, y - 0.45, -0.074, y - 0.39);
  ctx.closePath();
  return 0;
};
const backHair: Part = (ctx) => {
  const y = P.hipY;
  ctx.moveTo(-0.07, y - 0.355);
  ctx.quadraticCurveTo(-0.1, y - 0.47, -0.05, y - 0.51);
  ctx.quadraticCurveTo(0, y - 0.535, 0.05, y - 0.51);
  ctx.quadraticCurveTo(0.1, y - 0.47, 0.07, y - 0.355);
  ctx.quadraticCurveTo(0, y - 0.335, -0.07, y - 0.355);
  ctx.closePath();
  return 0;
};

const SIDE_UPPER = [sideTorso] as const;
const SIDE_HEAD = [sideHead] as const;
const SIDE_HAIR = [sideHair] as const;
const FRONT_LEGS = [legPart(0), legPart(1)] as const;
const FRONT_ARMS = [armPart(0), armPart(1)] as const;
const FRONT_TORSO = [frontTorso] as const;
const FRONT_HEAD = [frontHead] as const;
const FRONT_HAIR = [frontHair] as const;
const BACK_HAIR = [backHair] as const;
const NEAR_ARM = [armPart(0)] as const;
const FAR_ARM = [armPart(1)] as const;

/** Work out this frame's legs and arms. */
function pose(d: Driver, view: View): void {
  const amp = d.stride;
  const sit = d.sit;
  const A = LEG_SWING * amp;
  // The stance leg is straight: the hips ride at its height (lowered as they sit); toward or
  // away from us they bob a little.
  const bob = Math.abs(Math.sin(d.gait));
  P.hipY = view === "side" ? -LEG * Math.cos(A * bob) + 0.24 * sit : -LEG - 0.012 * amp * bob;
  for (let i = 0; i < 2; i++) {
    const q = d.gait + i * Math.PI;
    if (view === "side") {
      // Thigh swings, the knee bends on the way forward; seated, the thighs come up level.
      const thigh = A * Math.sin(q) + 1.35 * sit;
      const bend = KNEE_BEND * amp * Math.max(0, Math.cos(q));
      const shin = thigh - bend - 1.35 * sit;
      P.shin[i] = shin;
      P.knee[i * 2] = THIGH * Math.sin(thigh);
      P.knee[i * 2 + 1] = P.hipY + THIGH * Math.cos(thigh);
      P.foot[i * 2] = P.knee[i * 2]! + SHIN * Math.sin(shin);
      P.foot[i * 2 + 1] = P.knee[i * 2 + 1]! + SHIN * Math.cos(shin);
    } else {
      // A foot lifts as that leg comes through.
      const x = (i === 0 ? -1 : 1) * 0.055;
      const lift = 0.06 * amp * Math.max(0, Math.cos(q));
      P.foot[i * 2] = x * 1.1;
      P.foot[i * 2 + 1] = -lift;
      P.knee[i * 2] = x * 1.05;
      P.knee[i * 2 + 1] = (P.hipY - lift) / 2;
      P.shin[i] = 0;
    }
  }
  // Arms swing against the legs; the near one reaches out for the door.
  const sy = P.hipY - 0.31;
  for (let i = 0; i < 2; i++) {
    if (view === "side") {
      const swing = -ARM_SWING * amp * Math.sin(d.gait + i * Math.PI);
      const up = i === 0 ? swing + (1.25 - swing) * d.reach : swing;
      const fore = up + 0.3 + 0.2 * amp - (i === 0 ? 0.45 * d.reach : 0);
      P.elbow[i * 2] = 0.15 * Math.sin(up);
      P.elbow[i * 2 + 1] = sy + 0.15 * Math.cos(up);
      P.hand[i * 2] = P.elbow[i * 2]! + 0.14 * Math.sin(fore);
      P.hand[i * 2 + 1] = P.elbow[i * 2 + 1]! + 0.14 * Math.cos(fore);
    } else {
      const side = i === 0 ? -1 : 1;
      const swing = 0.025 * amp * Math.sin(d.gait + i * Math.PI);
      P.elbow[i * 2] = side * 0.2;
      P.elbow[i * 2 + 1] = sy + 0.15;
      P.hand[i * 2] = side * 0.205;
      P.hand[i * 2 + 1] = sy + 0.29 - swing;
    }
  }
  P.lean = 0.35 * sit;
}

function sneakers(ctx: Ctx, view: View): void {
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const x = P.foot[i * 2]!;
    const y = P.foot[i * 2 + 1]!;
    if (view === "side") {
      // Along the sole, square to the shin.
      const s = P.shin[i]!;
      ctx.moveTo(x - 0.02 * Math.cos(s), y + 0.02 * Math.sin(s));
      ctx.lineTo(x + 0.07 * Math.cos(s), y - 0.07 * Math.sin(s));
    } else {
      ctx.moveTo(x - 0.022, y - 0.004);
      ctx.lineTo(x + 0.022, y - 0.004);
    }
  }
  ctx.strokeStyle = SNEAKER;
  ctx.lineWidth = 0.045;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** The figure at (x, y) (feet, px), `h` px tall. */
function drawFigure(ctx: Ctx, d: Driver, x: number, y: number, h: number): void {
  const view = d.view;
  pose(d, view);
  ctx.save();
  ctx.translate(x, y);
  // Their shadow on the floor.
  ctx.beginPath();
  oval(ctx, 0, 0, h * 0.13, h * 0.03);
  ctx.fillStyle = FOOT_SHADOW;
  ctx.fill();
  ctx.scale(h * (view === "side" ? d.facing : 1), h);
  P.px = 1 / h;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (view === "side") {
    sticker(ctx, FAR_ARM, JACKET, JACKET_RIM);
    sticker(ctx, sidePartsLeg[0], JEANS, JEANS_RIM);
    sticker(ctx, sidePartsLeg[1], JEANS, JEANS_RIM);
    sneakers(ctx, view);
    ctx.save();
    if (P.lean) {
      ctx.translate(0, P.hipY);
      ctx.rotate(P.lean);
      ctx.translate(0, -P.hipY);
    }
    sticker(ctx, SIDE_UPPER, JACKET, JACKET_RIM);
    sticker(ctx, SIDE_HEAD, SKIN, HAIR_RIM);
    sticker(ctx, SIDE_HAIR, HAIR, HAIR_RIM);
    // Shades, catching the sunset.
    ctx.beginPath();
    ctx.moveTo(0.05, P.hipY - 0.418);
    ctx.lineTo(0.09, P.hipY - 0.414);
    ctx.strokeStyle = SHADES;
    ctx.lineWidth = 0.032;
    ctx.stroke();
    sticker(ctx, NEAR_ARM, JACKET, JACKET_RIM);
    ctx.restore();
  } else {
    sticker(ctx, FRONT_LEGS, JEANS, JEANS_RIM);
    sneakers(ctx, view);
    sticker(ctx, FRONT_ARMS, JACKET, JACKET_RIM);
    sticker(ctx, FRONT_TORSO, JACKET, JACKET_RIM);
    if (view === "front") {
      // The tee in the jacket's V.
      ctx.beginPath();
      ctx.moveTo(-0.045, P.hipY - 0.35);
      ctx.lineTo(0.045, P.hipY - 0.35);
      ctx.lineTo(0, P.hipY - 0.2);
      ctx.closePath();
      ctx.fillStyle = TEE;
      ctx.fill();
      sticker(ctx, FRONT_HEAD, SKIN, HAIR_RIM);
      sticker(ctx, FRONT_HAIR, HAIR, HAIR_RIM);
      ctx.beginPath();
      ctx.moveTo(-0.058, P.hipY - 0.418);
      ctx.lineTo(0.058, P.hipY - 0.418);
      ctx.strokeStyle = SHADES;
      ctx.lineWidth = 0.034;
      ctx.stroke();
    } else {
      sticker(ctx, BACK_HAIR, HAIR, HAIR_RIM);
    }
  }
  ctx.restore();
}

/** Where the driver is on screen now (feet, px), their height (px), whether they show at all and
 *  whether they are in the arcade's doorway (or beyond it), and what they are doing. */
const ON_SCREEN = { x: 0, y: 0, h: 0, shows: false, inDoor: false, phase: "inside" as DriverPhase };
export function driverOnScreen(s: Scene): typeof ON_SCREEN {
  const d = driverAt(s.t);
  const f = TOWER_DEPTH * s.u;
  ON_SCREEN.x = s.cssW / 2 + (f * d.a) / d.z;
  ON_SCREEN.y = s.horizonY + ((s.groundY - s.horizonY) * TOWER_DEPTH) / d.z;
  ON_SCREEN.h = (f * PERSON_H) / d.z;
  ON_SCREEN.shows = d.shows;
  ON_SCREEN.inDoor = d.inDoor;
  ON_SCREEN.phase = d.phase;
  return ON_SCREEN;
}

function draw(ctx: Ctx, s: Scene, inDoor: boolean): void {
  const at = driverOnScreen(s);
  if (!at.shows || at.inDoor !== inDoor) return;
  if (at.y - at.h * 1.1 > s.cssH) return;
  drawFigure(ctx, driverAt(s.t), at.x, at.y, at.h);
}

/** The driver out on the floor (in front of the arcade and the palms, ground.ts). */
export function drawDriver(ctx: Ctx, s: Scene): void {
  draw(ctx, s, false);
}

/** The driver in the arcade's doorway or beyond (the arcade clips them to it, arcade.ts). */
export function drawDriverInDoor(ctx: Ctx, s: Scene): void {
  draw(ctx, s, true);
}

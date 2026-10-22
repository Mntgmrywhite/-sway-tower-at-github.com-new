import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  CHAMBRAY,
  DARK_BROWN,
  FLAG,
  HAIR_BLONDE,
  HAIR_BROWN,
  HAIR_DARK,
  HAIR_GINGER,
  HAIR_WHITE,
  INK,
  JEANS,
  KHAKI,
  LINEN,
  NAVY,
  OATMEAL,
  PARASOL_PINK,
  POLISH,
  RED,
  RUST,
  SEAFOAM,
  SHIRT_WHITE,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  SLACKS,
  STICK,
  SUNFLOWER,
  TANGERINE,
  TWEED,
  VET_BLUE,
  WHITE_SHOES,
  shades,
} from "./colors";
import { usFlag } from "./flag";
import { figure, type Frame, type Look } from "./folk";
import { ballCap, boater, garrison, sunHat } from "./hats";
import { mainLine, mainShows } from "./land";
import { breeze } from "./life";
import { nearestUnit, PARADE_AT, paradeX, UNITS } from "./parade";
import { ADULT, armTo, blinkAt, build, CHILD, ease, fract, glance, hop, J, legTo, perch, pose, scaled, stand, STROLL, walk, wave, type Build, type Gait } from "./rig";
import { smooth } from "./shapes";

// The crowd along the square's far side, out at Main Street's sidewalk either side of the open
// middle (never behind the tower): townsfolk who came to watch the parade, standing in front of
// the flower beds. On the left a grandpa in his boater clapping, a dad with his little boy on his
// shoulders waving a flag, a lady under a parasol; on the right a girl perched on the picket
// fence swinging her legs, a fellow in a ball cap who throws up his arms and cheers when the band
// comes by, and an old veteran in his garrison cap who stands and salutes as the colors pass.
// Each shifts its weight, glances about and turns to follow the parade on its own clock, and
// claps, waves and cheers as it passes. Behind the fence, along the shops, a pedestrian on each
// side strolls at their own pace from a shop toward the square, stops to watch a while, and
// strolls back.
//
// Everyone is a storybook figure on the rig (rig.ts, folk.ts), smaller with the distance, with
// less detail (`lod` 1). Positions are in u from the screen's center (X); feet in u below Main
// Street's line.

/** The scratch pose. */
const P = pose();

/** The crowd's size (a grown-up ADULT at this scale), and the strollers' (a little further back). */
const NEAR = 0.6;
const BACK = 0.52;
/** Where the crowd stands (u below Main Street's line), and the strollers. */
const CROWD_FOOT = 0.082;
const STROLL_FOOT = 0.03;

/** The line round them (px): none, as the far layers are painted (their hats and props go without it too). */
const LINE = 0;

/** How close (u, screen) the parade's nearest unit is to x, and the color guard (for the salute). */
function nearParade(s: Scene, x: number): number {
  return Math.abs(nearestUnit(s, x, s.t));
}

/** How far (u) the color guard (the flag) is from x now; Infinity while the parade is not out. */
function flagFrom(s: Scene, x: number): number {
  if (s.t < PARADE_AT) return Infinity;
  const back = UNITS.find((q) => q.unit === "flag")!.back;
  return Math.abs((paradeX(s.t) - back) * s.u - x) / s.u;
}

/** Where a spectator at x looks to follow the parade: a turn of the face toward the nearest unit (radians, toward screen right positive), 0 if none is near. */
function follow(s: Scene, x: number): number {
  const d = nearestUnit(s, x, s.t);
  if (!Number.isFinite(d)) return 0;
  return Math.max(-1, Math.min(1, d / 0.35)) * 0.9 * (1 - smooth(0.6, 1.1, Math.abs(d)));
}

/** Resets the face before a figure is posed. */
function fresh(t: number, id: number): void {
  P.tilt = 0;
  P.mouth = 0;
  P.puff = 0;
  P.brow = 0;
  P.blink = blinkAt(t, id);
  P.lagX = 0;
  P.lagY = 0;
  P.wind = breeze(t);
}

/** Sets the face to follow the parade (or glance about), the body seen from `view`, facing screen right (dir 1) or left; returns how excited it is. */
function look(s: Scene, x: number, id: number, view: number, dir: 1 | -1): number {
  const ex = 1 - smooth(0.12, 0.5, nearParade(s, x));
  P.face = view + dir * follow(s, x) * 0.9 + glance(s.t, id, -0.3, 0.3) * (1 - ex);
  return ex;
}

// ---------------------------------------------------------------- the spectators

const GRANDPA_BUILD = scaled(build({ belly: 0.006, waistW: 0.0135, depth: 0.0128 }), NEAR);
const GRANDPA_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_WHITE, style: "fringe", top: shades(OATMEAL, 0.5, 0.2), sleeves: "long", lower: shades(TWEED, 0.4, 0.28), legs: "trousers", shoes: DARK_BROWN, mustache: true };
const DAD_BUILD = scaled(build({ thigh: 0.038, shin: 0.036 }), NEAR);
const DAD_LOOK: Look = { skin: SKIN_BROWN, hair: HAIR_DARK, style: "crop", top: shades(CHAMBRAY, 0.4, 0.28), sleeves: "short", lower: shades(KHAKI, 0.4, 0.28), legs: "trousers", shoes: DARK_BROWN };
const SON_BUILD = scaled(CHILD, NEAR * 0.95);
const SON_LOOK: Look = { skin: SKIN_BROWN, hair: HAIR_DARK, style: "crop", top: shades(RED, 0.4, 0.28), sleeves: "short", lower: JEANS, legs: "shorts", shoes: DARK_BROWN };
const LADY_BUILD = scaled(build({ bust: 0.004, waistW: 0.0105, hipW: 0.0145 }), NEAR);
const LADY_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_GINGER, style: "bun", top: shades(SEAFOAM, 0.45, 0.26), sleeves: "short", lower: shades(SEAFOAM, 0.45, 0.26), legs: "dress", hem: 0.8, shoes: WHITE_SHOES };
const FENCE_GIRL_BUILD = scaled(CHILD, NEAR * 0.95);
const FENCE_GIRL_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_BLONDE, style: "pony", ribbon: NAVY, top: shades(TANGERINE, 0.4, 0.28), sleeves: "short", lower: JEANS, legs: "shorts", hem: 0.6, shoes: RED };
const FAN_BUILD = scaled(build({ chestW: 0.0156, depth: 0.0124 }), NEAR);
const FAN_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_BROWN, style: "side", top: shades(SHIRT_WHITE, 0.5, 0.18), sleeves: "short", lower: JEANS, legs: "trousers", shoes: DARK_BROWN };
const VET_BUILD = scaled(build({ belly: 0.005, spine: 0.044, head: 0.016 }), NEAR * 0.97);
const VET_LOOK: Look = { skin: SKIN_BROWN, hair: HAIR_WHITE, style: "fringe", top: shades(VET_BLUE, 0.4, 0.3), sleeves: "long", lower: shades(VET_BLUE, 0.4, 0.3), legs: "trousers", shoes: POLISH, mustache: true };

/** Grandpa: in his boater, hands behind his back, clapping slowly as the band goes by, rocking on his heels. */
function grandpa(ctx: Ctx, s: Scene, x: number, foot: number, kw: number): void {
  const t = s.t;
  const b = GRANDPA_BUILD;
  const u = s.u * NEAR;
  fresh(t, 501);
  P.view = Math.PI * 0.18;
  stand(P, b, t, 0.1, 0.004, 6.3, -0.02);
  const ex = look(s, x, 501, P.view, 1);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  const clap = Math.abs(Math.sin(t * Math.PI * 2.2));
  const apart = 0.003 + (ex > 0.3 ? clap * 0.012 : 0.01);
  armTo(P, b, true, cl - apart, cf + 0.022 * ex + 0.004, cy + 0.02, -1, -0.6, 0.6);
  armTo(P, b, false, cl + apart, cf + 0.022 * ex + 0.004, cy + 0.02, 1, -0.6, 0.6);
  P.mouth = 0.15 + ex * 0.4;
  P.brow = ex * 0.4;
  figure(ctx, P, b, GRANDPA_LOOK, x, foot, s.u, 1, kw, { lod: 0 }, { hat: (c, F) => boater(c, F, P, NAVY) });
  void u;
}

/** A dad with his little boy on his shoulders: the boy waving a flag over his head and bouncing with excitement as the parade comes by, his dad holding his ankles and turning to watch. */
function shoulders(ctx: Ctx, s: Scene, x: number, foot: number, kw: number): void {
  const t = s.t;
  const b = DAD_BUILD;
  fresh(t, 502);
  P.view = Math.PI * 0.12;
  stand(P, b, t, 0.6, 0.005, 5.1);
  const ex = look(s, x, 502, P.view, -1);
  P.mouth = 0.2 + ex * 0.4;
  // His hands up at the boy's knees.
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  const bounce = ex * Math.max(0, Math.sin(t * Math.PI * 3)) * 0.003;
  const seatY = cy - b.neck * 0.6 - bounce;
  armTo(P, b, true, cl - 0.012, cf + 0.01, seatY + 0.006, -1, -0.5, 0.2);
  armTo(P, b, false, cl + 0.012, cf + 0.01, seatY + 0.006, 1, -0.5, 0.2);
  const F = figure(ctx, P, b, DAD_LOOK, x, foot, s.u, -1, kw, { lod: 0 });
  // The boy, sitting astride his neck.
  const bx = F.x[J.chest]!;
  const by = F.y[J.chest]! - b.neck * s.u * 0.55 - bounce * s.u;
  const sb = SON_BUILD;
  fresh(t, 503);
  P.view = Math.PI * 0.1;
  // Astride his dad's neck: the pelvis at the seat, the legs down either side of his dad's head, the feet hanging at his chest.
  perch(P, sb, -sb.hips * 0.6, 0, 0, 0, 0);
  legTo(P, sb, true, -0.012, 0.004, sb.thigh * 0.4 + sb.shin * 0.8, 0.3);
  legTo(P, sb, false, 0.012, 0.004, sb.thigh * 0.4 + sb.shin * 0.8, 0.3);
  const w = Math.sin(t * (2.4 + ex * 2.2));
  const scl = P.j[J.chest * 3]!;
  const scf = P.j[J.chest * 3 + 1]!;
  const scy = P.j[J.chest * 3 + 2]!;
  armTo(P, sb, true, scl - 0.01 + w * 0.006, scf + 0.004, scy - (sb.upper + sb.fore) * 0.9, -1, -0.2, 0.3);
  armTo(P, sb, false, scl + 0.012, scf + 0.006, scy + 0.016, 1, -0.4, 0.3);
  const ex2 = look(s, bx, 503, P.view, 1);
  P.mouth = 0.5 + ex2 * 0.45;
  P.brow = 0.3 + ex2 * 0.5;
  figure(ctx, P, sb, SON_LOOK, bx, by, s.u, 1, kw, { lod: 0, legs: true }, {
    front: (c, G) => littleFlag(c, G, s.u * NEAR, kw, t, w > 0 ? -1 : 1),
  });
}

/** A little flag on a stick in a figure's near hand. */
function littleFlag(ctx: Ctx, F: Frame, u: number, kw: number, t: number, dir: 1 | -1): void {
  const hx = F.x[J.handN]!;
  const hy = F.y[J.handN]!;
  ctx.beginPath();
  ctx.moveTo(hx, hy + u * 0.005);
  ctx.lineTo(hx + u * 0.001, hy - u * 0.03);
  ctx.strokeStyle = STICK;
  ctx.lineWidth = Math.max(0.8, u * 0.0028);
  ctx.stroke();
  usFlag(ctx, hx + u * 0.001, hy - u * 0.03, u * 0.044, u * 0.029, dir, u * 0.003, t * 9, FLAG);
  void kw;
}

/** A lady under a parasol, turning it a little in her fingers, following the parade with her eyes, a gloved wave as the colors pass. */
function parasolLady(ctx: Ctx, s: Scene, x: number, foot: number, kw: number): void {
  const t = s.t;
  const b = LADY_BUILD;
  fresh(t, 504);
  P.view = Math.PI * 0.2;
  stand(P, b, t, 0.9, 0.003, 4.4);
  const ex = look(s, x, 504, P.view, 1);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  // The parasol's handle in her near hand, at her shoulder.
  armTo(P, b, true, cl - 0.012, cf + 0.01, cy + 0.006, -1, -0.5, 0.4);
  wave(P, b, t, 1.2, ex > 0.5 ? (ex - 0.5) * 2 : 0);
  P.mouth = 0.2 + ex * 0.3;
  P.brow = ex * 0.3;
  const turn = Math.sin(t * 0.9) * 0.25;
  figure(ctx, P, b, LADY_LOOK, x, foot, s.u, 1, kw, { lod: 0, swing: Math.sin(t * 1.3) * 0.4 }, {
    front: (c, F) => parasol(c, F, s.u * NEAR, kw, turn),
  });
}

/** An open parasol: a scalloped canopy of pink and cream panels over her head on its shaft from her hand. */
function parasol(ctx: Ctx, F: Frame, u: number, kw: number, turn: number): void {
  const hx = F.x[J.handN]!;
  const hy = F.y[J.handN]!;
  const tx = hx - u * 0.012;
  const ty = hy - u * 0.075;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, u * 0.003);
  ctx.stroke();
  const R = u * 0.048;
  const n = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? LINEN : PARASOL_PINK;
    ctx.beginPath();
    for (let i = pass; i < n; i += 2) {
      const a0 = Math.PI + (Math.PI * (i + turn)) / n;
      const a1 = Math.PI + (Math.PI * (i + 1 + turn)) / n;
      const c0 = Math.max(Math.PI, Math.min(Math.PI * 2, a0));
      const c1 = Math.max(Math.PI, Math.min(Math.PI * 2, a1));
      if (c1 <= c0) continue;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(c0) * R, ty + Math.sin(c0) * R * 0.55 + R * 0.25);
      ctx.quadraticCurveTo(tx + Math.cos((c0 + c1) / 2) * R * 1.02, ty + Math.sin((c0 + c1) / 2) * R * 0.55 + R * 0.38, tx + Math.cos(c1) * R, ty + Math.sin(c1) * R * 0.55 + R * 0.25);
      ctx.closePath();
    }
    ctx.fill();
  }
  if (kw <= 0) return;
  ctx.beginPath();
  ctx.moveTo(tx - R, ty + R * 0.25);
  ctx.quadraticCurveTo(tx, ty - R * 0.75, tx + R, ty + R * 0.25);
  ctx.lineWidth = kw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** A girl perched on the picket fence, swinging her legs by turns, clapping and waving with both arms as the band passes. */
function fenceGirl(ctx: Ctx, s: Scene, x: number, seat: number, kw: number): void {
  const t = s.t;
  const b = FENCE_GIRL_BUILD;
  fresh(t, 505);
  P.view = Math.PI * 0.08;
  // Sitting on the rail: the pelvis on it, the legs hanging down in front of the pickets, swinging.
  perch(P, b, -b.hips * 0.4, 0, 0, 0, 0);
  const sw = Math.sin(t * 3.4);
  legTo(P, b, true, -0.005, 0.01 + sw * 0.008, b.thigh * 0.3 + b.shin, -0.2);
  legTo(P, b, false, 0.005, 0.01 - sw * 0.008, b.thigh * 0.3 + b.shin, -0.2);
  const ex = look(s, x, 505, P.view, -1);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  if (ex > 0.4) {
    // Both arms up, waving.
    const w = Math.sin(t * 6);
    armTo(P, b, true, cl - 0.016 + w * 0.004, cf + 0.004, cy - (b.upper + b.fore) * 0.85, -1, 0, 0.4);
    armTo(P, b, false, cl + 0.016 + w * 0.004, cf + 0.004, cy - (b.upper + b.fore) * 0.85, 1, 0, 0.4);
  } else {
    // Hands on the rail either side of her.
    armTo(P, b, true, cl - 0.016, cf + 0.002, b.hips * 0.2, -1, -0.3, 0.2);
    armTo(P, b, false, cl + 0.016, cf + 0.002, b.hips * 0.2, 1, -0.3, 0.2);
  }
  P.mouth = 0.35 + ex * 0.55;
  P.brow = ex * 0.6;
  P.lagX = -sw * 0.001;
  figure(ctx, P, b, FENCE_GIRL_LOOK, x, seat, s.u, -1, kw, { lod: 0 });
}

/** A fellow in a ball cap who throws up his arms and cheers as the band comes by, then claps; hands in his pockets the rest of the time. */
function fan(ctx: Ctx, s: Scene, x: number, foot: number, kw: number): void {
  const t = s.t;
  const b = FAN_BUILD;
  fresh(t, 506);
  P.view = Math.PI * 0.22;
  const ex = look(s, x, 506, P.view, -1);
  if (ex > 0.55) hop(P, b, t, 1.8, 0.2, 0.004, 0.005);
  else stand(P, b, t, 0.4, 0.005, 3.7);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  if (ex > 0.55) {
    const up = Math.sin(t * 5) * 0.004;
    armTo(P, b, true, cl - 0.022, cf + 0.004, cy - (b.upper + b.fore) * 0.92 + up, -1, 0, 0.4);
    armTo(P, b, false, cl + 0.022, cf + 0.004, cy - (b.upper + b.fore) * 0.92 - up, 1, 0, 0.4);
    P.mouth = 0.95;
    P.brow = 0.9;
  } else {
    // Hands in his pockets, thumbs out.
    armTo(P, b, true, P.j[J.hipN * 3]! - 0.006, P.j[J.hipN * 3 + 1]! + 0.004, P.j[J.pelvis * 3 + 2]! + 0.006, -1, -0.4, 0);
    armTo(P, b, false, P.j[J.hipF * 3]! + 0.006, P.j[J.hipF * 3 + 1]! + 0.004, P.j[J.pelvis * 3 + 2]! + 0.006, 1, -0.4, 0);
    P.mouth = 0.2 + ex * 0.6;
    P.brow = ex * 0.5;
  }
  figure(ctx, P, b, FAN_LOOK, x, foot, s.u, -1, kw, { lod: 0 }, { hat: (c, F) => ballCap(c, F, P, RED) });
}

/** How far into his salute the old veteran is (0..1): up as the color guard's flag comes within reach of him, down once it has passed. */
export function saluteAt(s: Scene): number {
  return 1 - smooth(0.16, 0.3, flagFrom(s, s.cssW / 2 + SPECTATORS.veteran * s.u));
}

/** An old veteran in his garrison cap and medals, standing straight, who salutes as the colors pass. */
function veteran(ctx: Ctx, s: Scene, x: number, foot: number, kw: number): void {
  const t = s.t;
  const b = VET_BUILD;
  fresh(t, 507);
  P.view = Math.PI * 0.16;
  stand(P, b, t, 0.2, 0.004, 7.3, -0.03);
  look(s, x, 507, P.view, -1);
  // The salute: as the flag comes within reach of him, until it has passed.
  const salute = saluteAt(s);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const hy = P.j[J.head * 3 + 2]!;
  if (salute > 0.01) {
    const e = ease(salute);
    const [l0, f0, y0] = [P.j[J.handN * 3]!, P.j[J.handN * 3 + 1]!, P.j[J.handN * 3 + 2]!];
    armTo(P, b, true, l0 + (cl - 0.012 - l0) * e, f0 + (cf + 0.014 - f0) * e, y0 + (hy - 0.004 - y0) * e, -1, 0.2, 0.2);
    P.face = P.view - 0.4 * salute;
    P.tilt = -0.05 * salute;
  }
  P.mouth = 0.05;
  figure(ctx, P, b, VET_LOOK, x, foot, s.u, -1, kw, { lod: 0, nearLast: salute > 0.3 }, { hat: (c, F) => garrison(c, F, P, shades(VET_BLUE, 0.4, 0.3)) });
}

// ---------------------------------------------------------------- the strollers

/**
 * A stroller's day: from its door it walks toward the square at its own pace, stops at its spot
 * to watch for a while, turns and walks back, and waits at its door window-shopping, round and
 * round. Returns where it is (X, u from the screen's center), which way it faces, whether it is
 * walking, and how far into a stop it is.
 */
const WALKER = { X: 0, dir: 1 as 1 | -1, walking: false, stopK: 0 };
function walkerAt(t: number, from: number, to: number, speed: number, watch: number, shop: number, phase: number): typeof WALKER {
  const leg = Math.abs(to - from) / speed;
  const T = leg * 2 + watch + shop;
  const k = fract(t / T + phase) * T;
  const toward = to > from ? 1 : -1;
  if (k < leg) {
    WALKER.X = from + (to - from) * (k / leg);
    WALKER.dir = toward as 1 | -1;
    WALKER.walking = true;
    WALKER.stopK = 0;
  } else if (k < leg + watch) {
    WALKER.X = to;
    WALKER.dir = toward as 1 | -1;
    WALKER.walking = false;
    WALKER.stopK = (k - leg) / watch;
  } else if (k < leg * 2 + watch) {
    WALKER.X = to + (from - to) * ((k - leg - watch) / leg);
    WALKER.dir = -toward as 1 | -1;
    WALKER.walking = true;
    WALKER.stopK = 0;
  } else {
    WALKER.X = from;
    WALKER.dir = -toward as 1 | -1;
    WALKER.walking = false;
    WALKER.stopK = (k - leg * 2 - watch) / shop;
  }
  return WALKER;
}

/** The strollers: where they walk between (u from the screen's center), their pace (u/s at the screen), how long they watch and shop, their builds and looks. */
export const STROLLERS: { id: number; from: number; to: number; speed: number; watch: number; shop: number; phase: number; build: Build; look: Look; cadence: number }[] = [
  {
    id: 601,
    from: -0.47,
    to: -0.33,
    speed: 0.034,
    watch: 6,
    shop: 3,
    phase: 0.62,
    build: scaled(build({ bust: 0.004, waistW: 0.0108, hipW: 0.015 }), BACK),
    look: { skin: SKIN_BROWN, hair: HAIR_DARK, style: "curls", top: shades(SUNFLOWER, 0.4, 0.26), sleeves: "short", lower: shades(SUNFLOWER, 0.4, 0.26), legs: "dress", hem: 0.78, shoes: WHITE_SHOES },
    cadence: 0.95,
  },
  {
    id: 602,
    from: 0.47,
    to: 0.335,
    speed: 0.052,
    watch: 5,
    shop: 2.5,
    phase: 0.15,
    build: scaled(ADULT, BACK * 1.03),
    look: { skin: SKIN_FAIR, hair: HAIR_BROWN, style: "side", top: shades(RUST, 0.4, 0.28), sleeves: "long", lower: shades(SLACKS, 0.4, 0.3), legs: "trousers", shoes: DARK_BROWN },
    cadence: 1.2,
  },
];

/** One stroller: walking (feet planted as they go), or stopped: watching the parade (clapping when it is close) or looking in a shop window. */
function stroller(ctx: Ctx, s: Scene, w: (typeof STROLLERS)[number], line: number, kw: number): void {
  const t = s.t;
  const at = walkerAt(t, w.from, w.to, w.speed, w.watch, w.shop, w.phase);
  const x = s.cssW / 2 + at.X * s.u;
  const foot = line + STROLL_FOOT * s.u;
  const b = w.build;
  fresh(t, w.id);
  P.view = Math.PI * 0.4;
  if (at.walking) {
    const gait: Gait = { speed: w.speed / (BACK * Math.sin(P.view)), cadence: w.cadence, phase: 0, duty: 0.6, lift: 0.006, high: 0, stance: 0.005 };
    walk(P, b, gait, STROLL, t);
    P.face = P.view - 0.1 + glance(t, w.id, -0.2, 0.15);
  } else {
    stand(P, b, t, w.id * 0.01, 0.004, 4);
    const watching = at.X * at.dir > 0 ? false : true;
    if (watching || Math.abs(at.X - w.to) < 1e-6) {
      // At the corner: turned toward the square, clapping when the parade is close.
      P.view = Math.PI * (0.4 - 0.25 * ease(Math.min(1, at.stopK * 4)));
      const ex = 1 - smooth(0.12, 0.5, nearParade(s, x));
      const cl = P.j[J.chest * 3]!;
      const cf = P.j[J.chest * 3 + 1]!;
      const cy = P.j[J.chest * 3 + 2]!;
      if (ex > 0.3) {
        const clap = Math.abs(Math.sin(t * Math.PI * 2.6));
        armTo(P, b, true, cl - 0.003 - clap * 0.01, cf + 0.02, cy + 0.012, -1, -0.6, 0.6);
        armTo(P, b, false, cl + 0.003 + clap * 0.01, cf + 0.02, cy + 0.012, 1, -0.6, 0.6);
      }
      P.face = P.view - 0.3 - follow(s, x) * 0.3;
      P.mouth = 0.2 + ex * 0.5;
      P.brow = ex * 0.4;
    } else {
      // At the shop window: turned away to look in, hands behind the back.
      P.view = Math.PI * (0.4 + 0.5 * ease(Math.min(1, at.stopK * 4)) * (1 - ease(Math.max(0, at.stopK * 4 - 3))));
      P.face = P.view;
    }
  }
  figure(ctx, P, b, w.look, x, foot, s.u, at.dir, kw, { lod: 0, flow: at.walking ? 1 : 0, swing: Math.sin(t * w.cadence * Math.PI * 4) * 0.6 }, w.id === 601 ? { hat: (c, F) => sunHat(c, F, P, LINEN, RED, Math.sin(t * 2.7) * 0.5) } : {});
}

// ---------------------------------------------------------------- the crowd

/** Where each spectator stands (X, u from the screen's center); the fence girl sits on the rail. */
export const SPECTATORS = { grandpa: -0.455, shoulders: -0.395, lady: -0.33, fenceGirl: 0.315, fan: 0.38, veteran: 0.448 } as const;

/** The strollers behind the fence (drawn before it, so it hides their feet). */
export function strollers(ctx: Ctx, s: Scene): void {
  if (!mainShows(s)) return;
  const line = mainLine(s);
  if (line - s.u * 0.1 > s.cssH) return;
  const kw = LINE;
  for (const w of STROLLERS) stroller(ctx, s, w, line, kw);
}

/** The crowd in front of the flower beds either side of the square's open middle. */
export function crowd(ctx: Ctx, s: Scene): void {
  if (!mainShows(s)) return;
  const line = mainLine(s);
  if (line - s.u * 0.1 > s.cssH) return;
  const kw = LINE;
  const cx = s.cssW / 2;
  const foot = line + CROWD_FOOT * s.u;
  const at = (X: number) => cx + X * s.u;
  fenceGirl(ctx, s, at(SPECTATORS.fenceGirl), line + 0.016 * s.u, kw);
  grandpa(ctx, s, at(SPECTATORS.grandpa), foot - 0.004 * s.u, kw);
  shoulders(ctx, s, at(SPECTATORS.shoulders), foot + 0.004 * s.u, kw);
  parasolLady(ctx, s, at(SPECTATORS.lady), foot, kw);
  veteran(ctx, s, at(SPECTATORS.veteran), foot - 0.002 * s.u, kw);
  fan(ctx, s, at(SPECTATORS.fan), foot + 0.006 * s.u, kw);
}

/** For the tests: the crowd's members' own rhythms (no two the same). */
export const CROWD_IDS = [501, 502, 503, 504, 505, 506, 507, 601, 602] as const;

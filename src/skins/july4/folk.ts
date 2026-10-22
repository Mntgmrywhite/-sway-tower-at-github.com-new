import type { Ctx } from "../../base/draw";
import type { Shades } from "./colors";
import { BLUSH, INK } from "./colors";
import { J, JOINTS, type Build, type Pose } from "./rig";

// The townsfolk as storybook figures, painted from a posed skeleton (rig.ts) after the
// mid-century picture books and postcards: soft round forms with a fine warm sepia line, a lit
// side toward the afternoon sun (up and left) and a shaded side away from it, rounded torsos that
// narrow at the waist and round out at the chest and the belly, limbs that taper from the hip to
// the ankle and from the shoulder to the wrist, swelling a little at the calf and the forearm and
// bending round at the knee and the elbow (never a stick, never a square joint), mitten hands,
// rounded shoes, a big round head with a face that turns with it (eyes that blink, a nose in
// profile, a smile that opens to a grin, puffed cheeks, rosy cheeks, brows that lift), hair in
// a dozen styles that swings, and hats (hats.ts). Clothes are painted over the body: shirts and
// jackets, trousers, shorts, skirts and dresses whose hems flare and swing with the stride.
//
// How it is painted (the canvas's cost is in the number of fills and strokes, a few microseconds
// each, more than in their size): first the fine line as one ink fill, the whole silhouette
// grown by half the line's width, then the colors over it, each color one fill where the
// layering allows, so a figure costs some twenty fills. Where a part crosses the body (an arm
// over the chest), a stroke draws its line over the body.
//
// Everything is painted in screen space from the projected joints, so lines keep their weight at
// any size, and a figure turned to face screen left is the same pose mirrored. Detail drops away
// with size (`lod`): the crowd on Main Street gets bodies and faces of a few marks, the cook and
// the parade the whole painting.

/** The hair styles. */
export type Hair = "crop" | "side" | "bob" | "pony" | "pigtails" | "bun" | "curls" | "long" | "fringe" | "none";

/** What a figure wears and looks like. */
export interface Look {
  skin: Shades;
  hair: string;
  style: Hair;
  /** The shirt, blouse, jacket or bodice, and its sleeves. */
  top: Shades;
  sleeves: "short" | "long" | "none";
  /** The trousers, shorts or skirt; a dress carries the top's color down. */
  lower: Shades;
  legs: "trousers" | "shorts" | "skirt" | "dress";
  /** How long a skirt or dress is (0 at the hips .. 1 to the ankles); shorts' length likewise. */
  hem?: number;
  shoes: string;
  /** A ribbon or a bow's color (hair ribbons, pigtail ties). */
  ribbon?: string;
  /** A white goatee (1), a mustache. */
  beard?: number;
  mustache?: boolean;
  /** Rosy cheeks (default on). */
  cheeks?: number;
  /** White gloves (the drum major, Uncle Sam): the hands' color. */
  gloves?: string;
}

/** Where the painted figure came out on the screen: its joints (px), the head's radius, its facing and scale. */
export interface Frame {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  /** Pixels a u at this figure's size. */
  k: number;
  /** Mirrored (screen left) or not. */
  dir: 1 | -1;
  /** The face's screen direction (+1 right, -1 left) and how much of the face shows in profile (0 facing us .. 1 profile). */
  fd: number;
  side: number;
  headR: number;
  /** The fine line's width (px). */
  kw: number;
}

const FX = new Float64Array(JOINTS);
const FY = new Float64Array(JOINTS);
const FZ = new Float64Array(JOINTS);
export const FRAME: Frame = { x: FX, y: FY, z: FZ, k: 1, dir: 1, fd: 1, side: 1, headR: 1, kw: 1 };

/** Lays a pose on the screen: its ground point at (x, y) px, k px a u, mirrored by dir. Fills FRAME. */
export function project(P: Pose, b: Build, x: number, y: number, k: number, dir: 1 | -1, kw: number): Frame {
  const c = Math.cos(P.view);
  const sn = Math.sin(P.view);
  for (let i = 0; i < JOINTS; i++) {
    const l = P.j[i * 3]!;
    const f = P.j[i * 3 + 1]!;
    FX[i] = x + dir * k * (l * c + f * sn);
    FY[i] = y + k * P.j[i * 3 + 2]!;
    FZ[i] = f * c - l * sn;
  }
  const fs = Math.sin(P.face);
  FRAME.k = k;
  FRAME.dir = dir;
  FRAME.fd = fs >= 0 ? dir : -dir;
  FRAME.side = Math.abs(fs);
  FRAME.headR = b.head * k;
  FRAME.kw = kw;
  return FRAME;
}

// ---------------------------------------------------------------- shapes

/** The round end of a limb: points round a cap of radius w about (x, y), from the side normal (nx, ny) round the end (dx, dy). */
const CAP = [0.8, 0.8] as const;
const CAPS = [0.6, -0.6] as const;

/**
 * A limb from (ax, ay) through the joint (bx, by) to (cx, cy), `w0`, `w1`, `w2` half wide at
 * each, grown by `g` all round (for its line): its sides swell a little between the joints (a
 * calf, a forearm), the outside of the joint rounds and the inside creases, the ends are round.
 * A polygon, as its own subpath.
 */
export function limb(ctx: Ctx, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, w0: number, w1: number, w2: number, swell = 0.14, g = 0): void {
  let d1x = bx - ax;
  let d1y = by - ay;
  let d2x = cx - bx;
  let d2y = cy - by;
  const l1 = Math.hypot(d1x, d1y) || 1e-6;
  const l2 = Math.hypot(d2x, d2y) || 1e-6;
  d1x /= l1;
  d1y /= l1;
  d2x /= l2;
  d2y /= l2;
  // Normals on the clockwise side (screen), each segment's, and their bisector at the joint.
  const n1x = -d1y;
  const n1y = d1x;
  const n2x = -d2y;
  const n2y = d2x;
  let mx = n1x + n2x;
  let my = n1y + n2y;
  const ml = Math.hypot(mx, my) || 1e-6;
  mx /= ml;
  my /= ml;
  const cosH = Math.max(0.5, ml / 2);
  const cross = d1x * d2y - d1y * d2x;
  const W0 = w0 + g;
  const W1 = w1 + g;
  const W2 = w2 + g;
  const s1 = (w0 + w1) / 2 * (1 + swell) + g;
  const s2 = (w1 + w2) / 2 * (1 + swell) + g;
  // Down the clockwise side: the start, swelling to the joint (round outside, creased inside), swelling to the end.
  ctx.moveTo(ax + n1x * W0, ay + n1y * W0);
  if (cross < 0) {
    ctx.quadraticCurveTo((ax + bx) / 2 + n1x * s1, (ay + by) / 2 + n1y * s1, bx + n1x * W1, by + n1y * W1);
    ctx.lineTo(bx + mx * W1, by + my * W1);
    ctx.lineTo(bx + n2x * W1, by + n2y * W1);
  } else ctx.quadraticCurveTo((ax + bx) / 2 + n1x * s1, (ay + by) / 2 + n1y * s1, bx + (mx * W1) / cosH, by + (my * W1) / cosH);
  ctx.quadraticCurveTo((bx + cx) / 2 + n2x * s2, (by + cy) / 2 + n2y * s2, cx + n2x * W2, cy + n2y * W2);
  for (let i = 0; i < 2; i++) ctx.lineTo(cx + (n2x * CAPS[i]! + d2x * CAP[i]!) * W2, cy + (n2y * CAPS[i]! + d2y * CAP[i]!) * W2);
  ctx.lineTo(cx - n2x * W2, cy - n2y * W2);
  if (cross > 0) {
    ctx.quadraticCurveTo((bx + cx) / 2 - n2x * s2, (by + cy) / 2 - n2y * s2, bx - n2x * W1, by - n2y * W1);
    ctx.lineTo(bx - mx * W1, by - my * W1);
    ctx.lineTo(bx - n1x * W1, by - n1y * W1);
  } else ctx.quadraticCurveTo((bx + cx) / 2 - n2x * s2, (by + cy) / 2 - n2y * s2, bx - (mx * W1) / cosH, by - (my * W1) / cosH);
  ctx.quadraticCurveTo((ax + bx) / 2 - n1x * s1, (ay + by) / 2 - n1y * s1, ax - n1x * W0, ay - n1y * W0);
  for (let i = 0; i < 2; i++) ctx.lineTo(ax + (-n1x * CAPS[i]! - d1x * CAP[i]!) * W0, ay + (-n1y * CAPS[i]! - d1y * CAP[i]!) * W0);
  ctx.closePath();
}

/** A soft round shape: an ellipse as eight quadratic curves (round at any size). As its own subpath. */
export function round(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x + rx, y);
  ctx.quadraticCurveTo(x + rx, y + ry * 0.72, x + rx * 0.7, y + ry * 0.7);
  ctx.quadraticCurveTo(x + rx * 0.4, y + ry, x, y + ry);
  ctx.quadraticCurveTo(x - rx * 0.4, y + ry, x - rx * 0.7, y + ry * 0.7);
  ctx.quadraticCurveTo(x - rx, y + ry * 0.72, x - rx, y);
  ctx.quadraticCurveTo(x - rx, y - ry * 0.72, x - rx * 0.7, y - ry * 0.7);
  ctx.quadraticCurveTo(x - rx * 0.4, y - ry, x, y - ry);
  ctx.quadraticCurveTo(x + rx * 0.4, y - ry, x + rx * 0.7, y - ry * 0.7);
  ctx.quadraticCurveTo(x + rx, y - ry * 0.72, x + rx, y);
  ctx.closePath();
}

/**
 * A disc as its own subpath. Every shape that shares a fill with others winds the same way (the
 * limbs', the torso's and the discs' outlines all run counterclockwise on the screen), so where
 * they overlap in one fill they add up instead of cutting holes in each other.
 */
function disc(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2, true);
}

/** Fill the current path in a color. */
function fillWith(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------------------------------------------------------------- the parts' outlines

/** A limb of the figure from three joints, `w` its half widths (px), grown by g. */
function limbOf(ctx: Ctx, F: Frame, a: number, b: number, c: number, w0: number, w1: number, w2: number, g: number): void {
  limb(ctx, F.x[a]!, F.y[a]!, F.x[b]!, F.y[b]!, F.x[c]!, F.y[c]!, w0, w1, w2, 0.14, g);
}

/** The arm's joints, near or far. */
function armJ(near: boolean): readonly [number, number, number] {
  return near ? [J.shN, J.elbowN, J.handN] : [J.shF, J.elbowF, J.handF];
}

/** The leg's joints, near or far: hip, knee, ankle, heel, toe. */
function legJ(near: boolean): readonly [number, number, number, number, number] {
  return near ? [J.hipN, J.kneeN, J.ankleN, J.heelN, J.toeN] : [J.hipF, J.kneeF, J.ankleF, J.heelF, J.toeF];
}

/** An arm (shoulder to wrist), grown by g. */
function armPath(ctx: Ctx, F: Frame, b: Build, near: boolean, g: number): void {
  const [s, e, h] = armJ(near);
  const k = F.k;
  limbOf(ctx, F, s, e, h, b.arm0 * k, b.arm1 * k, b.arm2 * k, g);
}

/** The hand at the end of an arm: a mitten just past the wrist, grown by g. */
function handPath(ctx: Ctx, F: Frame, b: Build, near: boolean, g: number): void {
  const [, e, h] = armJ(near);
  const hx = F.x[h]!;
  const hy = F.y[h]!;
  const dx = hx - F.x[e]!;
  const dy = hy - F.y[e]!;
  const d = Math.hypot(dx, dy) || 1;
  const r = b.hand * F.k;
  disc(ctx, hx + (dx / d) * r * 0.45, hy + (dy / d) * r * 0.45, r + g);
}

/** A short sleeve over the top of an arm (or shorts over the top of a leg): `share` of the upper bone from the root, a little fuller than the limb. */
function cuffPath(ctx: Ctx, F: Frame, a: number, b: number, w: number, share: number, g: number): void {
  const ax = F.x[a]!;
  const ay = F.y[a]!;
  const mx = ax + (F.x[b]! - ax) * share;
  const my = ay + (F.y[b]! - ay) * share;
  limb(ctx, ax, ay, (ax + mx) / 2 + 0.01, (ay + my) / 2, mx, my, w * 1.14, w * 1.12, w * 1.1, 0, g);
}

/** A leg (hip to ankle), grown by g. */
function legPath(ctx: Ctx, F: Frame, b: Build, near: boolean, g: number): void {
  const [h, kn, an] = legJ(near);
  const k = F.k;
  limbOf(ctx, F, h, kn, an, b.leg0 * k, b.leg1 * k, b.leg2 * k, g);
}

/** A shoe: a rounded loaf from the heel to the toe on its flat sole, up over the instep to cover the ankle, grown by g. */
function shoePath(ctx: Ctx, F: Frame, b: Build, near: boolean, g: number): void {
  const [, , an, he, to] = legJ(near);
  const h = (b.leg2 * 2.3 + b.ankle * 0.5) * F.k;
  const hx = F.x[he]!;
  const hy = F.y[he]!;
  const tx = F.x[to]!;
  const ty = F.y[to]!;
  const ax = F.x[an]!;
  const ay = F.y[an]!;
  // Along the sole and its normal (up from it, toward the ankle).
  let ux = tx - hx;
  let uy = ty - hy;
  const ul = Math.hypot(ux, uy) || 1e-6;
  ux /= ul;
  uy /= ul;
  let nx = uy;
  let ny = -ux;
  if ((ax - hx) * nx + (ay - hy) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  // Wound like the limbs whichever way the foot points: from the heel's top, back and down round the heel, along the sole, up round the toe, over the instep.
  const cw = ux * ny - uy * nx > 0;
  const pts = SHOE;
  const put = (i: number, x: number, y: number) => {
    pts[i * 2] = x;
    pts[i * 2 + 1] = y;
  };
  put(0, hx + nx * (h * 0.7) - ux * g * 0.3, hy + ny * (h * 0.7) - uy * g * 0.3);
  put(1, hx - ux * (h * 0.35 + g) + nx * h * 0.3, hy - uy * (h * 0.35 + g) + ny * h * 0.3);
  put(2, hx - ux * g - nx * g, hy - uy * g - ny * g);
  put(3, tx + ux * g * 0.3 - nx * g, ty + uy * g * 0.3 - ny * g);
  put(4, tx + ux * (h * 0.3 + g) + nx * h * 0.25, ty + uy * (h * 0.3 + g) + ny * h * 0.25);
  put(5, tx - ux * h * 0.15 + nx * (h * 0.62 + g), ty - uy * h * 0.15 + ny * (h * 0.62 + g));
  put(6, ax + ux * h * 0.35 + nx * (h * 0.55 + g), ay + uy * h * 0.35 + ny * (h * 0.55 + g));
  put(7, ax - ux * h * 0.3 + nx * (h * 0.6 + g), ay - uy * h * 0.3 + ny * (h * 0.6 + g));
  if (cw) {
    ctx.moveTo(pts[14]!, pts[15]!);
    for (let i = 6; i >= 0; i--) ctx.lineTo(pts[i * 2]!, pts[i * 2 + 1]!);
  } else {
    ctx.moveTo(pts[0]!, pts[1]!);
    for (let i = 1; i < 8; i++) ctx.lineTo(pts[i * 2]!, pts[i * 2 + 1]!);
  }
  ctx.closePath();
}
const SHOE = new Float64Array(16);

/** The neck: a short column from the chest up into the head, grown by g. */
function neckPath(ctx: Ctx, F: Frame, b: Build, g: number): void {
  const k = F.k;
  const cx = F.x[J.chest]!;
  const cy = F.y[J.chest]!;
  const hx = F.x[J.head]!;
  const hy = F.y[J.head]!;
  const w = b.arm0 * k * 0.95;
  limb(ctx, cx, cy + w * 0.5, (cx + hx) / 2 + 0.01, (cy + hy) / 2, hx, hy, w, w * 0.95, w * 0.95, 0, g);
}

// ---------------------------------------------------------------- the torso and the clothes

/** Scratch: the torso's axis and its front side. */
const AX = { px: 0, py: 0, ax: 0, ay: 0, nx: 0, ny: 0, len: 0, front: 1 };

/** A point on the torso: `t` up its axis (0 the pelvis, 1 the neck's base), `w` px out on the front (+) or back (-) side. */
const TP: [number, number] = [0, 0];
function tp(t: number, w: number): [number, number] {
  TP[0] = AX.px + AX.ax * AX.len * t + AX.nx * w * AX.front;
  TP[1] = AX.py + AX.ay * AX.len * t + AX.ny * w * AX.front;
  return TP;
}

/** The torso's screen half widths (px) at this view: the shoulders, the chest, the waist, the hips; the chest's and belly's swell in front. */
const TW = { ws: 0, wc: 0, ww: 0, wh: 0, chest: 0, belly: 0 };
function torsoWidths(P: Pose, b: Build, F: Frame): typeof TW {
  const c = Math.abs(Math.cos(P.view));
  const sn = Math.abs(Math.sin(P.view));
  const k = F.k;
  const w = (lat: number, dep: number) => Math.hypot(lat * c, dep * sn) * k;
  const sh = Math.abs(F.x[J.shN]! - F.x[J.shF]!) / 2 + b.arm0 * k * 0.8;
  TW.ws = Math.max(w(b.chestW, b.depth), sh);
  TW.wc = w(b.chestW, b.depth * 1.02);
  TW.ww = w(b.waistW, b.depth * 0.92);
  TW.wh = w(b.hipW, b.depth * 1.05);
  TW.chest = b.bust * sn * k;
  TW.belly = b.belly * sn * k;
  return TW;
}

/** Sets the torso's axis from the pelvis to the neck's base, its front toward the way the body faces. */
function axis(F: Frame, P: Pose): void {
  const px = F.x[J.pelvis]!;
  const py = F.y[J.pelvis]!;
  const dx = F.x[J.chest]! - px;
  const dy = F.y[J.chest]! - py;
  const len = Math.hypot(dx, dy) || 1e-6;
  AX.px = px;
  AX.py = py;
  AX.ax = dx / len;
  AX.ay = dy / len;
  AX.len = len;
  AX.nx = -AX.ay;
  AX.ny = AX.ax;
  AX.front = Math.sin(P.view) >= 0 ? F.dir : -F.dir;
}

/**
 * The torso's outline as its own subpath: rounded shoulders, the back down to the waist and out
 * over the hips, round under the seat, up the front over the belly and the chest. `inset` (0..1)
 * shrinks it toward the light (lx, ly px) for its lit body; `g` grows it for its line.
 */
function torsoPath(ctx: Ctx, w: typeof TW, inset: number, lx: number, ly: number, g: number): void {
  const k = 1 - inset * 0.24;
  const ox = lx * inset;
  const oy = ly * inset;
  const gt = g / Math.max(1, AX.len);
  const top = 1.0 - inset * 0.05 + gt;
  const bot = -0.14 + inset * 0.08 - gt;
  const ws = w.ws * k + g;
  const wc = w.wc * k + g;
  const ww = w.ww * k + g;
  const wh = w.wh * k + g;
  const chest = w.chest * k;
  const belly = w.belly * k;
  // The outline as a start and eight curves (control, end), up the axis by t and out to the side by w.
  const T = TORSO_T;
  T[0] = top;
  T[1] = -ws * 0.5;
  const seg = [
    [top + 0.04, -ws * 1.02, 0.84, -ws],
    [0.6, -wc, 0.42, -ww],
    [0.16, -wh * 1.04, 0.02, -wh],
    [bot, -wh * 0.95, bot, 0],
    [bot, wh * 0.95, 0.02, wh],
    [0.24, ww + belly * 1.3, 0.44, ww + belly],
    [0.66, wc + chest * 1.4, 0.84, ws],
    [top + 0.04, ws * 1.02, top, ws * 0.5],
  ] as const;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) T[2 + i * 4 + j] = seg[i]![j]!;
  // Wound counterclockwise on the screen whichever way the figure faces (a mirrored torso is traced backwards).
  const fwd = AX.front * (AX.ay < 0 ? 1 : -1) > 0;
  const at = (t: number, ww2: number) => {
    const p = tp(t, ww2);
    return [p[0] + ox, p[1] + oy] as const;
  };
  if (fwd) {
    const [sx, sy] = at(T[0]!, T[1]!);
    ctx.moveTo(sx, sy);
    for (let i = 0; i < 8; i++) {
      const [cx, cy] = at(T[2 + i * 4]!, T[3 + i * 4]!);
      const [ex, ey] = at(T[4 + i * 4]!, T[5 + i * 4]!);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
    }
  } else {
    const [sx, sy] = at(T[2 + 7 * 4 + 2]!, T[2 + 7 * 4 + 3]!);
    ctx.moveTo(sx, sy);
    for (let i = 7; i >= 0; i--) {
      const [cx, cy] = at(T[2 + i * 4]!, T[3 + i * 4]!);
      const [ex, ey] = i > 0 ? at(T[2 + (i - 1) * 4 + 2]!, T[2 + (i - 1) * 4 + 3]!) : at(T[0]!, T[1]!);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
    }
  }
  ctx.closePath();
}
const TORSO_T = new Float64Array(34);

/** The skirt's hem and waist (px), worked out from the pose for its outline and its fill. */
const SK = { left: 0, right: 0, wy: 0, hl: 0, hr: 0, hy: 0, sway: 0, k: 0 };
function skirtShape(P: Pose, b: Build, F: Frame, hem: number, flow: number, swing: number): typeof SK {
  axis(F, P);
  const w = torsoWidths(P, b, F);
  const k = F.k;
  const hipY = F.y[J.pelvis]!;
  const ankle = Math.max(F.y[J.ankleN]!, F.y[J.ankleF]!);
  const x0 = Math.min(F.x[J.kneeN]!, F.x[J.kneeF]!, F.x[J.pelvis]!);
  const x1 = Math.max(F.x[J.kneeN]!, F.x[J.kneeF]!, F.x[J.pelvis]!);
  const flare = w.wh * (1.1 + hem * 0.55);
  const mid = (x0 + x1) / 2;
  const half = Math.max(flare, (x1 - x0) / 2 + b.leg1 * k * 1.2);
  const back = -F.dir * flow * k * 0.005;
  SK.sway = swing * k * 0.004;
  const [ax1, ay1] = tp(0.42, -w.ww);
  const [ax2, ay2] = tp(0.42, w.ww + w.belly * 0.7);
  SK.left = Math.min(ax1, ax2);
  SK.right = Math.max(ax1, ax2);
  SK.wy = (ay1 + ay2) / 2;
  SK.hy = hipY + (ankle - hipY) * hem;
  SK.hl = mid - half + back + SK.sway;
  SK.hr = mid + half + back * 0.4 + SK.sway;
  SK.k = k;
  return SK;
}

/** A skirt from the waist to its scalloped hem, grown by g. */
function skirtPath(ctx: Ctx, swing: number, g: number): void {
  const { left, right, wy, hl, hr, hy, k } = SK;
  ctx.moveTo(left - g, wy - g);
  ctx.quadraticCurveTo(left - (right - left) * 0.08 - g, (wy + hy) / 2, hl - g, hy + g);
  for (let i = 0; i < 3; i++) {
    const xa = hl + ((hr - hl) * (i + 0.5)) / 3;
    const xb = hl + ((hr - hl) * (i + 1)) / 3;
    ctx.quadraticCurveTo(xa, hy + g + k * 0.003 * (i % 2 ? -0.3 : 1) + swing * k * 0.0015, i === 2 ? xb + g : xb, hy + g);
  }
  ctx.quadraticCurveTo(right + (right - left) * 0.08 + g, (wy + hy) / 2, right + g, wy - g);
  ctx.closePath();
}

// ---------------------------------------------------------------- the head

/** A feature on the head at (l across, f forward of its center, y down; in head radii), as seen: its screen x, y, and how much it faces us. */
const FEAT = { x: 0, y: 0, z: 0 };
function feature(P: Pose, F: Frame, hx: number, hy: number, r: number, l: number, f: number, y: number): typeof FEAT {
  const c = Math.cos(P.face);
  const sn = Math.sin(P.face);
  const ct = Math.cos(P.tilt);
  const st = Math.sin(P.tilt);
  const x = (l * c + f * sn) * r * F.dir;
  const yy = y * r;
  FEAT.x = hx + x * ct - yy * st;
  FEAT.y = hy + x * st + yy * ct;
  FEAT.z = f * c - l * sn;
  return FEAT;
}

/** The head's own outline: round, the chin a little forward in profile; the nose a soft bump past it when the face is turned. Grown by g. */
function headPath(ctx: Ctx, F: Frame, hx: number, hy: number, r: number, lod: number, g: number): void {
  const s = F.side;
  const fd = F.fd;
  disc(ctx, hx + fd * s * r * 0.04, hy + r * 0.02, r * 1.02 + g);
  if (lod > 0 && s > 0.45) disc(ctx, hx + fd * r * (0.86 + 0.14 * s), hy + r * 0.12, r * 0.2 + g);
}

/** The hair's cap: where it meets the face, as screen angles (radians, from straight up, clockwise). */
function capAngles(F: Frame, front: number): readonly [number, number] {
  const s = F.side;
  return [(1.75 - 0.95 * s) * F.fd, (-1.75 - (0.8 + front) * s) * F.fd];
}

/** The hair that hangs behind the head (a ponytail, long hair, a bun, pigtails), swinging a moment behind the head; grown by g. Returns whether there is any. */
function hairBackPath(ctx: Ctx, P: Pose, F: Frame, look: Look, hx: number, hy: number, r: number, g: number): boolean {
  const style = look.style;
  const fd = F.fd;
  const s = F.side;
  const swingX = -P.lagX * F.k * 1.4;
  const swingY = -P.lagY * F.k * 0.8;
  const wind = P.wind * r * 0.6;
  if (style === "pony") {
    const bx = hx - fd * r * (0.55 + 0.35 * s);
    const by = hy - r * 0.55;
    const tx = bx - fd * r * (0.5 + 0.4 * s) + swingX - fd * wind;
    const ty = by + r * 1.5 + swingY;
    ctx.moveTo(bx - r * 0.24 - g, by - r * 0.1 - g);
    ctx.quadraticCurveTo(tx - fd * r * 0.4 - g, (by + ty) / 2, tx, ty + g);
    ctx.quadraticCurveTo(bx + fd * r * 0.05 + swingX * 0.4 + g, (by + ty) / 2, bx + r * 0.24 + g, by + r * 0.15);
    ctx.closePath();
    return true;
  }
  if (style === "long") {
    const sw = swingX * 0.6 - fd * wind;
    ctx.moveTo(hx - r * 1.02 - g, hy - r * 0.2);
    ctx.quadraticCurveTo(hx - r * 1.12 + sw - g, hy + r * 1.2, hx - r * 0.6 - fd * r * 0.3 * s + sw, hy + r * 1.75 + g);
    ctx.lineTo(hx + r * 0.6 - fd * r * 0.5 * s + sw, hy + r * 1.7 + g);
    ctx.quadraticCurveTo(hx + r * 1.1 - fd * r * 0.6 * s + sw + g, hy + r * 1.1, hx + r * 1.02 - fd * r * 0.9 * s + g, hy - r * 0.2);
    ctx.closePath();
    return true;
  }
  if (style === "bun") {
    disc(ctx, hx - fd * r * 0.62 * s, hy - r * (0.85 - 0.25 * s), r * 0.42 + g);
    return true;
  }
  if (style === "pigtails") {
    for (const e of [-1, 1]) {
      const p = feature(P, F, hx, hy, r, e * 0.95, -0.2, 0.15);
      if (p.z < -0.6 && s > 0.6) continue;
      const px = p.x;
      const py = p.y;
      const tx = px + e * F.dir * Math.cos(P.face) * r * 0.25 + swingX * 0.8 - fd * wind;
      const ty = py + r * 0.9 + swingY;
      ctx.moveTo(px, py - r * 0.2 - g);
      ctx.quadraticCurveTo(tx + r * 0.4 + g, (py + ty) / 2, tx, ty + g);
      ctx.quadraticCurveTo(tx - r * 0.4 - g, (py + ty) / 2, px, py - r * 0.2 - g);
      ctx.closePath();
    }
    return true;
  }
  return false;
}

/** The hair on the head: a cap over its top and back meeting the face along the hairline, its fringe; grown by g. Returns whether there is any. */
function hairCapPath(ctx: Ctx, P: Pose, F: Frame, look: Look, hx: number, hy: number, r: number, g: number): boolean {
  const style = look.style;
  if (style === "none") return false;
  const fd = F.fd;
  const s = F.side;
  const back = Math.cos(P.face) < 0;
  if (style === "fringe") {
    // Thinning on top: a band round the back of the head, ear to ear.
    const [, a2] = capAngles(F, 0.2);
    const lo = a2 + fd * 0.3;
    const hi = a2 + fd * 1.25;
    ctx.moveTo(hx + Math.sin(lo) * (r * 1.04 + g), hy - Math.cos(lo) * (r * 1.04 + g));
    ctx.arc(hx, hy, r * 1.04 + g, lo - Math.PI / 2, hi - Math.PI / 2, fd < 0);
    ctx.arc(hx - fd * r * 0.1, hy + r * 0.05, Math.max(0, r * 0.72 - g), hi - Math.PI / 2, lo - Math.PI / 2, fd > 0);
    ctx.closePath();
    return true;
  }
  const fat = style === "curls" ? 1.14 : style === "bob" ? 1.1 : 1.06;
  const [a1, a2] = capAngles(F, style === "bob" || style === "long" ? 0.35 : 0);
  const cx = hx - fd * r * 0.04 * s;
  const cy = hy - r * 0.04;
  const R = r * fat + g;
  ctx.moveTo(cx + Math.sin(a1) * R, cy - Math.cos(a1) * R);
  ctx.arc(cx, cy, R, a1 - Math.PI / 2, a2 - Math.PI / 2, fd > 0);
  const e1x = cx + Math.sin(a1) * R;
  const e1y = cy - Math.cos(a1) * R;
  const e2x = cx + Math.sin(a2) * R;
  if (back) {
    ctx.closePath();
  } else if (style === "bob" || style === "long") {
    // Down past the jaw, then the fringe straight across the forehead.
    ctx.lineTo(e2x - fd * r * 0.05, hy + r * 0.55 + g);
    ctx.quadraticCurveTo(hx + fd * r * (0.15 + 0.25 * s), hy - r * 0.2 + g, hx + fd * r * (0.2 + 0.7 * s), hy - r * 0.45 + g);
    ctx.quadraticCurveTo(e1x, e1y + r * 0.1, e1x, e1y);
    ctx.closePath();
  } else {
    // The hairline: from the nape back up past the ear to the forehead, a fringe swept over it.
    const sweep = style === "side" ? 0.22 : 0.1;
    ctx.quadraticCurveTo(hx - fd * r * (0.1 + 0.15 * s), hy + r * 0.1 + g, hx + fd * r * (0.1 + 0.55 * s) - r * sweep * fd, hy - r * (0.36 - 0.1 * s) + g);
    ctx.quadraticCurveTo(hx + fd * r * (0.45 * s), hy - r * 0.72 + g, e1x, e1y);
    ctx.closePath();
  }
  return true;
}

/** Facial hair in the hair's color: a mustache, a goatee. */
function facialHair(ctx: Ctx, P: Pose, F: Frame, look: Look, hx: number, hy: number, r: number): boolean {
  let any = false;
  if (look.mustache) {
    const p = feature(P, F, hx, hy, r, 0, 0.95, 0.3);
    if (p.z > 0) {
      const w = r * 0.28 * Math.min(1, p.z + 0.4);
      ctx.moveTo(p.x + w, p.y);
      ctx.ellipse(p.x, p.y, w, r * 0.1, 0, 0, Math.PI * 2);
      any = true;
    }
  }
  if (look.beard) {
    const p = feature(P, F, hx, hy, r, 0, 0.82, 0.88);
    ctx.moveTo(p.x - r * 0.24, p.y - r * 0.2);
    ctx.quadraticCurveTo(p.x, p.y - r * 0.05, p.x + r * 0.24, p.y - r * 0.2);
    ctx.quadraticCurveTo(p.x + r * 0.08, p.y + r * 0.3, p.x + F.fd * r * 0.06, p.y + r * 0.5);
    ctx.quadraticCurveTo(p.x - r * 0.08, p.y + r * 0.3, p.x - r * 0.24, p.y - r * 0.2);
    ctx.closePath();
    any = true;
  }
  return any;
}

/** The face's marks, all in the line's ink in one fill: eyes (blinking, narrowed as they turn), brows, the mouth (a smile, a grin, an "o"). */
function featuresPath(ctx: Ctx, P: Pose, F: Frame, hx: number, hy: number, r: number, lod: number): void {
  const shut = Math.max(P.blink, P.mouth > 0.7 ? (P.mouth - 0.7) * 1.2 : 0);
  for (const e of [-1, 1]) {
    const p = feature(P, F, hx, hy, r, e * 0.36, 0.9, -0.04);
    if (p.z < 0.12) continue;
    const ex = r * 0.14 * Math.min(1, p.z + 0.15);
    const ey = Math.max(r * 0.04, r * 0.19 * (1 - shut));
    ctx.moveTo(p.x + ex, p.y);
    ctx.ellipse(p.x, p.y, ex, ey, 0, 0, Math.PI * 2);
    if (lod > 1) {
      // A brow: a little arched sliver over the eye, lifted with surprise or joy.
      const q = feature(P, F, hx, hy, r, e * 0.37, 0.88, -0.38 - P.brow * 0.12);
      const w = r * 0.17 * Math.min(1, q.z + 0.1);
      ctx.moveTo(q.x - w, q.y + r * 0.03);
      ctx.quadraticCurveTo(q.x, q.y - r * 0.09, q.x + w, q.y + r * 0.03);
      ctx.quadraticCurveTo(q.x, q.y - r * 0.02, q.x - w, q.y + r * 0.03);
      ctx.closePath();
    }
  }
  const m = feature(P, F, hx, hy, r, 0, 0.93, 0.42);
  if (m.z <= 0.05) return;
  const mw = r * 0.26 * Math.min(1, m.z + 0.25);
  if (P.puff > 0.3) {
    disc(ctx, m.x, m.y, r * 0.07);
  } else if (P.mouth > 0.35) {
    // An open grin.
    const open = r * 0.2 * P.mouth;
    ctx.moveTo(m.x - mw, m.y - r * 0.03);
    ctx.quadraticCurveTo(m.x, m.y + open * 2.2, m.x + mw, m.y - r * 0.03);
    ctx.closePath();
  } else {
    // A smile: a thin crescent.
    const lift = r * (0.08 + P.mouth * 0.2);
    const w = Math.max(r * 0.05, F.kw * 0.35);
    ctx.moveTo(m.x - mw, m.y - r * 0.04);
    ctx.quadraticCurveTo(m.x, m.y + lift + w, m.x + mw, m.y - r * 0.04);
    ctx.quadraticCurveTo(m.x, m.y + lift - w, m.x - mw, m.y - r * 0.04);
    ctx.closePath();
  }
}

/** Rosy cheeks (puffed out on a horn player). */
function cheeksPath(ctx: Ctx, P: Pose, F: Frame, hx: number, hy: number, r: number): void {
  for (const e of [-1, 1]) {
    const p = feature(P, F, hx, hy, r, e * 0.5, 0.78, 0.32);
    if (p.z <= 0.15) continue;
    const rx = r * 0.2 * Math.min(1, p.z + 0.2) * (1 + P.puff * 0.6);
    ctx.moveTo(p.x + rx, p.y);
    ctx.ellipse(p.x, p.y, rx, r * 0.15 * (1 + P.puff * 0.5), 0, 0, Math.PI * 2);
  }
}

// ---------------------------------------------------------------- the whole figure

/** Hooks for what a figure carries or wears over its clothes: behind it all, over the torso (before the near arm), over everything. */
export interface Hooks {
  back?: (ctx: Ctx, F: Frame) => void;
  body?: (ctx: Ctx, F: Frame) => void;
  front?: (ctx: Ctx, F: Frame) => void;
  /** Over the head: a hat, drawn after the hair. */
  hat?: (ctx: Ctx, F: Frame) => void;
}

/** Options for painting: skip the legs (a figure behind a counter or in a truck); the far arm in front of the body (reaching across it, to a drum or a pole); the near arm over the head; the skirt's flow and swing. */
export interface Paint {
  lod: number;
  legs?: boolean;
  farFront?: boolean;
  nearLast?: boolean;
  flow?: number;
  swing?: number;
}

/** An arm in its colors: the sleeve (or the bare arm), a short sleeve's cuff over it, the hand; crossing the body, its own line first (an ink fill under it). */
function armPaint(ctx: Ctx, F: Frame, b: Build, look: Look, near: boolean, crosses: boolean): void {
  const k = F.k;
  const sleeve = near ? look.top.body : mixShade(look.top);
  const skin = near ? look.skin.body : look.skin.shade;
  if (crosses) {
    ctx.beginPath();
    armPath(ctx, F, b, near, F.kw * 0.5);
    fillWith(ctx, INK);
  }
  // A bare arm and its hand are one skin: one fill.
  const bare = look.sleeves !== "long" && !look.gloves;
  ctx.beginPath();
  armPath(ctx, F, b, near, 0);
  if (bare) handPath(ctx, F, b, near, 0);
  fillWith(ctx, look.sleeves === "long" ? sleeve : skin);
  if (look.sleeves === "short") {
    const [s, e] = armJ(near);
    ctx.beginPath();
    cuffPath(ctx, F, s, e, b.arm0 * k, 0.55, 0);
    fillWith(ctx, sleeve);
  }
  if (!bare) {
    ctx.beginPath();
    handPath(ctx, F, b, near, 0);
    fillWith(ctx, look.gloves ?? skin);
  }
}

/** The far side's sleeve: a step darker than the shade, so it parts from the torso's shade behind it. */
const DARKER = new Map<string, string>();
function mixShade(c: Shades): string {
  let d = DARKER.get(c.shade);
  if (!d) {
    const n = parseInt(c.shade.slice(1, 7), 16);
    const f = (v: number) => Math.round(v * 0.86);
    d = `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
    DARKER.set(c.shade, d);
  }
  return d;
}

/**
 * Paints a posed figure: its ground point at (x, y) px, k px a u, facing screen right (dir 1) or
 * left (-1); a fine line `kw` px (0: none). Back to front: what it carries behind; the line, as
 * one ink fill of the whole silhouette; the hair behind the head; the far arm and leg in their
 * shades; the near leg; the shoes; the skirt; the neck and the head's shaded side; the torso,
 * shaded, and its lit side; what it wears over it; the near arm; the head's lit side, the face,
 * the cheeks, the hair; the hat; what it holds in front.
 */
export function figure(ctx: Ctx, P: Pose, b: Build, look: Look, x: number, y: number, k: number, dir: 1 | -1, kw: number, opt: Paint, hooks: Hooks = {}): Frame {
  const F = project(P, b, x, y, k, dir, kw);
  const lod = opt.lod;
  const g = kw * 0.5;
  const legs = opt.legs !== false;
  const skirted = look.legs === "skirt" || look.legs === "dress";
  const hx = F.x[J.head]!;
  const hy = F.y[J.head]!;
  const r = F.headR;
  if (skirted) skirtShape(P, b, F, look.hem ?? 0.6, opt.flow ?? 0, opt.swing ?? 0);
  hooks.back?.(ctx, F);
  if (lod <= 0) {
    flat(ctx, P, b, look, F, legs, skirted, opt, hooks);
    return F;
  }
  // The line: the whole silhouette, grown, in one ink fill.
  if (kw > 0) {
    // (The far arm and leg, in their shades behind the body, go without it: their shade parts them from the near ones.)
    ctx.beginPath();
    armPath(ctx, F, b, true, g);
    if (legs) legPath(ctx, F, b, true, g);
    if (skirted) skirtPath(ctx, opt.swing ?? 0, g);
    axis(F, P);
    torsoPath(ctx, torsoWidths(P, b, F), 0, 0, 0, g);
    headPath(ctx, F, hx, hy, r, 0, g);
    fillWith(ctx, INK);
    // The hair's outline on its own (its curves wind either way).
    ctx.beginPath();
    const back = hairBackPath(ctx, P, F, look, hx, hy, r, g);
    if (back) fillWith(ctx, INK);
    ctx.beginPath();
    if (hairCapPath(ctx, P, F, look, hx, hy, r, g)) fillWith(ctx, INK);
  }
  // The hair behind the head.
  ctx.beginPath();
  if (hairBackPath(ctx, P, F, look, hx, hy, r, 0)) fillWith(ctx, look.hair);
  // The far arm behind the body (unless it reaches across it), the legs, the shoes.
  const turned = Math.abs(Math.sin(P.view)) > 0.25;
  const farBehind = turned && !opt.farFront;
  if (farBehind) armPaint(ctx, F, b, look, false, false);
  if (legs) {
    const covered = look.legs === "trousers";
    ctx.beginPath();
    legPath(ctx, F, b, false, 0);
    fillWith(ctx, covered ? look.lower.shade : look.skin.shade);
    ctx.beginPath();
    legPath(ctx, F, b, true, 0);
    fillWith(ctx, covered ? look.lower.body : look.skin.body);
    if (look.legs === "shorts") {
      ctx.beginPath();
      for (const near of [false, true]) {
        const [h, kn] = legJ(near);
        cuffPath(ctx, F, h, kn, b.leg0 * k, look.hem ?? 0.55, 0);
      }
      fillWith(ctx, look.lower.body);
    }
    ctx.beginPath();
    shoePath(ctx, F, b, false, 0);
    shoePath(ctx, F, b, true, 0);
    fillWith(ctx, look.shoes);
  }
  if (skirted) {
    const c = look.legs === "dress" ? look.top : look.lower;
    ctx.beginPath();
    skirtPath(ctx, opt.swing ?? 0, 0);
    fillWith(ctx, c.body);
    if (lod > 1) {
      // Folds: soft shaded lines from the waist toward the hem.
      ctx.strokeStyle = c.shade;
      ctx.lineWidth = Math.max(0.8, kw * 0.9);
      ctx.beginPath();
      for (const q of [0.38, 0.68]) {
        const xa = SK.left + (SK.right - SK.left) * q;
        const xb = SK.hl + (SK.hr - SK.hl) * (q + 0.04 * (opt.swing ?? 0));
        ctx.moveTo(xa, SK.wy + (SK.hy - SK.wy) * 0.25);
        ctx.quadraticCurveTo((xa + xb) / 2 + SK.sway, (SK.wy + SK.hy) / 2, xb, SK.hy - k * 0.002);
      }
      ctx.stroke();
    }
  }
  // The neck and the head's shaded side.
  ctx.beginPath();
  neckPath(ctx, F, b, 0);
  headPath(ctx, F, hx, hy, r, lod, 0);
  fillWith(ctx, lod > 0 ? look.skin.shade : look.skin.body);
  // The torso: shaded, then its lit side toward the sun.
  axis(F, P);
  const w = torsoWidths(P, b, F);
  ctx.beginPath();
  torsoPath(ctx, w, 0, 0, 0, 0);
  fillWith(ctx, lod > 0 ? look.top.shade : look.top.body);
  if (lod > 0) {
    ctx.beginPath();
    torsoPath(ctx, w, 1, -w.wc * 0.2, -w.wc * 0.12, 0);
    fillWith(ctx, look.top.body);
  }
  hooks.body?.(ctx, F);
  if (!farBehind) armPaint(ctx, F, b, look, false, kw > 0);
  if (!opt.nearLast) armPaint(ctx, F, b, look, true, kw > 0 && lod > 0);
  // The head's lit side, the cheeks, the face, the hair over it.
  if (lod > 0) {
    ctx.beginPath();
    disc(ctx, hx - r * 0.1 + F.fd * F.side * r * 0.04, hy - r * 0.08, r * 0.86);
    if (F.side > 0.45) disc(ctx, hx + F.fd * r * (0.81 + 0.14 * F.side), hy + r * 0.1, r * 0.16);
    fillWith(ctx, look.skin.body);
  }
  const facing = Math.cos(P.face) > -0.3;
  if (facing && lod > 0 && (look.cheeks ?? 1) > 0) {
    ctx.beginPath();
    cheeksPath(ctx, P, F, hx, hy, r);
    ctx.globalAlpha = 0.38 * (look.cheeks ?? 1);
    fillWith(ctx, BLUSH);
    ctx.globalAlpha = 1;
  }
  if (facing) {
    ctx.beginPath();
    featuresPath(ctx, P, F, hx, hy, r, lod);
    fillWith(ctx, INK);
  }
  ctx.beginPath();
  const capped = hairCapPath(ctx, P, F, look, hx, hy, r, 0);
  const whiskers = facing && facialHair(ctx, P, F, look, hx, hy, r);
  if (capped || whiskers) fillWith(ctx, look.hair);
  if (look.ribbon && (look.style === "pony" || look.style === "pigtails")) ribbons(ctx, P, F, look, hx, hy, r);
  hooks.hat?.(ctx, F);
  if (opt.nearLast) armPaint(ctx, F, b, look, true, kw > 0);
  hooks.front?.(ctx, F);
  return F;
}

/**
 * A far figure (the crowd along Main Street): the same pose in flat colors, a part to a fill and
 * no line, as the far layers are painted: the legs and shoes, the skirt, the arms and the hands,
 * the torso, the head and neck, the face's marks, the hair.
 */
function flat(ctx: Ctx, P: Pose, b: Build, look: Look, F: Frame, legs: boolean, skirted: boolean, opt: Paint, hooks: Hooks): void {
  const hx = F.x[J.head]!;
  const hy = F.y[J.head]!;
  const r = F.headR;
  ctx.beginPath();
  if (hairBackPath(ctx, P, F, look, hx, hy, r, 0)) fillWith(ctx, look.hair);
  if (legs) {
    ctx.beginPath();
    legPath(ctx, F, b, false, 0);
    legPath(ctx, F, b, true, 0);
    fillWith(ctx, look.legs === "trousers" ? look.lower.body : look.skin.body);
    ctx.beginPath();
    shoePath(ctx, F, b, false, 0);
    shoePath(ctx, F, b, true, 0);
    fillWith(ctx, look.shoes);
  }
  if (skirted) {
    ctx.beginPath();
    skirtPath(ctx, opt.swing ?? 0, 0);
    fillWith(ctx, (look.legs === "dress" ? look.top : look.lower).body);
  }
  ctx.beginPath();
  neckPath(ctx, F, b, 0);
  headPath(ctx, F, hx, hy, r, 0, 0);
  handPath(ctx, F, b, false, 0);
  handPath(ctx, F, b, true, 0);
  if (look.sleeves !== "long") {
    armPath(ctx, F, b, false, 0);
    armPath(ctx, F, b, true, 0);
  }
  fillWith(ctx, look.skin.body);
  // The torso and its sleeves in one fill (they wind the same way).
  axis(F, P);
  ctx.beginPath();
  torsoPath(ctx, torsoWidths(P, b, F), 0, 0, 0, 0);
  if (look.sleeves === "long") {
    armPath(ctx, F, b, false, 0);
    armPath(ctx, F, b, true, 0);
  } else if (look.sleeves === "short") {
    cuffPath(ctx, F, J.shF, J.elbowF, b.arm0 * F.k, 0.55, 0);
    cuffPath(ctx, F, J.shN, J.elbowN, b.arm0 * F.k, 0.55, 0);
  }
  fillWith(ctx, look.top.body);
  if (look.gloves) {
    ctx.beginPath();
    handPath(ctx, F, b, false, 0);
    handPath(ctx, F, b, true, 0);
    fillWith(ctx, look.gloves);
  }
  hooks.body?.(ctx, F);
  const facing = Math.cos(P.face) > -0.3;
  if (facing) {
    ctx.beginPath();
    featuresPath(ctx, P, F, hx, hy, r, 0);
    fillWith(ctx, INK);
  }
  ctx.beginPath();
  const capped = hairCapPath(ctx, P, F, look, hx, hy, r, 0);
  const whiskers = facing && facialHair(ctx, P, F, look, hx, hy, r);
  if (capped || whiskers) fillWith(ctx, look.hair);
  hooks.hat?.(ctx, F);
  hooks.front?.(ctx, F);
}

/** The ribbons on a ponytail or pigtails. */
function ribbons(ctx: Ctx, P: Pose, F: Frame, look: Look, hx: number, hy: number, r: number): void {
  ctx.fillStyle = look.ribbon!;
  ctx.beginPath();
  if (look.style === "pony") {
    const bx = hx - F.fd * r * (0.62 + 0.35 * F.side);
    const by = hy - r * 0.5;
    ctx.moveTo(bx + r * 0.04, by);
    ctx.ellipse(bx - r * 0.18, by, r * 0.22, r * 0.14, 0.5, 0, Math.PI * 2);
    ctx.moveTo(bx + r * 0.4, by);
    ctx.ellipse(bx + r * 0.18, by, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
  } else {
    for (const e of [-1, 1]) {
      const p = feature(P, F, hx, hy, r, e * 0.98, -0.2, 0.32);
      if (p.z < -0.6 && F.side > 0.6) continue;
      ctx.moveTo(p.x + r * 0.18, p.y);
      ctx.ellipse(p.x, p.y, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/** A joint's screen place, as painted last. */
export function spot(F: Frame, i: number): readonly [number, number] {
  return [F.x[i]!, F.y[i]!];
}

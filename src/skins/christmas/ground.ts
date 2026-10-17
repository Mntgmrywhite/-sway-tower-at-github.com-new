import { hash, ink, outlined, type Ctx } from "../../base/draw";
import { fieldY, layerGround, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { INK, SNOW, SNOW_DEEP, SNOW_SHADE } from "./colors";
import { carriage, RIG_LENGTH } from "./carriage";
import { countingHouse, HOUSE_W, type HouseFrame, poulterer, terrace, TERRACES, terraceReach } from "./houses";
import { carolers, lamplighter, lighterReach } from "./people";
import { mound, sparklePath } from "./shapes";
import { snow } from "./sky";
import { cobbles, gasLamp, LADDER_BAR, LAMP_BURNER, pigeon, PIGEONS, ruts } from "./street";

// The street around the tower, back to front: snowy cobbles, the two townhouses framing the
// scene, a gas lamp at each side, pigeons pecking in front of the tower, the lamplighter
// (left) and the carolers (right), and the carriage loping round the tower: past it nearest
// the viewer, round the corner, and back the other way further up the street, behind the
// townsfolk and low behind the tower's base.
// Each prop stands on a field row at depth z (z = TOWER_DEPTH is the tower's line; smaller z
// is nearer, lower and larger). Positions are `dx` in units at that depth from the center
// line. Anything rising above the tower's floor line stays outside the tower's column
// (|screen x - center| >= 0.25u), and anything in the column stays below the floor line: all
// but the carriage on its way back, whose coachman's hat and horse's ears pass low behind the
// base block, never above its top (lap.test.ts).

/** Pixels per unit at depth z. */
function unit(s: Scene, z: number): number {
  return (s.u * TOWER_DEPTH) / z;
}

/** Screen x of a spot `dx` units from the center line, on row z. */
function rowX(s: Scene, dx: number, z: number): number {
  return s.cssW / 2 + dx * unit(s, z);
}

function lineW(s: Scene, k = 1): number {
  return Math.max(1.5, s.u * 0.0062 * k);
}

const HOUSE_Z = 3.5;
/**
 * Each house's foot runs from HOUSE_IN to HOUSE_OUT units off center (at HOUSE_Z): the inner
 * eaves stay clear of the tower's column, and the outer eaves, leaning out, stay on screen.
 */
const HOUSE_IN = 0.304;
const HOUSE_OUT = HOUSE_IN + HOUSE_W;
const LAMP_Z = 2.3;
/** Lamps stand just inside the screen edges, in front of the houses' plain outer walls. */
const LAMP_SCREEN_X = 0.46;
const FOLK_Z = 1.8;
/** Townsfolk are modelled at full size and drawn at this scale, in proportion to the doors. */
const FOLK_SCALE = 0.8;
/** The carriage track nearest the viewer, where it passes in front. */
const CART_Z = 1.55;
/**
 * The lane it lopes back along, further up the street: behind the townsfolk, in front of the
 * pigeons and the lamps. As far back as the street allows: the rig's top (0.13 units) stays
 * under the base block's top where it passes behind the tower (from 2.05 back it would show
 * above it).
 */
const BACK_Z = 1.95;
/** Seconds for the pass in front, from the left edge to gone at the right. */
const FRONT_TIME = 4.8;
/** Seconds round the corner out of view, at each end of the street. */
const TURN_TIME = 1.2;
/** Seconds for the pass back, right to left: the same pace over the longer row further back. */
const BACK_TIME = 5.6;
/** One lap round the tower: in front left to right, round, back right to left, round again. */
export const CART_LAP = FRONT_TIME + TURN_TIME + BACK_TIME + TURN_TIME;
/**
 * How far across the front pass is at s.t = 0: the horse is just coming in at the left. It
 * passes in front of the tower at 2.1 s, lopes behind it on the way back at 8.5 s and is round
 * the back and gone by 11.3 s (actions.test.ts, lap.test.ts), then comes round again.
 */
const CART_START = 0.06;

/** Seconds into the lap at time t (0: the front pass coming in at the left edge). */
function lapTime(t: number): number {
  const p = (t + CART_START * FRONT_TIME) % CART_LAP;
  return p < 0 ? p + CART_LAP : p;
}

/**
 * 0..1: how far across the screen the carriage is on its pass in front at time t (0: driving
 * in at the left edge, 0.5: its middle on the tower's line, 1: gone at the right), or -1 while
 * it's elsewhere on its lap.
 */
export function carriageProgress(t: number): number {
  const p = lapTime(t);
  return p < FRONT_TIME ? p / FRONT_TIME : -1;
}

/**
 * 0..1: how far back across the screen the carriage is on its pass behind at time t (0: coming
 * in at the right edge, 0.5: its middle behind the tower, 1: gone at the left), or -1 while
 * it's elsewhere on its lap.
 */
export function carriageBackProgress(t: number): number {
  const p = lapTime(t) - FRONT_TIME - TURN_TIME;
  return p >= 0 && p < BACK_TIME ? p / BACK_TIME : -1;
}

/**
 * Where the carriage is, reused every frame: screen x of its middle and y of its ground line,
 * px per unit at its depth, units travelled (for the wheels and the gait), and whether it's on
 * the pass behind (facing left).
 */
export const CART = { x: 0, y: 0, U: 1, dist: 0, back: false };

/** Updates CART; false while the carriage is out of view, round a corner. */
export function placeCarriage(s: Scene): boolean {
  let k = carriageProgress(s.t);
  const back = k < 0;
  if (back) k = carriageBackProgress(s.t);
  if (k < 0) return false;
  const z = back ? BACK_Z : CART_Z;
  const U = unit(s, z);
  const len = RIG_LENGTH * U;
  const across = -len * 0.55 + (s.cssW + len * 1.1) * k;
  CART.x = back ? s.cssW - across : across;
  CART.y = fieldY(s, z);
  CART.U = U;
  CART.dist = ((back ? -1 : 1) * (CART.x - s.cssW / 2)) / U;
  CART.back = back;
  return true;
}

/** 0..1: how high pigeon i (of PIGEONS) flutters up off the cobbles as the carriage nears it. */
export function pigeonLift(s: Scene, i: number): number {
  if (!placeCarriage(s)) return 0;
  const [z, dx] = PIGEONS[i]!;
  const d = Math.abs(CART.x - rowX(s, dx, z)) / s.u;
  return d < 0.3 ? Math.min(1, (0.3 - d) / 0.12) : 0;
}

/** The carriage, if it's on its pass behind (`back`) or in front. */
export function rig(ctx: Ctx, s: Scene, back: boolean): void {
  if (placeCarriage(s) && CART.back === back) carriage(ctx, CART.x, CART.y, CART.U, lineW(s), CART.dist, s.t, back ? -1 : 1);
}

/** One frame object handed to every house and figure, refilled per call (no allocations). */
const F: HouseFrame = { x: 0, y: 0, U: 1, lw: 1, t: 0 };
function at(x: number, y: number, U: number, lw: number, t: number): HouseFrame {
  F.x = x;
  F.y = y;
  F.U = U;
  F.lw = lw;
  F.t = t;
  return F;
}

/** The street's props, back to front, with the carriage on whichever pass it's on. */
export function props(ctx: Ctx, s: Scene): void {
  street(ctx, s);
  // The carriage on its way back, further up the street: past the lamps and the pigeons, behind
  // the townsfolk, and low behind the tower's base.
  rig(ctx, s, true);
  townsfolk(ctx, s);
  // The carriage on its pass in front, nearest the viewer.
  rig(ctx, s, false);
}

/** Screen x of the left and right gas lamps. */
function lampX(s: Scene, side: -1 | 1): number {
  return s.cssW / 2 + side * LAMP_SCREEN_X * s.u;
}

/** The townhouses, the gas lamps and the pigeons: everything behind the carriage's lane back. */
export function street(ctx: Ctx, s: Scene): void {
  const lw = lineW(s);
  const t = s.t;

  // The townhouses, standing a little behind the tower's line.
  {
    const z = HOUSE_Z;
    const U = unit(s, z);
    const y = fieldY(s, z);
    // More of the street on screens wide enough to show a whole house more.
    for (let k = 0; k < TERRACES.length; k++) {
      const h = TERRACES[k]!;
      const side = k % 2 ? 1 : -1;
      const off = HOUSE_OUT + 0.012 + Math.floor(k / 2) * (HOUSE_W + 0.012);
      const x0 = side > 0 ? rowX(s, off, z) : rowX(s, -off - HOUSE_W, z);
      const reach = terraceReach(h) * U;
      if (x0 - reach < 0 || x0 + HOUSE_W * U + reach > s.cssW) continue;
      terrace(ctx, at(x0, y, U, lw, t), h);
    }
    countingHouse(ctx, at(rowX(s, -HOUSE_OUT, z), y, U, lw, t));
    poulterer(ctx, at(rowX(s, HOUSE_IN, z), y, U, lw, t));
    mound(ctx, rowX(s, -0.47, z), y + U * 0.006, U * 0.13, U * 0.02, lw);
    mound(ctx, rowX(s, 0.49, z), y + U * 0.006, U * 0.12, U * 0.022, lw);
  }

  // Gas lamps; the lamplighter reaches up to the left one now and then.
  const LU = unit(s, LAMP_Z);
  const ly = fieldY(s, LAMP_Z);
  const rightX = lampX(s, 1);
  const leftX = lampX(s, -1);
  gasLamp(ctx, rightX, ly, LU, lw, t, 2.1, 0);
  mound(ctx, rightX, ly + LU * 0.004, LU * 0.048, LU * 0.012, lw);
  const reach = lighterReach(t);
  gasLamp(ctx, leftX, ly, LU, lw, t, 0.4, reach * reach * reach * reach);
  mound(ctx, leftX, ly + LU * 0.004, LU * 0.048, LU * 0.012, lw);

  // Pigeons on the cobbles in front of the tower; they flutter up as the carriage nears.
  for (let i = 0; i < PIGEONS.length; i++) {
    const [z, dx, dir, phase] = PIGEONS[i]!;
    pigeon(ctx, rowX(s, dx, z), fieldY(s, z), unit(s, z), lw * 0.85, dir, t, phase, pigeonLift(s, i));
  }
}

/** The lamplighter at the left lamp and the carolers on the right, between the carriage's lanes. */
export function townsfolk(ctx: Ctx, s: Scene): void {
  const lw = lineW(s);
  const t = s.t;
  const LU = unit(s, LAMP_Z);
  const ly = fieldY(s, LAMP_Z);
  const leftX = lampX(s, -1);
  const burnerY = ly - LAMP_BURNER * LU;
  const fz = FOLK_Z;
  const FU = unit(s, fz) * FOLK_SCALE;
  const fy = fieldY(s, fz);
  lamplighter(ctx, at(rowX(s, -0.236, fz), fy, FU, lw, t), leftX + LU * 0.004, burnerY + LU * 0.03, leftX + LU * 0.016, ly - LADDER_BAR * LU);
  mound(ctx, rowX(s, -0.24, fz), fy + FU * 0.004, FU * 0.08, FU * 0.014, lw);
  carolers(ctx, at(rowX(s, 0.182, fz), fy, FU, lw, t));
  mound(ctx, rowX(s, 0.182, fz) + FU * 0.05, fy + FU * 0.004, FU * 0.17, FU * 0.014, lw);
}

// ---------------------------------------------------------------- snow glints

/** Sparkles on the snow: [depth z, x as a fraction of the half width, phase group]. */
const GLINTS = Array.from({ length: 22 }, (_, i) => [1.3 + hash(i + 2000) * 6, hash(i + 2100) * 2 - 1, i % 3] as const);

/** Tiny four-point glints twinkling on the snow, in three alternating groups. */
function glints(ctx: Ctx, s: Scene): void {
  const cx = s.cssW / 2;
  for (let g = 0; g < 3; g++) {
    const tw = Math.max(0, Math.sin(s.t * 1.9 + g * 2.1));
    if (tw < 0.05) continue;
    ctx.beginPath();
    for (const [z, fx, group] of GLINTS) {
      if (group !== g) continue;
      const y = fieldY(s, z);
      if (y < s.horizonY + 2 || y > s.cssH) continue;
      sparklePath(ctx, cx + fx * cx, y, s.u * 0.011 * Math.min(1.6, TOWER_DEPTH / z) * (0.4 + 0.6 * tw));
    }
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.95 * tw;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Floor layer: cobbles and glints, the street's props while it's in view, and snow over it. */
export function ground(ctx: Ctx, s: Scene): void {
  if (s.horizonY < s.cssH) {
    cobbles(ctx, s);
    ruts(ctx, s);
    glints(ctx, s);
  }
  if (fieldY(s, HOUSE_Z) - s.u * 0.65 < s.cssH) props(ctx, s);
  snow(ctx, s, s.horizonY, s.cssH + s.u * 0.1);
}

// ---------------------------------------------------------------- foreground

const ICICLES = [
  [0.04, 0.034],
  [0.09, 0.022],
  [0.15, 0.03],
  [0.85, 0.026],
  [0.9, 0.036],
  [0.95, 0.022],
] as const;

/** How far the snow hangs over the kerb at lump i: longer drips near the sides, short in the middle. */
function dripDepth(i: number, step: number, w: number, band: number, u: number): number {
  const f = (i * step) / w;
  const side = f < 0.25 || f > 0.75;
  return band + u * (side ? 0.006 + 0.014 * hash(i + 3100) : 0.002 + 0.004 * hash(i + 3100));
}

/**
 * Snow lying on the base's kerb: soft lumps along the top, little drips over the first row of
 * stones (kept short in the middle so "tap to drop" stays clear), and a few icicles near the
 * sides. Drops away with the tiles as you climb.
 */
export function foreground(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = layerGround(s, 1.6) + u * 0.36;
  if (top - u * 0.05 > s.cssH) return;
  const lw = lineW(s);
  const band = u * 0.025;
  const step = u * 0.055;
  const n = Math.ceil(s.cssW / step) + 1;

  // Icicles first, so the snow covers their roots.
  ctx.beginPath();
  for (const [fx, len] of ICICLES) {
    const x = fx * s.cssW;
    const y = top + band + u * 0.004;
    ctx.moveTo(x - u * 0.011, y);
    ctx.lineTo(x, y + len * u);
    ctx.lineTo(x + u * 0.011, y);
    ctx.closePath();
  }
  outlined(ctx, "#e6f1ff", lw * 0.8, INK);

  ctx.beginPath();
  ctx.moveTo(-step, top);
  for (let i = 0; i <= n; i++) {
    const x = i * step;
    const lump = u * (0.012 + 0.012 * hash(i + 3000));
    ctx.quadraticCurveTo(x - step / 2, top - lump * 2, x, top - u * 0.008);
  }
  ctx.lineTo(n * step + step, top - u * 0.008);
  ctx.lineTo(n * step + step, top + band);
  for (let i = n; i >= 0; i--) {
    const x = i * step;
    ctx.quadraticCurveTo(x + step / 2, top + dripDepth(i, step, s.cssW, band, u) + u * 0.008, x, top + band);
  }
  ctx.lineTo(-step, top + band);
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
  ink(ctx, lw, INK);

  // Blue shade dashes along the lumps.
  ctx.beginPath();
  for (let i = 1; i < n; i += 3) {
    const x = i * step + step * 0.2 * hash(i + 3200);
    ctx.moveTo(x - u * 0.012, top + band * 0.45);
    ctx.quadraticCurveTo(x, top + band * 0.75, x + u * 0.014, top + band * 0.4);
  }
  ctx.strokeStyle = SNOW_DEEP;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= n; i += 2) {
    const x = i * step + step * 0.3;
    ctx.moveTo(x - u * 0.016, top + band * 0.15);
    ctx.quadraticCurveTo(x, top - u * 0.004, x + u * 0.016, top + band * 0.15);
  }
  ctx.strokeStyle = SNOW_SHADE;
  ctx.stroke();
}

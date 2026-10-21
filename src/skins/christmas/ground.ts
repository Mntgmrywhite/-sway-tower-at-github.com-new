import { circle, hash, type Ctx } from "../../base/draw";
import { fieldY, layerGround, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { AQUA, BERRY, EVERGREEN, NAVY, SLATE, SNOW, SNOW_SHADE, TEAL, WHITE } from "./colors";
import { carriage, RIG_LENGTH } from "./carriage";
import { countingHouse, HOUSE_W, type HouseFrame, poulterer, terrace, TERRACES, terraceReach } from "./houses";
import { carolers, lamplighter, lighterReach } from "./people";
import { drift, sparklePath } from "./shapes";
import { cobbles, gasLamp, LADDER_BAR, LAMP_BURNER, pigeon, PIGEONS, ruts } from "./street";
import { HILL_ROWS, toneOf } from "./tone";

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

/** Width of the fine lines (window bars, the whip, faces), px. */
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
    drift(ctx, rowX(s, -0.47, z), y + U * 0.006, U * 0.13, U * 0.022);
    drift(ctx, rowX(s, 0.49, z), y + U * 0.006, U * 0.12, U * 0.024);
  }

  // Gas lamps; the lamplighter reaches up to the left one now and then.
  const LU = unit(s, LAMP_Z);
  const ly = fieldY(s, LAMP_Z);
  const rightX = lampX(s, 1);
  const leftX = lampX(s, -1);
  gasLamp(ctx, rightX, ly, LU, t, 2.1, 0);
  drift(ctx, rightX, ly + LU * 0.004, LU * 0.05, LU * 0.014);
  const reach = lighterReach(t);
  gasLamp(ctx, leftX, ly, LU, t, 0.4, reach * reach * reach * reach);
  drift(ctx, leftX, ly + LU * 0.004, LU * 0.05, LU * 0.014);

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
  drift(ctx, rowX(s, -0.24, fz), fy + FU * 0.004, FU * 0.08, FU * 0.016);
  carolers(ctx, at(rowX(s, 0.182, fz), fy, FU, lw, t));
  drift(ctx, rowX(s, 0.182, fz) + FU * 0.05, fy + FU * 0.004, FU * 0.17, FU * 0.016);
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
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = 0.95 * tw;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The street's floor (in front of the nearest row of hills) and its props, while it's in view. */
export function ground(ctx: Ctx, s: Scene): void {
  const top = fieldY(s, HILL_ROWS[0].z);
  if (top < s.cssH) {
    ctx.fillStyle = toneOf(s).street;
    ctx.fillRect(0, top, s.cssW, s.cssH - top);
    cobbles(ctx, s);
    ruts(ctx, s);
    glints(ctx, s);
  }
  if (fieldY(s, HOUSE_Z) - s.u * 0.65 < s.cssH) props(ctx, s);
}

// ---------------------------------------------------------------- foreground

/** Icicles hanging from the kerb's snow near the sides: [x as a fraction of the width, length (u)]. */
const ICICLES = [
  [0.05, 0.03],
  [0.09, 0.02],
  [0.14, 0.026],
  [0.86, 0.024],
  [0.9, 0.032],
  [0.95, 0.02],
] as const;
/** Holly sprigs in the kerb's snow, out at the sides: x as a fraction of the width, and which way they lean. */
const SPRIGS = [
  [0.07, -1],
  [0.93, 1],
] as const;

/** How far the base band's grass tips reach above its top (u: src/base/world.ts's tiles). */
const GRASS_TIPS = 0.026;
/** The pavement: a slate ground and its cobbles a shade lighter. */
const COBBLES_INK = TEAL;
const PAVEMENT = SLATE;

/**
 * The near edge we look over: a bank of snow along the kerb, its top edge a row of round
 * scallops, a band of aqua shade under its lip with icicles near the sides, and below it the
 * slate pavement printed with rows of round cobbles (it covers the base's band and tiles). Holly pokes
 * out of the snow at either side. Drops away with the base band as you climb.
 */
export function foreground(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = layerGround(s, 1.6) + u * 0.36;
  if (top - u * 0.06 > s.cssH) return;
  const W = s.cssW;
  const bank = u * 0.03;
  const lip = top + bank;
  const kerb = lip + u * 0.012;

  // The pavement, from just under the snow to the bottom of the screen, and its cobbles: rows of
  // round stones in a staggered repeat, like a printed pattern.
  ctx.fillStyle = PAVEMENT;
  ctx.fillRect(0, kerb - 1, W, s.cssH - kerb + 1);
  const rowH = u * 0.036;
  const gap = u * 0.042;
  const r = u * 0.014;
  ctx.beginPath();
  for (let row = 0, y = kerb + u * 0.03; y - r < s.cssH; row++, y += rowH) {
    const off = row % 2 ? gap / 2 : 0;
    for (let x = (W / 2) % gap - gap + off; x - r < W; x += gap) circle(ctx, x, y, r);
  }
  ctx.fillStyle = COBBLES_INK;
  ctx.globalAlpha = 0.24;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Icicles under the lip, near the sides.
  ctx.beginPath();
  for (const [fx, len] of ICICLES) {
    const x = fx * W;
    ctx.moveTo(x - u * 0.01, kerb - 1);
    ctx.lineTo(x, kerb + len * u);
    ctx.lineTo(x + u * 0.01, kerb - 1);
    ctx.closePath();
  }
  ctx.fillStyle = AQUA;
  ctx.fill();

  // The snow bank: a scalloped top, the lip's shade band under it.
  // (The scallops' notches stand above the base band's grass tips, so none show between them.)
  const step = u * 0.06;
  const crest = top - u * GRASS_TIPS;
  const n = Math.ceil(W / step) + 1;
  const x0 = (W / 2) % step - step;
  ctx.beginPath();
  ctx.moveTo(x0, kerb);
  ctx.lineTo(x0, crest);
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * step;
    ctx.arc(x + step / 2, crest, step / 2, Math.PI, 0);
  }
  ctx.lineTo(x0 + (n + 1) * step, kerb);
  ctx.closePath();
  ctx.fillStyle = SNOW_SHADE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, lip);
  ctx.lineTo(x0, crest);
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * step;
    ctx.arc(x + step / 2, crest, step / 2, Math.PI, 0);
  }
  ctx.lineTo(x0 + (n + 1) * step, lip);
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();

  // Holly sprigs: three pointed leaves and a cluster of berries, planted in the bank.
  for (const [fx, lean] of SPRIGS) {
    const x = fx * W;
    const y = crest - u * 0.006;
    const r = u * 0.022;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      const a = -Math.PI / 2 + k * 0.75 + lean * 0.15;
      const tx = x + Math.cos(a) * r * 1.6;
      const ty = y + Math.sin(a) * r * 1.6;
      const nx = -Math.sin(a) * r * 0.45;
      const ny = Math.cos(a) * r * 0.45;
      ctx.moveTo(x, y);
      ctx.lineTo((x + tx) / 2 + nx, (y + ty) / 2 + ny);
      ctx.lineTo(tx, ty);
      ctx.lineTo((x + tx) / 2 - nx, (y + ty) / 2 - ny);
      ctx.closePath();
    }
    ctx.fillStyle = EVERGREEN;
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const bx = x + (k - 1) * r * 0.32;
      const by = y - r * (0.15 + (k % 2) * 0.25);
      ctx.moveTo(bx + r * 0.22, by);
      ctx.arc(bx, by, r * 0.22, 0, Math.PI * 2);
    }
    ctx.fillStyle = BERRY;
    ctx.fill();
  }

  // A navy line along the kerb's edge.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, kerb - u * 0.004, W, u * 0.004);
}

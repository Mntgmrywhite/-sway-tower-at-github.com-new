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
// (left) and the carolers (right), and the carriage trotting past nearest the viewer.
// Each prop stands on a field row at depth z (z = TOWER_DEPTH is the tower's line; smaller z
// is nearer, lower and larger). Positions are `dx` in units at that depth from the center
// line. Anything rising above the tower's floor line stays outside the tower's column
// (|screen x - center| >= 0.25u), and anything in the column stays below the floor line.

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
const CART_Z = 1.55;
const CART_PERIOD = 30;
const CART_TIME = 17;
/**
 * At s.t = 0 the carriage is already driving in from the left: it passes in front of the tower
 * at 4 s and the last pigeon settles before 10 s (actions.test.ts), then it comes round every
 * CART_PERIOD.
 */
const CART_OFFSET = 4.5;

/** Where the carriage is (screen x of its middle, units travelled), reused every frame. */
const CART = { x: 0, dist: 0 };

/**
 * 0..1: how far across the screen the carriage is at time t (0: driving in at the left edge,
 * 0.5: its middle on the tower's line, 1: gone at the right), or -1 while it's off screen.
 */
export function carriageProgress(t: number): number {
  const p = (((t + CART_OFFSET) % CART_PERIOD) + CART_PERIOD) % CART_PERIOD;
  return p > CART_TIME ? -1 : p / CART_TIME;
}

/** Updates CART; false while the carriage is off screen. */
function placeCarriage(s: Scene): boolean {
  const k = carriageProgress(s.t);
  if (k < 0) return false;
  const U = unit(s, CART_Z);
  const len = RIG_LENGTH * U;
  CART.x = -len * 0.55 + (s.cssW + len * 1.1) * k;
  CART.dist = (CART.x - s.cssW / 2) / U;
  return true;
}

/** 0..1: how high pigeon i (of PIGEONS) flutters up off the cobbles as the carriage nears it. */
export function pigeonLift(s: Scene, i: number): number {
  if (!placeCarriage(s)) return 0;
  const [z, dx] = PIGEONS[i]!;
  const d = Math.abs(CART.x - rowX(s, dx, z)) / s.u;
  return d < 0.3 ? Math.min(1, (0.3 - d) / 0.12) : 0;
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

export function props(ctx: Ctx, s: Scene): void {
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

  // Gas lamps; the lamplighter is reaching up to the left one.
  const lz = LAMP_Z;
  const LU = unit(s, lz);
  const ly = fieldY(s, lz);
  const leftX = s.cssW / 2 - LAMP_SCREEN_X * s.u;
  const rightX = s.cssW / 2 + LAMP_SCREEN_X * s.u;
  const fz = FOLK_Z;
  const FU = unit(s, fz) * FOLK_SCALE;
  const fy = fieldY(s, fz);
  const burnerY = ly - LAMP_BURNER * LU;
  gasLamp(ctx, rightX, ly, LU, lw, t, 2.1, 0);
  mound(ctx, rightX, ly + LU * 0.004, LU * 0.048, LU * 0.012, lw);

  // Pigeons on the cobbles in front of the tower; they flutter up as the carriage nears.
  for (let i = 0; i < PIGEONS.length; i++) {
    const [z, dx, dir, phase] = PIGEONS[i]!;
    pigeon(ctx, rowX(s, dx, z), fieldY(s, z), unit(s, z), lw * 0.85, dir, t, phase, pigeonLift(s, i));
  }

  {
    const reach = lighterReach(t);
    gasLamp(ctx, leftX, ly, LU, lw, t, 0.4, reach * reach * reach * reach);
    mound(ctx, leftX, ly + LU * 0.004, LU * 0.048, LU * 0.012, lw);
    const fx = rowX(s, -0.236, fz);
    lamplighter(ctx, at(fx, fy, FU, lw, t), leftX + LU * 0.004, burnerY + LU * 0.03, leftX + LU * 0.016, ly - LADDER_BAR * LU);
    mound(ctx, rowX(s, -0.24, fz), fy + FU * 0.004, FU * 0.08, FU * 0.014, lw);
  }

  carolers(ctx, at(rowX(s, 0.182, fz), fy, FU, lw, t));
  mound(ctx, rowX(s, 0.182, fz) + FU * 0.05, fy + FU * 0.004, FU * 0.17, FU * 0.014, lw);

  // The carriage, nearest the viewer.
  if (placeCarriage(s)) carriage(ctx, CART.x, fieldY(s, CART_Z), unit(s, CART_Z), lw, CART.dist, t);
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

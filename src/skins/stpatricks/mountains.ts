import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { mountainHorizon } from "./floor";
import { curlPath } from "./knot";
import { archPath, cloudLineWidth } from "./shapes";
import type { Tone } from "./tone";

// The mountains on the horizon, the furthest of the land, after the owner's photos of the west
// of Ireland: a hazy lapis range all along it; on the left a great table mountain, its long flat
// top edged with a band of pale limestone cliff, fluted with deep grooves, over long green
// scree slopes streaked with gullies, its prow falling steeply toward the middle; and on the
// right, across the bay, the holy mountain, a tall cone of pale quartzite scree with the
// pilgrims' path zigzagging up its sunlit face to the little white chapel on its summit (both our
// own designs). Behind them clouds pile up at either side, curled with spirals as an illuminator
// draws them. Drawn like the landscape of an illuminated page: flat washes, finely contoured.
// The detail lives out at the sides: the flutes, the gullies, the scree and the path keep out
// of the tower's column, where the mountains are plain washes.
//
// Once the cloud floor has covered the land they stand out of it (floor.ts), so they are placed
// on `mountainHorizon`. Positions are in u from the screen center, heights in u above their base.

/** Half the tower's column (u from the center): the mountains' detail keeps out of it. */
const COLUMN = 0.22;
/** The mountains' base line, u below their horizon (the back hills or the cloud floor cover it). */
const MOUNT_BASE = 0.03;
/** Polyline step along the ridges (u). */
const STEP = 0.012;

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled behind the mountains at either side: [X (u from center), height above the horizon (u), radius (u)]. */
const BANK = [
  [-0.7, 0.3, 0.1],
  [-0.58, 0.33, 0.08],
  [-0.47, 0.31, 0.06],
  [0.16, 0.08, 0.05],
  [0.24, 0.12, 0.06],
  [0.47, 0.27, 0.085],
  [0.57, 0.31, 0.1],
  [0.68, 0.22, 0.13],
] as const;

/** A bank puff's x: on a wider screen the banks keep to its sides. */
function bankX(s: Scene, X: number): number {
  const cx = s.cssW / 2;
  return X < 0 ? Math.min(cx + X * s.u, (X + 0.5) * s.u) : Math.max(cx + X * s.u, s.cssW - (0.5 - X) * s.u);
}

/**
 * White clouds piled up behind the mountains at either side, in the hour's cloud colors: a fine
 * contour, a shaded body, and a spiral curl in each of the bigger puffs.
 */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const lw = cloudLineWidth(u);
  const right = Math.max(s.cssW / 2 + u * 0.2, s.cssW - u * 0.3);
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudLine : pass === 1 ? tone.cloudShade : tone.cloud;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      const x = bankX(s, X);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u + lw);
      else if (pass === 1) circle(ctx, x, y, r * u);
      else circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
    }
    if (pass < 2) ctx.rect(right, hz - u * 0.06 - (pass === 0 ? lw : 0), s.cssW, u * 0.12);
    ctx.fill();
  }
  ctx.beginPath();
  for (const [X, h, r] of BANK) {
    if (r < 0.085) continue;
    const side = X < 0 ? 1 : -1;
    curlPath(ctx, bankX(s, X) + side * r * u * 0.1, hz - h * u - r * u * 0.08, r * u * 0.5, side > 0 ? Math.PI : 0, -side);
  }
  ctx.strokeStyle = tone.cloudLine;
  ctx.lineWidth = lw * 0.85;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- the far range

/** The far range: a low hazy ridge all along the horizon (height above its base, u). */
function rangeHeight(X: number): number {
  return 0.085 + 0.03 * Math.sin(X * 6.3 + 0.7) + 0.018 * Math.sin(X * 13.1 + 2.1) + 0.01 * Math.sin(X * 29 + 0.3);
}

/** A row of mountains along `height`, from x0 to x1, filled down to the base, as a new path. */
function ridge(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, x0: number, x1: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(x0, base + 1);
  for (let x = x0; ; x += u * STEP) {
    const xx = Math.min(x, x1);
    ctx.lineTo(xx, base - u * height((xx - cx) / u));
    if (x >= x1) break;
  }
  ctx.lineTo(x1, base + 1);
  ctx.closePath();
}

/** A fine contour along `height` lowered by `drop` (u), from x0 to x1, out of the tower's column. Continues the path. */
function contour(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, x0: number, x1: number, drop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  let pen = false;
  for (let x = x0; ; x += u * STEP) {
    const xx = Math.min(x, x1);
    const X = (xx - cx) / u;
    const h = height(X) - drop;
    if (h > 0.006 && Math.abs(X) > COLUMN) {
      const y = base - u * h;
      if (pen) ctx.lineTo(xx, y);
      else ctx.moveTo(xx, y);
      pen = true;
    } else pen = false;
    if (x >= x1) break;
  }
}

// ---------------------------------------------------------------- the table mountain

/** Its plateau's height and where the plateau ends in the prow (X); the cliff band's foot; where its slope meets the base on the right. */
const TABLE_TOP = 0.33;
const PROW = -0.205;
const CLIFF_FOOT = 0.235;
const TABLE_END = -0.02;
/** It runs on past the left edge of even the widest view. */
const TABLE_FAR = -1.2;

/** The plateau's edge (height above the base at X): nearly level, rising a little toward the prow. */
function plateau(X: number): number {
  return TABLE_TOP + 0.012 * (X - PROW) + 0.004 * Math.sin(X * 23 + 0.4) + 0.0025 * Math.sin(X * 61);
}

/** The cliff band's foot, where the scree begins. */
function cliffFoot(X: number): number {
  return CLIFF_FOOT + 0.006 * Math.sin(X * 31 + 1) + 0.004 * Math.sin(X * 73 + 2);
}

/** The prow's outline, from the plateau's end down the cliff to the slope: [X, height] pairs. */
const PROW_LINE = [
  [PROW + 0.007, plateau(PROW) - 0.008],
  [PROW + 0.018, CLIFF_FOOT + 0.03],
  [PROW + 0.032, CLIFF_FOOT - 0.016],
] as const;

/** Where the cliff band's foot meets the prow's end face (X). */
const CORNER = PROW_LINE[2][0] - 0.014;

/** The scree slope below the prow, a concave fall to the base: height at X. */
function proSlope(X: number): number {
  const x0 = PROW_LINE[2][0];
  const k = Math.min(1, Math.max(0, (X - x0) / (TABLE_END - x0)));
  return PROW_LINE[2][1] * (1 - k) * (1 - k) * (1 + 0.6 * k);
}

/** The whole table mountain's outline, filled to the base, as a new path. */
function tablePath(ctx: Ctx, s: Scene, base: number, x0: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const at = (X: number) => cx + X * u;
  ctx.beginPath();
  ctx.moveTo(x0, base + 1);
  for (let x = x0; x < at(PROW); x += u * STEP) ctx.lineTo(x, base - u * plateau((x - cx) / u));
  ctx.lineTo(at(PROW), base - u * plateau(PROW));
  for (const [X, h] of PROW_LINE) ctx.lineTo(at(X), base - u * h);
  for (let X = PROW_LINE[2][0] + STEP; X < TABLE_END; X += STEP) ctx.lineTo(at(X), base - u * proSlope(X));
  ctx.lineTo(at(TABLE_END), base + 1);
  ctx.closePath();
}

/** The cliff band: from the plateau's edge down to its foot, round the prow, as a new path. */
function cliffPath(ctx: Ctx, s: Scene, base: number, x0: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const at = (X: number) => cx + X * u;
  ctx.beginPath();
  ctx.moveTo(x0, base - u * plateau((x0 - cx) / u));
  for (let x = x0; x < at(PROW); x += u * STEP) ctx.lineTo(x, base - u * plateau((x - cx) / u));
  ctx.lineTo(at(PROW), base - u * plateau(PROW));
  for (const [X, h] of PROW_LINE) ctx.lineTo(at(X), base - u * h);
  for (let X = CORNER; X > (x0 - cx) / u; X -= STEP) ctx.lineTo(at(X), base - u * cliffFoot(X));
  ctx.lineTo(x0, base - u * cliffFoot((x0 - cx) / u));
  ctx.closePath();
}

/** The flutes in the cliff, every FLUTE u from the prow back: each a deep groove, a little wider and longer by turns. */
const FLUTE = 0.016;
const FLUTES = 72;
const FLUTE_W = Float64Array.from({ length: FLUTES }, (_, i) => 0.004 + hash(i + 6400) ** 2 * 0.009);
/** Each flute's place: every FLUTE u from the prow back, give or take. */
const FLUTE_X = Float64Array.from({ length: FLUTES }, (_, i) => PROW - i * FLUTE + (hash(i + 6420) - 0.5) * FLUTE * 0.7);
const FLUTE_DOWN = Float64Array.from({ length: FLUTES }, (_, i) => 0.012 + hash(i + 6450) * 0.03);
/** How deep the grey talus runs under the cliff (u). */
const TALUS = 0.05;

/**
 * The table mountain: the scree slopes, the cliff band along its top with its flutes (the
 * grooves shaded, each running on down the scree as a gully), the green lip of the plateau, the
 * prow's end in shade, and fine contours along the plateau's edge and the cliff's foot.
 */
function tableMountain(ctx: Ctx, s: Scene, tone: Tone, base: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x0 = Math.max(-1, cx + TABLE_FAR * u);
  const at = (X: number) => cx + X * u;
  tablePath(ctx, s, base, x0);
  ctx.fillStyle = tone.tableSlope;
  ctx.fill();
  cliffPath(ctx, s, base, x0);
  ctx.fillStyle = tone.tableCliff;
  ctx.fill();
  // The prow's end, turned away from the sun.
  ctx.beginPath();
  ctx.moveTo(at(PROW), base - u * plateau(PROW));
  for (const [X, h] of PROW_LINE) ctx.lineTo(at(X), base - u * h);
  ctx.lineTo(at(CORNER), base - u * cliffFoot(CORNER));
  ctx.lineTo(at(PROW - 0.004), base - u * (plateau(PROW) - 0.03));
  ctx.closePath();
  ctx.fillStyle = tone.tableFlute;
  ctx.fill();
  // The talus under the cliff, greyer than the slopes below it.
  ctx.beginPath();
  ctx.moveTo(x0, base - u * cliffFoot((x0 - cx) / u));
  for (let x = x0; x < at(CORNER); x += u * STEP) ctx.lineTo(x, base - u * cliffFoot((x - cx) / u));
  ctx.lineTo(at(CORNER), base - u * cliffFoot(CORNER));
  const px = PROW_LINE[2][0];
  ctx.lineTo(at(px), base - u * PROW_LINE[2][1]);
  for (let X = px + STEP; X < px + TALUS * 0.7; X += STEP) ctx.lineTo(at(X), base - u * proSlope(X));
  for (let x = at(CORNER); x > x0; x -= u * STEP * 2) ctx.lineTo(x, base - u * (cliffFoot((x - cx) / u) - TALUS + 0.006 * Math.sin(x * 0.3)));
  ctx.lineTo(x0, base - u * (cliffFoot((x0 - cx) / u) - TALUS));
  ctx.closePath();
  ctx.fillStyle = tone.tableTalus;
  ctx.fill();
  // The flutes: deep grooves from just under the lip, widening down the cliff and running on
  // into the talus to a point, each with a gully below it down the scree; out in the side lane
  // only.
  ctx.beginPath();
  for (let i = 1; i < FLUTES; i++) {
    const X = FLUTE_X[i]!;
    const x = at(X);
    if (x < -u * 0.03) break;
    if (Math.abs(X) < COLUMN + 0.02) continue;
    const w = FLUTE_W[i]! * u;
    const top = base - u * (plateau(X) - 0.01);
    const mid = base - u * (cliffFoot(X) + 0.02);
    const point = base - u * (cliffFoot(X) - FLUTE_DOWN[i]!);
    ctx.moveTo(x - w * 0.3, top);
    ctx.lineTo(x + w * 0.3, top);
    ctx.lineTo(x + w * 0.6, mid);
    ctx.lineTo(x + w * 0.1, point);
    ctx.lineTo(x - w * 0.7, mid);
    ctx.closePath();
  }
  ctx.fillStyle = tone.tableFlute;
  ctx.fill();
  ctx.beginPath();
  for (let i = 1; i < FLUTES; i++) {
    const X = FLUTE_X[i]!;
    const x = at(X);
    if (x < -u * 0.03) break;
    if (Math.abs(X) < COLUMN + 0.02 || i % 3 === 1) continue;
    const y0 = base - u * (cliffFoot(X) - FLUTE_DOWN[i]! - 0.006);
    const y1 = base - u * (0.05 + hash(i + 6480) * 0.09);
    ctx.moveTo(x + u * 0.001, y0);
    ctx.quadraticCurveTo(x - u * 0.002, (y0 + y1) / 2, x - u * (0.006 + hash(i + 6490) * 0.01), y1);
  }
  ctx.strokeStyle = tone.tableGully;
  ctx.lineWidth = Math.max(1, u * 0.0032);
  ctx.lineCap = "round";
  ctx.stroke();
  // The plateau's green lip.
  ctx.beginPath();
  for (let x = x0; x < at(PROW); x += u * STEP) ctx.lineTo(x, base - u * plateau((x - cx) / u));
  ctx.lineTo(at(PROW), base - u * plateau(PROW));
  ctx.strokeStyle = tone.tableTop;
  ctx.lineWidth = Math.max(1.5, u * 0.009);
  ctx.lineCap = "butt";
  ctx.stroke();
  // Fine contours along the plateau's edge and the cliff's foot.
  ctx.beginPath();
  contour(ctx, s, base, plateau, x0, at(PROW), 0);
  contour(ctx, s, base, cliffFoot, x0, at(PROW), 0);
  ctx.strokeStyle = tone.mountainLine;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the holy mountain

/** The holy mountain on the right: its peak (X in u) and height above the base; its flanks fall in a gentle concave curve. */
export const HOLY_X = 0.33;
const HOLY_H = 0.39;
const HOLY_HW = 0.32;

function holyHeight(X: number): number {
  const d = Math.abs(X - HOLY_X) / HOLY_HW;
  if (d >= 1) return 0;
  const k = 1 - d;
  return HOLY_H * k * k * (1.6 - 0.6 * k) * (X < HOLY_X ? 1 : 0.94);
}

/** The holy mountain's flank in shade, right of its summit (nothing elsewhere): a contour runs inside it. */
function shadedFlank(X: number): number {
  return X > HOLY_X + 0.02 ? holyHeight(X) : 0;
}

/** Scratch for the chapel's place, so placing it allocates nothing. */
const CHAPEL = { x: 0, y: 0 };

/** Where the chapel stands on the holy mountain's summit (its foot). */
export function chapelAt(s: Scene): typeof CHAPEL {
  CHAPEL.x = s.cssW / 2 + HOLY_X * s.u;
  CHAPEL.y = mountainHorizon(s) + (MOUNT_BASE - HOLY_H) * s.u + s.u * 0.006;
  return CHAPEL;
}

/** The zigzag path up the holy mountain's lit face: [X, height] pairs from the foot to the summit. */
const PATH = [
  [0.236, 0.1],
  [0.266, 0.128],
  [0.252, 0.158],
  [0.286, 0.194],
  [0.274, 0.228],
  [0.304, 0.264],
  [0.294, 0.298],
  [0.316, 0.338],
  [0.326, 0.378],
] as const;

/** The path's dots (a dash pattern, filled per frame), and none. */
const PATH_DOTS = [0, 0];
const NO_DASH: number[] = [];

/** Scree streaks fanning down the lit face from under the summit: [X at the top, X at the foot, height at the top, at the foot]. */
const SCREE = [
  [0.318, 0.27, 0.33, 0.12],
  [0.31, 0.225, 0.27, 0.07],
  [0.3, 0.25, 0.21, 0.04],
  [0.322, 0.3, 0.26, 0.08],
  [0.348, 0.37, 0.3, 0.12],
  [0.362, 0.41, 0.25, 0.08],
] as const;

/** The holy mountain: the cone, its sunlit left face streaked with scree, fine contours, the pilgrims' path and the chapel. */
function holyMountain(ctx: Ctx, s: Scene, tone: Tone, base: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hx = cx + HOLY_X * u;
  const hl = cx + (HOLY_X - HOLY_HW) * u;
  const hr = Math.min(s.cssW + 1, cx + (HOLY_X + HOLY_HW) * u);
  ridge(ctx, s, base, holyHeight, hl, hr);
  ctx.fillStyle = tone.mountain;
  ctx.fill();
  const peak = base - HOLY_H * u;
  ctx.fillStyle = tone.mountainLit;
  ctx.beginPath();
  ctx.moveTo(hx - u * 0.004, peak + u * 0.004);
  for (let X = HOLY_X - 0.01; X > HOLY_X - HOLY_HW; X -= STEP) ctx.lineTo(cx + X * u, base - u * holyHeight(X));
  ctx.lineTo(hl, base + 1);
  ctx.lineTo(hx - u * 0.12, base + 1);
  ctx.quadraticCurveTo(hx - u * 0.03, base - u * 0.12, hx - u * 0.004, peak + u * 0.004);
  ctx.closePath();
  ctx.fill();
  // Scree streaks on the lit face and a fine contour inside the right flank.
  ctx.beginPath();
  for (const [a, b, ha, hb] of SCREE) {
    ctx.moveTo(cx + a * u, base - ha * u);
    ctx.lineTo(cx + b * u, base - hb * u);
  }
  contour(ctx, s, base, shadedFlank, hx, hr, 0.035);
  ctx.strokeStyle = tone.mountainLine;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  // The ridge's fine contour.
  ctx.beginPath();
  contour(ctx, s, base, holyHeight, hl, hr, 0);
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  // The pilgrims' path: a track of pale dots, as the illuminators dot a road, zigzagging up.
  ctx.strokeStyle = tone.white;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1.2, u * 0.0036);
  ctx.lineCap = "round";
  PATH_DOTS[0] = u * 0.0001;
  PATH_DOTS[1] = u * 0.0062;
  ctx.setLineDash(PATH_DOTS);
  ctx.beginPath();
  for (let i = 0; i < PATH.length; i++) {
    const [X, h] = PATH[i]!;
    if (i === 0) ctx.moveTo(cx + X * u, base - h * u);
    else ctx.lineTo(cx + X * u, base - h * u);
  }
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
  ctx.globalAlpha = 1;
  chapel(ctx, s, tone);
}

/** The little white chapel on the summit: a gable end with a dark door, a pitched roof, a cross. */
function chapel(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const { x, y } = chapelAt(s);
  const w = u * 0.024;
  const h = u * 0.013;
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h, w, h);
  ctx.moveTo(x - w * 0.56, y - h);
  ctx.lineTo(x - w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.56, y - h);
  ctx.closePath();
  ctx.rect(x - u * 0.0012, y - h - u * 0.022, u * 0.0024, u * 0.012);
  ctx.rect(x - u * 0.0045, y - h - u * 0.018, u * 0.009, u * 0.0022);
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.56, y - h);
  ctx.lineTo(x - w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.3, y - h - u * 0.011);
  ctx.lineTo(x + w * 0.56, y - h);
  ctx.closePath();
  archPath(ctx, x - w * 0.12, y, w * 0.24, h * 0.7);
  ctx.fill();
}

/** The mountains, back to front: the far range, the table mountain, the holy mountain. */
export function mountains(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const base = mountainHorizon(s) + MOUNT_BASE * u;
  ridge(ctx, s, base, rangeHeight, -1, s.cssW + 1);
  ctx.fillStyle = tone.mountainFar;
  ctx.fill();
  tableMountain(ctx, s, tone, base);
  holyMountain(ctx, s, tone, base);
}

/** How high the mountains reach above their horizon (u): the holy mountain's summit with its chapel's cross. */
export const MOUNTAIN_TOP = HOLY_H - MOUNT_BASE + 0.04;

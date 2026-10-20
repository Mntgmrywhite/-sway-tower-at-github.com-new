import { alpha, circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  CANVAS_BLUE,
  CANVAS_BLUE_SHADE,
  CANVAS_WHITE,
  CANVAS_WHITE_SHADE,
  GOLD,
  GRASS,
  INK,
  LANTERN_GLOW,
  LANTERN_LIT,
  MEADOW,
  PLANK_GAP,
  PRETZEL,
  RIBBON_BLUE,
  RIBBON_WHITE,
  SIGN,
  SIGN_RIM,
  TENT_BACK,
  TENT_INSIDE,
  TENT_INSIDE_DEEP,
  TENT_TABLE,
  TRODDEN,
  WOOD,
  WOOD_DARK,
  WREATH,
} from "./colors";
import { block, diamond, lattice } from "./shapes";
import type { Tone } from "./tone";

// What stands on the meadow round the tower, all of it near: flat two-tone fills and one ink
// weight. The big festival tent, its blue-and-white striped front open behind the tower: a wide
// marquee under a flat ridge with a row of pennants, a scalloped valance along its eaves, our
// own FESTZELT sign on the gable, and inside, under garlands hung with paper lanterns (lit from
// the golden evening on), the long tables laid with plates of pretzels and little vases of
// flowers, fading back to a wall of blue-white lattice. In front
// of the opening the wooden bandstand the bars are stacked on: a plank stage with a railing at
// each end and a step down to the trodden ground. Behind the tent's right roof a maypole rises,
// blue-and-white spirals up its shaft, little figures of the village trades on its cross arms,
// a wreath and ribbons at its top. Nothing here moves: the tent stands right behind the tower.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** Ink width up close. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** Center line of the tower: under the base block. */
export function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

// ---------------------------------------------------------------- the meadow and the ground

/** Where the near meadow's brow is (u above the floor) and where the trodden ground begins (u below it). */
const BROW = 0.12;
export const TRODDEN_FROM = 0.1;

/** A wavy edge across the screen at `y` (continues the path, left to right). */
function rolling(ctx: Ctx, s: Scene, y: number, amp: number, f: number, ph: number): void {
  const u = s.u;
  for (let x = 0; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, y + u * amp * (Math.sin(X * f + ph) + 0.5 * Math.sin(X * f * 2.3 + ph * 1.7)));
    if (x > s.cssW) break;
  }
}

/** The near meadow, deeper green, from its rolling brow down to the trodden ground along the front. */
export function meadowNear(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * BROW > s.cssH) return;
  ctx.fillStyle = MEADOW;
  ctx.beginPath();
  ctx.moveTo(0, g + u * (TRODDEN_FROM + 0.05));
  rolling(ctx, s, g - u * BROW, 0.012, 5, 2.1);
  ctx.lineTo(s.cssW, g + u * (TRODDEN_FROM + 0.05));
  ctx.closePath();
  ctx.fill();
  // A few tufts of deeper grass along the brow, out at the sides.
  ctx.fillStyle = GRASS.body;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const X = -0.48 + i * 0.137;
    if (Math.abs(X) < 0.32) continue;
    const x = s.cssW / 2 + X * u;
    const y = g - u * (BROW - 0.03 - hash(i + 7100) * 0.05);
    oval(ctx, x, y, u * 0.016, u * 0.005);
  }
  ctx.fill();
}

/** The trodden ground along the front: pale sand, its edge wavy against the meadow, with a few darker scuffs. */
export function trodden(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  const top = g + u * TRODDEN_FROM;
  if (top > s.cssH) return;
  ctx.fillStyle = TRODDEN.body;
  ctx.beginPath();
  ctx.moveTo(0, s.cssH + 1);
  rolling(ctx, s, top, 0.008, 7, 0.4);
  ctx.lineTo(s.cssW, s.cssH + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TRODDEN.shade;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const x = s.cssW / 2 + (hash(i + 7200) - 0.5) * u * 1.1;
    const y = top + u * (0.06 + hash(i + 7210) * 0.2);
    if (y > s.cssH) continue;
    oval(ctx, x, y, u * (0.02 + hash(i + 7220) * 0.02), u * 0.004);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the festival tent

/** The tent: eaves half width and height, ridge half width and height, the posts of the open front, the beam over it. */
export const EAVES_HW = 0.31;
export const EAVES_UP = 0.34;
export const RIDGE_HW = 0.19;
export const RIDGE_UP = 0.5;
export const POST_X = 0.24;
const POST_W = 0.02;
const BEAM_UP = 0.32;
const BEAM_H = 0.022;
/** The gable's stripes (count across the eaves line) and the valance's scallops. */
const STRIPES = 14;
const SCALLOP = 0.028;
/** The sign: its center height above the floor, half width and height. */
const SIGN_UP = 0.43;
const SIGN_HW = 0.125;
const SIGN_H = 0.052;
/** The lanterns under the garlands: x (u from center) and how far below the beam they hang (u). */
const LANTERNS = [
  [-0.17, 0.055],
  [-0.1, 0.075],
  [-0.03, 0.085],
  [0.04, 0.08],
  [0.11, 0.07],
  [0.18, 0.052],
] as const;
const LANTERN_R = 0.016;
const LANTERN_COLORS = ["#ff5a5a", "#ffd23f", "#3f8fe8", "#ff8fc8", "#ffd23f", "#ff5a5a"] as const;

/** The diamonds of a lattice that lie wholly inside the rectangle (no clip needed), as subpaths. */
function innerLattice(ctx: Ctx, x: number, y: number, w: number, h: number, hw: number, hh: number): void {
  for (let row = 0, cy = y + hh; cy + hh <= y + h; row++, cy += hh) {
    const off = row % 2 ? hw : 0;
    for (let cx = x + hw + off; cx + hw <= x + w; cx += hw * 2) diamond(ctx, cx, cy, hw, hh);
  }
}

/** The gable's face: the trapezoid from the eaves line up to the ridge, as its own subpath. */
function gablePath(ctx: Ctx, cx: number, g: number, u: number): void {
  ctx.moveTo(cx - EAVES_HW * u, g - EAVES_UP * u);
  ctx.lineTo(cx - RIDGE_HW * u, g - RIDGE_UP * u);
  ctx.lineTo(cx + RIDGE_HW * u, g - RIDGE_UP * u);
  ctx.lineTo(cx + EAVES_HW * u, g - EAVES_UP * u);
  ctx.closePath();
}

/** Inside the tent, seen through its open front: the back wall of lattice, the long tables, the garlands and lanterns. */
function inside(ctx: Ctx, s: Scene, cx: number, g: number, tone: Tone, lw: number): void {
  const u = s.u;
  const l = cx - POST_X * u;
  const r = cx + POST_X * u;
  const top = g - BEAM_UP * u;
  ctx.fillStyle = TENT_INSIDE;
  ctx.fillRect(l, top, r - l, g - top + 1);
  // The back wall: a band of blue-white lattice under a dark cornice, over the far tables.
  const wallTop = top + u * 0.05;
  const wallBot = g - u * 0.16;
  ctx.fillStyle = TENT_BACK;
  ctx.fillRect(l, wallTop, r - l, wallBot - wallTop);
  ctx.fillStyle = CANVAS_WHITE_SHADE;
  ctx.fillRect(l + u * 0.02, wallTop + u * 0.02, r - l - u * 0.04, u * 0.07);
  ctx.fillStyle = CANVAS_BLUE_SHADE;
  ctx.beginPath();
  innerLattice(ctx, l + u * 0.02, wallTop + u * 0.02, r - l - u * 0.04, u * 0.07, u * 0.0105, u * 0.0145);
  ctx.fill();
  // The floor between the tables, deeper; the long tables in perspective with their benches.
  ctx.fillStyle = TENT_INSIDE_DEEP;
  ctx.fillRect(l, wallBot, r - l, g - wallBot + 1);
  for (let row = 0; row < 2; row++) {
    const y = g - u * (0.13 - row * 0.06);
    const h = u * (0.016 + row * 0.006);
    const hw = (POST_X - 0.03 + row * 0.015) * u;
    ctx.fillStyle = TENT_TABLE;
    ctx.beginPath();
    ctx.rect(cx - hw, y, hw * 2, h);
    ctx.fill();
    ctx.fillStyle = WOOD_DARK.light;
    ctx.fillRect(cx - hw, y, hw * 2, h * 0.3);
    // Along the table's top edge, tiny: white plates with a pretzel on each, and between every
    // other pair a little blue vase with a red flower.
    ctx.fillStyle = CANVAS_WHITE;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      if ((row === 1 && Math.abs(i) < 2) || i % 2) continue;
      oval(ctx, cx + i * hw * 0.22, y - u * 0.002, u * 0.009, u * 0.0028);
    }
    ctx.fill();
    ctx.fillStyle = PRETZEL.body;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      if ((row === 1 && Math.abs(i) < 2) || i % 2) continue;
      oval(ctx, cx + i * hw * 0.22, y - u * 0.005, u * 0.0055, u * 0.0035);
    }
    ctx.fill();
    ctx.fillStyle = CANVAS_BLUE;
    ctx.beginPath();
    for (let i = -3; i <= 3; i += 2) {
      if (row === 1 && Math.abs(i) < 2) continue;
      ctx.rect(cx + i * hw * 0.22 - u * 0.0025, y - u * 0.008, u * 0.005, u * 0.008);
    }
    ctx.fill();
    ctx.fillStyle = LANTERN_COLORS[0];
    ctx.beginPath();
    for (let i = -3; i <= 3; i += 2) {
      if (row === 1 && Math.abs(i) < 2) continue;
      circle(ctx, cx + i * hw * 0.22, y - u * 0.011, u * 0.0035);
    }
    ctx.fill();
  }
  // Two garlands swagged from the beam between the posts, and the lanterns hanging from them.
  ctx.strokeStyle = WREATH.shade;
  ctx.lineWidth = Math.max(1.5, u * 0.007);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(l, top + u * 0.004);
  ctx.quadraticCurveTo(cx - POST_X * u * 0.5, top + u * 0.11, cx, top + u * 0.03);
  ctx.quadraticCurveTo(cx + POST_X * u * 0.5, top + u * 0.11, r, top + u * 0.004);
  ctx.stroke();
  for (let i = 0; i < LANTERNS.length; i++) {
    const [X, d] = LANTERNS[i]!;
    const x = cx + X * u;
    const y = top + d * u + u * 0.028;
    const rr = LANTERN_R * u;
    if (tone.lights > 0.01) {
      ctx.fillStyle = alpha(LANTERN_GLOW, 0.32 * tone.lights);
      ctx.beginPath();
      circle(ctx, x, y, rr * 2.1);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x, y - rr - u * 0.012);
    ctx.lineTo(x, y - rr);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
    ctx.beginPath();
    oval(ctx, x, y, rr, rr * 0.86);
    ctx.fillStyle = tone.lights > 0.5 ? LANTERN_LIT : LANTERN_COLORS[i]!;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
    ctx.fillStyle = LANTERN_COLORS[i]!;
    ctx.globalAlpha = tone.lights > 0.5 ? 0.55 : 0.35;
    ctx.beginPath();
    ctx.rect(x - rr * 0.95, y - rr * 0.25, rr * 1.9, rr * 0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.rect(x - rr * 0.3, y - rr - u * 0.003, rr * 0.6, u * 0.004);
    ctx.rect(x - rr * 0.25, y + rr * 0.86 - u * 0.001, rr * 0.5, u * 0.004);
    ctx.fill();
  }
}

/** The tent's side walls: canvas panels from the eaves down to the ground, a blue stripe on each, inked. */
function walls(ctx: Ctx, cx: number, g: number, u: number, lw: number): void {
  const top = g - EAVES_UP * u;
  for (let m = -1; m <= 1; m += 2) {
    const x0 = cx + m * POST_X * u;
    const x1 = cx + m * EAVES_HW * u;
    ctx.beginPath();
    ctx.rect(Math.min(x0, x1), top, Math.abs(x1 - x0), g - top);
    ctx.fillStyle = CANVAS_WHITE;
    ctx.fill();
    ctx.fillStyle = CANVAS_BLUE;
    ctx.fillRect(Math.min(x0, x1) + u * 0.022, top, u * 0.022, g - top);
    ctx.fillStyle = CANVAS_WHITE_SHADE;
    ctx.fillRect(Math.min(x0, x1), g - u * 0.03, Math.abs(x1 - x0), u * 0.03);
    ink(ctx, lw, INK);
  }
}

/** The gable: blue-and-white stripes fanning from the ridge, the valance's scallops along the eaves, the sign, the pennants on the ridge. */
function gable(ctx: Ctx, s: Scene, cx: number, g: number, lw: number): void {
  const u = s.u;
  const eaves = g - EAVES_UP * u;
  const ridge = g - RIDGE_UP * u;
  ctx.beginPath();
  gablePath(ctx, cx, g, u);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  for (let i = 0; i < STRIPES; i += 2) {
    const a0 = -EAVES_HW + (2 * EAVES_HW * i) / STRIPES;
    const a1 = -EAVES_HW + (2 * EAVES_HW * (i + 1)) / STRIPES;
    const b0 = -RIDGE_HW + (2 * RIDGE_HW * i) / STRIPES;
    const b1 = -RIDGE_HW + (2 * RIDGE_HW * (i + 1)) / STRIPES;
    ctx.moveTo(cx + a0 * u, eaves);
    ctx.lineTo(cx + b0 * u, ridge);
    ctx.lineTo(cx + b1 * u, ridge);
    ctx.lineTo(cx + a1 * u, eaves);
    ctx.closePath();
  }
  ctx.fill();
  // A shaded band under the ridge, so the roof reads as a slope.
  ctx.fillStyle = alpha(INK, 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - (RIDGE_HW + 0.012) * u, ridge + u * 0.016);
  ctx.lineTo(cx - RIDGE_HW * u, ridge);
  ctx.lineTo(cx + RIDGE_HW * u, ridge);
  ctx.lineTo(cx + (RIDGE_HW + 0.012) * u, ridge + u * 0.016);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  gablePath(ctx, cx, g, u);
  ink(ctx, lw, INK);
  // The ridge: a beam along the top with a row of little pennants on it, and a flag at each end.
  ctx.beginPath();
  block(ctx, cx - (RIDGE_HW + 0.016) * u, ridge - u * 0.012, (RIDGE_HW + 0.016) * 2 * u, u * 0.022, u * 0.006);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(cx - (RIDGE_HW + 0.01) * u, ridge - u * 0.009, (RIDGE_HW + 0.01) * 2 * u, u * 0.005);
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const x = cx + (-RIDGE_HW + 0.02 + i * ((RIDGE_HW - 0.02) * 2) / 8) * u;
    ctx.moveTo(x - u * 0.009, ridge - u * 0.012);
    ctx.lineTo(x + u * 0.009, ridge - u * 0.012);
    ctx.lineTo(x, ridge - u * 0.034);
    ctx.closePath();
  }
  ctx.fillStyle = CANVAS_BLUE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.beginPath();
  for (let i = 1; i < 9; i += 2) {
    const x = cx + (-RIDGE_HW + 0.02 + i * ((RIDGE_HW - 0.02) * 2) / 8) * u;
    ctx.moveTo(x - u * 0.006, ridge - u * 0.013);
    ctx.lineTo(x + u * 0.006, ridge - u * 0.013);
    ctx.lineTo(x, ridge - u * 0.028);
    ctx.closePath();
  }
  ctx.fill();
  for (let m = -1; m <= 1; m += 2) {
    const x = cx + m * (RIDGE_HW + 0.01) * u;
    ctx.beginPath();
    ctx.rect(x - u * 0.003, ridge - u * 0.075, u * 0.006, u * 0.065);
    ctx.fillStyle = WOOD_DARK.body;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
    ctx.beginPath();
    ctx.moveTo(x + u * 0.003, ridge - u * 0.074);
    ctx.lineTo(x + u * 0.034, ridge - u * 0.062);
    ctx.lineTo(x + u * 0.003, ridge - u * 0.05);
    ctx.closePath();
    ctx.fillStyle = CANVAS_WHITE;
    ctx.fill();
    ctx.fillStyle = CANVAS_BLUE;
    ctx.beginPath();
    diamond(ctx, x + u * 0.011, ridge - u * 0.062, u * 0.005, u * 0.0065);
    diamond(ctx, x + u * 0.022, ridge - u * 0.062, u * 0.004, u * 0.005);
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
  }
  // The valance: a scalloped hem along the eaves, blue and white by turns.
  const top = eaves - u * 0.004;
  ctx.beginPath();
  ctx.moveTo(cx - (EAVES_HW + 0.01) * u, top);
  ctx.lineTo(cx + (EAVES_HW + 0.01) * u, top);
  const n = Math.round(((EAVES_HW + 0.01) * 2) / SCALLOP);
  const step = ((EAVES_HW + 0.01) * 2 * u) / n;
  for (let i = n; i > 0; i--) {
    const x = cx - (EAVES_HW + 0.01) * u + i * step;
    ctx.arc(x - step / 2, top + u * 0.028, step / 2, 0, Math.PI, false);
  }
  ctx.closePath();
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const x = cx - (EAVES_HW + 0.01) * u + i * step;
    ctx.moveTo(x, top);
    ctx.lineTo(x + step, top);
    ctx.arc(x + step / 2, top + u * 0.028, step / 2, 0, Math.PI, false);
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - (EAVES_HW + 0.01) * u, top);
  for (let i = 0; i < n; i++) {
    const x = cx - (EAVES_HW + 0.01) * u + i * step;
    ctx.arc(x + step / 2, top + u * 0.028, step / 2, Math.PI, 0, true);
  }
  ink(ctx, lw * 0.8, INK);
  // The sign on the gable: a deep blue board rimmed in gold, with the tent's name in gold.
  const sy = g - SIGN_UP * u;
  ctx.beginPath();
  block(ctx, cx - SIGN_HW * u, sy - (SIGN_H / 2) * u, SIGN_HW * 2 * u, SIGN_H * u, u * 0.008);
  ctx.fillStyle = SIGN;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  block(ctx, cx - (SIGN_HW - 0.008) * u, sy - (SIGN_H / 2 - 0.007) * u, (SIGN_HW - 0.008) * 2 * u, (SIGN_H - 0.014) * u, u * 0.005);
  ctx.strokeStyle = SIGN_RIM;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  ctx.font = `700 ${Math.round(u * 0.036)}px 'Pirata One', 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = SIGN_RIM;
  ctx.fillText("FESTZELT", cx, sy + u * 0.002);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

/** The beam over the opening and the two posts holding it, wood, with a garland twist. */
function frontFrame(ctx: Ctx, cx: number, g: number, u: number, lw: number): void {
  const top = g - BEAM_UP * u;
  ctx.beginPath();
  ctx.rect(cx - (POST_X + POST_W) * u, top - BEAM_H * u, (POST_X + POST_W) * 2 * u, BEAM_H * u);
  ctx.rect(cx - (POST_X + POST_W) * u, top, POST_W * u, g - top);
  ctx.rect(cx + POST_X * u, top, POST_W * u, g - top);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(cx - (POST_X + POST_W) * u, top - BEAM_H * u, (POST_X + POST_W) * 2 * u, BEAM_H * u * 0.3);
  ctx.fillRect(cx - (POST_X + POST_W) * u, top, POST_W * u * 0.3, g - top);
  ctx.fillRect(cx + POST_X * u, top, POST_W * u * 0.3, g - top);
  ctx.fillStyle = WOOD.shade;
  ctx.fillRect(cx - (POST_X + POST_W) * u, top - BEAM_H * u * 0.3, (POST_X + POST_W) * 2 * u, BEAM_H * u * 0.3);
  ink(ctx, lw, INK);
  // Blue and white ribbon wound round each post.
  ctx.strokeStyle = CANVAS_BLUE;
  ctx.lineWidth = Math.max(1.5, u * 0.006);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    const x0 = cx + m * POST_X * u + (m < 0 ? -POST_W * u : 0);
    for (let y = top + u * 0.02; y < g - u * 0.02; y += u * 0.04) {
      ctx.moveTo(x0, y + u * 0.012);
      ctx.lineTo(x0 + POST_W * u, y);
    }
  }
  ctx.stroke();
}

/** The festival tent, back to front: the gable and its walls, the inside, the front frame. */
export function tent(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * (RIDGE_UP + 0.08) > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  gable(ctx, s, cx, g, lw);
  walls(ctx, cx, g, u, lw);
  inside(ctx, s, cx, g, tone, lw);
  frontFrame(ctx, cx, g, u, lw);
}

// ---------------------------------------------------------------- the bandstand

/** The stage: half width, the plank lip at the floor line, the skirt below, the step. */
export const STAGE_HW = 0.27;
const LIP_UP = 0.012;
export const SKIRT = 0.09;
const STEP_HW = 0.07;
const STEP_H = 0.03;
const RAIL_UP = 0.042;

/** The wooden bandstand the bars are stacked on: its lip is the floor line; the skirt of planks, the railings at its ends, the step. */
export function bandstand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * RAIL_UP > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const hw = STAGE_HW * u;
  // Railings at each end: two posts and a rail, with a diamond-lattice panel.
  for (let m = -1; m <= 1; m += 2) {
    const x0 = cx + m * (hw - u * 0.004);
    const x1 = cx + m * (hw - u * 0.07);
    ctx.beginPath();
    ctx.rect(Math.min(x0, x1) - u * 0.004, g - RAIL_UP * u, u * 0.008, RAIL_UP * u);
    ctx.rect(Math.max(x0, x1) - u * 0.004, g - RAIL_UP * u, u * 0.008, RAIL_UP * u);
    ctx.rect(Math.min(x0, x1), g - RAIL_UP * u, Math.abs(x1 - x0), u * 0.008);
    ctx.fillStyle = WOOD_DARK.body;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
    ctx.strokeStyle = WOOD_DARK.body;
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.beginPath();
    ctx.moveTo(Math.min(x0, x1), g - RAIL_UP * u + u * 0.008);
    ctx.lineTo(Math.max(x0, x1), g - u * 0.004);
    ctx.moveTo(Math.max(x0, x1), g - RAIL_UP * u + u * 0.008);
    ctx.lineTo(Math.min(x0, x1), g - u * 0.004);
    ctx.stroke();
  }
  // The skirt: vertical planks under the lip, lit at their tops, shaded at the foot.
  const top = g + u * 0.004;
  const foot = g + SKIRT * u;
  ctx.fillStyle = PLANK_GAP;
  ctx.fillRect(cx - hw, top, hw * 2, foot - top);
  const pw = u * 0.028;
  ctx.fillStyle = WOOD.body;
  ctx.beginPath();
  for (let x = cx - hw + u * 0.003; x < cx + hw - u * 0.003; x += pw) {
    ctx.rect(x, top, Math.min(pw, cx + hw - u * 0.003 - x) - u * 0.003, foot - top - u * 0.004);
  }
  ctx.fill();
  ctx.fillStyle = WOOD.shade;
  ctx.fillRect(cx - hw + u * 0.003, foot - u * 0.022, hw * 2 - u * 0.006, u * 0.018);
  ctx.beginPath();
  ctx.rect(cx - hw, top, hw * 2, foot - top);
  ink(ctx, lw, INK);
  // Bunting along the skirt: a swag of blue-white pennants.
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const x = cx - hw + u * 0.02 + ((hw * 2 - u * 0.04) * (i + 0.5)) / n;
    const sag = Math.sin((Math.PI * (i + 0.5)) / n) * u * 0.014;
    ctx.moveTo(x - u * 0.011, top + u * 0.012 + sag);
    ctx.lineTo(x + u * 0.011, top + u * 0.012 + sag);
    ctx.lineTo(x, top + u * 0.036 + sag);
    ctx.closePath();
  }
  ctx.fillStyle = CANVAS_BLUE;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.beginPath();
  for (let i = 1; i < n; i += 2) {
    const x = cx - hw + u * 0.02 + ((hw * 2 - u * 0.04) * (i + 0.5)) / n;
    const sag = Math.sin((Math.PI * (i + 0.5)) / n) * u * 0.014;
    ctx.moveTo(x - u * 0.008, top + u * 0.014 + sag);
    ctx.lineTo(x + u * 0.008, top + u * 0.014 + sag);
    ctx.lineTo(x, top + u * 0.031 + sag);
    ctx.closePath();
  }
  ctx.fill();
  // The step down in the middle.
  ctx.beginPath();
  block(ctx, cx - STEP_HW * u, foot - u * 0.004, STEP_HW * 2 * u, STEP_H * u, u * 0.004);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(cx - STEP_HW * u + u * 0.004, foot - u * 0.002, STEP_HW * 2 * u - u * 0.008, u * 0.008);
  ink(ctx, lw, INK);
  // The lip: a plank edge along the floor line, lit on top.
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g - LIP_UP * u, (hw + u * 0.006) * 2, (LIP_UP + 0.006) * u, u * 0.004);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(cx - hw, g - LIP_UP * u + lw * 0.5, hw * 2, LIP_UP * u * 0.4);
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g - LIP_UP * u, (hw + u * 0.006) * 2, (LIP_UP + 0.006) * u, u * 0.004);
  ink(ctx, lw, INK);
}

// ---------------------------------------------------------------- the maypole

/** The maypole: where it stands (u from center), its top above the floor, the wreath's radius, the cross arms. */
export const POLE_X = 0.28;
export const POLE_TOP = 0.7;
const POLE_W = 0.013;
export const WREATH_UP = 0.62;
export const WREATH_R = 0.042;
const ARMS = [0.46, 0.54] as const;
const ARM_HW = 0.03;

/** Little figures on the cross arms: a dancing couple on the upper arm, a wheelwright with his wheel and a pretzel baker on the lower. */
function poleFigures(ctx: Ctx, cx: number, g: number, u: number, lw: number): void {
  ctx.fillStyle = CANVAS_BLUE;
  for (let a = 0; a < ARMS.length; a++) {
    const y = g - ARMS[a]! * u;
    for (let m = -1; m <= 1; m += 2) {
      const x = cx + (POLE_X + m * ARM_HW * 0.75) * u;
      ctx.beginPath();
      if (a === 0) {
        // A dancer: a body, a head, arms out; the right one a skirt.
        circle(ctx, x, y - u * 0.026, u * 0.0055);
        if (m < 0) ctx.rect(x - u * 0.004, y - u * 0.021, u * 0.008, u * 0.019);
        else {
          ctx.moveTo(x - u * 0.004, y - u * 0.021);
          ctx.lineTo(x + u * 0.004, y - u * 0.021);
          ctx.lineTo(x + u * 0.009, y - u * 0.002);
          ctx.lineTo(x - u * 0.009, y - u * 0.002);
          ctx.closePath();
        }
        ctx.rect(x - u * 0.012, y - u * 0.019, u * 0.024, u * 0.003);
      } else if (m < 0) {
        // A wheelwright standing his wagon wheel up beside him: a rim round a hub.
        circle(ctx, x - u * 0.004, y - u * 0.024, u * 0.005);
        ctx.rect(x - u * 0.008, y - u * 0.02, u * 0.008, u * 0.018);
        ctx.fill();
        ctx.beginPath();
        circle(ctx, x + u * 0.008, y - u * 0.009, u * 0.0085);
        circle(ctx, x + u * 0.008, y - u * 0.009, u * 0.0052);
        circle(ctx, x + u * 0.008, y - u * 0.009, u * 0.002);
        ctx.fill("evenodd");
        continue;
      } else {
        // A baker holding up a pretzel.
        circle(ctx, x, y - u * 0.024, u * 0.005);
        ctx.rect(x - u * 0.004, y - u * 0.02, u * 0.008, u * 0.018);
        circle(ctx, x + u * 0.009, y - u * 0.028, u * 0.0045);
        circle(ctx, x + u * 0.014, y - u * 0.028, u * 0.0045);
        circle(ctx, x + u * 0.0115, y - u * 0.022, u * 0.0045);
      }
      ctx.fill();
    }
  }
  ctx.lineWidth = lw * 0.5;
}

/**
 * The maypole behind the tent's right roof: a tall shaft with blue-and-white spiral stripes,
 * two cross arms carrying little figures of the village trades, and a green wreath at the top with
 * ribbons hanging from it (its foot is hidden by the tent).
 */
export function maypole(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - POLE_TOP * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const x = cx + POLE_X * u;
  const top = g - POLE_TOP * u;
  // The shaft stands behind the tent, so it is drawn only from the eaves up (the roof hides its foot).
  const foot = g - (EAVES_UP - 0.02) * u;
  const w = POLE_W * u;
  // The shaft: white with a blue spiral (slanted bands), inked.
  ctx.beginPath();
  ctx.rect(x - w / 2, top, w, foot - top);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  for (let y = top; y < foot; y += u * 0.036) {
    ctx.moveTo(x - w / 2, y + u * 0.012);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + u * 0.016);
    ctx.lineTo(x - w / 2, y + u * 0.028);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x - w / 2, top, w, foot - top);
  ink(ctx, lw, INK);
  // The cross arms and their figures.
  for (const up of ARMS) {
    const y = g - up * u;
    ctx.beginPath();
    block(ctx, x - ARM_HW * u, y, ARM_HW * 2 * u, u * 0.008, u * 0.003);
    ctx.fillStyle = WOOD.body;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
  }
  poleFigures(ctx, cx, g, u, lw);
  // The wreath: a green ring with a lit top, inked, with blue and white ribbons hanging from it.
  const wy = g - WREATH_UP * u;
  const r = WREATH_R * u;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.013 + lw * 2;
  ctx.beginPath();
  circle(ctx, x, wy, r);
  ctx.stroke();
  ctx.strokeStyle = WREATH.body;
  ctx.lineWidth = u * 0.013;
  ctx.stroke();
  ctx.strokeStyle = WREATH.light;
  ctx.lineWidth = u * 0.005;
  ctx.beginPath();
  ctx.arc(x, wy, r, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // Ribbons from the wreath's foot, each hanging its own way (still: the wreath's edge is at
  // the tower's column, where nothing moves).
  const drop = u * 0.09;
  for (let i = 0; i < 4; i++) {
    const rx = x + (i - 1.5) * u * 0.012;
    const sway = (hash(i + 7500) - 0.5) * u * 0.012;
    ctx.beginPath();
    ctx.moveTo(rx, wy + r * 0.8);
    ctx.quadraticCurveTo(rx + sway * 0.4, wy + r * 0.8 + drop * 0.5, rx + sway, wy + r * 0.8 + drop);
    ctx.strokeStyle = INK;
    ctx.lineWidth = u * 0.006 + lw * 1.2;
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? RIBBON_BLUE : RIBBON_WHITE;
    ctx.lineWidth = u * 0.006;
    ctx.stroke();
  }
  // The finial: a gold ball on the top.
  ctx.beginPath();
  circle(ctx, x, top - u * 0.008, u * 0.011);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  circle(ctx, x - u * 0.004, top - u * 0.012, u * 0.004);
  ctx.fill();
}

// ---------------------------------------------------------------- flags

/** A rhombus-patterned pennant, used by the lane: a diamond lattice clipped to a triangle. */
export function rhombusFlag(ctx: Ctx, x: number, y: number, w: number, h: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  lattice(ctx, x - w / 2, y, w, h, w * 0.2, h * 0.2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ink(ctx, lw, INK);
}

/** A single blue diamond, for little flags far off. */
export function flagDiamond(ctx: Ctx, x: number, y: number, hw: number, hh: number): void {
  diamond(ctx, x, y, hw, hh);
}

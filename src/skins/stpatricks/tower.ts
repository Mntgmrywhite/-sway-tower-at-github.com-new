import { ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GRASS, INK, JOINT, OPENING, SHAMROCK, STONE, WOOD } from "./colors";
import { bandHeight, plait, plaitBand, type PlaitStyle } from "./knot";
import { archPath, block, shamrockPath, stemPath } from "./shapes";

// The old round tower the bars are stacked on: the top of a stone round tower (its conical cap
// long gone, so you can build it higher; there's a whole one out on the headland to compare). A
// drum of coursed limestone, tapering out a little to its foot, lit on the left and shaded on
// the right, the joints closer together toward its sides so it reads round; a projecting top
// course is the tower's floor. Halfway up, the raised round-headed doorway these towers are
// known for, a wooden ladder leaning up to it, and a narrow window; below them a band of
// interlace carved round the drum, a twist of two strands cut into the stone like the knotwork
// on a high cross; a grassy mound with shamrocks round its foot. Everything here is near: flat
// two-tone fills and one ink weight, and nothing rises above the floor line.
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

/** The drum: half width at the top and at the foot, the top course's height and half width, the foot. */
const TOP_HW = 0.212;
const FOOT_HW = 0.232;
const CORNICE_H = 0.026;
const CORNICE_HW = 0.226;
export const DRUM_FOOT = 0.24;
/** Stone courses, and joints per course across the visible half of the drum. */
const COURSE = 0.031;
const JOINTS = 6;
/** sin() of each joint's angle round the drum, for courses laid straight and offset by half a stone. */
const JOINT_SIN = [0, 0.5].map((off) => Array.from({ length: JOINTS - 1 }, (_, j) => Math.sin(-Math.PI / 2 + ((j + 1 - off) * Math.PI) / JOINTS)));
/** The raised doorway: its center, top and sill; the ladder below it; the window. */
const DOOR_X = -0.07;
const DOOR_TOP = 0.072;
const DOOR_SILL = 0.158;
const DOOR_W = 0.046;
const LADDER_HW = 0.026;
const WINDOW_X = 0.115;
/** The mound round the foot: half width and how far it rises above the foot. */
const MOUND_HW = 0.27;
const MOUND_UP = 0.024;
/** The carved band: a twist of two strands, its spacing (u) and its top edge (u below the floor line). */
const FRIEZE = plait(2);
const FRIEZE_D = 0.0155;
const FRIEZE_TOP = 0.168;
/** Carved in the stone: sunk ground, raised strands, cut lines. */
const CARVED: PlaitStyle = { ground: STONE.shade, frame: STONE.light, strands: [STONE.light], ink: JOINT, width: 0.52, contour: 0.08 };
/** Scratch: the carved band's span across the drum. */
const FRIEZE_SPAN = [0, 0];

/** A vertical band of the drum between two fractions of its half width, following its taper. */
function band(ctx: Ctx, cx: number, top: number, foot: number, u: number, a: number, b: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(cx + a * TOP_HW * u, top);
  ctx.lineTo(cx + b * TOP_HW * u, top);
  ctx.lineTo(cx + b * FOOT_HW * u, foot);
  ctx.lineTo(cx + a * FOOT_HW * u, foot);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Half width of the drum at screen y. */
function halfWidth(s: Scene, top: number, foot: number, y: number): number {
  const k = (y - top) / (foot - top);
  return s.u * (TOP_HW + (FOOT_HW - TOP_HW) * k);
}

function drumPath(ctx: Ctx, s: Scene, cx: number, top: number, foot: number): void {
  const u = s.u;
  ctx.beginPath();
  ctx.moveTo(cx - TOP_HW * u, top);
  ctx.lineTo(cx + TOP_HW * u, top);
  ctx.lineTo(cx + FOOT_HW * u, foot);
  ctx.lineTo(cx - FOOT_HW * u, foot);
  ctx.closePath();
}

export function roundTower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const top = g + CORNICE_H * u;
  const foot = g + DRUM_FOOT * u;

  // The drum: body, a lit band left of center and a shaded band on the right (both following
  // its taper), the stonework.
  drumPath(ctx, s, cx, top, foot);
  ctx.fillStyle = STONE.body;
  ctx.fill();
  band(ctx, cx, top, foot, u, -0.72, -0.36, STONE.light);
  band(ctx, cx, top, foot, u, 0.55, 1, STONE.shade);
  ctx.beginPath();
  for (let k = 0, y = top + COURSE * u; y < foot; k++, y += COURSE * u) {
    const hw = halfWidth(s, top, foot, y);
    ctx.moveTo(cx - hw, y);
    ctx.lineTo(cx + hw, y);
    const sins = JOINT_SIN[k % 2]!;
    const y0 = y - COURSE * u;
    for (let j = 0; j < sins.length; j++) {
      const x = cx + halfWidth(s, top, foot, y0) * sins[j]!;
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = JOINT;
  ctx.lineWidth = Math.max(1, u * 0.0032);
  ctx.lineCap = "butt";
  ctx.stroke();
  frieze(ctx, s, cx, g, top, foot);
  drumPath(ctx, s, cx, top, foot);
  ink(ctx, lw, INK);

  slit(ctx, s, cx, g, lw);
  doorway(ctx, s, cx, g, lw);
  ladder(ctx, s, cx, g, foot, lw);
  mound(ctx, s, cx, foot, lw);
  // The top course: the tower's floor.
  ctx.beginPath();
  block(ctx, cx - CORNICE_HW * u, g, CORNICE_HW * 2 * u, CORNICE_H * u, u * 0.006);
  ctx.fillStyle = STONE.body;
  ctx.fill();
  ctx.fillStyle = STONE.light;
  ctx.fillRect(cx - CORNICE_HW * u + u * 0.006, g + lw * 0.5, (CORNICE_HW * 2 - 0.012) * u, CORNICE_H * u * 0.3);
  ctx.fillStyle = STONE.shade;
  ctx.fillRect(cx - CORNICE_HW * u + u * 0.004, g + CORNICE_H * u * 0.72, (CORNICE_HW * 2 - 0.008) * u, CORNICE_H * u * 0.2);
  ctx.beginPath();
  block(ctx, cx - CORNICE_HW * u, g, CORNICE_HW * 2 * u, CORNICE_H * u, u * 0.006);
  ink(ctx, lw, INK);
}

/**
 * The band of interlace carved round the drum, across its whole width there, then the drum's
 * light and shade laid back over it so it still reads round.
 */
function frieze(ctx: Ctx, s: Scene, cx: number, g: number, top: number, foot: number): void {
  const u = s.u;
  const d = FRIEZE_D * u;
  const y = g + FRIEZE_TOP * u;
  const h = bandHeight(FRIEZE, d);
  const hw = halfWidth(s, top, foot, y + h / 2);
  FRIEZE_SPAN[0] = cx - hw;
  FRIEZE_SPAN[1] = cx + hw;
  plaitBand(ctx, FRIEZE, CARVED, cx, FRIEZE_SPAN, y, d, Math.max(0.7, u * 0.002));
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = STONE.light;
  ctx.fillRect(cx - 0.72 * hw, y - u * 0.002, 0.36 * hw, h + u * 0.004);
  ctx.fillStyle = STONE.shade;
  ctx.fillRect(cx + 0.55 * hw, y - u * 0.002, 0.45 * hw, h + u * 0.004);
  ctx.globalAlpha = 1;
}

/** The raised round-headed doorway: a stone surround, the dark opening. */
function doorway(ctx: Ctx, s: Scene, cx: number, g: number, lw: number): void {
  const u = s.u;
  const x = cx + DOOR_X * u;
  const sill = g + DOOR_SILL * u;
  const h = (DOOR_SILL - DOOR_TOP) * u;
  const w = DOOR_W * u;
  const rim = u * 0.009;
  ctx.beginPath();
  archPath(ctx, x - w / 2 - rim, sill + rim * 0.6, w + rim * 2, h + rim * 1.6);
  ctx.fillStyle = STONE.light;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  archPath(ctx, x - w / 2, sill, w, h);
  ctx.fillStyle = OPENING;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
}

/** A narrow round-headed window, right of center. */
function slit(ctx: Ctx, s: Scene, cx: number, g: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  archPath(ctx, cx + WINDOW_X * u - u * 0.009, g + u * 0.118, u * 0.018, u * 0.05);
  ctx.fillStyle = OPENING;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
}

/** A wooden ladder leaning up to the doorway's sill, its feet in the grass. */
function ladder(ctx: Ctx, s: Scene, cx: number, g: number, foot: number, lw: number): void {
  const u = s.u;
  const x = cx + DOOR_X * u;
  const top = g + (DOOR_SILL - 0.008) * u;
  const bottom = foot + u * 0.012;
  const hw = LADDER_HW * u;
  const rail = u * 0.009;
  ctx.beginPath();
  for (let y = top + u * 0.017; y < bottom - u * 0.01; y += u * 0.022) ctx.rect(x - hw, y, hw * 2, u * 0.0065);
  ctx.rect(x - hw - rail / 2, top, rail, bottom - top);
  ctx.rect(x + hw - rail / 2, top, rail, bottom - top);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ink(ctx, lw * 0.75, INK);
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(x - hw - rail * 0.3, top + lw * 0.4, rail * 0.35, bottom - top - lw);
  ctx.fillRect(x + hw - rail * 0.3, top + lw * 0.4, rail * 0.35, bottom - top - lw);
}

/**
 * Shamrocks on the mound: x (u from center), how far up the mound (fraction), size (u). None on
 * the mound's left foot, over the left gatepost: the hat rises there on the leprechaun's head
 * (lookout.ts), in front of the mound's edge.
 */
const MOUND_SHAMROCKS = [
  [-0.13, 0.62, 0.034],
  [0.07, 0.8, 0.03],
  [0.19, 0.5, 0.034],
] as const;

/** The grassy mound round the foot: it laps over the drum's foot and the ladder's feet. */
function mound(ctx: Ctx, s: Scene, cx: number, foot: number, lw: number): void {
  const u = s.u;
  const hw = MOUND_HW * u;
  const up = MOUND_UP * u;
  const base = foot + u * 0.018;
  ctx.beginPath();
  ctx.moveTo(cx - hw, base);
  ctx.bezierCurveTo(cx - hw * 0.8, foot - up * 0.6, cx - hw * 0.45, foot - up, cx, foot - up);
  ctx.bezierCurveTo(cx + hw * 0.45, foot - up, cx + hw * 0.8, foot - up * 0.6, cx + hw, base);
  ctx.quadraticCurveTo(cx, base + u * 0.014, cx - hw, base);
  ctx.closePath();
  ctx.fillStyle = GRASS.body;
  ctx.fill();
  // A shaded band along its foot and a lit crown, both drawn inside its outline.
  ctx.fillStyle = GRASS.shade;
  ctx.beginPath();
  ctx.moveTo(cx - hw, base);
  ctx.quadraticCurveTo(cx, base + u * 0.014, cx + hw, base);
  ctx.quadraticCurveTo(cx, base - u * 0.008, cx - hw, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GRASS.light;
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.55, foot - up * 0.5);
  ctx.bezierCurveTo(cx - hw * 0.33, foot - up * 1.02, cx + hw * 0.33, foot - up * 1.02, cx + hw * 0.55, foot - up * 0.5);
  ctx.bezierCurveTo(cx + hw * 0.33, foot - up * 0.72, cx - hw * 0.33, foot - up * 0.72, cx - hw * 0.55, foot - up * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - hw, base);
  ctx.bezierCurveTo(cx - hw * 0.8, foot - up * 0.6, cx - hw * 0.45, foot - up, cx, foot - up);
  ctx.bezierCurveTo(cx + hw * 0.45, foot - up, cx + hw * 0.8, foot - up * 0.6, cx + hw, base);
  ink(ctx, lw, INK);
  shamrocks(ctx, s, cx, foot - up, base, MOUND_SHAMROCKS, lw);
}

/** Inked shamrock clumps at [x, depth fraction between top and base, size] (u). */
export function shamrocks(ctx: Ctx, s: Scene, cx: number, top: number, base: number, list: readonly (readonly [number, number, number])[], lw: number): void {
  const u = s.u;
  ctx.beginPath();
  for (const [x, f, k] of list) stemPath(ctx, cx + x * u, top + (base - top) * f - k * u * 0.25, k * u);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.lineCap = "round";
  ctx.stroke();
  // The ink rim is the same leaves a little larger, filled in ink under them.
  ctx.beginPath();
  for (const [x, f, k] of list) shamrockPath(ctx, cx + x * u, top + (base - top) * f - k * u * 0.25, k * u + lw * 1.9);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  for (const [x, f, k] of list) shamrockPath(ctx, cx + x * u, top + (base - top) * f - k * u * 0.25, k * u);
  ctx.fillStyle = SHAMROCK;
  ctx.fill();
}

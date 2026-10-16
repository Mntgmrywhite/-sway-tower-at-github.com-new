import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLUE, DOORWAY, INK, LEAF, LIME, MEADOW_SHADE, ORANGE, PURPLE, RED, WOOD, YELLOW, type Shades } from "./colors";
import { block, inkedBlock } from "./shapes";

// The toy fort the tower is built on, and what stands around it on the meadow. The fort is
// made of the same chunky blocks as the tower: a wooden plank across the top (the tower's
// floor), two red pillars either side of a yellow arch block with the gate, blue walls, and
// two purple cylinder turrets under red cone roofs (purple, not green: a green cylinder with a
// lit stripe would recall a certain game's pipes). Beside it, a lollipop tree on its peg and a
// tree of stacked rings, and down in front a little wind-up mouse whose key turns slowly. All
// of it is near: flat two-tone fills and one ink weight. Nothing rises above the base block's
// top, so the slider's first pass never sweeps over it, and nothing above the floor line
// stands in the tower's column.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** Ink width up close. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** Center line of the fort: under the base block. */
function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

/** The fort's foot on the meadow, in u below the floor line. Trees stand on the same line. */
const FOOT = 0.18;
const PLANK = 0.032;
const KEEP_HW = 0.22;
const GATE_HW = 0.075;
const WALL = [0.22, 0.27] as const;
const TURRET_X = 0.305;
const TURRET_HW = 0.04;
const TURRET_TOP = 0.012;
const ROOF_HW = 0.052;
const ROOF_H = 0.056;
const SIDES = [-1, 1] as const;

// ---------------------------------------------------------------- the fort

export function fort(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (s.groundY - u * 0.06 > s.cssH) return;
  const cx = centerX(s);
  const g = s.groundY;
  const lw = inkW(s);
  const r = u * 0.008;
  const foot = g + FOOT * u;

  // A soft shadow on the meadow along the foot.
  ctx.fillStyle = MEADOW_SHADE;
  ctx.beginPath();
  block(ctx, cx - u * 0.37, foot - u * 0.008, u * 0.74, u * 0.02, u * 0.01);
  ctx.fill();

  for (const m of SIDES) {
    // Walls out to the turrets, each with one merlon block on top.
    const w0 = m < 0 ? cx - WALL[1] * u : cx + WALL[0] * u;
    inkedBlock(ctx, w0, g + u * 0.075, (WALL[1] - WALL[0]) * u, foot - g - u * 0.075, BLUE, lw, r);
    inkedBlock(ctx, w0 + u * 0.006, g + u * 0.046, (WALL[1] - WALL[0] - 0.012) * u, u * 0.03, ORANGE, lw, r * 0.7);
    turret(ctx, s, cx + m * TURRET_X * u, g, foot, lw);
    // A pillar either side of the gate, each with an arched window.
    const p0 = m < 0 ? cx - KEEP_HW * u : cx + GATE_HW * u;
    const pw = (KEEP_HW - GATE_HW) * u;
    inkedBlock(ctx, p0, g + PLANK * u, pw, foot - g - PLANK * u, RED, lw, r);
    ctx.beginPath();
    archPath(ctx, p0 + pw / 2 - u * 0.018, g + u * 0.125, u * 0.036, u * 0.056);
    ctx.fillStyle = DOORWAY;
    ctx.fill();
    ink(ctx, lw, INK);
  }
  gate(ctx, s, cx, g + PLANK * u, foot, lw, r);
  // The plank across the top: the tower's floor.
  inkedBlock(ctx, cx - (KEEP_HW + 0.016) * u, g, (KEEP_HW + 0.016) * 2 * u, PLANK * u, WOOD, lw, r);
}

/** The arch block in the middle: a yellow block with a round-topped gate cut out of it. */
function gate(ctx: Ctx, s: Scene, cx: number, top: number, foot: number, lw: number, r: number): void {
  const u = s.u;
  const x = cx - GATE_HW * u;
  const w = GATE_HW * 2 * u;
  inkedBlock(ctx, x, top, w, foot - top, YELLOW, lw, r);
  // The gateway, with a wooden door of two planks.
  const gw = u * 0.072;
  const gh = u * 0.11;
  ctx.beginPath();
  archPath(ctx, cx - gw / 2, foot, gw, gh);
  ctx.fillStyle = DOORWAY;
  ctx.fill();
  ctx.beginPath();
  archPath(ctx, cx - gw / 2 + u * 0.008, foot, gw - u * 0.016, gh - u * 0.008);
  ctx.fillStyle = WOOD.shade;
  ctx.fill();
  ctx.fillStyle = WOOD.body;
  ctx.fillRect(cx - gw / 2 + u * 0.008, foot - gh * 0.55, gw - u * 0.016, u * 0.006);
  ctx.fillStyle = DOORWAY;
  ctx.fillRect(cx - u * 0.0015, foot - gh + u * 0.02, u * 0.003, gh - u * 0.02);
  ctx.beginPath();
  archPath(ctx, cx - gw / 2, foot, gw, gh);
  ink(ctx, lw, INK);
}

/** An arch standing on y (left edge x, w wide, h tall), starting its own subpath. */
function archPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + r);
  ctx.arc(x + r, y - h + r, r, Math.PI, Math.PI * 2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

/** A purple cylinder turret with a round window, under a red cone roof. */
function turret(ctx: Ctx, s: Scene, x: number, g: number, foot: number, lw: number): void {
  const u = s.u;
  const hw = TURRET_HW * u;
  const top = g + TURRET_TOP * u;
  const r = u * 0.008;
  // The cylinder: body, a lit stripe left of center, a shaded stripe on the right.
  ctx.beginPath();
  block(ctx, x - hw, top, hw * 2, foot - top, r);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ctx.fillStyle = PURPLE.light;
  ctx.fillRect(x - hw * 0.62, top + lw, hw * 0.34, foot - top - lw * 2);
  ctx.fillStyle = PURPLE.shade;
  ctx.fillRect(x + hw * 0.5, top + lw, hw * 0.5 - lw * 0.5, foot - top - lw * 2);
  ink(ctx, lw, INK);
  // A band near the top, and a round window.
  ctx.beginPath();
  ctx.moveTo(x - hw, top + u * 0.03);
  ctx.lineTo(x + hw, top + u * 0.03);
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  circle(ctx, x, top + u * 0.09, u * 0.014);
  ctx.fillStyle = DOORWAY;
  ctx.fill();
  ink(ctx, lw, INK);
  cone(ctx, s, x, top, lw, RED);
}

/** A cone roof standing on y, centered on x: lit left half, shaded right half, a rounded tip. */
function cone(ctx: Ctx, s: Scene, x: number, y: number, lw: number, c: Shades): void {
  const u = s.u;
  const hw = ROOF_HW * u;
  const h = ROOF_H * u;
  const tip = y - h;
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x - u * 0.006, tip + u * 0.006);
  ctx.quadraticCurveTo(x, tip - u * 0.002, x + u * 0.006, tip + u * 0.006);
  ctx.lineTo(x + hw, y);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = c.shade;
  ctx.beginPath();
  ctx.moveTo(x + u * 0.008, tip);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x + hw * 0.25, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.light;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.006, tip + u * 0.01);
  ctx.lineTo(x - hw * 0.55, y);
  ctx.lineTo(x - hw * 0.25, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x - u * 0.006, tip + u * 0.006);
  ctx.quadraticCurveTo(x, tip - u * 0.002, x + u * 0.006, tip + u * 0.006);
  ctx.lineTo(x + hw, y);
  ctx.closePath();
  ink(ctx, lw, INK);
}

// ---------------------------------------------------------------- trees on pegs

/** Where the trees stand, in u from the center line. */
const LOLLIPOP_X = -0.425;
const RINGS_X = 0.425;

/** A round wooden stand on the meadow, like the foot of a toy-train-set tree. */
function stand(ctx: Ctx, s: Scene, x: number, foot: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  block(ctx, x - u * 0.03, foot - u * 0.016, u * 0.06, u * 0.016, u * 0.007);
  ctx.fillStyle = WOOD.shade;
  ctx.fill();
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(x - u * 0.022, foot - u * 0.014, u * 0.044, u * 0.004);
  ink(ctx, lw, INK);
}

/** A peg standing up from (x, foot) to `top`. */
function peg(ctx: Ctx, s: Scene, x: number, foot: number, top: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  block(ctx, x - u * 0.007, top, u * 0.014, foot - top, u * 0.004);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ink(ctx, lw, INK);
}

/** A lollipop tree: a round green canopy on a wooden peg in its stand. */
export function lollipopTree(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + LOLLIPOP_X * u;
  const foot = s.groundY + FOOT * u;
  if (foot - u * 0.2 > s.cssH) return;
  const lw = inkW(s);
  const r = u * 0.044;
  const cy = foot - u * 0.15;
  peg(ctx, s, x, foot - u * 0.01, cy, lw);
  stand(ctx, s, x, foot, lw);
  ctx.beginPath();
  circle(ctx, x, cy, r);
  ctx.fillStyle = LEAF.shade;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x - r * 0.07, cy - r * 0.1, r * 0.86);
  ctx.fillStyle = LEAF.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x - r * 0.38, cy - r * 0.42, r * 0.26, r * 0.16, -0.6);
  ctx.fillStyle = LEAF.light;
  ctx.fill();
}

/** Rings stacked on the ring tree, bottom first: width (u). */
const RINGS = [0.092, 0.076, 0.06, 0.044] as const;
const RING_H = 0.027;

/** A tree of stacked green rings on a peg, a yellow ball on top. */
export function ringTree(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + RINGS_X * u;
  const foot = s.groundY + FOOT * u;
  if (foot - u * 0.2 > s.cssH) return;
  const lw = inkW(s);
  const base = foot - u * 0.016;
  const top = base - RINGS.length * RING_H * u;
  peg(ctx, s, x, base, top - u * 0.02, lw);
  stand(ctx, s, x, foot, lw);
  for (let i = 0; i < RINGS.length; i++) {
    const w = RINGS[i]! * u;
    const y = base - (i + 1) * RING_H * u;
    const c = i % 2 ? LIME : LEAF;
    ctx.beginPath();
    block(ctx, x - w / 2, y, w, RING_H * u, RING_H * u * 0.5);
    ctx.fillStyle = c.shade;
    ctx.fill();
    ctx.beginPath();
    block(ctx, x - w / 2, y, w * 0.92, RING_H * u * 0.78, RING_H * u * 0.4);
    ctx.fillStyle = c.body;
    ctx.fill();
    ctx.fillStyle = c.light;
    ctx.fillRect(x - w * 0.3, y + u * 0.004, w * 0.3, u * 0.004);
    ctx.beginPath();
    block(ctx, x - w / 2, y, w, RING_H * u, RING_H * u * 0.5);
    ink(ctx, lw, INK);
  }
  // The ball on top.
  const br = u * 0.017;
  const by = top - br * 0.85;
  ctx.beginPath();
  circle(ctx, x, by, br);
  ctx.fillStyle = YELLOW.shade;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x - br * 0.08, by - br * 0.1, br * 0.82);
  ctx.fillStyle = YELLOW.body;
  ctx.fill();
}

// ---------------------------------------------------------------- the wind-up mouse

/** Where the mouse sits, in u from the center line; its feet are this far below the floor line. */
const MOUSE_X = 0.3;
const MOUSE_FEET = 0.285;

/**
 * A wind-up mouse in front of the fort, facing in: a round toy body on two little wheels, a
 * round ear, a curly tail, and the key in its back turning slowly. It rocks a little as it runs
 * down, then rests (its key keeps turning).
 */
export function windUpMouse(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + MOUSE_X * u;
  const feet = s.groundY + MOUSE_FEET * u;
  if (feet - u * 0.08 > s.cssH) return;
  const lw = inkW(s);
  const rock = Math.sin(s.t * 2.2) * 0.04 * Math.max(0, Math.sin(s.t * 0.4));
  const bw = u * 0.05;
  const bh = u * 0.03;
  const cy = feet - u * 0.01 - bh;
  ctx.save();
  ctx.translate(x, feet);
  ctx.rotate(rock);
  ctx.translate(-x, -feet);
  // Tail: a curl off the back (right).
  ctx.beginPath();
  ctx.moveTo(x + bw * 0.95, cy + bh * 0.5);
  ctx.quadraticCurveTo(x + bw * 1.5, cy + bh * 0.6, x + bw * 1.35, cy - bh * 0.2);
  ctx.quadraticCurveTo(x + bw * 1.25, cy - bh * 0.55, x + bw * 1.1, cy - bh * 0.25);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, lw * 0.7);
  ctx.lineCap = "round";
  ctx.stroke();
  // The key in its back: a stem and a two-lobed bow that turns (drawn edge-on as it spins).
  const turn = Math.cos(s.t * 1.4);
  const kx = x + bw * 0.55;
  const ky = cy - bh * 0.9;
  ctx.beginPath();
  ctx.rect(kx - u * 0.003, ky, u * 0.006, bh * 0.4);
  ctx.fillStyle = YELLOW.shade;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  oval(ctx, kx - u * 0.012 * turn, ky - u * 0.008, Math.max(u * 0.002, u * 0.011 * Math.abs(turn)), u * 0.009);
  oval(ctx, kx + u * 0.012 * turn, ky - u * 0.008, Math.max(u * 0.002, u * 0.011 * Math.abs(turn)), u * 0.009);
  ctx.fillStyle = YELLOW.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // Wheels.
  ctx.beginPath();
  circle(ctx, x - bw * 0.45, feet - u * 0.008, u * 0.008);
  circle(ctx, x + bw * 0.45, feet - u * 0.008, u * 0.008);
  ctx.fillStyle = INK;
  ctx.fill();
  // Body: a rounded dome, nose pointing left (in toward the fort's gate).
  ctx.beginPath();
  ctx.moveTo(x + bw, cy + bh);
  ctx.quadraticCurveTo(x + bw * 1.05, cy - bh * 0.15, x + bw * 0.3, cy - bh * 0.05);
  ctx.quadraticCurveTo(x - bw * 0.55, cy, x - bw * 1.05, cy + bh * 0.72);
  ctx.quadraticCurveTo(x - bw * 1.12, cy + bh, x - bw * 0.9, cy + bh);
  ctx.closePath();
  ctx.fillStyle = "#b9b2cf";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#d9d4ea";
  ctx.fillRect(x - bw * 1.2, cy - bh * 0.2, bw * 2.4, bh * 0.45);
  ctx.restore();
  ink(ctx, lw, INK);
  // Ear, eye and nose.
  ctx.beginPath();
  circle(ctx, x - bw * 0.25, cy + bh * 0.05, u * 0.011);
  ctx.fillStyle = "#ff9fc0";
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x - bw * 0.62, cy + bh * 0.45, u * 0.0035);
  ctx.fill();
  ctx.fillStyle = "#ff7eb3";
  ctx.beginPath();
  circle(ctx, x - bw * 1.08, cy + bh * 0.82, u * 0.005);
  ctx.fill();
  ctx.restore();
}

/** Everything on the meadow around the tower. */
export function meadowProps(ctx: Ctx, s: Scene): void {
  lollipopTree(ctx, s);
  ringTree(ctx, s);
  fort(ctx, s);
  windUpMouse(ctx, s);
}

import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { beat, flicker, lightsOut, swing } from "./ambient";
import { cast } from "./cast";
import { INK, IRON, LAMP, LAMP_CORE, LAMP_DEEP, smooth } from "./common";
import { belowMoon, loopCopy, restLine } from "./lines";
import { HALO_REACH, moonAt } from "./sky";
import { laneOf, laneY } from "./skyline";
import { smoke } from "./smoke";
import { ISLE_STONE_INDEX, SLOT } from "./slot";
import { mansionAt } from "./mansion";
import { level, MIST_SETTLED, toneOfLevel } from "./tone";
import { crooked, drawTree, forkAt, windAt, type Tree } from "./trees";

// The upside-down isles: up past the storm the sky fills with floating isles of jagged slate, each
// tapering to a crooked point, bony roots clawing out of its underside and a lantern swinging on a
// chain, and on each something impossible (all our own designs):
//  - a witch's cottage with a lit window, a smoking chimney, a broom by the door and a cauldron
//    bubbling green in the yard;
//  - a graveyard whose stones also hang upside down beneath it, a crooked fence and a dead tree;
//  - a spiral staircase climbing up into nothing, a lamp at its top;
//  - a lone door in the sky that now and then swings open on a green glow full of stars;
//  - a house hanging upside down on chains under its isle, its chimney's smoke falling downward;
//  - a bridge between two small isles that loops round into itself (the ghostly carriage's road);
//  - a floating castle, its pennants flapping.
// They pass by in the loop's night, one or two at a time, at their own parallax (ISLE_P), in both
// lanes: those in the left lane come out of the dark below the moon (nothing crosses it), those in
// the right come down from above and drift behind the mansion. Placed by level, so the loop repeats
// exactly.

/** The isles' parallax. */
export const ISLE_P = 0.55;
/**
 * The isles: where in the loop (fraction), lane, where in it (frac: the isle's top surface, from the
 * lane's top: just under the HUD on the right, the moon's halo on the left), kind, and when it shows,
 * in levels from its own (in over win[0]..win[1], out over win[2]..win[3]). One at a time in a lane
 * (crossfading), between the drowned hollow's set pieces in the left lane (drowned.ts); in the right
 * lane they come down from above and fade before they reach the mansion.
 */
export const ISLES = [
  { f: 0.05, side: -1, frac: 0, kind: "cottage", win: [-9, -6, 15, 19] },
  { f: 0.1, side: 1, frac: 0, kind: "graves", win: [-10, -6, 9, 13] },
  { f: 0.567, side: -1, frac: 0, kind: "stair", win: [-9, -6, 13, 17] },
  { f: 0.3, side: 1, frac: 0, kind: "door", win: [-10, -6, 9, 13] },
  { f: 0.5, side: 1, frac: 0, kind: "hanging", win: [-10, -6, 9, 13] },
  { f: 0.7, side: 1, frac: 0, kind: "bridge", win: [-10, -6, 9, 13] },
  { f: 0.9, side: 1, frac: 0, kind: "castle", win: [-10, -6, 9, 13] },
] as const;
export type IsleKind = (typeof ISLES)[number]["kind"];

const ROCK = "#2a2340";
const ROCK_TOP = "#3a3058";
const ROCK_DARK = "#1c1730";
const ROOT = "#8a8098";
const GREEN = "#8cff7a";
const GREEN_GLOW = alpha("#9fe0b8", 0.35);
const WALL = "#3a2c50";
const WALL_DARK = "#2a1f3d";
const SLATE = "#1d1a33";

/** Scratch frame: origin (screen px: the middle of the isle's top surface), px per u. */
const F = { x: 0, y: 0, U: 1 };
const X = (x: number) => F.x + x * F.U;
const Y = (y: number) => F.y - y * F.U;
function M(ctx: Ctx, x: number, y: number): void {
  ctx.moveTo(X(x), Y(y));
}
function L(ctx: Ctx, x: number, y: number): void {
  ctx.lineTo(X(x), Y(y));
}
function Q(ctx: Ctx, cx: number, cy: number, x: number, y: number): void {
  ctx.quadraticCurveTo(X(cx), Y(cy), X(x), Y(y));
}
function rect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  M(ctx, x0, y0);
  L(ctx, x1, y0);
  L(ctx, x1, y1);
  L(ctx, x0, y1);
  ctx.closePath();
}

/** Scratch: each isle's anchors this frame (screen px), for the stage. vis 0 when it is not on screen. */
export const ISLE_AT = ISLES.map(() => ({
  vis: 0,
  k: 0,
  x: 0,
  y: 0,
  /** Its drawing's top and bottom (screen y). */
  top: 0,
  bottom: 0,
  /** A point under its tip (where a spider may hang from), a perch on top, a ridge to walk, a window, a hideout, a road. */
  tip: { x: 0, y: 0 },
  perch: { x: 0, y: 0 },
  bough: { x: 0, y: 0 },
  ridge: { hx: 0, hy: 0, ex: 0, ey: 0, on: false },
  pane: { x: 0, y: 0, w: 0, h: 0, on: false },
  stones: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  road: { x0: 0, y0: 0, xm: 0, ym: 0, x1: 0, y1: 0, on: false },
  roost: { x: 0, y: 0, on: false },
}));

/** An isle out of sight: every spot zeroed, so the stage reads the same for the same scene whatever came before. */
function park(A: (typeof ISLE_AT)[number]): void {
  A.k = A.x = A.y = 0;
  A.tip.x = A.tip.y = A.perch.x = A.perch.y = A.bough.x = A.bough.y = 0;
  A.ridge.hx = A.ridge.hy = A.ridge.ex = A.ridge.ey = 0;
  A.pane.x = A.pane.y = A.pane.w = A.pane.h = 0;
  for (const st of A.stones) st.x = st.y = 0;
  A.road.x0 = A.road.y0 = A.road.xm = A.road.ym = A.road.x1 = A.road.y1 = 0;
  A.roost.x = A.roost.y = 0;
  A.ridge.on = A.pane.on = A.road.on = A.roost.on = false;
}

/** A rock isle's body: a flat-ish top `w` wide, jagged sides tapering `depth` down to a crooked point. */
function rock(ctx: Ctx, w: number, depth: number, seed: number): void {
  const n = 7;
  const tip = (hash(seed) - 0.5) * w * 0.3;
  M(ctx, -w / 2, 0.004);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    L(ctx, -w / 2 + w * f, 0.004 + (hash(seed + i) - 0.5) * 0.006);
  }
  // Down the right side in jags to the crooked tip, and back up the left.
  for (let i = 1; i <= 4; i++) {
    const f = i / 4;
    const x = w / 2 + (tip - w / 2) * f + (hash(seed + 10 + i) - 0.5) * w * 0.12;
    L(ctx, x, -depth * f * (0.9 + hash(seed + 20 + i) * 0.1));
  }
  L(ctx, tip, -depth);
  for (let i = 3; i >= 1; i--) {
    const f = i / 4;
    const x = -w / 2 + (tip + w / 2) * f + (hash(seed + 30 + i) - 0.5) * w * 0.12;
    L(ctx, x, -depth * f * (0.85 + hash(seed + 40 + i) * 0.1));
  }
  ctx.closePath();
}

/** The isle under whatever stands on it: rock, lit top, strata, bony roots, a lantern swinging on a chain. */
function isle(ctx: Ctx, s: Scene, w: number, depth: number, seed: number, lw: number, i: number): void {
  // Bony roots clawing out of the underside, behind the rock.
  ctx.beginPath();
  for (let r = 0; r < 4; r++) {
    const x = -w * 0.32 + (w * 0.64 * r) / 3 + (hash(seed + 60 + r) - 0.5) * w * 0.1;
    const y0 = -depth * (0.35 + 0.25 * (1 - Math.abs(r - 1.5) / 1.5));
    const len = depth * (0.35 + hash(seed + 70 + r) * 0.3);
    const curl = (hash(seed + 80 + r) - 0.5) * 2;
    M(ctx, x, y0);
    Q(ctx, x + curl * w * 0.08, y0 - len * 0.6, x + curl * w * 0.12, y0 - len);
    Q(ctx, x + curl * w * 0.16, y0 - len * 1.05, x + curl * w * 0.14, y0 - len * 0.92);
  }
  ctx.strokeStyle = ROOT;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  rock(ctx, w, depth, seed);
  ctx.fillStyle = ROCK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  // The lit top, and a crack or two in the slate.
  ctx.beginPath();
  M(ctx, -w / 2 + 0.004, -0.002);
  L(ctx, w / 2 - 0.004, -0.002);
  L(ctx, w / 2 - 0.02, -0.018);
  L(ctx, -w / 2 + 0.016, -0.016);
  ctx.closePath();
  ctx.fillStyle = ROCK_TOP;
  ctx.fill();
  ctx.beginPath();
  M(ctx, -w * 0.1, -0.02);
  L(ctx, -w * 0.05, -depth * 0.4);
  L(ctx, -w * 0.12, -depth * 0.6);
  M(ctx, w * 0.2, -0.03);
  L(ctx, w * 0.16, -depth * 0.35);
  ctx.strokeStyle = ROCK_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  // The lantern on its chain, swinging, under one side.
  const lx = (seed % 2 ? -1 : 1) * w * 0.3;
  const a = swing(s.t, 2.5 + (seed % 3) * 0.4, 0.12, seed, s.sinceLand ?? Infinity, 0.25, s.still === true);
  const hx = X(lx);
  const hy = Y(-depth * 0.28);
  const len = 0.045 * F.U;
  const bx = hx - Math.sin(a) * len;
  const by = hy + Math.cos(a) * len;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, bx, by + 0.01 * F.U, 0.02 * F.U);
  ctx.fillStyle = LANTERN_GLOW;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(bx - 0.006 * F.U, by, 0.012 * F.U, 0.018 * F.U);
  ctx.fillStyle = flicker(s.t, 4100 + i) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.stroke();
}
const LANTERN_GLOW = alpha(LAMP, 0.22);

// ---------------------------------------------------------------- what stands on the isles

const COTTAGE_TREE: Tree = crooked(55, 0.2, 1.1, 3, 1, -1);
const COTTAGE_TREE_X = 0.066;

function cottage(ctx: Ctx, s: Scene, lw: number): void {
  // Walls leaning, a steep crooked roof with a curled tip, a chimney, a lit window, a door, a broom.
  ctx.beginPath();
  M(ctx, -0.05, 0);
  L(ctx, -0.054, 0.05);
  L(ctx, 0.03, 0.054);
  L(ctx, 0.034, 0);
  ctx.closePath();
  ctx.fillStyle = WALL;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, 0.008, 0.06, 0.022, 0.1);
  ctx.fillStyle = WALL_DARK;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.066, 0.046);
  Q(ctx, -0.03, 0.07, -0.01, 0.118);
  ctx.arc(X(0.0), Y(0.118), 0.01 * F.U, Math.PI, Math.PI * 2.4);
  Q(ctx, 0.02, 0.08, 0.046, 0.05);
  ctx.closePath();
  ctx.fillStyle = SLATE;
  ctx.fill();
  ctx.stroke();
  const lit = lightsOut(s.t, 4201, 20) ? 0 : flicker(s.t, 4201);
  ctx.beginPath();
  rect(ctx, -0.036, 0.016, -0.014, 0.038);
  ctx.fillStyle = lit <= 0 ? WALL_DARK : lit < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, 0.006, 0, 0.022, 0.03);
  ctx.fillStyle = WALL_DARK;
  ctx.fill();
  ctx.stroke();
  // A broom leaning by the door.
  ctx.beginPath();
  M(ctx, 0.04, 0.0);
  L(ctx, 0.048, 0.05);
  ctx.strokeStyle = "#6a4a2a";
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  M(ctx, 0.034, 0.0);
  L(ctx, 0.04, 0.016);
  L(ctx, 0.048, 0.016);
  L(ctx, 0.05, 0.0);
  ctx.closePath();
  ctx.fillStyle = "#b08a4a";
  ctx.fill();
  // The cauldron in the yard: black iron on three legs, bubbling green (a bigger bloop now and then).
  const cx = -0.07;
  ctx.beginPath();
  M(ctx, cx - 0.018, 0.024);
  Q(ctx, cx - 0.02, 0.0, cx, 0.002);
  Q(ctx, cx + 0.02, 0.0, cx + 0.018, 0.024);
  ctx.closePath();
  ctx.fillStyle = "#15121d";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(X(cx), Y(0.024), 0.018 * F.U, 0.005 * F.U, 0, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(cx), Y(0.024), 0.03 * F.U);
  ctx.fillStyle = GREEN_GLOW;
  ctx.fill();
  const b = beat(s.t, 1.5, 5, 9, 4300);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const ph = (s.t / 0.9 + k / 3) % 1;
    circle(ctx, X(cx + (k - 1) * 0.008 + Math.sin(ph * 6 + k) * 0.002), Y(0.026 + ph * 0.03), (0.003 + 0.002 * (1 - ph)) * F.U);
  }
  if (b.since < 0.6) {
    const f = b.since / 0.6;
    circle(ctx, X(cx), Y(0.03 + f * 0.01), 0.008 * (1 - f) * F.U + 0.001);
    for (let k = -1; k <= 1; k++) circle(ctx, X(cx + k * 0.016 * f), Y(0.03 + f * 0.03 - f * f * 0.03), 0.003 * F.U);
  }
  ctx.fillStyle = GREEN;
  ctx.fill();
  smoke(ctx, s.t, X(0.015), Y(0.104), F.U * 0.008, F.U * 0.1, F.U * 0.03, 1.2, 0.26, 31);
  drawTree(ctx, COTTAGE_TREE, X(COTTAGE_TREE_X), Y(-0.002), 0.075 * F.U, "#15121d", windAt(s.t, 55, 0.08, 0, 1));
}

const GRAVE_TREE: Tree = crooked(63, -0.15, 1.2, 4, 1, 1);

function graves(ctx: Ctx, s: Scene, lw: number, depth: number): void {
  // A dead tree, the stones above and the same stones hanging beneath, a crooked fence.
  drawTree(ctx, GRAVE_TREE, X(0.05), Y(-0.002), 0.1 * F.U, "#15121d", windAt(s.t, 63, 0.08, 0, 1));
  // A ghost may rise behind a stone: the cast is called in just before them. (Its stage may place
  // every isle, which moves the frame F: this isle's frame is put back after.)
  const alpha0 = ctx.globalAlpha;
  const fx = F.x;
  const fy = F.y;
  const fu = F.U;
  cast(ctx, s, SLOT.stone, ISLE_STONE_INDEX);
  cast(ctx, s, SLOT.stone, ISLE_STONE_INDEX + 1);
  F.x = fx;
  F.y = fy;
  F.U = fu;
  ctx.globalAlpha = alpha0;
  ctx.beginPath();
  for (const [x, h, k] of GRAVE_STONES) {
    tomb(ctx, x, 0, h, k, 1);
    tomb(ctx, x * 0.8 + 0.006, -depth * 0.7, h * 0.8, k, -1);
  }
  ctx.fillStyle = "#4a4d66";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.beginPath();
  for (const [x, h] of GRAVE_STONES) {
    M(ctx, x - 0.008, 0.002);
    L(ctx, x - 0.008, h * 0.75);
  }
  ctx.strokeStyle = "#8a8eae";
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const x = -0.085 + k * 0.012;
    M(ctx, x, 0);
    L(ctx, x + (hash(k + 4400) - 0.5) * 0.006, 0.022);
  }
  M(ctx, -0.088, 0.016);
  L(ctx, -0.024, 0.017);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
}
export { ISLE_STONE_INDEX } from "./slot";
const GRAVE_STONES = [
  [-0.05, 0.034, 0],
  [-0.012, 0.028, 1],
  [0.012, 0.022, 0],
] as const;

/** A small headstone with its foot at (x, y), h tall, standing up (dir 1) or hanging upside down (-1). */
function tomb(ctx: Ctx, x: number, y: number, h: number, kind: number, dir: number): void {
  const w = h * 0.5;
  M(ctx, x - w / 2, y);
  L(ctx, x - w / 2, y + dir * h * 0.7);
  if (kind) {
    L(ctx, x, y + dir * h);
    L(ctx, x + w / 2, y + dir * h * 0.7);
  } else {
    Q(ctx, x, y + dir * h * 1.2, x + w / 2, y + dir * h * 0.7);
  }
  L(ctx, x + w / 2, y);
  ctx.closePath();
}

function stair(ctx: Ctx, s: Scene, lw: number): void {
  // A spiral stair round a thin post, winding up into nothing, steps catching the moonlight.
  const H = 0.24;
  ctx.beginPath();
  M(ctx, -0.003, 0);
  L(ctx, -0.003, H);
  L(ctx, 0.003, H);
  L(ctx, 0.003, 0);
  ctx.closePath();
  ctx.fillStyle = "#15121d";
  ctx.fill();
  const n = 16;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = k * 0.85;
      const y = (H * (k + 0.5)) / n;
      const front = Math.sin(a) > 0;
      if (front !== (pass === 1)) continue;
      const r = 0.035 * (1 - (k / n) * 0.35);
      const x = Math.cos(a) * r;
      M(ctx, 0, y);
      L(ctx, x, y - 0.002);
      L(ctx, x, y + 0.006);
      L(ctx, 0, y + 0.004);
      ctx.closePath();
    }
    ctx.fillStyle = pass ? "#5a5480" : "#2a2645";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
  }
  // The lamp at the top, on a little crook.
  ctx.beginPath();
  M(ctx, 0, H);
  Q(ctx, 0, H + 0.02, 0.016, H + 0.02);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, X(0.016), Y(H + 0.004), 0.02 * F.U);
  ctx.fillStyle = LANTERN_GLOW;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, 0.011, H - 0.004, 0.021, H + 0.012);
  ctx.fillStyle = flicker(s.t, 4501) < 1 ? LAMP_DEEP : LAMP_CORE;
  ctx.fill();
  // At its foot a crooked iron gate, and a lantern on a crook either side of the isle, swinging.
  ctx.beginPath();
  M(ctx, -0.034, 0);
  L(ctx, -0.036, 0.06);
  ctx.arc(X(0), Y(0.06), 0.036 * F.U, Math.PI, 0);
  L(ctx, 0.034, 0);
  for (let k = -2; k <= 2; k++) {
    M(ctx, k * 0.012, 0);
    L(ctx, k * 0.012 + 0.001, 0.05 + 0.03 * (1 - Math.abs(k) / 3));
  }
  ctx.arc(X(0), Y(0.1), 0.008 * F.U, Math.PI * 0.5, Math.PI * 2.3);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  for (const side of [-1, 1]) postLantern(ctx, s, side * 0.078, lw, 4510 + side);
}

/** A crooked post at x with a lantern hanging off its crook, swinging, its glass alight. */
function postLantern(ctx: Ctx, s: Scene, x: number, lw: number, seed: number): void {
  const d = x < 0 ? 1 : -1;
  ctx.beginPath();
  M(ctx, x, 0);
  L(ctx, x - d * 0.004, 0.09);
  Q(ctx, x - d * 0.004, 0.105, x + d * 0.014, 0.104);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  const a = swing(s.t, 2.2 + (seed % 3) * 0.3, 0.14, seed, s.sinceLand ?? Infinity, 0.3, s.still === true);
  const hx = X(x + d * 0.014);
  const hy = Y(0.104);
  const len = 0.016 * F.U;
  const bx = hx - Math.sin(a) * len;
  const by = hy + Math.cos(a) * len;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, bx, by + 0.01 * F.U, 0.024 * F.U);
  ctx.fillStyle = LANTERN_GLOW;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(bx - 0.006 * F.U, by, 0.012 * F.U, 0.018 * F.U);
  ctx.fillStyle = flicker(s.t, seed) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
}

function door(ctx: Ctx, s: Scene, lw: number): void {
  // A door frame standing alone; every 9 to 16 s it swings open on a green glow full of stars.
  const open = doorOpen(s.t);
  const w = 0.04;
  const h = 0.08;
  ctx.beginPath();
  M(ctx, -w / 2 - 0.006, 0);
  L(ctx, -w / 2 - 0.006, h);
  Q(ctx, 0, h + 0.03, w / 2 + 0.006, h);
  L(ctx, w / 2 + 0.006, 0);
  ctx.closePath();
  ctx.fillStyle = "#3a2c50";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // The doorway: dark when shut, green and starry when open.
  ctx.beginPath();
  M(ctx, -w / 2, 0);
  L(ctx, -w / 2, h - 0.002);
  Q(ctx, 0, h + 0.022, w / 2, h - 0.002);
  L(ctx, w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = open > 0.02 ? DOOR_GLOW : "#0b0a1c";
  ctx.fill();
  if (open > 0.02) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) circle(ctx, X(-w / 2 + w * hash(k + 4610)), Y(h * hash(k + 4620)), 0.0025 * F.U);
    ctx.fillStyle = "#eef4ff";
    ctx.fill();
    ctx.beginPath();
    circle(ctx, X(0), Y(h * 0.5), 0.07 * F.U * open);
    ctx.fillStyle = GREEN_GLOW;
    ctx.fill();
  }
  // The door itself, swung open on its hinge (seen narrowing as it turns).
  const dw = w * Math.cos(open * 1.3);
  ctx.beginPath();
  M(ctx, -w / 2, 0);
  L(ctx, -w / 2, h - 0.002);
  L(ctx, -w / 2 + dw, h - 0.002 + (w - dw) * 0.3);
  L(ctx, -w / 2 + dw, 0);
  ctx.closePath();
  ctx.fillStyle = "#5b3f7a";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, X(-w / 2 + dw * 0.8), Y(h * 0.45), 0.003 * F.U);
  ctx.fillStyle = "#c49a52";
  ctx.fill();
  // A path of stepping stones up to it, a lamp on a crooked post, a dead bush curling at the edge.
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const x = 0.03 + k * 0.022;
    ctx.ellipse(X(x), Y(0.003), 0.008 * F.U, 0.003 * F.U, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "#5a5480";
  ctx.fill();
  postLantern(ctx, s, -0.08, lw, 4630);
  drawTree(ctx, DOOR_BUSH, X(0.09), Y(-0.002), 0.06 * F.U, "#15121d", windAt(s.t, 57, 0.08, 0, 1));
}
const DOOR_BUSH: Tree = crooked(57, -0.25, 1.3, 3, 1, -1);
const DOOR_GLOW = "#6ad6a0";

function hanging(ctx: Ctx, s: Scene, lw: number, depth: number): void {
  // A house hanging upside down on two chains under the isle: its roof points down, its smoke falls.
  const top = -depth * 0.5;
  const sway = Math.sin(s.t * 0.7) * 0.004;
  ctx.beginPath();
  M(ctx, -0.04, top);
  L(ctx, -0.036 + sway, top - 0.05);
  M(ctx, 0.04, top);
  L(ctx, 0.036 + sway, top - 0.05);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  const y0 = top - 0.05;
  ctx.beginPath();
  rect(ctx, -0.045 + sway, y0, 0.045 + sway, y0 - 0.06);
  ctx.fillStyle = WALL;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.054 + sway, y0 - 0.058);
  L(ctx, sway, y0 - 0.115);
  L(ctx, 0.054 + sway, y0 - 0.058);
  ctx.closePath();
  rect(ctx, 0.016 + sway, y0 - 0.08, 0.028 + sway, y0 - 0.11);
  ctx.fillStyle = SLATE;
  ctx.fill();
  ctx.stroke();
  for (let w = 0; w < 2; w++) {
    const lit = lightsOut(s.t, 4701 + w, 8 + w * 11) ? 0 : flicker(s.t, 4701 + w);
    ctx.beginPath();
    rect(ctx, -0.03 + w * 0.036 + sway, y0 - 0.014, -0.012 + w * 0.036 + sway, y0 - 0.04);
    ctx.fillStyle = lit <= 0 ? WALL_DARK : lit < 1 ? LAMP_DEEP : LAMP;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
  }
  smoke(ctx, s.t, X(0.022 + sway), Y(y0 - 0.11), F.U * 0.007, F.U * 0.09, F.U * 0.02, 1.4, 0.24, 37, 1);
}

function bridge(ctx: Ctx, s: Scene, lw: number): void {
  // Two small isles (the second off to one side, a little higher) and a bridge that leaves one, loops
  // round over itself and comes back into the other... or into itself.
  ctx.save();
  const sx = F.x;
  const sy = F.y;
  F.x = X(0.075);
  F.y = Y(0.06);
  ctx.beginPath();
  rock(ctx, 0.05, 0.05, 4800);
  ctx.fillStyle = ROCK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  F.x = sx;
  F.y = sy;
  ctx.restore();
  // The walkway: a plank deck along the loop (inked, its planks across it), a rope rail on posts
  // along one side, so it reads as a bridge looping over itself, never as a stroke or an arrow.
  bridgeCurve();
  const n = BRIDGE_N;
  const deck = Math.max(2, 0.013 * F.U);
  const across = deck * 0.55;
  const rail = Math.max(2.5, 0.024 * F.U);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(BX[i]!), Y(BY[i]!));
  ctx.strokeStyle = INK;
  ctx.lineWidth = deck + lw * 1.2;
  ctx.stroke();
  ctx.strokeStyle = PLANK;
  ctx.lineWidth = deck;
  ctx.stroke();
  // The planks' seams across the deck, and the posts up to the rail.
  ctx.beginPath();
  for (let i = 1; i < n - 1; i++) {
    const x = X(BX[i]!);
    const y = Y(BY[i]!);
    ctx.moveTo(x - NX[i]! * across, y + NY[i]! * across);
    ctx.lineTo(x + NX[i]! * across, y - NY[i]! * across);
    if (i % 3 === 1) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + NX[i]! * rail, y - NY[i]! * rail);
    }
  }
  ctx.strokeStyle = PLANK_SEAM;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  // The rope rail, sagging a little between its posts.
  ctx.beginPath();
  for (let i = 1; i < n - 1; i++) {
    const sag = 1 - 0.18 * Math.sin((Math.PI * ((i - 1) % 3)) / 3);
    const x = X(BX[i]!) + NX[i]! * rail * sag;
    const y = Y(BY[i]!) - NY[i]! * rail * sag;
    (i > 1 ? ctx.lineTo : ctx.moveTo).call(ctx, x, y);
  }
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  // A lantern on a crook where the bridge sets out.
  postLantern(ctx, s, -0.04, lw, 4810);
}

/** The looping bridge's walkway: two cubic curves (units), from the big isle's top round into the small isle. */
const BRIDGE_CURVE = [
  [-0.03, 0.004, 0.06, 0.2, 0.11, -0.06, 0.06, 0.1],
  [0.06, 0.1, 0.03, 0.16, 0.0, 0.12, 0.075, 0.064],
] as const;
const BRIDGE_N = 34;
/** Scratch: the walkway's points (units) and its unit normal (on the same side all the way round). */
const BX = new Float64Array(BRIDGE_N);
const BY = new Float64Array(BRIDGE_N);
const NX = new Float64Array(BRIDGE_N);
const NY = new Float64Array(BRIDGE_N);
const PLANK = "#5e4632";
const PLANK_SEAM = "#2a1c14";
const ROPE = "#9a8a7a";

/** Samples the walkway evenly along its length (BX, BY) with its normals (NX, NY): the same every frame, so once. */
function bridgeCurve(): void {
  if (BY[BRIDGE_N - 1] !== 0) return;
  // Finely first (points, normals and the length so far), then BRIDGE_N points evenly spaced along it.
  const fine = 160;
  const fx = new Float64Array(fine + 1);
  const fy = new Float64Array(fine + 1);
  const fnx = new Float64Array(fine + 1);
  const fny = new Float64Array(fine + 1);
  const fl = new Float64Array(fine + 1);
  for (let j = 0; j <= fine; j++) {
    const c = BRIDGE_CURVE[j < fine / 2 ? 0 : 1];
    const u = j < fine / 2 ? j / (fine / 2) : (j - fine / 2) / (fine / 2);
    const v = 1 - u;
    fx[j] = v * v * v * c[0] + 3 * v * v * u * c[2] + 3 * v * u * u * c[4] + u * u * u * c[6];
    fy[j] = v * v * v * c[1] + 3 * v * v * u * c[3] + 3 * v * u * u * c[5] + u * u * u * c[7];
    // The tangent, turned a quarter to its left.
    const tx = 3 * v * v * (c[2] - c[0]) + 6 * v * u * (c[4] - c[2]) + 3 * u * u * (c[6] - c[4]);
    const ty = 3 * v * v * (c[3] - c[1]) + 6 * v * u * (c[5] - c[3]) + 3 * u * u * (c[7] - c[5]);
    const len = Math.hypot(tx, ty) || 1;
    fnx[j] = -ty / len;
    fny[j] = tx / len;
    fl[j] = j === 0 ? 0 : fl[j - 1]! + Math.hypot(fx[j]! - fx[j - 1]!, fy[j]! - fy[j - 1]!);
  }
  let j = 0;
  for (let i = 0; i < BRIDGE_N; i++) {
    const want = (fl[fine]! * i) / (BRIDGE_N - 1);
    while (j < fine - 1 && fl[j + 1]! < want) j++;
    const f = Math.min(1, Math.max(0, (want - fl[j]!) / (fl[j + 1]! - fl[j]! || 1)));
    BX[i] = fx[j]! + (fx[j + 1]! - fx[j]!) * f;
    BY[i] = fy[j]! + (fy[j + 1]! - fy[j]!) * f;
    const nx = fnx[j]! + (fnx[j + 1]! - fnx[j]!) * f;
    const ny = fny[j]! + (fny[j + 1]! - fny[j]!) * f;
    const nl = Math.hypot(nx, ny) || 1;
    NX[i] = nx / nl;
    NY[i] = ny / nl;
  }
}

function castle(ctx: Ctx, s: Scene, lw: number): void {
  // A crooked castle of thin towers, pennants flapping, a window or two lit.
  ctx.beginPath();
  rect(ctx, -0.06, 0, 0.06, 0.05);
  for (const [x, w, h] of TOWERS) {
    rect(ctx, x - w / 2, 0.04, x + w / 2, h);
    M(ctx, x - w * 0.7, h);
    L(ctx, x + w * 0.1, h + w * 2.2);
    L(ctx, x + w * 0.7, h);
    ctx.closePath();
  }
  ctx.fillStyle = "#2d2848";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  for (const [x, w, h] of TOWERS) {
    const tip = h + w * 2.2;
    M(ctx, x + w * 0.1, tip);
    L(ctx, x + w * 0.1, tip + 0.02);
    const n = 4;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      L(ctx, x + w * 0.1 + 0.03 * f, tip + 0.02 - 0.004 * f + Math.sin(s.t * 7 + x * 40 - f * 4) * 0.003 * f);
    }
    L(ctx, x + w * 0.1, tip + 0.01);
    ctx.closePath();
  }
  ctx.fillStyle = "#9e3346";
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < TOWERS.length; k++) {
    if (lightsOut(s.t, 4900 + k, 5 + k * 7)) continue;
    const [x, , h] = TOWERS[k]!;
    rect(ctx, x - 0.004, h - 0.03, x + 0.004, h - 0.016);
  }
  ctx.fillStyle = LAMP;
  ctx.fill();
}
const TOWERS = [
  [-0.045, 0.018, 0.12],
  [-0.008, 0.024, 0.16],
  [0.035, 0.016, 0.1],
  [0.058, 0.012, 0.08],
] as const;

// ---------------------------------------------------------------- placing

/** Widths and depths (units) of each kind's isle, and how far up its things stand. */
const SIZE: Record<IsleKind, { w: number; depth: number; up: number }> = {
  cottage: { w: 0.22, depth: 0.12, up: 0.13 },
  graves: { w: 0.22, depth: 0.12, up: 0.11 },
  stair: { w: 0.22, depth: 0.09, up: 0.27 },
  door: { w: 0.22, depth: 0.09, up: 0.13 },
  hanging: { w: 0.22, depth: 0.08, up: 0.03 },
  bridge: { w: 0.1, depth: 0.07, up: 0.17 },
  castle: { w: 0.22, depth: 0.12, up: 0.2 },
};
/** Every isle (and all that stands on it) spans this many units across: it fills its lane. */
const SPAN = 0.22;
/** The looping bridge's two isles are drawn this much bigger, and its frame set off this far left (units), to fill the span. */
const BRIDGE_K = 1.34;
const BRIDGE_SHIFT = 0.03;
/** At its level a left-lane isle's top stands this far (u) below the moon's halo, so it is in full view. */
const LEFT_DROP = 0.1;
/** An isle stands at most this much of the sky it passes through (on a phone none comes near it). */
const TALL = 0.8;
/** The hanging house is drawn this much bigger than the isle it hangs from. */
const HOUSE_K = 1.4;

/** How much of a thing shows at d levels from its own: in over [a, b], out over [c, e]. */
function window4(d: number, a: number, b: number, c: number, e: number): number {
  if (d <= a || d >= e) return 0;
  const i = d < b ? (d - a) / (b - a) : 1;
  const o = d > c ? (e - d) / (e - c) : 1;
  return Math.min(i, o);
}

/** Where isle i stands this frame: sets F and ISLE_AT[i] (its spots too); false when it is off screen. */
export function isleAt(s: Scene, i: number): boolean {
  const it = ISLES[i]!;
  const A = ISLE_AT[i]!;
  A.vis = 0;
  const lvl = level(s);
  const L0 = loopCopy(it.f, lvl);
  const w = window4(lvl - L0, it.win[0], it.win[1], it.win[2], it.win[3]);
  if (w <= 0) {
    park(A);
    return false;
  }
  const side = it.side as -1 | 1;
  const lane = laneOf(s, side);
  const sz = SIZE[it.kind];
  // As wide as its lane (a tablet's wide lanes too): the isle and all on it fill it, a hair inside.
  // (On a tablet's wide lanes that would make the tall ones taller than the sky they pass through:
  // they are kept to TALL of it, the moon's halo or the HUD down to the mist or the mansion.)
  const tall = sz.up + 0.02 + sz.depth * (it.kind === "hanging" ? 2.6 : 1.7);
  const m0 = moonAt(s, toneOfLevel(L0));
  const band = side < 0 ? restLine(s) - (m0.y + m0.r * HALO_REACH) : mansionAt(s, Math.max(L0, MIST_SETTLED)).topY - s.cssH * 0.24;
  F.U = Math.min((lane.w - s.u * 0.008) / SPAN, (TALL * band) / tall) * (it.kind === "bridge" ? BRIDGE_K : 1);
  F.x = lane.x - (it.kind === "bridge" ? BRIDGE_SHIFT * F.U : 0);
  // (In the left lane it is held a little below the halo at its level, on every screen alike.)
  F.y = laneY(s, side, L0, ISLE_P, it.frac, (sz.up + 0.02) * F.U) + (side < 0 ? s.u * LEFT_DROP : 0);
  A.k = (F.U / s.u) * 0.5;
  A.x = F.x;
  A.y = F.y;
  spots(s, i, sz.depth);
  const top = Y(sz.up + 0.02);
  const bottom = Y(-sz.depth * (it.kind === "hanging" ? 2.6 : 1.7));
  A.top = top;
  A.bottom = bottom;
  if (top > s.cssH || bottom < 0) return false;
  // It comes and goes over its window (each turn of the loop alike: the loop's first turn, which the
  // first pass leads into, looks just like every other). In the left lane it comes out of the dark
  // below the moon's halo; in the right it fades before it reaches the mansion.
  let vis = w;
  if (side < 0) {
    const m = moonAt(s);
    vis *= belowMoon(s, top, m.y + m.r * HALO_REACH);
  } else {
    const roof = mansionAt(s).topY;
    vis *= 1 - smooth(roof - s.u * 0.08, roof - s.u * 0.01, bottom);
  }
  if (vis <= 0.01) return false;
  A.vis = vis;
  return true;
}

/** The spots on isle i (in the frame F): where the cast may stand, hang, walk, peer, ride. */
function spots(s: Scene, i: number, depth: number): void {
  const A = ISLE_AT[i]!;
  const kind = ISLES[i]!.kind;
  A.ridge.on = kind === "cottage";
  A.pane.on = kind === "cottage" || kind === "hanging" || (kind === "door" && doorOpen(s.t) < 0.02);
  A.road.on = kind === "bridge";
  A.roost.on = kind === "castle";
  A.tip.x = X((hash(5000 + i * 37) - 0.5) * SIZE[kind].w * 0.3);
  A.tip.y = Y(-depth) + 2;
  switch (kind) {
    case "cottage":
      A.ridge.hx = X(-0.054);
      A.ridge.hy = Y(0.074);
      A.ridge.ex = X(-0.016);
      A.ridge.ey = Y(0.104);
      A.pane.x = X(-0.036);
      A.pane.y = Y(0.038);
      A.pane.w = 0.022 * F.U;
      A.pane.h = 0.022 * F.U;
      {
        const f = forkAt(COTTAGE_TREE, X(COTTAGE_TREE_X), Y(-0.002), 0.075 * F.U);
        A.perch.x = f.x;
        A.perch.y = f.y;
        const b = forkAt(COTTAGE_TREE, X(COTTAGE_TREE_X), Y(-0.002), 0.075 * F.U, COTTAGE_TREE.reacher);
        A.bough.x = b.x;
        A.bough.y = b.y;
      }
      break;
    case "graves":
      A.stones[0]!.x = X(GRAVE_STONES[0][0]);
      A.stones[0]!.y = Y(0);
      A.stones[1]!.x = X(GRAVE_STONES[1][0]);
      A.stones[1]!.y = Y(0);
      {
        const f = forkAt(GRAVE_TREE, X(0.05), Y(-0.002), 0.1 * F.U);
        A.perch.x = f.x;
        A.perch.y = f.y;
        const b = forkAt(GRAVE_TREE, X(0.05), Y(-0.002), 0.1 * F.U, GRAVE_TREE.reacher);
        A.bough.x = b.x;
        A.bough.y = b.y;
      }
      break;
    case "stair":
      A.perch.x = X(0.006);
      A.perch.y = Y(0.262);
      break;
    case "door":
      A.pane.x = X(-0.02);
      A.pane.y = Y(0.076);
      A.pane.w = 0.04 * F.U;
      A.pane.h = 0.072 * F.U;
      A.perch.x = X(0);
      A.perch.y = Y(0.096);
      break;
    case "hanging": {
      const sway = Math.sin(s.t * 0.7) * 0.004;
      const y0 = -depth * 0.5 / HOUSE_K - 0.05;
      const U0 = F.U;
      F.U = U0 * HOUSE_K;
      A.pane.x = X(-0.03 + sway);
      A.pane.y = Y(y0 - 0.014);
      A.pane.w = 0.018 * F.U;
      A.pane.h = 0.026 * F.U;
      F.U = U0;
      A.perch.x = X(0.03);
      A.perch.y = Y(0.0);
      break;
    }
    case "bridge":
      A.road.x0 = X(-0.03);
      A.road.y0 = Y(0.006);
      A.road.xm = X(0.05);
      A.road.ym = Y(0.17);
      A.road.x1 = X(0.075);
      A.road.y1 = Y(0.068);
      A.perch.x = X(0.075);
      A.perch.y = Y(0.064);
      break;
    case "castle":
      A.roost.x = X(TOWERS[1]![0]);
      A.roost.y = Y(TOWERS[1]![2] - 0.01);
      A.perch.x = X(TOWERS[0]![0] + 0.003);
      A.perch.y = Y(TOWERS[0]![2] + TOWERS[0]![1] * 2.2 + 0.02);
      break;
  }
}

/** How far the door in the sky is open now (0 shut .. 1): every 9 to 16 s, for 1.5 s. */
export function doorOpen(t: number): number {
  const b = beat(t, 3, 9, 16, 4600);
  return b.since < 1.5 ? Math.sin((b.since / 1.5) * Math.PI) : 0;
}

/** The isles in one lane this frame (the right ones go behind the mansion, the left ones after the hollow). */
export function isles(ctx: Ctx, s: Scene, side: -1 | 1): void {
  const lw = Math.max(1, s.u * 0.0045);
  for (let i = 0; i < ISLES.length; i++) {
    const it = ISLES[i]!;
    if (it.side !== side || !isleAt(s, i)) continue;
    const sz = SIZE[it.kind];
    ctx.globalAlpha = ISLE_AT[i]!.vis;
    if (it.kind !== "hanging") isle(ctx, s, sz.w, sz.depth, 5000 + i * 37, lw, i);
    switch (it.kind) {
      case "cottage":
        cottage(ctx, s, lw);
        break;
      case "graves":
        graves(ctx, s, lw, sz.depth);
        break;
      case "stair":
        stair(ctx, s, lw);
        break;
      case "door":
        door(ctx, s, lw);
        break;
      case "hanging": {
        const U0 = F.U;
        F.U = U0 * HOUSE_K;
        hanging(ctx, s, lw, sz.depth / HOUSE_K);
        F.U = U0;
        isle(ctx, s, sz.w, sz.depth, 5000 + i * 37, lw, i);
        break;
      }
      case "bridge":
        bridge(ctx, s, lw);
        break;
      case "castle":
        castle(ctx, s, lw);
        break;
    }
    ctx.globalAlpha = 1;
  }
}

/** The colors a mix of the isles' rock would want (kept for the tests' palette checks). */
export const ISLE_COLORS = [ROCK, ROCK_TOP, mix(ROCK, INK, 0.3)] as const;

import { alpha, circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { flicker, lightsOut, swing } from "./ambient";
import { INK, IRON, LAMP, LAMP_DEEP, mixed, smooth } from "./common";
import { belowMoon, perLevel, restLine, storyY } from "./lines";
import { HALO_REACH, moonAt } from "./sky";
import { smoke } from "./smoke";
import { level, type Tone } from "./tone";

// The gothic skyline: crooked rooftops, spires and towers of our own, out in the lanes as you climb
// above the village (the tower's column keeps only a flat low line of roofs on the mist).
//  - The far skyline: a faint city of spires, keeps and gables on the horizon in the haze, its
//    windows pricked with flickering lights out in the lanes; low behind the tower. From the start.
//  - The cathedral (the gothic skyline, C): far off beyond the mansion in the right lane, twin
//    spires and a lit rose window, standing out of the haze as night falls and lingering into the
//    storm (the colossus strides behind it when the lightning shows it).
//  - The crooked roofs (C): two leaning houses standing out of the mist in the left lane below the
//    moon, windows lit (shadows pass behind the curtains: the cast's), a balcony whose curtain
//    streams out in the wind, a weathervane, a gargoyle, a swinging sign, a hanging cage, a chimney.
//  - Near things passing close in the lanes: a crooked spire with a weathervane (right), a stack of
//    crooked chimney pots smoking (left, below the moon).
//  - The storm (D): the cathedral's bell tower in the right lane, its bell swinging in the open
//    belfry where bats roost, gargoyles at its corners (the left lane has the drowned hollow's
//    crooked lighthouse then: drowned.ts).
// One tall piece at a time shares the right lane with the mansion: the cathedral, then the near
// spire, then the bell tower (then the isles); in the left lane the roofs and the chimney stack come
// between the drowned chapel and the lighthouse. Each fades in and out over its own stretch.
// Left-lane things come out of the dark below the moon's halo (nothing crosses the moon); right-lane
// things come down from above. All placed by level (lines.ts storyY), so they never jump.

/** Scratch frame of the piece being drawn: origin (screen px), px per u, mirrored (-1) or not. */
const F = { x: 0, y: 0, U: 1, sx: 1 };
const X = (x: number) => F.x + x * F.U * F.sx;
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
/** A pointed spire on a base from x - w to x + w at y, h tall, leaning `lean` (u at its tip). */
function spire(ctx: Ctx, x: number, y: number, w: number, h: number, lean = 0): void {
  M(ctx, x - w, y);
  Q(ctx, x - w * 0.7, y + h * 0.5, x + lean, y + h);
  Q(ctx, x + w * 0.7, y + h * 0.5, x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- the far skyline

/** The far city along the horizon: x (u from the center), width, height (u), kind. 0 gable, 1 block, 2 spire, 3 keep, 4 dome, 5 clock spire. */
const FAR_CITY: readonly (readonly [number, number, number, number])[] = [
  [-0.6, 0.06, 0.07, 0],
  [-0.53, 0.05, 0.09, 2],
  [-0.47, 0.07, 0.06, 1],
  [-0.4, 0.05, 0.08, 0],
  [-0.33, 0.06, 0.05, 1],
  [-0.27, 0.05, 0.04, 0],
  [-0.2, 0.08, 0.026, 1],
  [-0.11, 0.07, 0.03, 0],
  [-0.03, 0.08, 0.022, 1],
  [0.06, 0.07, 0.03, 0],
  [0.15, 0.08, 0.026, 1],
  [0.23, 0.05, 0.035, 0],
  [0.29, 0.06, 0.12, 3],
  [0.35, 0.03, 0.18, 2],
  [0.4, 0.06, 0.08, 0],
  [0.46, 0.035, 0.16, 5],
  [0.52, 0.07, 0.1, 4],
  [0.58, 0.05, 0.13, 2],
];
/** Window lights in the far city: x (u), height above the horizon (u); only those out in the lanes. */
const FAR_LIGHTS = Array.from({ length: 22 }, (_, i) => {
  const b = FAR_CITY[Math.floor(hash(i + 3300) * FAR_CITY.length)]!;
  return { x: b[0] + (hash(i + 3310) - 0.5) * b[1] * 0.7, y: b[2] * (0.15 + hash(i + 3320) * 0.45), seed: i };
}).filter((l) => Math.abs(l.x) > 0.27);

/** The far city on the horizon, in the haze: flat, no outline; its windows flicker in the lanes. */
export function farCity(ctx: Ctx, s: Scene, tone: Tone): void {
  const y = s.horizonY + 1;
  if (y - s.u * 0.2 > s.cssH || tone.hollow <= 0.004) return;
  F.x = s.cssW / 2;
  F.y = y;
  F.U = s.u;
  F.sx = 1;
  ctx.beginPath();
  for (const [x, w, h, kind] of FAR_CITY) {
    if (Math.abs(x) - w > s.cssW / 2 / s.u) continue;
    if (kind === 0) {
      M(ctx, x - w / 2, -0.01);
      L(ctx, x - w / 2, h * 0.6);
      L(ctx, x, h);
      L(ctx, x + w / 2, h * 0.6);
      L(ctx, x + w / 2, -0.01);
      ctx.closePath();
    } else if (kind === 1) {
      rect(ctx, x - w / 2, -0.01, x + w / 2, h);
      rect(ctx, x + w * 0.2, h, x + w * 0.28, h + 0.012);
    } else if (kind === 2) {
      rect(ctx, x - w / 2, -0.01, x + w / 2, h * 0.45);
      spire(ctx, x, h * 0.44, w * 0.45, h * 0.56, w * 0.1);
    } else if (kind === 3) {
      M(ctx, x - w / 2, -0.01);
      L(ctx, x - w / 2, h);
      for (let i = 0; i < 4; i++) {
        const cx = x - w / 2 + (w * (i + 0.5)) / 4;
        L(ctx, cx - w * 0.06, h);
        L(ctx, cx - w * 0.06, h + 0.01);
        L(ctx, cx + w * 0.06, h + 0.01);
        L(ctx, cx + w * 0.06, h);
      }
      L(ctx, x + w / 2, h);
      L(ctx, x + w / 2, -0.01);
      ctx.closePath();
    } else if (kind === 4) {
      rect(ctx, x - w / 2, -0.01, x + w / 2, h * 0.55);
      M(ctx, x - w * 0.4, h * 0.55);
      Q(ctx, x - w * 0.4, h, x, h);
      Q(ctx, x + w * 0.4, h, x + w * 0.4, h * 0.55);
      ctx.closePath();
    } else {
      rect(ctx, x - w / 2, -0.01, x + w / 2, h * 0.7);
      spire(ctx, x, h * 0.7, w * 0.6, h * 0.3, -w * 0.3);
    }
  }
  ctx.fillStyle = tone.haze;
  ctx.fill();
  ctx.beginPath();
  for (const l of FAR_LIGHTS) {
    // Each window goes dark now and then: on or off for a few seconds at a time (one hash a window).
    if (Math.abs(l.x) > s.cssW / 2 / s.u - 0.01 || hash(3400 + l.seed * 131 + Math.floor(s.t / (2.5 + (l.seed % 3)) + l.seed * 0.37)) < 0.22) continue;
    ctx.rect(X(l.x), Y(l.y), 1.2, 1.2);
  }
  ctx.fillStyle = FAR_LIGHT;
  ctx.fill();
}
const FAR_LIGHT = "#ffc95e";

// ---------------------------------------------------------------- where pieces stand in the lanes

/** The moon's halo's lowest point once it has eased up (where left-lane things may start). */
function haloBottom(s: Scene): number {
  const m = moonAt(s);
  return m.y + m.r * HALO_REACH;
}

/** The middle of a lane (screen x) and its width (px). */
const LANE = { x: 0, w: 0 };
export function laneOf(s: Scene, side: -1 | 1): typeof LANE {
  const u = s.u;
  const a = side < 0 ? u * 0.012 : s.baseX + s.baseW + u * 0.06;
  const b = side < 0 ? s.baseX - u * 0.06 : s.cssW - u * 0.012;
  LANE.x = (a + b) / 2;
  LANE.w = b - a;
  return LANE;
}

/**
 * Screen y of a piece's anchor in a lane: at level L its top (`tall` px above the anchor) stands
 * `frac` of the way from the lane's top (the right lane's: just under the HUD; the left's: the
 * eased-up moon's halo) down to the mist's rest line, less its height; and it moves with parallax p.
 */
export function laneY(s: Scene, side: -1 | 1, L: number, p: number, frac: number, tall = 0): number {
  const top = (side < 0 ? haloBottom(s) : s.cssH * 0.24) + tall;
  const at = (top + Math.max(0, restLine(s) - top) * frac) / s.cssH;
  return storyY(s, L, p, at);
}

/** How much of a piece shows at a level: in over [a, b], out over [c, d] (levels). */
function window4(lvl: number, a: number, b: number, c: number, d: number): number {
  if (lvl <= a || lvl >= d) return 0;
  const i = lvl < b ? (lvl - a) / (b - a) : 1;
  const o = lvl > c ? (d - lvl) / (d - c) : 1;
  return Math.min(i, o);
}

// ---------------------------------------------------------------- the cathedral

/** The cathedral: its level, parallax, where in the lane it stands (frac), its size (u), when it shows. */
export const CATHEDRAL = { L: 40, p: 0.2, frac: 0.0, size: 1, show: [22, 27, 42, 48] as const } as const;

/** Scratch box of the cathedral (screen px) when drawn, for the cast and the tests. */
export const CATHEDRAL_BOX = { x0: 0, y0: 0, x1: 0, y1: 0, vis: 0, rose: { x: 0, y: 0, r: 0 }, spireL: { x: 0, y: 0 }, spireR: { x: 0, y: 0 } };

/** Where the cathedral is this frame (sets F and CATHEDRAL_BOX). False when it is not shown. */
export function cathedralAt(s: Scene): boolean {
  const lvl = level(s);
  const vis = window4(lvl, ...CATHEDRAL.show);
  CATHEDRAL_BOX.vis = vis;
  const lane = laneOf(s, 1);
  const U = Math.min(s.u, lane.w / 0.21);
  F.x = lane.x;
  F.y = laneY(s, 1, CATHEDRAL.L, CATHEDRAL.p, CATHEDRAL.frac, 0.53 * U);
  F.U = U;
  F.sx = 1;
  CATHEDRAL_BOX.x0 = X(-0.1);
  CATHEDRAL_BOX.x1 = X(0.1);
  CATHEDRAL_BOX.y0 = Y(0.53);
  CATHEDRAL_BOX.y1 = F.y;
  CATHEDRAL_BOX.rose.x = X(0);
  CATHEDRAL_BOX.rose.y = Y(0.25);
  CATHEDRAL_BOX.rose.r = 0.032 * U;
  CATHEDRAL_BOX.spireL.x = X(-0.058);
  CATHEDRAL_BOX.spireL.y = Y(0.52);
  CATHEDRAL_BOX.spireR.x = X(0.062);
  CATHEDRAL_BOX.spireR.y = Y(0.5);
  return vis > 0 && CATHEDRAL_BOX.y0 < s.cssH && CATHEDRAL_BOX.y1 > 0;
}

/** The cathedral far off in the right lane (behind the mansion): twin spires, a lit rose window. */
export function cathedral(ctx: Ctx, s: Scene, tone: Tone): void {
  if (!cathedralAt(s)) return;
  const vis = CATHEDRAL_BOX.vis;
  ctx.globalAlpha = vis;
  const body = mixed(tone.haze, tone.sky[1], 0.25);
  ctx.beginPath();
  // Two towers, the nave's gable between them, a spire on each (the right one leaning).
  rect(ctx, -0.1, -0.3, -0.035, 0.34);
  rect(ctx, 0.035, -0.3, 0.1, 0.32);
  M(ctx, -0.04, -0.3);
  L(ctx, -0.04, 0.27);
  L(ctx, 0, 0.33);
  L(ctx, 0.04, 0.27);
  L(ctx, 0.04, -0.3);
  ctx.closePath();
  spire(ctx, -0.0675, 0.335, 0.03, 0.19, 0.008);
  spire(ctx, 0.0675, 0.315, 0.03, 0.18, -0.012);
  // Pinnacles at the towers' corners.
  for (const x of [-0.1, -0.035, 0.035, 0.1]) spire(ctx, x, x < 0 ? 0.335 : 0.315, 0.007, 0.04);
  ctx.fillStyle = body;
  ctx.fill();
  // Crockets: little bumps up the spires' edges, and a spiral at each tip.
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const f = i / 5;
    circle(ctx, X(-0.0675 - 0.03 * (1 - f) * 0.85), Y(0.335 + 0.19 * f * 0.95), 0.006 * F.U);
    circle(ctx, X(0.0675 + 0.03 * (1 - f) * 0.85), Y(0.315 + 0.18 * f * 0.95), 0.006 * F.U);
  }
  ctx.fill();
  ctx.beginPath();
  M(ctx, -0.0595, 0.525);
  ctx.arc(X(-0.052), Y(0.525), 0.008 * F.U, Math.PI, Math.PI * 2.6);
  M(ctx, 0.0555, 0.495);
  ctx.arc(X(0.048), Y(0.495), 0.008 * F.U, 0, -Math.PI * 1.6, true);
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(1, F.U * 0.004);
  ctx.stroke();
  // Lit: the rose window (with its tracery), the towers' lancets, dimmer.
  const glow = flicker(s.t, 3501);
  ctx.beginPath();
  circle(ctx, X(0), Y(0.25), 0.032 * F.U);
  ctx.fillStyle = glow < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    M(ctx, 0, 0.25);
    ctx.lineTo(X(Math.cos(a) * 0.032), Y(0.25 + Math.sin(a) * 0.032));
  }
  ctx.moveTo(X(0.012), Y(0.25));
  ctx.arc(X(0), Y(0.25), 0.012 * F.U, 0, Math.PI * 2);
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(1, F.U * 0.004);
  ctx.stroke();
  ctx.beginPath();
  for (const x of [-0.068, 0.068]) {
    M(ctx, x - 0.008, 0.16);
    L(ctx, x - 0.008, 0.2);
    L(ctx, x, 0.215);
    L(ctx, x + 0.008, 0.2);
    L(ctx, x + 0.008, 0.16);
    ctx.closePath();
  }
  M(ctx, -0.012, 0.1);
  L(ctx, -0.012, 0.17);
  L(ctx, 0, 0.19);
  L(ctx, 0.012, 0.17);
  L(ctx, 0.012, 0.1);
  ctx.closePath();
  ctx.fillStyle = DIM_LIGHT;
  ctx.fill();
  ctx.globalAlpha = 1;
}
const DIM_LIGHT = alpha("#e0903a", 0.75);

// ---------------------------------------------------------------- the crooked roofs (left lane)

/** The crooked roofs: level, parallax, where in the lane (frac: their eaves), when they show. */
export const ROOFS = { L: 54, p: 0.2, frac: 0.1, show: [51, 55, 68, 72] as const } as const;
const ROOF_BODY = "#1b1a3a";
const ROOF_TOP = "#121130";
const ROOF_RIM = "#4a4880";
const CURTAIN = "#b8a8d8";

/** Scratch: the roofs' anchors this frame (screen px), set by roofsAt. */
export const ROOFS_AT = {
  vis: 0,
  k: 0,
  /** The gable house's ridge (from its chimney-free end to its peak), the balcony window, the dark attic window, the vane's tip, the gargoyle, the cage. */
  ridge: { hx: 0, hy: 0, ex: 0, ey: 0 },
  pane: { x: 0, y: 0, w: 0, h: 0 },
  dark: { x: 0, y: 0, w: 0, h: 0 },
  vane: { x: 0, y: 0 },
  gargoyle: { x: 0, y: 0 },
  chimney: { x: 0, y: 0 },
  cage: { x: 0, y: 0 },
  hide: { x0: 0, x1: 0, y: 0 },
};

/** Where the crooked roofs stand this frame (sets F and ROOFS_AT); false when not shown. */
export function roofsAt(s: Scene): boolean {
  const lvl = level(s);
  let vis = window4(lvl, ...ROOFS.show);
  const lane = laneOf(s, -1);
  const U = Math.min(s.u, lane.w / 0.22);
  F.x = lane.x;
  F.y = laneY(s, -1, ROOFS.L, ROOFS.p, ROOFS.frac, 0.18 * U);
  F.U = U;
  F.sx = 1;
  // Out of the dark below the moon.
  if (vis > 0) vis *= belowMoon(s, Y(0.17), haloBottom(s));
  ROOFS_AT.vis = vis;
  ROOFS_AT.k = (U / s.u) * 0.4;
  ROOFS_AT.ridge.hx = X(0.012);
  ROOFS_AT.ridge.hy = Y(0.06);
  ROOFS_AT.ridge.ex = X(0.085);
  ROOFS_AT.ridge.ey = Y(0.06);
  ROOFS_AT.pane.x = X(-0.088);
  ROOFS_AT.pane.y = Y(0.064);
  ROOFS_AT.pane.w = 0.032 * U;
  ROOFS_AT.pane.h = 0.044 * U;
  ROOFS_AT.dark.x = X(0.03);
  ROOFS_AT.dark.y = Y(0.03);
  ROOFS_AT.dark.w = 0.022 * U;
  ROOFS_AT.dark.h = 0.026 * U;
  ROOFS_AT.vane.x = X(-0.056);
  ROOFS_AT.vane.y = Y(0.168);
  ROOFS_AT.gargoyle.x = X(-0.1);
  ROOFS_AT.gargoyle.y = Y(0.064);
  ROOFS_AT.chimney.x = X(0.07);
  ROOFS_AT.chimney.y = Y(0.112);
  ROOFS_AT.cage.x = X(0.1);
  ROOFS_AT.cage.y = Y(0.0);
  ROOFS_AT.hide.x0 = X(0.02);
  ROOFS_AT.hide.x1 = X(0.06);
  ROOFS_AT.hide.y = Y(0.064);
  return Y(0.2) < s.cssH && ROOFS_AT.vis > 0.01;
}

/**
 * Two crooked houses standing out of the mist in the left lane: a tall gable house leaning out,
 * its upper window lit behind a little iron balcony whose curtain streams out in the wind, a
 * weathervane on its peak and a gargoyle at its eave; and a lower mansard leaning in, a crooked
 * chimney smoking, a dark attic window, a sign swinging off its corner and a cage hanging by it.
 * Their feet are lost in the mist.
 */
export function roofs(ctx: Ctx, s: Scene): void {
  if (!roofsAt(s)) return;
  const t = s.t;
  const land = s.sinceLand ?? Infinity;
  const still = s.still === true;
  ctx.globalAlpha = ROOFS_AT.vis;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // The mansard house (behind, leaning in), its chimney and smoke.
  ctx.beginPath();
  rect(ctx, 0.058, 0.06, 0.08, 0.112);
  M(ctx, 0.05, 0.06);
  Q(ctx, 0.066, 0.09, 0.062, 0.122);
  L(ctx, 0.084, 0.124);
  Q(ctx, 0.086, 0.09, 0.08, 0.06);
  ctx.closePath();
  M(ctx, -0.005, -0.3);
  L(ctx, 0.0, 0.035);
  L(ctx, 0.014, 0.068);
  Q(ctx, 0.05, 0.072, 0.09, 0.066);
  L(ctx, 0.105, 0.03);
  L(ctx, 0.11, -0.3);
  ctx.closePath();
  ctx.fillStyle = ROOF_BODY;
  ctx.fill();
  ctx.beginPath();
  M(ctx, 0.0, 0.035);
  L(ctx, 0.014, 0.068);
  Q(ctx, 0.05, 0.072, 0.09, 0.066);
  L(ctx, 0.105, 0.03);
  ctx.closePath();
  ctx.fillStyle = ROOF_TOP;
  ctx.fill();
  // The gable house (in front, leaning out).
  ctx.beginPath();
  M(ctx, -0.1, -0.3);
  L(ctx, -0.098, 0.06);
  L(ctx, -0.104, 0.064);
  L(ctx, -0.056, 0.162);
  L(ctx, -0.006, 0.07);
  L(ctx, -0.012, 0.066);
  L(ctx, -0.01, -0.3);
  ctx.closePath();
  ctx.fillStyle = ROOF_BODY;
  ctx.fill();
  // Moonlit edges: the gable's left slope and the walls' left sides (the moon is above them).
  ctx.beginPath();
  M(ctx, -0.102, 0.066);
  L(ctx, -0.056, 0.16);
  M(ctx, -0.098, 0.058);
  L(ctx, -0.1, -0.05);
  M(ctx, 0.002, 0.04);
  L(ctx, 0.014, 0.066);
  ctx.strokeStyle = ROOF_RIM;
  ctx.lineWidth = Math.max(1, F.U * 0.004);
  ctx.stroke();
  // Windows: lit, and the attic one dark (eyes may open in it).
  const w1 = lightsOut(t, 3601, 9) ? 0 : flicker(t, 3601);
  ctx.beginPath();
  rect(ctx, -0.088, 0.064, -0.056, 0.064 + 0.044 * 0.8);
  M(ctx, -0.088, 0.064 + 0.044 * 0.8);
  Q(ctx, -0.072, 0.064 + 0.044 * 1.05, -0.056, 0.064 + 0.044 * 0.8);
  ctx.closePath();
  rect(ctx, -0.082, 0.0, -0.064, 0.03);
  rect(ctx, -0.044, 0.0, -0.026, 0.034);
  rect(ctx, 0.07, -0.02, 0.088, 0.012);
  ctx.fillStyle = w1 < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, 0.03, 0.03, 0.052, 0.056);
  ctx.fillStyle = "#0b0a1c";
  ctx.fill();
  // The balcony: an iron rail under the lit window, and its curtain streaming out over it.
  ctx.beginPath();
  M(ctx, -0.094, 0.058);
  L(ctx, -0.05, 0.058);
  M(ctx, -0.094, 0.07);
  L(ctx, -0.05, 0.07);
  for (let i = 0; i <= 4; i++) {
    M(ctx, -0.094 + i * 0.011, 0.058);
    L(ctx, -0.094 + i * 0.011, 0.07);
  }
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, F.U * 0.003);
  ctx.stroke();
  curtainStrip(ctx, t, -0.058, 0.104, 0.04, 0.012);
  // The weathervane on the gable's peak: a crooked arrow with a bat on it, turning.
  vane(ctx, -0.056, 0.162, 0.03, t, land, still);
  // The gargoyle at the gable's eave, crouched, wings folded, leering out.
  gargoyle(ctx, -0.104, 0.064, 0.022, -1);
  // The sign off the mansard's corner, swinging; the cage hanging beside it.
  const a = swing(t, 2.3, 0.12, 2.7, land, 0.2, still);
  sign(ctx, 0.1, 0.035, 0.03, a);
  const c = swing(t, 3.4, 0.1, 0.9, land, 0.25, still);
  smallCage(ctx, 0.112, -0.002, 0.03, c);
  // Smoke from the chimney.
  smoke(ctx, t, X(0.072), Y(0.124), F.U * 0.01, F.U * 0.12, F.U * 0.03, 1.3, 0.24 * ROOFS_AT.vis, 5);
  ctx.globalAlpha = 1;
}

/** A curtain streaming out of a window from (x, y) toward the screen's side, rippling. */
function curtainStrip(ctx: Ctx, t: number, x: number, y: number, len: number, w: number): void {
  ctx.beginPath();
  M(ctx, x, y);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    L(ctx, x + len * f, y - w * 0.3 * f + Math.sin(t * 8 - f * 5) * w * 0.5 * f);
  }
  L(ctx, x + len * 0.9, y - w * 1.1 + Math.sin(t * 8 - 4.5) * w * 0.4);
  L(ctx, x + len * 0.96, y - w * 1.4);
  for (let i = n - 1; i >= 0; i--) {
    const f = i / n;
    L(ctx, x + len * f, y - w * (1 + 0.3 * f) + Math.sin(t * 8 - f * 5) * w * 0.5 * f);
  }
  ctx.closePath();
  ctx.fillStyle = CURTAIN;
  ctx.fill();
}

/** A weathervane at (x, y): a post, a crooked arrow with a bat cut-out turning about it (a landing gives it a quarter turn). */
function vane(ctx: Ctx, x: number, y: number, h: number, t: number, land: number, still: boolean): void {
  const kick = land < 1.2 ? (1 - Math.cos(Math.min(1, land / 0.6) * Math.PI)) / 2 : land < Infinity ? 1 : 0;
  const turn = Math.sin(t * 0.3 + x * 10) * 0.6 + (still ? 0 : kick * Math.PI * 0.5);
  const sx = Math.cos(turn);
  ctx.beginPath();
  M(ctx, x, y);
  L(ctx, x, y + h);
  M(ctx, x - h * 0.6 * sx, y + h * 0.75);
  L(ctx, x + h * 0.6 * sx, y + h * 0.75);
  ctx.strokeStyle = ROOF_BODY;
  ctx.lineWidth = Math.max(1, F.U * 0.004);
  ctx.stroke();
  ctx.beginPath();
  M(ctx, x + h * 0.6 * sx, y + h * 0.75);
  L(ctx, x + h * 0.42 * sx, y + h * 0.84);
  L(ctx, x + h * 0.42 * sx, y + h * 0.66);
  ctx.closePath();
  // The bat on the arrow's tail.
  const bx = x - h * 0.38 * sx;
  const by = y + h * 0.84;
  M(ctx, bx, by);
  L(ctx, bx - h * 0.22 * sx, by + h * 0.1);
  L(ctx, bx - h * 0.14 * sx, by - h * 0.02);
  L(ctx, bx - h * 0.24 * sx, by - h * 0.08);
  L(ctx, bx, by - h * 0.04);
  L(ctx, bx + h * 0.24 * sx, by - h * 0.08);
  L(ctx, bx + h * 0.14 * sx, by - h * 0.02);
  L(ctx, bx + h * 0.22 * sx, by + h * 0.1);
  ctx.closePath();
  ctx.fillStyle = ROOF_BODY;
  ctx.fill();
}

/** A gargoyle crouched on a corner at (x, y), `h` tall, leering out toward `dir`: horns, a beak, folded wings. */
function gargoyle(ctx: Ctx, x: number, y: number, h: number, dir: number): void {
  const d = dir;
  ctx.beginPath();
  M(ctx, x - d * h * 0.3, y);
  Q(ctx, x - d * h * 0.4, y + h * 0.5, x - d * h * 0.1, y + h * 0.7);
  L(ctx, x - d * h * 0.18, y + h * 1.0);
  L(ctx, x + d * h * 0.02, y + h * 0.78);
  L(ctx, x + d * h * 0.16, y + h * 0.98);
  L(ctx, x + d * h * 0.2, y + h * 0.7);
  Q(ctx, x + d * h * 0.42, y + h * 0.68, x + d * h * 0.62, y + h * 0.5);
  L(ctx, x + d * h * 0.36, y + h * 0.44);
  Q(ctx, x + d * h * 0.4, y + h * 0.2, x + d * h * 0.3, y);
  ctx.closePath();
  ctx.fillStyle = GARGOYLE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(x + d * h * 0.18), Y(y + h * 0.62), h * 0.06 * F.U);
  ctx.fillStyle = GARGOYLE_EYE;
  ctx.fill();
}
const GARGOYLE = "#2a2848";
const GARGOYLE_EYE = "#ffb04f";

/** Scratch rotation for the swinging bits: the hook (screen px), its cos and sin. */
const R = { x: 0, y: 0, c: 1, s: 0 };
function rot(x: number, y: number, a: number): void {
  R.x = X(x);
  R.y = Y(y);
  R.c = Math.cos(a);
  R.s = Math.sin(a);
}
/** A point hanging from the hook (u, y down from it), rotated. */
function RL(ctx: Ctx, lx: number, ly: number, move = false): void {
  const px = R.x + (lx * R.c - ly * R.s) * F.U;
  const py = R.y + (lx * R.s + ly * R.c) * F.U;
  if (move) ctx.moveTo(px, py);
  else ctx.lineTo(px, py);
}

/** A small sign hanging from a bracket at (x, y), swung by `a`. */
function sign(ctx: Ctx, x: number, y: number, s: number, a: number): void {
  ctx.beginPath();
  M(ctx, x - 0.006, y);
  L(ctx, x + s * 0.6, y);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, F.U * 0.003);
  ctx.stroke();
  rot(x + s * 0.4, y, a);
  ctx.beginPath();
  RL(ctx, 0, 0, true);
  RL(ctx, -s * 0.3, s * 0.3);
  RL(ctx, -s * 0.36, s * 0.32);
  RL(ctx, -s * 0.36, s * 0.86);
  RL(ctx, s * 0.36, s * 0.9);
  RL(ctx, s * 0.36, s * 0.32);
  RL(ctx, s * 0.3, s * 0.3);
  ctx.closePath();
  ctx.fillStyle = "#4a2c3a";
  ctx.fill();
}

/** A small birdcage hanging from (x, y), rocked by `a`: a domed outline and bars. */
function smallCage(ctx: Ctx, x: number, y: number, s: number, a: number): void {
  rot(x, y, a);
  ctx.beginPath();
  RL(ctx, 0, 0, true);
  RL(ctx, 0, s * 0.25);
  for (let i = -2; i <= 2; i++) {
    RL(ctx, i * s * 0.12, s * (0.4 - Math.abs(i) * 0.04), true);
    RL(ctx, i * s * 0.12, s);
  }
  RL(ctx, -s * 0.3, s, true);
  RL(ctx, s * 0.3, s);
  RL(ctx, -s * 0.26, s * 0.36, true);
  RL(ctx, 0, s * 0.25);
  RL(ctx, s * 0.26, s * 0.36);
  ctx.strokeStyle = "#6a6290";
  ctx.lineWidth = Math.max(0.8, F.U * 0.0025);
  ctx.stroke();
}

// ---------------------------------------------------------------- near things passing in the lanes

/** The crooked spire (right lane, near) and the chimney stack (left lane, near). */
export const NEAR_SPIRE = { L: 54, p: 0.8, frac: 0.0 } as const;
export const CHIMNEYS = { L: 62, p: 0.8, frac: 0.12, show: [55, 58, 66, 70] as const } as const;
const NEAR_BODY = "#262340";
const NEAR_LIT = "#5a5690";

/** Scratch: the near spire's vane tip and the chimney stack's pots this frame (screen px), and their size factor. */
export const NEAR_AT = { spire: { x: 0, y: 0, vis: 0, k: 0 }, pots: { x: 0, y: 0, x2: 0, y2: 0, vis: 0, k: 0, hx0: 0, hx1: 0, hy: 0 } };

/** Where the near spire is this frame (sets F and NEAR_AT.spire); false when it is off screen. */
export function nearSpireAt(s: Scene): boolean {
  const lvl = level(s);
  NEAR_AT.spire.vis = 0;
  if (Math.abs(lvl - NEAR_SPIRE.L) > 60) return false;
  const lane = laneOf(s, 1);
  F.U = Math.min(s.u, lane.w / 0.13);
  F.x = lane.x - lane.w * 0.1;
  F.y = laneY(s, 1, NEAR_SPIRE.L, NEAR_SPIRE.p, NEAR_SPIRE.frac, 0.38 * F.U);
  F.sx = 1;
  NEAR_AT.spire.k = (F.U / s.u) * 0.6;
  NEAR_AT.spire.x = X(0.012);
  NEAR_AT.spire.y = Y(0.338);
  // It comes out of the dark as its top comes down into view (never a pole hanging from the sky,
  // never a pop), and not before the skyline's stretch (a zoomed-out start view sees far up).
  const vis = smooth(-0.35, -0.1, Y(0.36) / s.u) * smooth(NEAR_SPIRE.L - 9, NEAR_SPIRE.L - 5, lvl) * (1 - smooth(NEAR_SPIRE.L + 7, NEAR_SPIRE.L + 11, lvl));
  if (Y(0.04) > s.cssH || vis <= 0.01) return false;
  NEAR_AT.spire.vis = vis;
  return true;
}

/** A crooked spire close by in the right lane, its weathervane turning on top. */
export function nearSpire(ctx: Ctx, s: Scene): void {
  if (!nearSpireAt(s)) return;
  const lw = Math.max(1.2, s.u * 0.0056);
  ctx.globalAlpha = NEAR_AT.spire.vis;
  ctx.lineJoin = "round";
  ctx.beginPath();
  // The tower down into the mist, its belfry louvers, then the crooked spire bending as it rises.
  rect(ctx, -0.035, -1.2, 0.035, 0.06);
  rect(ctx, -0.042, 0.055, 0.042, 0.07);
  M(ctx, -0.04, 0.07);
  Q(ctx, -0.03, 0.2, 0.012, 0.31);
  Q(ctx, 0.01, 0.18, 0.04, 0.07);
  ctx.closePath();
  ctx.fillStyle = NEAR_BODY;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.034, 0.075);
  Q(ctx, -0.024, 0.2, 0.01, 0.3);
  ctx.strokeStyle = NEAR_LIT;
  ctx.lineWidth = lw * 0.9;
  ctx.stroke();
  // Louvered belfry openings, a lit window below.
  ctx.beginPath();
  rect(ctx, -0.02, 0.0, -0.004, 0.045);
  rect(ctx, 0.006, 0.0, 0.022, 0.045);
  ctx.fillStyle = "#0b0a1c";
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    M(ctx, -0.02, 0.008 + i * 0.011);
    L(ctx, -0.004, 0.014 + i * 0.011);
    M(ctx, 0.006, 0.008 + i * 0.011);
    L(ctx, 0.022, 0.014 + i * 0.011);
  }
  ctx.strokeStyle = NEAR_BODY;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, -0.01, -0.09, 0.01, -0.05);
  ctx.fillStyle = flicker(s.t, 3701) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  vaneNear(ctx, 0.012, 0.31, 0.04, s);
  ctx.globalAlpha = 1;
}

/** The near spire's weathervane: an arrow and a crescent, turning slowly; a landing spins it a quarter turn. */
function vaneNear(ctx: Ctx, x: number, y: number, h: number, s: Scene): void {
  const land = s.sinceLand ?? Infinity;
  const kick = land < 1.2 ? (1 - Math.cos(Math.min(1, land / 0.6) * Math.PI)) / 2 : 0;
  const turn = Math.sin(s.t * 0.25) * 0.7 + (s.still ? 0 : kick * Math.PI * 0.5);
  const c = Math.cos(turn);
  ctx.beginPath();
  M(ctx, x, y);
  L(ctx, x, y + h);
  M(ctx, x - h * 0.55 * c, y + h * 0.7);
  L(ctx, x + h * 0.55 * c, y + h * 0.7);
  M(ctx, x + h * 0.55 * c, y + h * 0.7);
  L(ctx, x + h * 0.4 * c, y + h * 0.8);
  M(ctx, x + h * 0.55 * c, y + h * 0.7);
  L(ctx, x + h * 0.4 * c, y + h * 0.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, F.U * 0.005);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(x - h * 0.4 * c), Y(y + h * 0.7), h * 0.12 * F.U, 0.5, Math.PI * 2 - 0.5);
  ctx.stroke();
}

/** Where the chimney stack is this frame (sets F and NEAR_AT.pots); false when it is not shown. */
export function chimneyStackAt(s: Scene): boolean {
  const lvl = level(s);
  const P = NEAR_AT.pots;
  P.vis = 0;
  if (Math.abs(lvl - CHIMNEYS.L) > 60) return false;
  const lane = laneOf(s, -1);
  F.U = Math.min(s.u, lane.w / 0.18);
  F.x = lane.x;
  F.y = laneY(s, -1, CHIMNEYS.L, CHIMNEYS.p, CHIMNEYS.frac, 0.14 * F.U);
  F.sx = 1;
  P.k = (F.U / s.u) * 0.6;
  P.x = X(-0.032);
  P.y = Y(0.124);
  P.x2 = X(0.043);
  P.y2 = Y(0.1);
  P.hx0 = X(-0.014);
  P.hx1 = X(0.024);
  P.hy = Y(0.07);
  if (Y(0.13) > s.cssH) return false;
  P.vis = belowMoon(s, Y(0.13), haloBottom(s)) * window4(lvl, ...CHIMNEYS.show);
  return P.vis > 0.01;
}

/** A stack of crooked chimney pots close by in the left lane below the moon, smoking. */
export function chimneyStack(ctx: Ctx, s: Scene): void {
  if (!chimneyStackAt(s)) return;
  const P = NEAR_AT.pots;
  const vis = P.vis;
  const lw = Math.max(1.2, s.u * 0.0056);
  ctx.globalAlpha = vis;
  // A roof's ridge running off into the mist, and the stack on it: three pots leaning every way.
  ctx.beginPath();
  M(ctx, -0.085, -0.3);
  L(ctx, -0.08, 0.02);
  Q(ctx, 0, 0.04, 0.085, 0.022);
  L(ctx, 0.085, -0.3);
  ctx.closePath();
  rect(ctx, -0.05, 0.02, 0.06, 0.07);
  M(ctx, -0.042, 0.07);
  L(ctx, -0.04, 0.122);
  L(ctx, -0.024, 0.124);
  L(ctx, -0.022, 0.07);
  ctx.closePath();
  M(ctx, -0.008, 0.07);
  L(ctx, -0.004, 0.095);
  L(ctx, 0.01, 0.096);
  L(ctx, 0.012, 0.07);
  ctx.closePath();
  M(ctx, 0.03, 0.07);
  L(ctx, 0.036, 0.1);
  L(ctx, 0.05, 0.1);
  L(ctx, 0.052, 0.07);
  ctx.closePath();
  ctx.fillStyle = NEAR_BODY;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.08, 0.02);
  Q(ctx, 0, 0.04, 0.085, 0.022);
  M(ctx, -0.05, 0.07);
  L(ctx, 0.06, 0.07);
  ctx.strokeStyle = NEAR_LIT;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.beginPath();
  for (const [x0, x1] of POTS) {
    M(ctx, x0, 0.05);
    L(ctx, x1, 0.05);
  }
  ctx.strokeStyle = "#3a3660";
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  smoke(ctx, s.t, X(-0.032), Y(0.126), F.U * 0.01, F.U * 0.14, F.U * 0.04, 1.2, 0.3 * vis, 9);
  smoke(ctx, s.t, X(0.043), Y(0.102), F.U * 0.008, F.U * 0.1, F.U * 0.03, 1.5, 0.24 * vis, 13);
  ctx.globalAlpha = 1;
}
const POTS = [
  [-0.046, -0.02],
  [0.0, 0.05],
] as const;

// ---------------------------------------------------------------- the storm's bell tower and ledge

/** The bell tower (right lane, behind the mansion). */
export const BELL = { L: 75, p: 0.6, frac: 0.0 } as const;
const BELL_BODY = "#22213e";
const BELL_LIT = "#4e4c84";
const BRONZE = "#8a6a3a";
const BRONZE_LIT = "#c49a52";

/** Scratch: the bell tower's roost (under its belfry's beam), its corners' gargoyles, its webs. */
export const STORM_AT = {
  bell: { vis: 0, k: 0, top: 0, roostX: 0, roostY: 0, gl: { x: 0, y: 0 }, gr: { x: 0, y: 0 }, webL: { x: 0, y: 0 }, webR: { x: 0, y: 0 } },
};

/** Where the bell tower is this frame (sets F and STORM_AT.bell); false when it is off screen. */
export function bellTowerAt(s: Scene): boolean {
  const lvl = level(s);
  const B = STORM_AT.bell;
  B.vis = 0;
  if (Math.abs(lvl - BELL.L) > 50) return false;
  const lane = laneOf(s, 1);
  F.U = Math.min(s.u, lane.w / 0.15);
  F.x = lane.x;
  F.y = laneY(s, 1, BELL.L, BELL.p, BELL.frac, 0.33 * F.U);
  F.sx = 1;
  B.k = (F.U / s.u) * 0.45;
  B.top = Y(0.33);
  B.roostX = X(0.0);
  B.roostY = Y(0.142);
  B.gl.x = X(-0.066);
  B.gl.y = Y(0.044);
  B.gr.x = X(0.066);
  B.gr.y = Y(0.044);
  B.webL.x = X(-0.04);
  B.webL.y = Y(0.11);
  B.webR.x = X(0.04);
  B.webR.y = Y(0.11);
  // Out of the dark as its roof comes down into view, from the storm's approach on (as the near spire).
  const vis = smooth(-0.4, -0.15, Y(0.32) / s.u) * smooth(BELL.L - 12, BELL.L - 8, lvl) * (1 - smooth(BELL.L + 22, BELL.L + 27, lvl));
  if (Y(0.16) > s.cssH || vis <= 0.01) return false;
  B.vis = vis;
  return true;
}

/** The cathedral's bell tower coming down the right lane in the storm: its bell swinging in the open belfry. */
export function bellTower(ctx: Ctx, s: Scene): void {
  if (!bellTowerAt(s)) return;
  const lw = Math.max(1, s.u * 0.0045);
  ctx.globalAlpha = STORM_AT.bell.vis;
  // The shaft into the mist, a ledge, the belfry's posts round its arch, the steep roof with a spiral finial.
  ctx.beginPath();
  rect(ctx, -0.055, -1.4, 0.055, 0.0);
  rect(ctx, -0.066, -0.004, 0.066, 0.012);
  rect(ctx, -0.055, 0.012, -0.04, 0.15);
  rect(ctx, 0.04, 0.012, 0.055, 0.15);
  rect(ctx, -0.06, 0.15, 0.06, 0.165);
  M(ctx, -0.064, 0.165);
  Q(ctx, -0.02, 0.2, 0.004, 0.31);
  Q(ctx, 0.02, 0.2, 0.064, 0.165);
  ctx.closePath();
  ctx.fillStyle = BELL_BODY;
  ctx.fill();
  // The shaft's courses of stone, a buttress's edge lit by the moon, and lancet windows lit here and there.
  ctx.beginPath();
  for (let i = 1; i < 12; i++) {
    M(ctx, -0.055, -i * 0.1);
    L(ctx, 0.055, -i * 0.1 + 0.004);
  }
  ctx.strokeStyle = "#1a1934";
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.055, -1.4);
  L(ctx, -0.055, 0.0);
  ctx.strokeStyle = BELL_LIT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = -0.12 - i * 0.3;
    M(ctx, -0.012, y);
    L(ctx, -0.012, y + 0.06);
    L(ctx, 0, y + 0.075);
    L(ctx, 0.012, y + 0.06);
    L(ctx, 0.012, y);
    ctx.closePath();
  }
  ctx.fillStyle = flicker(s.t, 3801) < 1 ? DIM_LIGHT : LAMP_DEEP;
  ctx.fill();
  // Its open belfry: the dark arch behind the bell.
  ctx.beginPath();
  M(ctx, -0.04, 0.012);
  L(ctx, -0.04, 0.11);
  Q(ctx, 0, 0.16, 0.04, 0.11);
  L(ctx, 0.04, 0.012);
  ctx.closePath();
  ctx.fillStyle = "#0b0a1c";
  ctx.fill();
  ctx.beginPath();
  M(ctx, -0.055, 0.0);
  L(ctx, -0.055, 0.15);
  M(ctx, -0.06, 0.165);
  Q(ctx, -0.018, 0.2, 0.002, 0.3);
  ctx.strokeStyle = BELL_LIT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0.012), Y(0.316), 0.012 * F.U, Math.PI, Math.PI * 2.7);
  ctx.strokeStyle = BELL_BODY;
  ctx.lineWidth = lw * 1.2;
  ctx.stroke();
  // The bell, swinging on its beam (a landing rings it harder).
  const a = swing(s.t, 2.8, 0.18, 0.2, s.sinceLand ?? Infinity, 0.35, s.still === true);
  const hx = X(0);
  const hy = Y(0.14);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  const b = F.U;
  ctx.beginPath();
  ctx.moveTo(-0.008 * b, 0);
  ctx.lineTo(-0.012 * b, 0.012 * b);
  ctx.quadraticCurveTo(-0.022 * b, 0.016 * b, -0.024 * b, 0.05 * b);
  ctx.lineTo(-0.032 * b, 0.062 * b);
  ctx.lineTo(0.032 * b, 0.062 * b);
  ctx.lineTo(0.024 * b, 0.05 * b);
  ctx.quadraticCurveTo(0.022 * b, 0.016 * b, 0.012 * b, 0.012 * b);
  ctx.lineTo(0.008 * b, 0);
  ctx.closePath();
  ctx.fillStyle = BRONZE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.016 * b, 0.016 * b);
  ctx.quadraticCurveTo(-0.02 * b, 0.03 * b, -0.02 * b, 0.05 * b);
  ctx.strokeStyle = BRONZE_LIT;
  ctx.lineWidth = Math.max(1, b * 0.004);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, 0, 0.066 * b, 0.007 * b);
  ctx.fillStyle = BRONZE;
  ctx.fill();
  ctx.restore();
  // Gargoyles at the ledge's corners, leering out, cobwebs strung under the arch.
  gargoyle(ctx, -0.066, 0.012, 0.03, -1);
  gargoyle(ctx, 0.066, 0.012, 0.03, 1);
  web(ctx, -0.04, 0.11, 0.028, -1);
  web(ctx, 0.04, 0.11, 0.028, 1);
  ctx.globalAlpha = 1;
}

/** A cobweb in a corner at (x, y) (the corner's point), r across, opening toward `dir` and down. */
function web(ctx: Ctx, x: number, y: number, r: number, dir: number): void {
  ctx.beginPath();
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    M(ctx, x, y);
    L(ctx, x - dir * Math.cos(a) * r * -1, y - Math.sin(a) * r);
  }
  for (let ring = 1; ring <= 2; ring++) {
    const rr = (r * ring) / 2.4;
    M(ctx, x + dir * rr, y);
    for (let i = 1; i <= 3; i++) {
      const a = (i / 3) * (Math.PI / 2);
      L(ctx, x + dir * Math.cos(a) * rr * 0.92, y - Math.sin(a) * rr);
    }
  }
  ctx.strokeStyle = WEB;
  ctx.lineWidth = Math.max(0.6, F.U * 0.0015);
  ctx.stroke();
}
const WEB = "rgba(216, 210, 236, 0.5)";

/** How fast the lanes' pieces move past (px per level), for the tests. */
export function pieceSpeed(s: Scene, p: number): number {
  return perLevel(s) * p;
}

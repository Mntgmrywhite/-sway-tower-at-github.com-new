import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { CREAM, CYAN, FAR, FAR_BACK, GOLD, PINK, TAU } from "./colors";

// The far layer: a midnight city standing on the horizon, in faded flat silhouettes with no
// outlines. Two rows of towers with lit windows, a clock tower at five to midnight (its hands
// reach twelve as you climb), a ball-drop tower whose ball slides down its mast, and two soft
// searchlights. The landmarks flank the tower column and rise clear of the cloud bank.
// Geometry is in units of `u`, measured from the screen center and up from the horizon.

interface Building {
  x: number;
  w: number;
  h: number;
  /** 0 flat, 1 setback crown, 2 spire, 3 antenna */
  roof: 0 | 1 | 2 | 3;
}

interface Win {
  x: number;
  y: number;
  color: number;
  seed: number;
}

const SPAN = 1.8; // generate this far either side of center

/** Heights grow toward the screen edges, where the cloud bank piles up highest. */
function row(seed: number, minW: number, maxW: number, low: number, high: number, jitter: number): Building[] {
  const out: Building[] = [];
  let x = -SPAN;
  let i = 0;
  while (x < SPAN) {
    const w = minW + hash(seed + i * 3.1) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    const side = Math.min(1, mid / 0.55);
    const h = low + (high - low) * side * side + hash(seed + i * 3.1 + 1) * jitter;
    const r = hash(seed + i * 3.1 + 2);
    out.push({ x, w, h, roof: r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : 3 });
    x += w;
    i++;
  }
  return out;
}

const BACK = row(500, 0.07, 0.12, 0.15, 0.3, 0.06);
const FRONT = row(900, 0.055, 0.1, 0.075, 0.17, 0.05);

/** How far each roof type rises over its walls (u): flat, setback crown, spire, antenna + beacon. */
const ROOF_RISE = [0, 0, 0.06, 0.056] as const;

/** Half-width (u) of the middle of the skyline, behind the short tower. */
export const MID_SPAN = 0.24;
/** The tallest silhouette in the middle span, roofs included (u over the horizon): the sky
 *  layer keeps the bursts it pops over the short tower above it, so no rooftop slices them. */
export const SKYLINE_MID = Math.max(
  ...[BACK, FRONT].flatMap((r) => r.filter((b) => b.x < MID_SPAN && b.x + b.w > -MID_SPAN).map((b) => b.h + ROOF_RISE[b.roof])),
);

const WIN_W = 0.009;
const WIN_H = 0.012;

function windows(rowB: Building[], seed: number, litChance: number): Win[] {
  const out: Win[] = [];
  for (const [bi, b] of rowB.entries()) {
    const cols = Math.max(1, Math.floor((b.w - 0.02) / 0.022));
    const rows = Math.max(1, Math.floor((b.h - 0.03) / 0.026));
    const pad = (b.w - cols * 0.022) / 2;
    const hue = hash(seed + bi * 5.7);
    const color = hue < 0.65 ? 0 : hue < 0.83 ? 1 : 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = seed + bi * 131 + r * 17 + c;
        if (hash(id) > litChance) continue;
        out.push({ x: b.x + pad + c * 0.022 + 0.006, y: 0.024 + r * 0.026, color, seed: id });
      }
    }
  }
  return out;
}

/** Lit windows of a row, split by color so each color fills in one pass. */
function byColor(list: Win[]): Win[][] {
  return [0, 1, 2].map((c) => list.filter((w) => w.color === c));
}

const BACK_WIN = byColor(windows(BACK, 1300, 0.35));
const FRONT_WIN = byColor(windows(FRONT, 1700, 0.45));
/** Lit windows: warm, pink and cyan, each only a little lighter than the wall it sits in. */
const FRONT_LIT = [mix(FAR, CREAM, 0.5), mix(FAR, PINK, 0.45), mix(FAR, CYAN, 0.45)] as const;
const BACK_LIT = [mix(FAR_BACK, CREAM, 0.35), mix(FAR_BACK, PINK, 0.3), mix(FAR_BACK, CYAN, 0.3)] as const;
const BEACON = mix(FAR, PINK, 0.65);
const FACE = mix(FAR, CREAM, 0.72);
const BELFRY = mix(FAR, GOLD, 0.45);
const SLIT = mix(FAR, CREAM, 0.38);
const BOARDS = [mix(FAR, PINK, 0.42), mix(FAR, GOLD, 0.4), mix(FAR, CYAN, 0.4)] as const;
const BOARDS_DIM = BOARDS.map((c) => mix(c, FAR, 0.4));
const TICKER = mix(FAR, CREAM, 0.55);
/** Billboards on the ball-drop tower: x and width as fractions of its width, y and height in u. */
const BOARD_RECTS: readonly (readonly [number, number, number, number])[] = [
  [0.12, 0.05, 0.76, 0.06],
  [0.12, 0.15, 0.32, 0.1],
  [0.56, 0.15, 0.32, 0.1],
];
const BALL = mix(FAR, "#ffffff", 0.62);
const BALL_LIT = mix(FAR, "#ffffff", 0.85);
const BEAM = alpha(CREAM, 0.16);
const BEAM_END = alpha(CREAM, 0);
/** Lit slits down the clock tower's shaft (x from its center, height over the horizon) and its belfry arches. */
const SLITS: readonly (readonly [number, number])[] = [
  [-0.017, 0.1],
  [0.008, 0.1],
  [-0.017, 0.19],
  [0.008, 0.19],
];
const ARCHES = [-0.017, 0.017] as const;
/** Rows whose antennas carry beacons, front first. */
const BEACON_ROWS = [FRONT, BACK] as const;

const CLOCK_X = -0.31;
const DROP_X = 0.3;
/** Clock tower size relative to its outline below. */
const CLOCK_K = 0.92;
/** Heights (u over the horizon) of the clock tower's finial tip and the ball-drop mast. */
const CLOCK_TIP = 0.59;
const DROP_BODY = 0.31;
const DROP_MAST = 0.14;
/** The tallest ordinary building outside the middle span, roofs included (u over the horizon). */
const SKYLINE_SIDE = Math.max(
  ...[BACK, FRONT].flatMap((r) => r.filter((b) => b.x >= MID_SPAN || b.x + b.w <= -MID_SPAN).map((b) => b.h + ROOF_RISE[b.roof])),
);
/** The highest point of the city on each side of the tower (u over the horizon): the clock
 *  tower's finial on the left, the ball-drop mast on the right. The sky layer keeps the bursts
 *  it pops on each side above them. */
export const PEAK_LEFT = Math.max(CLOCK_TIP * CLOCK_K, SKYLINE_SIDE);
export const PEAK_RIGHT = Math.max(DROP_BODY + DROP_MAST, SKYLINE_SIDE);

/** Two pale beams sweeping up from behind the city, fading out well below the HUD. */
function searchlights(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const top = s.cssH * 0.34;
  const len = Math.min(hy - top, s.u * 1.1);
  if (len < s.u * 0.2) return;
  for (let i = 0; i < 2; i++) {
    const sx = s.cssW / 2 + (i ? 0.16 : -0.18) * s.u;
    const ang = (i ? 0.3 : -0.3) + Math.sin(s.t * (0.3 + i * 0.07) + i * 2.1) * 0.36;
    const tx = sx + Math.sin(ang) * len;
    const ty = hy - Math.cos(ang) * len;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const w0 = s.u * 0.01;
    const w1 = s.u * 0.075;
    const g = ctx.createLinearGradient(sx, hy, tx, ty);
    g.addColorStop(0, BEAM);
    g.addColorStop(1, BEAM_END);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - nx * w0, hy - ny * w0);
    ctx.lineTo(tx - nx * w1, ty - ny * w1);
    ctx.lineTo(tx + nx * w1, ty + ny * w1);
    ctx.lineTo(sx + nx * w0, hy + ny * w0);
    ctx.closePath();
    ctx.fill();
  }
}

/** One row of the skyline as a single flat silhouette. */
function skyline(ctx: Ctx, s: Scene, rowB: Building[], fill: string): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const minX = (-cx - u * 0.2) / u;
  const maxX = (s.cssW - cx + u * 0.2) / u;
  ctx.beginPath();
  let started = false;
  for (const b of rowB) {
    if (b.x + b.w < minX || b.x > maxX) continue;
    const x0 = cx + b.x * u;
    const x1 = cx + (b.x + b.w) * u;
    const top = hy - b.h * u;
    if (!started) {
      ctx.moveTo(x0, hy + 1);
      started = true;
    }
    if (b.roof === 1) {
      const inset = (x1 - x0) * 0.22;
      const step = u * 0.022;
      ctx.lineTo(x0, top + step);
      ctx.lineTo(x0 + inset, top + step);
      ctx.lineTo(x0 + inset, top);
      ctx.lineTo(x1 - inset, top);
      ctx.lineTo(x1 - inset, top + step);
      ctx.lineTo(x1, top + step);
    } else if (b.roof === 2) {
      // Art-deco crown: a short tier and a needle spire
      const m = (x0 + x1) / 2;
      const tier = (x1 - x0) * 0.3;
      ctx.lineTo(x0, top);
      ctx.lineTo(m - tier, top);
      ctx.lineTo(m - tier, top - u * 0.015);
      ctx.lineTo(m - tier * 0.4, top - u * 0.015);
      ctx.lineTo(m, top - u * 0.06);
      ctx.lineTo(m + tier * 0.4, top - u * 0.015);
      ctx.lineTo(m + tier, top - u * 0.015);
      ctx.lineTo(m + tier, top);
      ctx.lineTo(x1, top);
    } else {
      ctx.lineTo(x0, top);
      ctx.lineTo(x1, top);
    }
  }
  if (!started) return;
  ctx.lineTo(s.cssW + u * 0.2, hy + 1);
  ctx.closePath();
  // Antennas
  const aw = Math.max(1, u * 0.004);
  for (const b of rowB) {
    if (b.roof !== 3 || b.x + b.w < minX || b.x > maxX) continue;
    const ax = cx + (b.x + b.w / 2) * u;
    ctx.rect(ax - aw / 2, hy - b.h * u - u * 0.05, aw, u * 0.05 + 1);
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function windowLights(ctx: Ctx, s: Scene, lists: Win[][], colors: readonly string[]): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const ww = Math.max(1, WIN_W * u);
  const wh = Math.max(1, WIN_H * u);
  const slow = s.t * 0.2;
  for (let c = 0; c < colors.length; c++) {
    ctx.beginPath();
    for (const w of lists[c]!) {
      const x = cx + w.x * u;
      if (x < -ww || x > s.cssW) continue;
      // Lights switch on and off now and then.
      if (hash(w.seed * 1.7 + Math.floor(slow + hash(w.seed) * 5)) < 0.15) continue;
      ctx.rect(x, hy - w.y * u - wh, ww, wh);
    }
    ctx.fillStyle = colors[c]!;
    ctx.fill();
  }
}

/** Blinking lights on the antenna tips. */
function beacons(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (let ri = 0; ri < BEACON_ROWS.length; ri++) {
    const rowB = BEACON_ROWS[ri]!;
    for (let i = 0; i < rowB.length; i++) {
      const b = rowB[i]!;
      if (b.roof !== 3) continue;
      if (Math.sin(s.t * (2.4 - ri * 0.3) + i * 1.3) < 0.2) continue;
      circle(ctx, cx + (b.x + b.w / 2) * u, s.horizonY - b.h * u - u * 0.05, Math.max(1.2, u * 0.006));
    }
  }
  ctx.fillStyle = BEACON;
  ctx.fill();
}

/** Clock tower silhouette: x from its center and height over the horizon, in u. */
const CLOCK_OUTLINE: readonly (readonly [number, number])[] = [
  [-0.036, 0],
  [-0.036, 0.3],
  [-0.047, 0.3],
  [-0.047, 0.398],
  [-0.038, 0.398],
  [-0.038, 0.44],
  [-0.045, 0.44],
  [0, 0.56],
  [0.045, 0.44],
  [0.038, 0.44],
  [0.038, 0.398],
  [0.047, 0.398],
  [0.047, 0.3],
  [0.036, 0.3],
  [0.036, 0],
];

/** Gothic clock tower; the hands reach midnight as the tower reaches the sky. */
function clockTower(ctx: Ctx, s: Scene): void {
  const u = s.u * CLOCK_K;
  const hy = s.horizonY;
  const X = s.cssW / 2 + CLOCK_X * s.u;
  ctx.beginPath();
  for (const [dx, dy] of CLOCK_OUTLINE) ctx.lineTo(X + dx * u, hy + 1 - dy * u);
  ctx.closePath();
  // Finial
  ctx.rect(X - Math.max(0.5, u * 0.002), hy - CLOCK_TIP * u, Math.max(1, u * 0.004), 0.04 * u);
  ctx.fillStyle = FAR;
  ctx.fill();

  // Lit slits down the shaft and the belfry arches
  ctx.beginPath();
  for (const [dx, dy] of SLITS) ctx.rect(X + dx * u, hy - (dy + 0.045) * u, u * 0.009, u * 0.04);
  ctx.fillStyle = SLIT;
  ctx.fill();
  ctx.beginPath();
  for (const dx of ARCHES) {
    const ax = X + dx * u;
    const ay = hy - 0.405 * u;
    const r = u * 0.008;
    ctx.moveTo(ax - r, ay);
    ctx.lineTo(ax - r, ay - u * 0.016);
    ctx.arc(ax, ay - u * 0.016, r, Math.PI, 0);
    ctx.lineTo(ax + r, ay);
    ctx.closePath();
  }
  ctx.fillStyle = BELFRY;
  ctx.fill();

  // Clock face
  const cx = X;
  const cy = hy - 0.349 * u;
  const r = u * 0.034;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.fillStyle = FACE;
  ctx.fill();
  // 11:55 at the ground, midnight by the time the tower is high in the sky.
  const minutes = 55 + 5 * altitude01(s);
  const ma = (minutes / 60) * TAU - Math.PI / 2;
  const ha = ((11 + minutes / 60) / 12) * TAU - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(ma) * r * 0.75, cy + Math.sin(ma) * r * 0.75);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
    ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
  }
  ctx.strokeStyle = FAR;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Times-Square style tower: billboards, a ticker, and the ball sliding down its mast. */
function dropTower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  const X = s.cssW / 2 + DROP_X * u;
  const w = 0.09 * u;
  const h = DROP_BODY * u;
  const x0 = X - w / 2;
  const top = hy - h;
  const mastTop = top - u * DROP_MAST;

  ctx.beginPath();
  ctx.moveTo(x0, hy + 1);
  ctx.lineTo(x0, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top);
  ctx.lineTo(x0 + w * 0.85, top);
  ctx.lineTo(x0 + w * 0.85, top + u * 0.02);
  ctx.lineTo(x0 + w, top + u * 0.02);
  ctx.lineTo(x0 + w, hy + 1);
  ctx.closePath();
  const mw = Math.max(1.2, u * 0.006);
  ctx.rect(X - mw / 2, mastTop, mw, top - mastTop + 1);
  ctx.fillStyle = FAR;
  ctx.fill();

  // Billboards, gently flickering between two faded tints
  for (let bi = 0; bi < BOARD_RECTS.length; bi++) {
    const [bx, by, bw, bh] = BOARD_RECTS[bi]!;
    const on = Math.sin(s.t * 1.6 + bi * 2.1) > -0.3;
    ctx.fillStyle = on ? BOARDS[bi]! : BOARDS_DIM[bi]!;
    ctx.fillRect(x0 + w * bx, top + u * by, w * bw, u * bh);
  }
  // Scrolling ticker
  ctx.beginPath();
  const ty = top + u * 0.125;
  const dot = Math.max(1, u * 0.004);
  const scroll = (s.t * u * 0.04) % (dot * 4);
  for (let x = x0 + w * 0.08 - scroll; x < x0 + w * 0.92 - dot * 2; x += dot * 4) {
    if (x < x0 + w * 0.08) continue;
    ctx.rect(x, ty - dot / 2, dot * 2, dot);
  }
  ctx.fillStyle = TICKER;
  ctx.fill();

  // The ball drops down the mast as the tower climbs.
  const br = u * 0.022;
  const by = mastTop + br + altitude01(s) * (top - mastTop - br * 2.4);
  ctx.beginPath();
  circle(ctx, X, by, br);
  ctx.fillStyle = BALL;
  ctx.fill();
  // Facets twinkling as it turns
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    if (Math.sin(s.t * 4 + i * 1.9) < 0.3) continue;
    const a = i * 1.7 + 0.6;
    circle(ctx, X + Math.cos(a) * br * 0.5, by + Math.sin(a) * br * 0.45, br * 0.2);
  }
  ctx.fillStyle = BALL_LIT;
  ctx.fill();
}

/** The far layer. */
export function city(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.65 > s.cssH) return;
  searchlights(ctx, s);
  skyline(ctx, s, BACK, FAR_BACK);
  windowLights(ctx, s, BACK_WIN, BACK_LIT);
  clockTower(ctx, s);
  dropTower(ctx, s);
  skyline(ctx, s, FRONT, FAR);
  windowLights(ctx, s, FRONT_WIN, FRONT_LIT);
  beacons(ctx, s);
}

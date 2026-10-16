import { alpha, circle, ink, mix, outlined, oval, roundRectPath, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  CHAMPAGNE,
  EMERALD,
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  IVORY,
  LACQUER,
  ROSE,
  SILVER,
  TAU,
  tones,
} from "./colors";

// Ink-outlined props on the terrace, each drawn standing at (x, y) at perspective scale k:
// a champagne-coupe tower on a Deco side table, champagne spilling from tier to tier; a
// gramophone on a lacquer cabinet with a gold morning-glory horn, notes floating out; and a
// cream-and-emerald 1920s boat-tail roadster (a generic design) with a feather boa over its
// door. Sizes are in U = u * k, measured from the prop's foot.

const SHADOW = alpha(INK, 0.22);
/** Left and right, for things that come in pairs. */
const SIDES = [-1, 1] as const;

/** Ink width for a prop at perspective scale k: a little heavier up close, never hairline. */
export function inkFor(u: number, k: number): number {
  return Math.max(1.4, u * 0.0045 * (0.6 + 0.4 * k));
}

/** Soft flat shadow under a prop. */
function shadow(ctx: Ctx, x: number, y: number, rx: number): void {
  ctx.beginPath();
  oval(ctx, x, y, rx, rx * 0.2);
  ctx.fillStyle = SHADOW;
  ctx.fill();
}

/** Clip to the current path and paint a light band on top and a shaded band at the bottom. */
function shade(ctx: Ctx, c: { light: string; dark: string }, x: number, top: number, w: number, h: number, light: number, dark: number): void {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = c.light;
  ctx.fillRect(x, top, w, h * light);
  ctx.fillStyle = c.dark;
  ctx.fillRect(x, top + h * (1 - dark), w, h * dark);
  ctx.restore();
}

/* ---------------------------------------------------------------- champagne-coupe tower */

const GLASS = mix(IVORY, "#bfe3ff", 0.35);
const BUBBLE = alpha(IVORY, 0.9);
const GLINT = alpha("#ffffff", 0.85);
const BUBBLY = tones(CHAMPAGNE, 0.45, 0.22);
const SURFACE = GOLD_LIGHT;
const SPILL = mix(GOLD_LIGHT, GOLD, 0.35);
/** How far down toward the glass below a pour runs before it breaks into drops. */
const POUR = 0.5;
const GOLD_T = tones(GOLD, 0.45, 0.3);
const TABLE_TOP = tones(LACQUER, 0.25, 0.2);
/** Coupe sizes (U): bowl half-width and depth, stem, foot half-width and height. */
const BW = 0.022;
const BD = 0.014;
const STEM = 0.016;
const FOOT_W = 0.012;
const FOOT_H = 0.004;
const COUPE_H = FOOT_H + STEM + BD;
/** Tiers from the bottom: how many coupes, side by side. */
const TIERS = [3, 2, 1] as const;
const TABLE_H = 0.062;

function coupe(ctx: Ctx, x: number, base: number, U: number, lw: number): void {
  const rim = base - COUPE_H * U;
  // Foot and stem
  ctx.beginPath();
  oval(ctx, x, base - FOOT_H * U * 0.5, FOOT_W * U, FOOT_H * U * 0.8);
  ctx.rect(x - 0.003 * U, base - (FOOT_H + STEM) * U, 0.006 * U, STEM * U);
  outlined(ctx, GLASS, lw * 0.8, INK);
  // Bowl, brimming
  ctx.beginPath();
  ctx.moveTo(x - BW * U, rim);
  ctx.quadraticCurveTo(x - BW * U, rim + BD * U, x, rim + BD * U);
  ctx.quadraticCurveTo(x + BW * U, rim + BD * U, x + BW * U, rim);
  ctx.closePath();
  ctx.fillStyle = BUBBLY.base;
  ctx.fill();
  shade(ctx, BUBBLY, x - BW * U, rim, BW * 2 * U, BD * U, 0.3, 0.35);
  ctx.beginPath();
  ctx.moveTo(x - BW * U, rim);
  ctx.quadraticCurveTo(x - BW * U, rim + BD * U, x, rim + BD * U);
  ctx.quadraticCurveTo(x + BW * U, rim + BD * U, x + BW * U, rim);
  ink(ctx, lw, INK);
  // The champagne's surface at the rim, and a glint on the glass
  ctx.beginPath();
  oval(ctx, x, rim, BW * U, BD * U * 0.3);
  outlined(ctx, SURFACE, lw * 0.75, INK);
  ctx.beginPath();
  ctx.moveTo(x - BW * U * 0.7, rim + BD * U * 0.25);
  ctx.quadraticCurveTo(x - BW * U * 0.6, rim + BD * U * 0.7, x - BW * U * 0.25, rim + BD * U * 0.8);
  ctx.strokeStyle = GLINT;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
}

/** A Deco side table: stepped gold plinth, fluted pedestal, lacquer top with a gold edge. */
function sideTable(ctx: Ctx, x: number, y: number, U: number, lw: number): number {
  ctx.beginPath();
  ctx.rect(x - 0.05 * U, y - 0.009 * U, 0.1 * U, 0.009 * U);
  ctx.rect(x - 0.034 * U, y - 0.016 * U, 0.068 * U, 0.007 * U);
  outlined(ctx, GOLD_T.dark, lw * 0.85, INK);
  // Pedestal with flutes
  roundRectPath(ctx, x - 0.013 * U, y - 0.052 * U, 0.026 * U, 0.037 * U, 0.003 * U);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.fillStyle = GOLD_T.light;
  ctx.fillRect(x - 0.011 * U, y - 0.05 * U, 0.006 * U, 0.033 * U);
  roundRectPath(ctx, x - 0.013 * U, y - 0.052 * U, 0.026 * U, 0.037 * U, 0.003 * U);
  ink(ctx, lw * 0.85, INK);
  ctx.beginPath();
  ctx.moveTo(x + 0.002 * U, y - 0.048 * U);
  ctx.lineTo(x + 0.002 * U, y - 0.019 * U);
  ctx.moveTo(x + 0.007 * U, y - 0.048 * U);
  ctx.lineTo(x + 0.007 * U, y - 0.019 * U);
  ink(ctx, lw * 0.5, GOLD_DARK);
  // Top
  const top = y - TABLE_H * U;
  roundRectPath(ctx, x - 0.08 * U, top, 0.16 * U, 0.012 * U, 0.004 * U);
  ctx.fillStyle = TABLE_TOP.base;
  ctx.fill();
  shade(ctx, TABLE_TOP, x - 0.08 * U, top, 0.16 * U, 0.012 * U, 0.35, 0);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - 0.08 * U, top + 0.008 * U, 0.16 * U, 0.004 * U);
  roundRectPath(ctx, x - 0.08 * U, top, 0.16 * U, 0.012 * U, 0.004 * U);
  ink(ctx, lw, INK);
  return top;
}

/** Champagne spilling over a coupe's rim into the one below: a ribbon with drops riding it. */
function spill(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, dir: number, U: number, lw: number, seed: number): void {
  // A slim pour curling out over the lip and breaking into drops that fall into the glass
  // below (whose center sits right under this rim). It stops short of that glass, so it never
  // reads as a handle joining the two.
  const w = Math.max(1, U * 0.0034);
  const out = x + dir * 0.006 * U;
  const end = y0 + (y1 - y0) * POUR;
  ctx.beginPath();
  ctx.moveTo(x - dir * 0.003 * U, y0);
  ctx.quadraticCurveTo(out, y0 - 0.003 * U, out, y0 + (y1 - y0) * 0.3);
  ctx.lineTo(out, end);
  ink(ctx, w + lw * 0.8, INK);
  ctx.strokeStyle = SPILL;
  ctx.lineWidth = w;
  ctx.stroke();
  // Drops falling on from the end of the pour
  const dr = Math.max(1, w * 0.6);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const p = (s.t * 1.6 + i * 0.5 + seed * 0.27) % 1;
    circle(ctx, out, end + dr * 2 + (y1 - end - dr * 2) * p, dr);
  }
  outlined(ctx, SPILL, Math.max(0.8, lw * 0.5), INK);
}

export function champagneTower(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const U = s.u * k;
  const lw = inkFor(s.u, k);
  shadow(ctx, x, y, 0.07 * U);
  let base = sideTable(ctx, x, y, U, lw);
  const step = BW * 2 * U;
  for (let t = 0; t < TIERS.length; t++) {
    const n = TIERS[t]!;
    for (let i = 0; i < n; i++) coupe(ctx, x + (i - (n - 1) / 2) * step, base, U, lw);
    // Champagne overflows this tier's outer rims into the tier below.
    if (t > 0) {
      const rimY = base - COUPE_H * U;
      for (let i = 0; i < n; i++) {
        const cxp = x + (i - (n - 1) / 2) * step;
        if (i === 0) spill(ctx, s, cxp - BW * U, rimY + 1, base - 0.002 * U, -1, U, lw, t * 3 + i);
        if (i === n - 1) spill(ctx, s, cxp + BW * U, rimY + 1, base - 0.002 * U, 1, U, lw, t * 3 + i + 1);
      }
    }
    base -= COUPE_H * U;
  }
  // Bubbles rising out of the top coupe
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const p = (s.t * 0.55 + i / 5) % 1;
    const bx = x + Math.sin(s.t * 2.3 + i * 2.1) * 0.008 * U + (i - 2) * 0.006 * U;
    circle(ctx, bx, base - p * 0.05 * U, U * (0.0045 - p * 0.002));
  }
  ctx.fillStyle = BUBBLE;
  ctx.fill();
  // A twinkle travelling over the glasses
  const p = (s.t * 0.35) % 1;
  if (p < 0.4) {
    const r = 0.02 * U * Math.sin((p / 0.4) * Math.PI);
    const i = Math.floor(s.t * 0.35) % 3;
    const gx = x + (i - 1) * step - BW * U * 0.4;
    const gy = y - (TABLE_H + COUPE_H * (0.75 + i * 0.6)) * U;
    ctx.beginPath();
    ctx.moveTo(gx, gy - r);
    ctx.lineTo(gx + r * 0.22, gy - r * 0.22);
    ctx.lineTo(gx + r, gy);
    ctx.lineTo(gx + r * 0.22, gy + r * 0.22);
    ctx.lineTo(gx, gy + r);
    ctx.lineTo(gx - r * 0.22, gy + r * 0.22);
    ctx.lineTo(gx - r, gy);
    ctx.lineTo(gx - r * 0.22, gy - r * 0.22);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}

/* ---------------------------------------------------------------- gramophone */

const CABINET = tones(LACQUER, 0.22, 0.25);
const HORN = tones(GOLD, 0.45, 0.25);
const HORN_INSIDE = mix(GOLD_DARK, INK, 0.25);
const RECORD = "#1a1f33";
const NOTE = GOLD_LIGHT;
/** The horn: throat and mouth center (U, from the cabinet's top center), mouth radius. */
const THROAT_X = 0.04;
const THROAT_Y = -0.03;
const MOUTH_X = -0.006;
const MOUTH_Y = -0.13;
const MOUTH_R = 0.058;
const HORN_DIR = Math.atan2(MOUTH_Y - THROAT_Y, MOUTH_X - THROAT_X);
const PETALS = 6;

/** A music note: head, stem and flag in one path. */
function note(ctx: Ctx, x: number, y: number, r: number): void {
  oval(ctx, x, y, r * 1.25, r * 0.9, -0.4);
  ctx.moveTo(x + r * 0.95, y - r * 0.2);
  ctx.lineTo(x + r * 0.95, y - r * 3.4);
  ctx.quadraticCurveTo(x + r * 2.4, y - r * 2.6, x + r * 2.1, y - r * 1.6);
  ctx.quadraticCurveTo(x + r * 1.9, y - r * 2.2, x + r * 1.45, y - r * 2.4);
  ctx.lineTo(x + r * 1.45, y - r * 0.4);
  ctx.closePath();
}

export function gramophone(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const U = s.u * k;
  const lw = inkFor(s.u, k);
  shadow(ctx, x, y, 0.07 * U);
  // Legs
  ctx.beginPath();
  for (const d of SIDES) {
    const lx = x + d * 0.045 * U;
    ctx.moveTo(lx - 0.007 * U, y - 0.018 * U);
    ctx.lineTo(lx + 0.007 * U, y - 0.018 * U);
    ctx.lineTo(lx + d * 0.004 * U + 0.003 * U, y);
    ctx.lineTo(lx + d * 0.004 * U - 0.003 * U, y);
    ctx.closePath();
  }
  outlined(ctx, GOLD, lw * 0.85, INK);
  // Cabinet
  const bw = 0.13 * U;
  const bh = 0.066 * U;
  const top = y - 0.018 * U - bh;
  roundRectPath(ctx, x - bw / 2, top, bw, bh, 0.006 * U);
  ctx.fillStyle = CABINET.base;
  ctx.fill();
  shade(ctx, CABINET, x - bw / 2, top, bw, bh, 0.16, 0.18);
  roundRectPath(ctx, x - bw / 2, top, bw, bh, 0.006 * U);
  ink(ctx, lw, INK);
  // Gold sunburst fan on the front
  const fx = x;
  const fy = top + bh * 0.82;
  const fr = 0.036 * U;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a0 = Math.PI + (i / 5) * Math.PI + 0.06;
    const a1 = Math.PI + ((i + 1) / 5) * Math.PI - 0.06;
    ctx.moveTo(fx, fy);
    ctx.arc(fx, fy, fr, a0, a1);
    ctx.closePath();
  }
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x - bw / 2 + 0.008 * U, top + 0.012 * U, bw - 0.016 * U, bh - 0.018 * U);
  ink(ctx, Math.max(1, lw * 0.55), GOLD_DARK);
  // Turntable and spinning record
  const tx = x - 0.012 * U;
  const ty = top - 0.002 * U;
  ctx.beginPath();
  oval(ctx, tx, ty, 0.048 * U, 0.01 * U);
  outlined(ctx, GOLD, lw * 0.85, INK);
  ctx.beginPath();
  oval(ctx, tx, ty - 0.003 * U, 0.042 * U, 0.008 * U);
  ctx.fillStyle = RECORD;
  ctx.fill();
  ctx.beginPath();
  const spin = s.t * 5;
  circle(ctx, tx + Math.cos(spin) * 0.024 * U, ty - 0.003 * U + Math.sin(spin) * 0.004 * U, 0.004 * U);
  oval(ctx, tx, ty - 0.003 * U, 0.012 * U, 0.003 * U);
  ctx.fillStyle = ROSE;
  ctx.fill();

  // The horn: a neck up from the back of the cabinet to the throat, then the flared bell.
  const ox = x;
  const oy = top;
  const thx = ox + THROAT_X * U;
  const thy = oy + THROAT_Y * U;
  ctx.beginPath();
  ctx.moveTo(x + 0.046 * U, top - 0.002 * U);
  ctx.quadraticCurveTo(x + 0.056 * U, top - 0.02 * U, thx, thy);
  ink(ctx, 0.012 * U + lw * 2, INK);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 0.012 * U;
  ctx.stroke();
  const mx = ox + MOUTH_X * U;
  const my = oy + MOUTH_Y * U;
  const R = MOUTH_R * U;
  const px = -Math.sin(HORN_DIR);
  const py = Math.cos(HORN_DIR);
  const dx = Math.cos(HORN_DIR);
  const dy = Math.sin(HORN_DIR);
  const len = Math.hypot(mx - thx, my - thy);
  const w0 = 0.007 * U;
  ctx.beginPath();
  ctx.moveTo(thx + px * w0, thy + py * w0);
  ctx.quadraticCurveTo(thx + dx * len * 0.78 + px * w0 * 1.6, thy + dy * len * 0.78 + py * w0 * 1.6, mx + px * R, my + py * R);
  ctx.lineTo(mx - px * R, my - py * R);
  ctx.quadraticCurveTo(thx + dx * len * 0.78 - px * w0 * 1.6, thy + dy * len * 0.78 - py * w0 * 1.6, thx - px * w0, thy - py * w0);
  ctx.closePath();
  ctx.fillStyle = HORN.base;
  ctx.fill();
  ink(ctx, lw, INK);
  // Petal seams from the throat to the rim
  ctx.beginPath();
  for (let i = 1; i < PETALS; i++) {
    const f = (i / PETALS) * 2 - 1;
    ctx.moveTo(thx + dx * len * 0.3, thy + dy * len * 0.3);
    ctx.quadraticCurveTo(thx + dx * len * 0.8 + px * f * w0 * 1.4, thy + dy * len * 0.8 + py * f * w0 * 1.4, mx + px * R * f, my + py * R * f);
  }
  ink(ctx, Math.max(1, lw * 0.5), GOLD_DARK);
  // The bell's open mouth: a rim and the dark inside
  const rot = HORN_DIR + Math.PI / 2;
  ctx.beginPath();
  oval(ctx, mx, my, R, R * 0.42, rot);
  outlined(ctx, HORN.light, lw, INK);
  ctx.beginPath();
  oval(ctx, mx + dx * R * 0.04, my + dy * R * 0.04, R * 0.78, R * 0.3, rot);
  ctx.fillStyle = HORN_INSIDE;
  ctx.fill();

  // Notes floating up out of the horn
  ctx.beginPath();
  let any = false;
  for (let i = 0; i < 3; i++) {
    const p = (s.t * 0.42 + i / 3) % 1;
    if (p < 0.06) continue;
    const nx = mx + (0.02 + p * 0.05) * U + Math.sin(p * 7 + i * 2) * 0.012 * U;
    const ny = my - R * 0.4 - p * 0.15 * U;
    note(ctx, nx, ny, 0.0085 * U * Math.min(1, (p - 0.06) / 0.12) * (1 - Math.max(0, p - 0.8) / 0.2));
    any = true;
  }
  if (any) outlined(ctx, NOTE, Math.max(1, lw * 0.75), INK);
}

/* ---------------------------------------------------------------- roadster */

const CREAM = tones(CHAMPAGNE, 0.5, 0.22);
const FENDER = tones(EMERALD, 0.4, 0.3);
const TIRE = "#1c2236";
const WHITEWALL = IVORY;
const HUB = mix(GOLD_LIGHT, IVORY, 0.4);
const SEAMS = mix(CHAMPAGNE, INK, 0.5);
const LEATHER = tones("#d24b5c", 0.35, 0.25);
const WINDSHIELD = alpha("#cfeaff", 0.55);
const BOA = tones(ROSE, 0.5, 0.25);
/** Wheel centers (U from the car's center) and radius. */
const FRONT_WHEEL = -0.085;
const REAR_WHEEL = 0.088;
const WHEEL_R = 0.032;
const WHEELS = [FRONT_WHEEL, REAR_WHEEL] as const;
const SPOKES = 8;
const SPOKE_DIRS = Array.from({ length: SPOKES }, (_, i) => [Math.cos((i * TAU) / (SPOKES * 2)), Math.sin((i * TAU) / (SPOKES * 2))] as const);
/** The boa's puffs along its drape: x, y (U from the car's foot) and radius. It lies over the
 *  seat back, across the door top, and hangs down the door in a loose curl; the puffs jitter
 *  off the line and vary in size so its edge looks feathery. */
const BOA_PUFFS = (() => {
  const out: number[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = f < 0.4 ? 0.006 + f * 0.11 : 0.05 + (f - 0.4) * 0.03 + Math.sin((f - 0.4) * 9) * 0.008;
    const y = f < 0.4 ? 0.092 - f * 0.06 : 0.068 - (f - 0.4) * 0.075;
    const j = (i % 2 ? 1 : -1) * 0.0028;
    out.push(x + j, y - j * 0.6, 0.0078 + ((i * 7) % 5) * 0.0007);
  }
  return Float32Array.from(out);
})();

function wheel(ctx: Ctx, x: number, y: number, U: number, lw: number): void {
  const r = WHEEL_R * U;
  ctx.beginPath();
  circle(ctx, x, y, r);
  outlined(ctx, TIRE, lw, INK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.72);
  ctx.fillStyle = WHITEWALL;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.55);
  ctx.fillStyle = HUB;
  ctx.fill();
  ctx.beginPath();
  for (const [c, sn] of SPOKE_DIRS) {
    ctx.moveTo(x - c * r * 0.52, y - sn * r * 0.52);
    ctx.lineTo(x + c * r * 0.52, y + sn * r * 0.52);
  }
  ink(ctx, Math.max(0.8, lw * 0.45), GOLD_DARK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.18);
  outlined(ctx, GOLD, lw * 0.7, INK);
}

/** The car's cream body: hood, cowl, door and boat tail in one outline (U from its foot). */
function bodyPath(ctx: Ctx, x: number, y: number, U: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 0.118 * U, y - 0.032 * U);
  ctx.lineTo(x - 0.118 * U, y - 0.07 * U);
  ctx.quadraticCurveTo(x - 0.07 * U, y - 0.076 * U, x - 0.02 * U, y - 0.072 * U);
  ctx.lineTo(x + 0.07 * U, y - 0.07 * U);
  ctx.quadraticCurveTo(x + 0.128 * U, y - 0.068 * U, x + 0.138 * U, y - 0.04 * U);
  ctx.quadraticCurveTo(x + 0.138 * U, y - 0.03 * U, x + 0.125 * U, y - 0.03 * U);
  ctx.closePath();
}

/** The roadster is pulled up in front, under the tower's foot: drawn small enough to stay below it. */
const ROADSTER_SIZE = 0.76;

export function roadster(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const U = s.u * k * ROADSTER_SIZE;
  const lw = inkFor(s.u, k);
  shadow(ctx, x, y, 0.15 * U);
  const wy = y - WHEEL_R * U;

  // Seat back behind the body line
  roundRectPath(ctx, x + 0.004 * U, y - 0.094 * U, 0.06 * U, 0.03 * U, 0.01 * U);
  ctx.fillStyle = LEATHER.base;
  ctx.fill();
  shade(ctx, LEATHER, x + 0.004 * U, y - 0.094 * U, 0.06 * U, 0.03 * U, 0.3, 0);
  roundRectPath(ctx, x + 0.004 * U, y - 0.094 * U, 0.06 * U, 0.03 * U, 0.01 * U);
  ink(ctx, lw, INK);
  // Steering wheel peeking over the cowl
  ctx.beginPath();
  oval(ctx, x - 0.006 * U, y - 0.086 * U, 0.011 * U, 0.005 * U, -0.5);
  ink(ctx, Math.max(1.2, lw * 0.8), INK);

  // Body
  bodyPath(ctx, x, y, U);
  ctx.fillStyle = CREAM.base;
  ctx.fill();
  shade(ctx, CREAM, x - 0.12 * U, y - 0.078 * U, 0.26 * U, 0.048 * U, 0.22, 0.28);
  bodyPath(ctx, x, y, U);
  ink(ctx, lw, INK);
  // Gold beltline, door seam and hood louvers
  ctx.beginPath();
  ctx.moveTo(x - 0.112 * U, y - 0.058 * U);
  ctx.lineTo(x + 0.13 * U, y - 0.058 * U);
  ink(ctx, Math.max(1.2, U * 0.004) + lw, INK);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1.2, U * 0.004);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 0.002 * U, y - 0.068 * U);
  ctx.lineTo(x + 0.002 * U, y - 0.034 * U);
  ctx.moveTo(x + 0.066 * U, y - 0.068 * U);
  ctx.lineTo(x + 0.066 * U, y - 0.034 * U);
  for (let i = 0; i < 4; i++) {
    const lx = x - (0.075 - i * 0.012) * U;
    ctx.moveTo(lx, y - 0.052 * U);
    ctx.lineTo(lx, y - 0.04 * U);
  }
  ink(ctx, Math.max(1, lw * 0.6), SEAMS);

  // Windshield: glass in a slanted gold frame
  ctx.beginPath();
  ctx.moveTo(x - 0.024 * U, y - 0.072 * U);
  ctx.lineTo(x - 0.012 * U, y - 0.108 * U);
  ctx.lineTo(x - 0.004 * U, y - 0.108 * U);
  ctx.lineTo(x - 0.014 * U, y - 0.072 * U);
  ctx.closePath();
  ctx.fillStyle = WINDSHIELD;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 0.024 * U, y - 0.072 * U);
  ctx.lineTo(x - 0.012 * U, y - 0.108 * U);
  ctx.lineTo(x - 0.004 * U, y - 0.108 * U);
  ctx.lineTo(x - 0.014 * U, y - 0.072 * U);
  ink(ctx, Math.max(1.2, lw * 0.8), INK);

  // Running board and fenders
  roundRectPath(ctx, x - 0.07 * U, y - 0.03 * U, 0.14 * U, 0.008 * U, 0.003 * U);
  outlined(ctx, LACQUER, lw, INK);
  for (const wx of WHEELS) {
    const fx = x + wx * U;
    const r = WHEEL_R * U * 1.32;
    ctx.beginPath();
    ctx.moveTo(fx - r * 1.12, wy + r * 0.24);
    ctx.quadraticCurveTo(fx - r * 1.05, wy - r * 1.02, fx, wy - r * 1.02);
    ctx.quadraticCurveTo(fx + r * 1.05, wy - r * 1.02, fx + r * 1.12, wy + r * 0.24);
    ctx.lineTo(fx + r * 0.86, wy + r * 0.24);
    ctx.quadraticCurveTo(fx + r * 0.8, wy - r * 0.72, fx, wy - r * 0.74);
    ctx.quadraticCurveTo(fx - r * 0.8, wy - r * 0.72, fx - r * 0.86, wy + r * 0.24);
    ctx.closePath();
    ctx.fillStyle = FENDER.base;
    ctx.fill();
    ink(ctx, lw, INK);
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.7, wy - r * 0.78);
    ctx.quadraticCurveTo(fx, wy - r * 1.02, fx + r * 0.5, wy - r * 0.86);
    ctx.strokeStyle = FENDER.light;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  wheel(ctx, x + FRONT_WHEEL * U, wy, U, lw);
  wheel(ctx, x + REAR_WHEEL * U, wy, U, lw);

  // Radiator: a tall gold Deco grille, with a round cap on top
  roundRectPath(ctx, x - 0.134 * U, y - 0.08 * U, 0.02 * U, 0.05 * U, 0.004 * U);
  outlined(ctx, GOLD, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const gx = x - (0.129 - i * 0.005) * U;
    ctx.moveTo(gx, y - 0.074 * U);
    ctx.lineTo(gx, y - 0.036 * U);
  }
  ink(ctx, Math.max(0.8, lw * 0.45), GOLD_DARK);
  ctx.beginPath();
  circle(ctx, x - 0.124 * U, y - 0.086 * U, 0.005 * U);
  outlined(ctx, GOLD_LIGHT, lw * 0.7, INK);
  // Bumper
  roundRectPath(ctx, x - 0.142 * U, y - 0.03 * U, 0.016 * U, 0.008 * U, 0.003 * U);
  outlined(ctx, SILVER, lw * 0.8, INK);
  // Big chrome headlamp on the fender, beside the radiator
  ctx.beginPath();
  circle(ctx, x - 0.104 * U, y - 0.08 * U, 0.013 * U);
  outlined(ctx, SILVER, lw, INK);
  ctx.beginPath();
  circle(ctx, x - 0.107 * U, y - 0.08 * U, 0.008 * U);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - 0.11 * U, y - 0.083 * U, 0.003 * U);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // The feather boa, flung over the door: puffs inked as one shape, then filled
  ctx.beginPath();
  for (let i = 0; i < BOA_PUFFS.length; i += 3) {
    circle(ctx, x + BOA_PUFFS[i]! * U, y - BOA_PUFFS[i + 1]! * U, BOA_PUFFS[i + 2]! * U);
  }
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = BOA.base;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < BOA_PUFFS.length; i += 3) {
    const r = BOA_PUFFS[i + 2]! * U;
    circle(ctx, x + BOA_PUFFS[i]! * U - r * 0.25, y - BOA_PUFFS[i + 1]! * U - r * 0.3, r * 0.45);
  }
  ctx.fillStyle = BOA.light;
  ctx.fill();
}

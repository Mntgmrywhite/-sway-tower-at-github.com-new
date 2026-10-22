import { circle, hash, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { LAMP, LAMP_CORE, LAMP_DEEP, smooth } from "./common";
import { landBottom, restLine } from "./lines";
import { clockHours, level, MIST_GATHER, MIST_SETTLED } from "./tone";

// The crooked mansion on its crag across the hollow, our own design in a Tim Burton style: a tall
// Victorian manor leaning one way under a steep mansard while its great tower leans the other,
// climbing far up into the sky to an open belfry, a clock and a witch-hat spire that curls over
// into a spiral at its tip; a lower gabled wing, a thin second tower with a pointed cap, a crooked
// footbridge between the roofs, thin chimneys, and a stair winding up the crag. A flat dark
// silhouette (it is far away: no outline) lit only by its windows and its clock.
//
// As you climb, the ridge drops a little (it is far off); once the mist has gathered over the
// town, the crag and the mansion sink with it to rest low on the screen (MIST_SETTLED) and stand
// out of the mist sea for good, every turn of the loop. Its clock keeps the story's time
// (tone.ts clockHours): it runs on as you climb, and in the loop strikes twelve in the witching
// hour, when the bats pour out of its belfry (flyers.ts).
//
// Shapes are in u: x from MANSION_X (from the screen's center line), y up from the crag's top.

/** The ridge drops this much (a fraction of the climb) as you climb: farther than the horizon. */
export const RIDGE_P = 0.06;
/** The crag's top stands this far above its foot on the ridge line (u). */
const CRAG_TOP = 0.1;
/** At rest the crag's foot lies this far below the mist's top (u), so only its top stands out. */
const REST_SINK = 0.06;
/** The mansion's middle, in u from the screen's center. */
export const MANSION_X = 0.376;
/** The mansion's reach either side of MANSION_X (u, spires and curls included): it stays out of the column and on screen. */
export const MANSION_REACH = [-0.122, 0.112] as const;

/** Scratch: the ridge's frame this frame (screen x of the center line, y of its foot, u). */
const C = { cx: 0, y: 0, u: 0 };

/** The ridge's foot line (the start horizon, dropping slowly), easing down to rest with the mist. */
export function ridgeFoot(s: Scene, lvl = level(s)): number {
  const hy0 = s.horizonY - HORIZON_P * s.rise;
  const ridge = hy0 + RIDGE_P * s.rise;
  const rest = restLine(s) + s.u * REST_SINK;
  return ridge + (rest - ridge) * smooth(MIST_GATHER[1], MIST_SETTLED, lvl);
}

/**
 * The ridge's height above its foot at x (u from center): a shoulder rising from the hollow to
 * the covered bridge's far end (it sinks into the mist with the hollow), the crag's foothills, then
 * jagged peaks out to the widest screen.
 */
function ridgeH(x: number, hollow: number): number {
  if (x < 0.08) return 0;
  const shoulder = 0.13 * smooth(0.08, 0.22, x) * (1 - smooth(0.24, 0.3, x));
  const climb = 0.075 * smooth(0.2, 0.28, x) + shoulder * hollow;
  const fall = -0.035 * smooth(0.48, 0.56, x);
  const peaks = x > 0.5 ? 0.04 * Math.abs(Math.sin(x * 9.3 + 1.2)) + 0.025 * Math.abs(Math.sin(x * 23 + 0.4)) : 0;
  return climb + fall + peaks;
}

function ridgePath(ctx: Ctx, s: Scene, hollow: number): void {
  const u = C.u;
  const step = 0.012;
  const right = s.cssW / 2 / u + 0.05;
  // Its body reaches down under whatever lies below it (the street's floor, then the mist), its
  // near end sloping down into the hollow rather than standing as a cut edge.
  const bottom = Math.max(C.y + 1, landBottom(s));
  ctx.moveTo(C.cx + 0.06 * u - (bottom - C.y - 1) * 0.3, bottom);
  for (let x = 0.06; x <= right; x += step) {
    const jag = x > 0.24 ? (hash(Math.round(x / step) + 4400) - 0.5) * 0.008 : 0;
    ctx.lineTo(C.cx + x * u, C.y - (ridgeH(x, hollow) + jag) * u);
  }
  ctx.lineTo(C.cx + right * u, bottom);
  ctx.closePath();
}

// ---------------------------------------------------------------- the house

/** The mansion's frame: screen x of its middle, y of the crag's top, px per u; a lean (shear) per part. */
let LX = 0;
let LY = 0;
let LU = 1;
let SHEAR = 0;
function px(x: number, y: number): number {
  return LX + (x + SHEAR * y) * LU;
}
function py(y: number): number {
  return LY - y * LU;
}
function quad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.moveTo(px(x0, y0), py(y0));
  ctx.lineTo(px(x1, y0), py(y0));
  ctx.lineTo(px(x1, y1), py(y1));
  ctx.lineTo(px(x0, y1), py(y1));
  ctx.closePath();
}
function poly(ctx: Ctx, pts: readonly number[]): void {
  ctx.moveTo(px(pts[0]!, pts[1]!), py(pts[1]!));
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(px(pts[i]!, pts[i + 1]!), py(pts[i + 1]!));
  ctx.closePath();
}

const WING_LEAN = 0.1;
const MAIN_LEAN = -0.07;
const TOWER_LEAN = 0.05;
const THIN_LEAN = -0.045;
/** The great tower: center x, half-width, top of its shaft, the clock's height and radius, the belfry. */
const TOWER = { x: 0.055, w: 0.024, top: 0.3, clock: 0.235, clockR: 0.019, bell: 0.275 };
/** The spire above the shaft. */
const SPIRE = 0.11;
/** The crag under it all: its outline, in (x, y) pairs. */
const CRAG = [
  -0.115, -CRAG_TOP - 0.02, -0.118, -0.06, -0.104, -0.035, -0.112, -0.012, -0.1, 0.0,
  0.105, 0.0, 0.112, -0.022, 0.1, -0.05, 0.116, -0.075, 0.11, -CRAG_TOP - 0.02,
] as const;

/** The whole silhouette (crag and house) as one path, filled once. */
function housePath(ctx: Ctx): void {
  SHEAR = 0;
  poly(ctx, CRAG);
  // The thin second tower on the far left, leaning out, its pointed cap.
  SHEAR = THIN_LEAN;
  quad(ctx, -0.098, 0.0, -0.08, 0.2);
  poly(ctx, [-0.104, 0.198, -0.089, 0.262, -0.074, 0.198]);
  // The left wing, leaning right: a gabled block with a pointed turret on its corner.
  SHEAR = WING_LEAN;
  quad(ctx, -0.085, 0, -0.028, 0.085);
  poly(ctx, [-0.092, 0.083, -0.056, 0.125, -0.02, 0.083]);
  // The main block, leaning left: three stories under a steep sagging mansard, two dormers, chimneys.
  SHEAR = MAIN_LEAN;
  quad(ctx, -0.035, 0, 0.042, 0.15);
  poly(ctx, [-0.044, 0.147, -0.03, 0.205, 0.0, 0.198, 0.032, 0.21, 0.05, 0.147]);
  poly(ctx, [-0.026, 0.165, -0.017, 0.2, -0.008, 0.165]);
  quad(ctx, -0.026, 0.152, -0.008, 0.167);
  poly(ctx, [0.012, 0.17, 0.021, 0.208, 0.03, 0.17]);
  quad(ctx, 0.012, 0.158, 0.03, 0.172);
  quad(ctx, -0.024, 0.19, -0.017, 0.245);
  poly(ctx, [0.022, 0.2, 0.029, 0.2, 0.036, 0.24, 0.029, 0.242]);
  // The crooked footbridge from the mansard to the great tower.
  SHEAR = 0;
  poly(ctx, [0.03, 0.178, 0.05, 0.172, 0.05, 0.18, 0.03, 0.186]);
  // The great tower, leaning right, a gallery under its belfry, and the witch-hat spire.
  SHEAR = TOWER_LEAN;
  const { x, w, top } = TOWER;
  quad(ctx, x - w, 0, x + w, top);
  quad(ctx, x - w * 1.3, top - 0.004, x + w * 1.3, top + 0.007);
  quad(ctx, x - w * 1.35, 0.205, x + w * 1.35, 0.212);
  ctx.moveTo(px(x - w * 1.35, top + 0.007), py(top + 0.007));
  ctx.quadraticCurveTo(px(x - w * 0.2, top + SPIRE * 0.45), py(top + SPIRE * 0.45), px(x + w * 0.6, top + SPIRE), py(top + SPIRE));
  ctx.quadraticCurveTo(px(x + w * 0.35, top + SPIRE * 0.4), py(top + SPIRE * 0.4), px(x + w * 1.35, top + 0.007), py(top + 0.007));
  ctx.closePath();
  SHEAR = 0;
}

/** The spires' tips curl over into spirals; the crag's stair winds up its face. Strokes in the silhouette's color. */
function strokes(ctx: Ctx, lw: number): void {
  ctx.beginPath();
  SHEAR = TOWER_LEAN;
  const tx = px(TOWER.x + TOWER.w * 0.6, TOWER.top + SPIRE);
  const ty = py(TOWER.top + SPIRE);
  SHEAR = THIN_LEAN;
  const sx = px(-0.089, 0.262);
  const sy = py(0.262);
  SHEAR = 0;
  const r = LU * 0.011;
  ctx.moveTo(tx, ty);
  ctx.arc(tx + r, ty, r, Math.PI, Math.PI * 2.7);
  ctx.moveTo(sx, sy);
  ctx.arc(sx - r * 0.7, sy, r * 0.7, 0, -Math.PI * 1.7, true);
  // A weathervane bat on the wing's turret... a little flag of iron on the thin tower's cap.
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** Windows: [part lean, x, y, w, h, phase] in the house's frame. Some go dark now and then. */
const WINDOWS = (() => {
  const out: number[][] = [];
  // The main block: crooked rows of narrow windows, each its own size and a little out of line, a few gaps.
  for (let row = 0; row < 4; row++) {
    for (let c = 0; c < 3; c++) {
      const k = row * 3 + c;
      if (hash(k + 4630) < 0.2) continue;
      const w = 0.008 + hash(k + 4640) * 0.004;
      const h = 0.016 + hash(k + 4650) * 0.008;
      const x = -0.026 + c * 0.024 + (hash(k + 4660) - 0.5) * 0.006;
      const y = 0.014 + row * 0.034 + (hash(k + 4670) - 0.5) * 0.008;
      out.push([MAIN_LEAN, x, y, w, h, hash(k + 4600)]);
    }
  }
  out.push([WING_LEAN, -0.076, 0.022, 0.011, 0.018, hash(4700)], [WING_LEAN, -0.05, 0.016, 0.009, 0.022, hash(4701)]);
  out.push([WING_LEAN, -0.062, 0.052, 0.008, 0.012, hash(4702)], [WING_LEAN, -0.058, 0.093, 0.006, 0.012, hash(4703)]);
  out.push([THIN_LEAN, -0.093, 0.08, 0.007, 0.016, hash(4710)], [THIN_LEAN, -0.092, 0.15, 0.006, 0.02, hash(4711)]);
  for (let i = 0; i < 4; i++) out.push([TOWER_LEAN, TOWER.x - 0.006 + (i % 2 ? 0.002 : -0.002), 0.03 + i * 0.045, 0.012 - (i % 2) * 0.002, 0.02 + (i % 3) * 0.003, hash(4704 + i)]);
  out.push([MAIN_LEAN, -0.021, 0.172, 0.006, 0.008, hash(4720)], [MAIN_LEAN, 0.017, 0.178, 0.006, 0.008, hash(4721)]);
  return out;
})();

function windows(ctx: Ctx, t: number, flare: number): void {
  // At midnight every window blazes, with a glow round each.
  if (flare > 0.01) {
    ctx.beginPath();
    for (const [lean, x, y, w, h] of WINDOWS) {
      SHEAR = lean!;
      quad(ctx, x! - 0.006, y! - 0.006, x! + w! + 0.006, y! + h! + 0.006);
    }
    ctx.fillStyle = LAMP_DEEP;
    ctx.globalAlpha = 0.35 * flare * (0.8 + 0.2 * Math.sin(t * 6));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const pass of [0, 1] as const) {
    ctx.beginPath();
    for (const [lean, x, y, w, h, ph] of WINDOWS) {
      const on = flare > 0.5 || Math.sin(t * 0.21 + ph! * 40) > -0.75;
      if (!on || (pass === 1 && ph! < 0.5 - flare)) continue;
      SHEAR = lean!;
      quad(ctx, x!, y!, x! + w!, y! + h!);
    }
    ctx.fillStyle = pass ? LAMP : LAMP_DEEP;
    ctx.fill();
  }
  // The belfry glows faintly through its open arch.
  SHEAR = TOWER_LEAN;
  ctx.beginPath();
  const bx = TOWER.x;
  ctx.moveTo(px(bx - 0.012, 0.262), py(0.262));
  ctx.lineTo(px(bx - 0.012, 0.284), py(0.284));
  ctx.quadraticCurveTo(px(bx, 0.296), py(0.296), px(bx + 0.012, 0.284), py(0.284));
  ctx.lineTo(px(bx + 0.012, 0.262), py(0.262));
  ctx.closePath();
  ctx.fillStyle = LAMP_DEEP;
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
  SHEAR = 0;
}

/** The clock in the tower: a pale glowing face with its ring of hour marks, the hands at the story's time. */
function clock(ctx: Ctx, lvl: number, color: string): void {
  SHEAR = TOWER_LEAN;
  const cx = px(TOWER.x, TOWER.clock);
  const cy = py(TOWER.clock);
  SHEAR = 0;
  const r = TOWER.clockR * LU;
  ctx.fillStyle = LAMP;
  ctx.beginPath();
  circle(ctx, cx, cy, r * 1.2);
  ctx.fill();
  ctx.fillStyle = LAMP_CORE;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.fill();
  const h = clockHours(lvl);
  const hour = (h / 12) * Math.PI * 2;
  const minute = (h % 1) * Math.PI * 2;
  ctx.beginPath();
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    ctx.moveTo(cx + Math.sin(a) * r * 0.78, cy - Math.cos(a) * r * 0.78);
    ctx.lineTo(cx + Math.sin(a) * r * 0.95, cy - Math.cos(a) * r * 0.95);
  }
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(hour) * r * 0.55, cy - Math.cos(hour) * r * 0.55);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(minute) * r * 0.85, cy - Math.cos(minute) * r * 0.85);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.lineCap = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- placing

/** Scratch: the mansion's frame on screen this frame. */
const F = { x: 0, y: 0, u: 0, belfryX: 0, belfryY: 0, topY: 0, x0: 0, x1: 0 };

/** Where the mansion stands: its middle, the crag's top, u; its belfry; its spire's tip; its span. */
export function mansionAt(s: Scene, lvl = level(s)): Readonly<typeof F> {
  const u = s.u;
  const foot = ridgeFoot(s, lvl);
  F.u = u;
  F.x = s.cssW / 2 + MANSION_X * u;
  F.y = foot - CRAG_TOP * u;
  F.belfryX = F.x + (TOWER.x + TOWER_LEAN * TOWER.bell) * u;
  F.belfryY = F.y - TOWER.bell * u;
  F.topY = F.y - (TOWER.top + SPIRE + 0.02) * u;
  F.x0 = F.x + MANSION_REACH[0] * u;
  F.x1 = F.x + MANSION_REACH[1] * u;
  return F;
}

/** The ridge, the crag and the mansion on it, in the tone's silhouette color, lit windows and clock. */
export function mansion(ctx: Ctx, s: Scene, color: string, ridge = true, hollow = 1, flare = 0): void {
  const lvl = level(s);
  const at = mansionAt(s, lvl);
  if (at.topY > s.cssH) return;
  C.cx = s.cssW / 2;
  C.u = s.u;
  C.y = ridgeFoot(s, lvl);
  LX = at.x;
  LY = at.y;
  LU = s.u;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ridge) ridgePath(ctx, s, hollow);
  housePath(ctx);
  ctx.fill();
  ctx.strokeStyle = color;
  strokes(ctx, Math.max(1, s.u * 0.005));
  windows(ctx, s.t, flare);
  clock(ctx, lvl, color);
}

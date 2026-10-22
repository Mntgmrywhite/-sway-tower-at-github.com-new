import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { usFlag } from "./flag";
import { backLine, frontLine } from "./land";
import { church, courthouse } from "./landmarks";
import { hiddenByMain } from "./mainstreet";
import { ridge, softOval, traceRidge, type Lobe, type Ridge } from "./paint";
import { dot } from "./shapes";
import type { Steps, Tone } from "./tone";
import { BACK_ROOF_SHADE, BULB, BULB_GLOW, LAMP_BULB, LAMP_GLOW } from "./colors";

// The town beyond Main Street, seen over its rooftops as you rise: two rows of a tree-lined
// American town in high summer, painted soft, no lines, every row back a step paler. The front
// row, the streets just behind Main Street: big rounded treetops with the gables of clapboard
// houses among them (cream, white, butter, sky and rose walls under terracotta, slate and green
// roofs), a flag on a porch here and there, and on each side a tall flagpole flying the Stars
// and Stripes with strings of red, white and blue pennants swaying from its top. The back row,
// the neighborhood beyond: smaller roofs among the treetops, the white church with its steeple
// on the left and the courthouse with its clock tower and dome on the right (landmarks.ts). Birds
// flit between the rooftops. Behind the tower (|X| under COLUMN) the rows are only treetops, the
// park, so the column stays calm; the houses keep to the sides. After dark the windows light one
// by one. Each row is a band of treetops filled down to the bottom of the screen, so however far
// the rows have slid apart (land.ts), no gap ever opens between them.
//
// Positions are in u from the screen's center (X), heights in u up from the row's line.

/** Behind the tower: no houses nearer the center than this (u), only treetops. */
const COLUMN = 0.27;

/** A house among the trees: X, width, wall height, roof rise (all u), wall and roof colors, a chimney (left -1, right 1, none 0), a porch flag. */
interface House {
  X: number;
  w: number;
  wall: number;
  roof: number;
  wallColor: number;
  roofColor: number;
  chimney: number;
  flag: boolean;
}

/**
 * Houses either side of the column: first at the places given (u out from the center, the same
 * each side, so a phone's narrow lanes hold a few), then every `pitch` out to `far`, sized by
 * `size`, none where `skip` says a landmark or a flagpole stands.
 */
function street(seed: number, near: readonly number[], pitch: number, size: number, far: number, skip: readonly (readonly [number, number])[]): House[] {
  const out: House[] = [];
  const spots: number[] = [...near];
  for (let d = near[near.length - 1]! + pitch; d < far; d += pitch) spots.push(d);
  for (const side of [-1, 1]) {
    spots.forEach((d, i) => {
      const h = (n: number) => hash(seed + i * 17 + n + (side > 0 ? 500 : 0));
      const w = size * (0.85 + h(1) * 0.3);
      const X = side * (d + (i < near.length ? 0 : (h(2) - 0.5) * pitch * 0.2));
      if (Math.abs(X) - w / 2 < COLUMN) return;
      if (skip.some(([a, b]) => X + w / 2 > a && X - w / 2 < b)) return;
      out.push({
        X,
        w,
        wall: size * (0.5 + h(3) * 0.25),
        roof: size * (0.38 + h(4) * 0.22),
        wallColor: Math.floor(h(5) * 5),
        roofColor: Math.floor(h(6) * 4),
        chimney: h(7) < 0.4 ? -1 : h(7) > 0.7 ? 1 : 0,
        flag: h(8) > 0.6,
      });
    });
  }
  return out;
}

/** Treetops along a row: X every `pitch`, radius and how high they stand (u); lower and quieter behind the tower. */
function crowns(seed: number, pitch: number, r: number, high: number, far: number, quiet: number): Lobe[] {
  const out: Lobe[] = [];
  for (let i = 0, X = -far; X <= far; i++, X += pitch) {
    const c = Math.abs(X) < COLUMN + r ? quiet : 1;
    const rr = r * (0.75 + hash(seed + i) * 0.5) * (0.8 + 0.2 * c);
    out.push([X + (hash(seed + i + 300) - 0.5) * pitch * 0.4, -(high * c * (0.6 + hash(seed + i + 600) * 0.5)) + rr * 0.2, rr]);
  }
  return out;
}

/** How far out a row is laid (u either side of the center): past the widest screen. */
const FAR = 1.7;

/** The landmarks' spans in the back row (u), where no house stands. */
const LANDMARKS = [
  [-0.42, -0.26],
  [0.26, 0.415],
] as const;

const BACK_HOUSES = street(7400, [0.47], 0.066, 0.058, FAR, LANDMARKS);
const BACK_CROWNS = row(crowns(7600, 0.034, 0.026, 0.035, FAR, 0.6));
const BACK_SHRUBS = row(crowns(7700, 0.026, 0.018, 0.004, FAR, 1));
/** The front row's flagpoles stand here (u from center), so no house does. */
const POLES = [-0.455, 0.45] as const;
const FRONT_HOUSES = street(7800, [0.318, 0.396], 0.096, 0.078, FAR, POLES.map((X) => [X - 0.008, X + 0.008] as const));
const FRONT_CROWNS = row(crowns(8000, 0.05, 0.04, 0.06, FAR, 0.5));
const FRONT_SHRUBS = row(crowns(8100, 0.036, 0.026, 0.006, FAR, 1));

/** A row of treetops: its crowns, and the outline of their tops worked out once. */
interface Row {
  crowns: readonly Lobe[];
  top: Ridge;
}
function row(crowns: Lobe[]): Row {
  return { crowns, top: ridge(crowns, -FAR - 0.1, FAR + 0.1, 0.006) };
}

/**
 * Paints a band of treetops: the crowns' outline along the line, filled down to `bottom`, and,
 * out in the lanes, a lit cap on each crown's upper left, so the trees read one by one (behind
 * the tower they stay one quiet color). The row's shrubs, drawn over its feet in the same color,
 * close it below (no shade band between them: it only peeped through the shrubs' notches).
 */
function treetops(ctx: Ctx, s: Scene, r: Row, line: number, bottom: number, steps: Steps, detail: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = steps[1];
  ctx.beginPath();
  traceRidge(ctx, r.top, cx, line, u, bottom, 0, s.cssW);
  ctx.fill();
  if (!detail) return;
  ctx.fillStyle = steps[2];
  ctx.beginPath();
  const half = s.cssW / 2 / u + 0.05;
  for (const [X, h, rr] of r.crowns) {
    if (Math.abs(X) < COLUMN + rr || Math.abs(X) > half + rr) continue;
    softOval(ctx, cx + (X - rr * 0.22) * u, line + (h - rr * 0.42) * u, rr * u * 0.55, rr * u * 0.34, -0.25);
  }
  ctx.fill();
}

/**
 * The houses of a row: roofs (lit slope and shaded slope), walls, chimneys, windows (lit at
 * dusk), a porch flag here and there. Each color is one fill over all the houses.
 */
function houses(ctx: Ctx, s: Scene, list: readonly House[], line: number, walls: readonly string[], roofs: readonly string[], roofShade: string | readonly string[], window: string, flagInks: { red: string; white: string; blue: string } | null): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + 0.1;
  // On screen, and not behind Main Street's storefronts (from the square they hide the rows' houses).
  const seen = list.filter((h) => {
    if (Math.abs(h.X) - h.w >= half) return false;
    const pad = h.w * 0.58 + (flagInks && h.flag ? 0.03 : 0);
    return !hiddenByMain(s, h.X - pad, h.X + pad, line - (h.wall + h.roof) * u);
  });
  for (let c = 0; c < walls.length; c++) {
    ctx.fillStyle = walls[c]!;
    ctx.beginPath();
    for (const h of seen) {
      if (h.wallColor !== c) continue;
      const x = cx + (h.X - h.w / 2) * u;
      ctx.rect(x, line - (h.wall + 0.012) * u, h.w * u, (h.wall + 0.03) * u);
      // The gable end under the roof.
      ctx.moveTo(x + h.w * u * 0.12, line - (h.wall + 0.011) * u);
      ctx.lineTo(x + h.w * u * 0.5, line - (h.wall + h.roof * 0.8) * u);
      ctx.lineTo(x + h.w * u * 0.88, line - (h.wall + 0.011) * u);
      ctx.closePath();
    }
    ctx.fill();
  }
  // Chimneys, then the roofs over them: a gable, its right slope in shade.
  ctx.fillStyle = roofs[1]!;
  ctx.beginPath();
  for (const h of seen) {
    if (!h.chimney) continue;
    const x = cx + (h.X + h.chimney * h.w * 0.26) * u;
    ctx.rect(x - u * 0.005, line - (h.wall + h.roof * 0.95) * u, u * 0.01, h.roof * 0.6 * u);
  }
  ctx.fill();
  for (let c = 0; c < roofs.length; c++) {
    ctx.fillStyle = roofs[c]!;
    ctx.beginPath();
    for (const h of seen) {
      if (h.roofColor !== c) continue;
      const x = cx + h.X * u;
      const eave = line - (h.wall + 0.012) * u;
      const peak = line - (h.wall + h.roof) * u;
      ctx.moveTo(x - h.w * u * 0.58, eave + u * 0.004);
      ctx.quadraticCurveTo(x - h.w * u * 0.3, peak + (eave - peak) * 0.4, x, peak);
      ctx.lineTo(x + h.w * u * 0.58, eave + u * 0.004);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.fillStyle = typeof roofShade === "string" ? roofShade : roofShade[0]!;
  ctx.globalAlpha = typeof roofShade === "string" ? 0.35 : 1;
  ctx.beginPath();
  for (const h of seen) {
    const x = cx + h.X * u;
    const eave = line - (h.wall + 0.012) * u;
    const peak = line - (h.wall + h.roof) * u;
    ctx.moveTo(x, peak);
    ctx.lineTo(x + h.w * u * 0.58, eave + u * 0.004);
    ctx.lineTo(x + h.w * u * 0.2, eave + u * 0.004);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // Windows: a pair under the eaves, and one in the gable.
  ctx.fillStyle = window;
  ctx.beginPath();
  for (const h of seen) {
    const x = cx + h.X * u;
    const ww = h.w * u * 0.16;
    const wy = line - (h.wall - 0.004) * u;
    ctx.rect(x - h.w * u * 0.3, wy, ww, ww * 1.3);
    ctx.rect(x + h.w * u * 0.14, wy, ww, ww * 1.3);
    ctx.rect(x - ww * 0.4, line - (h.wall + h.roof * 0.42) * u, ww * 0.8, ww * 0.9);
  }
  ctx.fill();
  if (!flagInks) return;
  for (const h of seen) {
    if (!h.flag) continue;
    const side = h.X < 0 ? 1 : -1;
    const x = cx + (h.X + side * h.w * 0.45) * u;
    const y = line - h.wall * 0.55 * u;
    usFlag(ctx, x, y, u * 0.026, u * 0.017, side > 0 ? 1 : -1, u * 0.002, s.t * 3 + h.X * 9, flagInks);
  }
}

// ---------------------------------------------------------------- birds between the rooftops

/** Little birds flitting between the rooftops in the lanes: each hops from roof to roof on its own clock. */
const BIRDS = [
  { X0: -0.36, X1: -0.47, h: 0.11, every: 5.5, phase: 0.6 },
  { X0: 0.47, X1: 0.37, h: 0.13, every: 6.8, phase: 2.9 },
  { X0: -0.3, X1: -0.4, h: 0.09, every: 7.7, phase: 4.1 },
] as const;

/** The birds over the front row: each flits along an arc between two roofs, rests, and flits back. */
function birds(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const b of BIRDS) {
    const t = s.t + b.phase;
    const n = Math.floor(t / b.every);
    const k = (t - n * b.every) / 1.6;
    const going = n % 2 === 0;
    const p = Math.min(1, Math.max(0, k));
    const from = going ? b.X0 : b.X1;
    const to = going ? b.X1 : b.X0;
    const X = from + (to - from) * p;
    const y = line - (b.h + Math.sin(p * Math.PI) * 0.05) * u;
    const flying = k > 0 && k < 1;
    const g = u * 0.008;
    const flap = flying ? Math.sin(s.t * 26) : -0.4;
    const x = cx + X * u;
    ctx.moveTo(x - g, y - flap * g * 0.5);
    ctx.quadraticCurveTo(x - g * 0.4, y - g * 0.45, x, y);
    ctx.quadraticCurveTo(x + g * 0.4, y - g * 0.45, x + g, y - flap * g * 0.5);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------- the flagpoles and their pennants

/** The front row's flagpoles: their height (u above the row's line) and the flag's size. */
export const POLE_H = 0.22;
const POLE_FLAG_W = 0.07;
const POLE_FLAG_H = 0.045;
/** Each pole's strings of pennants: where they come down to (X offset, u below the pole's top), pennants a string. */
const STRINGS = [
  [0.14, 0.13],
  [0.07, 0.17],
] as const;
const PENNANTS = 7;

/** Whether Main Street hides a pole, its gilt ball and the flag flying from it. */
function poleHidden(s: Scene, X: number, line: number): boolean {
  const reach = POLE_FLAG_W + 0.01;
  return hiddenByMain(s, X - reach, X + reach, line - (POLE_H + 0.014) * s.u);
}

/** Whether Main Street hides a whole string of pennants and lights: checked along it, piece by piece (it sags as it comes down). */
function stringHidden(s: Scene, st: Str): boolean {
  const u = s.u;
  const cx = s.cssW / 2;
  // Room for the pennants' and the lights' reach about the string (u).
  const pad = 0.009;
  let px = st.x0;
  let py = st.y0;
  for (let i = 1; i <= 8; i++) {
    const { x, y } = along(st, i / 8);
    if (!hiddenByMain(s, (Math.min(px, x) - cx) / u - pad, (Math.max(px, x) - cx) / u + pad, Math.min(py, y) - pad * u)) return false;
    px = x;
    py = y;
  }
  return true;
}

/** Scratch: the strings of pennants on screen now: their ends, their sag's control point, and their pole's X. */
interface Str {
  x0: number;
  y0: number;
  mx: number;
  my: number;
  x1: number;
  y1: number;
  X: number;
}
const STRS: Str[] = Array.from({ length: 8 }, () => ({ x0: 0, y0: 0, mx: 0, my: 0, x1: 0, y1: 0, X: 0 }));

/** A point `k` along a string (its quadratic), into AT. */
const AT = { x: 0, y: 0 };
function along(st: Str, k: number): typeof AT {
  AT.x = (1 - k) * (1 - k) * st.x0 + 2 * k * (1 - k) * st.mx + k * k * st.x1;
  AT.y = (1 - k) * (1 - k) * st.y0 + 2 * k * (1 - k) * st.my + k * k * st.y1;
  return AT;
}

/**
 * The front row's flagpoles: strings of red, white and blue pennants swaying from each pole's top
 * (out to the side, and in toward the tower short of its column), a string of little lights
 * between the pennants glowing warm after dark, the pole with its gilt ball, and the flag. All the
 * strings in one stroke, a color of pennants in one fill.
 */
function poles(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  let n = 0;
  for (const X of POLES) {
    const x = cx + X * u;
    if (x < -u * 0.1 || x > s.cssW + u * 0.1) continue;
    const top = line - POLE_H * u;
    const out = X < 0 ? -1 : 1;
    for (const [dx, dy] of STRINGS) {
      for (const side of [out, -out]) {
        const reach = side === out ? dx : Math.min(dx, Math.abs(X) - COLUMN - 0.03);
        if (reach <= 0.02) continue;
        const st = STRS[n++]!;
        st.x0 = x;
        st.y0 = top;
        st.x1 = x + side * reach * u;
        st.y1 = top + dy * u;
        st.mx = (x + st.x1) / 2;
        st.my = (top + st.y1) / 2 + u * 0.03 + Math.sin(s.t * 1.3 + X * 7 + dx * 20) * u * 0.004;
        st.X = X;
        // From the square, Main Street's storefronts hide the strings behind them.
        if (stringHidden(s, st)) n--;
      }
    }
  }
  ctx.strokeStyle = tone.mainLine;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(0.6, u * 0.0012);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const st = STRS[i]!;
    ctx.moveTo(st.x0, st.y0);
    ctx.quadraticCurveTo(st.mx, st.my, st.x1, st.y1);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const st = STRS[j]!;
      for (let i = band; i < PENNANTS; i += 3) {
        const { x: px, y: py } = along(st, (i + 0.7) / (PENNANTS + 0.4));
        const swing = Math.sin(s.t * 2.2 + i * 1.3 + st.X * 5) * u * 0.002;
        ctx.moveTo(px - u * 0.006, py);
        ctx.lineTo(px + u * 0.006, py);
        ctx.lineTo(px + swing, py + u * 0.014);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
  // After dark, the little lights between the pennants: a soft warm glow, then the bulbs, twinkling now and then.
  if (tone.lamps > 0.02) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? BULB : BULB_GLOW;
      ctx.globalAlpha = tone.lamps * (pass ? 1 : 0.3);
      ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const st = STRS[j]!;
        for (let i = 0; i < PENNANTS; i++) {
          const { x: px, y: py } = along(st, (i + 1.2) / (PENNANTS + 0.4));
          const tw = Math.sin(s.t * 3.1 + i * 2.7 + j * 1.9) > 0.92 ? 0.6 : 1;
          dot(ctx, px, py + u * 0.002, u * (pass ? 0.0025 * tw : 0.0075));
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  for (const X of POLES) {
    const x = cx + X * u;
    if (x < -u * 0.1 || x > s.cssW + u * 0.1 || poleHidden(s, X, line)) continue;
    const top = line - POLE_H * u;
    const out = X < 0 ? -1 : 1;
    // The pole, a gilt ball on top, the flag flying out toward the side.
    ctx.fillStyle = tone.trim;
    ctx.fillRect(x - u * 0.0022, top, u * 0.0044, POLE_H * u + u * 0.01);
    ctx.fillStyle = tone.gilt;
    ctx.beginPath();
    circle(ctx, x, top - u * 0.004, u * 0.005);
    ctx.fill();
    usFlag(ctx, x - out * u * 0.002, top + u * 0.004, POLE_FLAG_W * u, POLE_FLAG_H * u, -out as 1 | -1, u * 0.004, s.t * 2.6 + X * 3, {
      red: tone.flagRed,
      white: tone.flagWhite,
      blue: tone.flagBlue,
    });
  }
}

// ---------------------------------------------------------------- street lamps after dark

/** The street lamps along a row, out in the lanes (u from center): warm points in a soft glow once the lamps are lit. */
const LAMP_X = [-1.3, -1.06, -0.85, -0.63, -0.38, 0.36, 0.58, 0.81, 1.03, 1.27] as const;

function lamps(ctx: Ctx, s: Scene, tone: Tone, y: number, size: number): void {
  if (tone.lamps <= 0.02) return;
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? LAMP_BULB : LAMP_GLOW;
    ctx.globalAlpha = tone.lamps * (pass ? 1 : 0.28);
    ctx.beginPath();
    for (const X of LAMP_X) {
      const x = cx + X * u;
      if (x < -u * 0.02 || x > s.cssW + u * 0.02) continue;
      circle(ctx, x, y, u * size * (pass ? 0.0035 : 0.012));
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the rows

/** The back row: the neighborhood beyond, with the church and the courthouse among its trees. */
export function backRow(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const line = backLine(s);
  if (line - 0.6 * s.u > s.cssH) return;
  treetops(ctx, s, BACK_CROWNS, line, bottom, tone.canopyBack, true);
  church(ctx, s, tone, line);
  courthouse(ctx, s, tone, line);
  houses(ctx, s, BACK_HOUSES, line, tone.wallsBack, tone.roofsBack, BACK_ROOF_SHADE, tone.windowBack, null);
  treetops(ctx, s, BACK_SHRUBS, line + s.u * 0.01, bottom, tone.canopyBack, false);
  lamps(ctx, s, tone, line + s.u * 0.006, 0.7);
}

/** The front row: the tree-lined streets just behind Main Street, the flagpoles, the birds. */
export function frontRow(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const line = frontLine(s);
  if (line - (POLE_H + 0.06) * s.u > s.cssH) return;
  treetops(ctx, s, FRONT_CROWNS, line, bottom, tone.canopyFront, true);
  poles(ctx, s, tone, line);
  houses(ctx, s, FRONT_HOUSES, line, tone.wallsFront, tone.roofsFront, tone.roofShadeFront, tone.windowFront, { red: tone.red, white: tone.white, blue: tone.blue });
  treetops(ctx, s, FRONT_SHRUBS, line + s.u * 0.014, bottom, tone.canopyFront, false);
  lamps(ctx, s, tone, line + s.u * 0.01, 1);
  birds(ctx, s, tone, line);
}

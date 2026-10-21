import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { scallopArc } from "./shapes";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: soft rolling hills in faded lavender (a hazy back
// row and a nearer row with lit slopes, low on the left, where the sun sets), and on the right
// the fair hill, a round mound with the Ferris wheel on its top: its spokes and rim strung with
// bulbs that come on at dusk, its gondolas swinging slowly round in the night. Behind the hills
// a bank of stylized cloud is piled at either side. Above the start a sea of cloud gathers below
// you and covers the lawn and the canal, drawn the Art Nouveau way: rows of scallops, far rows
// small and near rows big, in the hour's pastels, a fine contour along each row and a shell line
// in each big scallop. From then on its top is the land's line, which the boulevard and the fair
// hill stand on (`landLine`), and it sinks with them to rest low on the screen, and there it
// stays for good, a calm sea of cloud with the lit fronts and the wheel standing out of it, for
// the sun to set into and rise out of on every turn of the story's loop (tone.ts). The hills and
// the wheel are faded and flat, with no outline; the clouds have only their fine line. Nothing
// here moves but the wheel, out in the right lane.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.24;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;

/**
 * The line the cloud floor lies along once it has gathered, and the fair hill stands on: the
 * horizon while the land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  return horizon + (s.cssH - s.u * FLOOR_REST - horizon) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(16, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/**
 * The land below shows only until the cloud floor covers it (`top` is the floor's top edge);
 * once it has, it stays covered as the floor sinks to its rest.
 */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < DAY_HIGH && top > s.horizonY + s.u * 0.02;
}

/**
 * The line the boulevard and the fair hill stand on: the horizon while the land shows, then the
 * cloud floor's line as it sinks to rest (and there it stays, so every turn of the loop looks
 * the same).
 */
export function landLine(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}


/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;
/** The back hills' base line, u below the horizon: the sky must reach it. */
const BACK_BASE = 0.03;

/** Where the sky stops: below this the hills and the boulevard, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * (BACK_BASE + 0.01) : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled behind the hills at either side: [X (u from center), height above the horizon (u), radius (u)]. */
const BANK = [
  [-0.7, 0.1, 0.14],
  [-0.57, 0.15, 0.11],
  [-0.46, 0.1, 0.085],
  [-0.36, 0.07, 0.065],
  [-0.27, 0.05, 0.05],
  [0.24, 0.05, 0.05],
  [0.33, 0.08, 0.06],
  [0.5, 0.13, 0.1],
  [0.62, 0.11, 0.12],
  [0.74, 0.08, 0.14],
] as const;

/** Whether the cloud bank is drawn (`top` is the cloud floor's top edge): while it is on screen and the floor has not covered it. */
export function bankShows(s: Scene, top: number): boolean {
  const fair = landLine(s);
  return fair - s.u * 0.4 < s.cssH && top - s.u * 0.06 > fair - FAIR_H * s.u;
}

/** Whether the cloud floor is drawn (`top` is its top edge): once it is (nearly) up on screen. */
export function floorShows(s: Scene, top: number): boolean {
  return top < s.cssH + s.u * 0.15;
}

/**
 * Stylized clouds piled along the horizon at either side, behind the hills, in the hour's cloud
 * colors: one flat body with a fine contour round the pile (stroked under it), a shell line in
 * each big puff.
 */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (const [X, h, r] of BANK) circle(ctx, bankX(s, X), hz - h * u, r * u);
  ctx.rect(-u * 0.05, hz - u * 0.05, Math.max(0, Math.min(cx - u * 0.27, u * 0.23)) + u * 0.05, u * 0.1);
  ctx.rect(Math.max(cx + u * 0.24, s.cssW - u * 0.26), hz - u * 0.05, s.cssW, u * 0.1);
  ctx.strokeStyle = tone.cloudLine;
  ctx.lineWidth = Math.max(1.4, u * 0.006);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.lineJoin = "miter";
  ctx.fillStyle = tone.cloud;
  ctx.fill();
  ctx.beginPath();
  for (const [X, h, r] of BANK) if (r > 0.08) scallopArc(ctx, bankX(s, X), hz - h * u, r * u);
  ctx.lineWidth = Math.max(0.8, u * 0.003);
  ctx.stroke();
}

/** A bank puff's x: on a wider screen the banks keep to its sides. */
function bankX(s: Scene, X: number): number {
  const u = s.u;
  const cx = s.cssW / 2;
  return X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
}

// ---------------------------------------------------------------- hills

/** Polyline step along the hills (u). */
const HILL_STEP = 0.04;

/** The far row: a low hazy ridge all along the horizon. Low on the left, under the setting sun, so the floor's puffs cover it as it gathers. */
function backHeight(X: number): number {
  const lift = 0.4 + 0.6 * smooth(-0.25, 0.15, X);
  return (0.05 + 0.03 * Math.sin(X * 4.3 + 0.9) + 0.014 * Math.sin(X * 11.1 + 2.4)) * lift;
}

/** The nearer row's base line, u below the horizon (the boulevard's pavement covers it). */
const FRONT_BASE = 0.02;

function bump(X: number, c: number, w: number): number {
  const d = (X - c) / w;
  return Math.exp(-d * d);
}

/** Height of the nearer hills at X (u from center): gentle, a rise behind the boulevard's middle, low on the left. */
function frontHeight(X: number): number {
  const lift = 0.5 + 0.5 * smooth(-0.3, 0.05, X);
  return (0.03 + 0.045 * bump(X, 0.05, 0.22) + 0.012 * Math.sin(X * 6.5 + 1.2) + 0.006 * Math.sin(X * 15 + 0.4)) * lift;
}

/** A row of hills: the path along their tops, filled down to `bottom`. */
function hillPath(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * HILL_STEP) {
    ctx.lineTo(x, base - u * height((x - cx) / u));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
}

/** The hills while the land shows: the hazy back row, then the nearer row with its lit slopes. They fade as the floor reaches the horizon. */
export function hills(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  ctx.globalAlpha = 1 - smooth(DAY_HIGH - 4, DAY_HIGH, level(s));
  ctx.fillStyle = tone.hillFar;
  hillPath(ctx, s, hz + u * BACK_BASE, backHeight, Math.min(bottom, hz + u * (FRONT_BASE + 0.012)));
  ctx.fill();
  ctx.fillStyle = tone.hill;
  hillPath(ctx, s, hz + u * FRONT_BASE, frontHeight, Math.min(bottom, hz + u * (FRONT_BASE + 0.012)));
  ctx.fill();
  // Lit slopes: the sunward (left) face of each rise.
  ctx.fillStyle = tone.hillLit;
  ctx.beginPath();
  const cx = s.cssW / 2;
  for (let x = -1; x < s.cssW + 1; x += u * HILL_STEP) {
    const X = (x - cx) / u;
    const h0 = frontHeight(X);
    const h1 = frontHeight(X + HILL_STEP);
    if (h1 <= h0 + 0.0015) continue;
    ctx.moveTo(x, hz + (FRONT_BASE - h0) * u);
    ctx.lineTo(x + u * HILL_STEP, hz + (FRONT_BASE - h1) * u);
    ctx.lineTo(x + u * HILL_STEP, hz + (FRONT_BASE - h1) * u + u * 0.012);
    ctx.lineTo(x, hz + (FRONT_BASE - h0) * u + u * 0.012);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the fair hill and the Ferris wheel

/** The fair hill: its center (u from the screen center), half width and height (u), and the wheel on its top. */
export const FAIR_X = 0.37;
const FAIR_HW = 0.2;
const FAIR_H = 0.11;
/** The wheel: its axle's height above the hill's top, its radius, the gondolas' size (u). */
const AXLE_UP = 0.13;
export const WHEEL_R = 0.085;
const GONDOLA = 0.011;
const SPOKES = 8;
/** How fast the wheel turns (radians per second): slowly. */
const TURN = 0.12;
/** Where the stripes of the little pavilion tent at the wheel's foot fall. */
const TENT_X = 0.46;

/** Scratch for the wheel's place, so placing it allocates nothing. */
const WHEEL = { x: 0, y: 0, r: 0, top: 0 };

/** Where the wheel is: its axle and radius, and the hill's top under it. */
export function wheelAt(s: Scene): typeof WHEEL {
  const u = s.u;
  const top = landLine(s) + u * 0.01 - FAIR_H * u;
  WHEEL.x = s.cssW / 2 + FAIR_X * u;
  WHEEL.top = top;
  WHEEL.y = top - AXLE_UP * u;
  WHEEL.r = WHEEL_R * u;
  return WHEEL;
}

/** Whether the fair hill is on screen at all. */
export function fairShows(s: Scene): boolean {
  const w = wheelAt(s);
  return w.y - w.r < s.cssH + s.u * 0.02 && w.top + FAIR_H * s.u > -s.u * 0.1;
}

/**
 * The fair hill: a round mound (lit on its left), the little striped pavilion at the wheel's
 * foot, and the Ferris wheel: two A-frame legs, the rim and spokes strung with bulbs, and
 * gondolas hanging from the rim, turning slowly round. Flat and faded, far away.
 */
export function fairHill(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const { x, y, r, top } = wheelAt(s);
  const base = top + FAIR_H * u;
  // The mound.
  ctx.fillStyle = tone.hill;
  ctx.beginPath();
  ctx.moveTo(x - FAIR_HW * u, base + u * 0.02);
  ctx.quadraticCurveTo(x - FAIR_HW * u * 0.9, top, x, top);
  ctx.quadraticCurveTo(x + FAIR_HW * u * 0.9, top, x + FAIR_HW * u, base + u * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.hillLit;
  ctx.beginPath();
  ctx.moveTo(x - FAIR_HW * u * 0.7, base + u * 0.02);
  ctx.quadraticCurveTo(x - FAIR_HW * u * 0.65, top + u * 0.01, x - u * 0.02, top + u * 0.004);
  ctx.quadraticCurveTo(x - u * 0.08, top + u * 0.03, x - FAIR_HW * u * 0.45, base + u * 0.02);
  ctx.closePath();
  ctx.fill();
  // The pavilion: a striped tent roof on a low wall, right of the wheel's foot.
  const tx = s.cssW / 2 + TENT_X * u;
  const tw = u * 0.024;
  const ty = top + u * 0.012;
  ctx.fillStyle = tone.wheel;
  ctx.beginPath();
  ctx.rect(tx - tw, ty - u * 0.012, tw * 2, u * 0.012);
  ctx.moveTo(tx - tw * 1.2, ty - u * 0.012);
  ctx.lineTo(tx, ty - u * 0.032);
  ctx.lineTo(tx + tw * 1.2, ty - u * 0.012);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.gondola;
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.6, ty - u * 0.012);
  ctx.lineTo(tx, ty - u * 0.032);
  ctx.lineTo(tx + tw * 0.6, ty - u * 0.012);
  ctx.closePath();
  ctx.fill();
  // The legs, the rim and the spokes.
  const lw = Math.max(1, u * 0.0035);
  ctx.strokeStyle = tone.wheel;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, top + u * 0.002);
  ctx.lineTo(x, y);
  ctx.lineTo(x + r * 0.55, top + u * 0.002);
  ctx.moveTo(x - r * 0.3, y + (top - y) * 0.5);
  ctx.lineTo(x + r * 0.3, y + (top - y) * 0.5);
  const a0 = s.t * TURN;
  for (let i = 0; i < SPOKES; i++) {
    const a = a0 + (i * Math.PI * 2) / SPOKES;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  circle(ctx, x, y, r);
  circle(ctx, x, y, r * 0.3);
  ctx.stroke();
  // Gondolas hanging from the rim, each swinging a little as it rides round.
  ctx.fillStyle = tone.gondola;
  ctx.beginPath();
  for (let i = 0; i < SPOKES; i++) {
    const a = a0 + (i * Math.PI * 2) / SPOKES;
    const gx = x + Math.cos(a) * r;
    const gy = y + Math.sin(a) * r + GONDOLA * u * 0.9;
    const g = GONDOLA * u;
    ctx.moveTo(gx - g * 0.55, gy - g * 0.3);
    ctx.lineTo(gx + g * 0.55, gy - g * 0.3);
    ctx.lineTo(gx + g * 0.4, gy + g * 0.4);
    ctx.lineTo(gx - g * 0.4, gy + g * 0.4);
    ctx.closePath();
  }
  ctx.fill();
  // The hub, and the bulbs along the spokes and the rim, lit at night.
  ctx.fillStyle = tone.wheelLit;
  ctx.beginPath();
  circle(ctx, x, y, lw * 1.6);
  if (tone.lights > 0.02) {
    const br = Math.max(0.7, u * 0.0022);
    for (let i = 0; i < SPOKES; i++) {
      const a = a0 + (i * Math.PI * 2) / SPOKES;
      for (let k = 1; k <= 3; k++) circle(ctx, x + Math.cos(a) * r * (0.3 + k * 0.17), y + Math.sin(a) * r * (0.3 + k * 0.17), br);
    }
    for (let i = 0; i < 24; i++) {
      const a = a0 + (i * Math.PI * 2) / 24;
      circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, br);
    }
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the cloud floor

/**
 * The cloud sea's rows, far to near: how far under its top edge each row's scallops are centered
 * (u), their radius (u), and which of the hour's cloud colors fills it (0 lit, 1 body, 2 shaded).
 * Nearer rows are bigger; each covers the screen from its scallops down to the next row's. The
 * first row's scallops meet well above the top edge, so nothing on the land's line (the
 * boulevard's pavement) shows between them.
 */
const ROWS = [
  [-0.005, 0.04, 0],
  [0.065, 0.048, 1],
  [0.15, 0.062, 0],
  [0.25, 0.084, 1],
  [0.39, 0.11, 2],
  [0.58, 0.14, 1],
  [0.84, 0.18, 0],
] as const;
/** Half the band behind the tower (u) where the cloud sea's scallops go without their shell lines. */
const QUIET = 0.2;
/** Scallops along a row: their spacing in radii, and every other one a little smaller. */
const SCALLOP_STEP = 1.62;
const SMALL = 0.82;

/** Row k's first scallop: left of the screen, each row half a step out of line with the last. */
function rowStart(s: Scene, k: number, step: number): number {
  const off = (k % 2) * step * 0.5;
  return s.cssW / 2 - Math.ceil(s.cssW / 2 / step + 1) * step + off;
}

/** Row k's scallops: where its cusps lie, its radius and its step (px), for the cloud floor whose top is `top`. */
function rowAt(s: Scene, top: number, k: number): { cusp: number; r: number; step: number } {
  const [d, R] = ROWS[k]!;
  const r = R * s.u;
  // The cusps lie half a radius over the row's line, the big scallops' crowns a whole radius over it.
  ROW.cusp = top + (d - R * 0.5) * s.u;
  ROW.r = r;
  ROW.step = r * SCALLOP_STEP;
  return ROW;
}
const ROW = { cusp: 0, r: 0, step: 0 };

/**
 * Row k's scalloped edge across the screen, as Béziers from cusp to cusp (continues the path):
 * left to right, or (`back`) right to left. Every other scallop is a little smaller.
 */
function scallops(ctx: Ctx, s: Scene, k: number, cusp: number, r: number, step: number, back: boolean): void {
  const x0 = rowStart(s, k, step);
  const n = Math.ceil((s.cssW + step - x0) / step);
  for (let j = 0; j < n; j++) {
    const i = back ? n - 1 - j : j;
    const x = x0 + i * step;
    const h = (i % 2 ? SMALL : 1) * r * 0.5 * (4 / 3);
    const e = back ? -step / 2 : step / 2;
    ctx.bezierCurveTo(x - e, cusp - h, x + e, cusp - h, x + e, cusp);
  }
}

/**
 * The cloud floor, the Art Nouveau way: rows of scalloped cloud, far rows small and near rows
 * big, in the hour's pastel cloud colors by turns, a fine contour along every row's scallops and
 * a shell line inside each big one (but behind the tower, which stays quieter). Each row is a
 * band from its scallops down to the next row's, so the bands never overlap and every band of a
 * color is one fill. It is solid from a little under its top edge down to the screen's bottom.
 * It stands still: it runs right behind the tower, where nothing moves. It is drawn after
 * everything on the land, so as it gathers it covers all of it (only the fair hill and its wheel
 * stand out of it); the railing in front stays in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  // How many rows show: down to the first whose cusps are below the screen.
  let rows = 0;
  while (rows < ROWS.length && rowAt(s, top, rows).cusp - ROW.r * 0.5 <= s.cssH) rows++;
  if (rows === 0) return;
  // Under the bands, one flat fill from just under the first row's cusps: where two bands meet,
  // their soft edges would otherwise let a trace of what lies behind show through.
  const under = rowAt(s, top, 0).cusp + 1;
  ctx.fillStyle = tone.cloud;
  ctx.fillRect(0, under, s.cssW, s.cssH - under);
  const fills = [tone.cloudLight, tone.cloud, tone.cloudShade];
  for (let c = 0; c < fills.length; c++) {
    ctx.beginPath();
    for (let k = 0; k < rows; k++) {
      if (ROWS[k]![2] !== c) continue;
      const { cusp, r, step } = rowAt(s, top, k);
      const left = rowStart(s, k, step) - step / 2;
      ctx.moveTo(left, cusp);
      scallops(ctx, s, k, cusp, r, step, false);
      if (k + 1 < rows) {
        const next = rowAt(s, top, k + 1);
        const nl = rowStart(s, k + 1, next.step) - next.step / 2;
        const nr = nl + Math.ceil((s.cssW + next.step - nl - next.step / 2) / next.step) * next.step;
        ctx.lineTo(nr, next.cusp);
        scallops(ctx, s, k + 1, next.cusp, next.r, next.step, true);
        ctx.lineTo(Math.min(left, nl), next.cusp);
      } else {
        ctx.lineTo(s.cssW + step * 2, s.cssH + 1);
        ctx.lineTo(left, s.cssH + 1);
      }
      ctx.closePath();
    }
    ctx.fillStyle = fills[c]!;
    ctx.fill();
  }
  // The contour along every row's scallops, and the shell lines.
  ctx.beginPath();
  for (let k = 0; k < rows; k++) {
    const { cusp, r, step } = rowAt(s, top, k);
    const x0 = rowStart(s, k, step);
    ctx.moveTo(x0 - step / 2, cusp);
    scallops(ctx, s, k, cusp, r, step, false);
    let i = 0;
    for (let x = x0; x < s.cssW + step; x += step, i++) {
      if (i % 2 || Math.abs(x - s.cssW / 2) < QUIET * u + r) continue;
      scallopArc(ctx, x, cusp + r * 0.3, r * 0.75);
    }
  }
  ctx.lineWidth = Math.max(0.9, u * 0.0032);
  ctx.lineCap = "round";
  ctx.strokeStyle = tone.cloudLine;
  ctx.stroke();
}

/**
 * Everything on the horizon that stands behind the boulevard, back to front: the cloud bank,
 * the hills (while the land shows), and the fair hill with its wheel (which stands out of the
 * cloud floor once that has covered the land). The boulevard, the canal, the garden and the
 * fountain follow in their own modules; the cloud floor over them all comes last.
 */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  const fair = landLine(s);
  if (bankShows(s, top)) cloudBank(ctx, s, tone, fair);
  if (hz - s.u * 0.2 < s.cssH && landShows(s, top)) {
    hills(ctx, s, tone, Math.min(s.cssH, top + s.u * 0.12));
  }
  if (fairShows(s) && top - s.u * 0.06 > fair - FAIR_H * s.u) fairHill(ctx, s, tone);
}

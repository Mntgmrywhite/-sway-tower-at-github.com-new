import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: soft rolling hills in faded lavender (a hazy back
// row and a nearer row with lit slopes, low on the left, where the sun sets), and on the right
// the fair hill, a round mound with the Ferris wheel on its top: its spokes and rim strung with
// bulbs that come on at dusk, its gondolas swinging slowly round in the night. Behind the hills
// a bank of cotton-candy cloud is piled at either side. Above the start a floor of cloud
// gathers below you and covers the lawn and the canal: from then on its puffy top is the land's
// line, which the boulevard and the fair hill stand on (`landLine`), and it sinks with them to
// rest low on the screen, and there it stays for good, a calm sea of cloud with the lit
// boulevard and the wheel turning out of it, for the sun to set into and rise out of on every
// turn of the story's loop (tone.ts). All of it is faded and flat, with no outline, and nothing
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

/** Soft clouds piled along the horizon at either side, behind the hills, in the hour's cloud colors. */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      // On a wider screen the banks keep to its sides.
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
    }
    if (pass === 0) {
      ctx.rect(-1, hz - u * 0.05, Math.max(0, Math.min(cx - u * 0.27, u * 0.23)) + 1, u * 0.1);
      ctx.rect(Math.max(cx + u * 0.24, s.cssW - u * 0.26), hz - u * 0.05, s.cssW, u * 0.1);
    }
    ctx.fill();
  }
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

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 9200) * 0.035, dy: hash(i + 9300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Soft swells further down the floor, in rows repeating every SWELL_SPAN (u, nearer rows wider): x (fraction of a span), depth under the top (u), size (u). */
const SWELL_SPAN = 0.7;
const SWELL_ROWS = 3;
const SWELLS = Array.from({ length: 6 }, (_, i) => ({ x: hash(i + 9500), d: 0.1 + hash(i + 9510) * 0.12, r: 0.026 + hash(i + 9520) * 0.022 }));

/**
 * The cloud floor: a row of cel-shaded puffs along its top, solid below, with soft lit swells
 * further down. It stands still: it runs right behind the tower, where nothing moves. It is
 * drawn after everything on the land, so as it gathers it covers all of it (only the fair hill
 * and its wheel stand out of it); the railing in front stays in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = s.cssW / 2 + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cloudLight : tone.cloud;
    ctx.globalAlpha = pass ? 0.75 : 0.7;
    ctx.beginPath();
    for (let row = 0; row < SWELL_ROWS; row++) {
      const grow = 1 + row * 0.4;
      const span = u * SWELL_SPAN * grow;
      const reps = Math.ceil(s.cssW / 2 / span) + 1;
      for (let k = -reps; k < reps; k++) {
        for (const w of SWELLS) {
          const r = w.r * u * grow;
          const y = top + (w.d + row * 0.2 * grow) * u + u * 0.05;
          if (y - r > s.cssH) continue;
          const x = s.cssW / 2 + (k + w.x + row * 0.37) * span;
          const rx = r * (pass ? 1.2 : 2.2);
          const ry = r * (pass ? 0.22 : 0.5);
          const ex = x - (pass ? r * 0.35 : 0);
          const ey = y - (pass ? r * 0.2 : 0);
          ctx.moveTo(ex + rx, ey);
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI, true);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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

import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, TORCH_FLECK } from "./colors";
import { COLUMN } from "./place";
import { downtown, riverfront } from "./river";
import { cottages } from "./rows";
import { archPath, cloud, fleurPath, LONG_CLOUD, TALL_CLOUD } from "./shapes";
import { square } from "./square";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon, back to front: two fair-weather clouds in the right
// lane of the afternoon sky; the riverfront (river.ts: the far bank with its truss bridge, the
// river with the paddlewheeler, the riverwalk with its live oaks and the streetcar); a tower
// downtown beside the cathedral (more of them further out on a wide screen); the Quarter's
// rooftops stepping back along the horizon (hip roofs and dormers, parapets with urns, paired
// chimneys, a gallery here and there); our own three-spired cathedral straight ahead; and below
// the horizon the cathedral's square (square.ts) and the row of Creole cottages across the
// street (rows.ts), which hide the square at the start and drop away to show it as you climb.
// All of it is faded and flat, with no outline, and plainer behind the tower than at the sides;
// only the lane's things move (the clouds, the riverboat, the streetcar, the gulls, the river's
// glints): nothing moves behind the tower.
// Above the start a floor of cloud gathers below you and covers the city, piling up first over
// the river on the right while the sun goes down on the left: once gathered, its puffy top lies
// over the river and the far bank (the bridge has faded into the haze by then), and only the
// cathedral's spires and the tower downtown stand out of it. Then it sinks with them to rest low
// on the screen, and there it stays for good, for the sun to set into and rise out of on every
// turn of the story's loop (tone.ts). By night the flambeaux of the parade below light the clouds
// from beneath at the sides, and at the loop's dawn a mist lies over them.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Once it has covered the city, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;

/** Where the cloud floor's top edge comes to rest on screen, once it has sunk: things that stand in the cloud sea for good stand on this line. */
export function floorRest(s: Scene): number {
  return s.cssH - s.u * FLOOR_REST;
}
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 90;
/** How far above the horizon the gathered cloud floor lies (u): over the river and its far bank (river.ts), under the bridge's peaks. */
const COVER = 0.31;

/**
 * The line the cloud floor lies along once it has gathered: COVER over the horizon while the
 * city shows; above the clouds it eases down to its rest low on the screen.
 */
function seaLine(s: Scene, lvl: number): number {
  const gathered = s.horizonY - s.u * (COVER - 0.01);
  return gathered + (s.cssH - s.u * FLOOR_REST - gathered) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(17, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/** The city below shows only until the cloud floor covers it (`top` is the floor's top edge). */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < DAY_HIGH && top > s.horizonY - s.u * (COVER - 0.02);
}

/** The line the cathedral and the towers downtown stand on: the horizon while the city shows, then sinking with the cloud floor's line to rest. */
function spireLine(s: Scene): number {
  return seaLine(s, level(s)) + s.u * (COVER - 0.01);
}

/** While the city shows, the river (river.ts) covers everything from this far above the horizon (u) down to its riverwalk, and the rooftops, the cottages and the street the rest. */
const RIVER_SKY = 0.27;
/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/**
 * Where the sky stops: below this the river and the city, or the cloud floor, cover everything
 * (each fill runs on under the next, so no seam between two fills is ever left half painted).
 */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY - s.u * RIVER_SKY : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled at either side behind the cathedral: [X (u from center), height above the line (u), radius (u)]. */
const BANK = [
  [-0.66, 0.15, 0.13],
  [-0.53, 0.2, 0.1],
  [-0.43, 0.14, 0.085],
  [-0.33, 0.11, 0.07],
  [-0.24, 0.07, 0.055],
  [0.2, 0.06, 0.05],
  [0.28, 0.1, 0.065],
  [0.44, 0.2, 0.09],
  [0.55, 0.17, 0.11],
  [0.68, 0.13, 0.13],
] as const;

/** When each side's bank gathers: [side, from level, to level]. */
const BANK_IN = [
  [1, 13, 23],
  [-1, 30, 38],
] as const;

/** Soft clouds piled along the line on one side (`side` -1 left, 1 right), in the hour's cloud colors, a shaded body and lit caps. */
function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number, side: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      if (Math.sign(X) !== side) continue;
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
    }
    if (pass === 0 && side < 0) ctx.rect(-1, hz - u * 0.06, Math.max(0, Math.min(cx - u * 0.24, u * 0.26)) + 1, u * 0.12);
    if (pass === 0 && side > 0) ctx.rect(Math.max(cx + u * 0.2, s.cssW - u * 0.3), hz - u * 0.06, s.cssW, u * 0.12);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the afternoon's clouds

/** Two fair-weather clouds in the right lane: [X (u from center), size (u), how far below the first (u), shape]. */
const DAY_CLOUDS = [
  [0.33, 0.032, 0, LONG_CLOUD],
  [0.435, 0.02, 0.03, TALL_CLOUD],
] as const;

/**
 * Two soft cel-shaded clouds in the right lane over the river, halfway between the title and the
 * bridge, drifting a little to and fro (the left of the sky is the sun's). They sink with the
 * horizon as you climb and melt into the gathering cloud floor.
 */
function dayClouds(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = 1 - smooth(20, 29, level(s));
  if (a <= 0.01) return;
  const u = s.u;
  const y0 = s.horizonY - s.cssH * 0.28 + u * 0.005;
  ctx.globalAlpha = a;
  for (const [X, r, dy, shape] of DAY_CLOUDS) {
    const x = s.cssW / 2 + X * u + Math.sin(s.t * 0.11 + X * 9) * u * 0.008;
    cloud(ctx, shape, x, y0 + dy * u, r * u, tone.cloudShade, tone.cloud, tone.cloudLight);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the rooftops stepping back

/** One house of the far row: its left edge and width (u), its height, its roof, and its chimneys. */
interface Roof {
  x: number;
  w: number;
  h: number;
  /** 0 a flat parapet with urns, 1 a hipped roof with a dormer, 2 a gable end, 3 a gallery front under a parapet. */
  kind: number;
  chimneys: number;
}

/** The far row of rooftops along the horizon, across any screen. */
const FAR_START = -1.6;
const FAR_END = 1.6;
const ROOFS: Roof[] = (() => {
  const out: Roof[] = [];
  let x = FAR_START;
  for (let i = 0; x < FAR_END; i++) {
    const w = Math.min(0.05 + hash(i + 6100) * 0.045, FAR_END - x);
    out.push({ x, w, h: 0.035 + hash(i + 6200) * 0.035, kind: Math.floor(hash(i + 6300) * 4), chimneys: Math.floor(hash(i + 6400) * 3) });
    x += w;
  }
  return out;
})();

/**
 * The far row of the Quarter's rooftops along the horizon, either side of the cathedral: a flat
 * silhouette of parapets with urns, hipped roofs with dormers, gable ends and paired chimneys,
 * the lit slopes and the galleries' lines a lighter tone over it.
 */
function rooftops(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY + 1;
  const half = s.cssW / 2 / u + 0.05;
  ctx.fillStyle = tone.roofFar;
  ctx.beginPath();
  for (const r of ROOFS) {
    if (r.x > half || r.x + r.w < -half) continue;
    const x0 = cx + r.x * u;
    const x1 = cx + (r.x + r.w) * u;
    const top = hz - r.h * u;
    ctx.moveTo(x0, hz);
    if (r.kind === 1) {
      ctx.lineTo(x0, top + u * 0.012);
      ctx.lineTo(x0 + (x1 - x0) * 0.22, top - u * 0.008);
      ctx.lineTo(x1 - (x1 - x0) * 0.22, top - u * 0.008);
      ctx.lineTo(x1, top + u * 0.012);
    } else if (r.kind === 2) {
      ctx.lineTo(x0, top);
      ctx.lineTo((x0 + x1) / 2, top - u * 0.018);
      ctx.lineTo(x1, top);
    } else {
      ctx.lineTo(x0, top);
      ctx.lineTo(x1, top);
    }
    ctx.lineTo(x1, hz);
    ctx.closePath();
    // Chimneys in pairs, and urns on a parapet.
    for (let c = 0; c < r.chimneys; c++) {
      const chx = x0 + (x1 - x0) * (0.2 + c * 0.5);
      ctx.rect(chx, top - u * 0.02, u * 0.007, u * 0.022);
    }
    if (r.kind === 0) for (let c = 1; c < 3; c++) circle(ctx, x0 + ((x1 - x0) * c) / 3, top - u * 0.004, u * 0.0035);
  }
  ctx.fill();
  ctx.fillStyle = tone.roofMidLit;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (const r of ROOFS) {
    if (r.x > half || r.x + r.w < -half || (r.x + r.w > -COLUMN && r.x < COLUMN)) continue;
    const x0 = cx + r.x * u;
    const x1 = cx + (r.x + r.w) * u;
    const top = hz - r.h * u;
    if (r.kind === 1) {
      ctx.moveTo(x0 + u * 0.002, top + u * 0.012);
      ctx.lineTo(x0 + (x1 - x0) * 0.22, top - u * 0.006);
      ctx.lineTo(x0 + (x1 - x0) * 0.32, top - u * 0.006);
      ctx.lineTo(x0 + (x1 - x0) * 0.14, top + u * 0.012);
      ctx.closePath();
    } else if (r.kind === 3) {
      // A gallery's two lines across the front.
      ctx.rect(x0 + u * 0.003, top + r.h * u * 0.32, x1 - x0 - u * 0.006, Math.max(1, u * 0.003));
      ctx.rect(x0 + u * 0.003, top + r.h * u * 0.62, x1 - x0 - u * 0.006, Math.max(1, u * 0.003));
    } else ctx.rect(x0, top, Math.max(1, u * 0.004), r.h * u);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // Windows lit at dusk, a few to a house.
  if (tone.lit > 0.05) {
    ctx.fillStyle = tone.glow;
    ctx.globalAlpha = tone.lit;
    ctx.beginPath();
    for (let i = 0; i < ROOFS.length; i++) {
      const r = ROOFS[i]!;
      if (r.x > half || r.x + r.w < -half) continue;
      const x0 = cx + r.x * u;
      for (let c = 0; c < 3; c++) {
        if (hash(i * 5 + c + 6500) < 0.45) continue;
        ctx.rect(x0 + r.w * u * (0.18 + c * 0.28), hz - r.h * u * (0.4 + (c % 2) * 0.3), u * 0.006, u * 0.008);
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- the cathedral

/** The cathedral's center (u from the screen's center), its half width, and its heights (u above its line): the body, the side spires, the center spire. */
const CATHEDRAL_X = 0;
const CATH_HW = 0.105;
const BODY_H = 0.135;
const SIDE_H = 0.3;
const MID_H = 0.42;

/** Scratch for the spires' places. */
const SPIRE = { x: 0, y: 0 };

/** The tip of the center spire (its cross's foot), for tests of what stands out of the clouds. */
export function spireAt(s: Scene): typeof SPIRE {
  SPIRE.x = s.cssW / 2 + CATHEDRAL_X * s.u;
  SPIRE.y = spireLine(s) - MID_H * s.u;
  return SPIRE;
}

/**
 * The cathedral: a pale stucco façade in three bays under a pediment, round-headed doors and a
 * clock, two stepped side towers and a taller middle one, each crowned with a slate spire and a
 * little gold cross, a fleur-de-lis on the pediment. Our own generic design. By night its doors
 * and clock glow.
 */
export function cathedral(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + CATHEDRAL_X * u;
  const base = spireLine(s);
  if (base - MID_H * u > s.cssH) return;
  const hw = CATH_HW * u;
  const body = BODY_H * u;
  // The towers' bodies and the façade between them.
  const towers = [
    [x - hw * 0.74, u * 0.042, SIDE_H],
    [x + hw * 0.74, u * 0.042, SIDE_H],
    [x, u * 0.056, MID_H],
  ] as const;
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.rect(x - hw, base - body, hw * 2, body);
  // The pediment over the middle bay.
  ctx.moveTo(x - hw * 0.5, base - body);
  ctx.lineTo(x, base - body - u * 0.035);
  ctx.lineTo(x + hw * 0.5, base - body);
  ctx.closePath();
  for (const [tx, w, h] of towers) {
    const th = h * 0.6 * u;
    ctx.rect(tx - w / 2, base - th, w, th);
    ctx.rect(tx - w * 0.4, base - th - u * 0.018, w * 0.8, u * 0.02);
  }
  ctx.fill();
  // Lit left sides.
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.rect(x - hw, base - body, hw * 0.6, body);
  for (const [tx, w, h] of towers) {
    const th = h * 0.6 * u;
    ctx.rect(tx - w / 2, base - th, w * 0.38, th);
  }
  ctx.fill();
  // The spires: slate, lit on the left, with a gold cross each.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  for (const [tx, w, h] of towers) {
    const th = h * 0.6 * u + u * 0.018;
    ctx.moveTo(tx - w * 0.5, base - th);
    ctx.lineTo(tx, base - h * u);
    ctx.lineTo(tx + w * 0.5, base - th);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for (const [tx, w, h] of towers) {
    const th = h * 0.6 * u + u * 0.018;
    ctx.moveTo(tx - w * 0.5, base - th);
    ctx.lineTo(tx, base - h * u);
    ctx.lineTo(tx - w * 0.04, base - th);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // Cornice lines, the doors, the windows in the towers, the clock's face, the fleur on the pediment.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.rect(x - hw, base - body * 0.5, hw * 2, Math.max(1, u * 0.003));
  archPath(ctx, x - u * 0.016, base, u * 0.032, u * 0.062);
  archPath(ctx, x - hw * 0.74 - u * 0.009, base, u * 0.018, u * 0.042);
  archPath(ctx, x + hw * 0.74 - u * 0.009, base, u * 0.018, u * 0.042);
  for (const [tx, , h] of towers) {
    const th = h * 0.6 * u;
    archPath(ctx, tx - u * 0.007, base - th + u * 0.055, u * 0.014, u * 0.03);
  }
  circle(ctx, x, base - body * 0.74, u * 0.018);
  ctx.fill();
  const lit = tone.lit > 0.3;
  ctx.fillStyle = lit ? tone.glow : tone.stoneLit;
  ctx.globalAlpha = lit ? 0.5 + tone.lit * 0.5 : 0.85;
  ctx.beginPath();
  circle(ctx, x, base - body * 0.74, u * 0.012);
  if (lit) archPath(ctx, x - u * 0.011, base, u * 0.022, u * 0.05);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = GOLD.body;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (const [tx, , h] of towers) {
    const ty = base - h * u;
    ctx.rect(tx - u * 0.0015, ty - u * 0.02, u * 0.003, u * 0.02);
    ctx.rect(tx - u * 0.006, ty - u * 0.015, u * 0.012, u * 0.003);
  }
  fleurPath(ctx, x, base - body - u * 0.016, u * 0.018);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the cloud floor

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 7200) * 0.035, dy: hash(i + 7300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Soft swells further down the floor, in rows repeating every SWELL_SPAN (u, nearer rows wider). */
const SWELL_SPAN = 0.7;
const SWELL_ROWS = 3;
const SWELLS = Array.from({ length: 6 }, (_, i) => ({ x: hash(i + 7500), d: 0.1 + hash(i + 7510) * 0.12, r: 0.026 + hash(i + 7520) * 0.022 }));
/** The flambeaux's glow under the clouds: spots along the floor's top at the sides, [X (u from center), reach (u)]. */
const GLOWS = [
  [-0.46, 0.09],
  [-0.33, 0.07],
  [0.3, 0.08],
  [0.44, 0.1],
] as const;

/** Which glow (index) lights a floor puff at screen x, or -1: the spots keep to the screen's sides on every width. */
function glowAt(s: Scene, x: number): number {
  const u = s.u;
  for (let i = 0; i < GLOWS.length; i++) {
    const [X, r] = GLOWS[i]!;
    const gx = X < 0 ? Math.min(s.cssW / 2 + X * u, (X + 0.5) * u) : Math.max(s.cssW / 2 + X * u, s.cssW - (0.5 - X) * u);
    if (Math.abs(x - gx) < r * u) return i;
  }
  return -1;
}
/** The dawn mist: bands lying over the floor, [X (u), depth under the top (u), half width (u), half height (u)]. */
const MISTS = [
  [-0.3, 0.03, 0.26, 0.012],
  [0.25, 0.06, 0.3, 0.014],
  [-0.05, 0.11, 0.4, 0.016],
  [0.4, 0.14, 0.22, 0.01],
] as const;

/**
 * The cloud floor: a row of cel-shaded puffs along its top, solid below, with soft lit swells
 * further down. It stands still: it runs right behind the tower, where nothing moves (the
 * flambeaux's flicker keeps to the sides). It is drawn after everything in the city, the
 * stand and the parade included, so as it gathers it covers all of it (only the cathedral's
 * spires stand out of it); the curb in front stays in front.
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
  // The flambeaux below: by night the puffs at the sides are lit warm from beneath, their caps
  // flickering with the torches (cel colors, never a see-through wash: orange over violet goes
  // muddy). The column stays still.
  if (tone.flambeau > 0.01) {
    for (let pass = 0; pass < 3; pass++) {
      ctx.fillStyle = pass === 0 ? tone.flamCloud : tone.flamLight;
      if (pass === 2) ctx.fillStyle = TORCH_FLECK;
      ctx.beginPath();
      for (let j = -half; j <= half; j++) {
        const x = s.cssW / 2 + j * step;
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        if (Math.abs(x - s.cssW / 2) < (COLUMN + p.r) * u) continue;
        const g = glowAt(s, x);
        if (g < 0) continue;
        const r = p.r * u;
        const y = top + p.dy * u + r * 0.35;
        if (pass === 0) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
        else if (pass === 1) circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
        else {
          // The flicker: a bright fleck on the cap, coming and going with the torch.
          const flick = Math.sin(s.t * 7 + g * 2.1) * Math.sin(s.t * 3.3 + j);
          if (flick > 0.2) circle(ctx, x - r * 0.3, y - r * 0.5, r * 0.18 * flick);
        }
      }
      ctx.globalAlpha = tone.flambeau;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // The dawn mist lying over the floor: still, pale bands.
  if (tone.mist > 0.01) {
    ctx.fillStyle = tone.mistColor;
    ctx.globalAlpha = tone.mist * 0.6;
    ctx.beginPath();
    for (const [X, d, hw, hh] of MISTS) oval(ctx, s.cssW / 2 + X * u, top + d * u, hw * u, hh * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Everything on the horizon and below it to the street, back to front (the cloud floor over it is drawn later: `cloudFloor`). */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  const line = spireLine(s);
  const shows = landShows(s, top);
  dayClouds(ctx, s, tone);
  if (shows) riverfront(ctx, s, tone);
  // The cathedral stands out of the cloud floor once it has covered the city, clouds piled at
  // either side behind it (they gather as the floor does: the afternoon sky over the river is clear).
  if (line - s.u * 0.5 < s.cssH && top - s.u * 0.06 > line - MID_H * s.u) {
    downtown(ctx, s, tone, line);
    // The clouds roll in over the river on the right first, as the sun goes down on the left;
    // the left's pile up once it has set.
    for (const [side, a, b] of BANK_IN) {
      const bank = smooth(a, b, level(s));
      if (bank <= 0) continue;
      ctx.globalAlpha = bank;
      cloudBank(ctx, s, tone, seaLine(s, level(s)), side);
      ctx.globalAlpha = 1;
    }
    if (shows && hz - s.u * 0.1 < s.cssH) rooftops(ctx, s, tone);
    cathedral(ctx, s, tone);
  }
  if (shows && hz - s.u * 0.2 < s.cssH) {
    square(ctx, s, tone);
    cottages(ctx, s, tone);
  }
}

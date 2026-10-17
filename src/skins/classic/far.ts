import { alpha, circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { COLUMN, spread } from "./sky";
import { capPath, cloud, LONG_CLOUD, undersidePath } from "./shapes";
import { DAY_HIGH, smooth, type Tone } from "./tone";
import { tractors } from "./tractors";

// The far layer. At the start you look down from the home island over a storybook countryside
// on the horizon: a blue mountain range with snowy peaks, two rows of rolling hills, a
// patchwork of fields in perspective with hedgerows and groves, a river winding off to the
// left, a village with a church spire, a windmill on a hill, red and green tractors plodding
// over the fields at the sides (tractors.ts), two far balloons rising over the village, and a
// few small clouds low over it all. As you climb, the cloud sea gathers below
// and covers the land; then it sinks away to a floor low on the screen and stays there, a calm
// sea of cloud heaped up at the sides, for the sun to set into and rise out of. Far islands
// float over it: a lighthouse on the left (its lamp lit from dusk to dawn, its beam turning
// slowly out to the side), a great old tree with lamps in its branches, a few faint islets on
// the horizon, and a hamlet with a windmill on the right, whose windows light up at night and
// whose spring pours a cloud waterfall into the sea. Everything here is faded and flat, with no
// outline, and nothing that moves ever crosses the tower's column.

/** The cloud sea's floor once it has sunk: this far above the screen's bottom (u). */
export const SEA_FLOOR = 0.25;
/** By this level the cloud sea has sunk to its floor. */
export const SEA_SETTLED = 62;

/** Where the cloud sea's surface would be ignoring the start (where the far islands float over). */
export function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  const floor = s.cssH - s.u * SEA_FLOOR;
  return horizon + (floor - horizon) * smooth(DAY_HIGH, SEA_SETTLED, lvl);
}

/** How far the far islands reach above the sea line, at most (u): the lighthouse's cap. */
export const FAR_REACH = 0.215;

/** The far islands' skyline: nothing drifting in the lanes may come lower while they show (see drift.ts). */
export function farSkyline(s: Scene, lvl: number): number {
  return seaLine(s, lvl) - s.u * FAR_REACH;
}

/** Where the cloud sea's top edge is: below the screen at the start, gathering up to the horizon, then sinking to its floor. */
export function seaTop(s: Scene, lvl: number): number {
  const k = smooth(16, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.14;
  return below + (seaLine(s, lvl) - below) * k;
}

// ---------------------------------------------------------------- the countryside

/** Mountain peaks on the horizon: x (u from the center), height (u). Low behind the tower, tall at the sides. */
const PEAKS = [
  [-0.86, 0.07],
  [-0.66, 0.1],
  [-0.5, 0.075],
  [-0.38, 0.09],
  [-0.22, 0.05],
  [-0.06, 0.035],
  [0.12, 0.045],
  [0.27, 0.07],
  [0.42, 0.095],
  [0.58, 0.075],
  [0.76, 0.1],
  [0.94, 0.07],
] as const;

/** A mountain range along the horizon, its right faces shaded and its peaks capped with snow. */
function mountains(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY + u * 0.01;
  // Peaks repeat past the list's ends, so a wide screen is covered too.
  const span = 1.9;
  const reach = s.cssW / 2 / u + 0.2;
  const first = Math.floor((-reach + 0.95) / span) - 1;
  const last = Math.ceil((reach + 0.95) / span);
  const each = (draw: (x: number, top: number, w: number) => void): void => {
    for (let r = first; r <= last; r++) {
      for (const [px, ph] of PEAKS) {
        const X = px + r * span;
        if (Math.abs(X) > reach + 0.2) continue;
        draw(cx + X * u, hz - ph * u, ph * u * 1.5);
      }
    }
  };
  ctx.fillStyle = tone.mountain;
  ctx.beginPath();
  each((x, top, w) => {
    ctx.moveTo(x - w, hz);
    ctx.lineTo(x - w * 0.12, top + w * 0.06);
    ctx.quadraticCurveTo(x, top - w * 0.04, x + w * 0.12, top + w * 0.06);
    ctx.lineTo(x + w, hz);
    ctx.closePath();
  });
  ctx.fill();
  ctx.fillStyle = tone.mountainShade;
  ctx.beginPath();
  each((x, top, w) => {
    ctx.moveTo(x + w * 0.04, top + w * 0.02);
    ctx.lineTo(x + w * 0.12, top + w * 0.06);
    ctx.lineTo(x + w, hz);
    ctx.lineTo(x + w * 0.2, hz);
    ctx.closePath();
  });
  ctx.fill();
  ctx.fillStyle = tone.snow;
  ctx.beginPath();
  each((x, top, w) => {
    if (w < u * 0.09) return;
    const d = w * 0.3;
    ctx.moveTo(x - w * 0.12 - d * 0.35, top + w * 0.06 + d * 0.4);
    ctx.lineTo(x - w * 0.12, top + w * 0.06);
    ctx.quadraticCurveTo(x, top - w * 0.04, x + w * 0.12, top + w * 0.06);
    ctx.lineTo(x + w * 0.12 + d * 0.3, top + w * 0.06 + d * 0.36);
    ctx.lineTo(x + w * 0.06, top + w * 0.06 + d * 0.22);
    ctx.lineTo(x - w * 0.02, top + w * 0.06 + d * 0.4);
    ctx.lineTo(x - w * 0.1, top + w * 0.06 + d * 0.24);
    ctx.closePath();
  });
  ctx.fill();
}

const HILL_STEP = 0.035;

/** A row of rolling hills on the horizon, filled down to `bottom`. */
function hills(ctx: Ctx, s: Scene, base: number, height: number, f1: number, f2: number, ph: number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * HILL_STEP) {
    const X = (x - cx) / u;
    // Lower behind the tower, rolling higher toward the sides.
    const side = Math.min(1, Math.abs(X) * 2.2);
    const y = base - u * height * (0.35 + 0.35 * side + 0.3 * Math.sin(X * f1 + ph) + 0.18 * Math.sin(X * f2 + ph * 2.3));
    ctx.lineTo(x, y);
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
  ctx.fill();
}

/** Rows of the patchwork, by depth: the screen y of a row's far edge is horizon + ROW_K u / z. */
const ROWS = [26, 17, 11.5, 8, 5.8, 4.4, 3.4, 2.7, 2.15, 1.75, 1.42, 1.16] as const;
const ROW_K = 0.9;
/** How wide the land spreads with depth: a patch edge at world x X (u) sits at center + X u PERSPECTIVE / z. */
const PERSPECTIVE = 3.2;
/** Patches per row (each side of the center), their widths and colors are hashed once. */
const PATCHES = ROWS.map((_, r) => {
  const edges: number[] = [];
  let X = -(0.25 + hash(r * 7 + 1) * 0.3);
  for (let i = 0; i < 40 && X > -60; i++) {
    edges.unshift(X);
    X -= 0.5 + hash(r * 31 + i * 3 + 2) * 0.9;
  }
  X = edges[edges.length - 1]!;
  for (let i = 0; i < 40 && X < 60; i++) {
    X += 0.5 + hash(r * 37 + i * 5 + 3) * 0.9;
    edges.push(X);
  }
  const colors = edges.map((_, i) => Math.floor(hash(r * 53 + i * 11 + 4) * 5));
  return { edges, colors };
});

/**
 * The fields below the hills: a patchwork of greens, wheat gold and lavender in perspective,
 * one fill per color, then hedgerows along the patch edges with little trees on them.
 */
function fields(ctx: Ctx, s: Scene, tone: Tone, top: number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const rowY = (r: number) => hz + (ROW_K * u) / ROWS[r]!;
  const edgeX = (X: number, z: number) => cx + (X * u * PERSPECTIVE) / z;
  for (let c = 0; c < 5; c++) {
    ctx.beginPath();
    for (let r = 0; r < ROWS.length; r++) {
      const y0 = Math.max(top, rowY(r));
      const y1 = r + 1 < ROWS.length ? rowY(r + 1) : bottom;
      if (y1 <= top || y0 >= bottom) continue;
      const z0 = ROWS[r]!;
      const z1 = r + 1 < ROWS.length ? ROWS[r + 1]! : z0 * 0.7;
      const { edges, colors } = PATCHES[r]!;
      for (let i = 0; i + 1 < edges.length; i++) {
        if (colors[i] !== c) continue;
        const a = edges[i]!;
        const b = edges[i + 1]!;
        if (edgeX(b, z1) < -2 || edgeX(a, z1) > s.cssW + 2) continue;
        ctx.moveTo(edgeX(a, z0), y0);
        ctx.lineTo(edgeX(b, z0), y0);
        ctx.lineTo(edgeX(b, z1), Math.min(y1, bottom));
        ctx.lineTo(edgeX(a, z1), Math.min(y1, bottom));
        ctx.closePath();
      }
    }
    ctx.fillStyle = tone.fields[c]!;
    ctx.fill();
  }
  // Hedgerows: along each row's far edge, and down every few patch edges.
  ctx.beginPath();
  for (let r = 3; r < ROWS.length; r++) {
    const y = rowY(r);
    if (y <= top || y >= bottom) continue;
    if (r % 2) {
      ctx.moveTo(0, y);
      ctx.lineTo(s.cssW, y);
    }
    const z0 = ROWS[r]!;
    const z1 = r + 1 < ROWS.length ? ROWS[r + 1]! : z0 * 0.7;
    const y1 = Math.min(bottom, r + 1 < ROWS.length ? rowY(r + 1) : bottom);
    const { edges } = PATCHES[r]!;
    for (let i = 0; i < edges.length; i++) {
      if (hash(r * 17 + i * 13) < 0.6) continue;
      const x0 = edgeX(edges[i]!, z0);
      if (x0 < -2 || x0 > s.cssW + 2) continue;
      ctx.moveTo(x0, y);
      ctx.lineTo(edgeX(edges[i]!, z1), y1);
    }
  }
  ctx.strokeStyle = tone.hedge;
  ctx.lineWidth = Math.max(1, u * 0.0026);
  ctx.stroke();
  // Little trees dotted along the hedgerows, bigger nearer.
  ctx.fillStyle = tone.groveShade;
  ctx.beginPath();
  for (let r = 3; r < ROWS.length; r += 2) {
    const y = rowY(r);
    if (y <= top || y >= bottom) continue;
    const size = Math.min(u * 0.008, (u * 0.02) / ROWS[r]!);
    for (let i = 0; i < 7; i++) {
      const x = s.cssW * hash(r * 23 + i * 7 + 5);
      if (Math.abs(x - cx) < u * COLUMN) continue;
      circle(ctx, x, y - size * 0.5, size);
    }
  }
  ctx.fill();
}

/** The river: from the horizon left of the tower, winding wider down to the left edge. Its center at depth f (0 far, 1 near). */
function riverX(s: Scene, f: number): number {
  return s.cssW / 2 + s.u * (-0.08 - 0.52 * f * f + 0.07 * Math.sin(f * 7.5));
}

export function river(ctx: Ctx, s: Scene, tone: Tone, top: number, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY + u * 0.02;
  const y = (f: number) => hz + (bottom - hz) * f;
  const w = (f: number) => u * (0.004 + 0.05 * f * f);
  const n = 16;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const yy = Math.max(top, y(f));
    if (i === 0) ctx.moveTo(riverX(s, f) - w(f), yy);
    else ctx.lineTo(riverX(s, f) - w(f), yy);
  }
  for (let i = n; i >= 0; i--) {
    const f = i / n;
    ctx.lineTo(riverX(s, f) + w(f), Math.max(top, y(f)));
  }
  ctx.closePath();
  ctx.fillStyle = tone.river;
  ctx.fill();
  // Still glints on the water.
  ctx.fillStyle = tone.riverLight;
  ctx.beginPath();
  for (const f of [0.38, 0.62, 0.8]) {
    const yy = y(f);
    if (yy < top) continue;
    ctx.rect(riverX(s, f) - w(f) * 0.5, yy, w(f) * 0.7, Math.max(1, u * 0.0035));
  }
  ctx.fill();
}

/**
 * The village down on the right, near the horizon: little whitewashed houses with red roofs
 * around a church with a pointed spire. x and size in u, y in u below the horizon.
 */
const HOUSES = [
  [0.27, 0.045, 0.011],
  [0.3, 0.052, 0.013],
  [0.335, 0.047, 0.012],
  [0.37, 0.055, 0.013],
  [0.405, 0.05, 0.011],
  [0.29, 0.07, 0.014],
  [0.385, 0.075, 0.014],
] as const;
const CHURCH = { x: 0.35, y: 0.068, w: 0.012 } as const;

export function village(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  ctx.fillStyle = tone.village;
  ctx.beginPath();
  for (const [x, y, w] of HOUSES) ctx.rect(cx + (x - w / 2) * u, hz + (y - w * 0.8) * u, w * u, w * 0.8 * u);
  ctx.rect(cx + (CHURCH.x - CHURCH.w / 2) * u, hz + (CHURCH.y - 0.034) * u, CHURCH.w * u, 0.034 * u);
  ctx.rect(cx + (CHURCH.x + 0.002) * u, hz + (CHURCH.y - 0.014) * u, 0.02 * u, 0.014 * u);
  ctx.fill();
  ctx.fillStyle = tone.villageRoof;
  ctx.beginPath();
  for (const [x, y, w] of HOUSES) {
    const top = hz + (y - w * 0.8) * u;
    ctx.moveTo(cx + (x - w * 0.62) * u, top);
    ctx.lineTo(cx + x * u, top - w * 0.6 * u);
    ctx.lineTo(cx + (x + w * 0.62) * u, top);
    ctx.closePath();
  }
  const st = hz + (CHURCH.y - 0.034) * u;
  ctx.moveTo(cx + (CHURCH.x - CHURCH.w * 0.62) * u, st);
  ctx.lineTo(cx + CHURCH.x * u, st - 0.03 * u);
  ctx.lineTo(cx + (CHURCH.x + CHURCH.w * 0.62) * u, st);
  ctx.closePath();
  ctx.rect(cx + (CHURCH.x + 0.001) * u, hz + (CHURCH.y - 0.017) * u, 0.022 * u, 0.004 * u);
  ctx.fill();
}

/** A windmill on a hill at the right, its sails turning slowly. */
const MILL = { x: 0.43, y: 0.115 } as const;

export function windmill(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + MILL.x * u;
  const y = s.horizonY + MILL.y * u;
  millShape(ctx, x, y, u * 0.03, s.t * 0.5, tone.village, tone.villageRoof, tone.groveShade);
}

/**
 * A little windmill standing at (x, y), `h` tall: a tapered whitewashed tower, a red cap, and
 * four lattice sails turning by `turn` radians. Flat colors, for far or mid distance. A grassy
 * knoll under it in `ground`, when given.
 */
export function millShape(ctx: Ctx, x: number, y: number, h: number, turn: number, wall: string, roof: string, ground: string | null): void {
  if (ground) {
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.7, y);
    ctx.ellipse(x, y, h * 0.7, h * 0.16, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.26, y);
  ctx.lineTo(x - h * 0.17, y - h * 0.82);
  ctx.lineTo(x + h * 0.17, y - h * 0.82);
  ctx.lineTo(x + h * 0.26, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.22, y - h * 0.8);
  ctx.quadraticCurveTo(x, y - h * 1.15, x + h * 0.22, y - h * 0.8);
  ctx.closePath();
  ctx.rect(x - h * 0.06, y - h * 0.3, h * 0.12, h * 0.3);
  ctx.fill();
  // Sails: four lattice blades round the hub.
  const hx = x;
  const hy = y - h * 0.86;
  const len = h * 0.95;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const w = h * 0.12;
    // A blade: from near the hub out to len, offset to one side of its arm.
    const p = (along: number, side: number) => [hx + c * along - sn * side, hy + sn * along + c * side] as const;
    const [ax, ay] = p(len * 0.18, 0);
    const [bx, by] = p(len, 0);
    const [ex, ey] = p(len, w);
    const [dx, dy] = p(len * 0.22, w);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.lineTo(dx, dy);
    ctx.closePath();
  }
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a) * len, hy + Math.sin(a) * len);
  }
  ctx.strokeStyle = roof;
  ctx.lineWidth = Math.max(1, h * 0.06);
  ctx.stroke();
  ctx.fillStyle = roof;
  ctx.beginPath();
  circle(ctx, hx, hy, h * 0.07);
  ctx.fill();
}

/**
 * Groves of treetops on the land: x (u from the center), depth below the horizon (u), size
 * (u). Smaller than the island's own tree, so they read as far below. The left ones keep
 * clear of the kite's string, which runs up from the island's edge.
 */
const GROVES = [
  { x: -0.44, d: 0.05, r: 0.012 },
  { x: -0.31, d: 0.035, r: 0.01 },
  { x: -0.45, d: 0.2, r: 0.017 },
  { x: 0.3, d: 0.115, r: 0.012 },
  { x: 0.41, d: 0.21, r: 0.018 },
] as const;

export function groves(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  // Shade first, then the lit crowns shifted up, three treetops to a grove.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.grove : tone.groveShade;
    ctx.beginPath();
    for (const g of GROVES) {
      const x = cx + g.x * u;
      const y = s.horizonY + g.d * u;
      const r = g.r * u;
      const up = pass ? r * 0.18 : 0;
      const k = pass ? 0.86 : 1;
      circle(ctx, x - r * 0.9, y - up, r * 0.8 * k);
      circle(ctx, x, y - r * 0.4 - up, r * k);
      circle(ctx, x + r * 0.95, y - up, r * 0.75 * k);
    }
    ctx.fill();
  }
}

/** Two small clouds low over the land, either side of the island: you are high above it. */
const LOW_CLOUDS = [
  { x: -0.435, d: 0.37, r: 0.028 },
  { x: 0.318, d: 0.5, r: 0.026 },
] as const;

export function lowClouds(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  for (const c of LOW_CLOUDS) {
    const x = s.cssW / 2 + c.x * u + Math.sin(s.t * 0.15 + c.x * 7) * u * 0.008;
    cloud(ctx, LONG_CLOUD, x, s.horizonY + c.d * u, c.r * u, tone.cloudShade, tone.cloud, tone.cloudLight);
  }
}

/** Two far balloons rising over the village: x (u), height over the horizon (u), size (u). */
const FAR_BALLOONS = [
  [0.3, 0.13, 0.014],
  [0.405, 0.075, 0.011],
] as const;

/** Little balloons far off over the village, bobbing slowly: an envelope, a gore and a basket, flat. */
export function farBalloons(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  for (let i = 0; i < FAR_BALLOONS.length; i++) {
    const [bx, h, size] = FAR_BALLOONS[i]!;
    const r = size * u;
    const x = s.cssW / 2 + bx * u;
    const y = s.horizonY - h * u + Math.sin(s.t * 0.5 + i * 2) * u * 0.004;
    ctx.fillStyle = i ? tone.villageRoof : tone.farBalloon;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(x + r * 0.3, y + r * 1.25);
    ctx.lineTo(x - r * 0.3, y + r * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.village;
    ctx.beginPath();
    oval(ctx, x, y + r * 0.1, r * 0.36, r * 0.98);
    ctx.rect(x - r * 0.25, y + r * 1.45, r * 0.5, r * 0.4);
    ctx.fill();
  }
}

/** Everything on the land below, back to front, filled down to `bottom`. */
function countryside(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  mountains(ctx, s, tone);
  ctx.fillStyle = tone.hillFar;
  hills(ctx, s, hz + u * 0.012, 0.06, 4.2, 9.5, 1.1, bottom);
  ctx.fillStyle = tone.hillNear;
  hills(ctx, s, hz + u * 0.03, 0.03, 6.5, 13, 3.4, bottom);
  fields(ctx, s, tone, hz + u * 0.03, bottom);
  river(ctx, s, tone, hz + u * 0.034, bottom);
  village(ctx, s, tone);
  windmill(ctx, s, tone);
  groves(ctx, s, tone);
  tractors(ctx, s, tone);
  lowClouds(ctx, s, tone);
  farBalloons(ctx, s, tone);
}

// ---------------------------------------------------------------- cloud sea

/** Puffs along the cloud sea's top edge, repeating every SEA_SPAN of them. */
const SEA_SPAN = 9;
const SEA = Array.from({ length: SEA_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 1200) * 0.035, dy: hash(i + 1300) * 0.025 }));
/** Soft swells lower down the sea: x (fraction of a span), depth (u), size (u). */
const SWELLS = Array.from({ length: 7 }, (_, i) => ({ x: hash(i + 1400), d: 0.07 + hash(i + 1410) * 0.12, r: 0.035 + hash(i + 1420) * 0.03 }));
/** Rows of swells nearer still: depth below the sea's top (u) and how much bigger and further apart they are. */
const NEAR_ROWS = [0.27, 0.38, 0.52, 0.7, 0.93, 1.22, 1.6].map((d, i) => ({ d, g: 1 + 0.35 * i }));

/** One swell centered at (x, y), size r, as its own subpath: the shaded mound (pass 0) or its lit top (pass 1). */
function swell(ctx: Ctx, x: number, y: number, r: number, pass: number): void {
  const ex = x - (pass ? r * 0.1 : 0);
  const ey = y - (pass ? r * 0.12 : 0);
  const rx = r * 2.2 * (pass ? 0.86 : 1);
  ctx.moveTo(ex - rx, ey);
  ctx.ellipse(ex, ey, rx, r * 0.5, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
}

/**
 * The cloud sea: a row of cel-shaded puffs along its top, solid below, with soft swells
 * further down and, while the sun is low, a warm path of light under it. It holds still:
 * it is far below, and it lies behind the tower.
 */
function sea(ctx: Ctx, s: Scene, tone: Tone, top: number, sunX: number): void {
  const u = s.u;
  const step = u * 0.085;
  // Centered, so both edges match at any width.
  const cx = s.cssW / 2;
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -n; j <= n; j++) {
      const x = cx + j * step;
      const p = SEA[((j % SEA_SPAN) + SEA_SPAN) % SEA_SPAN]!;
      // Piled up toward the screen's sides, low behind the tower.
      const side = Math.min(1, Math.abs(x - cx) / (s.cssW / 2));
      const pile = side * side * side * side;
      const r = p.r * u * (1 + 0.7 * pile);
      const y = top + p.dy * u + r * 0.35 - pile * u * 0.06;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(-1, top + u * 0.05, s.cssW + 2, s.cssH - top);
    if (pass === 1) ctx.rect(-1, top + u * 0.035, s.cssW + 2, u * 0.035);
    ctx.fill();
  }
  // Swells: low lit mounds lower down, a shade first and the lit top over it. Further down the
  // sea comes nearer: rows of broader swells, further apart, down past the screen's bottom.
  const span = u * 0.7;
  const reps = Math.ceil(s.cssW / span) + 1;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cloud : tone.cloudShade;
    ctx.beginPath();
    for (let k = -1; k < reps; k++) {
      for (const w of SWELLS) swell(ctx, cx - span / 2 + (k + w.x) * span, top + w.d * u + u * 0.05, w.r * u, pass);
    }
    for (let row = 0; row < NEAR_ROWS.length; row++) {
      const { d, g } = NEAR_ROWS[row]!;
      const y = top + d * u;
      if (y - u * 0.05 * g > s.cssH) break;
      const step = span * g;
      const n = Math.ceil(s.cssW / 2 / step) + 1;
      for (let k = -n; k <= n; k++) {
        for (let i = 0; i < 2; i++) {
          const h = hash(row * 31 + ((k % 9) + 9) * 7 + i * 3 + 1500);
          swell(ctx, cx + (k + i * 0.5 + h * 0.3) * step, y + (h - 0.5) * u * 0.03 * g, u * (0.032 + 0.018 * h) * g, pass);
        }
      }
    }
    ctx.fill();
  }
  // The sun's path on the sea while it is low.
  const glow = tone.sunSet > 0 && tone.sunSet < 1 ? Math.sin(tone.sunSet * Math.PI) : 0;
  if (glow > 0.02) {
    ctx.fillStyle = tone.sunGlow;
    ctx.globalAlpha = glow * 0.55;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = top + u * (0.06 + i * 0.035);
      const w = u * (0.05 + i * 0.02) * (1 - i * 0.12);
      oval(ctx, sunX, y, w, u * 0.006);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- far islands

/** The far islands: x (u from the center), cap half width (u), how high the cap floats over the sea line (u). */
export const LIGHTHOUSE_ISLE = { x: -0.41, hw: 0.055, lift: 0.12 } as const;
export const HAMLET_ISLE = { x: 0.385, hw: 0.08, lift: 0.11 } as const;

/** A far island's body: underside in two bands and a grass cap, flat. */
function farBody(ctx: Ctx, tone: Tone, x: number, y: number, hw: number, m: number): void {
  const capH = hw * 0.22;
  const top = y + capH * 0.6;
  const d = hw * 1.15;
  undersidePath(ctx, x, top, hw * 0.96, d, m);
  ctx.fillStyle = tone.farBands[1];
  ctx.fill();
  undersidePath(ctx, x, top, hw * 0.96, d * 0.45, m);
  ctx.fillStyle = tone.farBands[0];
  ctx.fill();
  capPath(ctx, x, y, hw, capH, 5);
  ctx.fillStyle = tone.farGrass;
  ctx.fill();
}

/** Tiny islands far out over the cloud sea: x (u from the center), half width (u), lift over the sea line (u). */
const DISTANT = [
  [-0.115, 0.014, 0.075],
  [0.1, 0.018, 0.055],
  [0.23, 0.026, 0.07],
] as const;

/** Faint silhouettes of far-off islands on the horizon, one flat color, holding still. */
function distantIsles(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  ctx.fillStyle = tone.far;
  for (let i = 0; i < DISTANT.length; i++) {
    const [dx, hw, lift] = DISTANT[i]!;
    const x = s.cssW / 2 + dx * u * spread(s);
    const y = line - lift * u;
    undersidePath(ctx, x, y + hw * u * 0.2, hw * u, hw * u * 1.1, i % 2 ? 1 : -1);
    ctx.fill();
    capPath(ctx, x, y, hw * u * 1.05, hw * u * 0.3, 3);
    ctx.fill();
    if (i === 2) {
      // A little tree on the biggest one.
      ctx.beginPath();
      circle(ctx, x + hw * u * 0.4, y - hw * u * 0.35, hw * u * 0.32);
      ctx.fill();
    }
  }
}

/** The great tree's island, far out on the left of the tower: center (u), cap half width (u), lift over the sea line (u). */
export const GREAT_TREE = { x: -0.215, hw: 0.04, lift: 0.07 } as const;
/** Its crown: puffs as [dx, dy, r] in units of the island's half width, from the trunk's top. */
const CROWN = [
  [-0.95, 0.15, 0.62],
  [-0.45, -0.38, 0.78],
  [0.25, -0.55, 0.85],
  [0.9, -0.05, 0.62],
  [0.1, 0.12, 0.7],
] as const;

/**
 * A great old tree on a far island: a broad crown of puffs over a thick trunk, all faded and
 * flat, a lighter cap of leaves on top; from dusk to dawn little lamps glow in its branches.
 * It holds still (it stands partly behind the tower).
 */
function greatTree(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const g = GREAT_TREE;
  const x = s.cssW / 2 + g.x * u * spread(s);
  const y = line - g.lift * u;
  const hw = g.hw * u;
  farBody(ctx, tone, x, y, hw, 1);
  const top = y - hw * 1.05;
  ctx.fillStyle = tone.farBands[0];
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.26, y);
  ctx.quadraticCurveTo(x - hw * 0.12, (y + top) / 2, x - hw * 0.2, top);
  ctx.lineTo(x + hw * 0.2, top);
  ctx.quadraticCurveTo(x + hw * 0.12, (y + top) / 2, x + hw * 0.26, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.farGrass;
  ctx.beginPath();
  for (const [dx, dy, r] of CROWN) circle(ctx, x + dx * hw, top + dy * hw, r * hw);
  ctx.fill();
  ctx.fillStyle = tone.farLeaf;
  ctx.beginPath();
  for (const [dx, dy, r] of CROWN) {
    if (r < 0.7) continue;
    circle(ctx, x + (dx - 0.12) * hw, top + (dy - 0.22) * hw, r * hw * 0.62);
  }
  ctx.fill();
  if (tone.lit > 0.02) {
    ctx.fillStyle = tone.window;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) circle(ctx, x + (hash(i + 2200) - 0.5) * hw * 2.2, top + (hash(i + 2210) - 0.6) * hw * 1.2, u * 0.0028);
    ctx.fill();
  }
}

/** The lighthouse island: a striped tower with a lamp room, and the keeper's cottage. */
function lighthouseIsle(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const i = LIGHTHOUSE_ISLE;
  const x = s.cssW / 2 + i.x * u * spread(s);
  const y = line - i.lift * u;
  const hw = i.hw * u;
  farBody(ctx, tone, x, y, hw, -1);
  // The keeper's cottage, right of the tower.
  const cx = x + hw * 0.42;
  const cw = hw * 0.42;
  const ch = hw * 0.3;
  ctx.fillStyle = tone.farWall;
  ctx.fillRect(cx - cw / 2, y - ch, cw, ch);
  ctx.fillStyle = tone.farRoof;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.62, y - ch);
  ctx.lineTo(cx, y - ch - cw * 0.5);
  ctx.lineTo(cx + cw * 0.62, y - ch);
  ctx.closePath();
  ctx.fill();
  // The tower: tapered, with two red bands, a gallery and the lamp room under a cap.
  const tx = x - hw * 0.18;
  const tb = hw * 0.2;
  const tt = hw * 0.13;
  const th = hw * 1.25;
  ctx.fillStyle = tone.farWall;
  ctx.beginPath();
  ctx.moveTo(tx - tb, y);
  ctx.lineTo(tx - tt, y - th);
  ctx.lineTo(tx + tt, y - th);
  ctx.lineTo(tx + tb, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.farRoof;
  ctx.beginPath();
  for (const b of [0.22, 0.58]) {
    const y0 = y - th * b;
    const y1 = y - th * (b + 0.16);
    const w0 = tb + (tt - tb) * b;
    const w1 = tb + (tt - tb) * (b + 0.16);
    ctx.moveTo(tx - w0, y0);
    ctx.lineTo(tx - w1, y1);
    ctx.lineTo(tx + w1, y1);
    ctx.lineTo(tx + w0, y0);
    ctx.closePath();
  }
  // Gallery and cap.
  ctx.rect(tx - tt * 1.5, y - th - hw * 0.03, tt * 3, hw * 0.05);
  const lampY = y - th - hw * 0.13;
  ctx.moveTo(tx - tt * 1.15, lampY - hw * 0.07);
  ctx.lineTo(tx, lampY - hw * 0.22);
  ctx.lineTo(tx + tt * 1.15, lampY - hw * 0.07);
  ctx.closePath();
  ctx.fill();
  // The lamp room: dark glass by day, lit from dusk to dawn.
  ctx.fillStyle = tone.window;
  ctx.fillRect(tx - tt * 0.85, lampY - hw * 0.07, tt * 1.7, hw * 0.1);
  if (tone.lit > 0.02) {
    // The beam: a flat wedge turning slowly out to the left, away from the tower.
    const a = Math.PI + 0.12 + Math.sin(s.t * 0.4) * 0.22;
    const reach = Math.min(u * 0.5, x - 1);
    const spread = 0.09;
    ctx.fillStyle = alpha("#fff2b0", 0.28 * tone.lit);
    ctx.beginPath();
    ctx.moveTo(tx, lampY - hw * 0.02);
    ctx.lineTo(tx + Math.cos(a - spread) * reach, lampY + Math.sin(a - spread) * reach);
    ctx.lineTo(tx + Math.cos(a + spread) * reach, lampY + Math.sin(a + spread) * reach);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = alpha("#fff2b0", 0.35 * tone.lit);
    ctx.beginPath();
    circle(ctx, tx, lampY - hw * 0.02, hw * 0.16);
    ctx.fill();
  }
}

/** The hamlet: three cottages and a windmill on a broad island, and a spring pouring a cloud waterfall off its outer edge. */
const COTTAGES = [
  [-0.5, 0.34, 0.3],
  [-0.12, 0.42, 0.36],
  [0.62, 0.3, 0.26],
] as const;

function hamletIsle(ctx: Ctx, s: Scene, tone: Tone, line: number, sea: number): void {
  const u = s.u;
  const i = HAMLET_ISLE;
  const x = s.cssW / 2 + i.x * u * spread(s);
  const y = line - i.lift * u;
  const hw = i.hw * u;
  // The waterfall pours off the outer (right) edge down into the cloud sea.
  const fx = x + hw * 0.78;
  const fw = hw * 0.16;
  const bottom = Math.max(sea + u * 0.05, y + hw * 0.4);
  ctx.fillStyle = tone.cloud;
  ctx.beginPath();
  ctx.moveTo(fx - fw / 2, y + hw * 0.1);
  ctx.lineTo(fx + fw / 2, y + hw * 0.1);
  ctx.quadraticCurveTo(fx + fw * 0.6, (y + bottom) / 2, fx + fw, bottom);
  ctx.lineTo(fx - fw, bottom);
  ctx.quadraticCurveTo(fx - fw * 0.6, (y + bottom) / 2, fx - fw / 2, y + hw * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.cloudLight;
  const len = bottom - y;
  const base = ctx.globalAlpha;
  for (let k = 0; k < 2; k++) {
    const f = (s.t * 0.22 + k * 0.5) % 1;
    ctx.globalAlpha = base * Math.sin(f * Math.PI);
    ctx.fillRect(fx - fw * 0.15 + (k - 0.5) * fw * 0.4, y + hw * 0.12 + len * f * 0.75, fw * 0.25, len * 0.16);
  }
  ctx.globalAlpha = base;
  farBody(ctx, tone, x, y, hw, 1);
  // The windmill at the left end.
  millShape(ctx, x - hw * 0.8, y + hw * 0.02, hw * 0.48, s.t * 0.45 + 1, tone.farWall, tone.farRoof, null);
  // Cottages: walls, roofs, and a window each, lit at night.
  ctx.fillStyle = tone.farWall;
  ctx.beginPath();
  for (const [cx, w, h] of COTTAGES) ctx.rect(x + (cx - w / 2) * hw, y - h * hw, w * hw, h * hw);
  ctx.fill();
  ctx.fillStyle = tone.farRoof;
  ctx.beginPath();
  for (const [cx, w, h] of COTTAGES) {
    const top = y - h * hw;
    ctx.moveTo(x + (cx - w * 0.64) * hw, top);
    ctx.lineTo(x + cx * hw, top - w * 0.5 * hw);
    ctx.lineTo(x + (cx + w * 0.64) * hw, top);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (const [cx, w, h] of COTTAGES) ctx.rect(x + (cx - w * 0.14) * hw, y - h * hw * 0.68, w * 0.28 * hw, h * 0.32 * hw);
  ctx.fill();
}

/** Where the sky stops: below this the countryside, or the cloud sea, cover everything. */
export function skyBottom(s: Scene, seaY: number, lvl: number): number {
  return landShows(s, seaY, lvl) ? s.horizonY : seaY + s.u * 0.06;
}

/**
 * The land below shows only until the cloud sea has gathered over it. After that the sea is
 * the horizon: as it sinks to its floor, the sky comes down after it.
 */
function landShows(s: Scene, seaY: number, lvl: number): boolean {
  return lvl < DAY_HIGH && seaY > s.horizonY + s.u * 0.02 && s.horizonY < s.cssH;
}

/** Everything on the horizon, back to front: the land, the far islands, the cloud sea. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, lvl: number, seaY: number, sunX: number): void {
  const line = seaLine(s, lvl);
  if (landShows(s, seaY, lvl)) countryside(ctx, s, tone, Math.min(s.cssH + 1, seaY + s.u * 0.06));
  if (tone.farIsles > 0.01) {
    ctx.globalAlpha = tone.farIsles;
    distantIsles(ctx, s, tone, line);
    greatTree(ctx, s, tone, line);
    lighthouseIsle(ctx, s, tone, line);
    hamletIsle(ctx, s, tone, line, seaY);
    ctx.globalAlpha = 1;
  }
  if (seaY < s.cssH + s.u * 0.1) sea(ctx, s, tone, seaY, sunX);
}

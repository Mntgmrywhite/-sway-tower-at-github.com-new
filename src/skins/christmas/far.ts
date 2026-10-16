import { alpha, circle, hash, neonStroke, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, ICE, LAMP, NIGHT, PINE, SNOW, WHITE } from "./colors";
import { drawBulbs, firOutline, firPath, starPath, thinRim } from "./shapes";

// On the horizon: a low line of snowy firs, taller firs framing both edges, and a little
// village in between — cottages with lit windows, a church spire, and strings of colored
// lights draped from roof to roof. Everything stands on horizonY.
// Village positions are in u from the screen center, framing firs in u from each screen
// edge (so they are never cut off); heights in u.

const FIR = firOutline(
  [
    { top: -1, bottom: -0.6, half: 0.17 },
    { top: -0.74, bottom: -0.34, half: 0.24 },
    { top: -0.47, bottom: -0.07, half: 0.31 },
  ],
  0.04,
);

/** Snow ledges on the lower tiers of FIR: [tier top, tier half width]. */
const FIR_LEDGES = [
  [-0.74, 0.24],
  [-0.47, 0.31],
] as const;

/**
 * A cluster of framing firs, measured inward from a screen edge: [distance to the trunk, height]
 * in u. The two shorter firs are drawn first, behind the village; the tall one after it, in
 * front. Firs in the same pass never overlap, so one fir's snow never lands on another, and
 * every fir keeps its whole outline (and glow) on screen.
 */
const CLUSTER_BACK = [
  [0.14, 0.155],
  [0.215, 0.1],
] as const;
const CLUSTER_FRONT = [[0.08, 0.22]] as const;
/** Width of one cluster in u; wide screens repeat clusters inward toward the village. */
const CLUSTER_W = 0.25;
/** Half width of the village in u (clusters may tuck a little behind its end houses). */
const VILLAGE_HALF = 0.3;

interface House {
  x: number;
  w: number;
  h: number;
  roof: number;
  chimney: number; // -1 left slope, 1 right slope, 0 none
}

const HOUSES: House[] = [
  { x: -0.285, w: 0.085, h: 0.045, roof: 0.04, chimney: 1 },
  { x: -0.17, w: 0.1, h: 0.052, roof: 0.046, chimney: -1 },
  { x: -0.055, w: 0.075, h: 0.04, roof: 0.036, chimney: 0 },
  { x: 0.06, w: 0.095, h: 0.056, roof: 0.046, chimney: 1 },
  { x: 0.165, w: 0.07, h: 0.04, roof: 0.034, chimney: 0 },
];
const EAVE = 0.012; // roof overhang

const CHURCH = { x: 0.27, w: 0.075, h: 0.055, roof: 0.04, towerW: 0.032, towerH: 0.105, spire: 0.08 };

/**
 * Strings of lights draped from roof to roof and on to the church tower, precomputed in u
 * relative to (center, horizon): WIRES holds each sagging curve as six numbers (start,
 * control, end) and BULBS the x, y of every bulb along them.
 */
const { WIRES, BULBS } = (() => {
  const wires: number[] = [];
  const bulbs: number[] = [];
  const anchors: [number, number][] = HOUSES.map((h) => [h.x, -(h.h + h.roof)]);
  anchors.push([CHURCH.x - CHURCH.towerW / 2, -(CHURCH.towerH * 0.62)]);
  for (let i = 0; i + 1 < anchors.length; i++) {
    const [ax, ay] = anchors[i]!;
    const [bx, by] = anchors[i + 1]!;
    const cx = (ax + bx) / 2;
    const cy = Math.max(ay, by) + 0.028 + 0.012 * hash(i + 40);
    wires.push(ax, ay, cx, cy, bx, by);
    const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 0.017));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      bulbs.push(
        (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx,
        (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by,
      );
    }
  }
  return { WIRES: wires, BULBS: bulbs };
})();

/** Reused screen-space buffer for bulbs. */
const bulbBuf: number[] = [];

/** Height of back-row fir i (taller toward the screen edges). */
function backFirHeight(s: Scene, i: number, step: number): number {
  const side = Math.min(1, Math.abs(i * step) / (s.u * 0.5));
  return s.u * (0.028 + 0.034 * hash(i + 700)) * (1 + 0.5 * side * side);
}

/** A low, dense line of distant firs across the whole horizon, tipped with snow. */
function backForest(ctx: Ctx, s: Scene, hy: number): void {
  const cx = s.cssW / 2;
  const step = s.u * 0.026;
  const n = Math.ceil(cx / step) + 2;
  ctx.beginPath();
  ctx.moveTo(-4, hy);
  let prev = backFirHeight(s, -n - 1, step);
  for (let i = -n; i <= n; i++) {
    const h = backFirHeight(s, i, step);
    const x = cx + i * step + (hash(i + 900) - 0.5) * step * 0.4;
    ctx.lineTo(x - step * 0.5, hy - Math.min(prev, h) * 0.18);
    ctx.lineTo(x - h * 0.14, hy - h * 0.55);
    ctx.lineTo(x - h * 0.07, hy - h * 0.6);
    ctx.lineTo(x, hy - h);
    ctx.lineTo(x + h * 0.07, hy - h * 0.6);
    ctx.lineTo(x + h * 0.14, hy - h * 0.55);
    prev = h;
  }
  ctx.lineTo(s.cssW + 4, hy);
  ctx.closePath();
  ctx.fillStyle = "#0a1636";
  ctx.fill();
  ctx.strokeStyle = alpha(GREEN, 0.4);
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.stroke();

  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    const h = backFirHeight(s, i, step);
    const x = cx + i * step + (hash(i + 900) - 0.5) * step * 0.4;
    ctx.moveTo(x, hy - h);
    ctx.lineTo(x + h * 0.08, hy - h * 0.72);
    ctx.lineTo(x - h * 0.08, hy - h * 0.72);
    ctx.closePath();
  }
  ctx.fillStyle = alpha(SNOW, 0.7);
  ctx.fill();
}

/** Snow on a framing fir standing at (x, hy), `h` tall: a cap on top and a ledge on each lower tier. */
function firSnow(ctx: Ctx, x: number, hy: number, h: number): void {
  const y = hy - h;
  ctx.moveTo(x, y - h * 0.01);
  ctx.lineTo(x + h * 0.09, y + h * 0.2);
  ctx.lineTo(x + h * 0.03, y + h * 0.17);
  ctx.lineTo(x - h * 0.02, y + h * 0.22);
  ctx.lineTo(x - h * 0.09, y + h * 0.2);
  ctx.closePath();
  for (const [top, half] of FIR_LEDGES) {
    // Just under the notch above, along each outer slope.
    const y0 = hy + (top + 0.12) * h;
    const x0 = half * 0.3 * h;
    const x1 = half * 0.8 * h;
    const y1 = hy + (top + 0.32) * h;
    for (let dir = -1; dir <= 1; dir += 2) {
      ctx.moveTo(x + dir * x0, y0);
      ctx.lineTo(x + dir * x1, y1);
      ctx.lineTo(x + dir * x1 * 0.92, y1 + h * 0.045);
      ctx.lineTo(x + dir * x0 * 0.9, y0 + h * 0.05);
      ctx.closePath();
    }
  }
}

/** How many fir clusters fit on each side: one at the edge, more inward on wide screens. */
function clusterCount(s: Scene): number {
  const room = s.cssW / 2 / s.u - VILLAGE_HALF;
  return Math.max(1, Math.floor(room / CLUSTER_W));
}

/**
 * One pass of snowy framing firs (a cluster's back or front firs) mirrored on both edges:
 * silhouettes with a green rim, then their snow caps and ledges.
 */
function firs(ctx: Ctx, s: Scene, hy: number, cluster: readonly (readonly [number, number])[]): void {
  const n = clusterCount(s);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    // Inner clusters vary a little in height so the repeats don't read as copies.
    const scale = k === 0 ? 1 : 0.85 + 0.2 * hash(k + 300);
    for (const [d, h] of cluster) {
      const off = (k * CLUSTER_W + d) * s.u;
      firPath(ctx, FIR, off, hy, h * scale * s.u);
      firPath(ctx, FIR, s.cssW - off, hy, h * scale * s.u);
    }
  }
  thinRim(ctx, GREEN, Math.max(1, s.u * 0.0035));
  ctx.fillStyle = PINE;
  ctx.fill();

  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const scale = k === 0 ? 1 : 0.85 + 0.2 * hash(k + 300);
    for (const [d, h] of cluster) {
      const off = (k * CLUSTER_W + d) * s.u;
      firSnow(ctx, off, hy, h * scale * s.u);
      firSnow(ctx, s.cssW - off, hy, h * scale * s.u);
    }
  }
  ctx.fillStyle = SNOW;
  ctx.fill();
}

function housePath(ctx: Ctx, x: number, hy: number, w: number, h: number, roof: number, eave: number): void {
  ctx.moveTo(x - w / 2, hy);
  ctx.lineTo(x - w / 2, hy - h);
  ctx.lineTo(x - w / 2 - eave, hy - h);
  ctx.lineTo(x, hy - h - roof);
  ctx.lineTo(x + w / 2 + eave, hy - h);
  ctx.lineTo(x + w / 2, hy - h);
  ctx.lineTo(x + w / 2, hy);
  ctx.closePath();
}

/** Snow lying on a pitched roof, with a few drips along the eaves. */
function roofSnow(ctx: Ctx, x: number, hy: number, w: number, h: number, roof: number, eave: number, t: number): void {
  const l = x - w / 2 - eave * 1.3;
  const r = x + w / 2 + eave * 1.3;
  const y = hy - h;
  const top = y - roof - t * 0.9;
  ctx.moveTo(l, y + t * 0.1);
  ctx.lineTo(x, top);
  ctx.lineTo(r, y + t * 0.1);
  ctx.lineTo(r - t * 0.3, y + t * 0.7);
  ctx.lineTo(x + (r - x) * 0.55, y - roof * 0.45 + t * 1.1);
  ctx.lineTo(x + (r - x) * 0.4, y - roof * 0.6 + t * 1.6);
  ctx.lineTo(x + (r - x) * 0.25, y - roof * 0.75 + t * 0.9);
  ctx.lineTo(x, top + t * 1.4);
  ctx.lineTo(x - (x - l) * 0.3, y - roof * 0.7 + t * 1.5);
  ctx.lineTo(x - (x - l) * 0.5, y - roof * 0.5 + t * 0.9);
  ctx.lineTo(l + t * 0.3, y + t * 0.7);
  ctx.closePath();
}

/** Cottages and a church with lit windows, snowy roofs and strings of lights. */
function village(ctx: Ctx, s: Scene, hy: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const eave = EAVE * u;
  const c = CHURCH;
  const chx = cx + c.x * u;
  const tx = chx - c.w * 0.5 * u + c.towerW * 0.5 * u; // tower stands at the nave's left end
  const towerTop = hy - c.towerH * u;

  // Silhouettes: cottages (ice rim), church (gold rim).
  ctx.beginPath();
  for (const h of HOUSES) {
    const x = cx + h.x * u;
    housePath(ctx, x, hy, h.w * u, h.h * u, h.roof * u, eave);
    if (h.chimney) {
      const chimX = x + h.chimney * h.w * 0.25 * u;
      ctx.rect(chimX - 0.008 * u, hy - (h.h + h.roof * 0.95) * u, 0.016 * u, h.roof * 0.6 * u);
    }
  }
  thinRim(ctx, ICE, Math.max(1, u * 0.0035));
  ctx.fillStyle = NIGHT;
  ctx.fill();

  ctx.beginPath();
  housePath(ctx, chx + c.towerW * 0.4 * u, hy, (c.w - c.towerW * 0.2) * u, c.h * u, c.roof * u, eave);
  ctx.rect(tx - c.towerW * 0.5 * u, towerTop, c.towerW * u, c.towerH * u);
  ctx.moveTo(tx - c.towerW * 0.62 * u, towerTop);
  ctx.lineTo(tx, towerTop - c.spire * u);
  ctx.lineTo(tx + c.towerW * 0.62 * u, towerTop);
  ctx.closePath();
  thinRim(ctx, GOLD, Math.max(1, u * 0.004));
  ctx.fillStyle = NIGHT;
  ctx.fill();

  // Snow on the roofs
  const snowT = u * 0.008;
  ctx.beginPath();
  for (const h of HOUSES) roofSnow(ctx, cx + h.x * u, hy, h.w * u, h.h * u, h.roof * u, eave, snowT);
  roofSnow(ctx, chx + c.towerW * 0.4 * u, hy, (c.w - c.towerW * 0.2) * u, c.h * u, c.roof * u, eave, snowT);
  ctx.fillStyle = SNOW;
  ctx.fill();

  // Lit windows: a warm halo, then the panes.
  const ww = u * 0.016;
  const wh = u * 0.018;
  ctx.beginPath();
  for (let i = 0; i < HOUSES.length; i++) {
    const h = HOUSES[i]!;
    const x = cx + h.x * u;
    const y = hy - h.h * u * 0.62;
    if (h.w > 0.08) {
      ctx.rect(x - h.w * u * 0.27 - ww / 2, y - wh / 2, ww, wh);
      ctx.rect(x + h.w * u * 0.27 - ww / 2, y - wh / 2, ww, wh);
    } else {
      ctx.rect(x - ww / 2 + (i % 2 ? -1 : 1) * h.w * u * 0.2, y - wh / 2, ww, wh);
    }
  }
  // Church: arched windows along the nave and a round window in the tower.
  for (let k = 0; k < 2; k++) {
    const x = chx + (0.006 + k * 0.022) * u;
    ctx.rect(x, hy - c.h * u * 0.75, u * 0.009, u * 0.024);
  }
  ctx.save();
  ctx.lineWidth = u * 0.012;
  ctx.strokeStyle = alpha(LAMP, 0.18);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = LAMP;
  ctx.fill();

  ctx.beginPath();
  circle(ctx, tx, hy - c.towerH * u * 0.72, u * 0.009);
  ctx.fillStyle = alpha("#ff5fb0", 0.9);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.stroke();

  // Doors
  ctx.beginPath();
  for (const h of HOUSES) {
    if (h.w <= 0.08) continue;
    const x = cx + h.x * u;
    ctx.rect(x - u * 0.008, hy - u * 0.024, u * 0.016, u * 0.024);
  }
  ctx.rect(tx - u * 0.008, hy - u * 0.026, u * 0.016, u * 0.026);
  ctx.fillStyle = alpha(GOLD, 0.35);
  ctx.fill();

  // Star on the spire
  const sy = towerTop - c.spire * u - u * 0.012;
  const tw = 0.7 + 0.3 * Math.sin(s.t * 2.4);
  const halo = ctx.createRadialGradient(tx, sy, 0, tx, sy, u * 0.05);
  halo.addColorStop(0, alpha(GOLD, 0.55 * tw));
  halo.addColorStop(1, alpha(GOLD, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(tx - u * 0.05, sy - u * 0.05, u * 0.1, u * 0.1);
  ctx.beginPath();
  starPath(ctx, tx, sy, u * 0.014, 0.45);
  ctx.fillStyle = "#fff3c4";
  ctx.fill();
  neonStroke(ctx, GOLD, Math.max(0.8, u * 0.0022), 2.6);

  // Strings of lights between the roofs
  ctx.beginPath();
  for (let i = 0; i + 5 < WIRES.length; i += 6) {
    ctx.moveTo(cx + WIRES[i]! * u, hy + WIRES[i + 1]! * u);
    ctx.quadraticCurveTo(cx + WIRES[i + 2]! * u, hy + WIRES[i + 3]! * u, cx + WIRES[i + 4]! * u, hy + WIRES[i + 5]! * u);
  }
  ctx.strokeStyle = alpha(WHITE, 0.3);
  ctx.lineWidth = Math.max(0.8, u * 0.0018);
  ctx.stroke();
  bulbBuf.length = 0;
  for (let i = 0; i + 1 < BULBS.length; i += 2) bulbBuf.push(cx + BULBS[i]! * u, hy + BULBS[i + 1]! * u);
  drawBulbs(ctx, bulbBuf, Math.max(1, u * 0.0042), s.t, 3.2);
}

/** A low bank of snow along the foot of the horizon, so nothing looks pasted on. */
function snowBank(ctx: Ctx, s: Scene, hy: number): void {
  const step = s.u * 0.05;
  const n = Math.ceil(s.cssW / step) + 1;
  ctx.beginPath();
  ctx.moveTo(-4, hy + 1);
  for (let i = 0; i <= n; i++) {
    const x = i * step;
    const h = s.u * (0.006 + 0.008 * hash(i + 1200));
    ctx.quadraticCurveTo(x - step / 2, hy - h * 1.6, x, hy - h * 0.3);
  }
  ctx.lineTo(s.cssW + 4, hy + 1);
  ctx.closePath();
  ctx.fillStyle = alpha(SNOW, 0.85);
  ctx.fill();
}

export function far(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  if (hy - s.u * 0.3 > s.cssH) return;
  backForest(ctx, s, hy);
  firs(ctx, s, hy, CLUSTER_BACK);
  village(ctx, s, hy);
  firs(ctx, s, hy, CLUSTER_FRONT);
  snowBank(ctx, s, hy);
}

import { alpha, circle, hash, neonStroke, type Ctx } from "../../neon/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, ICE, LAMP, NIGHT, PINE, SNOW, WHITE } from "./colors";
import { drawBulbs, firOutline, firPath, starPath } from "./shapes";

// On the horizon: a low line of snowy firs, taller firs framing both edges, and a little
// village in between — cottages with lit windows, a church spire, and strings of colored
// lights draped from roof to roof. Everything stands on horizonY.
// Positions are in units of u from the screen center; heights in u.

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

/** Framing firs: [x, height]. */
const FIRS: [number, number][] = [
  [-0.56, 0.15],
  [-0.5, 0.2],
  [-0.43, 0.14],
  [-0.37, 0.1],
  [0.36, 0.1],
  [0.43, 0.16],
  [0.5, 0.23],
  [0.56, 0.15],
];

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

/** Apex of a house roof, [x, y] in u relative to (center, horizon). */
function apex(h: House): [number, number] {
  return [h.x, -(h.h + h.roof)];
}

/** Light strings: precomputed bulb positions in u, relative to (center, horizon). */
const BULBS: number[] = (() => {
  const out: number[] = [];
  const anchors: [number, number][] = HOUSES.map(apex);
  anchors.push([CHURCH.x - CHURCH.towerW / 2, -(CHURCH.towerH * 0.62)]);
  for (let i = 0; i + 1 < anchors.length; i++) {
    const [ax, ay] = anchors[i]!;
    const [bx, by] = anchors[i + 1]!;
    const sag = 0.028 + 0.012 * hash(i + 40);
    const cx = (ax + bx) / 2;
    const cy = Math.max(ay, by) + sag;
    const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 0.017));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx;
      const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by;
      out.push(x, y);
    }
  }
  return out;
})();

/** Wire control points for the strings (same curves as the bulbs). */
const WIRES: number[] = (() => {
  const out: number[] = [];
  const anchors: [number, number][] = HOUSES.map(apex);
  anchors.push([CHURCH.x - CHURCH.towerW / 2, -(CHURCH.towerH * 0.62)]);
  for (let i = 0; i + 1 < anchors.length; i++) {
    const [ax, ay] = anchors[i]!;
    const [bx, by] = anchors[i + 1]!;
    const sag = 0.028 + 0.012 * hash(i + 40);
    out.push(ax, ay, (ax + bx) / 2, Math.max(ay, by) + sag, bx, by);
  }
  return out;
})();

/** Reused screen-space buffer for bulbs. */
const bulbBuf: number[] = [];

function backForest(ctx: Ctx, s: Scene, hy: number): void {
  const cx = s.cssW / 2;
  const step = s.u * 0.026;
  const n = Math.ceil(cx / step) + 2;
  const height = (i: number) => {
    const side = Math.min(1, Math.abs(i * step) / (s.u * 0.5));
    return s.u * (0.028 + 0.034 * hash(i + 700)) * (1 + 0.5 * side * side);
  };
  ctx.beginPath();
  ctx.moveTo(-4, hy);
  let prev = height(-n - 1);
  for (let i = -n; i <= n; i++) {
    const h = height(i);
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
  ctx.lineJoin = "round";
  ctx.stroke();

  // Snow on the tips
  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    const h = height(i);
    const x = cx + i * step + (hash(i + 900) - 0.5) * step * 0.4;
    ctx.moveTo(x, hy - h);
    ctx.lineTo(x + h * 0.08, hy - h * 0.72);
    ctx.lineTo(x - h * 0.08, hy - h * 0.72);
    ctx.closePath();
  }
  ctx.fillStyle = alpha(SNOW, 0.7);
  ctx.fill();
}

function firs(ctx: Ctx, s: Scene, hy: number): void {
  const cx = s.cssW / 2;
  // Fill out wide screens with extra firs beyond the fixed ones.
  const extra = Math.max(0, Math.ceil((cx / s.u - 0.6) / 0.07));
  ctx.beginPath();
  for (const [fx, fh] of FIRS) firPath(ctx, FIR, cx + fx * s.u, hy, fh * s.u);
  for (let i = 0; i < extra; i++) {
    const h = s.u * (0.14 + 0.08 * hash(i + 300));
    firPath(ctx, FIR, cx - s.u * (0.63 + i * 0.07), hy, h);
    firPath(ctx, FIR, cx + s.u * (0.63 + i * 0.07), hy, h);
  }
  neonStroke(ctx, GREEN, Math.max(1, s.u * 0.0035), 3);
  ctx.fillStyle = PINE;
  ctx.fill();

  // Snow: a cap on the top and a ledge on each tier.
  ctx.beginPath();
  const cap = (x: number, h: number) => {
    const y = hy - h;
    ctx.moveTo(x, y - h * 0.01);
    ctx.lineTo(x + h * 0.09, y + h * 0.2);
    ctx.lineTo(x + h * 0.03, y + h * 0.17);
    ctx.lineTo(x - h * 0.02, y + h * 0.22);
    ctx.lineTo(x - h * 0.09, y + h * 0.2);
    ctx.closePath();
    for (const [top, half] of FIR_LEDGES) {
      // Ledge just under the notch above, along each outer slope.
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
  };
  for (const [fx, fh] of FIRS) cap(cx + fx * s.u, fh * s.u);
  for (let i = 0; i < extra; i++) {
    const h = s.u * (0.14 + 0.08 * hash(i + 300));
    cap(cx - s.u * (0.63 + i * 0.07), h);
    cap(cx + s.u * (0.63 + i * 0.07), h);
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
  neonStroke(ctx, ICE, Math.max(1, u * 0.0035), 3);
  ctx.fillStyle = NIGHT;
  ctx.fill();

  ctx.beginPath();
  housePath(ctx, chx + c.towerW * 0.4 * u, hy, (c.w - c.towerW * 0.2) * u, c.h * u, c.roof * u, eave);
  ctx.rect(tx - c.towerW * 0.5 * u, towerTop, c.towerW * u, c.towerH * u);
  ctx.moveTo(tx - c.towerW * 0.62 * u, towerTop);
  ctx.lineTo(tx, towerTop - c.spire * u);
  ctx.lineTo(tx + c.towerW * 0.62 * u, towerTop);
  ctx.closePath();
  neonStroke(ctx, GOLD, Math.max(1, u * 0.004), 3);
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
  for (const [i, h] of HOUSES.entries()) {
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
  ctx.fillStyle = alpha(LAMP, 0.25);
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
  village(ctx, s, hy);
  firs(ctx, s, hy);
  snowBank(ctx, s, hy);
}

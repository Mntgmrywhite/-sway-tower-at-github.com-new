import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FAR, FAR_BACK, FAR_BACK_SNOW, FAR_LAMP, FAR_SNOW, LIGHTS, SKY_BOTTOM } from "./colors";
import { firOutline, firPath, starPath } from "./shapes";
import { sleigh } from "./sky";

// On the horizon, as faded flat silhouettes with no outlines: a low line of snowy firs,
// taller firs framing both edges behind the cloud bank, and a little village in between —
// tall gabled houses with lit windows and smoking chimneys, a church spire with a star, and
// strings of lights between the roofs. Everything stands on horizonY.
// Village positions are in u from the screen center, framing firs in u from each screen
// edge (so they are never cut off); heights in u.

const FIR = firOutline(
  [
    { top: -1, bottom: -0.7, half: 0.1 },
    { top: -0.82, bottom: -0.5, half: 0.14 },
    { top: -0.64, bottom: -0.3, half: 0.18 },
    { top: -0.46, bottom: -0.1, half: 0.22 },
  ],
  0.03,
);

/** Snow ledges on the lower tiers of FIR: [tier top, tier half width]. */
const FIR_LEDGES = [
  [-0.82, 0.14],
  [-0.64, 0.18],
  [-0.46, 0.22],
] as const;

/**
 * Framing firs, measured inward from a screen edge: [distance to the trunk, height] in u.
 * Their tips peek over the cloud bank piled at the sides (more so on wide screens), and they
 * stay below the moon and the sleigh's path. Each keeps its whole outline on screen.
 */
const FRAMING = [
  [0.075, 0.3],
  [0.205, 0.24],
] as const;

interface House {
  x: number;
  w: number;
  h: number;
  roof: number;
  chimney: number; // -1 left slope, 1 right slope, 0 none
  rows: number; // rows of windows
}

/**
 * Tall gabled houses, taller toward the ends of the village where the clouds pile higher,
 * so their snowy roofs and top windows always show above the cloud bank.
 */
const HOUSES: House[] = [
  { x: -0.235, w: 0.075, h: 0.17, roof: 0.05, chimney: 1, rows: 4 },
  { x: -0.145, w: 0.085, h: 0.13, roof: 0.05, chimney: -1, rows: 3 },
  { x: -0.055, w: 0.075, h: 0.115, roof: 0.045, chimney: 0, rows: 3 },
  { x: 0.035, w: 0.08, h: 0.125, roof: 0.05, chimney: 1, rows: 3 },
  { x: 0.25, w: 0.075, h: 0.175, roof: 0.05, chimney: -1, rows: 4 },
];
const EAVE = 0.012; // roof overhang

const CHURCH = { x: 0.15, w: 0.085, h: 0.13, roof: 0.045, towerW: 0.04, towerH: 0.23, spire: 0.09 };

/** Windows per house, as (x, y) in u relative to (center, horizon), precomputed. */
const WINDOWS: number[] = (() => {
  const out: number[] = [];
  for (const h of HOUSES) {
    for (let r = 0; r < h.rows; r++) {
      const y = -h.h + 0.026 + r * 0.036;
      out.push(h.x - h.w * 0.24, y, h.x + h.w * 0.24, y);
    }
  }
  return out;
})();

/**
 * Strings of lights draped from roof to roof and on to the church tower, precomputed in u
 * relative to (center, horizon): WIRES holds each sagging curve as six numbers (start,
 * control, end) and BULBS the x, y of every bulb along them.
 */
const { WIRES, BULBS } = (() => {
  const wires: number[] = [];
  const bulbs: number[] = [];
  const anchors: [number, number][] = HOUSES.map((h) => [h.x, -(h.h + h.roof)]);
  anchors.push([CHURCH.x - CHURCH.w / 2 + CHURCH.towerW / 2, -(CHURCH.towerH * 0.8)]);
  anchors.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i + 1 < anchors.length; i++) {
    const [ax, ay] = anchors[i]!;
    const [bx, by] = anchors[i + 1]!;
    const cx = (ax + bx) / 2;
    const cy = Math.max(ay, by) + 0.03 + 0.012 * hash(i + 40);
    wires.push(ax, ay, cx, cy, bx, by);
    const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 0.016));
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

/** Faded versions of the light colors: lit and dim. */
const FAR_LIGHTS = LIGHTS.map((c) => mix(c, FAR, 0.25));
const FAR_LIGHTS_DIM = FAR_LIGHTS.map((c) => mix(c, FAR, 0.6));
const SPIRE_STAR = FAR_LAMP;
const SPIRE_STAR_LIT = mix(FAR_LAMP, "#ffffff", 0.35);
const SMOKE = alpha(mix(FAR, SKY_BOTTOM, 0.6), 0.6);
const WIRE = alpha(FAR_SNOW, 0.6);

/** Height of back-row fir i (taller toward the screen edges). */
function backFirHeight(s: Scene, i: number, step: number): number {
  const side = Math.min(1, Math.abs(i * step) / (s.cssW * 0.5));
  return s.u * (0.1 + 0.05 * hash(i + 700)) * (1 + 1.25 * side * side);
}

/** A low, dense line of distant firs across the whole horizon, tipped with snow. */
function backForest(ctx: Ctx, s: Scene, hy: number): void {
  const cx = s.cssW / 2;
  const step = s.u * 0.03;
  const n = Math.ceil(cx / step) + 2;
  ctx.beginPath();
  ctx.moveTo(-4, hy);
  let prev = backFirHeight(s, -n - 1, step);
  for (let i = -n; i <= n; i++) {
    const h = backFirHeight(s, i, step);
    const x = cx + i * step + (hash(i + 900) - 0.5) * step * 0.4;
    ctx.lineTo(x - step * 0.5, hy - Math.min(prev, h) * 0.2);
    ctx.lineTo(x - h * 0.17, hy - h * 0.3);
    ctx.lineTo(x - h * 0.08, hy - h * 0.36);
    ctx.lineTo(x - h * 0.13, hy - h * 0.58);
    ctx.lineTo(x - h * 0.05, hy - h * 0.62);
    ctx.lineTo(x, hy - h);
    ctx.lineTo(x + h * 0.05, hy - h * 0.62);
    ctx.lineTo(x + h * 0.13, hy - h * 0.58);
    ctx.lineTo(x + h * 0.08, hy - h * 0.36);
    ctx.lineTo(x + h * 0.17, hy - h * 0.3);
    prev = h;
  }
  ctx.lineTo(s.cssW + 4, hy);
  ctx.closePath();
  ctx.fillStyle = FAR_BACK;
  ctx.fill();

  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    const h = backFirHeight(s, i, step);
    const x = cx + i * step + (hash(i + 900) - 0.5) * step * 0.4;
    ctx.moveTo(x, hy - h);
    ctx.lineTo(x + h * 0.07, hy - h * 0.74);
    ctx.lineTo(x - h * 0.07, hy - h * 0.74);
    ctx.closePath();
  }
  ctx.fillStyle = FAR_BACK_SNOW;
  ctx.fill();
}

/** Snow on a framing fir standing at (x, hy), `h` tall: a cap on top and a ledge on each lower tier. */
function firSnow(ctx: Ctx, x: number, hy: number, h: number): void {
  const y = hy - h;
  ctx.moveTo(x, y - h * 0.01);
  ctx.lineTo(x + h * 0.06, y + h * 0.17);
  ctx.lineTo(x + h * 0.02, y + h * 0.14);
  ctx.lineTo(x - h * 0.015, y + h * 0.18);
  ctx.lineTo(x - h * 0.06, y + h * 0.17);
  ctx.closePath();
  for (const [top, half] of FIR_LEDGES) {
    // Just under the notch above, along each outer slope.
    const y0 = hy + (top + 0.1) * h;
    const x0 = half * 0.3 * h;
    const x1 = half * 0.88 * h;
    const y1 = hy + (top + 0.29) * h;
    for (let dir = -1; dir <= 1; dir += 2) {
      ctx.moveTo(x + dir * x0, y0);
      ctx.lineTo(x + dir * x1, y1);
      ctx.lineTo(x + dir * x1 * 0.9, y1 + h * 0.035);
      ctx.lineTo(x + dir * x0 * 0.9, y0 + h * 0.04);
      ctx.closePath();
    }
  }
}

/** Snowy firs mirrored on both edges, peeking over the cloud bank. */
function framingFirs(ctx: Ctx, s: Scene, hy: number): void {
  ctx.beginPath();
  for (const [d, h] of FRAMING) {
    firPath(ctx, FIR, d * s.u, hy, h * s.u);
    firPath(ctx, FIR, s.cssW - d * s.u, hy, h * s.u);
  }
  ctx.fillStyle = FAR;
  ctx.fill();
  ctx.beginPath();
  for (const [d, h] of FRAMING) {
    firSnow(ctx, d * s.u, hy, h * s.u);
    firSnow(ctx, s.cssW - d * s.u, hy, h * s.u);
  }
  ctx.fillStyle = FAR_SNOW;
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

/** Snow lying on a pitched roof, with a few soft drips along the eaves. */
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

/** Cottages and a church with lit windows, snowy roofs, chimney smoke and strings of lights. */
function village(ctx: Ctx, s: Scene, hy: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const eave = EAVE * u;
  const c = CHURCH;
  const chx = cx + c.x * u;
  const tx = chx - c.w * 0.5 * u + c.towerW * 0.5 * u; // tower stands at the nave's left end
  const towerTop = hy - c.towerH * u;

  // Chimney smoke: puffs rising, swelling and fading.
  ctx.beginPath();
  for (let i = 0; i < HOUSES.length; i++) {
    const h = HOUSES[i]!;
    if (!h.chimney) continue;
    const x0 = cx + (h.x + h.chimney * h.w * 0.25) * u;
    const y0 = hy - (h.h + h.roof * 0.95) * u;
    for (let k = 0; k < 4; k++) {
      const p = (s.t * 0.18 + k / 4 + hash(i + 60)) % 1;
      const r = u * (0.005 + 0.008 * p);
      circle(ctx, x0 + Math.sin(p * 4 + i) * u * 0.005 + p * u * 0.02, y0 - u * 0.006 - p * u * 0.06, r);
    }
  }
  ctx.fillStyle = SMOKE;
  ctx.fill();

  // Silhouettes: houses, chimneys, the church nave, tower and spire.
  ctx.beginPath();
  for (const h of HOUSES) {
    const x = cx + h.x * u;
    housePath(ctx, x, hy, h.w * u, h.h * u, h.roof * u, eave);
    if (h.chimney) {
      const chimX = x + h.chimney * h.w * 0.25 * u;
      ctx.rect(chimX - 0.008 * u, hy - (h.h + h.roof * 0.95) * u, 0.016 * u, h.roof * 0.6 * u);
    }
  }
  housePath(ctx, chx + c.towerW * 0.4 * u, hy, (c.w - c.towerW * 0.2) * u, c.h * u, c.roof * u, eave);
  ctx.rect(tx - c.towerW * 0.5 * u, towerTop, c.towerW * u, c.towerH * u);
  ctx.moveTo(tx - c.towerW * 0.62 * u, towerTop);
  ctx.lineTo(tx, towerTop - c.spire * u);
  ctx.lineTo(tx + c.towerW * 0.62 * u, towerTop);
  ctx.closePath();
  ctx.fillStyle = FAR;
  ctx.fill();

  // Snow on the roofs and the tower's ledge
  const snowT = u * 0.008;
  ctx.beginPath();
  for (const h of HOUSES) roofSnow(ctx, cx + h.x * u, hy, h.w * u, h.h * u, h.roof * u, eave, snowT);
  roofSnow(ctx, chx + c.towerW * 0.4 * u, hy, (c.w - c.towerW * 0.2) * u, c.h * u, c.roof * u, eave, snowT);
  ctx.rect(tx - c.towerW * 0.62 * u, towerTop - snowT * 0.6, c.towerW * 1.24 * u, snowT * 0.9);
  ctx.fillStyle = FAR_SNOW;
  ctx.fill();

  // Lit windows; now and then one goes dark for a while.
  const ww = u * 0.015;
  const wh = u * 0.018;
  ctx.beginPath();
  for (let i = 0; i + 1 < WINDOWS.length; i += 2) {
    if (Math.sin(s.t * 0.35 + hash(i + 70) * 40) < -0.85) continue;
    ctx.rect(cx + WINDOWS[i]! * u - ww / 2, hy + WINDOWS[i + 1]! * u - wh / 2, ww, wh);
  }
  // Church: tall windows along the nave and a round window in the tower.
  for (let k = 0; k < 2; k++) {
    ctx.rect(chx + (0.008 + k * 0.022) * u, hy - c.h * u * 0.8, u * 0.01, u * 0.03);
  }
  circle(ctx, tx, hy - c.towerH * u * 0.72, u * 0.01);
  ctx.fillStyle = FAR_LAMP;
  ctx.fill();

  // Star on the spire, twinkling.
  const tw = 0.5 + 0.5 * Math.sin(s.t * 2.4);
  const sy = towerTop - c.spire * u - u * 0.014;
  ctx.beginPath();
  starPath(ctx, tx, sy, u * (0.013 + 0.003 * tw), 0.45);
  ctx.fillStyle = tw > 0.5 ? SPIRE_STAR_LIT : SPIRE_STAR;
  ctx.fill();

  // Strings of lights between the roofs: a faint wire, bulbs taking turns to shine.
  ctx.beginPath();
  for (let i = 0; i + 5 < WIRES.length; i += 6) {
    ctx.moveTo(cx + WIRES[i]! * u, hy + WIRES[i + 1]! * u);
    ctx.quadraticCurveTo(cx + WIRES[i + 2]! * u, hy + WIRES[i + 3]! * u, cx + WIRES[i + 4]! * u, hy + WIRES[i + 5]! * u);
  }
  ctx.strokeStyle = WIRE;
  ctx.lineWidth = Math.max(0.8, u * 0.002);
  ctx.stroke();
  const r = Math.max(1, u * 0.0042);
  for (let c4 = 0; c4 < FAR_LIGHTS.length; c4++) {
    const lit = Math.sin(s.t * 3 - c4 * (Math.PI / 2)) > -0.3;
    ctx.beginPath();
    for (let i = c4 * 2; i + 1 < BULBS.length; i += FAR_LIGHTS.length * 2) circle(ctx, cx + BULBS[i]! * u, hy + BULBS[i + 1]! * u, r);
    ctx.fillStyle = lit ? FAR_LIGHTS[c4]! : FAR_LIGHTS_DIM[c4]!;
    ctx.fill();
  }
}

/**
 * The horizon, then Santa's sleigh: it flies in front of the distant village (so a tall
 * spire never cuts through it on wide screens) but behind the cloud bank, which it seems
 * to fly out of at the screen's edge.
 */
export function far(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  if (hy - s.u * 0.55 <= s.cssH) {
    backForest(ctx, s, hy);
    framingFirs(ctx, s, hy);
    village(ctx, s, hy);
  }
  sleigh(ctx, s);
}

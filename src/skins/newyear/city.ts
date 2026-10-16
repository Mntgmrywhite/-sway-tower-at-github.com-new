import { alpha, circle, hash, mix, neonStroke, type Ctx } from "../../neon/draw";
import { altitude01 } from "../../neon/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, CYAN, GOLD, INK, MAGENTA, SILVER, TAU, VIOLET } from "./colors";

// The far layer: a midnight skyline standing on the horizon. Two rows of towers with lit
// windows, a gothic clock tower at five to midnight (the hands reach twelve as you climb),
// a ball-drop tower whose ball slides down its mast, and searchlights sweeping the sky.
// Geometry is in units of `u`, measured from the screen center and up from the horizon.

interface Building {
  x: number;
  w: number;
  h: number;
  /** 0 flat, 1 setback crown, 2 spire, 3 antenna */
  roof: number;
}

interface Win {
  x: number;
  y: number;
  color: number;
  seed: number;
}

const SPAN = 1.8; // generate this far either side of center

/** Heights grow toward the screen edges, leaving a dip in the middle for the mirror ball. */
function row(seed: number, minW: number, maxW: number, low: number, high: number, jitter: number): Building[] {
  const out: Building[] = [];
  let x = -SPAN;
  let i = 0;
  while (x < SPAN) {
    const w = minW + hash(seed + i * 3.1) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    const side = Math.min(1, mid / 0.55);
    const h = low + (high - low) * side * side + hash(seed + i * 3.1 + 1) * jitter;
    const r = hash(seed + i * 3.1 + 2);
    out.push({ x, w, h, roof: r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : 3 });
    x += w;
    i++;
  }
  return out;
}

const BACK = row(500, 0.07, 0.12, 0.1, 0.27, 0.07);
const FRONT = row(900, 0.055, 0.1, 0.035, 0.15, 0.05);

const WIN_W = 0.0085;
const WIN_H = 0.011;

function windows(rowB: Building[], seed: number, litChance: number): Win[] {
  const out: Win[] = [];
  for (const [bi, b] of rowB.entries()) {
    const cols = Math.max(1, Math.floor((b.w - 0.02) / 0.02));
    const rows = Math.max(1, Math.floor((b.h - 0.03) / 0.024));
    const pad = (b.w - cols * 0.02) / 2;
    const hue = hash(seed + bi * 5.7);
    const color = hue < 0.6 ? 0 : hue < 0.8 ? 1 : 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = seed + bi * 131 + r * 17 + c;
        if (hash(id) > litChance) continue;
        out.push({ x: b.x + pad + c * 0.02 + 0.006, y: 0.022 + r * 0.024, color, seed: id });
      }
    }
  }
  return out;
}

const BACK_WIN = windows(BACK, 1300, 0.42);
const FRONT_WIN = windows(FRONT, 1700, 0.5);
const WIN_COLORS = [CHAMPAGNE, CYAN, "#ff7ad0"] as const;

const CLOCK_X = -0.36;
const DROP_X = 0.37;

/** Searchlights sweeping up from behind the city. */
function searchlights(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const len = Math.min(hy * 0.85, s.u * 1.2);
  if (len < s.u * 0.2) return;
  for (let i = 0; i < 2; i++) {
    const sx = s.cssW / 2 + (i ? 0.2 : -0.22) * s.u;
    const ang = (i ? 0.32 : -0.32) + Math.sin(s.t * (0.33 + i * 0.07) + i * 2.1) * 0.42;
    const tx = sx + Math.sin(ang) * len;
    const ty = hy - Math.cos(ang) * len;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const w0 = s.u * 0.012;
    const w1 = s.u * 0.1;
    const g = ctx.createLinearGradient(sx, hy, tx, ty);
    const c = i ? CYAN : SILVER;
    g.addColorStop(0, alpha(c, 0.2));
    g.addColorStop(0.6, alpha(c, 0.06));
    g.addColorStop(1, alpha(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - nx * w0, hy - ny * w0);
    ctx.lineTo(tx - nx * w1, ty - ny * w1);
    ctx.lineTo(tx + nx * w1, ty + ny * w1);
    ctx.lineTo(sx + nx * w0, hy + ny * w0);
    ctx.closePath();
    ctx.fill();
  }
}

/** One row of the skyline: silhouette, neon roofline, faint seams, antennas. */
function skyline(ctx: Ctx, s: Scene, rowB: Building[], fill: string, rim: string, rimW: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const minX = (-cx - u * 0.2) / u;
  const maxX = (s.cssW - cx + u * 0.2) / u;
  ctx.beginPath();
  let started = false;
  for (const b of rowB) {
    if (b.x + b.w < minX || b.x > maxX) continue;
    const x0 = cx + b.x * u;
    const x1 = cx + (b.x + b.w) * u;
    const top = hy - b.h * u;
    if (!started) {
      ctx.moveTo(x0, hy);
      started = true;
    }
    if (b.roof === 1) {
      const inset = (x1 - x0) * 0.22;
      const step = u * 0.022;
      ctx.lineTo(x0, top + step);
      ctx.lineTo(x0 + inset, top + step);
      ctx.lineTo(x0 + inset, top);
      ctx.lineTo(x1 - inset, top);
      ctx.lineTo(x1 - inset, top + step);
      ctx.lineTo(x1, top + step);
    } else if (b.roof === 2) {
      // Art-deco crown: a short tier and a needle spire
      const m = (x0 + x1) / 2;
      const tier = (x1 - x0) * 0.3;
      ctx.lineTo(x0, top);
      ctx.lineTo(m - tier, top);
      ctx.lineTo(m - tier, top - u * 0.015);
      ctx.lineTo(m - tier * 0.4, top - u * 0.015);
      ctx.lineTo(m, top - u * 0.065);
      ctx.lineTo(m + tier * 0.4, top - u * 0.015);
      ctx.lineTo(m + tier, top - u * 0.015);
      ctx.lineTo(m + tier, top);
      ctx.lineTo(x1, top);
    } else {
      ctx.lineTo(x0, top);
      ctx.lineTo(x1, top);
    }
  }
  if (!started) return;
  ctx.lineTo(s.cssW + u * 0.2, hy);
  ctx.fillStyle = fill;
  ctx.fill();
  neonStroke(ctx, rim, rimW, 2.6);

  // Seams between buildings and antennas
  ctx.beginPath();
  for (const b of rowB) {
    if (b.x + b.w < minX || b.x > maxX) continue;
    const x0 = cx + b.x * u;
    ctx.moveTo(x0, hy);
    ctx.lineTo(x0, hy - b.h * u + u * 0.03);
    if (b.roof === 3) {
      const ax = cx + (b.x + b.w / 2) * u;
      ctx.moveTo(ax, hy - b.h * u);
      ctx.lineTo(ax, hy - b.h * u - u * 0.06);
    }
  }
  ctx.strokeStyle = alpha(rim, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
}

function windowLights(ctx: Ctx, s: Scene, list: Win[], strength: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const ww = Math.max(1, WIN_W * u);
  const wh = Math.max(1, WIN_H * u);
  const slow = s.t * 0.2;
  for (let c = 0; c < WIN_COLORS.length; c++) {
    ctx.beginPath();
    for (const w of list) {
      if (w.color !== c) continue;
      const x = cx + w.x * u;
      if (x < -ww || x > s.cssW) continue;
      // Lights switch on and off now and then.
      if (hash(w.seed * 1.7 + Math.floor(slow + hash(w.seed) * 5)) < 0.18) continue;
      ctx.rect(x, hy - w.y * u - wh, ww, wh);
    }
    ctx.fillStyle = alpha(WIN_COLORS[c]!, strength);
    ctx.fill();
  }
}

/** Blinking aviation lights on the antennas. */
function beacons(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (const [i, b] of FRONT.entries()) {
    if (b.roof !== 3) continue;
    if (Math.sin(s.t * 2.4 + i * 1.3) < 0.2) continue;
    circle(ctx, cx + (b.x + b.w / 2) * u, s.horizonY - b.h * u - u * 0.06, Math.max(1.2, u * 0.005));
  }
  for (const [i, b] of BACK.entries()) {
    if (b.roof !== 3) continue;
    if (Math.sin(s.t * 2.1 + i * 1.7) < 0.2) continue;
    circle(ctx, cx + (b.x + b.w / 2) * u, s.horizonY - b.h * u - u * 0.06, Math.max(1.2, u * 0.005));
  }
  ctx.fillStyle = MAGENTA;
  ctx.fill();
}

/** Gothic clock tower; the hands reach midnight as the tower reaches the sky. */
function clockTower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  const X = s.cssW / 2 + CLOCK_X * u;
  const P = (dx: number, dy: number): [number, number] => [X + dx * u, hy - dy * u];
  const outline: [number, number][] = [
    [-0.034, 0],
    [-0.034, 0.3],
    [-0.044, 0.3],
    [-0.044, 0.398],
    [-0.036, 0.398],
    [-0.036, 0.44],
    [-0.042, 0.44],
    [0, 0.565],
    [0.042, 0.44],
    [0.036, 0.44],
    [0.036, 0.398],
    [0.044, 0.398],
    [0.044, 0.3],
    [0.034, 0.3],
    [0.034, 0],
  ];
  ctx.beginPath();
  for (const [i, [dx, dy]] of outline.entries()) {
    const [x, y] = P(dx, dy);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, GOLD, Math.max(1.2, u * 0.0042), 2.8);

  // Ledges, belfry arches, shaft slits, finial
  ctx.beginPath();
  const ledge = (dy: number, half: number) => {
    const [a, y] = P(-half, dy);
    const [b] = P(half, dy);
    ctx.moveTo(a, y);
    ctx.lineTo(b, y);
  };
  ledge(0.398, 0.044);
  ledge(0.12, 0.034);
  ledge(0.21, 0.034);
  for (const dx of [-0.016, 0.016]) {
    const [ax, ay] = P(dx, 0.405);
    ctx.moveTo(ax - u * 0.008, ay);
    ctx.lineTo(ax - u * 0.008, ay - u * 0.018);
    ctx.arc(ax, ay - u * 0.018, u * 0.008, Math.PI, 0);
    ctx.lineTo(ax + u * 0.008, ay);
  }
  const [fx, fy] = P(0, 0.565);
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy - u * 0.03);
  ctx.strokeStyle = alpha(GOLD, 0.75);
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();

  // Lit slit windows
  ctx.beginPath();
  for (const dy of [0.05, 0.14, 0.23]) {
    for (const dx of [-0.016, 0.008]) {
      const [x, y] = P(dx, dy + 0.05);
      ctx.rect(x, y, u * 0.008, u * 0.04);
    }
  }
  ctx.fillStyle = alpha(CHAMPAGNE, 0.55);
  ctx.fill();

  // Belfry glow
  ctx.beginPath();
  for (const dx of [-0.016, 0.016]) {
    const [ax, ay] = P(dx, 0.405);
    ctx.rect(ax - u * 0.006, ay - u * 0.022, u * 0.012, u * 0.022);
  }
  ctx.fillStyle = alpha(GOLD, 0.5);
  ctx.fill();

  // Clock face
  const [cx, cy] = P(0, 0.349);
  const r = u * 0.031;
  const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.4);
  glow.addColorStop(0, alpha(GOLD, 0.28));
  glow.addColorStop(1, alpha(GOLD, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.fillStyle = "#2a1a05";
  ctx.fill();
  neonStroke(ctx, GOLD, Math.max(1.2, u * 0.004), 2.6);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    circle(ctx, cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, Math.max(0.5, r * (i % 3 ? 0.05 : 0.09)));
  }
  ctx.fillStyle = CHAMPAGNE;
  ctx.fill();

  // 11:55 at the ground, midnight by the time the tower is high in the sky.
  const minutes = 55 + 5 * altitude01(s);
  const ma = (minutes / 60) * TAU - Math.PI / 2;
  const ha = ((11 + minutes / 60) / 12) * TAU - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ma) * r * 0.72, cy + Math.sin(ma) * r * 0.72);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ha) * r * 0.46, cy + Math.sin(ha) * r * 0.46);
  neonStroke(ctx, "#ffffff", Math.max(1, u * 0.0035), 2.4);
}

/** Times-Square style tower: billboards, a ticker, and the ball sliding down its mast. */
function dropTower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  const X = s.cssW / 2 + DROP_X * u;
  const w = 0.085 * u;
  const h = 0.33 * u;
  const x0 = X - w / 2;
  const top = hy - h;

  ctx.beginPath();
  ctx.moveTo(x0, hy);
  ctx.lineTo(x0, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top);
  ctx.lineTo(x0 + w * 0.85, top);
  ctx.lineTo(x0 + w * 0.85, top + u * 0.02);
  ctx.lineTo(x0 + w, top + u * 0.02);
  ctx.lineTo(x0 + w, hy);
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, CYAN, Math.max(1.2, u * 0.0042), 2.8);

  // Billboards
  const bb = (bx: number, by: number, bw: number, bh: number, c: string, phase: number) => {
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.fillStyle = alpha(c, 0.18 + 0.1 * Math.sin(s.t * 3 + phase));
    ctx.fill();
    neonStroke(ctx, c, Math.max(1, u * 0.003), 2.4);
  };
  bb(x0 + w * 0.12, top + u * 0.05, w * 0.76, u * 0.06, MAGENTA, 0);
  bb(x0 + w * 0.12, top + u * 0.15, w * 0.32, u * 0.1, GOLD, 1.3);
  bb(x0 + w * 0.56, top + u * 0.15, w * 0.32, u * 0.1, VIOLET, 2.6);
  // Scrolling ticker dots
  ctx.beginPath();
  const ty = top + u * 0.125;
  const dot = Math.max(0.8, u * 0.0035);
  const scroll = (s.t * u * 0.04) % (dot * 4);
  for (let x = x0 + w * 0.08 - scroll; x < x0 + w * 0.92; x += dot * 4) {
    if (x < x0 + w * 0.08) continue;
    ctx.rect(x, ty - dot / 2, dot * 2, dot);
  }
  ctx.fillStyle = CHAMPAGNE;
  ctx.fill();

  // Mast and the ball
  const mastTop = top - u * 0.15;
  ctx.beginPath();
  ctx.moveTo(X, top);
  ctx.lineTo(X, mastTop);
  ctx.strokeStyle = alpha(SILVER, 0.8);
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  const a = altitude01(s);
  const br = u * 0.02;
  const by = mastTop + br + a * (u * 0.15 - br * 2.2);
  const glow = ctx.createRadialGradient(X, by, br * 0.8, X, by, br * 3.2);
  glow.addColorStop(0, alpha(GOLD, 0.3 + 0.1 * Math.sin(s.t * 5)));
  glow.addColorStop(1, alpha(GOLD, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(X - br * 3.2, by - br * 3.2, br * 6.4, br * 6.4);
  ctx.beginPath();
  circle(ctx, X, by, br);
  const g = ctx.createLinearGradient(0, by - br, 0, by + br);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, mix(GOLD, CYAN, 0.35));
  g.addColorStop(1, VIOLET);
  ctx.fillStyle = g;
  ctx.fill();
  neonStroke(ctx, SILVER, Math.max(1, u * 0.003), 2.6);
  ctx.beginPath();
  ctx.moveTo(X - br, by);
  ctx.lineTo(X + br, by);
  ctx.moveTo(X, by - br);
  ctx.lineTo(X, by + br);
  ctx.strokeStyle = alpha("#1a0830", 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** The far layer. */
export function city(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.7 > s.cssH) return;
  searchlights(ctx, s);
  skyline(ctx, s, BACK, "#100626", mix(VIOLET, MAGENTA, 0.25), Math.max(1, s.u * 0.0032));
  windowLights(ctx, s, BACK_WIN, 0.45);
  clockTower(ctx, s);
  dropTower(ctx, s);
  skyline(ctx, s, FRONT, INK, CYAN, Math.max(1.2, s.u * 0.0042));
  windowLights(ctx, s, FRONT_WIN, 0.85);
  beacons(ctx, s);
}

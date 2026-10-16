import { mix, roundRectPath, type Scene } from "./theme";

// Halloween scenery in a casual cartoon style: periwinkle night sky, faded silhouettes in
// the distance, puffy cel-shaded clouds, and ink-outlined objects up close.
//
// Parallax: each layer's ground line sits at  groundY - rise * (1 - p),  so p = 0 never
// moves, p = 1 moves with the tower, and p > 1 (foreground) drops away faster.

const INK = "#2a1f3d";

const CLOUD = { shadow: "#3f9fb0", base: "#5cc6bf", light: "#90ecd8" };
const FAR = "#544aa9"; // distant silhouettes
const FLYER = "#5249a8"; // witches and bats against the sky

const GRASS = "#a6d047";
const GRASS_DARK = "#6f9a2e";
const SOIL_TOP = "#5a4a84";
const SOIL_BOTTOM = "#3a2f5e";
const BONE = "#f5f1e3";

/** Deterministic 0..1 noise from an integer. */
function hash(i: number): number {
  const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return v - Math.floor(v);
}

/** Closed circle as its own subpath, so several can share one fill without joining lines. */
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** Ink outline along the current path. */
function ink(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Stroke the current path as an outlined tube: ink underneath, color on top. */
function inkedLine(ctx: CanvasRenderingContext2D, color: string, width: number, inkW: number): void {
  ink(ctx, width + inkW * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function layerGround(s: Scene, p: number): number {
  return s.groundY - s.rise * (1 - p);
}

/** 0 at the ground, 1 once the tower is high in the night sky. */
function altitude01(s: Scene): number {
  return Math.min(1, s.altitude / 600);
}

function lineW(s: Scene): number {
  return Math.max(1.5, s.u * 0.006);
}

// ---------------------------------------------------------------- sky

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.8,
  r: 0.8 + hash(i + 200) * 1.2,
  sparkle: hash(i + 300) > 0.85,
}));

function sky(ctx: CanvasRenderingContext2D, s: Scene): void {
  const a = altitude01(s);
  const g = ctx.createLinearGradient(0, 0, 0, s.cssH);
  g.addColorStop(0, mix("#3a3c8c", "#1b1c52", a));
  g.addColorStop(0.6, mix("#6a62c8", "#35307e", a));
  g.addColorStop(1, mix("#9a8ae6", "#4f45a8", a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  ctx.fillStyle = "#ffffff";
  for (const [i, st] of STARS.entries()) {
    const visible = st.y < 0.4 + a * 0.5 ? 1 : 0;
    ctx.globalAlpha = visible * (0.55 + 0.35 * Math.sin(s.t * 1.5 + i));
    const x = st.x * s.cssW;
    const y = st.y * s.cssH;
    if (st.sparkle) {
      const r = st.r * 2.2;
      ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
      ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    } else {
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

function moon(ctx: CanvasRenderingContext2D, s: Scene): void {
  const a = altitude01(s);
  const mx = s.cssW * 0.2;
  const my = s.cssH * 0.1;
  const mr = s.u * (0.08 + a * 0.03);
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
  ctx.shadowBlur = mr * 0.8;
  ctx.fillStyle = "#eeedf9";
  ctx.beginPath();
  circle(ctx, mx, my, mr);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#d3d0ec";
  ctx.beginPath();
  circle(ctx, mx - mr * 0.35, my - mr * 0.2, mr * 0.16);
  circle(ctx, mx + mr * 0.3, my + mr * 0.35, mr * 0.12);
  circle(ctx, mx + mr * 0.42, my - mr * 0.3, mr * 0.08);
  circle(ctx, mx - mr * 0.1, my + mr * 0.5, mr * 0.07);
  ctx.fill();
}

// ---------------------------------------------------------------- distant town

/** Faded skyline of a spooky town: crooked houses, a church spire, and the haunted mansion. */
function farTown(ctx: CanvasRenderingContext2D, s: Scene): void {
  const base = layerGround(s, 0.1) - s.u * 0.02;
  if (base - s.u * 0.4 > s.cssH) return;
  const u = s.u;
  ctx.fillStyle = FAR;
  ctx.beginPath();
  ctx.rect(0, base, s.cssW, s.cssH - base + 10);

  let x = -u * 0.03;
  let i = 0;
  while (x < s.cssW) {
    const w = u * (0.06 + hash(i + 400) * 0.06);
    const h = u * (0.07 + hash(i + 410) * 0.1);
    const kind = hash(i + 420);
    const lean = (hash(i + 430) - 0.5) * u * 0.02;
    if (kind < 0.12) {
      // Church with a spire
      ctx.rect(x, base - h, w, h);
      ctx.moveTo(x + w * 0.3, base - h);
      ctx.lineTo(x + w * 0.5, base - h - u * 0.12);
      ctx.lineTo(x + w * 0.7, base - h);
      ctx.closePath();
    } else {
      // Crooked house with a pointed roof
      ctx.rect(x, base - h, w, h);
      ctx.moveTo(x - w * 0.08, base - h);
      ctx.lineTo(x + w / 2 + lean, base - h - w * 0.55);
      ctx.lineTo(x + w * 1.08, base - h);
      ctx.closePath();
      if (kind > 0.6) ctx.rect(x + w * 0.65, base - h - w * 0.45, w * 0.12, w * 0.3); // chimney
    }
    x += w * (0.85 + hash(i + 440) * 0.4);
    i++;
  }

  // The haunted mansion, on the right.
  const hx = s.cssW * 0.78;
  const hw = u * 0.2;
  ctx.rect(hx - hw / 2, base - hw * 0.62, hw, hw * 0.62);
  ctx.moveTo(hx - hw * 0.6, base - hw * 0.62);
  ctx.lineTo(hx, base - hw * 1.02);
  ctx.lineTo(hx + hw * 0.6, base - hw * 0.62);
  ctx.closePath();
  ctx.rect(hx + hw * 0.3, base - hw * 1.15, hw * 0.16, hw * 0.6);
  ctx.moveTo(hx + hw * 0.26, base - hw * 1.15);
  ctx.lineTo(hx + hw * 0.38, base - hw * 1.42);
  ctx.lineTo(hx + hw * 0.5, base - hw * 1.15);
  ctx.closePath();
  ctx.fill();

  // A few faint lit windows
  ctx.fillStyle = "#8f86e0";
  for (let k = 0; k < 9; k++) {
    if (Math.sin(s.t * 0.6 + k * 2.1) < -0.5) continue;
    const wx = hash(k + 500) * s.cssW;
    ctx.fillRect(wx, base - u * (0.03 + hash(k + 510) * 0.06), u * 0.012, u * 0.016);
  }
  ctx.fillStyle = "#b4a9ff";
  for (const [fx, fy] of [
    [-0.3, -0.45],
    [-0.05, -0.45],
    [0.2, -0.3],
    [0.35, -0.98],
  ] as const) {
    ctx.fillRect(hx + hw * fx, base + hw * fy, hw * 0.08, hw * 0.11);
  }
}

// ---------------------------------------------------------------- clouds

/** One cel-shaded puff cluster: shadow, body, then light caps. */
function puffs(ctx: CanvasRenderingContext2D, list: { x: number; y: number; r: number }[]): void {
  ctx.fillStyle = CLOUD.shadow;
  ctx.beginPath();
  for (const p of list) circle(ctx, p.x, p.y, p.r);
  ctx.fill();
  ctx.fillStyle = CLOUD.base;
  ctx.beginPath();
  for (const p of list) circle(ctx, p.x - p.r * 0.06, p.y - p.r * 0.12, p.r * 0.9);
  ctx.fill();
  ctx.fillStyle = CLOUD.light;
  ctx.beginPath();
  for (const p of list) circle(ctx, p.x - p.r * 0.22, p.y - p.r * 0.38, p.r * 0.5);
  ctx.fill();
}

/** A bank of puffy clouds along the horizon, piled high at the sides and low in the middle. */
function cloudBank(ctx: CanvasRenderingContext2D, s: Scene): void {
  const base = layerGround(s, 0.25) + s.u * 0.02;
  if (base - s.u * 0.4 > s.cssH) return;
  const list: { x: number; y: number; r: number }[] = [];
  const step = s.u * 0.06;
  for (let i = 0, x = -step; x < s.cssW + step; i++, x += step) {
    const side = Math.abs(x / s.cssW - 0.5) * 2;
    const pile = 0.25 + 0.95 * side * side;
    const r = s.u * (0.05 + hash(i + 600) * 0.04) * (0.7 + pile);
    list.push({ x, y: base - s.u * 0.12 * pile - r * 0.2, r });
    if (side > 0.45) list.push({ x: x + step * 0.5, y: base - s.u * 0.25 * pile, r: r * 0.75 });
  }
  puffs(ctx, list);
  ctx.fillStyle = CLOUD.shadow;
  ctx.fillRect(0, base, s.cssW, s.cssH - base + 10);
}

/** Small clouds at fixed heights: the scenery you climb past. */
function heights(ctx: CanvasRenderingContext2D, s: Scene): void {
  const p = 0.6;
  const base = layerGround(s, p);
  const unit = s.scale * p;
  const FIRST = 120;
  const SPAN = 110;
  const kMin = Math.max(0, Math.floor(((base - s.cssH - 200) / unit - FIRST) / SPAN));
  const kMax = Math.ceil(((base + 200) / unit - FIRST) / SPAN);
  for (let k = kMin; k <= kMax; k++) {
    const y = base - (FIRST + k * SPAN) * unit;
    if (y < -150 || y > s.cssH + 150) continue;
    const dir = k % 2 ? 1 : -1;
    const span = s.cssW + 300;
    const x = ((((hash(k) * span + dir * s.t * (6 + hash(k + 9) * 8)) % span) + span) % span) - 150;
    const r = s.u * (0.045 + hash(k + 3) * 0.03);
    puffs(ctx, [
      { x: x - r * 1.3, y: y + r * 0.2, r: r * 0.8 },
      { x, y: y - r * 0.2, r },
      { x: x + r * 1.2, y: y + r * 0.1, r: r * 0.85 },
      { x: x + r * 0.4, y: y + r * 0.35, r: r * 0.8 },
    ]);
  }
}

// ---------------------------------------------------------------- flyers

function flyingBat(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flap: number): void {
  const wing = Math.sin(flap) * size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - size * 0.5, y - wing - size * 0.2, x - size, y - wing);
  ctx.quadraticCurveTo(x - size * 0.6, y - wing * 0.3, x - size * 0.45, y + size * 0.1);
  ctx.quadraticCurveTo(x - size * 0.2, y, x, y + size * 0.15);
  ctx.quadraticCurveTo(x + size * 0.2, y, x + size * 0.45, y + size * 0.1);
  ctx.quadraticCurveTo(x + size * 0.6, y - wing * 0.3, x + size, y - wing);
  ctx.quadraticCurveTo(x + size * 0.5, y - wing - size * 0.2, x, y);
  ctx.fill();
}

function flyingWitch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: 1 | -1, t: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * size * 0.15);
  ctx.scale(dir, 1);
  ctx.rotate(-0.08);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "round";
  // Broomstick and bristles
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(-size * 1.1, size * 0.15);
  ctx.lineTo(size * 1.0, -size * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size * 0.95, size * 0.12);
  ctx.lineTo(-size * 1.6, -size * 0.12);
  ctx.lineTo(-size * 1.7, size * 0.22);
  ctx.lineTo(-size * 1.55, size * 0.45);
  ctx.closePath();
  ctx.fill();
  // Cape streaming behind, fluttering
  const flap = Math.sin(t * 9) * size * 0.12;
  ctx.beginPath();
  ctx.moveTo(size * 0.15, -size * 0.55);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.6 + flap, -size * 1.0, -size * 0.25 + flap);
  ctx.lineTo(-size * 0.7, -size * 0.1 - flap * 0.5);
  ctx.lineTo(-size * 0.85, size * 0.05 + flap * 0.3);
  ctx.lineTo(-size * 0.1, size * 0.1);
  ctx.closePath();
  ctx.fill();
  // Body hunched over the broom
  ctx.beginPath();
  ctx.moveTo(-size * 0.25, size * 0.08);
  ctx.quadraticCurveTo(-size * 0.1, -size * 0.6, size * 0.25, -size * 0.55);
  ctx.lineTo(size * 0.35, size * 0.02);
  ctx.closePath();
  ctx.fill();
  // Arm to the broom, leg dangling
  ctx.lineWidth = Math.max(1.5, size * 0.09);
  ctx.beginPath();
  ctx.moveTo(size * 0.2, -size * 0.35);
  ctx.lineTo(size * 0.55, size * 0.0);
  ctx.moveTo(-size * 0.05, size * 0.08);
  ctx.lineTo(size * 0.05, size * 0.4);
  ctx.lineTo(size * 0.2, size * 0.42);
  ctx.stroke();
  // Head, nose and hat
  ctx.beginPath();
  circle(ctx, size * 0.3, -size * 0.68, size * 0.15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 0.42, -size * 0.7);
  ctx.lineTo(size * 0.58, -size * 0.62);
  ctx.lineTo(size * 0.42, -size * 0.62);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 0.0, -size * 0.78);
  ctx.lineTo(size * 0.6, -size * 0.82);
  ctx.lineTo(size * 0.38, -size * 0.85);
  ctx.lineTo(size * 0.1, -size * 1.3);
  ctx.lineTo(size * 0.05, -size * 1.15);
  ctx.lineTo(size * 0.2, -size * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.lineCap = "butt";
}

/** Witches and bats as soft silhouettes against the sky, like distant balloons. */
function flyers(ctx: CanvasRenderingContext2D, s: Scene): void {
  ctx.fillStyle = FLYER;
  const passes = [
    { period: 13, offset: 0, y: 0.1, size: 0.05, dir: 1 as const },
    { period: 19, offset: 7, y: 0.33, size: 0.035, dir: -1 as const },
  ];
  for (const w of passes) {
    const p = ((s.t + w.offset) % w.period) / w.period;
    const span = s.cssW + s.u * 0.4;
    const along = p * span - s.u * 0.2;
    const x = w.dir === 1 ? along : s.cssW - along;
    const y = s.cssH * w.y + Math.sin(p * Math.PI * 2) * s.u * 0.03;
    flyingWitch(ctx, x, y, s.u * w.size, w.dir, s.t);
  }
  for (let i = 0; i < 3; i++) {
    const span = s.cssW + 120;
    const speed = 28 + i * 11;
    const x = ((s.t * speed + i * 170) % span) - 60;
    const y = s.cssH * (0.2 + i * 0.09) + Math.sin(s.t * 1.7 + i * 2) * 10;
    flyingBat(ctx, x, y, s.u * (0.035 - i * 0.006), s.t * (11 + i * 2));
  }
}

// ---------------------------------------------------------------- graveyard pieces

/** 0..1..0 envelope over a repeating cycle: rise, hold, sink, rest. */
function emerge(t: number, period: number, offset: number): number {
  const p = ((((t + offset) % period) + period) % period) / period;
  if (p < 0.2) return easeOut(p / 0.2);
  if (p < 0.65) return 1;
  if (p < 0.8) return 1 - easeOut((p - 0.65) / 0.15);
  return 0;
}

function easeOut(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

/** A tuft of cartoon grass blades. */
function tuft(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const bx = x + (i - 1.5) * size * 0.3;
    const h = size * (0.6 + hash(seed + i) * 0.6);
    ctx.moveTo(bx - size * 0.12, y);
    ctx.lineTo(bx + (hash(seed + i + 9) - 0.5) * size * 0.4, y - h);
    ctx.lineTo(bx + size * 0.12, y);
  }
  ctx.closePath();
  ctx.fillStyle = GRASS;
  ctx.fill();
  ink(ctx, Math.max(1, size * 0.08));
}

/** Heaped earth with an inked top edge. */
function mound(ctx: CanvasRenderingContext2D, s: Scene, x: number, y: number, rx: number): void {
  const ry = rx * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = mix(SOIL_TOP, "#7a68a8", 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.02, Math.PI * 1.98);
  ink(ctx, lineW(s));
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  oval(ctx, x - rx * 0.25, y - ry * 0.55, rx * 0.35, ry * 0.18);
  ctx.fill();
}

/** A weathered cartoon headstone: leaning, chipped, cracked, mossy, planted in its own mound. */
function tombstone(ctx: CanvasRenderingContext2D, s: Scene, x: number, groundY: number, w: number, h: number, seed: number): void {
  const tilt = (hash(seed) - 0.5) * 0.16;
  const r = w / 2;
  const lw = lineW(s);
  ctx.save();
  ctx.translate(x + r, groundY);
  ctx.rotate(tilt);

  const chipAt = 0.25 + hash(seed + 1) * 0.5;
  const a0 = Math.PI + chipAt * Math.PI - 0.22;
  const a1 = a0 + 0.44;
  const cy = -h + r;
  const sunk = w * 0.35; // runs on below the soil, so a lean never lifts a corner
  ctx.beginPath();
  ctx.moveTo(-r, sunk);
  ctx.lineTo(-r, cy);
  ctx.arc(0, cy, r, Math.PI, a0);
  ctx.lineTo(Math.cos((a0 + a1) / 2) * r * 0.72, cy + Math.sin((a0 + a1) / 2) * r * 0.72);
  ctx.arc(0, cy, r, a1, 0);
  ctx.lineTo(r, sunk);
  ctx.closePath();
  ctx.fillStyle = "#aaa7cb";
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Light left face, shaded right face
  ctx.fillStyle = "#c6c4e2";
  ctx.fillRect(-r, -h, w * 0.28, h + sunk);
  ctx.fillStyle = "#8c89b0";
  ctx.fillRect(r - w * 0.22, -h, w * 0.22, h + sunk);
  // Moss creeping up from the soil
  ctx.fillStyle = "#8cc04a";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) circle(ctx, -r + (i / 5) * w, 0, w * (0.1 + hash(seed + 30 + i) * 0.12));
  for (let i = 0; i < 3; i++) circle(ctx, -r + hash(seed + 40 + i) * w, -h * (0.2 + hash(seed + 50 + i) * 0.5), w * 0.05);
  ctx.fill();
  ctx.restore();

  // Re-trace the outline for ink
  ctx.beginPath();
  ctx.moveTo(-r, sunk);
  ctx.lineTo(-r, cy);
  ctx.arc(0, cy, r, Math.PI, a0);
  ctx.lineTo(Math.cos((a0 + a1) / 2) * r * 0.72, cy + Math.sin((a0 + a1) / 2) * r * 0.72);
  ctx.arc(0, cy, r, a1, 0);
  ctx.lineTo(r, sunk);
  ink(ctx, lw);

  // Crack from the top edge
  ctx.beginPath();
  let cx = (hash(seed + 2) - 0.5) * r;
  let ccy = -h + r - Math.sqrt(Math.max(0, r * r - cx * cx)) + 1;
  ctx.moveTo(cx, ccy);
  for (let i = 0; i < 4; i++) {
    cx += (hash(seed + 60 + i) - 0.5) * w * 0.3;
    ccy += h * 0.12;
    ctx.lineTo(cx, ccy);
  }
  ink(ctx, Math.max(1, lw * 0.7));

  ctx.fillStyle = "#6d6992";
  ctx.font = `700 ${Math.round(w * 0.3)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("RIP", 0, -h * 0.52);
  ctx.restore();

  mound(ctx, s, x + r, groundY + w * 0.12, r * 1.5);
  tuft(ctx, x - r * 0.1, groundY + w * 0.05, w * 0.22, seed * 7);
}

function jackOLantern(ctx: CanvasRenderingContext2D, s: Scene, px: number, bottom: number, pr: number): void {
  const py = bottom - pr;
  const lw = lineW(s);
  // Stem
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.1, py - pr * 0.85);
  ctx.quadraticCurveTo(px - pr * 0.05, py - pr * 1.3, px + pr * 0.2, py - pr * 1.35);
  ctx.lineTo(px + pr * 0.12, py - pr * 0.85);
  ctx.closePath();
  ctx.fillStyle = "#6a8a2a";
  ctx.fill();
  ink(ctx, lw);
  // Body with ribs
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.15, pr);
  ctx.fillStyle = "#ff9a2e";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#ffb85c";
  ctx.beginPath();
  oval(ctx, px - pr * 0.45, py - pr * 0.35, pr * 0.35, pr * 0.25);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 0.45, pr * 0.98, 0, Math.PI * 0.6, Math.PI * 1.4);
  ctx.moveTo(px + pr * 0.45 * Math.cos(-Math.PI * 0.4), py + pr * 0.98 * Math.sin(-Math.PI * 0.4));
  ctx.ellipse(px, py, pr * 0.45, pr * 0.98, 0, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = "#d9711a";
  ctx.lineWidth = Math.max(1, pr * 0.08);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.15, pr);
  ink(ctx, lw);
  // Glowing face
  const flicker = 0.85 + 0.15 * Math.sin(s.t * 9) * Math.sin(s.t * 5.3);
  ctx.fillStyle = `rgba(255, 226, 107, ${flicker})`;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(px + side * pr * 0.55, py - pr * 0.05);
    ctx.lineTo(px + side * pr * 0.15, py - pr * 0.05);
    ctx.lineTo(px + side * pr * 0.35, py - pr * 0.45);
    ctx.closePath();
  }
  ctx.moveTo(px - pr * 0.6, py + pr * 0.25);
  for (let i = 1; i <= 6; i++) ctx.lineTo(px - pr * 0.6 + (pr * 1.2 * i) / 6, py + pr * (i % 2 ? 0.45 : 0.25));
  ctx.lineTo(px + pr * 0.45, py + pr * 0.6);
  ctx.lineTo(px - pr * 0.45, py + pr * 0.6);
  ctx.closePath();
  ctx.fill();
  ink(ctx, Math.max(1, lw * 0.7));
}

/** A bony arm clawing up out of a mound. `up` 0..1 is how far it has come out. */
function skeletonArm(ctx: CanvasRenderingContext2D, s: Scene, x: number, y: number, len: number, up: number, seed: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const sway = Math.sin(t * 2.2 + seed) * 0.35;
  const a = -0.15 + sway * up;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - len * 2, y - len * 3, len * 4, len * 3);
  ctx.clip();
  const reach = len * up;
  const ex = x + Math.sin(a) * reach * 0.55;
  const ey = y - Math.cos(a) * reach * 0.55;
  const wx = ex + Math.sin(a * 1.6) * reach * 0.45;
  const wy = ey - Math.cos(a * 1.6) * reach * 0.45;
  const lw = lineW(s) * 0.7;
  // Fingers first, so the palm sits on top of their roots.
  const curl = 0.5 + 0.5 * Math.sin(t * 3 + seed * 2);
  ctx.beginPath();
  for (let f = 0; f < 4; f++) {
    const fa = a * 1.6 - 0.55 + f * 0.37;
    const k1x = wx + Math.sin(fa) * len * 0.13;
    const k1y = wy - Math.cos(fa) * len * 0.13;
    const fa2 = fa + curl * 0.9;
    ctx.moveTo(wx, wy);
    ctx.lineTo(k1x, k1y);
    ctx.lineTo(k1x + Math.sin(fa2) * len * 0.1, k1y - Math.cos(fa2) * len * 0.1);
  }
  ctx.moveTo(wx, wy);
  ctx.lineTo(wx + Math.sin(a * 1.6 - 1.3) * len * 0.12, wy - Math.cos(a * 1.6 - 1.3) * len * 0.12);
  inkedLine(ctx, BONE, Math.max(1.2, len * 0.045), lw);
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(ex, ey);
  ctx.lineTo(wx, wy);
  inkedLine(ctx, BONE, Math.max(2, len * 0.09), lw);
  ctx.beginPath();
  circle(ctx, ex, ey, len * 0.06);
  circle(ctx, wx, wy, len * 0.08);
  ctx.fillStyle = BONE;
  ctx.fill();
  ink(ctx, lw);
  ctx.restore();
}

/** A skull pushing up out of the dirt, jaw chattering. */
function risingSkull(ctx: CanvasRenderingContext2D, s: Scene, x: number, y: number, size: number, up: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const lw = lineW(s);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - size * 2, y - size * 3, size * 4, size * 3);
  ctx.clip();
  ctx.translate(x, y + (1 - up) * size * 1.6);
  ctx.rotate(Math.sin(t * 1.3) * 0.15 * up);
  const cy = -size * 0.95;
  const chat = Math.max(0, Math.sin(t * 9)) * size * 0.08;
  ctx.fillStyle = BONE;
  // Jaw
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, cy + size * 0.44 + chat);
  ctx.lineTo(size * 0.28, cy + size * 0.44 + chat);
  ctx.lineTo(size * 0.22, cy + size * 0.68 + chat);
  ctx.lineTo(-size * 0.22, cy + size * 0.68 + chat);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lw);
  // Cranium
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, cy + size * 0.05);
  ctx.arc(0, cy, size * 0.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(size * 0.5, cy + size * 0.35, size * 0.3, cy + size * 0.46);
  ctx.lineTo(-size * 0.3, cy + size * 0.46);
  ctx.quadraticCurveTo(-size * 0.5, cy + size * 0.35, -size * 0.5, cy + size * 0.05);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lw);
  // Shine, sockets, nose, teeth
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  oval(ctx, -size * 0.2, cy - size * 0.28, size * 0.12, size * 0.06);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, -size * 0.19, cy + size * 0.06, size * 0.13, size * 0.15);
  oval(ctx, size * 0.19, cy + size * 0.06, size * 0.13, size * 0.15);
  ctx.moveTo(0, cy + size * 0.2);
  ctx.lineTo(-size * 0.06, cy + size * 0.33);
  ctx.lineTo(size * 0.06, cy + size * 0.33);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * size * 0.09, cy + size * 0.44);
    ctx.lineTo(i * size * 0.09, cy + size * 0.54 + chat);
  }
  ink(ctx, Math.max(1, lw * 0.6));
  ctx.restore();
}

/** A pair of bony feet sticking up out of the dirt, toes wiggling. */
function bonyFeet(ctx: CanvasRenderingContext2D, s: Scene, x: number, y: number, len: number, up: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const lw = lineW(s) * 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - len * 2, y - len * 3, len * 4, len * 3);
  ctx.clip();
  for (const side of [-1, 1]) {
    const fx = x + side * len * 0.22;
    const top = y - len * 0.85 * up;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const wig = Math.sin(t * 6 + i + side) * 0.12;
      const ang = side * (0.15 + i * 0.22) + wig;
      const k1 = len * (0.2 - i * 0.015);
      const kx = fx + Math.sin(ang) * k1;
      const ky = top - Math.cos(ang) * k1;
      ctx.moveTo(fx, top);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.sin(ang + side * 0.5) * len * 0.08, ky - Math.cos(ang + side * 0.5) * len * 0.08);
    }
    inkedLine(ctx, BONE, Math.max(1.2, len * 0.05), lw);
    ctx.beginPath();
    ctx.moveTo(fx, y + 2);
    ctx.lineTo(fx, top);
    inkedLine(ctx, BONE, Math.max(2, len * 0.1), lw);
    ctx.beginPath();
    circle(ctx, fx, top, len * 0.08);
    ctx.fillStyle = BONE;
    ctx.fill();
    ink(ctx, lw);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- ground

/** The graveyard the tower stands on: fence, grass, soil, graves, and skeletons climbing out. */
function ground(ctx: CanvasRenderingContext2D, s: Scene): void {
  if (s.groundY - s.u * 0.2 > s.cssH) return;
  const gy = s.groundY;
  const u = s.u;
  const lw = lineW(s);

  // Iron fence behind the tower
  const fh = u * 0.08;
  ctx.beginPath();
  ctx.moveTo(0, gy - fh * 0.7);
  ctx.lineTo(s.cssW, gy - fh * 0.7);
  ctx.moveTo(0, gy - fh * 0.25);
  ctx.lineTo(s.cssW, gy - fh * 0.25);
  for (let x = u * 0.02; x < s.cssW; x += u * 0.035) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy - fh);
  }
  ctx.strokeStyle = "#3b3170";
  ctx.lineWidth = Math.max(1.5, u * 0.007);
  ctx.stroke();
  ctx.fillStyle = "#3b3170";
  ctx.beginPath();
  for (let x = u * 0.02; x < s.cssW; x += u * 0.035) {
    ctx.moveTo(x - u * 0.009, gy - fh);
    ctx.lineTo(x, gy - fh - u * 0.02);
    ctx.lineTo(x + u * 0.009, gy - fh);
    ctx.closePath();
  }
  ctx.fill();

  // Soil
  const g = ctx.createLinearGradient(0, gy, 0, gy + u * 0.6);
  g.addColorStop(0, SOIL_TOP);
  g.addColorStop(1, SOIL_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, s.cssW, s.cssH - gy + 10);
  // Pebbles
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  for (let i = 0; i < 26; i++) oval(ctx, hash(i + 700) * s.cssW, gy + u * (0.06 + hash(i + 710) * 0.4), u * 0.012, u * 0.006);
  ctx.fill();

  // Grass strip with jagged tips, inked underneath
  const band = u * 0.028;
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, gy, s.cssW, band);
  ctx.fillStyle = GRASS_DARK;
  ctx.beginPath();
  ctx.moveTo(0, gy + 1);
  for (let x = 0, i = 0; x <= s.cssW + 8; x += u * 0.014, i++) {
    ctx.lineTo(x + u * 0.007, gy - u * (0.006 + hash(i + 800) * 0.012));
    ctx.lineTo(x + u * 0.014, gy + 1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, gy + band);
  ctx.lineTo(s.cssW, gy + band);
  ink(ctx, lw);

  // Graves beside the tower, and a jack-o'-lantern behind it
  const tw = u * 0.09;
  tombstone(ctx, s, s.baseX - tw * 1.9, gy + u * 0.02, tw, tw * 1.35, 1);
  tombstone(ctx, s, s.baseX + s.baseW + tw * 1.35, gy + u * 0.025, tw * 0.85, tw * 1.15, 2);
  jackOLantern(ctx, s, s.baseX + s.baseW + tw * 0.62, gy + u * 0.02, u * 0.035);

  // Lower graveyard: skeletons coming up out of the ground
  const kx = s.cssW * 0.2;
  const ky = gy + u * 0.24;
  tombstone(ctx, s, kx - tw * 0.45, ky - u * 0.02, tw * 0.9, tw * 1.1, 3);
  risingSkull(ctx, s, kx, ky, u * 0.07, emerge(s.t, 9, 0));
  mound(ctx, s, kx, ky + 2, u * 0.1);

  const fx = s.cssW * 0.58;
  const fy = gy + u * 0.27;
  bonyFeet(ctx, s, fx, fy, u * 0.1, emerge(s.t, 10, 4));
  mound(ctx, s, fx, fy + 2, u * 0.09);

  for (const [ax, dy, len, seed] of [
    [0.8, 0.14, 0.11, 1],
    [0.92, 0.3, 0.08, 3],
  ] as const) {
    const x = s.cssW * ax;
    const y = gy + u * dy;
    skeletonArm(ctx, s, x, y, u * len, emerge(s.t, 7 + seed, seed * 2.3), seed);
    mound(ctx, s, x, y + 2, u * len * 0.7);
  }

  tuft(ctx, s.cssW * 0.4, gy + u * 0.17, u * 0.03, 11);
  tuft(ctx, s.cssW * 0.07, gy + u * 0.12, u * 0.025, 12);
}

export function background(ctx: CanvasRenderingContext2D, s: Scene): void {
  sky(ctx, s);
  moon(ctx, s);
  flyers(ctx, s);
  farTown(ctx, s);
  cloudBank(ctx, s);
  heights(ctx, s);
  ground(ctx, s);
}

// ---------------------------------------------------------------- foreground

/** Drawn in front of the tower: grass over a row of stone tiles, dropping away faster as you climb. */
export function foreground(ctx: CanvasRenderingContext2D, s: Scene): void {
  const top = layerGround(s, 1.6) + s.u * 0.36;
  if (top - s.u * 0.04 > s.cssH) return;
  const u = s.u;
  const lw = lineW(s);
  const band = u * 0.025;

  // Stone tiles
  ctx.fillStyle = "#3e5462";
  ctx.fillRect(0, top + band, s.cssW, s.cssH - top);
  const rowH = u * 0.08;
  for (let row = 0, y = top + band; y < s.cssH; row++, y += rowH) {
    let x = row % 2 ? -u * 0.05 : -u * 0.01;
    for (let i = 0; x < s.cssW; i++) {
      const w = u * (0.12 + hash(row * 31 + i) * 0.08);
      roundRectPath(ctx, x + 2, y + 2, w - 4, rowH - 4, u * 0.012);
      ctx.fillStyle = "#57707f";
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#6c8796";
      ctx.fillRect(x, y, w, rowH * 0.28);
      ctx.restore();
      roundRectPath(ctx, x + 2, y + 2, w - 4, rowH - 4, u * 0.012);
      ink(ctx, lw);
      x += w;
    }
  }

  // Grass lip with jagged tips
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, top, s.cssW, band);
  ctx.fillStyle = GRASS_DARK;
  ctx.beginPath();
  ctx.moveTo(0, top + 1);
  for (let x = 0, i = 0; x <= s.cssW + 8; x += u * 0.016, i++) {
    ctx.lineTo(x + u * 0.008, top - u * (0.008 + hash(i + 900) * 0.016));
    ctx.lineTo(x + u * 0.016, top + 1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, top + band);
  ctx.lineTo(s.cssW, top + band);
  ink(ctx, lw);
}

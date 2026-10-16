import type { Scene } from "./theme";

// Halloween scenery in parallax layers. Each layer's ground line sits at
//   groundY - rise * (1 - p)
// so p = 0 never moves (moon, far hills), p = 1 moves with the tower, and p > 1
// (foreground) drops away faster than the tower, which is what sells the depth.

const MOON = "#f7e8b5";

/** Linear blend of two #rrggbb colors. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** Closed circle as its own subpath, so several can share one fill without joining lines. */
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** Neon tube along the current path: a soft wide glow, then a crisp bright line. */
function neonEdge(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = width * 3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** Run `draw` with a neon glow around everything it paints (for detailed silhouettes). */
function withGlow(ctx: CanvasRenderingContext2D, color: string, blur: number, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

const NEON_PURPLE = "#c08bff";
const NEON_CYAN = "#7ff3ff";
const NEON_GREEN = "#8dff6a";
const NEON_ORANGE = "#ffb347";
const NEON_BONE = "#d6fbff";

/** Deterministic 0..1 noise from an integer. */
function hash(i: number): number {
  const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return v - Math.floor(v);
}

function layerGround(s: Scene, p: number): number {
  return s.groundY - s.rise * (1 - p);
}

/** 0 at the ground, 1 once the tower is high in the night sky. */
function altitude01(s: Scene): number {
  return Math.min(1, s.altitude / 600);
}

// Fixed star field, as fractions of the screen.
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.85,
  r: 0.6 + hash(i + 200) * 1.2,
}));

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

function sky(ctx: CanvasRenderingContext2D, s: Scene): void {
  const a = altitude01(s);
  // Twilight near the ground, deep night high up.
  const g = ctx.createLinearGradient(0, 0, 0, s.cssH);
  g.addColorStop(0, mix("#3d2a6e", "#0e0820", a));
  g.addColorStop(0.55, mix("#7a3f86", "#24123e", a));
  g.addColorStop(1, mix("#e07a4a", "#4a2060", a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  ctx.fillStyle = "#ffffff";
  for (const [i, st] of STARS.entries()) {
    // More stars come out as you climb.
    const visible = st.y < 0.35 + a * 0.6 ? 1 : 0;
    ctx.globalAlpha = visible * (0.4 + 0.35 * Math.sin(s.t * 1.5 + i)) * (0.5 + a * 0.5);
    ctx.fillRect(st.x * s.cssW, st.y * s.cssH, st.r, st.r);
  }
  ctx.globalAlpha = 1;
}

function moon(ctx: CanvasRenderingContext2D, s: Scene): void {
  const a = altitude01(s);
  const mx = s.cssW * 0.18;
  const my = s.cssH * 0.1;
  // The moon grows a little as you climb toward it.
  const mr = s.u * (0.075 + a * 0.035);
  ctx.save();
  ctx.shadowColor = MOON;
  ctx.shadowBlur = mr * 1.4;
  ctx.fillStyle = MOON;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(180, 160, 110, 0.35)";
  ctx.beginPath();
  circle(ctx, mx - mr * 0.3, my - mr * 0.2, mr * 0.18);
  circle(ctx, mx + mr * 0.35, my + mr * 0.3, mr * 0.12);
  ctx.fill();
}

/** Far layer: rolling hills with a haunted mansion. Barely moves. */
function farHills(ctx: CanvasRenderingContext2D, s: Scene): void {
  const gy = layerGround(s, 0.12) - s.u * 0.06;
  if (gy - s.u * 0.4 > s.cssH) return;
  const hillY = (x: number) =>
    gy - s.u * (0.08 + 0.05 * Math.sin(x / (s.u * 0.18)) + 0.03 * Math.sin(x / (s.u * 0.07) + 1));

  // Mansion first, so the hill covers its foundation and it sits *in* the hill.
  const hx = s.cssW * 0.8;
  const hw = s.u * 0.16;
  let lowest = 0;
  for (let x = hx - hw / 2; x <= hx + hw / 2; x += 2) lowest = Math.max(lowest, hillY(x));
  const hb = lowest + hw * 0.05;
  ctx.fillStyle = "#24143a";
  ctx.fillRect(hx - hw / 2, hb - hw * 0.62, hw, hw * 0.62);
  ctx.beginPath();
  ctx.moveTo(hx - hw * 0.6, hb - hw * 0.62);
  ctx.lineTo(hx, hb - hw * 1.02);
  ctx.lineTo(hx + hw * 0.6, hb - hw * 0.62);
  ctx.fill();
  ctx.fillRect(hx + hw * 0.32, hb - hw * 1.12, hw * 0.16, hw * 0.6); // tower
  ctx.beginPath();
  ctx.moveTo(hx + hw * 0.28, hb - hw * 1.12);
  ctx.lineTo(hx + hw * 0.4, hb - hw * 1.37);
  ctx.lineTo(hx + hw * 0.52, hb - hw * 1.12);
  ctx.fill();
  // Neon outline of the whole silhouette (the hill hides the bottom edge).
  ctx.beginPath();
  ctx.moveTo(hx - hw / 2, hb);
  ctx.lineTo(hx - hw / 2, hb - hw * 0.62);
  ctx.lineTo(hx - hw * 0.6, hb - hw * 0.62);
  ctx.lineTo(hx, hb - hw * 1.02);
  ctx.lineTo(hx + hw * 0.32, hb - hw * 0.78);
  ctx.lineTo(hx + hw * 0.32, hb - hw * 1.12);
  ctx.lineTo(hx + hw * 0.28, hb - hw * 1.12);
  ctx.lineTo(hx + hw * 0.4, hb - hw * 1.37);
  ctx.lineTo(hx + hw * 0.52, hb - hw * 1.12);
  ctx.lineTo(hx + hw * 0.48, hb - hw * 1.12);
  ctx.lineTo(hx + hw * 0.48, hb - hw * 0.66);
  ctx.lineTo(hx + hw * 0.6, hb - hw * 0.62);
  ctx.lineTo(hx + hw / 2, hb - hw * 0.62);
  ctx.lineTo(hx + hw / 2, hb);
  neonEdge(ctx, NEON_PURPLE, Math.max(1, hw * 0.02));

  ctx.fillStyle = "#ffd860";
  const win = hw * 0.1;
  for (const [fx, fy] of [
    [-0.3, -0.45],
    [-0.05, -0.45],
    [0.18, -0.3],
    [0.37, -0.97],
  ] as const) {
    if (Math.sin(s.t * 0.7 + fx * 9) > -0.6) ctx.fillRect(hx + hw * fx, hb + hw * fy, win, win * 1.3);
  }

  ctx.fillStyle = "#3a2252";
  ctx.beginPath();
  ctx.moveTo(0, s.cssH);
  for (let x = 0; x <= s.cssW; x += 6) ctx.lineTo(x, hillY(x));
  ctx.lineTo(s.cssW, hillY(s.cssW));
  ctx.lineTo(s.cssW, s.cssH);
  ctx.closePath();
  ctx.fill();
  // Faint moonlit rim on the hilltops
  ctx.strokeStyle = "rgba(200, 170, 255, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= s.cssW; x += 6) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, hillY(x));
  ctx.stroke();
}

function deadTree(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, depth: number, seed: number): void {
  const x2 = x + Math.sin(angle) * len;
  const y2 = y - Math.cos(angle) * len;
  ctx.lineWidth = Math.max(1, len * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (depth === 0) return;
  const spread = 0.45 + hash(seed) * 0.35;
  deadTree(ctx, x2, y2, len * 0.68, angle - spread, depth - 1, seed * 3 + 1);
  deadTree(ctx, x2, y2, len * 0.62, angle + spread * 0.8, depth - 1, seed * 3 + 2);
}

/** Middle layer: a ridge of dead trees. Moves at half the tower's speed. */
function midTrees(ctx: CanvasRenderingContext2D, s: Scene): void {
  const gy = layerGround(s, 0.45) - s.u * 0.02;
  if (gy - s.u * 0.5 > s.cssH) return;
  ctx.fillStyle = "#2a1838";
  ctx.beginPath();
  ctx.moveTo(0, s.cssH);
  ctx.lineTo(0, gy);
  ctx.quadraticCurveTo(s.cssW * 0.25, gy - s.u * 0.05, s.cssW * 0.5, gy);
  ctx.quadraticCurveTo(s.cssW * 0.75, gy + s.u * 0.04, s.cssW, gy - s.u * 0.02);
  ctx.lineTo(s.cssW, s.cssH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1838";
  ctx.lineCap = "round";
  for (const [fx, size, seed] of [
    [0.07, 0.17, 1],
    [0.3, 0.12, 2],
    [0.72, 0.14, 3],
    [0.94, 0.19, 4],
  ] as const) {
    deadTree(ctx, s.cssW * fx, gy + s.u * 0.02, s.u * size, (hash(seed) - 0.5) * 0.3, 4, seed);
  }
  ctx.lineCap = "butt";
}

/** Fog banks and clouds at fixed heights: the scenery you climb past. */
function heights(ctx: CanvasRenderingContext2D, s: Scene): void {
  const p = 0.6;
  const base = layerGround(s, p);
  const unit = s.scale * p;
  // Things repeat every SPAN world units, starting FIRST units up.
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
    cloud(ctx, x, y, s.u * (0.18 + hash(k + 3) * 0.14), k % 3 === 0);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fog: boolean): void {
  ctx.fillStyle = fog ? "rgba(210, 190, 240, 0.16)" : "rgba(235, 220, 255, 0.22)";
  ctx.beginPath();
  oval(ctx, x, y, r * (fog ? 2.4 : 1.2), r * 0.35);
  oval(ctx, x - r * 0.5, y - r * 0.15, r * 0.6, r * 0.32);
  oval(ctx, x + r * 0.45, y - r * 0.1, r * 0.55, r * 0.3);
  ctx.fill();
}

/** A weathered headstone: leaning, chipped, cracked, mossy, with worn lettering and a neon rim. */
function tombstone(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number, h: number, seed: number): void {
  const tilt = (hash(seed) - 0.5) * 0.16;
  const r = w / 2;
  ctx.save();
  ctx.translate(x + r, groundY);
  ctx.rotate(tilt);

  // Outline with a chip knocked out of the top edge.
  const chipAt = 0.25 + hash(seed + 1) * 0.5; // along the arch, 0..1 = left..right
  const a0 = Math.PI + chipAt * Math.PI - 0.22;
  const a1 = a0 + 0.44;
  const cy = -h + r;
  ctx.beginPath();
  ctx.moveTo(-r, 2);
  ctx.lineTo(-r, cy);
  ctx.arc(0, cy, r, Math.PI, a0);
  ctx.lineTo(Math.cos((a0 + a1) / 2) * r * 0.72, cy + Math.sin((a0 + a1) / 2) * r * 0.72);
  ctx.arc(0, cy, r, a1, 0);
  ctx.lineTo(r, 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -h, r, 0);
  g.addColorStop(0, "#6e6488");
  g.addColorStop(1, "#4a4262");
  ctx.fillStyle = g;
  ctx.fill();
  neonEdge(ctx, NEON_PURPLE, Math.max(1, w * 0.035));

  ctx.save();
  ctx.clip();
  // Stains running down
  ctx.fillStyle = "rgba(20, 10, 30, 0.18)";
  for (let i = 0; i < 3; i++) {
    const sx = -r + hash(seed + 10 + i) * w;
    ctx.fillRect(sx, -h, w * 0.06, h * (0.4 + hash(seed + 20 + i) * 0.5));
  }
  // Moss creeping up from the soil
  ctx.fillStyle = "rgba(90, 140, 70, 0.7)";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const mx = -r + (i / 5) * w;
    circle(ctx, mx, 0, w * (0.1 + hash(seed + 30 + i) * 0.12));
  }
  for (let i = 0; i < 3; i++) circle(ctx, -r + hash(seed + 40 + i) * w, -h * (0.2 + hash(seed + 50 + i) * 0.5), w * 0.04);
  ctx.fill();
  ctx.restore();

  // A crack from the top edge
  ctx.strokeStyle = "rgba(25, 15, 35, 0.75)";
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  let cx = (hash(seed + 2) - 0.5) * r;
  let ccy = -h + r - Math.sqrt(Math.max(0, r * r - cx * cx)) + 1;
  ctx.moveTo(cx, ccy);
  for (let i = 0; i < 4; i++) {
    cx += (hash(seed + 60 + i) - 0.5) * w * 0.3;
    ccy += h * 0.12;
    ctx.lineTo(cx, ccy);
  }
  ctx.stroke();

  // Worn engraving
  ctx.fillStyle = "rgba(40, 30, 60, 0.6)";
  ctx.font = `700 ${Math.round(w * 0.3)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("RIP", 0, -h * 0.52);
  ctx.restore();
}

const SILHOUETTE = "#07040b";
const BONE = "#e9e1c9";
const DIRT = "#2b1b26";

/** 0..1..0 envelope over a repeating cycle: rise, hold, sink, rest. */
function emerge(t: number, period: number, offset: number): number {
  const p = (((t + offset) % period) + period) % period / period;
  if (p < 0.2) return easeOut(p / 0.2);
  if (p < 0.65) return 1;
  if (p < 0.8) return 1 - easeOut((p - 0.65) / 0.15);
  return 0;
}

function easeOut(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function dirtMound(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = DIRT;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.32, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.12, r * 0.5, r * 0.1, 0, Math.PI, 0);
  ctx.fill();
}

/** A bony arm clawing up out of a mound. `up` 0..1 is how far it has come out. */
function skeletonArm(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, up: number, t: number, seed: number): void {
  if (up <= 0.01) return;
  const sway = Math.sin(t * 2.2 + seed) * 0.35;
  const a = -0.15 + sway * up; // radians from vertical
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - len * 2, y - len * 3, len * 4, len * 3); // only above the soil
  ctx.clip();
  const reach = len * up;
  const ex = x + Math.sin(a) * reach * 0.55;
  const ey = y - Math.cos(a) * reach * 0.55;
  const wx = ex + Math.sin(a * 1.6) * reach * 0.45;
  const wy = ey - Math.cos(a * 1.6) * reach * 0.45;
  ctx.strokeStyle = BONE;
  ctx.fillStyle = BONE;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, len * 0.09);
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(ex, ey);
  ctx.lineTo(wx, wy);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, ex, ey, len * 0.06); // elbow
  circle(ctx, wx, wy, len * 0.08); // palm
  ctx.fill();
  // Fingers curl open and shut.
  const curl = 0.5 + 0.5 * Math.sin(t * 3 + seed * 2);
  ctx.lineWidth = Math.max(1.2, len * 0.045);
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
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = "butt";
}

/** A skull pushing up out of the dirt, jaw chattering. */
function risingSkull(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, up: number, t: number): void {
  if (up <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - size * 2, y - size * 3, size * 4, size * 3);
  ctx.clip();
  const tilt = Math.sin(t * 1.3) * 0.15 * up;
  ctx.translate(x, y + (1 - up) * size * 1.6);
  ctx.rotate(tilt);
  const cy = -size * 0.95;
  // Cranium and cheekbones
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, cy + size * 0.05);
  ctx.arc(0, cy, size * 0.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(size * 0.5, cy + size * 0.35, size * 0.3, cy + size * 0.42);
  ctx.lineTo(-size * 0.3, cy + size * 0.42);
  ctx.quadraticCurveTo(-size * 0.5, cy + size * 0.35, -size * 0.5, cy + size * 0.05);
  ctx.closePath();
  ctx.fill();
  // Jaw, chattering
  const chat = Math.max(0, Math.sin(t * 9)) * size * 0.08;
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, cy + size * 0.46 + chat);
  ctx.lineTo(size * 0.28, cy + size * 0.46 + chat);
  ctx.lineTo(size * 0.22, cy + size * 0.68 + chat);
  ctx.lineTo(-size * 0.22, cy + size * 0.68 + chat);
  ctx.closePath();
  ctx.fill();
  // Sockets with a faint glow, nose, teeth
  ctx.fillStyle = "#1a1030";
  ctx.beginPath();
  oval(ctx, -size * 0.19, cy + size * 0.05, size * 0.13, size * 0.15);
  oval(ctx, size * 0.19, cy + size * 0.05, size * 0.13, size * 0.15);
  ctx.moveTo(0, cy + size * 0.18);
  ctx.lineTo(-size * 0.06, cy + size * 0.32);
  ctx.lineTo(size * 0.06, cy + size * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = NEON_CYAN;
  ctx.beginPath();
  circle(ctx, -size * 0.19, cy + size * 0.07, size * 0.035);
  circle(ctx, size * 0.19, cy + size * 0.07, size * 0.035);
  ctx.fill();
  ctx.strokeStyle = "#1a1030";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * size * 0.09, cy + size * 0.42);
    ctx.lineTo(i * size * 0.09, cy + size * 0.52 + chat);
  }
  ctx.stroke();
  ctx.restore();
}

/** A pair of bony feet sticking up out of the dirt, toes wiggling. */
function bonyFeet(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, up: number, t: number): void {
  if (up <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - len * 2, y - len * 3, len * 4, len * 3);
  ctx.clip();
  ctx.strokeStyle = BONE;
  ctx.fillStyle = BONE;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const fx = x + side * len * 0.22;
    const top = y - len * 0.85 * up;
    // Shin
    ctx.lineWidth = Math.max(2, len * 0.1);
    ctx.beginPath();
    ctx.moveTo(fx, y + 2);
    ctx.lineTo(fx, top);
    ctx.stroke();
    // Heel and sole pointing outward, toes curling
    ctx.beginPath();
    circle(ctx, fx, top, len * 0.08);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, len * 0.05);
    ctx.beginPath();
    // Five toe bones fanning up and outward from the top of the shin.
    for (let i = 0; i < 5; i++) {
      const wig = Math.sin(t * 6 + i + side) * 0.12;
      const ang = side * (0.15 + i * 0.22) + wig; // from vertical
      const k1 = len * (0.2 - i * 0.015);
      const kx = fx + Math.sin(ang) * k1;
      const ky = top - Math.cos(ang) * k1;
      ctx.moveTo(fx, top);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.sin(ang + side * 0.5) * len * 0.08, ky - Math.cos(ang + side * 0.5) * len * 0.08);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineCap = "butt";
}


function flyingWitch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: 1 | -1, t: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * size * 0.15);
  ctx.scale(dir, 1);
  ctx.rotate(-0.08);
  ctx.fillStyle = SILHOUETTE;
  ctx.strokeStyle = SILHOUETTE;
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
  ctx.arc(size * 0.3, -size * 0.68, size * 0.15, 0, Math.PI * 2);
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

function witches(ctx: CanvasRenderingContext2D, s: Scene): void {
  // Two witches on different loops; the first crosses the moon.
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
    withGlow(ctx, NEON_GREEN, s.u * w.size * 0.45, () => flyingWitch(ctx, x, y, s.u * w.size, w.dir, s.t));
  }
}

/** The graveyard the tower stands on: fence, ground, graves, and things climbing out of them. */
function ground(ctx: CanvasRenderingContext2D, s: Scene): void {
  if (s.groundY - s.u * 0.2 > s.cssH) return;
  const gy = s.groundY;
  const u = s.u;

  // Iron fence behind the tower.
  ctx.strokeStyle = "#1e1430";
  ctx.fillStyle = "#1e1430";
  ctx.lineWidth = Math.max(1.5, u * 0.006);
  const fh = u * 0.09;
  ctx.beginPath();
  ctx.moveTo(0, gy - fh * 0.75);
  ctx.lineTo(s.cssW, gy - fh * 0.75);
  ctx.moveTo(0, gy - fh * 0.25);
  ctx.lineTo(s.cssW, gy - fh * 0.25);
  for (let x = u * 0.02; x < s.cssW; x += u * 0.035) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy - fh);
  }
  ctx.stroke();
  for (let x = u * 0.02; x < s.cssW; x += u * 0.035) {
    ctx.beginPath();
    ctx.moveTo(x - u * 0.008, gy - fh);
    ctx.lineTo(x, gy - fh - u * 0.018);
    ctx.lineTo(x + u * 0.008, gy - fh);
    ctx.fill();
  }

  // Ground, lit from the moon along its edge.
  const g = ctx.createLinearGradient(0, gy - u * 0.03, 0, gy + u * 0.6);
  g.addColorStop(0, "#2c1c3e");
  g.addColorStop(1, "#130b1d");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, gy + u * 0.04);
  ctx.quadraticCurveTo(s.cssW / 2, gy - u * 0.03, s.cssW, gy + u * 0.04);
  ctx.lineTo(s.cssW, s.cssH);
  ctx.lineTo(0, s.cssH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(190, 160, 240, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, gy + u * 0.04);
  ctx.quadraticCurveTo(s.cssW / 2, gy - u * 0.03, s.cssW, gy + u * 0.04);
  ctx.stroke();

  // Graves beside the tower, and a jack-o'-lantern keeping watch behind it.
  const tw = u * 0.09;
  tombstone(ctx, s.baseX - tw * 1.9, gy + u * 0.02, tw, tw * 1.35, 1);
  tombstone(ctx, s.baseX + s.baseW + tw * 1.35, gy + u * 0.025, tw * 0.85, tw * 1.15, 2);
  jackOLantern(ctx, s.baseX + s.baseW + tw * 0.62, gy + u * 0.02, u * 0.035, s.t);

  // Lower graveyard: skeletons coming up out of the ground. Only the bones glow.
  const bones = (draw: () => void) => withGlow(ctx, NEON_BONE, u * 0.025, draw);

  const kx = s.cssW * 0.2;
  const ky = gy + u * 0.24;
  tombstone(ctx, kx - tw * 0.45, ky - u * 0.05, tw * 0.9, tw * 1.1, 3);
  bones(() => risingSkull(ctx, kx, ky, u * 0.07, emerge(s.t, 9, 0), s.t));
  dirtMound(ctx, kx, ky + 2, u * 0.1);

  const fx = s.cssW * 0.58;
  const fy = gy + u * 0.27;
  bones(() => bonyFeet(ctx, fx, fy, u * 0.1, emerge(s.t, 10, 4), s.t));
  dirtMound(ctx, fx, fy + 2, u * 0.09);

  for (const [ax, dy, len, seed] of [
    [0.8, 0.14, 0.11, 1],
    [0.92, 0.3, 0.08, 3],
  ] as const) {
    const x = s.cssW * ax;
    const y = gy + u * dy;
    bones(() => skeletonArm(ctx, x, y, u * len, emerge(s.t, 7 + seed, seed * 2.3), s.t, seed));
    dirtMound(ctx, x, y + 2, u * len * 0.7);
  }
}

export function background(ctx: CanvasRenderingContext2D, s: Scene): void {
  sky(ctx, s);
  moon(ctx, s);
  farHills(ctx, s);

  witches(ctx, s);

  // Bats crossing the sky, in screen space.
  ctx.fillStyle = SILHOUETTE;
  for (let i = 0; i < 3; i++) {
    const span = s.cssW + 120;
    const speed = 28 + i * 11;
    const x = ((s.t * speed + i * 170) % span) - 60;
    const y = s.cssH * (0.2 + i * 0.09) + Math.sin(s.t * 1.7 + i * 2) * 10;
    withGlow(ctx, NEON_PURPLE, s.u * 0.015, () =>
      flyingBat(ctx, x, y, s.u * (0.035 - i * 0.006), s.t * (11 + i * 2)),
    );
  }

  midTrees(ctx, s);
  heights(ctx, s);
  ground(ctx, s);
}

function jackOLantern(ctx: CanvasRenderingContext2D, px: number, bottom: number, pr: number, t: number): void {
  const py = bottom - pr;
  ctx.save();
  ctx.shadowColor = "#ff8a1f";
  ctx.shadowBlur = pr * 1.2;
  ctx.fillStyle = "#e0661a";
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 1.15, pr, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  neonEdge(ctx, NEON_ORANGE, Math.max(1, pr * 0.07));
  ctx.strokeStyle = "rgba(120, 40, 0, 0.45)";
  ctx.lineWidth = Math.max(1, pr * 0.08);
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 0.45, pr * 0.98, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#2b5a1a";
  ctx.fillRect(px - pr * 0.08, py - pr * 1.25, pr * 0.16, pr * 0.35);
  const flicker = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 5.3);
  ctx.fillStyle = `rgba(255, 216, 96, ${flicker})`;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(px + side * pr * 0.55, py - pr * 0.05);
    ctx.lineTo(px + side * pr * 0.15, py - pr * 0.05);
    ctx.lineTo(px + side * pr * 0.35, py - pr * 0.45);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.6, py + pr * 0.25);
  for (let i = 1; i <= 6; i++) ctx.lineTo(px - pr * 0.6 + (pr * 1.2 * i) / 6, py + pr * (i % 2 ? 0.45 : 0.25));
  ctx.lineTo(px + pr * 0.45, py + pr * 0.6);
  ctx.lineTo(px - pr * 0.45, py + pr * 0.6);
  ctx.closePath();
  ctx.fill();
}

/** Drawn in front of the tower: a low grassy rise that drops away faster than the tower. */
export function foreground(ctx: CanvasRenderingContext2D, s: Scene): void {
  const top = layerGround(s, 1.6) + s.u * 0.32;
  if (top - s.u * 0.06 > s.cssH) return;
  ctx.fillStyle = "#0b0612";
  ctx.beginPath();
  ctx.moveTo(0, top - s.u * 0.03);
  ctx.quadraticCurveTo(s.cssW * 0.25, top + s.u * 0.04, s.cssW * 0.55, top + s.u * 0.03);
  ctx.quadraticCurveTo(s.cssW * 0.85, top + s.u * 0.01, s.cssW, top - s.u * 0.04);
  ctx.lineTo(s.cssW, s.cssH + 10);
  ctx.lineTo(0, s.cssH + 10);
  ctx.closePath();
  ctx.fill();

  // Grass and weeds along the edge, taller at the sides to frame the tower.
  ctx.strokeStyle = "#0b0612";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const gx = (i / 70) * s.cssW + hash(i) * 6;
    const t01 = gx / s.cssW;
    const edge = top + s.u * (0.035 * Math.sin(t01 * Math.PI) - 0.02);
    const side = Math.abs(t01 - 0.5) * 2; // 0 center, 1 edges
    const len = s.u * (0.015 + hash(i + 50) * 0.03 + side * side * 0.06);
    ctx.lineWidth = Math.max(1.5, s.u * 0.006);
    ctx.moveTo(gx, edge + 3);
    ctx.quadraticCurveTo(gx, edge - len * 0.6, gx + (hash(i + 7) - 0.5) * len, edge - len);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

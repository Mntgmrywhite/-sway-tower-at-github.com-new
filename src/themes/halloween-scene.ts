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
  ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, Math.PI * 2);
  ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

/** Far layer: rolling hills with a haunted mansion. Barely moves. */
function farHills(ctx: CanvasRenderingContext2D, s: Scene): void {
  const gy = layerGround(s, 0.12) - s.u * 0.06;
  if (gy - s.u * 0.4 > s.cssH) return;
  ctx.fillStyle = "#3a2252";
  ctx.beginPath();
  ctx.moveTo(0, s.cssH);
  for (let x = 0; x <= s.cssW; x += 8) {
    const y = gy - s.u * (0.08 + 0.05 * Math.sin(x / (s.u * 0.18)) + 0.03 * Math.sin(x / (s.u * 0.07) + 1));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(s.cssW, s.cssH);
  ctx.closePath();
  ctx.fill();

  // Mansion on the right-hand hill.
  const hx = s.cssW * 0.8;
  const hb = gy - s.u * 0.1;
  const hw = s.u * 0.16;
  ctx.fillStyle = "#24143a";
  ctx.fillRect(hx - hw / 2, hb - hw * 0.55, hw, hw * 0.6);
  ctx.beginPath();
  ctx.moveTo(hx - hw * 0.6, hb - hw * 0.55);
  ctx.lineTo(hx, hb - hw * 0.95);
  ctx.lineTo(hx + hw * 0.6, hb - hw * 0.55);
  ctx.fill();
  ctx.fillRect(hx + hw * 0.32, hb - hw * 1.05, hw * 0.16, hw * 0.55); // tower
  ctx.beginPath();
  ctx.moveTo(hx + hw * 0.28, hb - hw * 1.05);
  ctx.lineTo(hx + hw * 0.4, hb - hw * 1.3);
  ctx.lineTo(hx + hw * 0.52, hb - hw * 1.05);
  ctx.fill();
  ctx.fillStyle = "#ffd860";
  const win = hw * 0.1;
  for (const [fx, fy] of [
    [-0.3, -0.4],
    [-0.05, -0.4],
    [0.18, -0.25],
    [0.37, -0.9],
  ] as const) {
    if (Math.sin(s.t * 0.7 + fx * 9) > -0.6) ctx.fillRect(hx + hw * fx, hb + hw * fy, win, win * 1.3);
  }
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

/** Fog banks, clouds and ghosts at fixed heights: the scenery you climb past. */
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
    if (k % 3 === 2) ghost(ctx, x, y + Math.sin(s.t * 1.3 + k) * 8, s.u * 0.06, s.t);
    else cloud(ctx, x, y, s.u * (0.18 + hash(k + 3) * 0.14), k % 3 === 0);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fog: boolean): void {
  ctx.fillStyle = fog ? "rgba(210, 190, 240, 0.16)" : "rgba(235, 220, 255, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, r * (fog ? 2.4 : 1.2), r * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.5, y - r * 0.15, r * 0.6, r * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.45, y - r * 0.1, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function ghost(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number): void {
  ctx.fillStyle = "rgba(240, 240, 255, 0.75)";
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  const bottom = y + r * 1.3;
  ctx.lineTo(x + r, bottom);
  for (let i = 0; i < 4; i++) {
    const wx = x + r - (i + 1) * (r / 2);
    ctx.quadraticCurveTo(wx + r / 4, bottom - r * 0.3 * (1 + Math.sin(t * 6 + i)), wx, bottom);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1030";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.35, y, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y + r * 0.5, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function tombstone(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, groundY + 2);
  ctx.lineTo(x, groundY - h + w / 2);
  ctx.arc(x + w / 2, groundY - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, groundY + 2);
  ctx.closePath();
  ctx.fillStyle = "#5a4f72";
  ctx.fill();
  ctx.fillStyle = "#3a3150";
  ctx.font = `700 ${Math.round(w * 0.32)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("RIP", x + w / 2, groundY - h * 0.45);
}

/** The graveyard the tower stands on: ground, iron fence, tombstones. */
function ground(ctx: CanvasRenderingContext2D, s: Scene): void {
  if (s.groundY - s.u * 0.2 > s.cssH) return;
  const gy = s.groundY;

  // Iron fence behind the tower.
  ctx.strokeStyle = "#1a1226";
  ctx.fillStyle = "#1a1226";
  ctx.lineWidth = Math.max(1.5, s.u * 0.006);
  const fh = s.u * 0.09;
  ctx.beginPath();
  ctx.moveTo(0, gy - fh * 0.75);
  ctx.lineTo(s.cssW, gy - fh * 0.75);
  ctx.moveTo(0, gy - fh * 0.25);
  ctx.lineTo(s.cssW, gy - fh * 0.25);
  for (let x = s.u * 0.02; x < s.cssW; x += s.u * 0.035) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy - fh);
  }
  ctx.stroke();
  for (let x = s.u * 0.02; x < s.cssW; x += s.u * 0.035) {
    ctx.beginPath();
    ctx.moveTo(x - s.u * 0.008, gy - fh);
    ctx.lineTo(x, gy - fh - s.u * 0.018);
    ctx.lineTo(x + s.u * 0.008, gy - fh);
    ctx.fill();
  }

  ctx.fillStyle = "#1a1226";
  ctx.beginPath();
  ctx.moveTo(0, gy + s.u * 0.04);
  ctx.quadraticCurveTo(s.cssW / 2, gy - s.u * 0.03, s.cssW, gy + s.u * 0.04);
  ctx.lineTo(s.cssW, s.cssH);
  ctx.lineTo(0, s.cssH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2f5e";
  ctx.lineWidth = 2;
  ctx.stroke();

  const tw = s.u * 0.09;
  tombstone(ctx, s.baseX - tw * 2.1, gy + s.u * 0.02, tw, tw * 1.35);
  tombstone(ctx, s.baseX + s.baseW + tw * 1.2, gy + s.u * 0.025, tw * 0.85, tw * 1.15);
  tombstone(ctx, s.baseX - tw * 3.6, gy + s.u * 0.03, tw * 0.7, tw * 0.95);
}

export function background(ctx: CanvasRenderingContext2D, s: Scene): void {
  sky(ctx, s);
  moon(ctx, s);
  farHills(ctx, s);

  // Bats crossing the sky, in screen space.
  ctx.fillStyle = "#07040b";
  for (let i = 0; i < 3; i++) {
    const span = s.cssW + 120;
    const speed = 28 + i * 11;
    const x = ((s.t * speed + i * 170) % span) - 60;
    const y = s.cssH * (0.2 + i * 0.09) + Math.sin(s.t * 1.7 + i * 2) * 10;
    flyingBat(ctx, x, y, s.u * (0.035 - i * 0.006), s.t * (11 + i * 2));
  }

  midTrees(ctx, s);
  heights(ctx, s);
  ground(ctx, s);
}

/** Drawn in front of the tower: drops away faster than the tower as you climb. */
export function foreground(ctx: CanvasRenderingContext2D, s: Scene): void {
  const top = layerGround(s, 1.6) + s.u * 0.12;
  if (top > s.cssH) return;
  ctx.fillStyle = "#0b0612";
  ctx.beginPath();
  ctx.moveTo(0, top - s.u * 0.02);
  ctx.quadraticCurveTo(s.cssW * 0.3, top + s.u * 0.05, s.cssW * 0.55, top + s.u * 0.02);
  ctx.quadraticCurveTo(s.cssW * 0.8, top - s.u * 0.01, s.cssW, top + s.u * 0.04);
  ctx.lineTo(s.cssW, s.cssH + 10);
  ctx.lineTo(0, s.cssH + 10);
  ctx.closePath();
  ctx.fill();

  // Grass blades along the mound's edge.
  ctx.strokeStyle = "#0b0612";
  ctx.lineWidth = Math.max(1.5, s.u * 0.006);
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const gx = (i / 60) * s.cssW + hash(i) * 6;
    const t01 = gx / s.cssW;
    const edge = top + s.u * (0.02 * Math.sin(t01 * Math.PI * 2) + 0.01);
    const len = s.u * (0.015 + hash(i + 50) * 0.03);
    ctx.moveTo(gx, edge + 2);
    ctx.lineTo(gx + (hash(i + 7) - 0.5) * len, edge - len);
  }
  ctx.stroke();

  // A big glowing jack-o'-lantern in the left corner.
  const px = s.cssW * 0.11;
  const pr = s.u * 0.075;
  const py = top + pr * 0.55;
  ctx.save();
  ctx.shadowColor = "#ff8a1f";
  ctx.shadowBlur = pr * 0.8;
  ctx.fillStyle = "#e0661a";
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 1.15, pr, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#2b5a1a";
  ctx.fillRect(px - pr * 0.08, py - pr * 1.25, pr * 0.16, pr * 0.35);
  const flicker = 0.75 + 0.25 * Math.sin(s.t * 9) * Math.sin(s.t * 5.3);
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

import { alpha, hash, oval, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { djBooth, speakerStack, splatPath } from "./booth";
import { beats, CYAN, floorSquash, GLOWS, glowLine, GREEN, ORANGE, PINK, pulse, RIM, SIL, spot, UV, YELLOW } from "./common";
import { dancer, type DancerLook } from "./dancer";

// The dance floor around the tower: grid tiles lighting up on the beat, glowing paint splats
// and dropped glow sticks lying on it, dancers on both sides, the DJ booth front-left and a
// speaker stack front-right. Props stand on floor rows (see `spot`), scaled by depth and
// drawn back to front; anything at or behind the tower's line keeps out of its column.

type Prop =
  | { kind: "dancer"; X: number; z: number; h: number; look: DancerLook }
  | { kind: "booth"; X: number; z: number }
  | { kind: "speakers"; X: number; z: number }
  | { kind: "bucket"; X: number; z: number }
  | { kind: "bracelets"; X: number; z: number };

const PROPS: readonly Prop[] = (
  [
    { kind: "dancer", X: -1.17, z: 8, h: 0.25, look: { move: 1, phase: 0.55, paint: YELLOW, stick: PINK } },
    { kind: "dancer", X: -0.53, z: 5, h: 0.25, look: { move: 2, phase: 0.15, paint: CYAN, stick: PINK } },
    { kind: "dancer", X: 1.09, z: 7.5, h: 0.25, look: { move: 2, phase: 0.3, paint: GREEN, stick: YELLOW } },
    { kind: "dancer", X: 0.57, z: 5.3, h: 0.25, look: { move: 3, phase: 0.8, paint: PINK, stick: GREEN } },
    { kind: "booth", X: -0.285, z: 2.25 },
    { kind: "speakers", X: 0.285, z: 2.25 },
    { kind: "bucket", X: -0.17, z: 1.55 },
    { kind: "bracelets", X: 0.165, z: 1.5 },
  ] as Prop[]
).sort((a, b) => b.z - a.z);

/** Flat things on the floor: paint splats (r in u) and dropped glow sticks (angle in rad). */
const SPLATS = [
  { X: -0.13, z: 2.6, r: 0.045, color: GREEN, seed: 2 },
  { X: 0.17, z: 2.8, r: 0.034, color: PINK, seed: 5 },
  { X: 0.02, z: 2.05, r: 0.03, color: YELLOW, seed: 7 },
  { X: -0.62, z: 4.2, r: 0.04, color: CYAN, seed: 3 },
  { X: 0.68, z: 3.8, r: 0.035, color: ORANGE, seed: 8 },
  { X: -0.05, z: 1.75, r: 0.026, color: PINK, seed: 4 },
] as const;

const STICKS = Array.from({ length: 9 }, (_, i) => ({
  X: (hash(i + 1200) - 0.5) * 0.5,
  z: 1.7 + hash(i + 1210) * 1.2,
  a: hash(i + 1220) * Math.PI,
  color: GLOWS[i % 4]!,
}));

/** The farthest floor row anything stands on. */
const FAR_Z = Math.max(...PROPS.map((p) => p.z));

/** Lit dance-floor tiles, aligned with the base neon grid (same projection and scroll). */
function tiles(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  if (hy >= s.cssH) return;
  const H = Math.max(s.u * 0.05, (s.groundY - hy) * TOWER_DEPTH);
  const vx = s.cssW / 2;
  const cell = s.u * 0.12 * TOWER_DEPTH;
  const zNear = H / Math.max(1, s.cssH - hy);
  const zFar = zNear + 9;
  const shift = s.t * 0.35;
  const beat = Math.floor(beats(s.t));
  const p = pulse(s.t, 2);
  const aMin = Math.floor((zNear - 0.5 + shift) / 0.5);
  const aMax = Math.ceil((zFar + shift) / 0.5);
  const cols = Math.ceil((s.cssW / 2 / cell) * zNear) + 1;
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.lineJoin = "round";
  for (let c = 0; c < TILE_COLORS.length; c++) {
    ctx.beginPath();
    for (let A = aMin; A <= aMax; A++) {
      const z0 = Math.max(zNear * 0.8, A * 0.5 - shift);
      const z1 = A * 0.5 - shift + 0.5;
      if (z1 <= z0) continue;
      const yN = hy + H / z0;
      const yF = hy + H / z1;
      // Rows thinner than a few pixels would only read as speckle along the horizon.
      if (yN - yF < s.u * 0.012) break;
      for (let j = -cols; j < cols; j++) {
        if (hash(A * 12.7 + j * 3.1 + beat * 7.7) < 0.87) continue;
        if (Math.floor(hash(A * 5.3 + j * 9.1 + beat * 1.3) * TILE_COLORS.length) !== c) continue;
        ctx.moveTo(vx + (j * cell) / z1, yF);
        ctx.lineTo(vx + ((j + 1) * cell) / z1, yF);
        ctx.lineTo(vx + ((j + 1) * cell) / z0, yN);
        ctx.lineTo(vx + (j * cell) / z0, yN);
        ctx.closePath();
      }
    }
    // A faint wash inside each lit tile and a brighter edge, both swelling on the beat.
    ctx.globalAlpha = 0.05 + p * 0.07;
    ctx.fillStyle = TILE_COLORS[c]!;
    ctx.fill();
    ctx.globalAlpha = 0.22 + p * 0.3;
    ctx.strokeStyle = TILE_COLORS[c]!;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const TILE_COLORS = [GREEN, PINK, UV] as const;

/** Splats and glow sticks lying flat on the floor, one fill or stroke per color. */
function floorBits(ctx: Ctx, s: Scene): void {
  const u = s.u;
  ctx.globalAlpha = 0.85;
  for (const color of SPLAT_COLORS) {
    ctx.beginPath();
    let any = false;
    for (const sp of SPLATS) {
      if (sp.color !== color) continue;
      const { x, y, k } = spot(s, sp.X, sp.z);
      const r = sp.r * u * k;
      if (y - r > s.cssH) continue;
      // The path keeps the squash: points are transformed as they are added.
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, floorSquash(s, sp.z));
      splatPath(ctx, 0, 0, r, sp.seed);
      ctx.restore();
      any = true;
    }
    if (!any) continue;
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, u * 0.0055);
  for (let c = 0; c < 4; c++) {
    ctx.beginPath();
    let any = false;
    for (const st of STICKS) {
      if (st.color !== GLOWS[c]) continue;
      const { x, y, k } = spot(s, st.X, st.z);
      if (y > s.cssH + u * 0.05) continue;
      const q = floorSquash(s, st.z);
      const L = u * 0.022 * k;
      ctx.moveTo(x - Math.cos(st.a) * L, y - Math.sin(st.a) * L * q);
      ctx.lineTo(x + Math.cos(st.a) * L, y + Math.sin(st.a) * L * q);
      any = true;
    }
    if (!any) continue;
    ctx.strokeStyle = GLOWS[c]!;
    ctx.stroke();
  }
}

const SPLAT_COLORS = [GREEN, PINK, YELLOW, CYAN, ORANGE] as const;

/** A paint can knocked over on its side, glow paint spilling out toward the tower. */
function bucket(ctx: Ctx, s: Scene, x: number, y: number, b: number, z: number): void {
  const q = floorSquash(s, z);
  const len = b * 0.06;
  const r = b * 0.022;
  const x0 = x - len * 0.6;
  const x1 = x + len * 0.4;
  // Spill first (it lies on the floor in front of the opening).
  ctx.beginPath();
  ctx.save();
  ctx.translate(x1 + b * 0.03, y - r * 0.1);
  ctx.scale(1, q);
  splatPath(ctx, 0, 0, b * 0.022, 9);
  ctx.restore();
  ctx.moveTo(x1, y - r * 0.6);
  ctx.lineTo(x1 + b * 0.02, y - r * 0.25);
  ctx.lineTo(x1 + b * 0.02, y + r * 0.1);
  ctx.lineTo(x1, y);
  ctx.closePath();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Can body: a cylinder lying along the floor.
  ctx.beginPath();
  ctx.moveTo(x0, y - r * 2);
  ctx.lineTo(x1, y - r * 2);
  ctx.lineTo(x1, y);
  ctx.lineTo(x0, y);
  ctx.closePath();
  oval(ctx, x0, y - r, r * 0.42, r);
  ctx.fillStyle = SIL;
  ctx.fill();
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(1, b * 0.003);
  ctx.stroke();
  // Label band and the handle wire.
  ctx.beginPath();
  ctx.rect(x0 + len * 0.3, y - r * 2, len * 0.28, r * 2);
  ctx.fillStyle = alpha(GREEN, 0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x0 + len * 0.5, y - r * 2, len * 0.42, r * 0.7, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(1, b * 0.0025);
  ctx.stroke();
  // The open end, full of glowing paint.
  ctx.beginPath();
  oval(ctx, x1, y - r, r * 0.42, r);
  ctx.fillStyle = "#16301a";
  ctx.fill();
  glowLine(ctx, GREEN, Math.max(1, b * 0.003), 2.4);
}

const RINGS = [
  { dx: -0.026, dy: 0.004, r: 0.018, color: PINK },
  { dx: 0.008, dy: -0.006, r: 0.017, color: YELLOW },
  { dx: 0.03, dy: 0.006, r: 0.015, color: CYAN },
  { dx: -0.006, dy: 0.012, r: 0.016, color: GREEN },
] as const;

/** A heap of glow-stick bracelets and a loose stick, lying on the floor. */
function bracelets(ctx: Ctx, s: Scene, x: number, y: number, b: number, z: number): void {
  const q = floorSquash(s, z);
  for (const ring of RINGS) {
    ctx.beginPath();
    oval(ctx, x + ring.dx * b, y + ring.dy * b * q * 2, ring.r * b, ring.r * b * q);
    glowLine(ctx, ring.color, Math.max(1, b * 0.0026), 2.4);
  }
  ctx.beginPath();
  ctx.moveTo(x - b * 0.052, y - b * 0.012 * q);
  ctx.lineTo(x - b * 0.022, y - b * 0.03 * q);
  glowLine(ctx, ORANGE, Math.max(1.2, b * 0.004), 2.4);
}

export function partyGround(ctx: Ctx, s: Scene): void {
  tiles(ctx, s);
  if (s.horizonY + ((s.groundY - s.horizonY) * TOWER_DEPTH) / FAR_Z - s.u * 0.2 > s.cssH) return;
  floorBits(ctx, s);
  const u = s.u;
  for (const prop of PROPS) {
    const { x, y, k } = spot(s, prop.X, prop.z);
    if (y - u * k * 0.3 > s.cssH) continue;
    switch (prop.kind) {
      case "dancer":
        dancer(ctx, s.t, x, y, prop.h * u * k, prop.look);
        break;
      case "booth":
        djBooth(ctx, s.t, x, y, u * k);
        break;
      case "speakers":
        speakerStack(ctx, s.t, x, y, u * k);
        break;
      case "bucket":
        bucket(ctx, s, x, y, u * k, prop.z);
        break;
      case "bracelets":
        bracelets(ctx, s, x, y, u * k, prop.z);
        break;
    }
  }
}

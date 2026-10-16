import { hash, oval, roundRectPath, type Ctx } from "../../base/draw";
import { NEON_BAR_RADIUS } from "../../base/neon-blocks";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { BASE_GLASS, COVE_SHEEN, LIT_BLUE, LIT_PINK, N_BLUE, N_ORANGE, N_PINK, PIN, PLATE, PLINTH, WARM_WHITE } from "./colors";
import { farReflections } from "./gallery";
import { gallery, tubeW, type Gallery } from "./layout";
import { beginMirror, breath, endMirror, glow, REAL, REFLECTION, type Neon, type Pass } from "./tube";

// The ground layer: a calm polished floor. The cove light at the foot of the wall, every
// neon piece and the tower's base bar reflect in it; two small sculptures stand on it in the near corners (a slowly
// turning blue ring on a plinth, a pink triangle on a slab), and a few motes of dust drift up
// through the light of the far pieces.

/** Field depths of the two sculptures (TOWER_DEPTH is the tower's line; smaller is nearer). */
const RING_Z = 1.65;
const TRI_Z = 1.85;

/** Dust motes: which piece they drift by (0 arch, 1 panel), spread, speed, phase. */
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  side: i % 2,
  fx: hash(i * 7 + 1) - 0.5,
  speed: 0.018 + hash(i * 7 + 2) * 0.022,
  phase: hash(i * 7 + 3),
  sway: hash(i * 7 + 4) * 6,
}));

function motes(ctx: Ctx, s: Scene, g: Gallery): void {
  const u = g.u;
  const size = Math.max(1, u * 0.0034);
  ctx.fillStyle = WARM_WHITE;
  for (const m of MOTES) {
    const f = (((s.t * m.speed + m.phase) % 1) + 1) % 1;
    const cx = m.side ? g.px + g.pw / 2 : g.ax;
    let x = cx + m.fx * u * 0.2 + Math.sin(s.t * 0.4 + m.sway) * u * 0.012;
    x = m.side ? Math.max(x, g.colR + size) : Math.min(x, g.colL - size);
    const y = g.hy - u * 0.02 - f * u * 0.4;
    ctx.globalAlpha = 0.42 * Math.sin(Math.PI * f);
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

/**
 * A sculpture standing with its foot at (x, fy); `k` is u scaled by perspective. Drawn once
 * for its reflection and once for real.
 */
type Sculpture = (ctx: Ctx, pass: Pass, x: number, fy: number, k: number, t: number) => void;

/** A blue ring turning slowly on a pin above a low slab. */
const ringSculpture: Sculpture = (ctx, pass, x, fy, k, t) => {
  const pw = k * 0.07;
  const ph = k * 0.022;
  ctx.beginPath();
  ctx.rect(x - pw / 2, fy - ph, pw, ph);
  pass.fill(ctx, PLINTH);
  const pin = k * 0.02;
  ctx.beginPath();
  ctx.rect(x - k * 0.0028, fy - ph - pin, k * 0.0056, pin + k * 0.004);
  pass.fill(ctx, PIN);
  if (!pass.mirrored) {
    ctx.fillStyle = LIT_BLUE;
    ctx.fillRect(x - pw / 2, fy - ph, pw, Math.max(1, k * 0.003));
  }
  const r = k * 0.032;
  const turn = Math.cos(t * 0.24);
  ctx.beginPath();
  oval(ctx, x, fy - ph - pin - r, Math.max(r * 0.05, r * Math.abs(turn)), r);
  pass.tube(ctx, N_BLUE, tubeW(k, 0.55), breath(t, 5.2));
};

/** A pink triangle on a low slab. */
const triangleSculpture: Sculpture = (ctx, pass, x, fy, k, t) => {
  const sw = k * 0.088;
  const sh = k * 0.012;
  ctx.beginPath();
  ctx.rect(x - sw / 2, fy - sh, sw, sh);
  pass.fill(ctx, PLINTH);
  if (!pass.mirrored) {
    ctx.fillStyle = LIT_PINK;
    ctx.fillRect(x - sw / 2, fy - sh, sw, Math.max(1, k * 0.003));
  }
  const b = fy - sh;
  const hw = k * 0.035;
  ctx.beginPath();
  ctx.moveTo(x - hw, b);
  ctx.lineTo(x, b - k * 0.064);
  ctx.lineTo(x + hw, b);
  ctx.closePath();
  pass.fill(ctx, PLATE);
  pass.tube(ctx, N_PINK, tubeW(k, 0.55), breath(t, 3.4));
};

/** Height of the tallest sculpture, in k. */
const SCULPTURE_H = 0.125;

function place(ctx: Ctx, s: Scene, draw: Sculpture, z: number, x: number, n: Neon): void {
  const fy = fieldY(s, z);
  const k = (s.u * TOWER_DEPTH) / z;
  if (fy - k * SCULPTURE_H > s.cssH) return;
  glow(ctx, n.pool, x, fy + k * 0.004, k * 0.085, k * 0.017, breath(s.t, 1));
  beginMirror(ctx, fy, k * 0.1);
  draw(ctx, REFLECTION, x, fy, k, s.t);
  endMirror(ctx);
  draw(ctx, REAL, x, fy, k, s.t);
}

/** The cove light at the foot of the wall, mirrored in the floor. */
function sheen(ctx: Ctx, s: Scene): void {
  ctx.save();
  ctx.translate(0, s.horizonY);
  ctx.scale(1, s.u * 0.09);
  ctx.fillStyle = COVE_SHEEN.get(ctx);
  ctx.fillRect(0, 0, s.cssW, 1);
  ctx.restore();
}

/**
 * The base bar (bars[0], orange) mirrored in the floor with its light pooled under it, so the
 * tower stands on the same polished floor as the gallery pieces. The base never sways or leans.
 */
function baseReflection(ctx: Ctx, s: Scene): void {
  if (s.baseW <= 0 || s.groundY >= s.cssH) return;
  const h = BLOCK_HEIGHT * s.scale;
  const b = breath(s.t, 0);
  glow(ctx, N_ORANGE.pool, s.baseX + s.baseW / 2, s.groundY + h * 0.2, s.baseW * 0.6, h * 0.85, b);
  beginMirror(ctx, s.groundY, h * 1.05);
  roundRectPath(ctx, s.baseX, s.groundY - h, s.baseW, h, h * NEON_BAR_RADIUS);
  REFLECTION.fill(ctx, BASE_GLASS);
  REFLECTION.tube(ctx, N_ORANGE, Math.max(1.4, h * 0.1), b);
  endMirror(ctx);
}

export function ground(ctx: Ctx, s: Scene): void {
  const g = gallery(s);
  if (g.hy < s.cssH) {
    sheen(ctx, s);
    farReflections(ctx, s);
    motes(ctx, s, g);
  }
  baseReflection(ctx, s);
  // Near corners, back to front: the triangle right of the column, the ring left of it.
  const u = s.u;
  const triK = (u * TOWER_DEPTH) / TRI_Z;
  const triX = Math.min(s.cssW - u * 0.04 - triK * 0.045, g.colR + triK * 0.07);
  place(ctx, s, triangleSculpture, TRI_Z, triX, N_PINK);
  const ringK = (u * TOWER_DEPTH) / RING_Z;
  const ringX = Math.max(u * 0.04 + ringK * 0.03, g.colL - ringK * 0.052);
  place(ctx, s, ringSculpture, RING_Z, ringX, N_BLUE);
}

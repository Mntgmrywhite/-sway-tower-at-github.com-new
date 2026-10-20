import { alpha, circle, hash, ink, mix, outlined, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { EMERALD, GOLD, GOLD_LIGHT, INK, IVORY, LACQUER, MARBLE_FAR, PARTY, ROSE, TAU, WATER_FAR, WATER_NEAR } from "./colors";
import { EYES, eckleburg } from "./eckleburg";
import { estate, mansionReflections } from "./estate";
import { friezeTop } from "./front";
import { HERO_SPANS } from "./landmarks";
import { barbPath, PLUME, PLUME_HALF, plumePath, quillPath } from "./plume";
import { champagneTower, gramophone, roadster } from "./props";

// The ground layer, back to front: the bay running to the city, the hero towers' lights and
// the mansion's windows mirrored on it in wavering gold; the mansion's point across it
// (estate.ts); then our terrace: ivory marble with a gold-and-
// emerald Deco sunburst inlaid around the tower's foot, confetti and fallen feathers, and the
// props (props.ts): a gramophone, a roadster pulled up in front, a champagne tower; behind them,
// across the bay, Doctor T. J. Eckleburg's billboard (eckleburg.ts).
// Floor things are placed in perspective: a field row at depth z is at fieldY(scene, z) and
// scaled by TOWER_DEPTH / z. Nothing on this layer stands in the tower column above the
// ground line.

/** Depth of the terrace's edge on the water. */
export const EDGE_Z = 4.6;
/** Gradients are built once per context in a 0..REF unit space and stretched into place. */
const REF = 100;

let gradCtx: Ctx | null = null;
let waterFill: CanvasGradient | null = null;
let hazeFill: CanvasGradient | null = null;
/** Mist where the bay meets the cloud bank. */
const HAZE = mix(WATER_FAR, "#5b84c2", 0.5);

function gradients(ctx: Ctx): void {
  if (gradCtx === ctx) return;
  gradCtx = ctx;
  waterFill = ctx.createLinearGradient(0, 0, 0, REF);
  waterFill.addColorStop(0, WATER_FAR);
  waterFill.addColorStop(1, WATER_NEAR);
  hazeFill = ctx.createLinearGradient(0, 0, 0, REF);
  hazeFill.addColorStop(0, alpha(HAZE, 0.75));
  hazeFill.addColorStop(1, alpha(HAZE, 0));
}

/** Fill the band y0..y1 across the screen with a unit-space gradient. */
function band(ctx: Ctx, s: Scene, fill: CanvasGradient, y0: number, y1: number): void {
  ctx.save();
  ctx.translate(0, y0);
  ctx.scale(1, (y1 - y0) / REF);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, s.cssW, REF);
  ctx.restore();
}

/* ---------------------------------------------------------------- the bay */

/** Lights on the water: position across the screen, depth (0 horizon, 1 the terrace), shimmer. */
const GLINTS = Array.from({ length: 46 }, (_, i) => ({
  x: hash(i * 4.1 + 700),
  v: Math.pow(hash(i * 4.1 + 701), 1.6),
  rate: 1.2 + hash(i * 4.1 + 702) * 2,
  phase: hash(i * 4.1 + 703) * TAU,
  ivory: hash(i * 4.1 + 704) < 0.3,
}));
const GLINT_GOLD = alpha(GOLD_LIGHT, 0.6);
const GLINT_IVORY = alpha(IVORY, 0.45);
const RIPPLE = alpha("#ffffff", 0.07);

/** The hero towers' lights mirrored on the bay, added to the current path: wavering dashes
 *  under each tower, narrowing toward us. */
function towerReflections(ctx: Ctx, s: Scene, ye: number): void {
  const hy = s.horizonY;
  const u = s.u;
  const cx = s.cssW / 2;
  const rows = 7;
  for (const [hx, hw] of HERO_SPANS) {
    for (let i = 0; i < rows; i++) {
      const f = i / rows;
      const y = hy + 2 + (ye - hy) * 0.7 * f * (0.6 + f * 0.4);
      const w = hw * u * (1.3 - f * 0.9);
      const x = cx + hx * u + Math.sin(s.t * 1.7 + i * 1.9 + hx * 9) * u * 0.006;
      ctx.rect(x - w / 2, y, w, Math.max(1, u * (0.003 + f * 0.002)));
    }
  }
}

function bay(ctx: Ctx, s: Scene, ye: number): void {
  const hy = s.horizonY;
  const u = s.u;
  band(ctx, s, waterFill!, hy, ye);
  band(ctx, s, hazeFill!, hy, Math.min(ye, hy + u * 0.035));
  // Long soft ripples
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const v = (i + 0.5) / 6;
    const y = hy + (ye - hy) * v * v + 2;
    const x = ((hash(i + 740) + s.t * 0.01 * (i % 2 ? 1 : -1)) % 1) * s.cssW;
    ctx.rect(x - u * 0.2, y, u * (0.15 + v * 0.3), Math.max(1, u * 0.003));
  }
  ctx.fillStyle = RIPPLE;
  ctx.fill();
  // City lights glinting on the water, longer toward the viewer
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    if (pass === 0) {
      towerReflections(ctx, s, ye);
      mansionReflections(ctx, s, ye);
    }
    for (const g of GLINTS) {
      if (g.ivory !== (pass === 1)) continue;
      if (Math.sin(s.t * g.rate + g.phase) < 0.1) continue;
      const y = hy + (ye - hy) * (0.06 + g.v * 0.9);
      const len = u * (0.012 + g.v * 0.035);
      const h = Math.max(1, u * (0.002 + g.v * 0.003));
      ctx.rect(g.x * s.cssW - len / 2, y, len, h);
    }
    ctx.fillStyle = pass ? GLINT_IVORY : GLINT_GOLD;
    ctx.fill();
  }
}

/* ---------------------------------------------------------------- the terrace */

const JOINT = alpha(INK, 0.1);
const COPING = LACQUER;
const COPING_GOLD = GOLD;
/** Lateral offsets (u at the tower's line) of the slab joints running toward the bay. */
const JOINTS = Array.from({ length: 21 }, (_, i) => (i - 10) * 0.3);
/** Depths of the cross joints. */
const ROWS = [1.2, 1.4, 1.65, 1.95, 2.35, 2.85, 3.5, 4.2];

/** The sunburst inlay: world radius of its rings, centered on the tower's foot. */
const SUN_IN = 0.3;
const SUN_OUT = 0.7;
const SUN_RING = 0.8;
const RAYS = 20;
const ARC = 3; // points per ray along its outer arc
/** Unit directions for every point the inlay needs: RAYS * ARC + 1 around the circle. */
const SUN_DIRS = Array.from({ length: RAYS * ARC + 1 }, (_, i) => {
  const a = (i / (RAYS * ARC)) * TAU;
  return [Math.sin(a), Math.cos(a)] as const;
});
const SUN_GOLD = mix(MARBLE_FAR, GOLD, 0.62);
const SUN_CREAM = mix(MARBLE_FAR, IVORY, 0.7);
const SUN_RING_FILL = mix(MARBLE_FAR, EMERALD, 0.7);
const SUN_CORE = mix(MARBLE_FAR, GOLD, 0.8);
const SUN_LINE = alpha(mix(GOLD, INK, 0.45), 0.55);

/** Scratch for projected inlay points. */
const PX = new Float32Array(RAYS * ARC + 1);
const PY = new Float32Array(RAYS * ARC + 1);

/** Project the circle of world radius rho around the tower's foot into PX/PY. */
function ringPoints(s: Scene, rho: number): void {
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const d = (s.groundY - hy) * TOWER_DEPTH;
  for (let i = 0; i < SUN_DIRS.length; i++) {
    const [sx, sz] = SUN_DIRS[i]!;
    const z = TOWER_DEPTH + rho * sz;
    PX[i] = cx + (s.u * rho * sx) / z;
    PY[i] = hy + d / z;
  }
}

function ringPath(ctx: Ctx, n: number): void {
  ctx.moveTo(PX[0]!, PY[0]!);
  for (let i = 1; i < n; i++) ctx.lineTo(PX[i]!, PY[i]!);
  ctx.closePath();
}

/** Scratch: the inner ring's points while the outer one is projected. */
const QX = new Float32Array(RAYS * ARC + 1);
const QY = new Float32Array(RAYS * ARC + 1);

function sunburst(ctx: Ctx, s: Scene): void {
  const n = RAYS * ARC;
  // Emerald ring with gold lines
  ringPoints(s, SUN_RING);
  ctx.beginPath();
  ringPath(ctx, n);
  ctx.fillStyle = SUN_RING_FILL;
  ctx.fill();
  ctx.strokeStyle = SUN_LINE;
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.stroke();
  // Rays: cream ground, gold wedges every other ray
  ringPoints(s, SUN_OUT);
  ctx.beginPath();
  ringPath(ctx, n);
  ctx.fillStyle = SUN_CREAM;
  ctx.fill();
  ctx.stroke();
  QX.set(PX);
  QY.set(PY);
  ringPoints(s, SUN_IN);
  ctx.beginPath();
  for (let r = 0; r < RAYS; r += 2) {
    const a = r * ARC;
    // Outer arc of the wedge, then back along the inner ring
    ctx.moveTo(QX[a]!, QY[a]!);
    for (let j = 1; j <= ARC; j++) ctx.lineTo(QX[a + j]!, QY[a + j]!);
    ctx.lineTo(PX[a + ARC]!, PY[a + ARC]!);
    ctx.lineTo(PX[a]!, PY[a]!);
    ctx.closePath();
  }
  ctx.fillStyle = SUN_GOLD;
  ctx.fill();
  // Gold core under the tower's foot
  ctx.beginPath();
  ringPath(ctx, n);
  ctx.fillStyle = SUN_CORE;
  ctx.fill();
  ctx.stroke();
}

/** Confetti lying flat on the terrace: lateral offset (u at the tower's line), depth, tint, turn. */
const FLOOR_BITS = (() => {
  const out: { dx: number; z: number; c: number; cos: number; sin: number; size: number }[] = [];
  for (let i = 0; out.length < 54 && i < 400; i++) {
    const z = 1.2 + Math.pow(hash(i * 2.3 + 3), 1.2) * (EDGE_Z - 1.4);
    const dx = (hash(i * 2.3 + 2) - 0.5) * 1.4 * (z / TOWER_DEPTH);
    if (Math.abs(dx) < 0.3 && z > 2.1 && z < 3.9) continue; // the inlay stays clean
    const a = hash(i * 2.3 + 4) * TAU;
    out.push({ dx, z, c: i % PARTY.length, cos: Math.cos(a), sin: Math.sin(a), size: 0.008 + hash(i * 2.3 + 5) * 0.005 });
  }
  return out;
})();

/** A feather dropped on the floor: lateral offset (u at the tower's line), depth, turn. */
const FLOOR_FEATHER = [0.2, 1.72, -1.25] as const;
const FEATHER_SHADE = mix(ROSE, INK, 0.2);
const FEATHER_BARBS = mix(ROSE, INK, 0.35);
/** A string of pearls dropped on the floor, in a loose loop: lateral offset, depth. */
const FLOOR_PEARLS = [-0.11, 1.62] as const;
const PEARL_COUNT = 18;
const PEARL_LOOP = Array.from({ length: PEARL_COUNT }, (_, i) => {
  const a = (i / PEARL_COUNT) * TAU;
  // A loose, lopsided loop with one end trailing off
  const r = 1 + 0.18 * Math.sin(a * 2 + 0.6);
  return [Math.cos(a) * r, Math.sin(a) * r * 0.42] as const;
});
const PEARL = mix(IVORY, "#ffffff", 0.4);
const PEARL_SHADE = mix(IVORY, "#c3cde6", 0.45);

/** The dropped pearls: a loop of beads, inked as one shape, with a little glint on each. */
function floorPearls(ctx: Ctx, x: number, y: number, R: number, lw: number): void {
  const pr = R * 0.15;
  ctx.beginPath();
  for (const [px, py] of PEARL_LOOP) circle(ctx, x + px * R, y + py * R, pr);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = PEARL_SHADE;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py] of PEARL_LOOP) circle(ctx, x + px * R - pr * 0.15, y + py * R - pr * 0.2, pr * 0.7);
  ctx.fillStyle = PEARL;
  ctx.fill();
}

/** A rose feather lying flat: the plume squashed onto the floor, its far half shaded. */
function floorFeather(ctx: Ctx, x: number, y: number, f: number, turn: number, lw: number): void {
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  ctx.beginPath();
  plumePath(ctx, PLUME, x, y, f, c, sn, 0.62);
  outlined(ctx, ROSE, lw, INK);
  ctx.beginPath();
  plumePath(ctx, PLUME_HALF, x, y, f, c, sn, 0.62);
  ctx.fillStyle = FEATHER_SHADE;
  ctx.fill();
  ctx.beginPath();
  barbPath(ctx, x, y, f, c, sn, 0.62);
  ctx.strokeStyle = FEATHER_BARBS;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  quillPath(ctx, x, y, f, c, sn, 0.62);
  ink(ctx, Math.max(1, lw * 0.8), INK);
}

function terrace(ctx: Ctx, s: Scene, ye: number): void {
  const hy = s.horizonY;
  const u = s.u;
  const cx = s.cssW / 2;
  const yb = s.cssH;
  // The marble itself is the base world's field (palette.fieldFar/fieldNear, with its faint
  // slab-wide stripes), so the terrace only adds its joints, inlay, coping and things on it.

  // Slab joints: converging on the vanishing point, and cross rows widening toward the viewer.
  // Hairlines, filled as thin slivers (cheaper than stroking), stopping at the frieze.
  const depth = s.groundY - hy;
  const stop = Math.min(yb, friezeTop(s) + 2);
  ctx.beginPath();
  const near = (stop - hy) / depth;
  const far = (ye - hy) / depth;
  for (const X of JOINTS) {
    const xb = cx + X * u * near;
    if (xb < -s.cssW || xb > s.cssW * 2) continue;
    const xt = cx + X * u * far;
    ctx.moveTo(xt - 0.5, ye);
    ctx.lineTo(xt + 0.5, ye);
    ctx.lineTo(xb + 0.5, stop);
    ctx.lineTo(xb - 0.5, stop);
    ctx.closePath();
  }
  for (const z of ROWS) {
    const y = fieldY(s, z);
    if (y < ye || y > stop) continue;
    ctx.rect(0, y - 0.5, s.cssW, 1);
  }
  ctx.fillStyle = JOINT;
  ctx.fill();

  sunburst(ctx, s);

  // Coping along the water: black lacquer between two gilt lines
  const lw = Math.max(1.5, u * 0.0045);
  const ch = Math.max(3, u * 0.012);
  const gl = Math.max(1.2, u * 0.0035);
  ctx.fillStyle = COPING;
  ctx.fillRect(0, ye - 1, s.cssW, ch);
  ctx.fillStyle = COPING_GOLD;
  ctx.fillRect(0, ye - 1, s.cssW, gl);
  ctx.fillRect(0, ye - 1 + ch - gl, s.cssW, gl);
  ctx.beginPath();
  ctx.moveTo(0, ye - 1);
  ctx.lineTo(s.cssW, ye - 1);
  ink(ctx, Math.max(1, lw * 0.6), INK);

  // Confetti on the floor
  for (let c = 0; c < PARTY.length; c++) {
    ctx.beginPath();
    for (const b of FLOOR_BITS) {
      if (b.c !== c) continue;
      const y = fieldY(s, b.z);
      if (y > yb + 4 || y < ye) continue;
      const k = TOWER_DEPTH / b.z;
      const x = cx + b.dx * u * k;
      const l = b.size * u * k;
      const w = l * 0.5;
      const ax = b.cos * l;
      const ay = b.sin * l * 0.35;
      const bx = -b.sin * w;
      const by = b.cos * w * 0.35;
      ctx.moveTo(x - ax - bx, y - ay - by);
      ctx.lineTo(x + ax - bx, y + ay - by);
      ctx.lineTo(x + ax + bx, y + ay + by);
      ctx.lineTo(x - ax + bx, y - ay + by);
      ctx.closePath();
    }
    ctx.fillStyle = PARTY[c]!;
    ctx.fill();
  }
  {
    const [dx, z, turn] = FLOOR_FEATHER;
    const y = fieldY(s, z);
    if (y <= yb + u * 0.05 && y >= ye) {
      const k = TOWER_DEPTH / z;
      floorFeather(ctx, cx + dx * u * k, y, u * 0.085 * k, turn, Math.max(1.2, u * 0.0035 * k));
    }
  }
  {
    const [dx, z] = FLOOR_PEARLS;
    const y = fieldY(s, z);
    if (y <= yb + u * 0.05 && y >= ye) {
      const k = TOWER_DEPTH / z;
      floorPearls(ctx, cx + dx * u * k, y, u * 0.028 * k, Math.max(1, u * 0.0022 * k));
    }
  }

}

/* ---------------------------------------------------------------- layer */

/** Every prop, back to front: screen x offset (u), depth, how tall it stands (u at the tower's line). */
export const PROPS = [
  { ...EYES, draw: eckleburg },
  { dx: 0.37, z: 3.45, tall: 0.27, draw: gramophone },
  { dx: 0.315, z: 1.9, tall: 0.1, draw: roadster },
  { dx: -0.358, z: 1.85, tall: 0.19, draw: champagneTower },
].sort((a, b) => b.z - a.z);

/** The ground layer: the bay, the mansion's point, the terrace, then the props back to front. */
export function partyTerrace(ctx: Ctx, s: Scene): void {
  if (s.horizonY >= s.cssH) return;
  gradients(ctx);
  const ye = fieldY(s, EDGE_Z);
  if (ye > s.horizonY + 1) {
    bay(ctx, s, ye);
    estate(ctx, s, ye);
  }
  terrace(ctx, s, ye);
  const cx = s.cssW / 2;
  const u = s.u;
  for (const prop of PROPS) {
    const y = fieldY(s, prop.z);
    const k = TOWER_DEPTH / prop.z;
    if (y - prop.tall * u * k >= s.cssH) continue; // still below the screen
    prop.draw(ctx, s, cx + prop.dx * u, y, k);
  }
}


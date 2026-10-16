import { hash, mix, outlined, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { INK, inkW, LEAVES, spot } from "./common";

// Autumn leaves: a few blowing across the scene on the wind, tumbling and flipping over;
// more lying scattered on the grass; and heaped piles on the foreground lip at the screen
// edges. Each leaf is a pointed oval with a midrib, batched per color: one fill, then one
// stroke in a deep shade of the same color (an ink line would swallow leaves this small).

const TAU = Math.PI * 2;
const EDGES = LEAVES.map((c) => mix(c, INK, 0.38));
const FALLEN_FILL = LEAVES.map((c) => mix(c, INK, 0.1));

/** Scratch geometry of one leaf, so drawing it twice (fill, ink) allocates nothing. */
const L = { x: 0, y: 0, len: 0, a: 0, flip: 1 };

function leafPath(ctx: Ctx, rib: boolean): void {
  const ca = Math.cos(L.a);
  const sa = Math.sin(L.a);
  const h = L.len / 2;
  const w = L.len * 0.4 * L.flip;
  const tx = L.x + ca * h;
  const ty = L.y + sa * h;
  const bx = L.x - ca * h;
  const by = L.y - sa * h;
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(L.x - sa * w, L.y + ca * w, bx, by);
  ctx.quadraticCurveTo(L.x + sa * w, L.y - ca * w, tx, ty);
  ctx.closePath();
  if (rib) {
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx - ca * L.len * 0.18, by - sa * L.len * 0.18);
  }
}

/** Just the midrib of the leaf in L, as a straight line out through its stem. */
function ribPath(ctx: Ctx): void {
  const ca = Math.cos(L.a);
  const sa = Math.sin(L.a);
  const h = L.len / 2;
  ctx.moveTo(L.x + ca * h * 0.8, L.y + sa * h * 0.8);
  ctx.lineTo(L.x - ca * h * 1.08, L.y - sa * h * 1.08);
}

// ---------------------------------------------------------------- blowing

/** Leaves on the wind: band (0 high .. 1 low), speed (u/s), start, size (u), color, spin, flutter. */
const BLOW = Array.from({ length: 11 }, (_, i) => ({
  band: hash(i + 700),
  speed: 0.07 + hash(i + 710) * 0.06,
  start: hash(i + 720),
  size: 0.026 + hash(i + 730) * 0.01,
  color: i % LEAVES.length,
  spin: (hash(i + 740) - 0.5) * 5,
  flip: 2 + hash(i + 750) * 3,
  bob: 0.6 + hash(i + 760) * 0.8,
}));

function blowSpot(s: Scene, i: number): void {
  const b = BLOW[i]!;
  const u = s.u;
  const span = s.cssW + u * 0.2;
  const top = s.cssH * 0.35;
  const bottom = Math.min(s.groundY + u * 0.26, s.cssH * 0.83);
  const along = (((b.start * span + s.t * b.speed * u) % span) + span) % span;
  L.x = along - u * 0.1;
  L.y = top + b.band * Math.max(0, bottom - top) + Math.sin(s.t * b.bob + i * 2.3) * u * 0.035;
  L.len = b.size * u;
  L.a = s.t * b.spin + i;
  const f = Math.cos(s.t * b.flip + i * 1.3);
  L.flip = f < 0 ? Math.min(-0.3, f) : Math.max(0.3, f);
}

/**
 * The leaves on the wind (behind the tower, over everything else). Their band is fixed on
 * screen, so a few keep gusting past the tower however high it climbs.
 */
export function blowing(ctx: Ctx, s: Scene): void {
  ctx.lineWidth = Math.max(0.8, s.u * 0.0026);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let c = 0; c < LEAVES.length; c++) {
    ctx.beginPath();
    for (let i = c; i < BLOW.length; i += LEAVES.length) {
      blowSpot(s, i);
      leafPath(ctx, true);
    }
    ctx.fillStyle = LEAVES[c]!;
    ctx.fill();
    ctx.strokeStyle = EDGES[c]!;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- fallen

/**
 * Leaves lying on the grass: X (u at the tower's depth), z, angle, size, color. Hashed once,
 * keeping off the tower's column behind the tower and off the stone tiles in front.
 */
const FALLEN = (() => {
  const out: { X: number; z: number; a: number; size: number; color: number }[] = [];
  for (let i = 0; out.length < 18 && i < 400; i++) {
    const z = 1.5 + hash(i + 800) * 6;
    const k = 3 / z;
    const sx = (hash(i + 810) - 0.5) * 0.96;
    if (z > 2.85 && Math.abs(sx) < 0.3) continue;
    out.push({ X: sx / k, z, a: hash(i + 820) * TAU, size: 0.026 + hash(i + 830) * 0.01, color: i % LEAVES.length });
  }
  return out.sort((a, b) => b.z - a.z);
})();

function fallenSpot(s: Scene, i: number): boolean {
  const f = FALLEN[i]!;
  const p = spot(s, f.X, f.z);
  if (p.y > s.cssH + 4) return false;
  L.x = p.x;
  L.y = p.y;
  L.len = f.size * s.u * p.k;
  L.a = f.a;
  // Lying flat: seen at a slant, so squashed.
  L.flip = 0.55;
  return true;
}

/** Leaves lying on the grass: flat color only, they are background. */
export function fallen(ctx: Ctx, s: Scene): void {
  for (let c = 0; c < LEAVES.length; c++) {
    ctx.beginPath();
    for (let i = c; i < FALLEN.length; i += LEAVES.length) if (fallenSpot(s, i)) leafPath(ctx, false);
    ctx.fillStyle = FALLEN_FILL[c]!;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- piles

/** Leaf piles on the foreground lip, as fractions of the screen width from the left. */
const PILES = [0.087, 0.913] as const;
const PILE_LEAVES = 7;
const PILE = mix(LEAVES[3], INK, 0.12);
const PILE_EDGE = mix(LEAVES[3], INK, 0.4);

export function piles(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lip = layerGround(s, 1.6) + u * 0.36;
  if (lip - u * 0.08 > s.cssH) return;
  const lw = inkW(s);
  const w = Math.min(u * 0.085, s.cssW * 0.07);
  const h = u * 0.045;
  const base = lip + u * 0.014;
  // The heap: a soft dome of russet leaves, inked as one silhouette.
  ctx.beginPath();
  for (const f of PILES) {
    const x = f * s.cssW;
    ctx.moveTo(x - w, base);
    ctx.bezierCurveTo(x - w * 0.9, base - h * 0.9, x - w * 0.35, base - h * 1.15, x + w * 0.05, base - h);
    ctx.bezierCurveTo(x + w * 0.5, base - h * 0.95, x + w * 0.95, base - h * 0.7, x + w, base);
    ctx.closePath();
  }
  outlined(ctx, PILE, lw, INK);
  // Bright leaves heaped on top, the top few lifting and settling in the wind, then their
  // midribs (straight strokes are cheap; outlining every curved leaf is not).
  for (let c = 0; c < LEAVES.length; c++) {
    ctx.beginPath();
    for (let pi = 0; pi < PILES.length; pi++) {
      for (let i = c; i < PILE_LEAVES; i += LEAVES.length) {
        pileSpot(s, pi, i, base, w, h);
        leafPath(ctx, false);
      }
    }
    ctx.fillStyle = LEAVES[c]!;
    ctx.fill();
  }
  ctx.beginPath();
  for (let pi = 0; pi < PILES.length; pi++) {
    for (let i = 0; i < PILE_LEAVES; i++) {
      pileSpot(s, pi, i, base, w, h);
      ribPath(ctx);
    }
  }
  ctx.strokeStyle = PILE_EDGE;
  ctx.lineWidth = Math.max(0.7, u * 0.0022);
  ctx.lineCap = "round";
  ctx.stroke();
}

function pileSpot(s: Scene, pi: number, i: number, base: number, w: number, h: number): void {
  const x = PILES[pi]! * s.cssW;
  const f = (i + 0.5) / PILE_LEAVES;
  const across = (f - 0.5) * 1.5;
  const lift = i % 3 === 1 ? Math.max(0, Math.sin(s.t * 1.3 + pi * 2 + i)) * h * 0.3 : 0;
  L.x = x + across * w * 0.8;
  L.y = base - h * (0.45 + 0.5 * (1 - across * across)) * (0.85 + hash(i + pi * 40 + 900) * 0.25) - lift;
  L.len = s.u * (0.038 + hash(i + pi * 40 + 910) * 0.01);
  L.a = (hash(i + pi * 40 + 920) - 0.5) * 2.2;
  L.flip = 1.15;
}

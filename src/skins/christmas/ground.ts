import { alpha, circle, hash, ink, inkedLine, mix, outlined, oval, roundRectPath, type Ctx } from "../../base/draw";
import { fieldY, layerGround, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import {
  BLUE,
  CARROT,
  GOLD,
  GREEN,
  ICE,
  INK,
  LILAC,
  PINE,
  PINE_DARK,
  PINE_LIGHT,
  RED,
  SNOW,
  SNOW_DEEP,
  SNOW_SHADE,
  TRUNK,
  TWIG,
  WHITE,
} from "./colors";
import { canePath, caneStroke, drawBulbs, mound, sparklePath, starPath } from "./shapes";
import { snow } from "./sky";

// Props on the snowfield beside the tower, all ink-outlined cartoons planted in snow drifts:
// a decorated tree with twinkling lights and a star, presents piled at its foot, a snowman
// waving, and candy canes stuck in the snow. Each prop stands on a field row at depth z
// (z = TOWER_DEPTH is the tower's line; smaller z is nearer, lower and larger) and is drawn
// back to front, so nearer props overlap farther ones.
// Positions are `dx` in u from the center line at tower depth; sizes in u at tower depth.

/** Pixels per u at depth z. */
function unit(s: Scene, z: number): number {
  return (s.u * TOWER_DEPTH) / z;
}

/** Screen x of a spot `dx` u (at tower depth) from the center line, on row z. */
function rowX(s: Scene, dx: number, z: number): number {
  return s.cssW / 2 + dx * unit(s, z);
}

function lineW(s: Scene, k = 1): number {
  return Math.max(1.5, s.u * 0.0065 * k);
}

// ---------------------------------------------------------------- the tree

/** Tiers top to bottom: top y, bottom y, half width at the bottom (fractions of the height). */
const TIERS = [
  { top: -1, bottom: -0.7, half: 0.115 },
  { top: -0.84, bottom: -0.5, half: 0.165 },
  { top: -0.66, bottom: -0.29, half: 0.21 },
  { top: -0.46, bottom: -0.08, half: 0.25 },
] as const;

/**
 * One tier: concave sides from the apex and a scalloped hem (an even number of scallops),
 * as its own subpath. With `rightHalf`, only the tier's right half, for its shading: it
 * follows the same edges, so it needs no clip.
 */
function tierPath(ctx: Ctx, x: number, base: number, h: number, t: (typeof TIERS)[number], rightHalf = false): void {
  const top = base + t.top * h;
  const bot = base + t.bottom * h;
  const half = t.half * h;
  const n = 2 * Math.max(1, Math.round(t.half * 8));
  ctx.moveTo(x, top);
  ctx.quadraticCurveTo(x + half * 0.35, top + (bot - top) * 0.6, x + half, bot);
  for (let i = 0; i < (rightHalf ? n / 2 : n); i++) {
    const x0 = x + half - (2 * half * i) / n;
    const x1 = x + half - (2 * half * (i + 1)) / n;
    ctx.quadraticCurveTo((x0 + x1) / 2, bot + h * 0.05, x1, bot);
  }
  if (!rightHalf) ctx.quadraticCurveTo(x - half * 0.35, top + (bot - top) * 0.6, x, top);
  ctx.closePath();
}

const TIER_SHADE = alpha(PINE_DARK, 0.4);

/** White glints on baubles. */
const GLINT = alpha("#ffffff", 0.9);

/** Garland swoops, one per tier: [y at the left edge, y at the right edge, sag] (fractions). */
const GARLANDS = [
  [-0.8, -0.77, 0.035],
  [-0.62, -0.57, 0.045],
  [-0.42, -0.37, 0.05],
  [-0.22, -0.16, 0.055],
] as const;

/** Half width of the tree's envelope at height fraction y, for garlands and bulbs. */
function tierHalf(y: number): number {
  let half = 0;
  for (const t of TIERS) {
    if (y < t.top || y > t.bottom) continue;
    half = Math.max(half, (t.half * (y - t.top)) / (t.bottom - t.top));
  }
  return half;
}

/** Garland curves as [ax, ay, cx, cy, bx, by] fractions, and bulbs spaced along them. */
const { SWOOPS, TREE_BULBS } = (() => {
  const swoops: number[] = [];
  const bulbs: number[] = [];
  for (const [ya, yb, sag] of GARLANDS) {
    const ax = -tierHalf(ya) * 0.86;
    const bx = tierHalf(yb) * 0.86;
    const cy = Math.max(ya, yb) + sag;
    swoops.push(ax, ya, 0, cy, bx, yb);
    const n = Math.max(3, Math.round((bx - ax) / 0.065));
    for (let k = 0; k <= n; k++) {
      const t = (k + 0.5) / (n + 1);
      bulbs.push(
        (1 - t) * (1 - t) * ax + t * t * bx,
        (1 - t) * (1 - t) * ya + 2 * (1 - t) * t * cy + t * t * yb,
      );
    }
  }
  return { SWOOPS: swoops, TREE_BULBS: bulbs };
})();

/** Baubles: [x, y] fractions of the height, hanging between the garlands, by color. */
const BAUBLES = [
  { color: RED, at: [0.05, -0.69, 0.03, -0.29] },
  { color: BLUE, at: [-0.08, -0.49, 0.12, -0.08] },
  { color: GOLD, at: [0.1, -0.47, -0.14, -0.27] },
  { color: LILAC, at: [0.17, -0.25, -0.06, -0.1] },
] as const;

/** Reused screen-space bulb buffer. */
const bulbBuf: number[] = [];

/** The decorated tree standing at (x, base), `h` tall without its star. */
function christmasTree(ctx: Ctx, s: Scene, x: number, base: number, h: number): void {
  const lw = lineW(s);

  // Trunk
  roundRectPath(ctx, x - h * 0.045, base - h * 0.14, h * 0.09, h * 0.15, h * 0.01);
  outlined(ctx, TRUNK, lw, INK);

  // Tiers, bottom up, so each overlaps the one below: lit top, shaded hem and right side.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i]!;
    ctx.beginPath();
    tierPath(ctx, x, base, h, t);
    const g = ctx.createLinearGradient(0, base + t.top * h, 0, base + t.bottom * h);
    g.addColorStop(0, PINE_LIGHT);
    g.addColorStop(0.55, PINE);
    g.addColorStop(1, PINE_DARK);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    tierPath(ctx, x, base, h, t, true);
    ctx.fillStyle = TIER_SHADE;
    ctx.fill();
    ctx.beginPath();
    tierPath(ctx, x, base, h, t);
    ink(ctx, lw, INK);
  }

  // Gold garlands, inked like tinsel ropes.
  ctx.beginPath();
  for (let i = 0; i + 5 < SWOOPS.length; i += 6) {
    ctx.moveTo(x + SWOOPS[i]! * h, base + SWOOPS[i + 1]! * h);
    ctx.quadraticCurveTo(x + SWOOPS[i + 2]! * h, base + SWOOPS[i + 3]! * h, x + SWOOPS[i + 4]! * h, base + SWOOPS[i + 5]! * h);
  }
  inkedLine(ctx, GOLD, Math.max(1.2, h * 0.012), Math.max(0.8, lw * 0.4), INK);

  // Baubles: one fill per color, one ink pass, one pass of glints.
  const br = h * 0.03;
  for (const b of BAUBLES) {
    ctx.beginPath();
    for (let i = 0; i + 1 < b.at.length; i += 2) circle(ctx, x + b.at[i]! * h, base + b.at[i + 1]! * h, br);
    ctx.fillStyle = b.color;
    ctx.fill();
  }
  ctx.beginPath();
  for (const b of BAUBLES) for (let i = 0; i + 1 < b.at.length; i += 2) circle(ctx, x + b.at[i]! * h, base + b.at[i + 1]! * h, br);
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (const b of BAUBLES) {
    for (let i = 0; i + 1 < b.at.length; i += 2) circle(ctx, x + b.at[i]! * h - br * 0.35, base + b.at[i + 1]! * h - br * 0.35, br * 0.32);
  }
  ctx.fillStyle = GLINT;
  ctx.fill();

  // Twinkling lights along the garlands
  bulbBuf.length = 0;
  for (let i = 0; i + 1 < TREE_BULBS.length; i += 2) bulbBuf.push(x + TREE_BULBS[i]! * h, base + TREE_BULBS[i + 1]! * h);
  drawBulbs(ctx, bulbBuf, Math.max(1.6, h * 0.016), s.t, 2.6, Math.max(1, lw * 0.6));

  // Star on top, with a slow pulse and sparkles flicking on around it.
  const r = h * 0.085 * (1 + 0.05 * Math.sin(s.t * 2.2));
  const sy = base - h - r * 0.45;
  // Cel-shaded: lit upper left, deeper gold lower right, split by a hard gradient stop.
  ctx.beginPath();
  starPath(ctx, x, sy, r, 0.48);
  const sg = ctx.createLinearGradient(x - r, sy - r, x + r, sy + r);
  sg.addColorStop(0, "#ffe766");
  sg.addColorStop(0.47, "#ffe766");
  sg.addColorStop(0.47, "#ffb52e");
  sg.addColorStop(1, "#ffb52e");
  outlined(ctx, sg, lw, INK);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const tw = Math.sin(s.t * 2.6 + k * 2.1);
    if (tw < 0.2) continue;
    const a = -2.4 + k * 1.2;
    sparklePath(ctx, x + Math.cos(a) * r * 1.65, sy + Math.sin(a) * r * 1.65, r * 0.38 * tw);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

// ---------------------------------------------------------------- presents

interface BoxSpec {
  x: number; // center, in u from the pile's origin
  y: number; // bottom (negative is up)
  w: number;
  h: number;
  color: string;
  ribbon: string;
}

/** A box with its shade, lid and knot colors worked out once. */
interface Box extends BoxSpec {
  shade: string;
  lid: string;
  knot: string;
}

function boxes(specs: BoxSpec[]): Box[] {
  return specs.map((b) => ({
    ...b,
    shade: mix(b.color, INK, 0.22),
    lid: mix(b.color, "#ffffff", 0.3),
    knot: mix(b.ribbon, INK, 0.15),
  }));
}

/** Under the tree: a big box with a smaller one stacked on it and one beside it. */
const TREE_PILE = boxes([
  { x: -0.068, y: 0, w: 0.052, h: 0.04, color: ICE, ribbon: RED },
  { x: 0, y: 0, w: 0.08, h: 0.058, color: RED, ribbon: GOLD },
  { x: 0.004, y: -0.058, w: 0.054, h: 0.042, color: GREEN, ribbon: WHITE },
]);

/** In front, right: a gold box with a smaller lilac one leaning on it. */
const FRONT_PILE = boxes([
  { x: 0, y: 0, w: 0.062, h: 0.046, color: GOLD, ribbon: RED },
  { x: 0.048, y: 0, w: 0.038, h: 0.029, color: LILAC, ribbon: GOLD },
]);

/** One wrapped box at (ox, oy) for its pile origin, U px per u. */
function present(ctx: Ctx, b: Box, ox: number, oy: number, U: number, lw: number): void {
  const w = b.w * U;
  const h = b.h * U;
  const x = ox + b.x * U;
  const bot = oy + b.y * U;
  const lidH = h * 0.24;
  const rib = Math.max(2, w * 0.17);

  // Body: shaded toward the bottom, ribbon down the middle.
  ctx.beginPath();
  ctx.rect(x - w / 2, bot - h + lidH, w, h - lidH);
  ctx.fillStyle = b.color;
  ctx.fill();
  ctx.fillStyle = b.shade;
  ctx.fillRect(x - w / 2, bot - (h - lidH) * 0.32, w, (h - lidH) * 0.32);
  ctx.fillStyle = b.ribbon;
  ctx.fillRect(x - rib / 2, bot - h + lidH, rib, h - lidH);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(x - rib / 2, bot - h + lidH);
  ctx.lineTo(x - rib / 2, bot);
  ctx.moveTo(x + rib / 2, bot - h + lidH);
  ctx.lineTo(x + rib / 2, bot);
  ink(ctx, lw * 0.6, INK);

  // Lid: a little wider and lighter.
  ctx.beginPath();
  ctx.rect(x - w * 0.54, bot - h, w * 1.08, lidH);
  ctx.fillStyle = b.lid;
  ctx.fill();
  ctx.fillStyle = b.ribbon;
  ctx.fillRect(x - rib / 2, bot - h, rib, lidH);
  ink(ctx, lw, INK);

  // Bow: two loops and a knot.
  const bw = Math.max(3, w * 0.24);
  ctx.beginPath();
  oval(ctx, x - bw * 0.85, bot - h - bw * 0.42, bw * 0.95, bw * 0.55, 0.45);
  oval(ctx, x + bw * 0.85, bot - h - bw * 0.42, bw * 0.95, bw * 0.55, -0.45);
  outlined(ctx, b.ribbon, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, x, bot - h - bw * 0.12, bw * 0.38);
  outlined(ctx, b.knot, lw * 0.8, INK);
}

// ---------------------------------------------------------------- snowman

/** Snowballs bottom to top: [center height, radius] in u. The head is big enough for a face. */
const SNOWBALLS = [
  [0.062, 0.068],
  [0.155, 0.05],
  [0.236, 0.044],
] as const;

/** Coal eyes: x offsets from the center line, in u. */
const EYES = [-0.016, 0.014] as const;
const HAT = "#343c75";
const HAT_BRIM = mix(HAT, "#ffffff", 0.12);
const SCARF_TAIL = mix(RED, INK, 0.12);
const SCARF_STRIPE = mix(RED, "#ffffff", 0.85);

/**
 * A shaded snowball: blue shade on the lower right, lit snow up left, inked. The lit disc
 * sits just inside the ball, so no clip is needed.
 */
function snowball(ctx: Ctx, x: number, y: number, r: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = SNOW_SHADE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.08, y - r * 0.08, r * 0.88);
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r);
  ink(ctx, lw, INK);
}

/** A twig arm from (x0, y0) at angle `a`, `len` long, with two little fingers. */
function arm(ctx: Ctx, x0: number, y0: number, a: number, len: number): void {
  const x1 = x0 + Math.cos(a) * len;
  const y1 = y0 + Math.sin(a) * len;
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  const mx = x0 + Math.cos(a) * len * 0.7;
  const my = y0 + Math.sin(a) * len * 0.7;
  ctx.moveTo(mx, my);
  ctx.lineTo(mx + Math.cos(a - 0.9) * len * 0.3, my + Math.sin(a - 0.9) * len * 0.3);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + Math.cos(a + 0.7) * len * 0.22, y1 + Math.sin(a + 0.7) * len * 0.22);
}

/**
 * A snowman standing at (x, base), U px per u (about 0.34u tall with his hat). The face is
 * laid out with a clear gap between hat brim, eyes, nose, smile and scarf, so no two inked
 * features touch even at phone size.
 */
function snowman(ctx: Ctx, s: Scene, x: number, base: number, U: number): void {
  const lw = lineW(s);
  const t = s.t;

  // Twig arms behind the body: the left one rests, the right one waves.
  const wave = Math.sin(t * 3.2) * 0.28 * Math.max(0, Math.sin(t * 0.7));
  ctx.beginPath();
  arm(ctx, x - 0.03 * U, base - 0.165 * U, Math.PI + 0.6, 0.062 * U);
  arm(ctx, x + 0.03 * U, base - 0.17 * U, -0.7 + wave, 0.075 * U);
  inkedLine(ctx, TWIG, Math.max(1.5, 0.009 * U), Math.max(0.8, lw * 0.5), INK);

  for (const [cy, cr] of SNOWBALLS) snowball(ctx, x, base - cy * U, cr * U, lw);

  // Coal buttons, all three below the scarf.
  ctx.beginPath();
  for (let i = 0; i < 3; i++) circle(ctx, x, base - (0.122 + i * 0.022) * U, 0.0065 * U);
  ctx.fillStyle = INK;
  ctx.fill();

  // Scarf: a tail hanging on the right, then a striped band around the neck (stripes go on
  // before the ink, so the outline stays whole).
  ctx.beginPath();
  ctx.moveTo(x + 0.012 * U, base - 0.19 * U);
  ctx.lineTo(x + 0.036 * U, base - 0.19 * U);
  ctx.lineTo(x + 0.044 * U, base - 0.135 * U);
  ctx.lineTo(x + 0.022 * U, base - 0.131 * U);
  ctx.closePath();
  outlined(ctx, SCARF_TAIL, lw * 0.85, INK);
  const scarfTop = base - 0.204 * U;
  roundRectPath(ctx, x - 0.044 * U, scarfTop, 0.088 * U, 0.022 * U, 0.011 * U);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = SCARF_STRIPE;
  for (let i = 0; i < 3; i++) ctx.fillRect(x - 0.03 * U + i * 0.026 * U, scarfTop, 0.009 * U, 0.022 * U);
  ink(ctx, lw * 0.85, INK);

  // Face: coal eyes that blink now and then, a carrot nose, a coal smile.
  const hy = base - SNOWBALLS[2][0] * U;
  const blink = (t + 0.4) % 4.3 < 0.14;
  ctx.beginPath();
  for (const dx of EYES) {
    if (blink) oval(ctx, x + dx * U, hy - 0.012 * U, 0.0068 * U, 0.002 * U);
    else oval(ctx, x + dx * U, hy - 0.014 * U, 0.0058 * U, 0.0075 * U);
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.22 + i * 0.14);
    circle(ctx, x - 0.002 * U + Math.cos(a) * 0.019 * U, hy + 0.0095 * U + Math.sin(a) * 0.011 * U, 0.0042 * U);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, hy - 0.0015 * U);
  ctx.lineTo(x + 0.046 * U, hy + 0.0035 * U);
  ctx.lineTo(x, hy + 0.0085 * U);
  ctx.closePath();
  outlined(ctx, CARROT, lw * 0.55, INK);

  // Top hat sitting on the crown of the head: brim, crown with a red band and a holly sprig.
  const brimTop = hy - 0.046 * U;
  roundRectPath(ctx, x - 0.03 * U, brimTop - 0.056 * U, 0.06 * U, 0.06 * U, 0.004 * U);
  outlined(ctx, HAT, lw, INK);
  ctx.fillStyle = RED;
  ctx.fillRect(x - 0.03 * U + lw / 2, brimTop - 0.013 * U, 0.06 * U - lw, 0.012 * U);
  roundRectPath(ctx, x - 0.047 * U, brimTop, 0.094 * U, 0.012 * U, 0.006 * U);
  outlined(ctx, HAT_BRIM, lw, INK);
  ctx.beginPath();
  oval(ctx, x + 0.012 * U, brimTop - 0.014 * U, 0.011 * U, 0.005 * U, -0.5);
  oval(ctx, x + 0.026 * U, brimTop - 0.014 * U, 0.011 * U, 0.005 * U, 0.5);
  outlined(ctx, GREEN, lw * 0.6, INK);
  ctx.beginPath();
  circle(ctx, x + 0.019 * U, brimTop - 0.01 * U, 0.0055 * U);
  outlined(ctx, RED, lw * 0.6, INK);
}

// ---------------------------------------------------------------- the snowfield

/** Soft rolling drifts on the field, no outline: [depth z, dx in u, width in u, height in u]. */
const HUMPS = [
  [10, -0.55, 0.9, 0.06],
  [8, 0.5, 0.8, 0.055],
  [5.5, -0.05, 0.7, 0.04],
  [4.2, 0.62, 0.55, 0.035],
] as const;

/** Drift shading: lit snow on top, fading into the field at the feet. */
const HUMP_STOPS = [alpha("#ffffff", 0.95), alpha("#ffffff", 0.5), alpha(SNOW_DEEP, 0.18)] as const;

function humps(ctx: Ctx, s: Scene): void {
  for (const [z, dx, w, h] of HUMPS) {
    const U = unit(s, z);
    const y = fieldY(s, z);
    if (y - h * U > s.cssH) continue;
    const x = rowX(s, dx, z);
    ctx.beginPath();
    ctx.moveTo(x - (w * U) / 2, y);
    ctx.bezierCurveTo(x - w * U * 0.25, y - h * U * 1.3, x + w * U * 0.2, y - h * U * 1.3, x + (w * U) / 2, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h * U, 0, y);
    g.addColorStop(0, HUMP_STOPS[0]);
    g.addColorStop(0.45, HUMP_STOPS[1]);
    g.addColorStop(1, HUMP_STOPS[2]);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

/** Sparkles on the snowfield: [depth z, x as a fraction of the half width, phase group]. */
const GLINTS = Array.from({ length: 24 }, (_, i) => [1.3 + hash(i + 2000) * 6, hash(i + 2100) * 2 - 1, i % 3] as const);

/** Tiny four-point glints twinkling on the snowfield, in three alternating groups. */
function glints(ctx: Ctx, s: Scene): void {
  const cx = s.cssW / 2;
  for (let g = 0; g < 3; g++) {
    const tw = Math.max(0, Math.sin(s.t * 1.9 + g * 2.1));
    if (tw < 0.05) continue;
    ctx.beginPath();
    for (const [z, fx, group] of GLINTS) {
      if (group !== g) continue;
      const y = fieldY(s, z);
      if (y < s.horizonY + 2 || y > s.cssH) continue;
      sparklePath(ctx, cx + fx * cx, y, s.u * 0.011 * Math.min(1.6, TOWER_DEPTH / z) * (0.4 + 0.6 * tw));
    }
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.95 * tw;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- layer

/** Floor layer: drifts and glints, the props while the field is in view, and snow over them. */
export function ground(ctx: Ctx, s: Scene): void {
  humps(ctx, s);
  glints(ctx, s);
  if (s.groundY - s.u * 0.6 < s.cssH) props(ctx, s);
  // Snow falling over the field (still behind the tower).
  snow(ctx, s, s.horizonY, s.cssH + s.u * 0.1);
}

/**
 * Back to front: the tree (left) and the snowman (right) on the tower's line, presents at
 * the tree's foot a row nearer, then candy canes and a couple of presents nearest the
 * viewer. Nothing stands in the tower's column above the floor line, and everything stays
 * inside the screen edges and above the stone tiles.
 */
function props(ctx: Ctx, s: Scene): void {
  const lw = lineW(s);

  // The tree, just behind the tower's line.
  {
    const z = 3.2;
    const U = unit(s, z);
    const x = rowX(s, -0.405, z);
    const y = fieldY(s, z);
    christmasTree(ctx, s, x, y + U * 0.01, U * 0.44);
    mound(ctx, x, y + U * 0.012, U * 0.2, U * 0.026, lw);
  }

  // The snowman, on the tower's line.
  {
    const z = 3.05;
    const U = unit(s, z);
    const x = rowX(s, 0.365, z);
    const y = fieldY(s, z);
    snowman(ctx, s, x, y + U * 0.01, U);
    mound(ctx, x, y + U * 0.014, U * 0.2, U * 0.03, lw);
  }

  // Presents under the tree.
  {
    const z = 2.65;
    const U = unit(s, z);
    const x = rowX(s, -0.29, z);
    const y = fieldY(s, z);
    for (const b of TREE_PILE) present(ctx, b, x, y + U * 0.006, U, lw);
    mound(ctx, x - U * 0.02, y + U * 0.01, U * 0.17, U * 0.016, lw);
  }

  // Nearest: crossed candy canes on the left; on the right, a cane beside two presents.
  {
    const z = 1.75;
    const U = unit(s, z);
    const y = fieldY(s, z);
    const x = rowX(s, -0.2, z);
    // Feet a little above the row, so the drifts bury them, round caps and all.
    const foot = y - U * 0.004;
    ctx.beginPath();
    canePath(ctx, x - U * 0.015, foot, U * 0.085, 1, 0.22);
    canePath(ctx, x + U * 0.015, foot, U * 0.08, -1, -0.2);
    const cx = rowX(s, 0.155, z);
    canePath(ctx, cx, foot, U * 0.087, -1, -0.12);
    caneStroke(ctx, Math.max(3, U * 0.014), lw * 0.8);
    mound(ctx, x, y + U * 0.004, U * 0.1, U * 0.018, lw);

    const px = rowX(s, 0.205, z);
    for (const b of FRONT_PILE) present(ctx, b, px, y + U * 0.004, U, lw);
    mound(ctx, (cx + px) / 2 + U * 0.02, y + U * 0.006, U * 0.16, U * 0.016, lw);
  }
}

// ---------------------------------------------------------------- foreground

const ICICLES = [
  [0.04, 0.034],
  [0.09, 0.022],
  [0.15, 0.03],
  [0.85, 0.026],
  [0.9, 0.036],
  [0.95, 0.022],
] as const;

/**
 * Snow lying on the base's grass lip: soft lumps along the top, little drips over the first
 * row of stones (kept short in the middle so "tap to drop" stays clear), and a few icicles
 * near the sides. Drops away with the tiles as you climb.
 */
export function foreground(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = layerGround(s, 1.6) + u * 0.36;
  if (top - u * 0.05 > s.cssH) return;
  const lw = lineW(s);
  const band = u * 0.025;
  const step = u * 0.055;
  const n = Math.ceil(s.cssW / step) + 1;
  const edge = (i: number) => {
    const f = (i * step) / s.cssW;
    const side = f < 0.25 || f > 0.75;
    return band + u * (side ? 0.006 + 0.014 * hash(i + 3100) : 0.002 + 0.004 * hash(i + 3100));
  };

  // Icicles first, so the snow covers their roots.
  ctx.beginPath();
  for (const [fx, len] of ICICLES) {
    const x = fx * s.cssW;
    const y = top + band + u * 0.004;
    ctx.moveTo(x - u * 0.011, y);
    ctx.lineTo(x, y + len * u);
    ctx.lineTo(x + u * 0.011, y);
    ctx.closePath();
  }
  outlined(ctx, "#dff2ff", lw * 0.8, INK);

  ctx.beginPath();
  ctx.moveTo(-step, top);
  for (let i = 0; i <= n; i++) {
    const x = i * step;
    const lump = u * (0.012 + 0.012 * hash(i + 3000));
    ctx.quadraticCurveTo(x - step / 2, top - lump * 2, x, top - u * 0.008);
  }
  ctx.lineTo(n * step + step, top - u * 0.008);
  ctx.lineTo(n * step + step, top + band);
  for (let i = n; i >= 0; i--) {
    const x = i * step;
    ctx.quadraticCurveTo(x + step / 2, top + edge(i) + u * 0.008, x, top + band);
  }
  ctx.lineTo(-step, top + band);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top - u * 0.03, 0, top + band + u * 0.02);
  g.addColorStop(0, SNOW);
  g.addColorStop(0.6, SNOW);
  g.addColorStop(1, SNOW_SHADE);
  outlined(ctx, g, lw, INK);

  // A few blue shade dashes along the lumps.
  ctx.beginPath();
  for (let i = 1; i < n; i += 3) {
    const x = i * step + step * 0.2 * hash(i + 3200);
    ctx.moveTo(x - u * 0.012, top + band * 0.45);
    ctx.quadraticCurveTo(x, top + band * 0.75, x + u * 0.014, top + band * 0.4);
  }
  ctx.strokeStyle = SNOW_DEEP;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.lineCap = "round";
  ctx.stroke();
}

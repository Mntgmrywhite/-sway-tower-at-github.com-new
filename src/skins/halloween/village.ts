import { hash, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { flicker, lightsOut } from "./ambient";
import { LAMP, LAMP_DEEP, mixed, smooth } from "./common";
import { smoke } from "./smoke";
import { cast } from "./cast";
import { HILL_STONE_INDEX, SLOT } from "./slot";
import { level, type Tone } from "./tone";
import { crooked, drawTree, forkAt, windAt, type Tree } from "./trees";

// Beyond the town, as you climb over its rooftops (the stretch B), the land behind it shows before
// the mist gathers over it all:
//  - the far village in the right lane, under the mansion's crag: a huddle of crooked little houses
//    and a steeple, their windows flickering, two chimneys smoking; flat and hazy (far away);
//  - the hill cemetery on the slope in the left lane below the moon (and a corner of it beside the
//    village): a crooked iron fence, leaning stones (a ghost may rise behind one: the cast's), and
//    two twisted trees whose branches curl into spirals, swaying.
// Both are landscape: in the start view they lie hidden behind the corner shops, and as the town
// sinks away (the shops are near, they sink fast) they come into view, sinking more slowly (their
// own parallax), until the mist gathers over them.

/**
 * Their parallax: the village stands on the horizon (it moves with it), the cemetery up the hollow's
 * slope a little farther off; both beyond Main Street, whose floor runs from the horizon down.
 */
export const VILLAGE_P = 0.12;
export const CEMETERY_P = 0.1;
/** Their ground lines at the start, below (+) or above (-) the start horizon (u). */
const VILLAGE_DROP = 0.002;
const CEMETERY_DROP = -0.075;
/** The cemetery comes out of the dark as the town sinks away, and fades into the gathering mist. */
const CEMETERY_IN = [13, 18] as const;
const CEMETERY_FADE = [36, 48] as const;

/** The start view's horizon (where these are laid out from), and how far they have sunk since. */
function ground(s: Scene, p: number, drop: number): number {
  return s.horizonY - HORIZON_P * s.rise + drop * s.u + p * s.rise;
}

// ---------------------------------------------------------------- the far village

/** Houses: x (u from the screen's center), width, wall height, roof (0 gable, 1 steep gable, 2 flat with a chimney), lean. */
const HOUSES = [
  [0.29, 0.034, 0.03, 1, -0.06],
  [0.322, 0.04, 0.038, 0, 0.05],
  [0.36, 0.03, 0.05, 2, -0.04],
  [0.42, 0.038, 0.032, 1, 0.08],
  [0.455, 0.032, 0.042, 0, -0.07],
  [0.49, 0.036, 0.03, 2, 0.04],
] as const;
/** The steeple: x, its tower's width and height, the spire's height (u). */
const STEEPLE = { x: 0.392, w: 0.016, h: 0.07, spire: 0.06 } as const;

/** Scratch: the village's spots this frame (screen px), for the cast; vis 0 when out of sight. */
export const VILLAGE_AT = { vis: 0, k: 0, ground: 0, steeple: { x: 0, y: 0 }, roof: { hx: 0, hy: 0, ex: 0, ey: 0 } };

/** Where the village stands this frame (sets VILLAGE_AT); false when it is out of sight. */
export function villageAt(s: Scene, tone: Tone): boolean {
  const u = s.u;
  const g = ground(s, VILLAGE_P, VILLAGE_DROP);
  const cx = s.cssW / 2;
  VILLAGE_AT.vis = 0;
  VILLAGE_AT.k = 0.25;
  VILLAGE_AT.ground = g;
  VILLAGE_AT.steeple.x = cx + (STEEPLE.x + 0.004) * u;
  VILLAGE_AT.steeple.y = g - (STEEPLE.h + STEEPLE.spire) * u;
  VILLAGE_AT.roof.hx = cx + 0.437 * u;
  VILLAGE_AT.roof.hy = g - 0.032 * u;
  VILLAGE_AT.roof.ex = cx + 0.404 * u;
  VILLAGE_AT.roof.ey = g - 0.03 * u;
  // In the start view it lies hidden behind the corner shops: it comes out as the town sinks.
  const vis = smooth(CEMETERY_IN[0], CEMETERY_IN[1], level(s)) * tone.hollow;
  if (g - u * 0.14 > s.cssH || vis <= 0.004) return false;
  VILLAGE_AT.vis = vis;
  return true;
}

/** The far village under the crag in the right lane: crooked little houses, a steeple, lit windows, smoke. */
export function village(ctx: Ctx, s: Scene, tone: Tone): void {
  if (!villageAt(s, tone)) return;
  const u = s.u;
  const g = VILLAGE_AT.ground;
  const cx = s.cssW / 2;
  const col1 = s.baseX + s.baseW + u * 0.05;
  const right = s.cssW - u * 0.012;
  const body = mixed(tone.haze, tone.hill, 0.45);
  ctx.globalAlpha = VILLAGE_AT.vis;
  ctx.beginPath();
  for (const [x, w, h, roof, lean] of HOUSES) {
    const x0 = cx + (x - w / 2) * u;
    const x1 = cx + (x + w / 2) * u;
    if (x0 < col1 || x1 > right) continue;
    const top = g - h * u;
    const sh = lean * h * u;
    ctx.moveTo(x0, g + 2);
    ctx.lineTo(x0 + sh, top);
    if (roof === 2) {
      ctx.lineTo(x1 + sh, top);
      ctx.rect(x1 + sh - w * u * 0.3, top - u * 0.016, w * u * 0.16, u * 0.016);
      ctx.moveTo(x1 + sh, top);
    } else {
      const peak = top - w * u * (roof === 1 ? 0.95 : 0.55);
      ctx.lineTo(x0 + sh - w * u * 0.08, top + 1);
      ctx.lineTo((x0 + x1) / 2 + sh * 1.4, peak);
      ctx.lineTo(x1 + sh + w * u * 0.08, top + 1);
      ctx.lineTo(x1 + sh, top);
    }
    ctx.lineTo(x1, g + 2);
    ctx.closePath();
  }
  // The steeple: a thin tower and a spire leaning a little.
  const sx = cx + STEEPLE.x * u;
  if (sx - STEEPLE.w * u > col1 && sx + STEEPLE.w * u < right) {
    const top = g - STEEPLE.h * u;
    ctx.rect(sx - (STEEPLE.w / 2) * u, top, STEEPLE.w * u, STEEPLE.h * u + 2);
    ctx.moveTo(sx - STEEPLE.w * 0.65 * u, top + 1);
    ctx.lineTo(sx + u * 0.004, top - STEEPLE.spire * u);
    ctx.lineTo(sx + STEEPLE.w * 0.65 * u, top + 1);
    ctx.closePath();
  }
  ctx.fillStyle = body;
  ctx.fill();
  // Lit windows, flickering; now and then one goes dark.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < HOUSES.length; i++) {
      const [x, w, h] = HOUSES[i]!;
      const x0 = cx + (x - w / 2) * u;
      if (x0 < col1 || cx + (x + w / 2) * u > right) continue;
      for (let j = 0; j < 2; j++) {
        const seed = 3900 + i * 2 + j;
        if (hash(seed) < 0.3 || lightsOut(s.t, seed, 4 + hash(seed + 1) * 20)) continue;
        if ((flicker(s.t, seed) < 1) !== (pass === 0)) continue;
        const wx = x0 + w * u * (0.2 + j * 0.45);
        const wy = g - h * u * (0.75 - (j % 2) * 0.1);
        ctx.rect(wx, wy, Math.max(1.5, u * 0.006), Math.max(2, u * 0.009));
      }
    }
    ctx.fillStyle = pass === 0 ? LAMP_DEEP : LAMP;
    ctx.fill();
  }
  // Two chimneys smoking.
  smoke(ctx, s.t, cx + (0.36 + 0.015 * 0.6) * u, g - 0.066 * u, u * 0.005, u * 0.07, u * 0.02, 1.4, 0.22, 17);
  smoke(ctx, s.t, cx + (0.49 + 0.012) * u, g - 0.046 * u, u * 0.005, u * 0.06, u * 0.02, 1.7, 0.2, 23);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the hill cemetery

/** Stones on the slope: x (u from the center; negative the left lane), height, width, lean, kind (0 round, 1 pointed, 2 cross). */
export const HILL_STONES = [
  [-0.44, 0.03, 0.016, -0.12, 1],
  [-0.37, 0.022, 0.018, 0.1, 0],
  [-0.4, 0.032, 0.012, 0.06, 2],
  [0.462, 0.024, 0.016, -0.1, 0],
] as const;
export { HILL_STONE_INDEX } from "./slot";
/** Two twisted trees: x (u), height (u), seed. */
const HILL_TREES: readonly { x: number; h: number; tree: Tree }[] = [
  { x: -0.43, h: 0.085, tree: crooked(77, 0.25, 1.15, 4, 1, 1) },
  { x: -0.355, h: 0.085, tree: crooked(91, -0.2, 1.1, 4, 1, -1) },
];
const CEM_BODY = "#22213e";
const CEM_TREE = "#0c0b18";
const CEM_RIM = "#6a68a4";
const CEM_FENCE = "#0e0c1a";

/** Scratch: the cemetery's spots this frame (screen px): its stones' feet and its trees' boughs. vis 0 when out of sight. */
export const CEMETERY_AT = {
  vis: 0,
  k: 0,
  stones: HILL_STONES.map(() => ({ x: 0, y: 0, h: 0, shown: false })),
  boughs: HILL_TREES.map(() => ({ x: 0, y: 0, shown: false })),
};

/**
 * The hill cemetery: on the slope in the left lane (and a stone and a fence beside the village):
 * a crooked iron fence along the slope, leaning stones lit along one edge by the moon, two twisted
 * trees curling into spirals, swaying.
 */
/** Whether x0..x1 (px) lies whole in a side lane. */
function inLane(s: Scene, x0: number, x1: number): boolean {
  const u = s.u;
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  return (x1 < col0 && x0 > u * 0.012) || (x0 > col1 && x1 < s.cssW - u * 0.012);
}

/** Where the cemetery lies this frame (sets CEMETERY_AT, its stones and boughs); false when out of sight. */
export function cemeteryAt(s: Scene): boolean {
  const u = s.u;
  const g = ground(s, CEMETERY_P, CEMETERY_DROP);
  const cx = s.cssW / 2;
  const lvl = level(s);
  const fade = smooth(CEMETERY_IN[0], CEMETERY_IN[1], lvl) * (1 - smooth(CEMETERY_FADE[0], CEMETERY_FADE[1], lvl));
  CEMETERY_AT.vis = 0;
  CEMETERY_AT.k = 0.3;
  for (let i = 0; i < HILL_TREES.length; i++) {
    const tr = HILL_TREES[i]!;
    const x = cx + tr.x * u;
    const h = tr.h * u;
    const b = CEMETERY_AT.boughs[i]!;
    b.shown = inLane(s, x - h * 0.6, x + h * 0.6);
    const f = forkAt(tr.tree, x, g + u * 0.004, h, tr.tree.reacher);
    b.x = f.x;
    b.y = f.y;
  }
  for (let i = 0; i < HILL_STONES.length; i++) {
    const [x, h, w] = HILL_STONES[i]!;
    const sx = cx + x * u;
    const st = CEMETERY_AT.stones[i]!;
    st.shown = inLane(s, sx - w * u, sx + w * u);
    st.x = sx;
    st.y = g + u * 0.004;
    st.h = h * u;
  }
  if (g - u * 0.12 > s.cssH || fade <= 0.004) return false;
  CEMETERY_AT.vis = fade;
  return true;
}

export function cemetery(ctx: Ctx, s: Scene): void {
  if (!cemeteryAt(s)) return;
  const u = s.u;
  const g = ground(s, CEMETERY_P, CEMETERY_DROP);
  const fade = CEMETERY_AT.vis;
  const cx = s.cssW / 2;
  const col0 = s.baseX - u * 0.05;
  ctx.globalAlpha = fade;
  const lx1 = Math.min(col0 - u * 0.005, cx - 0.28 * u);
  // Trees behind the fence, swaying, a branch reaching now and then.
  for (let i = 0; i < HILL_TREES.length; i++) {
    const tr = HILL_TREES[i]!;
    if (!CEMETERY_AT.boughs[i]!.shown) continue;
    drawTree(ctx, tr.tree, cx + tr.x * u, g + u * 0.004, tr.h * u, CEM_TREE, windAt(s.t, 77 + i * 14, 0.1, 0, 1));
  }
  // The stones, leaning, lit along one edge (a ghost may rise behind one: the cast's, just before them).
  for (let i = 0; i < HILL_STONES.length; i++) if (CEMETERY_AT.stones[i]!.shown) cast(ctx, s, SLOT.stone, HILL_STONE_INDEX + i);
  ctx.globalAlpha = fade;
  ctx.beginPath();
  for (let i = 0; i < HILL_STONES.length; i++) {
    const [x, h, w, lean, kind] = HILL_STONES[i]!;
    if (!CEMETERY_AT.stones[i]!.shown) continue;
    stonePath(ctx, cx + x * u, g + u * 0.006, w * u, h * u, lean, kind);
  }
  ctx.fillStyle = CEM_BODY;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < HILL_STONES.length; i++) {
    if (!CEMETERY_AT.stones[i]!.shown) continue;
    const [x, h, w, lean] = HILL_STONES[i]!;
    const sx = cx + x * u;
    ctx.moveTo(sx - w * u * 0.5, g + u * 0.004);
    ctx.lineTo(sx - w * u * 0.5 + lean * h * u, g - h * u * 0.85);
  }
  ctx.strokeStyle = CEM_RIM;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  // The crooked iron fence, spear-tipped, along the slope in front.
  ctx.beginPath();
  const step = u * 0.022;
  const fy = g + u * 0.012;
  const fh = u * 0.026;
  for (let side = -1; side <= 1; side += 2) {
    const a = side < 0 ? u * 0.015 : cx + 0.43 * u;
    const b = side < 0 ? lx1 - u * 0.006 : Math.min(s.cssW - u * 0.015, cx + 0.5 * u);
    if (b - a < step) continue;
    ctx.moveTo(a, fy - fh * 0.75);
    ctx.lineTo(b, fy - fh * 0.75 + u * 0.002);
    ctx.moveTo(a, fy - fh * 0.25);
    ctx.lineTo(b, fy - fh * 0.25);
    for (let x = a, i = 0; x <= b; x += step, i++) {
      const lean = (hash(i + 3960 + side * 50) - 0.5) * u * 0.008;
      ctx.moveTo(x, fy);
      ctx.lineTo(x + lean, fy - fh);
      ctx.lineTo(x + lean - u * 0.003, fy - fh + u * 0.005);
      ctx.moveTo(x + lean, fy - fh);
      ctx.lineTo(x + lean + u * 0.003, fy - fh + u * 0.005);
    }
  }
  ctx.strokeStyle = CEM_FENCE;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A leaning stone of `kind` with its foot at (x, y), w wide, h tall, as a closed subpath. */
function stonePath(ctx: Ctx, x: number, y: number, w: number, h: number, lean: number, kind: number): void {
  const L = lean * h;
  const r = w / 2;
  if (kind === 2) {
    const pw = w * 0.18;
    ctx.moveTo(x - pw, y);
    ctx.lineTo(x - pw + L * 0.6, y - h * 0.62);
    ctx.lineTo(x - r + L * 0.6, y - h * 0.62);
    ctx.lineTo(x - r + L * 0.7, y - h * 0.76);
    ctx.lineTo(x - pw + L * 0.7, y - h * 0.76);
    ctx.lineTo(x - pw + L, y - h);
    ctx.lineTo(x + pw + L, y - h);
    ctx.lineTo(x + pw + L * 0.7, y - h * 0.76);
    ctx.lineTo(x + r + L * 0.7, y - h * 0.76);
    ctx.lineTo(x + r + L * 0.6, y - h * 0.62);
    ctx.lineTo(x + pw + L * 0.6, y - h * 0.62);
    ctx.lineTo(x + pw, y);
    ctx.closePath();
    return;
  }
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r + L * 0.8, y - h * 0.7);
  if (kind === 0) ctx.quadraticCurveTo(x + L - r * 0.2, y - h * 1.12, x + r + L * 0.8, y - h * 0.7);
  else {
    ctx.quadraticCurveTo(x - r * 0.8 + L * 0.9, y - h * 0.92, x + L, y - h);
    ctx.quadraticCurveTo(x + r * 0.8 + L * 0.9, y - h * 0.92, x + r + L * 0.8, y - h * 0.7);
  }
  ctx.lineTo(x + r, y);
  ctx.closePath();
}

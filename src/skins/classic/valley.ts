import { alpha, circle, hash, ink, mix, type Ctx } from "../../base/draw";
import { fieldY, puffs } from "../../base/world";
import type { Scene } from "../skin";
import { bunny, deer, duck } from "./animals";
import {
  FROND,
  FROND_LIGHT,
  HAZE,
  INK,
  inkW,
  LEAF,
  PALETTE,
  PINE,
  spot,
  TRUNK,
  TRUNK_SHADE,
} from "./colors";
import { beforeMesa, behindMesa, inLake, lake, LAKE_B, LAKE_Z, mesas } from "./lake";
import { palmFronds, palmFrondsLight, palmRings, palmTop, palmTrunk } from "./plants";

// The valley far below the keep, laid out on the ground plane: X is sideways (u, measured at
// the tower's depth, so a true ground coordinate) and z is depth (3 is the tower's line). The
// base field already paints it green; on top of it, back to front: lush meadow patchwork,
// two rolling green ridges dotted with trees and palms, a forest of round treetops and palms
// (flat and faded far away, inked up close), the deep-blue lake with its waterfall mesas, and
// the forest animals: a fox on a mesa, deer drinking, ducks paddling, rabbits hopping, all
// under giant sunflowers at the meadow's edge. Everything stays out of the tower's column.

// ---------------------------------------------------------------- meadow patchwork

/** Bands of meadow: depth edges. */
const BANDS = [9.5, 12, 15.5, 20, 27, 38, 60] as const;
const PATCH = [
  alpha("#c4f25e", 0.6), // lime meadow
  alpha("#239448", 0.45), // deep grass
  alpha("#ffe36a", 0.5), // buttercups
  alpha("#7fd650", 0.55), // pasture
] as const;
const HEDGE = alpha("#2f8f47", 0.4);

function patchwork(ctx: Ctx, s: Scene): void {
  if (fieldY(s, BANDS[BANDS.length - 1]!) > s.cssH) return;
  for (let tone = 0; tone < PATCH.length; tone++) {
    ctx.beginPath();
    for (let b = 0; b + 1 < BANDS.length; b++) patchRow(ctx, s, b, tone);
    ctx.fillStyle = PATCH[tone]!;
    ctx.fill();
  }
  ctx.beginPath();
  for (let b = 0; b < BANDS.length - 1; b++) {
    const y = fieldY(s, BANDS[b]!);
    if (y > s.cssH) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(s.cssW, y);
  }
  ctx.strokeStyle = HEDGE;
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.stroke();
}

/** Quads of one band whose hashed tone is `tone`, leaving gaps (plain field) here and there. */
function patchRow(ctx: Ctx, s: Scene, b: number, tone: number): void {
  const z0 = BANDS[b]!;
  const z1 = BANDS[b + 1]!;
  const y0 = fieldY(s, z0);
  if (y0 < s.horizonY || fieldY(s, z1) > s.cssH) return;
  const w = 0.16 * z0 * 0.3 + 0.2;
  const reach = (s.cssW / 2 / s.u) * (z0 / 3) + w;
  const i0 = Math.floor(-reach / w);
  const i1 = Math.ceil(reach / w);
  for (let i = i0; i <= i1; i++) {
    const h = hash(b * 131 + i * 7 + 5000);
    if (Math.floor(h * 5.5) !== tone) continue;
    const skew = (hash(b * 17 + i + 5100) - 0.5) * w * 0.5;
    const xa = i * w + skew;
    const xb = (i + 1) * w + skew - w * 0.06;
    const a = spot(s, xa, z0);
    const ax = a.x;
    const ay = a.y;
    const c = spot(s, xb, z0);
    const cx = c.x;
    const d = spot(s, xb + skew * 0.4, z1);
    const dx = d.x;
    const dy = d.y;
    const e = spot(s, xa + skew * 0.4, z1);
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, ay);
    ctx.lineTo(dx, dy);
    ctx.lineTo(e.x, dy);
    ctx.closePath();
  }
}

// ---------------------------------------------------------------- rolling ridges

/**
 * Rolling green hills across the valley, rising in front of the cloud bank:
 * [z, height (u at the tower's depth), amplitude, frequency, phase].
 */
const RIDGES = [
  [17, 0.36, 0.1, 1.3, 0.4],
  [11.5, 0.26, 0.085, 2.1, 2.3],
] as const;
/** Contour bands down each hill's face, as fractions of the way from the crest to its foot. */
const CONTOURS = [0.38, 0.68] as const;
const RIDGE_TONES = RIDGES.map(([z]) => {
  const fade = Math.min(1, (z - 6) / 14);
  const body = mix(LEAF[2], HAZE, 0.12 + fade * 0.38);
  return {
    body,
    light: mix(body, "#f4ffc0", 0.4),
    band: mix(body, "#2f9a2c", 0.2),
    shade: mix(body, "#1f7a4a", 0.25),
    tree: mix(LEAF[1], HAZE, 0.2 + fade * 0.5),
    palm: mix(FROND, HAZE, 0.2 + fade * 0.5),
  };
});
/** Trees standing on each ridge: [X, kind (0 round, 1 palm), size]. Planted once. */
const RIDGE_TREES = RIDGES.map(([z], r) =>
  Array.from({ length: 34 }, (_, i) => {
    const X = (i - 16.5) * 0.17 * (z / 6) + (hash(i + r * 50 + 1200) - 0.5) * 0.12 * (z / 6);
    return [X, hash(i + r * 50 + 1210) < 0.35 ? 1 : 0, 0.8 + hash(i + r * 50 + 1220) * 0.5] as const;
  }),
);
const RIDGE_STEP = 0.035; // sample spacing in u on screen

function ridgeH(r: number, X: number): number {
  const [, h, amp, f, ph] = RIDGES[r]!;
  return h + amp * Math.sin(X * f + ph) + amp * 0.5 * Math.sin(X * f * 2.3 + ph * 1.7);
}

function ridge(ctx: Ctx, s: Scene, r: number): void {
  const [z, h, amp] = RIDGES[r]!;
  const p = spot(s, 0, z);
  const base = p.y;
  const k = p.k;
  if (base - s.u * k * (h + amp * 1.5) > s.cssH) return;
  const uk = s.u * k;
  const cx = s.cssW / 2;
  const tone = RIDGE_TONES[r]!;
  const step = s.u * RIDGE_STEP;
  // Trees first, so the ridge's crest line cuts their feet into the slope.
  const trees = RIDGE_TREES[r]!;
  for (let kind = 0; kind < 2; kind++) {
    ctx.beginPath();
    for (const [X, kd, size] of trees) {
      if (kd !== kind) continue;
      const x = cx + X * uk;
      const R = uk * 0.045 * size;
      if (x < -R * 2 || x > s.cssW + R * 2 || Math.abs(x - cx) < s.u * 0.25 + R * 1.5) continue;
      const y = base - ridgeH(r, X) * uk + R * 0.5;
      if (kind === 0) {
        circle(ctx, x, y - R * 1.1, R);
        circle(ctx, x - R * 0.7, y - R * 0.6, R * 0.7);
        circle(ctx, x + R * 0.7, y - R * 0.55, R * 0.72);
      } else {
        const t = palmTop(x, y, R, X > 0 ? 0.4 : -0.4, 0);
        const tx = t.x;
        const ty = t.y;
        palmTrunk(ctx, x, y, R, X > 0 ? 0.4 : -0.4, 0);
        palmFronds(ctx, tx, ty, R, s.t + X * 3, false);
      }
    }
    ctx.fillStyle = kind === 0 ? tone.tree : tone.palm;
    ctx.fill();
  }
  // The ridge: body, a shaded foot, a lit crest.
  ctx.beginPath();
  ctx.moveTo(-step, base + 2);
  for (let x = -step; x <= s.cssW + step; x += step) ctx.lineTo(x, base - ridgeH(r, (x - cx) / uk) * uk);
  ctx.lineTo(s.cssW + step, base + 2);
  ctx.closePath();
  ctx.fillStyle = tone.body;
  ctx.fill();
  // Contour bands following the rolls down the face, then a lit crest.
  ctx.beginPath();
  for (const f of CONTOURS) {
    for (let x = -step; x <= s.cssW + step; x += step) {
      const y = base - ridgeH(r, (x - cx) / uk) * uk * (1 - f);
      if (x < 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.lineJoin = "round";
  ctx.strokeStyle = tone.band;
  ctx.lineWidth = Math.max(1.5, uk * 0.016);
  ctx.stroke();
  ctx.beginPath();
  for (let x = -step; x <= s.cssW + step; x += step) {
    const y = base - ridgeH(r, (x - cx) / uk) * uk;
    if (x < 0) ctx.moveTo(x, y + uk * 0.008);
    else ctx.lineTo(x, y + uk * 0.008);
  }
  ctx.strokeStyle = tone.light;
  ctx.lineWidth = Math.max(1.5, uk * 0.014);
  ctx.stroke();
  ctx.fillStyle = tone.shade;
  ctx.fillRect(0, base - uk * 0.03, s.cssW, uk * 0.03 + 2);
}

// ---------------------------------------------------------------- where the animals live

// On a phone the tower's column covers the middle of the valley (|X| < z / 12 behind the
// floor line), so everyone lives to the sides. The fox and the sunflowers live on the bluffs.
// The deer stand at the water's edge, just far enough back that the near tower's pennant
// streams below their hooves.
const DEER_X = 0.36;
const DEER_Z = 3.17;
const FAWN_X = 0.46;
const FAWN_Z = 3.25;
/** Rabbits: [X at the start of their run, X at the end, z, phase]. */
const BUNNIES = [
  [-0.31, -0.26, 2.85, 0],
  [0.23, 0.26, 2.55, 3.1],
] as const;
const BUNNY_Z = 2.55;
/** Ducks paddle back and forth on the left of the lake, below the falls: center (ground units). */
const DUCK_X = -0.45;
const DUCK_Z = 3.75;

/**
 * No trees where the animals are, nor in front of them (nearer trees would hide them):
 * [X, nearest z, farthest z, half width].
 */
const CLEARINGS = [
  [(DEER_X + FAWN_X) / 2, 2.4, DEER_Z + 0.25, 0.16],
  [-0.29, 2.4, 3.1, 0.1],
  [0.25, 2.3, 2.8, 0.1],
] as const;

// ---------------------------------------------------------------- the forest

const Z_NEAR = 2.35;
const Z_FAR = 10.5;
const RATIO = 1.1;
const ROWS = Math.ceil(Math.log(Z_FAR / Z_NEAR) / Math.log(RATIO));
/** Row depths, near to far. */
const ROW_Z = Array.from({ length: ROWS + 1 }, (_, j) => Z_NEAR * Math.pow(RATIO, j));
/** Tree spacing along a row, ground units. */
const SPACING = 0.07;
/** Crown radius, ground units. */
const CROWN = 0.046;

/** How thick the woods are at (X, z): 0 = open meadow, 1 = solid forest. */
function density(X: number, z: number): number {
  const l = inLake(X, z);
  if (l < 1.16) return 0; // water and its beach
  if (beforeMesa(X, z)) return 0;
  for (const [cx, z0, z1, hw] of CLEARINGS) {
    const a = (X - cx) / hw;
    const b = (z - (z0 + z1) / 2) / ((z1 - z0) / 2);
    if (a * a + b * b * b * b < 1) return 0;
  }
  // An open meadow in front of the lake with a few trees, woods round the rest of it, and
  // beyond, patches of forest among the meadows.
  if (z < LAKE_Z - LAKE_B * 0.5) return Math.abs(X) > 0.6 ? 0.85 : 0.08;
  if (l < 2.1) return 0.95;
  const n = Math.sin(X * 1.9 + z * 0.35) + 0.8 * Math.sin(X * 0.8 - z * 0.6 + 1.3) + 0.4 * Math.sin(z * 0.9 + X * 3.1);
  return n > -0.35 ? 0.95 : n > -0.6 ? 0.3 : 0;
}

/** True when a tree's crown would show in the tower's column above the floor line. */
function inColumn(s: Scene, x: number, y: number, r: number): boolean {
  if (y - r * 3.2 > s.groundY) return false;
  const half = s.u * 0.25 + r * 1.3;
  return Math.abs(x - s.cssW / 2) < half;
}

/** Faded color of a row at depth z. */
const ROW_TONES = ROW_Z.map((z, j) => {
  const fade = Math.min(1, Math.max(0, (z - 3.5) / 10));
  const base = LEAF[j % LEAF.length]!;
  const body = mix(base, HAZE, fade * 0.7);
  const pine = mix(PINE, HAZE, fade * 0.65);
  const frond = mix(FROND, HAZE, fade * 0.65);
  return {
    body,
    light: mix(body, "#efffb8", 0.38 * (1 - fade * 0.6)),
    pine,
    pineLight: mix(pine, "#c8f5a0", 0.3 * (1 - fade * 0.6)),
    trunk: mix("#8a5a3a", HAZE, fade),
    palmTrunk: mix(TRUNK, HAZE, fade * 0.8),
    ring: mix(TRUNK_SHADE, HAZE, fade * 0.8),
    frond,
    frondLight: mix(FROND_LIGHT, HAZE, fade * 0.6),
    inked: z < 6,
    /** Far rows are plain blobs: no trunk, one lobe, no lit cap. */
    simple: z > 7.5,
    /** Near rows are big enough that a tree cut by the screen edge would show. */
    whole: z < 5.5,
  };
});

/** Widest screen the forest is planted for, as half width in u (beyond it the woods end). */
const MAX_HALF = 2.2;

/** Tree kinds. */
const ROUND = 0;
const PINE_TREE = 1;
const PALM = 2;

/**
 * Every row's trees, planted once: per slot i (spacing SPACING along the row), the tree's X,
 * or NaN for open ground; its size; its kind; a palm's lean.
 */
const TREES = ROW_Z.map((z, j) => {
  const reach = MAX_HALF * (z / 3) + SPACING * 2;
  const i0 = Math.floor(-reach / SPACING);
  const n = Math.ceil(reach / SPACING) - i0 + 1;
  const X = new Float32Array(n).fill(NaN);
  const size = new Float32Array(n);
  const kind = new Uint8Array(n);
  const lean = new Float32Array(n);
  const off = (j % 2) * 0.5;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    const seed = j * 977 + i * 31;
    const x = (i + off + (hash(seed) - 0.5) * 0.7) * SPACING;
    const d = density(x, z);
    if (d <= 0 || hash(seed + 1) > d) continue;
    X[k] = x;
    size[k] = 0.8 + hash(seed + 2) * 0.45;
    // Palms love the water's edge and the open meadow; a few pines in the deep woods.
    const shoreSide = inLake(x, z) < 1.9 || z < LAKE_Z - LAKE_B * 0.5;
    const h = hash(seed + 3);
    kind[k] = h < (shoreSide ? 0.42 : 0.2) ? PALM : h > 0.9 ? PINE_TREE : ROUND;
    lean[k] = (hash(seed + 4) - 0.5) * 1.1;
  }
  return { i0, X, size, kind, lean };
});

/** Draw forest rows with depth in (zTo, zFrom], back to front. */
function forest(ctx: Ctx, s: Scene, zFrom: number, zTo: number): void {
  for (let j = ROW_Z.length - 1; j >= 0; j--) {
    const z = ROW_Z[j]!;
    if (z > zFrom || z <= zTo) continue;
    row(ctx, s, j);
  }
}

/**
 * One row of trees, batched by pass: trunks, pines, round crowns, lit caps, then the palms
 * (trunks, rings, fronds, lit fronds). Inked rows are stroked before they are filled, so the
 * fill covers the inner lines and the whole row reads as one clean silhouette.
 */
function row(ctx: Ctx, s: Scene, j: number): void {
  const z = ROW_Z[j]!;
  const y = fieldY(s, z);
  const u = s.u;
  const k = 3 / z;
  const R = CROWN * u * k;
  if (y - R * 3.2 > s.cssH || y < s.horizonY) return;
  const tone = ROW_TONES[j]!;
  const trees = TREES[j]!;
  const reach = s.cssW / 2 / u / k + SPACING * 2;
  const a = Math.max(0, Math.floor(-reach / SPACING) - trees.i0);
  const b = Math.min(trees.X.length - 1, Math.ceil(reach / SPACING) - trees.i0);
  const lw = Math.max(0.8, inkW(s, k) * 0.75);
  const cx = s.cssW / 2;

  for (let pass = 0; pass < 9; pass++) {
    if ((pass === 0 || pass === 6) && !tone.inked) continue;
    if ((pass === 4 || pass === 8) && tone.simple) continue;
    ctx.beginPath();
    let any = false;
    for (let q = a; q <= b; q++) {
      const X = trees.X[q]!;
      if (X !== X) continue; // NaN: open ground
      const x = cx + X * u * k;
      const r = R * trees.size[q]!;
      const kind = trees.kind[q]!;
      const half = kind === PALM ? r * 1.35 : r * 1.05;
      if (x < -half * 2 || x > s.cssW + half * 2 || inColumn(s, x, y, half)) continue;
      // Near trees are props: never cut by the screen edges.
      if (tone.whole && (x - half < 0 || x + half > s.cssW)) continue;
      if (behindMesa(s, x, z, y - r * (kind === PALM ? 3.5 : 2.7), half)) continue;
      const sway = Math.sin(s.t * 1.1 + X * 9 + z) * r * 0.06;
      if (kind === PALM) {
        if (pass < 5) continue;
        const lean = trees.lean[q]!;
        if (pass === 5) palmTrunk(ctx, x, y, r, lean, sway);
        else if (pass === 6) palmRings(ctx, x, y, r, lean, sway);
        else {
          const t = palmTop(x, y, r, lean, sway);
          const tx = t.x;
          const ty = t.y;
          if (pass === 7) palmFronds(ctx, tx, ty, r, s.t * 1.6 + X * 7, !tone.simple);
          else palmFrondsLight(ctx, tx, ty, r, s.t * 1.6 + X * 7);
        }
      } else if (pass === 0) {
        ctx.rect(x - r * 0.12, y - r * 0.9, r * 0.24, r * 0.9);
      } else if (kind === PINE_TREE) {
        if (pass === 1) pineShape(ctx, x, y, r, sway);
        else if (pass === 3) pineLight(ctx, x, y, r, sway);
        else continue;
      } else if (pass === 2) {
        if (tone.simple) circle(ctx, x + sway, y - r * 1.2, r * 1.05);
        else crown(ctx, x + sway, y, r);
      } else if (pass === 4) {
        circle(ctx, x + sway - r * 0.22, y - r * 1.82, r * 0.36);
      } else {
        continue;
      }
      any = true;
    }
    if (!any) continue;
    switch (pass) {
      case 0:
        ink(ctx, lw * 1.6, INK);
        ctx.fillStyle = tone.trunk;
        ctx.fill();
        break;
      case 1:
      case 2:
      case 7:
        if (tone.inked) ink(ctx, lw * 2, INK);
        ctx.fillStyle = pass === 1 ? tone.pine : pass === 2 ? tone.body : tone.frond;
        ctx.fill();
        break;
      case 5:
        if (tone.inked) ink(ctx, lw * 1.6, INK);
        ctx.fillStyle = tone.palmTrunk;
        ctx.fill();
        break;
      case 6:
        ctx.strokeStyle = tone.ring;
        ctx.lineWidth = Math.max(0.8, lw * 0.7);
        ctx.stroke();
        break;
      default:
        ctx.fillStyle = pass === 3 ? tone.pineLight : pass === 4 ? tone.light : tone.frondLight;
        ctx.fill();
    }
  }
}

/** A round treetop standing on (x, y): one big lobe on two smaller ones. */
function crown(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x - r * 0.95, y - r * 0.75);
  ctx.arc(x - r * 0.45, y - r * 0.8, r * 0.55, Math.PI, Math.PI * 1.5);
  ctx.arc(x, y - r * 1.6, r * 0.75, Math.PI * 0.95, Math.PI * 2.05);
  ctx.arc(x + r * 0.48, y - r * 0.8, r * 0.52, Math.PI * 1.5, Math.PI * 2.5);
  ctx.quadraticCurveTo(x, y - r * 0.05, x - r * 0.95, y - r * 0.75);
  ctx.closePath();
}

function pineShape(ctx: Ctx, x: number, y: number, r: number, sway: number): void {
  const h = r * 2.7;
  ctx.moveTo(x + sway * 1.5, y - h);
  ctx.lineTo(x + r * 0.42 + sway, y - h * 0.62);
  ctx.lineTo(x + r * 0.22 + sway, y - h * 0.6);
  ctx.lineTo(x + r * 0.62, y - h * 0.25);
  ctx.lineTo(x + r * 0.15, y - h * 0.22);
  ctx.lineTo(x + r * 0.15, y - r * 0.15);
  ctx.lineTo(x - r * 0.15, y - r * 0.15);
  ctx.lineTo(x - r * 0.15, y - h * 0.22);
  ctx.lineTo(x - r * 0.62, y - h * 0.25);
  ctx.lineTo(x - r * 0.22 + sway, y - h * 0.6);
  ctx.lineTo(x - r * 0.42 + sway, y - h * 0.62);
  ctx.closePath();
}

/** The sunlit left flank of a pine. */
function pineLight(ctx: Ctx, x: number, y: number, r: number, sway: number): void {
  const h = r * 2.7;
  ctx.moveTo(x + sway * 1.5, y - h);
  ctx.lineTo(x - r * 0.3 + sway, y - h * 0.64);
  ctx.lineTo(x - r * 0.05 + sway, y - h * 0.62);
  ctx.closePath();
  ctx.moveTo(x - r * 0.1 + sway, y - h * 0.58);
  ctx.lineTo(x - r * 0.45, y - h * 0.28);
  ctx.lineTo(x - r * 0.08, y - h * 0.26);
  ctx.closePath();
}

// ---------------------------------------------------------------- low clouds

/** Flat wisps of cloud drifting low over the valley, below us: [z, start x (fraction), size (u), speed (px/s)]. */
const WISPS = [
  [14, 0.12, 0.024, 3.2],
  [8.6, 0.78, 0.028, -2.6],
] as const;
/** Puffs of one wisp, in its size: x, y, r. Long and flat. */
const WISP_SHAPE = [
  [-2.3, 0.3, 0.55],
  [-1.3, 0.05, 0.8],
  [-0.2, -0.12, 1],
  [0.95, 0.0, 0.85],
  [2.0, 0.28, 0.6],
  [0.4, 0.38, 0.7],
  [-0.9, 0.4, 0.65],
] as const;
const WISP_BUF = WISP_SHAPE.map(() => ({ x: 0, y: 0, r: 0 }));

function wisp(ctx: Ctx, s: Scene, i: number): void {
  const [z, fx, size, speed] = WISPS[i]!;
  const y0 = fieldY(s, z);
  if (y0 > s.cssH + s.u * 0.1) return;
  const r = s.u * size;
  const span = s.cssW + r * 7;
  const x = ((((fx * s.cssW + s.t * speed) % span) + span) % span) - r * 3.5;
  const y = y0 - r * 0.9 + Math.sin(s.t * 0.4 + i) * r * 0.08;
  for (let k = 0; k < WISP_SHAPE.length; k++) {
    const [dx, dy, dr] = WISP_SHAPE[k]!;
    const b = WISP_BUF[k]!;
    b.x = x + dx * r;
    b.y = y + dy * r;
    b.r = dr * r;
  }
  puffs(ctx, PALETTE, WISP_BUF);
}

// ---------------------------------------------------------------- meadow flowers

const FLOWERS = Array.from({ length: 46 }, (_, i) => [
  (hash(i + 900) - 0.5) * 1.6,
  Z_NEAR + hash(i + 910) * 1.6,
  i % 4,
] as const);
const FLOWER = ["#ffffff", "#ffe24a", "#ff8fc0", "#b46cff"] as const;

function flowers(ctx: Ctx, s: Scene): void {
  for (let c = 0; c < FLOWER.length; c++) {
    ctx.beginPath();
    for (const [X, z, col] of FLOWERS) {
      if (col !== c || inLake(X, z) < 1.1) continue;
      const p = spot(s, X, z);
      if (p.y > s.cssH || inColumn(s, p.x, p.y, 2)) continue;
      circle(ctx, p.x, p.y, Math.max(0.9, s.u * 0.0035 * p.k));
    }
    ctx.fillStyle = FLOWER[c]!;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- animals and sunflowers in place

function deerAtWater(ctx: Ctx, s: Scene): void {
  // The fawn stands a step farther back, so it goes first.
  const b = spot(s, FAWN_X, FAWN_Z);
  deer(ctx, s, b.x, b.y, s.u * 0.056 * b.k, -1, false, 2.3, inkW(s, b.k));
  const a = spot(s, DEER_X, DEER_Z);
  deer(ctx, s, a.x, a.y, s.u * 0.075 * a.k, -1, true, 0, inkW(s, a.k));
}

function bunnies(ctx: Ctx, s: Scene): void {
  // A rabbit either side of the keep: three hops along, a pause to nibble, three hops back.
  for (const [xa, xb, z, phase] of BUNNIES) {
    const period = 8;
    const ph = (s.t + phase) / period;
    const back = Math.floor(ph) % 2 === 1;
    const f = ph - Math.floor(ph);
    const hopT = f * 5;
    const along = Math.min(1, hopT / 3);
    const go = back ? 1 - along : along;
    const p = spot(s, xa + (xb - xa) * go, z);
    const hop = hopT < 3 ? Math.abs(Math.sin(hopT * Math.PI)) : 0;
    bunny(ctx, s, p.x, p.y, s.u * 0.034 * p.k, (xb > xa) !== back ? 1 : -1, hop, inkW(s, p.k));
  }
}

function ducks(ctx: Ctx, s: Scene): void {
  // A mother duck and three ducklings in a line, each following the one ahead: they paddle
  // along, bunch up as they turn, and string out again the other way.
  for (let i = 3; i >= 0; i--) {
    const ph = s.t * 0.25 - i * 0.5;
    const p = spot(s, DUCK_X + Math.sin(ph) * 0.07, DUCK_Z + i * 0.04);
    const dir = Math.cos(ph) >= 0 ? 1 : -1;
    const size = s.u * (i === 0 ? 0.04 : 0.026) * p.k;
    duck(ctx, s, p.x, p.y, size, dir, i === 0, i, inkW(s, p.k) * 0.8);
  }
}

// ---------------------------------------------------------------- layer

/** The valley floor, back to front. */
export function valley(ctx: Ctx, s: Scene): void {
  if (s.horizonY > s.cssH) return;
  const lakeFar = LAKE_Z + LAKE_B * 1.1;
  patchwork(ctx, s);
  ridge(ctx, s, 0);
  ridge(ctx, s, 1);
  // A wisp drifting low along the foot of the hills, another over the woods.
  wisp(ctx, s, 0);
  forest(ctx, s, Infinity, WISPS[1][0]);
  wisp(ctx, s, 1);
  forest(ctx, s, WISPS[1][0], lakeFar);
  lake(ctx, s);
  mesas(ctx, s);
  forest(ctx, s, lakeFar, DUCK_Z);
  ducks(ctx, s);
  // The deer stand between two forest rows; every row in between is drawn before them.
  forest(ctx, s, DUCK_Z, DEER_Z);
  deerAtWater(ctx, s);
  forest(ctx, s, DEER_Z, BUNNY_Z + 0.3);
  flowers(ctx, s);
  bunnies(ctx, s);
  forest(ctx, s, BUNNY_Z + 0.3, 0);
}

export const __parts = { patchwork, forest, lake, mesas, wisp, flowers, bunnies, ducks, deerAtWater };

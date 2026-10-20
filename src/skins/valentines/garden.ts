import { circle, hash, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BOX, CARVING, CHOCOLATE, CREAM, FOAM, INK, JOINT, LAWN, LAWN_FAR, LEAF, MARBLE, PAVING, PETAL, PETAL_PALE, RIBBON, ROSE, ROSE_PINK, WATER, WATER_LIT } from "./colors";
import { cherub, type CherubPart } from "./cupid";
import { landLine } from "./far";
import { block, heartPath, petalPath } from "./shapes";

// The rose garden round the fountain, all of it near: flat two-tone fills and one ink weight.
// A lawn runs from the boulevard's pavement down to the plaza, where the fountain stands: a
// wide heart-shaped pool of blue water rimmed in cream-pink marble, its point toward you, a
// round marble pedestal in its middle for the tower to rise from, petals afloat on it. Behind
// its left lobe, on the lawn and clear of the rim, a column with the cherub, and his heart
// balloon tied to the rim, floating up over his shoulder (cupid.ts). Beside the pool's point two beds of red and pink
// roses, between them and the pool the gifts someone left (a box of chocolates, a bouquet),
// and the plaza's pink pavers run on down under the railing in front (front.ts), petals strewn
// over them. Every prop keeps a little plaza or lawn between itself and the next (layout.test.ts).
// Nothing here moves above the tower's floor line but the cherub and his balloon, out in the
// left lane; the water's glints below it are the only life in the middle.
//
// Positions are in u from the screen center; the lawn's heights in u below the horizon, the
// fountain's in u below the floor line (negative is up).

/** Ink width up close. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** The lawn: its far band from the pavement's edge, its near, deeper band from here (u below the horizon), its brow rolling. */
const LAWN_NEAR = 0.17;
/**
 * The pool: its lobes' tops, its widest, and its point (u from the floor line), and its half
 * width. The lobes sit low enough that the rim, ink and all, stays under the floor line beside
 * the pedestal on every screen (on a big tablet its ink once rose a few pixels over it).
 */
const LOBE_TOP = 0.018;
const LOBE_X = 0.24;
const WIDEST = 0.045;
export const POOL_HW = 0.46;
export const POINT = 0.165;
const NOTCH = 0.036;
/** The pedestal under the tower: its drum's half width and depth into the pool, and its top slab. */
const DRUM_HW = 0.22;
const DRUM_DEPTH = 0.1;
const SLAB_HW = 0.24;
const SLAB_UP = 0;
const SLAB_H = 0.02;
/** The rim's width (u). */
const RIM = 0.02;
/** The rose beds either side of the pool's point: center (u from center), depth below the floor line. */
export const BED_X = 0.37;
export const BED_Y = 0.17;

/** A wavy edge across the screen at `y` (continues the path, left to right). */
function rolling(ctx: Ctx, s: Scene, y: number, amp: number, f: number, ph: number): void {
  const u = s.u;
  for (let x = 0; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, y + u * amp * (Math.sin(X * f + ph) + 0.5 * Math.sin(X * f * 2.3 + ph * 1.7)));
    if (x > s.cssW) break;
  }
}

/** The lawn's far band, from the pavement's edge down past where the near band's brow will cover it (the canal lies on it). */
export function lawnFar(ctx: Ctx, s: Scene, from: number, bottom: number): void {
  const u = s.u;
  const hz = landLine(s);
  ctx.fillStyle = LAWN_FAR;
  ctx.fillRect(0, from, s.cssW, Math.max(0, Math.min(bottom, hz + u * (LAWN_NEAR + 0.03)) - from));
}

/** The lawn's near, deeper band: from its rolling brow down to the plaza's edge at the floor line. */
export function lawnNear(ctx: Ctx, s: Scene, bottom: number): void {
  const u = s.u;
  const hz = landLine(s);
  const near = Math.min(bottom, s.groundY + u * 0.02);
  if (near < hz + u * (LAWN_NEAR - 0.02)) return;
  ctx.fillStyle = LAWN.body;
  ctx.beginPath();
  ctx.moveTo(0, near);
  rolling(ctx, s, hz + u * LAWN_NEAR, 0.01, 5, 2.1);
  ctx.lineTo(s.cssW, near);
  ctx.closePath();
  ctx.fill();
}

/** The heart-shaped pool's outline, its point toward you, as its own subpath (wound from the point, left side first). */
export function poolPath(ctx: Ctx, cx: number, gy: number, u: number): void {
  ctx.moveTo(cx, gy + POINT * u);
  for (let m = -1; m <= 1; m += 2) {
    const a = m < 0;
    const x = (X: number) => cx + m * X * u;
    if (a) {
      ctx.bezierCurveTo(x(0.2), gy + 0.135 * u, x(POOL_HW + 0.01), gy + 0.1 * u, x(POOL_HW), gy + WIDEST * u);
      ctx.bezierCurveTo(x(POOL_HW - 0.01), gy + 0.012 * u, x(0.36), gy + (LOBE_TOP - 0.004) * u, x(LOBE_X), gy + LOBE_TOP * u);
      ctx.bezierCurveTo(x(0.14), gy + (LOBE_TOP + 0.004) * u, x(0.04), gy + 0.024 * u, cx, gy + NOTCH * u);
    } else {
      ctx.bezierCurveTo(x(0.04), gy + 0.024 * u, x(0.14), gy + (LOBE_TOP + 0.004) * u, x(LOBE_X), gy + LOBE_TOP * u);
      ctx.bezierCurveTo(x(0.36), gy + (LOBE_TOP - 0.004) * u, x(POOL_HW - 0.01), gy + 0.012 * u, x(POOL_HW), gy + WIDEST * u);
      ctx.bezierCurveTo(x(POOL_HW + 0.01), gy + 0.1 * u, x(0.2), gy + 0.135 * u, cx, gy + POINT * u);
    }
  }
  ctx.closePath();
}

/** Petals afloat on the pool: X (u from center), depth (u from the floor line), lean. */
const AFLOAT = [
  [-0.36, 0.06, 0.4],
  [-0.3, 0.1, -0.9],
  [0.33, 0.055, 1.2],
  [0.39, 0.08, -0.3],
  [0.1, 0.13, 0.7],
  [-0.14, 0.125, -1.4],
] as const;

/** The pool's glints: X (u from center), depth, length, phase. */
const GLINTS = Array.from({ length: 9 }, (_, i) => ({
  x: -0.38 + (i / 8) * 0.76 + (hash(i + 9700) - 0.5) * 0.04,
  d: 0.045 + hash(i + 9710) * 0.085,
  w: 0.02 + hash(i + 9720) * 0.025,
  ph: hash(i + 9730) * 6,
}));

/**
 * The cherub's column on the lawn behind the pool's left lobe: its center (u from center: far
 * enough out that he stays clear of the boulevard's first shop behind him), its top (u above the
 * floor line: above the slider's first lane in both modes, Slide's a bar over the base and
 * Drop's a bar higher still, so the bar sweeping across the screen only ever passes in front
 * of the slim shaft, never over him or his capital), its shaft's and capital's half widths, its
 * foot (u above the floor line: on the grass a little behind the rim, never on it) and the
 * height of each of the two steps it stands on (their top stays under the base block's top, out
 * of the lanes).
 */
export const PLINTH_X = -0.335;
export const PLINTH_TOP = 0.18;
const SHAFT_HW = 0.02;
const CAP_HW = 0.034;
const PLINTH_FOOT = 0.022;
const STEP = 0.012;

/**
 * The fountain: the pool with its water, afloat petals and glints, the marble rim, the pedestal
 * under the tower (its top slab's upper edge is the floor line, nothing else of the pool rises
 * above it), and the column for the cherub behind the left lobe; then the cherub himself (cupid.ts).
 */
export function fountain(ctx: Ctx, s: Scene): void {
  fountainBase(ctx, s);
  cherubShow(ctx, s);
}

/** The cherub on the fountain's column, with his balloon, arrow, burst and splash (or only `part` of that). */
export function cherubShow(ctx: Ctx, s: Scene, part: CherubPart = "all"): void {
  const u = s.u;
  if (s.groundY - u * 0.05 > s.cssH) return;
  cherub(ctx, s, s.cssW / 2 + PLINTH_X * u, s.groundY - PLINTH_TOP * u, inkW(s), part);
}

/** The fountain without the cherub: the column (behind the pool), the pool and the pedestal. */
export function fountainBase(ctx: Ctx, s: Scene): void {
  cherubColumn(ctx, s);
  pool(ctx, s);
}

/** The cherub's column on the lawn behind the pool's left lobe. */
export function cherubColumn(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (s.groundY - u * 0.05 > s.cssH) return;
  column(ctx, s, s.cssW / 2 + PLINTH_X * u, inkW(s));
}

/** The pool with its water, petals and glints, the marble rim, and the pedestal under the tower. */
export function pool(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const gy = s.groundY;
  if (gy - u * 0.05 > s.cssH) return;
  const lw = inkW(s);
  // The water.
  ctx.beginPath();
  poolPath(ctx, cx, gy, u);
  ctx.fillStyle = WATER;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Glints wink across the water (below the floor line, so in the tower's column too).
  ctx.strokeStyle = WATER_LIT;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const g of GLINTS) {
    const k = 0.5 + 0.5 * Math.sin(s.t * 1.4 + g.ph);
    const w = g.w * u * (0.5 + k);
    ctx.moveTo(cx + g.x * u - w / 2, gy + g.d * u);
    ctx.lineTo(cx + g.x * u + w / 2, gy + g.d * u);
  }
  ctx.stroke();
  ctx.fillStyle = FOAM;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const k = (s.t * 0.3 + i * 0.2) % 1;
    circle(ctx, cx + (-0.3 + i * 0.15) * u, gy + (0.04 + 0.06 * k) * u, u * 0.0025);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // Petals afloat, drifting a little.
  for (let i = 0; i < AFLOAT.length; i++) {
    const [X, d, lean] = AFLOAT[i]!;
    ctx.fillStyle = i % 2 ? PETAL_PALE : PETAL;
    ctx.beginPath();
    petalPath(ctx, cx + X * u + Math.sin(s.t * 0.5 + i) * u * 0.004, gy + d * u + u * 0.004, u * 0.012, lean + Math.sin(s.t * 0.4 + i * 2) * 0.2);
    ctx.fill();
  }
  ctx.restore();
  // The pedestal: a drum of marble in the pool, its joints carved, a lit top slab for the tower's floor.
  ctx.beginPath();
  ctx.rect(cx - DRUM_HW * u, gy + SLAB_H * u - SLAB_UP * u - u * 0.002, DRUM_HW * 2 * u, (DRUM_DEPTH - SLAB_H + SLAB_UP) * u + u * 0.002);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ctx.fillStyle = MARBLE.shade;
  ctx.fillRect(cx + DRUM_HW * u * 0.6, gy + SLAB_H * u - SLAB_UP * u, DRUM_HW * u * 0.4, (DRUM_DEPTH - SLAB_H + SLAB_UP) * u);
  ctx.fillStyle = MARBLE.light;
  ctx.fillRect(cx - DRUM_HW * u, gy + SLAB_H * u - SLAB_UP * u, DRUM_HW * u * 0.3, (DRUM_DEPTH - SLAB_H + SLAB_UP) * u);
  ctx.strokeStyle = CARVING;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    const y = gy + (SLAB_H - SLAB_UP + ((DRUM_DEPTH - SLAB_H + SLAB_UP) * i) / 3) * u;
    ctx.moveTo(cx - DRUM_HW * u, y);
    ctx.lineTo(cx + DRUM_HW * u, y);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - DRUM_HW * u, gy + SLAB_H * u - SLAB_UP * u - u * 0.002, DRUM_HW * 2 * u, (DRUM_DEPTH - SLAB_H + SLAB_UP) * u + u * 0.002);
  ink(ctx, lw, INK);
  ctx.beginPath();
  block(ctx, cx - SLAB_HW * u, gy - SLAB_UP * u, SLAB_HW * 2 * u, SLAB_H * u, u * 0.006);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ctx.fillStyle = MARBLE.light;
  ctx.fillRect(cx - SLAB_HW * u + u * 0.006, gy - SLAB_UP * u + u * 0.003, SLAB_HW * 2 * u - u * 0.012, u * 0.005);
  ink(ctx, lw, INK);
  // The rim: an inked band of marble round the pool, lit along its top.
  ctx.beginPath();
  poolPath(ctx, cx, gy, u);
  inkedLine(ctx, MARBLE.body, RIM * u, lw, INK);
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  poolPath(ctx, cx, gy - u * 0.004, u);
  ctx.strokeStyle = MARBLE.light;
  ctx.lineWidth = RIM * u * 0.45;
  ctx.stroke();
  ctx.restore();
}

/** The cherub's column: two steps on the lawn, a fluted shaft lit on the left, a capital with a lit top. */
function column(ctx: Ctx, s: Scene, px: number, lw: number): void {
  const u = s.u;
  const gy = s.groundY;
  const top = gy - PLINTH_TOP * u;
  const foot = gy - PLINTH_FOOT * u;
  const step = STEP * u;
  // The base: two steps.
  ctx.beginPath();
  block(ctx, px - CAP_HW * u, foot - step, CAP_HW * 2 * u, step, u * 0.003);
  block(ctx, px - CAP_HW * u * 0.8, foot - step * 2 + u * 0.001, CAP_HW * 1.6 * u, step, u * 0.003);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  // The shaft, with three flutes.
  const shaftTop = top + u * 0.012;
  const shaftFoot = foot - step * 2 + u * 0.001;
  ctx.beginPath();
  ctx.rect(px - SHAFT_HW * u, shaftTop, SHAFT_HW * 2 * u, shaftFoot - shaftTop);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ctx.fillStyle = MARBLE.light;
  ctx.fillRect(px - SHAFT_HW * u, shaftTop, SHAFT_HW * u * 0.5, shaftFoot - shaftTop);
  ctx.fillStyle = MARBLE.shade;
  ctx.fillRect(px + SHAFT_HW * u * 0.45, shaftTop, SHAFT_HW * u * 0.55, shaftFoot - shaftTop);
  ctx.strokeStyle = CARVING;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(px + i * SHAFT_HW * u * 0.5, top + u * 0.02);
    ctx.lineTo(px + i * SHAFT_HW * u * 0.5, shaftFoot - u * 0.008);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(px - SHAFT_HW * u, shaftTop, SHAFT_HW * 2 * u, shaftFoot - shaftTop);
  ink(ctx, lw, INK);
  // The capital he stands on.
  ctx.beginPath();
  block(ctx, px - CAP_HW * u, top, CAP_HW * 2 * u, u * 0.016, u * 0.003);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ctx.fillStyle = MARBLE.light;
  ctx.fillRect(px - CAP_HW * u + u * 0.004, top + u * 0.003, CAP_HW * 2 * u - u * 0.008, u * 0.004);
  ink(ctx, lw, INK);
}

/** Rose bushes in a bed: [dx (u), dy (u), size (u), pink?] about the bed's center. */
const BUSH = [
  [-0.03, 0.02, 0.022, false],
  [0.0, 0.0, 0.026, true],
  [0.032, 0.022, 0.022, false],
  [-0.012, 0.036, 0.018, true],
  [0.018, 0.04, 0.019, false],
] as const;

/** The two rose beds beside the pool's point: a low edging of marble each, round bushes of leaves with red and pink blooms, batched across both. */
export function roseBeds(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cy = s.groundY + BED_Y * u;
  if (cy - u * 0.04 > s.cssH) return;
  const lw = inkW(s);
  const beds = [s.cssW / 2 - BED_X * u, s.cssW / 2 + BED_X * u];
  // The marble edging and the soil.
  ctx.beginPath();
  for (const cx of beds) oval(ctx, cx, cy + u * 0.038, u * 0.062, u * 0.02);
  ctx.fillStyle = MARBLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (const cx of beds) oval(ctx, cx, cy + u * 0.034, u * 0.052, u * 0.014);
  ctx.fillStyle = LEAF.shade;
  ctx.fill();
  // Every bush's leaves, inked as one, then their lit caps.
  ctx.beginPath();
  for (const cx of beds) {
    for (const [dx, dy, r] of BUSH) {
      const x = cx + dx * u;
      const y = cy + dy * u;
      circle(ctx, x, y, r * u);
      circle(ctx, x - r * u * 0.6, y + r * u * 0.3, r * u * 0.7);
      circle(ctx, x + r * u * 0.6, y + r * u * 0.3, r * u * 0.7);
    }
  }
  ctx.fillStyle = LEAF.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (const cx of beds) for (const [dx, dy, r] of BUSH) circle(ctx, cx + dx * u - r * u * 0.3, cy + dy * u - r * u * 0.35, r * u * 0.4);
  ctx.fillStyle = LEAF.light;
  ctx.fill();
  // The blooms, red then pink, each color inked as one, then their highlights.
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (const cx of beds) {
      for (const [dx, dy, r, pink] of BUSH) {
        if (pass < 2 && pink !== (pass === 1)) continue;
        const x = cx + dx * u;
        const y = cy + dy * u;
        if (pass < 2) {
          circle(ctx, x - r * u * 0.45, y - r * u * 0.1, r * u * 0.3);
          circle(ctx, x + r * u * 0.4, y - r * u * 0.3, r * u * 0.3);
          circle(ctx, x + r * u * 0.1, y + r * u * 0.45, r * u * 0.28);
        } else {
          circle(ctx, x - r * u * 0.52, y - r * u * 0.18, r * u * 0.12);
          circle(ctx, x + r * u * 0.33, y - r * u * 0.38, r * u * 0.12);
          circle(ctx, x + r * u * 0.03, y + r * u * 0.37, r * u * 0.11);
        }
      }
    }
    if (pass < 2) {
      ctx.fillStyle = pass ? ROSE_PINK.body : ROSE.body;
      ctx.fill();
      ink(ctx, lw * 0.8, INK);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fill();
    }
  }
}

/** Petals strewn on the plaza: X (u from center), depth below the floor line, lean, pale? */
const STREWN = Array.from({ length: 14 }, (_, i) => ({
  x: -0.48 + hash(i + 9800) * 0.96,
  d: 0.2 + hash(i + 9810) * 0.3,
  lean: hash(i + 9820) * 6,
  pale: hash(i + 9830) > 0.5,
}));

/**
 * Rows of pink-cream pavers from `top` down to `bottom`, with petals strewn over them. Batched:
 * one path per paver tone, one for the lit strips, so a plaza of pavers is four fills.
 */
export function paving(ctx: Ctx, s: Scene, top: number, bottom: number, petals: boolean): void {
  const u = s.u;
  if (top >= bottom) return;
  ctx.fillStyle = JOINT;
  ctx.fillRect(0, top, s.cssW, bottom - top);
  const row = u * 0.032;
  const gap = Math.max(1, u * 0.0025);
  const strip = u * 0.004;
  for (let pass = 0; pass <= PAVING.length; pass++) {
    const lit = pass === PAVING.length;
    ctx.beginPath();
    for (let r = 0, y = top; y < bottom; r++, y += row) {
      const w = u * (0.09 + (r % 2) * 0.02);
      const off = r % 2 ? w * 0.5 : 0;
      const y0 = Math.max(top, y + gap / 2);
      const y1 = Math.min(bottom, y + row - gap / 2);
      if (y1 <= y0) continue;
      for (let i = 0, x = -w + off; x < s.cssW; i++, x += w) {
        if (!lit && (i + r * 2) % PAVING.length !== pass) continue;
        ctx.rect(x + gap / 2, y0, w - gap, lit ? Math.min(y1 - y0, strip) : y1 - y0);
      }
    }
    ctx.fillStyle = lit ? PAVING[0]!.light : PAVING[pass]!.body;
    ctx.fill();
  }
  if (!petals) return;
  const gy = s.groundY;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? PETAL_PALE : PETAL;
    ctx.beginPath();
    for (const p of STREWN) {
      if (p.pale !== (pass === 1)) continue;
      const y = gy + p.d * u;
      if (y < top || y > bottom) continue;
      petalPath(ctx, s.cssW / 2 + p.x * u, y, u * 0.014, p.lean);
    }
    ctx.fill();
  }
}

/** Where the plaza's paving begins: behind the pool's lobes, from the floor line down. */
export function plazaTop(s: Scene): number {
  return s.groundY - s.u * 0.004;
}

// ---------------------------------------------------------------- the gifts on the plaza

/**
 * Where the gifts lie on the plaza: a heart-shaped box of chocolates on the left, a wrapped
 * bouquet on the right (u from center, u below the floor line), each in the open plaza between
 * the pool's rim, the rose bed beside it and the gatepost in front, with paving all round.
 */
export const BOX_X = -0.243;
export const BOX_Y = 0.21;
const BOX_SIZE = 0.056;
export const BOUQUET_X = 0.238;
export const BOUQUET_Y = 0.2;

/** A heart as its own subpath, squashed to `ky` of its height (seen lying flat), centered at (x, y), about `size` wide. */
function flatHeart(ctx: Ctx, x: number, y: number, size: number, ky: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ky);
  heartPath(ctx, 0, 0, size);
  ctx.restore();
}

/** An open heart-shaped box of chocolates: the lid tipped up behind, a ribbon bow on it, bonbons in a doily in the box. */
function chocolateBox(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const size = u * BOX_SIZE;
  // The lid, standing up behind the box, its ribbon crossed with a bow.
  const ly = y - size * 0.47;
  ctx.beginPath();
  flatHeart(ctx, x, ly, size, 0.72);
  ctx.fillStyle = BOX.body;
  ctx.fill();
  ctx.fillStyle = BOX.light;
  ctx.beginPath();
  flatHeart(ctx, x - size * 0.02, ly - size * 0.04, size * 0.8, 0.72);
  ctx.fill();
  ctx.beginPath();
  flatHeart(ctx, x, ly, size, 0.72);
  ink(ctx, lw, INK);
  ctx.strokeStyle = RIBBON.body;
  ctx.lineWidth = u * 0.007;
  ctx.beginPath();
  ctx.moveTo(x, ly - size * 0.3);
  ctx.lineTo(x, ly + size * 0.3);
  ctx.moveTo(x - size * 0.44, ly - size * 0.02);
  ctx.lineTo(x + size * 0.44, ly - size * 0.02);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, x - u * 0.009, ly - size * 0.04, u * 0.009, u * 0.006, 0.4);
  oval(ctx, x + u * 0.009, ly - size * 0.04, u * 0.009, u * 0.006, -0.4);
  circle(ctx, x, ly - size * 0.02, u * 0.0045);
  ctx.fillStyle = RIBBON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The box: red, a cream doily inside, six bonbons by turns.
  ctx.beginPath();
  flatHeart(ctx, x, y, size, 0.62);
  ctx.fillStyle = BOX.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  flatHeart(ctx, x, y + size * 0.01, size * 0.82, 0.62);
  ctx.fillStyle = CREAM.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  const spots = [
    [-0.2, -0.12],
    [0.2, -0.12],
    [-0.1, 0.03],
    [0.1, 0.03],
    [0, 0.17],
    [-0.3, 0.0],
  ] as const;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    spots.forEach(([dx, dy], i) => {
      const pink = i % 3 === 2;
      if (pass < 2 && pink !== (pass === 1)) return;
      const bx = x + dx * size;
      const by = y + dy * size * 0.62;
      if (pass === 2) circle(ctx, bx - u * 0.002, by - u * 0.002, u * 0.0022);
      else if (i % 2) circle(ctx, bx, by, u * 0.0065);
      else block(ctx, bx - u * 0.006, by - u * 0.005, u * 0.012, u * 0.01, u * 0.002);
    });
    if (pass < 2) {
      ctx.fillStyle = pass ? ROSE_PINK.body : CHOCOLATE.body;
      ctx.fill();
      ink(ctx, lw * 0.6, INK);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
    }
  }
}

/** A bouquet of roses in a cone of cream paper, lying on the plaza with its blooms to the right, a ribbon round its waist. */
function bouquet(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18);
  // The paper cone.
  ctx.beginPath();
  ctx.moveTo(-u * 0.04, 0);
  ctx.lineTo(u * 0.01, -u * 0.024);
  ctx.quadraticCurveTo(u * 0.024, -u * 0.01, u * 0.024, 0);
  ctx.quadraticCurveTo(u * 0.024, u * 0.01, u * 0.01, u * 0.024);
  ctx.closePath();
  ctx.fillStyle = CREAM.body;
  ctx.fill();
  ctx.fillStyle = CREAM.shade;
  ctx.beginPath();
  ctx.moveTo(-u * 0.04, 0);
  ctx.lineTo(u * 0.01, u * 0.024);
  ctx.quadraticCurveTo(u * 0.003, u * 0.011, -u * 0.04, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-u * 0.04, 0);
  ctx.lineTo(u * 0.01, -u * 0.024);
  ctx.quadraticCurveTo(u * 0.024, -u * 0.01, u * 0.024, 0);
  ctx.quadraticCurveTo(u * 0.024, u * 0.01, u * 0.01, u * 0.024);
  ctx.closePath();
  ink(ctx, lw, INK);
  // The ribbon round its waist.
  ctx.beginPath();
  ctx.moveTo(-u * 0.014, -u * 0.013);
  ctx.lineTo(-u * 0.008, u * 0.014);
  inkedLine(ctx, RIBBON.body, u * 0.006, lw * 0.6, INK);
  // Leaves, then the blooms at the cone's mouth.
  ctx.beginPath();
  oval(ctx, u * 0.018, -u * 0.023, u * 0.01, u * 0.0045, -0.7);
  oval(ctx, u * 0.03, u * 0.018, u * 0.01, u * 0.0045, 0.6);
  ctx.fillStyle = LEAF.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  const blooms = [
    [0.026, -0.011, false],
    [0.037, 0.003, true],
    [0.023, 0.013, false],
    [0.044, -0.01, true],
    [0.015, -0.001, true],
  ] as const;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (const [dx, dy, pink] of blooms) {
      if (pass < 2 && pink !== (pass === 1)) continue;
      if (pass === 2) circle(ctx, dx * u - u * 0.003, dy * u - u * 0.003, u * 0.003);
      else circle(ctx, dx * u, dy * u, u * 0.008);
    }
    if (pass < 2) {
      ctx.fillStyle = pass ? ROSE_PINK.body : ROSE.body;
      ctx.fill();
      ink(ctx, lw * 0.7, INK);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The gifts left on the plaza: the box of chocolates and the bouquet, below the floor line. */
export function plazaProps(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const gy = s.groundY;
  // (Not while they are wholly below the screen: the box's lid is their highest point.)
  if (gy + u * (BOX_Y - BOX_SIZE) > s.cssH) return;
  const lw = inkW(s);
  chocolateBox(ctx, s, s.cssW / 2 + BOX_X * u, gy + BOX_Y * u, lw);
  bouquet(ctx, s, s.cssW / 2 + BOUQUET_X * u, gy + BOUQUET_Y * u, lw);
}

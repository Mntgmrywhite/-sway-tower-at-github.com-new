import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { DAISY, KNOTWORK, MEADOW, MEADOW_DOT, ORPIMENT, PRIMROSE, PRIMROSE_EYE, ROUNDEL } from "./colors";
import { BAY_X, coast } from "./coast";
import { BACK_BASE, farSheep, FRONT_BASE, hills } from "./fields";
import { landShows, mountainHorizon } from "./floor";
import { wallTop } from "./front";
import { bandHeight, curlPath, dot, plait, plaitBand, roundels } from "./knot";
import { castle, farmhouses, monastery } from "./landmarks";
import { cloudBank, MOUNTAIN_TOP, mountains } from "./mountains";
import { flock } from "./pasture";
import { cloudLineWidth } from "./shapes";
import type { Tone } from "./tone";

export { floorTop, FLOOR_SETTLED, landShows, mountainHorizon, seaLine } from "./floor";
export { farSheep, frontTop } from "./fields";
export { hooker } from "./coast";
export { castle, farmhouses, monastery } from "./landmarks";
export { chapelAt, HOLY_X, mountains } from "./mountains";

// The far layer, standing on the horizon, back to front: the mountains with the clouds piled
// behind them (mountains.ts); the hills, quilted with fields, the castle on the left hill, the
// farmhouse and the beehive huts below it, sheep on the slopes (fields.ts, landmarks.ts); the
// back pasture, where the flock frolics (pasture.ts), the stream coming out under a humpbacked
// stone bridge on the left; out on the right the bay of the Atlantic with its headland and the
// monastic site on it (coast.ts); then the near meadow round the round tower, its brow running
// down to the rocks of the bay on the right.
// Above the start a floor of cloud gathers below you and swells up over the land, which is
// dropped only once it is all under it (floor.ts); from then on its puffy top is the horizon,
// and only the mountain tops stand out of it, for good. In its
// lower corners, either side of the tower, a plaited knotwork band ends in a triskele roundel,
// the corners of the page's border. Nothing here moves but the flock, and out on the bay the
// surf, the glints and the hooker rocking at anchor.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Half the tower's column (u from the center): curls and ripples keep out of it. */
const COLUMN = 0.21;

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/** Where the sky stops: below this the hills and meadow, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * BACK_BASE : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the stream and its bridge

/** The bridge's center (u from center) and half span; the stream runs out under it toward the left edge. */
export const BRIDGE_X = -0.33;
const BRIDGE_HW = 0.05;
/** Water level under the bridge, and the deck's ends and crown (u below the horizon). */
const WATER = FRONT_BASE + 0.018;
const DECK_END = FRONT_BASE + 0.002;
const DECK_TOP = FRONT_BASE - 0.017;
const ARCH_R = 0.018;

/**
 * The stream: out of the bridge's arch toward you, widening as it winds down and to the right,
 * until it drops out of sight behind the brow of the near meadow (drawn after it), behind the
 * round tower, so the back pasture on the left stays all grass for the flock.
 */
function stream(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x = cx + BRIDGE_X * u;
  const w = hz + WATER * u;
  const out = hz + (NEAR_MEADOW + 0.03) * u;
  ctx.fillStyle = tone.water;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.017, w - u * 0.004);
  ctx.bezierCurveTo(x - u * 0.022, w + u * 0.05, x + u * 0.07, w + u * 0.07, x + u * 0.13, out);
  ctx.lineTo(x + u * 0.27, out);
  ctx.bezierCurveTo(x + u * 0.17, w + u * 0.08, x + u * 0.03, w + u * 0.045, x + u * 0.017, w - u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.waterLit;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + u * 0.002, w + u * 0.014);
  ctx.quadraticCurveTo(x + u * 0.006, w + u * 0.045, x + u * 0.05, w + u * 0.07);
  ctx.moveTo(x + u * 0.11, w + u * 0.1);
  ctx.lineTo(x + u * 0.15, w + u * 0.12);
  ctx.moveTo(x + u * 0.17, w + u * 0.155);
  ctx.lineTo(x + u * 0.2, w + u * 0.165);
  ctx.stroke();
}

/** A humpbacked stone bridge with one round arch, the stream showing through it. */
export function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x = cx + BRIDGE_X * u;
  const x0 = x - BRIDGE_HW * u;
  const x1 = x + BRIDGE_HW * u;
  const water = hz + WATER * u;
  const end = hz + DECK_END * u;
  const crown = hz + DECK_TOP * u;
  const r = ARCH_R * u;
  // Water seen through the arch.
  ctx.fillStyle = tone.water;
  ctx.fillRect(x - r, water - r, r * 2, r);
  // The bridge: deck curving over the top, the arch cut from its foot.
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.moveTo(x0, water);
  ctx.lineTo(x0, end);
  ctx.quadraticCurveTo(x, crown - (end - crown), x1, end);
  ctx.lineTo(x1, water);
  ctx.lineTo(x + r, water);
  ctx.arc(x, water, r, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // The shaded inside of the arch, and the lit parapet along the deck.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.arc(x, water, r, Math.PI, Math.PI * 2);
  ctx.arc(x, water, r * 0.82, Math.PI * 2, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.stoneLit;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.003, end + u * 0.002);
  ctx.quadraticCurveTo(x, crown - (end - crown) + u * 0.004, x1 - u * 0.003, end + u * 0.002);
  ctx.stroke();
}

// ---------------------------------------------------------------- meadow

/** Where the deeper green of the near meadow begins (u below the horizon); the back pasture lies beyond it. */
export const NEAR_MEADOW = 0.27;

/**
 * Trefoils of dots strewn on the meadows out at the sides, the Kells filler that is also a
 * shamrock: on the back pasture (depth below the horizon; on its left only, as the bay lies on
 * its right) and on the near meadow (depth below the tower's floor line): x (u from the
 * center), depth (u).
 */
function strew(n: number, seed: number, d0: number, d1: number, leftOnly: boolean): Float64Array {
  const out = new Float64Array(n * 2);
  for (let i = 0, k = 0; i < n; k++) {
    const X = (hash(seed + k * 2) - 0.5) * 1.3;
    if (Math.abs(X) < 0.27 || (leftOnly && X > 0)) continue;
    out[i * 2] = X;
    out[i * 2 + 1] = d0 + hash(seed + k * 2 + 1) * (d1 - d0);
    i++;
  }
  return out;
}
const PASTURE_DOTS = strew(14, 6700, FRONT_BASE + 0.03, NEAR_MEADOW - 0.012, true);
const MEADOW_DOTS = strew(30, 6800, 0.01, 0.31, false);
/** The three dots of a trefoil round its center (in units of its size). */
const TREFOIL = [0, 1, 2].map((i) => [Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / 3), Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / 3)] as const);

/** Trefoils at `dots` (x, depth pairs) below the line `y0`, each of size k (u). */
function trefoils(ctx: Ctx, s: Scene, dots: Float64Array, y0: number, k: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (let i = 0; i < dots.length; i += 2) {
    const x = cx + dots[i]! * u;
    const y = y0 + dots[i + 1]! * u;
    for (const [c, sn] of TREFOIL) dot(ctx, x + c * k * u, y + sn * k * u, k * u * 0.62);
  }
  ctx.fill();
}

/** A wavy edge across the screen at `y` (continues the path, left to right). */
function rolling(ctx: Ctx, s: Scene, y: number, amp: number, f: number, ph: number): void {
  const u = s.u;
  for (let x = 0; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, y + u * amp * (Math.sin(X * f + ph) + 0.5 * Math.sin(X * f * 2.3 + ph * 1.7)));
    if (x > s.cssW) break;
  }
}

/** The meadow's far band, lighter, from the hedge at the hills' foot down under the near band. */
function meadowFar(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const y0 = hz + FRONT_BASE * u;
  ctx.fillStyle = tone.meadowFar;
  ctx.fillRect(0, y0, s.cssW, Math.max(0, Math.min(bottom, hz + u * (NEAR_MEADOW + 0.03)) - y0));
  ctx.fillStyle = tone.meadowDot;
  trefoils(ctx, s, PASTURE_DOTS, hz, 0.0042);
  // The hedge along the meadow's far edge: a band with a row of round bushes along its top.
  ctx.fillStyle = tone.hedge;
  ctx.beginPath();
  const step = u * 0.042;
  const x0 = s.cssW / 2 - step * Math.ceil(s.cssW / 2 / step) - step;
  ctx.moveTo(x0, y0 + u * 0.005);
  ctx.lineTo(x0, y0 - u * 0.002);
  for (let i = 0, x = x0; x < s.cssW + step; i++, x += step) {
    ctx.quadraticCurveTo(x + step / 2, y0 - u * (0.014 + hash(i + 6100) * 0.006), x + step, y0 - u * 0.002);
  }
  ctx.lineTo(s.cssW + step * 2, y0 + u * 0.005);
  ctx.closePath();
  ctx.fill();
}

/** Rocks along the near meadow's brow where it comes down to the bay: [X past the bay's edge (u), size (u)]. */
const ROCKS = [
  [0.012, 0.016],
  [0.04, 0.011],
  [0.075, 0.019],
  [0.11, 0.012],
  [0.15, 0.017],
  [0.19, 0.013],
  [0.23, 0.018],
  [0.27, 0.014],
  [0.31, 0.017],
] as const;

/** Spring flowers in the near meadow, out at the sides clear of everything standing on it: x (u from the center), depth under the tower's floor line (u), daisy (1) or primrose (0). */
const FLOWERS = [
  [-0.395, 0.03, 1],
  [-0.36, 0.062, 0],
  [-0.322, 0.024, 1],
  [-0.338, 0.092, 1],
  [-0.465, 0.285, 0],
  [-0.41, 0.3, 1],
  [-0.345, 0.288, 0],
  [-0.292, 0.305, 1],
  [0.272, 0.165, 1],
  [0.33, 0.178, 0],
  [0.385, 0.162, 1],
  [0.44, 0.176, 0],
] as const;
/** A flower's five petals round its middle, in units of its size. */
const PETALS = [0, 1, 2, 3, 4].map((i) => [Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / 5), Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / 5)] as const);

/** The flowers: a rosette of five round petals and an eye, as the illuminators drew them. */
function flowers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const k = u * 0.0058;
  for (let kind = 0; kind < 2; kind++) {
    ctx.fillStyle = kind ? DAISY : PRIMROSE;
    ctx.beginPath();
    for (const [X, d, daisy] of FLOWERS) {
      if (daisy !== kind) continue;
      for (const [c, sn] of PETALS) dot(ctx, cx + X * u + c * k, s.groundY + d * u + sn * k, k * 0.62);
    }
    ctx.fill();
    ctx.fillStyle = kind ? ORPIMENT : PRIMROSE_EYE;
    ctx.beginPath();
    for (const [X, d, daisy] of FLOWERS) if (daisy === kind) dot(ctx, cx + X * u, s.groundY + d * u, k * 0.5);
    ctx.fill();
  }
}

/**
 * The near band of the meadow, deeper green, its brow rolling, strewn with trefoils and spring
 * flowers; it stops under the wall in front, which covers the rest. On the right, past the bay's
 * edge, its brow is the shore: a row of dark rocks with the surf at their feet.
 */
function meadowNear(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const near = Math.min(bottom, wallTop(s) + u * 0.01);
  const brow = s.horizonY + u * NEAR_MEADOW;
  ctx.fillStyle = MEADOW;
  ctx.beginPath();
  ctx.moveTo(0, near);
  rolling(ctx, s, brow, 0.012, 5, 2.1);
  ctx.lineTo(s.cssW, near);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MEADOW_DOT;
  trefoils(ctx, s, MEADOW_DOTS, s.groundY, 0.0055);
  flowers(ctx, s);
  // The rocks of the shore: dark, lit on top, the surf breaking white against them.
  const x0 = s.cssW / 2 + BAY_X * u;
  const swell = 0.5 + 0.5 * Math.sin(s.t * 1.3 + 1.7);
  ctx.fillStyle = tone.surf;
  ctx.beginPath();
  for (const [dx, r] of ROCKS) {
    const x = x0 + dx * u;
    if (x - r * u > s.cssW) break;
    circle(ctx, x - r * u * 0.6, brow - u * 0.004, (0.006 + 0.003 * swell) * u);
  }
  ctx.fill();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cliffLit : tone.cliff;
    ctx.beginPath();
    for (const [dx, r] of ROCKS) {
      const x = x0 + dx * u;
      if (x - r * u > s.cssW) break;
      const y = brow + u * 0.006;
      if (pass === 0) {
        ctx.moveTo(x - r * u, y);
        ctx.quadraticCurveTo(x - r * u * 0.9, y - r * u * 0.9, x, y - r * u * 0.85);
        ctx.quadraticCurveTo(x + r * u * 0.95, y - r * u * 0.8, x + r * u, y);
        ctx.closePath();
      } else {
        ctx.moveTo(x - r * u * 0.7, y - r * u * 0.45);
        ctx.quadraticCurveTo(x - r * u * 0.6, y - r * u * 0.8, x - r * u * 0.05, y - r * u * 0.78);
        ctx.quadraticCurveTo(x - r * u * 0.3, y - r * u * 0.55, x - r * u * 0.7, y - r * u * 0.45);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the cloud floor

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** The lit second row of puffs under the top one: how far under the top and how big (u). */
const UNDER_D = 0.052;
const UNDER_R = 0.036;
/** Billows further down the floor, as an illuminator draws a sea of cloud: rows of arches, bigger toward you: each row's depth under the top and its arches' radius (u). */
const BILLOWS = [
  [0.14, 0.026],
  [0.21, 0.032],
  [0.3, 0.04],
  [0.41, 0.05],
  [0.55, 0.062],
] as const;

/**
 * The cloud floor: a row of puffs along its top in a fine contour, solid below, with spiral
 * curls in the puffs and fine scalloped ripples further down, all out at the sides (behind the
 * tower it is a plain wash). It stands still: it runs right behind the tower, where nothing
 * moves. It is drawn after everything on the land, the meadow round the round tower included,
 * so as it gathers it covers all of it (only the mountain tops stand out of it); the wall in
 * front stays in front. In its lower corners, the knotwork (`corners`).
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const lw = cloudLineWidth(u);
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudLine : pass === 1 ? tone.cloudShade : tone.cloud;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = cx + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r + lw);
      else if (pass === 1) circle(ctx, x, y, r);
      else circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
    }
    if (pass < 2) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    else {
      // A second, smaller row of lit puffs under the top one, so the lit band ends in scallops.
      for (let j = -half; j <= half; j++) circle(ctx, cx + (j + 0.5) * step, top + UNDER_D * u, UNDER_R * u);
    }
    ctx.fill();
  }
  // Curls in the puffs, and billows further down (the lower rows only show while it is still
  // sinking to rest): rows of arches growing toward you. Out at the sides only; centered, so
  // both edges match at any width.
  const clear = (COLUMN + 0.05) * u;
  ctx.beginPath();
  for (let j = -half; j <= half; j++) {
    const x = cx + j * step;
    if (Math.abs(x - cx) < clear) continue;
    const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
    const r = p.r * u;
    const side = x < cx ? 1 : -1;
    curlPath(ctx, x + side * r * 0.06, top + p.dy * u + r * 0.25, r * 0.5, side > 0 ? Math.PI : 0, -side);
  }
  ctx.strokeStyle = tone.cloudLine;
  ctx.lineWidth = lw * 0.85;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  for (let row = 0; row < BILLOWS.length; row++) {
    const [d, rr] = BILLOWS[row]!;
    const y = top + d * u;
    const r = rr * u;
    if (y - r > s.cssH) break;
    // Every row is offset half an arch from the one above.
    const off = row % 2 ? r : 0;
    const n = Math.ceil(s.cssW / 2 / (r * 2)) + 1;
    for (let k = -n; k <= n; k++) {
      const x = cx + off + k * r * 2;
      if (Math.abs(x - cx) < clear + r) continue;
      ctx.moveTo(x - r, y);
      ctx.arc(x, y, r, Math.PI, Math.PI * 2);
    }
  }
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  corners(ctx, s, top);
}

// ---------------------------------------------------------------- the knotwork in the corners

/** The plait in the corner bands: three strands; its spacing (u). */
const CORNER_PLAIT = plait(3);
const CORNER_D = 0.026;
/** The bands rest this far above the screen's bottom (u); while the floor is still coming up they ride this far under its top (u). */
const CORNER_BOTTOM = 0.05;
const CORNER_RIDE = 0.17;
/** The gap they keep from the tower's column at most (u), how far in from the screen's edge their roundels stand (u), and the roundels' radius (u). */
const CORNER_GAP = 0.016;
const CORNER_IN = 0.15;
const CORNER_R = 0.058;

/** Scratch: the two bands' spans (from the left edge in, from the right one out) and the roundels' places and turns. */
const CORNER_SPANS = [-2, 0, 0, 0];
const CORNER_BOSSES = [0, 0, 0, 0, 0, Math.PI / 3];

/**
 * The page's corners: in each side lane, low on the cloud floor, a plaited band runs in from the
 * screen's edge and ends, short of the tower's column, in a roundel with a triskele, ringed with
 * red dots. They rest near the screen's bottom once the floor has come up (and ride on it as it
 * does), and stand still.
 */
function corners(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const d = CORNER_D * u;
  const h = bandHeight(CORNER_PLAIT, d);
  const R = CORNER_R * u;
  const y = Math.max(s.cssH - CORNER_BOTTOM * u - h, top + CORNER_RIDE * u);
  const cy = y + h / 2;
  if (cy - R * 1.3 > s.cssH) return;
  const lw = Math.max(1, u * 0.0035);
  const rule = Math.max(0.8, u * 0.0024);
  const left = Math.min(s.baseX - CORNER_GAP * u - R, CORNER_IN * u);
  const right = Math.max(s.baseX + s.baseW + CORNER_GAP * u + R, s.cssW - CORNER_IN * u);
  CORNER_SPANS[1] = left;
  CORNER_SPANS[2] = right;
  CORNER_SPANS[3] = s.cssW + 2;
  plaitBand(ctx, CORNER_PLAIT, KNOTWORK, s.cssW / 2, CORNER_SPANS, y, d, rule);
  CORNER_BOSSES[0] = left;
  CORNER_BOSSES[1] = cy;
  CORNER_BOSSES[3] = right;
  CORNER_BOSSES[4] = cy;
  roundels(ctx, CORNER_BOSSES, R, ROUNDEL, lw);
}

/** Everything on the horizon, back to front (the cloud floor over it is drawn later: `cloudFloor`). */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  // The mountains (and the clouds piled behind them) stand out of the cloud floor once it has covered the land.
  const mh = mountainHorizon(s);
  if (mh - s.u * 0.36 < s.cssH && top - s.u * 0.06 > mh - MOUNTAIN_TOP * s.u) {
    cloudBank(ctx, s, tone, mh);
    mountains(ctx, s, tone);
  }
  if (hz - s.u * 0.2 < s.cssH && landShows(s, top)) land(ctx, s, tone, top);
}

/**
 * How high each part of the land reaches (u below the horizon; negative is above it): the hills,
 * the castle, the farmhouse and the huts, the bay with its headland and hooker, the round tower
 * and cross on it, and everything lower down (the sheep on the slopes, the meadows, the stream
 * and its bridge, the flock).
 */
const HILLS_UP = -0.07;
const CASTLE_UP = -0.19;
const FARM_UP = -0.03;
const COAST_UP = -0.055;
const MONASTERY_UP = -0.17;
const LOW_UP = 0.025;

/**
 * The land on the horizon, back to front, with the cloud floor's top at `top` (it is drawn over
 * the land): what is already under its solid body is left out.
 */
export function land(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const bottom = Math.min(s.cssH, top + s.u * 0.12);
  // How far below the horizon (u) the floor is solid: a part reaching no higher is hidden.
  const covered = (top + s.u * FLOOR_SOLID - s.horizonY) / s.u;
  if (covered > HILLS_UP) hills(ctx, s, tone, bottom);
  if (covered > CASTLE_UP) castle(ctx, s, tone);
  if (covered > FARM_UP) farmhouses(ctx, s, tone);
  // The sheep graze lower down the slopes than all of them, so nearer.
  if (covered > LOW_UP) {
    farSheep(ctx, s, tone);
    meadowFar(ctx, s, tone, bottom);
  }
  if (covered > COAST_UP) coast(ctx, s, tone, bottom);
  if (covered > MONASTERY_UP) monastery(ctx, s, tone);
  if (covered > LOW_UP) {
    stream(ctx, s, tone);
    bridge(ctx, s, tone);
    meadowNear(ctx, s, tone, bottom);
    flock(ctx, s);
  }
}

import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { EMERALD, FAR, FAR_BACK, GOLD, GOLD_LIGHT, IVORY, ROSE } from "./colors";

// The far layer: Manhattan at midnight across the water, in faded flat silhouettes with no
// outlines. Two rows of Art Deco towers — stepped setbacks, ziggurats, needle spires, mooring
// masts and pyramid caps — with gold-floodlit crowns and strips of lit windows; a sunburst-
// crowned needle tower and a ball-drop tower flank the tower column and rise clear of the
// cloud bank, and four searchlights sweep the sky behind them. All designs are our own.
// Geometry is in units of `u`, measured from the screen center and up from the horizon.

/* ---------------------------------------------------------------- towers */

const FLAT = 0;
const SETBACK = 1;
const ZIGGURAT = 2;
const SPIRE = 3;
const MAST = 4;
const PYRAMID = 5;

interface Tower {
  /** Outline, x from the screen center and y up from the horizon (u), counter-clockwise. */
  shape: number[];
  /** The floodlit part of the crown (a closed polygon in the same units), or none. */
  crown: number[];
  /** Antenna tip for a blinking beacon, or none. */
  beacon: [number, number] | null;
  x0: number;
  x1: number;
  /** Top of the outline (u): the bursts in the sky stay above it. */
  top: number;
}

/** Outline and floodlit crown of one Deco tower: body x0..x1 up to h, then its crown. */
function tower(x0: number, x1: number, h: number, kind: number): Tower {
  const w = x1 - x0;
  const m = (x0 + x1) / 2;
  const s: number[] = [x0, 0, x0, h];
  let crown: number[] = [];
  let beacon: [number, number] | null = null;
  // Two setbacks, shared by most crowns
  const a = w * 0.14;
  const b = w * 0.3;
  const t1 = h + 0.026;
  const t2 = h + 0.048;
  const setbacks = (): void => {
    s.push(x0 + a, h, x0 + a, t1, x0 + b, t1, x0 + b, t2);
  };
  const back = (): void => {
    s.push(x1 - b, t2, x1 - b, t1, x1 - a, t1, x1 - a, h);
  };
  if (kind === SETBACK) {
    setbacks();
    back();
    crown = [x0 + b, t1, x0 + b, t2, x1 - b, t2, x1 - b, t1];
  } else if (kind === ZIGGURAT) {
    // Three steps up, across, three steps down; the top two tiers are floodlit.
    const n = 3;
    const d = w * 0.12;
    const st = 0.018;
    for (let i = 1; i <= n; i++) s.push(x0 + d * i, h + st * (i - 1), x0 + d * i, h + st * i);
    for (let i = n; i >= 1; i--) s.push(x1 - d * i, h + st * i, x1 - d * i, h + st * (i - 1));
    const y1 = h + st * (n - 2);
    const y2 = h + st * (n - 1);
    const y3 = h + st * n;
    const l1 = x0 + d * (n - 1);
    const l2 = x0 + d * n;
    const r1 = x1 - d * (n - 1);
    const r2 = x1 - d * n;
    crown = [l1, y1, l1, y2, l2, y2, l2, y3, r2, y3, r2, y2, r1, y2, r1, y1];
  } else if (kind === SPIRE) {
    setbacks();
    const n = w * 0.09;
    s.push(m - n, t2, m, t2 + 0.075, m + n, t2);
    back();
    crown = [x0 + b, t1, x0 + b, t2, m - n, t2, m, t2 + 0.075, m + n, t2, x1 - b, t2, x1 - b, t1];
  } else if (kind === MAST) {
    setbacks();
    const mw = w * 0.11;
    const ant = Math.max(0.0035, w * 0.03);
    s.push(m - mw, t2, m - mw, t2 + 0.03, m - ant, t2 + 0.03, m - ant, t2 + 0.07, m + ant, t2 + 0.07, m + ant, t2 + 0.03, m + mw, t2 + 0.03, m + mw, t2);
    back();
    crown = [m - mw, t2, m - mw, t2 + 0.03, m + mw, t2 + 0.03, m + mw, t2];
    beacon = [m, t2 + 0.07];
  } else if (kind === PYRAMID) {
    // Setbacks, then a steep gilded pyramid with a short finial
    setbacks();
    const pk = t2 + w * 0.32;
    const fw = Math.max(0.0025, w * 0.025);
    s.push(m - fw, pk - 0.004, m, pk + 0.022, m + fw, pk - 0.004);
    back();
    crown = [x0 + b, t2, m - fw, pk - 0.004, m, pk + 0.022, m + fw, pk - 0.004, x1 - b, t2];
  }
  s.push(x1, h, x1, 0);
  let top = 0;
  for (let i = 1; i < s.length; i += 2) top = Math.max(top, s[i]!);
  return { shape: s, crown, beacon, x0, x1, top };
}

const SPAN = 1.8; // generate this far either side of center

/** A row of towers; heights grow toward the screen edges, where the cloud bank piles up. */
function row(seed: number, minW: number, maxW: number, low: number, high: number, jitter: number, kinds: readonly number[]): Tower[] {
  const out: Tower[] = [];
  let x = -SPAN;
  for (let i = 0; x < SPAN; i++) {
    const w = minW + hash(seed + i * 3.1) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    const side = Math.min(1, mid / 0.6);
    const h = low + (high - low) * side * side + hash(seed + i * 3.1 + 1) * jitter;
    const kind = kinds[Math.floor(hash(seed + i * 3.1 + 2) * kinds.length)]!;
    out.push(tower(x, x + w, h, kind));
    x += w * (0.97 + hash(seed + i * 3.1 + 3) * 0.06);
  }
  return out;
}

const BACK = row(500, 0.065, 0.11, 0.12, 0.3, 0.06, [SETBACK, ZIGGURAT, SPIRE, MAST, PYRAMID, SETBACK, FLAT]);
const FRONT = row(900, 0.055, 0.095, 0.06, 0.15, 0.045, [FLAT, SETBACK, ZIGGURAT, FLAT, PYRAMID, SETBACK]);

/** Half-width (u) of the middle of the skyline, behind the short tower. */
export const MID_SPAN = 0.24;
/** The tallest silhouette in the middle span (u over the horizon): the sky layer keeps the
 *  bursts it pops over the short tower above it, so no rooftop slices them. */
export const SKYLINE_MID = Math.max(...[BACK, FRONT].flatMap((r) => r.filter((b) => b.x0 < MID_SPAN && b.x1 > -MID_SPAN).map((b) => b.top)));

/* ---------------------------------------------------------------- windows */

/** Lit windows as flat (x, y) pairs in u, in vertical strips up each tower's piers. */
function windows(list: Tower[], seed: number): Float32Array {
  const out: number[] = [];
  for (const [bi, b] of list.entries()) {
    const w = b.x1 - b.x0;
    const h = b.shape[3]!;
    const cols = Math.max(1, Math.floor((w - 0.014) / 0.019));
    const pad = (w - cols * 0.019) / 2;
    const rows = Math.max(1, Math.floor((h - 0.02) / 0.021));
    const p = 0.28 + hash(seed + bi * 5.7) * 0.32;
    for (let c = 0; c < cols; c++) {
      // Whole piers go dark now and then, the way office towers do.
      if (hash(seed + bi * 13.3 + c) < 0.18) continue;
      for (let r = 0; r < rows; r++) {
        if (hash(seed + bi * 131 + r * 17 + c * 3.3) > p) continue;
        out.push(b.x0 + pad + c * 0.019 + 0.006, 0.02 + r * 0.021);
      }
    }
  }
  return Float32Array.from(out);
}

const BACK_WIN = windows(BACK, 1300);
const FRONT_WIN = windows(FRONT, 1700);
const WIN_W = 0.0075;
const WIN_H = 0.011;

const FRONT_LIT = mix(FAR, "#ffd463", 0.62);
const BACK_LIT = mix(FAR_BACK, "#ffd463", 0.45);
const FRONT_CROWN = mix(FAR, GOLD, 0.58);
const BACK_CROWN = mix(FAR_BACK, GOLD, 0.42);
const BEACON = mix(FAR, ROSE, 0.7);

/* ---------------------------------------------------------------- landmarks */

/** The sunburst tower, left of the column: x from its center, y up from the horizon (u). */
const SUN_X = -0.33;
const SUN_K = 0.95;
const SUN_SHAPE: readonly number[] = [
  -0.052, 0, -0.052, 0.3, -0.043, 0.3, -0.043, 0.37, -0.033, 0.37, -0.033, 0.42, -0.024, 0.42, -0.024, 0.445,
  // the fan crown is drawn as a half disc on top; the needle rises from it
  0.024, 0.445, 0.024, 0.42, 0.033, 0.42, 0.033, 0.37, 0.043, 0.37, 0.043, 0.3, 0.052, 0.3, 0.052, 0,
];
const SUN_FAN_Y = 0.445;
const SUN_FAN_R = 0.03;
const SUN_NEEDLE = 0.6;
/** Gold rays on the fan crown: angle of each ray. */
const SUN_RAYS = Array.from({ length: 7 }, (_, i) => Math.PI + ((i + 0.5) / 7) * Math.PI);
/** Gilded piers up the crown: x offsets (u). */
const SUN_PIERS = [-0.016, 0, 0.016] as const;
const SUN_FAN = mix(FAR, GOLD_LIGHT, 0.78);
/** Floodlit setback ledges: [x half-width, y, height]. */
const SUN_LEDGES: readonly (readonly [number, number, number])[] = [
  [0.043, 0.355, 0.015],
  [0.033, 0.405, 0.015],
];

/** The ball-drop tower, right of the column. */
const DROP_X = 0.33;
const DROP_W = 0.092;
const DROP_BODY = 0.31;
const DROP_MAST = 0.15;
/** Billboards: x and width as fractions of the tower's width, y down from its top and height in u. */
const BOARDS: readonly (readonly [number, number, number, number])[] = [
  [0.12, 0.76, 0.04, 0.05],
  [0.12, 0.34, 0.11, 0.08],
  [0.54, 0.34, 0.11, 0.08],
];
const BOARD_ON = [mix(FAR, GOLD, 0.55), mix(FAR, EMERALD, 0.55), mix(FAR, ROSE, 0.55)] as const;
const BOARD_OFF = BOARD_ON.map((c) => mix(c, FAR, 0.45));
const TICKER = mix(FAR, IVORY, 0.6);
const BALL = mix(FAR, GOLD_LIGHT, 0.8);
const BALL_LIT = mix(FAR, "#ffffff", 0.92);
const BALL_HALO = alpha(GOLD_LIGHT, 0.18);
const BALL_GRID = mix(FAR, GOLD, 0.45);
/** Floodlit metal (the ball's mast, the sunburst tower's needle): the upper sky is nearly the
 *  city's own indigo, so a plain silhouette would vanish there and leave the ball afloat. */
const GILT = mix(FAR, GOLD_LIGHT, 0.5);

/** The highest point of the city on each side of the tower (u over the horizon): the
 *  sunburst tower's needle on the left, the ball-drop mast on the right. The sky layer keeps
 *  the bursts it pops on each side above them. */
const SIDE_TOP = Math.max(...[BACK, FRONT].flatMap((r) => r.filter((b) => b.x0 >= MID_SPAN || b.x1 <= -MID_SPAN).map((b) => b.top)));
export const PEAK_LEFT = Math.max(SUN_NEEDLE * SUN_K, SIDE_TOP);
export const PEAK_RIGHT = Math.max(DROP_BODY + DROP_MAST + 0.02, SIDE_TOP);

/* ---------------------------------------------------------------- searchlights */

/** Searchlights behind the city: base x (u from center), resting lean (rad, outward), sweep. */
const LIGHTS: readonly (readonly [number, number, number, number])[] = [
  [-0.44, -0.42, 0.3, 0.23],
  [-0.15, -0.16, 0.26, 0.31],
  [0.17, 0.2, 0.27, 0.27],
  [0.45, 0.4, 0.3, 0.21],
];
/** Beams are drawn in a local frame LREF long and stretched to length; one gradient serves all. */
const LREF = 100;
let beamCtx: Ctx | null = null;
let beamFill: CanvasGradient | null = null;
let coreFill: CanvasGradient | null = null;

function beamGradients(ctx: Ctx): void {
  if (beamCtx === ctx) return;
  beamCtx = ctx;
  beamFill = ctx.createLinearGradient(0, 0, 0, -LREF);
  beamFill.addColorStop(0, alpha(IVORY, 0.3));
  beamFill.addColorStop(0.55, alpha(IVORY, 0.12));
  beamFill.addColorStop(1, alpha(IVORY, 0));
  coreFill = ctx.createLinearGradient(0, 0, 0, -LREF);
  coreFill.addColorStop(0, alpha(GOLD_LIGHT, 0.4));
  coreFill.addColorStop(1, alpha(GOLD_LIGHT, 0));
}

/** Pale beams sweeping up from behind the city, fading out before the HUD. */
function searchlights(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const oy = s.horizonY - u * 0.1;
  const ceiling = s.cssH * 0.34;
  if (oy - ceiling < u * 0.15) return;
  beamGradients(ctx);
  for (let i = 0; i < LIGHTS.length; i++) {
    const [bx, lean, sweep, speed] = LIGHTS[i]!;
    const ang = lean + Math.sin(s.t * speed + i * 1.7) * sweep;
    const len = Math.min(u * 1.2, (oy - ceiling) / Math.cos(ang));
    const ox = cx + bx * u;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(ang);
    ctx.scale(1, len / LREF);
    const w0 = u * 0.008;
    const w1 = u * 0.08;
    ctx.beginPath();
    ctx.moveTo(-w0, 0);
    ctx.lineTo(-w1, -LREF);
    ctx.lineTo(w1, -LREF);
    ctx.lineTo(w0, 0);
    ctx.closePath();
    ctx.fillStyle = beamFill!;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w0 * 0.5, 0);
    ctx.lineTo(-w1 * 0.3, -LREF);
    ctx.lineTo(w1 * 0.3, -LREF);
    ctx.lineTo(w0 * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = coreFill!;
    ctx.fill();
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- drawing */

function poly(ctx: Ctx, pts: readonly number[], ox: number, oy: number, k: number): void {
  ctx.moveTo(ox + pts[0]! * k, oy - pts[1]! * k);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i]! * k, oy - pts[i + 1]! * k);
  ctx.closePath();
}

/** One row of towers as a single flat silhouette, then its floodlit crowns. */
function skyline(ctx: Ctx, s: Scene, list: Tower[], fill: string, crownFill: string): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY + 1;
  const minX = (-cx - u * 0.1) / u;
  const maxX = (s.cssW - cx + u * 0.1) / u;
  ctx.beginPath();
  for (const b of list) {
    if (b.x1 < minX || b.x0 > maxX) continue;
    poly(ctx, b.shape, cx, hy, u);
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  for (const b of list) {
    if (b.crown.length === 0 || b.x1 < minX || b.x0 > maxX) continue;
    poly(ctx, b.crown, cx, hy, u);
  }
  ctx.fillStyle = crownFill;
  ctx.fill();
}

function windowLights(ctx: Ctx, s: Scene, list: Float32Array, color: string): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const ww = Math.max(1, WIN_W * u);
  const wh = Math.max(1, WIN_H * u);
  const slot = Math.floor(s.t * 0.25);
  ctx.beginPath();
  for (let i = 0; i < list.length; i += 2) {
    const x = cx + list[i]! * u;
    if (x < -ww || x > s.cssW) continue;
    // Lights switch off and on now and then.
    if (hash(i * 0.37 + slot * 7.1 + (i % 5)) < 0.08) continue;
    ctx.rect(x, hy - list[i + 1]! * u - wh, ww, wh);
  }
  ctx.fillStyle = color;
  ctx.fill();
}

/** Blinking beacons on the mooring masts. */
function beacons(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (let r = 0; r < 2; r++) {
    const list = r ? BACK : FRONT;
    for (let i = 0; i < list.length; i++) {
      const bc = list[i]!.beacon;
      if (!bc || Math.sin(s.t * (2.2 - r * 0.4) + i * 1.3) < 0.1) continue;
      const x = cx + bc[0] * u;
      if (x < -4 || x > s.cssW + 4) continue;
      circle(ctx, x, s.horizonY - bc[1] * u, Math.max(1.2, u * 0.006));
    }
  }
  ctx.fillStyle = BEACON;
  ctx.fill();
}

/** A stepped Deco needle tower with a floodlit sunburst crown. */
function sunburstTower(ctx: Ctx, s: Scene): void {
  const k = s.u * SUN_K;
  const hy = s.horizonY + 1;
  const X = s.cssW / 2 + SUN_X * s.u;
  const fanY = hy - SUN_FAN_Y * k;
  const r = SUN_FAN_R * k;
  ctx.beginPath();
  poly(ctx, SUN_SHAPE, X, hy, k);
  ctx.moveTo(X - r, fanY + 1);
  ctx.arc(X, fanY + 1, r, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = FAR;
  ctx.fill();
  // The gilded needle
  const nw = Math.max(1.2, k * 0.0055);
  ctx.beginPath();
  ctx.moveTo(X - nw, fanY - r * 0.6);
  ctx.lineTo(X, hy - SUN_NEEDLE * k);
  ctx.lineTo(X + nw, fanY - r * 0.6);
  ctx.closePath();
  ctx.fillStyle = GILT;
  ctx.fill();

  // Floodlit ledges and the gold fan: rays from the crown's foot, inside the half disc.
  ctx.beginPath();
  for (const [hw, y, h] of SUN_LEDGES) ctx.rect(X - hw * k, hy - (y + h) * k, hw * 2 * k, h * k);
  // Gilded piers running up the top setbacks
  const pw = Math.max(1, k * 0.0045);
  for (const px of SUN_PIERS) ctx.rect(X + px * k - pw / 2, hy - 0.44 * k, pw, 0.07 * k);
  ctx.fillStyle = FRONT_CROWN;
  ctx.fill();
  ctx.beginPath();
  for (const a of SUN_RAYS) {
    const a0 = a - 0.11;
    const a1 = a + 0.11;
    ctx.moveTo(X, fanY);
    ctx.lineTo(X + Math.cos(a0) * r * 0.92, fanY + Math.sin(a0) * r * 0.92);
    ctx.lineTo(X + Math.cos(a1) * r * 0.92, fanY + Math.sin(a1) * r * 0.92);
    ctx.closePath();
  }
  ctx.fillStyle = SUN_FAN;
  ctx.fill();

  // Window strips up the shaft
  ctx.beginPath();
  const ww = Math.max(1, k * 0.007);
  for (let c = -2; c <= 2; c++) {
    const x = X + c * k * 0.019 - ww / 2;
    for (let y = 0.1; y < 0.29; y += 0.021) {
      if (hash(c * 7.7 + y * 91) < 0.35) continue;
      ctx.rect(x, hy - (y + 0.012) * k, ww, k * 0.011);
    }
  }
  ctx.fillStyle = FRONT_LIT;
  ctx.fill();

  // Beacon on the needle
  if (Math.sin(s.t * 2.6) > -0.2) {
    ctx.beginPath();
    circle(ctx, X, hy - SUN_NEEDLE * k, Math.max(1.3, s.u * 0.0065));
    ctx.fillStyle = BEACON;
    ctx.fill();
  }
}

/** A tower of billboards and a ticker, with the ball sliding down its mast as you climb. */
function dropTower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY + 1;
  const X = s.cssW / 2 + DROP_X * u;
  const w = DROP_W * u;
  const x0 = X - w / 2;
  const top = hy - DROP_BODY * u;
  const mastTop = top - u * DROP_MAST;

  ctx.beginPath();
  ctx.moveTo(x0, hy);
  ctx.lineTo(x0, top + u * 0.022);
  ctx.lineTo(x0 + w * 0.12, top + u * 0.022);
  ctx.lineTo(x0 + w * 0.12, top + u * 0.008);
  ctx.lineTo(x0 + w * 0.26, top + u * 0.008);
  ctx.lineTo(x0 + w * 0.26, top);
  ctx.lineTo(x0 + w * 0.74, top);
  ctx.lineTo(x0 + w * 0.74, top + u * 0.008);
  ctx.lineTo(x0 + w * 0.88, top + u * 0.008);
  ctx.lineTo(x0 + w * 0.88, top + u * 0.022);
  ctx.lineTo(x0 + w, top + u * 0.022);
  ctx.lineTo(x0 + w, hy);
  ctx.closePath();
  ctx.fillStyle = FAR;
  ctx.fill();
  // Floodlit crown ledge and the gilded mast the ball rides down
  const mw = Math.max(1.6, u * 0.008);
  ctx.beginPath();
  ctx.rect(x0 + w * 0.26, top, w * 0.48, u * 0.008);
  ctx.rect(x0 + w * 0.12, top + u * 0.008, w * 0.76, u * 0.006);
  ctx.fillStyle = FRONT_CROWN;
  ctx.fill();
  ctx.fillStyle = GILT;
  ctx.fillRect(X - mw / 2, mastTop, mw, top - mastTop + 1);

  // Billboards, gently flickering
  for (let i = 0; i < BOARDS.length; i++) {
    const [bx, bw, by, bh] = BOARDS[i]!;
    ctx.fillStyle = Math.sin(s.t * 1.4 + i * 2.1) > -0.4 ? BOARD_ON[i]! : BOARD_OFF[i]!;
    ctx.fillRect(x0 + w * bx, top + u * by, w * bw, u * bh);
  }
  // Scrolling ticker under the top board
  ctx.beginPath();
  const ty = top + u * 0.1;
  const dot = Math.max(1, u * 0.004);
  const scroll = (s.t * u * 0.04) % (dot * 4);
  for (let x = x0 + w * 0.1 - scroll; x < x0 + w * 0.9 - dot * 2; x += dot * 4) {
    if (x < x0 + w * 0.1) continue;
    ctx.rect(x, ty - dot / 2, dot * 2, dot);
  }
  ctx.fillStyle = TICKER;
  ctx.fill();

  // The ball comes down the mast as the tower climbs: at the top of the sky it is midnight.
  const br = u * 0.026;
  const by = mastTop + br + altitude01(s) * (top - mastTop - br * 2.2);
  ctx.beginPath();
  circle(ctx, X, by, br * 1.7);
  ctx.fillStyle = BALL_HALO;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X, by, br);
  ctx.fillStyle = BALL;
  ctx.fill();
  // Facet grid: two bands of latitude and a turning meridian
  ctx.beginPath();
  ctx.moveTo(X - br * 0.94, by - br * 0.33);
  ctx.quadraticCurveTo(X, by - br * 0.18, X + br * 0.94, by - br * 0.33);
  ctx.moveTo(X - br * 0.94, by + br * 0.33);
  ctx.quadraticCurveTo(X, by + br * 0.48, X + br * 0.94, by + br * 0.33);
  const mer = Math.sin(s.t * 0.8) * br * 0.55;
  ctx.moveTo(X + mer * 0.2, by - br);
  ctx.quadraticCurveTo(X + mer, by, X + mer * 0.2, by + br);
  ctx.strokeStyle = BALL_GRID;
  ctx.lineWidth = Math.max(1, br * 0.1);
  ctx.stroke();
  // Facets twinkling as it turns
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    if (Math.sin(s.t * 4.2 + i * 1.9) < 0.25) continue;
    const a = i * 1.26 + s.t * 0.8;
    circle(ctx, X + Math.cos(a) * br * 0.55, by + Math.sin(a) * br * 0.45, br * 0.2);
  }
  ctx.fillStyle = BALL_LIT;
  ctx.fill();
}

/** The far layer. */
export function city(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.65 > s.cssH) return;
  searchlights(ctx, s);
  skyline(ctx, s, BACK, FAR_BACK, BACK_CROWN);
  windowLights(ctx, s, BACK_WIN, BACK_LIT);
  sunburstTower(ctx, s);
  dropTower(ctx, s);
  skyline(ctx, s, FRONT, FAR, FRONT_CROWN);
  windowLights(ctx, s, FRONT_WIN, FRONT_LIT);
  beacons(ctx, s);
}

import { BAR_RADIUS } from "../../../base/blocks";
import { hash, type Ctx } from "../../../base/draw";
import type { BarInfo } from "../../skin";
import { phase } from "./clock";
import { BEAM, BOARDS, BRICK, CLAPBOARD, DUST, GOLD, INK, kindOf, SHINGLES, STONE, STRIPE, STRIPES, TIMBER, type Kind } from "./palette";
import { noteTop, shudder, type Shudder } from "./react";
import { drawRoom } from "./rooms";
import { roof } from "./roof";
import { drawWindows, LANTERN_IN, LAY, layout, PANE_CY, ROOM_H, ROOM_TOP } from "./windows";

// The Halloween tower's floors: the bar painter (CartoonSkin.bar). Each bar is a storey of a
// crooked Burton house that fills its rectangle edge to edge: a candy-painted body with a light
// cornice and a dark skirting (so every seam reads), its siding, crooked windows, the lit room,
// a lantern on a curly bracket, and an ink outline with the bar's own rounded corners. Only the top
// floor wears anything above its rectangle (its roof, roof.ts). Crookedness lives in the trim, the
// windows and the roof, never in the outline: the rectangle is what the game judges.
//
// Roles: a floor in the tower or on top lives (its windows flicker, its room plays, its lantern
// swings, and it shudders when a floor lands, react.ts); the slider is the same storey at rest
// (lights on, room still, nothing swinging); a loose piece has its lights out. Nothing here
// allocates: colors are worked out once (palette.ts), layouts go to scratch (windows.ts). The
// outline goes down first with the body (one path) and nothing after it comes near the edges, so
// it stays crisp; the floor's other parts keep their canvas calls few (each one costs).

/** The bands, in floor heights: the light cornice under the top edge, the dark skirting above the bottom. */
export const CORNICE_Y = 0.05;
export const CORNICE_H = 0.11;
export const SKIRT_Y = 0.82;
export const SKIRT_H = 0.13;
/** The outline's width, in floor heights (at least 1.5 px). */
export const OUTLINE = 0.09;
const DUST_N = 8;

export { FLOOR_BARS } from "./palette";
export { ROOF_MAX } from "./roof";

/** Paints the floor at `level` in the rectangle x..x+w, y..y+h (see the file comment). */
export function floor(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, info: BarInfo): void {
  if (!(w > 0 && h > 0)) return;
  const role = info.role;
  if (role === "top") noteTop(level);
  const K = kindOf(level);
  const mode = role === "slider" ? 1 : role === "loose" ? 2 : 0;
  const t = mode === 1 ? 0 : info.t;
  const R = shudder(level, info);
  const r = h * BAR_RADIUS;

  // Body and outline: the bar's own shape, crisp
  barPath(ctx, x, y, w, h, r);
  ctx.fillStyle = K.body;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, OUTLINE * h);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  // Cornice and skirting
  const inner = w - 2 * r;
  if (inner <= 0) {
    if (role === "top") roof(ctx, x, y, w, h, level, t, R.drop, info.still);
    return;
  }
  const L = layout(x, w, h, level, K);
  ctx.fillStyle = K.cornice;
  ctx.beginPath();
  ctx.rect(x + r, y + CORNICE_Y * h, inner, CORNICE_H * h);
  // The room's sill, in the cornice's light paint
  if (L.room) ctx.rect(L.rx - 0.04 * h, y + (ROOM_TOP + ROOM_H) * h, L.rw + 0.08 * h, 0.04 * h);
  ctx.fill();
  ctx.fillStyle = K.skirt;
  ctx.fillRect(x + r, y + SKIRT_Y * h, inner, SKIRT_H * h);
  siding(ctx, K, x + r, y, inner, h, level);
  if (K.patched && L.n > 0) patch(ctx, K, x, y, w, h, level);
  drawWindows(ctx, y, h, level, K, t, mode, info.still, R);
  drawRoom(ctx, K, y, h, level, t, mode, info.still, R);
  if (L.lantern !== 0 && mode !== 2) lantern(ctx, x, y, w, h, level, t, mode === 1 ? 0 : R.swing, info.still, L.lantern);
  if (R.dust >= 0) dust(ctx, x, y, w, h, level, R);
  if (role === "top") roof(ctx, x, y, w, h, level, t, R.drop, info.still);
}

/** Circle-arc corners as cubic curves (the arc's kappa). */
const KAPPA = 0.5523;

/**
 * The bar's rounded rectangle, the same shape as roundRectPath in base/draw.ts (BAR_RADIUS corners,
 * the radius clamped for slivers) drawn with cubic corners, which canvas fills much faster than
 * arcTo.
 */
export function barPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const k = rr * (1 - KAPPA);
  const x1 = x + w;
  const y1 = y + h;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x1 - rr, y);
  ctx.bezierCurveTo(x1 - k, y, x1, y + k, x1, y + rr);
  ctx.lineTo(x1, y1 - rr);
  ctx.bezierCurveTo(x1, y1 - k, x1 - k, y1, x1 - rr, y1);
  ctx.lineTo(x + rr, y1);
  ctx.bezierCurveTo(x + k, y1, x, y1 - k, x, y1 - rr);
  ctx.lineTo(x, y + rr);
  ctx.bezierCurveTo(x, y + k, x + k, y, x + rr, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- siding

/** Clapboard, scalloped shingles, brick, stone, half-timbering, Burton stripes or boards. */
function siding(ctx: Ctx, K: Kind, x0: number, y: number, w: number, h: number, level: number): void {
  const x1 = x0 + w;
  const top = y + (CORNICE_Y + CORNICE_H) * h;
  const bot = y + SKIRT_Y * h;
  const lt = Math.max(1, 0.045 * h);
  if (K.material === STRIPES) {
    // Burton's black-and-white stripes
    ctx.fillStyle = STRIPE;
    const pitch = 0.28 * h;
    const sw = 0.14 * h;
    ctx.beginPath();
    for (let a = x0 + 0.07 * h; a + sw < x1; a += pitch) ctx.rect(a, top, sw, bot - top);
    ctx.fill();
    return;
  }
  if (K.material === TIMBER) {
    // Crooked dark beams between the openings, braced where there is room
    const L = LAY;
    ctx.beginPath();
    const bw = 0.07 * h;
    let prev = x0 + 0.05 * h;
    for (let i = 0; i <= L.n; i++) {
      const next = i < L.n ? L.cx[i]! - 0.36 * h : x1 - 0.05 * h;
      const roomIn = L.room && L.rx > prev && L.rx < next + 0.4 * h;
      const gapEnd = roomIn ? L.rx - 0.06 * h : next;
      if (gapEnd - prev > 0.18 * h) timberGap(ctx, prev, gapEnd, top, bot, bw, level * 7 + i, h);
      if (roomIn) {
        const after = L.rx + L.rw + 0.06 * h;
        if (next - after > 0.18 * h) timberGap(ctx, after, next, top, bot, bw, level * 7 + i + 50, h);
      }
      prev = i < L.n ? L.cx[i]! + 0.36 * h : prev;
    }
    ctx.fillStyle = BEAM;
    ctx.fill();
    return;
  }
  if (K.material === SHINGLES) {
    // A course line, and under it a course of scalloped shingles (one unbroken line of scallops)
    ctx.fillStyle = K.line;
    ctx.fillRect(x0, y + 0.36 * h, w, lt);
    ctx.beginPath();
    const step = 0.42 * h;
    const yy = y + 0.6 * h;
    let a = Math.min(x1, x0 + hash(level * 1.3) * step);
    ctx.moveTo(x0, yy);
    ctx.lineTo(a, yy);
    for (; a + step <= x1; a += step) ctx.quadraticCurveTo(a + step / 2, yy + 0.16 * h, a + step, yy);
    ctx.lineTo(x1, yy);
    ctx.strokeStyle = K.line;
    ctx.lineJoin = "bevel";
    ctx.lineWidth = lt;
    ctx.stroke();
    return;
  }
  // The joints as one path, one fill (a fill per joint costs a phone far more).
  ctx.fillStyle = K.line;
  ctx.beginPath();
  if (K.material === CLAPBOARD) {
    ctx.rect(x0, y + 0.4 * h, w, lt);
    ctx.rect(x0, y + 0.62 * h, w, lt);
  } else if (K.material === BRICK) {
    const mid = y + 0.47 * h;
    ctx.rect(x0, mid, w, lt);
    const step = 0.5 * h;
    for (let a = x0 + step; a < x1 - 0.05 * h; a += step) ctx.rect(a, top, lt, mid - top);
    for (let a = x0 + step * 0.5; a < x1 - 0.05 * h; a += step) ctx.rect(a, mid, lt, bot - mid);
  } else if (K.material === STONE) {
    const mid = y + 0.5 * h;
    ctx.rect(x0, mid, w, lt);
    for (let row = 0; row < 2; row++) {
      let a = x0 + (0.3 + hash(level * 3.3 + row) * 0.4) * h;
      for (let k = 0; a < x1 - 0.1 * h; k++) {
        ctx.rect(a, row === 0 ? top : mid, lt, row === 0 ? mid - top : bot - mid);
        a += (0.6 + 0.3 * hash(level * 11.1 + k * 3 + row)) * h;
      }
    }
    if (level === 0) {
      // The plinth: big stones along the skirting
      for (let a = x0 + 0.4 * h; a < x1 - 0.1 * h; a += 0.55 * h) ctx.rect(a, bot, lt, SKIRT_H * h);
    }
  } else if (K.material === BOARDS) {
    const step = 0.32 * h;
    for (let a = x0 + step; a < x1 - 0.05 * h; a += step) ctx.rect(a, top, lt, bot - top);
  }
  ctx.fill();
}

/** A post, and a brace across the gap if it is wide, between two openings. */
function timberGap(ctx: Ctx, a: number, b: number, top: number, bot: number, bw: number, seed: number, h: number): void {
  const mid = (a + b) / 2;
  const lean = (hash(seed * 1.3) - 0.5) * 0.08 * h;
  ctx.moveTo(mid - bw / 2 + lean, top);
  ctx.lineTo(mid + bw / 2 + lean, top);
  ctx.lineTo(mid + bw / 2 - lean, bot);
  ctx.lineTo(mid - bw / 2 - lean, bot);
  if (b - a > 0.7 * h) {
    const s = hash(seed * 2.9) < 0.5;
    const x0 = s ? a + 0.05 * h : b - 0.05 * h;
    const x1 = mid;
    ctx.moveTo(x0, bot);
    ctx.lineTo(x0 + (s ? bw : -bw), bot);
    ctx.lineTo(x1 + (s ? -bw * 0.2 : bw * 0.2), top + 0.06 * h);
    ctx.lineTo(x1 + (s ? -bw * 1.2 : bw * 1.2), top + 0.06 * h);
  }
}

// ---------------------------------------------------------------- patch, lantern, dust

/** A lighter patch stitched over the boards with big X stitches, in the widest bare stretch. */
function patch(ctx: Ctx, K: Kind, x: number, y: number, w: number, h: number, level: number): void {
  const L = LAY;
  let best = 0;
  let at = 0;
  const lo = x + (L.lantern < 0 ? 0.8 : 0.12) * h;
  const hi = x + w - (L.lantern > 0 ? 0.8 : 0.12) * h;
  let prev = lo;
  for (let i = 0; i <= L.n; i++) {
    const next = i < L.n ? Math.min(hi, L.cx[i]! - 0.42 * h) : hi;
    let a = prev;
    let b = next;
    if (L.room && L.rx + L.rw > a && L.rx < b) {
      if (L.rx - a > b - (L.rx + L.rw)) b = L.rx - 0.05 * h;
      else a = L.rx + L.rw + 0.05 * h;
    }
    if (b - a > best) {
      best = b - a;
      at = (a + b) / 2;
    }
    if (i < L.n) prev = Math.max(lo, L.cx[i]! + 0.42 * h);
  }
  if (best < 0.42 * h) return;
  const pw = 0.17 * h;
  const ph = 0.2 * h;
  const tilt = (hash(level * 1.1) - 0.5) * 0.16;
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  const cy = y + PANE_CY * h;
  ctx.beginPath();
  ctx.moveTo(at - pw * c + ph * s, cy - pw * s - ph * c);
  ctx.lineTo(at + pw * c + ph * s, cy + pw * s - ph * c);
  ctx.lineTo(at + pw * c - ph * s, cy + pw * s + ph * c);
  ctx.lineTo(at - pw * c - ph * s, cy - pw * s + ph * c);
  ctx.fillStyle = K.patch;
  ctx.fill();
  // X stitches at the corners
  ctx.beginPath();
  const k = 0.035 * h;
  for (let e = -1; e <= 1; e += 2) {
    for (let i = -1; i <= 1; i += 2) {
      const lx = i * pw * 0.55;
      const ly = e * ph;
      const sx = at + lx * c - ly * s;
      const sy = cy + lx * s + ly * c;
      ctx.moveTo(sx - k, sy - k);
      ctx.lineTo(sx + k, sy + k);
      ctx.moveTo(sx + k, sy - k);
      ctx.lineTo(sx - k, sy + k);
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.7, 0.03 * h);
  ctx.stroke();
}

// The lantern's swing (module scratch: no closures, nothing allocated).
let LX = 0;
let LY = 0;
let LC = 1;
let LS = 0;
const X = (lx: number, ly: number) => LX + lx * LC - ly * LS;
const Y = (lx: number, ly: number) => LY + lx * LS + ly * LC;

/** A lantern hanging from an iron bracket at one end, swinging (more when a floor lands). */
function lantern(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, t: number, kick: number, still: boolean, side: number): void {
  const end = side < 0 ? x : x + w;
  const hx = end - side * LANTERN_IN * h;
  const hy = y + 0.11 * h;
  const idle = 0.05 * Math.sin((t / 2.1) * Math.PI * 2 + phase(level, 22, 2.1)) * (still ? 1 / 3 : 1);
  const a = idle + kick;
  LC = Math.cos(a) * h;
  LS = Math.sin(a) * h;
  LX = hx;
  LY = hy;
  // Iron, in one shape: the bracket (an arm from the wall's end and a brace under it), the chain,
  // and the lantern's cap, frame and base; then the glass glowing in it
  const xe = end - side * 0.1 * h;
  const bw = 0.035 * h;
  ctx.beginPath();
  ctx.moveTo(xe, hy - bw);
  ctx.lineTo(hx + side * bw * 0.5, hy - bw);
  ctx.lineTo(hx + side * bw * 0.5, hy);
  ctx.lineTo(xe, hy);
  ctx.moveTo(xe - side * 0.16 * h, hy);
  ctx.lineTo(xe - side * 0.16 * h - side * bw * 1.6, hy);
  ctx.lineTo(xe, y + 0.22 * h - bw * 1.4);
  ctx.lineTo(xe, y + 0.22 * h);
  ctx.moveTo(X(-0.012, 0), Y(-0.012, 0));
  ctx.lineTo(X(0.012, 0), Y(0.012, 0));
  ctx.lineTo(X(0.012, 0.06), Y(0.012, 0.06));
  ctx.lineTo(X(-0.012, 0.06), Y(-0.012, 0.06));
  ctx.moveTo(X(-0.03, 0.05), Y(-0.03, 0.05));
  ctx.lineTo(X(0.03, 0.05), Y(0.03, 0.05));
  ctx.lineTo(X(0.11, 0.13), Y(0.11, 0.13));
  ctx.lineTo(X(0.085, 0.13), Y(0.085, 0.13));
  ctx.lineTo(X(0.085, 0.33), Y(0.085, 0.33));
  ctx.lineTo(X(0.03, 0.4), Y(0.03, 0.4));
  ctx.lineTo(X(-0.03, 0.4), Y(-0.03, 0.4));
  ctx.lineTo(X(-0.085, 0.33), Y(-0.085, 0.33));
  ctx.lineTo(X(-0.085, 0.13), Y(-0.085, 0.13));
  ctx.lineTo(X(-0.11, 0.13), Y(-0.11, 0.13));
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.055, 0.15), Y(-0.055, 0.15));
  ctx.lineTo(X(0.055, 0.15), Y(0.055, 0.15));
  ctx.lineTo(X(0.055, 0.31), Y(0.055, 0.31));
  ctx.lineTo(X(-0.055, 0.31), Y(-0.055, 0.31));
  ctx.fillStyle = GOLD;
  ctx.fill();
}

/** Dust sifting down the floor's face from the seam above it. */
function dust(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, R: Readonly<Shudder>): void {
  const p = R.dust;
  ctx.fillStyle = DUST;
  const s = 0.028 * h;
  ctx.beginPath();
  for (let i = 0; i < DUST_N; i++) {
    const fx = x + w * (0.08 + 0.84 * hash(level * 3.1 + i * 7.7));
    const speed = 0.7 + 0.3 * hash(level * 1.7 + i * 2.3);
    const fy = y + (0.12 + 0.72 * Math.min(1, p * speed + hash(i * 5.1) * 0.12)) * h;
    const dx = Math.sin(p * 6 + i) * 0.04 * h;
    ctx.rect(fx + dx - s / 2, fy - s / 2, s, s);
  }
  ctx.fill();
}

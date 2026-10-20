import { alpha, circle, hash, ink, inkedLine, mix, outlined, oval, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, DECO_FACE, EMERALD, GOLD, GOLD_DARK, GOLD_LIGHT, INK, IVORY, LACQUER, MARBLE_FAR, ROSE, SAPPHIRE, tones } from "./colors";
import { inkFor } from "./props";

// The Eyes of Doctor T. J. Eckleburg (The Great Gatsby, 1925): our own billboard of the kind
// that stood by the road into the city, on two tall lacquer posts across the bay in the right-hand
// lane, under the Times Tower's clock, with the gramophone's notes rising between its posts. A
// cream board in a thin Deco frame, and on it a pair of enormous blue eyes looking out of no face,
// from behind giant yellow spectacles whose bridge passes over a non-existent nose; "DR. T. J.
// ECKLEBURG" small along the bottom. A green-shaded lamp on its top edge lights it for the night.
// Clean and a little whimsical: the eyes blink every 4 to 9 s (the first a couple of seconds into
// a tower's scene) and after some blinks (the first always) glance over at the tower. It all runs
// on scene time (s.t) alone, so it never changes with the music, and the same moment always
// draws the same.
// Sizes are in U, measured from the water at the posts' feet up: drawn as big as a prop at the
// tower's line (a giant billboard across the water), with the ink of its depth.

/** The posts' feet stand in the bay at this depth: across the water by the cloud bank's foot,
 *  past the terrace and the gramophone. */
const Z = 20;
/** Drawn as big as a prop at the tower's line: a giant billboard across the water. */
const SIZE = Z / TOWER_DEPTH;
/** From the water to the board's bottom edge, the board, and the lamp over it (U). */
const POST = 0.15;
const BOARD_W = 0.22;
const BOARD_H = 0.14;
const LAMP_H = 0.04;
const FRAME = 0.007;

/** Where it stands, for ground.ts's props: the board's center (u right of the screen's center,
 *  clear of the tower column, with the gramophone's notes rising between the posts), the depth
 *  of the posts' feet, and how tall it all stands (u at the tower's line). */
export const EYES = { dx: 0.3775, z: Z, tall: (POST + BOARD_H + LAMP_H) * SIZE } as const;

/** The posts: half the distance between them, their width; their footings in the water. */
const POST_DX = 0.0925;
const POST_W = 0.011;
const FOOT_W = 0.024;
const FOOT_H = 0.01;
const FOOT_STEP = 0.006;
/** The spectacles: lens centers (from the board's center, below its top), radius, rim. */
const LENS_DX = 0.05;
const LENS_Y = 0.06;
const LENS_R = 0.04;
const RIM = 0.0075;
/** The eyes: almond half-width and half-height, iris and pupil radii. */
const EYE_A = 0.029;
const EYE_B = 0.0185;
const IRIS_R = 0.0155;
const PUPIL_R = 0.0068;
/** How far the irises move when the eyes glance at the tower, and where they look: the tower's
 *  top, which the camera (render.ts) holds this far down the screen. */
const GLANCE_SHIFT = 0.012;
const TOWER_TOP = 0.38;
/** The lettering: its baseline (below the board's top) and cap height. */
const TEXT_Y = 0.129;
const TEXT_CAP = 0.0118;
/** Cap height of the Deco face (and its fallbacks), as a fraction of the font size. */
const CAP = 0.7;
const NAME = "DR. T. J. ECKLEBURG";

const BOARD = tones(mix(IVORY, CHAMPAGNE, 0.3), 0.45, 0.1);
const FRAME_FILL = LACQUER;
const RULE = GOLD;
const POSTS = tones(LACQUER, 0.22, 0.2);
const FOOTING = mix(MARBLE_FAR, IVORY, 0.3);
const RIPPLE = alpha("#ffffff", 0.32);
const COLLAR = GOLD;
const SPECS = tones(GOLD, 0.45, 0.3);
const LENS_GLINT = alpha("#ffffff", 0.75);
const WHITE = "#fdfaf0";
const LID_SHADOW = mix(WHITE, SAPPHIRE, 0.16);
const LID = mix(CHAMPAGNE, ROSE, 0.22);
const IRIS = SAPPHIRE;
const IRIS_LIGHT = mix(SAPPHIRE, "#9fd8ff", 0.55);
const CREASE = alpha(INK, 0.45);
const LETTERS = LACQUER;
const SHADE = tones(EMERALD, 0.35, 0.3);
const BULB = "#fffbe8";
/** The lamp's light: wedges as [reach, half-spread at the far end (U), fill], wide first. */
const LIGHT = [
  [0.11, 0.072, alpha(GOLD_LIGHT, 0.17)],
  [0.095, 0.04, alpha(GOLD_LIGHT, 0.2)],
] as const;
const HALO = alpha(GOLD_LIGHT, 0.4);
/** Left and right: the two eyes, the two posts. */
const SIDES = [-1, 1] as const;

/* ---------------------------------------------------------------- when it blinks and looks */

/** Blinks come one to a slot of SLOT seconds, somewhere in its first JITTER seconds, so one
 *  follows another 4 to 9 s later; the first slot starts FIRST seconds into a tower's scene.
 *  A slot's blink and glance are over before the next slot starts (JITTER + BLINK + the glance
 *  is under SLOT), so a moment only ever looks at its own slot. */
const SLOT = 6.5;
const JITTER = 2.5;
const FIRST = 1.6;
/** A blink: the lids slide down over CLOSE, stay shut for HOLD, and slide back up. */
const CLOSE = 0.1;
const HOLD = 0.04;
export const BLINK = 0.26;
/** A glance at the tower: it starts this long after a blink, eases over EASE, holds. */
const GLANCE_AFTER = 0.5;
const GLANCE_EASE = 0.3;
const GLANCE_HOLD = 1.2;
/** About this share of the blinks (and always the first) are followed by a glance. */
const GLANCE_ODDS = 0.45;

function smooth(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** Scene time at which blink `k` (0 first) starts. */
export function blinkStart(k: number): number {
  return FIRST + k * SLOT + JITTER * hash(k * 3.7 + 824);
}

/** The slot scene time t falls in (blink, glance and all), or -1 before the first. */
function slotOf(t: number): number {
  return t < FIRST ? -1 : Math.floor((t - FIRST) / SLOT);
}

/** How far the lids are down at scene time t: 0 open, 1 shut. */
export function lidsAt(t: number): number {
  const k = slotOf(t);
  if (k < 0) return 0;
  const a = t - blinkStart(k);
  if (a < 0 || a >= BLINK) return 0;
  if (a < CLOSE) return smooth(a / CLOSE);
  if (a < CLOSE + HOLD) return 1;
  return 1 - smooth((a - CLOSE - HOLD) / (BLINK - CLOSE - HOLD));
}

/** How far the eyes are turned toward the tower at scene time t: 0 straight out, 1 full. */
export function glanceAt(t: number): number {
  const k = slotOf(t);
  if (k < 0 || (k > 0 && hash(k * 5.3 + 829) >= GLANCE_ODDS)) return 0;
  const a = t - blinkStart(k) - BLINK - GLANCE_AFTER;
  if (a < 0) return 0;
  if (a < GLANCE_EASE) return smooth(a / GLANCE_EASE);
  if (a < GLANCE_EASE + GLANCE_HOLD) return 1;
  return 1 - smooth((a - GLANCE_EASE - GLANCE_HOLD) / GLANCE_EASE);
}

/* ---------------------------------------------------------------- drawing */

/** An eye's almond: the upper lid's arc left to right, then the lower one back. */
function almond(ctx: Ctx, x: number, y: number, a: number, b: number): void {
  ctx.moveTo(x - a, y);
  ctx.quadraticCurveTo(x, y - 2 * b, x + a, y);
  ctx.quadraticCurveTo(x, y + 2 * b, x - a, y);
  ctx.closePath();
}

/** The upper lid, down by `c` (0 open, 1 shut): the almond's top, then back along the lid's edge. */
function lid(ctx: Ctx, x: number, y: number, a: number, b: number, c: number): void {
  ctx.moveTo(x - a, y);
  ctx.quadraticCurveTo(x, y - 2 * b, x + a, y);
  ctx.quadraticCurveTo(x, y - 2 * b + 4 * b * c, x - a, y);
  ctx.closePath();
}

/** The eyes, lids and creases. Each eye at (x ± dx, y); irises turned by (gx, gy). */
function eyes(ctx: Ctx, x: number, y: number, U: number, lw: number, c: number, gx: number, gy: number): void {
  const dx = LENS_DX * U;
  const a = EYE_A * U;
  const b = EYE_B * U;
  ctx.save();
  ctx.beginPath();
  almond(ctx, x - dx, y, a, b);
  almond(ctx, x + dx, y, a, b);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.clip();
  // Irises: a ring of sapphire round a lighter blue, the pupil, and the light caught in them
  const ir = IRIS_R * U;
  ctx.beginPath();
  circle(ctx, x - dx + gx, y + gy, ir);
  circle(ctx, x + dx + gx, y + gy, ir);
  ctx.fillStyle = IRIS;
  ctx.fill();
  ink(ctx, Math.max(1, lw * 0.6), INK);
  ctx.beginPath();
  circle(ctx, x - dx + gx, y + gy, ir * 0.7);
  circle(ctx, x + dx + gx, y + gy, ir * 0.7);
  ctx.fillStyle = IRIS_LIGHT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - dx + gx * 1.08, y + gy * 1.08, PUPIL_R * U);
  circle(ctx, x + dx + gx * 1.08, y + gy * 1.08, PUPIL_R * U);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  for (const d of SIDES) {
    const ex = x + d * dx + gx;
    circle(ctx, ex - ir * 0.32, y + gy - ir * 0.36, ir * 0.24);
    circle(ctx, ex + ir * 0.36, y + gy + ir * 0.3, ir * 0.1);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // The upper lids' soft shadow on the whites, then the lids themselves as they come down
  ctx.beginPath();
  lid(ctx, x - dx, y, a, b, Math.min(1, c + 0.14));
  lid(ctx, x + dx, y, a, b, Math.min(1, c + 0.14));
  ctx.fillStyle = LID_SHADOW;
  ctx.fill();
  if (c > 0.01) {
    ctx.beginPath();
    lid(ctx, x - dx, y, a, b, c);
    lid(ctx, x + dx, y, a, b, c);
    ctx.fillStyle = LID;
    ctx.fill();
  }
  ctx.restore();

  // Ink: the almonds, the lids' edges (with lashes once they are nearly shut) and the creases
  ctx.beginPath();
  almond(ctx, x - dx, y, a, b);
  almond(ctx, x + dx, y, a, b);
  for (const d of SIDES) {
    const ex = x + d * dx;
    if (c > 0.01) {
      ctx.moveTo(ex + a, y);
      ctx.quadraticCurveTo(ex, y - 2 * b + 4 * b * c, ex - a, y);
    }
    if (c > 0.7) {
      const ly = y + b * (c * 2 - 1);
      for (const f of [-0.5, 0, 0.5]) {
        const lx = ex + f * a;
        const ty = ly * (1 - f * f) + y * f * f;
        ctx.moveTo(lx, ty);
        ctx.lineTo(lx + f * b * 0.5, ty + b * 0.45);
      }
    }
  }
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (const d of SIDES) {
    const ex = x + d * dx;
    ctx.moveTo(ex - a * 0.75, y - b * 1.25);
    ctx.quadraticCurveTo(ex, y - b * 2.05, ex + a * 0.75, y - b * 1.25);
  }
  ink(ctx, Math.max(1, lw * 0.7), CREASE);
}

/** The giant yellow spectacles: two round rims, the bridge arching over where a nose would be,
 *  short temples out to the frame, and a glint on each lens. */
function spectacles(ctx: Ctx, x: number, y: number, U: number, lw: number): void {
  const dx = LENS_DX * U;
  const r = LENS_R * U;
  const ri = (LENS_R - RIM) * U;
  // Bridge and temples, under the rims' ends
  ctx.beginPath();
  ctx.moveTo(x - dx + r * 0.82, y - r * 0.5);
  ctx.quadraticCurveTo(x, y - r * 1.25, x + dx - r * 0.82, y - r * 0.5);
  for (const d of SIDES) {
    ctx.moveTo(x + d * (dx + r * 0.9), y - r * 0.35);
    ctx.lineTo(x + d * (BOARD_W / 2 - FRAME - 0.009) * U, y - r * 0.55);
  }
  inkedLine(ctx, SPECS.base, RIM * U * 0.8, lw);
  // Rims
  ctx.beginPath();
  for (const d of SIDES) {
    circle(ctx, x + d * dx, y, r);
    circle(ctx, x + d * dx, y, ri);
  }
  ctx.fillStyle = SPECS.base;
  ctx.fill("evenodd");
  ink(ctx, lw, INK);
  // Each rim lit along its top, shaded along its bottom
  const mid = (r + ri) / 2;
  const band = Math.max(1, (r - ri) * 0.38);
  ctx.beginPath();
  for (const d of SIDES) {
    const ex = x + d * dx;
    ctx.moveTo(ex + Math.cos(3.6) * mid, y + Math.sin(3.6) * mid);
    ctx.arc(ex, y, mid, 3.6, 5.3);
  }
  ctx.strokeStyle = SPECS.light;
  ctx.lineWidth = band;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  for (const d of SIDES) {
    const ex = x + d * dx;
    ctx.moveTo(ex + Math.cos(0.5) * mid, y + Math.sin(0.5) * mid);
    ctx.arc(ex, y, mid, 0.5, 2.3);
  }
  ctx.strokeStyle = SPECS.dark;
  ctx.stroke();
  // A glint on each lens, high on the right
  ctx.beginPath();
  for (const d of SIDES) {
    const ex = x + d * dx;
    ctx.moveTo(ex + Math.cos(-1.25) * ri * 0.8, y + Math.sin(-1.25) * ri * 0.8);
    ctx.arc(ex, y, ri * 0.8, -1.25, -0.55);
  }
  ctx.strokeStyle = LENS_GLINT;
  ctx.lineWidth = Math.max(1, U * 0.0028);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** The lamp on the board's top edge, over the left eye: a gooseneck arm, an emerald shade
 *  tipped toward the board's middle, the bulb, and its light falling across the board. */
function lamp(ctx: Ctx, x: number, top: number, U: number, lw: number): void {
  const th = 0.55;
  const dxs = Math.sin(th);
  const dys = Math.cos(th);
  const nx = Math.cos(th);
  const ny = -Math.sin(th);
  const ax = x - 0.052 * U;
  const ay = top - 0.029 * U;
  const len = 0.02 * U;
  const mx = ax + dxs * len;
  const my = ay + dys * len;
  const w0 = 0.0045 * U;
  const w1 = 0.0135 * U;
  // The light: a wide soft wedge and a brighter one inside it, and a halo round the bulb
  for (const [far, spread, fill] of LIGHT) {
    ctx.beginPath();
    ctx.moveTo(mx - nx * w1, my - ny * w1);
    ctx.lineTo(mx + dxs * far * U - nx * spread * U, my + dys * far * U - ny * spread * U);
    ctx.lineTo(mx + dxs * far * U + nx * spread * U, my + dys * far * U + ny * spread * U);
    ctx.lineTo(mx + nx * w1, my + ny * w1);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.beginPath();
  circle(ctx, mx + dxs * 0.003 * U, my + dys * 0.003 * U, 0.013 * U);
  ctx.fillStyle = HALO;
  ctx.fill();
  // Its foot on the frame, and the gooseneck up and over
  ctx.beginPath();
  ctx.rect(x - 0.076 * U, top - 0.005 * U, 0.012 * U, 0.006 * U);
  ctx.fillStyle = GOLD_DARK;
  ctx.fill();
  ink(ctx, Math.max(1, lw * 0.8), INK);
  ctx.beginPath();
  ctx.moveTo(x - 0.07 * U, top - 0.004 * U);
  ctx.quadraticCurveTo(x - 0.072 * U, top - 0.034 * U, ax - nx * 0.001 * U, ay - 0.002 * U);
  inkedLine(ctx, LACQUER, Math.max(1, 0.0032 * U), lw * 0.8);
  // The bulb peeking out of the shade's mouth
  ctx.beginPath();
  circle(ctx, mx + dxs * 0.002 * U, my + dys * 0.002 * U, 0.0055 * U);
  ctx.fillStyle = BULB;
  ctx.fill();
  // The shade
  ctx.beginPath();
  ctx.moveTo(ax - nx * w0, ay - ny * w0);
  ctx.lineTo(mx - nx * w1, my - ny * w1);
  ctx.lineTo(mx + nx * w1, my + ny * w1);
  ctx.lineTo(ax + nx * w0, ay + ny * w0);
  ctx.closePath();
  ctx.fillStyle = SHADE.base;
  ctx.fill();
  ink(ctx, lw * 0.85, INK);
  ctx.beginPath();
  ctx.moveTo(ax - nx * w0 * 0.3 + dxs * len * 0.2, ay - ny * w0 * 0.3 + dys * len * 0.2);
  ctx.lineTo(mx - nx * w1 * 0.45 - dxs * len * 0.15, my - ny * w1 * 0.45 - dys * len * 0.15);
  ctx.strokeStyle = SHADE.light;
  ctx.lineWidth = Math.max(1, 0.003 * U);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
  // A gold rim on the mouth
  ctx.beginPath();
  ctx.moveTo(mx - nx * w1, my - ny * w1);
  ctx.lineTo(mx + nx * w1, my + ny * w1);
  inkedLine(ctx, GOLD, Math.max(1, 0.0028 * U), lw * 0.7);
}

/**
 * The billboard, standing in the bay with its posts' feet at (x, y) at perspective scale k
 * (ground.ts places it like the terrace's props). Two renders at the same scene time are the same.
 */
export function eckleburg(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const U = s.u * k * SIZE;
  const lw = inkFor(s.u, k);
  const bottom = y - POST * U;
  const top = bottom - BOARD_H * U;
  const left = x - (BOARD_W / 2) * U;
  const bw = BOARD_W * U;
  const bh = BOARD_H * U;

  // Ripples round the footings, the footings, then the posts up behind the board
  ctx.beginPath();
  for (const d of SIDES) oval(ctx, x + d * POST_DX * U, y, FOOT_W * 0.95 * U, FOOT_W * 0.2 * U);
  ctx.strokeStyle = RIPPLE;
  ctx.lineWidth = Math.max(1, U * 0.0025);
  ctx.stroke();
  ctx.beginPath();
  for (const d of SIDES) {
    const px = x + d * POST_DX * U;
    ctx.rect(px - (FOOT_W / 2) * U, y - FOOT_H * U, FOOT_W * U, FOOT_H * U);
    ctx.rect(px - FOOT_W * 0.36 * U, y - (FOOT_H + FOOT_STEP) * U, FOOT_W * 0.72 * U, FOOT_STEP * U);
  }
  outlined(ctx, FOOTING, lw, INK);
  const postFoot = y - (FOOT_H + FOOT_STEP) * U;
  const postTop = bottom - 0.01 * U;
  ctx.beginPath();
  for (const d of SIDES) ctx.rect(x + (d * POST_DX - POST_W / 2) * U, postTop, POST_W * U, postFoot - postTop);
  ctx.fillStyle = POSTS.base;
  ctx.fill();
  ctx.fillStyle = POSTS.light;
  for (const d of SIDES) ctx.fillRect(x + (d * POST_DX - POST_W / 2) * U, bottom, POST_W * 0.35 * U, postFoot - bottom);
  ink(ctx, lw, INK);
  // A gold collar on each post under the board
  ctx.beginPath();
  for (const d of SIDES) {
    const px = x + d * POST_DX * U;
    ctx.rect(px - POST_W * 0.75 * U, bottom + 0.012 * U, POST_W * 1.5 * U, 0.006 * U);
  }
  ctx.fillStyle = COLLAR;
  ctx.fill();
  ink(ctx, Math.max(1, lw * 0.8), INK);

  // The board: lacquer frame, the cream face lit along its top, a gold Deco rule with
  // stepped corners
  ctx.fillStyle = FRAME_FILL;
  ctx.fillRect(left, top, bw, bh);
  const f = FRAME * U;
  ctx.fillStyle = BOARD.base;
  ctx.fillRect(left + f, top + f, bw - 2 * f, bh - 2 * f);
  ctx.fillStyle = BOARD.light;
  ctx.fillRect(left + f, top + f, bw - 2 * f, (bh - 2 * f) * 0.22);
  ctx.fillStyle = BOARD.dark;
  ctx.fillRect(left + f, top + bh - f - (bh - 2 * f) * 0.16, bw - 2 * f, (bh - 2 * f) * 0.16);
  {
    const i = f + 0.0045 * U;
    const n = 0.007 * U;
    const x0 = left + i;
    const x1 = left + bw - i;
    const y0 = top + i;
    const y1 = top + bh - i;
    ctx.beginPath();
    ctx.moveTo(x0 + n, y0);
    ctx.lineTo(x1 - n, y0);
    ctx.lineTo(x1 - n, y0 + n);
    ctx.lineTo(x1, y0 + n);
    ctx.lineTo(x1, y1 - n);
    ctx.lineTo(x1 - n, y1 - n);
    ctx.lineTo(x1 - n, y1);
    ctx.lineTo(x0 + n, y1);
    ctx.lineTo(x0 + n, y1 - n);
    ctx.lineTo(x0, y1 - n);
    ctx.lineTo(x0, y0 + n);
    ctx.lineTo(x0 + n, y0 + n);
    ctx.closePath();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = Math.max(1, U * 0.0026);
    ctx.lineJoin = "miter";
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(left, top, bw, bh);
  ctx.rect(left + f, top + f, bw - 2 * f, bh - 2 * f);
  ink(ctx, lw, INK);

  // The eyes, looking out (or over at the tower), and the spectacles in front of them
  const ey = top + LENS_Y * U;
  const look = glanceAt(s.t);
  let gx = 0;
  let gy = 0;
  if (look > 0) {
    const tx = s.cssW / 2 - x;
    const ty = s.cssH * TOWER_TOP - ey;
    const d = Math.hypot(tx, ty) || 1;
    gx = (tx / d) * GLANCE_SHIFT * U * look;
    gy = (ty / d) * GLANCE_SHIFT * U * look;
  }
  eyes(ctx, x, ey, U, lw, lidsAt(s.t), gx, gy);
  spectacles(ctx, x, ey, U, lw);

  // The lettering along the bottom
  const cap = TEXT_CAP * U;
  ctx.font = `${(cap / CAP).toFixed(2)}px ${DECO_FACE}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = LETTERS;
  ctx.fillText(NAME, x, top + TEXT_Y * U, bw - 2 * f - 0.03 * U);

  lamp(ctx, x, top, U, lw);
}

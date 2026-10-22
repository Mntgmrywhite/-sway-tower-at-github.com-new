import { alpha, circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { beat, flicker, lightsOut, swing } from "./ambient";
import { BONE, INK, IRON, LAMP, LAMP_CORE, LAMP_DEEP, mixed, smooth } from "./common";
import { belowMoon, loopCopy, mistTop, perLevel } from "./lines";
import { HALO_REACH, moonAt } from "./sky";
import { laneOf } from "./skyline";
import { smoke } from "./smoke";
import { level, loopFraction, MIDNIGHT, toneOfLevel, type Tone } from "./tone";
import { windAt } from "./trees";

// The drowned hollow: once the mist has gathered over the town, the sea of mist below the tower
// is never empty. Big lit set pieces stand out of it in the left lane under the moon, one after
// another as you climb, each filling the lane (all our own designs, in a Tim Burton style:
// crooked, leaning, spiralling, striped, stitched):
//  - the drowned chapel: a leaning tower whose belfry's bell swings (and tolls at the witching
//    hour's midnight), a crooked witch-hat spire curling over at its tip with a crooked cross, and
//    beside it the gable of its drowned nave, its great lancet and rose window lit gold;
//  - the crooked lighthouse: a leaning tower in black-and-bone Burton stripes on a rock, its lamp
//    turning a ghost-green beam through the lane (never across the tower's column or the moon),
//    a keeper's cottage leaning on it, a lit window and a smoking chimney;
//  - the lantern oak: a huge gnarled oak whose limbs curl into spirals, swaying, lanterns swinging
//    on chains from its boughs, an empty cage, and an owl's eyes blinking in its hollow;
//  - the ghost ship: a sunken galleon's stern castle and masts poking out of the mist, listing and
//    rocking, its tattered sails fluttering, its stern windows lit and a lantern swinging.
// Each comes out of the dark below the moon's halo, sinks slowly into the mist as you climb, and
// once its foot is in the sea in front of you slides on down the screen (its own parallax,
// DROWNED_P), fading in and out over its stretch of the story; the loop's come round with it.
//
// And the mist itself lives (both lanes, never behind the tower): the tops of drowned headstones
// poke out of it and drift by, a candle burning on one now and then; will-o'-wisps bob and wander
// over it; and a ferry crosses it now and then, a hooded ferryman poling a long punt with a curled
// prow, a lantern swinging at its bow and a little jack-o'-lantern riding as passenger.

/** The set pieces' parallax. */
export const DROWNED_P = 0.22;
/** The drowned headstones' parallax: they lie nearer, out in the sea. */
export const STONES_P = 0.5;

export type PieceKind = "chapel" | "lighthouse" | "oak" | "ship";

/**
 * The set pieces in the left lane, one after another: their kind; their level `L` on the first
 * pass, or `f` in the loop (then they come round every loop, and those of the spiral calm show on
 * the first pass too). At that level a piece's top stands just under the moon's halo (it has come
 * out of the dark below it); it sinks on down as you climb and fades out `out` levels later
 * (over out[0]..out[1]), as the next comes out of the dark.
 */
export const PIECES: readonly { kind: PieceKind; L?: number; f?: number; out: readonly [number, number] }[] = [
  { kind: "chapel", L: 30, out: [25, 30] },
  { kind: "lighthouse", L: 71, out: [19, 23] },
  { kind: "ship", f: 0.2167, out: [19, 23] },
  { kind: "chapel", f: 0.4167, out: [19, 23] },
  { kind: "lighthouse", f: 0.683, out: [9, 13] },
  { kind: "oak", f: 0.8, out: [27, 31] },
];

/** Each kind's width and height above its foot (units). */
const SIZE: Record<PieceKind, { w: number; h: number }> = {
  chapel: { w: 0.24, h: 0.64 },
  lighthouse: { w: 0.24, h: 0.62 },
  oak: { w: 0.24, h: 0.42 },
  ship: { w: 0.24, h: 0.52 },
};
/** Below its foot each piece's body runs on this far (units): enough to reach under any mist top. */
const DEEP = 0.9;

// ---------------------------------------------------------------- colors

const STONE_BODY = "#2b2948";
const STONE_LIT = "#5a5690";
const STONE_DARK = "#1c1a33";
const SLATE_ROOF = "#1d1a33";
const SLATE_LIT = "#45406e";
const STRIPE_BONE = "#d9d0e6";
const STRIPE_INK = "#1b1724";
const WOOD = "#2c2030";
const WOOD_LIT = "#5e4a68";
const WOOD_DARK = "#1a1220";
const BARK = "#1b1626";
const BARK_LIT = "#4a4470";
const LIMB = "#15121d";
const SAIL = alpha("#d6cdb8", 0.82);
const SAIL_SHADE = alpha("#a39a8a", 0.7);
const GLOW = alpha(LAMP, 0.2);
const GLOW_SOFT = alpha(LAMP, 0.1);
const GREEN = "#9fffc8";
const GREEN_GLASS = "#5fd6a0";
const BEAM = [alpha("#9fe0b8", 0.05), alpha("#9fe0b8", 0.09), alpha("#c8ffe0", 0.14)] as const;
const GREEN_GLOW = alpha("#9fe0b8", 0.3);
const OWL = "#ffd25e";
const BRONZE = "#8a6a3a";
const BRONZE_LIT = "#c49a52";
const PENNANT = "#9e3346";
const CHAIN = "#3a3450";

// ---------------------------------------------------------------- the frame

/** Scratch frame: origin (screen px: the middle of the lane, at the piece's foot), px per unit. */
const F = { x: 0, y: 0, U: 1 };
const X = (x: number) => F.x + x * F.U;
const Y = (y: number) => F.y - y * F.U;
function M(ctx: Ctx, x: number, y: number): void {
  ctx.moveTo(X(x), Y(y));
}
function L(ctx: Ctx, x: number, y: number): void {
  ctx.lineTo(X(x), Y(y));
}
function Q(ctx: Ctx, cx: number, cy: number, x: number, y: number): void {
  ctx.quadraticCurveTo(X(cx), Y(cy), X(x), Y(y));
}
function rect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  M(ctx, x0, y0);
  L(ctx, x1, y0);
  L(ctx, x1, y1);
  L(ctx, x0, y1);
  ctx.closePath();
}
/** A pointed (lancet) window from x0 to x1, sill y0, its arch springing at y1 and peaking at y2. */
function lancet(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, y2: number): void {
  M(ctx, x0, y0);
  L(ctx, x0, y1);
  Q(ctx, x0, (y1 + y2) / 2 + (y2 - y1) * 0.2, (x0 + x1) / 2, y2);
  Q(ctx, x1, (y1 + y2) / 2 + (y2 - y1) * 0.2, x1, y1);
  L(ctx, x1, y0);
  ctx.closePath();
}

// ---------------------------------------------------------------- placing

/** Scratch: each piece's place this frame (screen px), for the stage, the tests and the lane boxes. vis 0 when not shown. */
export const PIECE_AT = PIECES.map(() => ({
  vis: 0,
  /** Its frame: x, foot y, px per unit; where it is cut by the mist (screen y); its box. */
  x: 0,
  y: 0,
  U: 0,
  clip: 0,
  x0: 0,
  x1: 0,
  top: 0,
  /** The level it is placed from (its loop copy's). */
  L0: 0,
}));

/** The level a piece is placed from, nearest the camera (a loop piece's copy). */
function pieceLevel(i: number, lvl: number): number {
  const p = PIECES[i]!;
  return p.L !== undefined ? p.L : loopCopy(p.f!, lvl);
}

/** The moon's halo's lowest point at a level (the moon eases up and swells with the story). */
function haloAt(s: Scene, lvl: number): number {
  const m = moonAt(s, toneOfLevel(lvl));
  return m.y + m.r * HALO_REACH;
}

/** Where piece i stands this frame (sets F and PIECE_AT[i]); false when it is not shown. */
export function pieceAt(s: Scene, i: number): boolean {
  const p = PIECES[i]!;
  const A = PIECE_AT[i]!;
  A.vis = 0;
  const lvl = level(s);
  const L0 = pieceLevel(i, lvl);
  A.L0 = L0;
  const d = lvl - L0;
  if (d < -40 || d >= p.out[1]) return false;
  const lane = laneOf(s, -1);
  const sz = SIZE[p.kind];
  // As wide as the lane (on a tablet's wide lanes too), a hair inside it.
  const margin = s.u * 0.004;
  const halo = haloAt(s, L0) + s.u * 0.08;
  // (On a tablet's wide lanes, no taller than its foot is still on screen when it comes.)
  F.U = Math.min((lane.w - margin * 2) / sz.w, (s.cssH - halo - s.u * 0.03) / sz.h);
  F.x = lane.x;
  // At its level its top stands just under the halo; it sinks on down with its own parallax.
  F.y = halo + sz.h * F.U + d * perLevel(s) * DROWNED_P;
  A.x = F.x;
  A.y = F.y;
  A.U = F.U;
  A.x0 = F.x - (sz.w / 2) * F.U;
  A.x1 = F.x + (sz.w / 2) * F.U;
  A.top = F.y - sz.h * F.U;
  // Cut by the mist: at its top while the piece stands out of it beyond, at its foot once it stands in the sea.
  A.clip = Math.min(s.cssH + s.u, Math.max(F.y, mistTop(s) + s.u * 0.012));
  if (A.top > s.cssH || A.top >= A.clip - s.u * 0.02) return false;
  // Out of the dark below the moon's halo (nothing crosses the moon), and fading as the next comes.
  const m = moonAt(s);
  const vis = (1 - smooth(p.out[0], p.out[1], d)) * belowMoon(s, A.top, m.y + m.r * HALO_REACH);
  if (vis <= 0.01) return false;
  A.vis = vis;
  return true;
}

// ---------------------------------------------------------------- the veil of mist at a piece's foot

/** A row of billows across a piece's foot, at the line it is cut (the mist's own colors, deeper down in the sea). */
function veil(ctx: Ctx, s: Scene, tone: Tone, x0: number, x1: number, y: number): void {
  const deepK = smooth(0.06, 0.12, (y - mistTop(s)) / s.u);
  const body = mixed(tone.fog, tone.sky[2], 0.35);
  const fill = deepK > 0.5 ? mixed(body, tone.sky[0], 0.3) : body;
  const cap = deepK > 0.5 ? body : mixed(tone.fog, "#ffffff", 0.16);
  const r = s.u * 0.022;
  const n = Math.max(2, Math.round((x1 - x0) / (r * 1.5)));
  const step = (x1 - x0) / n;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    ctx.moveTo(x0 - r, y + r * 0.9);
    for (let j = 0; j <= n; j++) {
      const cx = x0 + j * step;
      const lift = (0.3 + 0.45 * hash(j * 7 + 31)) * r + (pass ? -r * 0.32 : 0);
      ctx.lineTo(cx - r, y - lift + r * 0.5);
      ctx.arc(cx, y - lift + r * 0.5, r, Math.PI, 0);
    }
    ctx.lineTo(x1 + r, y + r * 0.9);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + r * 1.6, x0 - r, y + r * 0.9);
    ctx.closePath();
    ctx.fillStyle = pass ? fill : cap;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the drowned chapel

/** The chapel's bell swings; at the witching hour's midnight it tolls (swings hard), as the mansion's clock strikes twelve. */
function bellAngle(s: Scene, lvl: number): number {
  const toll = 1 - smooth(0.0, 0.04, Math.abs(loopFraction(lvl) - MIDNIGHT));
  return swing(s.t, 2.6, 0.16 + 0.3 * toll, 1.3, s.sinceLand ?? Infinity, 0.35, s.still === true);
}

function chapel(ctx: Ctx, s: Scene, lw: number, lvl: number): void {
  const t = s.t;
  // The drowned nave's gable end, beside the tower (toward the column), its walls into the mist.
  ctx.beginPath();
  M(ctx, -0.01, -DEEP);
  L(ctx, -0.01, 0.12);
  L(ctx, 0.05, 0.25);
  L(ctx, 0.112, 0.12);
  L(ctx, 0.112, -DEEP);
  ctx.closePath();
  // A stepped buttress at its corner.
  M(ctx, 0.1, -DEEP);
  L(ctx, 0.1, 0.06);
  L(ctx, 0.118, 0.05);
  L(ctx, 0.118, -DEEP);
  ctx.closePath();
  ctx.fillStyle = STONE_BODY;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  // Its roof's slates on the gable's edge, moonlit.
  ctx.beginPath();
  M(ctx, -0.016, 0.115);
  L(ctx, 0.05, 0.26);
  L(ctx, 0.118, 0.115);
  ctx.strokeStyle = SLATE_LIT;
  ctx.lineWidth = lw * 1.4;
  ctx.stroke();
  // The tower, leaning out a little: its shaft, the belfry's posts and arch, the crooked spire.
  ctx.beginPath();
  M(ctx, -0.112, -DEEP);
  L(ctx, -0.108, 0.3);
  L(ctx, -0.022, 0.31);
  L(ctx, -0.02, -DEEP);
  ctx.closePath();
  M(ctx, -0.116, 0.3);
  L(ctx, -0.018, 0.31);
  L(ctx, -0.018, 0.325);
  L(ctx, -0.116, 0.315);
  ctx.closePath();
  rect(ctx, -0.108, 0.315, -0.094, 0.4);
  rect(ctx, -0.036, 0.322, -0.022, 0.405);
  M(ctx, -0.116, 0.398);
  L(ctx, -0.016, 0.406);
  L(ctx, -0.02, 0.42);
  L(ctx, -0.112, 0.412);
  ctx.closePath();
  // The spire: a witch hat bending over as it rises, curling at its tip.
  M(ctx, -0.11, 0.41);
  Q(ctx, -0.085, 0.5, -0.07, 0.585);
  Q(ctx, -0.062, 0.6, -0.046, 0.59);
  Q(ctx, -0.055, 0.5, -0.02, 0.418);
  ctx.closePath();
  ctx.fillStyle = STONE_BODY;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // The belfry's dark arch behind the bell.
  ctx.beginPath();
  M(ctx, -0.094, 0.315);
  L(ctx, -0.094, 0.37);
  Q(ctx, -0.066, 0.405, -0.036, 0.372);
  L(ctx, -0.036, 0.322);
  ctx.closePath();
  ctx.fillStyle = "#0b0a1c";
  ctx.fill();
  // The bell, swinging on its beam.
  const a = bellAngle(s, lvl);
  const hx = X(-0.065);
  const hy = Y(0.39);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const B = F.U;
  const bp = (lx: number, ly: number, move: boolean) => {
    const px = hx + (lx * c - ly * sn) * B;
    const py = hy + (lx * sn + ly * c) * B;
    if (move) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  };
  ctx.beginPath();
  bp(-0.006, 0, true);
  bp(-0.012, 0.01, false);
  bp(-0.017, 0.036, false);
  bp(-0.024, 0.046, false);
  bp(0.024, 0.046, false);
  bp(0.017, 0.036, false);
  bp(0.012, 0.01, false);
  bp(0.006, 0, false);
  ctx.closePath();
  ctx.fillStyle = BRONZE;
  ctx.fill();
  ctx.beginPath();
  bp(-0.01, 0.014, true);
  bp(-0.014, 0.038, false);
  ctx.strokeStyle = BRONZE_LIT;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  // Moonlit edges: the spire's and the tower's left sides, courses of stone.
  ctx.beginPath();
  M(ctx, -0.104, 0.42);
  Q(ctx, -0.082, 0.5, -0.07, 0.575);
  M(ctx, -0.104, 0.29);
  L(ctx, -0.107, -0.2);
  ctx.strokeStyle = STONE_LIT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const y = 0.25 - i * 0.075;
    M(ctx, -0.108, y);
    L(ctx, -0.022, y + 0.004);
  }
  for (let i = 0; i < 5; i++) {
    const y = 0.1 - i * 0.07;
    M(ctx, -0.008, y);
    L(ctx, 0.11, y + 0.003);
  }
  ctx.strokeStyle = STONE_DARK;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  // The spire's tip curls round, a crooked iron cross on it.
  ctx.beginPath();
  ctx.arc(X(-0.052), Y(0.582), 0.012 * F.U, Math.PI * 0.2, Math.PI * 1.9);
  M(ctx, -0.07, 0.585);
  L(ctx, -0.074, 0.635);
  M(ctx, -0.088, 0.618);
  L(ctx, -0.059, 0.622);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1.2, lw * 1.1);
  ctx.lineCap = "round";
  ctx.stroke();
  // Lit: the great lancet in the gable (its tracery), the rose above it, the tower's slit windows.
  const g = lightsOut(t, 7101, 12) ? 0 : flicker(t, 7101);
  if (g > 0) {
    ctx.beginPath();
    circle(ctx, X(0.05), Y(0.07), 0.07 * F.U);
    ctx.fillStyle = GLOW_SOFT;
    ctx.fill();
  }
  ctx.beginPath();
  lancet(ctx, 0.02, -0.02, 0.08, 0.1, 0.165);
  ctx.fillStyle = g <= 0 ? "#0b0a1c" : g < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(0.05), Y(0.205), 0.018 * F.U);
  ctx.fillStyle = flicker(t, 7103) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  M(ctx, 0.05, -0.02);
  L(ctx, 0.05, 0.165);
  M(ctx, 0.02, 0.06);
  L(ctx, 0.08, 0.06);
  M(ctx, 0.05, 0.11);
  Q(ctx, 0.035, 0.12, 0.03, 0.135);
  M(ctx, 0.05, 0.11);
  Q(ctx, 0.065, 0.12, 0.07, 0.135);
  M(ctx, 0.032, 0.205);
  L(ctx, 0.068, 0.205);
  M(ctx, 0.05, 0.187);
  L(ctx, 0.05, 0.223);
  ctx.strokeStyle = STONE_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  lancet(ctx, 0.02, -0.02, 0.08, 0.1, 0.165);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  const w2 = lightsOut(t, 7105, 6) ? 0 : flicker(t, 7105);
  ctx.beginPath();
  lancet(ctx, -0.072, 0.17, -0.056, 0.22, 0.25);
  lancet(ctx, -0.072, 0.02, -0.056, 0.07, 0.1);
  ctx.fillStyle = w2 <= 0 ? "#0b0a1c" : w2 < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
}

/** The chapel's spots (screen px): the cross's arm (the raven), the belfry (bats), the great lancet (a shadow), a dark slit (eyes), under the belfry's arch (a spider). */
export const CHAPEL_SPOTS = { cross: { x: -0.074, y: 0.636 }, belfry: { x: -0.065, y: 0.338 }, lancet: { x0: 0.026, y0: 0.0, x1: 0.074, y1: 0.095 }, web: { x: -0.04, y: 0.37 } } as const;

// ---------------------------------------------------------------- the crooked lighthouse

/** The lighthouse's lean (units sideways per unit up) and its lamp's height. */
const LH_LEAN = 0.07;
const LH_LAMP = 0.47;
/** The lamp turns once in this many seconds. */
const LH_TURN = 7.5;
const lx = (x: number, y: number) => x - LH_LEAN * Math.max(0, y);

/** The beam's heading now: its sideways reach (-1 left .. 1 right) and whether it faces us (cos > 0). */
function beamOf(t: number): number {
  return (t / LH_TURN) * Math.PI * 2;
}

function lighthouse(ctx: Ctx, s: Scene, lw: number, lane: { x0: number; x1: number; top: number }): void {
  const t = s.t;
  // The rock it stands on, jagged, running down into the mist.
  ctx.beginPath();
  M(ctx, -0.12, -DEEP);
  L(ctx, -0.118, -0.03);
  L(ctx, -0.1, 0.02);
  L(ctx, -0.06, 0.05);
  L(ctx, -0.02, 0.06);
  L(ctx, 0.03, 0.045);
  L(ctx, 0.07, 0.05);
  L(ctx, 0.1, 0.03);
  L(ctx, 0.118, -0.01);
  L(ctx, 0.12, -DEEP);
  ctx.closePath();
  ctx.fillStyle = "#2a2340";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.116, -0.02);
  L(ctx, -0.1, 0.02);
  L(ctx, -0.06, 0.05);
  L(ctx, -0.02, 0.06);
  M(ctx, -0.07, -0.05);
  L(ctx, -0.05, -0.12);
  M(ctx, 0.05, 0.0);
  L(ctx, 0.07, -0.08);
  ctx.strokeStyle = "#4a4072";
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  // The keeper's cottage, leaning against the rock's right shoulder: walls, a crooked roof, a chimney.
  ctx.beginPath();
  M(ctx, 0.032, 0.045);
  L(ctx, 0.035, 0.105);
  L(ctx, 0.108, 0.098);
  L(ctx, 0.106, 0.035);
  ctx.closePath();
  ctx.fillStyle = "#3a2c50";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, 0.084, 0.11, 0.096, 0.16);
  M(ctx, 0.024, 0.1);
  Q(ctx, 0.05, 0.13, 0.064, 0.175);
  L(ctx, 0.07, 0.172);
  Q(ctx, 0.09, 0.13, 0.118, 0.095);
  ctx.closePath();
  ctx.fillStyle = SLATE_ROOF;
  ctx.fill();
  ctx.stroke();
  const cw = lightsOut(s.t, 7201, 9) ? 0 : flicker(s.t, 7201);
  ctx.beginPath();
  rect(ctx, 0.048, 0.058, 0.07, 0.085);
  ctx.fillStyle = cw <= 0 ? "#120e1e" : cw < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  smoke(ctx, t, X(0.09), Y(0.165), F.U * 0.008, F.U * 0.09, F.U * 0.03, 1.3, 0.22, 41);
  // The tower: tapering as it climbs, leaning out; its stripes spiral round it.
  const b0 = 0.035;
  const b1 = 0.024;
  ctx.beginPath();
  M(ctx, lx(-0.03 - b0, 0.05), 0.05);
  L(ctx, lx(-0.03 - b1, 0.42), 0.42);
  L(ctx, lx(-0.03 + b1, 0.42), 0.42);
  L(ctx, lx(-0.03 + b0, 0.05), 0.05);
  ctx.closePath();
  ctx.fillStyle = STRIPE_BONE;
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const y0 = 0.07 + k * 0.074;
    const y1 = y0 + 0.034;
    const w0 = b0 + (b1 - b0) * ((y0 - 0.05) / 0.37);
    const w1 = b0 + (b1 - b0) * ((Math.min(0.42, y1 + 0.02) - 0.05) / 0.37);
    M(ctx, lx(-0.03 - w0, y0), y0);
    L(ctx, lx(-0.03 + w0, y0 + 0.02), y0 + 0.02);
    L(ctx, lx(-0.03 + w1, Math.min(0.42, y1 + 0.02)), Math.min(0.42, y1 + 0.02));
    L(ctx, lx(-0.03 - w1, y1), y1);
    ctx.closePath();
  }
  ctx.fillStyle = STRIPE_INK;
  ctx.fill();
  ctx.beginPath();
  M(ctx, lx(-0.03 - b0, 0.05), 0.05);
  L(ctx, lx(-0.03 - b1, 0.42), 0.42);
  L(ctx, lx(-0.03 + b1, 0.42), 0.42);
  L(ctx, lx(-0.03 + b0, 0.05), 0.05);
  ctx.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // A lit window and a stitched patch on the tower.
  ctx.beginPath();
  rect(ctx, lx(-0.036, 0.25), 0.25, lx(-0.024, 0.25), 0.28);
  ctx.fillStyle = flicker(t, 7203) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const y = 0.13 + k * 0.012;
    M(ctx, lx(-0.012, y), y - 0.005);
    L(ctx, lx(-0.004, y), y + 0.005);
    M(ctx, lx(-0.012, y), y + 0.005);
    L(ctx, lx(-0.004, y), y - 0.005);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  // The gallery and its railing.
  const gx = lx(-0.03, LH_LAMP);
  ctx.beginPath();
  M(ctx, lx(-0.03 - 0.05, 0.42), 0.42);
  L(ctx, lx(-0.03 + 0.05, 0.42), 0.42);
  L(ctx, lx(-0.03 + 0.042, 0.408), 0.408);
  L(ctx, lx(-0.03 - 0.042, 0.408), 0.408);
  ctx.closePath();
  ctx.fillStyle = STRIPE_INK;
  ctx.fill();
  ctx.beginPath();
  M(ctx, lx(-0.03 - 0.048, 0.445), 0.445);
  L(ctx, lx(-0.03 + 0.048, 0.445), 0.445);
  for (let k = 0; k <= 6; k++) {
    const x = -0.03 - 0.048 + k * 0.016;
    M(ctx, lx(x, 0.42), 0.42);
    L(ctx, lx(x, 0.445), 0.445);
  }
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  // The lamp room: green glass, the turning lamp's glare (brightest as the beam swings to face us).
  const a = beamOf(t);
  const face = Math.cos(a);
  const glare = s.still ? 0.5 : Math.max(0, face) ** 3;
  ctx.beginPath();
  circle(ctx, X(gx), Y(LH_LAMP), Math.min((0.045 + 0.05 * glare) * F.U, X(gx) - lane.x0));
  ctx.fillStyle = GREEN_GLOW;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, lx(-0.052, 0.445), 0.445, lx(-0.008, 0.445), 0.5);
  ctx.fillStyle = GREEN_GLASS;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, X(gx + Math.sin(a) * 0.008), Y(LH_LAMP), (0.008 + 0.006 * glare) * F.U);
  ctx.fillStyle = GREEN;
  ctx.fill();
  // The cap: a witch hat leaning further, curling at the tip, a crooked vane.
  ctx.beginPath();
  M(ctx, lx(-0.062, 0.5), 0.5);
  Q(ctx, lx(-0.05, 0.54), 0.54, lx(-0.02, 0.6), 0.6);
  Q(ctx, lx(-0.03, 0.55), 0.55, lx(0.002, 0.5), 0.5);
  ctx.closePath();
  ctx.fillStyle = SLATE_ROOF;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(lx(-0.02, 0.6) + 0.01), Y(0.6), 0.01 * F.U, Math.PI, Math.PI * 2.5);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.stroke();
  // The beam, swinging through the lane (kept to it: never across the column, never up to the moon).
  if (s.still) return;
  const side = Math.sin(a);
  const reachX = side < 0 ? X(gx) - lane.x0 : lane.x1 - X(gx);
  const len = Math.abs(side) * Math.min(reachX, F.U * 0.5);
  if (len < F.U * 0.02) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(lane.x0, lane.top, lane.x1 - lane.x0, Y(-0.02) - lane.top);
  ctx.clip();
  const ox = X(gx);
  const oy = Y(LH_LAMP);
  const dir = side < 0 ? -1 : 1;
  for (let k = 0; k < BEAM.length; k++) {
    const spread = F.U * (0.05 - k * 0.014);
    ctx.beginPath();
    ctx.moveTo(ox, oy - F.U * 0.006);
    ctx.lineTo(ox + dir * len, oy - spread - F.U * 0.01);
    ctx.lineTo(ox + dir * len, oy + spread * 0.6);
    ctx.lineTo(ox, oy + F.U * 0.006);
    ctx.closePath();
    ctx.fillStyle = BEAM[k]!;
    ctx.fill();
  }
  ctx.restore();
}

/** The lighthouse's spots (units): the gallery rail (the raven), the cottage's window (a shadow), the tower's foot (a peeker's rim). */
export const LIGHT_SPOTS = { rail: { x: lx(-0.062, 0.445), y: 0.447 }, window: { x0: 0.05, y0: 0.06, x1: 0.068, y1: 0.083 } } as const;

// ---------------------------------------------------------------- the lantern oak

/** Where the trunk forks into its boughs (units up from the foot), and the trunk's middle. */
const OAK_BASE = 0.2;
const OAK_X = -0.004;
/**
 * The oak's boughs (units from the fork): start offset, a control point, the end, the width at the
 * start and the end, and the way the tip curls (-1, 0, 1). Long and crooked, reaching out to the
 * lane's sides and curling into spirals; two thin ones climb.
 */
const BOUGHS = [
  [-0.012, 0, -0.066, 0.03, -0.094, 0.12, 0.022, 0.005, 1],
  [-0.008, 0.004, -0.05, 0.11, -0.046, 0.2, 0.016, 0.004, -1],
  [0.008, 0.004, 0.02, 0.1, 0.03, 0.19, 0.016, 0.004, 1],
  [0.012, 0, 0.062, 0.02, 0.094, 0.1, 0.022, 0.005, -1],
  [-0.06, 0.05, -0.08, 0.1, -0.072, 0.15, 0.007, 0.003, 1],
  [0.06, 0.04, 0.08, 0.07, 0.084, 0.14, 0.007, 0.003, -1],
] as const;
/** Each bough as a tapered outline (units, from the fork), worked out once: N points down one side and back up the other. */
const BOUGH_N = 7;
const BOUGH_PTS: Float64Array[] = BOUGHS.map(([x0, y0, cx, cy, x1, y1, w0, w1]) => {
  const out = new Float64Array(BOUGH_N * 4);
  for (let i = 0; i < BOUGH_N; i++) {
    const f = i / (BOUGH_N - 1);
    const g = 1 - f;
    const x = g * g * x0 + 2 * g * f * cx + f * f * x1;
    const y = g * g * y0 + 2 * g * f * cy + f * f * y1;
    const dx = 2 * g * (cx - x0) + 2 * f * (x1 - cx);
    const dy = 2 * g * (cy - y0) + 2 * f * (y1 - cy);
    const n = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * f) / 2;
    out[i * 2] = x - (dy / n) * w;
    out[i * 2 + 1] = y + (dx / n) * w;
    out[(BOUGH_N * 2 - 1 - i) * 2] = x + (dy / n) * w;
    out[(BOUGH_N * 2 - 1 - i) * 2 + 1] = y - (dx / n) * w;
  }
  return out;
});
/** Where the lanterns (two) and the cage hang: a fraction along a bough (its index, the fraction). */
const OAK_HANGS = [
  [0, 0.72],
  [3, 0.78],
  [2, 0.62],
] as const;
/** The wind in the crown now: how far its tips sway (units at a unit's height above the fork). */
let oakSway = 0;
function boughX(x: number, y: number): number {
  return X(OAK_X + x + oakSway * y * y * 8);
}
function boughPoint(b: number, f: number): { x: number; y: number } {
  const [x0, y0, cx, cy, x1, y1] = BOUGHS[b]!;
  const g = 1 - f;
  const x = g * g * x0 + 2 * g * f * cx + f * f * x1;
  const y = g * g * y0 + 2 * g * f * cy + f * f * y1;
  HANG.x = boughX(x, y);
  HANG.y = Y(OAK_BASE + y);
  return HANG;
}
const HANG = { x: 0, y: 0 };

function oak(ctx: Ctx, s: Scene, lw: number): void {
  const t = s.t;
  const land = s.sinceLand ?? Infinity;
  const still = s.still === true;
  const tx = OAK_X;
  oakSway = still ? 0 : windAt(t, 81, 0.012, 0, 1).sway;
  // The trunk: thick and twisted, flaring at its roots, its bark in spiralling lines, a hollow.
  ctx.beginPath();
  M(ctx, tx - 0.05, -DEEP);
  L(ctx, tx - 0.05, -0.03);
  Q(ctx, tx - 0.026, 0.04, tx - 0.03, 0.1);
  Q(ctx, tx - 0.034, 0.16, tx - 0.016, OAK_BASE + 0.01);
  L(ctx, tx + 0.016, OAK_BASE + 0.01);
  Q(ctx, tx + 0.028, 0.15, tx + 0.03, 0.09);
  Q(ctx, tx + 0.034, 0.02, tx + 0.058, -0.03);
  L(ctx, tx + 0.058, -DEEP);
  ctx.closePath();
  ctx.fillStyle = BARK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  // The boughs, tapering, their tips curling round into spirals; moonlit along their tops.
  ctx.beginPath();
  for (let b = 0; b < BOUGHS.length; b++) {
    const P = BOUGH_PTS[b]!;
    for (let i = 0; i < BOUGH_N * 2; i++) {
      const x = boughX(P[i * 2]!, P[i * 2 + 1]!);
      const y = Y(OAK_BASE + P[i * 2 + 1]!);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fillStyle = BARK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  for (let b = 0; b < BOUGHS.length; b++) {
    const [, , , , x1, y1, , w1, c] = BOUGHS[b]!;
    if (!c) continue;
    const r = Math.max(w1 * 2.2, 0.009);
    const cx = boughX(x1 + c * r, y1);
    const cy = Y(OAK_BASE + y1);
    ctx.moveTo(boughX(x1, y1), cy);
    ctx.arc(cx, cy, r * F.U, c > 0 ? Math.PI : 0, c > 0 ? Math.PI * 2.7 : -Math.PI * 1.7, c < 0);
  }
  ctx.strokeStyle = BARK;
  ctx.lineWidth = Math.max(1, 0.006 * F.U);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  M(ctx, tx - 0.042, -0.1);
  Q(ctx, tx - 0.026, 0.04, tx - 0.024, 0.16);
  M(ctx, tx - 0.01, -0.1);
  Q(ctx, tx + 0.02, 0.0, tx - 0.004, 0.1);
  Q(ctx, tx - 0.018, 0.15, tx + 0.004, OAK_BASE);
  M(ctx, tx + 0.03, -0.1);
  Q(ctx, tx + 0.02, -0.02, tx + 0.024, 0.06);
  for (let b = 0; b < 4; b++) {
    const P = BOUGH_PTS[b]!;
    for (let i = 1; i < BOUGH_N - 1; i++) {
      const x = boughX(P[i * 2]!, P[i * 2 + 1]!);
      const y = Y(OAK_BASE + P[i * 2 + 1]!);
      if (i === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = BARK_LIT;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  // The hollow, and an owl's eyes blinking in it now and then.
  ctx.beginPath();
  ctx.ellipse(X(tx + 0.004), Y(0.07), 0.014 * F.U, 0.022 * F.U, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#07050f";
  ctx.fill();
  const bt = beat(t, 2.2, 4, 9, 7301);
  const open = bt.since < 0.15 ? 0.2 : 1;
  ctx.beginPath();
  ctx.ellipse(X(tx - 0.002), Y(0.074), 0.0045 * F.U, 0.0045 * F.U * open, 0, 0, Math.PI * 2);
  ctx.ellipse(X(tx + 0.01), Y(0.074), 0.0045 * F.U, 0.0045 * F.U * open, 0, 0, Math.PI * 2);
  ctx.fillStyle = OWL;
  ctx.fill();
  // Lanterns swinging on chains from two boughs, and an empty cage from the third.
  for (let k = 0; k < OAK_HANGS.length; k++) {
    const [b, f] = OAK_HANGS[k]!;
    const p = boughPoint(b, f);
    if (k < 2) lantern(ctx, p.x, p.y, (0.035 + 0.02 * k) * F.U, swing(t, 2.1 + k * 0.37, 0.14, 7310 + k, land, 0.35, still), lw, 7320 + k);
    else cage(ctx, p.x, p.y, 0.035 * F.U, swing(t, 3.3, 0.1, 7330, land, 0.25, still), lw);
  }
}

/** The scene's clock for the lanterns' flicker (set as each piece is drawn). */
const LANTERN_T = { t: 0 };

/** A lantern hanging `len` px on a chain from (x, y), swung by `a`: an iron frame, its glass alight, its glow. */
function lantern(ctx: Ctx, x: number, y: number, len: number, a: number, lw: number, seed: number): void {
  const bx = x - Math.sin(a) * len;
  const by = y + Math.cos(a) * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = CHAIN;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  const r = F.U * 0.012;
  ctx.beginPath();
  circle(ctx, bx, by + r * 1.4, r * 2.4);
  ctx.fillStyle = GLOW;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.6, by);
  ctx.lineTo(bx + r * 0.6, by);
  ctx.lineTo(bx + r, by + r * 0.6);
  ctx.lineTo(bx + r * 0.8, by + r * 2.4);
  ctx.lineTo(bx - r * 0.8, by + r * 2.4);
  ctx.lineTo(bx - r, by + r * 0.6);
  ctx.closePath();
  ctx.fillStyle = flicker(LANTERN_T.t, seed) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
}

/** An empty birdcage hanging `s` px tall from (x, y), rocked by `a`. */
function cage(ctx: Ctx, x: number, y: number, h: number, a: number, lw: number): void {
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const p = (lx2: number, ly: number, move: boolean) => {
    const px = x + lx2 * c - ly * sn;
    const py = y + lx2 * sn + ly * c;
    if (move) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  };
  ctx.beginPath();
  p(0, 0, true);
  p(0, h * 0.3, false);
  for (let i = -2; i <= 2; i++) {
    p(i * h * 0.12, h * (0.42 - Math.abs(i) * 0.04), true);
    p(i * h * 0.12, h, false);
  }
  p(-h * 0.3, h, true);
  p(h * 0.3, h, false);
  p(-h * 0.27, h * 0.4, true);
  p(0, h * 0.3, false);
  p(h * 0.27, h * 0.4, false);
  ctx.strokeStyle = "#6a6290";
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
}

/** The oak's spots: its boughs (a skeletal bird, the raven), its hollow (eyes), a limb's tip (a spider). Set by oakSpots. */
export const OAK_AT = { fork: { x: 0, y: 0 }, bough: { x: 0, y: 0 }, hollow: { x: 0, y: 0, w: 0, h: 0 } };
function oakSpots(s: Scene): void {
  oakSway = s.still ? 0 : windAt(s.t, 81, 0.012, 0, 1).sway;
  let p = boughPoint(1, 0.55);
  OAK_AT.fork.x = p.x;
  OAK_AT.fork.y = p.y - 0.004 * F.U;
  p = boughPoint(3, 0.45);
  OAK_AT.bough.x = p.x;
  OAK_AT.bough.y = p.y - 0.006 * F.U;
  OAK_AT.hollow.x = X(OAK_X - 0.008);
  OAK_AT.hollow.y = Y(0.082);
  OAK_AT.hollow.w = 0.024 * F.U;
  OAK_AT.hollow.h = 0.03 * F.U;
}

// ---------------------------------------------------------------- the ghost ship

/** The ship is drawn this much smaller than its frame: listing and rolling, it still keeps inside its lane. */
const SHIP_K = 0.88;
/** The ship's list (rad) and its slow roll on the swell. */
function shipRoll(s: Scene): number {
  return -0.06 + (s.still ? 0 : 0.025 * Math.sin(s.t * 1.15) + 0.01 * Math.sin(s.t * 2.7 + 1));
}

function ship(ctx: Ctx, s: Scene, lw: number): void {
  const t = s.t;
  const roll = shipRoll(s);
  ctx.save();
  ctx.translate(X(0), Y(0));
  ctx.rotate(roll);
  ctx.scale(SHIP_K, SHIP_K);
  ctx.translate(-X(0), -Y(0));
  // The hull: the stern castle high on the left (out in the lane), the deck sloping down into the mist.
  ctx.beginPath();
  M(ctx, -0.06, -DEEP * 0.5);
  Q(ctx, -0.1, -0.12, -0.112, 0.04);
  Q(ctx, -0.118, 0.12, -0.104, 0.165);
  L(ctx, -0.04, 0.165);
  L(ctx, -0.036, 0.11);
  L(ctx, 0.112, 0.06);
  Q(ctx, 0.1, -0.12, 0.06, -DEEP * 0.5);
  ctx.closePath();
  ctx.fillStyle = WOOD;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  // Planks, a rail along the deck, a moonlit edge.
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const y = 0.02 - k * 0.04;
    M(ctx, -0.116, y + 0.06);
    L(ctx, 0.118, y + 0.01);
  }
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  M(ctx, -0.115, 0.15);
  Q(ctx, -0.12, 0.1, -0.117, 0.0);
  M(ctx, -0.036, 0.12);
  L(ctx, 0.116, 0.072);
  ctx.strokeStyle = WOOD_LIT;
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.stroke();
  // The stern gallery's windows, lit (one goes dark now and then).
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    if (k === 1 && lightsOut(t, 7401, 7)) continue;
    rect(ctx, -0.108 + k * 0.022, 0.1, -0.094 + k * 0.022, 0.135);
  }
  ctx.fillStyle = flicker(t, 7403) < 1 ? LAMP_DEEP : LAMP;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(-0.075), Y(0.118), 0.05 * F.U);
  ctx.fillStyle = GLOW_SOFT;
  ctx.fill();
  // Masts and yards.
  ctx.beginPath();
  M(ctx, -0.07, 0.165);
  L(ctx, -0.07, 0.42);
  M(ctx, 0.03, 0.09);
  L(ctx, 0.03, 0.5);
  M(ctx, -0.09, 0.38);
  L(ctx, -0.035, 0.38);
  M(ctx, -0.022, 0.44);
  L(ctx, 0.085, 0.44);
  M(ctx, -0.01, 0.27);
  L(ctx, 0.075, 0.27);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(1.2, lw * 1.1);
  ctx.lineCap = "round";
  ctx.stroke();
  // Rigging, sagging.
  ctx.beginPath();
  M(ctx, 0.03, 0.5);
  Q(ctx, 0.08, 0.3, 0.115, 0.075);
  M(ctx, 0.03, 0.5);
  Q(ctx, -0.02, 0.33, -0.04, 0.17);
  M(ctx, -0.07, 0.42);
  Q(ctx, -0.1, 0.3, -0.112, 0.17);
  ctx.strokeStyle = CHAIN;
  ctx.lineWidth = Math.max(0.6, lw * 0.4);
  ctx.stroke();
  // Tattered sails, billowing and fluttering at their torn edges.
  const fl = (k: number) => (s.still ? 0 : Math.sin(t * 6.3 + k * 1.7) * 0.006);
  ctx.beginPath();
  M(ctx, -0.022, 0.437);
  Q(ctx, 0.03, 0.4 + fl(1), 0.085, 0.437);
  L(ctx, 0.078, 0.36 + fl(2));
  L(ctx, 0.065, 0.33);
  L(ctx, 0.055, 0.35 + fl(3));
  L(ctx, 0.04, 0.3);
  L(ctx, 0.022, 0.335 + fl(4));
  L(ctx, 0.005, 0.31);
  L(ctx, -0.014, 0.35 + fl(5));
  ctx.closePath();
  M(ctx, -0.088, 0.377);
  Q(ctx, -0.064, 0.35 + fl(6), -0.038, 0.377);
  L(ctx, -0.042, 0.3 + fl(7));
  L(ctx, -0.053, 0.28);
  L(ctx, -0.064, 0.31 + fl(8));
  L(ctx, -0.077, 0.285);
  L(ctx, -0.084, 0.32 + fl(9));
  ctx.closePath();
  ctx.fillStyle = SAIL;
  ctx.fill();
  ctx.beginPath();
  M(ctx, -0.008, 0.268);
  Q(ctx, 0.03, 0.24 + fl(10), 0.072, 0.268);
  L(ctx, 0.066, 0.2 + fl(11));
  L(ctx, 0.05, 0.215);
  L(ctx, 0.035, 0.17 + fl(12));
  L(ctx, 0.016, 0.205);
  L(ctx, -0.002, 0.18 + fl(13));
  ctx.closePath();
  ctx.fillStyle = SAIL_SHADE;
  ctx.fill();
  // The crow's nest, a tattered pennant flapping from the mainmast's top.
  ctx.beginPath();
  rect(ctx, 0.018, 0.455, 0.042, 0.475);
  ctx.fillStyle = WOOD;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.beginPath();
  M(ctx, 0.03, 0.5);
  for (let k = 1; k <= 4; k++) L(ctx, 0.03 + k * 0.012, 0.497 - k * 0.002 + (s.still ? 0 : Math.sin(t * 7 - k) * 0.004 * k));
  L(ctx, 0.07, 0.48);
  for (let k = 3; k >= 1; k--) L(ctx, 0.03 + k * 0.012, 0.484 - k * 0.001 + (s.still ? 0 : Math.sin(t * 7 - k) * 0.004 * k));
  L(ctx, 0.03, 0.486);
  ctx.closePath();
  ctx.fillStyle = PENNANT;
  ctx.fill();
  // The stern lantern, swinging on its post.
  ctx.beginPath();
  M(ctx, -0.04, 0.165);
  L(ctx, -0.042, 0.21);
  Q(ctx, -0.042, 0.225, -0.052, 0.225);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.restore();
  // (The lantern hangs plumb, whatever the ship's roll: drawn in the screen's frame from its hook.)
  const dx = -0.052 * F.U * SHIP_K;
  const dy = -0.225 * F.U * SHIP_K;
  const hx = X(0) + dx * Math.cos(roll) - dy * Math.sin(roll);
  const hy = Y(0) + dx * Math.sin(roll) + dy * Math.cos(roll);
  lantern(ctx, hx, hy, 0.025 * F.U, swing(t, 1.9, 0.18, 7410, s.sinceLand ?? Infinity, 0.3, s.still === true), lw, 7411);
  // And a lantern hung from the main yard's end, high up.
  const yx = 0.078 * F.U * SHIP_K;
  const yy = -0.44 * F.U * SHIP_K;
  lantern(ctx, X(0) + yx * Math.cos(roll) - yy * Math.sin(roll), Y(0) + yx * Math.sin(roll) + yy * Math.cos(roll), 0.03 * F.U, swing(t, 2.3, 0.2, 7412, s.sinceLand ?? Infinity, 0.3, s.still === true), lw, 7413);
}

/** The ship's spots (units, before its roll): the mainmast's top (the raven), the stern windows (a shadow), the crow's nest (a peeker). */
export const SHIP_SPOTS = { mast: { x: 0.03, y: 0.5 }, window: { x0: -0.108, y0: 0.1, x1: -0.05, y1: 0.135 }, nest: { x0: 0.018, x1: 0.042, y: 0.475 } } as const;

// ---------------------------------------------------------------- the pieces, drawn

/** Where the lane is this frame, for a beam to keep to (scratch). */
const LANE_BOX = { x0: 0, x1: 0, top: 0 };

/** The set pieces standing out of the mist this frame (after the mist floor: they stand in its sea). */
export function drowned(ctx: Ctx, s: Scene, tone: Tone): void {
  const lw = Math.max(1, s.u * 0.0045);
  const lvl = level(s);
  LANTERN_T.t = s.t;
  for (let i = 0; i < PIECES.length; i++) {
    if (!pieceAt(s, i)) continue;
    const A = PIECE_AT[i]!;
    const kind = PIECES[i]!.kind;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, s.cssW, A.clip);
    ctx.clip();
    ctx.globalAlpha = A.vis;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    switch (kind) {
      case "chapel":
        chapel(ctx, s, lw, lvl);
        break;
      case "lighthouse": {
        const m = moonAt(s);
        const lane = laneOf(s, -1);
        LANE_BOX.x0 = lane.x - lane.w / 2;
        LANE_BOX.x1 = lane.x + lane.w / 2;
        LANE_BOX.top = Math.max(m.y + m.r * HALO_REACH + s.u * 0.01, s.cssH * 0.2);
        lighthouse(ctx, s, lw, LANE_BOX);
        break;
      }
      case "oak":
        oak(ctx, s, lw);
        break;
      case "ship":
        ship(ctx, s, lw);
        break;
    }
    ctx.restore();
    ctx.globalAlpha = A.vis;
    veil(ctx, s, tone, A.x0 + s.u * 0.02, A.x1 - s.u * 0.02, A.clip);
    ctx.globalAlpha = 1;
  }
}

/** Sets F to piece i's frame (after pieceAt). */
export function pieceFrame(i: number): void {
  const A = PIECE_AT[i]!;
  F.x = A.x;
  F.y = A.y;
  F.U = A.U;
}

/** A point of piece i (units) on screen: x then y (scratch). */
const PT = { x: 0, y: 0 };
export function piecePoint(i: number, x: number, y: number): typeof PT {
  pieceFrame(i);
  const kind = PIECES[i]!.kind;
  if (kind === "ship") {
    // The ship rolls about its foot's middle.
    const r = PIECE_ROLL.r;
    const dx = x * F.U * SHIP_K;
    const dy = -y * F.U * SHIP_K;
    PT.x = F.x + dx * Math.cos(r) - dy * Math.sin(r);
    PT.y = F.y + dx * Math.sin(r) + dy * Math.cos(r);
    return PT;
  }
  PT.x = X(x);
  PT.y = Y(y);
  return PT;
}
/** The ship's roll this frame (set by pieceSpots). */
const PIECE_ROLL = { r: 0 };

/** Set the oak's spots and the ship's roll for this frame (the stage calls it after pieceAt). */
export function pieceSpots(s: Scene, i: number): void {
  pieceFrame(i);
  const kind = PIECES[i]!.kind;
  if (kind === "oak") oakSpots(s);
  if (kind === "ship") PIECE_ROLL.r = shipRoll(s);
}

// ---------------------------------------------------------------- life in the mist

/** The headstones drifting by in the sea: every STONE_RUN levels a row, in both lanes. */
const STONE_RUN = 24;
const SEA_STONES = [
  { at: 0, side: -1, x: 0.25, h: 0.05, kind: 0, candle: true },
  { at: 4, side: 1, x: 0.7, h: 0.045, kind: 1, candle: false },
  { at: 7, side: -1, x: 0.72, h: 0.04, kind: 2, candle: false },
  { at: 11, side: 1, x: 0.3, h: 0.055, kind: 0, candle: true },
  { at: 15, side: -1, x: 0.5, h: 0.045, kind: 1, candle: false },
  { at: 18, side: 1, x: 0.62, h: 0.04, kind: 2, candle: false },
  { at: 21, side: -1, x: 0.18, h: 0.042, kind: 2, candle: true },
] as const;
const SEA_STONE = "#4a4d66";
const SEA_STONE_LIT = "#8a8eae";

/** How tall the sea of mist below the screen's mist top is (px): life in it needs room. */
function sea(s: Scene): number {
  return s.cssH - mistTop(s);
}

/** The drowned headstones, the will-o'-wisps and the ferry in the sea of mist (lanes only). */
export function mistLife(ctx: Ctx, s: Scene, tone: Tone): void {
  const top = mistTop(s);
  if (sea(s) < s.u * 0.12) return;
  const lvl = level(s);
  const u = s.u;
  const lw = Math.max(1, u * 0.004);
  const L = laneOf(s, -1);
  const lx0 = L.x - L.w / 2;
  const lw0 = L.w;
  const R = laneOf(s, 1);
  const rx0 = R.x - R.w / 2;
  const rw0 = R.w;
  const v = perLevel(s) * STONES_P;
  const body = mixed(tone.fog, tone.sky[2], 0.35);
  // The headstones: each slides down from the sea's far edge (out of the haze) to the screen's bottom.
  const n0 = Math.floor(lvl / STONE_RUN) - 3;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let n = n0; n <= n0 + 4; n++) {
      for (let j = 0; j < SEA_STONES.length; j++) {
        const st = SEA_STONES[j]!;
        const at = n * STONE_RUN + st.at;
        const y = top + u * 0.02 + (lvl - at) * v;
        if (y < top + u * 0.02 || y > s.cssH + u * 0.06) continue;
        const k = 0.7 + 0.6 * Math.min(1, (y - top) / Math.max(1, sea(s)));
        const h = st.h * u * k;
        const x = st.side < 0 ? lx0 + lw0 * st.x : rx0 + rw0 * st.x;
        const w = h * 0.62;
        if (pass === 0) {
          ctx.moveTo(x - w / 2, y);
          ctx.lineTo(x - w / 2, y - h * 0.65);
          if (st.kind === 1) {
            ctx.lineTo(x, y - h);
            ctx.lineTo(x + w / 2, y - h * 0.65);
          } else if (st.kind === 2) {
            ctx.lineTo(x - w * 0.18, y - h * 0.65);
            ctx.lineTo(x - w * 0.18, y - h);
            ctx.lineTo(x + w * 0.18, y - h);
            ctx.lineTo(x + w * 0.18, y - h * 0.65);
            ctx.lineTo(x + w / 2, y - h * 0.65);
          } else {
            ctx.quadraticCurveTo(x, y - h * 1.25, x + w / 2, y - h * 0.65);
          }
          ctx.lineTo(x + w / 2, y);
          ctx.closePath();
        } else {
          ctx.moveTo(x - w / 2 + lw, y - h * 0.1);
          ctx.lineTo(x - w / 2 + lw, y - h * 0.6);
        }
      }
    }
    if (pass === 0) {
      ctx.fillStyle = SEA_STONE;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
    } else {
      ctx.strokeStyle = SEA_STONE_LIT;
      ctx.lineWidth = Math.max(0.8, lw * 0.7);
      ctx.stroke();
    }
  }
  // Their feet lost in the mist, and a candle burning on one or two.
  ctx.beginPath();
  for (let n = n0; n <= n0 + 4; n++) {
    for (let j = 0; j < SEA_STONES.length; j++) {
      const st = SEA_STONES[j]!;
      const at = n * STONE_RUN + st.at;
      const y = top + u * 0.02 + (lvl - at) * v;
      if (y < top + u * 0.02 || y > s.cssH + u * 0.06) continue;
      const k = 0.7 + 0.6 * Math.min(1, (y - top) / Math.max(1, sea(s)));
      const x = st.side < 0 ? lx0 + lw0 * st.x : rx0 + rw0 * st.x;
      const r = st.h * u * k * 0.5;
      ctx.moveTo(x - r * 1.6, y + r * 0.3);
      ctx.arc(x - r * 0.6, y + r * 0.2, r * 0.8, Math.PI, 0);
      ctx.arc(x + r * 0.5, y + r * 0.25, r * 0.9, Math.PI, 0);
      ctx.lineTo(x + r * 1.6, y + r * 0.8);
      ctx.lineTo(x - r * 1.6, y + r * 0.8);
      ctx.closePath();
    }
  }
  ctx.fillStyle = body;
  ctx.fill();
  for (let n = n0; n <= n0 + 4; n++) {
    for (let j = 0; j < SEA_STONES.length; j++) {
      const st = SEA_STONES[j]!;
      if (!st.candle) continue;
      const at = n * STONE_RUN + st.at;
      const y = top + u * 0.02 + (lvl - at) * v;
      if (y < top + u * 0.02 || y > s.cssH) continue;
      const k = 0.7 + 0.6 * Math.min(1, (y - top) / Math.max(1, sea(s)));
      const h = st.h * u * k;
      const x = st.side < 0 ? lx0 + lw0 * st.x : rx0 + rw0 * st.x;
      const cy = y - h * (st.kind === 2 ? 1 : 0.95);
      // (It gutters out now and then and is lit again.)
      if (lightsOut(s.t, 7500 + j, 3 + j)) continue;
      ctx.beginPath();
      circle(ctx, x, cy - h * 0.12, h * 0.4);
      ctx.fillStyle = GLOW;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(x - h * 0.05, cy - h * 0.12, h * 0.1, h * 0.12);
      ctx.fillStyle = BONE;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, cy - h * 0.2 - (flicker(s.t, 7510 + j) < 1 ? 0 : h * 0.02), h * 0.04, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = LAMP_CORE;
      ctx.fill();
    }
  }
  wisps(ctx, s, top, lx0, lw0, rx0, rw0);
  ferry(ctx, s, top, lx0, lw0, rx0, rw0, lw);
}

/** Will-o'-wisps over the sea: two a lane, each wandering and bobbing on its own clock, fading in and out. */
const WISPS = [
  { side: -1, ph: 0.3, rate: 0.21, high: 0.35 },
  { side: -1, ph: 2.1, rate: 0.17, high: 0.65 },
  { side: 1, ph: 4.4, rate: 0.19, high: 0.45 },
  { side: 1, ph: 1.2, rate: 0.23, high: 0.75 },
] as const;
const WISP_GLOW = [alpha("#9fe0b8", 0.1), alpha("#9fe0b8", 0.22)] as const;
const WISP_CORE = "#e4fff0";

function wisps(ctx: Ctx, s: Scene, top: number, lx0: number, lw0: number, rx0: number, rw0: number): void {
  const u = s.u;
  const h = s.cssH - top;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (let i = 0; i < WISPS.length; i++) {
      const w = WISPS[i]!;
      const on = Math.sin(s.t * 0.31 + w.ph * 3);
      if (on < -0.2) continue;
      const k = Math.min(1, (on + 0.2) / 0.5);
      const ax = 0.5 + 0.28 * Math.sin(s.t * w.rate + w.ph) + 0.06 * Math.sin(s.t * w.rate * 3.1 + w.ph * 2);
      const x = w.side < 0 ? lx0 + lw0 * ax : rx0 + rw0 * ax;
      const y = top + h * w.high + Math.sin(s.t * 1.3 + w.ph) * u * 0.012;
      if (y > s.cssH - u * 0.02) continue;
      const r = u * (pass === 0 ? 0.022 : pass === 1 ? 0.011 : 0.0045) * (0.6 + 0.4 * k);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = pass === 2 ? WISP_CORE : WISP_GLOW[pass]!;
    ctx.fill();
  }
}

/** The ferry: crossing a lane's sea every 16 to 30 s (the lanes take turns), in 9 s. */
const FERRY_CROSS = 9;
export function ferryAt(t: number): { k: number; side: -1 | 1; dir: -1 | 1 } | null {
  const b = beat(t, 4, 16, 30, 7600);
  if (b.since >= FERRY_CROSS) return null;
  FERRY.k = b.since / FERRY_CROSS;
  FERRY.side = b.k % 2 ? 1 : -1;
  FERRY.dir = hash(b.k * 13 + 7601) < 0.5 ? -1 : 1;
  return FERRY;
}
const FERRY: { k: number; side: -1 | 1; dir: -1 | 1 } = { k: 0, side: -1, dir: 1 };
const FERRY_LEN = 0.11;
const HOOD = "#1a1426";
const HOOD_LIT = "#4a4070";

function ferry(ctx: Ctx, s: Scene, top: number, lx0: number, lw0: number, rx0: number, rw0: number, lw: number): void {
  const f = ferryAt(s.t);
  if (!f) return;
  LANTERN_T.t = s.t;
  const u = s.u;
  const x0 = f.side < 0 ? lx0 : rx0;
  const w = f.side < 0 ? lw0 : rw0;
  const len = Math.min(FERRY_LEN * u, w * 0.4);
  const room = w - len * 2;
  if (room <= 0) return;
  const k = f.dir > 0 ? f.k : 1 - f.k;
  const x = x0 + len + room * (0.5 - 0.5 * Math.cos(k * Math.PI));
  const y = top + (s.cssH - top) * 0.5;
  if (y - len * 0.9 < top) return;
  const vis = smooth(0, 0.12, f.k) * (1 - smooth(0.88, 1, f.k));
  const d = f.dir;
  const bob = Math.sin(s.t * 1.7) * len * 0.02;
  ctx.globalAlpha = vis;
  // The wake: two pale ripples trailing behind.
  ctx.beginPath();
  ctx.moveTo(x - d * len * 0.5, y + len * 0.02);
  ctx.quadraticCurveTo(x - d * len * 0.68, y + len * 0.06, x - d * len * 0.86, y + len * 0.02);
  ctx.moveTo(x - d * len * 0.46, y + len * 0.08);
  ctx.quadraticCurveTo(x - d * len * 0.62, y + len * 0.12, x - d * len * 0.76, y + len * 0.1);
  ctx.strokeStyle = WAKE;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  // The punt: long and low, its prow curling up into a spiral.
  ctx.beginPath();
  ctx.moveTo(x - d * len * 0.5, y - len * 0.08 + bob);
  ctx.lineTo(x + d * len * 0.38, y - len * 0.08 + bob);
  ctx.quadraticCurveTo(x + d * len * 0.52, y - len * 0.1 + bob, x + d * len * 0.5, y - len * 0.24 + bob);
  ctx.quadraticCurveTo(x + d * len * 0.42, y - len * 0.3 + bob, x + d * len * 0.4, y - len * 0.22 + bob);
  ctx.quadraticCurveTo(x + d * len * 0.42, y - len * 0.14 + bob, x + d * len * 0.32, y + bob);
  ctx.lineTo(x - d * len * 0.44, y + bob);
  ctx.closePath();
  ctx.fillStyle = WOOD;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // The ferryman: tall, thin, hooded, two gold glints under the hood, leaning on his pole.
  const fx = x - d * len * 0.28;
  const pole = Math.sin(s.t * 1.4) * 0.12;
  ctx.beginPath();
  ctx.moveTo(fx - len * 0.07, y - len * 0.08 + bob);
  ctx.quadraticCurveTo(fx - len * 0.06, y - len * 0.4 + bob, fx - d * len * 0.01, y - len * 0.58 + bob);
  ctx.quadraticCurveTo(fx + d * len * 0.06, y - len * 0.62 + bob, fx + d * len * 0.07, y - len * 0.5 + bob);
  ctx.quadraticCurveTo(fx + len * 0.06, y - len * 0.3 + bob, fx + len * 0.08, y - len * 0.08 + bob);
  ctx.closePath();
  ctx.fillStyle = HOOD;
  ctx.fill();
  ctx.strokeStyle = HOOD_LIT;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fx + d * len * 0.04, y - len * 0.42 + bob);
  ctx.lineTo(fx - d * len * (0.25 - pole * 0.4), y + len * 0.2);
  ctx.strokeStyle = WOOD_LIT;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, fx + d * len * 0.035, y - len * 0.5 + bob, len * 0.012);
  circle(ctx, fx + d * len * 0.06, y - len * 0.5 + bob, len * 0.012);
  ctx.fillStyle = OWL;
  ctx.fill();
  // The passenger: a little jack-o'-lantern amidships.
  const px = x + d * len * 0.08;
  ctx.beginPath();
  ctx.ellipse(px, y - len * 0.13 + bob, len * 0.07, len * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ff8a1e";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - len * 0.035, y - len * 0.14 + bob);
  ctx.lineTo(px - len * 0.015, y - len * 0.16 + bob);
  ctx.lineTo(px - len * 0.01, y - len * 0.13 + bob);
  ctx.moveTo(px + len * 0.035, y - len * 0.14 + bob);
  ctx.lineTo(px + len * 0.015, y - len * 0.16 + bob);
  ctx.lineTo(px + len * 0.01, y - len * 0.13 + bob);
  ctx.moveTo(px - len * 0.035, y - len * 0.105 + bob);
  ctx.quadraticCurveTo(px, y - len * 0.08 + bob, px + len * 0.035, y - len * 0.105 + bob);
  ctx.strokeStyle = LAMP_CORE;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  // The lantern on a crooked pole at the bow, swinging.
  const bx = x + d * len * 0.36;
  ctx.beginPath();
  ctx.moveTo(bx, y - len * 0.08 + bob);
  ctx.lineTo(bx + d * len * 0.04, y - len * 0.4 + bob);
  ctx.quadraticCurveTo(bx + d * len * 0.06, y - len * 0.46 + bob, bx + d * len * 0.12, y - len * 0.44 + bob);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.stroke();
  const saveU = F.U;
  F.U = len * 4;
  lantern(ctx, bx + d * len * 0.12, y - len * 0.44 + bob, len * 0.1, swing(s.t, 1.6, 0.2, 7620, s.sinceLand ?? Infinity, 0.3, s.still === true), lw, 7621);
  F.U = saveU;
  ctx.globalAlpha = 1;
}
const WAKE = alpha("#c8d0f0", 0.35);

/** The ferry's box this frame (for the tests), or null when it is not out. */
export function ferryBox(s: Scene): { x0: number; y0: number; x1: number; y1: number } | null {
  const f = ferryAt(s.t);
  if (!f || sea(s) < s.u * 0.12) return null;
  const top = mistTop(s);
  const lane = laneOf(s, f.side);
  const len = Math.min(FERRY_LEN * s.u, lane.w * 0.4);
  const room = lane.w - len * 2;
  if (room <= 0) return null;
  const k = f.dir > 0 ? f.k : 1 - f.k;
  const x = lane.x - lane.w / 2 + len + room * (0.5 - 0.5 * Math.cos(k * Math.PI));
  const y = top + (s.cssH - top) * 0.5;
  if (y - len * 0.9 < top) return null;
  return { x0: x - len * 0.92, x1: x + len * 0.92, y0: y - len * 0.7, y1: y + len * 0.25 };
}

/** The colors the pieces use (for the palette checks). */
export const DROWNED_COLORS = [STONE_BODY, STONE_LIT, STRIPE_BONE, STRIPE_INK, WOOD, BARK, LIMB] as const;

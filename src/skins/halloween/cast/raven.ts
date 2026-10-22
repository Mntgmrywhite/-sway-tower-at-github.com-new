import type { Ctx } from "../../../base/draw";
import { GOLD, INK, NIGHT, RIM_SOFT, SHEEN } from "./palette";
import { C, L, M, P, pen, Q, stroke } from "./pen";
import { bump, clamp01, Rhythm, smooth } from "./time";

// The raven on the chimney pots: heavier than the churchyard crow, hunched, with a shaggy throat,
// a wedge tail, a thick curved beak and a violet sheen. Every 17-31 s it glides in from the lane's
// outer edge, flares its wings and lands on its chimney (a spire tip, a gargoyle, a dead tree),
// caws twice, preens, hops round, and flies back off the way it came. A floor landing on the
// tower makes it hop and flap. Night black, moonlit along its upper-left edges.
//
// Drawn in its own units (one unit = its perched height, `size` px), anchored at its feet: perched
// on the perch, flying where its feet are tucked (its body 0.45 above).

/** Perched height in u at k = 1. */
export const RAVEN_SIZE = 0.034;

/** A visit, seconds from its start: glide in, perch, fly off. */
const GLIDE = 0.8;
const PERCH = 5.6;
const OFF = 0.8;
const VISIT = GLIDE + PERCH + OFF;
/** Caws (seconds into its perch) and a preen between them. */
const CAWS = [1.2, 4.0] as const;
const CAW = 0.5;
const PREEN = [2.0, 3.1] as const;
/** First glide in at 2.2 s (1.3 s later per step of its anchor's id mod 3), then every 17-31 s. */
const RHYTHM = new Rhythm(2.2, 1.3, 17, 31, 23);

export interface RavenPose {
  vis: number;
  flying: boolean;
  /** 0 → 1 gliding in, 1 → 2 flying off (1 while perched). */
  k: number;
  /** Wings: -1 down .. 1 up. */
  lift: number;
  caw: number;
  preen: number;
  hop: number;
}

const POSE: RavenPose = { vis: 0, flying: false, k: 1, lift: 0, caw: 0, preen: 0, hop: 0 };

/** The raven at time t on the perch anchored `seed` (pure; the result is reused scratch). */
export function ravenAt(t: number, seed: number, sinceLand: number): Readonly<RavenPose> {
  const a = RHYTHM.at(t, seed);
  const p = POSE;
  p.vis = 0;
  p.flying = false;
  p.k = 1;
  p.lift = 0;
  p.caw = 0;
  p.preen = 0;
  p.hop = 0;
  if (!(a >= 0 && a < VISIT)) return p;
  p.vis = 1;
  if (a < GLIDE) {
    p.flying = true;
    p.k = a / GLIDE;
    // Gliding in on spread wings, then flapping to brake as it lands.
    p.lift = p.k < 0.6 ? 0.35 + 0.1 * Math.sin(t * 3) : Math.sin((p.k - 0.6) * 40);
    p.vis = smooth(0, 0.25, p.k);
    return p;
  }
  if (a >= GLIDE + PERCH) {
    p.flying = true;
    p.k = 1 + (a - GLIDE - PERCH) / OFF;
    p.lift = Math.sin((p.k - 1) * 36);
    p.vis = 1 - smooth(1.7, 2, p.k);
    return p;
  }
  const b = a - GLIDE;
  for (const c of CAWS) p.caw = Math.max(p.caw, bump(c, c + 0.08, c + CAW - 0.15, c + CAW, b) * (0.7 + 0.3 * Math.sin(b * 30)));
  p.preen = bump(PREEN[0], PREEN[0] + 0.25, PREEN[1] - 0.25, PREEN[1], b);
  // A little hop round on the pot now and then, and a startled hop when a floor lands.
  const hop = bump(4.7, 4.85, 4.85, 5.05, b);
  const startle = sinceLand >= 0 ? bump(0, 0.08, 0.2, 0.4, sinceLand) : 0;
  p.hop = Math.max(hop, startle);
  if (startle > 0.01) {
    p.lift = Math.sin(sinceLand * 40) * startle;
    p.preen = 0;
  }
  return p;
}

/** Scratch result of `ravenSpot`. */
const SPOT = { x: 0, y: 0, dir: 1 as -1 | 1 };

/**
 * Where the raven is: its feet, gliding in from (fromX, fromY) to the perch, perched, or flying
 * back off toward (fromX, fromY); and which way it faces (toward the tower when perched).
 */
export function ravenSpot(p: Readonly<RavenPose>, perchX: number, perchY: number, fromX: number, fromY: number): Readonly<typeof SPOT> {
  const inward: -1 | 1 = perchX >= fromX ? 1 : -1;
  if (!p.flying || p.k === 1) {
    SPOT.x = perchX;
    SPOT.y = perchY;
    SPOT.dir = inward;
    return SPOT;
  }
  if (p.k < 1) {
    const e = 1 - (1 - p.k) * (1 - p.k);
    SPOT.x = fromX + (perchX - fromX) * e;
    // A shallow swoop: dipping a little below its line, then up onto the pot.
    SPOT.y = fromY + (perchY - fromY) * p.k + Math.sin(p.k * Math.PI) * Math.abs(perchX - fromX) * 0.12;
    SPOT.dir = inward;
    return SPOT;
  }
  const f = p.k - 1;
  const e = f * f;
  SPOT.x = perchX + (fromX - perchX) * e;
  SPOT.y = perchY + (fromY - perchY) * f - Math.sin(f * Math.PI) * Math.abs(perchX - fromX) * 0.08;
  SPOT.dir = inward === 1 ? -1 : 1;
  return SPOT;
}

// ---------------------------------------------------------------- drawing

function perchedBody(ctx: Ctx): void {
  // Hunched body with a ragged belly
  M(ctx, 0.2, -0.72);
  Q(ctx, 0.36, -0.58, 0.26, -0.4);
  L(ctx, 0.18, -0.3);
  L(ctx, 0.2, -0.23);
  L(ctx, 0.1, -0.25);
  L(ctx, 0.08, -0.18);
  L(ctx, -0.02, -0.24);
  L(ctx, -0.07, -0.18);
  L(ctx, -0.14, -0.27);
  Q(ctx, -0.32, -0.32, -0.32, -0.46);
  Q(ctx, -0.22, -0.68, 0.2, -0.72);
  ctx.closePath();
}

/** Head and throat hackles about the head's center (0, 0). */
function head(ctx: Ctx, hx: number, hy: number): void {
  C(ctx, hx, hy, 0.18);
  M(ctx, hx - 0.12, hy + 0.08);
  L(ctx, hx + 0.12, hy + 0.12);
  L(ctx, hx + 0.04, hy + 0.17);
  L(ctx, hx + 0.1, hy + 0.25);
  L(ctx, hx - 0.01, hy + 0.22);
  L(ctx, hx, hy + 0.31);
  L(ctx, hx - 0.14, hy + 0.21);
  ctx.closePath();
}

function flyingBody(ctx: Ctx): void {
  // In profile: body, a wedge tail, the head forward
  M(ctx, 0.5, -0.5);
  Q(ctx, 0.62, -0.5, 0.58, -0.42);
  L(ctx, 0.48, -0.36);
  Q(ctx, 0.2, -0.3, -0.2, -0.38);
  L(ctx, -0.62, -0.32);
  L(ctx, -0.66, -0.44);
  L(ctx, -0.6, -0.5);
  L(ctx, -0.2, -0.52);
  Q(ctx, 0.2, -0.6, 0.5, -0.5);
  ctx.closePath();
}

/** One wing from the shoulder, raised (lift 1) or lowered (-1), five ragged fingers at its tip. */
function wing(ctx: Ctx, lift: number, ox: number): void {
  const l = Math.max(-1, Math.min(1, lift));
  const up = -0.98 * l;
  M(ctx, 0.16 + ox, -0.5);
  Q(ctx, 0.12 + ox, -0.5 + up * 0.5, -0.04 + ox, -0.5 + up);
  for (let i = 0; i < 5; i++) {
    const f = i / 4;
    const x = -0.04 - f * 0.34 + ox;
    const y = -0.5 + up * (1 - f * 0.28);
    L(ctx, x, y);
    L(ctx, x - 0.04, y - up * 0.14 + 0.02);
  }
  L(ctx, -0.42 + ox, -0.5 + up * 0.45);
  L(ctx, -0.28 + ox, -0.46);
  ctx.closePath();
}

/** The raven at (x, y) (its feet), `size` px, facing `dir`, in pose `p`. */
export function raven(ctx: Ctx, x: number, y: number, size: number, dir: -1 | 1, p: Readonly<RavenPose>, lw: number): void {
  if (p.vis <= 0.01) return;
  const rim = Math.max(0.4, Math.min(lw * 0.6, size * 0.035));
  const thin = Math.max(0.7, lw * 0.5);
  if (p.vis < 1) ctx.globalAlpha = p.vis;
  if (p.flying && p.k !== 1) {
    pen(x, y, size, dir, -0.08);
    ctx.beginPath();
    wing(ctx, p.lift * 0.85, 0.1);
    ctx.fillStyle = NIGHT;
    ctx.fill();
    P.ox = -rim;
    P.oy = -rim;
    ctx.beginPath();
    flyingBody(ctx);
    C(ctx, 0.48, -0.48, 0.13);
    ctx.fillStyle = RIM_SOFT;
    ctx.fill();
    P.ox = 0;
    P.oy = 0;
    ctx.beginPath();
    flyingBody(ctx);
    C(ctx, 0.48, -0.48, 0.13);
    wing(ctx, p.lift, 0);
    ctx.fillStyle = NIGHT;
    ctx.fill();
    // Beak and eye
    ctx.beginPath();
    M(ctx, 0.58, -0.53);
    Q(ctx, 0.74, -0.53, 0.82, -0.45);
    Q(ctx, 0.72, -0.47, 0.58, -0.44);
    ctx.closePath();
    ctx.fillStyle = SHEEN;
    ctx.fill();
    ctx.beginPath();
    C(ctx, 0.52, -0.51, 0.035);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const hop = clamp01(p.hop);
  pen(x, y - hop * size * 0.16, size, dir);
  const lean = p.caw * 0.14;
  const hx = 0.2 + lean;
  const hy = -0.74 + lean * 0.6 + p.preen * 0.06;
  // Legs and toes
  ctx.beginPath();
  M(ctx, -0.05, -0.28);
  L(ctx, -0.04, hop * 0.12);
  M(ctx, 0.07, -0.28);
  L(ctx, 0.08, hop * 0.12);
  M(ctx, -0.14, hop * 0.12);
  L(ctx, 0.22, hop * 0.12);
  stroke(ctx, INK, thin);
  // Wedge tail
  ctx.beginPath();
  M(ctx, -0.18, -0.42);
  L(ctx, -0.56, -0.12);
  L(ctx, -0.52, -0.04);
  L(ctx, -0.4, -0.06);
  L(ctx, -0.06, -0.3);
  ctx.closePath();
  ctx.fillStyle = NIGHT;
  ctx.fill();
  // Body and head, moonlit; when it preens the head turns back into its wing
  const phx = hx - p.preen * 0.36;
  const phy = hy + p.preen * 0.12;
  P.ox = -rim;
  P.oy = -rim;
  ctx.beginPath();
  perchedBody(ctx);
  head(ctx, phx, phy);
  ctx.fillStyle = RIM_SOFT;
  ctx.fill();
  P.ox = 0;
  P.oy = 0;
  ctx.beginPath();
  perchedBody(ctx);
  head(ctx, phx, phy);
  // Wings half open when it flaps on the pot
  if (Math.abs(p.lift) > 0.05) wing(ctx, 0.3 + p.lift * 0.5, 0.0);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  // The folded wing's sheen
  ctx.beginPath();
  M(ctx, 0.12, -0.6);
  Q(ctx, -0.1, -0.6, -0.3, -0.34);
  stroke(ctx, SHEEN, thin);
  // The thick curved beak (pointing back into the wing when it preens), gaping when it caws
  const bd = p.preen > 0.5 ? -1 : 1;
  const bx = phx + bd * 0.13;
  const gape = p.caw * 0.1;
  ctx.beginPath();
  M(ctx, bx - bd * 0.02, phy - 0.08);
  Q(ctx, bx + bd * 0.18, phy - 0.1, bx + bd * 0.3, phy + 0.02 - gape * 0.4);
  Q(ctx, bx + bd * 0.16, phy - 0.01, bx, phy + 0.02);
  ctx.closePath();
  M(ctx, bx, phy + 0.02);
  Q(ctx, bx + bd * 0.12, phy + 0.03 + gape * 0.6, bx + bd * 0.22, phy + 0.06 + gape);
  L(ctx, bx - bd * 0.01, phy + 0.08);
  ctx.closePath();
  ctx.fillStyle = SHEEN;
  ctx.fill();
  if (p.preen < 0.5) {
    ctx.beginPath();
    C(ctx, phx + 0.06, phy - 0.04, 0.055);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.beginPath();
    C(ctx, phx + 0.07, phy - 0.035, 0.022);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Scratch box of `ravenBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box the raven covers in pose `p` at (x, y) (its feet). */
export function ravenBox(x: number, y: number, size: number, dir: -1 | 1, p: Readonly<RavenPose>): Readonly<typeof BOX> {
  const flying = p.flying && p.k !== 1;
  const back = (flying ? 0.72 : 0.62) * size;
  const front = (flying ? 0.86 : 0.78) * size;
  BOX.x0 = x - (dir > 0 ? back : front) - 1;
  BOX.x1 = x + (dir > 0 ? front : back) + 1;
  BOX.y0 = y - (flying ? 1.52 : 1.48) * size - 1;
  BOX.y1 = y + (flying ? 0.56 : 0.06) * size + 1;
  return BOX;
}

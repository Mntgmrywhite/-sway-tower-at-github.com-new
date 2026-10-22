import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BARRICADE, CURB, GOLD, GREEN, INK, IRON, JESTER_MOUTH, LADDER, LIDS, PAPIER, PURPLE, ROUGE, THREE, WHITE } from "./colors";
import { jumper, jumperReach, ladderRiders, reachAt, seatReach } from "./crowd";
import { flagstones, friezeBand } from "./band";
import { beadSeller, curbLady } from "./onlookers";
import { curbTop, inkW } from "./place";
import { beadLoop, block } from "./shapes";
import { beadsOn, crown, RAILS } from "./trim";

export { curbTop, jumperReach, reachAt, seatReach };

// The near curb we look over, framing the play space: a pale stone curb along the top of the
// base band, confetti, dropped doubloons and bead strings on it, low purple barricades with gold
// rails either side and their pennants fluttering; at the left a piece of a float parked at the
// corner, a giant papier-mâché jester's head on its wheeled stand, bobbing on its springs with
// its bells swinging; at the right the parade ladder with its seat box, and past it a bead
// vendor's tree, a pole with arms hung with strings of beads that swing, a gold crown on top. The
// folk on the curb stand among them (crowd.ts: the ladder's two kids, the kid jumping at the left,
// in front of the masked lady dancing beside her; onlookers.ts: the lady, the bead seller). Under the curb
// the harlequin frieze (band.ts) runs over the base band's lip. It all drops away faster than the
// tower as the camera climbs (parallax 1.6, like the band), so it only frames the start. The
// middle stays clear: render.ts writes "tap to drop" there at the start (at 0.9 of the screen
// height).

/** The curb's height (u). */
const CURB_H = 0.032;
/** Half the clear gap in the middle (u; "tap to drop" is about 0.29 u wide). */
export const GAP = 0.2;
/** The ladder: its center (u from center), its height above the curb, the seat box's width and height. */
const LADDER_X = 0.36;
const LADDER_H = 0.2;
const SEAT_W = 0.1;
const SEAT_H = 0.05;
/** The jester's head on its stand at the left: its center (u from center) and its head's radius (u). */
export const JESTER_X = -0.415;
const JESTER_R = 0.046;
/**
 * The bead vendor's tree at the right: its pole (u from center), its height above the curb (u)
 * and its arms' reach either side (the top pair's, and how much further each pair down reaches).
 * Its widest strings keep in from a phone's right edge (half the screen is 0.5 u there) and
 * clear of the ladder's right leg (0.405 u at the curb).
 */
export const TREE_X = 0.452;
const TREE_H = 0.27;
const ARM = 0.022;
const ARM_STEP = 0.005;

/** The top of the front's tallest thing (the ladder's seat, the bead tree), the highest thing in front. */
export function frontTop(s: Scene): number {
  return curbTop(s) - s.u * (TREE_H + 0.06);
}

/** The curb: a lit top edge, the stone, confetti, dropped beads and doubloons on it. */
function curb(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  ctx.fillStyle = CURB.body;
  ctx.fillRect(0, top, s.cssW, CURB_H * u);
  ctx.fillStyle = CURB.light;
  ctx.fillRect(0, top, s.cssW, u * 0.006);
  ctx.fillStyle = CURB.shade;
  ctx.fillRect(0, top + CURB_H * u - u * 0.006, s.cssW, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(s.cssW, top);
  ctx.moveTo(0, top + CURB_H * u);
  ctx.lineTo(s.cssW, top + CURB_H * u);
  ink(ctx, lw, INK);
  // Confetti on the curb, in the three colors, out of the middle.
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.body;
    ctx.beginPath();
    for (let i = c; i < 36; i += 3) {
      const X = ((i * 0.618) % 1) - 0.5;
      if (Math.abs(X * s.cssW) < GAP * u) continue;
      const y = top + u * (0.008 + ((i * 0.377) % 1) * 0.016);
      ctx.rect(s.cssW / 2 + X * s.cssW - u * 0.004, y, u * 0.008, u * 0.004);
    }
    ctx.fill();
  }
  // A dropped string of beads and two doubloons either side of the gap.
  ctx.beginPath();
  beadLoop(ctx, s.cssW / 2 - (GAP + 0.07) * u, top + u * 0.006, u * 0.02, u * 0.012, u * 0.0035, 9);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, s.cssW / 2 + (GAP + 0.03) * u, top + u * 0.02, u * 0.007);
  circle(ctx, s.cssW / 2 - (GAP + 0.025) * u, top + u * 0.022, u * 0.006);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

/** A low barricade standing on the curb from x0 to x1: purple, a gold top rail, a lattice, and two little pennants fluttering on it. */
function barricade(ctx: Ctx, s: Scene, x0: number, x1: number, top: number, lw: number, phase: number): void {
  const u = s.u;
  const h = u * 0.05;
  ctx.beginPath();
  ctx.rect(x0, top - h * 0.5, x1 - x0, u * 0.004);
  ctx.rect(x0 + u * 0.004, top - h, u * 0.006, h);
  ctx.rect(x1 - u * 0.01, top - h, u * 0.006, h);
  const step = u * 0.018;
  for (let x = x0 + u * 0.02; x < x1 - u * 0.015; x += step) ctx.rect(x, top - h, u * 0.003, h);
  ctx.fillStyle = BARRICADE.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  block(ctx, x0, top - h - u * 0.003, x1 - x0, u * 0.008, u * 0.003);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(x0 + u * 0.01, top - h - u * 0.002, x1 - x0 - u * 0.02, u * 0.002);
  // Pennants hung from the top rail, fluttering: outlined together, then each in its color.
  const pennant = (i: number) => {
    const px = x0 + (x1 - x0) * (0.3 + i * 0.4);
    const flap = Math.sin(s.t * 3.1 + phase + i * 1.9) * u * 0.004;
    ctx.moveTo(px - u * 0.012, top - h + u * 0.005);
    ctx.lineTo(px + u * 0.012, top - h + u * 0.005);
    ctx.lineTo(px + flap, top - h + u * 0.032);
    ctx.closePath();
  };
  ctx.beginPath();
  pennant(0);
  pennant(1);
  ink(ctx, lw, INK);
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    pennant(i);
    ctx.fillStyle = THREE[(i + Math.round(phase)) % 3]!.body;
    ctx.fill();
  }
}

/** The ladder's center (u from the screen's center) and its seat box's top on screen, where its two kids sit (for tests). */
export const LADDER_AT = LADDER_X;
export function ladderTop(s: Scene): number {
  return curbTop(s) + s.u * 0.004 - LADDER_H * s.u - SEAT_H * s.u;
}

/** The parade ladder: a stepladder with a seat box bolted on top, its two riders on it (crowd.ts). */
export function ladder(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const x = s.cssW / 2 + LADDER_X * u;
  const h = LADDER_H * u;
  const foot = top + u * 0.004;
  // Legs splayed, rungs between, the seat box on top.
  ctx.beginPath();
  ctx.moveTo(x - u * 0.045, foot);
  ctx.lineTo(x - u * 0.028, foot - h);
  ctx.lineTo(x - u * 0.016, foot - h);
  ctx.lineTo(x - u * 0.031, foot);
  ctx.closePath();
  ctx.moveTo(x + u * 0.045, foot);
  ctx.lineTo(x + u * 0.028, foot - h);
  ctx.lineTo(x + u * 0.016, foot - h);
  ctx.lineTo(x + u * 0.031, foot);
  ctx.closePath();
  for (let i = 1; i < 5; i++) {
    const y = foot - (h * i) / 5;
    const hw = u * (0.045 - (0.017 * i) / 5);
    ctx.rect(x - hw + u * 0.004, y - u * 0.004, hw * 2 - u * 0.008, u * 0.008);
  }
  ctx.fillStyle = LADDER.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // The lit edge down the left leg, slanting with it (inside its outline, from foot to top).
  ctx.fillStyle = LADDER.light;
  ctx.beginPath();
  ctx.moveTo(x - u * (0.042 - 0.017 * 0.05), foot - h * 0.05);
  ctx.lineTo(x - u * (0.042 - 0.017 * 0.95), foot - h * 0.95);
  ctx.lineTo(x - u * (0.038 - 0.017 * 0.95), foot - h * 0.95);
  ctx.lineTo(x - u * (0.038 - 0.017 * 0.05), foot - h * 0.05);
  ctx.closePath();
  ctx.fill();
  const sw = SEAT_W * u;
  const sh = SEAT_H * u;
  const seat = foot - h;
  ladderRiders(ctx, s, x, seat, sh, lw);
  ctx.beginPath();
  block(ctx, x - sw / 2, seat - sh, sw, sh, u * 0.004);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.fillRect(x - sw / 2 + lw, seat - sh + lw, sw - lw * 2, u * 0.008);
  // Gold stars painted on the box, and a string of beads already caught, hung on its corner.
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  for (const dx of [-0.026, 0, 0.026]) circle(ctx, x + dx * u, seat - sh * 0.4, u * 0.005);
  ctx.fill();
  ctx.beginPath();
  beadLoop(ctx, x + sw / 2 - u * 0.012, seat - sh + u * 0.004, u * 0.008, u * 0.022, u * 0.003, 7);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
}

/** How far the jester's head bobs on its springs at time t (u), and how far its bells swing (radians). */
function jesterBob(t: number): number {
  return Math.sin(t * 2.2) * 0.006 + Math.sin(t * 3.7 + 1) * 0.002;
}

/**
 * A piece of a float parked at the corner: a giant papier-mâché jester's head on a little wheeled
 * stand, its painted face grinning under a three-pointed cap (purple, green and gold) with gold
 * bells, a ruff round its neck; it bobs on its springs and its bells swing.
 */
function jesterHead(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const x = s.cssW / 2 + JESTER_X * u;
  const r = JESTER_R * u;
  // The stand: a gold-trimmed purple box on two wheels.
  const sy = top - u * 0.01;
  ctx.beginPath();
  circle(ctx, x - u * 0.04, top - u * 0.006, u * 0.012);
  circle(ctx, x + u * 0.04, top - u * 0.006, u * 0.012);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  block(ctx, x - u * 0.062, sy - u * 0.04, u * 0.124, u * 0.034, u * 0.006);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.rect(x - u * 0.062, sy - u * 0.04, u * 0.124, u * 0.006);
  for (let i = 0; i < 5; i++) circle(ctx, x - u * 0.044 + i * u * 0.022, sy - u * 0.02, u * 0.004);
  ctx.fill();
  // The spring, and the head bobbing on it.
  const bob = jesterBob(s.t) * u;
  const neck = sy - u * 0.04;
  const hy = neck - r * 1.25 + bob;
  ctx.strokeStyle = IRON.light;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const y = neck - (i / 6) * (neck - (hy + r * 0.9));
    ctx.lineTo(x + (i % 2 ? 1 : -1) * u * 0.01, y);
  }
  ctx.stroke();
  // The ruff: scallops in purple and gold.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      if (i % 2 !== pass) continue;
      const a = Math.PI * (0.15 + (i / 6) * 0.7);
      circle(ctx, x - Math.cos(a) * r * 1.0, hy + r * 0.95 + Math.sin(a) * r * 0.12, r * 0.3);
    }
    ctx.fillStyle = pass ? GOLD.body : PURPLE.light;
    ctx.fill();
    ink(ctx, lw * 0.5, INK);
  }
  // The cap's three points, then the face over them.
  const bell = Math.sin(s.t * 3 + 0.4) * 0.12;
  const tips = [
    [-r * 1.55, hy - r * 0.4 + r * 0.25 * bell],
    [r * 0.1, hy - r * 2.05],
    [r * 1.55, hy - r * 0.45 - r * 0.25 * bell],
  ] as const;
  const roots = [-0.85, 0, 0.85];
  for (let i = 0; i < 3; i++) {
    const [tx, ty] = tips[i]!;
    const bx = x + roots[i]! * r * 0.7;
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.45, hy - r * 0.55);
    ctx.quadraticCurveTo(bx - r * 0.2 + (tx > 0 ? r * 0.2 : -r * 0.4), hy - r * 1.6, x + tx, ty);
    ctx.quadraticCurveTo(bx + r * 0.3, hy - r * 1.1, bx + r * 0.45, hy - r * 0.55);
    ctx.closePath();
    ctx.fillStyle = THREE[i === 1 ? 2 : i === 0 ? 0 : 1]!.body;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
  }
  ctx.beginPath();
  for (const [tx, ty] of tips) circle(ctx, x + tx, ty, r * 0.17);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  // The band of the cap, and the face: a painted cream oval, rosy cheeks, blue-lidded eyes, a wide grin.
  ctx.beginPath();
  block(ctx, x - r * 0.95, hy - r * 0.72, r * 1.9, r * 0.3, r * 0.12);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  oval(ctx, x, hy + r * 0.12, r * 0.86, r * 0.82);
  ctx.fillStyle = PAPIER.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = PAPIER.light;
  ctx.beginPath();
  oval(ctx, x - r * 0.32, hy - r * 0.15, r * 0.28, r * 0.2, -0.4);
  ctx.fill();
  ctx.fillStyle = ROUGE;
  ctx.beginPath();
  circle(ctx, x - r * 0.48, hy + r * 0.3, r * 0.15);
  circle(ctx, x + r * 0.48, hy + r * 0.3, r * 0.15);
  ctx.fill();
  ctx.fillStyle = LIDS.blue;
  ctx.beginPath();
  oval(ctx, x - r * 0.3, hy - r * 0.05, r * 0.17, r * 0.11);
  oval(ctx, x + r * 0.3, hy - r * 0.05, r * 0.17, r * 0.11);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x - r * 0.28, hy + r * 0.0, r * 0.07);
  circle(ctx, x + r * 0.32, hy + r * 0.0, r * 0.07);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, hy + r * 0.38);
  ctx.quadraticCurveTo(x, hy + r * 0.95, x + r * 0.45, hy + r * 0.38);
  ctx.quadraticCurveTo(x, hy + r * 0.55, x - r * 0.45, hy + r * 0.38);
  ctx.closePath();
  ctx.fillStyle = JESTER_MOUTH;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.36, hy + r * 0.44);
  ctx.quadraticCurveTo(x, hy + r * 0.62, x + r * 0.36, hy + r * 0.44);
  ctx.quadraticCurveTo(x, hy + r * 0.54, x - r * 0.36, hy + r * 0.44);
  ctx.closePath();
  ctx.fill();
}

/**
 * The bead vendor's tree: a pole on a weighted foot with three pairs of arms, every arm hung with
 * strings of beads in the three colors that swing, and a papier-mâché crown on top.
 */
function beadTree(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const x = s.cssW / 2 + TREE_X * u;
  const h = TREE_H * u;
  ctx.beginPath();
  ctx.rect(x - u * 0.004, top - h, u * 0.008, h);
  ctx.rect(x - u * 0.018, top - u * 0.012, u * 0.036, u * 0.012);
  for (let i = 0; i < 3; i++) {
    const y = top - h + u * (0.035 + i * 0.07);
    const reach = u * (ARM + i * ARM_STEP);
    ctx.rect(x - reach, y, reach * 2, u * 0.005);
  }
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // The strings: a loop from each arm's end, swinging on its own.
  let n = 0;
  for (let i = 0; i < 3; i++) {
    const y = top - h + u * (0.035 + i * 0.07);
    const reach = u * (ARM + i * ARM_STEP);
    for (const m of [-1, 1]) {
      const r = RAILS[n++]!;
      const bx = x + m * reach * 0.75;
      r.x0 = bx - u * 0.015;
      r.x1 = bx + u * 0.015;
      r.y = y + u * 0.004;
      r.first = i + (m > 0 ? 1 : 0);
    }
  }
  beadsOn(ctx, u, RAILS, n, lw, s.t * 1.2, 0.045, 0.03);
  crown(ctx, x, top - h + u * 0.002, u * 0.036, lw, 0);
}

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const top = curbTop(s);
  if (frontTop(s) > s.cssH) return;
  flagstones(ctx, s);
  friezeBand(ctx, s);
  curb(ctx, s, top, lw);
  const cx = s.cssW / 2;
  // Barricades either side of the clear middle, a little in from the screen's edges.
  barricade(ctx, s, u * 0.025, cx - GAP * u - u * 0.02, top, lw, 0);
  barricade(ctx, s, cx + GAP * u + u * 0.02, s.cssW - u * 0.025, top, lw, 1);
  jesterHead(ctx, s, top, lw);
  // The kid stands in front of the grown-up beside her (the curb is narrow there), so all of her
  // jump and her catch shows.
  curbLady(ctx, s, top, lw);
  jumper(ctx, s, top, lw);
  ladder(ctx, s, top, lw);
  beadSeller(ctx, s, top, lw);
  beadTree(ctx, s, top, lw);
}

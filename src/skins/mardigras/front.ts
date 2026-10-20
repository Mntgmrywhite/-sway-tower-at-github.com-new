import { circle, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BARRICADE, CURB, GOLD, GREEN, HAIRS, INK, LADDER, PURPLE, SHIRTS, SKINS } from "./colors";
import { figure, standing, type Figure } from "./folk";
import { LOWER, THROW_COUNT, throwAt, throwSeat } from "./parade";
import { curbTop, inkW } from "./place";
import { beadLoop, block } from "./shapes";

export { curbTop };

// The near curb we look over: a pale stone curb along the top of the base band (the flagstones
// of the sidewalk), confetti and a few dropped bead strings on it, a low steel barricade either
// side, and at the right a parade ladder with a seat box on top where two kids sit, reaching
// up for throws (and a kid in a jester's hat jumping at the left). It covers the base band's
// lip and drops away faster than the tower as the camera climbs (parallax 1.6, like the band),
// so it only frames the start. The middle stays clear: render.ts writes "tap to drop" there at
// the start (at 0.9 of the screen height).

/** The curb's height (u). */
const CURB_H = 0.032;
/** Half the clear gap in the middle (u; "tap to drop" is about 0.29 u wide). */
export const GAP = 0.2;
/** The ladder: its center (u from center), its height above the curb, the seat box's width and height. */
const LADDER_X = 0.36;
const LADDER_H = 0.2;
const SEAT_W = 0.1;
const SEAT_H = 0.05;
/** The kid at the left: where she stands. */
const KID_X = -0.36;

/** The top of the ladder's seat, the highest thing in front (its riders sit on it). */
function frontTop(s: Scene): number {
  return curbTop(s) - s.u * (LADDER_H + 0.14);
}

const RIDERS: Figure[] = [
  standing(SHIRTS[1]!, PURPLE, SKINS[0]!, HAIRS[1]!),
  standing(SHIRTS[4]!, GOLD, SKINS[2]!, HAIRS[0]!),
].map((f, i) => {
  f.size = 0.5;
  f.hat = i ? "none" : "cap";
  f.hatColor = GREEN;
  return f;
});
const JUMPER: Figure = standing(SHIRTS[2]!, GREEN, SKINS[1]!, HAIRS[4]!);
JUMPER.size = 0.52;
JUMPER.hat = "jester";
JUMPER.hatColor = PURPLE;

/** Whether the kids reach up at time t (0 at ease, 1 arms up), on their own rhythm. */
export function reachAt(t: number): number {
  const k = ((t % 6) + 6) % 6;
  const up = k < 0.5 ? k / 0.5 : k < 2.2 ? 1 : k < 2.7 ? 1 - (k - 2.2) / 0.5 : 0;
  return up * up * (3 - 2 * up);
}

function smoothstep(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** Whether ladder kid `seat` reaches up at time t: on their rhythm, and whenever the float's beads are on their way to them. */
export function seatReach(t: number, seat: number): number {
  let r = reachAt(t);
  for (let i = 0; i < THROW_COUNT; i++) {
    if (throwSeat(i) !== seat) continue;
    const th = throwAt(t, i);
    if (th.wind >= 0) r = Math.max(r, th.wind);
    else if (th.flight >= 0) r = 1;
    else if (th.landed >= 0) r = Math.max(r, 1 - smoothstep(th.landed / LOWER));
  }
  return r;
}

/** The curb: a lit top edge, the stone, confetti and dropped beads on it. */
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
  const colors = [PURPLE.body, GREEN.body, GOLD.body];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = c; i < 30; i += 3) {
      const X = ((i * 0.618) % 1) - 0.5;
      if (Math.abs(X) < GAP) continue;
      const y = top + u * (0.008 + ((i * 0.377) % 1) * 0.016);
      ctx.rect(s.cssW / 2 + X * s.cssW - u * 0.004, y, u * 0.008, u * 0.004);
    }
    ctx.fill();
  }
}

/** A low steel barricade: two feet, a top bar and a lattice, standing on the curb from x0 to x1. */
function barricade(ctx: Ctx, s: Scene, x0: number, x1: number, top: number, lw: number): void {
  const u = s.u;
  const h = u * 0.05;
  ctx.beginPath();
  ctx.rect(x0, top - h, x1 - x0, u * 0.006);
  ctx.rect(x0, top - h * 0.5, x1 - x0, u * 0.004);
  ctx.rect(x0 + u * 0.004, top - h, u * 0.006, h);
  ctx.rect(x1 - u * 0.01, top - h, u * 0.006, h);
  const step = u * 0.02;
  for (let x = x0 + u * 0.02; x < x1 - u * 0.015; x += step) ctx.rect(x, top - h, u * 0.003, h);
  ctx.fillStyle = BARRICADE.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = BARRICADE.light;
  ctx.fillRect(x0 + u * 0.01, top - h + u * 0.001, x1 - x0 - u * 0.02, u * 0.002);
}

/** The parade ladder: a stepladder with a seat box bolted on top, its two riders on it. */
function ladder(ctx: Ctx, s: Scene, top: number, lw: number): void {
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
  ctx.fillStyle = LADDER.light;
  ctx.fillRect(x - u * 0.036, foot - h * 0.95, u * 0.004, h * 0.9);
  const sw = SEAT_W * u;
  const sh = SEAT_H * u;
  const seat = foot - h;
  // The riders sit on the box: drawn before its front rail, so their legs hang behind it.
  for (let i = 0; i < RIDERS.length; i++) {
    const f = RIDERS[i]!;
    const reach = seatReach(s.t, i);
    const rx = x + (i ? u * 0.024 : -u * 0.024);
    f.m = i ? -1 : 1;
    f.footL = -0.012;
    f.footR = 0.012;
    f.raiseL = 0;
    f.raiseR = 0;
    const wave = Math.sin(s.t * 4 + i * 2);
    f.handLx = -0.03 + reach * 0.012;
    f.handLy = -0.09 - reach * 0.09 + (1 - reach) * wave * 0.006;
    f.handRx = 0.03 - reach * 0.012;
    f.handRy = -0.09 - reach * 0.09 - (1 - reach) * wave * 0.006;
    f.mouth = reach * 0.8;
    f.lift = 0.03;
    figure(ctx, f, rx, seat - sh * 0.3, u, lw);
  }
  ctx.beginPath();
  block(ctx, x - sw / 2, seat - sh, sw, sh, u * 0.004);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.fillRect(x - sw / 2 + lw, seat - sh + lw, sw - lw * 2, u * 0.008);
  // A string of beads already caught, hung on the box's corner.
  ctx.beginPath();
  beadLoop(ctx, x + sw / 2 - u * 0.012, seat - sh + u * 0.004, u * 0.008, u * 0.022, u * 0.003, 7);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
}

/** A kid in a jester's hat at the left of the curb, jumping with her arms up for the throws. */
function jumper(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const f = JUMPER;
  const reach = reachAt(s.t + 2.5);
  const hop = reach * Math.max(0, Math.sin(s.t * 8)) * 0.02;
  f.m = 1;
  f.lift = hop;
  f.handLx = -0.03 + reach * 0.01;
  f.handLy = -0.07 - reach * 0.11;
  f.handRx = 0.03 - reach * 0.01;
  f.handRy = -0.07 - reach * 0.11;
  f.mouth = reach * 0.9;
  figure(ctx, f, s.cssW / 2 + KID_X * u, top + u * 0.004, u, lw);
}

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const top = curbTop(s);
  if (frontTop(s) > s.cssH) return;
  curb(ctx, s, top, lw);
  const cx = s.cssW / 2;
  // Barricades either side of the clear middle, a little in from the screen's edges.
  barricade(ctx, s, u * 0.025, cx - GAP * u - u * 0.02, top, lw);
  barricade(ctx, s, cx + GAP * u + u * 0.02, s.cssW - u * 0.025, top, lw);
  jumper(ctx, s, top, lw);
  ladder(ctx, s, top, lw);
  // A dropped doubloon on the curb, right of the gap.
  ctx.beginPath();
  circle(ctx, cx + (GAP + 0.03) * u, top + u * 0.02, u * 0.007);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

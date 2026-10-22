import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { BASKET, EAGLE, EAGLE_BEAK, EAGLE_WHITE, PLANE, PLANE_WING } from "./colors";
import { birdStroke, dot, starPath } from "./shapes";
import { LOOP, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: the Fourth's air
// show over a small town. A few swifts over the park, a bunch of party balloons let go at the
// start and a bald eagle circling high over the town; then a great hot-air balloon printed with
// the flag (a blue crown of stars over red and cream gores), a parachutist floating down under
// a starred red and cream canopy, a stars-and-stripes kite, a yellow
// barnstormer towing a 4TH banner, a stunt biplane looping the loop in a ring of red, cream and
// blue smoke, a blimp with the flag's stripes down its side and its gondola lit at dusk, and
// the show's smoke drifting off through the night. Each thing is anchored at a height in the
// lane, so it comes down past you as the camera climbs, and it only ever moves in place (the
// stunt plane round its own loop): nothing crosses the tower's column. Things are spaced so
// they never overlap. Mid-distance, so flat poster inks and no keyline. When the story loops
// (tone.ts), the lane comes round with it: the same things, a loop higher.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the cloud floor, the crescent moon comes out in the same place at night, and the
// sun rises there again at the loop's dawn. One of them is up at every height, and a lane
// comes down every height of the screen, so nothing drifts on the left at all: no balloon,
// bird or puff ever slides across the sun or the moon (the owner's rule, drift.test.ts).

export type Kind = "birds" | "balloons" | "eagle" | "hotair" | "jumper" | "kite" | "biplane" | "stunt" | "blimp" | "smoke";

export interface Drifter {
  kind: Kind;
  /** Height in the lane, world units. */
  at: number;
  /** Center, in u from the screen center (positive: right of it). */
  x: number;
  phase: number;
}

/** Parallax depth of the lane (1 moves with the tower). */
export const LANE_P = 0.7;

/** One authored entry: what, its height in the lane (world units), and its center (u from the screen center). */
type Spec = readonly [kind: Kind, at: number, x: number];

// The day's story, by hand. A thing at height `at` comes in at the top of the screen around
// level (at - 230) / 8 and leaves at the bottom around level (at + 235) / 8 (on a tall phone).
// The swifts, the balloons and the eagle are on screen at the start, over the park right of the
// courthouse (its body reaches 0.385 u right of center) and clear of its flag, the eagle low
// enough to stay below the HUD's rows on a short phone; the hot-air balloon starts just above
// the screen; everything else comes down to the horizon only once the land is covered. The
// courthouse's clock tower, dome and flag stand out of the cloud sea at every height after that
// (far.ts), reaching to 0.37 u right of center (the flag flies toward the column): every lane
// thing, sway included, keeps right of that, so none ever passes over them (drift.test.ts). On a
// phone that leaves the lane 0.375..0.495 u.
const DAY: Spec[] = [
  ["birds", 92, 0.444],
  ["hotair", 128, 0.441],
  ["eagle", 166, 0.441],
  ["balloons", 365, 0.442],
  ["jumper", 432, 0.438],
  ["kite", 498, 0.44],
  ["biplane", 562, 0.458],
  ["stunt", 632, 0.435],
  ["blimp", 722, 0.436],
  ["smoke", 812, 0.42],
  ["smoke", 892, 0.415],
];

/** Story heights repeat with the loop: every turn shows the day's things PERIOD higher. */
const PERIOD = LOOP * BLOCK_HEIGHT;

/** The day's lane, running up from its lowest item. */
const FIRST: readonly Drifter[] = DAY.map(([kind, at, x], k) => ({ kind, at, x, phase: hash(k * 17 + 8000) * 10 }));

/** Scratch copies of the loop's things placed in a turn, reused every call (a frame shows a handful). */
const POOL: Drifter[] = Array.from({ length: 32 }, () => ({ ...FIRST[0]! }));

/** Calls `draw` for every item on screen (or close to it), lowest first. */
export function eachVisible(s: Scene, draw: (d: Drifter) => void): void {
  const margin = s.u * 0.3;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  // The heights in view: an item at height `at` is at screen y = base - at * unit.
  const lo = (base - s.cssH - margin) / unit;
  const hi = (base + margin) / unit;
  let pooled = 0;
  for (let n = Math.max(0, Math.floor(lo / PERIOD)); n * PERIOD + FIRST[0]!.at <= hi; n++) {
    const off = PERIOD * n;
    for (const d of FIRST) {
      const at = d.at + off;
      if (at < lo) continue;
      if (at > hi) break;
      const p = POOL[pooled++ % POOL.length]!;
      Object.assign(p, d);
      p.at = at;
      draw(p);
    }
  }
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.005;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  if (d.kind === "balloons") balloons(ctx, s, tone, x, y + bob);
  else if (d.kind === "birds") birds(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "eagle") eagle(ctx, s, x, y, d.phase);
  else if (d.kind === "hotair") hotAir(ctx, s, tone, x, y + bob);
  else if (d.kind === "jumper") jumper(ctx, s, tone, x, y + bob, d.phase);
  else if (d.kind === "biplane") biplane(ctx, s, tone, x, y + bob);
  else if (d.kind === "stunt") stunt(ctx, s, tone, s.cssW / 2 + d.x * u, y, d.phase);
  else if (d.kind === "blimp") blimp(ctx, s, tone, x, y + bob * 0.6);
  else if (d.kind === "kite") kite(ctx, s, tone, x, y + bob);
  else smoke(ctx, s, tone, x, y + bob * 0.4, d.phase);
}

/** Scratch arguments for `drawOne`, so the per-frame loop allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, tone: null as Tone | null };
function drawOne(d: Drifter): void {
  drawDrifter(NOW.ctx!, NOW.s!, NOW.tone!, d);
}

export function drifters(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.tone = tone;
  eachVisible(s, drawOne);
}

// ---------------------------------------------------------------- party balloons

/** A bunch of three flat balloons, red, cream and blue, on strings tied to a knot below them, each with a lit spot. */
function balloons(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const r = u * 0.021;
  const knotY = y + r * 2.6;
  const spots = [
    [-r * 0.95, -r * 0.5, tone.red],
    [r * 0.95, -r * 0.6, tone.blue],
    [0, r * 0.7, tone.white],
  ] as const;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0018);
  ctx.beginPath();
  for (const [dx, dy] of spots) {
    ctx.moveTo(x + dx, y + dy + r * 1.05);
    ctx.lineTo(x, knotY);
  }
  ctx.moveTo(x, knotY);
  ctx.quadraticCurveTo(x + r * 0.3, knotY + r * 0.6, x - r * 0.1 + Math.sin(s.t * 1.7) * r * 0.2, knotY + r * 1.3);
  ctx.stroke();
  for (const [dx, dy, c] of spots) {
    ctx.fillStyle = c;
    ctx.beginPath();
    oval(ctx, x + dx, y + dy, r * 0.82, r);
    ctx.moveTo(x + dx - r * 0.14, y + dy + r * 1.1);
    ctx.lineTo(x + dx + r * 0.14, y + dy + r * 1.1);
    ctx.lineTo(x + dx, y + dy + r * 0.92);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = tone.cloudLight;
  ctx.beginPath();
  for (const [dx, dy] of spots) oval(ctx, x + dx - r * 0.32, y + dy - r * 0.42, r * 0.18, r * 0.28, -0.4);
  ctx.fill();
}

// ---------------------------------------------------------------- birds and the eagle

/** Three swifts wheeling together over the park. */
const FLOCK = [
  [0, 0],
  [-0.026, 0.012],
  [0.024, 0.016],
] as const;

function birds(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < FLOCK.length; i++) {
    const [dx, dy] = FLOCK[i]!;
    const flap = Math.sin(s.t * 7 + phase + i * 1.9);
    birdStroke(ctx, x + dx * u + Math.sin(s.t * 0.5 + i) * u * 0.004, y + dy * u + Math.sin(s.t * 0.7 + i * 2) * u * 0.004, u * 0.011, flap);
  }
  ctx.stroke();
}

/** How long the eagle takes to go round once (s), and its wingspan's half (u). */
const CIRCLE = 11;
const EAGLE_SPAN = 0.04;

/**
 * A bald eagle soaring in a slow circle, printed as a poster's emblem: dark broad wings spread
 * wide with fingered tips and a lit band along their leading edge, tilted into the turn, a
 * white head and fanned white tail, a gold beak and talons. Faces the way it is going.
 */
function eagle(ctx: Ctx, s: Scene, x: number, y: number, phase: number): void {
  const u = s.u;
  const a = (s.t / CIRCLE) * Math.PI * 2 + phase;
  const ex = x + Math.cos(a) * u * 0.01;
  const ey = y + Math.sin(a) * u * 0.008;
  const dir = -Math.sin(a) < 0 ? -1 : 1;
  const bank = Math.cos(a) * 0.3;
  const span = u * EAGLE_SPAN;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.scale(dir, 1);
  ctx.rotate(bank * dir);
  // The white tail fanned behind, under the wings.
  ctx.fillStyle = EAGLE_WHITE;
  ctx.beginPath();
  ctx.moveTo(-span * 0.08, span * 0.1);
  ctx.lineTo(-span * 0.3, span * 0.3);
  ctx.lineTo(-span * 0.22, span * 0.36);
  ctx.lineTo(-span * 0.04, span * 0.36);
  ctx.lineTo(span * 0.06, span * 0.12);
  ctx.closePath();
  ctx.fill();
  // Wings: two long broad blades with fingered tips, a little dihedral, and the body under them.
  ctx.fillStyle = EAGLE.body;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(0, -span * 0.02);
    ctx.quadraticCurveTo(side * span * 0.5, -span * 0.2, side * span * 0.92, -span * 0.3);
    for (let f = 0; f < 4; f++) {
      ctx.lineTo(side * span * (1 - f * 0.04), -span * (0.24 - f * 0.08));
      ctx.lineTo(side * span * (0.86 - f * 0.03), -span * (0.2 - f * 0.08));
    }
    ctx.quadraticCurveTo(side * span * 0.42, span * 0.12, 0, span * 0.14);
    ctx.closePath();
  }
  oval(ctx, 0, span * 0.08, span * 0.15, span * 0.1);
  ctx.fill();
  // The lit band along each wing's leading edge.
  ctx.fillStyle = EAGLE.light;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(0, -span * 0.02);
    ctx.quadraticCurveTo(side * span * 0.5, -span * 0.2, side * span * 0.86, -span * 0.27);
    ctx.quadraticCurveTo(side * span * 0.5, -span * 0.1, 0, span * 0.05);
    ctx.closePath();
  }
  ctx.fill();
  // The white head, the gold beak and the talons tucked under.
  ctx.fillStyle = EAGLE_WHITE;
  ctx.beginPath();
  circle(ctx, span * 0.2, span * 0.0, span * 0.085);
  ctx.fill();
  ctx.fillStyle = EAGLE_BEAK;
  ctx.beginPath();
  ctx.moveTo(span * 0.26, -span * 0.03);
  ctx.lineTo(span * 0.36, span * 0.01);
  ctx.lineTo(span * 0.26, span * 0.05);
  ctx.closePath();
  circle(ctx, -span * 0.02, span * 0.2, span * 0.035);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the hot-air balloon

/** The envelope's half width down its height (0 crown .. 1 mouth), as a share of its widest. */
const ENVELOPE = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12;
  return t < 0.45 ? Math.sqrt(Math.max(0, 1 - ((0.45 - t) / 0.45) ** 2)) : 1 - 0.72 * ((t - 0.45) / 0.55) ** 1.5;
});
/** Its gores: the boundaries' places across it (sin of evenly spaced angles), and where the blue crown of stars ends. */
const GORES = Array.from({ length: 8 }, (_, j) => Math.sin(-Math.PI / 2 + (j * Math.PI) / 7));
const CROWN = 4;
/** The envelope's widest half width and its height (u), and the basket's drop below its mouth. */
const BALLOON_R = 0.048;
const BALLOON_H = 0.13;
const BASKET_DROP = 0.032;

/** One band of the envelope between gore boundaries k0 and k1 (shares of the half width), rows i0..i1 of ENVELOPE, as its own subpath. */
function gore(ctx: Ctx, x: number, top: number, R: number, H: number, k0: number, k1: number, i0: number, i1: number): void {
  for (let i = i0; i <= i1; i++) {
    const y = top + (H * i) / 12;
    if (i === i0) ctx.moveTo(x + k0 * R * ENVELOPE[i]!, y);
    else ctx.lineTo(x + k0 * R * ENVELOPE[i]!, y);
  }
  for (let i = i1; i >= i0; i--) ctx.lineTo(x + k1 * R * ENVELOPE[i]!, top + (H * i) / 12);
  ctx.closePath();
}

/** A great hot-air balloon printed with the flag: a blue crown with a ring of stars over red and cream gores, the ropes, the wicker basket. */
function hotAir(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const R = BALLOON_R * u;
  const H = BALLOON_H * u;
  const top = y - H * 0.6;
  const mouth = top + H;
  // Red gores, the last one in shade (the light is on the left); the cream gores between them, the last in shade too; the blue crown.
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, GORES[6]!, CROWN, 12);
  ctx.fill();
  ctx.fillStyle = tone.redShade;
  ctx.beginPath();
  gore(ctx, x, top, R, H, GORES[6]!, 1, CROWN, 12);
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  for (let j = 1; j < 4; j += 2) gore(ctx, x, top, R, H, GORES[j]!, GORES[j + 1]!, CROWN, 12);
  ctx.fill();
  ctx.fillStyle = tone.whiteShade;
  ctx.beginPath();
  gore(ctx, x, top, R, H, GORES[5]!, GORES[6]!, CROWN, 12);
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  gore(ctx, x, top, R, H, -1, GORES[5]!, 0, CROWN);
  ctx.fill();
  ctx.fillStyle = tone.blueShade;
  ctx.beginPath();
  gore(ctx, x, top, R, H, GORES[5]!, 1, 0, CROWN);
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  const sy = top + (H * CROWN) / 12 * 0.62;
  for (let j = 0; j < 5; j++) {
    const k = -0.7 + j * 0.35;
    starPath(ctx, x + k * R * 0.86, sy + Math.abs(k) * R * 0.12, R * 0.12);
  }
  ctx.fill();
  // The ropes and the basket.
  const bw = R * 0.42;
  const by = mouth + BASKET_DROP * u;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(0.8, u * 0.0016);
  ctx.beginPath();
  ctx.moveTo(x - R * ENVELOPE[12]!, mouth);
  ctx.lineTo(x - bw, by);
  ctx.moveTo(x + R * ENVELOPE[12]!, mouth);
  ctx.lineTo(x + bw, by);
  ctx.stroke();
  ctx.fillStyle = BASKET.body;
  ctx.fillRect(x - bw, by, bw * 2, u * 0.018);
  ctx.fillStyle = BASKET.shade;
  ctx.fillRect(x - bw, by + u * 0.012, bw * 2, u * 0.006);
  ctx.fillStyle = BASKET.light;
  ctx.fillRect(x - bw, by, bw * 2, u * 0.004);
}

// ---------------------------------------------------------------- the parachutist

/** The jumper's canopy: half its width and its depth (u), and the drop to the jumper below it. */
const CANOPY_R = 0.042;
const CANOPY_H = 0.03;
const JUMPER_DROP = 0.05;

/** An air show parachutist floating down under a round canopy of red and cream gores with a blue crown of stars, swinging a little on the lines. */
function jumper(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const R = CANOPY_R * u;
  const top = y - CANOPY_H * u;
  const swing = Math.sin(s.t * 1.1 + phase) * u * 0.006;
  const jx = x + swing;
  const jy = y + JUMPER_DROP * u;
  // The lines from the canopy's rim to the harness.
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(0.8, u * 0.0014);
  ctx.beginPath();
  for (const k of [-1, -0.5, 0.5, 1]) {
    ctx.moveTo(x + k * R * 0.96, y);
    ctx.lineTo(jx + k * u * 0.003, jy - u * 0.012);
  }
  ctx.stroke();
  // The canopy: a red dome, cream gores, a blue crown with white stars, scalloped along its rim.
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(x - R, y);
  ctx.quadraticCurveTo(x - R, top - CANOPY_H * u * 0.1, x, top);
  ctx.quadraticCurveTo(x + R, top - CANOPY_H * u * 0.1, x + R, y);
  for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(x + R - (i + 0.5) * (R / 3), y - u * 0.006, x + R - (i + 1) * (R / 3), y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  for (const k of [-0.62, 0.05]) {
    ctx.moveTo(x + k * R, y);
    ctx.quadraticCurveTo(x + k * R * 0.8, top + CANOPY_H * u * 0.25, x + (k + 0.1) * R * 0.3, top + CANOPY_H * u * 0.08);
    ctx.lineTo(x + (k + 0.35) * R * 0.3, top + CANOPY_H * u * 0.08);
    ctx.quadraticCurveTo(x + (k + 0.3) * R * 0.85, top + CANOPY_H * u * 0.3, x + (k + 0.32) * R, y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(x - R * 0.5, top + CANOPY_H * u * 0.28);
  ctx.quadraticCurveTo(x, top - CANOPY_H * u * 0.2, x + R * 0.5, top + CANOPY_H * u * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  starPath(ctx, x - R * 0.2, top + CANOPY_H * u * 0.17, R * 0.09);
  starPath(ctx, x + R * 0.2, top + CANOPY_H * u * 0.17, R * 0.09);
  ctx.fill();
  // The jumper: a blue jumpsuit, legs together, arms up to the risers, a red helmet.
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(jx - u * 0.005, jy - u * 0.012);
  ctx.lineTo(jx + u * 0.005, jy - u * 0.012);
  ctx.lineTo(jx + u * 0.004, jy + u * 0.014);
  ctx.lineTo(jx - u * 0.004, jy + u * 0.014);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  dot(ctx, jx, jy - u * 0.017, u * 0.0055);
  ctx.fill();
}

// ---------------------------------------------------------------- the planes

/** The banner's word: short, so the whole tow fits the lane beside the courthouse (see DAY). */
const BANNER = "4TH";
const BANNER_W = 0.036;
/** The barnstormer's length (u). */
const PLANE_L = 0.048;

/** A biplane heading right, `L` long: a yellow fuselage, red wings with struts, a tail, wheels, a blurred propeller. */
function plane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, L: number, body: string, wing: string): void {
  const u = s.u;
  ctx.fillStyle = body;
  ctx.beginPath();
  oval(ctx, x, y, L * 0.52, L * 0.14);
  ctx.moveTo(x - L * 0.42, y);
  ctx.lineTo(x - L * 0.56, y - L * 0.3);
  ctx.lineTo(x - L * 0.42, y - L * 0.3);
  ctx.lineTo(x - L * 0.28, y - L * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.rect(x - L * 0.3, y - L * 0.36, L * 0.74, L * 0.08);
  ctx.rect(x - L * 0.3, y + L * 0.1, L * 0.74, L * 0.08);
  ctx.rect(x - L * 0.6, y - L * 0.04, L * 0.2, L * 0.06);
  ctx.fill();
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x - L * 0.1, y - L * 0.3);
  ctx.lineTo(x - L * 0.1, y + L * 0.1);
  ctx.moveTo(x + L * 0.3, y - L * 0.3);
  ctx.lineTo(x + L * 0.3, y + L * 0.1);
  ctx.stroke();
  ctx.fillStyle = tone.bird;
  ctx.beginPath();
  circle(ctx, x - L * 0.05, y + L * 0.27, L * 0.065);
  circle(ctx, x + L * 0.2, y + L * 0.27, L * 0.065);
  circle(ctx, x + L * 0.12, y - L * 0.06, L * 0.06);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  oval(ctx, x + L * 0.56, y, L * 0.05, L * 0.3, Math.sin(s.t * 40) * 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The barnstormer heading right, its propeller a blur, towing a 4TH banner that ripples behind it. */
function biplane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const L = u * PLANE_L;
  // The banner first (behind the plane): a cream strip on a tow line, rippling, the word in red.
  const bx1 = x - L * 0.85;
  const bx0 = bx1 - u * BANNER_W;
  const bh = u * 0.03;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x - L * 0.55, y + L * 0.05);
  ctx.lineTo(bx1, y + bh * 0.1);
  ctx.stroke();
  const ripple = (k: number) => Math.sin(s.t * 5 - k * 7) * bh * 0.14 * (1 - k);
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.moveTo(bx1, y - bh * 0.5);
  for (let k = 0; k <= 1; k += 0.2) ctx.lineTo(bx1 - (bx1 - bx0) * k, y - bh * 0.5 + ripple(k));
  for (let k = 1; k >= 0; k -= 0.2) ctx.lineTo(bx1 - (bx1 - bx0) * k, y + bh * 0.5 + ripple(k));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.fillRect(bx1 - u * 0.004, y - bh * 0.5, u * 0.004, bh);
  ctx.fillStyle = tone.red;
  ctx.font = `${Math.max(6, Math.round(bh * 0.82))}px Rye, 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(BANNER, (bx0 + bx1) / 2 - u * 0.002, y + ripple(0.5) * 0.5, bx1 - bx0 - bh * 0.35);
  ctx.textBaseline = "alphabetic";
  plane(ctx, s, tone, x, y, L, PLANE.body, PLANE_WING.body);
}

/** The stunt plane's loop: its radius (u) and how long a turn of it takes (s). */
const LOOP_R = 0.037;
const LOOP_TIME = 5.5;
/** How much of the loop its smoke trails behind it (radians), in arcs fading out at the oldest end. */
const TRAIL = Math.PI * 1.7;
const TRAIL_STEPS = 2;

/**
 * A red stunt biplane looping the loop, trailing a ring of red, cream and blue smoke: the plane
 * flies round a vertical circle centered at (x, y) and the smoke ribbons follow it round the
 * circle behind it, fading at their oldest end.
 */
function stunt(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const R = LOOP_R * u;
  const a = -((s.t / LOOP_TIME) * Math.PI * 2 + phase);
  // The trail: three ribbons, each the arc behind the plane, drawn in steps that fade.
  const w = Math.max(1, u * 0.0042);
  ctx.lineCap = "butt";
  for (let band = 0; band < 3; band++) {
    ctx.strokeStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.lineWidth = w;
    const r = R + (1 - band) * w;
    for (let k = 0; k < TRAIL_STEPS; k++) {
      ctx.globalAlpha = 0.9 * (1 - k / TRAIL_STEPS);
      ctx.beginPath();
      const a0 = a + (TRAIL * k) / TRAIL_STEPS;
      ctx.arc(x, y, r, a0, a0 + TRAIL / TRAIL_STEPS + 0.02);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // The plane on the circle, nose along its path (the loop runs anticlockwise on screen).
  const px = x + Math.cos(a) * R;
  const py = y + Math.sin(a) * R;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a - Math.PI / 2);
  plane(ctx, s, tone, 0, 0, u * PLANE_L * 0.66, PLANE_WING.body, PLANE.body);
  ctx.restore();
}

/** The blimp's length and depth (u). */
const BLIMP_L = 0.108;
const BLIMP_H = 0.042;

/** A blimp heading right: a cream envelope with a lit top, the flag's red and blue stripes down its side, starred fins, a gondola whose windows light at dusk. */
function blimp(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const L = BLIMP_L * u;
  const H = BLIMP_H * u;
  // The fins, then the envelope over them.
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(x - L * 0.32, y);
    ctx.lineTo(x - L * 0.5, y + side * H * 0.62);
    ctx.lineTo(x - L * 0.47, y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  oval(ctx, x, y, L * 0.42, H * 0.5);
  ctx.fill();
  // Its shaded underside.
  ctx.fillStyle = tone.whiteShade;
  ctx.beginPath();
  ctx.moveTo(x + L * 0.42, y);
  ctx.ellipse(x, y, L * 0.42, H * 0.5, 0, 0, Math.PI);
  ctx.quadraticCurveTo(x, y + H * 0.22, x + L * 0.42, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.cloudLight;
  ctx.beginPath();
  oval(ctx, x - L * 0.06, y - H * 0.22, L * 0.26, H * 0.12);
  ctx.fill();
  // The stripes down its side: red over blue, tapering to the tail.
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(x + L * 0.38, y - H * 0.06);
  ctx.quadraticCurveTo(x, y - H * 0.12, x - L * 0.38, y - H * 0.02);
  ctx.lineTo(x - L * 0.38, y + H * 0.06);
  ctx.quadraticCurveTo(x, y + H * 0.02, x + L * 0.38, y + H * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(x + L * 0.36, y + H * 0.1);
  ctx.quadraticCurveTo(x, y + H * 0.08, x - L * 0.36, y + H * 0.12);
  ctx.lineTo(x - L * 0.32, y + H * 0.2);
  ctx.quadraticCurveTo(x, y + H * 0.18, x + L * 0.33, y + H * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  starPath(ctx, x - L * 0.43, y - H * 0.28, H * 0.12);
  starPath(ctx, x - L * 0.43, y + H * 0.28, H * 0.12);
  ctx.fill();
  // The gondola under it, its windows.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - L * 0.08, y + H * 0.48);
  ctx.lineTo(x + L * 0.1, y + H * 0.48);
  ctx.lineTo(x + L * 0.08, y + H * 0.72);
  ctx.lineTo(x - L * 0.06, y + H * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(x - L * 0.05 + i * L * 0.045, y + H * 0.53, L * 0.025, H * 0.1);
  ctx.fill();
}

// ---------------------------------------------------------------- the kite

/** A diamond kite in the flag's colors with a tail of ribbon bows, swaying on the breeze. */
function kite(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const h = u * 0.036;
  const w = u * 0.027;
  const tilt = Math.sin(s.t * 0.8) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(w, -h * 0.2);
  ctx.lineTo(0, h);
  ctx.lineTo(-w, -h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.moveTo(-w * 0.75, 0);
  ctx.lineTo(w * 0.75, 0);
  ctx.lineTo(w * 0.5, h * 0.33);
  ctx.lineTo(-w * 0.5, h * 0.33);
  ctx.closePath();
  ctx.moveTo(-w * 0.25, h * 0.66);
  ctx.lineTo(w * 0.25, h * 0.66);
  ctx.lineTo(w * 0.08, h * 0.88);
  ctx.lineTo(-w * 0.08, h * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(-w, -h * 0.2);
  ctx.lineTo(0, -h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  starPath(ctx, -w * 0.3, -h * 0.5, w * 0.15);
  ctx.fill();
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(0, h);
  ctx.moveTo(-w, -h * 0.2);
  ctx.lineTo(w, -h * 0.2);
  ctx.stroke();
  // The tail: a line waving down from the kite's foot with bows along it.
  ctx.beginPath();
  ctx.moveTo(0, h);
  const tail = h * 2.4;
  for (let k = 0.1; k <= 1; k += 0.1) ctx.lineTo(Math.sin(s.t * 2.5 - k * 6) * w * 0.5 * k, h + tail * k);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const k = 0.22 + i * 0.22;
    const bx = Math.sin(s.t * 2.5 - k * 6) * w * 0.5 * k;
    const by = h + tail * k;
    ctx.fillStyle = i % 3 === 0 ? tone.red : i % 3 === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - w * 0.3, by - w * 0.14);
    ctx.lineTo(bx - w * 0.3, by + w * 0.14);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + w * 0.3, by - w * 0.14);
    ctx.lineTo(bx + w * 0.3, by + w * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the show's smoke

/** A drift of the show's smoke: soft grey puffs, drifting slowly, there only while the tone says the smoke hangs. */
function smoke(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  if (tone.smoke <= 0.01) return;
  const u = s.u;
  const r = u * 0.017;
  ctx.globalAlpha = tone.smoke * 0.55;
  ctx.fillStyle = tone.cloud;
  ctx.beginPath();
  circle(ctx, x - r * 1.1 + Math.sin(s.t * 0.3 + phase) * r * 0.2, y + r * 0.2, r * 0.9);
  circle(ctx, x + r * 0.2, y - r * 0.3, r * 1.1);
  circle(ctx, x + r * 1.3, y + r * 0.25 + Math.sin(s.t * 0.4 + phase) * r * 0.2, r * 0.8);
  circle(ctx, x + r * 0.3, y + r * 0.7, r * 0.7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

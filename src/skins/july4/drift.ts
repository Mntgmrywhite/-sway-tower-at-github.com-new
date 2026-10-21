import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { EAGLE_BEAK } from "./colors";
import { birdStroke, starPath } from "./shapes";
import { LOOP, type Tone } from "./tone";

// What drifts past as you climb, in the lane down the right of the screen: a few swifts over
// the park and a bunch of red, cream and blue balloons let go at the start, a bald eagle
// circling high over the town, a little yellow biplane towing a HAPPY 4TH banner through the
// afternoon, a stars-and-stripes kite with a ribbon tail in the golden evening, more balloons
// at dusk, and the show's smoke drifting off through the night. Each thing is anchored at a
// height in the lane, so it comes down past you as the camera climbs, and it only ever moves
// gently in place: nothing crosses the tower's column. Things are spaced so they never overlap.
// Mid-distance, so flat poster inks and no outline. When the story loops (tone.ts), the lane
// comes round with it: the same things, a loop higher.
//
// The left of the sky is the sun's and the moon's (sky.ts): the sun hangs there by day and
// sets into the cloud floor, the crescent moon comes out in the same place at night, and the
// sun rises there again at the loop's dawn. One of them is up at every height, and a lane
// comes down every height of the screen, so nothing drifts on the left at all: no balloon,
// bird or puff ever slides across the sun or the moon (the owner's rule, drift.test.ts).

export type Kind = "birds" | "balloons" | "eagle" | "biplane" | "kite" | "smoke";

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
// The swifts, the balloons and the eagle are on screen at the start and come down past the
// land before the cloud floor covers it, so they keep out past the courthouse (its body
// reaches 0.368 u right of center), over the park, and the eagle circles low enough to stay
// below the HUD's rows on a tablet; everything else starts high enough to reach the horizon
// only once the land is covered. The courthouse's clock tower, dome and flag stand out of the
// cloud sea at every height after that (far.ts), reaching to 0.357 u right of center with the
// flag flying: every lane thing, sway included, keeps right of that, so none ever passes over
// them (drift.test.ts). On a phone that leaves the lane 0.37..0.49 u, which is why the
// biplane's banner is short.
const DAY: Spec[] = [
  ["birds", 85, 0.43],
  ["balloons", 120, 0.44],
  ["eagle", 150, 0.43],
  ["biplane", 420, 0.458],
  ["kite", 500, 0.42],
  ["balloons", 640, 0.43],
  ["smoke", 770, 0.42],
  ["smoke", 850, 0.41],
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
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.006;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  if (d.kind === "balloons") balloons(ctx, s, tone, x, y + bob);
  else if (d.kind === "birds") birds(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "eagle") eagle(ctx, s, tone, x, y, d.phase);
  else if (d.kind === "biplane") biplane(ctx, s, tone, x, y + bob);
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

// ---------------------------------------------------------------- balloons

/** A bunch of three flat balloons, red, cream and blue, on strings tied to a knot below them. */
function balloons(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const r = u * 0.017;
  const knotY = y + r * 2.6;
  const spots = [
    [-r * 0.95, -r * 0.5, tone.red],
    [r * 0.95, -r * 0.6, tone.white],
    [0, r * 0.7, tone.blue],
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
    ctx.moveTo(x + dx - r * 0.12, y + dy + r * 1.08);
    ctx.lineTo(x + dx + r * 0.12, y + dy + r * 1.08);
    ctx.lineTo(x + dx, y + dy + r * 0.92);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------- birds and the eagle

/** Three swifts wheeling together over the park. */
const FLOCK = [
  [0, 0],
  [-0.028, 0.012],
  [0.026, 0.016],
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

/** How long the eagle takes to go round once (s). */
const CIRCLE = 11;

/**
 * A bald eagle soaring in a slow circle: dark wings spread wide, tilted into the turn, a white
 * head and tail, a yellow beak. Faces the way it is going.
 */
function eagle(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, phase: number): void {
  const u = s.u;
  const a = (s.t / CIRCLE) * Math.PI * 2 + phase;
  const ex = x + Math.cos(a) * u * 0.02;
  const ey = y + Math.sin(a) * u * 0.009;
  const dir = -Math.sin(a) < 0 ? -1 : 1;
  const bank = Math.cos(a) * 0.35;
  const span = u * 0.027;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.scale(dir, 1);
  ctx.rotate(bank * dir);
  // Wings: two long flat blades with fingered tips, a little dihedral.
  ctx.fillStyle = tone.bird;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-span * 0.5, -span * 0.12, -span, -span * 0.22);
  ctx.lineTo(-span * 0.96, -span * 0.1);
  ctx.lineTo(-span * 0.86, -span * 0.14);
  ctx.lineTo(-span * 0.8, -span * 0.02);
  ctx.quadraticCurveTo(-span * 0.4, span * 0.08, 0, span * 0.1);
  ctx.quadraticCurveTo(span * 0.4, span * 0.08, span * 0.8, -span * 0.02);
  ctx.lineTo(span * 0.86, -span * 0.14);
  ctx.lineTo(span * 0.96, -span * 0.1);
  ctx.lineTo(span, -span * 0.22);
  ctx.quadraticCurveTo(span * 0.5, -span * 0.12, 0, 0);
  ctx.closePath();
  // The body under the wings, the tail fanned behind.
  oval(ctx, 0, span * 0.08, span * 0.13, span * 0.09);
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.moveTo(-span * 0.06, span * 0.12);
  ctx.lineTo(-span * 0.16, span * 0.28);
  ctx.lineTo(span * 0.04, span * 0.28);
  ctx.lineTo(span * 0.08, span * 0.12);
  ctx.closePath();
  circle(ctx, span * 0.17, span * 0.01, span * 0.07);
  ctx.fill();
  ctx.fillStyle = EAGLE_BEAK;
  ctx.beginPath();
  ctx.moveTo(span * 0.22, -span * 0.02);
  ctx.lineTo(span * 0.3, span * 0.02);
  ctx.lineTo(span * 0.22, span * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the biplane and its banner

/** The banner's word: short, so the whole tow fits the lane beside the courthouse (see DAY). */
const BANNER = "4TH";
const BANNER_W = 0.042;

/** A little yellow biplane heading right, its propeller a blur, towing a banner that ripples behind it. */
function biplane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const L = u * 0.05;
  // The banner first (behind the plane): a pale strip on a tow line, rippling.
  const bx1 = x - L * 0.9;
  const bx0 = bx1 - u * BANNER_W;
  const bh = u * 0.024;
  ctx.strokeStyle = tone.bird;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x - L * 0.55, y + L * 0.1);
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
  ctx.fillStyle = tone.red;
  ctx.font = `700 ${Math.max(6, Math.round(bh * 0.8))}px Fredoka, 'Trebuchet MS', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(BANNER, (bx0 + bx1) / 2, y + ripple(0.5) * 0.5, bx1 - bx0 - bh * 0.3);
  ctx.textBaseline = "alphabetic";
  // The plane: fuselage, upper and lower wings with struts, the tail, wheels, a spinning prop.
  ctx.fillStyle = tone.yellow;
  ctx.beginPath();
  oval(ctx, x, y, L * 0.52, L * 0.14);
  ctx.rect(x - L * 0.5, y - L * 0.18, L * 0.1, L * 0.2);
  ctx.rect(x - L * 0.55, y - L * 0.3, L * 0.16, L * 0.14);
  ctx.fill();
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.rect(x - L * 0.3, y - L * 0.36, L * 0.74, L * 0.07);
  ctx.rect(x - L * 0.3, y + L * 0.1, L * 0.74, L * 0.07);
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
  circle(ctx, x - L * 0.05, y + L * 0.26, L * 0.06);
  circle(ctx, x + L * 0.2, y + L * 0.26, L * 0.06);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  oval(ctx, x + L * 0.56, y, L * 0.05, L * 0.28, Math.sin(s.t * 40) * 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the kite

/** A diamond kite in the flag's colors with a tail of ribbon bows, swaying on the breeze. */
function kite(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const h = u * 0.024;
  const w = u * 0.018;
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
  starPath(ctx, -w * 0.3, -h * 0.5, w * 0.14);
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
  const r = u * 0.016;
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

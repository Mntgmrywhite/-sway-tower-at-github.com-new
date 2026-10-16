import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { PINK } from "./colors";
import type { Tone } from "./tone";
import { rimTube } from "./tube";

// What drifts past as you climb, in a lane down each side of the screen: long sunset cloud
// streaks lit from below while the sun is still up, a line of neon flamingos in the violet
// hour, then puffy neon clouds with a glowing tube along their base, and only a few of those in
// the starry night. Each thing is anchored at a height in its lane, so it comes down past you as
// the camera climbs (one parallax depth for both lanes), and only ever moves gently in place:
// nothing crosses the tower's column. Things in a lane are spaced so they never overlap, and
// the lanes are staggered so left and right take turns. Their colors follow the light (tone.ts).

type Kind = "streak" | "cloud" | "flock";

export interface Drifter {
  kind: Kind;
  /** Height in its lane, world units. */
  at: number;
  /** Center, in u from the screen center (negative is left). */
  x: number;
  /** Half-width, in u. */
  size: number;
  /** Which way it faces: +1 out to the right, -1 out to the left. */
  m: number;
  phase: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
export const LANE_P = 0.7;

/** One authored entry: what, and its height in the lane (world units). */
type Spec = readonly [kind: Kind, at: number];

// The story, by hand. A thing at height `at` crosses the middle of the screen around level
// at / 8, comes in at the top about 28 levels before and leaves at the bottom 30 levels after.
// On the start screen (heights up to ~330) only the low streak on the right shows, between the
// right palm's crown and the HUD; nothing else may sit behind the title. The moon hangs up the
// right lane from dusk and the planet up the left lane high up, so only clouds pass them: the
// flamingos have left the screen long before the planet rises.
const RIGHT: Spec[] = [
  ["streak", 150],
  ["cloud", 380],
  ["streak", 560],
  ["cloud", 760],
  ["cloud", 980],
];
const LEFT: Spec[] = [
  ["streak", 345],
  ["flock", 470],
  ["cloud", 650],
  ["cloud", 870],
];

/** After the authored story: a calm, sparse night, generated up to here. */
const TOP = 420 * BLOCK_HEIGHT;
const NIGHT_GAP = 250;

function drifter(kind: Kind, at: number, side: number, k: number): Drifter {
  const h = (n: number) => hash(k * 17 + side * 59 + n + 3000);
  return {
    kind,
    at,
    x: side * (0.37 + h(1) * 0.015),
    size: kind === "flock" ? 0.08 : kind === "streak" ? 0.085 + h(2) * 0.01 : 0.075 + h(2) * 0.012,
    m: side,
    phase: h(6) * 10,
  };
}

/** A lane: its story, then night clouds. */
function lane(side: number, story: Spec[]): Drifter[] {
  const items = story.map(([kind, at], k) => drifter(kind, at, side, k));
  let at = story[story.length - 1]![1];
  for (let k = story.length; at < TOP; k++) {
    at += NIGHT_GAP * (0.85 + hash(k * 5 + side * 3 + 3100) * 0.4);
    if (hash(k * 13 + side * 101 + 3107) < 0.55) items.push(drifter("cloud", at, side, k));
  }
  return items;
}

/** Right lane, then left lane; each runs up from its lowest item. */
const LANES: readonly (readonly Drifter[])[] = [lane(1, RIGHT), lane(-1, LEFT)];

/** Calls `draw` for every item on screen (or close to it), lowest first, lane by lane. */
export function eachVisible(s: Scene, draw: (d: Drifter, lane: number) => void): void {
  const margin = s.u * 0.2;
  const base = layerGround(s, LANE_P);
  const unit = s.scale * LANE_P;
  for (let l = 0; l < LANES.length; l++) {
    for (const d of LANES[l]!) {
      // Items run up the lane, so once one is above the screen the rest are too.
      const y = base - d.at * unit;
      if (y > s.cssH + margin) continue;
      if (y < -margin) break;
      draw(d, l);
    }
  }
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, d: Drifter): void {
  const u = s.u;
  const y = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * 0.004;
  const x = s.cssW / 2 + d.x * u + sway;
  if (d.kind === "cloud") cloud(ctx, s, tone, x, y + bob, d.size * u, d.m);
  else if (d.kind === "streak") streak(ctx, s, tone, x, y + bob, d.size * u, d.m);
  else flock(ctx, s, x, y, d.size * u, d.m, d.phase);
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

// ---------------------------------------------------------------- clouds

/** Lobes of a puffy cloud as [dx, dy, rx, ry]: dx, rx in half-widths, dy, ry in heights. A flat
 *  base and a bumpy top, fuller on the side away from the tower (mirrored by `m`). */
const LOBES: readonly (readonly [number, number, number, number])[] = [
  [0, 0.3, 1, 0.32],
  [-0.62, 0.06, 0.3, 0.52],
  [-0.28, -0.16, 0.36, 0.78],
  [0.1, -0.3, 0.36, 0.92],
  [0.44, -0.04, 0.3, 0.64],
  [0.74, 0.18, 0.22, 0.4],
];
/** Cloud height, as a fraction of its half-width. */
const CLOUD_H = 0.42;

function lobes(ctx: Ctx, x: number, y: number, hw: number, h: number, m: number, drop: number): void {
  for (const [dx, dy, rx, ry] of LOBES) oval(ctx, x + dx * hw * m, y + (dy + drop) * h, rx * hw, ry * h);
}

/** A puffy neon cloud: lit underside, dark body, and a glowing tube along its flat base. */
function cloud(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, hw: number, m: number): void {
  const h = hw * CLOUD_H;
  ctx.beginPath();
  lobes(ctx, x, y, hw, h, m, 0.16);
  ctx.fillStyle = tone.cloudLit;
  ctx.fill();
  ctx.beginPath();
  lobes(ctx, x, y, hw, h, m, 0);
  ctx.fillStyle = tone.cloudBody;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.72, y + h * 0.82);
  ctx.lineTo(x + hw * 0.72, y + h * 0.82);
  rimTube(ctx, tone.cloudRim, Math.max(1, s.u * 0.0026));
}

/** Bars of a sunset streak as [dx, dy, half-width], in half-widths and bar pitches. */
const STREAK: readonly (readonly [number, number, number])[] = [
  [0.18, -1, 0.62],
  [0, 0, 1],
  [-0.12, 1, 0.78],
];
const BAR_H = 0.11; // bar height, in half-widths
const BAR_PITCH = 0.19;

/** Long flat cloud streaks lit along their undersides: the synthwave sunset sky. */
function streak(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, hw: number, m: number): void {
  const bh = hw * BAR_H;
  ctx.beginPath();
  for (const [dx, dy, w] of STREAK) {
    const cx = x + dx * hw * m;
    const cy = y + dy * hw * BAR_PITCH;
    roundRectSub(ctx, cx - w * hw, cy - bh / 2, w * hw * 2, bh, bh / 2);
  }
  ctx.fillStyle = tone.cloudBody;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, w] of STREAK) {
    const cx = x + dx * hw * m;
    const cy = y + dy * hw * BAR_PITCH + bh * 0.42;
    ctx.moveTo(cx - w * hw * 0.82, cy);
    ctx.lineTo(cx + w * hw * 0.82, cy);
  }
  ctx.strokeStyle = tone.cloudLit;
  ctx.lineWidth = Math.max(1, s.u * 0.0032);
  ctx.lineCap = "round";
  ctx.stroke();
}

/** A rounded rectangle as its own subpath (roundRectPath starts a new path). */
function roundRectSub(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- flamingos

const BIRD = mix(PINK, "#ff9fd2", 0.25);

/** Three neon flamingos flying in a loose echelon toward `dir` (+1 right), flapping slowly. */
function flock(ctx: Ctx, s: Scene, x: number, y: number, hw: number, dir: number, phase: number): void {
  const u = s.u;
  const g = hw * 0.42; // one bird's body-and-neck length
  const cx = x + Math.sin(s.t * 0.3 + phase) * u * 0.008;
  const cy = y + Math.sin(s.t * 0.5 + phase) * u * 0.005;
  // Bodies, wings and heads in one fill; necks, beaks and legs in one tube.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      // An echelon: the leader out front and highest, the other two stepped back and down.
      const bx = cx + dir * (1 - i) * g * 1.2;
      const by = cy + (i - 1) * g * 0.75;
      const flap = Math.sin(s.t * 2.2 + i * 1.9 + phase);
      if (pass === 0) flamingoFill(ctx, bx, by, g, dir, flap);
      else flamingoLines(ctx, bx, by, g, dir);
    }
    if (pass === 0) {
      ctx.fillStyle = BIRD;
      ctx.fill();
    } else rimTube(ctx, BIRD, Math.max(1, g * 0.075));
  }
}

/** A flamingo's body, one wing (up or down with `flap`, -1..1) and head, as subpaths. */
function flamingoFill(ctx: Ctx, x: number, y: number, g: number, f: number, flap: number): void {
  oval(ctx, x, y, g * 0.34, g * 0.13, -0.08 * f);
  // The wing beats between high over the back and a little below the body.
  const tip = -g * (0.22 + 0.58 * flap);
  ctx.moveTo(x + f * g * 0.2, y - g * 0.04);
  ctx.quadraticCurveTo(x + f * g * 0.06, y + tip * 0.7, x - f * g * 0.36, y + tip);
  ctx.quadraticCurveTo(x - f * g * 0.2, y + tip * 0.35, x - f * g * 0.24, y);
  ctx.closePath();
  circle(ctx, x + f * g * 1.0, y - g * 0.1, g * 0.075);
}

/** A flamingo's long neck, bent beak and trailing legs. */
function flamingoLines(ctx: Ctx, x: number, y: number, g: number, f: number): void {
  ctx.moveTo(x + f * g * 0.28, y - g * 0.04);
  ctx.quadraticCurveTo(x + f * g * 0.62, y + g * 0.02, x + f * g * 0.95, y - g * 0.1);
  ctx.moveTo(x + f * g * 1.06, y - g * 0.12);
  ctx.lineTo(x + f * g * 1.16, y - g * 0.06);
  ctx.lineTo(x + f * g * 1.14, y + g * 0.03);
  ctx.moveTo(x - f * g * 0.3, y + g * 0.05);
  ctx.lineTo(x - f * g * 1.25, y + g * 0.1);
}

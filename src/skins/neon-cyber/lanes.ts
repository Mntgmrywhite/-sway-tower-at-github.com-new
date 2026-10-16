import { circle, hash, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { hoverCar } from "./car";
import { AMBER, BLUE, CYAN, GREEN_LIGHT, LEAF, LEAF_DARK, MAGENTA, NEAR, NEAR_EDGE, PINK, PURPLE, RED } from "./colors";
import { holoBillboard, verticalSign, boardSign } from "./signs";
import type { Tone } from "./tone";
import { tint, tube } from "./tube";

// The air traffic of the megacity, in a lane down each side of the screen: a hover taxi idling
// over the street at the start, then as you climb holographic billboards carried by drones,
// sign-banner drones, a landing dock with a parked car, a floating sky garden, delivery drones
// and a small airship; up in the clear night only an airship, a satellite or a wisp of smog now
// and then. Each thing is anchored at a height in its lane, so it comes down past you as the
// camera climbs (one parallax depth for both lanes), and only ever moves gently in place:
// nothing crosses the tower's column or touches a side of the screen. Things in a lane are
// spaced so they never overlap, and the right lane (where the moon comes out above the smog)
// carries only wisps by the time the moon shows.

export type Kind = "car" | "dock" | "holo" | "banner" | "drones" | "ship" | "garden" | "sat" | "wisp";

export interface Drifter {
  kind: Kind;
  /** Height in its lane, world units. */
  at: number;
  /** Center, in u from the screen center (negative is left). */
  x: number;
  /** Which side it is on: +1 right, -1 left (cars and ships face out, away from the tower). */
  m: number;
  /** Neon color and a second color, by index into GLOWS. */
  c: number;
  phase: number;
  seed: number;
}

/** Parallax depth of both lanes (1 moves with the tower). */
export const LANE_P = 0.7;

const GLOWS = [CYAN, MAGENTA, PURPLE, BLUE, PINK, AMBER] as const;

/** One authored entry: what, its height in the lane (world units), and optionally its own x (u from center). */
type Spec = readonly [kind: Kind, at: number, x?: number];

// The story up to the night, by hand. A thing at height `at` crosses the middle of the screen
// around level at / 8. Things the start shows sit low (at <= 160) so they stay under the title;
// the next ones wait above the top of the screen (at >= 360). The right lane's last traffic has
// come down past the moon's spot before the moon comes out above the smog (level ~61).
// The taxi at the start hovers in front of the antenna tower's face, between its roof (the
// antenna forest) and the holo billboard, clear of the giant's vertical sign beside it.
const RIGHT: Spec[] = [
  ["car", 132, 0.33],
  ["banner", 380],
  ["dock", 470],
  ["wisp", 700],
];
const LEFT: Spec[] = [
  ["holo", 370],
  ["garden", 530],
  ["car", 680],
  ["drones", 820],
  ["ship", 980],
  ["holo", 1140],
];

/** After the authored story: a calm, sparse night, generated up to here. */
const TOP = 420 * BLOCK_HEIGHT;
const NIGHT_GAP = 250;

function drifter(kind: Kind, at: number, side: number, k: number, x?: number): Drifter {
  const h = (n: number) => hash(k * 17 + side * 59 + n + 4000);
  return {
    kind,
    at,
    x: side * (x ?? 0.37 + h(1) * 0.02),
    m: side,
    c: Math.floor(h(2) * GLOWS.length),
    phase: h(3) * 10,
    seed: Math.floor(h(4) * 50),
  };
}

/** A lane: its story, then the night (the right lane only drifts wisps there). */
function lane(side: number, story: Spec[], night: boolean): Drifter[] {
  const items = story.map(([kind, at, x], k) => drifter(kind, at, side, k, x));
  let at = story[story.length - 1]![1];
  for (let k = story.length; at < TOP; k++) {
    at += NIGHT_GAP * (0.85 + hash(k * 5 + side * 3) * 0.4);
    const r = hash(k * 13 + side * 101 + 7);
    if (!night) {
      if (r < 0.45) items.push(drifter("wisp", at, side, k));
      continue;
    }
    if (r < 0.28) items.push(drifter("wisp", at, side, k));
    else if (r < 0.46) items.push(drifter("ship", at, side, k));
    else if (r < 0.6) items.push(drifter("sat", at, side, k));
    else if (r < 0.7) items.push(drifter("drones", at, side, k));
  }
  return items;
}

/** Right lane, then left lane; each runs up from its lowest item. */
const LANES: readonly (readonly Drifter[])[] = [lane(1, RIGHT, false), lane(-1, LEFT, true)];

/** Calls `draw` for every item on screen (or close to it), lowest first, lane by lane. */
export function eachVisible(s: Scene, draw: (d: Drifter, lane: number) => void): void {
  // Nothing in a lane reaches more than 0.12 u above or below its anchor.
  const margin = s.u * 0.16;
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
  const y0 = layerGround(s, LANE_P) - d.at * s.scale * LANE_P;
  const sway = Math.sin(s.t * 0.17 + d.phase) * u * 0.008;
  const bob = Math.sin(s.t * 0.6 + d.phase) * u * 0.005;
  const x = s.cssW / 2 + d.x * u + sway;
  const y = y0 + bob;
  const glow = GLOWS[d.c]!;
  switch (d.kind) {
    case "car":
      hoverCar(ctx, x, y, u * 0.1, d.m, glow);
      break;
    case "dock":
      dock(ctx, s, x, y, d);
      break;
    case "holo":
      holo(ctx, s, x, y, d);
      break;
    case "banner":
      banner(ctx, s, x, y, d);
      break;
    case "drones":
      drones(ctx, s, x, y, d);
      break;
    case "ship":
      ship(ctx, s, x, y, d);
      break;
    case "garden":
      skyGarden(ctx, s, x, y, d);
      break;
    case "sat":
      satellite(ctx, s, x, y, d);
      break;
    default:
      wisp(ctx, s, tone, x, y0, d);
  }
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

/** Scratch arguments for `drawOne`, so the per-frame loop allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, tone: null as Tone | null };
function drawOne(d: Drifter): void {
  drawDrifter(NOW.ctx!, NOW.s!, NOW.tone!, d);
}

export function lanes(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.tone = tone;
  eachVisible(s, drawOne);
}

// ---------------------------------------------------------------- pieces

/** A dark hull with a dim edge. */
function hull(ctx: Ctx, u: number): void {
  ctx.fillStyle = NEAR;
  ctx.fill();
  ctx.strokeStyle = NEAR_EDGE;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
}

/** A little quad drone at (x, y), `w` across: body, two rotor arms, a light underneath. */
function droneBody(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.rect(x - w * 0.3, y - w * 0.1, w * 0.6, w * 0.26);
  ctx.rect(x - w, y - w * 0.28, w * 0.62, w * 0.09);
  ctx.rect(x + w * 0.38, y - w * 0.28, w * 0.62, w * 0.09);
  ctx.rect(x - w * 0.72, y - w * 0.28, w * 0.08, w * 0.22);
  ctx.rect(x + w * 0.64, y - w * 0.28, w * 0.08, w * 0.22);
}

function blinkOn(s: Scene, d: Drifter, rate: number): boolean {
  return Math.sin(s.t * rate + d.phase) > 0.3;
}

/** A floating landing dock: a pad with a neon rim and landing lights, thrusters below, a car parked on it. */
function dock(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const w = u * 0.13;
  const t = u * 0.016;
  // Thruster glow under the pad
  ctx.beginPath();
  oval(ctx, x - w * 0.28, y + t * 1.6, w * 0.07, t * 0.9);
  oval(ctx, x + w * 0.28, y + t * 1.6, w * 0.07, t * 0.9);
  ctx.fillStyle = tint(CYAN, 0.5);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(s.t * 7 + d.phase);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Pad
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.4, y + t);
  ctx.lineTo(x - w * 0.4, y + t);
  ctx.closePath();
  hull(ctx, u);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.lineTo(x + w * 0.5, y);
  tube(ctx, GLOWS[d.c]!, Math.max(1, u * 0.003), 2.4);
  // Landing lights running along the rim
  const step = Math.floor(s.t * 3 + d.phase) % 4;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, x - w * 0.36 + i * w * 0.24, y + t * 0.5, Math.max(0.8, u * (i === step ? 0.004 : 0.0025)));
  ctx.fillStyle = AMBER;
  ctx.fill();
  hoverCar(ctx, x + w * 0.04 * d.m, y - u * 0.016, u * 0.085, d.m, GLOWS[(d.c + 2) % GLOWS.length]!);
}

/** A holographic billboard projected by a drone hovering under it. */
function holo(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const w = u * 0.12;
  const h = u * 0.08;
  const ex = x;
  const ey = y + h * 1.05;
  holoBillboard(ctx, x - w / 2, y - h / 2, w, h, GLOWS[d.c]!, GLOWS[(d.c + 1) % GLOWS.length]!, d.seed, s.t, ex, ey);
  ctx.beginPath();
  droneBody(ctx, ex, ey + u * 0.006, u * 0.02);
  hull(ctx, u);
  ctx.beginPath();
  circle(ctx, ex, ey + u * 0.012, Math.max(0.8, u * 0.0035));
  ctx.fillStyle = blinkOn(s, d, 4) ? RED : tint(RED, 0.35);
  ctx.fill();
}

/** A drone carrying a vertical glyph banner on two wires; the banner swings a little. */
function banner(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const w = u * 0.032;
  const h = u * 0.15;
  const top = y - h * 0.4;
  const swing = Math.sin(s.t * 0.9 + d.phase) * u * 0.004;
  const dy = top - u * 0.035;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.008, dy + u * 0.004);
  ctx.lineTo(x - w / 2 + swing, top);
  ctx.moveTo(x + u * 0.008, dy + u * 0.004);
  ctx.lineTo(x + w / 2 + swing, top);
  ctx.strokeStyle = NEAR_EDGE;
  ctx.lineWidth = Math.max(0.6, u * 0.0015);
  ctx.stroke();
  verticalSign(ctx, x - w / 2 + swing, top, w, h, GLOWS[d.c]!, d.seed, s.t, 0.95);
  ctx.beginPath();
  droneBody(ctx, x, dy, u * 0.024);
  hull(ctx, u);
  ctx.beginPath();
  circle(ctx, x, dy + u * 0.006, Math.max(0.8, u * 0.0035));
  ctx.fillStyle = blinkOn(s, d, 3.3) ? CYAN : tint(CYAN, 0.35);
  ctx.fill();
}

/** Three delivery drones hovering in a loose cluster, parcels slung underneath, lights blinking in turn. */
function drones(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const w = u * 0.02;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * u * 0.042 * d.m + Math.sin(s.t * 0.7 + i * 2 + d.phase) * u * 0.004;
    const dy = (i === 1 ? -u * 0.03 : 0) + Math.sin(s.t * 1.3 + i * 1.7 + d.phase) * u * 0.004;
    droneBody(ctx, x + dx, y + dy, w);
    ctx.rect(x + dx - w * 0.22, y + dy + w * 0.3, w * 0.44, w * 0.36);
  }
  hull(ctx, u);
  const k = Math.floor(s.t * 2 + d.phase) % 3;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * u * 0.042 * d.m + Math.sin(s.t * 0.7 + i * 2 + d.phase) * u * 0.004;
    const dy = (i === 1 ? -u * 0.03 : 0) + Math.sin(s.t * 1.3 + i * 1.7 + d.phase) * u * 0.004;
    circle(ctx, x + dx, y + dy - w * 0.02, Math.max(0.8, u * (i === k ? 0.0045 : 0.003)));
  }
  ctx.fillStyle = GLOWS[d.c]!;
  ctx.fill();
}

/** A small airship facing out of the screen's middle: hull, fins, gondola, a glyph ticker and running lights. */
function ship(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const L = u * 0.17;
  const dir = d.m;
  ctx.beginPath();
  oval(ctx, x, y, L * 0.5, L * 0.13);
  ctx.moveTo(x - dir * L * 0.36, y - L * 0.06);
  ctx.lineTo(x - dir * L * 0.52, y - L * 0.19);
  ctx.lineTo(x - dir * L * 0.47, y);
  ctx.lineTo(x - dir * L * 0.52, y + L * 0.19);
  ctx.lineTo(x - dir * L * 0.36, y + L * 0.06);
  ctx.closePath();
  ctx.rect(x - L * 0.11, y + L * 0.11, L * 0.22, L * 0.055);
  hull(ctx, u);
  boardSign(ctx, x - L * 0.25, y - L * 0.05, L * 0.5, L * 0.1, GLOWS[d.c]!, 70 + d.seed, s.t, 0.85);
  ctx.beginPath();
  circle(ctx, x + dir * L * 0.49, y, Math.max(1, u * 0.0035));
  circle(ctx, x - dir * L * 0.52, y - L * 0.18, Math.max(1, u * 0.0035));
  ctx.fillStyle = tint(RED, blinkOn(s, d, 2.4) ? 0.95 : 0.35);
  ctx.fill();
}

/** A floating sky garden: a round platform with plants under a glass dome, lit violet by grow lights. */
function skyGarden(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const r = u * 0.065;
  // Thrusters
  ctx.beginPath();
  oval(ctx, x - r * 0.45, y + r * 0.42, r * 0.12, r * 0.08);
  oval(ctx, x + r * 0.45, y + r * 0.42, r * 0.12, r * 0.08);
  ctx.fillStyle = tint(CYAN, 0.5);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(s.t * 6 + d.phase);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Platform: a shallow bowl under a flat deck
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.42, x, y + r * 0.42);
  ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.42, x - r, y);
  ctx.closePath();
  hull(ctx, u);
  // Grow-light glow under the dome
  ctx.beginPath();
  oval(ctx, x, y - r * 0.3, r * 0.85, r * 0.42);
  ctx.fillStyle = tint(PURPLE, 0.22);
  ctx.fill();
  // Plants: a tree and shrubs
  ctx.fillStyle = LEAF_DARK;
  ctx.fillRect(x - r * 0.33 - u * 0.002, y - r * 0.5, u * 0.004, r * 0.5);
  ctx.beginPath();
  circle(ctx, x - r * 0.33, y - r * 0.6, r * 0.24);
  circle(ctx, x + r * 0.05, y - r * 0.17, r * 0.2);
  circle(ctx, x + r * 0.38, y - r * 0.22, r * 0.25);
  circle(ctx, x - r * 0.62, y - r * 0.12, r * 0.15);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.38, y - r * 0.68, r * 0.13);
  circle(ctx, x + r * 0.33, y - r * 0.32, r * 0.12);
  ctx.fillStyle = LEAF;
  ctx.fill();
  // Glass dome and the deck's neon rim
  ctx.beginPath();
  ctx.moveTo(x - r * 0.88, y);
  ctx.quadraticCurveTo(x - r * 0.85, y - r * 1.15, x, y - r * 1.15);
  ctx.quadraticCurveTo(x + r * 0.85, y - r * 1.15, x + r * 0.88, y);
  ctx.strokeStyle = tint(CYAN, 0.5);
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  tube(ctx, GREEN_LIGHT, Math.max(1, u * 0.003), 2.4);
}

/** A small satellite: a body with two solar wings, a dish and a blinking light. */
function satellite(ctx: Ctx, s: Scene, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const w = u * 0.05;
  const tilt = d.m * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.rect(-w * 0.2, -w * 0.16, w * 0.4, w * 0.32);
  ctx.moveTo(w * 0.2, 0);
  ctx.lineTo(w * 0.32, 0);
  ctx.moveTo(-w * 0.2, 0);
  ctx.lineTo(-w * 0.32, 0);
  ctx.moveTo(0, -w * 0.16);
  ctx.lineTo(0, -w * 0.36);
  hull(ctx, u);
  // Solar wings: panels with a grid
  ctx.beginPath();
  ctx.rect(-w * 1.05, -w * 0.13, w * 0.73, w * 0.26);
  ctx.rect(w * 0.32, -w * 0.13, w * 0.73, w * 0.26);
  ctx.fillStyle = tint(BLUE, 0.35);
  ctx.fill();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(-w * 1.05 + (i * w * 0.73) / 4, -w * 0.13);
    ctx.lineTo(-w * 1.05 + (i * w * 0.73) / 4, w * 0.13);
    ctx.moveTo(w * 0.32 + (i * w * 0.73) / 4, -w * 0.13);
    ctx.lineTo(w * 0.32 + (i * w * 0.73) / 4, w * 0.13);
  }
  ctx.strokeStyle = tint(CYAN, 0.45);
  ctx.lineWidth = Math.max(0.6, u * 0.0015);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, 0, -w * 0.38, Math.max(0.8, u * 0.003));
  ctx.fillStyle = blinkOn(s, d, 2) ? RED : tint(RED, 0.3);
  ctx.fill();
  ctx.restore();
}

/** A wisp of smog drifting in place: three soft overlapping puffs. */
function wisp(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, d: Drifter): void {
  const u = s.u;
  const drift = Math.sin(s.t * 0.11 + d.phase) * u * 0.01;
  ctx.beginPath();
  oval(ctx, x + drift - u * 0.035, y, u * 0.05, u * 0.012);
  oval(ctx, x + drift + u * 0.02, y - u * 0.008, u * 0.045, u * 0.014);
  oval(ctx, x + drift + u * 0.005, y + u * 0.008, u * 0.06, u * 0.01);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = tone.sea;
  ctx.fill();
  ctx.globalAlpha = 1;
}

import { circle, mix, roundRectPath, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CREAM } from "./colors";
import { smooth, type Tone } from "./tone";

// Tractors plodding over the fields far below, our own plain farm tractor: a big rear wheel, a
// small front one, a long bonnet with an exhaust stack puffing, a cab with a cream roof. A red
// one ploughs the near field on the left, raising dust behind its plough; a green one hauls a
// trailer of hay bales across the field on the right, and a little green one works the far
// field on the left. Each works its own strip of field, out at the sides (never behind the
// tower, clear of the village, the windmill, the river, the groves and the kite's string):
// slow and steady to the end of the strip, a turn, and back. They are far off, so flat and a
// little faded like the rest of the countryside, but their red and green still read.

type Tow = "plough" | "trailer" | "none";

export interface Tractor {
  color: "red" | "green";
  /** Where its wheels stand: u below the horizon. */
  y: number;
  /** The strip of field it works: x in u from the center. The whole rig stays inside it, turns included. */
  from: number;
  to: number;
  /** The tractor's length (u): the rig scales with it. */
  len: number;
  /** Plodding speed (u/s). */
  speed: number;
  /** Where it is heading at scene start: the strip's left end (-1) or right end (1), and when it gets there and turns (s). */
  end: -1 | 1;
  firstTurn: number;
  tow: Tow;
}

/** How long a turn at the end of a strip takes (s). */
export const TURN_TIME = 1.2;

export const TRACTORS: readonly Tractor[] = [
  // The near field on the left, between the grove and the kite's stake: red, ploughing, heading
  // out toward the edge; it turns there and comes back.
  { color: "red", y: 0.268, from: -0.49, to: -0.338, len: 0.039, speed: 0.009, end: -1, firstTurn: 3, tow: "plough" },
  // The far field on the left, left of the kite's string: a little green one going the other way.
  { color: "green", y: 0.148, from: -0.488, to: -0.345, len: 0.029, speed: 0.0085, end: 1, firstTurn: 5.6, tow: "none" },
  // The field on the right, between the windmill and the grove: green, hauling hay in toward the tower.
  { color: "green", y: 0.168, from: 0.27, to: 0.488, len: 0.034, speed: 0.012, end: -1, firstTurn: 8.4, tow: "trailer" },
];

/** The rig's reach in tractor lengths, facing right from the tractor's middle: ahead (the nose) and behind (the tow, the dust). */
const NOSE = 0.5;
const TAIL: Record<Tow, number> = { plough: -1.32, trailer: -1.22, none: -0.56 };

/** Half the rig's length (u): the rig turns about its middle. */
function half(tr: Tractor): number {
  return ((NOSE - TAIL[tr.tow]) / 2) * tr.len;
}

/** One pass along the strip (s). */
function passTime(tr: Tractor): number {
  return (tr.to - tr.from - 2 * half(tr)) / tr.speed;
}

/** One round: out, turn, back, turn (s). */
export function roundTime(tr: Tractor): number {
  return 2 * (passTime(tr) + TURN_TIME);
}

export interface TractorPose {
  /** The rig's middle: u from the center. */
  x: number;
  /** Which way it faces: 1 right, -1 left, in between while it turns. */
  facing: number;
  /** How far through a turn (0..1), or -1 while driving. */
  turn: number;
  /** 1 while driving, easing to 0 at the ends of a pass (the plough's dust). */
  moving: number;
}

/** Where tractor `i` is at scene time `t`. */
export function tractorAt(i: number, t: number): TractorPose {
  const tr = TRACTORS[i]!;
  const a = tr.from + half(tr);
  const b = tr.to - half(tr);
  const p = passTime(tr);
  const round = roundTime(tr);
  // Its round starts at the left end heading right: from there it reaches the right end after
  // one pass, and the left end again after two and a turn.
  const phase = (tr.end === 1 ? p : 2 * p + TURN_TIME) - tr.firstTurn;
  const k = (((t + phase) % round) + round) % round;
  const ease = (e: number) => Math.min(1, e / 0.6, (p - e) / 0.6);
  if (k < p) return { x: a + tr.speed * k, facing: 1, turn: -1, moving: ease(k) };
  if (k < p + TURN_TIME) {
    const f = (k - p) / TURN_TIME;
    return { x: b, facing: Math.cos(Math.PI * smooth(0, 1, f)), turn: f, moving: 0 };
  }
  const back = k - p - TURN_TIME;
  if (back < p) return { x: b - tr.speed * back, facing: -1, turn: -1, moving: ease(back) };
  const f = (back - p) / TURN_TIME;
  return { x: a, facing: -Math.cos(Math.PI * smooth(0, 1, f)), turn: f, moving: 0 };
}

/** The tractors' colors at a tone: picked once per tone step, faded a little toward the haze. */
interface Paint {
  red: string;
  redShade: string;
  green: string;
  greenShade: string;
  tyre: string;
  hub: string;
  glass: string;
  roof: string;
  steel: string;
  wood: string;
  woodShade: string;
  hay: string;
  hayShade: string;
  dust: string;
  smoke: string;
}

const PAINTS = new WeakMap<Tone, Paint>();

function paintOf(tone: Tone): Paint {
  let p = PAINTS.get(tone);
  if (!p) {
    const f = (c: string, k = 0.18) => mix(c, tone.haze, k);
    p = {
      red: f("#e8412f"),
      redShade: f("#b02a2c"),
      green: f("#1f8f3c", 0.14),
      greenShade: f("#156a2e", 0.14),
      tyre: f("#3a3346", 0.22),
      hub: f(CREAM, 0.12),
      glass: f("#d9f1ff", 0.1),
      roof: f(CREAM, 0.12),
      steel: f("#5d5a6e", 0.25),
      wood: f("#c47a3e"),
      woodShade: f("#995a2c"),
      hay: f("#f5c84a"),
      hayShade: f("#d49a30"),
      dust: f("#d8bf8c", 0.2),
      smoke: f("#f2f4f8", 0.1),
    };
    PAINTS.set(tone, p);
  }
  return p;
}

/** All the tractors, on the fields far below. */
export function tractors(ctx: Ctx, s: Scene, tone: Tone): void {
  for (let i = 0; i < TRACTORS.length; i++) tractor(ctx, s, tone, i);
}

/** Tractor `i` and its tow, drawn in tractor lengths: facing right, wheels on y = 0, the rig's middle at x = 0. */
export function tractor(ctx: Ctx, s: Scene, tone: Tone, i: number): void {
  const tr = TRACTORS[i]!;
  const paint = paintOf(tone);
  const pose = tractorAt(i, s.t);
  const L = tr.len * s.u;
  // Turning, it narrows to a sliver and widens again facing the other way, about the rig's middle.
  const facing = Math.abs(pose.facing) < 0.03 ? Math.sign(pose.facing || 1) * 0.03 : pose.facing;
  ctx.save();
  ctx.translate(s.cssW / 2 + pose.x * s.u, s.horizonY + tr.y * s.u);
  ctx.scale(facing * L, L);
  ctx.translate(-(NOSE + TAIL[tr.tow]) / 2, 0);
  const t = s.t + i * 0.37;
  if (tr.tow === "plough") plough(ctx, paint, t, pose.moving);
  if (tr.tow === "trailer") trailer(ctx, paint);
  body(ctx, paint, tr.color === "red" ? paint.red : paint.green, tr.color === "red" ? paint.redShade : paint.greenShade);
  smoke(ctx, paint, t);
  ctx.restore();
}

/** The tractor: cab, bonnet, exhaust stack, then the wheels in front. */
function body(ctx: Ctx, paint: Paint, coat: string, shade: string): void {
  // Cab and bonnet.
  ctx.fillStyle = coat;
  ctx.fillRect(-0.46, -0.86, 0.42, 0.5);
  roundRectPath(ctx, -0.16, -0.5, 0.64, 0.3, 0.07);
  ctx.fill();
  // Shade under the bonnet, the grille, the cab's back post.
  ctx.fillStyle = shade;
  ctx.fillRect(-0.16, -0.31, 0.64, 0.11);
  ctx.fillRect(0.41, -0.47, 0.07, 0.25);
  ctx.fillRect(-0.46, -0.86, 0.07, 0.48);
  // Window, roof, stack.
  ctx.fillStyle = paint.glass;
  ctx.fillRect(-0.36, -0.8, 0.26, 0.24);
  ctx.fillStyle = paint.roof;
  ctx.fillRect(-0.53, -0.94, 0.56, 0.09);
  ctx.fillStyle = paint.tyre;
  ctx.beginPath();
  ctx.rect(0.22, -0.72, 0.05, 0.24);
  circle(ctx, -0.22, -0.27, 0.27);
  circle(ctx, 0.33, -0.15, 0.15);
  ctx.fill();
  ctx.fillStyle = paint.hub;
  ctx.beginPath();
  circle(ctx, -0.22, -0.27, 0.11);
  circle(ctx, 0.33, -0.15, 0.065);
  ctx.fill();
}

/** Puffs from the exhaust stack, rising and drifting back, swelling as they fade. */
function smoke(ctx: Ctx, paint: Paint, t: number): void {
  ctx.fillStyle = paint.smoke;
  const base = ctx.globalAlpha;
  for (let j = 0; j < 3; j++) {
    const k = (t * 0.8 + j / 3) % 1;
    ctx.globalAlpha = base * 0.85 * (1 - k) * Math.min(1, k * 6);
    ctx.beginPath();
    circle(ctx, 0.25 - k * 0.3, -0.76 - k * 0.24, 0.055 + k * 0.07);
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

/** A plough behind: a drawbar and three shares in the soil, and dust rising behind it while it moves. */
function plough(ctx: Ctx, paint: Paint, t: number, moving: number): void {
  ctx.fillStyle = paint.steel;
  ctx.beginPath();
  ctx.rect(-0.96, -0.28, 0.54, 0.06);
  for (const x of [-0.62, -0.76, -0.9]) {
    ctx.moveTo(x + 0.03, -0.24);
    ctx.lineTo(x - 0.02, -0.24);
    ctx.lineTo(x - 0.1, -0.01);
    ctx.lineTo(x - 0.02, -0.01);
    ctx.closePath();
  }
  ctx.fill();
  if (moving <= 0) return;
  // Each puff stays where the plough turned it up, so it falls back as the tractor goes on.
  ctx.fillStyle = paint.dust;
  const base = ctx.globalAlpha;
  for (let j = 0; j < 4; j++) {
    const k = (t * 1.3 + j / 4) % 1;
    ctx.globalAlpha = base * 0.8 * moving * (1 - k) * Math.min(1, k * 5);
    ctx.beginPath();
    circle(ctx, -1.0 - k * 0.18, -0.07 - k * 0.1, 0.05 + k * 0.08);
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

/** A little trailer behind with two hay bales on it. */
function trailer(ctx: Ctx, paint: Paint): void {
  ctx.fillStyle = paint.tyre;
  ctx.fillRect(-0.64, -0.25, 0.2, 0.04);
  ctx.fillStyle = paint.wood;
  ctx.fillRect(-1.22, -0.42, 0.6, 0.2);
  ctx.fillStyle = paint.woodShade;
  ctx.fillRect(-1.22, -0.28, 0.6, 0.06);
  ctx.fillStyle = paint.hay;
  for (const x of [-1.18, -0.91]) {
    roundRectPath(ctx, x, -0.64, 0.25, 0.22, 0.05);
    ctx.fill();
  }
  ctx.fillStyle = paint.hayShade;
  ctx.fillRect(-1.18, -0.49, 0.25, 0.05);
  ctx.fillRect(-0.91, -0.49, 0.25, 0.05);
  ctx.fillStyle = paint.tyre;
  ctx.beginPath();
  circle(ctx, -0.92, -0.12, 0.12);
  ctx.fill();
  ctx.fillStyle = paint.hub;
  ctx.beginPath();
  circle(ctx, -0.92, -0.12, 0.05);
  ctx.fill();
}

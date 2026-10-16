import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BEARD, BELT, CHEEK, COAT, GOLD, INK, IRON, LEP_HAT, RAINBOW, SHOE, SKIN, STOCKING } from "./colors";
import { block } from "./shapes";
import { sparkle } from "./sky";
import { centerX, inkW } from "./tower";

// The pot of gold at the rainbow's end, and the leprechaun who keeps it: our own little fellow
// from the old stories, in a green frock coat with brass buttons and a belt, cream stockings
// and buckled shoes, a big ginger beard and rosy cheeks, under a tall bottle-green hat with a
// buckle on its band. He hides behind his pot. Every so often he peeks out: round its side,
// leaning out to look about, or up over the heap of coins, hands on the rim, eyes darting; then
// he ducks back. And now and then he stands up, grabs the pot and hurries off with it behind the
// old round tower, leaving the rainbow ending on bare grass (a glimmer where it touches down);
// a while later he lugs it back, sets it down and slips behind it again.
//
// Everything is a function of the scene's time: a cycle of CYCLE seconds, and per cycle (by
// hash) whether he runs off, when he peeks and which way. He stays on the meadow below the
// tower's floor line, out of the slider's way, and well in from the screen's edge; the round
// tower's drum (drawn after him) is what he disappears behind.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The pot's home: its center and foot (u). */
export const POT_X = 0.412;
export const POT_FOOT = 0.165;
/** The pot: half width, rim height above its foot, and the heap of gold above the rim (u). */
const POT_HW = 0.033;
const POT_RIM = 0.047;
const HEAP = 0.032;
/**
 * Where he is out of sight behind the round tower's drum (his center, u): going, with the pot
 * held out ahead of him to the left; coming back, with it ahead of him to the right, so further in.
 */
export const HIDE_X = 0.16;
export const BACK_X = 0.125;
/** How far in front of him he holds the pot when he carries it (u). */
const REACH = 0.036;

/** One cycle of his routine, seconds. */
export const CYCLE = 24;

/** What the pot and he are doing this frame. */
export interface Plan {
  /** Whether he is drawn at all. */
  shown: boolean;
  /** His center and facing (+1 right), u from the tower's center line. */
  x: number;
  m: number;
  /** 1 crouched down behind the pot, 0 standing. */
  crouch: number;
  /** Leaning forward as he hurries, radians. */
  lean: number;
  /** Peeking round the pot's side: how far his head is out (0..1); the rest of him stays hidden behind it. */
  headOut: number;
  /** Walking: stride phase, and how much he is walking (0..1). */
  walk: number;
  stride: number;
  /** Where his eyes look (u, forward), and whether they are shut. */
  look: number;
  blink: boolean;
  /** Hands: 0 down at his sides, 1 on the pot's rim (peeking over), 2 round the pot (carrying), 3 gripping the pot's side (peeking round). */
  hands: number;
  /** Where the pot is: its center (u from the tower's center line), how far it is off the ground, and whether it is here at all. */
  potX: number;
  potLift: number;
  potShown: boolean;
}

const PLAN: Plan = { shown: false, x: 0, m: 1, crouch: 1, lean: 0, headOut: 0, walk: 0, stride: 0, look: 0, blink: false, hands: 0, potX: POT_X, potLift: 0, potShown: true };

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** 0 -> 1 -> 0 over a span of `dur` from `t0`, `fade` seconds each way. */
function window01(k: number, t0: number, dur: number, fade: number): number {
  return ease((k - t0) / fade) * (1 - ease((k - t0 - dur + fade) / fade));
}

/** Whether cycle `n` is one where he runs off with the pot: the first (so you see it soon after the start), then about every other. */
export function runsOff(n: number): boolean {
  return n === 0 || hash(n * 5 + 9600) < 0.45;
}

/** A peek: its start, which kind (round the side or over the rim), and its length. */
const PEEK = 2.8;

/** Eyes during a peek: look out, glance at you, look out again; one blink in the middle. */
function eyes(p: Plan, k: number, t0: number, forward: number): void {
  const q = (k - t0) / PEEK;
  p.look = q < 0.35 ? forward : q < 0.62 ? -0.002 : forward * 0.6;
  p.blink = q > 0.48 && q < 0.53;
}

function peek(p: Plan, k: number, t0: number, side: boolean): boolean {
  const w = window01(k, t0, PEEK, 0.45);
  if (w <= 0.02) return false;
  p.shown = true;
  p.potX = POT_X;
  if (side) {
    // Round the pot's left side: only his head comes out, tipped, to look toward the tower.
    p.m = -1;
    p.headOut = w;
    p.hands = w > 0.4 ? 3 : 0;
    eyes(p, k, t0, 0.0035);
  } else {
    // Up over the heap of gold, hands on the rim.
    p.x = POT_X - 0.006;
    p.m = -1;
    p.crouch = 1 - w;
    p.hands = w > 0.55 ? 1 : 0;
    eyes(p, k, t0, 0.0035);
    if (Math.floor(k / 1.1) % 2 === 1 && (k - t0) / PEEK > 0.62) p.look = -0.0035;
  }
  return true;
}

/**
 * Where he and the pot are at time `t`: hidden behind the pot, peeking, or (in a run-off
 * cycle) standing up, grabbing the pot, hurrying off behind the round tower, away, lugging it
 * back, setting it down and slipping behind it again.
 */
export function plan(t: number): Plan {
  const p = PLAN;
  const n = Math.floor(t / CYCLE);
  const k = t - n * CYCLE;
  const h = (j: number) => hash(n * 13 + j + 9700);
  p.shown = false;
  p.x = POT_X;
  p.m = -1;
  p.crouch = 1;
  p.lean = 0;
  p.headOut = 0;
  p.walk = 0;
  p.stride = 0;
  p.look = 0;
  p.blink = false;
  p.hands = 0;
  p.potX = POT_X;
  p.potLift = 0;
  p.potShown = true;
  if (!runsOff(n)) {
    const p0 = 1.2 + h(1) * 2;
    const p1 = p0 + PEEK + 4 + h(2) * 2.5;
    const p2 = p1 + PEEK + 4 + h(3) * 2.5;
    if (peek(p, k, p0, h(4) < 0.5)) return p;
    if (peek(p, k, p1, h(5) >= 0.5)) return p;
    if (p2 + PEEK < CYCLE) peek(p, k, p2, h(6) < 0.5);
    return p;
  }
  if (peek(p, k, 1, false)) return p;
  if (k < 4.4) return p;
  p.shown = true;
  if (k < 5) {
    // He stands up behind the pot...
    p.x = POT_X + 0.008;
    p.crouch = 1 - ease((k - 4.4) / 0.6);
    p.look = 0.003;
    return p;
  }
  if (k < 5.7) {
    // ...side-steps round its right, hands to the rim, and lifts it.
    const q = ease((k - 5) / 0.45);
    p.x = POT_X + 0.008 + (REACH - 0.008) * q;
    p.crouch = 0;
    p.hands = q > 0.5 ? 2 : 0;
    p.potLift = 0.008 * ease((k - 5.45) / 0.25);
    p.walk = Math.sin(Math.PI * q) * 0.6;
    p.stride = (k - 5) * 9;
    return p;
  }
  if (k < 7.9) {
    // Off he goes with it, hurrying left behind the round tower.
    const q = (k - 5.7) / 2.2;
    const e = q * q * (3 - 2 * q);
    p.x = POT_X + REACH + (HIDE_X - POT_X - REACH) * e;
    p.crouch = 0;
    p.lean = 0.14;
    p.hands = 2;
    p.walk = 1;
    p.stride = k * 11;
    p.potX = p.x - REACH;
    p.potLift = 0.008 + Math.abs(Math.sin(k * 11)) * 0.004;
    return p;
  }
  if (k < 15.6) {
    // Away: the rainbow ends on bare grass.
    p.shown = false;
    p.potShown = false;
    return p;
  }
  if (k < 18) {
    // Back he comes, lugging it.
    const q = (k - 15.6) / 2.4;
    const e = q * q * (3 - 2 * q);
    p.m = 1;
    p.x = BACK_X + (POT_X - REACH - BACK_X) * e;
    p.crouch = 0;
    p.lean = 0.1;
    p.hands = 2;
    p.walk = 1 - ease((q - 0.85) / 0.15);
    p.stride = k * 9;
    p.potX = p.x + REACH;
    p.potLift = 0.008 * (1 - ease((q - 0.9) / 0.1)) + Math.abs(Math.sin(k * 9)) * 0.003 * p.walk;
    return p;
  }
  if (k < 18.9) {
    // Sets it down and slips behind it.
    const q = ease((k - 18) / 0.9);
    p.m = 1;
    p.x = POT_X - REACH + (REACH + 0.008) * q;
    p.crouch = q;
    p.hands = q < 0.3 ? 2 : 0;
    p.walk = Math.sin(Math.PI * q) * 0.5;
    p.stride = k * 9;
    p.look = -0.002;
    return p;
  }
  p.shown = false;
  if (peek(p, k, 20.6, true)) return p;
  return p;
}

// ---------------------------------------------------------------- drawing

/**
 * The pot of gold with him, as the time has it: him first (behind the pot), then the pot, then
 * his hands where they grip it. Drawn after the rainbow and before the round tower, whose drum
 * hides him when he hurries off.
 */
export function potAndLeprechaun(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g + (POT_FOOT - 0.16) * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const p = plan(s.t);
  const foot = g + POT_FOOT * u;
  if (!p.potShown) {
    glimmer(ctx, s, cx + POT_X * u, foot);
    return;
  }
  if (p.shown && p.headOut > 0) peekingHead(ctx, cx + POT_X * u, foot, u, p, lw);
  else if (p.shown) figure(ctx, cx + p.x * u, foot, u, p, lw);
  pot(ctx, s, cx + p.potX * u, foot - p.potLift * u, lw);
  if (p.shown && p.hands > 0) hands(ctx, cx, foot, u, p, lw);
}

/** Where the rainbow touches down on bare grass while the pot is away: a soft glimmer that twinkles. */
function glimmer(ctx: Ctx, s: Scene, x: number, foot: number): void {
  const u = s.u;
  ctx.fillStyle = RAINBOW[2];
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  oval(ctx, x + u * 0.001, foot - u * 0.002, u * 0.03, u * 0.007);
  ctx.fill();
  const tw = 0.5 + 0.5 * Math.sin(s.t * 3.1);
  ctx.globalAlpha = 0.6 + 0.4 * tw;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  sparkle(ctx, x - u * 0.014, foot - u * 0.012, u * (0.006 + 0.004 * tw));
  sparkle(ctx, x + u * 0.017, foot - u * 0.02, u * (0.008 - 0.003 * tw));
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Coins heaped over the pot's rim: [dx, dy] in u from the rim's center. */
const COINS = [
  [-0.02, -0.006],
  [0, -0.012],
  [0.019, -0.005],
  [-0.008, -0.019],
  [0.011, -0.018],
] as const;

/** A black iron pot on three stubby legs, heaped with gold, a glint winking on the coins. */
export function pot(ctx: Ctx, s: Scene, x: number, foot: number, lw: number): void {
  const u = s.u;
  const hw = u * POT_HW;
  const rim = foot - u * POT_RIM;
  // Legs.
  ctx.beginPath();
  ctx.rect(x - hw * 0.72, foot - u * 0.011, u * 0.008, u * 0.011);
  ctx.rect(x + hw * 0.72 - u * 0.008, foot - u * 0.011, u * 0.008, u * 0.011);
  ctx.fillStyle = IRON.shade;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The heap of gold above the rim.
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.95, rim);
  ctx.quadraticCurveTo(x - hw * 0.7, rim - u * HEAP * 0.95, x, rim - u * HEAP);
  ctx.quadraticCurveTo(x + hw * 0.7, rim - u * HEAP * 0.95, x + hw * 0.95, rim);
  ctx.closePath();
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (const [dx, dy] of COINS) oval(ctx, x + dx * u, rim + dy * u, u * 0.0085, u * 0.0056);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ctx.strokeStyle = GOLD.shade;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.stroke();
  // The pot: a round iron belly under a thick rim.
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.92, rim + u * 0.006);
  ctx.bezierCurveTo(x - hw * 1.18, rim + u * 0.028, x - hw * 0.8, foot - u * 0.006, x, foot - u * 0.006);
  ctx.bezierCurveTo(x + hw * 0.8, foot - u * 0.006, x + hw * 1.18, rim + u * 0.028, x + hw * 0.92, rim + u * 0.006);
  ctx.closePath();
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = IRON.light;
  ctx.beginPath();
  oval(ctx, x - hw * 0.45, rim + u * 0.019, hw * 0.22, u * 0.0075, -0.5);
  ctx.fill();
  ctx.beginPath();
  block(ctx, x - hw, rim - u * 0.002, hw * 2, u * 0.0105, u * 0.004);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.fillRect(x - hw + u * 0.004, rim, hw * 2 - u * 0.008, u * 0.003);
  ink(ctx, lw, INK);
  // A glint winking on the gold.
  const wink = Math.max(0, Math.sin(s.t * 1.7));
  if (wink > 0.05) {
    ctx.globalAlpha = wink;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    sparkle(ctx, x + u * 0.011, rim - u * 0.024, u * 0.0095 * (0.6 + 0.4 * wink));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** A hand curled over an edge at (x, y): a small mitten, three fingertips showing (u units of `u`). */
function mitten(ctx: Ctx, x: number, y: number, u: number): void {
  const r = u * 0.0032;
  circle(ctx, x - r * 1.5, y, r);
  circle(ctx, x, y - r * 0.25, r);
  circle(ctx, x + r * 1.5, y, r);
}

/** His hands where they hold the pot this frame (drawn over it). */
function hands(ctx: Ctx, cx: number, foot: number, u: number, p: Plan, lw: number): void {
  const px = cx + p.potX * u;
  const rim = foot - (p.potLift + POT_RIM) * u;
  ctx.beginPath();
  if (p.hands === 1) {
    // Fingers curled over the rim either side of where he peeks.
    mitten(ctx, px - u * 0.021, rim - u * 0.0005, u);
    mitten(ctx, px + u * 0.006, rim - u * 0.0005, u);
  } else if (p.hands === 2) {
    // Gripping the pot either side of its rim.
    mitten(ctx, px - u * POT_HW * 0.95, rim + u * 0.004, u);
    mitten(ctx, px + u * POT_HW * 0.95, rim + u * 0.004, u);
  } else {
    // One hand round the pot's left side.
    mitten(ctx, px - u * POT_HW * 1.0, rim + u * 0.014, u);
  }
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fill();
}

/**
 * Him, standing or crouched at (x, foot), facing p.m: drawn in his own frame (u units, facing
 * right, mirrored for left), leaning about his hips. Legs and shoes, coat with its belt and
 * buttons, arms, then the head: ears, face, rosy cheeks and nose, eyes and brows, the beard,
 * and the hat with its buckle.
 */
function figure(ctx: Ctx, x: number, foot: number, u: number, p: Plan, lw: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(p.m * u, u);
  // Crouching lowers his hips and hunches his head down into his shoulders; walking bobs him along.
  const hip = -0.03 + p.crouch * 0.018 + Math.abs(Math.sin(p.stride)) * 0.003 * p.walk;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Legs: cream stockings to buckled black shoes, swinging when he walks.
  const swing = Math.sin(p.stride) * 0.011 * p.walk;
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    const kx = i * 0.006;
    const fx = kx + i * swing;
    const fy = -0.005 + Math.max(0, i * Math.cos(p.stride)) * 0.006 * p.walk;
    ctx.moveTo(kx, Math.min(-0.012, hip + 0.004));
    ctx.lineTo(fx, fy);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0068 + w;
  ctx.stroke();
  ctx.strokeStyle = STOCKING;
  ctx.lineWidth = 0.0068;
  ctx.stroke();
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    const fx = i * 0.006 + i * swing;
    const fy = -0.005 + Math.max(0, i * Math.cos(p.stride)) * 0.006 * p.walk;
    oval(ctx, fx + 0.003, fy + 0.0015, 0.0078, 0.0036);
  }
  ctx.fillStyle = SHOE;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 2) {
    const fx = i * 0.006 + i * swing;
    const fy = -0.005 + Math.max(0, i * Math.cos(p.stride)) * 0.006 * p.walk;
    ctx.rect(fx + 0.0012, fy - 0.0018, 0.0042, 0.0028);
  }
  ctx.fillStyle = GOLD.body;
  ctx.fill();

  // Everything from the hips up leans about the hips.
  ctx.translate(0, hip);
  ctx.rotate(p.lean);
  // The coat: a frock coat flaring to its skirts, lit down its front, shaded at the hem.
  coatPath(ctx);
  ctx.fillStyle = COAT.body;
  ctx.fill();
  ctx.fillStyle = COAT.light;
  ctx.fillRect(0.004, -0.04, 0.006, 0.034);
  ctx.fillStyle = COAT.shade;
  ctx.fillRect(-0.02, 0.003, 0.04, 0.006);
  coatPath(ctx);
  ink(ctx, w, INK);
  // Belt and buckle, two brass buttons.
  ctx.beginPath();
  ctx.rect(-0.0175, -0.016, 0.035, 0.0055);
  ctx.fillStyle = BELT;
  ctx.fill();
  ink(ctx, w * 0.6, INK);
  ctx.beginPath();
  ctx.rect(0.0005, -0.0175, 0.0075, 0.0085);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, w * 0.5, INK);
  ctx.beginPath();
  circle(ctx, 0.008, -0.005, 0.0021);
  circle(ctx, 0.009, -0.026, 0.0021);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  // Arms: sleeves from the shoulders, down at his sides or reaching for the pot (the hands
  // themselves are drawn over the pot).
  ctx.beginPath();
  if (p.hands === 0) {
    ctx.moveTo(-0.013, -0.037);
    ctx.quadraticCurveTo(-0.02, -0.025, -0.017, -0.014);
    ctx.moveTo(0.013, -0.037);
    ctx.quadraticCurveTo(0.021, -0.026, 0.019, -0.015);
  } else {
    ctx.moveTo(0.006, -0.036);
    ctx.quadraticCurveTo(0.018, -0.03, 0.026, -0.022);
    ctx.moveTo(-0.01, -0.036);
    ctx.quadraticCurveTo(0.008, -0.024, 0.02, -0.018);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0085 + w;
  ctx.stroke();
  ctx.strokeStyle = COAT.body;
  ctx.lineWidth = 0.0085;
  ctx.stroke();
  if (p.hands === 0) {
    ctx.beginPath();
    circle(ctx, -0.017, -0.012, 0.0052);
    circle(ctx, 0.019, -0.013, 0.0052);
    ctx.fillStyle = SKIN.body;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
  }
  head(ctx, p, w, -0.054 + p.crouch * 0.028);
  ctx.restore();
}

/** His head (and hat) coming out round the left side of the pot at `px`, tipped as he peeks: the rest of him is behind the pot. */
function peekingHead(ctx: Ctx, px: number, foot: number, u: number, p: Plan, lw: number): void {
  const k = p.headOut;
  ctx.save();
  ctx.translate(px - u * (0.02 + 0.026 * k), foot - u * (0.05 + 0.006 * k));
  ctx.scale(p.m * u, u);
  ctx.rotate(-0.42 * k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  head(ctx, p, lw / u, 0);
  ctx.restore();
}

/** The frock coat's outline in his frame (hips at 0): shoulders, flared skirts, a notch between the tails. */
function coatPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.012, -0.043);
  ctx.quadraticCurveTo(-0.018, -0.04, -0.019, -0.03);
  ctx.lineTo(-0.023, 0.008);
  ctx.quadraticCurveTo(-0.012, 0.012, -0.002, 0.008);
  ctx.lineTo(0.0, 0.004);
  ctx.lineTo(0.002, 0.008);
  ctx.quadraticCurveTo(0.013, 0.012, 0.022, 0.008);
  ctx.lineTo(0.019, -0.03);
  ctx.quadraticCurveTo(0.018, -0.04, 0.012, -0.043);
  ctx.closePath();
}

/** The beard's outline (head at 0, 0): from cheek to cheek round a full ginger beard ending in three curls. */
function beardPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.0125, -0.002);
  ctx.quadraticCurveTo(-0.016, 0.012, -0.011, 0.021);
  ctx.quadraticCurveTo(-0.008, 0.027, -0.004, 0.023);
  ctx.quadraticCurveTo(0, 0.03, 0.004, 0.024);
  ctx.quadraticCurveTo(0.01, 0.028, 0.012, 0.02);
  ctx.quadraticCurveTo(0.017, 0.011, 0.0135, -0.002);
  ctx.quadraticCurveTo(0.008, 0.006, 0.001, 0.006);
  ctx.quadraticCurveTo(-0.007, 0.006, -0.0125, -0.002);
  ctx.closePath();
}

function head(ctx: Ctx, p: Plan, w: number, y: number): void {
  ctx.save();
  ctx.translate(0.002, y);
  // Ears, the face, the beard over the chin and jaw.
  ctx.beginPath();
  circle(ctx, -0.0125, -0.001, 0.0038);
  circle(ctx, 0.0125, -0.001, 0.0038);
  circle(ctx, 0, 0, 0.0125);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.beginPath();
  circle(ctx, 0, 0, 0.0125);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ctx.fillStyle = SKIN.light;
  ctx.beginPath();
  oval(ctx, -0.004, -0.006, 0.005, 0.0035, -0.4);
  ctx.fill();
  beardPath(ctx);
  ctx.fillStyle = BEARD.body;
  ctx.fill();
  ctx.fillStyle = BEARD.light;
  ctx.beginPath();
  oval(ctx, -0.006, 0.012, 0.0025, 0.006, 0.3);
  ctx.fill();
  beardPath(ctx);
  ink(ctx, w * 0.8, INK);
  // A smile in the beard, rosy cheeks and a round nose.
  ctx.beginPath();
  ctx.moveTo(0.0005, 0.0105);
  ctx.quadraticCurveTo(0.0045, 0.0135, 0.0085, 0.0095);
  ctx.strokeStyle = BEARD.shade;
  ctx.lineWidth = w * 0.7;
  ctx.stroke();
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, -0.0055, 0.0025, 0.0033, 0.0024);
  oval(ctx, 0.0105, 0.0025, 0.0025, 0.0022);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.0062, 0.0032, 0.0034);
  ctx.fillStyle = "#ffae96";
  ctx.fill();
  ink(ctx, w * 0.55, INK);
  // Eyes: dark dots with a glint, looking where he looks; shut for a blink. Bushy brows.
  const ex = p.look;
  if (p.blink) {
    ctx.beginPath();
    ctx.moveTo(-0.0035 + ex, -0.0025);
    ctx.lineTo(0.0005 + ex, -0.0025);
    ctx.moveTo(0.0055 + ex, -0.0025);
    ctx.lineTo(0.0095 + ex, -0.0025);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
  } else {
    ctx.beginPath();
    circle(ctx, -0.0015 + ex, -0.003, 0.0021);
    circle(ctx, 0.0075 + ex, -0.003, 0.0021);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    circle(ctx, -0.0008 + ex, -0.0038, 0.0007);
    circle(ctx, 0.0082 + ex, -0.0038, 0.0007);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.0045, -0.0068);
  ctx.quadraticCurveTo(-0.001, -0.0092, 0.0015, -0.0072);
  ctx.moveTo(0.0055, -0.0072);
  ctx.quadraticCurveTo(0.0085, -0.0092, 0.0115, -0.0066);
  ctx.strokeStyle = BEARD.shade;
  ctx.lineWidth = w * 1.1;
  ctx.stroke();
  hat(ctx, w);
  ctx.restore();
}

/** His tall buckled hat (head at 0, 0): a wide brim, a crown a little narrower at the top, a black band with a gold buckle. */
function hat(ctx: Ctx, w: number): void {
  const brim = -0.0105;
  const top = brim - 0.026;
  ctx.beginPath();
  ctx.moveTo(-0.0125, brim + 0.001);
  ctx.lineTo(-0.0108, top);
  ctx.quadraticCurveTo(0, top - 0.0025, 0.0108, top);
  ctx.lineTo(0.0125, brim + 0.001);
  ctx.closePath();
  ctx.fillStyle = LEP_HAT.body;
  ctx.fill();
  ctx.fillStyle = LEP_HAT.light;
  ctx.fillRect(-0.0085, top + 0.003, 0.004, 0.017);
  ink(ctx, w * 0.85, INK);
  ctx.beginPath();
  ctx.rect(-0.0122, brim - 0.009, 0.0244, 0.0062);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-0.0012, brim - 0.0098, 0.0078, 0.0078);
  ctx.rect(0.0011, brim - 0.0075, 0.0032, 0.0032);
  ctx.fillStyle = GOLD.body;
  ctx.fill("evenodd");
  ctx.beginPath();
  block(ctx, -0.0215, brim - 0.002, 0.043, 0.0058, 0.0029);
  ctx.fillStyle = LEP_HAT.body;
  ctx.fill();
  ink(ctx, w * 0.85, INK);
}

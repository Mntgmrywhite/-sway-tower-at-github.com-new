import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BEARD, BELT, CHEEK, COAT, GOLD, GRASS, INK, IRON, LEP_HAT, RAINBOW, SHOE, SKIN, STOCKING } from "./colors";
import { block } from "./shapes";
import { sparkle } from "./sky";
import { centerX, inkW } from "./tower";

// The pot of gold at the rainbow's end, and the leprechaun who keeps it: our own little fellow
// from the old stories, in a green frock coat with brass buttons and a belt, cream stockings
// and buckled shoes, a big ginger beard and rosy cheeks, under a tall bottle-green hat with a
// buckle on its band.
//
// His story is told in the first seconds of every tower (the scene's clock starts at 0 with the
// title screen's tower and with every new run): the rainbow sweeps into being over the round
// tower (meadow.ts) and touches down on bare grass, in a tuft, where a glimmer marks its end; out
// from behind the old round tower he comes, lugging his pot of gold, under the arch, sets it
// down in the tuft right at the rainbow's foot (the gold glints as it lands) and slips behind
// it, all within about five seconds. From then on he keeps watch over it for the rest of the
// run: every so often he peeks out round one side or the other, leaning out to look about, or
// up over the heap of coins, hands on the rim, eyes darting; then he ducks back. The pot never
// leaves again.
//
// Everything is a function of the scene's time: the arrival by the clock, then a watch of
// WATCH seconds after another, each picking (by hash) when he peeks and which way. He stays on
// the meadow below the tower's floor line, out of the slider's way, and well in from the
// screen's edge; the round tower's drum (drawn after him) is what he comes out from behind.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The pot's home, at the rainbow's right foot: its center and foot (u). The rainbow's left foot stands on the same ground (meadow.ts), as far back as his hat allows (below the floor line). */
export const POT_X = 0.43;
export const POT_FOOT = 0.14;
/** The pot: half width, rim height above its foot, and the heap of gold above the rim (u). */
const POT_HW = 0.033;
const POT_RIM = 0.047;
const HEAP = 0.032;
/** Where he starts, out of sight behind the round tower's drum (his center, u), the pot held out ahead of him. */
export const BACK_X = 0.125;
/** How far in front of him he holds the pot when he carries it (u). */
const REACH = 0.036;

/** The rainbow forms band by band, outside in: when the first starts, how far apart they start, how long each takes to sweep from foot to foot (s). */
export const BOW_START = 0.15;
export const BOW_STAGGER = 0.1;
export const BOW_SWEEP = 1.5;
/** When the rainbow's leading band touches down at its right foot, on the bare grass (s). */
export const TOUCHDOWN = BOW_START + BOW_SWEEP;

/** How far band `i` (0 outermost) has swept from the left foot to the right one at time `t` (0..1). */
export function bowSweep(i: number, t: number): number {
  return ease((t - BOW_START - i * BOW_STAGGER) / BOW_SWEEP);
}

/** He sets off from behind the round tower, reaches the rainbow's foot and sets the pot down, and is settled behind it (s). */
export const SET_OFF = 1.4;
export const SET_DOWN = 4.5;
export const SETTLED = 5.4;
/** The glint on the gold as the pot lands (s). */
const GLINT = 0.8;
/** One watch: a couple of peeks (s). */
export const WATCH = 10;

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

/** A peek's length (s). */
export const PEEK = 2.8;

/** Eyes during a peek: look out, glance at you, look out again; one blink in the middle. */
function eyes(p: Plan, k: number, t0: number, forward: number): void {
  const q = (k - t0) / PEEK;
  p.look = q < 0.35 ? forward : q < 0.62 ? -0.002 : forward * 0.6;
  p.blink = q > 0.48 && q < 0.53;
}

/**
 * The ways he peeks: round the pot's left side (toward the tower), up over its rim looking
 * toward the tower, or out the other way, or round its right side (toward the screen's edge, so
 * only a little way: his head just clears the pot).
 */
export const SIDE = 0;
export const RIM_IN = 1;
export const RIM_OUT = 2;
export const SIDE_OUT = 3;
const KINDS = 4;

function peek(p: Plan, k: number, t0: number, kind: number): boolean {
  const w = window01(k, t0, PEEK, 0.45);
  if (w <= 0.02) return false;
  p.shown = true;
  p.potX = POT_X;
  if (kind === SIDE || kind === SIDE_OUT) {
    // Round the pot's side: only his head comes out, tipped, to look about.
    p.m = kind === SIDE ? -1 : 1;
    p.headOut = w;
    p.hands = w > 0.4 ? 3 : 0;
    eyes(p, k, t0, 0.0035);
  } else {
    // Up over the heap of gold, hands on the rim, looking one way and then about.
    p.m = kind === RIM_IN ? -1 : 1;
    p.x = POT_X + p.m * 0.006;
    p.crouch = 1 - w;
    p.hands = w > 0.55 ? 1 : 0;
    eyes(p, k, t0, 0.0035);
    if (Math.floor(k / 1.1) % 2 === 1 && (k - t0) / PEEK > 0.62) p.look = -0.0035;
  }
  return true;
}

/** The two peeks of watch `n`: their kinds, and when they start (s into the watch). The first watch is fixed: round the side, then over the rim; after that, two different ones picked by hash. */
const WATCHES = { kind0: SIDE, kind1: RIM_IN, at0: 0, at1: 0 };
export function watch(n: number): typeof WATCHES {
  const h = (j: number) => hash(n * 13 + j + 9700);
  const w = WATCHES;
  if (n === 0) {
    w.kind0 = SIDE;
    w.kind1 = RIM_IN;
    w.at0 = 0.6;
    w.at1 = w.at0 + PEEK + 0.9;
    return w;
  }
  w.kind0 = Math.floor(h(3) * KINDS);
  w.kind1 = (w.kind0 + 1 + Math.floor(h(4) * (KINDS - 1))) % KINDS;
  w.at0 = 0.5 + h(1) * 1.2;
  w.at1 = w.at0 + PEEK + 0.9 + h(2) * 1.6;
  return w;
}

/**
 * Where he and the pot are at time `t`: both out of sight behind the round tower; then him
 * lugging it out to the rainbow's foot, setting it down and slipping behind it; then, for good,
 * hidden behind it or peeking out.
 */
export function plan(t: number): Plan {
  const p = PLAN;
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
  if (t < SET_OFF) {
    // Both still behind the round tower: the rainbow's end is bare grass.
    p.potShown = false;
    return p;
  }
  if (t < SET_DOWN) {
    // Out he comes, lugging it, and lowers it to the grass as he gets there.
    const q = (t - SET_OFF) / (SET_DOWN - SET_OFF);
    const e = q * q * (3 - 2 * q);
    p.shown = true;
    p.m = 1;
    p.x = BACK_X + (POT_X - REACH - BACK_X) * e;
    p.crouch = 0;
    // Leaning into the load, and straightening up as he slows to set it down.
    p.lean = 0.1 * (1 - ease((q - 0.8) / 0.2));
    p.hands = 2;
    p.walk = 1 - ease((q - 0.85) / 0.15);
    p.stride = t * 9;
    p.look = 0.002;
    p.potX = p.x + REACH;
    p.potLift = 0.008 * (1 - ease((q - 0.88) / 0.12)) + Math.abs(Math.sin(t * 9)) * 0.003 * p.walk;
    return p;
  }
  if (t < SETTLED) {
    // Lets go of it and slips round behind it.
    const q = ease((t - SET_DOWN) / (SETTLED - SET_DOWN));
    p.shown = true;
    p.m = 1;
    p.x = POT_X - REACH + (REACH + 0.008) * q;
    p.crouch = q;
    p.hands = q < 0.3 ? 2 : 0;
    p.walk = Math.sin(Math.PI * q) * 0.5;
    p.stride = t * 9;
    p.look = -0.002;
    return p;
  }
  // On watch for good: a couple of peeks every WATCH seconds, the first soon after he settles.
  const k = t - SETTLED;
  const n = Math.floor(k / WATCH);
  const kk = k - n * WATCH;
  const w = watch(n);
  if (peek(p, kk, w.at0, w.kind0)) return p;
  peek(p, kk, w.at1, w.kind1);
  return p;
}

// ---------------------------------------------------------------- drawing

/**
 * The pot of gold with him, as the time has it: him (behind the pot), the pot, his hands where
 * they grip it, then the tuft of grass it stands in, the glimmer where the rainbow touches down
 * (gone before the pot comes near) and the glint as it lands. Drawn after the rainbow and before
 * the round tower, whose drum hides him until he comes out.
 */
export function potAndLeprechaun(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g + (POT_FOOT - 0.16) * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const t = s.t;
  const p = plan(t);
  const foot = g + POT_FOOT * u;
  const home = cx + POT_X * u;
  if (p.potShown) {
    if (p.shown && p.headOut > 0) peekingHead(ctx, home, foot, u, p, lw);
    else if (p.shown) figure(ctx, cx + p.x * u, foot, u, p, lw);
    pot(ctx, s, cx + p.potX * u, foot - p.potLift * u, lw);
    if (p.shown && p.hands > 0) hands(ctx, cx, foot, u, p, lw);
  }
  tuft(ctx, home, foot, u, lw);
  const glow = glimmerGlow(t, p);
  if (glow > 0.01) glimmer(ctx, s, home, foot, glow);
  const q = (t - SET_DOWN + 0.1) / GLINT;
  if (q > 0 && q < 1) landed(ctx, s, home, foot, q);
}

/** The tuft of grass at the rainbow's end: blade tips [dx, height] (u), and how high the dips between them come. */
const TUFT = [
  [-0.033, 0.013],
  [-0.022, 0.019],
  [-0.011, 0.015],
  [0, 0.021],
  [0.011, 0.016],
  [0.022, 0.02],
  [0.033, 0.012],
] as const;
const TUFT_DIP = 0.0095;
/** Half its width at the ground, and how far up its outer edges are inked. */
const TUFT_HW = 0.035;
const TUFT_INKED = 0.005;
/** How far the blades fan out toward their tips. */
const LEAN = 1.1;

/** The tuft's blades, tip to tip, from `h0` up its left edge to `h0` down its right (heights in u; `k` scales it across). */
function tuftBlades(ctx: Ctx, x: number, foot: number, u: number, h0: number, start: boolean, k: number): void {
  const [dx0, t0] = TUFT[0];
  const [dx1, t1] = TUFT[6];
  // The outer edges run from the ground out to the outer tips, which lean outward.
  const edge = (dx: number, h: number, side: number) => x + u * k * (side * TUFT_HW + (dx * LEAN - side * TUFT_HW) * (h0 / h));
  if (start) ctx.moveTo(edge(dx0, t0, -1), foot - u * h0);
  else ctx.lineTo(edge(dx0, t0, -1), foot - u * h0);
  TUFT.forEach(([dx, h], i) => {
    if (i > 0) ctx.lineTo(x + u * k * (dx - 0.0055), foot - u * TUFT_DIP);
    ctx.lineTo(x + u * k * dx * LEAN, foot - u * h);
  });
  ctx.lineTo(edge(dx1, t1, 1), foot - u * h0);
}

/**
 * A tuft of grass at the rainbow's end, where the pot stands: the pot sits down into it, and it
 * hides the leprechaun's shoes under the pot while he crouches behind it. A clump a shade darker
 * than the meadow, rounded at its foot, inked along its blades only, so it melts into the grass.
 * The rainbow's left foot comes down into one too, a little narrower (`k`: meadow.ts).
 */
export function tuft(ctx: Ctx, x: number, foot: number, u: number, lw: number, k = 1): void {
  ctx.beginPath();
  ctx.moveTo(x - u * k * TUFT_HW, foot);
  tuftBlades(ctx, x, foot, u, 0, false, k);
  ctx.quadraticCurveTo(x, foot + u * 0.008, x - u * k * TUFT_HW, foot);
  ctx.closePath();
  ctx.fillStyle = GRASS.body;
  ctx.fill();
  ctx.beginPath();
  tuftBlades(ctx, x, foot, u, TUFT_INKED, true, k);
  ink(ctx, lw * 0.7, INK);
}

/** The glint as the pot lands: a bright star swelling and fading on the gold, two little ones beside it. */
function landed(ctx: Ctx, s: Scene, x: number, foot: number, q: number): void {
  const u = s.u;
  const k = Math.sin(Math.PI * q);
  const top = foot - (POT_RIM + HEAP * 0.7) * u;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = Math.min(1, k * 1.6);
  ctx.beginPath();
  sparkle(ctx, x + u * 0.004, top - u * 0.004, u * 0.024 * k);
  sparkle(ctx, x - u * 0.024, top + u * 0.008 - u * 0.012 * q, u * 0.009 * k);
  sparkle(ctx, x + u * 0.027, top + u * 0.002 - u * 0.014 * q, u * 0.008 * k);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** How far the glimmer reaches either side of the rainbow's end, and the pot (his hands round its rim and the ink included) either side of its center (u). */
export const GLIMMER_HW = 0.03;
export const POT_REACH = 0.042;

/**
 * The glimmer at the rainbow's end (0..1): it comes up as the rainbow touches down on the bare
 * grass and fades out as the pot comes near, gone before the pot gets to it (drawn over the
 * pot, it would twinkle on the iron).
 */
export function glimmerGlow(t: number, p: Plan = plan(t)): number {
  const gap = p.potShown ? POT_X - p.potX - POT_REACH - GLIMMER_HW : 1;
  return ease((t - TOUCHDOWN + 0.1) / 0.4) * ease(gap / 0.04);
}

/** Where the rainbow touches down on the bare grass, before the pot comes: a soft glimmer that twinkles (`a` fades it). */
function glimmer(ctx: Ctx, s: Scene, x: number, foot: number, a: number): void {
  const u = s.u;
  ctx.fillStyle = RAINBOW[2];
  ctx.globalAlpha = 0.35 * a;
  ctx.beginPath();
  oval(ctx, x + u * 0.001, foot - u * 0.002, u * 0.03, u * 0.007);
  ctx.fill();
  const tw = 0.5 + 0.5 * Math.sin(s.t * 3.1);
  ctx.globalAlpha = (0.6 + 0.4 * tw) * a;
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
    mitten(ctx, px + p.m * u * 0.021, rim - u * 0.0005, u);
    mitten(ctx, px - p.m * u * 0.006, rim - u * 0.0005, u);
  } else if (p.hands === 2) {
    // Gripping the pot either side of its rim.
    mitten(ctx, px - u * POT_HW * 0.95, rim + u * 0.004, u);
    mitten(ctx, px + u * POT_HW * 0.95, rim + u * 0.004, u);
  } else {
    // One hand round the pot's side, the side he peeks round.
    mitten(ctx, px + p.m * u * POT_HW, rim + u * 0.014, u);
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
/** How much further his head drops as he crouches right down behind the pot (u). */
const DUCK = 0.01;

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
  // Right down, he ducks his head into his collar too, so not even his hat's crown shows over the gold.
  head(ctx, p, w, -0.054 + p.crouch * 0.028 + DUCK * p.crouch ** 6);
  ctx.restore();
}

/** How high his head's center is (u above the pot's foot) when it is all behind the pot, hat and beard included, and when he peeks round its side. */
const HEAD_HIDDEN = 0.03;
const HEAD_OUT = 0.056;

/**
 * His head (and hat) coming out round the side of the pot at `px` that he faces, tipped as he
 * peeks: the rest of him is behind the pot. It leans out and up from right behind the pot's
 * middle, so it slides into sight bit by bit (the hat never pops up over the gold). Round the
 * right side (toward the screen's edge) it comes out less far.
 */
function peekingHead(ctx: Ctx, px: number, foot: number, u: number, p: Plan, lw: number): void {
  const k = p.headOut;
  const out = 0.02 + (p.m < 0 ? 0.026 : 0.006);
  ctx.save();
  ctx.translate(px + p.m * u * out * k, foot - u * (HEAD_HIDDEN + (HEAD_OUT - HEAD_HIDDEN) * k));
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
